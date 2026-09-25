# Red Team Plan Review: Assumption Destroyer (neural-tts-api-for-typed-sentences)

Scope: plan.md + phase-01..03. Checked against the repo and against the msedge-tts@2.0.8 tarball (fetched with `npm pack` into the scratchpad and grepped).

## Finding 1: msedge-tts 2.0.8 uses global `crypto`, which Node 18 does not have. The plan's "Node >=16" claim is false
- **Severity:** High
- **Location:** plan.md:31 ("v2.0.8, Node ≥16"). Phase 1 Architecture (provider).
- **Flaw:** In 2.0.8, `dist/MsEdgeTTS.js:251` calls `crypto.subtle.digest('SHA-256', data)` and `:452` calls `crypto.getRandomValues(arr)`. Both use the global `crypto`, with no `require('crypto')` (the imports at `:30-37` are axios, isomorphic-ws, buffer, stream, fs). Global `crypto` only became available without a flag in Node 19+. The package's `engines: >=16` is wrong, and the plan copied it.
- **Failure scenario:** The runtime is Node 18. The repo allows that: `package.json` has `engines.node >=18`, and `docs/deployment-guide.md:3` says "Node.js 18+". There, every `setMetadata` call hits `ReferenceError: crypto is not defined` while building the Sec-MS-GEC URL. The result is 100% 502s. The local check in Phase 1 step 2 passes anyway, because the dev machine runs Node v24.15.0 (`node -v`), so the failure only shows up after deploy.
- **Evidence:** msedge-tts-2.0.8.tgz `package/dist/MsEdgeTTS.js:251,452`. `npm view msedge-tts engines` → `>=16.0.0`. `D:\project\eng\package.json` engines `>=18`. `D:\project\eng\docs\deployment-guide.md:3`.
- **Suggested fix:** Pick one. (a) Raise `engines` to `>=20` and document the Nhân Hòa Node version in phase 3. (b) At the top of the provider add `if (!globalThis.crypto) globalThis.crypto = require('crypto').webcrypto;`. Either way, add a phase 3 check: run `node -v` on the host.

## Finding 2: A 503 from overload or startup turns TTS off on the client for the whole session
- **Severity:** High
- **Location:** Phase 1 Contract (line 18) and Requirements (line 23: "hàng đợi 10 (quá → 503)"), Architecture line 34 (`BUSY → 503`). Phase 2 Requirements line 17 (`503 → ttsOff = true` for the session).
- **Flaw:** The contract gives 503 to four conditions: permanent ones (no DB, `TTS_ENABLED=false`) and transient ones (semaphore BUSY, DB not ready yet, DB blip). The client treats every 503 as permanent.
- **Failure scenario:** Transient 503s come from three places:
  - The DB is still retrying schema creation after a deploy: `handleApi` returns 503 at `auth-and-sync-routes.js:120`.
  - The pool times out: `isDbUnavailable` → 503 at `:130`.
  - 12 users type sentences at the same time: the semaphore queue overflows → 503.
  
  Each client that gets one sets `ttsOff` and uses the robotic Web Speech voice until reload. PWA sessions can last days, and since `pwa-register` only reloads when idle, that is effectively permanent. This undoes the feature's purpose exactly at peak load or right after a deploy.
- **Evidence:** `server/auth-and-sync-routes.js:120`, `:130`. `server/request-guards.js:52` (BUSY). The plan lines above.
- **Suggested fix:** Separate permanent from transient in the contract. Permanent: TTS disabled or no DB → 404 or 410, or a 503 with body `{error, off:true}`. BUSY and not-ready → 503 with `Retry-After`, which the client treats as a one-off fallback. Alternatively, the client sets `ttsOff` only on 404/405 or an explicit `off` flag, and adds a time-based retry (for example after 5 minutes).

## Finding 3: XML escaping must be mandatory. The library does not escape, so SSML injection is possible
- **Severity:** High
- **Location:** Phase 1 Architecture line 27 ("Text escape XML … nếu thư viện không tự làm").
- **Flaw:** The escaping step is conditional, but this has already been checked. `_SSMLTemplate` (2.0.8 `dist/MsEdgeTTS.js:279`) inserts `${input}` directly inside `<prosody>`. The README says: "Make sure to escape/sanitize your user's input!" The plan's validation (1–300 chars, no control chars) lets `<`, `>`, and `&` through.
- **Failure scenario:**
  - Anyone (the route is public, no login) sends `?text=<break time="10s"/>` repeated about 16 times in 300 chars. Each request produces minutes of silent MP3. That is stored as bytea, about 5000 rows × MBs, so the `TTS_CACHE_MAX` estimate of "≈100MB" breaks.
  - `</prosody></voice><voice name="…">` switches the voice.
  - Any legitimate sentence containing `&` (for example "rock & roll") produces invalid SSML → provider error → 502. The server burns the rate-limit slot, and the user gets Web Speech.
- **Evidence:** msedge-tts-2.0.8 `package/dist/MsEdgeTTS.js:279` (`_SSMLTemplate`), `:366-367` (`toStream` → `_SSMLTemplate(input)`). README https://github.com/Migushthe2nd/MsEdgeTTS ("escape/sanitize").
- **Suggested fix:** Make escaping a required step, applied in the provider after the key is computed on the raw normalized text. Add a test: `"a & b <c>"` → the provider receives `a &amp; b &lt;c&gt;`. Add a byte cap on the Buffer (for example 2MB) before INSERT.

## Finding 4: Provider lifecycle. `setMetadata` opens a WebSocket with no timeout, and "new instance per call" leaks sockets on success
- **Severity:** Medium
- **Location:** Phase 1 Architecture lines 27-28 ("timeout → reject + đóng"; "instance mới/lần").
- **Flaw:**
  - `setMetadata` does network I/O: it calls `_initClient()`, which calls `getSynthUrl` and opens the WebSocket (2.0.8 `:311-334`). The library has no timeout anywhere.
  - The plan describes the timeout as wrapping the stream. If the WebSocket handshake hangs (Nhân Hòa blocking outbound, or a firewall silently dropping packets), `setMetadata` never resolves.
  - On success, the socket is left open. It closes only when `close()` is called (`:341-347`) or the server hangs up. `ws.onclose` (`:191`) does not destroy the instance.
- **Failure scenario:**
  - Outbound TCP is silently dropped: each synth hangs until the OS TCP timeout (tens of seconds). The semaphore (2 slots) stays full, all queued requests get BUSY → 503, and combined with Finding 2 every client turns TTS off.
  - Normal operation: each cache miss leaves an open WebSocket to speech.platform.bing.com, and these pile up for up to 200 misses per IP per day.
- **Evidence:** msedge-tts-2.0.8 `package/dist/MsEdgeTTS.js:113-135` (`_createClient` opens ws), `:311-334` (`setMetadata` awaits `_initClient`), `:341-347` (`close`). No `setTimeout` exists in the file.
- **Suggested fix:** Wrap the whole sequence `setMetadata` → `toStream` → collect with a single `Promise.race` timeout. Put `tts.close()` in a `finally` (both success and failure). Add a test with a fake provider that never resolves, and assert 502 within the timeout. Note that the runner's async timeout is also 10s (`tests/run-tests.js`, `withTimeout`), so inject a small `timeoutMs` in the test.

## Finding 5: The phase 3 check `curl -I` sends HEAD, which the router answers with 405
- **Severity:** Medium
- **Location:** Phase 3 Implementation step 3 (line 26).
- **Flaw:** `curl -I` sends HEAD. ROUTES is keyed on `req.method + ' ' + p`, and only `'GET /api/tts'` will be registered. A path that is in PATHS but not in ROUTES gets 405.
- **Failure scenario:** After the deploy, the operator runs the documented command and gets `405 application/json`. They conclude TTS is broken, or they flip `TTS_ENABLED=false` by mistake. Separately, a phase 1 test asserts "POST → 405", which confirms HEAD will also be 405.
- **Evidence:** `server/auth-and-sync-routes.js:122-123`.
- **Suggested fix:** Use `curl -s -o t.mp3 -w '%{http_code} %{content_type}\n' "<domain>/api/tts?text=hello%20there"`, or map HEAD to GET in the router.

## Finding 6: `immutable` for a year combined with a URL that does not contain the voice makes `TTS_VOICE` impossible to change
- **Severity:** Medium
- **Location:** Phase 1 Contract line 17 (`max-age=31536000, immutable`, `ETag: "<key>"`). plan.md:29 ("env `TTS_VOICE`, đổi được"). Phase 2 line 25.
- **Flaw:** The server key includes the voice, but the URL `api/tts?text=` does not. The browser HTTP cache is keyed by URL. Because of `immutable`, the browser never revalidates, so the ETag/304 path is never reached.
- **Failure scenario:** The operator changes `TTS_VOICE`, or Andrew gets withdrawn and a replacement is chosen. Every browser keeps playing the old clip for already-heard sentences for up to a year, while new sentences use the new voice. The voice changes in the middle of a review session. The same happens if a bad clip gets cached (for example, before the escaping fix above).
- **Evidence:** Phase 1 lines 17 and 30 (`key = sha256(voice + '\n' + text)`). The route URL comes from phase 2 line 16.
- **Suggested fix:** Either add a version to the URL, `api/tts?v=<n>&text=…` (with `n` in client code and bumped along with the app version), or drop `immutable` and use `max-age=2592000` plus the ETag. If the ETag stays, it must be based on the key (voice+text) to be meaningful.

## Finding 7: The step-5 cap does not fit the time budget of 6s client timeout, 10s provider timeout, and a queue of 10
- **Severity:** Medium
- **Location:** Phase 2 Architecture line 27 (cap `min(15000, 3000 + 100·len)`), Requirements line 19 (6s timeout). Phase 1 line 23 (provider 10s, concurrency 2, queue 10).
- **Flaw:**
  - The plan assumes first-time generation takes "~1–1.5s". That number was not measured: each call does a fresh `getSynthUrl`, a WebSocket handshake to Bing from Vietnam, then synthesis. With a queue (2 concurrent, ≤10 waiting, each up to 10s), a request can wait well over 6s.
  - The client aborts at 6s and falls back to Web Speech. For a sentence under 40 chars the cap is ≤ 7000ms, so `go()` → `nextCard()` fires about 1s after Web Speech starts and cuts the sentence off. This is exactly the kind of bug the latest commit e819350 fixed ("wait for own sentence to finish speaking before advancing card").
- **Failure scenario:** A user types a 30-char sentence and saves. The server is under slight load, so the fetch reaches the 6s timeout. Web Speech starts reading, then at 6000ms the cap fires and the next card starts reading over it. The user never hears their own sentence.
- **Evidence:** `js/review-steps-learn.js:180-184` (cap + `Promise.race`). Phase 2 line 19 vs line 27.
- **Suggested fix:** Compute the cap as `clientTimeout + 1500 + 100·len`. Better: start the cap only after `player.play()` or `speakSystem` has actually started, for example by having `speak()` expose an onStart. Lower the server provider timeout to ≤ the client timeout, so the server does not keep a slot busy after the client has left.

## Finding 8: Mismatches with the existing router contract (signature, global limiter, `createApi` without tts)
- **Severity:** Medium
- **Location:** Phase 1 line 29 (`tts(req, ip)`), line 21 / plan.md:30 ("cache hit không tính rate limit"), line 37 (`createApi` "nhận thêm `tts` options").
- **Flaw:**
  - `handleApi` calls `fn(req)` with a single argument (`auth-and-sync-routes.js:126`), so the `ip` parameter will be undefined unless the call site changes. There is a risk of rate-limiting on the key `undefined`, which would become a global 20/min limit.
  - Every `/api/*` request passes through `apiIp.hit` at 120/min/IP (`:121`), cache hits included. That contradicts the promise that cache hits are not rate-limited, especially behind a shared NAT (a school lab: 30 students on one IP).
  - The existing test `tests/deck-routes.test.js:77` calls `createApi({pool,isReady,trustHops,log})` without `tts`. If `createApi` builds or requires the Edge provider by default, the test pulls in msedge-tts and its WebSocket.
  - The new limiters inside `createTtsRoutes` are not included in the sweep at `:25`.
- **Failure scenario:** The implementer follows the plan literally, and every miss is counted under `ip=undefined`. After 20 misses the whole server returns 429 for every new sentence.
- **Evidence:** `server/auth-and-sync-routes.js:25`, `:121`, `:126`. `tests/deck-routes.test.js:77`.
- **Suggested fix:** Define the route as `tts(req)` and derive the IP inside with `ipOf` (pass `trustHops` in). Alternatively, change the call site to `fn(req, ipOf(req))`. When `tts` is missing, `createApi` should register a route that returns disabled (no provider). Add a sweep for the new limiters. Rewrite the requirement to say that cache hits still count toward the general 120/min API limit.

## Finding 9: Phase 2 verification is phantom, and the "code in parallel" claim ignores version-bump conflicts
- **Severity:** Medium
- **Location:** Phase 2 step 5 ("harness vm như lần sửa trước … Chạy `npm test`"). plan.md:41 ("2 phase code song song được"). Phase 3 step 2 (bump version).
- **Flaw:**
  - `js/speech-synthesis.js` is not in `PURE_MODULES` (`tests/run-tests.js:5-30`). No test file covers `speak()`, and the "harness from the previous fix" is not in the repo. `npm test` passing proves nothing about phase 2, and the regression cases (503 → off, 429 → retry, token/pendingDone) disappear after the session.
  - The parallel claim holds only for code. Phase 3 bumps `APP_VERSION`/`CACHE` in `js/app-storage.js` and `sw.js`, and both files are currently modified and uncommitted by the combat plan (git status: `M js/app-storage.js`, `M sw.js`). `deployment-guide.md` is also touched by 2 other plans (plan.md:44).
- **Failure scenario:** A later refactor of `speak()` breaks the fallback, and CI stays green. Two plans bump the version at the same time → `tests/pwa-assets.test.js` fails, or one bump overwrites the other, so clients do not get the new `speech-synthesis.js`.
- **Evidence:** `tests/run-tests.js:5-30` (PURE_MODULES list, no speech-synthesis). `docs/deployment-guide.md:279-284` (bump procedure). The git status snapshot.
- **Suggested fix:** Commit a `tests/speech-synthesis-api-tts.test.js` that loads the module into a vm context with stubs for `fetch`, `Audio`, `speechSynthesis`, `document`, and `fetchFirstOk`/`audioSources`. Phase 3: coordinate the version with the combat plan, since only one bump should land per deploy.

## Finding 10: Deploy dependencies and hidden brittleness in the library (lockfile, heavy transitive deps, hard-coded Edge version)
- **Severity:** Medium
- **Location:** Phase 1 Related Code Files line 44 ("`package-lock.json` (nếu có)"). Phase 1 Risk ("Edge TTS có thể bị chặn/đổi").
- **Flaw:**
  - `package-lock.json` already exists, so "(nếu có)" is wrong. The Dockerfile path uses `npm ci --omit=dev` (`deployment-guide.md:76`), which fails if the lock is not committed in sync.
  - msedge-tts adds 5 runtime dependencies: `axios`, `ws`, `isomorphic-ws`, `buffer`, `stream-browserify` (`npm view msedge-tts dependencies`). axios is used only to fetch the voice list, which this plan never calls. The server currently depends on `pg` alone.
  - The library hard-codes `Sec-MS-GEC-Version=1-143.0.3650.96` and an `Edg/143` user agent (`dist/MsEdgeTTS.js:100,127`). When Microsoft rejects that version, you have to bump the library. The lockfile pins it, so `^2.0.8` does not update itself.
- **Failure scenario:** Months later Microsoft tightens its check → 403 → all 502s. Nobody knows the fix is to bump msedge-tts, because the troubleshooting section only says "502 = outbound blocked → TTS_ENABLED=false".
- **Evidence:** `D:\project\eng\package.json` (dependencies: only pg). `package-lock.json` exists. `docs/deployment-guide.md:65,76`. msedge-tts-2.0.8 `dist/MsEdgeTTS.js:100,127`.
- **Suggested fix:** Commit `package-lock.json` (required, not optional). Phase 3 troubleshooting: a 502 whose log says "403/Unexpected server response" means updating msedge-tts. Log `e.message` (it contains no sentence text) so the operator can tell a 403 from a timeout. Optionally write a thin WebSocket client on top of `ws` to drop axios (weigh this against YAGNI).

## Unresolved questions
- What Node version does Nhân Hòa actually run: the `package.json` engines value, or the default of the Coolify/Dokploy nixpacks build?
- Does the Nhân Hòa reverse proxy log the query string? `GET ?text=` puts user sentences into proxy access logs, so the "not logging sentence content" claim covers only the app. Should the plan document this, or switch to POST with a hash-addressed GET?
- The `tts_clips.text` column stores every public sentence in plaintext, and nothing reads it. Is it needed (YAGNI plus privacy)?

Status: DONE
Summary: 10 findings (3 High, 7 Medium). Critical factual errors: msedge-tts 2.0.8 does not run on Node 18 (global crypto) and does not escape XML. The 503 contract conflicts with client ttsOff. `curl -I` returns 405. `immutable` blocks voice changes.
