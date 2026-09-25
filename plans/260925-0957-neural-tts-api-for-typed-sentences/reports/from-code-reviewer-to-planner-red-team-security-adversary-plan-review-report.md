# Red Team (Security Adversary) — Plan Review: Neural TTS /api/tts

Scope: plan.md + phase-01..03. Code verified: server.js, server/auth-and-sync-routes.js, server/request-guards.js, server/static-file-server.js, server/deck-routes.js, server/schema.sql, js/speech-synthesis.js, js/review-steps-learn.js, sw.js, package.json. Upstream msedge-tts@2.0.8 checked (registry metadata + unpkg dist/MsEdgeTTS.js).

## Fact-check summary (plan claims vs code)
| Claim | Verdict | Evidence |
|---|---|---|
| `createRateLimiter` exists, usable as `minuteLimiter.hit(ip)` | WRONG signature — `hit(key, now)` requires `now` | server/request-guards.js:20,32 |
| `createSemaphore(2, 10)`, BUSY code | Correct | server/request-guards.js:46-49 |
| Route returns `[status, body, headers]` like deck-routes | Correct shape | server/deck-routes.js:49-52; auth-and-sync-routes.js:126 |
| Handler `tts(req, ip)` | WRONG — dispatcher calls `fn(req)` only | server/auth-and-sync-routes.js:126 |
| `send()` JSON.stringifies non-string bodies → need Buffer branch | Correct | server/auth-and-sync-routes.js:116 |
| SW skips `/api/*` | Correct (after words/audio-index branch) | sw.js:169 |
| "cache hit không tính rate limit" | FALSE — global apiIp counts every /api/* request | server/auth-and-sync-routes.js:19,121 |
| `TRUST_PROXY_HOPS` "đã có" | Exists, default 0, docs require 1 | server.js:11; docs/deployment-guide.md:47 |
| msedge-tts escapes XML? (plan: "nếu thư viện không tự làm") | It does NOT; no timeout either | unpkg msedge-tts@2.0.8 dist/MsEdgeTTS.js `_SSMLTemplate` inserts `${input}` raw |
| msedge-tts deps | ws, axios, buffer, isomorphic-ws, stream-browserify (repo today: only `pg`) | registry.npmjs.org/msedge-tts/2.0.8; package.json:15-17 |
| Phase 3 `curl -I` smoke test | Will return 405 (HEAD not routed) | server/auth-and-sync-routes.js:122-123 |

---

## Finding 1: Hotlinkable public TTS — per-IP limits are meaningless against cross-site embedding
- **Severity:** Critical
- **Location:** plan.md "Quyết định đã chốt" (công khai); Phase 1 "Contract" + "Risk Assessment" (lạm dụng làm TTS miễn phí)
- **Flaw:** GET endpoint, no auth, no Origin/Sec-Fetch-Site check, no `Cross-Origin-Resource-Policy`. `<audio src="https://<domain>/api/tts?text=...">` is a no-cors media load — CORS does not apply, CSP `frame-ancestors` does not apply. Any third-party site/app can use this as free Neural TTS; each of *their* visitors spends *their own* IP budget (20/min, 200/day), so aggregate generation is unbounded. There is no global generation cap.
- **Failure scenario:** A dictionary/quiz site embeds our URL. 5k visitors/day × a few new sentences each → tens of thousands of Edge TTS calls/day from our server's egress IP. Microsoft throttles/blocks the IP (unofficial endpoint) → TTS dies for our users; DB cache fills with foreign content and FIFO-evicts ours (see F6). Also a botnet/IPv6 /64 rotation trivially mints fresh keys: `clientIp` does no prefix aggregation.
- **Evidence:** server/static-file-server.js:47-51 (securityHeaders: no CORP); server/request-guards.js:6-12 (raw IP string as key, no /64 bucketing); server/auth-and-sync-routes.js:44,121 (only per-IP gate).
- **Suggested fix:** (a) Add `Cross-Origin-Resource-Policy: same-origin` to the TTS response; (b) reject when `Sec-Fetch-Site` is present and not `same-origin` (client uses `fetch`, can also send a custom header e.g. `X-LB-TTS: 1` — `<audio>` can't); (c) global miss budget (e.g. `TTS_DAILY_MAX` across all IPs, then 503-with-no-session-kill, see F3); (d) bucket IPv6 by /64 for TTS limiter keys.

## Finding 2: SSML injection — library inserts text raw; plan makes escaping optional
- **Severity:** High
- **Location:** Phase 1 "Architecture" → `tts-edge-provider.js` ("Text escape XML ... nếu thư viện không tự làm")
- **Flaw:** msedge-tts 2.0.8 `_SSMLTemplate` interpolates `${input}` directly into `<prosody>…</prosody>` inside `<voice>`. Plan's normalization only strips C0 controls; `<`, `>`, `&` pass. Attacker closes prosody/voice and injects `<prosody rate="-90%">`, `<break time="…"/>` chains, or `</voice><voice name="…">` → different voice cached under the Andrew key; very long audio from 300 chars → multi-MB bytea rows (amplifies F6). Malformed XML → provider error → 502 counted as legit failure.
- **Failure scenario:** `?text=</prosody></voice><voice name="en-US-AndrewMultilingualNeural"><prosody rate="-95%">aaaa…` → ~20x longer clip stored forever, served `immutable`.
- **Evidence:** unpkg.com/msedge-tts@2.0.8/dist/MsEdgeTTS.js `_SSMLTemplate` (`${input}` raw); plan normalizer spec only rejects `[\u0000-\u001f\u007f]`.
- **Suggested fix:** Make escaping unconditional in the provider (`& < > " '`), escape exactly once (library does none), and add a test asserting the SSML string passed to the library contains `&lt;` for `<`. Consider rejecting `<`/`>` outright at `normalizeTtsText` (typed English sentences don't need them).

## Finding 3: 503 is overloaded — attacker-induced BUSY kills TTS for every user for the whole session
- **Severity:** High
- **Location:** Phase 1 "Contract" (503 = DB not ready OR disabled; Architecture: semaphore BUSY → 503); Phase 2 "Requirements" (503 → `ttsOff = true` for session)
- **Flaw:** Same status means "permanently off" and "transiently busy". Capacity is tiny: 2 slots × up to 10s timeout, queue 10. Also the dispatcher returns 503 whenever `isReady()` is false and on `isDbUnavailable` (transient DB blip).
- **Failure scenario:** 2–3 attacker IPs at 20 misses/min with 300-char payloads keep both slots busy; queue overflows; every legit user's first miss gets 503 → client sets `ttsOff` and never retries until reload. A 2s DB reconnect at startup does the same to everyone online.
- **Evidence:** server/auth-and-sync-routes.js:120 (isReady → 503), :130 (DB unavailable → 503), :50 (existing BUSY→503 pattern); server/request-guards.js:49.
- **Suggested fix:** Distinct signal for permanent-off: e.g. `TTS_ENABLED=false` → 404/410 or 503 with `{error, code:'TTS_DISABLED'}`; BUSY/DB-transient → 429 or 503 with `Retry-After` that client treats as one-shot fallback. Client disables only on explicit disabled code / 404 / 405.

## Finding 4: Unvalidated provider output is persisted and served `immutable` for a year (cache poisoning)
- **Severity:** High
- **Location:** Phase 1 "Contract" (`Cache-Control: public, max-age=31536000, immutable`); "Architecture" (INSERT after synth)
- **Flaw:** No check that `synth()` result is a non-empty, plausible MP3 before INSERT. Edge TTS failure modes (throttle, voice rejected, truncated stream, SSML error) can yield empty/partial audio that resolves successfully. Once stored, every user gets it from DB, and browsers cache it `immutable` — deleting the DB row does not heal clients. URL does not include voice, so changing `TTS_VOICE` also leaves browsers on the old voice for a year despite key change.
- **Failure scenario:** Microsoft throttles for 10 min; streams close with 0–2 KB. Hundreds of common sentences are cached broken; users hear silence (player.onended → done, no fallback since play() succeeded) forever.
- **Evidence:** server/static-file-server.js:44 (the `immutable` policy is safe for content-hashed static audio/ files, not for server-generated content); js/speech-synthesis.js:72 (onended → done, no fallback on silent clip).
- **Suggested fix:** Reject buffer < ~1 KB or lacking an MP3 frame sync/ID3 header → 502, no INSERT. Use `max-age=86400` (no `immutable`) or put voice/version in URL (`&v=<voiceHash>`) so a voice change or purge busts client caches.

## Finding 5: Planned handler/limiter contracts don't match existing code — silent permanent bans
- **Severity:** High
- **Location:** Phase 1 "Architecture" → `createTtsRoutes(...) → { tts(req, ip) }`; `minuteLimiter.hit(ip)`, `dayLimiter.hit(ip)`
- **Flaw:** (a) Dispatcher calls `fn(req)` — `ip` would be `undefined`, all traffic shares one limiter key `undefined` → 20 misses/min *globally*. (b) `hit(key, now)` requires `now`; called as `hit(ip)` then `now - e.start` = NaN, `NaN >= windowMs` is false → window never resets; `sweep(Date.now())` also computes NaN → never deleted. First 20 misses then permanent 429 until process restart. (c) New limiters not added to the sweep list.
- **Failure scenario:** Implementer follows plan literally; tests with injected `now` may still pass if test calls through `createTtsRoutes` with a stub, while prod call path loses IP.
- **Evidence:** server/auth-and-sync-routes.js:126 (`await fn(req)`), :44 (`ipOf` is private to createApi), :25 (sweep list); server/request-guards.js:24,32-39.
- **Suggested fix:** Route in ROUTES as `req => ttsRoutes.tts(req, ipOf(req))`; always pass `now()` to `hit`; add TTS limiters to the sweep interval (or expose a `sweep` from tts-routes). Add a test through `createApi` asserting per-IP separation.

## Finding 6: DB bloat math is wrong by ~6x, and FIFO prune enables cache-flush
- **Severity:** Medium
- **Location:** Phase 1 "Requirements" (`TTS_CACHE_MAX` 5000 ≈ 100MB); "Architecture" prune query; schema (no size CHECK)
- **Flaw:** 48 kbit/s = 6 KB/s. 300 chars ≈ 45–55 words ≈ 18–20 s ≈ 110–120 KB/row → 5000 rows ≈ 550–600 MB worst case (much more with F2). Attacker targets max-length inputs. Prune is by `created_at` (cache hits don't refresh) → attacker with ~25 IPs × 200/day fills 5000 rows in one day, evicting all legit clips, forcing legit users to burn their miss budget. `text` column stored but never needed for serving.
- **Evidence:** server/schema.sql (existing tables have no bytea; PaaS DB quota unverified in docs); plan prune `ORDER BY created_at DESC OFFSET $1`.
- **Suggested fix:** Cap on bytes not rows (`SUM(octet_length(mp3))`) or add `CHECK (octet_length(mp3) <= 200000)`; lower max text length (e.g. 200); refresh `last_used_at` on hit (throttled) and prune by it; drop `text` column (see F7).

## Finding 7: Shared public cache is a privacy oracle for other users' typed sentences
- **Severity:** Medium
- **Location:** Phase 1 "Architecture" (global cache by sha256(voice+text), `text text NOT NULL` column); plan.md Acceptance ("câu đã cache ... phát ngay")
- **Flaw:** Anyone can probe whether a specific sentence was ever typed by any user: hit = fast response and doesn't consume miss budget; miss = slow + provider call. `ETag` equals deterministic `sha256(voice+text)`. Plaintext sentences also persist indefinitely in `tts_clips.text` even though the plan promises "không log nội dung câu" — the DB becomes the log.
- **Failure scenario:** Users type personal sentences ("My wife Lan is sick at Bach Mai hospital"). An attacker with guesses confirms them by timing. DB dump/backups expose all typed content.
- **Evidence:** server/auth-and-sync-routes.js:131 (existing explicit policy "không log body"); plan schema `text text NOT NULL`.
- **Suggested fix:** Drop `text` column (key is enough). Document in privacy notes that typed sentences are shared-cached. Optional: pad hit latency is overkill; at minimum don't store plaintext.

## Finding 8: Global apiIp limiter contradicts acceptance criteria and couples TTS to sync
- **Severity:** Medium
- **Location:** plan.md "Acceptance Criteria" ("câu đã cache không bị giới hạn"); Phase 1 "Requirements"
- **Flaw:** Every `/api/tts` request (hit, 304, 400) increments `apiIp` (120/min) before routing — shared with `/api/sync`, `/api/words`, login. Behind a school/office NAT (one public IP), TTS replays from a classroom exhaust 120/min and break sync/login for everyone there; the 20/min miss limit is also shared per NAT.
- **Evidence:** server/auth-and-sync-routes.js:19,121; docs/system-architecture.md:139 ("Chung limiter cho tất cả /api/*").
- **Suggested fix:** State the actual behavior in criteria; either exempt `GET /api/tts` hits from apiIp (check route before apiIp) with its own cheap limiter, or accept and document. Browser HTTP cache reduces repeats only after first 200.

## Finding 9: Timeout/queue mismatch wastes provider slots on abandoned requests
- **Severity:** Medium
- **Location:** Phase 1 "Requirements" (provider timeout 10s, queue 10); Phase 2 "Non-functional" (client abort 6s); Phase 2 step-5 cap `3000 + 100·len`
- **Flaw:** Queue wait is unbounded (timeout wraps only `synth`); client aborts at 6s (and step 5 advances at 3–5s for short sentences), but server keeps the slot and the queued job; no `req.on('close')` cancellation. Queue of 10 behind 2×10s ≈ 50s worst case — every queued request is already abandoned. msedge-tts has no timeout of its own; plan's "timeout → reject + đóng" must close the WebSocket or sockets leak.
- **Evidence:** server/request-guards.js:46-58 (no deadline for queued jobs); js/review-steps-learn.js:180 (current cap formula); unpkg msedge-tts dist (no timeout).
- **Suggested fix:** Deadline covering queue+synth ≤ client timeout (e.g. 5s total); skip job if request closed before slot acquired; still INSERT if synth completes (useful for retry). Explicitly call close on the ws/tts instance in the timeout path; test that.

## Finding 10: Supply chain expansion for a 60-line feature; deploy smoke test is wrong
- **Severity:** Medium
- **Location:** Phase 1 "Architecture" → `package.json` `msedge-tts ^2.0.8`; Phase 3 step 3 `curl -I`
- **Flaw:** Repo currently depends only on `pg`. msedge-tts pulls `axios` (used only for `getVoices`, never needed), `isomorphic-ws`, `stream-browserify`, `buffer`, `ws` — a single-maintainer unofficial package with caret range, auto-updating on each PaaS `npm install`. Separately, Phase 3 verifies with `curl -I` (HEAD); ROUTES keyed `GET /api/tts` → HEAD hits PATHS → 405, so the deploy check "fails" or misleads into disabling TTS.
- **Evidence:** package.json:15-17; registry.npmjs.org/msedge-tts/2.0.8 deps; server/auth-and-sync-routes.js:122-123.
- **Suggested fix:** Pin exact `2.0.8`, commit lockfile, deploy with `npm ci`; or implement the provider directly on `ws` (only real dependency). Change smoke test to `curl -s -o /dev/null -w '%{http_code} %{content_type}' "<domain>/api/tts?text=hello%20there"` or route HEAD too.

---

## Unresolved questions
1. Does Nhân Hòa proxy overwrite or append X-Forwarded-For, and is the app port reachable bypassing the proxy? If reachable, TRUST_PROXY_HOPS=1 lets anyone spoof per-request IPs (unlimited TTS). Not verifiable from repo.
2. Nhân Hòa Postgres storage quota — needed to size the bytea cap.
3. Does the PaaS proxy pass IPv6 client addresses? Determines whether /64 bucketing matters.
4. Is Microsoft ToS for the unofficial Edge read-aloud endpoint acceptable for a public server proxy (product/legal decision)?

Status: DONE
Summary: 10 findings (1 Critical, 4 High, 5 Medium); plan's limiter/handler contracts mismatch existing code, SSML escaping must be mandatory, 503 overload + hotlinking make the public endpoint abusable.
