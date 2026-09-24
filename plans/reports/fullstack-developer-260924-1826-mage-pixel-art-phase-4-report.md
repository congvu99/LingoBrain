# Phase 4 — Element VFX and ultimates

## Cập nhật sau code review (2026-09-24)
Review đầy đủ: `plans/reports/code-reviewer-260924-1848-mage-pixel-art-phase-4-review-report.md`. Sửa hết HIGH/MEDIUM
+ LOW áp dụng (9, 12, 13; bỏ qua 10 — thuộc phase 5). Không commit, giữ test xanh.

1. **HIGH — rò rỉ fx.sprites (thiên thạch bay mãi)**: `bossSpawnSprite` đổi sang opts-object `{delay, vel:{vx,vy,
   follow}, life, anim}`; `stepBossActors` ưu tiên `s.life` (nếu có) hơn `spriteAnimDone` khi gỡ khỏi `fx.sprites`
   — VFX di chuyển có anim LẶP vô hạn (fireball) giờ BẮT BUỘC truyền `life` (meteor truyền `life = dur` = thời
   gian rơi thật). Test mới `tests/boss-game-sprite-actors.test.js` (4 case, thuần — thêm
   `js/boss-game-sprite-actors.js` vào `PURE_MODULES` của `tests/run-tests.js`): xác nhận sprite di chuyển tự gỡ
   đúng `life` dù anim lặp vô hạn; sprite one-shot vẫn gỡ theo `spriteAnimDone` như cũ (không phá hành vi cũ);
   sprite `life` dài (lốc xoáy) còn sống giữa chừng rồi gỡ đúng lúc hết `life`; `bossVfxScale` luôn nguyên ≥ 1 và
   tôn trọng `vfx` factor riêng từng khoá. Ảnh xác nhận: `fix-meteor-after.png` (chụp ở giây thứ 3, sau
   `ultimateEnd` — không còn quả cầu lửa nào sót lại trên màn).
2. **MEDIUM — cỡ VFX cào bằng 0.7×quái cho mọi khoá**: thêm field `vfx` (hệ số riêng) vào từng def liên quan
   trong `BOSS_SPRITES` (flam 0.55, explosion 0.75, iceFlake 0.4, icePillar 0.75, thunder 0.55, rockImpact 0.55,
   rockSpike 0.8, smokeCircular 0.45, windLeaf 0.12 — nhỏ hẳn, đúng ý "hạt lá" không phải sprite chính); hàm mới
   `bossVfxScale(name, targetS, mul)` (sprite-actors.js) thay hoàn toàn `pixelScale(q.s*0.7, bossVfxFh(name))` cũ.
   Ảnh xác nhận: `fix-wind-t1/t3.png` (smokeCircular/windLeaf giờ vừa phải, không tràn màn),
   `fix-tornado-cut/late.png` (lốc không còn phủ hết bề ngang khung).
3. **MEDIUM — đạn giả định 16px hướng lên**: `drawBossShotSprite`/`drawBossSpriteFx` đổi sang `bossVfxFh(s.sprite)`
   thật (trước hardcode 16 khiến spiritProj 32px to gấp đôi, iceSpikeProj 10px nhỏ hơn ý muốn). Thêm `rotOffset`
   riêng từng def (xem ảnh gốc bằng công cụ crop tự viết trước khi quyết): fireball/energyBallProj = PI/2 (đầu
   tròn hướng lên, xác nhận qua ảnh gốc), iceSpikeProj = 0 (hình nằm ngang, không phải chĩa lên), rockProj/
   spiritProj = không gán (tròn/xoáy không có "đầu" rõ → không tự xoay, tránh xoay sai trông kỳ). Ảnh xác nhận:
   `fix-ice-proj.png` (giáo băng xoay đúng theo cung bay), `fix-storm-proj.png`, `fix-wind-proj.png` (xoáy gió cỡ
   hợp lý, không còn to gấp đôi).
4. **MEDIUM — thiên thạch không xoay (đuôi đi trước)**: `drawBossSpriteFx` giờ tính `rot` từ `vx/vy` + `def.
   rotOffset` cho MỌI sprite di chuyển trong `fx.sprites`, không chỉ đạn ở `fx.shots`. Ảnh: `fix-meteor-mid.png`.
5. **MEDIUM — lốc xoáy tuyệt kỹ hết VFX trước khi hết nâng**: `bossSpawnSprite` thêm `vel.follow` (mỗi khung tự
   cập nhật `y` theo `bossMonsterLiftPx` hiện tại, "bay theo" quái bị nâng) + `anim:'cycle'` (thêm anim lặp cho
   `smokeCircular`) + `life = ultimateMs/1000` (sống suốt tuyệt kỹ, không chỉ 1 lượt ~0.67s). icePillar/boost
   cũng được cho `life` dài hơn 1 chút (1.1s/0.9s) để giữ khung cuối lâu hơn, đỡ cảm giác hụt. Ảnh:
   `fix-tornado-cut.png` (đầu tuyệt kỹ) + `fix-tornado-late.png` (gần hết `ultimateMs` — VFX vẫn còn, trước đây
   đã biến mất từ lâu).
6. **MEDIUM — khiên nổi giữa thân, lặp nhấp nháy**: đổi `shieldSprite` sang `loop:false` (nổi 1 lần rồi giữ khung
   cuối); `drawBossPassiveFx` lazy-init `fx.actor.shieldAt` lúc PHÁT HIỆN `st.shield>0` lần đầu, dùng
   `(now-shieldAt)/1000` làm `t` cục bộ (không phải giờ tuyệt đối) để anim chạy đúng 1 lượt từ 0; bỏ `opt.center`
   — neo mặc định "giữa-chân" tại `m.y` (chân pháp sư) thay vì lơ lửng giữa thân. Reset `shieldAt=0` khi hết
   khiên (phòng khiên được nạp lại sau này). Ảnh: `fix-passive-shield.png`.
7. **MEDIUM — trận đồ vẽ đứng, đè lên pháp sư**: tách hẳn phần trận đồ (`fx.circles`) khỏi `drawBossPassiveFx`
   thành `drawBossGroundFx(ctx, fx)` mới, gọi TRƯỚC `drawBossMonsterSprite`/`drawBossMageSprite` trong
   `boss-game-render.js` (lớp mặt đất); thêm `opt.scaleY` vào `drawSprite` (boss-game-sprite-atlas.js) — trận đồ
   vẽ với `scaleY: 0.42` (bóp dẹt, phối cảnh giả 3D nằm phẳng dưới chân, không còn tròn đứng thẳng). Ảnh:
   `fix-circle-t3.png` (pháp sư đứng rõ TRÊN vòng trận đồ dẹt, không bị che).
8. **MEDIUM — phạm vi buff Aura + bỏng thụ động**: `drawBossPassiveFx` đổi chữ ký thành `(ctx, fx, st, ui, now)`
   (render.js truyền `ui` có sẵn xuống, không đụng file logic); thêm sprite `auraSprite` (FX/Magic/Aura, đo 5
   khung 25×24 bằng công cụ lưới đỏ) vẽ lặp quanh pháp sư khi `ui.buff` true; thêm nhánh `st.burn` vẽ `flam` anim
   `cycle` nhỏ cạnh quái (tái dùng sprite flam sẵn có, không thêm ảnh mới, thêm biến thể anim `cycle` loop:true
   cho def flam). Ảnh: `fix-passive-buff.png`, `fix-passive-burn.png`. **FPS ≥ 50 khi tuyệt kỹ: bỏ tick** trong
   `phase-04-element-vfx-and-ultimates.md` — chưa đo bằng benchmark thật, chỉ xem số HUD debug tĩnh lúc chụp; ghi
   rõ "user tự kiểm `?fps`".
9. **LOW — comment lỗi thời**: `boss-game-render.js` (đầu file + dòng gọi `drawBossPassiveFx`) và
   `boss-game-spell-art.js` (dòng gọi `stepBossTier3Fx`) hết nhắc "hình lớn bậc 3"/"thiên thạch/…" (đã chuyển
   hẳn sang sprite theo hệ, không còn hình vẽ tay riêng biệt).
12. **LOW — reduced-motion chưa tắt hết chuyển động**: cắt cảnh tuyệt kỹ bỏ trượt chân dung khi `fx.reduced`
    (đứng yên, `slide=0`); meteor bỏ hẳn chuyển động rơi khi `fx.reduced` — chỉ còn nổ tại chỗ, lệch nhẹ độ trễ.
13. **LOW — Faceset đè tên chiêu trên màn hẹp 390×340**: chân dung đổi từ to/giữa (`fs` theo 0.42×min cạnh, tâm
    ở `w*0.28`) sang góc dưới-trái nhỏ (`fs` theo 0.24×min cạnh, tâm ở `(w*0.16, h*0.86)`); tên chiêu giữ nguyên
    giữa màn (`h*0.42`) — 2 vùng không còn chồng lên nhau ở mọi tỉ lệ khung hợp lý. Ảnh xác nhận cả 5 tuyệt kỹ:
    `fix-cut-{meteor,iceAge,chain,revive,tornado}.png`.

**Files đổi thêm ở vòng sửa review**: `js/boss-game-sprite-atlas.js` (183→192 dòng — thêm `vfx`/`rotOffset` field
+ anim `cycle` cho flam/smokeCircular/shieldSprite loop:false + sprite `auraSprite` mới + `opt.scaleY`),
`js/boss-game-sprite-actors.js` (172→199 — `bossSpawnSprite` opts-object, `bossVfxScale`, `stepBossActors`
life/follow, `drawBossShotSprite`/`drawBossSpriteFx` rotation+fh thật), `js/boss-game-tier3-ultimate-fx.js`
(104→121 — viết lại `bossFxUltimateEvent` dùng `bossVfxScale`+reduced-motion, tách `drawBossGroundFx`, sửa
`drawBossPassiveFx`/`drawBossUltimateCutscene`), `js/boss-game-render.js` (call site `drawBossGroundFx` +
`drawBossPassiveFx(..., ui, ...)`, sửa comment), `js/boss-game-spell-art.js` (sửa 1 comment), `sw.js` (+
`img/boss/fx/aura.png`), `tools/copy-boss-sprites.js` (+ `fx/aura.png`), `tests/run-tests.js` (+ sprite-actors.js
vào PURE_MODULES), `tests/boss-game-sprite-actors.test.js` (mới, 4 test). Không đổi `boss-game-logic.js`/
`boss-game-spell-math.js` (đúng yêu cầu không đụng logic trận). Thêm 1 ảnh `img/boss/fx/aura.png` (1.7KB) —
**img/boss tổng 343KB** (vẫn dưới mốc mềm 350KB).

**Test lại**: `node tests/run-tests.js` → **434 passed, 0 failed** (430 cũ + 4 mới). `node --check` sạch toàn bộ
file sửa. Dòng file sau sửa đều ≤ 200 (spell-presets.js là data, exempt, không đổi ở vòng này).

**Smoke test lại** (headless Chrome, DPR2, 390×340, không nằm trong repo, xem bằng Read tool, không ERR/REJ):
`<scratchpad>/anh-chup/fix-{meteor-after,meteor-mid,wind-t1,wind-t3,ice-proj,storm-proj,wind-proj,tornado-cut,
tornado-late,passive-shield,passive-burn,passive-buff,circle-t3,cut-meteor,cut-iceAge,cut-chain,cut-revive,
cut-tornado}.png` (18 ảnh). Dừng server sau khi chụp — xác nhận `curl` không còn kết nối cổng 8765.

## Executed Phase
- Phase: phase-04-element-vfx-and-ultimates
- Plan: `plans/260924-1651-mage-lexoria-ninja-adventure-pixel-art/`
- Status: completed

## Tóm tắt
Thêm VFX sprite thật cho 5 hệ × 3 bậc (đạn + va chạm), 5 tuyệt kỹ (VFX + cắt cảnh Faceset), 2 thụ động
(đóng băng/khiên); xoá hẳn `js/boss-game-tier3-shapes.js` (hình vẽ tay) + toàn bộ cơ chế `fx.customs`/
`bossFxSpawnCustom`. Không đụng logic trận (`boss-game-logic.js`, `boss-game-spell-math.js`). `node
tests/run-tests.js` → **430/430 xanh** (429 cũ + 1 test mới). Không commit theo yêu cầu.

## Đo khung sprite (không đoán từ chiều cao — công cụ tự viết)
Không có sharp/pngjs sẵn trong repo, viết 3 script Node thuần tại scratchpad: `png-tool.js` (decode PNG qua
`zlib.inflateSync` + tự giải filter PNG, encode lại PNG deflate mức 0), `grid-view.js` (phóng ảnh + vẽ lưới đỏ ở
`fw` ứng viên để xác nhận biên khung khớp bằng mắt, không suy đoán), `frame-count.js` (dò cột có alpha, tham khảo
chéo). Kết quả đo (đã xác nhận qua `boss-game-sprite-atlas.test.js` — test tự đọc IHDR thật, PASS nghĩa là khung
không tràn ảnh):
- Projectile: Fireball 64×16=4 khung 16 (đã có sẵn từ trước); IceSpike 144×10 → 8 khung 18×10; EnergyBall
  64×16=4×16; SpriteSheetRock 64×16=4×16; Magic/Spirit/SpriteSheet 160×32=5 khung 32 (gió, trắng).
- Impact: Elemental/Flam 200×30=8×25 (đã có); Explosion 360×40=9×40 (đã có); Elemental/Ice/SpriteSheet
  320×32=10×32; SpriteSheetB (cột băng) 288×32=9×32; Thunder 160×28=10×16; Rock 420×30=14×30; RockSpike
  540×48=10×54 (không vuông, xác nhận bằng lưới); Smoke/SmokeCircular 240×14=8×30 (rộng>cao); Particle/Leaf
  72×7=6×12.
- Khác: Magic/Circle/SpriteSheetOrange 128×32=4×32 (trận đồ, tô màu qua `opt.solid`); Magic/Shield/SpriteSheetBlue
  144×26=6×24; Magic/Boost 424×35=8×53; Faceset SorcererBlack/NinjaMageOrange 38×38 (1 khung).

## Files Modified
- `js/boss-game-sprite-atlas.js` (183 dòng) — thêm 16 def sprite mới (đạn/va chạm/trận đồ/khiên/hồi sinh/
  Faceset); `drawSprite` thêm `opt.solid` (vẽ hẳn bóng một màu theo hình khung qua `bossTintedFrame` — dùng để tô
  màu hệ cho sprite trận đồ chung, thay vẽ tay `drawMagicCircle`).
- `js/boss-game-spell-presets.js` (225 dòng, data — vượt 200 nhưng exempt) — mỗi preset 5 hệ × 3 bậc thêm
  `sprite: {proj, impact:[...]}` (data-driven, không hard-code hệ trong code); bỏ `BOSS_TIER3_CUSTOM` +
  field `custom` (thay bằng `sprite.impact` mảng, bậc 3 có thêm phần tử = "to hơn"/nhiều đợt theo đúng bảng phase
  4: Explosion×2, cột băng, Thunder×3, RockSpike, SmokeCircular×2); `BOSS_ULTIMATE_PRESETS` thêm `sprite`/
  `bigSprite`, đổi `hits` (meteor 5→4 quả rơi thật, chain giữ 3 tia).
- `js/boss-game-sprite-actors.js` (172 dòng) — `bossSpawnSprite` thêm `vel` (VFX di chuyển, dùng cho thiên thạch
  rơi); `stepBossActors` áp `vx/vy` mỗi khung. `bossActorEvent` tổng quát hoá: bỏ hẳn `el === 'fire'` đặc cách,
  đọc `bossSpellPreset(el,tier).p.sprite` để gắn sprite đạn lúc niệm + spawn mảng VFX va chạm (lệch nhẹ vị trí/độ
  trễ theo chỉ số để không đè khít khi có nhiều khoá, vd Explosion×2/Thunder×3).
- `js/boss-game-spell-art.js` (168 dòng) — bỏ đoạn gọi `bossFxSpawnCustom`/đọc `p.custom` chết (đã chuyển hẳn
  sang `bossActorEvent`); sửa comment đầu file.
- `js/boss-game-tier3-ultimate-fx.js` (viết lại, 104 dòng, từ 89) — bỏ hẳn phần dựa `fx.customs`/hình vẽ tay:
  `bossFxUltimateEvent` giờ spawn VFX sprite thật theo `BOSS_ULTIMATE_PRESETS` (meteor: 4 fireball rơi chéo có
  vận tốc thật `vx/vy` + explosion lớn lúc chạm đất, đúng tinh thần "phóng ×4 rơi chéo"; chain: 3 tia thunder lệch
  vị trí; iceAge/tornado: 1 sprite lớn tĩnh; revive: sprite boost + burst hồi cũ). `bossMonsterLiftPx` đọc thẳng
  `fx.ultimate.id==='tornado'` (bỏ phụ thuộc `fx.customs`). `drawBossPassiveFx`: trận đồ vẽ bằng sprite
  `magicCircle` tô màu hệ (`opt.solid`, áp dụng CẢ 5 HỆ chứ không riêng lửa — tổng quát hơn mô tả gốc, không cần
  thêm asset riêng từng màu); đóng băng thêm sprite `iceFlake` (anim `cycle`, lặp) bay quanh quái; khiên thêm
  sprite `shieldSprite` lặp tại pháp sư khi `st.shield > 0`. `drawBossUltimateCutscene`: chân dung đổi từ
  `drawMage` vẽ tay sang Faceset 38×38 (`mageFFace`/`mageMFace` theo `ui.gender`) phóng nguyên qua `pixelScale`;
  sương phủ toàn màn Kỷ Băng Hà giờ có `!fx.reduced` (bỏ hẳn khi giảm chuyển động); shake/flash tuyệt kỹ cũng gate
  `!fx.reduced` (trước đó chỉ shake được gate, flash thì không).
- Xoá: `js/boss-game-tier3-shapes.js` (drawMagicCircle/drawMeteor/drawLightningBolt/drawIcePillar/
  drawRockSpikes/drawTornado — toàn bộ hình vẽ tay bậc 3).
- `index.html`, `sw.js` — bỏ script `boss-game-tier3-shapes.js`; sw.js ASSETS thêm 16 ảnh mới; **CACHE bump
  `v2.17.0`**.
- `js/app-storage.js` — **APP_VERSION → `2.17.0`** (khớp CACHE).
- `tools/copy-boss-sprites.js` — thêm 16 file vào FILES map. Đã chạy:
  `node tools/copy-boss-sprites.js D:/project/eng/assets/ninja-adventure` → 46 file, 269.2KB copy gốc,
  **img/boss 339KB tổng** (dưới mốc mềm 350KB).
- `tests/boss-game-sprite-atlas.test.js` — thêm test "mọi khoá sprite trong preset phép (5 hệ × 3 bậc) + tuyệt kỹ
  đều tồn tại trong BOSS_SPRITES" (kiểm `sprite.proj`/`sprite.impact`/`BOSS_ULTIMATE_PRESETS[].sprite`/`bigSprite`).
  Test cũ có sẵn (`mọi ảnh sprite có trên đĩa và nằm trong sw.js ASSETS`, `khung của mọi anim nằm trong ảnh`) tự
  động phủ luôn 16 sprite mới, không cần viết thêm.

## Quyết định tự chọn (không hỏi lại, ghi theo yêu cầu)
1. **Trận đồ bậc 3 dùng chung 1 sheet cho cả 5 hệ** (Magic/Circle/SpriteSheetOrange, tô lại màu bằng
   `opt.solid`/`bossTintedFrame`) thay vì đúng nghĩa đen "Magic Circle cam" chỉ cho lửa — gói không có sheet
   trận đồ màu khác, tô lại rẻ hơn và đẹp hơn hẳn vẽ tay cũ, áp dụng luôn cho ice/storm/earth/wind (tổng quát hoá
   hợp lý, không lệch tinh thần yêu cầu).
2. **Gió dùng Magic/Spirit/SpriteSheet (trắng) không tô màu** cho đạn — gói không có bản xanh lá riêng; giữ màu
   gốc (trắng/xanh nhạt) đã đủ khác biệt hệ khác qua Smoke/Leaf phối màu nền; không thêm bước tô màu để tránh vỡ
   chi tiết bóng đổ gốc của sprite xoáy nhỏ.
3. **Buff = Magic/Aura: bỏ qua (YAGNI)** — phase đánh dấu optional, không có yêu cầu cụ thể trong bảng, không có
   test/luồng nào đọc trạng thái buff hiển thị riêng; giữ nguyên hành vi buff (tính điểm) không đổi.
4. **Meteor tuyệt kỹ có chuyển động thật** (`vx/vy` trên `fx.sprites`) thay vì tĩnh tại chỗ — mở rộng nhỏ hạ tầng
   sẵn có (`bossSpawnSprite`) để đúng đặc tả "phóng ×4 rơi chéo", tái dùng được cho tuyệt kỹ khác sau này.
5. **Faceset hiển thị như khung chân dung nền tối** (ảnh gốc Faceset.png có nền không alpha, không phải hình cắt
   trong suốt) — chấp nhận, nhìn giống thẻ bài chân dung, không lệch tinh thần "cắt cảnh".
6. **Không viết thêm module `boss-game-element-vfx.js` riêng** — logic VFX theo hệ đủ gọn để nằm trong
   `bossActorEvent` (sprite-actors.js, 172 dòng) nhờ thiết kế data-driven (`preset.sprite`), không cần tách file
   mới; giữ đúng YAGN/thực tế dòng.

## Tests Status
- Type check (`node --check`): pass toàn bộ file đổi (sprite-atlas, sprite-actors, spell-art, spell-presets,
  tier3-ultimate-fx, render, app-storage, sw.js, copy-boss-sprites.js, test file mới).
- Unit tests: `node tests/run-tests.js` → **430 passed, 0 failed**.
- Grep sạch: không còn `drawMagicCircle/drawMeteor/drawIcePillar/drawRockSpikes/drawTornado/drawLightningBolt/
  BOSS_TIER3_CUSTOM/bossFxSpawnCustom/fx.customs/tier3-shapes/el === 'fire'` (đặc cách lửa cũ) trong `js/`+`index.html`.
- File dòng: sprite-atlas 183, sprite-actors 172, spell-art 168, tier3-ultimate-fx 104 — đều ≤ 200; spell-presets
  225 (data, exempt).

## Smoke test trực quan (headless Chrome, DPR2, 390×340, không nằm trong repo)
Cập nhật `<scratchpad>/h.html` (bỏ script tier3-shapes) + `<scratchpad>/h.js` (thêm `?tier=`, `?ult=` +
`?ultAt=`/`?frz=`/`?shd=` để test tier/tuyệt kỹ/thụ động qua `useUltimate`/state trực tiếp — xem
`modifiersFor`/`useUltimate` trong `boss-game-logic.js`/`boss-game-elements.js`). Chụp + xem bằng Read tool, không
ERR/REJ trong `<title>` (mọi trang `done ...`):
- 5 hệ × bậc 1 và bậc 3 va chạm (`phase4-{fire,ice,storm,earth,wind}-{t1,t3}.png`): mỗi hệ có VFX riêng biệt rõ
  ràng (lửa cam-vàng, băng trắng-xanh, sét trắng-tím, đất nâu, gió trắng-xanh lá nhạt); bậc 3 to hơn hẳn bậc 1 +
  có vòng trận đồ tô màu hệ bao quanh.
- 5 tuyệt kỹ mid-cutscene + mid-effect (`phase4-ult-{meteor,iceAge,chain,revive,tornado}-{cut,fx}.png`): tên
  chiêu + chân dung Faceset hiện đúng (mageF đỏ tóc), Kỷ Băng Hà hiện cột băng rõ, Xích Sét hiện tia sét, Hồi
  Sinh hiện icon khiên + sprite boost, Lốc Xoáy hiện smoke-circular. `window.__ev` xác nhận event `ultimate` bắn
  đúng qua `useUltimate`.
- Thụ động (`phase4-passive-frozen.png`, `phase4-passive-shield.png`): đóng băng có mảnh băng nhỏ bay quanh quái
  (ngoài quầng xanh có sẵn); khiên có icon 🛡️ ở HUD + sprite khiên xanh gần pháp sư.
- Dừng server (`serve.js`) sau khi chụp xong — xác nhận `curl` không còn kết nối được cổng 8765.

## Issues / Concerns (đã xử lý ở vòng review, giữ lại để đối chiếu lịch sử)
- ~~Sprite khiên vẽ hơi thấp~~ → sửa ở review #6 (neo chân + rise-once), ảnh `fix-passive-shield.png` xác nhận ổn.
- FPS ≥ 50 lúc tuyệt kỹ: **vẫn chưa đo bằng benchmark thật** — đã bỏ tick khỏi phase-04 success criteria theo
  đúng yêu cầu review #8, ghi rõ "chưa đo — user kiểm `?fps`". Không phải blocker, chỉ là số liệu chưa có.

Status: DONE
Summary: Sau 2 vòng (implement + code review), 5 hệ × 3 bậc + 5 tuyệt kỹ + 2 thụ động + buff Ôn từ + bỏng đều dùng VFX sprite thật cỡ/hướng đúng theo từng khoá (không còn cào bằng 0.7×/16px), trận đồ vẽ lớp mặt đất bóp dẹt trước pháp sư, VFX di chuyển (thiên thạch) tự gỡ đúng theo life (hết rò rỉ fx.sprites), cắt cảnh không đè chữ trên màn hẹp, reduced-motion tắt cả trượt cắt cảnh lẫn rơi thiên thạch. Test 434/434 xanh (thêm 4 test thuần cho cơ chế life/vfx-scale), img/boss 343KB, sw.js/APP_VERSION v2.17.0, không commit.
Concerns/Blockers: không còn — mọi HIGH/MEDIUM/LOW áp dụng từ review đã sửa và xác nhận bằng ảnh; FPS liên tục lúc tuyệt kỹ vẫn chưa đo số cụ thể (đã ghi rõ trong phase-04.md, không chặn hoàn thành phase).
