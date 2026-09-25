---
title: "Mage Lexoria combat depth: threat gauge, combo ultimate, skill roster, evolution"
description: "Thay đồng hồ trùm bằng thanh tấn công, chờ phép xong mới hiện từ, combo + tuyệt kỹ chuỗi niệm, 7 chiêu tự phát/hệ, tiến hoá 2 mốc cây 2→4."
status: in-progress
priority: P2
branch: "main"
tags: [frontend, game, tdd]
blockedBy: []
blocks: []
created: "2026-09-25T02:25:51.010Z"
createdBy: "ck:plan"
source: skill
mode: "default --tdd (brainstorm đã chốt thiết kế, không spawn researcher)"
---

# Mage Lexoria combat depth

## Overview
Game Pháp sư đang quá đơn giản: 1 phép chủ động/hệ, đồng hồ trùm không phản ứng khi gõ xong, từ mới đè hoạt ảnh phép, tuyệt kỹ chỉ là nộ 8 từ.
Plan làm 5 phase tuần tự, mỗi phase **test trước** (`node tests/run-tests.js`). Nguồn: [brainstorm report](../reports/brainstorm-260925-0913-mage-lexoria-combat-depth-skills-evolution-report.md).

## Ràng buộc chung
- Static, script global theo thứ tự `index.html`; file mới → `<script>` + `ASSETS` (`sw.js`) + `PURE_MODULES` (`tests/run-tests.js`) + `tests/run-tests.html` nếu thuần.
- File code ≤ 200 dòng (trừ file dữ liệu thuần không hàm). `boss-game-logic.js` đã 199 dòng → **bắt buộc tách** trước khi thêm logic.
- Số cân bằng chỉ trong `BOSS_TUNING` (`js/boss-game-spell-math.js`).
- Không ghi SM-2. Sync `eng.boss.v1` chỉ-tiến: chỉ thêm field, không gỡ.
- Mỗi phase xong: bump `APP_VERSION` (`js/app-storage.js`) = `CACHE` (`sw.js`), hiện `2.18.0` → phase 1 `2.19.0`, mỗi phase kế +0.1.
- Sprite mới chép từ `assets/ninja-adventure/` bằng `tools/copy-boss-sprites.js` vào `img/boss/` (gói gốc không commit).

## TDD cho mọi phase
Tests Before (khoá hành vi cũ còn giữ) → Seams/tách module → Refactor/tính năng → Tests After → Regression gate: `node tests/run-tests.js` xanh (gồm `pwa-assets`).

## Phases
| Phase | Name | Status |
|-------|------|--------|
| 1 | [Threat gauge replaces boss clock](./phase-01-threat-gauge-replaces-boss-clock.md) | Completed (v2.19.0) |
| 2 | [Cast pacing hold next word](./phase-02-cast-pacing-hold-next-word.md) | Completed (v2.20.0) |
| 3 | [Combo and chain-cast ultimate](./phase-03-combo-and-chain-cast-ultimate.md) | Completed (v2.21.0 → v2.21.1 fixes) |
| 4 | [Skill roster 35 auto-trigger skills](./phase-04-skill-roster-35-auto-trigger-skills.md) | Pending (awaiting user approval) |
| 5 | [Evolution forms and evo sync schema](./phase-05-evolution-forms-and-evo-sync-schema.md) | Pending (awaiting user approval) |

**Cổng duyệt:** hết phase 2 → **user chơi thử trên máy thật (SKIPPED per session decision)**.
Đầu phase 4 và 5: user duyệt bảng tên/hiệu ứng chiêu (skill-roster-proposal.md) và bảng dạng tiến hoá (evolution-forms-proposal.md) trước khi code nội dung.

## Dependencies
- Nối tiếp `260924-1426-mage-lexoria-boss-rpg-game` (phase 6 còn in-progress, chỉ chờ user kiểm FPS iPhone) và `260924-1651-...-pixel-art` (completed). Không chặn nhau, nhưng sửa cùng file — không chạy song song.
- Phase: 1 → 2 → 3 → 4 → 5 (4 cần combo của 3; 5 nâng cấp chiêu của 4).

## Acceptance (toàn plan)
- Thanh tấn công dưới quái: đầy theo giờ, gõ xong từ giảm (nhanh giảm nhiều), gõ sai tăng; đầy → quái đánh.
- Không đề mới nào hiện trước khi phép chạm và vụ nổ qua đỉnh (chạm + `afterImpactMs`).
- Combo HUD + tuyệt kỹ chuỗi niệm 3 từ với 3 mức hiệu lực.
- 5 hệ × 7 chiêu tự phát mở theo cấp, có icon + FX riêng.
- Tiến hoá cấp 8/16, cây 2→4, 30 dạng, đổi tự do ở sảnh, sync `evo` LWW.
- `node tests/run-tests.js` xanh; file ≤ 200 dòng; FPS ≥ 50 desktop (`?fps`); offline PWA đủ ảnh.

## Câu hỏi chưa giải
1. Bảng 35 chiêu + 30 dạng: đề xuất ở đầu phase 4/5 để user duyệt.
2. Tăng `hp` quái bù sát thương mới? Quyết sau mô phỏng số cuối phase 3–4.
3. Chuỗi niệm 9s có gắt trên bàn phím iPhone? Duyệt ở cổng sau phase 3 (số trong `BOSS_TUNING`).

## Validation Log

### Session 1 — 2026-09-25
**Verification Results**
- Claims checked: 24 · Verified: 22 · Failed: 2 · Unverified: 0 · Tier: Full (5 phase, kiểm trực tiếp bằng grep/đọc code)
- Failed 1: công thức khoá phase 2 `max(impactMs, castAnimMs)` sai — VFX nổ bắt đầu TẠI lúc chạm (`js/boss-game-sprite-atlas.js:64` rockImpact 14 khung/16fps ≈ 875ms).
- Failed 2: phase 4/5 làm vượt 200 dòng — `js/boss-game-sprite-atlas.js` 193, `js/boss-game-sprite-actors.js` 199 dòng; plan chưa có bước tách.
- Verified mẫu: `drawBossClockBar` `boss-game-render.js:56`; `angry` `boss-game-sprite-actors.js:153`; `createBattle` `boss-game-ui.js:50`; nút ult `boss-game-ui.js:138`; Shift+Enter `boss-game-ui.js:105`; `mergePick` `boss-progress-sync-merge.js:81`; server → `js/sync-merge.js` → `require('./boss-progress-sync-merge.js')`; `opt.solid` atlas; `tools/copy-boss-sprites.js` tồn tại.

**Quyết định (4 câu hỏi)**
| Câu hỏi | Chốt | Ảnh hưởng |
|---|---|---|
| Nhịp niệm | Chạm + đuôi cố định `afterImpactMs [0,350,450,600]` | phase 2 |
| Tốc độ mở chiêu | Nén: cấp 1,2,3,4,6,8,10 | phase 4 |
| Khiên chặn có reset combo | Không reset | phase 3 |
| Vượt 200 dòng | Tách `boss-game-skill-fx.js` + `boss-game-skill-sprites.js` (p4), `boss-game-evolution-sprites.js` (p5) | phase 4, 5 |

### Whole-Plan Consistency Sweep
- Grep toàn plan: `castAnim`, `max(impactMs`, `cấp 14`, `| 14 |`, `kể cả khiên` → 0 kết quả.
- Overview phase 2, câu `st.rage/st.ult` phase 3, số nhịp trong brainstorm report đã đồng bộ.
- Mâu thuẫn còn lại: 0.

## Progress / Session 2026-09-25

### Completed
**Phase 1–3 Implementation & Verification**
- Tests: 531 passed/0 failed (node tests/run-tests.js)
- Code review + re-review: all High/Medium findings fixed
- Version: 2.21.1 (p1: 2.19.0, p2: 2.20.0, p3: 2.21.0, fixes: 2.21.1)
- Uncommitted: ready to stage after approval

**Phase 1 Success Criteria** ✓
- [✓] Tất cả test mới + viết lại xanh; không test cũ bị xoá mà không thay
- [✓] Threat gauge module, BOSS_TUNING thêm threatDrain/Typo/Miss
- [✓] Render thanh dưới quái, trạng thái rung/đỏ, xoá đồng hồ cũ
- [✓] pwa-assets xanh, version = cache

**Phase 2 Success Criteria** ✓
- [✓] Test khoá nhịp xanh; test cũ xanh
- [✓] afterImpactMs: [0, 350, 450, 600] áp; event `next` sau khoá; ô gõ trống/mờ; phím trong khoá bị bỏ
- [✓] Impact vẫn phát đúng impactMs; wonAt không trễ thêm
- [~] User chơi thử máy thật cảm giác thanh quái + nhịp: **SKIPPED** (user decision — hybrid mode approval waived gate)

**Phase 3 Success Criteria** ✓
- [✓] Combo HUD, thanh 10 nấc ult, chuỗi niệm 9s × 3 từ
- [✓] Hiệu lực k=1 bằng tuyệt kỹ cũ (test)
- [✓] Mọi test xanh; file ≤ 200 dòng
- [✓] Mô phỏng số hoàn thành (sim: 71%/68% thời gian no-combo, >60% threshold)

### User Decisions (This Session)
| Quyết định | Giá trị | Ảnh hưởng |
|---|---|---|
| Hybrid mode (parallel p1-3) | approved | Tăng tốc độ, không chờ cổng |
| Post-phase-2 device gate | SKIPPED | Không chơi thử máy thật; cảm giác có thể cần điều chỉnh sau |
| Chain hits deal damage | Yes | Mỗi chainHit gây sát thương bậc cao nhất, không tính tốc độ |
| Boss death mid-chain | Win immediately | Chuỗi bị ngắt, quái chết → thắng ngay |
| Frozen monster defer attack | Until unfreeze | Quái đóng băng lùi attack, threat không tăng |

### Open Items (To Block Phase 4)
- **N3** (Normal): multi-answer chain progress mismatch — verify chain `i` tracking with multi-word typo scenarios
- **N4** (Normal): chain hits skip on-hit passives — route auto-trigger skills through shared hit path (must-do phase 4 requirement)
- **N5** (Normal): chain HUD over monster head at 360px — verify z-order, reposition if needed
- **L1** (Low): small word pool chain <3 words — list coverage gap, add test cases
- **L2** (Low): giveup attack waits reveal lock — behavior mismatch with reveal UI timing

**Manual Tuning Pending**
- afterImpactMs fine-tune (visual feel per tier)
- HP rebalancing if needed (sim baseline: 71%/68% = good)
- Chain 9s timing on-device iPhone feel check (deferred per gate waiver)

### Next Step
**Blocker:** User approval of two proposals before phase 4:
1. `skill-roster-proposal.md` — 35 chiêu × 5 hệ + icon/FX/unlock tiers
2. `evolution-forms-proposal.md` — 30 dạng × 2 cây (8/16 cấp) + icon/color/stat

Once approved → Phase 4 can begin. Phase 4 gate: resolve N4 (hit path routing) before implementation.
