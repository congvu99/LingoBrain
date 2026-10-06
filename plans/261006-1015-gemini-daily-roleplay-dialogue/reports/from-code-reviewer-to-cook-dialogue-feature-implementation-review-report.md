# Code review: Gemini daily roleplay dialogue (uncommitted working tree)

## Scope
- Server: server/dialogue-routes.js, server/gemini-dialogue-provider.js, server/dialogue-content-validator.js, server.js, server/auth-and-sync-routes.js, server/request-guards.js, server/tts-routes.js, server/schema.sql
- Client: js/dialogue-word-match.js, js/daily-dialogue-word-picker.js, js/daily-dialogue-api-client.js, js/daily-dialogue-roleplay-ui.js, js/app-shell.js, js/daily-plan.js, js/home-today-screen.js, js/sync-merge.js, js/app-storage.js, sw.js, index.html, css/paper-theme.css
- Tests: 4 new test files + run-tests.js/html, sync-merge.test.js
- ~1040 new LOC + ~150 changed
- Verification: read all files; ran a vm/Node sim of `createDialogueRoutes` with a fake pool (scratchpad) to check quota races

## Overall
Solid implementation; most red-team decisions are in the code: 501 before auth, inflight set synchronously before any await, conditional UPSERT, abort on deadline, socket-destroyed check before the Gemini call, textContent-only rendering, user-tied cache, a separate recorder, render-time t6 fallback, `talk` allowlist, `#homeExtra` assigned once. No XSS found. No regressions found in review/game/TTS/mediaRec/sync. CRLF is preserved in every touched file. No top-level name collisions. Tests: **803 passed, 0 failed**.

Remaining problems: one quota race (AC violated, reproduced), one Gemini-output-budget risk, and a few client edge cases.

## Critical
None.

## High
**H1. `maxOutputTokens: 2048` + `thinkingLevel: 'low'`: output may get truncated, which ends as 503.** server/gemini-dialogue-provider.js:22-23
- The plan sized 2048 tokens with thinking OFF (`thinkingBudget: 0`). With thinking 'low', the thinking tokens are counted in the output cap. A 14-turn dialogue has en + vi + hintVi per turn, and Vietnamese tokenizes heavily: roughly 90-110 tokens/turn, so about 1.4-1.6k tokens of JSON. That leaves about 400-600 tokens for thinking.
- Failure: finishReason MAX_TOKENS gives truncated JSON → `INVALID` → retry → same result → 503. The 6 attempts/24h get burned, and the user sees "Không tạo được hội thoại".
- Diagnosis is also hard: when the text is non-empty but the JSON is broken, the log only says "gemini JSON hỏng" without finishReason (line 44).
- Fix: raise to 4096-8192, which only costs tokens actually used. Add `finishReason` to the INVALID error message. Verify with a real key on a 14-turn, 8-word case. (Not verified empirically; no key available.)

## Medium
**M1. Per-user 24h quota can be bypassed with parallel requests on different `day` values. Reproduced.** server/dialogue-routes.js:101-123
- The `inflight` key is `userId|day`, so requests for yesterday/today/tomorrow each run the `mine` SUM check at the same time. The conditional UPSERT is per row (`gen_count < 3`), not per user.
- Sim: 2 generations, then 3 parallel `regenerate:true` requests for d-1/d/d+1 → all 200, **5 successes in 24h** (AC: "lượt thứ 4 trong 24h (kể cả đổi day) → 429"). The ceiling is the RAM attempts limiter (6), so cost is at most 2× the quota.
- Fix (smallest): serialize the quota check and generation per user, not per day. For example, a per-user chain `userLock.get(userId)` awaited before the `mine` query, while keeping the `userId|day` inflight for joining. Alternative: `pg_advisory_xact_lock(userId)` plus re-checking `mine` inside the same tx as the UPSERT.

**M2. `onDialogueDone` checks `day.done` BEFORE `rollDay()`, so after midnight with a stale `day`, t6 is not ticked.** js/daily-plan.js:44-46
- Scenario: t6 was ticked yesterday, and the app stays open past midnight without a re-render that calls `rollDay`. The user finishes a dialogue at 00:30. `plan.find(... !day.done[x.id])` reads yesterday's `done` → finds nothing → returns, and today's t6 is not ticked (AC "t6 được tích đúng ngày").
- Fix: call `rollDay();` as the first line of `onDialogueDone`.

**M3. Mic leak when ⏺ is tapped twice while waiting for getUserMedia.** js/daily-dialogue-roleplay-ui.js:184-194
- `dlg.rec` is only set after `await dlgStartMic()`. A second tap during the permission prompt or slow getUserMedia opens a second stream. Then `dlg.rec = rec` overwrites the first handle, and the first stream's tracks are never stopped: the mic indicator stays on until reload.
- Related: if `new MediaRecorder(stream)` throws (line 172), the stream that was already acquired also leaks its tracks.
- Fix: set a `dlg.micPending` guard, or ignore taps while pending. In `dlgStartMic`, wrap `new MediaRecorder` in try/catch and `stopTracks()` before rethrowing.

## Low
**L1. A late `regenerate:false` duplicate can trigger a 2nd generation.** server/dialogue-routes.js:103-110
- Request B's SELECT runs (no row yet) while A is finishing. A then UPSERTs and deletes its inflight entry before B checks `inflight.get` → B starts a new generation, gen_count 2, and one quota is lost.
- The window is milliseconds wide (I could not hit it with sim timing), but it is the double-tap/2-tab AC.
- Fix: for `!body.regenerate`, use `INSERT ... ON CONFLICT DO NOTHING RETURNING`. If no row comes back, SELECT the existing row and return it as a cache hit instead of incrementing.

**L2. Gemini call is wasted when the row is already at cap and was updated >24h ago.** server/dialogue-routes.js:117-121
- A row for the ±1 day with `gen_count=3` and `updated_at` 25h ago is not counted in `mine`. So generation runs, then the UPSERT `WHERE gen_count < 3` fails → 429 after a Gemini call.
- Fix: before the inflight block, add `if (row && body.regenerate && row.gen_count >= perUserMax) return 429`.

**L3. Cache saved under the user at response time, not at request time.** js/daily-dialogue-roleplay-ui.js:36
- `fresh.user = dialogueUser()` is evaluated when the response arrives. If user A logs out and B logs in during the 5-25s request, A's dialogue is saved as B's.
- Fix: capture `const user = dialogueUser()` before the request.

**L4. `validateDialogue` trusts every Gemini-declared id.** server/dialogue-content-validator.js:113-114
- The plan says to add a declared id "nếu khớp lỏng" (only if it loosely matches). The code trusts all declared ids unconditionally, so a hallucinated `ids` entry hides a word from `missing`. This affects reporting only.

**L5. Back-compat edge: plans created on the new client vs an old cached client (2.25).**
- A 2.25 client strips `act:'talk'` via its own `cleanPlan`. If it ever pushes the plan back and wins the ts merge, t6 ends up with no `act`. `isTalkTask` only falls back for `act==='add'`, so the button disappears.
- Affects only new users (DEFAULT_PLAN) who also run an old cached PWA. Optional: also treat `t.id==='t6' && !t.act` as talk.

**L6. Two toasts in a row.** js/daily-plan.js:42 + 46
- `markPlanDone`'s "🎉 Xong hết giáo án" is immediately replaced by "✅ Đã tích: …" (toast is single-slot), so the plan-complete message is never seen. `.dlg-entry` CSS is unused.

## Explicit checks
| Check | Result |
|---|---|
| (a) AC | Met, except: M1 (4th generation in 24h across days), M2 (tick on the right day after midnight), M3 (mic off when closing after a double-tap). H1 risk to the "≤25s có hội thoại" AC. |
| (b) Regressions | None found. `render()` while in stage 'dialogue' → `refreshTab()` no-op (no overdraw). The ✕ toast is now review-only (intentional, so closing a game no longer toasts). The game Esc branch runs before the dialogue branch. `withDeadline` is moved verbatim and the TTS tests pass. `mediaRec`/`startRec` are untouched. `sw.js` passes `/api/dialogue` straight to the network (`/api/` bypass, sw.js:254). |
| (c) Contracts | Additive only: `/api/dialogue`, `dialogues` table, env vars `GEMINI_API_KEY`/`GEMINI_MODEL`/`DIALOGUE_DAILY_MAX`, `eng.dialogue.v1` (not in SYNC_KEYS), `act:'talk'`. `createApi` without `dialogue` still works (GET returns enabled:false, POST returns 501). Default Cache-Control no-store comes from handleApi. |
| (d) Patterns | Guard style matches tts-routes (check, then hit, then semaphore and deadline). CRLF is consistent in all files. Globals are prefixed (`dlg*`, `dwm*`, `DIALOGUE_*`) with no collisions. `DAY` is reused from srs-scheduler. Script order is OK (`normAnswer` loads before word-match; `dialogueEnabledCached` is only called at render time). |
| (e) Correctness | Single-flight per key OK. Inflight is set before the first await. Conditional UPSERT OK. Abort timer and `withDeadline` share the deadline. The queue-expiry/socket check happens before the Gemini call. Client token + `stage` guard OK; abort happens on close. Blob URLs are revoked on turn change and close. Day handling: client dkey vs server UTC ±1 covers UTC-12..+14. 401 → message, no retry button. XSS: all LLM strings and `t.title` go through textContent (`toast` uses textContent, app-storage.js:29); `renderPlan` uses `esc`. Issues: M1, M3, L1-L3. |
| (f) Tests | `node tests/run-tests.js` → **803 passed, 0 failed** |

## Plan follow-ups
- Phase 1: code done; the "real key ≤25s" check is still open (relates to H1).
- Phase 2: code done; manual device checks (iOS Safari / Android mic, back-swipe) are still open.
- Phase 3: code items done (sync allowlist, `markPlanDone`, home button, sw/APP_VERSION). Docs are pending (deliberately deferred).

## Recommended actions
1. H1: raise `maxOutputTokens` and log `finishReason` on INVALID; verify with a real key.
2. M1: add a per-user serialization of the quota check.
3. M2: add `rollDay()` at the start of `onDialogueDone`.
4. M3: add the mic pending guard and stop tracks when the recorder constructor throws.
5. L1-L3 (cheap): handle regenerate:false with ON CONFLICT DO NOTHING, add the at-cap early 429, capture the user before the request.

## Unresolved questions
- Does Gemini 3.x Flash count `thinkingLevel:'low'` tokens against `maxOutputTokens`? Need one real call with `usageMetadata` logged.
- Is the M1 bound (≤6/24h through the attempts limiter) acceptable, rather than the strict 3 stated in the AC?
