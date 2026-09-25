# Phase 2 report: client speak() dùng /api/tts

## Files modified
- `js/speech-synthesis.js` (rewrite, ~112 dòng): thêm `ttsOffUntil`/`curAbort`/`TTS_MAX`, `ttsUrl()`, `stopSpeaking()`, watchdog trong `speakSystem`, `speak()` dùng AbortController module-level cho cả nguồn mp3 dựng sẵn lẫn `/api/tts` (huỷ lượt cũ khi có lượt mới), timeout 6s cho tts, set `ttsOffUntil` khi 501/404/405.
- `js/review-steps-learn.js`: bước 5 — `cap = Math.min(20000, 6000 + 100*t.length)`; `go()` gọi `stopSpeaking()` trước `nextCard()`.
- `tests/speech-synthesis-tts.test.js` (mới, Node-only): 13 case, nạp `speech-synthesis.js` vào vm context riêng/test với stub Audio/SpeechSynthesisUtterance/speechSynthesis/fetch/timer/Date.

## Tasks completed
- [x] `ttsUrl()`: online, ≤200 ký tự (kiểm trên `audioKey()` đã chuẩn hoá — khớp cách server chuẩn hoá), không `<`/`>`, chưa bị tắt tạm.
- [x] fetch `/api/tts` kèm header `X-LB-TTS: 1`.
- [x] 501/404/405 → `ttsOffUntil = now + 10 phút`; lỗi khác → fallback 1 lần, không tắt.
- [x] AbortController module-level: mỗi `speak()` mới `curAbort.abort()` lượt trước — áp dụng luôn cho fetch mp3 dựng sẵn (không chỉ tts) để nhất quán theo đúng chữ trong Architecture section của phase file.
- [x] `stopSpeaking()`: tăng token, abort, `speechSynthesis.cancel()`, `player.pause()`, resolve `pendingDone`.
- [x] watchdog `speakSystem`: `setTimeout(finish, max(4000, 150*len/rate))`, tự `done()` nếu `onend/onerror` im lặng.
- [x] `speak()` luôn resolve Promise (kể cả lỗi mạng bất kỳ, timeout, abort).
- [x] Bước 5: cap mới + `stopSpeaking()` trong `go()`.
- [x] `tests/speech-synthesis-tts.test.js`: đủ mọi case liệt kê trong phase file.

## Tests status
- Type check: N/A (vanilla JS, không có bước typecheck riêng trong repo)
- `node --check js/speech-synthesis.js`, `js/review-steps-learn.js`, `tests/speech-synthesis-tts.test.js`: pass
- `npm test`: **520 passed, 0 failed** (toàn bộ suite, gồm cả `tests/tts-routes.test.js` của phase 1 chạy song song — cũng xanh)

## Deviations (with reason)
- AbortController áp dụng cho cả nhánh mp3 dựng sẵn (không chỉ tts) — Architecture section viết `if (curAbort) curAbort.abort(); curAbort = new AbortController();` ở đầu mọi lượt `speak()` không phân biệt nguồn; giữ nguyên đúng câu chữ này thay vì chỉ optional-abort riêng nhánh tts, để nhất quán 1 cơ chế huỷ duy nhất (đơn giản hơn, đúng RT#9 "mỗi speak() mới huỷ fetch của lượt trước" — không giới hạn nguồn nào).
- `ttsUrl()` kiểm độ dài/ký tự cấm trên `audioKey(text)` (đã chuẩn hoá khoảng trắng) thay vì `text` thô — khớp cách server `normalizeTtsText()` chuẩn hoá trước khi tính giới hạn 200 ký tự (phase-01 contract), tránh lệch giữa 2 phía khi câu có khoảng trắng thừa.
- Không đụng `sw.js`, `index.html` theo đúng file ownership.

## Issues encountered
None — không có xung đột file với session boss-game.

## Next steps
Phase 3 (nếu có) có thể dựa vào `stopSpeaking()`/`ttsUrl()` đã export global giống các hàm khác trong file.

## Unresolved questions
None.

Status: DONE
Summary: speak() dùng /api/tts với fallback Web Speech đầy đủ theo mọi mã lỗi/timeout/abort; stopSpeaking() + watchdog thêm; s5 cap+stop cập nhật; 13 test mới xanh, toàn bộ npm test 520/520 xanh.
Concerns/Blockers: none.
