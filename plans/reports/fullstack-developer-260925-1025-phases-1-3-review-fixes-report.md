# Phase Implementation Report — Fix phases 1-3 code-review findings

## Executed
- Scope: `plans/reports/code-reviewer-260925-1018-phases-1-3-combat-depth-review-report.md` (H1, H2, M1-M5, low-item "threat bar after win").
- Status: completed.
- `node tests/run-tests.js`: 527 passed, 0 failed (was 492 baseline; +35 new tests incl. `pwa-assets`/version-match).

## Files Modified
- `js/boss-game-combo-chain.js` (105→141 lines): chain damage, chain tier, timeScale reset, chainKey/chainTypo events, HUD layout helper.
- `js/boss-game-logic.js` (200 lines, same count): M1 frozen-attack guard (1 line edited).
- `js/boss-game-result-ui.js` (124→152): H1 fix, chain DOM prompt (M3), chainHit FX hook wiring.
- `js/boss-game-tier3-ultimate-fx.js` (109→142): `bossFxChainHitEvent` (reuses tier impact FX for chain hits, H2).
- `js/boss-game-render.js` (156→157): chain HUD repositioned via shared layout fn (M4), threat bar hidden after win/lost (low item).
- `js/app-storage.js`, `sw.js`: version bump 2.21.0 → 2.21.1.
- `README.md`, `docs/system-architecture.md`: combo/ult-bar/chain-cast description replacing stale "đồng hồ/Nộ" prose (M5); added `boss-game-threat-gauge.js` / `boss-game-combo-chain.js` rows to docs module table.
- `tests/boss-game-combo-chain.test.js`: tightened M5 phantom test (exact `combo===1` + proves "dog" cast happened); added H2 damage test, H2 death-mid-chain test, M2 timeScale-reset test, M4 HUD-layout-no-overlap test (3 widths).
- `tests/boss-game-logic.test.js`: added M1 frozen-no-attack test.

Not modified (no changes needed): `js/boss-game-spell-math.js`, `js/boss-game-ui.js`, `css/paper-theme.css`, `index.html`, `tests/run-tests.js`, `tests/run-tests.html`, `js/boss-game-sprite-actors.js` — pre-existing uncommitted diffs from phases 1-3, untouched by this pass.

## Fixes and design choices

**H1** — `bossUiEvents` (result-ui.js) now clears `is-casting` AND re-renders the pre-chain prompt on `ultimateEnd` (previously only `next` cleared it, and `ultimateEnd` never fired a UI branch). Verified `bossLockFor` has exactly one caller with `next=false` (`bossApplyUltimate`), always paired with `ultEnd=true` → `ultimateEnd` always fires eventually → no other path leaves the prompt dimmed.

**H2** — Each chain word typed in full = 1 immediate damage hit via `spellDamage({tier: c.tier, speed:1, weakHit, mods, combo: bossComboMul(st)})`. Choices made (per your "state your choice" note):
- `tier` = highest tier among the 3 chain words, fixed once at chain start (`bossChainMaxTier`), not recomputed per hit.
- `speed` forced to 1 (spec: "không tính tốc độ").
- `weakHit` (element/monster.weak) and `mods.dmgMul` (elemental passives) DO apply — reuses the same formula as normal casts for consistency, no new damage rule.
- `combo` multiplier DOES apply (per your go-ahead) via `bossComboMul(st)`.
- No `crit` (fastCrit is a normal-cast-only mechanic tied to typing speed, chain hits have no speed).
- Damage applied immediately (no `pendingImpacts` delay) since chain has no travel-time visual; FX reused instantly at hit time.
- Death mid-chain: sets `st.wonAt = now + endDelayMs` (identical to the normal win path), clears `st.chain = null`, returns before checking `chainEnd`/ultimate — so `bossApplyUltimate` is never called. `stepBattle` already checks `wonAt` before `st.chain` (confirmed unchanged), so the win resolves normally next tick.
- FX reuse: new `bossFxChainHitEvent(fx, e, st)` in `tier3-ultimate-fx.js` duplicates the existing tier-`impact` FX branch (burst + ring + shake/flash + damage-number text) by calling the same global helpers (`bossSpellPreset`, `bossBurst`, `bossFxText`) already used by `boss-game-spell-art.js` — no edit to that file (out of ownership scope), just a sibling function invoked from `result-ui.js`'s `chainHit` branch.
- k=1 old-effect tests (revive/iceAge/tornado/meteor boost count) only assert hearts/shield/frozenUntil/boost — none read `hp`, so no expected-HP updates were needed; verified green.

**M1** — `stepBattle` attack gate changed from `if (st.threat >= 1)` to `if (!st.frozen && st.threat >= 1)` (fill gate already had `!st.frozen`). Chose "attack fires on unfreeze" (matches old clock semantics per review's option 1) over "skip threat adds while frozen" — simpler, one-line, no new state.

**M2** — `bossStartChain` sets `st.timeScale = 1` unconditionally when the chain opens, so a mid-word slow-mo can't persist through the 9s chain.

**M3** — Chain now drives the same DOM elements as a normal prompt (`#bossPrompt`/`#bossTier`/`#bossPromptText`/`#bossLetters`) via new `renderBossChainPrompt(ui)`, driven by new `chainStart`/`chainKey`/`chainTypo` events (chain typo also triggers the existing `bossPromptShake()`). On `ultimateEnd` the normal prompt (`st.group`, unchanged since chain start) is re-rendered to restore the pre-chain view — no new DOM structure, only data source swapped during chain.

**M4** — Extracted pure `bossChainHudLayout(w)` in `combo-chain.js` (loaded, Node-testable) returning `{x, y, bw}`; `y = BOSS_TOP_HUD_BOTTOM(46) + 28` — clears the fixed-height top HUD box (`pad-4 .. pad-4+40` = `6..46`) plus room for the title text drawn above the bar (`y-6`, 13px font). Verified via new pure test at w=360/600/900 that the title's estimated top edge stays below y=46 and the bar/dots block are also below the top HUD (title is the closest element to it). `render.js`'s `drawBossChainHud` now consumes this shared layout instead of inline pixel math.

**M5** — Tightened test to `assert.equal(st.combo, 1)` (was `>= 1`, which would pass even if the buggy typo-then-correct-cast path double-counted combo) + asserts the second word ("dog") actually produced a `cast` event, so the assertion isn't vacuous.

**Docs** — README game section rewritten to describe threat gauge (freeze-aware), combo, 10-slot ult bar, chain-cast; `docs/system-architecture.md` module table row for `boss-game-logic.js` updated (dropped "đồng hồ…Nộ"), added missing rows for `boss-game-threat-gauge.js` + `boss-game-combo-chain.js`.

**Low item fixed** — `drawBossThreatBar` call now gated `if (st.phase === 'play')` so it's hidden on the won/lost frame (render.js).

## Deliberately left as-is (per your instructions)
- L1 small-pool chain (<4 groups → repeats/short chain) — not touched.
- L2 giveup-attack timing (delay through revealMs lock) — not touched, already covered by existing test.
- Manual device play-test gate (phase-3 plan gate, iPhone 9s feel) — still pending, out of scope for a code fix pass.

## Tests Status
- Type check: N/A (vanilla JS, no typecheck configured).
- `node tests/run-tests.js`: 527 passed / 0 failed (incl. `sw.js ASSETS` / `CACHE version matches APP_VERSION`).
- New tests added: 3 (M5 tightened, in place) + H2 damage + H2 death-mid-chain + M2 timeScale + M4×3 widths + M1 frozen-no-attack = 8 new `it()` blocks (some replace/tighten existing ones).
- H1 has no automated coverage (result-ui.js/render.js are DOM-only, not in `PURE_MODULES`, per existing test-infra split) — verified by code-path reading: `bossLockFor(..., false)` has exactly one caller (`bossApplyUltimate`), always followed by `ultEnd=true` → `ultimateEnd` always eventually fires → the new branch always runs. No path exists that ends a `next=false` lock without setting `ultEnd`.

## Issues Encountered
None — no file-ownership conflicts, no unexpected line-count overflows (`boss-game-logic.js` stayed at exactly 200 by editing in place rather than adding lines; `boss-game-combo-chain.js` grew 105→141, still well under 200).

## Unresolved Questions
None blocking. Open items carried forward from the original review (L1/L2/L7 device gate) are explicitly out of scope per your instructions.

Status: DONE
Summary: All H1/H2/M1-M5 fixes implemented with TDD-style tests (8 new/tightened `it()` blocks), version bumped 2.21.0→2.21.1, docs updated; full suite 527/0 green (was 492).
Concerns/Blockers: none.

## Follow-up — re-review N1/N2

### Executed
- Re-review: `plans/reports/code-reviewer-260925-1018-phases-1-3-combat-depth-review-report.md`, "New findings from the fix pass" section.
- Status: completed. Version kept at 2.21.1 (not shipped, per your note).
- `node tests/run-tests.js`: 531 passed, 0 failed (was 527). The `tts-routes › miss … headers` test the coordinator flagged as another session's in-progress work is currently green in this run — left untouched regardless (no `server/`/speech files touched).

### N1 — chain-hit FX duplicated impact code, skipped actor reactions + kill dissolve
- `js/boss-game-combo-chain.js` `bossChainHit`: now emits `bossEmit(st, 'impact', { dmg: real, tier: c.tier, hp: st.hp })` right after `chainHit` (same shape as the normal impact event in `boss-game-logic.js:bossApplyImpacts`). `chainHit` no longer carries `dmg`/`tier` — kept only `{ hits, word, prompt }` for chain-progress UI.
- Deleted `bossFxChainHitEvent` from `js/boss-game-tier3-ultimate-fx.js` (and its export) and the manual call in `js/boss-game-result-ui.js`'s `chainHit` branch — `bossFxEvent(ui.fx, e, st)` (already called unconditionally for every event at the top of `bossUiEvents`) now handles the emitted `impact` event exactly like a normal impact: `boss-game-spell-art.js`'s `impact` branch falls back to `bossSpellPreset(st.mods.element, e.tier)` when `fx.shots` is empty (true during chain — confirmed by reading `bossFxEvent`'s impact branch: `const {p,scale} = shot || bossSpellPreset(...)`), and `bossActorEvent` (called unconditionally at the end of `bossFxEvent`, `boss-game-spell-art.js:96`) now runs on chain hits too, giving monster hit-flash/recoil/Hit-sheet anim + per-element impact sprite, and — since it checks `e.type==='impact' && e.hp<=0` — immediate `bossMonsterDissolve` on a killing chain hit, matching normal-kill behavior.
- Verified no other logic consumer double-counts the extra `impact` events (grepped all `'impact'` emitters/consumers — only `sprite-actors.js` and `spell-art.js` read the event; `st.dealt`/`st.hp` are updated once, directly in `bossChainHit`, not via the event).
- Tests updated in `tests/boss-game-combo-chain.test.js`: the H2 damage test now asserts event ORDER (`chainHit` index < `impact` index), reads `dmg`/`tier`/`hp` off the `impact` event, and asserts `chainHit` no longer carries `dmg`. The death-mid-chain test now also asserts `impact.hp <= 0` (documents that this is what triggers immediate dissolve via `sprite-actors.js`, since that code path isn't Node-testable — `spell-art.js`/`sprite-actors.js` FX dispatch itself is DOM/canvas-only and outside `PURE_MODULES`'s node-runnable surface, same limitation as H1 previously).

### N2 — last chain word / kill froze the DOM card one letter short
- Root cause confirmed by reading `renderBossChainPrompt`: it reads `st.chain.words[st.chain.i]`, but by the time `bossUiEvents` processes the `chainHit` event, `c.i` has already advanced (or `st.chain` is already `null` on the last hit/kill) — so the function returned early and the DOM kept showing the pre-hit partial-typed state (e.g. `be_`).
- Fix: `chainHit` handler in `js/boss-game-result-ui.js` now calls a new `renderBossChainCompletedWord(ui, e)` instead of `renderBossChainPrompt(ui)`, using `e.word`/`e.prompt` straight off the event (added `prompt: g.prompt` to the `chainHit` payload in combo-chain.js) — renders the full completed word with no blanks, independent of whether a next word exists or the chain just ended. Applies uniformly to every chain hit (not just the last), which is harmless (immediately followed by a `chainKey`/`chainTypo` re-render once the player starts the next word, or by the cutscene/win screen).

### Left open (per your instruction)
- N3 (chain letter progress always keyed off `answers[0]`, mismatches for multi-answer groups/synonyms).
- N4 (referenced in the review as omitted/long line — not addressed).
- N5 (chain HUD sits over the monster head at narrow widths; canvas title duplicates the new DOM card text from M3).

### Files touched (follow-up, same ownership as before)
- `js/boss-game-combo-chain.js`, `js/boss-game-tier3-ultimate-fx.js`, `js/boss-game-result-ui.js`, `tests/boss-game-combo-chain.test.js`.
- No version bump (kept 2.21.1). No `server/`/speech files touched.

Status: DONE
Summary: N1 fixed (chainHit now emits a real `impact` event, reusing normal FX/actor-reaction/kill-dissolve path, dead code removed); N2 fixed (chain card renders the completed word directly off the event instead of re-reading a possibly-empty chain). 531/0 tests green. N3-N5 left open as instructed.
Concerns/Blockers: none. N3/N4/N5 remain as documented follow-ups for a future pass.
