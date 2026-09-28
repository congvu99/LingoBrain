# Code review: boss hub sticky battle bar + result upgrade CTAs

Scope: diff of js/boss-game-hub-ui.js, js/boss-game-result-ui.js, js/boss-game-evolution-ui.js, js/boss-game-skill-tree-ui.js, js/boss-game-skill-book-ui.js, css/paper-theme.css, plus the version lines in js/app-storage.js and sw.js. About 55 lines added and 16 removed. The other dirty files were ignored.

Checks run:
- `node tests/run-tests.js`: 755 passed, 0 failed. The run includes the unrelated dirty files.
- `node --check` passes on all 7 JS files.
- No test covers these DOM paths, so I traced each one by hand.

## Findings (most severe first)

### HIGH 1: a cloud sync throws the user out of Evolution / Skill tree / Skill book back to the hub. This breaks "Tiến hoá ngay → chọn dạng → Chiến đấu, không qua sảnh" for signed-in users
- Where: js/boss-game-hub-ui.js:124-126 (`refreshBossHub`), with js/boss-game-result-ui.js:171-172.
- `refreshBossHub` redraws the hub whenever `game.stop === stopBossHub`. It never checks which screen is on display.
- It runs after every successful sync (js/cloud-sync-engine.js:143 → refreshAfterSync).
- Each `saveBoss()` schedules a sync after `SYNC_DEBOUNCE = 10000` ms.
- What happens:
  1. The battle ends and `persistBattle` → `saveBoss` runs.
  2. The user taps "Tiến hoá ngay". `bossOpenHubScreen` now sets `stop = stopBossHub`. The old result screen had `stop = null`, so a refresh used to leave it alone.
  3. About 10 s later the sync lands and `startBossHub()` replaces the Evolution screen.
  4. Picking a form (`bossChooseEvo` → `saveBoss`) or spending a point (`rankUp`) starts another 10 s cycle, which kicks the user out again.
- The hub → sub-screen path already had this bug. This change sends users into it straight from the result screen, which is the plan's main flow.
- Fix: in `refreshBossHub`, redraw the screen that is showing now (or skip the redraw when it is a sub-screen):
  ```js
  function refreshBossHub() {
    if (!(game && game.id === 'boss' && game.stop === stopBossHub)) return;
    if ($('.boss-evo')) renderBossEvolution();
    else if ($('.boss-tree')) renderSkillTree();
    else if ($('.boss-skill-book')) renderSkillBook();
    else startBossHub();
  }
  ```

### MEDIUM 2: "🌳 Cộng điểm (n)" becomes the main button forever once the tree is full (level 17 and up)
- Where: js/boss-game-result-ui.js:142-144.
- `pointsLeft = level - 1 - allocSum` (js/boss-game-elements.js:49). The tree holds at most 15 points (5 branches × 3 ranks), and there is no level cap (`xpForLevel` = 50·n·(n−1)).
- From level 17, with all 15 points spent, `pts = lv - 16 > 0` after every battle. So:
  - "Cộng điểm" is always the main CTA.
  - "Luyện phép"/"Đánh lại" drop to ghost buttons.
  - The Skill tree it opens has nothing to spend.
- The skill tree header "Điểm còn: n" (js/boss-game-skill-tree-ui.js:24) has the same pre-existing inaccuracy. It is cosmetic there.
- Fix: count only points that can actually be spent:
  ```js
  const pts = BOSS_ELEMENTS.some(el => canRankUp(bossProg.alloc, el, lv1)) ? pointsLeft(lv1, bossProg.alloc) : 0;
  ```
  Alternatively, clamp to `15 - allocSum`.

### LOW 3: the bar can cover focused controls
- Where: css/paper-theme.css:47-48, 363.
- `.app-scroll{scroll-padding-bottom:24px}` is smaller than the stuck bar (48px button + 20px padding, about 70px).
- Keyboard focus or `scrollIntoView({block:'end'})` can leave a control under the bar.
- `renderJournal` uses `block:'start'`, so it is not affected.
- Optional fix: `.app-scroll:has(.boss-battle-bar){scroll-padding-bottom:84px}`, or accept as is.

### LOW 4: the bar is narrower than the card
- Where: css/paper-theme.css:363-365.
- There is no negative margin (a deliberate choice, noted in the CSS comment), so the top border and shadow only span the card's content width.
- The content that shows around the bar is only the card's blank padding, so this is cosmetic.

### LOW 5: extra bottom border in the hub when the journal is empty
- When `bossJournalHtml` renders nothing, the global `details:last-of-type{border-bottom}` rule (css:96) now applies to `.boss-howto`.
- The result is a double rule: the details border plus the bar's `border-top`, separated by the nav row. Cosmetic only.

## Explicit checks
- **(a) Acceptance criteria:**
  - One tap into battle from all 3 sub-screens: met (bar plus `bossBindBattleBar`).
  - "Tiến hoá ngay" → form → Chiến đấu: met offline. For signed-in users it is **not reliable** (see HIGH 1).
  - Bar does not cover the tab bar: met. `.tabbar` is a flex sibling of `.app-scroll` (css:208), not an overlay.
  - Bar does not hide the last content: met, because the sticky bar stays in normal flow.
  - Light and dark mode: met. `--card` and `--rule-soft` are defined in both themes. The explicit rgba shadow replaces `--sh-3`, which is `none` in dark mode.
  - Portrait loop cleanup: met. The sub-screens have no `gQuit`. Leaving works through `←` → `startBossHub` (same game), a tab switch → `closeGame` → `stopBossHub`, or `startBossBattle` → `game.stop`. All three clean up, because `bossOpenHubScreen` sets `stop = stopBossHub`.
  - Version: `APP_VERSION` and `CACHE` both read 2.24.8, and no other version strings exist.
  - Tests pass.
- **(b) Game lifecycle:**
  - `openBossHub` now delegates to `bossOpenHubScreen(startBossHub)` with identical behaviour.
  - `startGame('boss')` in js/word-game-ui.js:66 still builds its own game object. This duplicates the new helper but is not a regression.
  - `showBossResult` still runs `flushMiss` and sets `over = true; stop = null` before any new game object is created, so no missed words are lost.
  - pwa-register: a sub-screen opened from the result screen counts as busy (`over:false`), the same as the hub.
  - win / loss / practice / dup all go through the same button code. The dup and practice labels are unchanged.
  - First run: the first-run screens render `.boss-hub` without a bar and are not reached from the result screen (`gender.ts` is already set).
  - `renderJournal`: its selectors are unaffected.
  - `refreshBossHub`: see HIGH 1.
- **(c) iOS:** every path calls `startBossBattle` synchronously inside the click handler (hub-ui:43, result-ui:168).
- **(d) DOM safety:**
  - Dynamic text goes through `esc()` (`d.label`, result `btn` labels).
  - Numbers and ids are static.
  - Only one `#bossStart` exists per screen, and the old hub button was removed.
  - Evolution / tree bindings are scoped to `.boss-evo-node` / `.boss-tree-col`, so the bar button does not collide with them.
- **(e) CSS:**
  - The only scroll ancestor is `.app-scroll` (overflow-y:auto). `html`/`body` are overflow:hidden but are not between the bar and the scroller.
  - `.wrap`, `#tab-game`, `#app` and `.card` set no overflow.
  - The `screen-in` animation transform does not break sticky.
  - The `.boss-evo-badge-result` rule was removed and nothing references it any more.
  - Buttons are at least 44px (48px in the bar, 44px for the summary).
- **(f) Tests:** 755/755 pass.

## Plan follow-ups (reporting only, nothing edited)
- Phase 1 and phase 2 code is complete apart from HIGH 1 and MEDIUM 2.
- Phase 3: the version bump is done and the tests pass.
- Still to do: the 360–375px visual check and the device test for the iOS keyboard.
- The phase statuses in plan.md still say Pending. Leaving that for the lead to update.

## Unresolved questions
1. Should the HIGH 1 fix also cover the pre-existing hub → sub-screen path? Recommended yes, since it is the same code.
2. When the tree is full (MEDIUM 2), should the result screen hide "Cộng điểm" or show it as a ghost button?
