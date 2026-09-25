# Code Review — Mage Lexoria combat depth, phases 1–3 (uncommitted tree)

## Scope
- Files: js/boss-game-{logic,render,result-ui,spell-math,sprite-actors,tier3-ultimate-fx,ui}.js, new js/boss-game-threat-gauge.js (29), js/boss-game-combo-chain.js (105), css/paper-theme.css, index.html, sw.js, js/app-storage.js, README.md, tests (logic/threat-gauge/combo-chain, runner, html).
- LOC: ~+240/-100 tracked + ~430 new (code + tests).
- Verification: `node tests/run-tests.js` → 492 passed / 0 failed (incl. pwa-assets). VM sim (scratchpad, not repo) loading real modules to reproduce edge cases below.
- Line limit: logic.js 200, sprite-actors 199, all others ≤ 200 except pre-existing spell-presets 225. OK.
- Registration: index.html / sw.js ASSETS / PURE_MODULES / run-tests.html all include threat-gauge + combo-chain before logic.js. APP_VERSION = CACHE = 2.21.0. OK.
- Leftover readers: no `st.clock`, `clockMax`, `st.rage`, `rageMax`, `rageFull` in js/css/html (grep excl. plans). Only prose leftovers (README:121 "đủ Nộ", docs/system-architecture.md:39 "đồng hồ … Nộ").
- Contracts: exported signatures unchanged; `eng.boss.v1` / sync-merge / srs-scheduler untouched (git diff empty). Event rename `rageFull`→`ultFull` has no consumer before or after. `ultimate` event now fires ~9s later (chain end) and carries `k`.

## Overall
Logic core is clean and well-tested for the happy paths; k=1 equivalence to old ultimates is genuinely verified. But one UI regression breaks the prompt after every ultimate, one explicit phase-3 requirement (chain hits deal damage) is silently missing, and several chain/freeze edge cases leak.

## Critical
None (no data/sync/SM-2 impact).

## High

### H1. Prompt card stays hidden ("✦ đang niệm…") after every ultimate — REGRESSION
- js/boss-game-result-ui.js:19 sets `is-casting` on `ultimate`; only `next` clears it (line 13).
- js/boss-game-combo-chain.js:99 `bossLockFor(st, end, false)` → lockNext=false (useUltimate requires bossCanAct, which already cleared lockNext) → js/boss-game-logic.js:28 `bossEndLock` resumes same prompt WITHOUT emitting `next`.
- Reproduced (VM sim): events after ult = `chainHit,chainHit,chainHit,chainEnd,ultimate,ultimateEnd` — no `next`.
- Failure: after cutscene the player must type the current word blind (letters `visibility:hidden`). Pressing Bỏ sets reveal, but reveal is also hidden by the same class. Only clears after the next successful cast/reveal-lock → `next`. Hits 100% of ultimate uses.
- Impl report claim "DOM prompt (#bossPrompt) is untouched during chain" is contradicted by line 19.
- Fix: in bossUiEvents add `else if (e.type === 'ultimateEnd') bossSetCasting(false);` (or drop the `ultimate` branch entirely). Add a result-ui-free logic test is not possible; at least assert event order in a test comment/manual check.

### H2. Chain hits deal no damage — phase-3 requirement unmet, undisclosed
- Phase-03 Requirements: "Mỗi từ trong chuỗi gõ đúng → event chainHit (1 đòn sát thương bậc cao nhất trong chuỗi, không tính tốc độ)".
- js/boss-game-combo-chain.js:56-61 `bossChainHit` only increments counters + emits. Sim: HP delta after 3 chain hits = 0.
- Also no visual FX for `chainHit` (spell-art bossFxEvent has no branch; result-ui only speaks the word) → 9s of typing with no on-screen payoff except the dots.
- Not listed in phase-3 report deviations. Either implement (push pendingImpact with `T.tierBase[maxTier]`, emit a `cast`-like FX) or get explicit user sign-off to drop it.
- If implemented: boss death mid-chain becomes reachable. Current flow is safe-ish (stepBattle checks `wonAt` before `st.chain`, logic.js:168-169) but `st.chain` stays non-null after win; chain HUD would keep drawing over the win frame → clear `st.chain` when wonAt set, and decide whether ultimate still applies.

## Medium

### M1. Boss attacks while frozen (Ice Age / freeze passive) — behavior change vs old clock
- js/boss-game-logic.js:183-184: fill is gated by `!st.frozen` but the `st.threat >= 1` attack check is not. Typo/fizzle/giveup adds (`bossThreatAdd`) still apply while frozen.
- Sim: frozen, threat 0.9, one typo → `typo,bossAttack,hurt`, hearts 3→2.
- Old clock could never reach 0 while frozen, so the frozen boss never attacked. Phase-1 says "đóng băng: thanh không tăng" (only covers fill). Makes Ice Age ultimate (paid for with a full meter) leaky.
- Fix: `if (!st.frozen && st.threat >= 1)` (attack fires on unfreeze), or skip threat adds while frozen — product call; first option matches old semantics.

### M2. Slow-motion timeScale frozen during the whole 9s chain
- useUltimate may fire mid-word (timeScale easing to slowScale 0.35). stepBattle returns at logic.js:169 before the timeScale update, and nothing resets it until `bossLockFor` at chain end.
- Sim: ts before ult 0.35, during chain 0.35.
- Effect: ui.time / particles / sprite anims (boss-game-ui.js:132-134) run at 35% for 9s and `slowAmount(st)` keeps the slow-mo overlay visuals on. Also the partial `st.typed` of the interrupted word stays shown in the DOM card during chain.
- Fix: in bossStartChain set `st.timeScale = 1` (and optionally clear `st.typed`/`armedAt` there instead of at chain end).

### M3. Chain UX: chain word only on canvas; DOM card shows the old prompt; no typed feedback
- Player types into the input under a DOM card still showing the pre-ult prompt + hint; chain word drawn only at top of canvas (render.js:290-302). `bossChainKey` emits nothing on key or wrong key (combo-chain.js:41-55) → no letters progress, no shake on typo. On phones the user's eyes are on the card/keyboard.
- Plan HUD spec (bar + 3 dots) is met literally, but plan open question #3 (iPhone 9s) makes this worse. Recommend rendering chain word + typed progress in #bossPrompt (emit `chainKey`/`chainTypo` events).

### M4. Chain HUD overlaps top HUD on narrow screens
- render.js:291: bar x = w/2 ± min(130, 0.3w) at y 34–42, title at y 28. At w=360: bar 72..288; left HUD panel 6..~212 (206 with combo) and right HUD panel from ~173, both spanning y 6..40–46 → bar and title draw over hearts/ult cells/boss name. Desktop (w≥~800) fine. Verify at the 3 fit sizes of game-viewport-fit.js.

### M5. Phantom test for "typo'd cast keeps combo"
- tests/boss-game-combo-chain.test.js:32-36 asserts `st.combo >= 1` — passes even if a typo'd cast wrongly increments (2). Should assert `equal(st.combo, 1)` and that `dog` was actually cast (event present).

## Low

- L1. Small word pool: bossChainWords (combo-chain.js:24-31) returns n-1 words. 1 group → 0 words: chain HUD shows empty "CHUỖI NIỆM · ", player waits 9s, k=0.5 guaranteed. ≤3 groups → max 2 hits, "HOÀN HẢO" unreachable. bossBattleGroups only guarantees ≥1 group (boss-game-ui.js:25). Allow repeats (wrap including st.group) when n<4, or end chain immediately when words empty.
- L2. Threat ≥1 via giveup/fizzle triggers attack only after revealMs lock (1.2s), not "stepBattle kế" as phase-1 wording says; test threat-gauge.test.js:98 encodes the delay. Consistent with lock semantics — just document in phase file.
- L3. Threat bar drawn outside the monster `lift` translate (render.js:308-311) and still drawn after boss death/won frame. Cosmetic.
- L4. Pre-layout `fx.layout.mon` has no `k` (spell-art.js:17) → NaN y → nothing drawn; harmless, no throw.
- L5. Docs stale: README.md:121 "Shift+Enter khi đủ Nộ" (now thanh tuyệt kỹ + chuỗi niệm); docs/system-architecture.md:39 still describes "đồng hồ … Nộ" and lacks the 2 new modules; combo/chain not described in README.
- L6. Coverage lost: old test "clock does not run during ultimate cutscene lock" replaced by a chain-only variant; cutscene-lock threat freeze now only implicitly covered by the generic lock test.
- L7. Process: plan.md gate "hết phase 2 → user chơi thử… rồi mới làm phase 3" was skipped (phase-3 report says no gate requested). Balance (threatDrain etc.) and 9s chain unreviewed on device.

## Acceptance criteria check
Phase 1
- [x] threat fill rate 1/(clock+clockAdd)×timeScale; clockMul unread; drain on castComplete; typo/giveup/fizzle adds; shield/heart; tornado → 0; BOSS_TUNING numbers; API unchanged; tests rewritten not deleted.
- [~] "đóng băng: thanh không tăng" — fill yes, but attack still fires while frozen (M1).
- [x] Bar under monster, red >0.75, shake >0.9 off when reduced, ice color; old clock removed; angry = threat>0.88.
- [ ] Manual feel check (~10s idle) — quantitative test only.
Phase 2
- [x] lock = impactMs + afterImpactMs[tier]; `next` after lock; keys in lock ignored (no typo); wonAt not delayed; 40-cast sim ≤25s.
- [~] is-casting UI works for casts but sticks after ultimate (H1).
- [ ] Visual check 5 elements × 3 tiers; user gate — not done.
Phase 3
- [x] combo +1 only typos===0, reset on hurt/giveup/fizzle, shield no reset; mul min(1.5, 1+0.05·combo) via spellDamage o.combo; ult 10, +1/+2, giveup −2; st.rage→st.ult; activation guards; chain 3 words, 9s real time, threat + DoT frozen, typo no fizzle/threat, giveup ignored, pause shifts `until`, factor 0.5/1/1.5, per-element k effects; k=1 ≡ old (tests verified); cutscene after chain; COMBO HUD hidden <2; 10 cells; chain bar + 3 dots; tier3 FX scales by k; HOÀN HẢO in cutscene.
- [ ] chainHit deals damage (H2) — missing.
- [~] chain words "không lặp đề đang hiện" OK, but <3 words on small pools (L1).
- [~] Chain mode visuals incomplete/overlapping (M3, M4); slow-mo leak (M2).

## Caller walk (regression check)
- createBattle: fields threat/threatSec/combo/ult/chain added; clock/clockMax/rage removed; all readers updated (render, sprite-actors, ui ult button). OK.
- typeKey/submitTyped/giveUp: chain short-circuit before bossCanAct — safe since no pending impacts/lock can exist while chain active (chain only starts when unlocked). OK.
- castComplete: combo mul computed before increment (first clean cast ×1) — reasonable; boost stacking unchanged.
- stepBattle: order impacts → wonAt → chain → lock → armed → slow → freeze/fill/attack → burn. Won/lost flow intact; lost impossible mid-chain (threat frozen); won impossible mid-chain today (no chain damage, burn frozen).
- pause/resume: chain.until shifted; frozenUntil shifted; keys ignored while paused in both paths. OK.
- useUltimate: returns bool as before; ui.js:90/105 callers unchanged.
- result-ui: `ultimate` branch → H1. persistBattle/showBossResult read only dealt/phase/log/miss — unaffected.
- tier3 fx: `e.k || 1` fallback; hit count shared with boost count. OK.

## Recommended actions
1. Fix H1 (clear is-casting on `ultimateEnd`).
2. Implement chain-hit damage + FX or get user sign-off to drop (H2); handle win mid-chain if implemented.
3. Gate attack on `!st.frozen` (M1); reset timeScale at chain start (M2).
4. Chain word + typed progress in DOM card; fix narrow-screen overlap (M3, M4).
5. Tighten phantom combo test (M5); handle small pools (L1); refresh README/system-architecture (L5).
6. Run the skipped device play-test gate before phase 4.

## Metrics
- Tests: 492 pass / 0 fail. No lint/typecheck configured (vanilla JS).
- Render/UI paths (render.js, result-ui.js, tier3 fx) have no automated coverage — H1/M2/M4 slipped there.

## Unresolved questions
1. Is dropping chain-hit damage an intentional scope cut? Not in any report.
2. Frozen boss attacking on typo — desired pressure mechanic or bug? (Recommend bug.)
3. Does the threat bar fit under the monster at all 3 viewport sizes (feet near canvas bottom)? Needs visual check.

Status: DONE_WITH_CONCERNS
Summary: Logic core, registration, versioning, contracts and k=1 equivalence verified (492 tests green); but the prompt card stays hidden after every ultimate (H1, regression) and chain hits deal no damage (H2, unmet requirement).
Concerns/Blockers: H1 must be fixed before shipping; H2 needs implementation or explicit user sign-off; M1 frozen-boss attack and M2 slow-mo leak are behavior regressions worth fixing in the same pass.

---

## Re-review (2026-09-25, after fixes report fullstack-developer-260925-1025)

Scope: boss-game combo-chain/logic/result-ui/tier3-fx/render, app-storage, sw, README, docs, tests. TTS files ignored as instructed.
Verification: `node tests/run-tests.js` → 531 passed / 0 failed. Reran original scratchpad VM repro + new sims (death mid-chain, unfreeze attack, timeScale, burn during chain).
Line counts: logic 200, sprite-actors 199, combo-chain 141, result-ui 152, tier3-fx 142, render 157; only spell-presets 225 (pre-existing). OK.
Version: APP_VERSION `2.21.1` = CACHE `lingobrain-v2.21.1`. OK.

### Fix verification
| Finding | Result | Evidence |
|---|---|---|
| H1 prompt stuck after ultimate | RESOLVED | Events still end `…ultimate,ultimateEnd` (no `next`, by design); result-ui.js:32 now `ultimateEnd → bossSetCasting(false); renderBossPrompt(ui)`. Only `next=false` lock caller is bossApplyUltimate, always paired with `ultEnd=true` (grep-verified). |
| H2 chain hits deal no damage | RESOLVED | combo-chain.js:74-86. Sim: 1 hit at combo 10 → 17 dmg (tier1 × dmgMul × 1.5 combo, speed 1). Kill on word 1 → `hp 0, chain null, wonAt=now+900`, then `won` next steps; `ultEnd false`, no `ultimate`/`chainEnd`, `boost null`. Post-death key/Enter/giveUp/useUltimate all no-op (chain null → bossCanAct sees wonAt). |
| M1 frozen boss attacks | RESOLVED | logic.js:184 `!st.frozen && st.threat >= 1`. Sim: frozen + typo → threat 1.00, no attack; at unfreeze frame → `unfreeze,bossAttack,hurt`. |
| M2 slow-mo during chain | RESOLVED | bossStartChain sets `timeScale = 1`. Sim 0.35 → 1. |
| M3 chain word only on canvas | RESOLVED | `chainStart/chainKey/chainTypo/chainHit` drive #bossPrompt via renderBossChainPrompt (textContent/esc used — no XSS); typo shakes card. |
| M4 HUD overlap | RESOLVED (top HUD) | bossChainHudLayout y=74 (title ~61–68) below top HUD bottom 46 at all widths. |
| M5 phantom test | RESOLVED | exact `combo === 1` + asserts `dog` cast. |
| L3 bar after win | RESOLVED | render.js:140 gated on `phase === 'play'`. |
| L5 docs | RESOLVED | README/system-architecture no longer describe boss clock/Nộ; new modules listed. |
| L1, L2 | OPEN by user decision | unchanged. |

### New findings from the fix pass (no Critical/High)

**N1 (Medium) — chain-hit FX is a copy of the impact branch and skips actor reactions + kill dissolve.**
- tier3-ultimate-fx.js:55-64 duplicates spell-art.js:57-67 line-for-line (DRY). Because the chain emits `chainHit` not `impact`, `bossActorEvent` (sprite-actors.js:50-63) never runs: no monster flash/recoil/Hit-sheet anim, no per-element impact sprite VFX (Explosion/Thunder…), and on a killing chain hit no immediate `bossMonsterDissolve` — monster stands until `won` 900ms later (normal kill dissolves at impact).
- Fix (simpler + removes 10 lines): in bossChainHit also `bossEmit(st, 'impact', { dmg: real, tier: c.tier, hp: st.hp })` and delete bossFxChainHitEvent + its result-ui hook. `fx.shots` is empty during chain (lock guaranteed all prior impacts landed), so spell-art's `shots[0]` path falls back to preset correctly. Check no logic consumer counts `impact` events (tests may assert event lists).

**N2 (Low) — last chain word's final letter never rendered.** bossChainHit on the last word (and on kill) nulls `st.chain` before bossUiEvents runs; renderBossChainPrompt returns early on `!c` (result-ui.js:69), so the card freezes at e.g. `be_` until the cutscene hides it / win screen. Cosmetic.

**N3 (Low) — chain letter progress always against `answers[0]`.** renderBossChainPrompt uses `g.answers[0]` while bossChainKey accepts any answer; for multi-answer groups (south/southern, synonyms) typing the other answer shows mismatched letters. Normal path picks index via `targets.findIndex`; mirror that.

**N4 (Low) — chain hits bypass impact-side passives.** No `st.log` entry, no burn refresh (`m.burn`), no `freezeChance` roll (those live in bossApplyImpacts). Consistent with "1 immediate hit, no new rule" choice and harmless (DoT frozen during chain anyway), but note for phase-4 auto-trigger skills that hook "on impact" — chain hits won't trigger them unless routed through the same path (another reason for N1's `impact` event, though N1 alone won't apply passives since those are in bossApplyImpacts).

**N5 (Low) — chain HUD now sits over the monster head on narrow canvases.** At w=360 bar spans x 72–288, y 61–102; monster at x≈252 with head clamped just below top HUD → overlap during the 9s chain. Transient, readable; verify on device. Canvas title now duplicates the DOM card text (M3) — could be dropped to shrink the overlay.

### Regression walk (fix pass)
- Combo × chain: chain hits use current combo mul, don't increment combo or ult; combo not reset by chain; OK and consistent.
- won flow: wonAt set identically to normal path; stepBattle checks wonAt before chain (logic.js:168-169); pendingImpacts empty during chain; burn nulled; pause during end delay shifts wonAt. OK.
- M1 semantics: threat can exceed 1 while frozen (typos accumulate), one attack on unfreeze resets to 0; render clamps. Accepted.
- DOM restore: ultimateEnd re-renders `st.group` with `st.typed=''` (set in bossApplyUltimate); hint preserved via ui.hint. OK.
- Contracts: logic exports unchanged; combo-chain exports extended only. Sync/SM-2 untouched.

### Re-review verdict
All High/Medium findings from the first review resolved and verified by repro; no new Critical/High. N1 recommended before shipping (visual parity + DRY), N2–N5 optional.

Status: DONE_WITH_CONCERNS
Summary: H1, H2, M1–M5, L3, L5 verified fixed (531/0 tests, VM repro confirms); death mid-chain wins cleanly with no ultimate applied; versions match at 2.21.1; all files within limits.
Concerns/Blockers: N1 (Medium) chain-hit FX duplicates impact code and skips monster hit anim / kill dissolve — emit `impact` instead. Low: N2 last-letter render, N3 multi-answer progress, N4 passives bypass (phase-4 relevance), N5 narrow-screen overlap with monster. L1/L2 open by user decision; device play-test gate still pending.
