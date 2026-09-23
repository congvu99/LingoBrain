---
phase: 4
title: "Deploy Nhân Hòa, smoke test, rollback, docs"
status: pending
priority: P2
dependencies: [3]
---

# Phase 4: Deploy + kiểm thử thật + tài liệu

## Overview
Chuyển resource Nhân Hòa sang chạy Node, nối PostgreSQL, **giữ nguyên origin**, kiểm tra trên iPhone + laptop thật, có đường rollback, cập nhật docs (bỏ câu "không server").

## Requirements
- Nhân Hòa: tạo DB **PostgreSQL**, lấy connection string nội bộ.
- Environment của app: `DATABASE_URL=postgres://…`, `PORT` (theo nền tảng, mặc định 3000), `PGSSL=false` (đổi `true` nếu lỗi SSL; kèm `PGSSLROOTCERT` nếu DB đi qua mạng công cộng), `TRUST_PROXY_HOPS=1` (**bắt buộc đặt** — mặc định 0 thì mọi người dùng chung 1 IP proxy → rate limit theo IP chặn nhầm cả nhóm). Không commit giá trị.
- Build/Start: nền tảng tự nhận `package.json` → `npm install` + `npm start`. Không tự nhận → thêm `Dockerfile` tối giản (`node:20-alpine`, `npm ci --omit=dev`, `CMD ["npm","start"]`) — chỉ khi cần.
- **Origin production (scheme + host, kể cả www/apex) phải giữ nguyên** sau khi chuyển; TLS sẵn sàng trước khi trỏ domain. Subdomain tạm của nền tảng chỉ dùng với dữ liệu thử.
- Bật Backup DB của nền tảng (nếu có lịch).

## Related Code Files
- Create: `docs/deployment-guide.md` (Nhân Hòa: tạo DB, env, deploy, bump version, backup DB, rollback)
- Modify: `README.md` (mục "Đăng nhập & đồng bộ": cách dùng, quên mật khẩu = mất TK, kỷ lục game không giảm khi khôi phục; "Chạy thử" thêm `npm start`; bảng hosting: hosting chỉ tĩnh vẫn chạy nhưng không có sync), `docs/system-architecture.md` (server/, bảng DB, API, hợp đồng + quy tắc gộp, `srsEpoch`/`mt`, key `eng.auth.v1`/`eng.syncmeta.v1`, bỏ "không server")

## Implementation Steps
1. Deploy lên subdomain tạm của Nhân Hòa; Deploy log thấy `listening on :PORT` rồi `schema ready`.
2. Smoke bằng curl trên subdomain tạm:
   - `POST /api/register {"username":"smoke_1","password":"123456"}` → 201; lặp với `SMOKE_1` → 409
   - `POST /api/login` sai → 401; đúng → token; `PUT /api/sync` → 200 có `data`
   - `GET /package.json`, `/server/database.js`, `/.git/HEAD`, `/tests/run-tests.js` → 404; `curl --path-as-is '/%'` → 400
   - header response có `nosniff`, CSP; `words.json` có `Content-Encoding: gzip` từ proxy (server Node không tự nén — nếu proxy không nén thì cân nhắc thêm nén)
   - log `clientIp` một request → đúng IP thật (sai → chỉnh `TRUST_PROXY_HOPS`), rồi gỡ log
   - dừng DB tạm thời (hoặc sai `DATABASE_URL`) → `/` vẫn 200, API 503; khôi phục → tự ready
3. Trỏ domain production sang resource Node (giữ nguyên origin). Kiểm PWA: toast "Có bản mới", offline vẫn mở; tiến độ cũ trên máy vẫn còn.
4. Kiểm thật iPhone (PWA đã cài) + laptop cùng TK: học/ôn chéo, bật chế độ máy bay 1 máy rồi bật lại, xoá tiến độ trên 1 máy.
5. Xoá TK smoke: `DELETE FROM users WHERE username='smoke_1'`.
6. Cập nhật docs; `node tests/run-tests.js` xanh; commit (`feat: add account login and cross-device progress sync`).

## Rollback
- Giữ resource tĩnh cũ tới khi bản Node chạy ổn ≥ vài ngày.
- Rollback = trỏ domain về resource tĩnh. Client bản mới gọi `/api/*` nhận 404/HTML → phân loại "sync không khả dụng", backoff, **không lỗi, không mất dữ liệu** (phase 3).
- Nếu rollback lâu dài: deploy bản tĩnh với `CACHE`/`APP_VERSION` **cao hơn** để SW cập nhật; `eng.syncmeta.v1` còn lại vô hại.

## Success Criteria
- [ ] Toàn bộ Acceptance trong `plan.md` đạt trên domain thật
- [ ] Docs khớp code (route, bảng, env, quy tắc gộp, rollback)

## Risk Assessment
- Resource hiện tại là static → có thể phải tạo resource Node mới; đổi origin = mất localStorage của người dùng → bắt buộc giữ domain.
- Người dùng cũ đang có SW cache bản cũ → bump version; dữ liệu local không ảnh hưởng.

## Câu hỏi chưa giải quyết
- Resource Nhân Hòa hiện là static hay Node? Tự nhận `package.json` hay cần Dockerfile?
- DB Postgres nội bộ có yêu cầu SSL không? Proxy nối thêm hay ghi đè `X-Forwarded-For` (số hop)?
- Domain production hiện tại là gì, có đổi được resource mà giữ nguyên domain không?
