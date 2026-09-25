# Code review: Mage Lexoria skill visuals + arena variety (plan 260925-1445)

## Scope
- New: js/boss-game-skill-motion.js (115), skill-visuals.js (99, data), extra-sprites.js (67, data), monster-attack-fx.js, arena-layouts.js (83, data), arena-ambient.js (94), ultimate-overlay-fx.js (71)
- Modified: spell-art.js (182), sprite-actors.js (200), skill-fx.js, skill-roster.js, skill-pick.js (141), logic.js (200), spell-presets.js, tier3-ultimate-fx.js (135), arena.js (131), render.js (170), result-ui.js, index.html, sw.js, tools/copy-boss-sprites.js, tests
- Verification: `node tests/run-tests.js` → 733 pass. vm sim (scratchpad) loading atlas + skill/extra sprites + sprite-actors + motion + visuals + monster-attack-fx, driving real `bossActorEvent`/`bossMonsterAttackFxEvent`/`stepBossActors`.

## Overall
Battle logic untouched except display-only `evolved` flag (added to pendingImpacts → impact event, cast event). Timing invariant held: all 6 motions give `bossShotPos(s,1)=(x1,y1)` (tested), arc reproduces old formula exactly. Removed symbols (`impactSprite`, `solid` data field, `bossSkillFxImpactEvent`, `BOSS_ARENA_SPRITES`, `fx.bgRegion`) have zero remaining refs; `buildBossArena` has one caller (render.js:48) + test, both updated. Load order OK in index.html and run-tests.html/js. Versions match (APP_VERSION 2.24.4 = sw CACHE v2.24.4); all 43 new images precached. One real blocker: new looping VFX sprites never expire.

## Critical

### C1. Looping sprites spawned as one-shot VFX never get removed. They pile up on screen for the rest of the battle
- Where: js/boss-game-sprite-actors.js:119 (`stepBossActors` keeps a sprite until `spriteAnimDone`, and that returns true only when `loop === false`, see sprite-atlas.js:96-99). No caller passes `life`: sprite-actors.js:65 (skill impact), monster-attack-fx.js:39.
- Keys that loop (no `loop:false`), found by script over all new data:
  - `circleSpark2` (storm-combo6 and storm-counter impact, plus every storm evo `addImpact`)
  - `particleFire` (fire-combo6 impact, plus every fire evo)
  - `particleSnow`, `particleRockGray`, `particleLeafPink` (every ice/earth/wind evo)
  - `magicCircle` (fire-combo6 impact)
  - `fog` (lich attack, frames:1)
  - `fireball` (youngDragon attack)
- Proof (vm sim): 5× impact `storm-combo6` evolved + 5× lich `hurt`, then 60 s of `stepBossActors` → **15 sprites still alive** (`circleSpark2`, `fog`).
- Scenario: a player with an evolved form gets one permanent looping particle at the monster on every special-skill hit. Storm players get 1–2 per cast even without evolving. Fighting the lich leaves stacking fog on the mage after each hit, and youngDragon leaves a permanent fireball sprite. Over a long battle this means unbounded growth of `fx.sprites`, a `drawImage` per sprite per frame (fps drop on mobile), and visual clutter that covers the mage/monster.
- Tests miss it: they only check that keys exist, not their lifetime.
- Fix, in order of preference:
  1. In `bossSpawnSprite`, when `life == null` and the anim does not have `loop === false`, set `life = frames / fps` (one cycle). That covers every current and future caller.
  2. Or add `loop:false` to these defs in extra-sprites.js. Do not do this for `magicCircle` or `fireball`: they are used elsewhere as looping projectiles/ground circles. Instead, pass `{ life }` from sprite-actors.js:65 and monster-attack-fx.js:39.
  3. Add an integrity test: every key in `BOSS_SKILL_VISUALS[*].impact`, `BOSS_EVO_SKILL_VISUALS[*].addImpact` and `BOSS_MONSTER_ATTACK_FX[*].impact` must either end on its own or be given a `life`. Or a behavior test: spawn, step 10 s, expect `fx.sprites.length === 0`.

## High

### H1. `drawBossRegion` rebuilds the arena and ambient every frame while tiles are not ready
- Where: js/boss-game-render.js:45-51. The old code returned early (`!BOSS_ARENA_SPRITES.every(bossSpriteReady)`). Now `buildBossArena` returns null, `fx.bg` stays null, and the next frame triggers the rebuild branch again.
- Scenario: first load, or a tile image that fails to load (404, or a partly populated cache after an SW update). `createBossAmbient` runs every frame (about 40 new particle objects per frame). Ambient never moves, because it is reset to its seed positions each frame. If the image never loads, this lasts the whole battle.
- Fix: rebuild the ambient only when the cache key changes (separate `fx.ambKey`). Or skip the rebuild while `!bossArenaTileNames(arena).every(bossSpriteReady)` and draw the flat fill, as the old code did.

### H2. The evolved-skill visual difference is close to invisible
- Acceptance says "Chiêu đã tiến hoá nhìn khác chiêu gốc".
- Where: skill-visuals.js:73-101. Every evo entry is `{extends, scale 1.15–1.35, addImpact:[particle*]}`.
  - `bossSpawnSprite` rounds the scale to an integer (sprite-actors.js:27), so ×1.15 usually gives the same integer as the base.
  - `particle*` keys have `vfx` 0.12–0.15. For a normal monster (q.s = 64) that is `pixelScale(64*0.15*1.15, 12) = 1`, i.e. one 8×12 px particle.
- Result: the only difference is a single tiny particle. Right now it only stands out because of C1, which keeps it on screen forever.
- Fix: give evo `addImpact` a large-enough layer (circleWhite/slash*/raylight), or spawn several particles, or set a minimum scale for the evo layer. Confirm in visual QA.

## Medium

### M1. `BOSS_SKILL_VISUALS[*].cast` is dead data
- skill-visuals.js:13-14 documents `cast` as "hiện lúc niệm cạnh pháp sư" and fire-long/ice-long set `cast:['magicCircle']`, but no code reads `vis.cast` (grep: 0 consumers).
- Effect: 'ground' skills get no casting cue beyond castBurst particles, and the per-element "≤2 uses" test counts `cast` keys that are never drawn.
- Fix: spawn `vis.cast` at `bossMageCastPoint` in the `bossActorEvent` cast branch, or delete the field and the test clause.

### M2. Ambient front particles are not sized to worldK and use non-integer pixel scale
- Where: arena-ambient.js:17-24 (`scale: 1.4/1.6/1.1`) and 98 (`drawSprite(..., p.scale)`).
- `drawSprite` expects an integer scale (atlas.js:144). At 1.4 the nearest-neighbor pixels come out uneven, which shimmers.
- On desktop (k = 4–6), leaves/snow come out about 11 px next to 64–96 px tiles, so they look like specks. Plan rule: "Cỡ đạn/VFX theo worldK".
- Fix: store `mul` in the kind config and set `p.scale = Math.max(1, Math.round(layout.k * mul))` in `createBossAmbient` (layout is already passed in).
- Related: `tileAnimMill` has a hard-coded scale of 2 (arena-layouts.js:32), so it is undersized when k > 2. Drop the 4th tuple element so it uses `layout.k`.

### M3. Ground-motion shot can flash a fallback orb for one frame
- Where: spell-art.js:152. A ground shot is hidden only while `s.t < s.dur`. `stepBossFx` runs after `bossUiEvents`, so the shot often reaches `t >= dur` one frame before the impact event removes it.
- With `proj:null` there is no sprite, so the generic orb and glow are drawn at the target for about 16 ms, just before the ground VFX.
- Fix: `if (s.motion === 'ground') continue;`, with no time condition.

### M4. Reduced-motion does not match the plan wording
- Plan: sky/fan "bay dài → nổ tại chỗ".
- Implemented: sky/fan become 'straight' (skill-motion.js:23-26), a full ease-in flight from mage to monster. It is still a moving projectile, just without the curve.
- Acceptable if the product owner agrees. Otherwise map them to 'ground' (explode at target), which already satisfies k=1.

## Low
- L1. The arena-layouts.js:4 comment says load order does not matter, but lines 18 and 53 read `BOSS_ARENAS.ashford/cliffs.details` at load time, so it must load after arena.js. Current order is correct; fix the comment.
- L2. render.js:44 calls `bossArenaFor`, which allocates an `Object.assign` merge every frame. It is cheap, but the result could be cached next to `fx.bgKey`.
- L3. sprite-actors.js:60 still computes `bossSpellPreset` on impact when `vis` exists (unused). Trivial.
- L4. The cache key is `monster.id` only. Fine today because ids are unique across regions. Include `region.id` if a monster is ever reused in another region.
- L5. logic.js, sprite-actors.js and ui.js are exactly 200 lines. They meet the rule but have zero headroom.

## Edge cases checked
- Timing: `impactAt` is unchanged (logic.js:103). The impact handler still removes shots by cast id (spell-art.js:67). Delayed extra shots (`t: -h*0.08`, now up to 3 for `shots:3`) arrive up to 160 ms after impact and get removed by it. This is pre-existing behavior, and `shots` only changes what is drawn.
- `evolved`: `bossSkillEvolved` compares by object identity, which is valid because `bossSkillsFor` keeps base references for slots that are not overridden and the ui.js:54 table comes from `BOSS_SKILLS[el]`. `skillId` and `effect` are unchanged, and the formId contract is untouched.
- Basic skill (no `e.skill`): `vis = null` → arc + preset projectile/impact, as before.
- Monster attack FX fires on 'hurt'/'shieldBlock' at the same moment the heart is removed (logic.js:187), with no new event. The id comes from `ui.monster.id` (a copy of the story monster, so the id is preserved).
- Overlay: disabled when `fx.reduced`. Alpha ≤ 0.5. Drawn inside the shake block, below the HUD. Rain uses `q.k`, which exists (render.js:34). No state is kept, and allocations are about 7 small objects per frame.
- Ambient: capped at 40 particles, front layer empty under reduced-motion, every other particle skipped when quality < 1, dt clamped. Allocations: one `{center:true}` literal per particle per frame (negligible).
- Out-of-scope interaction: `bossApplySkillEffect` gained a `now` parameter, and its only caller passes it. A caller without `now` would bypass the ult cooldown (`now < x` is false for undefined). No such caller exists today.

## Plan acceptance status
| Criterion | Status |
|---|---|
| No duplicate (proj, motion, impact[0]) within an element, tested | Met |
| All sprite keys exist; every monster has an arena, ambient and attack FX, tested | Met (existence only; lifetime not tested → C1) |
| Evolved skills look different from the base | Weak (H2), and the difference depends on C1 |
| 5 ultimates have a new layer | Met (overlay/rain/ground, tested) |
| Tests pass | Met (733). Browser visual QA (mobile portrait + desktop) not evidenced in reports |
| APP_VERSION = CACHE bumped; all new images/JS precached | Met (2.24.4; 43/43 images, 7/7 JS) |
| Logic files ≤ 200 lines | Met (3 files at exactly 200) |

## Recommended actions
1. Fix C1 (lifetime for looping one-shot sprites) and add a test that nothing lingers after stepping.
2. Fix H1 (no per-frame rebuild of arena/ambient while tiles are loading).
3. Make evolved visuals clearly visible (H2) and confirm in visual QA.
4. Wire or delete `vis.cast` (M1). Size ambient by worldK with integer scale (M2). Always hide ground shots (M3).

## Unresolved questions
- Is reduced-motion "straight" for sky/fan accepted, or should it explode in place (M4)?
- Was phase-6 browser visual QA done? No screenshots or QA report found among the phase reports.

Status: DONE_WITH_CONCERNS
Summary: Battle logic, timing invariant, contracts, load order and precache/version are intact. One critical render bug: 8 looping VFX keys spawned without `life` never expire (proven in a vm sim: 15 sprites alive after 60 s), plus per-frame arena/ambient rebuild while tiles load, and evolved visuals that are barely distinct.
