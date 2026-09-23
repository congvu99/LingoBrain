---
phase: 2
title: "Node server: static an toàn, DB, auth, sync API"
status: completed
priority: P1
dependencies: [1]
---

# Phase 2: Node server + PostgreSQL + API

## Overview
`server.js` thay hosting tĩnh: phục vụ đúng các file web + 4 route API. **Web tĩnh không bao giờ phụ thuộc DB**: thiếu `DATABASE_URL`, DB chưa sẵn sàng hoặc sập → tĩnh vẫn 200, API 503.

## Requirements
**Chung**
- Node ≥ 18, không Express. Dep duy nhất: `pg`.
- Server `listen` **ngay**; `ensureSchema()` chạy nền, thử lại backoff 2s → 30s; cờ `dbReady` quyết định API 503.
- `pool.on('error', log)`; `process.on('unhandledRejection', log)` (không exit); handler ngoài cùng bọc try/catch → 500 JSON; body reader xử lý `req.on('error'|'aborted')`.
- Log không chứa body, mật khẩu, token.

**Static**
- Chỉ `GET`/`HEAD` (khác → 405). Danh sách **tên cụ thể** ở gốc: `/`→`index.html`, `index.html`, `manifest.json`, `sw.js`, `words.json`, `icon.svg`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`. Thư mục: `css/`, `js/`, `audio/` (1 cấp, tên `^[A-Za-z0-9._-]+$`).
- `decodeURIComponent` trong try → lỗi = 400. Sau decode: từ chối `\`, NUL, `%`, segment `..`/`.`; ghép bằng `path.posix`, kiểm lại nằm trong thư mục cho phép.
- MIME: html, js, css, json, webmanifest, svg, png, mp3. `index.html`, `sw.js`, `words.json`, `audio/index.json`: `Cache-Control: no-cache`.
- Header mọi response: `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`, `X-Frame-Options: DENY`, CSP `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; frame-ancestors 'none'` (index.html không có inline script, không tài nguyên ngoài — đã kiểm). HSTS khi `x-forwarded-proto: https`.

**Auth**
- Username: `^[a-z0-9_]{3,20}$` sau `trim().toLowerCase()`; mật khẩu 6–128 ký tự (quyết định người dùng, giữ nguyên).
- Mật khẩu: `crypto.scrypt` async (N=16384, r=8, p=1, keylen 64) + salt 16 byte → `scrypt$<salt hex>$<hash hex>`; so `timingSafeEqual`. **Semaphore tối đa 2 scrypt đồng thời**, hàng chờ > 20 → 503.
- Token: `randomBytes(32)` base64url; DB lưu `sha256(token)`. **Hết hạn trượt 180 ngày**: hợp lệ khi `last_used_at > now() - 180 days`; cập nhật `last_used_at` tối đa 1 lần/ngày.
- IP client: `x-forwarded-for` lấy phần tử thứ `len - TRUST_PROXY_HOPS` tính từ **phải** (env, **mặc định 0** = không tin header; production đặt 1 sau khi xác nhận topology proxy); không có header hoặc hops=0 → `socket.remoteAddress`.
- Rate limit (Map trong RAM, dọn mỗi phút, **tối đa 10.000 key** — vượt thì xoá key cũ nhất):
  - mọi request `/api/*`: 120/phút/IP → 429 (token rác cũng tốn 1 query)
  - mọi request `/api/register|login`: 20/phút/IP → 429
  - `PUT /api/sync`: 30/phút/user → 429
  - `register` thành công: 5/giờ/IP
  - login sai theo **username**: 5 lần/15 phút → 429 cho username đó
- Body JSON ≤ **10MB** (413; đọc hết rồi mới trả 413 để client không nhận ECONNRESET, cắt khi vượt 2×). Dữ liệu sau gộp > 8MB → 413.
- `POST`/`PUT` có body bắt buộc `Content-Type: application/json` (415) — chặn form chéo site tạo TK/login CSRF.
- Mật khẩu chuẩn hoá `NFC` trước khi băm (mật khẩu có dấu gõ NFC/NFD trên máy khác nhau).
- Lỗi mất kết nối DB sau khi đã ready (`isDbUnavailable`) → 503, không phải 500. Client mượn trong transaction có listener `error` riêng.
- TLS DB: `PGSSL=true` mã hoá; `PGSSLROOTCERT` (tuỳ chọn) để xác thực chứng chỉ.

## Architecture
```
server.js                        listen, định tuyến /api/* → routes (503 nếu !dbReady), còn lại → static; bọc lỗi toàn cục
server/static-file-server.js     resolveStaticPath [thuần] + serve + header bảo mật
server/password-hashing-and-session-tokens.js    [thuần] validateUsername, validatePassword, hashPassword, verifyPassword, newToken, hashToken
server/request-guards.js         [thuần] clientIp(headers, socketAddr, hops), createRateLimiter({limit, windowMs, maxKeys}), createSemaphore(n, maxQueue), readJsonBody(req, maxBytes)
server/database.js               Pool(DATABASE_URL, ssl theo PGSSL), pool.on('error'), ensureSchemaWithRetry()
server/auth-and-sync-routes.js   register, login, logout, sync (dùng mergeSync/sanitizePayload từ ../js/sync-merge.js)
```
Schema:
```sql
CREATE TABLE IF NOT EXISTS users (id serial PRIMARY KEY, username text UNIQUE NOT NULL, pass_hash text NOT NULL, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS sessions (token_hash text PRIMARY KEY, user_id int NOT NULL REFERENCES users(id) ON DELETE CASCADE, created_at timestamptz DEFAULT now(), last_used_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS progress (user_id int PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, data jsonb NOT NULL, updated_at timestamptz DEFAULT now());
```
API:
| Route | Hành vi |
|---|---|
| `POST /api/register` | validate → một transaction: `INSERT users RETURNING id` + `INSERT progress (user_id, '{"v":1}')` + `INSERT sessions`; lỗi `23505` → 409 `{error:'Tên đã có người dùng'}`; OK → 201 `{token, username}` |
| `POST /api/login` | tìm user, verify (user không tồn tại vẫn chạy scrypt giả để thời gian đều) → 200 `{token, username}`; sai → 401 `{error:'Sai tài khoản hoặc mật khẩu'}` |
| `POST /api/logout` | xoá session theo Bearer → 204 |
| `PUT /api/sync` | Bearer hợp lệ → `BEGIN; INSERT INTO progress VALUES ($1,'{"v":1}') ON CONFLICT DO NOTHING; SELECT data … FOR UPDATE;` `merged = mergeSync(sanitizePayload(server, now), sanitizePayload(body.data, now), {histMax: 20})`; `UPDATE progress SET data, updated_at`; `COMMIT` → 200 `{data: merged, updatedAt}` |
| khác `/api/*` | 404 JSON; mọi phản hồi API là JSON `Content-Type: application/json` |

## Related Code Files
- Create: `tests/database-availability.test.js`, `package.json` (`"scripts": {"start": "node server.js"}`, `"engines": {"node": ">=18"}`, dep `pg`), `package-lock.json`, `server.js`, `server/static-file-server.js`, `server/password-hashing-and-session-tokens.js`, `server/request-guards.js`, `server/database.js`, `server/auth-and-sync-routes.js`, `tests/password-hashing-and-session-tokens.test.js`, `tests/static-file-server.test.js`, `tests/request-guards.test.js`
- Modify: `tests/run-tests.js` (thêm `require`, `Buffer`, `process` vào `ctx` cho test Node-only; test server không thêm vào `run-tests.html` — ghi rõ chỉ chạy ở Node)

## Implementation Steps (TDD)
1. **Test trước** (guard đặt trong `describe`: `describe('…', () => { if (typeof require === 'undefined') return; … })`):
   - `password-hashing-and-session-tokens`: `validateUsername(' Minh_01 ')` → `'minh_01'`; `'ab'`, `'a b'`, `'tên'`, 21 ký tự → lỗi; `validatePassword('12345')` lỗi, `'123456'` OK; hash → verify đúng/sai; 2 lần hash khác nhau; `hashToken` tất định 64 hex; `newToken()` ≥ 40 ký tự, không trùng
   - `static-file-server` / `resolveStaticPath`: `'/'`→`index.html`; `/js/app-shell.js` OK; `null` cho `/server/database.js`, `/package.json`, `/.git/config`, `/js/../server.js`, `/%2e%2e/server.js`, `/js/..%5cserver.js`, `/js/%252e%252e/x`, `/js/a%00.js`, `/plans/x.md`, `/tests/run-tests.html`, `/screenshot.png`, `/JS/../server.js`; `/%` và `/%E0%A4%A` → lỗi 400 (không ném)
   - `request-guards`: `clientIp({'x-forwarded-for':'1.1.1.1, 9.9.9.9'}, 's', 1)` → `'9.9.9.9'`; hops 0 → socket; rate limiter vượt limit → false, sau window → true, vượt `maxKeys` không tăng quá; semaphore chạy tối đa n, hàng chờ đầy → reject
2. `node tests/run-tests.js` → đỏ → viết 3 module thuần → xanh.
3. Viết `database.js`, `auth-and-sync-routes.js`, `server.js`.
4. `npm install` → commit `package-lock.json`.
5. Kiểm local:
   - không `DATABASE_URL`: `npm start` → app chạy như cũ; `POST /api/login` → 503; `/package.json` → 404; `curl -X DELETE /index.html` → 405
   - `DATABASE_URL` trỏ cổng sai → tĩnh vẫn 200, log thử lại schema, API 503; bật Postgres Docker → tự thành ready
   - `curl --path-as-is 'localhost:3000/%'` → 400, server còn sống

## Success Criteria
- [ ] Test credentials, static path, guards xanh
- [ ] DB vắng/sai/sập không làm web tĩnh lỗi, không crash process
- [ ] Không file nào ngoài danh sách truy cập được; header bảo mật có mặt

## Risk Assessment
- Số hop proxy Nhân Hòa chưa biết → `TRUST_PROXY_HOPS` qua env; phase 4 kiểm bằng cách log `clientIp` một lần.
- Postgres cần SSL hay không → env `PGSSL=true|false`, mặc định false.
- Rate limit RAM mất khi restart → chấp nhận.
- Payload lớn ghi lại cả JSONB mỗi sync → debounce 10s phía client (phase 3); delta sync để sau nếu thật sự chậm.
