# Phase 1: Server TTS route, provider, cache — báo cáo

## Files thay đổi
- Tạo `server/tts-edge-provider.js` (44 dòng) — `createEdgeTtsProvider({voice, timeoutMs, MsEdgeTTS, OUTPUT_FORMAT})`, polyfill crypto, escape XML, 1 timeout bao setMetadata+toStream, `close()` trong `finally`. `MsEdgeTTS`/`OUTPUT_FORMAT` tiêm được (test dùng stub, production tự `require('msedge-tts')`).
- Tạo `server/tts-routes.js` (119 dòng) — `createTtsRoutes({pool, getProvider, enabled, cacheMax, dailyMax, now})` → `{tts(req,ip), limiters}`. Chuẩn hoá text, key sha256(voice+'\n'+text), cache DB, rate limit 3 tầng (phút/IP, ngày/IP, ngày/server), semaphore 2+hàng đợi 10 với hạn 5s, single-flight, kiểm MP3, INSERT + prune mỗi 50 lần.
- Tạo `tests/tts-routes.test.js` — 15 test case (3 sync + 12 async), khớp toàn bộ danh sách ở Bước 6 phase file.
- Sửa `server/schema.sql` — thêm bảng `tts_clips` (không cột `text`) + index `tts_clips_created_at`.
- Sửa `server/auth-and-sync-routes.js` — `createApi` nhận `tts` tuỳ chọn; đăng ký `GET /api/tts`; thêm `/api/tts` vào `PATHS`; nhánh `Buffer.isBuffer(body)` trong `send()`; limiters của tts vào sweep interval chung.
- Sửa `server.js` — đọc env `TTS_ENABLED/TTS_VOICE/TTS_CACHE_MAX/TTS_DAILY_MAX`; `getTtsProvider()` nạp lười trong try (lỗi → log 1 lần + null → 501), không nạp top-level.
- Sửa `package.json`/`package-lock.json` — `npm i msedge-tts@2.0.8 --save-exact`.

## Tasks hoàn thành
Toàn bộ Implementation Steps 1–7 của phase file (bỏ Bước 0 theo chỉ định). Đã đọc `node_modules/msedge-tts/dist/MsEdgeTTS.js` + `Output.js` để chốt API thật: `new MsEdgeTTS()` → `await setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3)` → `toStream(text)` trả `{audioStream, metadataStream, requestId}` (sync, không phải Promise) → gom `audioStream` events `data/end/error` → `close()` sync.

## Tests
- `node --check` sạch trên 5 file đã sửa/tạo (tts-edge-provider.js, tts-routes.js, auth-and-sync-routes.js, server.js, tts-routes.test.js).
- `npm test`: **508 passed, 0 failed** (bao gồm 15 test tts mới + toàn bộ test cũ, không có test nào vỡ).
- Smoke thật (máy dev, không phải Nhân Hòa): `createEdgeTtsProvider(...).synth('Salt & pepper, please.')` → thành công, 12096 bytes, `first16=fff364c4001be435f00048461813d601` (frame sync MPEG hợp lệ `0xFF 0xF3`). Chứng minh outbound + thư viện chạy được từ máy này; câu có `&` không làm vỡ SSML (đã escape). File lưu tại scratchpad `smoke.mp3`.

## Deviations (có lý do)
1. **Bỏ Bước 0** — theo chỉ định của task (chạy trên Nhân Hòa sau); thay bằng smoke test cục bộ để xác nhận thư viện + outbound hoạt động từ máy dev (không thay thế Bước 0 thật).
2. **`createEdgeTtsProvider` nhận tham số tiêm `MsEdgeTTS`/`OUTPUT_FORMAT`** thay vì `require('msedge-tts')` cứng trong hàm — cần để test unit "timeout gọi close() (stub MsEdgeTTS)" theo đúng yêu cầu Bước 6 mà không phải mock module thật; production path không tiêm gì vẫn `require('msedge-tts')` như spec.
3. **429 do vượt `dailyMax`/`day` limiter dùng `Retry-After: 86400`** — spec chỉ nói "kèm Retry-After (giây)" không định con số cụ thể cho hạn ngày; chọn độ dài cửa sổ (giây) làm giá trị hợp lý, nhất quán với limiter phút dùng 60.
4. **Không phân biệt riêng lỗi "request đã đóng trước lượt"** khỏi lỗi provider chung (đều → 502, log "tts synth failed: …") — vì response đã vô nghĩa với client đã ngắt; điều quan trọng theo spec là provider không được gọi, đã kiểm bằng test riêng.
5. Route dùng `require('./deck-routes.js')` để tái dùng `etagMatches` (không sửa file đó) — tránh trùng lặp logic so khớp ETag yếu.

## Unresolved
- Không có mâu thuẫn/chặn kỹ thuật. Bước 0 thật (Node version + outbound Nhân Hòa) vẫn cần người dùng chạy trên môi trường production trước khi bật `TTS_ENABLED` ở đó.

Status: DONE
Summary: Route/provider/cache TTS hoàn chỉnh theo contract phase 1; 508/508 test xanh; smoke thật tạo MP3 thành công từ máy dev, chứng minh thư viện + escape XML hoạt động đúng.
Concerns/Blockers: Bước 0 thật trên Nhân Hòa (Node version + outbound tới Microsoft) chưa chạy — cần người dùng xác nhận trước khi bật TTS ở production; nếu bị chặn, đặt `TTS_ENABLED=false` (client tự fallback Web Speech theo phase 2).
