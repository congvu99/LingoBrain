# Code review: unified world pixel scale (boss arena)

Scope: js/boss-game-arena.js:73-86, js/boss-game-render.js:13-36, js/boss-game-spell-art.js:51, js/boss-game-sprite-actors.js:182-189, tests/boss-game-arena.test.js, tests/run-tests.html:54, APP_VERSION/CACHE 2.24.0. I only reviewed the listed hunks. The `bossMageSprite(gender, form)` change in the same diff belongs to the earlier feature, so I ignored it.

## Acceptance
- Shared k: verified. `fx.layout.k === mage.k === bossWorldScale(h)`. A normal monster (fh 16) gets kq = k because 16k is always under the HUD limit at k ≤ 6. buildBossArena uses layout.k, and falls back to the same pure function of h.
- Boss vs HUD: the while-loop is unchanged and uses fhMax (Idle/Hit/Attack), so the boss does not overflow while kq ≥ 1. Checked h=320 and h=450: kq drops to 1 and 2, and it fits. Below h≈216 even kq=1 overflows. That was already true before this change and needs a very small frame.
- Projectile ≤ 1.5× mage: **only partly met.** `pixelScale` uses `Math.round`, so with odd k the result goes over 1.5×. Example: earth tier 2/3 (size 16/18, rockProj fh 16). At k=3, mageS=48, target 72, 72/16 = 4.5, which rounds to 5, giving 80px = 1.67×. At k=5 the result is 128px against 120px = 1.6×. See M1.
- Tests: `node tests/run-tests.js` → 611 passed, 0 failed. The 3 new boss-game-arena tests run in Node, and the script tag is in run-tests.html.

## bg cache (drawBossRegion)
Not a problem. k now depends only on h, and h is already a cache key. The ground patches in buildBossArena read layout.mon.s/k, which depend on the monster. But fx is created fresh for each battle (boss-game-ui.js:50, createBossFx), and the monster does not change during a battle, so the cache cannot go stale. The first draw before layoutBoss has layout.k undefined. The fallback `bossWorldScale(h)` gives the same value and the patches are skipped (`!q.k`), and that path already existed. layoutBoss has one caller (boss-game-ui.js:127).

## Callers of fx.layout.mage (all relative to m.s, no hard-coded 100px)
skill-fx text (m.s*1.35), shield/aura/ultimate (bossVfxScale(…, m.s)), cast point, slow-mo zoom, patch, and the threat bar (min width 46px, uses q.k). All of these scale correctly. The portrait and first-run UI use their own canvas and are not affected. Evolution form sprite: the frame height is assumed to be 16 like mageM/F (not checked against the evo PNGs).

## Findings (ranked)
1. **M1 – projectile can exceed 1.5× mage** (js/boss-game-sprite-actors.js:185-186). Rounding plus `s.scale` go past the cap. The fallback scale can be 1.9 (boss-game-spell-presets.js:17), but only for an element with no preset, so it is rare. iceSpikeProj (fw 18, fh 10, rotated along its flight path) is sized by fh, so its long side is about 2.25× the mage at k=2 (ice tier 3: scale 4 → 72px long vs 32px mage). Fix: cap after rounding, e.g. `const cap = Math.max(1, Math.floor(1.5 * (s.mageS || 32) / Math.max(def ? def.fw : 0, bossVfxFh(s.sprite))));` then `scale = Math.min(cap, …)`.
2. **M2 – typed-letter runes do not scale with the smaller mage** (js/boss-game-render.js:75, js/boss-game-spell-art.js:33). The rune radius is m.s*0.55, but the dot is a fixed 8/5 px. The mage used to be about 7× (≈112px on phone) and 15× (≈240px on desktop). It is now 32px (phone, k=2) and 64px (desktop h=800, k=4). At k=2 the radius is about 17.6px and the circumference about 110px. Words of 13 or more letters then give dots spaced about 8px or less, so they overlap and cover the mage. Suggest: dot = 2·m.k / 1.5·m.k, radius = max(m.s*0.55, total*…) or a fixed minimum.
3. **L1 – large drop in mage/boss size** (product, not a bug). The mage is 3.5-4× smaller on screen and the boss is about 25% smaller on desktop (68·4 = 272 vs 0.45·800 = 360). Burst particles, bossFxText (14-15px) and ring sizes are still in absolute px, so they now look large next to a 32px mage. Check on a real portrait phone.
4. **L2 – minor clamp inconsistency** (js/boss-game-arena.js:76). The comment says "mage ≥ 32px", which holds. But when the boss loop lowers kq below k, the boss is off the tile grid. This is already accepted in the comment, so no action needed.
5. **L3 – test coverage** (tests/boss-game-arena.test.js). The tests only check the pure function. Nothing asserts that layoutBoss gives mage.k === layout.k === mon.k for a normal monster, or that fhMax·kq ≤ monY − 0.14h. layoutBoss is Node-testable (no DOM) if BOSS_SPRITES is loaded. Adding one test would cover checklist items 1 and 2 in the phase file.

Style: Vietnamese comments and compact code, matching the rest of the file. There are no leftover `bossArenaScale` references in js/, and docs/ does not mention it. The version bump is consistent: APP_VERSION 2.24.0 and CACHE lingobrain-v2.24.0. Contract: bossArenaScale was an internal global with no other callers, so removing it is safe. buildBossArena has the same signature.

Plan phase-01 checklist: items 1-4 are met by code and tests, apart from the missing layoutBoss test (L3).

## Unresolved questions
- Is a 32px mage on portrait phones the intended "wider camera" result? The rune, particle and text sizes were designed for a mage of about 100px.
- Are the evo-* mage sprites 16px frames like mageM/F? If not, `s: 16*k` is wrong for evolved forms.

Status: DONE_WITH_CONCERNS
Summary: The shared k works for tiles, mage and normal monsters. The boss HUD clamp is kept, the bg cache is safe, and all 611 tests pass. Rounding lets the projectile go past the 1.5× cap, and the rune ring does not scale down with the smaller mage.
Concerns: M1 js/boss-game-sprite-actors.js:185-186; M2 js/boss-game-render.js:75 + js/boss-game-spell-art.js:33; L1 js/boss-game-render.js:34 (visual scale drop); L3 tests/boss-game-arena.test.js (no layoutBoss test).
