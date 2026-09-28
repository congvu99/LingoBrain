# Phase 5 — Tab Chơi

Context: audit #4 · `js/word-game-ui.js` (`renderGameChips`, `gameLockReason`), `js/word-games.js` (`GAME_LABEL`)

## Wireframe
```
Chơi
┌────────────────────────────────────┐
│ PHÁP SƯ LEXORIA            Lv 7    │  thẻ lớn: chương/trận hôm nay;
│ Chương 2 · Trận 4     [Vào trận]   │  đã đánh hôm nay → "Luyện phép"
└────────────────────────────────────┘
┌────────────────┐ ┌────────────────┐
│ Xếp chữ        │ │ Chạy 60 giây   │   mỗi thẻ: tên · luyện gì ·
│ Chính tả       │ │ Phản xạ        │   thời lượng · kỷ lục
│ 10 từ · 2p ★ 8 │ │ 60s     ★ 420  │
└────────────────┘ └────────────────┘
khoá: Điền câu tốc độ — cần thêm 3 từ có câu ví dụ   ← lý do hiện sẵn, không toast
```
Còn thẻ đến hạn: dải nhẹ trên cùng "Còn 45 thẻ cần ôn · Ôn trước ›" (theo quyết định #3; không khoá).

## Yêu cầu
- Tái dùng `gameAvailability`, `gameBestKey`, `gameLockReason`; chỉ đổi phần vẽ.
- Bắt đầu game → `openStage({ kind: 'game' })`.
- Icon SVG cho thẻ game (quy tắc no-emoji-icons); emoji trong nội dung từ giữ nguyên.

## Files
- Sửa: `js/word-game-ui.js` (`gameChipsHtml` → `gameCardsHtml`), `js/word-games.js` (thêm `GAME_META` {purpose, duration}), `index.html`, `css/paper-theme.css`
- Kiểm: `tests/word-games.test.js` nếu test markup chip
