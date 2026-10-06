# Review: usefulness prompt + Google 429 (QUOTA) handling — uncommitted diff

Scope: server/dialogue-prompt-builder.js (new), server/gemini-dialogue-provider.js, server/dialogue-content-validator.js, server/dialogue-routes.js, server.js, js/daily-dialogue-word-picker.js, tests/{dialogue-content-validator,dialogue-routes}.test.js, tests/run-tests.js. Docs/html ignored.

Tests: `node tests/run-tests.js` → 810 passed, 0 failed, exit 0, ~5s.

## High

### H1. QUOTA still burns the user's in-RAM attempt slots + IP slots; fast-fail during 10-min block makes it worse
- dialogue-routes.js:118-121 hits `attempts` (limit perUserMax*2 = 6 / 24h), `ipMinute`, `ipDay` BEFORE generate. QUOTA (route :139) does not refund.
- Provider comment gemini-dialogue-provider.js:4 claims "không đốt lượt thử của người dùng" — false: it saves a Google call, not the user's attempt.
- Scenario: Google free tier exhausted → every tap within the 10-min block returns 429 instantly (provider :61-62). User taps "thử lại" 6 times → `attempts` full for 24h → after Google quota resets, user gets "Thử tạo quá nhiều lần" for the rest of the day despite 0 successful generations. Same for shared IP (ipDay 30).
- Test tests/dialogue-routes.test.js:144-149 only asserts DB rows=0, not attempts budget — phantom "không tốn lượt".
- Fix (pick one): (a) provider exposes `quotaBlocked()` (true when every model's blockedUntil > now); create() checks it before `attempts.check/hit` and returns the QUOTA 429 without consuming; or (b) add `unhit(key)` to createRateLimiter and refund attempts/ipMinute/ipDay when e.code === 'QUOTA'. (a) covers the fast-fail case, (b) also covers the first real 429. Add test: N QUOTA responses then success still allowed.

## Medium

### M1. Candidate rotation: consecutive days share 2 of 3 cards; regeneration groups collide with later days
- dialogue-prompt-builder.js:57-62. dayHash of 'YYYY-MM-DD' changes by +1 per day within a decade-of-day (verified):
  - 2026-10-06 → 5,6,7 | 2026-10-07 → 6,7,8 | 2026-10-08 → 7,8,9
  - day d, n=1 == day d+3, n=0.
- Old pickScenario had same +1 drift but with 1 card it still changed daily. Now Gemini picks "best fit" among a 1-card-shifted window → likely the same scenario 2-3 days running; defeats the 20-card variety goal. Also month start/decade jumps make some cards rare.
- Fix: derive a day index and stride coprime with 20 larger than CANDIDATES, e.g. `const d = Math.floor(Date.parse(day + 'T00:00:00Z') / 86400000); const start = d * 7 + (n || 0) * CANDIDATES;` (7 coprime with 20 → full cycle, consecutive days disjoint). Or shuffle SCENARIOS with a seeded permutation per week. Add test: pickScenarios(d,0) ∩ pickScenarios(d+1,0) = ∅.
- Within-day wrap: n ≤ perUserMax-1 = 2 → offsets 0..8 < 20, no intra-day repeat. OK.

### M2. 10-min block on any 429 — over-reacts to per-minute (RPM) limits
- gemini-dialogue-provider.js:38. Google 429 covers both RPM and RPD; body carries `error.details[].retryDelay` (RetryInfo). With sem=2 concurrency, two quick requests can trip RPM → feature dead 10 min for everyone, plus H1 attempt burn.
- Fix: parse retryDelay (bounded, e.g. min 30s, max 10 min) and use it for blockedUntil and route Retry-After; fall back to 10 min when absent. Route Retry-After is hardcoded '600' (dialogue-routes.js:139) even when block remaining is shorter — return remaining via e.retryAfterSec.

## Low (informational, no action required)
- gemini-dialogue-provider.js:38 429 body never consumed; undici keeps socket until GC. Same pre-existing for !res.ok. `res.body?.cancel?.()` optional.
- After all models blocked, QUOTA throws inside sem.run (route :62) — negligible cost.

## Verified OK
- Circular require: prompt-builder requires nothing; validator → prompt-builder; provider → prompt-builder + validator; routes → validator + prompt-builder. No cycle.
- QUOTA vs abort: fetch reject with aborted signal → BUSY (:35) before status check; 429 only when response actually received. Fallback reuses same body/signal → same deadline; if aborted between, fetch throws → BUSY. Fallback non-QUOTA errors propagate (INVALID still retried by route; retry skips blocked main). Both models 429 → QUOTA. Correct.
- Route retry loop only catches INVALID (:72) → QUOTA propagates, calls=1, no INSERT. Correct.
- blockedUntil: `!(get(m) > now())` → unblocked when unset or expired; strict >, test covers expiry at +1ms. `now` default Date.now; injected for tests. Fine.
- Prompt injection: learner from env only, cleanText ≤300 strips < > / control chars; words from DB (unchanged trust from prior review). LLM output still goes through validateDialogue. OK.
- Response shape unchanged (ok() :44; validateDialogue output unchanged). Exports removed from validator (SCENARIOS, RESPONSE_SCHEMA, TURNS_*, pickScenario, buildPrompt) — only consumers were provider/routes/tests, all updated (grep).
- WORDS_MAX 6 server / client default 6: only caller js/daily-dialogue-roleplay-ui.js:10 uses default. Older cached clients sending 8 ids still OK (IDS_IN_MAX 50, server slices to 6).
- dailyMax default 10 in both server.js:26 and createDialogueRoutes. Tests pass dailyMax explicitly where it matters (suite green).
- Runner (tests/run-tests.js:59-79): timer cleared in finally; process.exit at end so stray timers from tests (withDeadline, route `timer`) cannot keep process alive; all are cleared anyway. Exit guard only fires on code 0 without report → correct; process.exit(1) / uncaught errors unaffected. Hanging test now costs 10s and fails instead of silent exit 0. No behavior change for current suite (exit 0, 5s).

## Recommended actions
1. H1: refund or pre-check QUOTA so the user's attempt/IP budget is not consumed; fix comment; add test.
2. M1: change rotation stride; add disjoint-consecutive-days test.
3. M2 (optional): honor Google retryDelay; dynamic Retry-After.

## Unresolved questions
- Is the free-tier 429 seen in practice RPD or RPM? Decides whether M2 matters.

Status: DONE_WITH_CONCERNS
Summary: Suite green (810/0); QUOTA/abort/fallback flow and module graph correct. One High (QUOTA consumes user attempt + IP budget, can lock users out 24h) and rotation overlap across consecutive days (Medium).
