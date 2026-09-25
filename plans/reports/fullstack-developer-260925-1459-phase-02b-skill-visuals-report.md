# Phase Implementation Report — Phase 2 part B (30 skill visuals, wiring, cleanup)

### Executed Phase
- Plan: `plans/260925-1445-mage-lexoria-skill-visuals-arena-variety/phase-02-skill-motion-module-and-35-skill-visuals.md`
- Scope: steps 3–4 (data + wiring + cleanup). Steps 1–2 done by prior agent (motion module).
- Status: completed

### Files Modified
- `js/boss-game-skill-visuals.js` (new, 58 lines, data): `BOSS_SKILL_VISUALS[skillId]` for all 30 special skills.
- `js/boss-game-skill-motion.js` (95→103 lines): added `bossSkillVisualFor(skillId, evolved)` lookup (evolved arg accepted, ignored — phase 3 extends).
- `js/boss-game-spell-art.js` (179→182 lines): cast handler reads `bossSkillVisualFor(e.skill)` → sets `motion`, `sprite` (proj), and shot count (`vis.shots || hits`) on each pushed `fx.shots` entry. Basic (no `e.skill`) unchanged (`motion:'arc'`, no sprite override here).
- `js/boss-game-sprite-actors.js` (191→200 lines): `bossActorEvent` cast branch only applies preset `proj` sprite fallback when `!vis` (basic); impact branch uses `vis.impact[]` (× `vis.scale`) instead of preset `sprite.impact` when visuals exist.
- `js/boss-game-skill-fx.js` (37→30 lines): removed `bossSkillFxImpactEvent` (dead — `impactSprite` field no longer exists) and its call; `bossSkillFxEvent` now only handles `cast` (float text + castBurst). Updated header comments.
- `js/boss-game-skill-roster.js` (116→115 lines): removed `impactSprite: {...}` from all 30 `BOSS_SKILL_FX` entries (sed on `, impactSprite: {...} }`); rewrote comment block (was describing impactSprite/solid, now points to `boss-game-skill-visuals.js`).
- `tests/boss-game-skill-visuals.test.js` (new): id coverage (30, no basic), sprite/motion existence, no-solid, no-dup-triple/element, ≤2-uses/sprite/element, `bossSkillVisualFor` behavior.
- `index.html`, `tests/run-tests.js`, `tests/run-tests.html`: added `boss-game-skill-visuals.js` script/module entry right after `boss-game-skill-motion.js` (re-read each file immediately before editing — no conflicts with concurrent agents' lines).
- `sw.js`: added `'./js/boss-game-skill-visuals.js'` to `ASSETS` (same position, additive one-liner, required by existing precache-integrity test). No `CACHE` bump (per instructions).

### Design decisions
- `cast: []` for most skills — castBurst particles (`BOSS_SKILL_FX`) already give a cast tell; `cast` sprite array reserved for `ground`-motion skills that need a visible casting marker (`fire-long`/`ice-long` use `['magicCircle']`).
- `shots` (optional) overrides the *decorative* projectile count independent of real damage `hits` (verified `e.hits` only drives visual shot count in `bossFxEvent`, damage is computed entirely in `boss-game-logic.js` before the event fires) — used for `ice-combo3`, `earth-combo3`, `wind-combo6` (fan bursts with no `extraHits` mechanic). Skills with real `extraHits` (fire-combo3, storm-combo6, storm-counter…) get correct multi-shot for free via `hits`.
- `proj: null` is a deliberate "no directional sprite, fall back to default colored ball" choice for several `ground`/`sky`/`straight` skills (matches table's abstract "ground →" entries that had no distinct projectile) — this required guarding the preset-proj fallback in `bossActorEvent` to only fire when `!vis` (not merely `!s.sprite`), otherwise it would silently override the intentional `null`.
- `kunai` (storm-fast) frame count verified: PNG IHDR read directly (`W=650,H=59`; `650/65=10` exact, `59/59=1`) — confirms the phase-1 report's 10-frame estimate, no correction needed.

### Rule compliance (per element, all 6 skills)
| Hệ | combo3 | long | fast | combo6 | execute | counter |
|---|---|---|---|---|---|---|
| Lửa | fan fireball→flam | ground→(magicCircle cast)flam+explosion | straight shurikenMagic→sparkMagic | ground→magicCircle+particleFire | sky fireball→explosion+smoke | spin shurikenMagic→slashDoubleCurved |
| Băng | fan×3 iceSpikeProj→iceFlakeB | ground→(magicCircle cast)icePillar | straight (no proj)→cutX | ground→shieldSprite+iceFlake | sky iceSpikeProj→waterPillar+iceFlakeB | straight (no proj)→water |
| Sét | straight energyBallProj→sparkMagic | sky (no proj)→thunder+circleSpark | straight kunai→cut | fan energyBallProj→circleSpark2 | sky (no proj)→bigEnergyBall+thunder | straight bigEnergyBall→circleSpark2 |
| Đất | fan×3 rockProj→rockB | ground (no proj)→rockSpike | straight rockProj→claw | ground (no proj)→plant+plantB | sky (no proj)→rockImpact+rockSpike | straight (no proj)→shieldYellow |
| Gió | spin spiritProj→windLeaf | spin bigShuriken→slashCircular | straight (no proj)→slash01 | fan×3 spiritBlue→slashMulti | straight (no proj)→slashArc+slash03 | spin spiritProj→spiritDouble+smokeCircular |

All verified by test: no `(proj,motion,impact[0])` duplicate within an element, every sprite key ≤2 total uses (counting proj+cast+impact) within its element, zero `solid`/hex-color impact entries.

### Tests Status
- `node tests/run-tests.js` → **696 passed, 0 failed** (was 661 before this phase; +14 new skill-visuals tests + 21 other pre-existing async/server tests already present, unrelated).
- Line counts: `boss-game-skill-visuals.js` 58 (data, exempt), `boss-game-skill-motion.js` 103, `boss-game-spell-art.js` 182, `boss-game-sprite-actors.js` 200 (exactly at cap), `boss-game-skill-fx.js` 30, `boss-game-skill-roster.js` 115 (data, exempt) — all ≤200.

### Issues Encountered
None blocking. `sw.js`/`index.html`/`tests/run-tests.*` were outside strict "own" list per orchestration note but explicitly permitted (additive-only, re-read-before-edit) — no conflicts found with the two other concurrent agents (phase 4/5 presumably touching arena/monster-attack files, untouched by me).

### Next Steps (for phase 3)
- Add `BOSS_EVO_SKILL_VISUALS[skillId]` in the same `js/boss-game-skill-visuals.js` file (space reserved, comment placeholder present) + pass a real `evolved` flag through `bossSkillVisualFor(skillId, evolved)` (currently accepted but ignored, always returns base) — the cast/impact event objects will need an `e.evolved` field added upstream (not present anywhere in codebase yet, confirmed via grep) plumbed from `boss-game-evolution.js`/`skill-pick.js`.
- No unresolved questions.

Status: DONE
Summary: 30-skill visuals data + motion/proj/impact wiring + impactSprite/solid cleanup done; `node tests/run-tests.js` 696/696 pass; all touched logic files ≤200 lines.
