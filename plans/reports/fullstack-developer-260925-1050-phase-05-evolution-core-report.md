# Phase 5 (Evolution forms + evo sync schema) — pure core implementation report

Worktree: `D:\project\eng\.claude\worktrees\agent-a12a322d65e736971`
Branch: `worktree-agent-a12a322d65e736971`
Commit: `1dd5c3da683fe55ae9e0fc830d63f32722d5f4a4`
`node tests/run-tests.js`: **472 passed, 0 failed**

(Note: this report could only be written inside the worktree — the sandbox refused a write to the shared-checkout path `D:\project\eng\plans\reports\...` from this isolated worktree agent. Caller should copy/move this file to the main-tree reports path, or use this content directly.)

## Files changed/created (all owned per scope, no other files touched)

Modified:
- `js/boss-progress-sync-merge.js` (+21 lines, now 126) — `BOSS_EVO_FORMS` id list, `emptyBoss().evo`, `cleanBoss` evo (per-element `cleanPick` with `BOSS_EVO_FORMS[el]` as allow-list, def `''`), `mergeBoss` evo (per-element `mergePick`, LWW). Other fields untouched — verified byte-identical behavior via full existing test suite + `sync-merge.test.js`/cloud-sync tests all still green.
- `tests/boss-progress-sync-merge.test.js` — `randBoss` now generates `evo`; added describe block "boss sync — evo (tiến hoá, phase 5)": old payload → empty evo; merge keeps evo; reject wrong-element id / `__proto__` / clamp future ts; junk-doesn't-throw; per-element LWW independence; commutative/associative/idempotent (covered generically via updated `randBoss` in the existing 200-iteration property test) + explicit `merge(x, empty) ≡ x` spot check.
- `tests/run-tests.js` / `tests/run-tests.html` — registered `js/boss-game-evolution-forms.js`, `js/boss-game-evolution-sprites.js`, `js/boss-game-evolution.js` (loaded right after `boss-game-elements.js`) and `tests/boss-game-evolution.test.js`.

Created:
- `js/boss-game-evolution-forms.js` (208 lines, pure data — exceeds 200 as permitted for data-only files) — `BOSS_EVO[el][formId] = {name, parent, level, sprite, face, mods, skillOverrides, ultBonus}` for all 30 forms.
- `js/boss-game-evolution.js` (40 lines, pure logic) — `bossEvoUnlocked`, `bossActiveForm`, `bossEvoMods`, `bossSkillsFor`, `bossEvoUltBonus`.
- `js/boss-game-evolution-sprites.js` (79 lines, pure data) — `BOSS_EVO_SPRITES` with 60 entries (30 sheets `fw:16,fh:16` + 30 facesets `fw:38,fh:38`), same shape as `BOSS_CHAR_ANIMS`/`mageFFace` in `boss-game-sprite-atlas.js` but self-contained (`BOSS_EVO_CHAR_ANIMS`/`BOSS_EVO_FACE_ANIMS` declared locally) so the atlas file was not touched.
- `tests/boss-game-evolution.test.js` (141 lines) — unit tests for all 5 pure functions + data-consistency checks (id list matches `BOSS_EVO_FORMS`, 30 forms/6 per element, parent/level rules, all `skillOverrides` slots ∈ the 7 valid slots and level-8 forms never override `counter`, exactly 1 modifier per form, sprite/face keys resolve in `BOSS_EVO_SPRITES`, sprite shape checks).
- `img/boss/actor/evo-*.png` — 60 files, 60 pairs copied from `assets/ninja-adventure` (235,008 bytes / ~230KB, under the ~300KB budget from the proposal).

## API for integrator

```js
// js/boss-progress-sync-merge.js (server + client, shared)
BOSS_EVO_FORMS[el]        // array of valid formIds for element el, e.g. ['fire-a','fire-b','fire-a1',...]
emptyBoss().evo           // { fire:{v:'',ts:0}, ice:{...}, storm:{...}, earth:{...}, wind:{...} }
cleanBoss(x, now).evo     // same shape, each {v,ts} sanitized (unknown/wrong-element id -> '', future ts clamped)
mergeBoss(a, b).evo       // same shape, LWW per element (independent ts per element)

// js/boss-game-evolution-forms.js (client only, pure data)
BOSS_EVO[el][formId] = { name, parent, level, sprite, face, mods, skillOverrides, ultBonus }

// js/boss-game-evolution.js (client only, pure logic)
bossEvoUnlocked(el, formId, level)          // bool; '' always true; unknown/wrong-element id -> false
bossActiveForm(evoProg, el, level)          // evoProg = boss.evo (whole map); returns formId or '' (never mutates)
bossEvoMods(form)                           // form = BOSS_EVO[el][formId] or undefined/null -> {}
bossSkillsFor(el, form, baseSkills)         // baseSkills = phase-4 BOSS_SKILLS[el] slot table; returns NEW table
bossEvoUltBonus(form)                       // 0 or 0.25

// js/boss-game-evolution-sprites.js (client only, pure data)
BOSS_EVO_SPRITES[key]                       // key = form.sprite / form.face, same shape as BOSS_SPRITES entries
```

Integration TODO for the assembling agent (not done here per scope):
1. Merge `BOSS_EVO_SPRITES` into `BOSS_SPRITES` (atlas), or load both maps at the point sprites are looked up.
2. In `modifiersFor`/battle-setup caller: add `bossEvoMods(BOSS_EVO[el][bossActiveForm(prog.evo, el, level)])` on top of `ELEMENT_RANKS` totals (additive, not stacked with parent — data already accounts for that per the approved proposal, question 4).
3. In skill resolution: call `bossSkillsFor(el, form, BOSS_SKILLS[el])` once phase 4's `BOSS_SKILLS` lands, before looking up the slot for the current word.
4. Chain-cast bonus: add `bossEvoUltBonus(form)` to `k` before `bossChainFactor` — per the approved proposal this only changes the rounded meteor/chain step when `k===1`; the meteor/chain rounding rule change itself is out of this phase's scope (assigned to integration).
5. `tools/copy-boss-sprites.js` (owned by phase-4 agent): add the 60 mappings below so a fresh clone can reproduce `img/boss/actor/evo-*.png`.

## Sprite source→dest mapping (for `tools/copy-boss-sprites.js`)

```
img/boss/actor/evo-fire-a.png       <- Actor/Character/NinjaFire/SpriteSheet.png
img/boss/actor/evo-fire-a-face.png  <- Actor/Character/NinjaFire/Faceset.png
img/boss/actor/evo-fire-a1.png      <- Actor/Character/DemonRed/SpriteSheet.png
img/boss/actor/evo-fire-a1-face.png <- Actor/Character/DemonRed/Faceset.png
img/boss/actor/evo-fire-a2.png      <- Actor/Character/FighterRed/SpriteSheet.png
img/boss/actor/evo-fire-a2-face.png <- Actor/Character/FighterRed/Faceset.png
img/boss/actor/evo-fire-b.png       <- Actor/Character/RedNinja3/SpriteSheet.png       (swap, see below)
img/boss/actor/evo-fire-b-face.png  <- Actor/Character/RedNinja3/Faceset.png
img/boss/actor/evo-fire-b1.png      <- Actor/Character/RedGladiator/SpriteSheet.png
img/boss/actor/evo-fire-b1-face.png <- Actor/Character/RedGladiator/Faceset.png
img/boss/actor/evo-fire-b2.png      <- Actor/Character/Monk2/SpriteSheet.png
img/boss/actor/evo-fire-b2-face.png <- Actor/Character/Monk2/Faceset.png
img/boss/actor/evo-ice-a.png        <- Actor/Character/NinjaWater/SpriteSheet.png
img/boss/actor/evo-ice-a-face.png   <- Actor/Character/NinjaWater/Faceset.png
img/boss/actor/evo-ice-a1.png       <- Actor/Character/NinjaBlue2/SpriteSheet.png
img/boss/actor/evo-ice-a1-face.png  <- Actor/Character/NinjaBlue2/Faceset.png
img/boss/actor/evo-ice-a2.png       <- Actor/Character/SamuraiBlue/SpriteSheet.png
img/boss/actor/evo-ice-a2-face.png  <- Actor/Character/SamuraiBlue/Faceset.png
img/boss/actor/evo-ice-b.png        <- Actor/Character/Eskimo/SpriteSheet.png
img/boss/actor/evo-ice-b-face.png   <- Actor/Character/Eskimo/Faceset.png
img/boss/actor/evo-ice-b1.png       <- Actor/Character/NinjaEskimo/SpriteSheet.png
img/boss/actor/evo-ice-b1-face.png  <- Actor/Character/NinjaEskimo/Faceset.png
img/boss/actor/evo-ice-b2.png       <- Actor/Character/GladiatorBlue/SpriteSheet.png
img/boss/actor/evo-ice-b2-face.png  <- Actor/Character/GladiatorBlue/Faceset.png
img/boss/actor/evo-storm-a.png       <- Actor/Character/NinjaThunder/SpriteSheet.png
img/boss/actor/evo-storm-a-face.png  <- Actor/Character/NinjaThunder/Faceset.png
img/boss/actor/evo-storm-a1.png      <- Actor/Character/NinjaYellow/SpriteSheet.png
img/boss/actor/evo-storm-a1-face.png <- Actor/Character/NinjaYellow/Faceset.png
img/boss/actor/evo-storm-a2.png      <- Actor/Character/LionYellow/SpriteSheet.png
img/boss/actor/evo-storm-a2-face.png <- Actor/Character/LionYellow/Faceset.png
img/boss/actor/evo-storm-b.png       <- Actor/Character/RobotGrey/SpriteSheet.png
img/boss/actor/evo-storm-b-face.png  <- Actor/Character/RobotGrey/Faceset.png
img/boss/actor/evo-storm-b1.png      <- Actor/Character/KnightGold/SpriteSheet.png
img/boss/actor/evo-storm-b1-face.png <- Actor/Character/KnightGold/Faceset.png
img/boss/actor/evo-storm-b2.png      <- Actor/Character/GoldStatue/SpriteSheet.png
img/boss/actor/evo-storm-b2-face.png <- Actor/Character/GoldStatue/Faceset.png
img/boss/actor/evo-earth-a.png       <- Actor/Character/NinjaLeaf/SpriteSheet.png
img/boss/actor/evo-earth-a-face.png  <- Actor/Character/NinjaLeaf/Faceset.png
img/boss/actor/evo-earth-a1.png      <- Actor/Character/CaveLion/SpriteSheet.png
img/boss/actor/evo-earth-a1-face.png <- Actor/Character/CaveLion/Faceset.png
img/boss/actor/evo-earth-a2.png      <- Actor/Character/DemonGreen/SpriteSheet.png
img/boss/actor/evo-earth-a2-face.png <- Actor/Character/DemonGreen/Faceset.png
img/boss/actor/evo-earth-b.png       <- Actor/Character/Shaman/SpriteSheet.png
img/boss/actor/evo-earth-b-face.png  <- Actor/Character/Shaman/Faceset.png
img/boss/actor/evo-earth-b1.png      <- Actor/Character/Monk/SpriteSheet.png
img/boss/actor/evo-earth-b1-face.png <- Actor/Character/Monk/Faceset.png
img/boss/actor/evo-earth-b2.png      <- Actor/Character/Statue/SpriteSheet.png
img/boss/actor/evo-earth-b2-face.png <- Actor/Character/Statue/Faceset.png
img/boss/actor/evo-wind-a.png       <- Actor/Character/NinjaGray/SpriteSheet.png
img/boss/actor/evo-wind-a-face.png  <- Actor/Character/NinjaGray/Faceset.png
img/boss/actor/evo-wind-a1.png      <- Actor/Character/Tengu2/SpriteSheet.png
img/boss/actor/evo-wind-a1-face.png <- Actor/Character/Tengu2/Faceset.png
img/boss/actor/evo-wind-a2.png      <- Actor/Character/MaskFrog/SpriteSheet.png
img/boss/actor/evo-wind-a2-face.png <- Actor/Character/MaskFrog/Faceset.png
img/boss/actor/evo-wind-b.png       <- Actor/Character/SorcererOrange/SpriteSheet.png
img/boss/actor/evo-wind-b-face.png  <- Actor/Character/SorcererOrange/Faceset.png
img/boss/actor/evo-wind-b1.png      <- Actor/Character/Master/SpriteSheet.png
img/boss/actor/evo-wind-b1-face.png <- Actor/Character/Master/Faceset.png
img/boss/actor/evo-wind-b2.png      <- Actor/Character/OldMan3/SpriteSheet.png       (swap, see below)
img/boss/actor/evo-wind-b2-face.png <- Actor/Character/OldMan3/Faceset.png
```

Generator/copy scripts used (scratchpad, not committed, run once): `gen-evo-sprites.js`, `copy-evo-sprites.js` in the session scratchpad dir. Copied 60 files, 235,008 bytes total.

## Sprite swaps chosen (per binding decisions)

- `fire-b`: **RedNinja3** instead of `SamuraiRed` (avoids the `redsamurai.png` non-standard filename called out in the proposal's ⚠️ note). Verified `SpriteSheet.png`/`Faceset.png` exist, dims 64×112 / 38×38 (matches `CamouflageRed`, the other backup candidate, and `mageF`).
- `wind-b2`: **OldMan3** instead of `NinjaMageBlack` (avoids visual confusion with the base male mage sprite `NinjaMageOrange`, called out in the proposal's ⚠️ note and open question 2). Verified same dims.

## Data source

30-form table, ids, stats, skill overrides, ultBonus all taken verbatim from the APPROVED `reports/evolution-forms-proposal.md` (§4), translated from the Vietnamese skill-name descriptions into the primitive-effect objects defined in `reports/skill-roster-proposal.md` (§0/§1-5) and the modifier semantics in `js/boss-game-elements.js`'s `modifiersFor`. Every form has exactly 1 modifier (per proposal §2 "Mỗi dạng đúng 1 modifier"), level-16 forms do not additionally stack the parent's modifier value (proposal §6 Q4, resolved "no" — the level-16 numbers already include the level-8 contribution), and `ultBonus` is `0.25` for all level-16 forms / `0` for level-8 forms as instructed (rounding-rule change for meteor/chain deferred to integration).

## Unresolved questions (carried over from the proposal, not blocking this phase)

1. Skill-override effect params assumed the phase-4 skill-roster-proposal's provisional numbers (fire example table explicit, other elements marked "(gốc)" placeholders in the proposal) — when the 35-skill roster is finalized by the phase-4 agent, `skillOverrides` effect values may need re-tuning to stay ≥10-30% stronger than the final base numbers (proposal §6, note "luôn ≥ gốc").
2. `shieldCap`/heal caps mentioned in both proposals (`BOSS_TUNING.shieldCap: 2`) are phase-4/integration concerns, not touched here.
3. Vietnamese display names (`name` field) are explicitly non-contract per the proposal (§7 Q7) — free to rename before release.

Status: DONE
Summary: Evo sync schema (BOSS_EVO_FORMS/evo field, clean+merge LWW) added to boss-progress-sync-merge.js; 30-form pure data + pure logic + 60-sprite data files created; 60 PNGs copied with the two required swaps (RedNinja3, OldMan3); full test suite green (472/0) in isolated worktree; committed at 1dd5c3d on worktree-agent-a12a322d65e736971.
Concerns/Blockers: None blocking. Integration must merge BOSS_EVO_SPRITES into the atlas, wire bossEvoMods/bossSkillsFor/bossEvoUltBonus into battle setup once phase-4's BOSS_SKILLS lands, and add the 60 mappings above to tools/copy-boss-sprites.js.
