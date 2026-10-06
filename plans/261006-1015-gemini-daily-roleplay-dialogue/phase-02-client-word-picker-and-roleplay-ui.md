---
phase: 2
title: Client word picker and roleplay UI
status: completed
priority: P1
dependencies:
  - 1
---

# Phase 2: Client word picker and roleplay UI

## Overview
Chọn từ hôm nay (hàm thuần), hỏi server bật/tắt, gọi `POST /api/dialogue`, cache `eng.dialogue.v1`, chạy màn nhập vai trong lớp toàn màn với dọn dẹp đúng khi đóng.

## Requirements
- Functional: chọn ≤8 từ; tải/cache hội thoại; nhập vai từng lượt; ghi âm tạm hoặc gõ; xem câu mẫu; 🔊 khi bấm; màn kết; "Tạo đoạn khác (n/3)"; tiếp tục từ lượt dở.
- Non-functional: chuỗi từ LLM chỉ vào DOM qua `textContent` (không `innerHTML`); đóng màn bất kỳ cách nào (✕, back hệ điều hành, đổi tab) → tắt micro, huỷ request, thu hồi blob URL; offline xem lại bản cache.

## Architecture
- `js/daily-dialogue-word-picker.js` [thuần, `module.exports` như `srs-scheduler.js`; thêm vào `PURE_MODULES` trong `tests/run-tests.js` sau `srs-scheduler.js`]:
  `pickTodayWords(deck, srs, from, to, max = 8)` → `[id]` (gọi `pickTodayWords(deck, srs, today(), today() + DAY)` — dùng lại `today()`/`dkey()` của `app-storage.js`, không viết hàm ngày mới; tránh khai báo top-level trùng tên global như `DAY`).
  Lấy từ có `hist` với `from ≤ t < to`. Ưu tiên: có lượt `g === 0` trong khoảng → 0; lượt đầu tiên của `hist` nằm trong khoảng (mới học hôm nay) → 1; còn lại → 2; cùng nhóm sắp theo lượt chấm gần nhất. Bỏ id không còn trong deck.
- `js/daily-dialogue-roleplay-ui.js`:
  - Bật/tắt: `dialogueEnabled()` → `GET /api/dialogue`, nhớ kết quả 10 phút (như cờ tắt TTS, `js/speech-synthesis.js:36`). Lỗi mạng / 404 / 405 / 501 / `{enabled:false}` → coi là tắt, ẩn nút.
  - State `eng.dialogue.v1` = `{ user, day, genCount, genMax, dialogue, pos, done }` qua `save/load` (`js/app-storage.js`); không nằm trong `SYNC_KEYS` → không đồng bộ. `user` ≠ username hiện tại (`eng.auth.v1`) → bỏ cache. Khác ngày **và đã xong** → bỏ; khác ngày mà đang dở → giữ đến khi xong hoặc người dùng tạo đoạn mới.
  - `openDialogue()`: cache hợp lệ → mở luôn. Không có → chưa đăng nhập → CTA "Đăng nhập ở tab Tôi"; 0 từ hôm nay → toast "Ôn ít nhất 1 từ trước"; offline → "Cần mạng để tạo hội thoại". Ngược lại `openStage('dialogue')` + trạng thái tải "Đang soạn hội thoại…", `fetch` với `AbortController` hết hạn **35s**, `reqToken` tăng mỗi lần. Khi có kết quả: chỉ vẽ nếu `stage === 'dialogue'` và token khớp; nếu không thì chỉ lưu cache.
  - Lỗi: 401 → CTA đăng nhập; 429 → `error` của server; 404/405/501 → tắt + ẩn nút; 503/mạng/timeout → "Thử lại sau".
  - Màn: intro (tình huống VI/EN, vai, chip từ mục tiêu) → từng lượt (thanh n/N, nhãn "lượt"):
    - `them`: bong bóng trái, câu EN, nút 🔊 (**không tự phát**), "Xem dịch" mở `vi`.
    - `you`: bong bóng phải, `hintVi` + chip từ của lượt; ⏺ ghi tạm (nghe lại) và ô gõ tuỳ chọn; "Xem câu mẫu" → `en` có từ mục tiêu tô đậm + 🔊 + `vi`; đã gõ thì hiện câu đã gõ cạnh câu mẫu.
    - "Tiếp" → lượt sau, lưu `pos`.
    - Chỉ hiện lượt hiện tại + 1 lượt trước (màn nhỏ).
  - Tô đậm: tách `en` thành text node + `<b>` dựng bằng `document.createElement`/`textContent` theo `matchSpans()` của `js/dialogue-word-match.js` (cùng module validator server dùng, tạo ở phase 1); không regex trên HTML.
  - Màn kết: toàn bộ hội thoại, từ mục tiêu tô đậm, `missing` → "chưa xuất hiện: …"; "Tạo đoạn khác (genCount/genMax)" → POST `regenerate: true`; gọi `onDialogueDone()` (phase 3 nối vào tích t6).
  - `closeDialogue()` (gọi từ hook đóng stage): abort fetch, `recorder.stop()` + dừng mọi track, revoke mọi blob URL, `stopSpeaking()`.
- Ghi âm: **không đụng `js/daily-plan.js`** (giữ nguyên `mediaRec` global mà `js/cloud-sync-account-ui.js:120` dựa vào). Roleplay có bộ ghi riêng trong module: `startMic()` → handle `{ stop(): Promise<Blob>, cancel() }`, state cục bộ trong handle, `cancel()` dừng track không tạo blob.
- TTS: `speak(text)` (`js/speech-synthesis.js`, đi `/api/tts` khi không có MP3) — chỉ khi người dùng bấm 🔊.
- `js/app-shell.js` (hook stage):
  - `leaveStage()` gọi `if (stage === 'dialogue' && typeof closeDialogue === 'function') closeDialogue()` trước khi xoá `#app`.
  - `setStageProgress(n, N, label = 'thẻ')` — tham số nhãn cho aria.
  - Toast ✕ (`session.done`) chỉ khi `stage === 'review'`; Esc đóng cả `dialogue`.

## Related Code Files
- Create: `js/daily-dialogue-word-picker.js`, `js/daily-dialogue-roleplay-ui.js`, `tests/daily-dialogue-word-picker.test.js`
- Modify: `js/app-shell.js` (hook đóng, nhãn tiến độ, toast, Esc), `tests/run-tests.js` (`PURE_MODULES`), `css/paper-theme.css` (bong bóng, chip, trạng thái tải), `index.html` (script: `dialogue-word-match.js` + picker sau `srs-scheduler.js`/`app-storage.js`, UI trước `app-shell.js`)

## Implementation Steps
1. Word picker + test: không lượt trong khoảng → `[]`; ranh giới `to`; `g===0` > mới học > ôn; cắt 8; id mất khỏi deck bị bỏ; `hist` bị cắt (server giữ 20) vẫn không crash.
2. Hook stage trong `app-shell.js`; kiểm tra phiên ôn và game vẫn đóng như cũ.
3. UI nhập vai + bộ ghi riêng + CSS; thử bằng response mẫu (contract phase 1) trước khi có key.
4. Thử tay: vuốt back khi đang ghi → đèn micro tắt; bấm nút rồi back và vào phiên ôn trước khi response về → phiên ôn không bị đè; đăng xuất, user khác đăng nhập → không thấy đoạn cũ.

## Success Criteria
- [ ] Test word picker xanh (đăng ký trong `PURE_MODULES`); test cũ xanh
- [ ] Nhập vai đi hết lượt trên iPhone Safari + Chrome Android: 🔊, ghi tạm, gõ, xem câu mẫu
- [ ] Đóng bằng ✕ / back / đổi tab khi đang ghi hoặc đang tải → micro tắt, không vẽ đè màn khác
- [ ] Đóng giữa chừng → mở lại tiếp đúng lượt; qua nửa đêm khi đang dở → vẫn làm tiếp được
- [ ] Không chỗ nào đưa chuỗi LLM vào `innerHTML`
- [ ] Server tắt / 404 → nút ẩn, không lỗi

## Risk Assessment
- Safari MediaRecorder: dùng `mediaRec.mimeType || 'audio/webm'` như code hiện có.
- Hook mới trong `leaveStage` chạm luồng chung → chỉ thêm nhánh `stage === 'dialogue'`, thử lại ôn + game.
- Khớp từ để tô đậm lệch với validator → cùng 1 module `js/dialogue-word-match.js`; không tô được thì cũng không sai nghĩa.
