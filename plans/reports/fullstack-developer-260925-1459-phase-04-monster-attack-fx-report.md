# Phase 4: Monster attack VFX — report

Plan: `plans/260925-1445-mage-lexoria-skill-visuals-arena-variety/phase-04-monster-attack-vfx.md`

## Files modified
- `js/boss-game-monster-attack-fx.js` (new, 43 lines) — `BOSS_MONSTER_ATTACK_FX` data (12 quái, id thật từ `js/boss-game-story.js` BOSS_MONSTERS) + `bossMonsterAttackFxEvent(fx, e, monsterId)`.
- `js/boss-game-result-ui.js` — 1 line added in `bossUiEvents`: `bossMonsterAttackFxEvent(ui.fx, e, ui.monster && ui.monster.id)` right after `bossSkillFxEvent`.
- `tests/boss-game-monster-attack-fx.test.js` (new, 61 lines) — 7 tests.
- `index.html` — `<script src="js/boss-game-monster-attack-fx.js">` after `boss-game-skill-fx.js`.
- `tests/run-tests.js` — added to `PURE_MODULES` after `boss-game-skill-motion.js`.
- `tests/run-tests.html` — added script tag (after skill-motion) + test tag (after arena.test.js).
- `sw.js` — added `'./js/boss-game-monster-attack-fx.js'` to ASSETS after skill-fx.js line. No `CACHE` version bump (per task instruction).

## Data / design decisions
- 12 entries keyed by real story ids (`goblin, wolf, goblinKing, skeleton, ghost, lich, troll, harpy, wyvern, darkKnight, youngDragon, oblivion`), each `{ impact: [sprite...], at: 'mage'|'mageFeet', scale }`. All sprite keys verified to exist in `BOSS_SPRITES` (via test + manual grep of `boss-game-sprite-atlas.js`/`boss-game-skill-sprites.js`/`boss-game-extra-sprites.js`).
- Fires on `'hurt'` (exact moment of heart loss, `js/boss-game-logic.js:187`) and `'shieldBlock'` (task explicitly said "and shieldBlock if simple" — kept simple: same spawn logic, no separate data).
- Spawns additively alongside existing lunge in `bossActorEvent` — did not touch `js/boss-game-sprite-actors.js` (file was already 203 lines per plan note; kept the call in `bossUiEvents`/result-ui.js as instructed, mirroring `bossSkillFxEvent` pattern).
- Scale safety: risk note says "scale theo m.s ≤0.8". Rather than trust the per-monster `scale` field alone (some sprites have large intrinsic `vfx` factor, e.g. `fog`=3 for lich), the function computes `raw = bossVfxScale(name, m.s, d.scale)` and a hard `cap = bossVfxScale(name, m.s*0.8, 1)`, using `Math.min(raw, cap)` — guarantees the 0.8×m.s ceiling regardless of data authoring mistakes. Covered by a dedicated test (`lich`/`fog`).
- `at: 'mageFeet'` (troll/rockSpike) spawns at `m.y` instead of `m.y - m.s*0.5` — verified by test.
- TenguBlue (wyvern) / GiantRacoon (goblinKing) keep their existing Attack sheet animation untouched (`bossMonSpriteVariant` in sprite-actors.js unchanged) — this module only adds sprite VFX, no actor-state changes.

## Tests
`node tests/run-tests.js` → 682 passed, 0 failed (was 661 baseline before other concurrent phases + this one; all 7 new tests pass, confirmed via grep of test names in output).

## File ownership / conflicts
Only touched files in the assigned ownership list. Re-read `index.html`, `tests/run-tests.js`, `tests/run-tests.html`, `sw.js` immediately before editing (per instructions) — found concurrent additions already present from other phases (extra-sprites, skill-motion, etc.), inserted single additive lines cleanly, no overwrite/conflict observed. Did not touch `js/boss-game-sprite-actors.js` or any other file outside ownership.

## Line counts
`js/boss-game-monster-attack-fx.js` 43, `tests/boss-game-monster-attack-fx.test.js` 61, `js/boss-game-result-ui.js` 165 (was 164, +1 line) — all well under 200.

## Unresolved questions
None.

Status: DONE
Summary: Created monster attack VFX data+spawn module (12/12 story monster ids), wired into bossUiEvents on hurt/shieldBlock, registered in index.html/tests/sw.js (no CACHE bump), 7 new tests pass, full suite 682/682.
