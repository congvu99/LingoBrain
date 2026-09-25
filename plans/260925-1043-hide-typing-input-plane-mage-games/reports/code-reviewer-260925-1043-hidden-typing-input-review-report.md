# Code review: hidden typing input (Bắn máy bay + Pháp sư), v2.21.2

Scope: hunks in js/word-game-ui.js, js/plane-game-ui.js, js/boss-game-ui.js, css/paper-theme.css, js/app-storage.js, sw.js (+31/-29). The working-tree diff of boss-game-ui.js has only this change (the other plan's work is already in 44fd629).
Checks: `node tests/run-tests.js` → 531 passed, 0 failed. `node --check` passes on all 5 JS files. No DOM/UI tests exist, so layout and iOS behaviour were checked by reading the code, not in a browser.

## Verdict
No blockers. Handlers, ids, keys and the helper contract all still work. There is 1 medium CSS defect: the "1px" sink is not really 1px.

## Medium
**M1. `.game-type-sink` sizing is overridden by the base input rule.** css/paper-theme.css:87-88 `input[type=text]{width:100%;min-height:48px;padding:12px 14px;border:1px solid;color;background}` has specificity (0,1,1). That beats `.game-type-sink` (0,1,0). Line 91 `input:focus{box-shadow}` and line 510 (mobile media query) also win. In practice the sink is an invisible 100%-wide x 48px box at the top of the field, not 1x1.
- Impact today: none visible. `opacity:0` hides the background, border, shadow and focus-visible outline, and `pointer-events:none` stops it catching taps. It is still a latent trap: the comment claims 1px, and anyone who later touches opacity or pointer-events gets a full-width strip over the HUD (hearts and ult bar sit at top-left of the canvas).
- Fix (1 line): raise the specificity, e.g. `input.game-type-sink{...}` or `.plane-field .game-type-sink{...}`, and add `min-height:0`.

## Low
- L1. `.plane-game .game-head .btn-sm,.boss-game .game-head .btn-sm{min-width:44px;padding:0}` also applies to `#gQuit` (←), whose padding changes from 0 14px to 0. This looks fine and matches ⏸, but it is a side effect the brief did not mention.
- L2. `#bossSkip` is now a child of `#bossPrompt`:
  - `.boss-prompt.is-casting>*{visibility:hidden}` plus the `::after` overlay now hide or cover "Bỏ" during the cast lock. Harmless: `giveUp` already returns while casting (`bossCanAct`) and during a chain (`if (st.chain) return`), so nothing tappable is lost.
  - `bossPromptShake` now shakes the button too (cosmetic).
  - `aria-live="polite"` now wraps a static button. It is not announced because it never changes.
- L3. `#bossUlt` floats bottom-right. The canvas HUD is at the top (drawBossHud) and the monster is centred at 0.7w/0.52h, so there is no overlap with the HUD. It may cover ground or tall sprite feet on very short fields; check on a small iPhone in landscape.

## Checks confirmed
- (a) Acceptance:
  - The old row is gone; the input is invisible.
  - `focus()` calls are unchanged and still synchronous in gestures (planeGo, bossGo, startBossBattle).
  - `onmousedown` preventDefault is bound by id. Boss also has touchstart preventDefault on pause, skip, ult and quit.
  - Plane ⏸ and gQuit have mousedown only, same as before.
  - Enter (`!isComposing`), Shift+Enter (ult), Esc, and `oninput`/`compositionend` IME handling are unchanged.
  - Selector `#bossUlt` still resolves inside the field.
- (b) Regressions:
  - `field.onmousedown`/`onclick` skip `closest('button')`. `#bossUlt` inside the field still works: it has its own preventDefault, and the touchend handler calls onclick itself.
  - The sink has `pointer-events:none`, so field taps hit the canvas and refocus.
  - Overlay is z-index 2, above ult at z 1, so the paused overlay covers ult.
  - `[hidden]{display:none!important}` (line 37) beats `.boss-ult-float` positioning, so hidden ult is hidden. The pulse animation is gated on `:not([hidden])`.
  - Grid layout: the fully placed `#bossSkip` (col 3, rows 1-2) goes first. Tier auto-places at col 1 rows 1-2, text at col 2 row 1, letters at col 2 row 2 (their column is explicit, so the cursor moves to row 2).
  - renderBossPrompt, renderBossChainPrompt, renderBossChainCompletedWord and bossSetCasting write only textContent/innerHTML of #bossTier, #bossPromptText and #bossLetters, or toggle a class. None replaces `#bossPrompt.innerHTML`, so the button survives.
- (c) `gameHeadHtml(progress, extraHtml = '')`: output is identical with 1 argument. Callers boss-game-hub-ui.js, fruit-game-ui.js and word-game-rounds.js:12/140 pass 1 argument. `extraHtml` is not escaped; both callers pass literals, and the comment documents that it must be trusted HTML.
- (d) Line counts: word-game-ui 169, plane-game-ui 171, boss-game-ui 194. All ≤200.
- (e) iOS:
  - `opacity:0` + `pointer-events:none` still allows programmatic focus. `display:none` or `visibility:hidden` would not, and the change avoids them.
  - font-size 16px (the base rule also gives 16px) means no focus zoom.
  - `top:0` inside the fixed field keeps focus-scroll minimal, and fitGameToViewport uses `visualViewport.offsetTop`.
  - `caret-color:transparent` is not overridden.
  - autocorrect/autocapitalize/autocomplete are off, so the QuickType bar and autofill heuristics stay as before.
  - Keyboard dismiss → blur → pause, and "Chơi tiếp" refocuses. Unchanged.
- Version: APP_VERSION and sw CACHE are both 2.21.2. No other version string references it.

## Unresolved questions
- Keep the ← padding change (L1)?
- Has anyone tested on a real iPhone (keyboard open, landscape, ult placement)? This review could only check the code.
