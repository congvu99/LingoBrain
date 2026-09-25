# Phase 3: Combo and chain-cast ultimate — implementation report

Date: 2026-09-25 · Plan: `plans/260925-0913-mage-lexoria-combat-depth-skills-evolution/phase-03-combo-and-chain-cast-ultimate.md`

## Status: DONE

## Files created
- `js/boss-game-combo-chain.js` (105 lines) — combo, thanh tuyệt kỹ (st.ult), chuỗi niệm (st.chain), áp hiệu lực
  tuyệt kỹ theo hệ số k. Functions: `bossComboOnCast`, `bossComboBreak`, `bossComboMul`, `bossChainWords`,
  `bossStartChain`, `bossChainKey`, `bossStepChain`, `bossChainFactor`, `bossUltBoostCount`, `bossApplyUltimate`.
- `tests/boss-game-combo-chain.test.js` — 23 tests (hàm thuần + tích hợp qua createBattle/stepBattle).

## Files modified
- `js/boss-game-logic.js` (200 lines, was 200 — net flat: old inline ultimate-application code moved out,
  combo/chain wiring added). `st.rage`→`st.combo`+`st.ult`+`st.chain`; `typeKey`/`submitTyped`/`giveUp` route to
  chain when `st.chain`; `useUltimate` opens chain instead of applying instantly; `stepBattle` branches to
  `bossStepChain` (threat + DoT frozen during chain, same as before but no `lockUntil`); `resumeBattle` shifts
  `st.chain.until`; `bossComboBreak` wired at hurt (not shieldBlock)/giveup/fizzle.
- `js/boss-game-spell-math.js` — `BOSS_TUNING`: `rageMax`→`ultMax:10`, + `comboStep:0.05, comboCap:1.5, chainMs:9000`.
  `spellDamage` multiplies by `o.combo||1`.
- `js/boss-game-render.js` (155 lines) — HUD: 10-cell ult bar (was 8 rage), "COMBO ×n" (hidden <2), new
  `drawBossChainHud` (9s bar + 3 progress dots + current chain word), called from `drawBossScene` when `st.chain`.
- `js/boss-game-ui.js` — ult button visibility `st.rage/rageMax` → `st.ult/ultMax`.
- `js/boss-game-result-ui.js` — `chainHit` speaks the completed word; `ultimate` sets casting overlay class.
- `js/boss-game-tier3-ultimate-fx.js` — meteor/chain VFX hit-count now `bossUltBoostCount(e.k)` instead of fixed
  preset `hits`; cutscene shows "HOÀN HẢO" when `e.k >= 1.5` (`fx.ultimate.perfect`).
- `index.html`, `sw.js`, `tests/run-tests.js`, `tests/run-tests.html` — registered `boss-game-combo-chain.js`
  (script tag / ASSETS / PURE_MODULES) right before `boss-game-logic.js`, and the new test file.
- `js/app-storage.js` `APP_VERSION` and `sw.js` `CACHE` bumped to `2.21.0` (match verified by `pwa-assets.test.js`).
- `tests/boss-game-logic.test.js`, `tests/boss-game-threat-gauge.test.js` — every `st.rage`/`BOSS_TUNING.rageMax`
  reader updated to `st.ult`/`BOSS_TUNING.ultMax`; per-element instant-ultimate tests rewritten to drive the new
  chain (`ultOld` helper: pool of 3 prompts → chain always has exactly 2 words → typing both ends the chain with
  `hits=2` → `k=1`, which the module maps to numerically identical old effects).

## Design decisions (resolving ambiguity not spelled out in the phase file)
- Chain word display: implemented entirely on canvas (`drawBossChainHud`), not the DOM prompt card — the DOM
  prompt (#bossPrompt) is untouched during chain; after the chain + cutscene end, `bossEndLock` resumes the SAME
  underlying `st.group` that was active before `useUltimate` (lockNext stays false, matches pre-phase-3 behavior
  where the interrupted prompt continued). Result: no CSS changes needed (`css/paper-theme.css` not touched).
- `bossChainWords` returns fewer than 3 words when the live prompt pool is small (`n - 1` distinct prompts
  available); `bossStepChain`/`bossChainHit` handle any length 1–3 without special-casing.
- Wrong key during chain: word typed-so-far resets to `''`, no event emitted (no `threat`/`fizzle`/typo count) —
  chosen over emitting a dedicated "chainTypo" event since the phase file only names `chainHit`/`chainEnd`.
- `bossUltBoostCount(k) = max(1, round(BOSS_BOOST_SPELLS * k))` shared by both the actual boost effect
  (`st.boost.left`) and the meteor/chain VFX spawn count, so the visual explosion count always matches the number
  of spells that will actually be enhanced.

## Regression / correctness proof (k=1 ≡ old instant ultimate)
`tests/boss-game-logic.test.js` "nguyên tố + Nộ" describe block and `tests/boss-game-combo-chain.test.js`
"chuỗi niệm" describe block both drive `useUltimate` through the chain to `hits=2` (`k=1`) and assert byte-identical
outputs to the pre-phase-3 formulas: meteor/chain `boost.left = BOSS_BOOST_SPELLS(3)`, iceAge
`frozenUntil = cutsceneEnd + BOSS_ICE_AGE_MS`, revive fills to `heartsMax` (no extra shield), tornado zeroes
`threat` (no extra shield). Shield-related assertions account for the earth-branch bậc-2 passive shield (already
present before the ultimate fires) — the tuyệt kỹ itself adds a shield only at `k >= 1.5`.

## Step 5 — time-to-kill simulation (scratch script, Node, not committed)
Assumed near-max typing speed (60ms/keystroke, no typos, fire tree lvl-3/meteor ultimate used whenever ready),
15-word rotating pool, `stepBattle` driven until each `next`/`chainEnd` event before typing the next word:

| Monster HP | With combo | Without combo (combo forcibly kept 0) | Ratio |
|---|---|---|---|
| 1000 | 22.9s | 32.2s | 71% |
| 2000 | 43.0s | 63.2s | 68% |

Both ratios are **above the 60% flag threshold** — combo shortens fights but not enough to require raising monster
`hp` (per plan.md open question #2). No `hp` change made (would be a user decision — see Unresolved Questions).
Note: this is an idealized "never miss, always at max ult" simulation; real play (typos, missed threat drains,
occasional hits) will land between the two columns, so real time savings are smaller than shown.

## Tests
- `node tests/run-tests.js`: **492 passed, 0 failed** (was 469 before this phase; +23 new combo-chain tests, a few
  added assertions in existing describe blocks).
- All touched `js/boss-game-*.js` files ≤ 200 lines (`boss-game-logic.js` exactly 200; pre-existing
  `boss-game-spell-presets.js` untouched at 225, per plan.md exception).
- `pwa-assets` test (APP_VERSION/CACHE match, every asset on disk, every `<script src>` cached) passes.

## Unresolved questions
1. Real (non-idealized) time-to-kill with combo vs without — needs an actual play-test on a phone keyboard to
   judge whether monster `hp` should rise (plan.md question #2); the scratch simulation here suggests "not yet"
   but assumes perfect play.
2. 9s chain window on iPhone keyboard (plan.md question #3) — still open per plan.md, no user play-test gate was
   requested before this phase (per binding instruction), so shipped as specified (`chainMs: 9000` in
   `BOSS_TUNING`).
