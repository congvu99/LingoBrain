# Red Team (Failure Mode Analyst) — Neural TTS API plan

Plan: `plans/260925-0957-neural-tts-api-for-typed-sentences/` (plan.md, phase-01..03). Checked against server.js, server/auth-and-sync-routes.js, server/request-guards.js, server/database.js, js/speech-synthesis.js, js/review-steps-learn.js, sw.js.

## Finding 1: A 503 turns TTS off for the whole session, but most 503s are temporary
- **Severity:** High
- **Location:** phase-02 Requirements line 17 (`503/404/405 → ttsOff = true cho phiên`); phase-01 Contract line 18 and Requirements line 23 (`hàng đợi 10 (quá → 503)`)
- **Flaw:** The plan uses one status code (503) for two different situations: TTS is turned off on purpose, and the server is briefly unable to answer. The server already returns 503 in several short-lived cases: DB schema still retrying after a restart, a DB blip, the semaphore reporting BUSY. The client treats every 503 as "switch TTS off until reload", and nothing ever switches it back on.
- **Failure scenario:** The app redeploys on Nhân Hòa. For 2–30s `db.ready=false` while the schema retries with backoff. Every open tab that speaks a typed sentence in that window gets a 503 and turns TTS off. Those users hear Web Speech for the rest of the session, which for a PWA can mean days. The same happens when 3 users hit a burst of new sentences and the queue fills.
- **Evidence:** `server/auth-and-sync-routes.js:120` (`if (!isReady()) return send(503 …)` runs before routing); `:130` (`isDbUnavailable → 503`); `server/database.js:28-33` (schema retry 2s→30s); `server.js:41` (no DATABASE_URL → 503); `server/request-guards.js:52` (BUSY); `server/auth-and-sync-routes.js:50` (BUSY is mapped to 503 by convention).
- **Suggested fix:** Only latch on a clear "off" signal: 404/405 (old server), or a dedicated body/header such as `{error, ttsDisabled:true}` / `501` when `TTS_ENABLED=false`. Map BUSY to 429 with `Retry-After`. Make the latch time-limited (for example, retry after 5 min) instead of lasting the whole session.

## Finding 2: Browser cache is `immutable` for a year, the URL has no voice/version, and bad MP3s are stored with no way to replace them
- **Severity:** High
- **Location:** phase-01 Contract line 17 (`max-age=31536000, immutable`), Architecture line 27 (collect `audioStream` into a Buffer), line 35 (`INSERT … ON CONFLICT DO NOTHING`); plan.md line 29 (voice can be changed via `TTS_VOICE`)
- **Flaw:** (a) The client URL is `api/tts?text=` only. The voice is part of the DB key but not the URL. After changing `TTS_VOICE`, browsers keep playing the old voice for a year. (b) Nothing checks the provider output. If the WebSocket closes mid-stream, or Edge returns 0 audio frames, the result is a truncated or empty Buffer. It gets INSERTed, and because of `DO NOTHING` a later good synth can never overwrite it. It is also cached `immutable` in every browser that fetched it. (c) There is no purge path in the plan or the docs.
- **Failure scenario:** Edge drops the connection after 2 of 5 seconds of audio. The route returns 200 with a 12KB clip, which is stored permanently. Every later request for that sentence plays half a sentence, from DB and from browser cache. The user's only workaround is clearing site data.
- **Evidence:** `js/speech-synthesis.js:66` (the existing fetch path has no validation beyond `r.ok`; the plan reuses it, phase-02 line 24); `js/speech-synthesis.js:20` (`audioKey` has no voice); `sw.js:170` (`/api/*` bypasses the SW, so only the browser HTTP cache holds the clip and the SW version bump cannot evict it).
- **Suggested fix:** Put a version in the URL (`api/tts?v=<voiceHash>&text=`). The client can get it from `/api/audio-index` or a constant; the server returns 400/redirect if it does not match. Reject clips where `buffer.length` is below a threshold (for example, under ~1KB per 10 chars) or with no MP3 frame sync `0xFFE`. Only resolve on the provider's explicit end-of-turn event. Use `max-age=2592000` without `immutable`, or keep `immutable` only once the URL is versioned. Document a `DELETE FROM tts_clips WHERE voice=…` purge step.

## Finding 3: Typed sentences move from synchronous Web Speech inside the click to a fallback up to 6s later, which iOS can block
- **Severity:** High
- **Location:** phase-02 Architecture line 23-24; Risk line 47 (`unlockAudio hiện có + fallback Web Speech`)
- **Flaw:** Today a typed sentence has no `file`, so `speakSystem` runs synchronously inside the user gesture. The plan puts a fetch of up to 6s in front of it. On failure (429/502/timeout/iOS `play()` NotAllowedError), `speechSynthesis.speak` runs from a promise callback, outside the gesture. iOS Safari can drop an utterance that is not tied to a gesture and never fire `onend`/`onerror`. The fallback the plan relies on is therefore the path most likely to fail on iOS, and `speak()` may never resolve. That breaks the success criterion "Promise luôn resolve" (phase-02 line 41). The `unlockAudio` mitigation only covers `<audio>`, not speechSynthesis, and it only latches after a successful silent `play()`.
- **Failure scenario:** iPhone, first sentence, synth takes 1.8s. The gesture has expired and `unlocked` is false because the silent sample was interrupted by `player.pause()`/`src` swap. `play()` rejects, the fallback calls `speechSynthesis.speak` outside the gesture, and there is silence. Step 5 only moves on because of the cap; the 🔊 button (`#b-say`) plays nothing.
- **Evidence:** `js/speech-synthesis.js:55` (the no-file path calls `speakSystem` synchronously); `:60-64,75` (fallback runs in `.catch`); `:25-29` (unlock only for `player`); `:52-53` (`cancel()`/`pause()` on every speak can interrupt the unlock sample); `:41` (resolution depends only on `onend/onerror`).
- **Suggested fix:** Keep a synchronous Web Speech path when the platform is iOS-like and `unlocked` is false, or "prime" speechSynthesis with an empty utterance inside the gesture. Add a watchdog to `speakSystem` (resolve after `len*120ms + 2s`) so the Promise always resolves. Add a vm harness case for "fallback where Web Speech never fires onend".

## Finding 4: Timeout budgets don't line up (client 6s, server 10s plus queue up to ~50s, step 5 cap 5s), causing late audio and wasted server slots
- **Severity:** High
- **Location:** phase-01 Requirements line 23 (provider 10s, 2 concurrent, queue 10); phase-02 Requirements line 19 (6s AbortController), Architecture line 27 (cap base 3000)
- **Flaw:** (a) The new cap `min(15000, 3000+100·len)` is 5000ms for a 20-character sentence, shorter than the 6s fetch timeout. The race resolves and `nextCard()` runs while the fetch is still pending. When it settles, the MP3 or the Web Speech fallback plays over the next screen. The token guard only helps if the next screen calls `speak()`, and the "done/empty queue" screen does not. (b) The server keeps working after the client aborts: the semaphore slot is held for up to 10s. The queue wait is not bounded by any timeout (10 queued × 10s / 2 slots ≈ 50s), so the server mostly works for clients that already gave up. This fills the queue, which returns BUSY 503, which latches clients off (Finding 1).
- **Failure scenario:** Edge is slow (8s). User saves a 20-char sentence. The cap fires at 5s and the card changes. At 6s the abort fires, `fallback()` sees `token === playToken` (no new speak on the summary screen) and reads the old sentence aloud over the new card. Meanwhile 10 other users' aborted requests fill the queue, and the next users get 503 and lose TTS for the session.
- **Evidence:** `js/review-steps-learn.js:180,184` (cap and `Promise.race`; `go()` does not cancel the speak); `js/review-steps-learn.js:19-23` (`nextCard` → `render`, no speak cancel); `js/speech-synthesis.js:61,67` (guards compare only `playToken`); `server/request-guards.js:53-55` (queue entries have no timeout or cancel).
- **Suggested fix:** Set cap ≥ client fetch timeout plus the expected speech time, or have `go()` call a new `stopSpeech()` that bumps `playToken`, aborts the fetch and cancels speech. Add a queue-wait deadline (fail fast at about client timeout minus 1s). Stop work when `req.on('close')` fires before synth starts. Keep server total budget ≤ client timeout.

## Finding 5: The global per-IP limiter counts every TTS request, including cache hits, so TTS can crowd out sync and login
- **Severity:** Medium
- **Location:** plan.md line 30 and Acceptance line 50 ("câu đã cache không bị giới hạn"); phase-01 Requirements line 21
- **Flaw:** This is a factual error in the plan. `handleApi` runs `apiIp.hit()` (120/min/IP) before route dispatch, for every `/api/*` request. So cache hits are rate-limited, and TTS traffic shares one budget with `PUT /api/sync`, login and register. Behind NAT (a classroom or company, with `TRUST_PROXY_HOPS` giving one IP), TTS fetches push sync into 429.
- **Failure scenario:** A class of 30 behind one NAT IP each types and replays sentences. Together they exceed 120 req/min. `PUT /api/sync` gets 429 and progress stops syncing, while TTS 429s silently fall back so nobody notices the cause.
- **Evidence:** `server/auth-and-sync-routes.js:19` (`apiIp` 120/60s), `:121` (checked for every request before `ROUTES` lookup at `:122`).
- **Suggested fix:** Dispatch `/api/tts` before the `apiIp` gate with its own limiter (hit-tolerant, for example 300/min), or exempt it from `apiIp`. Fix the acceptance wording. Add a test: 130 cache-hit requests from one IP do not return 429, and sync is unaffected.

## Finding 6: Superseded requests are never aborted, so fast repeated `speak()` calls (boss game, key 's') use up rate limit and synth slots
- **Severity:** Medium
- **Location:** phase-02 Architecture line 24 (reuse the existing fetch path; AbortController only for the timeout)
- **Flaw:** When a newer `speak()` supersedes an older one, the older fetch is only ignored (`token !== playToken`), not aborted. Every superseded `/api/tts` still runs a server synth, counts against the 20/min miss budget and holds a semaphore slot. Game code calls `speak()` on every cast or chain hit. Imported custom words ("từ tự nạp", explicitly in scope in plan.md line 3) have no MP3, so each cast becomes a synth request.
- **Failure scenario:** Boss fight with an imported deck: 25 casts/min produce 25 new-word misses. The IP hits the 20/min limit, the rest fall back, and the queue is full of audio nobody will play. Other users get BUSY 503 (Finding 1).
- **Evidence:** `js/speech-synthesis.js:51,67` (token only discards); `js/boss-game-result-ui.js:16,18` (`speak(e.word)` per cast/chain); `js/app-shell.js:84` (key 's' repeat).
- **Suggested fix:** Keep a module-level `AbortController`, abort the previous one at the start of each `speak()`, and pass `signal` to fetch. On the server, skip synth if the request closed while queued. Add a harness case: two quick speaks, the first fetch is aborted.

## Finding 7: The single-flight map, provider timeout and semaphore have leaks the plan doesn't address
- **Severity:** Medium
- **Location:** phase-01 Architecture line 27-28 (new `MsEdgeTTS` per call; "timeout → reject + đóng"), line 34 (single-flight `Map<key, Promise>` + semaphore)
- **Flaw:** (a) The plan never says to delete the key in `finally`. If the key is only deleted on success, a rejected promise stays in the map and that sentence returns 502 until restart. If deletion happens after the INSERT, an INSERT failure has the same effect. (b) The timeout rejects the wrapper promise, which ends `fn` and frees the semaphore slot through `.finally(active--)`. The underlying `msedge-tts` WebSocket keeps running unless it is explicitly closed. When Edge hangs, each timeout leaks one socket while new ones keep being accepted, so sockets and file descriptors grow without bound. (c) Followers of a leader that got BUSY also receive BUSY, which becomes 503 and a latch.
- **Failure scenario:** Edge's endpoint half-hangs, so the TLS handshake succeeds but no frames arrive. Over an hour, 200+ WebSockets accumulate on a small PaaS container, memory is exhausted and the process is OOM-killed. The static site goes down too.
- **Evidence:** `server/request-guards.js:54` (slot freed as soon as `fn`'s promise settles, whatever socket state); `server.js:52` (unhandledRejection only logged, so a stream `'error'` emitted after the timeout has fired will not crash the process, but it will not close the socket either).
- **Suggested fix:** Specify `inflight.delete(key)` in `finally`, attached to the synth promise and not to the INSERT. In the provider, the timeout must call the library's close/`ws.terminate()` and remove its listeners; verify against the v2.0.8 source. Add tests: provider reject, then a second call succeeds (key not poisoned); provider hang, then close is called.

## Finding 8: Rollback gap — a broken `msedge-tts` install or require crashes the whole server, and `TTS_ENABLED=false` cannot prevent it
- **Severity:** Medium
- **Location:** phase-01 Architecture line 39 (server.js creates the provider at startup); Risk line 66 (`TTS_ENABLED=false tắt nhanh`)
- **Flaw:** The provider is wired in `server.js` inside the synchronous `if (process.env.DATABASE_URL)` block, which has no try/catch. If `require('msedge-tts')` throws (ESM-only build, native or `ws` dependency mismatch, missing from the PaaS install, unsupported Node version), the process dies at startup. That breaks the existing promise that the static site never depends on the DB or API. The kill switch is read after the require, so it does not help. The only rollback left is a code revert and redeploy.
- **Evidence:** `server.js:15-20` (requires and `createApi` at top level, no try); `server.js:5` ("Web tĩnh không phụ thuộc DB"); `server.js:46-49` (the try/catch only covers request handling).
- **Suggested fix:** Lazy-require inside `createEdgeTtsProvider` or in the first `synth()`, wrapped in try. On failure, log once and have the route return the "disabled" signal. Check `TTS_ENABLED` before any require. Add a smoke check to phase 3: start with the package missing, and the static site plus sync still work.

## Finding 9: The phase-3 check `curl -I` sends HEAD, which returns 405, so the deploy checklist fails by design
- **Severity:** Medium
- **Location:** phase-03 Implementation step 3 (`curl -I "<domain>/api/tts?text=hello%20there"` → 200 `audio/mpeg`); phase-01 test list line 57 (only POST → 405 is tested)
- **Flaw:** `curl -I` sends HEAD. Dispatch looks up `req.method + ' ' + p`, and only `GET /api/tts` is planned, so the path matches `PATHS` and returns 405 JSON. The operator reads this as "TTS broken" and may flip `TTS_ENABLED=false` (the plan's own 502 playbook). Some CDNs and link previewers also send HEAD.
- **Evidence:** `server/auth-and-sync-routes.js:122-123` (method + path lookup, 405 when the path is known).
- **Suggested fix:** Use `curl -s -o /dev/null -w '%{http_code} %{content_type} %{size_download}' …` (GET), or register `HEAD /api/tts` to return headers without a body. Also check `size_download` > 0 (ties to Finding 2).

## Finding 10: DB budget is underestimated — cache size, FIFO prune, and bytea reads on a 5-connection pool shared with sync
- **Severity:** Medium
- **Location:** phase-01 Requirements line 24 ("5000 dòng ≈ 100MB"), Architecture line 35 (prune `ORDER BY created_at DESC OFFSET`), line 32 (hit = `SELECT mp3`)
- **Flaw:** (a) Size: 48kbps is 6KB/s. A 300-char sentence is about 18–20s, so ~115KB, and 5000 max-length rows is about 575MB. An abuser at 200 misses/day/IP × a few IPs fills the cap with max-length clips in days. (b) Hits never update `created_at`, so the prune is FIFO and not LRU: the most-replayed sentences get evicted first, then re-synthesized at the provider's cost. (c) Every hit reads bytea through the shared pool (`max: 5`, 10s connect timeout). A burst of cold-browser hits (a new device, or everyone after the SW bump) competes with sync and login. Connect-timeout errors match `isDbUnavailable`, which returns 503 and latches (Finding 1). (d) Two concurrent prunes are harmless, but `DELETE … IN (SELECT … OFFSET 5000)` scans the whole table without using the index for the offset, on a random 1/50 of inserts.
- **Evidence:** `server/database.js:21` (`max: 5, connectionTimeoutMillis: 10000`); `server/database.js:76` (connect timeout is classed as DB-down); `server/auth-and-sync-routes.js:130` (DB-down → 503).
- **Suggested fix:** Fix the estimate. Add a `last_used_at` (or skip it and cap by `sum(octet_length(mp3))`). Prune by `created_at ASC LIMIT n` with the index. Consider a small in-process LRU (for example 200 clips / 10MB) in front of the DB for hot hits. Budget the pool: `SELECT` hits must not starve sync.

## Unresolved questions
- Does `msedge-tts@2.0.8` handle Microsoft's `Sec-MS-GEC` token requirement (added 2024)? If not, every synth returns 502 in production. Verify before step 1.
- Is `msedge-tts` v2 CJS-compatible with the repo's `require` style and the Node version on Nhân Hòa?
- Does Nhân Hòa allow outbound `wss://speech.platform.bing.com`? The plan defers this to phase 3; checking it earlier would avoid building the whole feature before confirming it is feasible.

Status: DONE
