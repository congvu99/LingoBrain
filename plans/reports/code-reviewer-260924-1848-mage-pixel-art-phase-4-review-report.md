# Code review — Phase 4 (Element VFX and ultimates)

Reviewer's findings relayed by coordinator (review tool itself could not write this file). Recorded here verbatim-ish
before fixes, for traceability.

## HIGH
1. **Meteor fireballs never pruned**: `fireball` anim loops so `spriteAnimDone` never true; moving sprites fly
   forever and accumulate in `fx.sprites`. Fix: add explicit `life` to sprite entries
   (`bossSpawnSprite(..., vel, life) → filter s.life != null ? s.t < s.life : !spriteAnimDone(...)`); meteor passes
   `life = dur` (flight duration). Add unit test (pure-ish: simulate `stepBossActors` with a fake `fx`) that after
   `ultimateMs` `fx.sprites` is empty (or at least moving sprites removed).

## MEDIUM
2. Impact scale normalises every sprite to 0.7×monster height regardless of native size → windLeaf 12×7 becomes
   120–240px, smokeCircular tier3 300px, tornado full canvas width. Add per-sprite size factor (e.g. `vfx: 0.3` in
   `BOSS_SPRITES` def or `{name,size}` in preset impact); leaves = several small particle-like sprites, not one
   hero sprite; tornado ≈ 1.2× monster width max.
3. Projectile scale/rotation assume 16px up-pointing sprite: use real `fh` (`bossVfxFh`) and per-def `rotOffset`
   (IceSpike 18×10 strip probably points along +x → offset 0 not PI/2; verify by viewing the PNG; spiritProj 32px
   renders 2× too big).
4. Meteor fireballs drawn unrotated (tail leads): store `rot = atan2(vy,vx)+rotOffset` on moving sprites and pass
   to `drawSprite`.
5. Tornado lift outlives its VFX (smokeCircular 0.67s vs lift ~1.15s of 1.5s ultimateMs): loop tornado smoke with
   `life = ultimateMs/1000` and draw it offset by current lift so it carries the monster. Consider same for
   icePillar/boost if they look too short.
6. Shield: anchor at feet (no center), play rise once from shield-gain moment then hold last frame (`loop:false`;
   track gain time in `fx.actor`), no re-rising flicker.
7. Magic circle tier 3 drawn upright over mage: squash vertically (`opt.scaleY` or `ctx.scale(1,0.4)`) and draw it
   BEFORE the mage (ground layer), check tier-3 screenshots.
8. Scope: implement buff Aura (Magic/Aura around mage while `ui.buff` / review buff active — find how buff is
   exposed: `ui.buff` in `boss-game-ui.js`; pass via `fx`/`st` as needed without touching logic files) and burn
   passive (small Flam/Particle Fire sprite on monster on `burnTick`). Uncheck "FPS ≥ 50" in phase-04 unless
   actually measured; state "chưa đo — user kiểm `?fps`".

## LOW
9. Stale comments: `render.js` lines ~5, 7-8, 120 ("hình lớn bậc 3", drawMage fallback wording ok), `spell-art.js`
   ~115.
12. Reduced motion: disable portrait slide-in (show static) and meteor fall motion (spawn explosions only) when
    `fx.reduced`.
13. Cutscene: Faceset must not overlap ultimate name text on narrow 390×340 screens; place/scale accordingly.

(10 `docs/system-architecture.md` is phase 5 — skip.)

## Disposition
All HIGH/MEDIUM items + applicable LOW items (9, 12, 13) fixed in this pass. See phase-4 report addendum
(`plans/reports/fullstack-developer-260924-1826-mage-pixel-art-phase-4-report.md`, "Cập nhật sau code review"
section) for file-by-file changes, screenshots and test status.
