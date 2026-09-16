---
phase: 3
title: "Chạy 60 giây"
status: completed
priority: P2
dependencies: [2]
---

# Phase 3: Chạy 60 giây

## Overview

Thêm khung đồng hồ 60 giây + combo (dùng chung cho pha 4) và game B: hiện từ → chọn 1 trong 4 nghĩa, liên tục tới khi hết giờ.

## Requirements

- Chức năng: đếm ngược 60s, câu hỏi nối tiếp không nghỉ, chuỗi combo, điểm, kết thúc tự động khi hết giờ.
- Phi chức năng: không giật khi bấm nhanh; TTS không đọc chồng; đồng hồ đúng dù tab bị treo vài trăm ms.

## Architecture

### Tách file nếu cần

`js/word-game-ui.js` sau pha 2 đã gần chạm 200 dòng. Trước khi viết pha này, đo lại: nếu > 150 dòng thì tách phần vẽ câu hỏi ra `js/word-game-rounds.js` (đúng lối `review-steps-learn.js` / `review-tests.js` sẵn có), để `word-game-ui.js` giữ khung (menu, đồng hồ, điểm, kết thúc). Tách thì nhớ thêm `<script>` + dòng `ASSETS` + bump version.

### Khung đồng hồ

```js
game.endsAt = Date.now() + SPRINT_SECONDS * 1000;
game.timer  = setInterval(tick, 200);
function tick() {
  const left = Math.max(0, game.endsAt - Date.now());
  $('#gTime').textContent = Math.ceil(left / 1000) + 's';
  $('#gBar').style.width = (left / (SPRINT_SECONDS * 1000) * 100) + '%';
  if (left <= 0) endGame();
}
```

- Dùng **mốc thời gian tuyệt đối** (`endsAt`), không cộng dồn `-1` mỗi tick → tab bị treo vẫn ra đúng giờ.
- `clearInterval(game.timer)` bắt buộc chạy trong cả `endGame()` **và** `quitGame()`. Rò `setInterval` là lỗi nặng nhất của pha này.
- Sai **không trừ giờ** (phạt kép gây nản).
- 10 giây cuối: thanh đồng hồ đổi sang màu nhấn.

### Điểm & combo

```js
đúng → game.streak++; game.score += 1 * comboMult(game.streak); game.bestStreak = max(...)
sai   → game.streak = 0; game.miss.push(w.id)
```

Điểm hiển thị làm tròn xuống ở màn kết thúc.

### Game B — vẽ một câu hỏi

```
   60s ▓▓▓▓▓▓▓▓░░░░        Điểm 12   🔥 ×1.5

              stubborn
             /ˈstʌb.ən/   🔊

   [ bướng bỉnh        ]
   [ hào phóng         ]
   [ e dè, ngại ngùng  ]
   [ trung thành       ]
```

- Từ: `pickGameWords(gamePool(deck,srs,'sprint'), 999, Math.random)` — bốc sẵn cả pool đã xáo lúc bắt đầu ván, `i` chạy tới đâu lấy tới đó; hết pool thì bốc lại vòng mới.
- Đáp án: `buildMcqOptions(w, deck, Math.random)` (đã có sẵn trong `review-mode-picker.js`). Trả < 4 lựa chọn → bỏ qua từ đó, sang từ kế.
- Chạm đáp án → tô đúng/sai ~350ms rồi tự sang câu kế. **Không** có nút "Tiếp".
- `speak(w.word)` mỗi câu: gọi `speechSynthesis.cancel()` trước. Thêm nút 🔊 để nghe lại.
- Khoá double-tap: dựng cờ `game.locked = true` trong lúc chờ 350ms.

## Related Code Files

- Modify: `js/word-game-ui.js` — bỏ trạng thái "sắp có" của chip `sprint`, thêm khung đồng hồ/combo
- Create (nếu tách): `js/word-game-rounds.js`
- Modify: `index.html`, `sw.js`, `js/app-storage.js` — chỉ khi tách file / bump version
- Modify: `css/paper-theme.css` — `.game-bar`, `.game-bar.low`, `.combo`, `.mcq` tái dùng lớp sẵn có

## Implementation Steps

1. Đo `js/word-game-ui.js`; > 150 dòng thì tách `word-game-rounds.js` trước khi thêm code mới.
2. Viết khung đồng hồ + thanh tiến trình + hiển thị combo.
3. Viết vòng lặp câu hỏi của game B.
4. Mở khoá chip `sprint` trong `renderGameChips()` (dùng `gameAvailability`).
5. `node tests/run-tests.js`; thử tay 3 ván trên máy thật.

## Success Criteria

- [x] Ván kết thúc đúng 60 giây ± 1s, cả khi khoá màn hình rồi mở lại giữa ván
- [x] Bấm sai không làm mất thời gian
- [x] Chuỗi 5 câu đúng → hiện ×1.5; chuỗi 10 → ×2; sai một câu → về ×1
- [x] Bấm liên tục thật nhanh không nhảy 2 câu cùng lúc, không cộng điểm đôi
- [x] TTS không đọc chồng khi bấm nhanh
- [x] Thoát giữa ván → `setInterval` dừng (kiểm bằng cách log tick hoặc quan sát CPU)
- [x] Từ sai trong ván đi vào hàng đợi ôn giống pha 2
- [x] `eng.srs.v2` không đổi sau 1 ván
- [x] `node tests/run-tests.js` xanh

## Sửa sau code review

| Lỗi | Cách sửa |
|---|---|
| `#gameChips` đặt `hidden` nhưng `.game-chips{display:flex}` của ta thắng `[hidden]` của trình duyệt → chip vẫn hiện và bấm được giữa ván; bấm vào là bỏ rơi `setInterval` và nuốt mất từ sai | thêm `[hidden]{display:none!important}`; `startGame()` gọi `closeGame()` trước |
| `tickTimer` / `endGame` không phòng trường hợp `game === null` | thêm guard đầu hàm |
| `setTimeout` của ván cũ lái được ván mới ("Chơi lại") | mỗi ván một `game.seq`, callback so lại trước khi chạy |
| `gameAvailability()` quét cả bộ từ 3 lần mỗi lần vẽ chip | quét 1 lần, truyền xuống |
| Bốc 999 từ mỗi vòng, thuật toán O(N²) | `TIMED_ROUND = 60` (60s được ~25-30 câu) |
| Xáo vòng mới có thể hỏi lại ngay từ vừa hỏi | đẩy từ đầu xuống cuối nếu trùng |

## Risk Assessment

| Rủi ro | Xử lý |
|---|---|
| Rò `setInterval` khi thoát tab giữa ván | `clearInterval` trong cả `endGame` và `quitGame`; `quitGame` gọi từ `showTab` |
| TTS đọc chồng | `speechSynthesis.cancel()` trước mỗi `speak` trong game |
| Double-tap cộng điểm đôi | Cờ `game.locked` trong 350ms chờ |
| Bộ từ nhỏ → lặp lại từ trong cùng ván | Chấp nhận: 60s ≈ 25 câu, bộ ≥ 8 từ sẽ lặp; xáo lại mỗi vòng để không lặp liền kề |
| `word-game-ui.js` phình quá 200 dòng | Tách `word-game-rounds.js` ngay đầu pha, không để dồn tới pha 4 |
