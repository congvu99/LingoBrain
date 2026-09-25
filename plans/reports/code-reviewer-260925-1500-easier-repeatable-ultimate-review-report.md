# Code Review — Easier + Repeatable Mage Lexoria Ultimate

Date: 2026-09-25 · Scope: uncommitted diff vs HEAD (15 files, +162/−99) · Review-only

## Verification
- `node tests/run-tests.js` → **635 passed, 0 failed** (matches claim).
- Line counts: boss-game-logic.js 200, boss-game-ui.js 200, others touched ≤158. Over-200 files (spell-presets 225, evolution-forms 321, sprite-actors 203) untouched by this diff.
- APP_VERSION `2.24.3` (js/app-storage.js:4) = sw.js CACHE `lingobrain-v2.24.3` (sw.js:3). OK.
- No new plan/phase IDs in comments/test names. (Pre-existing "trước phase 3" in tests/boss-game-logic.test.js:180 — already in HEAD, not introduced.)

## Decision checklist
| Decision | Status | Evidence |
|---|---|---|
| Ult for every element, no rank gate | OK | boss-game-elements.js:42 |
| ultMax 4 | OK | boss-game-spell-math.js:13 |
| giveUp no ult drain | OK | boss-game-logic.js:128 |
| chain 2 words / 12s / [0.5,1,1.5] | OK | spell-math.js:16-18, combo-chain.js:25,111 |
| rank3UltBonus active-only, stacks w/ evo, single path, boosted ceil | OK | elements.js:43, combo-chain.js:103,106 |
| k=1 reproduces old effects | OK (tests: logic.test.js ultOld + combo-chain equivalence) |
| No hardcoded 3/10/9000 in logic/HUD | OK | render.js:83,96,103,116,119; ui.js:144; skill-pick.js:61-63 |
| ultFull emission | OK | combo-chain.js:14 (cast), skill-pick.js:63 (ultAdd), both guard wasFull/mods.ultimate |
| HUD width @4 cells | OK | render.js:83 ultW = 4·13+6 = 58px, COMBO text offset derived |
| Chain flow: pause/death/giveup | OK, unchanged | resumeBattle shifts chain.until (logic.js:149); stepBattle returns before threat fill during chain (logic.js:170) so no death mid-chain; giveUp/submitTyped early-return on st.chain (logic.js:115,122) |
| Saved progress | OK | alloc schema unchanged; existing rank-3 players silently gain +0.25 on active school; non-active rank 3 gives nothing (intended) |

## Critical
None.

## High

**H1. Rank 3 of Wind gives no benefit at all unless the player also has a level-16 evo form. The UI says "+25% hiệu lực".**
boss-game-combo-chain.js:130-133 + boss-game-skill-tree-ui.js:16 + README.md:122.
Tornado always sets threat=0. Its only k-dependent part is the shield at `k >= 1.5`. With rank3 alone (+0.25):
hits=0 → 0.5→0.75, hits=1 → 1→1.25, hits=2 → 1.5→1.75. The threshold result never changes, so the bonus does nothing.
Earth/revive is nearly the same: at k≥1 revive already fills to heartsMax (`ceil(missing·k)` capped), and the shield threshold only changes when evo is present too. So rank 3 matters only at hits=0.
Failure scenario: a Wind player spends a point on ★ after reading "Tuyệt kỹ mạnh hơn (+25% hiệu lực)". Their battles are identical before and after.
The evo 0.25 had the same flaw before this change. That issue already existed, but rank 3 is a new paid purchase and the UI makes an explicit promise about it.
Fix options (product call): (a) make tornado/revive scale with k (e.g. tornado stops the boss clock for `X·k` ms / pushes threat negative; revive grants shield at k≥1.25 when boosted); (b) change the rank-3 text for wind/earth to describe what actually changes; (c) accept it and document.

**H2. "HOÀN HẢO" label and the k≥1.5 perks trigger without typing every word when rank3 and evo stack.**
boss-game-tier3-ultimate-fx.js:19 (`perfect = e.k >= 1.5`), combo-chain.js:103,129,132.
rank3 (0.25) + evo16 (0.25) = +0.5. hits=1 gives k = 1 + 0.5 = 1.5 exactly (exact in binary), so the cutscene shows "HOÀN HẢO" and revive/tornado add the perfect shield.
hits=0 gives k=1.0: the full old ultimate for typing nothing.
Before this change the maximum bonus was 0.25, so hits=2-of-3 gave k=1.25 and never reached the perfect label.
Failure scenario: a level-16 player with rank 3 opens the chain and types 1 of 2 words. The screen says "HOÀN HẢO", which contradicts README ("gõ đủ cả 2 từ = HOÀN HẢO").
Fix: decide perfect from hits, not from k. Emit `perfect: c.hits >= c.words.length && c.words.length > 0` (or `hits === chainWords`) in `chainEnd`/`ultimate`, and use that in the FX. Also decide whether the k≥1.5 perks should be allowed through bonus (user decision "thưởng phải luôn có tác dụng" suggests yes). Add a test for rank3 + evo + hits=1.

## Medium

**M1. Small word pool: chain has 0 or 1 word. Now hit every few casts because ultMax is 4.**
combo-chain.js:24-31, 58-59, 87; ui.js:25 only rejects `!groups.length`.
- 1 group: `words=[]`. The chain runs the full 12s with nothing to type (bossChainKey returns at `!g`), the HUD title is empty (render.js:125), and it ends at k=0.5 with the boss frozen.
- 2 groups: 1 word. "Perfect" (k=1.5) is unreachable because `Math.min(hits, chainWords)` counts against chainWords, not `words.length`.
This behavior already existed, but with a 4-cell bar it now happens every 2-4 casts instead of rarely, and the dead wait is 12s instead of 9s.
Fix: in bossStartChain, if `!words.length`, call bossEndChain immediately (or refuse useUltimate). Compute the factor against `c.words.length` (e.g. `hits >= c.words.length → last entry`). Add a test for groups.length 1 and 2.

**M2. Balance risk: ultAdd skills + ultMax 4 → near back-to-back ultimates, and the boss clock stops during each chain.**
skill-roster.js:68-73, evolution-forms.js:264-314 (wind ultAdd 1-2), combo-chain.js:13 (+2 on fast no-typo).
One fast combo-6 wind cast = +2 +2, which fills the whole bar from empty. Each chain pauses the threat fill for up to 12s real time (logic.js:170). Tornado then resets threat to 0.
Result: Wind can lock the boss out almost permanently. The sim in the implementation report used fire at moderate pace only.
Recommend: run the same scratchpad sim for wind evo at fast pace. Consider scaling ultAdd, or ignoring ultAdd for a short cooldown after an ultimate. Product decision.

**M3. The "+25%" in the rank-3 text is hardcoded while the value lives in BOSS_TUNING.rank3UltBonus.**
skill-tree-ui.js:12-16.
It will drift silently on retune. Also, "+25% hiệu lực" is inaccurate for meteor/chain: k 1→1.25 with ceil gives 3→4 spells (+33%). At hits=0 it gives 2→3 (+50%).
Fix: build the string from `Math.round(BOSS_TUNING.rank3UltBonus*100)` or reword to "+0,25 hệ số tuyệt kỹ".

## Low
- L1. skill-tree-ui.js:44: the column description shows the rank-3 text on every non-active column. The text is conditional ("nếu đang dùng…"), so it is acceptable. The report already flags it.
- L2. combo-chain.js:111: `chainFactor` length is not checked against `chainWords+1`. If someone retunes chainWords=3 without extending the array, the result is `undefined`, then k=NaN and a broken ultimate (`bossUltBoostCount` returns `Math.max(1, NaN)` = NaN, so boost.left is NaN and never decrements to ≤0 cleanly). A comment documents the invariant, but no test asserts it. Add `assert.equal(BOSS_TUNING.chainFactor.length, BOSS_TUNING.chainWords + 1)`.
- L3. The test title "tuyệt kỹ khi Nộ chưa đầy" (logic.test.js:181) still says "Nộ" (legacy term). Cosmetic.
- L4. Behavior change for existing saves: players who put 3 points in their active school now automatically get +0.25. There is no migration or notice. Probably intended; worth a changelog line.

## Edge cases checked (no issue)
- Death mid-chain impossible (threat not filled during chain); monster killed by chain hit → chain cleared, no ult applied (combo-chain.js:86).
- Pause during chain: keys ignored (combo-chain.js:55), `until` shifted on resume.
- giveUp/Enter during chain: no-op.
- ultFull cannot fire twice from skill-pick (wasFull guard). The combo cast path is guarded by `st.ult < ultMax`.
- Non-active rank 3 → ultBonus 0 (tested in spell-math + combo-chain tests).
- Double counting: evo bonus is read only from st.evoUltBonus and rank bonus only from st.mods.ultBonus. Summed once at combo-chain.js:103.

## Recommended actions
1. H2: derive `perfect` from hits and add a test for rank3+evo+hits=1 (quick fix).
2. H1: product decision on wind/earth rank-3 value. Either scale tornado/revive with k or fix the copy.
3. M1: end or refuse an empty chain; compute the factor against words.length; add small-pool tests.
4. M2: run a wind-evo fast-pace sim before shipping.
5. M3/L2: derive the UI percentage from tuning; assert chainFactor length.

## Unresolved questions
- Should bonus alone (without typing all words) be allowed to reach the k≥1.5 perks (shield) even if the "HOÀN HẢO" label is hidden?
- Is rank 3 of Wind being a no-op (without evo) acceptable, or should tornado gain a k-scaled effect?
- Minimum word pool for boss battles: should useUltimate be disabled when groups.length < 2?

Status: DONE_WITH_CONCERNS
Summary: All user decisions implemented correctly and tests pass 635/0; no hardcoded chain/ult constants remain. Two high issues: rank-3 bonus has zero effect for Wind (and nearly for Earth), and rank3+evo stacking shows "HOÀN HẢO" / grants perfect perks after typing only 1 of 2 words.
Concerns: small-pool empty chain (12s dead time) now frequent; wind ultAdd + ultMax 4 balance untested.
