# LingoBrain iPhone redesign

**Goal:** Welcoming Vietnamese learning UI, designed first for iPhone and readable across ages. User delegates visual direction and palette.

**Design:** Deep teal, warm white, peach and mint. Native sans-serif, generous spacing, rounded cards, a daily welcome panel with CSS book artwork, clear progress and bottom navigation. Prefer this over neon (too busy) or monochrome (too close to the current design).

**Architecture:** Static HTML/CSS/JavaScript with no dependencies or remote assets. Preserve existing DOM IDs, storage, learning algorithms, recordings and ongoing audio changes.

- [x] Update shell in `index.html`: brand, daily welcome, progress, section headings and tab descriptions.
- [x] Replace `css/paper-theme.css`: 320-430px layouts, desktop, safe areas, dark mode, reduced motion, 44px touch targets and 16px inputs.
- [x] Connect welcome CTA and progress to live state in `js/daily-plan.js` and `js/app-shell.js`.
- [x] Update manifest and theme; bump service worker and app version together.
- [x] Run `node tests/run-tests.js` and syntax checks; baseline 102 passed, 2 existing audio manifest failures.
- [x] Browser checks: three tabs, task completion, review, management, dark mode, narrow layouts and offline assets. Save screenshots and update `docs/design-guidelines.md`.

**Acceptance:** No horizontal overflow on iPhone sizes, visible keyboard focus, comfortable reading, real progress/CTA, no new regression failures. Preserve unrelated working tree changes.


## Verification results

- Node suite: 104 passed, 0 failed on the final run. The initially incomplete audio manifest became complete during the session; no audio assets were modified by this UI work.
- Browser suite: 62 passed, 0 failed, including IndexedDB recording storage.
- Chrome responsive checks: 320, 375, 390, 430, 600, 768, 800, 820, 900, 1024 and 1440px. All three tabs fit without horizontal overflow. Task completion survives reload; progress percentages and ARIA match.
- Review flow, four grading controls, three games, expanded settings, 16px inputs and offline reload checked. Game timer and daily progress retain separate visible tracks.
- Visually inspected phone home/review/settings, phone dark mode, desktop and 800px layouts. Reduced motion supported in CSS; real Safari/iPhone hardware was not available.
- Read-only independent review: no confirmed regressions. Suggested checking 800-900px hero; verified screenshots at the breakpoint.
- Screenshots and smoke scripts are in the local temporary `lingobrain-ui-review` directory. No test dependency added to the project.
