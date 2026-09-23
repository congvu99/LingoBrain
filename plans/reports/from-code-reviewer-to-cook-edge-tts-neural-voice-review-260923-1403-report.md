# Code Review: edge-tts neural voice (uncommitted)

## Scope
- js/speech-synthesis.js, sw.js, js/app-storage.js, tools/generate_edge_tts_audio.py, tools/requirements.txt, tests/audio-manifest.test.js
- Tests: 102 pass, 2 fail (audio coverage/orphan; expected while generation runs: 5000 missing, 475 orphans from the partial --limit manifest)
- Data checked: 2505 words, all strings; only unusual whitespace is U+2009, which both regexes treat as whitespace

## Overall
Small, focused, and in the repo style (compact code, Vietnamese comments). The token logic, SW cache split and blob/Range reasoning are sound. One iOS unlock risk and one hasVoice regression matter. The manifest write is not atomic, so criterion 1 is not fully met.

## High
1. **The iOS unlock uses `pointerdown`, which may not count as a gesture on touch** (speech-synthesis.js, the unlock listener).
   - The HTML spec treats pointerdown as activation-triggering only for `pointerType === 'mouse'`. Touch activation comes from `pointerup`/`touchend`/`click`, and WebKit historically unlocks media on touchend, not touchstart.
   - With `{ once: true }`, a failed unlock is never retried. Every later `player.play()` runs after an async `fetch()`, outside the gesture, so it can reject with NotAllowedError. The fallback `speakSystem` is then also async. iOS needs the first `speechSynthesis.speak` inside a gesture, so the user may hear nothing.
   - Before this change, `speak` was synchronous in the click handler, so this is a regression risk on iOS.
   - Fix (pick one):
     - Unlock on `touchend` + `click` + `keydown`, and remove the listeners only after `play()` resolves.
     - Or, better, unlock inside `speak()` itself. On the first call, synchronously set the silent wav src and call `play()` (plus a zero-volume `speechSynthesis.speak('')` if you want the fallback unlocked too) before the fetch.
   - Must be verified on a real iPhone; I could not test this here.

## Medium
2. **`hasVoice()` returns true with no way to speak** (speech-synthesis.js `hasVoice`).
   - It returns `!!audioMap || ...`. On a browser without `speechSynthesis`, or with only non-English voices, `review-mode-picker` now allows dictation for user-imported words or edited contexts that have no MP3. `speak(w.word)` then goes to `speakSystem`, which does nothing (no API) or reads in a non-English voice. The result is a dictation card with no audio.
   - Before, `hasVoice` was false in that case.
   - Fix: add an optional text parameter, `hasVoice(text)`: `(audioMap && audioMap[audioKey(text)]) || <old system check>`, and pass `w.word` at review-steps-learn.js:16 (`r`'s word is available there). With no argument it keeps the old behaviour.
3. **The manifest write is not atomic** (generate_edge_tts_audio.py, `MANIFEST.write_text`), which breaks criterion 1.
   - The MP3s go through `.part` + `replace`, but index.json is written in place. An interrupted write leaves invalid JSON. `load_manifest` then silently returns `{}`, so a later `--limit` run drops all old items. At runtime `r.json()` rejects, so the app falls back to Web Speech for everything.
   - Fix: write to `index.json.tmp`, then `Path.replace(MANIFEST)`.
4. **The SW caches 206 responses and does not handle `put` rejections** (sw.js, MP3 handler).
   - `res.ok` is true for 206. If any Range request reaches `/audio/*.mp3` (opening the URL directly, or a future `<audio src>`), `c.put` rejects with "Partial response", which becomes an unhandled rejection in the SW.
   - Fix: `if (res.status === 200) c.put(e.request, res.clone()).catch(() => {});`.
   - No opaque-response risk: the handler returns early for other origins.

## Low
5. **Key normalization differs slightly between Python and JS** (criterion 6 is met for the current data).
   - Python `\s`/`strip()` also match U+001C–U+001F and U+0085. JS `\s`/`trim()` also match U+FEFF and Python does not.
   - Current words.json only has U+2009, which both match. To make them identical, use an explicit class on both sides, e.g. `[ \t\n\r\f\v   -     　﻿]+`, or strip BOM/controls first.
6. **`--limit` merge edge cases.**
   - With a different `--voice`, the old manifest is dropped, so the app loses every MP3 outside the N items until a full run.
   - Merged old items are not re-checked with `has_audio`.
   - Both are acceptable for a test tool, but document them.
7. **Console encoding on Windows.** The Vietnamese `print`s can raise UnicodeEncodeError when stdout is redirected on a cp125x locale. The current run works, but consider `sys.stdout.reconfigure(encoding="utf-8")`.
8. **The audio cache is never pruned.** After regenerating with a new voice or text, old hashed MP3s stay in `lingobrain-audio` forever. This is small (about 17 KB per file) but grows without limit. Optionally, prune on activate using the precached index.json.
9. **Size and deploy.**
   - About 5000 MP3s at about 17 KB each is about 85 MB of binary in git.
   - The index.json of about 350 KB is fetched network-first on every load.
   - `install` `addAll` fails the whole SW install if `audio/index.json` is not deployed.
   - Acceptable, but note it in the deployment docs.
10. **File size is fine.** speech-synthesis.js is about 53 lines; no modularization needed.

## Criteria
| # | Result |
|---|---|
| 1 idempotent/orphans/limit merge/atomic | Partial: skip, orphan cleanup and merge work; manifest write not atomic (#3) |
| 2 signature/rate | OK: `speak(text, rate)` unchanged; `defaultPlaybackRate` and `playbackRate` are set after `src`, so the load reset is handled; `preservesPitch` defaults on |
| 3 fallbacks | OK for missing text, fetch error (the SW rejects when offline and not cached, so `fetch` rejects too) and `play()` rejection. iOS async fallback risk: see #1 |
| 4 rapid calls | OK: the token check prevents stale blobs; `pause()` makes `play()` reject with AbortError, and the token mismatch means no stray fallback; `speechSynthesis.cancel()` runs on every call |
| 5 offline / version bump | OK: `AUDIO_CACHE` is excluded from the activate filter; MP3s are cached as they are played |
| 6 normalize parity | OK for current data (#5) |

## Other checks
- Callers passing non-strings: `!text` guard plus `String()` in `audioKey`; `speakSystem` accepts anything. No regression.
- Range rationale: correct. Safari sends Range for media, and a cached full 200 breaks playback. Fetching as a blob avoids that. The blob URL is revoked before the next one is created.
- Silent wav data URI: a valid 45-byte PCM WAV.
- pwa-assets test: `./audio/index.json` in ASSETS must exist on disk. It exists now, but the generator writes it only at the end of a run, so a fresh checkout without the generated audio fails this test. `audio/` is not git-ignored. The CACHE/APP_VERSION match (2.4.0) passes.
- Voice prefs: the regex list is fine. `/en-US/` does not match Android's `en_US` (existing issue); `vs[0]` covers it.

## Recommended Actions
1. Move the iOS unlock to a sync call inside `speak()`, or to touchend/click with retry-until-success (#1). Test on an iPhone.
2. `hasVoice(text)` checks per word (#2).
3. Atomic manifest write (#3).
4. SW: cache only status 200 and catch `put` errors (#4).

## Unresolved Questions
- Are the ~85 MB of MP3s intended to be committed to git, or deployed separately?
- Can someone confirm on a real iOS device that the pointerdown unlock works (touch pointerType)?

Status: DONE_WITH_CONCERNS
Summary: Mostly correct and in the repo style. Main risks: the iOS unlock on touch `pointerdown` may never fire, leaving the async MP3 and speech fallback silent; `hasVoice()` gives false positives for imported words without `speechSynthesis`; the manifest write is not atomic.
Concerns/Blockers: iOS behaviour is unverified without a device.
