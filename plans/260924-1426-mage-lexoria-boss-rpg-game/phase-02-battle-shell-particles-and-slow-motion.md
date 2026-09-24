---
phase: 2
title: "Trận tối thiểu + lưu tiến trình + hub tối giản + chip; hạt dùng chung, chậm thời gian, pháp sư, phép bậc 1"
status: pending
priority: P1
dependencies: [1]
---

# Phase 2: Trận đấu tối thiểu chơi được + tiến trình

## Overview
Một trận chơi được từ chip → hub tối giản → trận → kết trận đơn giản, trên iPhone + laptop, **có lưu tiến trình** (XP, vết thương, thắng) để bản cắt khẩn cấp dùng được. 1 quái tạm (dáng "beast" đơn giản), pháp sư nam/nữ (mặc định nữ, đổi ở phase 5), 5 phép bậc 1, chậm thời gian, đồng hồ trùm, ❤️, thắng/thua. Bậc 2–3 dùng fallback preset bậc 1 phóng to.

## Requirements
- Functional:
  - **Lưu trữ**: `K_BOSS = 'eng.boss.v1'`, `let bossProg = cleanBoss(load(K_BOSS, null), Date.now())` trong `app-storage.js` (hợp lệ vì `boss-progress-sync-merge.js` nạp trước `app-storage.js`); `saveBoss()` = `save(K_BOSS, bossProg)` → auto-sync qua `onLocalSave`/`isSyncedKey` (`cloud-sync-engine.js:32-35`). Mọi ghi đọc global `bossProg` **tại thời điểm ghi** (sync có thể thay object — `cloud-sync-engine.js:82-87`).
  - **Chip**: thêm `'boss'` vào `GAME_IDS`/`GAME_LABEL` (`Pháp sư`) ngay phase này (chưa phát hành đến khi bump version ở phase 6). `gameChipsHtml` (`word-game-ui.js:23-33`) nhánh `'boss'`: hiện `Lv N` (`int()` + `esc`), không đọc `gameScore`.
  - **`startGame('boss')`** (`word-game-ui.js:63-71`): nhánh riêng **trước** khi bốc `TIMED_ROUND` từ → `game = { id:'boss', seq: ++gameSeq, miss:[], over:false, stop: stopBossHub }` → `startBossHub()`. Hub tối giản: `Lv`, thanh XP, trận hôm nay (từ `todayBattle`), cấp Dễ/Vừa/Khó, nút **Bắt đầu** (cử chỉ thật → `focus()` input).
  - **Mỗi trận một `game` mới**: `startBossBattle()` tạo `game = { id:'boss', seq: ++gameSeq, miss:[], over:false, stop: stopBossBattle }`; mọi callback/timeout so `game.seq === bossUi.seq` (mẫu `plane-game-ui.js:120,132`). Không gọi `endGame` (tránh ghi `gameScore`, `word-game-ui.js:123-134`). Màn kết đặt `game.over = true` (để `pwa-register` không coi là đang bận, `pwa-register.js:14`).
  - **Lưu giữa trận** (idempotent, dạng tuyệt đối): `persistBattle()` gọi `recordProgress(bossProg, …)` + `saveBoss()` khi `visibilitychange`→hidden, `pagehide`, `game.stop` (đổi tab `showTab → closeGame`, nút ←), và khi kết trận. `stopBossBattle` copy `st.miss` → `game.miss` trước `flushMiss()` (mẫu `plane-game-ui.js:168-171`), rồi `persistBattle()`, rồi dừng rAF.
  - Thẻ đề DOM overlay: `emoji + nghĩa Việt` (qua `esc`), tiến độ `s t u _ _ _` (`progressFor`), dấu ✦/✦✦/✦✦✦ + viền theo bậc (Đại chú viền vàng, rune rực).
  - Input ẩn như Bắn máy bay (`autocapitalize/autocorrect/autocomplete off`, `spellcheck=false`). **Phím xử lý trong `input.onkeydown`** (handler global bỏ qua INPUT, `app-shell.js:70`): Esc = tạm dừng, Enter khi chưa gõ = Bỏ, Shift+Enter = tuyệt kỹ (nút hiện ở phase 3), `preventDefault` các phím này; chữ số/ký tự không phải chữ cái bị lọc trước `typeKey`. Mọi nút trong trận (⏸, ←, Bỏ, tuyệt kỹ) chặn `mousedown`/`touchstart` để input không mất focus (mẫu `plane-game-ui.js:44-46`). Blur thật (đóng bàn phím) → tạm dừng.
  - Mỗi chữ đúng thắp 1 rune quanh vòng phép; chữ sai: rune đỏ nháy + rung nhẹ thẻ.
  - Niệm xong → phép bay, va chạm theo event `impact` (trễ theo bậc), số sát thương bay lên, `speak(word)`.
  - **Chậm thời gian** theo `st.timeScale`: hạt/hoạt ảnh quái nhân `timeScale`; hậu kỳ viền tối + nhạt màu (lớp xám alpha), zoom 1 → 1.06 về phía pháp sư; bật về 1 trong ~120ms khi `cast`.
  - Đồng hồ trùm là vòng nạp quanh quái; gần 0 nhấp nháy đỏ. `visibilitychange`, ⏸, Esc → `pause(st)`; tiếp tục → `resume(st)`.
- Non-functional: DPR ≤ 2; trần 300 hạt; đo FPS trượt 1s, < 45 → `quality = 0.5` (nửa số hạt, bỏ glow). Cờ `?fps` trên URL hiện FPS + số hạt + `quality` (commit, tắt mặc định). `prefers-reduced-motion` → bỏ rung, giảm loé.

## Architecture
- **`js/game-particles.js`** (DÙNG CHUNG, thuần — test được): tách `addPart`/`burst`/bước vật lý từ `plane-game-effects.js:40-53` (+ phần step) thành `createParticles(max, reduced, rand)`, `burst(ps, x, y, n, opt)` (opt giữ nguyên `{kind,a,spread,speed,life,size,colors,drag,g}`), `stepParticles(ps, dt)` (tái dùng mảng, không `filter` mỗi khung), `drawParticles(ctx, ps, drawKind)`. `plane-game-effects.js` gọi lại module này — **hình ảnh Bắn máy bay không đổi** (kiểm bằng mắt + test cap). Chém chữ giữ nguyên (ngoài phạm vi).
- **`js/game-viewport-fit.js`** (DÙNG CHUNG): `fitGameToViewport(el, ui, maxDpr, onResize)` tách từ `fitPlaneGame` (`plane-game-ui.js:102-116`); Bắn máy bay dùng lại, hành vi giữ nguyên.
- **`js/boss-game-spell-presets.js`** (DỮ LIỆU): preset = opts `burst` + `{projectile, impact[], shake, flash}`; phase này điền bậc 1 × 5 hệ + preset chung (rune, trúng đòn, fizzle); `fallback: {2: [1, scale 1.4], 3: [1, scale 1.9]}` dùng khi thiếu preset bậc cao.
- **`js/boss-game-mage-art.js`**: `drawMage(ctx, x, y, s, {gender, pose, t, element})` — áo choàng, mũ nhọn (nam) / mũ trùm + tóc dài (nữ), trượng ngọc màu hệ; pose `idle`, `chant`, `cast`, `hurt`.
- **`js/boss-game-render.js`**: `drawBossScene(ctx, st, ps, ui)` — nền tạm, quái tạm, pháp sư, vòng rune, thanh máu, ❤️, Nộ, đồng hồ, số bay, hậu kỳ.
- **`js/boss-game-ui.js`**: `startBossBattle(opts)`, `bossFrame(t)` → `stepBattle` + tiêu thụ `st.events` → `burst`/render; `pauseBoss/resumeBoss/toggleBossPause`; `persistBattle`; `stopBossBattle`.
- **`js/boss-game-hub-ui.js`**: `startBossHub()`, `stopBossHub()`, hub tối giản (phase 5 mở rộng).
- `app-shell.js`: nhánh Esc cho `'boss'` chỉ dùng khi hub mở (trong trận đã xử lý ở input).

## Related Code Files
- Create: `js/game-particles.js`, `js/game-viewport-fit.js`, `js/boss-game-spell-presets.js`, `js/boss-game-mage-art.js`, `js/boss-game-render.js`, `js/boss-game-ui.js`, `js/boss-game-hub-ui.js`, `tests/game-particles.test.js`
- Modify: `js/app-storage.js` (`K_BOSS`, `bossProg`, `saveBoss`), `js/word-games.js` (`GAME_IDS`/`GAME_LABEL`), `js/word-game-ui.js` (`gameChipsHtml`, `startGame`), `js/plane-game-effects.js`, `js/plane-game-ui.js`, `js/app-shell.js`, `index.html` (script + `#bossGame`), `css/paper-theme.css` (`.boss-game`, `.boss-prompt`, overlay — dùng lại kiểu `.plane-*`), `tests/run-tests.js`, `tests/run-tests.html`, `tests/word-games.test.js`

## Implementation Steps
1. `game-particles.js` + test (cap 300 với `burst` liên tiếp; tái dùng slot; `rand` tiêm). Chuyển `plane-game-effects.js` sang dùng; chơi thử Bắn máy bay không khác.
2. `game-viewport-fit.js`; chuyển `fitPlaneGame` sang dùng; thử iPhone bàn phím bật.
3. `K_BOSS`/`bossProg`/`saveBoss`; chip + nhánh `startGame('boss')`; test `word-games.test.js` (`gameAvailability` có `boss`).
4. Pháp sư nam/nữ 4 pose.
5. Khung trận DOM + canvas + input + phím + chặn mất focus.
6. Nối `stepBattle`/`typeKey`/`castComplete`/`giveUp`/`pause` → events → hạt; số sát thương, thanh máu, ❤️, đồng hồ.
7. Chậm thời gian + hậu kỳ + zoom; kiểm bật về đúng lúc `cast`.
8. 5 phép bậc 1 + fallback bậc 2–3.
9. Vòng đời `game` mỗi trận; `persistBattle` trên hidden/pagehide/stop/kết; màn kết đơn giản (`game.over=true`) → về hub.
10. Chạy thử desktop + iPhone Safari/PWA với `?fps`.

## Success Criteria
- [ ] Chip Pháp sư → hub → trận thắng và trận thua trên iPhone PWA và laptop.
- [ ] Đổi tab / chuyển app giữa trận truyện → mở lại: HP quái còn đúng, XP đã cộng; từ sai vào đầu phiên ôn kế.
- [ ] "Đánh lại" ngay sau thua: không timer nào của trận cũ ảnh hưởng trận mới.
- [ ] Gõ chữ đúng → thế giới chậm; ngừng >1,5s hoặc chỉ gõ sai → về thường; niệm xong → bật về + phép nổ.
- [ ] Shift+Enter, Esc, Enter không tạo typo; chạm nút trong trận không đóng bàn phím iPhone.
- [ ] Bắn máy bay sau khi chuyển sang `game-particles.js` + `game-viewport-fit.js` chơi như cũ.
- [ ] `?fps` hiện FPS ≥ 50 với phép bậc 1, `quality = 1`.

## Risk Assessment
- Refactor hạt/viewport của Bắn máy bay có thể gây hồi quy → test cap tự động + chơi thử trước khi làm phần boss.
- iOS bàn phím đẩy layout → cùng hàm fit đã chạy ở Bắn máy bay.
- `speak()` trễ lần đầu trên iOS → phát sau `cast`, không chặn gameplay.
