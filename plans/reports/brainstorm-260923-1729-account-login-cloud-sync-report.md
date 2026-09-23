# Brainstorm — Đăng nhập đơn giản + đồng bộ tiến độ đa thiết bị

Ngày: 2026-09-23 · Trạng thái: **đã duyệt** · Flags: none

## Vấn đề & yêu cầu

Tiến độ học hiện chỉ nằm trong `localStorage` từng máy; đồng bộ = tải/khôi phục backup JSON thủ công. Muốn: đăng ký/đăng nhập bằng username + mật khẩu (check trùng username), mọi thiết bị đăng nhập cùng TK thấy cùng tiến độ.

| Mục | Chốt |
|---|---|
| Output | Web + `server.js` Node phục vụ tĩnh + `/api/*`; PostgreSQL trên Nhân Hòa; UI TK trong "Góc của bạn" |
| Acceptance | Đăng ký trùng username → báo lỗi; đăng nhập máy B thấy từ đã học ở máy A; ôn offline 2 máy rồi sync → không mất lượt ôn nào (gộp theo từ); không đăng nhập vẫn dùng app như cũ |
| Scope out | email, quên/đổi mật khẩu, sync ghi âm, realtime, xoá TK |
| Constraints | vanilla JS, không build; offline-first; bump `APP_VERSION` + `CACHE`; hosting Nhân Hòa (PaaS kiểu Coolify: Git deploy, env vars, DB tạo sẵn) |
| Touchpoints | `js/app-storage.js` (save hook), `js/word-import.js`/Góc của bạn (UI), `sw.js` (bỏ qua `/api/`), `index.html` (nạp script), `tests/` |

## Phương án đã cân nhắc

| Phương án | Ưu | Nhược | Kết luận |
|---|---|---|---|
| **Node + PostgreSQL trên Nhân Hòa** | cùng domain, không CORS, không thêm TK dịch vụ; DB managed + nút Backup; 1 dep `pg` | app đổi từ site tĩnh → app Node | **Chọn** |
| Cloudflare Worker + D1 | nhanh, free, độc lập hosting | thêm TK + nơi deploy, CORS; hosting đã có DB | Loại (chọn trước khi biết Nhân Hòa có DB) |
| Supabase | không viết server | auth bắt email → giả email; free pause 7 ngày; SDK ~50KB | Loại |
| Node + SQLite/libSQL file | nhẹ | file mất khi redeploy nếu không có volume | Loại |
| Node + MySQL | tương tự | không JSONB | Loại |

## Giải pháp cuối

### File
- `package.json` — `start: node server.js`, dep `pg`
- `server.js` — `node:http`, phục vụ tĩnh + route `/api/*`; thiếu `DATABASE_URL` → chỉ phục vụ tĩnh, API tắt
- `server/database.js` — pool `pg`, `CREATE TABLE IF NOT EXISTS` khi boot
- `server/auth-and-sync-routes.js` — register/login/logout/sync
- `js/sync-merge.js` — hàm gộp **thuần**, `module.exports`, dùng chung client + server
- `js/cloud-sync.js` — UI TK, token, kích hoạt sync

### DB
- `users(id serial PK, username text UNIQUE /*lowercase*/, pass_hash text, created_at)`
- `sessions(token_hash text PK, user_id, created_at)` — lưu sha256 token
- `progress(user_id PK, data jsonb, updated_at)`

### API
| Endpoint | In | Out |
|---|---|---|
| `POST /api/register` | `{username, password}` | 201 `{token, username}` · 409 trùng · 400 sai định dạng |
| `POST /api/login` | same | 200 `{token, username}` · 401 |
| `POST /api/logout` | Bearer | 204 |
| `PUT /api/sync` | `{data}` | 200 `{data: merged, updatedAt}` |

Sync 1 round-trip: server `SELECT … FOR UPDATE` → `merge(server, incoming)` → ghi → trả merged → client ghi đè local. Gộp trong transaction ⇒ 2 máy sync đồng thời không mất dữ liệu.

### Quy tắc gộp
- `srs`: theo `id`, `last` mới hơn thắng; hoà → `reps` cao hơn
- `gamescore`: max `best`, max `plays`
- `day`: cùng ngày → hợp checkbox, max streak; khác ngày → ngày mới hơn
- `cfg`, `plan`: thêm `ts` khi lưu, mới hơn thắng
- Không sync: `gamemiss`, ghi âm (IndexedDB)

### Client
- Chưa đăng nhập: username + mật khẩu, nút Đăng nhập / Đăng ký. Đã đăng nhập: "👤 tên · ✓ Đã đồng bộ lúc HH:MM" + Đăng xuất
- Token ở `eng.auth.v1`; sync khi mở app, sau `save()` key được sync (debounce 3s), khi `visibilitychange → hidden`; lỗi mạng → bỏ qua, thử lần sau; 401 → xoá token, hiện form
- Lần đầu đăng nhập máy có sẵn tiến độ → gộp, không mất
- Đăng xuất: giữ dữ liệu local
- `sw.js`: không cache `/api/*`

### Quy tắc TK & bảo mật
- Username 3–20 `[a-z0-9_]`, không phân biệt hoa thường; mật khẩu ≥6
- `crypto.scrypt` + salt ngẫu nhiên; token 32 byte random, DB chỉ lưu hash
- Body ≤5MB; login sai ≤10/phút/IP (đếm RAM); HTTPS do nền tảng

## Rủi ro
- Lệch đồng hồ giữa máy → so `last` sai cho vài từ (nhỏ, chấp nhận)
- Quên mật khẩu = mất TK (tiến độ local còn)
- Máy dùng chung: đăng xuất vẫn để lại tiến độ local
- Dev local cần Postgres (Docker) để test API
- README/architecture phải sửa: bỏ "không server"

## Kiểm chứng
- Unit test `sync-merge` (Node harness hiện có): gộp srs theo `last`, day cùng/khác ngày, gamescore max, cfg/plan theo `ts`, dữ liệu rỗng/thiếu trường
- Smoke thủ công/script: register → trùng 409 → login → sync 2 "máy" giả → dữ liệu hội tụ
- `pwa-assets` test vẫn pass sau bump version

## Bước tiếp
1. `/ck:plan` từ báo cáo này
2. Tạo DB PostgreSQL trên Nhân Hòa, đặt `DATABASE_URL` trong Environment
3. Đổi resource sang chạy Node (`npm start`)

## Câu hỏi chưa giải quyết
- Resource Nhân Hòa hiện tại là static hay đã chạy Node? Có cần tạo resource mới không
- Nhân Hòa dùng Nixpacks/Buildpack tự nhận `package.json` hay cần Dockerfile
