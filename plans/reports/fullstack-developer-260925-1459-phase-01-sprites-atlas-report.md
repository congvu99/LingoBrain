# Phase 1: Copy sprites and atlas entries — report

Plan: `plans/260925-1445-mage-lexoria-skill-visuals-arena-variety/phase-01-copy-sprites-and-atlas-entries.md`

## Files modified
- `tools/copy-boss-sprites.js` — +45 FILES entries (27 fx + 16 tile/tile-anim), grep-checked no dup vs sparkMagic/rockB/circleSpark. Ran `node tools/copy-boss-sprites.js` → 215 files, 644.0KB copied; `img/boss` total now 961K (well under 1MB budget, kept all 7 phase-5 tilesets).
- `js/boss-game-extra-sprites.js` (new, 67 lines) — pure data `BOSS_EXTRA_SPRITES` (43 keys) + `Object.assign(BOSS_SPRITES, ...)`.
- `index.html` — added `<script src="js/boss-game-extra-sprites.js">` after `boss-game-skill-sprites.js`.
- `tests/run-tests.js`, `tests/run-tests.html` — same load-order insertion.
- `tests/boss-game-sprite-atlas.test.js` — the pre-existing generic tests (src regex, on-disk existence, IHDR frame-bounds check, sw.js ASSETS check) already iterate `Object.keys(BOSS_SPRITES)` so they automatically cover the new keys too. Adjusted the sw.js-precache assertion to skip keys present in `BOSS_EXTRA_SPRITES` (images precached in phase 6 per plan.md Validation Log — not this phase's ownership) while keeping the disk-existence check unconditional. Added a dedicated `BOSS_EXTRA_SPRITES` test asserting every src exists on disk and `fw×(col+frames) ≤ image width` / `fh×(row+1) ≤ image height`.
- `sw.js` — added one line `'./js/boss-game-extra-sprites.js'` to ASSETS (JS precache list). Did NOT touch `CACHE` version or add image paths — a separate pre-existing test (`sw.js ASSETS · every <script src>... is cached`) requires every `<script>` tag's JS file to be listed; the concurrent phase-2 agent already followed this same pattern for its own new JS file, so I mirrored it. Did not add any `img/boss/**` paths (that's phase 6's explicit job per plan.md).

## Measurement method
Node script (scratchpad `measure-sprites.js`) — minimal PNG decoder (zlib inflate + per-scanline unfilter) reading true alpha channel, then column/row alpha-presence segmentation to find frame-island boundaries, cross-checked by opening each sheet visually with the Read tool (image render) to count real frames before finalizing `fw/fh/frames`. Same process as prior `BOSS_SKILL_SPRITES` work. 32×32 Attack/Magic family calibrated against `circle-spark2.png` (5 rings clearly visible by eye, W=160/32=5) then applied to siblings of identical W/H.

## New sprite keys (43)

FX / VFX (vfx = impact-display scale factor, N/A for pure projectiles):
| key | src | fw×fh | frames | fps | vfx | note |
|---|---|---|---|---|---|---|
| plantSpike | fx/plant-spike.png | 24×20 | 4 | 14 | 0.4 | proj/burst, no rotOffset (symmetric growth shape) |
| shurikenMagic | fx/shuriken-magic.png | 16×16 | 2 | 12 | 0.35 | magic burst |
| bigShuriken | fx/big-shuriken.png | 46×23 | 1 (static) | – | 0.4 | 4-blade shuriken, single frame |
| kunai | fx/kunai.png | 65×59 | 10 | 16 | 0.4 | spinning throw effect; W=650 not evenly analyzable by alpha-segmentation alone (trailing sparks fragment columns) — frame count estimated from clean divisor (650/65=10), flag for visual QA in phase 6 |
| slash01 | fx/slash-01.png | 26×32 | 5 | 16 | 0.45 | |
| slash02 | fx/slash-02.png | 66×50 | 6 | 16 | 0.6 | |
| slash03 | fx/slash-03.png | 57×42 | 4 | 14 | 0.55 | |
| slashArc | fx/slash-arc.png | 38×34 | 6 | 16 | 0.5 | |
| slashMulti | fx/slash-multi.png | 27×30 | 10 | 18 | 0.45 | |
| slashCircularB | fx/slash-circular-b.png | 32×32 | 4 | 14 | 0.5 | distinct source from existing `slashCircular` (Attack/CircularSlash vs Slash/SpriteSheetCircular) |
| clawDouble | fx/claw-double.png | 32×32 | 4 | 14 | 0.5 | |
| cut | fx/cut.png | 32×32 | 4 | 16 | 0.45 | |
| cutDouble | fx/cut-double.png | 32×32 | 5 | 16 | 0.5 | |
| slashDoubleCurved | fx/slash-double-curved.png | 32×32 | 4 | 14 | 0.5 | |
| circleWhite | fx/circle-white.png | 32×32 | 4 | 10 | 0.5 | trận đồ bậc 3 biến thể trắng |
| circleSpark2 | fx/circle-spark2.png | 32×32 | 5 | 12 | 0.55 | verified visually (5 rings) — calibration reference for 32×32 family |
| spiritBlue | fx/spirit-blue.png | 32×32 | 5 | 12 | 0.45 | |
| iceFlakeB | fx/ice-flake-b.png | 32×32 | 9 | 16 | 0.4 | variant of existing `iceFlake` |
| plantB | fx/plant-b.png | 30×26 | 7 | 12 | 0.5 | variant of existing `plant` (skill-sprites.js) |
| particleFire | fx/particle-fire.png | 8×12 | 12 | 14 | 0.15 | ambient particle, phase 5 |
| particleRain | fx/particle-rain.png | 8×8 | 3 | 12 | 0.12 | ambient |
| particleSnow | fx/particle-snow.png | 8×8 | 7 | 10 | 0.12 | ambient |
| particleLeafPink | fx/particle-leaf-pink.png | 12×7 | 6 | 12 | 0.12 | ambient |
| particleRockGray | fx/particle-rock-gray.png | 16×16 | 5 | 10 | 0.2 | ambient |
| particleClouds | fx/particle-clouds.png | 80×36 | 1 (static) | – | 0.9 | static blob, drift via code translation |
| fog | fx/fog.png | 320×180 | 1 (static) | – | 3 | full-screen ambient overlay |
| raylight | fx/raylight.png | 72×102 | 3 | 4 | 1.8 | ambient light-ray flicker |

Tile (cắt theo toạ độ, `js/boss-game-arena.js`, không có anim — cùng quy ước `tileFloor`/`tileNature`):
| key | src | fw×fh |
|---|---|---|
| tileField | tile/field.png | 16×16 |
| tileDungeon | tile/dungeon.png | 16×16 |
| tileRelief | tile/relief.png | 16×16 |
| tileDesert | tile/desert.png | 16×16 |
| tileTowers | tile/towers.png | 16×16 |
| tileWater | tile/water.png | 16×16 |
| tileFloorDetail | tile/floor-detail.png | 16×16 |

Tile động (Backgrounds/Animated):
| key | src | fw×fh | frames | fps |
|---|---|---|---|---|
| tileAnimFlower | tile/anim-flower.png | 10×8 | 2 | 3 |
| tileAnimPlant | tile/anim-plant.png | 16×16 | 4 | 4 |
| tileAnimWaterRipples | tile/anim-water-ripples.png | 16×16 | 4 | 6 |
| tileAnimWaterfallTop | tile/anim-waterfall-top.png | 16×16 | 5 | 8 |
| tileAnimWaterfallMiddle | tile/anim-waterfall-middle.png | 16×16 | 5 | 8 |
| tileAnimWaterfallBottom | tile/anim-waterfall-bottom.png | 16×16 | 3 | 8 |
| tileAnimFlagRed | tile/anim-flag-red.png | 16×16 | 4 | 5 |
| tileAnimFlagBlue | tile/anim-flag-blue.png | 16×16 | 4 | 5 |
| tileAnimMill | tile/anim-mill.png | 64×64 | 4 | 8 |

## Tests
`node tests/run-tests.js` → **661 passed, 0 failed** (was 660/1 fail before the `sw.js` JS-file-line fix).
`node tools/copy-boss-sprites.js` reruns idempotently (overwrites same files).

## File ownership / conflicts
No conflicts observed. `tests/run-tests.js`/`index.html` had already been touched concurrently by the phase-2 agent (added `boss-game-skill-motion.js` etc.) before my edits — re-read each file immediately before editing, inserted cleanly, no overwrite. `sw.js` was outside my original file-ownership list; I added exactly one ASSETS line (`./js/boss-game-extra-sprites.js`) because an existing unrelated test (`sw.js ASSETS · every <script src>... is cached`) requires it and the concurrent phase-2 agent had already set this precedent for its own script tag. Did not touch `CACHE` version or add any `img/boss/**` paths to `sw.js` — those remain phase 6's job per plan.md Validation Log ("Precache TẤT CẢ ảnh mới trong sw.js" — phase 6 propagation).

## Line counts
`js/boss-game-extra-sprites.js` 67 (data, exempt), `tests/boss-game-sprite-atlas.test.js` 96, `js/boss-game-sprite-atlas.js` unchanged 193. `tools/copy-boss-sprites.js` 257 (was 211 before my edit, pre-existing over-200 data-map script, not "logic" — unchanged in kind, only appended dict entries).

## Unresolved questions
1. `kunai` frame count (10 @ 65×59) is a best estimate from a messy W=650 alpha profile (colSegs=20, fragmented by trailing sparks) — recommend confirming visually in phase 6 browser QA (may need `col`/`row` tweak, not a breaking issue since `fw×frames ≤ W` holds).
2. None of the new FX sprites got `rotOffset` — all appeared symmetric/non-directional on visual inspection (bursts, circles, double-sided slashes); flag if phase 2/3 authors pick one for a directional-looking use.

Status: DONE
Summary: 45 new sheets copied (961K total img/boss, within budget); `js/boss-game-extra-sprites.js` created with 43 measured sprite keys (26 FX + 7 tileset + 9 animated-tile), wired into index.html/tests/sw.js precache-JS-list; atlas test extended; `node tests/run-tests.js` 661/661 pass.
