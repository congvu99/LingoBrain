# Arena visual QA fixes — mage Lexoria skill visuals + arena variety

Date: 2026-09-25 · Plan: `plans/260925-1445-mage-lexoria-skill-visuals-arena-variety/` · QA source:
`plans/reports/tester-260925-1528-browser-visual-qa-screenshots-report.md`

Fixed all 12 numbered issues from the QA report except the 2 explicitly out-of-scope (#7 canvas layout shift on
prompt wrap, #8 square smoke particles in `js/game-particles.js`).

## Tools used
No PIL/pngjs available (checked both). Wrote a pure-Node PNG decoder/encoder (zlib only) in scratchpad to
upscale tiles + overlay a 16px grid for visual crop measurement, plus a "find solid opaque 16×16 cells" scanner
to locate safe (non-transparent, non-edge) crops — same principle the original phase-3/5 author used, just
re-implemented since no PNG lib was installed:
- `…/scratchpad/qa/png-tool.js` (decode/encode/upscale/grid)
- `…/scratchpad/qa/find-solid-tiles.js` (solid-cell scanner)
- `…/scratchpad/qa/crop-preview.js` (crop + upscale for visual check)

## Files modified
- `js/boss-game-arena-layouts.js` — crop fixes (goblin/troll/wyvern), goblinKing far/anim layout, ghost far-row +
  sky, dragonlair trio (darkKnight/youngDragon/oblivion) far-row + oblivion sky, wyvern `stackDown` anim.
- `js/boss-game-arena-ambient.js` — `BOSS_AMBIENT_KIND.mul` per sprite (particle size cap), per-particle `phase`
  (desync pulse), `bossAmbientBack` gains `stackDown` support (contiguous stacked anim tiles, e.g. waterfall).
- `js/boss-game-render.js` — guard `drawBossRegion` against 0×0 canvas; moved ambient `'front'` draw earlier (now
  before rune circle/spell VFX/damage text) so weather no longer covers floating text/damage numbers.
- `js/boss-game-monster-attack-fx.js` — attack-VFX cap raised 0.8×→1.0×`m.s`; goblinKing/lich per-entry `scale`
  bumped (0.8→1.0, 0.6→0.85).
- `tests/boss-game-monster-attack-fx.test.js` — updated cap assertion (0.8×→1.0×) to match code.

## Issue-by-issue

**1. Troll floor holes (High).** `floor-detail.png` is a debris-icon sheet (twigs/bones/mushroom/rock), every
16×16 cell has partial transparency (verified: scanner found zero fully-opaque cells across all 80 tiles). Since
`details` REPLACES the grass tile (not an overlay), any transparent icon there always shows the navy/red hole
behind it — this can't be fixed by picking a different crop from this sheet. Dropped the `tileFloorDetail`
override entirely per the QA report's own suggested fallback; troll keeps `cliffs`' base (opaque) grass details.
Verified in `arena-m/d-14-troll.png` (after): clean ice floor, no holes.
Also checked: cliffs' light-blue ground tile is the *intentional* ice-floor variant (comment in `BOSS_ARENAS.cliffs`
confirms "băng xanh nhạt" = pale-blue ice); left unchanged, documented in a new code comment.

**2. Goblin peach squares (High/Med).** `field.png` crop `[6,11,16,16]` was off the 16px grid, clipping the
rounded-corner (near-white) edge between 2 color bands. Scanner found the only fully-opaque interior cell per
5 color bands; picked the light-green band (`[16,64,16,16]`) — textured, opaque, distinct from base ashford
grass, fits "cỏ hoa" flavor with the existing `tileAnimFlower` overlay. Verified in `arena-m-00-goblin.png`.

**3. Wrong far-row crops (Med).** `tileRelief 24,90,48,30` (troll) and `tileWater 24,200,40,36` (wyvern) both
landed on near-white/wrong-texture seams (relief: rounded-corner gap between 2 wall blocks → flat cream block;
water: the orange wood-plank strip, not water at all). Replaced with visually verified crops:
`tileRelief [64,0,48,32]` (solid stone/plank wall) and `tileWater [0,0,48,48]` (a round pool with brown/white
rim). Both confirmed via scratchpad crop previews before applying.

**4. Wyvern waterfall gaps (Med).** Root cause: `drawSprite` anchors `(x,y)` at the sprite's BOTTOM edge, but the
3 segments used 3 independent % fractions (0.36/0.46/0.56) that don't match the true rendered height
(`16×scale`, scale = `layout.k`, which varies with canvas height) — so gaps/overlaps changed per viewport.
Added a `'stackDown'` keyword for `arena.anim` tuples: `bossAmbientBack` (boss-game-arena-ambient.js) now
computes each stacked tile's y as `previous bottom + this tile's fh×scale`, always contiguous regardless of `k`
or canvas size. Data: `top` keeps an explicit `y=0.4`, `middle`/`bottom` use `'stackDown'`. Verified in
`arena-m/d-20-wyvern.png` (after): solid unbroken waterfall column, no gap, no floating segment.

**5. GoblinKing clutter (Med).** Root cause found by tracing `far[]`'s actual tiling math at typical viewport
widths (390/560px, k=4): with the old order `house,tower,house2,nature` the 2nd house's left edge landed almost
exactly at the boss's fixed `x=0.7w` position (from `layoutBoss`), and the windmill (`fw=fh=64`, scaled by
`layout.k` up to ×6) was drawn oversized right on top of house 1. Reordered `far[]` to `house,nature,tower,house2`
(pushes house 2 out past the boss for both viewports), moved the windmill to a small background corner
(`x=0.08,y=0.3`) with an explicit fixed `scale=2` (not `layout.k`-scaled, so it stays modest on high-DPR
desktop), and moved both flags next to house 1 (`x=0.14`/`0.34`), away from the boss. Verified in
`arena-m/d-06-goblinKing.png` (after): windmill small in the sky corner, flags by the house, boss clear.

**6. Ambient particle size/sync (Med).** `mul` (1.4–1.6) × native sprite size (8–12px) × `k` (2–6) produced up to
~40px particles (~0.8×mage height). Recomputed `mul` per sprite so displayed size ≈ 0.35×mage height
(`0.3–0.4× target` from spec): leaf/leafPink/ember → 0.45, snow/rain → 0.65 (band kinds fog/clouds/raylight are
large sky overlays, not "particles" — left untouched, not part of the complaint). Added per-particle `phase`
(random 0–8s offset applied to the anim clock at draw time) so particles no longer share one global pulse.
Also moved ambient `'front'` draw earlier in `drawBossScene` (before rune circle / spell VFX / floating
damage-text) — traced the actual bug: `fx.texts` (skill-name/damage numbers) are drawn inside `drawBossFx`,
which ran BEFORE ambient front in the old order, so ambient particles painted on top of them. Now ambient draws
right after the mage sprite, so text/VFX stay on top. Did not touch HUD panels (already drawn after, unaffected;
QA report already confirmed HUD text stayed clear).

**9. Monster attack FX too small (Low).** Cap raised from `0.8×m.s` to `1.0×m.s` (updated test assertion too);
goblinKing `scale` 0.8→1.0, lich `scale` 0.6→0.85. Verified in `hit-goblinKing-on-mage.png` /
`hit-lich-on-mage.png` (after): claw slash and spirit splash both clearly visible near the mage, not covering
her fully.

**10. Dragonlair/catacombs weak variety (Low).** `darkKnight` (base dragonlair, no far override before) now gets
a small ruined-tower silhouette (`tileTowers` crop reused from lich, already verified). `oblivion` gets a
cracked-stone-wall silhouette (`tileRelief` crop reused from troll, already verified) plus a darker sky gradient
(`#1a0503`/`#2a0806`/`#0d0301`, vs. base `#2a0a06`/`#3c1208`/`#170603`) to read as "the deepest/hottest" of the
3. `youngDragon` unchanged (already had its own desert-wall far-row). `ghost` (previously inherited catacombs'
far-row unchanged, identical to skeleton) now gets a distinct glowing-orb-pedestal prop (`tileDungeon`
`[64,32,16,16]`, verified opaque, visually distinct from skeleton's chest-icon crop) and a darker sky
(`#0f0d1c`/`#060509` vs base `#171528`/`#0b0a14`). Verified all 3 dragonlair + ghost/skeleton screenshots
(after): distinguishable far-row landmarks and sky tone in every arena.

**12. Missing 0-size guard (Low).** `drawBossRegion` now returns immediately if `w<=0 || h<=0` (before doing any
work), and the `fx.bg` `drawImage` call also checks `fx.bg.width > 0 && fx.bg.height > 0` defensively.

## Not changed (verified as non-issues / out of scope)
- Cliffs/troll pale-blue ground: intentional ice-floor variant (see item 1).
- Issue #7 (canvas shift on prompt wrap) and #8 (smoke particles): explicitly out of scope per task.
- `js/boss-game-sprite-actors.js` (200 lines) and `js/boss-game-render.js`: not grown beyond necessity —
  render.js gained ~7 net lines for the guard + comment, no logic extracted since both stayed well under
  problematic size (174→~181 lines).

## Verification
- `node tests/run-tests.js`: **737 passed, 0 failed** (same count as baseline; only 1 assertion value updated to
  match the new 1.0× cap).
- Re-ran QA harness (server on :3000, Playwright via scratchpad) for all 12 arenas × mobile/desktop + goblinKing/
  lich hit screenshots, saved to `…/scratchpad/qa/after/` (`arena-m-*.png`, `arena-d-*.png`,
  `hit-goblinKing-on-mage*.png`, `hit-lich-on-mage*.png`). No new console/page errors (only the pre-existing,
  expected `503` on `/api/words`/`/api/audio-index` with no DB configured — identical to baseline QA run).
  Read every arena screenshot before/after; before images are the tester's originals in
  `…/scratchpad/qa/arena-*.png` (unchanged by this session).
- Server stopped after verification (killed the `node server.js` process, PID captured via `netstat`).

## Before/after screenshot paths
Before (tester's originals, unmodified): `C:\Users\ADMINI~1\AppData\Local\Temp\claude\d--project-eng\b4ae99ad-6c1d-46e8-bab8-b2e8744c1c21\scratchpad\qa\arena-{m,d}-*.png`, `hit-goblinKing-on-mage*.png`, `hit-lich-on-mage*.png`
After (this session): same directory, `after\` subfolder — `arena-{m,d}-*.png` (24 files), `hit-goblinKing-on-mage*.png`, `hit-lich-on-mage*.png` (4 files)

## Unresolved questions
- None blocking. The wyvern water-pool crop reads as a small framed "portrait" icon rather than a pool literally
  under the waterfall (art asset limitation — `water.png` has no plain flowing-stream tile, only pool/fountain
  icons) — visually it no longer looks broken (no more orange stripes), but if a closer "stream feeding into the
  waterfall" look is wanted later, it would need a different source asset.
