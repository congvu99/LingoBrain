# Brainstorm: chuyển bộ từ + audio index sang PostgreSQL

**Ngày:** 2026-09-24 · **Trạng thái:** đã duyệt (hướng A + tự seed khi rỗng) · **Mode:** thường (không --html/--wiki)

## Bối cảnh / vấn đề
- App deploy Nhân Hòa (Node 18 + PG managed `lingoBrain`). Trước dùng `words.json` tĩnh, nay muốn DB làm nguồn dữ liệu.
- DB hiện trống: chưa có bảng/dữ liệu bộ từ, chưa có tài khoản chủ.
- Schema hiện hard-code chuỗi `SCHEMA` trong `server/database.js` (users/sessions/progress, tự tạo lúc start).
- Dữ liệu: `words.json` 2505 từ × 12 trường; `audio/index.json` 5010 mục (text → mp3), 89MB MP3.
- Mật khẩu băm scrypt (`scrypt$salt$key`) → pgcrypto không làm được → seed phải qua Node.

## Yêu cầu chốt
| Mục | Giá trị |
|---|---|
| Output | `server/schema.sql`, `tools/seed-database.js`, `GET /api/words`, `GET /api/audio-index`, client đọc API + fallback |
| Acceptance | chạy seed trên DB trống → 2505 dòng `words`, 5010 dòng `audio_clips`, 1 user chủ đăng nhập được; app tải bộ từ từ API; offline vẫn chạy; chạy seed lần 2 không đổi kết quả |
| Ngoài phạm vi | trang admin sửa từ, cột role/phân quyền, lưu MP3 trong DB |
| Ràng buộc | Node ≥18, chỉ dep `pg`; origin giữ nguyên; bump `APP_VERSION` = `CACHE`; không commit mật khẩu |
| Touchpoints | `server/database.js`, `server.js`, `server/auth-and-sync-routes.js` (hoặc module route mới), `js/app-shell.js`, `js/speech-synthesis.js`, `sw.js`, `js/app-storage.js`, tests, `docs/deployment-guide.md`, `docs/system-architecture.md` |

## Các hướng đã cân nhắc
| Hướng | Ưu | Nhược | Kết luận |
|---|---|---|---|
| **A. DB nguồn chính + API, MP3 tĩnh** | chuẩn bị cho admin/truy vấn; client 1 nguồn đọc | sửa client/SW/test | **Chọn** |
| B. Seed DB tham chiếu, client giữ words.json | nhanh, ít rủi ro | 2 nguồn lệch nhau, DB vô dụng với user | loại |
| C. MP3 dạng bytea trong PG | "tất cả trong DB" | +89MB DB/backup, serve chậm, không lợi | loại |

## Giải pháp chốt
1. **`server/schema.sql`** — nguồn duy nhất, idempotent (`IF NOT EXISTS`):
   - giữ `users`, `sessions`, `progress` y nguyên
   - `words(id text PK, word, ipa, pos, meaning, context, context_vi, source, emoji, image, mnemonic, output_prompt, sort_order int, updated_at timestamptz)`
   - `audio_clips(text text PK, file text NOT NULL, voice text NOT NULL)`
   - `deck_meta(id int PK CHECK id=1, deck text, updated text)`
   - `database.js` đọc file thay chuỗi SCHEMA.
2. **`tools/seed-database.js`** (logic chuyển đổi thuần tách module để test):
   - 1 transaction: upsert words/audio/deck_meta, xoá dòng không còn trong JSON.
   - `ADMIN_USERNAME` + `ADMIN_PASSWORD` → upsert user (validate + `hashPassword`) + dòng `progress {"v":1}` (ON CONFLICT DO NOTHING, không ghi đè tiến độ).
   - `--reset --yes` → DROP tất cả bảng rồi tạo lại; thiếu `--yes` → từ chối.
   - Chạy: `ADMIN_USERNAME=... ADMIN_PASSWORD=... node tools/seed-database.js [--reset --yes]`.
3. **Tự seed lúc start**: sau `schema ready`, nếu `words` rỗng → nạp từ `words.json` + `audio/index.json` (dùng chung hàm seed). Không tạo admin tự động.
4. **API public** (không auth): `GET /api/words` → `{deck, updated, words:[camelCase]}` đúng shape `words.json`, sắp theo `sort_order`; `GET /api/audio-index` → `{voice, items}`. ETag + `Cache-Control: no-cache`; DB down → 503. Có thể cache kết quả trong RAM, xoá cache khi seed.
5. **Client**: `app-shell.js` gọi `/api/words` → lỗi thì `words.json`; `speech-synthesis.js` tương tự. `sw.js`: network-first + cache riêng cho 2 endpoint này (hiện đang bỏ qua mọi `/api/`). MP3 giữ nguyên cache-first.
6. Bump `APP_VERSION`/`CACHE`; cập nhật docs deploy (bước seed, env admin).

## Rủi ro / lưu ý
- **Sửa từ vẫn qua `words.json` → seed lại** cho tới khi có admin UI; DB là nơi app đọc, JSON là nơi biên tập. Chấp nhận.
- `--reset` xoá cả users/progress → chỉ dùng khi DB trống; bắt buộc `--yes`.
- Payload `/api/words` ~1.2MB → nên bật gzip (kiểm tra static server/proxy Nhân Hòa đã nén chưa).
- Tự seed chạy song song nhiều instance → dùng `pg_advisory_xact_lock` trong transaction seed.
- Log "chưa tạo được bảng" có thể do kết nối DB (URL encode mật khẩu, PGSSL) — kiểm tra log `schema ready` trước.
- Không log/commit `ADMIN_PASSWORD`.

## Kiểm chứng
- Unit: chuyển đổi JSON → rows (2505/5010, shape camelCase khi đọc lại khớp `words.json`), parse cờ `--reset/--yes`, schema.sql chứa đủ bảng.
- Route test: `/api/words` shape + 503 khi DB chưa ready.
- `tests/pwa-assets` xanh sau bump version.
- Thủ công Nhân Hòa: log `schema ready` → `words seeded 2505`; `SELECT count(*) FROM words`; đăng nhập tài khoản chủ; mở app offline sau lần online đầu.

## Bước tiếp
- `/ck:plan` với report này.

## Câu hỏi chưa giải quyết
1. Log deploy Nhân Hòa hiện có `schema ready` chưa? Nếu chưa → lỗi kết nối DB, phải xử lý trước.
2. Console resource Nhân Hòa có cho chạy lệnh `node` không (để tạo admin)? Nếu không → cần cách khác (ví dụ env admin để server tự tạo lúc start).
3. Proxy Nhân Hòa có gzip response không?
