# Review commit 2868da7 — Phase 2 Pháp Sư Lexoria (trận, hạt dùng chung, viewport fit)

Chỉ đọc. Kiểm: `node tests/run-tests.js` = 406 pass; nối toàn bộ script theo thứ tự `index.html` rồi `node --check` → parse OK (không trùng khai báo let/const/function global giữa js/*.js; grep tên function trùng = 0).

## Scope
- 24 file, +991/-55. Trọng tâm: boss-game-ui/result-ui/hub-ui/render/spell-art, game-particles, game-viewport-fit, plane-game-effects/ui, word-game-ui, word-games, app-storage, app-shell, sw.js, index.html.

## Kết luận nhanh theo mục
- (a) Tiêu chí P2: đạt phần lớn. Vòng đời `game` mỗi trận/seq đúng; timeout/rAF đều check `game.seq === ui.seq` + `bossUi === ui`; persistBattle idempotent (recordProgress tuyệt đối + max); không endGame/gameScore (grep 0); màn kết `game.over=true, stop=null`; Esc/Enter/Shift+Enter preventDefault trong `input.onkeydown` → không sinh ký tự/typo; nút chặn mousedown+touchstart; chậm thời gian theo `st.timeScale`; pause/resume dời mốc đúng. Thiếu: từ sai KHÔNG được lưu khi ẩn app/pagehide (xem H1).
- (b) Hồi quy Bắn máy bay: không thấy hồi quy chức năng. Số hạt giữ (`Math.round(n*(reduced?0.4:1)*1)`), thứ tự gọi random giống hệt (a, s, life, size, rot, vr), cap 500 giữ, `drag||2.2` giữ, `quality` luôn 1 với plane. Khác biệt duy nhất: thứ tự vẽ trong pool đổi khi hạt chết (swap-remove) — chỉ ảnh hưởng chồng lớp debris/smoke, không thấy bằng mắt. Khi đầy cap, vòng lặp dừng sớm (bản cũ vẫn tiêu random) — vô hại vì Math.random. `fitGameToViewport` tương đương 1:1 với `fitPlaneGame` cũ.
- (c) Hợp đồng: `GAME_IDS` chỉ được lặp ở `gameAvailability` (word-games.js:48), `gameChipsHtml` (word-game-ui.js:24), `renderGameChips` (:56) — đều xử lý được 'boss' (gamePool có nhánh boss; gameLockReason dùng `a[id].need` chung). `startGame('boss')` rẽ nhánh trước khi bốc từ. app-shell Esc: hub/kết → quitGame; trong trận lúc ô gõ mất focus → toggle. `bossProg` khởi tạo hợp lệ: boss-progress-sync-merge.js nạp trước app-storage.js (index.html:145-147); `levelFromXp` chỉ gọi lúc render (sau khi boss-game-progress.js nạp). `cfg.bossLevel` luôn qua `bossDifficulty()` whitelist khi đọc.
- (d) XSS: sạch. Mọi text động qua `esc()` (escape `& < > "`) hoặc `textContent`; `data-tier` chỉ 1/2/3; title gán property; tên quái trên canvas qua fillText. `esc(best)` ở chip (số cũ giờ cũng esc — output không đổi).
- (e) Timing: "Đánh lại" an toàn (showBossResult đã teardown rAF/interval/listener trước khi render; timeout cũ đã chạy; double-click → stop trận trước qua game.stop). Thoát trong cửa sổ 700ms kết trận → timeout gặp game=null/khác seq → no-op. Blur lúc đếm ngược: pauseBoss no-op nhưng done() kiểm `document.hidden || activeElement !== input` → pause đúng. touchstart preventDefault chặn click giả lập → không hành động 2 lần trên máy lai. visualViewport/window/document listener dọn qua `ui.off` ở teardown. Không trùng tên global.
- (f) Mọi file code < 200 dòng (lớn nhất boss-game-logic.js 199, boss-game-ui.js 176).

## Critical
Không có.

## High
**H1. Từ sai mất khi app bị ẩn rồi trang bị huỷ/tải lại** — `js/boss-game-ui.js:50-51`
- visibilitychange(hidden)/pagehide chỉ `persistBattle` (XP, vết thương, thắng); `st.miss` chỉ sang `gameMiss` khi `game.stop` (closeGame) hoặc màn kết. Nếu iOS huỷ PWA ở nền, hoặc `pwa-register.js:21` reload ngay khi `document.hidden` (nó bỏ qua busy khi trang ẩn — deploy mới là đủ), từ sai của trận dở bị mất. Vi phạm tiêu chí "chuyển app giữa trận → mở lại: từ sai vào đầu phiên ôn kế".
- Sửa: trong 2 handler, gộp idempotent: `ui.st.miss.forEach(id => { gameMiss = addMiss(gameMiss, id); }); save(K_GAMEMISS, gameMiss);` (addMiss khử trùng nên flushMiss sau đó vẫn đúng). Có thể gói vào hàm `persistBattle` hoặc hàm riêng `persistBattleMiss(ui)` ở boss-game-result-ui.js.
- (Bắn máy bay/Chém chữ có cùng lỗ hổng từ trước — ngoài phạm vi, nhưng nên ghi nhận.)

## Medium
**M1. sw.js đổi ASSETS nhưng không đổi `CACHE` (`sw.js:3` vẫn `lingobrain-v2.13.2`), APP_VERSION giữ 2.13.2** — đúng kế hoạch (bump ở P6) NHƯNG main đã có chip 'boss' + plane-game-effects.js mới phụ thuộc game-particles.js. Nếu main được deploy trước P6: người có HTTP cache js (max-age 3600) hoặc cửa sổ cài SW cùng tên cache có thể nhận index.html mới + plane-game-effects.js CŨ → bản cũ định nghĩa lại global `burst(fx,…)` đè bản chung → Bắn máy bay/Pháp sư lỗi (`fx.parts` undefined / `addPart` sai đối số). Sửa: không deploy main trước P6, hoặc bump `CACHE`+`APP_VERSION` ngay khi phát hành bất kỳ bản nào chứa commit này.

**M2. Đo FPS không reset sau đếm ngược / tạm dừng** — `js/boss-game-ui.js:44` (fpsAt = lúc tạo), `:58-61` (done), `:147-155` (resumeBoss).
- Cửa sổ đo đầu tiên kéo dài qua ~2s đếm ngược (hoặc cả thời gian pause) với rất ít frame → `fps` ≈ 0-10 → `quality = 0.5` (nửa hạt, bỏ glow) giây đầu mỗi trận và sau mỗi lần tiếp tục; `?fps` sẽ báo sai, làm lệch tiêu chí "FPS ≥ 50, quality = 1".
- Sửa: ở done() và resumeBoss(): `ui.frames = 0; ui.fpsAt = performance.now();`.

**M3. Rủi ro tiềm ẩn mất từ sai ở `startBossBattle`** — `js/boss-game-ui.js:24`
- Gọi `game.stop()` rồi thay `game` mà không `flushMiss()`. Hiện chỉ gọi từ sảnh/màn kết (miss rỗng) nên chưa lỗi; nhưng nếu P5 thêm đường vào khi đang có trận (stop = stopBossBattle chép miss vào game cũ) thì miss bị bỏ. Sửa: `if (game && game.stop) { ...s(); flushMiss(); }` hoặc gọi `closeGame()` (không render).

## Low
- **L1.** Esc trong lúc đếm ngược (ô gõ đang focus) không làm gì (`boss-game-ui.js:85` → pauseBoss no-op vì !started); Bắn máy bay coi Esc lúc này = thoát. Cân nhắc `if (!ui.started) return quitGame();`.
- **L2.** Sảnh (`boss-game-hub-ui.js:29-32` openBossHub / word-game-ui.js:67) có `game.over=false` → `pwa-register` coi là bận, hoãn cập nhật suốt lúc đứng ở sảnh. Giống sảnh chọn cấp Bắn máy bay (có sẵn). Có thể đặt cờ riêng cho sảnh nếu muốn.
- **L3.** Spec "bật về 1 trong ~120ms khi cast": thực tế `bossLockFor` đặt `timeScale = 1` tức thì (`boss-game-logic.js:50`) → hậu kỳ tắt phựt. Chấp nhận được; ghi lại nếu muốn ease.
- **L4.** touchend trên nút vẫn kích hoạt khi ngón trượt ra khỏi nút trước khi nhấc (touchend bắn về target ban đầu) — ← thoát ngoài ý muốn (tiến trình vẫn lưu). Có thể kiểm `document.elementFromPoint(changedTouches[0])` nằm trong nút.
- **L5.** Tab trong ô gõ chuyển focus sang nút Bỏ → blur → pause (không chặn Tab). Nhỏ.
- **L6.** `plane-game-effects.js` thứ tự vẽ hạt đổi do swap-remove (đã ghi trong header game-particles.js) — chấp nhận.
- **Info.** Repo có 4 file rác tên `C:UsersADMINI~1...scratchpad*` được track (thêm ở ca5ea0a, không phải commit này) — nên `git rm` riêng.
- **Info.** `saveBoss()` gọi `scheduleSync` (isSyncedKey có eng.boss.v1) nhưng `localPayload`/`applySyncPayload` (`cloud-sync-engine.js:76-91`) chưa mang `boss` — đúng lịch P6; mỗi lần ẩn app sẽ đẩy một lượt sync không có boss (vô hại).
- **Info (thiết kế P1/P6).** `recordProgress` xp = max(xp, xpAtStart+earned): khi P6 áp bossProg từ máy khác giữa trận và xp remote > xpAtStart+earned, XP trận này mất (không cộng dồn). Chơi song song 2 máy hiếm; ghi nhận cho P6.

## Positive (hiệu chỉnh rủi ro)
- Mẫu seq-guard + teardown chung (`teardownBossLoop`) dùng đúng ở cả thoát lẫn kết; `onblur = null` trước khi vẽ lại #app tránh overlay ma.
- `bossCanAct` bắt kịp impact/lock ngay lúc phím tới → không so phím đầu với đề cũ.

## Đề xuất thứ tự
1. H1 (lưu miss khi hidden/pagehide).
2. M1 (chặn deploy trước bump hoặc bump ngay khi phát hành).
3. M2 (reset FPS window).
4. M3 (flushMiss khi startBossBattle thay game).
5. L1-L5 tuỳ.

## Plan follow-up
- P2 đánh dấu completed; các mục chưa kiểm thật (iPhone PWA, `?fps` trên máy thật) đã ghi dời P6 — hợp lý, nhưng tiêu chí "chuyển app giữa trận → từ sai vào phiên ôn" hiện CHƯA đạt (H1).

## Unresolved questions
- main có tự deploy khi push không? Nếu có, M1 thành High (bản đang chạy có chip Pháp sư + rủi ro cache lẫn phiên bản).
- "Đổi tab" trong tiêu chí P2 là tab app (đã đạt qua closeGame) hay chuyển app/iOS nền (chưa đạt miss)?

Status: DONE_WITH_CONCERNS
Summary: Phase 2 đúng hợp đồng, không XSS, không hồi quy Bắn máy bay, file < 200 dòng; còn 1 High (từ sai không lưu khi ẩn app) + 3 Medium (cache/version trước deploy, FPS window, flushMiss tiềm ẩn).
