# Code Review: /api/tts phases 1+2 (uncommitted)

## Scope
- Files: server/tts-edge-provider.js, server/tts-routes.js, server/auth-and-sync-routes.js, server/schema.sql, server.js, package.json, package-lock.json, js/speech-synthesis.js, js/review-steps-learn.js, tests/tts-routes.test.js, tests/speech-synthesis-tts.test.js
- Checks: `node --check` all 8 JS files OK; `npm test` → **526 passed, 0 failed** (local Node v24.15.0); `npm audit --omit=dev` 0 vulns
- Runtime sims (scratchpad, not repo): limiter amplification + stale-queue provider calls, both confirmed
- msedge-tts 2.0.8 dist checked: `toStream` returns `{audioStream}` synchronously (JSDoc wrong, code right), `_SSMLTemplate` inserts raw input (escape needed, done), `close()` closes current + retired sockets

## Overall
Contract, status codes, headers, normalization, client fallback/abort logic all match spec. One real abuse-amplification bug in limiter ordering, two server-timing issues. No regression found in existing routes or speak() callers.

## High

### H1. Rejected requests still burn global daily cap; 1 IP can disable TTS for everyone 24h
`server/tts-routes.js:127-129` — all three `hit()` run before any check, so a request rejected by the per-minute limiter still increments `serverDay` (and `day`).
Sim: dailyMax=100, one IP sends 120 unique sentences (apiIp allows 120/min) → attacker gets 20 real synths, 100×429, **next innocent IP gets 429**. With prod dailyMax=1000, one IP exhausts the global cap in ~9 min instead of needing ≥5 IPs at 200/day. Defeats [RT#1] intent.
Fix:
```js
if (!minute.check(ip, t)) return errRes(429, ..., { 'Retry-After': '60' });
if (!day.check(ip, t) || !serverDay.check('all', t)) return errRes(429, ..., { 'Retry-After': '86400' });
minute.hit(ip, t); day.hit(ip, t); serverDay.hit('all', t);
```
Better: hit only when this request actually starts a provider call (single-flight joiners currently also count). Add test: 120 misses from one IP, then another IP still gets 200.

## Medium

### M1. Queued work not cancelled after deadline → provider called after client already got 429
`server/tts-routes.js:133-136` — `withDeadline` rejects, but the task stays in the semaphore queue and later calls `provider.synth()`; result discarded (inflight already deleted, no INSERT). Sim: 6 unique requests, 3s synth → 2×200, 4×429 at 5s; provider calls climb 4 → 6 after the 429s. Under burst this burns Edge calls and holds both slots, so more requests hit the deadline (cascading 429). `req.destroyed` check won't catch it (server already responded; client not yet closed).
Fix: inside task `if (now() - t >= QUEUE_BUDGET_MS) { const e = new Error('queue timeout'); e.code = 'BUSY'; throw e; }` before synth. Optional: still INSERT late results so the retry is a cache hit.

### M2. Deadline starts after SELECT; INSERT + prune awaited before response
`server/tts-routes.js:122-123, 148-156` — spec says 5s from request receipt; `t` is captured after `getProvider()`, and the SELECT isn't counted. After synth, INSERT (≤300KB bytea) and every 50th insert a DELETE are awaited before returning. Pool is `max: 5`, shared with sync. Under contention SELECT + 5s + INSERT + transfer > client 6s → client aborts, plays Web Speech, and the server has done the full work anyway.
Fix: `const t = now()` as the first line of `tts()`; fire-and-forget: `pool.query(INSERT…).then(maybePrune).catch(e => log(...))` and return the audio right away.

### M3. Test gaps / phantom claims
- `tests/tts-routes.test.js:177-192` test name says "IP thật qua XFF" but doesn't assert which IP reaches the limiter. Wrap `routes.tts` to capture the `ip` arg and assert `'55.55.55.55'`.
- No test that a cache hit leaves create-limiter counts alone (the first test only switches IP). Fill minute limit, then request a cached sentence → expect 200.
- Provider: no test that `close()` runs on **success**, or that `toStream` gets the escaped text (stub should record its input).
- No test for H1/M1.

## Low
- L1 `js/speech-synthesis.js:44` — `encodeURIComponent` throws URIError on a lone surrogate. The throw happens inside the Promise executor, so speak() **rejects** (breaks "always resolves") and `pendingDone` stays stale. Fix: try/catch in `ttsUrl` → return null.
- L2 `js/speech-synthesis.js:82` — `new AbortController()` is unguarded. On browsers without it (Safari <12.1) speak() now rejects even for prebuilt MP3, which used to work. Guard with `typeof AbortController === 'function'`.
- L3 `server/tts-routes.js:104` — `Cache-Control: public` with no `Vary: X-LB-TTS`: a shared/CDN cache could serve the MP3 to header-less requests. It's cache-hit only (no quota burn) and CORP still blocks cross-origin embedding. Prefer `private, max-age=86400`.
- L4 `Retry-After: 86400` is fixed even though the window is fixed-start and may reset sooner. The generic `apiIp` 429 in handleApi has no Retry-After (contract says 429 always has it; the client ignores it, so harmless).
- L5 `tts-routes.js:143,146,156` use `console.log`, not the injected timestamped `log`. Inconsistent in server logs.
- L6 `server.js` — `+env || default` means `TTS_CACHE_MAX=0` / `TTS_DAILY_MAX=0` can't be set; `TTS_ENABLED` only honours exact `'false'`. Document it.
- L7 A 304 goes through the JSON branch of `send()` and gets `Content-Type: application/json`. Harmless.
- L8 Step 5 cap (`review-steps-learn.js:180`): 6s fetch timeout + Web Speech fallback at rate .92 on a ~100+ char sentence can go past the cap, and `stopSpeaking()` cuts off the end. Edge case only.
- L9 Scope note: every speak() of text without an MP3 (imported words in boss/fruit/word games, daily-plan placeholder) now hits the network first. A slow server can delay audio up to 6s, and fast games may hit 20 new sentences/min → Web Speech. The plan accepts this; check latency in phase 3.

## Checklist results
(a) All ACs/RT#1–15 for phases 1–2 are in code, except manual items: Bước 0 (Nhân Hòa Node/outbound), curl smoke test, browser checks. H1 weakens RT#1.
(b) Contract matches: `X-LB-TTS: 1`; 400 (empty/>200/control/`<>`/bad decode), 403, 429 + Retry-After (limit + BUSY/deadline), 501 (disabled / require fail / no tts), 502 (provider/timeout/bad MP3), 503 (existing isReady/isDbUnavailable). Cache headers are exact, with no `immutable`. Normalization is the same `\s+`→' ' + trim on both sides, and length is in UTF-16 units on both. Client pre-checks `<>` only; control chars → server 400 → one-off fallback (correct).
(c) No regression: `send()` is unchanged for string/object bodies; createApi without `tts` → 501 (test). All speak() callers (app-shell, boss-game-result-ui, story-journal, daily-plan, fruit-game, review-steps-learn, review-tests, word-game-rounds) still use prebuilt MP3 when it exists; the only difference is that an old fetch is now aborted instead of ignored (same outcome). Step-5 guards (`btn.isConnected && tab==='game' && !game && cur===w && step===5`) are intact, plus `stopSpeaking()`.
(d) Security: escapeXml applied exactly once. 403 + CORP + nosniff. Limiter keys use `ipOf(req)` (XFF hops) and `now()`. Global cap exists (but see H1). No sentence text in logs (errors log only `p` without the query; msedge error messages don't carry text) and no text column in the DB. Lazy require sits inside try in `getTtsProvider`, and static serving never touches it. The crypto polyfill is at the top of the lazily-loaded provider; it's untested on Node 18 locally (only Node 24 here).
(e) inflight delete in `.finally` ✓. `close()` in finally on success/timeout/error ✓. 5s < 6s (see M2) ✓. req-destroyed skip ✓. MP3 validated before INSERT ✓. Schema CHECK (1024..307200) = MP3_MIN/MAX ✓. Prune SQL looks like valid PG (uncorrelated scalar subquery in LIMIT, `bigint - $1`) but is **unverified against a real DB**. Schema is idempotent (`IF NOT EXISTS`) and readSchema() runs it on every start ✓. The library's `_send().then()` can produce an unhandled rejection; server.js logs it and doesn't crash ✓.
(f) Client: a newer speak aborts the old fetch without falling back (token check), while a timeout abort does fall back ✓. `stopSpeaking` resolves pending ✓. Watchdog `max(4000, 150·len/rate)` ✓. `ttsOffUntil` is set only on 501/404/405 ✓. Promise always resolves, except L1/L2 ✓.
(g) Tests are real (vm-isolated browser stubs, fake timers, fake pool/provider), with gaps per M3. 526/0.

## Recommended actions
1. Fix H1 (check-then-hit, count only real provider starts) + test.
2. M1 deadline check inside semaphore task.
3. M2 start timer at entry; fire-and-forget INSERT/prune.
4. L1/L2 one-line guards in speech-synthesis.js.
5. Add missing M3 tests.

## Plan follow-ups (no plan edits made)
- Phase 1 code steps 1–6 appear done; Step 0 and step 7 (curl) not verifiable here.
- Phase 2 steps 1–6 appear done; browser success criteria pending.
- Phase 3: sw.js/app-storage version bump needed so clients pick up the new speech-synthesis.js.

## Unresolved questions
- Prune query + schema not run against real Postgres here — run once on staging DB?
- Target Node on Nhân Hòa (18 vs ≥19) still unknown → polyfill path untested.

Status: DONE_WITH_CONCERNS
Summary: Contract/regression/security items largely correct, 526/0 tests pass; one High limiter-ordering bug lets a single IP exhaust the global daily cap, plus two Medium server-timing issues.
Concerns/Blockers: H1 should be fixed before deploy; prune SQL unverified on real PG.
