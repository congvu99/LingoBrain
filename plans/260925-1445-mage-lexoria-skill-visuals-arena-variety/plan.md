---
title: "Mage Lexoria skill visuals and arena variety"
description: "Mỗi chiêu (35 + tiến hoá + tuyệt kỹ) có đạn/quỹ đạo/va chạm riêng, đòn quái có VFX, 12 sân riêng theo quái + lớp môi trường động — toàn bộ hình lấy từ bộ Ninja Adventure"
status: completed
priority: P2
branch: "main"
tags: [boss-game, pixel-art, vfx, arena]
blockedBy: [260925-1140-boss-arena-wider-camera-unified-pixel-scale]
blocks: []
created: "2026-09-25T07:50:10.807Z"
createdBy: "ck:plan"
source: skill
---

# Mage Lexoria skill visuals and arena variety

## Overview
Hiện chiêu cùng hệ trông y hệt (đạn + va chạm chỉ theo hệ×bậc, `js/boss-game-spell-presets.js`; chiêu chỉ thêm 1 sprite phụ nhỏ ở `BOSS_SKILL_FX`), 1 quỹ đạo cong duy nhất, quái đánh không VFX, 4 sân tĩnh dùng chung 3 quái/sân. Plan này: dữ liệu hình riêng từng chiêu + module quỹ đạo (6 kiểu), VFX tiến hoá/tuyệt kỹ/đòn quái, 12 sân theo quái + lớp ambient động.

Nguồn: [brainstorm report](../reports/brainstorm-260925-1445-mage-lexoria-skill-visuals-arena-variety-report.md)

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Copy sprites and atlas entries](./phase-01-copy-sprites-and-atlas-entries.md) | Completed |
| 2 | [Skill motion module and 35 skill visuals](./phase-02-skill-motion-module-and-35-skill-visuals.md) | Completed |
| 3 | [Evolution and ultimate visuals](./phase-03-evolution-and-ultimate-visuals.md) | Completed |
| 4 | [Monster attack VFX](./phase-04-monster-attack-vfx.md) | Completed |
| 5 | [Per-monster arenas and ambient layer](./phase-05-per-monster-arenas-and-ambient-layer.md) | Completed |
| 6 | [Integrity tests visual QA and release](./phase-06-integrity-tests-visual-qa-and-release.md) | Completed |

Thứ tự: 1 → 2 → 3; 4 và 5 chỉ cần 1 (song song được với 2/3 nếu tách người, file không chồng); 6 cuối.

## Ràng buộc chung
- Hình CHỈ từ `assets/ninja-adventure/` (CC0), chép qua `tools/copy-boss-sprites.js` vào `img/boss/`.
- File logic ≤200 dòng; file dữ liệu thuần (không hàm) được vượt.
- Không đổi số sát thương/logic trận/event; FX chỉ đọc `st.events`.
- Đạn vẫn chạm đúng `BOSS_TUNING.impactMs` (bất biến: tại k=1 vị trí = điểm chạm quái).
- Giữ `reduced-motion` (tắt ambient + quỹ đạo `sky`/`fan` bay dài → nổ tại chỗ) và trần hạt.
- Cỡ đạn/VFX theo `worldK` của plan 260925-1140 (dùng `drawBossShotSprite`/`bossVfxScale` sẵn có).

## Acceptance criteria
- Không 2 chiêu cùng hệ trùng tổ hợp (proj, motion, impact[0]) — có test.
- Mọi khoá sprite trong dữ liệu mới tồn tại trong `BOSS_SPRITES`; mọi quái có sân + ambient + attack FX — có test.
- Chiêu đã tiến hoá (slot trong `skillOverrides`) nhìn khác chiêu gốc.
- 5 tuyệt kỹ có thêm lớp hình mới (Fog/Snow/Raylight/Leaf…).
- `node tests/run-tests.js` pass; soát hình trên trình duyệt (mobile dọc + desktop) 4 vùng.
- `APP_VERSION` (js/app-storage.js) = `CACHE` (sw.js) đã tăng; mọi ảnh + js mới có trong danh sách precache sw.js.

## Validation Log

### Session 1 — 2026-09-25
**Verification Results**
- Claims checked: ~25 · Verified: 21 | Failed: 4 | Unverified: 0 · Tier: Full (6 phase)
- Failures (đã sửa sau khi người dùng duyệt):
  1. Phase 1 chép trùng: `rock-b2` = `fx/rock-b.png` (tools/copy-boss-sprites.js:130), `magic-spark` = `sparkMagic` (tools/copy-boss-sprites.js:123)
  2. Phase 4/5 sai id quái: thật là `goblinKing`, `lich`, `wyvern` (js/boss-game-story.js:23,27,31)
  3. Cast không mang id dạng tiến hoá: `bossSkillsFor` giữ `skill.id` gốc (js/boss-game-evolution.js:26-31)
  4. sw.js precache liệt kê từng ảnh (sw.js:80+) — plan ghi "nếu"
- Đã xác nhận: `e.skill` có trên cast/impact (js/boss-game-logic.js:104,106), `BOSS_ULTIMATE_PRESETS` (js/boss-game-spell-presets.js:219), `bossUiEvents` gọi `bossSkillFxEvent` (js/boss-game-result-ui.js:12), mọi file nguồn asset liệt kê ở phase 1 tồn tại.

**Quyết định**
1. Hình tiến hoá: 1 bản nâng cấp mỗi chiêu `BOSS_EVO_SKILL_VISUALS[skillId]` + cờ `evolved` trên cast/impact (không theo formId).
2. Sửa hết 4 lỗi kiểm chứng.
3. Bảng hình 30 chiêu + 12 sân = hướng dẫn; implementer được chỉnh theo khung đo, giữ luật không trùng; duyệt qua ảnh visual QA.
4. Precache TẤT CẢ ảnh mới trong sw.js.

**Propagation**: phase 1 (bỏ trùng), 2 (sparkMagic), 3 (evolved), 4/5 (id quái), 6 (test evo + precache).

### Whole-Plan Consistency Sweep
- Grep thuật ngữ cũ (evoForm, formId][slot, giant-racoon, giant-spirit, tengu, magic-spark, rock-b2, magicSpark, "nếu sw liệt kê"): chỉ còn trong marker `Updated`. Mâu thuẫn chưa giải: 0.

## Dependencies
- blockedBy `260925-1140-boss-arena-wider-camera-unified-pixel-scale` (phase 2 in progress: cỡ đạn theo pháp sư trong `drawBossShotSprite`, cùng vùng code với phase 2 plan này). Chốt/đóng plan đó trước khi làm phase 2.
