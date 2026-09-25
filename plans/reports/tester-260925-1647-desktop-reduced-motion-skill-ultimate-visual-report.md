# Desktop + Reduced-Motion Skill/Ultimate Visual QA

Date: 2026-09-25 · Env: playwright-core Chromium headless, server :3000 already running (PID 7888, not started/stopped by tester). No repo source edited.

## Runs
| Run | Viewport | Context | Script | Output |
|---|---|---|---|---|
| A1 skills | 1440×900 | default | `run-skill-probe-v2.js` | `skills-desktop/` (30 shots + probe.json) |
| A2 ults | 1440×900 | default | `run-ult-probe-v2.js` | `ults-desktop/` (5 ults × 300/900/1500/2200ms) |
| B ults | 390×844 | `reducedMotion:'reduce'` | `run-ult-probe-v2.js` | `ults-reduced/` |

Scratch root: `C:\Users\ADMINI~1\AppData\Local\Temp\claude\d--project-eng\b4ae99ad-6c1d-46e8-bab8-b2e8744c1c21\scratchpad\qa\`
New files (originals untouched): `qa-lib-v2.js` (newPage takes extra ctx opts), `run-skill-probe-v2.js`, `run-ult-probe-v2.js` (env W/H/OUTDIR/RM), `sheet-v2.js` (configurable crop/scale).

## Contact sheets (viewed)
- `...\qa\skills-desktop\sheet.png` — 30 skills, arena crop
- `...\qa\ults-desktop\sheet.png`
- `...\qa\ults-reduced\sheet.png`
- Zooms: `...\qa\zoom-exec\sheet.png` (mage area, execute casts), `...\qa\zoom-ult-mage\sheet.png`, `...\qa\zoom-ult-mon\sheet.png`, `...\qa\zoom-red\sheet.png`

## Errors
- pageerror: **none** in any of the 3 runs.
- Console: only `HTTP 503` for `/api/audio-index`, `/api/words`, `/api/tts?...` (backend API/TTS unavailable on this server), and a Playwright-caused SW-blocked warning. Not VFX-related.

## Verification results
| Check | Result |
|---|---|
| Skill impact VFX visible on desktop, no dark square smoke over monster | PASS for all 30. Every skill has its impact sprite on the monster (probe sprite list matches visuals). No dark square cloud covers a monster. |
| Meteor: fireballs + explosions after intro | PASS (desktop fireballs x5 + explosions 900–2200ms) |
| iceAge: ice pillar | PASS, but pillar is modest (monster-sized) — see issue 3 |
| chain: big lightning strikes | PASS — large bolts, clearly visible |
| revive: boost bursts + white halo around mage | Halo PASS; boost bursts weak — see issue 4 |
| tornado: smoke + swirl slashes | PASS — slashCircular swirls clear; smoke puffs subtle |
| Name text not covering VFX after intro | PASS — at 300ms the name sits centered (intro, overlaps monster, expected); from 900ms it moves to top banner, clear of VFX |
| Reduced: no fullscreen fog/flash | PASS — no flash; arena ambient fog also gone in ruins arena. Intro dim + portrait still shown at 300ms (a dim, not a flash) |
| Reduced: meteor explodes in place | PASS — sprites only `explosion` (no `fireball`), explosion at monster |
| Reduced: VFX still visible | PASS for chain, tornado, revive halo, meteor; iceAge small but visible |

## Issues
| # | Skill/Ult | What's wrong | Severity |
|---|---|---|---|
| 1 | storm-execute, storm-combo6, storm-counter (also storm-long/fast) | Impact sprite (bigEnergyBall x10 / circleSpark2 x5–6) is a big opaque white/cyan blob that fully hides the monster at impact+180ms. Bright, not dark smoke, but monster invisible for that frame. Same as prior mobile run (`skills/sheet.png`). | Low–Medium (design choice?) |
| 2 | earth-execute, fire-execute (caster side) | Semi-transparent dark square particles (~20–40px blocks) around the mage at cast time. Look like square smoke tiles; not over the monster. See `zoom-exec/sheet.png`. | Low |
| 3 | ult iceAge (desktop) | Thin white jagged vertical line left of monster persists 900→2200ms (static, looks like a stray crack/bolt line). Not visible in reduced run. Ice pillar itself small relative to other ults. | Low–Medium |
| 4 | ult revive | Boost bursts barely readable — only faint diagonal translucent streaks + small white orbs on the halo ring. Halo clear. | Low |
| 5 | ice/storm arenas (ruins layout, ambient `fog`) | Heavy gray fog blobs over sky/ground with hard rectangular edges in sky (vertical cut ~x=480, horizontal ~y=305 at desktop). Arena ambient (`js/boss-game-arena-ambient.js` fog band), not skill VFX; does not cover monster. | Low (arena, out of skill scope) |
| 6 | all ults, reduced motion 300ms | Small static square dust particles on the intro dim overlay remain in reduced mode. Harmless. | Info |

## Housekeeping
First launch attempt ran from repo cwd by mistake and wrote `D:/project/eng/probe-ults-desktop.log` and `D:/project/eng/probe-ults-reduced.log` (MODULE_NOT_FOUND output only). Both gitignored (`*.log`). Deletion was blocked by permission classifier — please delete manually.

## Unresolved questions
- Is the full-cover storm impact blob (issue 1) intended?
- Source of the iceAge jagged line (issue 3) not traced — worth a dev look at iceAge sprite list/cracks drawing on desktop size.

Status: DONE_WITH_CONCERNS
Summary: All 3 runs completed with no JS page errors. All 30 skills and 5 ultimates show their VFX on desktop, and reduced motion behaves as specified. Only low-to-medium visual nits remain: storm impacts hide the monster, dark square particles appear at the caster on execute casts, a stray line shows in desktop iceAge, and revive boosts are faint.
