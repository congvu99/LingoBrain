# Code Review — Mage pixel art Phase 5 (hub portraits, cleanup, docs)

## Scope
- Worktree `D:\project\eng\.claude\worktrees\integration`, branch integration-mage, HEAD ea3f539 + uncommitted diff
- Files: README.md, css/paper-theme.css, docs/system-architecture.md, index.html, sw.js, js/app-storage.js,
  js/boss-game-{first-run-ui,hub-ui,render,skill-tree-ui,sprite-atlas,story-journal-ui,story}.js,
  new js/boss-game-portrait-ui.js (27 lines), deleted js/boss-game-mage-art.js, tests/boss-game-story.test.js,
  tools/copy-boss-sprites.js, 22 new PNGs (12 Faceset 38x38, 10 icons 24x24)
- LOC: +158 / -175

## Overall
Clean, small, scoped. No Critical or High issues. All requested checks pass. A few Medium/Low lifecycle and coverage nits.

## Verification done
- `node tests/run-tests.js`: **435 passed, 0 failed**
- `node --check` on all js/*.js, sw.js, tools/*.js, server/*.js: all pass
- Every sw.js ASSETS entry (except the `'./api/'` string at sw.js:158, which is runtime key code, not an asset)
  exists on disk and `resolveStaticPath` returns 200 (incl. `/img/boss/actor/slime-face.png`, `/img/boss/fx/icon-fire-disabled.png`)
- Every index.html `<script>` is in ASSETS and vice versa; every PNG under img/boss/ is in ASSETS
- tools/copy-boss-sprites.js: all source paths exist in main repo `assets/ninja-adventure/`, copied files byte-identical
- PNG dims: faces 38x38, icons 24x24 RGBA
- Line counts: all touched files ≤ 200 (atlas 193, render 130, portrait 27)

## (a) XSS — PASS
- js/boss-game-story-journal-ui.js:56, :65 — `src="' + esc(mon.face) + '"`; `mon` always comes from constant `BOSS_MONSTERS` (`.find(...) || BOSS_MONSTERS[0]`).
- js/boss-game-skill-tree-ui.js:40 — icon built from `el` iterating constant `BOSS_ELEMENTS` (boss-progress-sync-merge.js:6) and numeric `rank`; not escaped but not user-controlled. Acceptable; optional `esc()` for consistency.
- No user data reaches src/innerHTML in the new code.

## (b) rAF lifecycle — PASS with Medium nit
- Single global handle `bossPortraitStop`; `bossPortraitLoop` stops previous loop before starting (portrait-ui.js:20-21) → no multiple loops on hub re-render / gender toggle / difficulty click.
- Async load race guarded: `stopped` checked after `loadBossSprites(...).then` (portrait-ui.js:33); stop fn assigned synchronously.
- `stopBossHub` (hub-ui.js:87-90) is `game.stop` for every hub entry (openBossHub hub-ui.js:24, word-game-ui.js:67, result "về sảnh" → openBossHub result-ui.js:114). Called by: startBossBattle (boss-game-ui.js:26), stopGameTimer/closeGame (word-game-rounds.js:28, word-game-ui.js:92) → covers quit, tab switch, new battle.
- Hidden tab: skips drawing, keeps rAF (browsers throttle rAF in hidden tabs anyway).

**M1 — loop keeps drawing on a detached canvas inside the skill tree.** `renderSkillTree` (skill-tree-ui.js:17) replaces `#app.innerHTML` without stopping the loop; the closure keeps drawing to the removed `#bossPortrait` at 60fps until the user goes back (loop then replaced) or leaves. Same brief window between first-run preview → hub render (replaced right away, harmless). Only one loop, so not a leak; just wasted work, and it contradicts "dừng khi rời sảnh".
Fix (covers every re-render path in one place), portrait-ui.js tick:
```js
if (stopped) return;
if (!canvas.isConnected) { stopped = true; return; }
```

## (c) Dangling refs — PASS
- grep `drawMage|mageStaffTip|MAGE_ROBE|MAGE_SKIN|BOSS_SHAPE_EMOJI|boss-game-mage-art|boss-story-icon` in js/ tests/ index.html sw.js css/: only comments remain (story.js:11, sprite-atlas.js:76, tools/copy-boss-sprites.js:64,67, test title story.test.js:22). No code refs.
- No readers of monster `.shape` / `.size` (all `.size` hits are particles/Blob/Map).
- render.js:115 now calls `drawBossMageSprite` only; old `pose` computation removed; `m` still used for zoom. tier3-ultimate-fx has no drawMage ref (cutscene uses `mageFFace`/`mageMFace` sprites). tests/run-tests.js/.html never loaded mage-art.

## (d) Assets/SW/server — PASS
- CACHE `lingobrain-v2.18.0` (sw.js:3) ↔ APP_VERSION `2.18.0` (app-storage.js:4).
- Server allowlist `IMG_DIRS` (static-file-server.js:11) covers actor/fx; `.png` only; fine.
- **Pre-existing (not phase 5):** tests/run-tests.html:32 references `word-import.test.js`, deleted in 9ddaff1. Browser runner will 404 that script.

## (e) Docs — PASS with Low nits
- docs/system-architecture.md file list: all listed js files exist; removed stale entries (tier3-shapes, monster-shapes, monster-art, scene, mage-art) which no longer exist. New section "Sprite Pháp Sư Lexoria" matches code.
- README credit present with correct license/attribution.
- **L1** docs line for portrait-ui says "tự dừng khi ẩn tab" — code only skips drawing (rAF still scheduled). Reword to "bỏ vẽ khi ẩn tab".
- **L2** docs step 6 says tests check "mọi ảnh có trên đĩa + trong sw.js" — true for BOSS_SPRITES + faces, **not** for the 10 skill-tree icons (not in BOSS_SPRITES, no test). See M2.

## (f) Contracts — PASS
- `git diff HEAD --stat` for boss-game-logic/progress, boss-progress-sync-merge, cloud-sync*, sync-merge, server/: no changes. app-storage.js only APP_VERSION line.
- Removing `shape`/`size` from BOSS_MONSTERS: not persisted (eng.boss.v1 stores monster ids only) → no sync/backup impact.

## Medium
- **M1** (above) portrait loop on detached canvas — portrait-ui.js:25-32, skill-tree-ui.js:17.
- **M2** No test guards `img/boss/fx/icon-<el>[-disabled].png` on disk + in sw.js ASSETS. A future element added to BOSS_ELEMENTS or a rename would silently break offline icons. Add to tests/boss-game-story.test.js or sprite-atlas test:
  ```js
  BOSS_ELEMENTS.forEach(el => ['', '-disabled'].forEach(s => {
    const f = 'img/boss/fx/icon-' + el + s + '.png';
    assert.ok(fs.existsSync(path.join(ROOT, f)), f);
    assert.ok(sw.indexOf("'./" + f + "'") >= 0, 'sw.js thiếu ' + f);
  }));
  ```

## Low
- **L3** portrait redraws every rAF (~60fps) for a 3fps anim; could cache last frame index and skip. Negligible cost.
- **L4** first-run preview canvas 140px wide (first-run-ui.js:43) vs frame 16×9=144px (pixelScale(170*0.86,16)=9) → 2px/side clipped; likely invisible (transparent margin). Either widen canvas to 144 or accept.
- **L5** `idleDown` (sprite-atlas.js:15) reuses walk frames → mage "walks in place" in hub. Documented; product call.
- **L6** image load failure → loop keeps ticking doing nothing until leave. Harmless.

## Edge cases scouted
- refreshBossHub after sync while in skill tree → re-renders hub (pre-existing behavior, not phase 5).
- Rapid gender toggles in first-run → each call cancels previous loop; OK.
- Sprite not yet loaded when loop stopped → `.then` guard prevents zombie loop; OK.

## Plan follow-up
- Phase 5 tasks appear complete. Phase file success criteria line "chưa chạy code-reviewer riêng" can be updated by lead now that review is done. Remaining: manual online/offline smoke test (not verifiable here).

## Metrics
- Tests: 435/435; syntax check: 0 failures; lint: n/a (no linter configured)

## Unresolved questions
- Want `canvas.isConnected` self-stop (M1) now or accept as-is?
- Keep walk-in-place portrait (L5) or pick a true idle frame?

Status: DONE_WITH_CONCERNS
Summary: Phase 5 is correct and scoped; tests 435/435, all assets on disk/in SW/served, no dangling drawMage/shape refs, sync contracts untouched. Minor: portrait rAF keeps drawing on detached canvas in skill tree, and icon assets lack a test.
