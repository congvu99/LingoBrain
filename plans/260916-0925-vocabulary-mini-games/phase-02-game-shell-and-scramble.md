---
phase: 2
title: "Khung game + Xếp chữ"
status: completed
priority: P1
dependencies: [1]
---

# Phase 2: Khung game + Xếp chữ

## Overview

Dựng khung UI dùng chung cho cả 3 game (menu chip, chiếm màn hình, màn kết thúc, lưu điểm/từ sai) và hoàn thiện game đầu tiên: Xếp chữ. Kết thúc pha này app đã chơi được thật, từ sai đã chảy đúng vào phiên ôn.

## Requirements

- Chức năng: 3 chip trên đầu tab Ôn từ (2 cái sau tô xám "sắp có"), chơi trọn 1 ván Xếp chữ 10 từ, màn kết thúc, kỷ lục lưu lại, từ sai vào hàng đợi ôn.
- Phi chức năng: chạm tốt trên mobile (vùng chạm ≥ 44px), theo token màu/chữ của `css/paper-theme.css`, không hoạt hình rườm rà.
- Không đụng SM-2.

## Architecture

### Khoá lưu trữ mới — `js/app-storage.js`

```js
const K_GAMEMISS = 'eng.gamemiss.v1', K_GAMESCORE = 'eng.gamescore.v1';
let gameMiss  = load(K_GAMEMISS, []);
let gameScore = load(K_GAMESCORE, {});
```

`restartSession()` trong `review-steps-learn.js` đổi thành:

```js
queue = buildQueue(deck, srs, cfg, Date.now(), gameMiss);
gameMiss = [];            // đã tiêu thụ
save(K_GAMEMISS, gameMiss);
```

`init()` trong `app-shell.js` cũng truyền `gameMiss` vào `buildQueue` và dọn tương tự.

### Điểm vào — markup trong `#tab-game`

Chèn ngay sau khối `.stats`, trước `<div id="app">`:

```html
<div class="game-chips" id="gameChips" aria-label="game từ vựng"></div>
```

`renderGameChips()` vẽ 3 nút. Chip khoá → `disabled` + `title` nêu lý do ("cần thêm N từ đã học" / "cần thêm câu ví dụ"). Gọi từ `render()` của `review-steps-learn.js` (một dòng ở đầu hàm) để chip cập nhật mỗi lần vào tab.

Thêm chip vào cả thẻ "hết thẻ hôm nay" trong `render()` — chỗ hiện đang báo học xong.

### Vòng đời một ván

```js
let game = null;   // null = không chơi | { id, words, i, right, wrong, streak, bestStreak, score, miss[], t0, timer }
```

- `startGame(id)` → dựng `game`, `renderGame()`
- `renderGame()` vẽ vào `#app` (đè nội dung thẻ ôn), có nút `←` gọi `quitGame()`
- `quitGame()` → `flushMiss()`, `game = null`, `render()`
- `showTab()` trong `app-shell.js`: nếu `game` đang chạy mà chuyển tab → `quitGame()` trước (không lưu điểm, **vẫn lưu từ sai**)

`flushMiss()`: `game.miss.forEach(id => gameMiss = addMiss(gameMiss, id)); save(K_GAMEMISS, gameMiss);`

Bàn phím: pha này chỉ cần `Esc` → `quitGame()`. Handler `keydown` sẵn có trong `app-shell.js` phải **bỏ qua khi `game` đang chạy** (phím `1`–`4` và `Space` là của màn ôn, không phải của game).

### Game A — Xếp chữ

10 từ/ván, **không đồng hồ**.

```
        bướng bỉnh                      3 / 10

   [b][o][r][s][t][u][b][n]        ← chạm để lấy
   s t u b _ _ _ _                 ← chạm ô đã đặt để trả lại
                       [⌫ Xoá] [Chịu]
```

- Nguồn: `pickGameWords(gamePool(deck, srs, 'scramble'), SCRAMBLE_ROUND, Math.random)`
- Ô `fixed` (dấu cách / gạch nối) hiển thị sẵn ở đúng vị trí, không chạm được
- Đặt đủ ô → tự kiểm tra:
  - Đúng → 🔊 `speak(w.word)`, hiện ✓ + nghĩa + IPA, nút "Tiếp →"
  - Sai → hiện ✗ + đáp án đúng, đẩy `w.id` vào `game.miss`, nút "Tiếp →"
- "Chịu" → tính như sai
- Điểm: mỗi từ đúng +1 (không combo — game này không tính tốc độ)

### Màn kết thúc — dùng chung cả 3 game

```
Xếp chữ · 7 đúng / 10            Điểm 7    ★ Kỷ lục cũ 9

3 từ vừa sai sẽ được ôn trước ở phiên tới:
reckon · stubborn · linger

[Chơi lại]  [Vào ôn từ]  [Xong]
```

`endGame()`: `flushMiss()` → cập nhật `gameScore[id] = { best: max(best, score), plays: plays+1 }` → `save(K_GAMESCORE, ...)` → vẽ màn kết thúc. Ván bỏ dở **không** tính `plays`.

"Vào ôn từ" → `game = null; restartSession()` (kéo luôn từ sai lên đầu).

### CSS mới — `css/paper-theme.css`

`.game-chips` (hàng ngang, cuộn ngang trên máy nhỏ) · `.game-chip[disabled]` · `.tile` (ô chữ cái, min 44×44) · `.tile.fixed` · `.slot` (ô trống đích) · `.game-head` (tiến độ + nút ←) · `.game-end`. Dùng token màu sẵn có, không thêm màu mới.

## Related Code Files

- Create: `js/word-game-ui.js`
- Modify: `js/app-storage.js` — 2 khoá + 2 biến global + bump `APP_VERSION` → `2.1.0`
- Modify: `js/review-steps-learn.js` — `restartSession()` truyền `gameMiss`; `render()` gọi `renderGameChips()`; thẻ "hết thẻ" hiện chip
- Modify: `js/app-shell.js` — `init()` truyền `gameMiss`; `showTab()` thoát game; handler `keydown` bỏ qua khi đang chơi
- Modify: `index.html` — `<div id="gameChips">` + `<script src="js/word-games.js">` + `<script src="js/word-game-ui.js">` (đặt trước `app-shell.js`)
- Modify: `css/paper-theme.css`
- Modify: `sw.js` — 2 dòng `ASSETS` + `CACHE` → `lingobrain-v2.1.0`

## Implementation Steps

1. Thêm 2 khoá + 2 biến vào `app-storage.js`, bump `APP_VERSION`.
2. Sửa `buildQueue` call site ở `restartSession()` và `init()`, thêm dọn `gameMiss`.
3. Viết `js/word-game-ui.js`: `renderGameChips` → `startGame` → `renderGame` → `quitGame` → `endGame` → `flushMiss`, rồi phần vẽ riêng của Xếp chữ.
4. Thêm markup + 2 thẻ `<script>` vào `index.html`, thêm 2 dòng vào `ASSETS`, bump `CACHE`.
5. CSS.
6. `node tests/run-tests.js` (test `pwa-assets` phải xanh).
7. Thử tay trên máy thật: chơi 1 ván, sai vài từ, vào tab Ôn từ kiểm tra thứ tự.

## Success Criteria

- [x] Vào tab Ôn từ thấy 3 chip; chip `sprint`/`cloze` xám với nhãn "sắp có"
- [x] < 8 từ đã học → cả 3 chip khoá, nhãn ghi rõ còn thiếu bao nhiêu từ
- [x] Chơi trọn 1 ván 10 từ, màn kết thúc hiện đúng số đúng/sai và danh sách từ sai
- [x] Tải lại trang → kỷ lục Xếp chữ còn nguyên
- [x] Sai 3 từ → bấm "Vào ôn từ" → 3 từ đó là 3 thẻ đầu tiên
- [x] Chơi giữa chừng rồi bấm tab Giáo án → về sạch, không lưu điểm, nhưng từ sai vẫn vào hàng đợi
- [x] Từ `take off` hiện dấu cách đúng chỗ, không chạm được vào ô dấu cách
- [x] Đang chơi, bấm phím `1`–`4` không kích hoạt nút chấm điểm của màn ôn
- [x] So `eng.srs.v2` trước/sau 1 ván → không đổi
- [x] `node tests/run-tests.js` xanh

## Lệch so với thiết kế ban đầu

| Chỗ lệch | Lý do |
|---|---|
| Tách `js/word-game-rounds.js` ngay ở pha này (plan để pha 3) | `word-game-ui.js` chạm 175 dòng trước khi làm xong pha 2 |
| Bỏ hàng chip trong thẻ "Xong phiên ôn hôm nay" | Làm rồi mới thấy cùng 3 chip lặp 2 lần cách nhau 200px; hàng chip trên đầu vốn đã luôn hiện |
| Chip khoá dùng `aria-disabled` thay `disabled` | Nút `disabled` không phát `click` → trên điện thoại chạm vào không hiện được lý do khoá |
| `gamePool('scramble')` thêm điều kiện có `meaning` | Nghĩa là gợi ý duy nhất của game này; thiếu nghĩa = ván không giải được |
| `scrambleTiles` ghim đúng `space -' ’`, không ghim chữ số | Bản đầu ghim mọi ký tự không phải chữ cái, lộ cấu trúc đáp án với từ kiểu `covid19` |
| `flushMiss()` nhét thẳng từ sai lên đầu `queue` đang chạy | Chỉ lưu localStorage thì phải đợi tới lần dựng hàng đợi sau; thoát game xong vào ôn ngay sẽ không thấy từ vừa sai |
| Thêm `closeGame()` tách khỏi `quitGame()` | `showTab` gọi `quitGame` sẽ vẽ lại màn ôn (và đọc tiếng Anh) vào tab người dùng vừa rời đi |
| `syncGameChrome()` giấu chip + bảng thống kê khi đang chơi | Cả hai là anh em của `#app`, không bị game vẽ đè; bấm chip giữa ván sẽ thay ván mới và nuốt mất từ sai |

## Risk Assessment

| Rủi ro | Xử lý |
|---|---|
| `#app` bị `render()` vẽ đè khi đang chơi | `render()` return sớm nếu `game` khác `null` |
| Quên bump `CACHE` ↔ `APP_VERSION` | Test `pwa-assets` bắt được, chạy test trước khi xong pha |
| `gameMiss` bị dọn nhưng user chưa ôn xong | Chấp nhận: đã lên đầu hàng đợi rồi, sai lần nữa sẽ được thêm lại |
| Ô chữ quá nhỏ trên máy nhỏ, từ dài | `.game-tiles` cho xuống dòng (`flex-wrap`), min 44×44, từ > 14 chữ loại khỏi pool |
| Chip chiếm chỗ đẩy thẻ ôn xuống dưới màn | Chip cao ~36px, đặt cùng hàng cuộn ngang |
