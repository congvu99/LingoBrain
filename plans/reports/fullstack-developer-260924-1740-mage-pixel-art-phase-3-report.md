# Phase 3 — Full monster roster and regions

## Cập nhật sau code review (2026-09-24, vòng 2)
Review: `plans/reports/code-reviewer-260924-1811-mage-pixel-art-phase-3-review-report.md`. Sửa hết High/Medium +
phần Low được yêu cầu, giữ test xanh, không commit.
1. **HIGH — tests/run-tests.html thiếu boss-game-arena.js**: thêm `<script src="../js/boss-game-arena.js">` sau
   sprite-atlas (trước các file test). Không kiểm chứng được toàn bộ trang chạy hết trong headless Chrome ad-hoc
   (một số test async khác — `recording-store.test.js` dùng IndexedDB — có vẻ không hoàn tất trong môi trường
   headless không có server thật/profile persistent; đây là hạ tầng có sẵn từ trước, không liên quan tới fix này).
   Xác nhận hẹp: `curl` mọi `<script src>` trong file → 200 (trừ `word-import.test.js` 404, đã có sẵn từ trước
   phase này, review cũng ghi nhận). Thứ tự nạp đúng đảm bảo `BOSS_ARENAS` tồn tại trước khi test đọc.
2. **Boss Hit sheet không hiện hoạt ảnh**: thêm `A.mon.hitAnimT` (mốc 0 đặt lúc `impact`, đếm lên mỗi khung qua
   `stepBossActors`, không phụ thuộc đồng hồ trận). `bossMonSpriteVariant` chọn `spriteHit` khi
   `!spriteAnimDone(...,'idle',hitAnimT)` (đúng độ dài sheet, không giới hạn theo `BOSS_FLASH_S` 0.18s cũ).
   `drawBossMonsterSprite` dùng `hitAnimT` làm t khi đang chiếu Hit, phủ nháy nhẹ 0.4 (thay vì 0.9) để thấy khung
   Hit thật. Ảnh xác nhận: `phase3-review-hit-wyvern-500.png` (TenguBlue rõ khung Hit khác idle + tia hạt).
3. **HUD clamp chỉ áp cho Oblivion**: tổng quát hoá — tính `fhMax = max(fh idle, fh spriteHit, fh spriteAttack)`,
   kẹp `k` (vòng `while`) cho MỌI quái, không riêng Oblivion (trước đó TenguBlue Attack 82px > Idle 68px có thể
   tràn HUD lúc ra đòn). `js/boss-game-render.js`.
4. **Oblivion tan chỉ mỗi đầu, sai vị trí**: thêm `bossOblivionLayout(x,y,k,bob)` dùng chung giữa vẽ
   (`drawBossDragonComposite`) và tan pixel (`bossMonsterDissolve`) — đảm bảo vị trí luôn khớp. Dissolve giờ lấy
   mảnh từ cả 5 phần (đầu + 2 cánh + 2 đốt thân + đuôi) tại đúng toạ độ hiển thị. Ảnh xác nhận:
   `phase3-review-death-oblivion.png` (mảnh vỡ rải quanh đúng vùng đầu/cánh, không chỉ 1 điểm).
5. **Mảnh vỡ thưa với trùm khung to**: `bossDissolvePiecesOf()` lưu `step` theo từng mảnh, vẽ
   `fillRect(x,y,q.k*step,q.k*step)` thay vì `q.k` cố định — mảnh to đúng tỉ lệ, hết cảm giác lưới chấm thưa. Ảnh:
   `phase3-review-death-tengu.png`.
6. **Comment lỗi thời "vẽ tay thay thế"**: sửa `js/boss-game-ui.js` (dòng nạp sprite) + xác nhận
   `js/boss-game-sprite-actors.js` đã đúng (ghi rõ "không có phương án vẽ tay thay thế, đã xoá ở phase 3, cố ý").
- **Bug tự phát hiện thêm (không có trong review, nhưng chặn hẳn #2/#4)**: `fx.layout.pixel` không còn được gán ở
  đâu (đã bỏ nhánh non-pixel ở vòng sửa trước) nhưng `bossActorEvent` (sprite-actors.js) và `bossFxEvent`
  (spell-art.js) vẫn đọc `L.pixel`/`L.pixel` để quyết có chạy flash/lunge/dissolve/điểm phóng phép hay không →
  luôn `undefined` → **toàn bộ hiệu ứng diễn viên (nháy trúng đòn, lao, tan pixel, điểm phóng phép đúng vai) im
  lặng không chạy từ vòng sửa trước**. Đã xoá `if (!L.pixel) return;` trong `bossActorEvent` và đổi
  `L.pixel ? bossMageCastPoint(m) : mageStaffTip(...)` thành luôn `bossMageCastPoint(m)` (mọi vùng đều sân tile).
- Low: dragon composite giờ nhận `t=0` khi `st.frozen` (đứng yên, khớp quái khác) và `opt.reduced` (từ
  `fx.reduced`) tắt hẳn vỗ cánh/nhấp nhô khi giảm chuyển động. phase-03 file: "chờ user duyệt" → "đã duyệt
  2026-09-24".
- Test: `node tests/run-tests.js` → **429/429 pass**. `node --check` sạch. Dòng file sau sửa: sprite-actors 163,
  dragon-composite 42, render 131, spell-art 168, ui 194 — đều ≤ 200.
- Ảnh xác nhận thêm (không nằm trong repo): `phase3-review-hit-{wyvern-300,400,500,650,goblinKing}.png`,
  `phase3-review-hit-oblivion.png`, `phase3-review-death-{oblivion,tengu}.png`.

## Cập nhật sau review controller (2026-09-24, cùng ngày)
Controller xem ảnh chụp ban đầu, chỉ ra 4 lỗi hình — đã sửa hết, re-screenshot xác nhận:
1. **Đế đất hình vuông trắng** (cliffs/dragonlair rõ, catacombs nhẹ) — nguyên nhân: đế lấy nguyên khối tròn
   autotile 48×48 của TilesetFloor.png, nền PNG quanh khối tròn là **trắng đặc** (không alpha) → lộ hình vuông.
   Fix: bỏ hẳn cách vẽ đế bằng ảnh, thay bằng `bossArenaPatch()` mới trong `js/boss-game-arena.js` — vẽ elip bằng
   ô pixel (fillRect theo hàng, giống `bossPixelShadow`) với màu `patchColor` riêng từng vùng (đo từ đúng màu nền
   tile bằng script, nhân hệ số tối ~0.55–0.72). Áp dụng cho cả 4 vùng.
2. **`details` (biến thể lát nền) lộ mảng trắng rải rác** — nguyên nhân tương tự: các cột rìa của khối tròn
   autotile dính nền trắng, không phải "an toàn nội bộ" như tưởng ban đầu (chỉ tâm khối mới an toàn). Fix: catacombs/
   cliffs/dragonlair chỉ còn 1 phần tử `details` = đúng tâm khối (giống hệt `grass`, coi như không biến thể — an
   toàn tuyệt đối); ashford giữ nguyên (không bị báo lỗi, dải nền đó vốn là dải tile phẳng thật, không phải blob).
3. **Hàng xa cliffs là hình chữ nhật trắng/xám trơn** (dùng TilesetRelief) — đổi sang cụm đá xám thật từ
   TilesetNature.png (đo bằng công cụ crop PNG, toạ độ `[257,80,55,48]` cụm 3 đá + `[254,131,33,28]` đá đơn).
4. **Hàng xa dragonlair là tháp cát + nền cam viền trắng đọc lạ** — bỏ tháp `tileDesert`, đổi sang cụm đá nâu
   TilesetNature (`[193,80,55,48]` + `[206,131,33,28]`); trời đổi dải trên cùng `#210a08`→`#2a0a06` (đỏ sẫm hơn,
   cảm giác hang sâu). **Xoá hẳn `tileRelief`/`tileDesert`** khỏi BOSS_SPRITES/BOSS_ARENA_SPRITES/sw.js/copy tool
   + xoá 2 file ảnh không dùng nữa (24KB) → img/boss còn **288KB** (dưới mốc 300KB, giải quyết luôn concern #1 cũ).
5. **Oblivion nhìn như cột totem** — viết lại `drawBossDragonComposite`: 3 đốt thân/đuôi vẽ TRƯỚC (bị đầu che gần
   hết, chỉ hở chỏm đuôi nhỏ dưới chân), cánh + đầu vẽ SAU CÙNG (đầu che phần lớn thân) → đọc như đầu rồng lớn +
   cánh xoè, không còn dáng cột. Phát sinh lỗi phụ: hằng `BOSS_OBLIVION_HEIGHT` tính sai (dùng nửa chiều cao đầu/
   đuôi thay vì đủ) khiến ở khung nhỏ đầu rồng tràn lên trên HUD — sửa công thức tính đúng (90px thật ở k=1) và
   thêm kẹp an toàn trong `layoutBoss` (`js/boss-game-render.js`): hạ `k` từng bước tới khi đỉnh đầu không tràn
   quá `h*0.14` phía trên vị trí neo, tối thiểu k=1.
- Files đổi thêm ở vòng fix: `js/boss-game-arena.js`, `js/boss-game-dragon-composite.js`, `js/boss-game-render.js`,
  `js/boss-game-sprite-atlas.js`, `sw.js`, `tools/copy-boss-sprites.js`, `tests/boss-game-story.test.js` (thêm
  assertion `patchColor` hex hợp lệ, bỏ tham chiếu `A.base` đã xoá).
- Test lại: `node tests/run-tests.js` → **429/429 pass**. `node --check` sạch toàn bộ file sửa.
- Ảnh xác nhận (không nằm trong repo): `<scratchpad>/anh-chup/phase3-fix-{troll,lich,oblivion,darkKnight}.png` +
  `phase3-fix2-{oblivion,wyvern,skeleton}.png` (oblivion chụp 2 lần — lần 1 vẫn tràn đầu, lần 2 sau khi sửa
  `layoutBoss` đã vừa khung).
- Concern còn lại từ báo cáo gốc: (2) hang rồng vẫn không có tile "hang đá" thuần trong gói — đã đổi từ tháp cát
  sang cụm đá nâu (đỡ lạc quẻ hơn tháp), nhưng vẫn không phải vách hang khép kín; (3) chưa đo ms build arena vẫn
  còn treo, không nằm trong phạm vi yêu cầu sửa hình lần này.

## Executed Phase
- Phase: phase-03-full-monster-roster-and-regions
- Plan: `plans/260924-1651-mage-lexoria-ninja-adventure-pixel-art/`
- Status: completed

## Files Modified
- `js/boss-game-story.js` (71 dòng) — BOSS_REGIONS bỏ sky/ground/accent (chỉ id/name, arena tự có sky riêng);
  BOSS_MONSTERS: mỗi quái có `sprite` (+ `spriteHit`/`spriteAttack` cho 2 trùm có sheet thật), bỏ
  `palette/features/attackFx` (chỉ dùng ở 3 file đã xoá — grep xác nhận). GIỮ `shape` (BOSS_SHAPE_EMOJI ở
  `boss-game-story-journal-ui.js` còn đọc — phase 5 mới bỏ). Đổi tên quái trong 28 đoạn truyện theo bảng đã duyệt.
- `js/boss-game-sprite-atlas.js` (159 dòng) — thêm 19 def: 7 quái 16px 4 hướng, 3 trùm có Idle/Hit/Attack riêng
  (giantRacoon+Attack, giantSpirit+Hit, tenguBlue+Hit+Attack), 5 mảnh Oblivion (head/wing/body1/body2/bodyEnd),
  3 tile vùng mới (tileVillage/tileRelief/tileDesert).
- `js/boss-game-dragon-composite.js` (mới, 25 dòng) — `drawBossDragonComposite` ghép Oblivion đứng chính diện:
  đuôi dưới cùng → 2 đốt thân → đầu trên cùng (nhấp nhô theo sin), 2 cánh xoè hai bên đầu (vỗ bằng xoay nhẹ).
- `js/boss-game-arena.js` (94 dòng) — thêm BOSS_ARENAS cho catacombs/cliffs/dragonlair (toạ độ tile đo bằng công
  cụ crop PNG tự viết, xem mục "Cách đo tile" bên dưới); BOSS_ARENA_SPRITES thêm 3 tile mới.
- `js/boss-game-sprite-actors.js` (135 dòng) — `bossMonsterDissolve` tổng quát hoá 16px→def.fw/fh (không còn cứng
  16px, đúng cho trùm 40–82px); `bossMonSpriteVariant` chọn sheet Hit/Attack theo state; `drawBossMonsterSprite`
  rẽ nhánh Oblivion sang `drawBossDragonComposite`.
- `js/boss-game-render.js` (viết lại, 120 dòng) — `layoutBoss` tính `k` theo `fh` thật của sprite (thay vì cứng
  16), Oblivion dùng `BOSS_OBLIVION_HEIGHT`; bỏ hẳn nhánh vẽ tay (drawMonster/drawBossClock ring/bossMonsterPose/
  buildRegionBackdrop) — mọi vùng/quái giờ luôn là sprite; `drawBossRegion` không có ảnh tile → tô phẳng 1 màu
  (không throw); `drawBossMonsterSprite` không sẵn sàng → tự bỏ qua vẽ quái (không throw). Mage vẫn giữ fallback
  `drawMage` (theo quyết định giữ tới phase 5).
- `js/boss-game-tier3-ultimate-fx.js` — sửa comment lỗi thời (`drawMonster` → `drawBossMonsterSprite`).
- `tools/copy-boss-sprites.js` — thêm 22 file vào FILES map (7 quái, 7 sheet trùm Idle/Hit/Attack, 5 mảnh
  Oblivion, 3 tileset). Đã chạy: `node tools/copy-boss-sprites.js D:/project/eng/assets/ninja-adventure` → 32
  file, **267.1KB copy gốc / 316KB tổng thư mục img/boss** (nhỉnh hơn mốc <300KB ~16KB — không thêm dep nén ảnh
  theo đúng yêu cầu, báo cáo số thật).
- `index.html`, `sw.js` — bỏ 3 script cũ (monster-shapes/monster-art/scene), thêm `boss-game-dragon-composite.js`;
  sw.js ASSETS thêm 19 ảnh mới + `boss-game-dragon-composite.js`; **CACHE bump `v2.16.0`**.
- `js/app-storage.js` — **APP_VERSION → `2.16.0`** (khớp CACHE, theo yêu cầu gate).
- `tests/run-tests.js` — thêm `boss-game-dragon-composite.js` + `boss-game-arena.js` vào PURE_MODULES (cả hai
  không đụng DOM khi nạp — `buildBossArena` tự `typeof document === 'undefined'` guard).
- `tests/boss-game-story.test.js` — bỏ assertion `m.palette`, thay bằng: mỗi quái có `sprite` tồn tại trong
  BOSS_SPRITES (+ spriteHit/spriteAttack nếu có); thêm test mới "BOSS_ARENAS có sân cho đủ 4 vùng, tile hợp lệ
  và (ở Node) nằm trong ảnh PNG thật" — đọc IHDR từng ảnh, kiểm mọi tile `[name,sx,sy,sw,sh]` không tràn khung ảnh.
- Xoá: `js/boss-game-monster-shapes.js`, `js/boss-game-monster-art.js`, `js/boss-game-scene.js`.
- Thêm 22 ảnh vào `img/boss/actor/` + `img/boss/tile/` (không commit — user tự thêm, đã liệt trong tools).

## Cách đo tile (không đoán mò)
Vì không có sharp/pngjs trong repo (chặn cài global), viết PNG decode/crop thuần Node (`zlib.inflateSync` + tự
giải filter PNG) tại scratchpad (`png-tool.js`), crop từng vùng tileset thật ở độ phóng 4–12x rồi xem bằng Read
tool để chọn toạ độ ô 16×16 phẳng, không viền trắng (tránh vệt lem khi lát). Xác nhận trước khi ghi vào
BOSS_ARENAS. TilesetFloor.png hoá ra có khối tròn biến thể xanh nhạt (băng) và cam (dung nham) ở dải dưới cùng
(y≈336-417) — dùng lại luôn cho cliffs/dragonlair thay vì phải copy thêm ảnh nền riêng (tiết kiệm dung lượng).

## Quyết định lệch nhẹ so với mô tả phase (đã kiểm tra ảnh thật trước khi đổi)
- Hầm mộ: phase ghi "TilesetVillageAbandoned, floor nâu" nhưng ảnh đó chỉ có nhà đổ/tường/bia mộ, không có tile
  nền. Nền hầm mộ dùng lại TilesetFloor.png (khối tròn biến thể nâu, y≈224); TilesetVillageAbandoned chỉ dùng cho
  hàng xa (nhà đổ rêu + bia mộ) — đúng tinh thần "tàn tích rêu".
- Hang rồng: TilesetDesert chỉ có tháp/đền cát (không có tile hang đá thuần), dùng tháp mái xanh làm hàng xa —
  hợp màu cam lửa của nền nhưng không phải "hang đá" thuần tuý; chấp nhận vì không có asset hang đá tốt hơn
  trong gói mà không phá ngân sách ảnh.

## Sprite frame — số liệu đo thật (IHDR)
Quái 16px (Racoon/Skull/Spirit/Mole/Owl/Flam/Dragon monster): sheet 64×64 = 4 hướng × 4 khung, cùng khuôn Slime.
Trùm: GiantRacoon Idle 360×60 (6 khung/60px), Attack 240×60 (4 khung); GiantSpirit Idle 250×50 (5 khung/50px),
Hit 150×50 (3 khung); TenguBlue Idle 408×68 (6 khung/68px), Hit 544×68 (8 khung), Attack 1230×82 (15 khung/82px
— ảnh Attack cao hơn Idle, chấp nhận lệch tỉ lệ nhẹ lúc ra đòn). DragonBlue: Head 44×46, Wing 57×57, Body1/Body2
31×27, BodyEnd 29×40 — đều ảnh tĩnh 1 khung, ghép bằng code.

## Tests Status
- Type check (`node --check`): pass toàn bộ file đổi.
- Unit tests: `node tests/run-tests.js` → **429 passed, 0 failed** (428 cũ + 1 test BOSS_ARENAS mới).
- Grep sạch: không còn `drawMonster`, `BOSS_SCENE_PAINTERS`, `shapeHumanoid`, `buildRegionBackdrop`.
- File dài nhất đổi trong phase: `boss-game-sprite-atlas.js` 159 dòng — trong hạn 200.

## Smoke test trực quan (headless Chrome, DPR2, 390×340)
Dựng lại `<scratchpad>/h.html` khớp script set index.html mới (bỏ 3 file xoá, thêm dragon-composite). Chụp đủ 12
quái (idle) + 1 hit (wyvern) + 1 death (goblin), xem bằng Read tool, không có ERR/REJ trong `<title>` (mọi trang
đều `done ...`). Lưu tại `<scratchpad>/anh-chup/phase3-*.png` (12 idle + hit-wyvern + death-goblin = 14 ảnh, không
nằm trong repo). Nhận xét: 4 sân đấu phân biệt rõ (Ashford hoàng hôn cam-tím + nhà mái cam; Hầm mộ tối + tường rêu
xám-vàng; Núi đá xanh nhạt + vách trắng bạc; Hang rồng cam-đen + tháp cát); quái/trùm scale đúng theo hpMul (trùm
rõ ràng to hơn, ví dụ Vua Gấu Mèo/Thiên Cẩu/Oblivion đều chiếm phần lớn khung so với quái thường); pháp sư giữ
nguyên vị trí/kích cỡ qua mọi trận (không đổi so với phase 2). Oblivion ghép mảnh nhận diện được là rồng đứng
(đầu-cánh-thân-đuôi) dù không sao chép y hệt tư thế cuộn nghiêng của ảnh gốc. Không phát hiện lỗi HUD chồng lấp
nghiêm trọng; riêng dragonlair HUD trái hơi chồng nhẹ lên cột tháp nền nhưng vẫn đọc được nhờ nền tối phía sau chữ.

## Open Issues / Concerns
- img/boss 316KB, vượt mốc mong muốn <300KB khoảng 16KB (do 7 sheet quái + 3 sheet trùm mới). Không thêm dep nén
  ảnh theo đúng ràng buộc — nếu cần siết thêm, phải cắt bớt asset ở phase sau hoặc chấp nhận số này.
  **User decision cần nếu muốn giảm tiếp** (không tự ý cắt asset đã duyệt).
  - Verification: đo trực tiếp bằng `du -sh img/boss` sau khi chạy `tools/copy-boss-sprites.js`, không suy đoán.
- Ảnh Attack của TenguBlue cao hơn Idle (82 vs 68px) — lúc chuyển sang khung tấn công, quái nhỉnh to hơn một chút
  do dùng chung hệ số `k`; chấp nhận vì đúng ảnh gốc, không kéo méo pixel.
- Chưa đo số mili-giây build `buildBossArena` (yêu cầu "< 30ms") — dựng 1 lần/resize giống cơ chế phase 2, không
  có bằng chứng đo cụ thể; nếu cần số liệu chính xác, cần thêm phép đo ở phase 4/5 hoặc theo yêu cầu riêng.

Status: DONE_WITH_CONCERNS
Summary: Đủ 12 quái/trùm sprite thật + 4 sân tile riêng biệt, Oblivion ghép mảnh, test 429/429 xanh, sw.js/APP_VERSION đồng bộ v2.16.0, grep sạch code vẽ tay cũ; ảnh nhỉnh 16KB so với ngân sách 300KB và build-arena chưa đo số ms là 2 điểm cần user biết.
Concerns/Blockers: (1) img/boss 316KB > mốc 300KB ~16KB — cần user duyệt giữ nguyên hay cắt bớt asset; (2) hang rồng dùng tháp cát TilesetDesert thay vì tile hang đá thuần (gói không có) — lệch nhẹ mô tả phase nhưng đã cân nhắc theo asset thật; (3) chưa đo ms build arena.
