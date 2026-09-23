---
phase: 2
title: "UI, vòng lặp, tối ưu iPhone/laptop"
status: completed
priority: P1
dependencies: [1]
---

# Phase 2: UI, vòng lặp, tối ưu iPhone/laptop

## Overview
`js/plane-game-ui.js` vẽ khung chơi vào `#app`, chạy rAF gọi `stepPlanes`, xử lý ô gõ, bàn phím ảo iOS, tạm dừng, hiệu ứng bắn/nổ; hết mạng → `endGame()` dùng chung.

## Requirements
- Functional: màn chuẩn bị (nút "Bắt đầu") → chơi → tạm dừng/tiếp → kết thúc. HUD: ❤️×lives, điểm, combo.
- Non-functional: 60fps trên iPhone; không cuộn trang; khung không bị bàn phím che; không rò rAF/listener sau khi thoát.

## Architecture

```
#app
└─ .plane-game (position:fixed; top:visualViewport.offsetTop; height:visualViewport.height; max-width:480px; margin auto)
   ├─ game-head (← thoát · Bắn máy bay · ❤️❤️❤️ · điểm)  ← tái dùng gameHeadHtml
   ├─ .plane-field (flex:1; position:relative; overflow:hidden)  ← máy bay, tia, nổ; đáy = mặt đất
   └─ .plane-input-row  [input] [✕] [⏸]
```

**Đồng bộ với `game` dùng chung**: `startPlaneGame()` gắn `game.plane = createPlaneState(game.words)` và `game.stop = stopPlaneLoop`. Mỗi lần bắn/lọt → copy `score/right/wrong/streak/bestStreak/miss` từ state sang `game` để `endGame()` và `flushMiss()` đọc đúng.

**Vòng lặp**
```js
function frame(t) {
  if (!game || game.over || game.id !== 'planes' || game.seq !== mySeq) return;  // ván cũ tự dừng
  const dt = Math.min(0.05, (t - last) / 1000); last = t;
  if (!paused) { const ev = stepPlanes(game.plane, dt, Math.random); draw(ev); if (game.plane.over) return finish(); }
  raf = requestAnimationFrame(frame);
}
```
- Mỗi plane 1 node, cache theo `uid` trong `Map`; cập nhật `style.transform = translate3d(xpx, ypx, 0)`; node bị bắn/lọt → thêm class `.boom`/`.landed`, tự xoá sau `animationend`.
- Tia: 1 div `.laser` từ tâm đáy tới plane, xoá sau 150ms.
- Plane lọt: hiện đáp án `word.word` tại chỗ khoảng 1s (class `.reveal`).

**Ô gõ (iOS)**
- `<input type="text" autocapitalize="off" autocorrect="off" spellcheck="false" autocomplete="off" enterkeyhint="done" inputmode="text">`, `font-size: 16px` trở lên.
- `input` event → `tryShoot(state, value)`; trúng → xoá value. Enter / ✕ → xoá value.
- Nút "Bắt đầu": gọi `input.focus()` **đồng bộ trong handler click** rồi mới start loop (iOS chỉ bật bàn phím trong user gesture).
- Chạm `.plane-field` → `input.focus()` (preventDefault trên `pointerdown` để không mất focus).
- `blur` của input (bàn phím đóng) → pause, overlay "Chạm để chơi tiếp" (chạm = focus + resume, cũng trong gesture).

**Viewport**
- `visualViewport.addEventListener('resize'|'scroll', fit)`; `fit()` đặt `top`/`height` khung theo `visualViewport` (fallback `innerHeight`). Gọi lại liên tục vì thanh QuickType đổi chiều cao.
- Khi chơi: `document.documentElement.classList.add('game-lock')` → CSS `overflow:hidden; overscroll-behavior:none` trên html/body; gỡ khi dừng.
- `visibilitychange` hidden → pause.

**Dọn dẹp** `stopPlaneLoop()`: `cancelAnimationFrame`, gỡ listener visualViewport/visibility, gỡ `game-lock`, xoá Map node. Được gọi từ `stopGameTimer()` (qua `game.stop`) nên `closeGame`/`endGame`/đổi tab đều dọn.

**Laptop**: khung max-width 480px ở giữa; Esc → toggle pause (xử lý ở phase 3 trong app-shell).

## Related Code Files
- Create: `js/plane-game-ui.js`
- Modify: `css/paper-theme.css` (`.plane-game`, `.plane-field`, `.plane`, `.plane-label`, `.laser`, `.boom`, `.reveal`, `.plane-input-row`, `html.game-lock`, `@keyframes`; `prefers-reduced-motion` → tắt nổ/tia, giữ rơi)

## Implementation Steps
1. Markup + CSS khung, dùng token màu trong `paper-theme.css` (xem `docs/design-guidelines.md`), dark mode theo token sẵn có.
2. `fit()` + visualViewport + `game-lock`.
3. rAF loop + vẽ plane theo Map uid.
4. Ô gõ, bắn, hiệu ứng tia/nổ/reveal.
5. Pause/resume (nút ⏸, blur, visibilitychange) + `stopPlaneLoop`.
6. `finish()` → đồng bộ state vào `game` → `endGame()`.
7. Chạy local (`npx serve .`), kiểm tra bằng DevTools device mode iPhone + desktop.

## Success Criteria
- [ ] File < 200 dòng (vượt → tách `plane-game-effects.js`)
- [ ] Thoát giữa ván (← / đổi tab) → không còn rAF chạy (kiểm tra Performance), `game-lock` đã gỡ, từ lọt đã flush
- [ ] Tạm dừng 30s rồi tiếp → máy bay không nhảy vị trí
- [ ] Gõ trúng liên tục 20 từ → không rò node DOM (số `.plane` = số plane trong state)
- [ ] Màn kết thúc hiện đúng điểm/đúng/sai/từ lọt, "Chơi lại" chạy ván mới sạch

## Risk Assessment
- iOS không bật bàn phím nếu `focus()` bị gọi sau `await`/`setTimeout` → giữ đồng bộ trong handler.
- `position:fixed` + bàn phím iOS có lỗi lệch vị trí → bám `visualViewport.offsetTop`, không dựa vào `100vh`/`dvh`.
- Emoji + text trong nhiều node có thể nặng trên máy cũ → tối đa 5 plane, `will-change: transform` chỉ trên `.plane`.
