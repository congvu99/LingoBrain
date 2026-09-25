# Phase 4 — Skill roster 35 auto-trigger skills — Implementation Report

## Executed Phase
- Phase: phase-04-skill-roster-35-auto-trigger-skills
- Plan: D:\project\eng\plans\260925-0913-mage-lexoria-combat-depth-skills-evolution
- Status: completed (except manual FPS check — noted)

## Files Modified
- `js/boss-game-logic.js` (200 lines): `createBattle` +level/skillTable/afterHit + shieldCap clamp; `castComplete` calls `bossResolveSkillCast`; `bossApplyImpacts` refactored onto shared `bossApplyHit`; `stepBattle` sets `st.afterHit=true` only when a heart is actually lost (not on shield block).
- `js/boss-game-combo-chain.js` (143 lines): `bossChainHit` now routes through `bossApplyHit` (N4 fix — chain hits get passives, no skill pick); shieldCap clamp on revive/tornado k≥1.5 bonus.
- `js/boss-game-threat-gauge.js` (30): `bossThreatDrainOnCast(st, speed, mul)` optional mul (default 1, no behavior change for old callers).
- `js/boss-game-spell-math.js` (92): `BOSS_TUNING.shieldCap = 2`.
- `js/boss-game-ui.js` (195): `createBattle(...)` now passes `level: levelFromXp(bossProg.xp)`.
- `js/boss-game-hub-ui.js` (97): "📖 Sổ chiêu" button → `renderSkillBook()`.
- `js/boss-game-result-ui.js` (163): `bossUiEvents` calls `bossSkillFxEvent(ui.fx, e)` per event.
- `tools/copy-boss-sprites.js`: +43 entries (30 skill icons + 13 new FX sheets).
- `index.html`, `sw.js`, `tests/run-tests.js`, `tests/run-tests.html`: registered 5 new files + all new PNGs.
- `js/app-storage.js` / `sw.js`: version 2.21.2 → **2.22.0**.
- `css/paper-theme.css`: `.boss-skill-*` styles for Sổ chiêu screen.

## Files Created
- `js/boss-game-skill-roster.js` (116, data-only) — `BOSS_SKILL_UNLOCK_LEVEL`, `BOSS_SKILL_PRIORITY`, `BOSS_SKILL_SLOTS`, `BOSS_SKILLS` (5×7 = 35 skills, exactly per approved `reports/skill-roster-proposal.md`), `BOSS_SKILL_FX` (float-text + VFX-overlay data per skill).
- `js/boss-game-skill-pick.js` (111) — `bossSkillSlotMatches`, `bossPickSkill(ctx, el, level, skills)`, `bossStrongerBurn`, `bossApplySkillEffect`, `bossResolveSkillCast`, `bossApplyHit` (shared hit-application path, N4 fix).
- `js/boss-game-skill-sprites.js` (29, data-only) — `BOSS_SKILL_SPRITES` (13 new FX sheets), merged into `BOSS_SPRITES` via `Object.assign` at load (no edit needed to `sprite-atlas.js`, keeps it at 193 lines).
- `js/boss-game-skill-fx.js` (34) — `bossSkillFxEvent(fx, e)`: float chiêu tên + 1 VFX sprite overlay on `cast`/`impact` events carrying `e.skill`.
- `js/boss-game-skill-book-ui.js` (43) — `renderSkillBook()` ("Sổ chiêu" hub screen).
- `tests/boss-game-skill-pick.test.js` — 33 new tests (see below).
- 43 new PNGs in `img/boss/fx/` (30 skill icons 24×24 + 13 FX sheets), copied via `tools/copy-boss-sprites.js` from `assets/ninja-adventure/`. `img/boss/` grew 375KB → 456KB (+81KB, under 500KB budget).

## Tasks Completed
- [x] Tests Before: basic-slot dmg at level 1 == current `spellDamage` (no multiplier) — 5 elements, all green.
- [x] 35 skills wired exactly per approved proposal (names/conditions/effects/icons/fx keys) — data test asserts every `BOSS_SKILLS[el][slot]` exists with required fields, non-basic fx keys resolve in `BOSS_SKILL_FX`.
- [x] Unlock levels 1,2,3,4,6,8,10; deterministic priority execute>counter>combo6>long>fast>combo3>basic — unit tests cover every slot + tie-break combos.
- [x] `extraHits` = 50% of base D each (pre-crit, pre-dmgMul), single combined pendingImpact (matches existing "hits" visual-only convention from tier3 boost).
- [x] `shieldCap: 2` applied at **every** shield-gain source: initial element passive (`createBattle` clamp), skill `effect.shield` (`bossApplySkillEffect`), ultimate revive/tornado k≥1.5 bonus (`bossApplyUltimate`) — tests for all three.
- [x] burn: skill vs passive — stronger (`dps×sec`) wins, no stacking (`bossStrongerBurn`, tested both directions).
- [x] freeze from skill is guaranteed (bypasses `freezeChance` roll) — tested.
- [x] counter does **not** trigger on a shield-blocked hit, only when a heart is lost (`st.afterHit` set only in the no-shield branch of `stepBattle`) — tested end-to-end via `shieldBlock` vs `hurt`.
- [x] execute uses HP **at cast time** (`st.hp/st.hpMax` computed before this cast's own pending impact resolves) — tested with two HP snapshots (25% picks execute, 35% doesn't even though the same word's damage would later cross the threshold).
- [x] N4 fix: `bossChainHit` and `bossApplyImpacts` now share `bossApplyHit` — chain hits apply on-hit passives (burn/freeze) but do **not** pick a skill (documented decision: no skill pick during chain, passives yes) — tested both properties.
- [x] `bossPickSkill(ctx, el, level, skills)` accepts optional per-element `skills` table (defaults `BOSS_SKILLS[el]`) for later evolution overrides — tested with a custom table.
- [x] `createBattle` optional `level` (default 1, backward compatible — all pre-existing tests omit it and still pass unchanged) and optional `skills` (full BOSS_SKILLS-shaped table).
- [x] Sổ chiêu hub screen listing the 7 skills of the active element (icon, condition label, effect summary, unlock state by current level).
- [x] Version bump 2.21.2 → 2.22.0 (APP_VERSION == CACHE, verified by `pwa-assets` test).
- [x] All boss-game code files ≤ 200 lines (logic.js exactly 200; pre-existing `spell-presets.js` 225 untouched, per plan note).

## Tests Status
- Type check: n/a (vanilla JS, no build step)
- Unit tests: **pass** — `node tests/run-tests.js` → **564 passed / 0 failed** (baseline 531 + 33 new in `boss-game-skill-pick.test.js`), incl. `pwa-assets` (asset/script parity, CACHE==APP_VERSION) and the two sprite-integrity tests that verify every `BOSS_SPRITES` entry (incl. the 13 new `BOSS_SKILL_SPRITES`) exists on disk and is listed in `sw.js` ASSETS.
- Integration tests: none added beyond the above (no server/API surface touched).
- Manual FPS ≥ 50 desktop (`?fps`) with skills+combo: **not verified** (no browser available in this environment) — flagged as open item per phase's own acceptance-criteria caveat ("except manual FPS/visual").

## Step 7 — Time-to-kill simulation (skills+combo vs pre-phase-3 original)
Ran a headless simulation (Node vm, real `createBattle`/`stepBattle`/`typeKey`, 40-word synthetic pool at the documented 30/40/30 tier split, boss HP 2000, max-speed typing, no HP loss) at level 1 (skills locked — this is exactly the phase-3 baseline, since combo cannot be toggled off in the current code), level 6 and level 10 (skills unlocked), across all 5 elements:

| Element | Level 1 (ms) | Level 6 (ms) | Level 10 (ms) | L10/L1 |
|---|---|---|---|---|
| Fire | 50484 | 30714 | 30714 | 60.8% |
| Storm | 50484 | 29712 | 30714 | 60.8% |
| Earth | 50484 | 29712 | 30714 | 60.8% |
| Ice | 50484 | 36696 | 36028 | 71.4% |
| Wind | 50484 | 36028 | 36696 | 72.7% |

Skills alone (on top of the existing phase-3 combo, which is always-on in the current code) cut time-to-kill to **61–73%** of the phase-3 baseline. Combined with phase 3's own already-recorded ratio (71%/68% of the true *pre-phase-3* original, from the phase-3 report), the compounded estimate vs the true original is **≈ 42–51%** — well under the 60% threshold.

**Open question raised, HP NOT changed** (per binding instruction "do not change hp"): consider raising `BOSS_TUNING.hp` (proposal §8 suggested ×1.3–1.4) to compensate for phase 3+4 combined damage growth. This is a product decision for the user, not made here.

## Exported API for the phase-5 integrator
- **Skill table shape**: `BOSS_SKILLS[el][slot] = { id, name, icon, fx, effect }` where `el` ∈ `BOSS_ELEMENTS`, `slot` ∈ `BOSS_SKILL_SLOTS` (`['basic','combo3','long','fast','combo6','execute','counter']`), `effect` is a plain object of primitives (`dmgMul`, `extraHits`, `crit`, `burn:{dps,sec}`, `freeze:{sec}`, `threatDrainMul`, `shield`, `heal`, `ultAdd` — all optional, `{}` = no-op).
- **Override table**: pass `createBattle({ ..., skills: <BOSS_SKILLS-shaped table> })`. Internally `createBattle` computes `st.skillTable = o.skills[mods.element]` (the active element's 7-slot sub-table) and every `castComplete` call routes through `bossResolveSkillCast(st, dmg, crit, letters, speed)` → `bossPickSkill(ctx, el, level, st.skillTable)`. If `o.skills` is omitted, `st.skillTable` is `undefined` and `bossPickSkill` falls back to `BOSS_SKILLS[el]` — **no code change needed elsewhere** to plug in an evolution-specific table; only build a variant object with the same shape (e.g. clone `BOSS_SKILLS[el]` and swap `effect`/`fx`/`icon` per evolved slot) and pass it in.
- **Where level enters `createBattle`**: `o.level` (number, default `1`). `js/boss-game-ui.js:startBossBattle` already passes `level: levelFromXp(bossProg.xp)`. A phase-5 integrator adding per-form stat scaling should keep reading level the same way; it does not interact with `skills` override (both are independent optional fields).
- **Shared hit path for future "on-hit" hooks**: `bossApplyHit(st, now, dmg, tier, opt)` (`js/boss-game-skill-pick.js`) is now the single place both normal impacts and chain hits pass through. Any future evolution-triggered on-hit effect should be added here (or via the `opt.burn`/`opt.freeze` fields already threaded from `pendingImpacts`) rather than duplicating logic in `bossApplyImpacts`/`bossChainHit`.
- **FX override**: `BOSS_SKILL_FX[skill.fx]` (`js/boss-game-skill-roster.js`) — if an evolution form changes a skill's `fx` string to a new key, add the corresponding entry to `BOSS_SKILL_FX` (or a separate table merged the same way `BOSS_SKILL_SPRITES` is merged into `BOSS_SPRITES`).

## Issues Encountered / Deviations
- `docs/system-architecture.md`, `js/plane-game-ui.js`, `js/word-game-ui.js` show as modified in `git status` but were **not touched by this phase** — pre-existing changes from a different in-progress workstream (plans/260925-1043-hide-typing-input-plane-mage-games/), confirmed via `git diff` (unrelated hunks). Left untouched, not committed.
- FX for `extraHits`/multi-hit primitives reuses the existing "hits" visual convention (single combined `pendingImpact`, `cast.hits` used only for shot-count FX) rather than separate impact events — consistent with the pre-existing tier3-boost pattern (`meteor`/`chain`), avoids adding a second damage-application shape.
- `BOSS_SKILL_FX[id].impactSprite.solid` field is recorded as documentation/intent but not actually wired to a tint (would require extending `bossSpawnSprite`/`drawBossSpriteFx` in `js/boss-game-sprite-actors.js`, which is already at 199/200 lines — out of budget for this phase). Sprites render in their native colors instead; visually still distinct per skill (different sprite shapes), just not palette-swapped. Flagging as a known minor gap, not a regression.
- Did not commit (per instruction).

## Next Steps
- User: decide on the HP-raise open question (Step 7) before/at phase 5 integration, or explicitly accept the faster time-to-kill.
- Phase 5 integrator: use the "Exported API" section above; no further changes needed in phase-4 files to add an evolution-aware skill/FX table.
- Manual: verify FPS ≥ 50 desktop with `?fps` and eyeball the 35 skills' icons/FX in a real browser session (not verifiable headlessly here).

## Unresolved Questions
1. Raise `BOSS_TUNING.hp` (proposal suggests ×1.3–1.4) given combined phase 3+4 time-to-kill ≈ 42–51% of pre-phase-3 original? (not changed here per instruction)
2. `BOSS_SKILL_FX[...].solid` tint intent is unused (see Deviations) — worth a small follow-up to `boss-game-sprite-actors.js` in a later pass with fresh line budget, or drop the field entirely?

Status: DONE_WITH_CONCERNS
Summary: 35-skill roster/pick/FX/book UI implemented exactly per approved proposal; shieldCap/burn-wins/counter-no-shield/execute-at-cast/N4-shared-hit-path all wired + tested; 564/0 tests green incl. pwa-assets; version 2.22.0; all files ≤200 lines.
Concerns/Blockers: Step-7 sim shows combined phase 3+4 time-to-kill ≈42–51% of original (<60% threshold) — HP raise flagged as open question per instructions, not applied. FPS/visual checks are manual-only and unverified in this headless environment. `solid` tint field in BOSS_SKILL_FX is inert (documented gap, sprite-actors.js has no line budget left).
