# Hướng dẫn deploy LingoBrain lên Nhân Hòa PaaS

**Phiên bản:** 2.11.0+ · **Nền tảng:** Nhân Hòa (Coolify/Dokploy) · **Bản dùng:** Node.js 18+ + PostgreSQL managed · **Ngày cập nhật:** 2026-09-24

---

## Tổng quan

LingoBrain chuyển từ web tĩnh sang hybrid: **web tĩnh + API Node.js** chạy cùng domain. Người dùng offline vẫn xem được giáo án; đăng nhập thì tự động đồng bộ tiến độ giữa các máy. Database PostgreSQL được Nhân Hòa cung cấp sẵn.

**Điều kiện bắt buộc:**
- Nhân Hòa đã tạo sẵn DB PostgreSQL: `lingoBrain`, user `sa`, host nội bộ `lingobrain-gbrd77:5432`.
- **Tiền điều kiện:** Xoay mật khẩu `sa` trên Nhân Hòa (cái cũ đã chia sẻ qua chat) và cập nhật `DATABASE_URL` trong Environment.
- Bảng tự tạo từ `server/schema.sql` lần đầu server khởi động (không cần migration thủ công).
- Bộ từ + audio index tự nạp vào DB từ `words.json` + `audio/index.json` khi hash nội dung khác → không cần chạy CLI trừ khi tạo tài khoản chủ.
- Origin production (scheme + host) **giữ nguyên** — `localStorage` gắn theo origin.

---

## Bước 1: Tạo hoặc cấu hình resource Node trên Nhân Hòa

1. **Trỏ repo:** Tạo resource mới hoặc cấu hình resource hiện tại
   - GitHub repo: `main` branch
   - Framework: Node.js (nền tảng tự nhận `package.json`)
   - Nếu nền tảng không tự nhận → cung cấp Dockerfile tối giản (xem phần Dockerfile)

2. **Bật Backup DB:** Vào Database → PostgreSQL (lingoBrain) → bật lịch backup tự động

---

## Bước 2: Cấu hình Environment (bắt buộc)

Vào tab **Environment** của resource, thêm KEY=VALUE như sau:

```
DATABASE_URL=postgresql://sa:<MẬT_KHẨU_ĐÃ_URL_ENCODE>@lingobrain-gbrd77:5432/lingoBrain
TRUST_PROXY_HOPS=1
PGSSL=false
PORT=3000
```

### Giải thích từng biến:

| Biến | Giá trị | Ghi chú |
|---|---|---|
| `DATABASE_URL` | `postgresql://sa:<mật khẩu>@lingobrain-gbrd77:5432/lingoBrain` | **Chú ý:** mật khẩu chứa ký tự đặc biệt (ví dụ `@`), phải URL-encode. Ví dụ: `@` → `%40`. Dùng công cụ encode hoặc Python: `urllib.parse.quote_plus('password')` |
| `TRUST_PROXY_HOPS` | `1` | **Bắt buộc.** Mặc định 0 thì mọi người dùng chia chung 1 IP proxy → rate limit theo IP chặn nhầm cả nhóm. Đặt 1 để tin `X-Forwarded-For` của proxy Nhân Hòa. |
| `PGSSL` | `false` | Mạng nội bộ không cần TLS. Nếu lỗi kết nối SSL → thử `true` + thêm `PGSSLROOTCERT=/path/to/ca.pem` |
| `PORT` | `3000` | Cổng mặc định. Chỉnh nếu nền tảng yêu cầu khác |

**Cảnh báo:** Mật khẩu chứa `@` phải URL-encode, không encode khác cũng được nhưng cẩn thận. Ví dụ:
- Mật khẩu gốc: `MyPass@123`
- URL-encoded: `MyPass%40123`
- DATABASE_URL: `postgresql://sa:MyPass%40123@lingobrain-gbrd77:5432/lingoBrain`

**Khuyến cáo:** Mật khẩu đã được chia sẻ qua chat. Nên đổi sang mật khẩu mạnh mới qua Nhân Hòa.

---

## Bước 3: Build & Deploy

1. **Deploy resource:** Nhấn nút **Deploy** (hoặc **Rebuild**) trên Nhân Hòa.

2. **Đọc Deploy log** để xác nhận:
   - Cần thấy: `npm install` ✓ → `npm start` ✓
   - Cần thấy log dòng: **`listening on :3000`** → **`schema ready`**
   - Nếu chỉ thấy `listening` nhưng không thấy `schema ready` trong 30 giây → xem mục "Khắc phục sự cố"
   - Nếu `AUTO_SEED=true` (mặc định): sẽ thấy **`deck seeded: 2505 words, 5009 audio (+2505 ~0 -0)`** hoặc **`deck up to date`** (nếu deploy lại)

3. Nếu nền tảng không tự nhận `package.json`, thêm **Dockerfile** vào root repo:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

---

## Bước 4 (Mới): Nạp dữ liệu (bộ từ + tài khoản chủ)

Server tự nạp bộ từ + audio index khi schema sẵn sàng. **Không cần chạy CLI trừ khi tạo tài khoản chủ.**

### Tạo tài khoản chủ qua CLI (tuỳ chọn)

Nên chạy trên Nhân Hòa console hoặc máy có kết nối DB:

```bash
# Set biến môi trường an toàn (không lưu password trong shell history)
export ADMIN_USERNAME=<tên_tài_khoản>
read -s ADMIN_PASSWORD && export ADMIN_PASSWORD

# Chạy CLI (--skip-deck: bỏ qua seed, nếu deploy tự seed rồi)
node tools/seed-database.js --skip-deck

# Xoá biến
unset ADMIN_PASSWORD
```

**Nếu không có console:** Đăng ký tài khoản chủ trực tiếp qua app như người dùng bình thường (không cần CLI).

### Cờ CLI (xem chi tiết: `node tools/seed-database.js --help`)

| Cờ | Mục đích | Lưu ý |
|---|---|---|
| `--skip-deck` | Bỏ qua seed bộ từ (server tự seed khi nội dung đổi) | Mặc định: seed nếu hash khác |
| `--reset` | Xoá toàn bộ bảng (dev chỉ) | Cần `--yes`, nếu có users → thêm `--drop-users` |
| `--allow-shrink` | Cho phép bộ từ mới < 50% hiện tại | Chặn lỡ hóng file, mặc định từ chối |
| `--reset-owner-password` | Đổi mật khẩu tài khoản đã tồn tại, thu hồi phiên cũ | Nếu không → từ chối |

**Biến môi trường:**
- `DATABASE_URL` (bắt buộc): `postgresql://sa:PASSWORD@lingobrain-gbrd77:5432/lingoBrain`
- `PGSSL=false` (mặc định, trong mạng nội bộ)
- `PGSSLROOTCERT` (nếu cần TLS)
- `ADMIN_USERNAME`, `ADMIN_PASSWORD` (cả hai hoặc không có): tạo/reset tài khoản chủ

### Kiểm tra sau khi nạp

```sql
-- 1. Server encoding (phải UTF8 để chữ Việt)
SHOW server_encoding;

-- 2. Bảng mới
SELECT count(*) FROM users;
SELECT count(*) FROM words;           -- phải = 2505
SELECT count(*) FROM audio_clips;     -- phải = 5009
SELECT count(*) FROM deck_meta;       -- phải = 1

-- 3. Nội dung
SELECT content_hash, seeded_at FROM deck_meta;
SELECT username, created_at FROM users WHERE id = 1;  -- tài khoản chủ

-- 4. Mẫu 3 từ (có emoji, contextVi)
SELECT id, word, emoji, meaning, context_vi FROM words LIMIT 3;
```

### Kiểm tra HTTP (curl trên máy khác)

```bash
# 1. Tài khoản chủ đã tạo
curl -X POST https://app-123.nhan-hoa.local/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"<admin_name>","password":"<password>"}' \
  # Kỳ vọng: 200 + token

# 2. Bộ từ (200 + ETag)
curl -s -D - -o /dev/null https://app-123.nhan-hoa.local/api/words
  # Kỳ vọng: 200, header ETag: "<hash>", Cache-Control: no-cache

# 3. Cache + If-None-Match (304)
ETAG=$(curl -s -D - -o /dev/null https://app-123.nhan-hoa.local/api/words | grep -i '^etag' | cut -d' ' -f2- | tr -d '')
curl -s -D - -o /dev/null -H "If-None-Match: $ETAG" https://app-123.nhan-hoa.local/api/words
  # Kỳ vọng: 304 Not Modified

# 4. Proxy có nén không (không bắt buộc; không có → ghi roadmap)
curl -s -D - -o /dev/null -H "Accept-Encoding: gzip" https://app-123.nhan-hoa.local/api/words | grep -i content-encoding

# 5. Audio index (5009 mục)
curl -s https://app-123.nhan-hoa.local/api/audio-index | jq '.items | length'
  # Kỳ vọng: 5009
```

### Luồng chỉnh sửa bộ từ

1. **Sửa `words.json`** (thêm/xoá/đổi từ)
2. **Tạo audio mới** (tuỳ chọn): `python tools/generate_edge_tts_audio.py`
3. **Commit + push** repo
4. **Deploy** trên Nhân Hòa (auto-seed xảy ra khi server start)
5. Bộ từ cập nhật trên client qua `/api/words` (ETag + tiến độ pruneSrs chỉ khi từ API)

---

## Bước 5: Kiểm tra trên subdomain tạm

Nhân Hòa cung cấp subdomain tạm (ví dụ `https://app-123.nhan-hoa.local/`). Dùng subdomain này để smoke test.

### Kiểm tra API (dùng curl):

```bash
# 1. Đăng ký tài khoản
curl -X POST https://app-123.nhan-hoa.local/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"smoke_test_1","password":"123456"}' \
  # Kỳ vọng: 201 (thành công)

# 2. Đăng ký trùng username (khác hoa/thường)
curl -X POST https://app-123.nhan-hoa.local/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"SMOKE_TEST_1","password":"123456"}' \
  # Kỳ vọng: 409 (trùng)

# 3. Đăng nhập sai mật khẩu
curl -X POST https://app-123.nhan-hoa.local/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"smoke_test_1","password":"wrong"}' \
  # Kỳ vọng: 401 (không được phép)

# 4. Đăng nhập đúng
curl -X POST https://app-123.nhan-hoa.local/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"smoke_test_1","password":"123456"}' \
  # Kỳ vọng: 200 + token trong response

# 5. Sync dữ liệu (dùng token từ response trên)
curl -X PUT https://app-123.nhan-hoa.local/api/sync \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"data":{"v":1,"srsEpoch":0,"srs":{},"cfg":{"data":{},"ts":0},"plan":{"data":[],"ts":0},"day":{"data":{},"ts":0},"gameScore":{}}}' \
  # Kỳ vọng: 200 + data merged

# 6. Truy cập file hệ thống bị cấm → phải 404
curl https://app-123.nhan-hoa.local/package.json  # 404
curl https://app-123.nhan-hoa.local/server/database.js  # 404
curl https://app-123.nhan-hoa.local/tests/run-tests.js  # 404
curl https://app-123.nhan-hoa.local/.git/HEAD  # 404

# 7. Path traversal + URL khó (phải 400 Bad Request)
curl --path-as-is 'https://app-123.nhan-hoa.local/%'  # 400

# 8. Web tĩnh vẫn 200 (dù DB sập)
curl https://app-123.nhan-hoa.local/  # 200 (HTML của index.html)
curl https://app-123.nhan-hoa.local/css/paper-theme.css  # 200
curl https://app-123.nhan-hoa.local/words.json  # 200

# 9. Security headers
curl -I https://app-123.nhan-hoa.local/
  # Phải thấy: X-Content-Type-Options: nosniff
  #            Content-Security-Policy: ...
  #            X-Frame-Options: DENY
```

### Kiểm tra TRUST_PROXY_HOPS:

Quan sát Deploy log sau khi request được tạo để kiểm tra rate limit hoạt động tính theo IP thật chứ không phải proxy. Nếu lỗi HTTP 429 trên tất cả IP → `TRUST_PROXY_HOPS` có thể sai. Kiểm tra log của app (field X-Forwarded-For) để xác nhận nhận được IP khách hàng thật.

---

## Bước 6: Kiểm tra DB outage behavior

**Mục đích:** Xác nhận web tĩnh vẫn 200 khi DB sập.

1. Dừng DB tạm thời (hoặc sai `DATABASE_URL` trong Environment)
2. **GET /**: vẫn 200 (HTML)
3. **GET /api/login**: phải 503 (dịch vụ không khả dụng)
4. Khôi phục DB → server tự reconnect, schema retry tự động

---

## Bước 7: Trỏ domain production sang Node resource

Khi smoke test ✓ trên subdomain:

1. **Giữ origin cũ:** DNS/proxy chỉ đổi pointing từ static resource sang Node resource, **không đổi scheme/host**.
   - ✓ Đúng: `https://lingobrain.vn/` → cùng domain, khác resource
   - ✗ Sai: `https://lingobrain-v2.vn/` → khác domain → mất `localStorage`

2. **Đợi TLS sẵn sàng** trước khi trỏ.

3. **Thử trên iPhone (PWA):**
   - Nếu đã cài PWA bản cũ → thấy toast "Có bản mới" → tải lại
   - Offline vẫn hoạt động (cũ); online → sync tự động
   - Tiến độ cũ trên máy vẫn còn (merge với server)

4. **Kiểm chéo 2 máy:**
   - Máy A & B dùng cùng tài khoản
   - A: học 5 từ mới
   - B: refresh → thấy 5 từ đó (đúng lịch)
   - A offline, B offline, cả 2 ôn cùng từ → online lại → cả 2 hội tụ (không mất lượt ôn)

---

## Bước 8: Quản lý version & backup

### Mỗi lần deploy, bump version:

Mỗi lần push code mới, cập nhật:
- `js/app-storage.js`: `APP_VERSION = "2.11.0"` (hoặc version tiếp theo)
- `sw.js`: `CACHE = "lingobrain-2.11.0"` (phải trùng APP_VERSION)
- Test `tests/pwa-assets.test.js` xanh (kiểm tra đúp version)

Client sẽ thấy toast "Có bản mới → Tải lại". Bộ từ cập nhật tự động qua `/api/words` khi server nạp từ `words.json` (nếu hash khác).

### Backup DB:

Nhân Hòa tự backup theo lịch (đã bật ở Bước 1). Để backup thủ công:
1. Vào **Database** → PostgreSQL → **Backup**
2. Hoặc dùng `pg_dump`: `pg_dump -U sa -h lingobrain-gbrd77 -d lingoBrain > backup.sql`

---

## Bước 9: Rollback

Nếu Node version gặp lỗi nghiêm trọng:

1. **Đặt resource static (cũ) trở lại làm resource chính:**
   - Giữ lại Node resource (chưa xoá)
   - Trỏ domain production → static resource

2. **Client tự động xử lý:**
   - Bản PWA mới gọi `/api/words` → nhận 404 (hoặc HTML)
   - Phân loại "sync không khả dụng", fallback sang `words.json` (offline mode)
   - Tiến độ không bị xoá (fallback không gọi pruneSrs)
   - Vẫn học bình thường, không lỗi, không mất dữ liệu

3. **Nếu rollback lâu dài (>1 tuần):**
   - Deploy bản static với `APP_VERSION` + `CACHE` **cao hơn** (ví dụ 2.9.0 → 2.10.0)
   - Client tải bản mới, bỏ cache Node, xoá `eng.syncmeta.v1` nếu cần
   - Metadata `eng.auth.v1` (username/token) vẫn giữ lại (vô hại nếu không dùng)

---

## Khắc phục sự cố

| Triệu chứng | Nguyên nhân | Giải pháp |
|---|---|---|
| **Deploy log: không thấy `schema ready` sau 30s** | DATABASE_URL sai, mật khẩu không encode, SSL lỗi, DB timeout | Kiểm tra URL encoding (đặc biệt `@`), test kết nối từ host Nhân Hòa: `psql postgresql://sa:...@lingobrain-gbrd77:5432/lingoBrain`. Thử `PGSSL=true` nếu lỗi. |
| **Deploy log: thấy `schema ready` nhưng không thấy `deck seeded`** | `AUTO_SEED=false` hoặc hash nội dung khớp rồi (deploy lại) | Kiểm tra log: `deck up to date` là bình thường. Nếu cần seed lại: `node tools/seed-database.js --skip-deck` trên console Nhân Hòa. |
| **GET /api/words: 503 "Bộ từ chưa được nạp"** | DB sẵn nhưng bảng `words` rỗng (mất dữ liệu hoặc chưa nạp) | Nếu tình cờ xoá bộ từ: `node tools/seed-database.js --skip-deck` không có `--reset`. Nếu schema chưa tạo: xem dòng trên. |
| **CLI: "Tên ... đã tồn tại"** | Tài khoản chủ đã có | Thêm `--reset-owner-password` để đổi mật khẩu + thu hồi phiên cũ, hoặc xoá tài khoản bằng SQL. |
| **CLI: "chỉ còn X/Y mục (< 50%) — không seed"** | File `words.json` hoặc `audio/index.json` lỗi (có thể bị xoá tay hoặc download sai) | Kiểm tra file, `git restore` nếu cần. Nếu thật sự giảm bộ từ: `--allow-shrink` (dev chỉ). |
| **POST /api/login: 503 (Máy chủ chưa bật đồng bộ)** | DB không ready hoặc `DATABASE_URL` chưa đặt | Xem Deploy log, chờ `schema ready`. Nếu lâu → xem dòng 1 bảng này. |
| **POST /api/login: 503 mãi không xanh** | DB ngoài kế hoạch gặp lỗi, pool hết timeout | Kiểm tra trạng thái PostgreSQL trên Nhân Hòa; kiểm tra log: `pg pool error: ...`. Restart resource hoặc DB. |
| **Rate limit: HTTP 429 cho tất cả người dùng** | `TRUST_PROXY_HOPS` sai hoặc đếm sai hop | Tăng `TRUST_PROXY_HOPS` lên 2 (nếu có nhiều reverse proxy) hoặc kiểm tra X-Forwarded-For trong log. |
| **GET /: 200 nhưng chỉ HTML, không /api/words** | Resource chưa sẵn sàng hoặc DNS chưa cập nhật | Chờ DNS TTL; xoá browser cache; dùng `curl -I` kiểm tra response header. |
| **Client gọi /api nhưng nhận 404 (HTML)** | Rollback: domain đang trỏ static resource | Bình thường trong rollback. Client fallback sang `words.json`. Kiểm tra resource pointer trên Nhân Hòa nếu không cố ý. |
| **Bảng users/sessions/progress/words/audio_clips/deck_meta chưa tạo** | Server chưa start, DATABASE_URL chưa đặt | Xem Deploy log: `schema ready` phải hiện. Nếu không: xem dòng 1 bảng này. Kiểm tra `server/schema.sql` được đọc. |

---

## Câu hỏi chưa giải quyết

1. **Nhân Hòa resource hiện tại:** Là static hay Node? Nếu static → tạo resource Node mới hay cấu hình lại cái cũ? Nên giữ cái cũ ≥7 ngày để rollback.

2. **Build detect:** Nền tảng tự nhận `package.json` hay cần Dockerfile? Thử Deploy trước, nếu fail → thêm Dockerfile.

3. **Proxy behavior:** Nhân Hòa append hay ghi đè `X-Forwarded-For`? Số hop thực tế là bao nhiêu? (Test bằng log debug ở Bước 4)

4. **Domain production hiện tại:** Scheme + host là gì (ví dụ `https://lingobrain.vn`)? Kiểm tra ghi chép Nhân Hòa.

5. **Client UI:** Phase 3 (UI tài khoản, auto sync) còn pending. API ready, nhưng chưa có giao diện login. Deploy trước để test API, UI thêm sau.

---

## Tài liệu liên quan

- `docs/system-architecture.md` — chi tiết API routes, DB schema, quy tắc gộp dữ liệu
- `phase-03-client-account-ui-and-auto-sync.md` — giao diện tài khoản (chưa hoàn thành)
- `README.md` — chạy thử local, PWA cache, bộ từ

---

**Commit sau khi deploy thành công:** Đợi smoke test xanh + kiểm thật iPhone/macOS, rồi:
```bash
git add .
git commit -m "feat: add account login and cross-device progress sync"
git push
```
