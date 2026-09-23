# Phase 3 — Test, version, docs

## Files
- Tạo `tests/audio-manifest.test.js`: mọi `word`/`context` (chuẩn hoá) có trong `items`; mọi file tồn tại; không mp3 mồ côi. Bỏ qua nếu chưa có `audio/index.json`.
- `APP_VERSION` + `CACHE` → `2.4.0`.
- `README.md` (mục tạo audio), `docs/system-architecture.md` (TTS).

## Kiểm
- `node tests/run-tests.js` pass; thử thật qua `npx serve .`: nghe từ, câu, đọc chậm, chữ gõ tay, offline.
