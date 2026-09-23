---
phase: 3
title: "Tích hợp chip, PWA, docs, test máy thật"
status: in-progress
priority: P2
dependencies: [2]
---

# Phase 3: Tích hợp chip, PWA, docs, test máy thật

## Overview
Nối game vào khung "Chơi nhanh", Esc, service worker, version; cập nhật README/docs; nghiệm thu trên iPhone thật + laptop.

## Requirements
- Functional: chip "Bắn máy bay" khoá khi < 8 từ đã học có `meaning`; kỷ lục hiện ★ trên chip; Esc = pause trong game này.
- Non-functional: 3 game cũ không đổi hành vi; `pwa-assets` test xanh.

## Architecture / thay đổi cụ thể
- `js/word-games.js`: `GAME_IDS` thêm `'planes'`; `GAME_LABEL.planes = 'Bắn máy bay'`; `gamePool` nhánh `if (gameId === 'planes') return !!w.meaning;`.
- `js/word-game-ui.js` `startGame`: `n` cho planes = `TIMED_ROUND`; nhánh cuối `else if (id === 'planes') startPlaneGame(); else startTimedGame();`.
- `js/word-game-rounds.js` `stopGameTimer`: thêm `if (game && game.stop) { game.stop(); game.stop = null; }`.
- `js/app-shell.js:67`: `if (game) { if (e.key === 'Escape') (game.id === 'planes' ? togglePlanePause() : quitGame()); return; }`.
- `index.html`: `<script src="js/plane-game-logic.js">` sau `word-games.js`; `<script src="js/plane-game-ui.js">` trước `word-game-ui.js`.
- `sw.js`: thêm 2 file vào `ASSETS`; `CACHE = 'lingobrain-v2.7.0'`. `js/app-storage.js`: `APP_VERSION = '2.7.0'`.
- Backup: không cần sửa (`gameScore` lưu cả object → `gameScore.planes` tự có). Chỉ kiểm tra lại.

## Related Code Files
- Modify: `js/word-games.js`, `js/word-game-ui.js`, `js/word-game-rounds.js`, `js/app-shell.js`, `index.html`, `sw.js`, `js/app-storage.js`, `README.md`, `docs/system-architecture.md`
- Modify (test): `tests/word-games.test.js` nếu có test đếm `GAME_IDS` / `gameAvailability`

## Implementation Steps
1. Sửa các file trên theo thứ tự; `node tests/run-tests.js` xanh (gồm `pwa-assets`, `word-games`).
2. Kiểm tra `gameAvailability` với bộ < 8 từ → chip planes khoá + lý do.
3. README: thêm mục "Bắn máy bay" vào phần game (luật, iPhone: bấm Bắt đầu để bật bàn phím). `docs/system-architecture.md`: thêm 2 module mới + thứ tự nạp.
4. Test máy thật:
   - iPhone Safari (tab) + PWA đã cài: bàn phím bật ngay, không máy bay bị che, không cuộn, QuickType bật/tắt vẫn khớp, chuyển app → pause, xoay máy không vỡ layout.
   - Laptop Chrome + Safari/Firefox: gõ nhanh mượt, Esc pause/tiếp.
   - DevTools: so `localStorage['eng.srs.v2']` trước/sau ván → giống hệt.
   - Offline: tắt mạng, tải lại PWA, chơi được.
5. Chỉnh `PLANE_FALL_SECONDS` nếu chơi thật thấy quá nhanh/chậm (ghi lại giá trị cuối trong README).

## Success Criteria
- [ ] Toàn bộ tiêu chí nghiệm thu ở `plan.md` đạt
- [ ] 3 game cũ chơi lại bình thường, Esc vẫn thoát ở 3 game đó
- [ ] File backup xuất ra có `gameScore.planes`

## Risk Assessment
- Quên bump 1 trong 2 version → test `pwa-assets` bắt; người dùng không nhận bản mới.
- Thêm `'planes'` vào `GAME_IDS` làm hàng chip dài hơn trên iPhone SE → kiểm tra chip xuống dòng gọn (CSS `flex-wrap` sẵn có?); nếu tràn thì rút nhãn "Bắn máy bay" → "Máy bay".
- Rollback: revert commit; `gameScore.planes` thừa trong localStorage vô hại.
