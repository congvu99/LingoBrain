---
phase: 3
title: "Evolution and ultimate visuals"
status: completed
priority: P2
dependencies: [2]
effort: "M"
---

# Phase 3: Evolution and ultimate visuals

## Overview
Chiêu đã tiến hoá (slot có trong `skillOverrides` của dạng đang dùng) có hình nâng cấp; 5 tuyệt kỹ thêm lớp hình mới từ bộ Ninja Adventure.

## Requirements
- Ghi đè hình chỉ khi dạng tiến hoá đang active ghi đè slot đó; không đổi `effect`.
- Không đổi hợp đồng formId (`js/boss-progress-sync-merge.js`).
- `js/boss-game-tier3-ultimate-fx.js` (131 dòng) không vượt 200 → phần mới vào dữ liệu + module riêng nếu cần.

## Architecture
<!-- Updated: Validation Session 1 - 1 bản nâng cấp mỗi chiêu, cờ evolved thay evoForm -->
- `BOSS_EVO_SKILL_VISUALS[skillId]` trong `js/boss-game-skill-visuals.js` — 1 bản nâng cấp mỗi chiêu (không theo từng dạng): `{ extends: true, scale, addImpact: [...] }` = kế thừa visuals chiêu gốc + lớp thêm, hoặc schema đầy đủ như `BOSS_SKILL_VISUALS`.
- Đã kiểm: `bossSkillsFor` (js/boss-game-evolution.js:26) gộp override lên chiêu gốc, GIỮ `skill.id` gốc; cast chỉ mang `skill` + `skillName`. → `bossResolveSkillCast` (js/boss-game-skill-pick.js:82) trả thêm `evolved: skill !== BOSS_SKILLS[el][slot]` (hoặc so theo `skill.name` khác gốc), logic.js thêm `evolved` vào payload cast + pendingImpacts → impact (chỉ dữ liệu hiển thị, không đổi hợp đồng formId/effect). Hàm tra `bossSkillVisualFor(skillId, evolved)` trong skill-motion.js.
- Tuyệt kỹ: thêm trường vào `BOSS_ULTIMATE_PRESETS` (js/boss-game-spell-presets.js): `overlay` (Fog/Raylight/Clouds phủ màn), `rain` (particleSnow/particleFire/leaf rơi), `motion` (meteor dùng `sky` qua bossShotPos).
  - meteor: sky nhiều viên (giữ bossUltBoostCount) + particleFire rơi
  - iceAge: Fog phủ + particleSnow + icePillar
  - chain: thunder chuỗi nối + circleSpark2 dưới quái
  - revive: Raylight chiếu xuống pháp sư + boost
  - tornado: smokeCircular + leaf/leafPink xoay theo lift
- Vẽ overlay/rain: `js/boss-game-ultimate-overlay-fx.js` (mới, ~80 dòng) step/draw trong thời gian `fx.ultimate.life`; tắt khi reduced.

## Related Code Files
- Modify: `js/boss-game-skill-visuals.js`, `js/boss-game-spell-presets.js`, `js/boss-game-tier3-ultimate-fx.js`, `js/boss-game-skill-pick.js` + `js/boss-game-logic.js` (cờ evolved), `tests/boss-game-skill-pick.test.js`, `js/boss-game-render.js` (gọi draw overlay đúng lớp)
- Create: `js/boss-game-ultimate-overlay-fx.js`

## Implementation Steps
1. Thêm cờ `evolved` vào kết quả `bossResolveSkillCast` + payload cast/impact; thêm test skill-pick (dạng có override → evolved=true, không override → false); test cũ vẫn pass.
2. Viết `BOSS_EVO_SKILL_VISUALS` cho mọi skillId có slot bị ghi đè trong ít nhất 1 dạng của `BOSS_EVO` (js/boss-game-evolution-forms.js).
3. Mở rộng `BOSS_ULTIMATE_PRESETS` + module overlay; nối vào render.
4. Soát trình duyệt: 1 dạng/hệ + 5 tuyệt kỹ.

## Success Criteria
- [x] Mọi skillId bị ghi đè trong `BOSS_EVO` có mục `BOSS_EVO_SKILL_VISUALS` (test ở phase 6).
- [x] 5 tuyệt kỹ có lớp mới; reduced-motion không phủ màn.

## Risk Assessment
- Overlay phủ màn che HUD/chữ gõ: vẽ dưới lớp chữ/HUD, alpha ≤0.5.
