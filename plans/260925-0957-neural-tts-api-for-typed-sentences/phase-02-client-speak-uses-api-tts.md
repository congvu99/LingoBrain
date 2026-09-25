---
phase: 2
title: Client speak uses api tts
status: completed
priority: P2
dependencies: []
effort: 2h
---

# Phase 2: Client speak uses api tts

## Overview
`speak()` phát MP3 từ `/api/tts` cho text không có MP3 dựng sẵn; mọi lỗi rơi về Web Speech. Thêm `stopSpeaking()`, huỷ lượt tải cũ, watchdog Web Speech. Chỉ dựa vào contract ở phase 1 (không cần server chạy để code).

## Requirements
- Functional: text có trong `audioMap` → như cũ. Không có → `fetch('api/tts?text=' + encodeURIComponent(audioKey(text)), { headers: { 'X-LB-TTS': '1' }, signal })` khi: `navigator.onLine !== false`, độ dài ≤ 200, không chứa `<`/`>`, TTS chưa bị tắt tạm. [RT#1, RT#2]
- Functional — xử lý mã lỗi `/api/tts` [RT#3]:
  - **501** → `ttsOffUntil = Date.now() + 10 phút` (hết hạn thì thử lại; server tắt/bản cũ không có tts).
  - **404/405** (server cũ chưa có route) → như 501.
  - 400/403/429/502/503/timeout/mạng lỗi → chỉ fallback Web Speech lần đó.
- Functional: mỗi `speak()` mới **huỷ** fetch của lượt trước (AbortController ở mức module), không chỉ bỏ qua kết quả. [RT#9]
- Functional: `stopSpeaking()` — tăng token, huỷ fetch, `speechSynthesis.cancel()`, `player.pause()`, resolve `pendingDone`. [RT#8]
- Functional: `speakSystem` có watchdog: tự `done()` sau `max(4000, 150 × độ dài / rate)` ms nếu `onend/onerror` không bắn (iOS chặn Web Speech ngoài cử chỉ). [RT#10]
- Functional: giữ hợp đồng `speak()` trả Promise luôn resolve.
- Non-functional: fetch `/api/tts` timeout 6s (AbortController) → fallback.

## Architecture
- `js/speech-synthesis.js`:
  - `let ttsOffUntil = 0, curAbort = null; const TTS_MAX = 200;` + `ttsUrl(text)` trả `null` nếu không đủ điều kiện → `speakSystem` như hiện tại.
  - `speak()`: `if (curAbort) curAbort.abort(); curAbort = new AbortController();` chọn `src = file ? 'audio/' + file : ttsUrl(text)`; nguồn tts thêm header + timer 6s gọi `abort`. Dùng lại đường fetch → blob → `player.play()` + `fallback` một lần hiện có. Abort do lượt mới (token đã đổi) → không fallback; abort do timeout (token còn khớp) → fallback.
  - Mã 501/404/405 từ nguồn tts → set `ttsOffUntil` trước khi throw vào fallback.
  - `stopSpeaking()` export global (cùng kiểu các hàm khác trong file).
  - Không đụng `sw.js`: `/api/*` đi mạng (sw.js:169); lặp lại câu nhờ HTTP cache 1 ngày + ETag + cache DB.
  - `hasVoice(text)` không đổi.
- `js/review-steps-learn.js` bước 5 [RT#8]:
  - `cap = Math.min(20000, 6000 + 100 * t.length)` (≥ timeout fetch 6s + thời gian đọc).
  - `go()`: nếu điều kiện chuyển thẻ đúng → `stopSpeaking(); nextCard();` (dừng câu cũ trước khi thẻ mới render — không đọc đè kể cả màn "hết phiên" không gọi `speak()`).

## Related Code Files
- Modify: `js/speech-synthesis.js`, `js/review-steps-learn.js`
- Create: `tests/speech-synthesis-tts.test.js` (Node-only) [RT#15]
- Không đổi: `sw.js`

## Implementation Steps
1. Biến module + `ttsUrl` + `stopSpeaking` + watchdog trong `speakSystem`.
2. `speak()`: AbortController module-level, nguồn tts + header + timeout 6s, xử lý mã lỗi theo Requirements; giữ token/pendingDone/fallback.
3. Comment đầu file: thứ tự nguồn MP3 dựng sẵn → /api/tts → Web Speech.
4. Bước 5: cap mới + `stopSpeaking()` trong `go()`.
5. `tests/speech-synthesis-tts.test.js`: Node-only (`if (typeof require === 'undefined') return`), nạp `js/speech-synthesis.js` vào `vm` context riêng với stub `window`, `Audio`, `SpeechSynthesisUtterance`, `speechSynthesis` (cancel bắn onerror), `fetch` điều khiển được, `fetchFirstOk/audioSources/isAudioIndexJson/cleanAudioItems`, `URL`, `document`, `navigator`, `AbortController`, `setTimeout`. Case:
   - có MP3 dựng sẵn → không gọi `api/tts`; không MP3 + online → gọi `api/tts?text=` có header `X-LB-TTS`.
   - 501 → Web Speech, lần sau không fetch; sau 10 phút (giả lập `Date.now`) → fetch lại. 404 → như 501.
   - 503/429/502 → Web Speech, lần sau vẫn fetch.
   - offline / > 200 ký tự / có `<` → không fetch.
   - lượt mới → fetch cũ bị `abort()`; timeout 6s → fallback Web Speech.
   - `stopSpeaking()` → Promise đang chờ resolve, player pause, cancel gọi.
   - watchdog: utterance không bắn onend → vẫn resolve.
   - Promise luôn resolve ở mọi case.
6. `npm test`.

## Success Criteria
- [ ] `tests/speech-synthesis-tts.test.js` mọi case PASS; `npm test` xanh.
- [ ] Trình duyệt: gõ câu → 🔊 nghe giọng Andrew; bấm lại → phát ngay (Network: disk cache / 304).
- [ ] Tắt server/DB → Web Speech; deploy lại (503 vài giây) → không tắt TTS cả phiên.
- [ ] Bước 5 với API chậm: không đọc đè sang thẻ mới.

## Risk Assessment
- iOS: `play()` sau fetch có thể bị chặn → `unlockAudio` sẵn có + fallback; fallback Web Speech bị chặn → watchdog đảm bảo không treo (người dùng có thể không nghe gì lần đó — chấp nhận, bấm 🔊 lại).
- Câu mới lần đầu chậm ~1–2s (chưa đo — đo ở phase 3); không thêm UI loading (YAGNI).
