# Phase 1 — Script tạo audio + manifest

## Files
- Tạo `tools/generate_edge_tts_audio.py`, `tools/requirements.txt` (`edge-tts`)
- Sinh ra `audio/*.mp3`, `audio/index.json`

## Thiết kế
- Khoá = text chuẩn hoá: `trim` + gộp khoảng trắng (JS runtime dùng đúng quy tắc này).
- Tên file = `sha1(voice + '|' + key)[:12].mp3` → tự dedup, đổi câu/giọng ra file mới.
- `index.json`: `{ "voice": "...", "items": { "<text>": "<hash>.mp3" } }` (compact JSON).
- Bỏ qua file đã có (size > 0); async, semaphore ~6, retry 3 lần backoff; ghi file tạm rồi rename (không để file hỏng khi ngắt giữa chừng).
- Xoá `.mp3` không còn trong manifest. Cờ: `--voice`, `--limit N` (thử mẫu), `--concurrency`.

## Kiểm
- `--limit 5` → nghe thử; chạy full; chạy lại → 0 file mới.

## Rủi ro
- Endpoint không chính thức, có thể rate-limit/đổi → retry + chạy lại được (idempotent). Không ảnh hưởng runtime app.
