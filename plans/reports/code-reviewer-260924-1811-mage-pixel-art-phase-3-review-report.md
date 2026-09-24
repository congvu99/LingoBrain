# Code review — Phase 3 (full monster roster + regions), mage-lexoria pixel art

## Scope
- Worktree `D:\project\eng\.claude\worktrees\integration`, branch integration-mage, uncommitted vs HEAD d8033f1
- Files: js/boss-game-{story,arena,render,sprite-actors,sprite-atlas,tier3-ultimate-fx,dragon-composite(new)}.js, js/app-storage.js, index.html, sw.js, tests/{run-tests.js,boss-game-story.test.js}, tools/copy-boss-sprites.js; 3 js deleted; 20 new PNG
- ~270 add / ~420 del

## Verification done
- `node tests/run-tests.js` → **429 passed, 0 failed**
- `node --check` on all js/, sw.js, tools/, tests/ → clean
- Line counts: all touched files ≤ 200 (atlas 157, sprite-actors 135, render 125, arena 108, composite 33). spell-presets 208 is untouched/pre-existing.
- Throwaway node compare (vm load HEAD vs working story.js, not saved):
  - 12 monsters same order; `id/region/weak/hpMul/clockMul/shape/size` **identical**; only `name` changed + `sprite/spriteHit/spriteAttack` added; `palette/features/attackFx` removed.
  - BOSS_STORY structure identical; non-text fields identical; per-string `{word}` placeholder list identical in all 28 beats (81 placeholders).
  - Old names scan (Goblin, Sói, Xương, Lich, Troll, Harpy, Wyvern, Hiệp Sĩ Đen): none left. Only lowercase "rune xương" (beat 11 outro, skull — fine). Names consistent intro/outro. "Hắn … giáp/kiếm" outros for darkKnight rewritten to "Nó …" (21/23/25).
  - BOSS_REGIONS lost `sky/ground/accent`; grep: no remaining reader outside arena (render only reads `BOSS_ARENAS[..].sky`).
- Dangling refs grep (js, tests, index.html, sw.js, tools): `drawMonster`, `buildRegionBackdrop`, `BOSS_SCENE_PAINTERS`, `BOSS_MONSTER_SHAPES`, `bossMonsterPose`, `drawBossClock(` (non-Bar), `shapeHumanoid`, deleted filenames, `layout.pixel`, `bgArena`, `A.base` → **0 hits**. `shape` kept in data; `BOSS_SHAPE_EMOJI[mon.shape]` (js/boss-game-story-journal-ui.js:66) still works.
- sw.js vs index.html vs disk: every index script in ASSETS; every ASSETS file exists (`api/` hits are fetch-handler code, not ASSETS); every img/boss file on disk is in ASSETS (no orphans); every atlas `src` exists + cached. `du img/boss` = 288K. CACHE v2.16.0 == APP_VERSION 2.16.0.
- PNG IHDR vs atlas defs: all 23 sprite sheets exactly match fw/fh × frames (incl. 4-dir 64×64 monsters, tengu attack 1230×82).

## Critical
None.

## High
1. **tests/run-tests.html does not load js/boss-game-arena.js** (tests/run-tests.html:23-24). New test "BOSS_ARENAS có sân cho đủ 4 vùng…" (tests/boss-game-story.test.js ~line 23) references `BOSS_ARENAS` before the `typeof fs` guard → `ReferenceError` → FAIL in the browser runner. Node runner passes only because run-tests.js PURE_MODULES was updated. Fix: add `<script src="../js/boss-game-arena.js"></script>` after sprite-atlas in run-tests.html (dragon-composite not needed by tests). Note: `word-import.test.js` missing in run-tests.html is pre-existing (same at HEAD), not this phase.

## Medium
2. **Boss Hit sheets effectively never show their animation** — js/boss-game-sprite-actors.js:83,106,109. `giantSpiritHit`/`tenguBlueHit` are `loop:false`, but frame time passed is the global battle clock `frameT = t` → `spriteFrame` clamps to last frame whenever t > frames/fps (i.e. after first ~0.5 s of battle). Also variant only selected while `A.flash > 0` (BOSS_FLASH_S 0.18 s) and the same frame gets `{flash: 0.9}` white overlay → a ~white silhouette of the last Hit frame. The Hit sheets (2 PNG, cached in SW) add little. Fix: track hit start (e.g. `A.hitT` set in bossActorEvent on impact) and pass `t - A.hitT`; keep variant for the anim length, lower flash when a real Hit sheet is used.
3. **HUD/top-edge overflow clamp only for Oblivion** — js/boss-game-render.js:20-23. `pixelScale` rounds up; for other bosses frame top (monY − fh·k) goes above HUD bottom (~54px) or off canvas. Computed frame tops: giantRacoon 390×340 → −3; tenguBlue 800×560 idle 19 / attack(82px) −37; tenguBlue 1920×900 attack −24; giantSpirit 1280×640 → 33. Frames have transparent margins so visible overlap is smaller, but tengu Attack (82 > 68 fh used for k) is systematically ~14k taller. Fix: apply the same `while` clamp for all monsters using `max(fh of sprite, spriteHit, spriteAttack)`.
4. **Oblivion dissolve misplaced + partial** — js/boss-game-sprite-actors.js:47-52. `def = BOSS_SPRITES.oblivion` (head only, fh 46) but composite height is 90·k; pieces laid from `q.y − 46k` → head ashes appear ~44k lower (where body was) and wings/body vanish instantly on death. Fix: for oblivion use top = `q.y − BOSS_OBLIVION_HEIGHT·k` (head region) or sample head+wing pieces at composite positions.
5. **Dissolve sparse for large bosses** — js/boss-game-sprite-actors.js:52 vs :94. Sampling step = round(fw/16) (4 for 60px, 5 for 82) but each piece drawn `q.k × q.k` → dots spaced 4k apart with 1k size; boss "tan thành pixel" looks like a thin dot grid. Fix: store `step` in piece and `fillRect(…, q.k*step, q.k*step)`.
6. **Monster invisible for whole battle if its PNG fails to load** — render.js:105 now skips monster silently; comment at js/boss-game-ui.js:52 ("lỗi nạp → vẽ tay thay thế") and sprite-actors.js:90 ("→ render vẽ quái vẽ tay thay thế") are now false. Gameplay still works (HP bar/clock), but offline-with-stale-cache or 404 = empty arena. Accepted consequence of deleting hand-drawn art per plan; at minimum fix the two stale comments; optionally a cheap fallback (emoji via BOSS_SHAPE_EMOJI) until phase 5.

## Low
7. Dragon composite ignores frozen + reduced motion — js/boss-game-sprite-actors.js:108 passes `t` not `frameT`; js/boss-game-dragon-composite.js:12 flap/bob always on. Other monsters freeze frames when `st.frozen`. Pass `frameT` and zero `bob`/`flap` amplitude when `fx.reduced` (bob is sub-integer → also jitters pixel rounding).
8. Wing rotation (±0.45±0.35 rad around 57px wing) can extend ~10k above `BOSS_OBLIVION_HEIGHT` head top; the 0.14h margin absorbs it at tested sizes; acceptable.
9. `size` field now dead data in BOSS_MONSTERS (only reader was deleted drawMonster). Remove with `shape` in phase 5.
10. Duplicate `oblivion` / `oblivionHead` defs (same src) — fine (image cache keyed by src) but comment the reason where `oblivion` is used as layout/dissolve key (already partly commented).
11. Story tone nits: beat 18 "cơ bắp cuồn cuộn dưới lớp da xám" for Chuột Chũi; beat 7 "giáo mác kêu lạch cạch" for Đầu Lâu. Non-blocking, user-approved table.
12. `drawBossRegion`: if `buildBossArena` ever returns null with tiles ready (no document), `!fx.bg` rebuilds every frame — unreachable in browser; ok.
13. phase-03 md "Requirements: Bảng ánh xạ đề xuất (chờ user duyệt)" still says pending though approved — doc nit.

## Edge cases checked (no issue)
- No sprites ready: drawBossRegion fills flat color and returns before cache (region.id guarded); drawBossMonsterSprite returns false; composite gated on head readiness, each drawSprite returns false if its piece not ready; bossSpritePixels returns [] → no throw.
- ctx state: drawSprite save/restore; dead-pieces loop resets globalAlpha; arena patch on offscreen ctx only.
- Reduced motion: lunge/recoil/shake skipped via `fx.reduced` (except composite, #7).
- bg cache per battle (createBossFx per startBossBattle, boss-game-ui.js:48) → patch size per monster correct.
- layoutBoss with no monster/def → fh 16 fallback, optional chaining via `mon &&`.
- Oblivion clamp: loop terminates (kq>1), min k=1.

## Plan follow-ups
- Phase 3 success criteria substantively met (12 sprites, 4 arenas, tests green, img 288K < 300K). Recommend fixing #1 before commit; #2–#5 before phase closes or tracked into phase 4/5. Arena build ms still unmeasured (implementer concern).

## Metrics
- Tests: 429/429 Node; browser runner would fail 1 (#1)
- Syntax: 0 errors; Lint: n/a (no linter)

## Unresolved questions
- Acceptable to keep invisible-monster on load failure until phase 5, or want emoji fallback now?
- Keep Hit sheets (fix timing) or drop them to save bytes?

Status: DONE_WITH_CONCERNS
Summary: Story data invariants, placeholders, dangling refs, SW/index/disk asset sync all verified clean; 429/429 Node tests pass. One High (browser test runner missing boss-game-arena.js) and several Medium visual/logic bugs (Hit anim timing, non-Oblivion HUD overflow, Oblivion/boss dissolve).
Concerns/Blockers: #1 breaks tests/run-tests.html; #2–#5 visual correctness.
