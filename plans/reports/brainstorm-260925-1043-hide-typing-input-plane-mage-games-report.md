# Brainstorm: bỏ ô nhập hiển thị ở game Bắn máy bay + Pháp sư

Ngày: 2026-09-25 · Mode: default · Quyết định: Phương án A, chỉ 2 game (không đụng Chém chữ)

## Vấn đề
- `.plane-input-row` (input 48px + padding 8px ≈ 56px) nằm sát bàn phím ảo iPhone — vùng quý nhất.
- Input thực chất chỉ là "mồi focus": `flushTyped` / `flushBossTyped` xoá value sau mỗi ký tự; chữ đang gõ đã hiện trên canvas (máy bay) và `#bossLetters` (pháp sư). Ô hiển thị → chỉ thấy placeholder, vô dụng.
- iOS: bàn phím chỉ bật khi có phần tử editable focus (không dùng được `display:none`/`visibility:hidden`); font ≥16px tránh auto-zoom.

## Phương án đã đánh giá
| | Mô tả | Lợi | Hại |
|---|---|---|---|
| **A (chọn)** | Input tàng hình trong field; ⏸ lên header; "Bỏ" vào thẻ đề; "✨ Tuyệt kỹ" nổi góc dưới-phải field | ~56px cho canvas, không đè HUD, nút gần ngữ cảnh, Tuyệt kỹ gần ngón cái | Nút nổi có thể che góc dưới-phải (pháp sư đứng x=22% → rủi ro thấp) |
| B | Dồn 3 nút lên header | Đơn giản nhất | Chật ở 320px; Tuyệt kỹ xa ngón cái |
| C | Giữ hàng nút mỏng, bỏ input | Ít thay đổi | Gần như không lợi diện tích |

Loại vị trí nút nổi góc trên field: canvas pháp sư đã có HUD 2 góc trên (trái: pip tuyệt kỹ + COMBO; phải: tên quái/HP/tim, `BOSS_TOP_HUD_BOTTOM = 46`).

## Giải pháp chốt (A)
1. **Input tàng hình** (cả 2 game): chuyển `<input>` vào trong `.plane-field` (fixed → iOS không nhảy scroll khi focus). CSS: `position:absolute; opacity:0; width:1px; height:1px; font-size:16px+; caret-color:transparent; pointer-events:none; left/top trong field`. Giữ nguyên toàn bộ attr (`autocapitalize/autocorrect/autocomplete/spellcheck/enterkeyhint/aria-label`) và handler (oninput, compositionend, keydown, blur→pause).
2. **⏸ lên header**: `gameHeadHtml('')` đang trống bên phải → chèn nút ⏸ sau `.spacer` (tham số/hàm phụ, không đổi chữ ký cho game khác, hoặc append DOM sau khi render). Giữ chặn cướp focus (`mousedown`/`touchstart` preventDefault) như hiện tại.
3. **Pháp sư "Bỏ"**: đặt cột phải trong `#bossPrompt` (grid hiện `auto 1fr` → thêm cột `auto`), gắn với từ đang hiện.
4. **Pháp sư "✨ Tuyệt kỹ"**: absolute góc dưới-phải `#bossField`, `hidden` như logic hiện tại (`bossUlt` tại boss-game-ui.js:137), min 44×44 touch target, có thể glow khi sẵn sàng.
5. **Xoá `.plane-input-row`** markup + CSS (chỉ 2 game này dùng — đã grep).
6. Overlay tạm dừng: thêm gợi ý "Chạm Chơi tiếp để bật lại bàn phím" (người dùng không còn ô nào để chạm khi lỡ đóng bàn phím).

## Touchpoints
- `js/plane-game-ui.js` (markup `startPlaneGame`, `bindPlaneControls`)
- `js/boss-game-ui.js` (markup `startBossBattle`, `bindBossControls`)
- `js/word-game-ui.js` `gameHeadHtml` (nếu mở rộng tham số — phải tương thích game khác)
- `css/paper-theme.css` (dòng ~277-291, ~321-322, `.boss-prompt`)
- `sw.js`: bump cache version (file css/js đổi)
- Không test nào tham chiếu `planeInput/bossInput/plane-input-row` → không vỡ test logic.

## Acceptance criteria
- iPhone (Safari + PWA): bấm "Bắt đầu"/"Chơi tiếp" → bàn phím bật, gõ bắn/niệm chú bình thường; không có ô nhập nào hiển thị; không zoom, không nhảy scroll.
- Field cao thêm ~56px khi bàn phím mở (so trước/sau).
- ⏸, Bỏ, Tuyệt kỹ bấm được, **không** làm đóng bàn phím / không tự pause.
- Đóng bàn phím (Done / chạm ngoài) → tự pause như cũ; "Chơi tiếp" bật lại bàn phím.
- Desktop: gõ phím, Enter, Shift+Enter (tuyệt kỹ), Esc vẫn hoạt động; không có viền focus lơ lửng.
- Telex/IME đang soạn dở: hành vi composition giữ nguyên.
- Nút Tuyệt kỹ không đè HUD canvas; ở 320px header không tràn.

## Ngoài phạm vi
- Game Chém chữ (không có ô gõ, ⏸ đã nổi trong field).
- Đổi logic gõ/bắn/niệm; đổi HUD canvas.

## Rủi ro
- iOS: input `opacity:0` quá nhỏ đôi khi hiện kính lúp/selection handle → `caret-color:transparent`, `user-select:none` trên field; test thiết bị thật.
- Nút header/prompt phải giữ trick chặn blur (touchstart preventDefault) — nếu sót → bấm nút là pause.
- `gameHeadHtml` dùng chung → sửa kiểu thêm tham số tuỳ chọn, không đổi output mặc định.

## Câu hỏi còn mở
- Không.
