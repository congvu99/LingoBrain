---
phase: 1
title: Hidden input and relocated controls
status: completed
priority: P2
dependencies: []
---

# Phase 1: Hidden input and relocated controls

## Overview
Xoá hàng `.plane-input-row`; input thành phần tử tàng hình trong field; dời ⏸ lên header, "Bỏ" vào thẻ đề, "✨ Tuyệt kỹ" nổi góc dưới-phải field.

## Requirements
- Functional: giữ nguyên toàn bộ handler input (oninput, compositionend, keydown Enter/Shift+Enter/Esc, blur→pause) và attr (`autocapitalize/autocorrect/autocomplete/spellcheck/enterkeyhint/aria-label`).
- Functional: các nút mới vẫn chặn cướp focus như hiện tại (plane: `mousedown` preventDefault; boss: `mousedown` + `touchstart` passive:false + `touchend`).
- Non-functional: input font-size ≥16px (iOS không auto-zoom); không đè HUD canvas (2 góc trên pháp sư đã có HUD, `BOSS_TOP_HUD_BOTTOM = 46`).

## Architecture
```
.plane-game / .boss-game (fixed, fitGameToViewport theo visualViewport)
├─ .game-head   ← ← | tên game | spacer | [⏸]            (mới: ⏸)
├─ #bossPrompt  ← tier | đề + letters | [Bỏ]              (mới: cột 3, chỉ boss)
└─ .plane-field (flex:1, lớn thêm ~56px)
   ├─ canvas
   ├─ input.game-type-sink (absolute, opacity 0, top-left) (mới vị trí)
   ├─ #bossUlt.boss-ult-float (absolute bottom-right)     (chỉ boss)
   └─ overlay
```
- Input đặt **trong field** (fixed) + `top:0` → iOS không cuộn trang khi focus.

## Related Code Files
- Modify: `js/word-game-ui.js` — `gameHeadHtml(progress, extraHtml)`; `extraHtml` mặc định `''`, chèn sau span progress.
- Modify: `js/plane-game-ui.js` — markup `startPlaneGame`: ⏸ qua `gameHeadHtml('', pauseBtnHtml)`, input vào trong `#planeField`, xoá `.plane-input-row`. Header comment cập nhật ("ô ẩn" đã đúng).
- Modify: `js/boss-game-ui.js` — markup `startBossBattle`: ⏸ qua header, `#bossSkip` trong `#bossPrompt`, `#bossUlt` + input trong `#bossField`, xoá `.plane-input-row`. Net ≤ +6 dòng (file 194).
- Modify: `css/paper-theme.css` — xoá rule `.plane-input-row*` (~277-278, 289-291, 321-322); thêm `.game-type-sink`, `.boss-ult-float`, cột 3 `.boss-prompt`, style nút ⏸ header tối.
- Modify: `js/app-storage.js` `APP_VERSION`, `sw.js` `CACHE` (+0.0.1, bằng nhau).

## Implementation Steps
1. `gameHeadHtml(progress, extraHtml = '')`: nối `extraHtml` sau `<span class="mono small">…</span>`. Kiểm mọi caller khác vẫn 1 tham số → output y hệt.
2. CSS input tàng hình:
   ```css
   .game-type-sink{position:absolute;top:0;left:0;width:1px;height:1px;padding:0;border:0;margin:0;
     opacity:0;font-size:16px;caret-color:transparent;color:transparent;background:transparent;pointer-events:none;z-index:0}
   ```
   `pointer-events:none` an toàn: focus chỉ gọi bằng `input.focus()` (đã có ở field.onclick / Go / countdown).
3. Plane markup: input `class="game-type-sink"` đặt ngay sau `<canvas>` trong `#planeField`; `<button class="btn-sm btn-ghost" id="planePause">⏸</button>` qua header. Handler giữ nguyên (id không đổi).
4. Boss markup: `#bossPause` qua header; `#bossSkip` thêm vào cuối `#bossPrompt` (`grid-row:span 2`); `#bossUlt` thêm class `boss-ult-float` đặt trong `#bossField` trước overlay; input `game-type-sink` trong `#bossField`. Id giữ nguyên → `bindBossControls` và dòng hiện/ẩn ult (`boss-game-ui.js:137-138`) không đổi.
5. CSS:
   - `.boss-prompt{grid-template-columns:auto 1fr auto}`; `.boss-prompt #bossSkip{grid-row:span 2;min-height:44px}` (tier đã `grid-row:span 2`).
   - `.boss-ult-float{position:absolute;right:10px;bottom:10px;z-index:1;min-height:48px;padding:0 14px}` — giữ gradient/pulse `.boss-ult` sẵn có. Overlay z-index 2 phủ lên khi pause.
   - Nút header tối: `.plane-game .game-head .btn-sm, .boss-game .game-head .btn-sm{min-width:44px;min-height:44px}` theo tông mỗi game (dùng lại màu từ rule input-row cũ trước khi xoá).
   - Xoá mọi rule `.plane-input-row`.
6. Overlay tạm dừng: chỉ thêm gợi ý nếu overlay pause chưa có chữ hướng dẫn — kiểm `pausePlanes`/`pauseBoss` message; nếu có sẵn nút "Chơi tiếp" thì đủ, YAGNI.
7. Bump version `APP_VERSION` = `CACHE`.
8. `node tests/run-tests.js` → xanh (gồm `pwa-assets`). `wc -l` các file sửa ≤ 200.

## Success Criteria
- [x] Không còn `.plane-input-row` trong JS/CSS (`grep` = 0).
- [x] `gameHeadHtml` gọi 1 tham số cho output không đổi.
- [x] Desktop Chrome: 2 game chơi được bằng phím; Enter xoá khoá (plane) / niệm (boss); Shift+Enter tuyệt kỹ; Esc pause; click ⏸/Bỏ/Tuyệt kỹ không blur input.
- [x] Field cao hơn trước ~56px (DevTools, cùng viewport).
- [x] Tuyệt kỹ nổi không đè HUD; ở 320px header không tràn dòng.
- [x] Tests xanh; file ≤ 200 dòng; version bump khớp.

## Risk Assessment
- iOS kính lúp/selection handle trên input 1px → `caret-color/color transparent`, field đã `touch-action:none`; kiểm ở phase 2.
- Sót trick chặn blur trên nút mới → bấm là pause. Id giữ nguyên nên handler cũ vẫn gắn; kiểm tay.
- `boss-game-ui.js` vượt 200 dòng → gộp chuỗi markup trên cùng dòng như style hiện tại.
- Rollback: revert commit (chỉ markup/CSS, không đụng dữ liệu/sync).
