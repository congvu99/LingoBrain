# Code review: step 5 save waits for the spoken sentence to finish

Scope: `js/speech-synthesis.js` (speak/speakSystem), `js/review-steps-learn.js` s5 (lines 163-182). ~45 LOC.
Checks: `node --check` on both files OK. `npm test` 446 passed, 0 failed (speech file is not unit-tested, as the plan says).

## Verdict
The core fix is correct. The Promise resolves on every branch that was checked, and an old utterance's onerror cannot resolve the wrong Promise. Every other caller is fire-and-forget, so none of them regress. There are no blockers. There are 2 medium edge cases in s5 where the page can move to the next card at the wrong time, and 3 low ones.

## Medium

M1. `js/review-steps-learn.js:179-181`: the guard does not check the current tab or the DOM, so the next card can play audio on the Plan tab.
- Scenario: the user clicks Save, then switches to Plan (`showTab('plan')` does not change cur or step) within the cap. Either the sentence ends or the user presses `[data-say]` on Plan (daily-plan.js:105), which supersedes speak() and resolves the pending Promise. That runs `nextCard()` → `render()` → `s1` → `speak(next.context)` (line 103). This cuts off the sentence the user just asked for on Plan. If they are recording shadowing (mediaRec), the audio gets into the recording.
- Before this change `nextCard` ran immediately, so this could not happen.
- Fix: `if (tab === 'game' && !game && cur === w && step === 5) nextCard();`

M2. Same place: s5 can be re-rendered for the same card while the wait is running, and then the old Promise moves on at the wrong time.
- Scenario: Save → switch to Plan → switch back to Review within the cap. `showTab('game')` calls `render()`, which draws a fresh s5 for the same w with `leaving=false` and an empty textarea. The user types a second sentence and clicks Save. `speak(t2)` supersedes and resolves the old Promise. The old `.then` sees `cur===w && step===5` and calls `nextCard()` at once, so the next card's speak cuts t2 off. This is the same bug the fix targets.
- Fix: grab `const btn = $('#b-done')` in the handler and add `btn.isConnected` to the guard. Combined with M1: `if (btn.isConnected && tab === 'game' && !game && cur === w && step === 5) nextCard();`

## Low

L1. `js/speech-synthesis.js:64-66`: on the MP3 path, onerror resolves immediately and the play() rejection also falls back to Web Speech, so both paths run.
- Scenario: the blob fails to decode or the codec is unsupported. The media `error` event calls `done()`, and s5 moves on. The play() rejection → `.catch` → token still matches → `speakSystem(t)` starts speaking. Next, the new card's speak cancels it, or it plays over the next card, depending on event order.
- Fix: keep a per-call flag (`let fell = false; const fallback = () => { if (fell || token !== playToken) return; fell = true; speakSystem(text, rate, done); };`). Set `player.onerror = fallback`, keep `player.onended = () => token === playToken && done()`, and use `.catch(fallback)`.

L2. `js/speech-synthesis.js:27,64,66`: on iOS, unlockAudio's silent wav can fire the `onended` of a call that is still running.
- Scenario: an MP3 is found → `player.play()` is rejected with NotAllowed (iOS, the gesture expired during fetch) → `.catch` → Web Speech fallback. `player.onended` still holds this call's handler, the token still matches, and `player.paused` is true. Any tap during the wait fires the capture listener → `unlockAudio()` → the wav plays → `ended` → `done()` → the card advances while Web Speech is still talking.
- It only happens when the typed sentence has an MP3 (rare). Without the play rejection, unlockAudio cannot hit a live call: while an MP3 plays, `player.paused` is false, and while one is loading, the handler belongs to an older token.
- Fix: in `.catch`, before the fallback, set `player.onended = player.onerror = null`. Or fold this into the L1 fix by clearing the handlers inside `fallback`.

L3. `js/review-steps-learn.js:179`: the race has no rejection path. If code inside the executor throws synchronously, the race rejects and `.then` never runs. The buttons then stay disabled on "🔊 Đang đọc…" (reading…) for good, and the timeout cannot recover because the race has already settled.
- A realistic trigger is only old browsers where `player.play()` returns undefined, so `unlockAudio`'s `.then` throws a TypeError. In those browsers the old code also threw before `nextCard`, but the buttons stayed usable.
- Fix: `const go = () => {...}; Promise.race([...]).then(go, go);`
- Side effect: all fire-and-forget callers would then log an unhandled rejection instead of a sync throw. That is the same severity as before.

## Informational (not blocking)
- The cap `min(10000, 1500 + 80*len)` is tight. Rate .92 is about 87 ms/char, and Edge Natural online voices add network latency. Since the cap only matters when onend fails to fire, this is fine. If Chrome drops onend (the known bug where a garbage-collected utterance loses its onend), sentences longer than about 100 chars get cut at 10 s. Optional: 120 ms/char with a 15 s max, and keep a module-level reference to the current utterance `u` to reduce GC loss.
- Pressing the `S` key (app-shell.js:84) during the wait, when focus is not on the textarea, supersedes → the card moves on right away → the next card's speak cuts the context. The user started it, so this is acceptable.
- The "Đã lưu câu" (sentence saved) toast now appears up to 10 s late, and never if the guard fails (the sentence is still saved). This is a UX nuance only.
- The `setTimeout` for the cap is never cleared. Harmless.
- Plan deviation: in `.catch`, when the token no longer matches, the code does not call `done()`. This is equivalent, because a newer speak() already resolved the call through `pendingDone`, and playToken is only incremented in speak() (grep confirmed). OK.

## (b) Other callers
- All `speak()` callers in js/ were grepped: app-shell:84, boss-game-result-ui:16, boss-game-story-journal-ui:42, daily-plan:105, fruit-game-ui:100, review-steps-learn:100/103/118-122/164, review-tests:24/48/50/73/74/104, word-game-rounds:91/92/125/176. All are fire-and-forget, and none use the return value. Arrow handlers `onclick = () => speak(...)` now return a Promise, which is truthy and not `false`, so the default action is not cancelled. No regression.
- `speakSystem` is only called inside speech-synthesis.js, and its return value is never used. `hasVoice` is unchanged.
- The shared `player`, `playToken` and `pendingDone` are not touched outside speech-synthesis.js (grep confirmed). The only other writer to the player is unlockAudio (see L2).

## (c) Can the Promise hang?
- Empty text → `Promise.resolve()`. OK.
- No speechSynthesis → `done()` right away. OK.
- MP3 fetch fails or returns non-ok → `.catch` → speakSystem(done). OK.
- play() rejected (iOS) → fallback. OK, but see L2.
- media onerror → done. OK, but see L1.
- Superseded mid-fetch → resolved via pendingDone; the stale fetch returns early on the token check. OK.
- Superseded mid-play → resolved via pendingDone; pause() does not fire ended; the stale handler fails the token check. OK.
- A cancelled utterance's onerror/onend calls its own closure `done`. The `pendingDone === resolve` check keeps it from clearing the new call's pendingDone, and a second resolve is a no-op. Cannot resolve the wrong Promise. OK.
- Web Speech onend never fires (Chrome) → only the s5 cap saves it. Fire-and-forget callers do not care. Acceptable.

## (d) s5 guards
- Double click: blocked by `leaving` and the disabled button. OK.
- Ctrl+Enter: `.click()` on a disabled button does nothing, and `leaving` also blocks it. OK.
- Global Space key: falls through to `$('#b-done')`, which is disabled, so nothing happens. OK.
- Clicking a word in renderStats: `cur=null; render()` → cur changes, or the same w comes back with step 3 → guard skips. OK.
- `onInitialSyncApplied` returns early when tab==='game'. When it is not the review tab, `cur=null` → guard skips. OK.
- `refreshAfterSync` does not re-render the review tab. OK.
- `restartSession` (progress reset) → cur=null → guard skips. OK.
- Switching tabs → gaps M1 and M2.

## (e) Style
Matches the surrounding code: Vietnamese inline comments, compact one-liners, `$()` helpers. No new files. OK.

## (a) Acceptance criteria
- `npm test` green: met (446/0).
- No overlap on Chrome/Edge (Web Speech path): met by the code logic. Needs manual browser check.
- MP3 path waits for `ended`: met, apart from the error edge case in L1.
- Offline or broken voice → moves on within the cap: met by the code logic, apart from L3 in old browsers.
- Save clicked 3 times / repeated Ctrl+Enter → only 1 card: met.
- 🔊 on steps 1-3 and mini games unchanged, repeated clicks still cut the old sentence: met, because cancel/pause/token behaviour is unchanged.
- Manual browser checks (Chrome, Edge, iOS Safari): not verifiable here.

## Recommended actions
1. M1+M2: one-line guard change in s5.
2. L1+L2: per-call fallback flag and clear the player handlers on fallback.
3. L3: `.then(go, go)`.

## Unresolved questions
- M1: if the user leaves the review tab during the wait, should the card still move on silently (set cur/step but skip the auto-speak), or stay on s5? The suggested guard stays on s5, so the user would click Bỏ qua (skip) on return, with the sentence already saved.
