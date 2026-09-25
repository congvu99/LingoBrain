# Tune Mage Lexoria ultimate — easier + repeatable

Date: 2026-09-25

## Status
DONE

## Summary
Unlocked ultimate from start (any chosen school, no rank-3 gate), sped up ult charge (ultMax 10→6), shortened+relaxed
chain (3 words/9s → 2 words/12s, factor table 0/1/2 hits → 0.5/1/1.5), removed giveUp's ult −2 penalty. All tuning
in BOSS_TUNING (chainWords, chainFactor added). No hardcoded word-counts left in HUD/render. TDD: tests updated
first to encode new spec, then code changed to pass. `node tests/run-tests.js` → 630 passed, 0 failed (baseline 629
+ 1 new test for the "1 of 2 hits via timeout" case). APP_VERSION/sw.js CACHE bumped 2.24.2 → 2.24.3.

## Files Modified
- `js/boss-game-spell-math.js` (94 lines) — BOSS_TUNING: ultMax 10→6, chainMs 9000→12000, +chainWords:2,
  +chainFactor:[0.5,1,1.5].
- `js/boss-game-elements.js` (56 lines) — `modifiersFor` always sets `m.ultimate = BOSS_ULTIMATES[el]` (no more
  `rankOf(alloc,el)>=3` gate); comments updated to explain rank 3 now grants nothing extra.
- `js/boss-game-combo-chain.js` (154 lines) — `bossChainWords` uses `BOSS_TUNING.chainWords` (was hardcoded 3);
  `bossChainFactor` reads `BOSS_TUNING.chainFactor[Math.min(hits, chainWords)]` (was `hits>=3?1.5:hits===2?1:0.5`);
  comments de-hardcoded ("3 từ" → "chainWords từ" etc).
- `js/boss-game-logic.js` (200 lines) — `giveUp` no longer does `st.ult = Math.max(0, st.ult-2)` (comment explains
  why: threatMiss + combo loss already have a cost, no need to double-punish the ult bar now that it's smaller).
- `js/boss-game-render.js` (158 lines) — chain HUD dots: `for (i<3)` / `dot*3+gap*2` → derived from
  `BOSS_TUNING.chainWords`. Ult-bar cells already used `BOSS_TUNING.ultMax` (no change needed there, just comment
  fix "10 ô" → "ultMax ô").
- `js/boss-game-tier3-ultimate-fx.js` (131 lines) — comment fix only ("gõ trọn 3 từ" → "gõ trọn hết từ"; `u.perfect`
  logic was already `k>=1.5`, data-driven, untouched).
- `js/boss-game-skill-tree-ui.js` (68 lines) — `BOSS_RANK_DESC` rank-3 entries reworded to "Tuyệt kỹ (đã có sẵn): …"
  since it's no longer something rank 3 unlocks; header comment updated.
- `js/boss-game-ui.js` (200 lines) — comment fix only (ult button visibility comment no longer says "bậc 3").
- `js/app-storage.js`, `sw.js` — APP_VERSION / CACHE 2.24.2 → 2.24.3.
- `README.md`, `docs/system-architecture.md` — ultimate/chain description updated (6 nấc, 2 từ/12 giây, "đã có sẵn"
  wording, HOÀN HẢO = gõ đủ 2 từ).
- Tests: `tests/boss-game-combo-chain.test.js`, `tests/boss-game-logic.test.js`, `tests/boss-game-spell-math.test.js`
  — updated to new spec (see below).

## Tasks Completed
1. Unlock early: `modifiersFor` always sets ultimate; rank-3 UI text updated (skill tree). Confirmed via
   `ELEMENT_RANKS` that rank 3 had NO entry (only ranks 1–2 exist per element) — rank 3 was purely the "unlock
   ultimate" gate. Per instructions, did NOT invent a new rank-3 reward; documented as open question below.
2. Faster charge: `ultMax` 10→6; `giveUp` no longer subtracts from `st.ult`. HUD ult cells already derived from
   `BOSS_TUNING.ultMax` (no hardcoded 10 existed in render — only in a comment, fixed).
3. Easier chain: `chainWords:2`, `chainMs:12000`, `chainFactor:[0.5,1,1.5]` in BOSS_TUNING; `bossChainWords` and
   `bossChainFactor` read from BOSS_TUNING; chain HUD dot count derived from `chainWords`. `bossUltBoostCount`,
   `evoUltBonus` ceil logic untouched (unaffected by word-count change, only `k` changes). k=1 equivalence tests
   adapted from "2 of 3 hits" to "1 of 2 hits" (timeout-based, since typing both of only 2 available words now
   yields hits=2→k=1.5 instead of the old k=1).

## Tests Status
- Type check: n/a (plain JS, no build step in this repo)
- Unit tests: PASS — `node tests/run-tests.js` → **630 passed, 0 failed** (baseline 629; +1 new test:
  "hết chainMs mới gõ 1/2 từ → k=1 (timeout)"). Includes pwa-assets test.
- Updated test files:
  - `tests/boss-game-combo-chain.test.js`: `bossChainFactor` table (0→0.5,1→1,2→1.5), evoUltBonus block reworked
    (0-hit/1-hit/2-hit cases instead of old 1-of-3/2-of-3/3-of-3), chain-activation length assertion now
    `BOSS_TUNING.chainWords`, "gõ trọn cả 2 từ" HOÀN HẢO test, timeout tests split into hits=0 and hits=1 cases,
    the four k=1-equivalence tests (`.slice(0,2)`→`.slice(0,1)`, since only 1 of 2 available words now gives k=1;
    typing both would now be "perfect" k=1.5), giveUp ult test now expects unchanged `st.ult`.
  - `tests/boss-game-logic.test.js`: `giveUp` test expects `st.ult` unchanged; `ultOld` helper reworked to type 1 of
    the 2 available chain words then let the timeout fire (was: type both words synchronously) — downstream
    per-element k=1 equivalence tests (meteor/iceAge/chain/revive/tornado) unchanged in assertions, only the setup
    helper changed.
  - `tests/boss-game-spell-math.test.js`: two `boss elements` tests reworded for "unlock early" — ultimate is now
    present even with `alloc={}` (was `null`), and `modifiersFor({ice:3},'fire').ultimate` is now `'meteor'` (was
    `null`) since it no longer depends on the active element's own rank.

## Quick Sim — Ultimates per Battle (2000 HP monster, moderate typing pace)
Ran real game logic (`createBattle`/`typeKey`/`stepBattle`/`useUltimate`) via a Node `vm` harness in scratchpad
(same load pattern as `tests/run-tests.js`), fire school, tier-2 spells (~20 base dmg), typing at ~700ms/letter
(puts speedMult ≈ 1, i.e. "vừa phải" — not the fast-cast threshold). Two runs: OLD tuning
(ultMax=10, chainWords=3, chainMs=9000) vs NEW tuning (ultMax=6, chainWords=2, chainMs=12000):

| | Ultimates cast | Spells cast | Battle real-time |
|---|---|---|---|
| TRƯỚC (old tuning) | **3** | 38 | ~164s (~2m44s) |
| SAU (new tuning) | **4** | 32 | ~136s (~2m16s) |

Ultimates per battle up ~33% (3→4) while the fight also finishes faster (fewer casts needed, since ultimates hit
harder relative to fight length) — matches the "easier and usable many times per battle" goal. Script:
`C:\Users\ADMINI~1\AppData\Local\Temp\claude\d--project-eng\1666a88e-7cb6-4e90-8d1a-f9b6509d72d3\scratchpad\ult-sim.js`
(scratchpad, not part of repo).

## Issues Encountered
None — no file ownership conflicts observed (only touched files listed in the task's "Read first" set + README/docs/
version files). `js/boss-game-sprite-actors.js` untouched (per constraint, its 203-line overage belongs to another
plan).

## Open Question from original task (per user decision 1) — RESOLVED by follow-up below
`ELEMENT_RANKS` only defines ranks 1 and 2 for every element (`fire: {1:{...}, 2:{...}}`, no `3` key) — rank 3 had
**no effect of its own**; it was purely the gate that flipped `m.ultimate` on. Now that the ultimate unlocks
immediately on choosing a school, rank 3 of the elemental tree granted nothing. Flagged for product decision — the
coordinator's follow-up request (below) resolves this by giving rank 3 a real, stronger-ultimate bonus.

---

## Follow-up: ultMax 6→4 + rank-3 ultimate bonus (2026-09-25, same session)

TDD again (tests first), no commit, **no version bump** (2.24.3 stays — not shipped yet, per instruction).

### Changes
1. `js/boss-game-spell-math.js` (96 lines) — `BOSS_TUNING.ultMax` 6→4; added `rank3UltBonus: 0.25`.
2. `js/boss-game-elements.js` (57 lines) — `modifiersFor` now sets `m.ultBonus = 0` by default, `= BOSS_TUNING.
   rank3UltBonus` when `rankOf(alloc, el) >= 3` for the **active** school `el` (a rank-3 branch that isn't the
   active school gives nothing — matches how `m.ultimate` itself already only depends on the active school).
3. `js/boss-game-combo-chain.js` (154 lines) — `bossEndChain` now combines both bonus sources into **one path**:
   `bonus = (st.evoUltBonus || 0) + (st.mods.ultBonus || 0)`; `boosted = bonus > 0` still drives the
   `bossUltBoostCount` ceil-vs-round choice for meteor/chain, so rank-3 alone, evolution alone, or both together all
   correctly trigger the "ceil" rule. `bossApplyUltimate`/`bossUltBoostCount` themselves untouched (they only take
   `k`/`boosted`, agnostic to bonus source).
4. `js/boss-game-skill-tree-ui.js` (70 lines) — `BOSS_RANK_DESC` rank-3 entries reworded to "Tuyệt kỹ mạnh hơn
   (+25% hiệu lực) nếu đang dùng trường phái này: …" (was "đã có sẵn: …", which is now wrong since rank 3 does do
   something again); header comments updated.
5. `README.md`, `docs/system-architecture.md` — "6 nấc" → "4 nấc"; noted rank-3 = +25% ultimate power, stacks with
   the level-16 evolution bonus.
6. Tests — rewired `alloc: { X: 3 }` → `alloc: {}` across `tests/boss-game-combo-chain.test.js` and
   `tests/boss-game-logic.test.js` wherever the test only needed the school picked (not a rank-3 bonus test) —
   these were leftovers from before "unlock early" when rank 3 was required just to get `mods.ultimate` at all;
   left as-is they'd now silently add the new +0.25 bonus and break the k=1/k=1.5 equivalence assertions.
   Added dedicated `rank3UltBonus` describe block in `tests/boss-game-combo-chain.test.js`: rank<3 → no bonus;
   rank 3 (active school) → +0.25, boosted ceil applies; rank 3 + `evoUltBonus` → +0.5 combined, still one boosted
   path; rank 3 on a **non-active** branch → no bonus. Added `m.ultBonus` unit tests in
   `tests/boss-game-spell-math.test.js` (0 / +0.25 / cross-branch-no-effect). Existing k=1 old-effect equivalence
   tests (meteor/iceAge/chain/revive/tornado) still pass unchanged now that they use `alloc:{}` (no bonus).

### Tests Status
`node tests/run-tests.js` → **635 passed, 0 failed** (was 630 before this follow-up; +5 new tests: 3 in
`rank3UltBonus` describe + 1 `m.ultBonus` unit test in spell-math + 1 non-active-branch case folded into the same
describe). No regressions.

### Quick Sim — ultMax=4, rank 0 vs rank 3 (2000 HP monster, moderate pace)
Same vm harness/pace as before (fire school, tier-2 spells, ~700ms/letter → speedMult≈1), reading live
`BOSS_TUNING` (ultMax=4, rank3UltBonus=0.25) from the repo, not overridden:

| | Ultimates cast | Spells cast | Battle real-time |
|---|---|---|---|
| RANK 0 (no points in Lửa, no bonus) | **6** | 33 | ~139s (~2m19s) |
| RANK 3 (Lửa at rank 3, +0.25 to chain k) | **5** | 29 | ~121s (~2m01s) |

Fewer ultimates at rank 3 despite the bonus — expected: each ultimate now hits harder (higher `k` → bigger
`bossUltBoostCount`), so the fight ends in fewer total casts/ultimates, not more. ultMax 6→4 alone (vs. the earlier
6-nấc report) already raised rank-0 ultimates from ~4 to 6 for this same scenario. Script:
`C:\Users\ADMINI~1\AppData\Local\Temp\claude\d--project-eng\1666a88e-7cb6-4e90-8d1a-f9b6509d72d3\scratchpad\ult-sim-rank3.js`
(scratchpad, not part of repo).

---

## Follow-up 2: code-review fixes (2026-09-25, same session)
Report: `D:\project\eng\plans\reports\code-reviewer-260925-1500-easier-repeatable-ultimate-review-report.md`.
TDD again, no commit, version untouched (still 2.24.3, confirmed unchanged at the end).

### 1. H1 — Tornado/Revive now scale with k>1
`js/boss-game-spell-math.js` — new `BOSS_TUNING.tornadoFreezeSecPerK: 4`, `reviveShieldK1: 1.25`, `reviveShieldK2: 1.75`.
`js/boss-game-combo-chain.js:bossApplyUltimate`:
- **Tornado**: `threat=0` unchanged; when `k>1`, ALSO freezes the threat gauge (reuses the existing `st.frozen`/
  `st.frozenUntil` mechanic shared with iceAge — respects pause/resume via the existing `resumeBattle` field list)
  for `tornadoFreezeSecPerK × (k−1)` seconds: 1s at k=1.25, 2s at k=1.5, 4s at k=2.0 (per the coordinator's example).
  At k=1 (old effect), no extra freeze — reproduces old behavior exactly.
- **Revive**: heal formula (`ceil(missing×k)`) unchanged; extra shield now `+1` at `k≥reviveShieldK1` (1.25), `+2`
  at `k≥reviveShieldK2` (1.75), capped by `shieldCap`. At k=1, no shield (0 < 1.25) — reproduces old behavior.
- Both replace the old flat `if (k>=1.5) shield+=1` (which the review showed never actually differed from the
  pre-existing behavior for a lone +0.25 bonus — H1's core complaint).

### 2. H2 — "HOÀN HẢO" / perfect now decided by hits, not k
`bossEndChain` now computes `perfect = c.words.length > 0 && c.hits >= c.words.length` (hits === actual chain
length, which per fix #3 is always `chainWords`) and emits it on both `chainEnd` and `ultimate` events.
`bossApplyUltimate` takes a new `perfect` parameter (forwarded into the `ultimate` event only — it does **not**
gate any numeric effect; those are purely k-driven per #1, so "bonus only increases numeric strength" holds).
`js/boss-game-tier3-ultimate-fx.js:bossFxUltimateEvent` now reads `e.perfect` instead of `e.k >= 1.5` for the
cutscene's `u.perfect` (drives the "HOÀN HẢO" text). Test added: rank3(earth, +0.25) + evo(+0.25) + typing only 1
of 2 chain words → `k` reaches 1.5 (the old "perfect" threshold) but `chainEnd.perfect`/`ultimate.perfect` are
both `false`, while the shield still gets +1 (k≥1.25) — confirms bonuses increase numbers without faking the label.

### 3. M1 — Small pools never produce an empty/short chain
`bossChainWords` rewritten: always returns exactly `BOSS_TUNING.chainWords` entries. Pool ≥ chainWords+1 distinct
groups → same rotation as before (no repeats). Pool has fewer "other" groups than needed → repeats those other
groups (never the current prompt, as long as at least one alternative exists) until the count is reached. Pool of
exactly 1 group (= the current prompt, no alternative at all) → repeats the current prompt itself. Never returns
`[]`. Tests added for pool-of-1 (must repeat current prompt, chain completes and applies the ultimate normally —
no more 12s dead wait with nothing to type) and pool-of-2 (must repeat the one other group, never the current one).

### 4. Wind fast-pace sim (no tuning number changed — measurement only)
Simulated 2000 HP boss, Wind school, rank 3 (`wind:3`, +0.25 ultBonus), very fast typing (60ms/letter, `speedMult`
pinned at 2) so combo climbs every cast and `combo6` (ultAdd +2) fires every 6th cast — comparing level 10 (base
form, no evolution) vs level 16 (`wind-a1` form: `evoUltBonus +0.25`, `combo6` override keeps `ultAdd:2` unchanged).
Ran via the same `vm` harness pattern as earlier sims (`js/boss-progress-sync-merge.js` → … → `boss-game-logic.js`
loaded into one context, driving real `typeKey`/`stepBattle`/`useUltimate`).

| | Ultimates/battle | Casts | Battle time | Hearts lost | % time in chain | % time frozen (bonus) | % time normal impact-lock |
|---|---|---|---|---|---|---|---|
| Level 10 (base form) | 11 | 39 | ~84s | 0 | 0.2% | **56.5%** | 30% |
| Level 16 (wind-a1) | 7 | 23 | ~53s | 0 | 0.2% | **60.3%** | 27.2% |

Findings: **0 hearts lost in both runs** — at this pace the boss never lands a hit (confirms M2's original worry
in the strongest terms: `ultAdd` + `ultMax=4` fills the bar almost every combo-6 cast). More strikingly, the new
tornado freeze from fix #1 (H1) compounds this: because chain length is only 2 words and typing is fast, almost
every ultimate reaches `hits=2` (k=1.75 with rank3+base, or higher with evo), so `tornadoFreezeSecPerK×(k−1)` adds
1–4+ extra frozen seconds **per ultimate**, on top of the already-frequent chain/lock time — over half of total
battle time (56–60%) is now spent in a bonus-driven freeze, separate from the ordinary per-cast impact-lock tail
(~27–30%, which is normal for every element at fast pace, not wind-specific). Chain time itself stays tiny (0.2%)
because a 2-word chain completes almost instantly at this typing speed — the 12s `chainMs` budget is essentially
never used up.
This is a measurement only, per the "no number change" instruction — flagging for a follow-up balance pass since
fix #1 (tornado freeze scaling) makes the pre-existing M2 concern measurably worse for Wind specifically. Script:
`C:\Users\ADMINI~1\AppData\Local\Temp\claude\d--project-eng\1666a88e-7cb6-4e90-8d1a-f9b6509d72d3\scratchpad\ult-sim-wind-fast.js`.

### 5. M3 / L2 / L3
- **M3**: `js/boss-game-skill-tree-ui.js` — `BOSS_RANK_DESC` rank-3 text no longer hardcodes "+25%"; built from
  `BOSS_TUNING.rank3UltBonus` as `'Tuyệt kỹ mạnh hơn (+' + BOSS_TUNING.rank3UltBonus + ' hệ số) nếu đang dùng
  trường phái này: …'` — stays in sync automatically on retune, and doesn't claim a specific in-game % (which the
  review showed varies per ultimate: +33–50% for meteor/chain due to `ceil`, continuous for iceAge, threshold-based
  for revive/tornado now). README.md reworded similarly (no "+25%").
- **L2**: added `tests/boss-game-combo-chain.test.js` assertion `BOSS_TUNING.chainFactor.length === BOSS_TUNING.
  chainWords + 1` — catches a future `chainWords` retune that forgets to extend the factor table (would otherwise
  silently produce `k=NaN`).
- **L3**: renamed the "Nộ" (legacy term) test title in `tests/boss-game-logic.test.js` to "tuyệt kỹ khi thanh tuyệt
  kỹ chưa đầy → không dùng được".

### Files Modified (this follow-up)
- `js/boss-game-spell-math.js` (98 lines) — +`tornadoFreezeSecPerK`, +`reviveShieldK1`/`reviveShieldK2`.
- `js/boss-game-combo-chain.js` (168 lines) — `bossChainWords` small-pool repeat logic; `bossEndChain` computes
  `perfect`; `bossApplyUltimate` gains `perfect` param, revive/tornado k-scaling replacing the old `k>=1.5` gate.
- `js/boss-game-tier3-ultimate-fx.js` (132 lines) — `perfect` sourced from `e.perfect`, not `e.k>=1.5`.
- `js/boss-game-skill-tree-ui.js` (74 lines) — rank-3 text derived from `BOSS_TUNING.rank3UltBonus`, no hardcoded %.
- `README.md`, `docs/system-architecture.md` — reworded rank-3/tornado/revive/perfect description.
- `tests/boss-game-combo-chain.test.js` — new describes: tornado/revive k-scaling (k=1/1.25/1.5/1.75, per element),
  perfect-vs-k (H2), small pools (pool of 1 and 2 groups), `chainFactor` length invariant (L2).
- `tests/boss-game-logic.test.js` — L3 rename only.
- `js/boss-game-elements.js`, `js/app-storage.js`, `sw.js` unchanged in this follow-up (still from the two earlier
  passes; version confirmed still `2.24.3`).

### Tests Status
`node tests/run-tests.js` → **green, 0 failed** throughout (an unrelated concurrent session is also adding tests/
sprite work in this repo per the git status snapshot, so the exact passing count moved between runs — every run I
executed after each edit here reported 0 failed, confirmed clean immediately before writing this report).

---

## Status
DONE

## Summary
All three follow-ups (original tuning pass, ultMax 6→4 + rank-3 bonus, and this code-review fix pass covering H1/
H2/M1/M3/L2/L3) are implemented, TDD throughout, all green, no commit, version left at 2.24.3 (not bumped again).
Tornado/revive now scale continuously with k>1 (reusing the existing freeze mechanic for tornado, new shield
thresholds for revive), "HOÀN HẢO"/perfect is now strictly hits-based (bonuses can no longer fake the label), small
word pools can no longer produce an empty/short chain, and the rank-3 skill-tree copy no longer hardcodes a
percentage.

## Concerns
- **Wind balance (M2, unresolved by design — explicitly "no number change" this round)**: the fast-pace sim shows
  0 hearts lost and 56–60% of battle time in a bonus-driven freeze for Wind at rank 3, worse than before this
  follow-up because the new tornado freeze (fix H1) stacks on top of Wind's already-fast `ultAdd`-driven ult
  economy. Recommend a dedicated balance pass (e.g., scale `ultAdd` down, add a short cooldown after `useUltimate`
  before `ultAdd` skills can refill, or cap tornado's freeze bonus) — flagging for product decision, not fixed here
  per explicit instruction.
- `BOSS_RANK_DESC`'s rank-3 line still shows on every branch's own column regardless of which school is currently
  active (same L1 in the original review, cosmetic, unchanged from before — text is worded conditionally so it
  doesn't over-promise).

---

## Follow-up 3: Wind cooldown fix + re-sims + hunk map for commit-splitting (2026-09-25, same session)
TDD, no commit, version left untouched by me (still 2.24.3 as far as MY edits go — see version note below, another
concurrent session has since bumped it further for unrelated work).

### 1. Global ult-meter cooldown
`BOSS_TUNING.ultCooldownMs = 6000` (js/boss-game-spell-math.js). After a used ultimate's cutscene ENDS (not when
the player presses the button — `end = now + ultimateMs`, set inside `bossApplyUltimate`), `st.ultCooldownUntil =
end + ultCooldownMs`. While `now < st.ultCooldownUntil`, the ult meter cannot gain from ANY source:
- `bossComboOnCast` (combo-chain.js) — normal-cast gain gated; combo itself still increments normally (only the
  ult-bar gain is blocked).
- `bossApplySkillEffect`'s `eff.ultAdd` (skill-pick.js) — same gate, so Wind's `combo6`/`combo3` ultAdd skills
  can't bypass the cooldown either.
Both functions gained a trailing `now` parameter (threaded from `castComplete` in boss-game-logic.js, which already
had `now` in scope — no new global state needed). `st.ultCooldownUntil` is a normal battle-time field: initialized
to `0` in `createBattle`, added to the same shift list `resumeBattle` already uses for `armedAt`/`lockUntil`/
`frozenUntil`/`wonAt`, so pausing mid-cooldown works exactly like the other timers.
HUD: `js/boss-game-render.js:drawBossHud` — ult cells render `rgba(150,150,165,.35)` (dimmed grey) for all 4 cells
while `now < st.ultCooldownUntil`, instead of the normal filled/empty/glow colors (also suppresses the "full bar"
jitter animation during cooldown since the bar can't actually be full-and-usable then in practice, though technically
`st.ult` could still show a value — the grey overlay communicates "can't use yet" regardless).

### 2. Tests
`tests/boss-game-combo-chain.test.js` — new describe `ultCooldownMs — hồi chiêu sau tuyệt kỹ` (lines 359–412):
no gain from a normal cast during cooldown (combo still increments); gain resumes once `now >= ultCooldownUntil`;
no-cooldown-set (`ultCooldownUntil: 0`) behaves as before; `ultAdd` blocked during cooldown and resumes after;
full integration test through `createBattle`/`useUltimate`/chain typing showing a real post-ultimate cast gives 0
gain immediately after the cutscene, then gains normally once 6s of battle time have passed; pause/resume shifts
`ultCooldownUntil` by the paused duration (same pattern as the existing `chain.until` pause test).

### 3. Re-ran sims with the cooldown active
Same `vm` harness/scripts as the earlier passes (now automatically picking up the cooldown since they load the real
`js/*.js` files), reading live `BOSS_TUNING` (ultMax=4, ultCooldownMs=6000).

**Wind, fast pace (combo6, rank 3, level 10 base form vs level 16 `wind-a1`), 2000 HP boss** — compare to the
Follow-up 2 numbers (no cooldown):

| | Ultimates/battle | Casts | Battle time | Hearts lost | % time in chain | % time frozen (bonus) | % time impact-lock |
|---|---|---|---|---|---|---|---|
| Level 10 — before cooldown | 11 | 39 | ~84s | 0 | 0.2% | 56.5% | 30% |
| Level 10 — **with cooldown** | **6** | 36 | ~62s | 0 | 0.2% | 41.2% | 43% |
| Level 16 — before cooldown | 7 | 23 | ~53s | 0 | 0.2% | 60.3% | 27.2% |
| Level 16 — **with cooldown** | **4** | 22 | ~43s | 0 | 0.1% | 49% | 37.3% |

Ultimates/battle roughly halved (11→6, 7→4) and bonus-driven frozen time dropped meaningfully (56.5%→41.2%,
60.3%→49%) — the cooldown is doing real work reining in Wind's `ultAdd` spam. `heartsLost` is still 0 in both runs
at this extreme fast/no-typo pace (that's a pace-realism limit of the sim, not a cooldown gap — the boss simply
never gets a chance to land a hit when every cast lands and combo never resets; a sim with occasional typos/misses
would show hearts lost more realistically, out of scope for this measurement-only pass).

**Fire, moderate pace (rank 0 vs rank 3), 2000 HP boss** — for comparison, confirms the cooldown does NOT change
Fire's already-moderate economy (ult naturally takes longer than 6s to refill at this pace anyway):

| | Ultimates/battle | Casts | Battle time | Hearts lost | % time in chain | % time frozen | % time impact-lock |
|---|---|---|---|---|---|---|---|
| Rank 0 | 6 | 32 | ~133s | 0 | 0.1% | 0% | 20.2% |
| Rank 3 | 5 | 28 | ~117s | 0 | 0.1% | 0% | 20.8% |

Unchanged from the Follow-up 2 numbers (6/5 ultimates) — as expected, since moderate-pace Fire was never hitting
the 6s cooldown boundary in the first place. `frozenPct` is 0% here because meteor doesn't use the tornado/iceAge
freeze path. Scripts: `...\scratchpad\ult-sim-wind-fast.js` and `...\scratchpad\ult-sim-rank3.js` (both re-run
as-is; no script changes needed — they load the real game files via `vm`, so the cooldown applied automatically).

### 4. Hunk map for commit-splitting (file + line ranges, current working-tree line numbers)
Per the coordinator's note that another session is concurrently editing `js/boss-game-render.js`, `result-ui`,
`tier3-ultimate-fx`, `ui`, `sprite-actors`, `sw.js`, `index.html`, `tests/run-tests.*` for a skill-visuals feature —
below is every hunk across ALL THREE of my passes (original tuning, ultMax/rank3 follow-up, code-review fixes,
this cooldown follow-up) that belongs to the ultimate-tuning work, so it can be cherry-picked separately from their
diff. Files NOT listed here (e.g. `js/boss-game-result-ui.js`, `js/boss-game-sprite-actors.js`, `index.html`,
`tests/run-tests.js`, `tests/run-tests.html`) were read but never modified by me — everything currently in their
diff is the other session's.

**Exclusively mine (no concurrent editor touches these — safe to take whole-file diff):**
- `js/boss-game-spell-math.js` — all of `BOSS_TUNING` (lines 13–21: `ultMax`, `ultCooldownMs`, `shieldCap` comment,
  `chainMs`, `chainWords`, `chainFactor`, `rank3UltBonus`, `tornadoFreezeSecPerK`, `reviveShieldK1/K2`).
- `js/boss-game-elements.js` — header comment (2–6), `ELEMENT_RANKS` comment (11–12), `modifiersFor`'s `ultimate`
  assignment (line ~29) and `ultBonus` assignment (line ~42).
- `js/boss-game-combo-chain.js` — entire file is mine (header comment through `module.exports`); no concurrent
  editor touches it.
- `js/boss-game-skill-pick.js` — `bossApplySkillEffect` signature + `ultAdd` cooldown gate (lines 52–65),
  `bossResolveSkillCast` signature + `now` passthrough (lines 86–96). NOTE: lines ~71–79 (`bossSkillEvolved`
  function), the `evolved` field in `bossApplyHit`'s impact emit (line ~118), and the `bossSkillEvolved` export
  are the OTHER session's (skill-visuals `evolved` flag) — not mine, do not attribute to this work.
- `js/boss-game-skill-tree-ui.js` — entire file is mine (rank-3 text, no concurrent editor touches it).
- `tests/boss-game-combo-chain.test.js`, `tests/boss-game-logic.test.js`, `tests/boss-game-spell-math.test.js` —
  entire files are mine.

**Shared files — mine is a small subset, listed precisely:**
- `js/boss-game-logic.js` (concurrently edited by the other session for the `evolved` flag):
  - Line 15: `ultCooldownUntil: 0` added to `createBattle`'s initial state object — **mine**.
  - Line 96: `bossResolveSkillCast(st, dmg, crit, letters, speed, now)` — added `, now` — **mine**. (Same line
    also carries no other change.)
  - Line 104, 106: `evolved: r.evolved` in `pendingImpacts.push`/`cast` emit — **NOT mine** (other session).
  - Line 108: `bossComboOnCast(st, speed, now)` — added `, now` — **mine**.
  - Line 128: `giveUp`'s "no longer subtracts ult" comment — **mine** (original pass 1).
  - Line 134: `useUltimate`'s comment (removed "3 từ" wording) — **mine** (original pass 1).
  - Line 149: `resumeBattle`'s shift array — added `'ultCooldownUntil'` — **mine**.
  - Line 157: `evolved: p.evolved` in `bossApplyImpacts`'s `bossApplyHit` call — **NOT mine** (other session).
- `js/boss-game-render.js` (concurrently edited for arena/ambient rework):
  - Lines 103–108 (`drawBossHud`, the `ultCooling` const + the ult-cell `fillStyle`/`jitter` lines) — **mine**.
    Everything else in this file's diff (region/ambient/arena rewrite, ~lines 40–63, 144–158) is the other
    session's.
- `js/boss-game-tier3-ultimate-fx.js` (concurrently edited, presumably for new VFX):
  - Lines 19–21 (`perfect: !!e.perfect` instead of `e.k>=1.5`, with the explanatory comment) — **mine** (Follow-up
    2, H2 fix).
  - Line ~120 (`if (u.perfect)` comment wording "gõ trọn hết từ" instead of "gõ trọn 3 từ") — **mine** (original
    pass 1).
  - Everything else (lines ~64–66, ~98–101) is the other session's.
- `js/boss-game-ui.js` (concurrently edited):
  - Line 143 — comment only, "bậc 3 nhánh trường phái" → "mọi trường phái có sẵn từ đầu" — **mine** (original
    pass 1). No other line in this file's diff is mine.
- `README.md`, `docs/system-architecture.md` — mine throughout (no concurrent editor noted for these); the
  system-architecture.md line 47 description of `boss-game-combo-chain.js` was re-verified current after a
  disk-change notice mid-session (the other session also touches this doc for their own file entries elsewhere) —
  my line 47 content is intact.
- `js/app-storage.js` / `sw.js` (version) — **superseded, not splittable by line**: I bumped `APP_VERSION`/`CACHE`
  2.24.2→2.24.3 in the original pass. The other session has since bumped both to **2.24.4** for their own ship
  (confirmed via `grep`: `js/app-storage.js:4` and `sw.js:3` both now read `2.24.4`). Since both edits land on the
  same single line, my intermediate `2.24.3` value no longer exists in the working tree to cherry-pick — whoever
  commits last on this line owns it. I did **not** bump the version again myself, per this pass's explicit
  instruction ("version stays 2.24.3" was honored from my side; the file now shows 2.24.4 because of the other
  session, not me). `sw.js`'s `ASSETS` array additions (~lines 58–72, ~201–217) are entirely the other session's
  new sprite files, not mine.

### Files Modified (this follow-up only)
- `js/boss-game-spell-math.js` (100 lines) — `+ultCooldownMs: 6000`.
- `js/boss-game-combo-chain.js` (172 lines) — `bossComboOnCast(st, speed, now)` cooldown gate; `bossApplyUltimate`
  sets `st.ultCooldownUntil`.
- `js/boss-game-skill-pick.js` (141 lines) — `bossApplySkillEffect`/`bossResolveSkillCast` gain `now` param,
  `ultAdd` cooldown gate.
- `js/boss-game-logic.js` (200 lines, still at the cap — every change here was a same-line edit, no net lines
  added) — `ultCooldownUntil` field, `now` threaded to the two call sites, `resumeBattle` shift list.
- `js/boss-game-render.js` — ult-cell dimming while cooling.
- `README.md`, `docs/system-architecture.md` — cooldown mentioned in the ultimate description.
- `tests/boss-game-combo-chain.test.js` — new `ultCooldownMs` describe block (7 tests).

### Tests Status
`node tests/run-tests.js` → **733 passed, 0 failed** (confirmed on 2 consecutive runs immediately before writing
this section). One transient failure (`evolved` skill-visuals impact test, unrelated file/feature) appeared on a
single run mid-session while the other session was actively saving files concurrently — re-ran clean immediately
after and stayed clean; not caused by anything in this diff (verified: I never touch `bossApplyImpacts`,
`bossApplyHit`'s `evolved` passthrough, or that test file).

---

## Status
DONE

## Summary
All four rounds of work on the Mage Lexoria ultimate (initial tuning, ultMax/rank-3 bonus, code-review fixes, and
this Wind-balance cooldown fix) are complete, TDD throughout, `node tests/run-tests.js` green (733/733) on the
final run, no commit made. The new `ultCooldownMs` (6s, all gain sources, respects pause/resume, dimmed HUD cells)
roughly halves Wind's ultimate frequency and reduces bonus-driven freeze time from ~57–60% to ~41–49% of battle
time at extreme fast pace, while leaving Fire's moderate-pace economy unchanged. A full hunk map is included above
for commit-splitting against the concurrent skill-visuals session's changes.

## Concerns
- Wind still shows **0 hearts lost** even with the cooldown, at this sim's extreme fast/zero-typo pace — the
  cooldown reduced frequency but didn't reintroduce risk at that specific (unrealistic) pace. A more realistic sim
  (occasional typos/misses, human reaction variance) would likely show a different picture; flagging as a
  measurement caveat, not a claim that Wind is now "balanced."
- Bonus-driven frozen time (41–49%) is still substantial for Wind even after the cooldown — if that's still too
  high, the next lever would be `tornadoFreezeSecPerK` itself (currently 4) rather than the ult economy, since the
  cooldown pass has already addressed the "almost permanently locked" version of the complaint from Follow-up 2.
- Version: working tree now shows `2.24.4` (APP_VERSION/CACHE) due to the concurrent session's own unrelated ship;
  I did not bump it in this pass, honoring "version stays 2.24.3" from my side specifically — flagging so the
  coordinator doesn't mistake that line for mine when splitting commits.
