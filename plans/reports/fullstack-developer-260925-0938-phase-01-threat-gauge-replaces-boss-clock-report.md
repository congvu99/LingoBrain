# Phase 1: Threat gauge replaces boss clock — implementation report

Date: 2026-09-25
Plan: `plans/260925-0913-mage-lexoria-combat-depth-skills-evolution/phase-01-threat-gauge-replaces-boss-clock.md`

## Status
DONE

## Files changed
- `js/boss-game-threat-gauge.js` (new, 29 lines) — pure module: `bossThreatRate`, `bossThreatFill`, `bossThreatAdd`, `bossThreatDrainOnCast`, `bossThreatAttack`.
- `tests/boss-game-threat-gauge.test.js` (new) — unit tests for the 5 pure functions + integration tests via `createBattle`/`stepBattle` (idle fill to attack, drain on cast, typo/miss adds, threshold-crossing attack next step, shield block, lock/pause/freeze not increasing, tornado reset).
- `js/boss-game-logic.js` (200 lines, was 199) — `createBattle`: `st.clock/clockMax` → `st.threat: 0, st.threatSec`. `typeKey`: typo → `bossThreatAdd(threatTypo)`, fizzle → extra `bossThreatAdd(threatMiss)`. `castComplete`: `bossThreatDrainOnCast(st, speed)` at cast time (not impact). `giveUp`: `bossThreatAdd(threatMiss)`. `useUltimate` tornado: `st.threat = 0`. `stepBattle`: clock decrement/attack block replaced with `bossThreatFill` + `bossThreatAttack`, same shield/hurt/lost event semantics. Compacted a few lines to stay ≤200 (dense-statement style already used in file).
- `js/boss-game-spell-math.js` — `BOSS_TUNING` += `threatDrain: 0.35, threatTypo: 0.1, threatMiss: 0.25`; `clock` map kept (comment updated: seconds to fill the bar, hub still shows "10s").
- `js/boss-game-render.js` — `drawBossClockBar` → `drawBossThreatBar(ctx, st, fx, now)`, now takes width/position from `fx.layout.mon` (drawn just below monster feet, inside the same shake/zoom transform). >0.75 red blink, >0.9 shake (off when `fx.reduced`), frozen → ice-blue fill, no shake. Removed old clock-bar draw call + shrank the top-right HUD panel height (44→34, only name+HP bar left there).
- `js/boss-game-sprite-actors.js` — `angry = !st.frozen && st.threat > 0.88` (was `st.clock/st.clockMax < 0.12`).
- `tests/boss-game-logic.test.js` — rewrote the 5 clock-based assertions (freeze window, ice-age ultimate, tornado ultimate, max-step clamp) to threat semantics; same behavior coverage, no test removed/weakened.
- `tests/run-tests.js`, `tests/run-tests.html`, `index.html`, `sw.js` — registered `boss-game-threat-gauge.js` (before `boss-game-logic.js`) in `PURE_MODULES` / script order / `ASSETS`; `run-tests.html` also loads `boss-game-threat-gauge.test.js`.
- `js/app-storage.js` `APP_VERSION` and `sw.js` `CACHE` bumped `2.18.0` → `2.19.0` (match verified by `pwa-assets.test.js`).
- `README.md` — Pháp Sư Lexoria section: replaced "đồng hồ chạy" description with the threat-gauge behavior (fills over time, drains on correct cast faster with speed, grows on miss, full → attack/shield/heart).

## Grep sweep for other `st.clock`/`clockMax` readers
Only `boss-game-logic.js`, `boss-game-render.js`, `boss-game-sprite-actors.js`, `tests/boss-game-logic.test.js` read `st.clock`/`st.clockMax` — all fixed. Other `clock`-named hits are out of scope by design: `monster.clockMul` (`boss-game-story.js`, per-monster data, plan says leave unread), `mods.clockAdd` (`boss-game-elements.js`, still consumed — now folded into `st.threatSec` at battle creation), `BOSS_TUNING.clock[difficulty]` (`boss-game-hub-ui.js`, hub label "10s" — name kept intentionally), `o'clock` string in `tools/spoken-core-batch.js` comment (unrelated).

## Tests
- `node tests/run-tests.js`: **462 passed, 0 failed** (baseline was 446; +16 net from new/rewritten threat tests and unit coverage of the 5 pure functions).
- `pwa-assets.test.js` green (asset existence, script/CSS ↔ ASSETS parity, `cache: 'reload'`, CACHE == APP_VERSION).
- `wc -l js/boss-game-*.js`: all ≤200 except pre-existing `boss-game-spell-presets.js` (225, untouched, explicitly out of scope per instructions).

## Deviations from phase file (all within stated intent)
- `bossThreatAttack(st)` returns `'lost' | ''` exactly as specified in Architecture, but does **not** emit `bossAttack`/`shieldBlock`/`hurt`/`lost` events itself (the module loads before `boss-game-logic.js`, so `bossEmit` isn't in scope yet — consistent with "module thuần, không đọc st.events" convention used by `boss-game-spell-math.js`). `stepBattle` emits those events around the call, same event sequence/payloads as the old code.
- Threat-bar HUD panel height reduced from 44→34px (cosmetic, since the clock bar row it used to hold moved out); not explicitly specified but implied by "không còn đồng hồ cũ" in the HUD corner.

## Manual play-feel check (Success Criteria bullet 2)
Not run interactively (headless environment) — covered instead by the equivalent quantitative test: idle at Vừa (`threatSec=10`) reaches `threat≈1` at ~10s and triggers `bossAttack`/`hurt`/`lost` (see `threat gauge — tích hợp trận › đứng yên...`). Recommend a quick manual pass before the phase-2 approval gate per plan.md.

## Open questions
None blocking. Balance numbers (`threatDrain/threatTypo/threatMiss`) are placeholders per plan — plan.md already flags balance review as a later gate (post phase 2/3), not this phase.
