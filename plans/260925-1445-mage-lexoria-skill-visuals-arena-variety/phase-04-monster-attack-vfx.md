---
phase: 4
title: "Monster attack VFX"
status: completed
priority: P2
dependencies: [1]
effort: "S"
---

# Phase 4: Monster attack VFX

## Overview
Hiện quái đánh chỉ lunge (`bossActorEvent` 'hurt', js/boss-game-sprite-actors.js:58). Thêm VFX riêng từng quái tại pháp sư lúc `hurt` (và `shieldBlock`).

## Requirements
- `hurt` phát đúng lúc trừ tim (js/boss-game-logic.js:187) → VFX nổ TẠI pháp sư ngay, không đạn bay (tránh lệch; không thêm event telegraph — YAGNI), kết hợp lunge sẵn có.
- Quái có sheet Attack (TenguBlue, GiantRacoon) giữ nguyên.

## Architecture
<!-- Updated: Validation Session 1 - id quái thật theo js/boss-game-story.js -->
- Dữ liệu `BOSS_MONSTER_ATTACK_FX` (theo id quái trong `js/boss-game-story.js`) đặt trong `js/boss-game-skill-visuals.js` hoặc file dữ liệu riêng `js/boss-game-monster-attack-fx.js`:
  - goblin (Slime) water · wolf (Racoon) claw · goblinKing clawDouble + rockImpact · skeleton spiritBlue · ghost spiritBlue + smoke · lich spiritDouble + fog ngắn · troll (Mole) rockSpike dưới chân pháp sư · harpy (Owl) cut · wyvern (TenguBlue) slashDoubleCurved · darkKnight (Flam) flam · youngDragon fireball ngắn + explosion nhỏ · oblivion explosion + thunder
  - `{ impact: [sprite], at: 'mage'|'mageFeet', scale }`
- `bossActorEvent('hurt')` tra `st` monster id → spawn; không có mục → như hiện tại.

## Related Code Files
- Create: `js/boss-game-monster-attack-fx.js` (dữ liệu + 1 hàm spawn nhỏ, hoặc hàm đặt trong skill-motion.js nếu còn chỗ)
- Modify: `js/boss-game-sprite-actors.js` (1 dòng gọi — file đang 203 dòng: nếu chạm, chuyển hàm gọi vào `bossUiEvents` ở js/boss-game-result-ui.js giống bossSkillFxEvent), `index.html`

## Implementation Steps
1. Xác định chỗ lấy id quái trong fx/st (`ui.monster.id`).
2. Viết dữ liệu 12 quái + hàm `bossMonsterAttackFxEvent(fx, e, monsterId)`; gọi từ `bossUiEvents`.
3. Soát 1 trận mỗi vùng, để quái đánh trúng.

## Success Criteria
- [x] 12 quái có mục (test ở phase 6); đòn trúng hiện VFX đúng lúc mất tim.

## Risk Assessment
- VFX to che pháp sư: scale theo `m.s` ≤0.8.
