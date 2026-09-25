---
phase: 1
title: Server TTS route provider and cache
status: completed
priority: P2
dependencies: []
effort: 3h
---

# Phase 1: Server TTS route provider and cache

## Overview
`GET /api/tts?text=…` trả MP3 giọng Neural; cache Postgres `tts_clips`; provider Edge TTS tách riêng, nạp lười; rate limit + semaphore + single-flight + chặn hotlink.

## Bước 0 — kiểm hạ tầng Nhân Hòa TRƯỚC khi code [RT#6, RT#14]
- Trên console Nhân Hòa: `node -v` (ghi lại). `node -e "require('https').get('https://speech.platform.bing.com',r=>console.log(r.statusCode)).on('error',e=>console.log('ERR',e.message))"` → có mã HTTP (bất kỳ) = outbound mở; `ERR` (timeout/ENOTFOUND/ECONNREFUSED) = bị chặn → **dừng kế hoạch**, báo người dùng.

## Contract (phase 2 dựa vào — không đổi)
- Request: `GET /api/tts?text=<câu>` (URL-encoded) **kèm header `X-LB-TTS: 1`**. Server chuẩn hoá giống `audioKey()` client: gộp khoảng trắng + trim.
- 200 `audio/mpeg`, body MP3; headers: `Cache-Control: private, max-age=86400` + `Vary: X-LB-TTS` (không `immutable`; private để proxy dùng chung không trả MP3 cho request thiếu header — sửa sau code review), `ETag: "<key>"` (key gồm giọng), `Cross-Origin-Resource-Policy: same-origin`, `X-Content-Type-Options: nosniff`. 304 khi `If-None-Match` khớp. [RT#1, RT#4]
- Lỗi (JSON `{error}` như API hiện có, `Cache-Control: no-store`):
  - 400 text rỗng / > 200 ký tự / ký tự điều khiển / chứa `<` hoặc `>`. [RT#2, RT#12]
  - 403 thiếu header `X-LB-TTS` (thẻ `<audio>`/trang khác không gửi được). [RT#1]
  - 429 quá giới hạn **hoặc server bận** (semaphore BUSY / hết hạn chờ), kèm `Retry-After` (giây). [RT#3]
  - 501 TTS tắt (`TTS_ENABLED=false`, nạp thư viện lỗi, `createApi` không cấu hình tts). **Chỉ 501 mới là tín hiệu "tắt".** [RT#3, RT#5, RT#11]
  - 502 provider lỗi / timeout / MP3 không hợp lệ.
  - 503 DB chưa sẵn sàng / chập chờn (hành vi sẵn có của `handleApi`) — tạm thời.

## Requirements
- Functional: cache hit không gọi provider, không tính limiter tạo mới (vẫn bị limiter chung `apiIp` 120/phút/IP của mọi `/api/*` — chấp nhận). [RT#13]
- Functional: nhiều request cùng câu cùng lúc → 1 lần gọi provider (single-flight), key xoá khỏi map trong `finally`. [RT#7]
- Non-functional: không log nội dung câu; tổng hạn chờ hàng đợi + tạo = **5s** (dưới timeout 6s của client); tối đa 2 lần tạo đồng thời, hàng đợi 10. [RT#8]
- Non-functional: giới hạn tạo mới 20/phút/IP, 200/ngày/IP, **1000/ngày toàn server** (`TTS_DAILY_MAX`). [RT#1]
- Non-functional: cache DB trần `TTS_CACHE_MAX` mặc định **2000** dòng; mỗi MP3 ≤ 300KB (CHECK). Ước tính thật: 48kbps ≈ 6KB/s → câu 200 ký tự ~ 80KB, trung bình ~20–40KB → ~40–80MB, tệ nhất ~600MB. [RT#12]
- Non-functional: request bị client huỷ (`req` đóng) trước khi tới lượt → không gọi provider. [RT#9]

## Architecture
- `server/tts-edge-provider.js` — `createEdgeTtsProvider({ voice, timeoutMs })` → `{ voice, synth(text) → Promise<Buffer> }`:
  - Polyfill đầu file: `if (!globalThis.crypto) globalThis.crypto = require('crypto').webcrypto;` (msedge-tts 2.0.8 dùng `crypto.subtle`/`getRandomValues` global, Node 18 không có sẵn). [RT#6]
  - Escape XML bắt buộc `& < > " '` (thư viện chèn thô vào `_SSMLTemplate`). [RT#2]
  - Mỗi lần: `new MsEdgeTTS()` → `setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3)` → `toStream(text)` → gom `audioStream` thành Buffer. **Một** timeout bao cả chuỗi (kể cả `setMetadata`), `tts.close()` trong `finally` (thành công cũng đóng). [RT#7]
  - Kiểm lại tên API thật của v2.0.8 (CJS `require`, `toStream` trả gì) bằng `node_modules/msedge-tts/dist` khi code.
- `server/tts-routes.js` — `createTtsRoutes({ pool, getProvider, enabled, cacheMax, dailyMax, now })` → `{ tts(req, ip), limiters }`, trả `[status, body, headers]` như `deck-routes.js`:
  - `enabled === false` hoặc `getProvider()` ném/null → 501.
  - Thiếu `req.headers['x-lb-tts'] === '1'` → 403.
  - `normalizeTtsText(raw)`: decode (lỗi decode → 400), gộp khoảng trắng, trim; hợp lệ khi 1–200 ký tự, không `[\u0000-\u001f\u007f<>]`.
  - `key = sha256(voice + '\n' + text).hex`.
  - `SELECT mp3 FROM tts_clips WHERE key=$1` → hit trả luôn (+304 nếu ETag khớp).
  - miss: `minute.hit(ip, t)`, `day.hit(ip, t)`, `global.hit('all', t)` (luôn truyền `now()`) → fail → 429 + `Retry-After`. [RT#5]
  - single-flight `Map<key, Promise>` → `createSemaphore(2, 10).run(...)` với deadline 5s tính từ lúc nhận request; BUSY/hết hạn → 429 `Retry-After: 5`; `req.destroyed`/`req.socket.destroyed` trước khi gọi provider → bỏ. [RT#8, RT#9]
  - Kiểm MP3 trước khi lưu: `buf.length >= 1024 && buf.length <= 300*1024` và bắt đầu bằng `ID3` hoặc frame sync (`buf[0]===0xFF && (buf[1]&0xE0)===0xE0`); sai → 502, không lưu. [RT#4]
  - `INSERT … ON CONFLICT (key) DO NOTHING`; sau mỗi 50 lần insert: `DELETE FROM tts_clips WHERE key IN (SELECT key FROM tts_clips ORDER BY created_at ASC LIMIT GREATEST((SELECT count(*) FROM tts_clips) - $1, 0))`. [RT#12]
  - Provider lỗi → 502, log `tts synth failed: <message>` (không kèm câu).
- `server/schema.sql` (áp lại mỗi lần khởi động qua `database.js` `readSchema()`, idempotent):
  `CREATE TABLE IF NOT EXISTS tts_clips (key text PRIMARY KEY CHECK (key ~ '^[0-9a-f]{64}$'), voice text NOT NULL, mp3 bytea NOT NULL CHECK (octet_length(mp3) BETWEEN 1024 AND 307200), created_at timestamptz NOT NULL DEFAULT now());` + `CREATE INDEX IF NOT EXISTS tts_clips_created_at ON tts_clips (created_at);` — **không có cột `text`** (không lưu nguyên văn câu). [RT#12]
- `server/auth-and-sync-routes.js`: `createApi({ …, tts })` — `tts` tuỳ chọn (thiếu → route trả 501, test cũ `tests/deck-routes.test.js` không vỡ); `ROUTES['GET /api/tts'] = req => ttsRoutes.tts(req, ipOf(req))` (dispatcher chỉ gọi `fn(req)`); thêm `'/api/tts'` vào `PATHS`; thêm limiters của tts vào `setInterval` sweep; `send()` thêm nhánh `Buffer.isBuffer(body)` gửi thẳng. [RT#5]
- `server.js`: đọc `TTS_ENABLED` (mặc định bật), `TTS_VOICE` (`en-US-AndrewMultilingualNeural`), `TTS_CACHE_MAX` (2000), `TTS_DAILY_MAX` (1000). `getProvider` nạp lười: chỉ khi enabled, `require('./server/tts-edge-provider.js')` trong try, lỗi → log 1 lần + trả null (→ 501); không nạp ở top-level để lỗi thư viện không làm sập web tĩnh. [RT#11]
- `package.json`: `"msedge-tts": "2.0.8"` (khoá cứng, không `^`); commit `package-lock.json` (đã được track). [RT#14]

## Related Code Files
- Create: `server/tts-edge-provider.js`, `server/tts-routes.js`, `tests/tts-routes.test.js`
- Modify: `server/auth-and-sync-routes.js`, `server/schema.sql`, `server.js`, `package.json`, `package-lock.json`

## Implementation Steps
0. Bước 0 ở trên (người dùng chạy trên Nhân Hòa, báo kết quả).
1. `npm i msedge-tts@2.0.8 --save-exact`; đọc `node_modules/msedge-tts/dist` để chốt API + `close()`.
2. `tts-edge-provider.js` (≤ 70 dòng) + thử tay: `node -e` tạo 1 câu có `&`, ghi file, nghe.
3. `tts-routes.js` theo Architecture (thuần, inject `pool`/`getProvider`/`now`).
4. Bảng `tts_clips` + index vào `schema.sql`.
5. Nối route/limiter sweep/nhánh Buffer vào `createApi`; env + provider lười trong `server.js`.
6. `tests/tts-routes.test.js` (mẫu `tests/deck-routes.test.js`: pool giả, provider giả, `__asyncTests`):
   - hit: không gọi provider, không tính limiter tạo mới; miss: gọi 1 lần, INSERT, trả Buffer + đủ header (CORP, nosniff, max-age=86400, không immutable).
   - 2 request đồng thời cùng câu → provider 1 lần; provider lỗi 1 lần → lần sau vẫn gọi lại được (map đã xoá).
   - text rỗng / 201 ký tự / ký tự điều khiển / có `<` → 400; chuẩn hoá khoảng trắng → cùng key; thiếu `X-LB-TTS` → 403.
   - 21 miss/phút cùng IP → 429 có `Retry-After`; vượt `dailyMax` toàn server → 429; semaphore đầy → 429 (không phải 503).
   - `enabled=false` → 501; `getProvider` ném → 501; provider reject/timeout → 502; MP3 < 1KB hoặc sai header → 502 và **không INSERT**; `If-None-Match` → 304.
   - request đã đóng trước lượt → provider không được gọi.
   - `createApi` đăng ký `GET /api/tts` (IP thật truyền vào limiter), `POST /api/tts` → 405, `createApi` không có tts → 501.
   - provider: escape `&<>"'` đúng 1 lần (test hàm escape thuần); timeout gọi `close()` (stub MsEdgeTTS).
7. `npm test`; server local có DATABASE_URL: `curl -s -H "X-LB-TTS: 1" -o t.mp3 -w "%{http_code} %{content_type} %{size_download}\n" "localhost:3000/api/tts?text=Salt%20%26%20pepper"`.

## Success Criteria
- [ ] Bước 0: Node version ghi lại; outbound tới Microsoft mở.
- [ ] Test mới + toàn bộ `npm test` xanh.
- [ ] curl local trả MP3 nghe được giọng Andrew (câu có `&`); lần 2 lấy từ DB (provider không được gọi).
- [ ] Không có nội dung câu trong log; không có cột lưu câu trong DB.

## Risk Assessment
- Edge TTS không chính thức; thư viện hard-code phiên bản Edge (`1-143…`) → Microsoft từ chối = mọi request 502 → bump `msedge-tts`, trong lúc chờ đặt `TTS_ENABLED=false`; client luôn fallback Web Speech; provider tách file để thay Azure/Google. [RT#14]
- Outbound bị chặn → phát hiện ở Bước 0, không code phí.
- Lạm dụng: 403 thiếu header + CORP chặn hotlink; 200 ký tự; 20/phút + 200/ngày/IP + 1000/ngày toàn server; semaphore. IP sau proxy cần `TRUST_PROXY_HOPS` đúng (có sẵn). IPv6 xoay địa chỉ vẫn bị trần toàn server chặn.
- Quyền riêng tư: câu gửi tới Microsoft; `?text=` có thể nằm trong log proxy nền tảng; cache dùng chung → biết được câu từng được tạo (thời gian phản hồi). Chấp nhận (câu học tiếng Anh), ghi trong docs.
- Pool DB `max: 5` dùng chung sync: hit đọc bytea nhỏ (≤ 300KB), chấp nhận; theo dõi sau deploy.
