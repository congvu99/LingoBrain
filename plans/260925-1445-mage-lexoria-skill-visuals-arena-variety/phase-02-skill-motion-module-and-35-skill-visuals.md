---
phase: 2
title: "Skill motion module and 35 skill visuals"
status: completed
priority: P1
dependencies: [1]
effort: "L"
---

# Phase 2: Skill motion module and 35 skill visuals

## Overview
Tách công thức vị trí đạn thành module quỹ đạo 6 kiểu; thêm dữ liệu hình riêng từng chiêu (đạn, quỹ đạo, burst niệm, VFX va chạm) thay cho preset hệ×bậc chung + 1 sprite phụ.

## Requirements
- Bất biến thời gian: `bossShotPos(s, 1)` = (x1, y1); impact vẫn theo `BOSS_TUNING.impactMs`.
- Basic giữ nguyên preset hệ×bậc (không đổi cảm giác cấp 1).
- Không 2 chiêu cùng hệ trùng (proj, motion, impact[0]); mỗi sprite dùng ≤2 lần/hệ; bỏ `solid` tô một màu.
- `e.skill` đã có trên event `cast`/`impact` (boss-game-skill-fx.js) — dùng lại, không thêm event.

## Architecture
- `js/boss-game-skill-motion.js` (~120 dòng, logic):
  - `BOSS_MOTIONS = ['arc','straight','sky','ground','fan','spin']`
  - `bossShotPos(s, k)` → {x,y}; `bossShotDir(s, k)` → góc (thay đạo hàm inline ở `drawBossShotSprite`, boss-game-sprite-actors.js:183)
    - arc: công thức hiện tại (`- sin(kπ)·30`)
    - straight: tuyến tính, easing nhanh dần
    - sky: xuất phát (x1 - s·0.2, top-ish) rơi thẳng xuống
    - ground: không vẽ đạn (ẩn tới k=1), VFX trồi ở chân quái lúc impact
    - fan: shot thứ h lệch góc ±(h)·spread ở đầu, hội tụ tại k=1 (bezier bậc 2)
    - spin: như arc + `opt.rot = t·ω`
  - reduced-motion: sky/fan → straight.
- `js/boss-game-skill-visuals.js` (dữ liệu thuần): `BOSS_SKILL_VISUALS[skillId] = { proj, motion, shots?, cast: [sprite], impact: [sprite], scale }`.
- Luồng: `bossFxEvent('cast')` (boss-game-spell-art.js) đọc `BOSS_SKILL_VISUALS[e.skill]` nếu có → gắn `motion`, `sprite`, số shot vào `fx.shots`; `bossActorEvent('impact')` dùng `impact[]` của chiêu thay preset. `bossSkillFxImpactEvent` bỏ sprite phụ khi chiêu có visuals (tránh chồng 2 lớp).
- `BOSS_SKILL_FX` giữ `text/color/castBurst`; bỏ trường `impactSprite` sau khi chuyển xong (hoặc để fallback — chọn bỏ cho DRY).

## Bảng hình đề xuất (implementer được chỉnh nếu sheet đo ra không hợp, giữ ràng buộc không trùng)
| Hệ | combo3 | long | fast | combo6 | execute | counter |
|---|---|---|---|---|---|---|
| Lửa | fan 2×fireball → flam | ground → flam lớn + explosion | straight shurikenMagic → sparkMagic | ground → magicCircle + particleFire | sky bigEnergyBall → explosion×2 + smoke | straight fireball → slashDoubleCurved |
| Băng | fan 3×iceSpike → iceFlakeB | ground → icePillar | straight iceSpike → cutX | ground → shieldSprite + iceFlake | sky iceSpike → waterPillar | straight → water + iceFlakeB |
| Sét | straight energyBall → sparkMagic | sky → thunder×2 | straight kunai → cut + thunder | fan 3×energyBall → circleSpark2 | sky → thunder×3 lệch | straight bigEnergyBall → circleSpark |
| Đất | fan 3×rockProj → rockB | ground → rockSpike | straight rockProj → claw | ground → plant + plantB | sky rockProj lớn → rockImpact + rockSpike | ground → shieldYellow |
| Gió | spin leaf → windLeaf | spin bigShuriken → slashCircular | straight spiritProj → slash01 | fan 3×spiritBlue → slashMulti | straight → slashArc + slash03 | spin → spiritDouble + smokeCircular |

## Related Code Files
- Create: `js/boss-game-skill-motion.js`, `js/boss-game-skill-visuals.js`, `tests/boss-game-skill-motion.test.js`
- Modify: `js/boss-game-spell-art.js` (cast push shots + step/draw dùng bossShotPos), `js/boss-game-sprite-actors.js` (impact dùng visuals; drawBossShotSprite dùng bossShotDir + spin), `js/boss-game-skill-fx.js` (bỏ sprite phụ khi có visuals), `js/boss-game-skill-roster.js` (dọn `impactSprite`), `index.html`, `tests/run-tests.*`

## Implementation Steps
1. Viết test trước cho `bossShotPos`: mọi motion, k=0 ≈ gốc (trừ sky/ground), k=1 = đích; fan hội tụ.
2. Tạo module motion; refactor spell-art + sprite-actors dùng nó với motion `arc` → chạy test cũ, không đổi hình basic.
3. Viết dữ liệu visuals 30 chiêu (6 slot × 5 hệ); nối vào cast/impact.
4. Dọn `impactSprite`/`solid` trong roster + skill-fx.
5. Kiểm trình duyệt từng hệ (trang debug/ô chọn chiêu nếu có, hoặc ép slot qua console).

## Success Criteria
- [x] Test motion + test cũ pass; basic trông như trước.
- [x] 30 chiêu đặc biệt nhìn phân biệt (soát bằng mắt, chụp màn).
- [x] spell-art.js, sprite-actors.js ≤200 dòng.

## Risk Assessment
- sprite-actors.js đã 203 dòng → phần mới đặt trong skill-motion.js, không phình thêm; nếu sửa chạm thì tách `drawBossShotSprite` sang module motion.
- `hits>1` (Xích sét) cùng id shot — giữ lọc theo `id` như hiện tại.
