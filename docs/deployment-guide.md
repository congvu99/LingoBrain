# Hướng dẫn deploy LingoBrain lên Nhân Hòa PaaS

**Phiên bản:** 2.9.0+ · **Nền tảng:** Nhân Hòa (Coolify/Dokploy) · **Bản dùng:** Node.js 18+ + PostgreSQL managed · **Ngày cập nhật:** 2026-09-23

---

## Tổng quan

LingoBrain chuyển từ web tĩnh sang hybrid: **web tĩnh + API Node.js** chạy cùng domain. Người dùng offline vẫn xem được giáo án; đăng nhập thì tự động đồng bộ tiến độ giữa các máy. Database PostgreSQL được Nhân Hòa cung cấp sẵn.

**Điều kiện bắt buộc:**
- Nhân Hòa đã tạo sẵn DB PostgreSQL: `lingoBrain`, user `sa`, host nội bộ `lingobrain-gbrd77:5432`.
- Bảng tự tạo lần đầu server khởi động (không cần migration thủ công).
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

## Bước 4: Kiểm tra trên subdomain tạm

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

Thêm log tạm vào `server.js` dòng sau `const https = ...`:

```js
// TMP DEBUG
const clientIp = require('./server/auth-and-sync-routes.js').getClientIp?.(req, TRUST_PROXY_HOPS);
log('clientIp: ' + clientIp + ', x-forwarded-for: ' + (req.headers['x-forwarded-for'] || 'none'));
```

Chạy request → log phải hiển thị IP thật của bạn (hoặc IP proxy Nhân Hòa), **không phải 127.0.0.1 hoặc IP cố định**. Nếu sai → kiểm tra `TRUST_PROXY_HOPS` và số lượng proxy.

Xoá log debug sau khi kiểm tra xong.

---

## Bước 5: Kiểm tra DB outage behavior

**Mục đích:** Xác nhận web tĩnh vẫn 200 khi DB sập.

1. Dừng DB tạm thời (hoặc sai `DATABASE_URL` trong Environment)
2. **GET /**: vẫn 200 (HTML)
3. **GET /api/login**: phải 503 (dịch vụ không khả dụng)
4. Khôi phục DB → server tự reconnect, schema retry tự động

---

## Bước 6: Trỏ domain production sang Node resource

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

## Bước 7: Quản lý version & backup

### Mỗi lần deploy, bump version:

Mỗi lần push code mới, cập nhật:
- `js/app-storage.js`: `APP_VERSION = "2.9.1"` (hoặc version tiếp theo)
- `sw.js`: `CACHE = "lingobrain-2.9.1"` (phải trùng APP_VERSION)
- Test `tests/pwa-assets.test.js` xanh (kiểm tra đúp version)

Client sẽ thấy toast "Có bản mới → Tải lại".

### Backup DB:

Nhân Hòa tự backup theo lịch (đã bật ở Bước 1). Để backup thủ công:
1. Vào **Database** → PostgreSQL → **Backup**
2. Hoặc dùng `pg_dump`: `pg_dump -U sa -h lingobrain-gbrd77 -d lingoBrain > backup.sql`

---

## Bước 8: Rollback

Nếu Node version gặp lỗi nghiêm trọng:

1. **Đặt resource static (cũ) trở lại làm resource chính:**
   - Giữ lại Node resource (chưa xoá)
   - Trỏ domain production → static resource

2. **Client tự động xử lý:**
   - Bản PWA mới gọi `/api/*` → nhận 404 (hoặc HTML)
   - Phân loại "sync không khả dụng", backoff
   - Offline-first mode: vẫn học bình thường, không lỗi, không mất dữ liệu

3. **Nếu rollback lâu dài (>1 tuần):**
   - Deploy bản static với `APP_VERSION` + `CACHE` **cao hơn** (ví dụ 2.9.0 → 2.10.0)
   - Client tải bản mới, bỏ cache Node, xoá `eng.syncmeta.v1` nếu cần
   - Metadata `eng.auth.v1` (username/token) vẫn giữ lại (vô hại nếu không dùng)

---

## Khắc phục sự cố

| Triệu chứng | Nguyên nhân | Giải pháp |
|---|---|---|
| **Deploy log: không thấy `schema ready` sau 30s** | DATABASE_URL sai, mạt khẩu không encode, SSL lỗi, DB timeout | Kiểm tra URL encoding (đặc biệt `@`), test kết nối từ host Nhân Hòa: `psql postgresql://sa:...@lingobrain-gbrd77:5432/lingoBrain`. Thử `PGSSL=true` nếu lỗi. |
| **POST /api/login: 503 (Máy chủ chưa bật đồng bộ)** | DB không ready hoặc `DATABASE_URL` chưa đặt | Xem Deploy log, chờ `schema ready`. Nếu lâu → xem dòng trên. |
| **POST /api/login: 503 mãi không xanh** | DB ngoài kế hoạch gặp lỗi, pool pool hết timeout | Kiểm tra trạng thái PostgreSQL trên Nhân Hòa; kiểm tra kết nối từ log: `pg pool error: ...`. Restart resource hoặc DB. |
| **Rate limit: HTTP 429 cho tất cả người dùng** | `TRUST_PROXY_HOPS` sai hoặc đếm sai IP | Tăng TRUST_PROXY_HOPS lên 2 (nếu có nhiều reverse proxy) hoặc kiểm tra số hop thực tế qua log debug. |
| **GET /: 200 nhưng chỉ HTML, không /words.json** | Resource chưa sẵn sàng hoặc DNS chưa cập nhật | Chờ DNS TTL; xoá browser cache; dùng `curl -I` kiểm tra response header. |
| **Client gọi /api nhưng nhận 404 (HTML)** | Rollback: domain đang trỏ static resource | Bình thường trong rollback. Nếu tình cờ: kiểm tra resource pointer trên Nhân Hòa. |
| **Bảng users/sessions/progress chưa tạo** | Server chưa start, DATABASE_URL chưa đặt | Xem Deploy log: `schema ready` phải hiện. Nếu không: xem dòng 1 bảng này. |

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
