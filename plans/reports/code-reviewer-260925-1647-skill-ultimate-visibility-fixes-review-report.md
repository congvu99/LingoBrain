# Code Review — skill/ultimate visibility fixes (uncommitted + 7aaad84)

Date 2026-09-25. Read-only. Tests `node tests/run-tests.js`: 740 passed, 0 failed. `node --check` clean on all js/boss-game-*.js.

## Scope
- Uncommitted: js/boss-game-spell-art.js, boss-game-spell-math.js, boss-game-spell-presets.js, boss-game-sprite-actors.js, boss-game-tier3-ultimate-fx.js
- Already committed in 7aaad84 (items 1 partial, 2, 6-visuals): boss-game-skill-motion.js (bossImpactSpawns), boss-game-skill-visuals.js (pillar), spell-art `vis` shot flag / spark filter / flash x0.35
- Line counts: sprite-actors 198, spell-art 193, tier3 155, skill-motion 132, skill-visuals 104 (all logic files <=200; presets 230 is data, was already >200)

## Overall
Rate/delay/life math is correct; no sprite leaks; all sprite keys exist; ultimateMs change is logic-safe. Main defect: the ultimate VFX schedule is not bounded by the cutscene length, so at k>=1.25 meteor/chain VFX run past `ultimateEnd` into normal play.

## Verified correct (no action)
- `bossSpawnSprite` rate math (sprite-actors.js:28, :114): t0 = -delay*rate, t += dt*rate → t reaches 0 at real `delay` exactly; life/spriteAnimDone compared in anim time; auto life (frames/fps) is anim time too → real lifetime = cycle/rate. `o.rate || 1` guards 0/undefined. Only push site is sprite-actors.js:27, so no sprite lacks `rate` (no NaN t).
- Meteor fireball (tier3:39): no rate → rate 1, `life: dur` real, vel applied with dtReal only when t>0 → lands at ex/ey at real T0+i*0.35+0.45. Explosion (tier3:40) `delay+dur` with rate 0.55 → t hits 0 at the same real instant. Synced.
- iceAge (tier3:59): life (ultS-T0-0.2)*rate with rate → real end = 2.6s. Reduced: rate 1, same 2.6s. Halo (tier3:50): no rate, life 2.0 → real end 2.6s. Consistent.
- Tornado swirl: slashCircular loop:false → spriteAnimDone path, ends ≤2.86s. Main smokeCircular `cycle` life ultS (rate 1).
- Keys: fireball, explosion, icePillar, thunder, boost, smokeCircular(+cycle), slashCircular (skill-sprites.js:21), circleWhite (extra-sprites.js:29), flam, particleFire, circleSpark all present. New globals BOSS_ULT_INTRO_S / BOSS_ULT_ANIM_RATE / bossUltVfxScale unique (no duplicate-const load error).
- ultimateMs 1500→2800: users are combo-chain.js:138 (end, ultCooldownUntil = end + 6000, lock), logic.js lock/ultEnd path, tier3 fx, overlay alpha (u.max). stepBattle returns while locked (logic.js:170) → threat/burn frozen during cutscene; iceAge/tornado frozenUntil are `end + …` so post-cutscene freeze duration unchanged; resumeBattle shifts lockUntil/ultCooldownUntil. No time-based scoring exists (no elapsed/startedAt). Tests derive from BOSS_TUNING.ultimateMs; only stale comments hardcode 1.5s (tests/boss-game-sprite-actors.test.js:14,26-28) — harmless.
- Basic impact (spell-art.js:80): only `kind:'smoke'` filtered; basic trails still keep smoke (spell-art.js:127 guard is vis-only). Matches stated intent.
- Perf: max ~13 sprites per ultimate, 3 per pillar; negligible.

## High
None.

## Medium

### M1. Meteor/Chain VFX overrun cutscene at k ≥ 1.25 — tier3-ultimate-fx.js:34/40 and :45
Schedule grows linearly with `hits` (bossUltBoostCount, up to 6 with k = 1.5 + 0.25 + 0.25, boosted ceil) but ultS is fixed 2.8s. Slowed durations: explosion 9/18/0.55 = 0.91s, thunder 10/18/0.55 = 1.01s.

| hits (k) | meteor last explosion real window | chain last thunder window |
|---|---|---|
| 3 (k=1) | 1.75–2.66 ok | 1.40–2.41 ok |
| 4 (k=1.25 boosted) | 2.10–3.01 | 1.80–2.81 |
| 5 (k=1.5 PERFECT, common) | 2.45–3.36 | 2.20–3.21 |
| 6 (k≥1.75 boosted) | 2.80–3.71 (entirely after end) | 2.60–3.61 |

Scenario: player types the full chain (HOÀN HẢO, k=1.5) with Mưa Sao Băng → at 2.8s `ultimateEnd` clears fx.ultimate, dim/name vanish, next prompt appears, but a ~1.8×-monster explosion is still drawn over the monster for ~0.6s (k=1.5) or the whole last explosion (~0.9s) plays during normal typing (k≥1.75). Ground overlay (circleSpark2) for chain already stopped at 2.8s, so the last thunder hits with no cutscene. Pure visual (meteor/chain damage is via st.boost on later casts, no desync), but it contradicts the "rải đều qua cắt cảnh" intent and the perfect case is the main path.
Fix: compress spacing to the available window, e.g.
```js
const span = ultS - T0 - 0.2 - (animLen / rate);       // animLen = frames/fps of bigSprite / thunder (+dur for meteor)
const gap = hits > 1 ? Math.min(0.35, span / (hits - 1)) : 0;   // delay = T0 + i * gap
```
(same for chain with 0.4). Add a test asserting every spawned sprite's real end ≤ ultS for hits = 1..6.

### M2. No tests for new rate semantics
tests/boss-game-sprite-actors.test.js covers life only. Add: (a) rate 0.5 + delay 0.2 → sprite invisible until real 0.2s, removed at real delay + cycle/rate; (b) explicit life with rate is anim-time. Cheap and locks in the tier3 timing contract M1 depends on.

## Low

### L1. Pillar top off-screen on boss fights — skill-motion.js:112-116 (committed 7aaad84)
q.s can be up to 0.38h (render.js:31,34). fire-long: flam scale ≥ pixelScale(1.43·q.s, 30) → piece ≈ 0.54h; top piece centre at q.y − h_s·2.1 ≈ 0.52h − 1.14h → ~0.6h above canvas top. On bosses 1–2 of the 3 pillar pieces are clipped (still reads as a column; small monsters fine). Consider clamping h_s so q.y − h_s·(0.5+(n−1)·0.8) ≥ ~0.1h.

### L2. Shrunk ultimate name overlaps top HUD on short canvases — tier3-ultimate-fx.js:138
ty = h·0.16; for h=340 baseline 54px, 22px glyph ascent reaches ~38px, over HUD band 6..46 (BOSS_TOP_HUD_BOTTOM, combo-chain.js:161). Cutscene draws after HUD (render.js:175-177) and dim is only 0.12 then, so name sits on hearts/HP. Use `Math.max(BOSS_TOP_HUD_BOTTOM + fz + 4, h * (0.42 - 0.26 * out))`.

### L3. Revive 3rd boost ends 2.84s (> ultS 2.8) — tier3:49
0.04s tail after end; negligible, fold into M1 fix if spacing is derived from window.

### L4. sw.js CACHE still 'lingobrain-v2.24.4'
Cache-first SW; neither 7aaad84 nor working tree bumps it. Per sw.js:1 bump at deploy, else users keep old JS.

## Edge cases scouted
- Reduced motion: rate forced 1, meteor no fall (explosion only, ends ≤2.85s at hits=6), chain thunder ends ≤3.16s at hits=6 (same M1 overrun, smaller), overlay off, iceAge fog off. OK aside from M1.
- Pause during cutscene: lock shifted by resumeBattle; fx stepping depends on UI pause (pre-existing, unchanged by this diff).
- Unknown sprite key would throw in spriteAnimDone(undefined) at sprite-actors.js:117 — pre-existing; all current keys verified.

## Recommended actions
1. M1: bound meteor/chain (and revive) spacing to ultS; add timeline test.
2. M2: rate tests.
3. L2 clamp name y; L1 optional pillar clamp; bump sw.js CACHE on deploy.

## Metrics
- Tests: 740/740 pass; syntax check clean; no lint config run (none for vanilla JS).
- New behavior test coverage: rate/timeline 0%.

## Unresolved questions
- Is post-cutscene VFX tail (M1) acceptable by design, or should ultimateMs scale with hits instead of compressing spacing? (Scaling ultimateMs would change lock/cooldown timing — needs product call.)

Status: DONE_WITH_CONCERNS
Summary: Rate/delay/life math, sprite keys, ultimateMs logic side effects and basic-smoke filtering verified correct; one medium bug — meteor/chain VFX scheduled past the 2.8s cutscene when hits ≥4 (incl. the common HOÀN HẢO k=1.5 case), plus missing tests for rate and minor layout overlaps.
