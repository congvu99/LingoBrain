# Phase 2 — Shell 4 tab + lớp toàn màn `#stage`

Context: audit #3, #5, #7 · `index.html`, `js/app-shell.js`, 12 module render vào `#app`

## Quyết định kiến trúc
12 module (ôn + 6 game + UI Pháp sư) đều vẽ vào `#app`. **Không đổi chúng** — chỉ dời `#app` vào lớp `#stage` toàn màn. Blast radius nhỏ nhất.

```
<main> tab-home | tab-play | tab-progress | tab-me     (cuộn trong #appScroll)
<div id="stage" hidden>                                 (position:fixed, safe-area, z trên tabbar)
  <header class="stage-bar"> ✕ | tiêu đề | n/N | loa </header>
  <div id="app"></div>
</div>
```

## Interface
```js
openStage({ kind: 'review' | 'game', title })  // hiện #stage, ẩn tabbar, khoá cuộn nền, focus
closeStage()                                   // gọi closeGame() (giữ hành vi lưu từ sai), về tab trước
setStageProgress(i, n)                         // phiên ôn cập nhật n/N
```
- `syncGameChrome()` rút gọn: đang chơi ⇔ stage mở.
- Back Android / swipe iOS: `history.pushState` khi mở stage, `popstate` → `closeStage()`.
- Esc (desktop) giữ luật hiện tại (game có pause thì tạm dừng, còn lại thoát).

## Files
- Sửa: `index.html` (tab mới; bỏ brand header, eyebrow, subtitle; thêm `#stage`), `js/app-shell.js` (`showTab` 4 tab), `css/paper-theme.css`
- Kiểm: `js/word-game-ui.js` `syncGameChrome`, `js/boss-game-hub-ui.js` (tham chiếu tab), `js/game-viewport-fit.js` (đo chiều cao theo bàn phím — phải đo theo `#stage` thay vì `#appScroll`)

## Rủi ro
- **game-viewport-fit + bàn phím iOS** dễ vỡ nhất (Bắn máy bay, Pháp sư, Gõ từ). Test tay iPhone thật trước khi merge.
- `tab-game` đổi tên → grep toàn repo + tests.
