# Phase 2: Cast pacing hold next word — implementation report

Date: 2026-09-25
Plan: `plans/260925-0913-mage-lexoria-combat-depth-skills-evolution/phase-02-cast-pacing-hold-next-word.md`

## Status
DONE (all criteria except manual visual check + user approval gate, per instructions — noted below)

## Files changed
- `js/boss-game-spell-math.js` — `BOSS_TUNING.afterImpactMs: [0, 350, 450, 600]` added next to `impactMs`; comment on intent (đuôi cố định sau va chạm, đỉnh VFX nổ, đề kế chờ hết đuôi).
- `js/boss-game-logic.js` (200 lines, unchanged count) — `castComplete`: lock changed from `bossLockFor(st, impactAt, true)` to `bossLockFor(st, impactAt + T.afterImpactMs[st.tier], true)`. Nothing else touched in this file for phase 2 (threat-fill-during-lock already blocked by existing `if (bossLocked(st, now)) return;` guard in `stepBattle`, and `wonAt`/impact processing already run via `bossApplyImpacts` *before* the lock check, so killing blow and win timing are untouched by the longer lock — verified by dedicated test, see below).
- `js/boss-game-result-ui.js` — `bossUiEvents`: `cast` event now calls new `bossSetCasting(true)`; `next` event calls `bossSetCasting(false)`. New `bossSetCasting(on)` toggles `.is-casting` on `#bossPrompt`.
- `css/paper-theme.css` — `.boss-prompt.is-casting` (opacity .55, box position:relative), `.boss-prompt.is-casting>*{visibility:hidden}` (hides tier/prompt/letters, box keeps layout height), `.boss-prompt.is-casting::after{content:"✦ đang niệm…"}` (centered overlay text). No new transition/animation added, so nothing needed for reduced-motion beyond the existing global `@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}` rule (`css/paper-theme.css:33`) which already applies since this is a static opacity/visibility state (no animation of its own).
- `js/app-storage.js` / `sw.js` — `APP_VERSION` / `CACHE` bumped `2.19.0` → `2.20.0` (parity verified by `pwa-assets.test.js`).
- `tests/boss-game-logic.test.js` — updated 3 pre-existing tests whose literal timing constants assumed the old (pre-afterImpactMs) lock end, plus a new describe block `boss logic — nhịp niệm (khoá = chạm + đuôi cố định afterImpactMs)`:
  - Updated: "phím trong khoá bị bỏ; đề kế readyAt = lúc hết khoá" (270 → 620), "phím tới đúng lúc hết khoá" (275 → 625), "Nộ +1 mỗi phép… tuyệt kỹ Lửa" (useUltimate/run/type timestamps shifted 400/1900/2000 → 650/2150/2200 so the ultimate call happens after the now-longer tier-1 cast lock, matching the pre-existing intent of "act right after the word already advanced").
  - New (red→green, per Implementation Steps §2): per-tier (1/2/3) "không có next trước chạm+đuôi; có next ngay sau mốc"; "thanh tấn công không đổi trong khoá niệm" (bậc 3, longest tail); "phím gõ trong khoá không tạo typo/key"; "wonAt = chạm + endDelay, không cộng thêm đuôi khoá" (kill shot not delayed by the tail); simulation test over 40 casts (12/16/12 tier 3/2/1, matching `tierShare` 30/40/30 exactly) summing `afterImpactMs` per actually-cast tier.

## Simulation result (non-functional requirement)
Measured added time over 40 casts (12×✦✦✦ + 16×✦✦ + 12×✦, matching `BOSS_TUNING.tierShare`): **18 600 ms (18.6 s)**, ≤ the 25 s budget. Test asserts `added <= 25000` and fails loudly with the actual number if a future tuning change violates it.

## Tests
- `node tests/run-tests.js`: **469 passed, 0 failed** (baseline after phase 1 was 462; +7 net: 3 tests updated in place — not counted as new — +7 new cases: 3 per-tier next-timing + threat-frozen-in-lock + no-typo-in-lock + wonAt-not-delayed + 40-cast simulation).
- `pwa-assets.test.js` green (CACHE == APP_VERSION, asset parity).
- `wc -l js/boss-game-*.js`: all ≤ 200 except pre-existing `boss-game-spell-presets.js` (225, untouched, out of scope per instructions).

## Requirement-by-requirement check
- Lock after cast = `impactMs[tier] + afterImpactMs[tier]` — done in `castComplete`.
- `next` fires only after lock — unchanged mechanism (`bossLockFor(..., true)` + `bossEndLock`), now firing at the later mark; covered by 3 new per-tier tests.
- Threat doesn't fill during lock — pre-existing guard (`if (bossLocked(st, now)) return;` before `bossThreatFill`), reverified with a bậc-3 (longest 600ms tail) test.
- Keys during lock ignored, no typo/key — pre-existing (`bossCanAct` returns false while locked, `typeKey` returns early before any `bossEmit`) — reverified with dedicated test.
- Impact still at `impactMs` (unchanged); `wonAt` not delayed — `bossApplyImpacts` (impact + win-flag set) always runs *before* the lock check in `stepBattle`/`bossCanAct`, so `impactAt`/`wonAt` timings are untouched by the new tail; new test asserts `wonAt === impactAt + endDelayMs` exactly, no `afterImpactMs` term.
- UI `.is-casting` on cast, removed on next, dimmed + "✦ đang niệm…" — done in `boss-game-result-ui.js` + CSS.
- Reduced-motion respected — no new animation/transition introduced; relies on existing blanket reduced-motion rule.
- Version bump matching `APP_VERSION`/`CACHE` — done, 2.20.0.
- Regression gate `node tests/run-tests.js` green including `pwa-assets` — done.
- File ≤200 lines — done (see wc -l above).

## Not done (explicitly per task instructions)
- Step 5 "Xem bằng mắt 5 hệ × 3 bậc, chỉnh `afterImpactMs`" — skipped (headless environment, no manual play). Numbers used are exactly the plan's stated defaults `[0, 350, 450, 600]`, flagged by plan itself as "chỉnh sau cổng duyệt".
- Step 7 "Cổng duyệt: user chơi thử máy thật" — skipped per instructions; this is the plan's explicit gate before phase 3, still pending real-device approval.
- Success criteria bullet 1 ("không đề mới nào hiện khi phép còn bay hoặc chưa qua đỉnh nổ, kiểm bằng mắt") — not visually verified; covered instead by the equivalent quantitative per-tier lock-timing tests.

## Deviations from phase file (all within stated intent)
- None beyond the 3 pre-existing test timing updates required by the new (larger) lock window — these are mechanical re-timings of literal constants, not behavior changes; the assertions and their intent are unchanged.

## Open questions
None blocking. `afterImpactMs` values are the plan's stated defaults pending the real-device approval gate (plan.md "Cổng duyệt" after phase 2).
