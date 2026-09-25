# Phase 1 — Hidden typing input: implementation report

Ngày 2026-09-25 · Version 2.21.2

## Đã làm
- `js/word-game-ui.js`: `gameHeadHtml(progress, extraHtml = '')` — 1 tham số → output y hệt.
- `js/plane-game-ui.js`: ⏸ lên header; `#planeInput.game-type-sink` trong `#planeField`; bỏ `.plane-input-row`.
- `js/boss-game-ui.js`: ⏸ lên header; `#bossSkip` cột 3 `#bossPrompt`; `#bossUlt.boss-ult-float` + `#bossInput.game-type-sink` trong `#bossField`. Id giữ nguyên → handler không đổi. 194 dòng.
- `css/paper-theme.css`: xoá rule `.plane-input-row*`; thêm `.plane-field input.game-type-sink` (specificity > `input[type=text]`, fix review M1), `#planePause,#bossPause`, grid 3 cột `.boss-prompt`, `.boss-ult-float`.
- `APP_VERSION` = `CACHE` = 2.21.2. `docs/system-architecture.md` thêm 1 bullet.

## Kiểm chứng
- `node tests/run-tests.js`: 531 passed, 0 failed.
- Code review: DONE_WITH_CONCERNS → M1 (sink bị rule input chung phóng to 100%×48px) đã sửa; L1 (rule header chạm nút ←) đã thu hẹp về id ⏸.
- Trình duyệt thật (agent-browser, Chromium, 390×664):
  - Plane: input 1×1, opacity 0; field 589/664px; header 1 dòng 51px; Bắt đầu → focus input; gõ `f` → khoá mục tiêu "free"; ⏸ → pause + overlay; Chơi tiếp → focus lại.
  - Boss: input 1×1; field 508px; "Bỏ" trong thẻ đề (44px cao); gõ `ab` → `#bossLetters` sáng; Bỏ/Tuyệt kỹ bấm → input vẫn focus, không pause; Tuyệt kỹ góc dưới-phải không đè HUD; ⏸ → pause.
  - 320×568: header 1 dòng, không tràn ngang; thẻ đề 97px (đề dài xuống dòng).
- Ảnh: scratchpad `plane-play.png`, `boss-ult.png`.

## Chưa làm
- Phase 2: kiểm iPhone thật (bàn phím ảo, kính lúp, scroll khi focus) — không có máy trong môi trường này.

## Câu hỏi chưa giải
- Commit thế nào khi working tree trộn thay đổi chưa commit của plan combat-depth trong cùng file?
