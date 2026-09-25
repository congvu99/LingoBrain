# Browser visual QA: Mage Lexoria skill visuals + arenas (real screenshots)

Date: 2026-09-25 · Plan: `plans/260925-1445-mage-lexoria-skill-visuals-arena-variety/`
Setup: `node server.js` (:3000, no DATABASE_URL, so the words come from the words.json fallback). Headless Chromium 153 via `playwright-core@1.63` installed in the scratchpad. Service worker blocked, fresh context per run. Progress is seeded in memory only (all words set to learned, element picked, level 5). Fights are started with `startBossBattle` at story beats 0/1/6/7/8/13/14/15/20/21/22/27. Casts are fired by calling `typeKey` with the right answer. To catch frames, a `requestAnimationFrame` interceptor freezes the canvas at a chosen moment. No repo files were edited. The server was stopped afterwards.

Screenshots dir (78 PNG): `C:\Users\ADMINI~1\AppData\Local\Temp\claude\d--project-eng\b4ae99ad-6c1d-46e8-bab8-b2e8744c1c21\scratchpad\qa\` (below: `QA\`)
Scripts: `QA\qa-lib.js`, `run-arenas.js`, `run-casts.js`, `run-flight-probe.js`, `run-layout-probe.js`, `run-hub-path-probe.js`. Raw data: `arenas.json`, `casts.json`, `flight.json`.

## Console / network
- Page JS errors during real battles: **0**.
- One harness-only error: `InvalidStateError drawImage canvas width/height 0` at `boss-game-render.js:52` (`drawBossRegion`), ~26k times. It only happened when a battle ran inside a hidden tab (my first attempt, before `showTab('game')`). Low severity: `drawBossRegion` does not guard against a 0-size `fx.bg`. Unlikely in normal play.
- HTTP 503: `/api/words`, `/api/audio-index`, `/api/tts?text=…`. These fail only because there is no DB or TTS in this environment. Not a bug.
- **No 404s.** Every `img/boss/**` sprite and tile loaded.

## Screenshots: arenas (mobile 390×844 `arena-m-*`, desktop 1440×900 `arena-d-*`, all 12 at both sizes)
Mage height `m.s` = 48px at both sizes. On desktop the game column is capped at ~560px wide, and the layout matches mobile.
| file | observation |
|---|---|
| arena-m/d-00-goblin | Sunset meadow with house and trees. **Flat peach 48px squares scattered on the grass** (bad `tileField` detail crop). Flowers from `tileAnimFlower` are hard to see. |
| arena-m/d-01-wolf | Forest edge, trees only, small leaves. Clean. |
| arena-m/d-06-goblinKing | House, windmill and flags, with raylight streaks. The **windmill (`tileAnimMill` at y 0.4) overlaps the house and the boss.** Red and blue flags float in mid-grass at y 0.56, one on the boss's shadow. Looks cluttered. |
| arena-m/d-07-skeleton | Dark ruins with smoke/fog bands in the sky. OK. The `tileDungeon` piece is barely visible. |
| arena-m/d-08-ghost | Dense ground fog in blocky pixel puffs. OK, but it looks almost the same as skeleton (same ruins). |
| arena-m/d-13-lich | Ruins, `tileTowers` red brick piece, fog. OK. The big boss is partly covered by fog. |
| arena-m/d-14-troll | **Broken floor: about 12 cells show a small orange crate plus a navy (transparent) hole**, and they turn red during the hurt flash (`hit-troll-on-mage.png`). There is also a **flat peach rectangle with a brick base in the far row** (`tileRelief` crop). |
| arena-m/d-15-harpy | Snowy peak with clouds and snow. Clean. |
| arena-m/d-20-wyvern | **The `tileWater` far piece shows as an orange striped panel** instead of water. **The 3 waterfall segments are not contiguous:** the bottom segment sits alone on the floor, cut off below the boss's shadow. |
| arena-m/d-21-darkKnight | Lava floor in one flat orange with no texture. The embers look like tiny sparks in this frame, but see the ember issue below. |
| arena-m/d-22-youngDragon | Same as darkKnight plus a `tileDesert` brick wall. Barely different from 21. |
| arena-m/d-27-oblivion | Same base as 21 with dense embers. |

Arena variety: ashford (3) and cliffs (3) look clearly distinct. catacombs skeleton/ghost/lich differ mostly by fog density. dragonlair 21/22/27 look almost identical (same rocks and flat lava; only 22 adds a wall).

## Screenshots: special skills (390×844). The skill id comes from the pending impact.
| file | observation |
|---|---|
| skill-fire-goblin-cast1/2-flight | fire-fast `shurikenMagic` at the mage, about 50px (≈1.05× mage). The "Tia lửa" label is readable. |
| skill-fire-goblin-cast1/2-impact | `sparkMagic` ring and damage number. **Dark translucent smoke squares around the slime.** |
| flight-late-fire-darkKnight-f92 | fire-fast shuriken mid-flight reaching the monster, ≈55px (1.15×), with a yellow pixel trail. Good. |
| flight-late-fire-darkKnight-f70 | fire-long (ground): only the rune ring at the mage, nothing yet at the monster. |
| skill-ice-darkKnight-cast1-flight | ice-fast: default glowing orb with a white streak (proj null). OK. |
| skill-ice-darkKnight-cast2-flight/impact | ice-long (ground) `magicCircle` + `icePillar` at the monster. **A translucent white rectangle covers the monster frame** (smoke/freeze tint). |
| skill-storm-skeleton-cast1-flight | storm-long (sky): bolt drops from the sky above the monster. OK. |
| skill-storm-skeleton-cast2-flight / flight-late-storm-troll-* | storm-fast: 2× `kunai`, small (~20px), at the mage and leaving. OK. |
| skill-storm-*-impact | `cut` slash with a white flash on the monster. OK. |
| skill-earth-harpy-cast1-flight | earth-long (ground): only green/white bits at the mage. |
| skill-earth-harpy-cast2-impact | `rockSpike` hit. **Large grey translucent squares (smoke particles) around the owl.** |
| flight-late-earth-goblin-f92 | earth-fast rock fist, ≈60px (1.25×), with a thick dark smoke trail. OK size. |
| skill-wind-wolf-cast1/2-flight | wind-long `bigShuriken` spin with a white streak. Readable. |
| skill-wind-wolf-*-impact | `slashCircular` / `slash01`. OK. |
| flight-late-wind-oblivion-f70 | wind-fast orb and dotted trail. **The float text "Phong…" is covered by the ember ambient.** |
| flight-late-ice-ghost-f70/f92 | ice-long `icePillar` at the ghost, partly hidden by fog. |

No projectile was larger than about 1.25× mage height, so none exceeds the 1.5× limit.

## Screenshots: ultimates (mid-cutscene, dimmed, with portrait cut-in)
- ult-fire-goblin-early/mid: "Mưa Sao Băng HOÀN HẢO". Dark smoke squares at the monster. The fire overlay is barely visible under the dimming.
- ult-ice-darkKnight-early/mid: "Kỷ Băng Hà" with fog/cloud overlay on the ground and a thin white rain line. OK.
- ult-storm-skeleton-*: "Xích Sét". The overlay is hardly distinguishable.
- ult-earth-harpy-*: "Hồi Sinh" with a shield icon on the HUD and pink particles. Grey smoke squares.
- ult-wind-wolf-*: "Lốc Xoáy" with a tornado at the monster. OK.
- The portrait cut-in sits at the bottom left, over the mage (expected). The overlay alpha stays ≤0.5 and the HUD text stays readable.

## Screenshots: monster hit on mage
- hit-goblinKing-on-mage(-late): the boss lunges, the mage flashes, a heart is lost. **The `clawDouble`/`rockImpact` VFX is tiny** (a ~15px orange ball in the late frame).
- hit-troll-on-mage(-late): `rockSpike` at the mage's feet is visible. The red hurt flash exposes the transparent floor holes as **red squares**.
- hit-youngDragon-on-mage(-late): fireball glint at the mage, small.
- hit-lich-on-mage(-late): the spirit VFX is barely visible and gone by the late frame.
- Other: `hub-before-start.png` (hub), `hub-path-first-battle.png` (battle started through the real Start button). `zoom-*.png` are 3× crops of troll, skeleton, ghost and wyvern.

## Issues (severity)
1. **High: troll floor holes.** Detail `['tileFloorDetail', 181, 5, 8, 8]` in `js/boss-game-arena-layouts.js` (troll) is an 8×8 source drawn at 8·k px into a 16·k grid cell. 3/4 of each cell is left transparent (shows navy, or red during the hurt flash). The crop is also an orange crate, not gravel. Fix: use a 16×16 crop, or draw grass under details.
2. **High/Med: goblin grass squares.** `['tileField', 6, 11, 16, 16]` renders a flat peach square. Wrong crop.
3. **Med: wrong far-row crops.** `tileRelief 24,90,48,30` (troll) is a flat peach block. `tileWater 24,200,40,36` (wyvern) is an orange striped panel.
4. **Med: wyvern waterfall segments** (`tileAnimWaterfallTop/Middle/Bottom` at y 0.36/0.46/0.56) have gaps and misalign with each other. The bottom piece floats on the floor.
5. **Med: goblinKing clutter.** `tileAnimMill` at (0.5, 0.4) overlaps the house and boss. The flags (0.16/0.86, 0.56) stand in open grass.
6. **Med: ambient particle size.** `particleFire` (ember) and `windLeaf` (leaf) animate up to ~40px (≈0.8× mage) at `mul` 1.6/1.4 × k3. All particles share `ui.time`, so they pulse together. Oblivion (density 0.9) covers the boss, skill-name float text and damage numbers. They also sit behind the semi-transparent HUD panels. They do not cover the DOM typing prompt.
7. **Med: canvas layout shift.** When the prompt's Vietnamese meaning wraps to 2 lines, `#bossPrompt` grows 73 → 97px. The canvas moves down 24px and is not refit: the canvas stays 699px tall inside a 664px field. The scene jumps between words and the bottom is clipped. Seen in `skill-ice-darkKnight-cast2-flight.png` and `ult-fire-goblin-*.png` (the prompt reached ~121px during the ultimate).
8. **Low/Med: smoke particles look like artifacts.** `smoke` particles in `js/boss-game-spell-presets.js` (size 22–40, dark or light colours) render as large translucent squares around the monster on every impact. `game-particles.js` is not in the modified list, so this predates the plan, but it now stacks with the new sprite VFX.
9. **Low: monster attack VFX too small to read.** The cap of 0.8×m.s in `js/boss-game-monster-attack-fx.js` makes claw/spirit hits nearly invisible for goblinKing and lich.
10. **Low: weak variety.** The dragonlair trio (21/22/27) and catacombs skeleton/ghost look nearly identical.
11. **Low: fog edges.** Fog bands are blocky, with some hard edges near the horizon (skeleton). Acceptable pixel style.
12. **Low: missing guard.** `drawBossRegion` has no guard for a 0-size bg canvas (harness-only repro).

Not a bug: in my direct-start path the first battle's canvas was 322px wide in a 358px field. Started through the real Start button it is 358px wide (`hub-path-first-battle.png`), so that was a harness artifact.

**Status:** DONE_WITH_CONCERNS
**Summary:** 78 real screenshots: 12 arenas × 2 viewports, 5 elements with flight and impact, 5 ultimates, 4 monster hits. No JS errors or 404s in real play. There are visible arena defects: troll floor holes, goblin peach squares, wrong troll/wyvern far-row crops, a broken wyvern waterfall. Ambient particles are oversized and the canvas shifts when the prompt wraps.

## Unresolved questions
- Is the flat lava floor in dragonlair intended, or should it have a texture?
- Is the smoke-square particle style intended (it predates the plan), or should it be restyled now that there are sprite VFX?
- Was the 0.8× cap on monster attack VFX meant to make claws this small?
