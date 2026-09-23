# Phase 2 — Runtime `speak()` + service worker

## Files
- Sửa `js/speech-synthesis.js` (giữ `speak(text, rate)`, `hasVoice()`)
- Sửa `sw.js`

## speech-synthesis.js
- `fetch('audio/index.json')` lúc nạp; lỗi (file://, 404) → map rỗng, im lặng.
- 1 `Audio` dùng chung; mở khoá trên iOS ở `pointerdown` đầu tiên (play clip im lặng).
- `speak`: huỷ Web Speech + audio đang phát, tăng token; có trong map → `fetch` mp3 → blob URL → phát (tránh lỗi Range request của Safari với response từ cache); `playbackRate = rate || 1`. Token cũ → bỏ. fetch/play lỗi → Web Speech.
- `pickVoice`: ưu tiên `/Christopher|Andrew|Guy/ + Natural|Online`, rồi tên nam phổ biến (Google UK English Male, Daniel, Alex), rồi en-US bất kỳ.
- `hasVoice()`: true nếu map có mục HOẶC Web Speech khả dụng.

## sw.js
- `ASSETS` += `./audio/index.json`; `audio/index.json` network-first như `words.json`.
- `/audio/*.mp3`: cache-first vào `lingobrain-audio`; `activate` giữ cache này.

## Rủi ro
- Autoplay bị chặn khi phát tự động sau fetch async → fallback Web Speech; unlock giảm thiểu.
