# Code review: Mage Lexoria pixel art, phases 1–2 (uncommitted, integration-mage)

## Scope
- New: js/boss-game-sprite-atlas.js (131), js/boss-game-arena.js (67), js/boss-game-sprite-actors.js (122), tests/boss-game-sprite-atlas.test.js, tools/copy-boss-sprites.js, img/boss/** (10 PNG, 169KB)
- Modified: boss-game-render.js (135), boss-game-spell-art.js (168), boss-game-ui.js (194), boss-game-story.js, server/static-file-server.js, sw.js, app-storage.js, index.html, tests/*
- Checks: `node --check` on all js/*.js, tools, server: OK. `node tests/run-tests.js`: **428 passed, 0 failed**. Logic/progress/sync files (boss-game-logic.js, boss-game-progress.js, boss-progress-sync-merge.js): **untouched** (git diff --quiet).

## Verdict
Mostly solid. Fallback, caching, server allowlist and SW are correct. One scope violation: particle rendering changed for **all** regions, not only Ashford. The rest is low severity.

## High

**H1. Particle style changed for every region, not only the pixel region.** js/boss-game-spell-art.js:124-135 (drawBossFx)
- Shard/smoke/spark/orb are now drawn with `bossPixelDot` in every case. The old diamond, circle and stroke code is gone. So Emberfell and the other 2 hand-drawn regions change look too. This breaks the brief: "other 3 regions keep old hand-drawn path exactly (fx.layout.pixel=false)".
- Phase-02 step 4 does say "Đổi hạt boss sang ô vuông pixel" without scoping it to a region. So the plan and the brief conflict. The lead must decide which one wins.
- Fix (if the brief wins): branch on `fx.layout.pixel` inside both drawParticles callbacks. Keep the old arc/diamond/stroke code in the else branch. File is 168 lines, so there is room.

## Medium

**M1. Sprite motion ignores reduced-motion.** js/boss-game-sprite-actors.js:90-93, 104-107
- These all run even when `fx.reduced` is set: lunge (monster travels 35% of the way to the mage), recoil, the "angry" ±k px jitter at 20Hz, and the mage bob.
- Existing code turns off shake (spell-art:63,84) and rage jitter (render:92) when `fx.reduced` is set. The new code does not follow that pattern.
- Fix: when `fx.reduced`, skip lunge/angry jitter and shrink recoil. Flashes can stay.

**M2. `imageSmoothingEnabled=false` leaks outside save/restore.** js/boss-game-sprite-atlas.js:97
- It is set before `ctx.save()`, so it stays on ui.ctx for the rest of the frame and later frames.
- Harmless today: the only other drawImage is the bg, drawn 1:1 in device pixels (render.js:38). But any future scaled drawImage (glow canvases, phase 4 VFX) would silently come out blocky.
- Fix: set it after `save()`.
- Side note: canvas resize resets smoothing to true. That is handled, because drawSprite sets the flag on every call and the arena sets its own.

## Low

- **L1. Fallback monster drawn at pixel-layout geometry.** render.js:111-114. If slime.png fails, `drawMonster` gets `layout.mon` with y=0.52h and s=16·kq, so a small hand-drawn goblin floats at the horizon. The clock ring is also dropped (`if (!px)`), but the HUD clock bar still shows, so the game stays playable. Acceptable, but know that the fallback does not look like the old view.
- **L2. Dissolve when the sprite never loaded.** actors:46-56. `A.dead=true` with `pieces=[]`, so `drawBossMonsterSprite` returns true and draws nothing. The fallback hand-drawn monster vanishes at the kill impact with no effect (smoke only shows if smoke.png loaded). It never throws. Cosmetic only.
- **L3. getImageData can throw** (actors:51 → atlas:121) if the canvas is tainted. It runs inside bossFxEvent, with no try, so a throw would break the frame loop at the win. Same-origin HTTP(S) cannot taint. file:// is unsupported per README:34. Optional: wrap in try and return [].
- **L4. Failed image loads never retry.** atlas:60-65 caches `{ok:false}` for the whole session. One network blip on first visit (before the SW has cached the images) means hand-drawn art until reload. Fix: delete the entry in onerror so the next battle retries.
- **L5. Pixels uneven at non-integer DPR** (1.25/1.5/1.75 on Windows and some Android). Scale is an integer in CSS px, and the ctx is scaled by dpr (game-viewport-fit.js:13), so texels come out 1.5k device px wide. Nearest-neighbour means jaggy, not blurry. Plan acceptance only covers DPR 1/2/3, and 3 is capped to 2 (ui.js:6). Note it for the iPhone/desktop check.
- **L6. Arena base tile scaled non-uniformly.** arena:62 uses kx≠ky, so pixels are non-square. This is deliberate ("ép dẹt") but goes against the plan's "pixel không bị kéo lệch".
- **L7. Arena tile coords untested.** `BOSS_ARENAS` rects (arena:10-17) are not checked against PNG size. The atlas test only covers `BOSS_SPRITES` anims. A wrong rect draws empty or garbage and nothing flags it. Fix: add an IHDR bounds check like the existing test.
- **L8. Style:** server/static-file-server.js:12 has `NAME_RX =/^…` (missing space).
- **L9. Mismatch until phase 3:** the goblin shows as a slime but keeps name "Goblin" in the HUD and story. Expected per plan.

## Explicit checks
(a) Acceptance
- Crisp: smoothing off in drawSprite and arena. Scales are integers (pixelScale, `Math.round` on mul 1.5). Coords rounded (translate, dx/dy, tiles, dots, shadow).
- Load failure: loadBossSprites always resolves, and every draw path returns false and falls back. The un-awaited promise cannot reject.
- All 10 PNGs are in sw.js ASSETS; the test enforces it (atlas.test:203).
- No new or modified code file is over 200 lines. spell-presets is 208, but it is pre-existing data.

(b) No regression
- Logic untouched. bossActorEvent only reads events and writes only fx.actor, fx.sprites and `shot.sprite`.
- Non-pixel regions: actors, arena, clock bar and HUD backdrop are all gated by `layout.pixel`. **Exception: H1.**
- Hub, first-run and the ultimate cutscene are not in the diff and still use drawMage.
- State leak across battles: none. createBossFx makes fresh actor/sprites/bg for each battle.
- Growth: fx.sprites is pruned in stepBossActors (every entry is loop:false). pieces are pruned by life. bossSpriteTint is bounded by frames × 3 colours.

(c) Contract changes
- `layoutBoss(fx,w,h,ui)`: the only caller is ui.js:121. The 4th param is optional; without it the old layout is used.
- Static server: 4-segment path, fixed dir allowlist, `.png` only (case-sensitive). NAME_RX runs on each segment after decode, and `%`, `\`, NUL and `//` are rejected first. Traversal and hidden files are blocked; tests cover depth, ext, dir, `..` and dotfile. OK.
- `sprite` story field: additive, not persisted (id kept), so sync `eng.boss.v1` is unaffected.

(d) Patterns: header comments, typeof guards and the fx-state style all match. Deviation: reduced-motion (M1).

(e) Syntax OK; 428/428 pass.

Other items checked, all OK:
- Composite op around the sprite shot in the lighter loop (spell-art:142-146) is restored correctly, and drawSprite save/restore keeps alpha.
- drawBossRegion cache key now includes `bgArena`, so it flips to the tile arena once tiles load. Correct.
- The arena is baked with layout bases. layout only changes on resize, which also invalidates bg. OK.
- Impact with hp≤0 starts the dissolve. A second pending impact (chain hits) only re-flashes a dead actor and spawns an explosion. OK.

## Recommended actions
1. H1: gate the pixel particles on `fx.layout.pixel`, or get the lead to confirm the global change is accepted.
2. M1: respect `fx.reduced` in the actor motion.
3. M2: move `imageSmoothingEnabled` after `save()`.
4. Optional: L4 retry on error, L7 arena rect test, L3 try around getImageData.

## Plan status
- Phase 1 (atlas, copy tool, assets, SW, server, test): complete.
- Phase 2: code complete. The "user duyệt trên iPhone" and FPS ≥50 checks cannot be verified here.

## Unresolved questions
1. Should the boss particle restyle be global (as the plan says) or Ashford-only (as the brief says)?
2. Is it OK that the fallback hand-drawn monster uses the Pokémon layout position and size (L1)?

Status: DONE_WITH_CONCERNS
Summary: Syntax is clean and 428/428 tests pass. Logic and sync are untouched, and the fallback, caching and server allowlist are correct. One scope issue: the pixel-square particles apply to all regions (spell-art drawBossFx), not only Ashford.
Concerns/Blockers: H1 needs a decision from the lead (plan vs brief). M1 (reduced-motion) and M2 (smoothing flag leak) are small fixes.
