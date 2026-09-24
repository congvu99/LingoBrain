---
phase: 3
title: "Tích hợp chip, màn kết thúc, PWA, docs"
status: done
priority: P2
dependencies: [2]
---

# Phase 3: Tích hợp chip, màn kết thúc, PWA, docs

## Overview
Nối game vào khung "Chơi nhanh", thêm phần "Bạn hay nhầm" vào màn kết thúc, cập nhật PWA và tài liệu.

## Requirements
- Chip 'Chém chữ' mở khi ≥ 8 từ đã học (≤ 16 ký tự), hiện kỷ lục cấp đang chọn.
- Màn kết thúc: nếu `game.confusions` có dữ liệu → khối "Bạn hay nhầm" liệt kê `target ✂️ decoy ×n`, xếp theo n giảm dần, tối đa 5 dòng. Game khác không đổi.
- Esc khi đang chơi (đã bắt đầu) → tạm dừng/tiếp, như Bắn máy bay.
- PWA offline chạy được; `APP_VERSION` = `CACHE` = `2.13.0`.

## Related Code Files
- Modify:
  - `js/word-games.js`: `GAME_IDS` + `'fruit'`, `GAME_LABEL.fruit = 'Chém chữ'`, `gamePool` nhánh `fruit` (`!!w.meaning && w.word.length <= FRUIT_MAX_WORD` — hằng số đặt ở word-games.js hoặc lặp số 16 kèm chú thích để không phụ thuộc thứ tự nạp)
  - `js/word-game-ui.js`: `startGame` → `startFruitGame()`; `gameChipsHtml` lấy khoá kỷ lục theo game có cấp (tách hàm `gameBestKey(id)` cho planes + fruit); `endGame` hiện khối cặp nhầm
  - `js/app-shell.js`: nhánh Esc cho `fruit` (dùng `fruitUi`)
  - `css/paper-theme.css`: `.fruit-game`, `.fruit-field`, `.fruit-prompt`, `.fruit-overlay` (tái dùng quy tắc `.plane-*` khi được, `touch-action:none`, `overscroll-behavior:none`), `.game-confusions`
  - `index.html`: 3 `<script>` sau `plane-game-ui.js`, trước `word-game-rounds.js`
  - `sw.js`: 3 dòng `ASSETS` + `CACHE` → `lingobrain-v2.13.0`
  - `js/app-storage.js`: `APP_VERSION` → `2.13.0`
  - `README.md`: dòng bảng game + đoạn luật Chém chữ
  - `docs/system-architecture.md`: module mới, ranh giới game ↔ SM-2 giữ nguyên

## Implementation Steps
1. Sửa `word-games.js` + test `gameAvailability` có `fruit`.
2. Sửa `word-game-ui.js` (start, khoá kỷ lục, confusions trong endGame — escape HTML bằng `esc`).
3. Esc trong `app-shell.js`.
4. CSS.
5. `index.html`, `sw.js`, bump version; chạy `node tests/run-tests.js` (có `pwa-assets`).
6. README + `docs/system-architecture.md`.
7. Kiểm tay: ván đầy đủ, backup chứa `fruit*`, tải lại giữ kỷ lục, offline.

## Success Criteria
- [ ] Toàn bộ test xanh
- [ ] Chip khoá/mở đúng, kỷ lục theo cấp
- [ ] Màn kết thúc hiện cặp nhầm; các game cũ không đổi giao diện
- [ ] `eng.srs.v2` không đổi sau 1 ván
- [ ] Docs khớp hành vi thật

## Risk Assessment
- Sửa `endGame` dùng chung → chỉ thêm khối có điều kiện, game cũ không có `confusions` nên không ảnh hưởng.
- Plan Bắn máy bay đang mở cũng sửa `word-game-ui.js` / `app-shell.js` → rebase nhỏ nếu làm song song.
