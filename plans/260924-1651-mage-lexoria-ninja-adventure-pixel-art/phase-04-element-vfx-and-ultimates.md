---
phase: 4
title: "Element VFX and ultimates"
status: completed
priority: P2
dependencies: [2]
---

# Phase 4: Element VFX and ultimates

## Overview
VFX sprite cho 5 hệ × 3 bậc + 5 tuyệt kỹ + hiệu ứng thụ động (đóng băng, bỏng, khiên), thay `boss-game-tier3-shapes.js`. Chạy song song được với phase 3 (khác file, trừ `sw.js`/`index.html`, gộp cuối).

## Requirements
Bảng VFX (đạn → va chạm):

| Hệ | Đạn | Va chạm bậc 1–2 | Bậc 3 (✦✦✦) |
|---|---|---|---|
| fire | Projectile/Fireball | Elemental/Flam + Explosion | Explosion ×2, Magic Circle cam |
| ice | Projectile/IceSpike | Elemental/Ice (Flake) | Ice SpriteSheetB (cột băng) |
| storm | Projectile/EnergyBall | Elemental/Thunder | Thunder ×3 (chuỗi) |
| earth | Projectile/SpriteSheetRock | Elemental/Rock | RockSpike |
| wind | Magic/Spirit (xanh) | Smoke/SmokeCircular + hạt Leaf | SmokeCircular ×2 xoáy |

Tuyệt kỹ: meteor = Fireball phóng ×4 rơi chéo + Explosion lớn; iceAge = Ice + phủ Snow toàn màn; chain = Thunder nhảy 3 lần; revive = Magic Boost + Heal xanh quanh pháp sư; tornado = SmokeCircular lớn + Leaf xoáy. Cắt cảnh tuyệt kỹ dùng Faceset 38×38 phóng ×4 thay chân dung vẽ tay.

Thụ động: đóng băng = phủ xanh + Ice Flake quanh quái; khiên = Magic/Shield xanh; buff = Magic/Aura.

Bậc 1/2/3 phân biệt bằng cỡ (×1/×1.5/×2), số đạn và vòng Magic Circle ở bậc 3.

## Architecture
- `boss-game-spell-presets.js` (dữ liệu): mỗi preset thêm `sprite: {proj, impact, big}` (khoá `BOSS_SPRITES`), giữ opts hạt dạng ô vuông.
- `boss-game-spell-art.js`: đạn/va chạm vẽ sprite; danh sách `fx.sprites` (hiệu ứng một lần, tự xoá khi hết khung).
- `boss-game-tier3-ultimate-fx.js`: gọi sprite thay `drawMeteor/drawIcePillar/...`; cắt cảnh dùng Faceset.
- Tôn trọng `prefers-reduced-motion`: bỏ loé toàn màn và phủ Snow toàn màn, giữ VFX tại chỗ.

## Related Code Files
- Modify: `js/boss-game-spell-presets.js`, `js/boss-game-spell-art.js`, `js/boss-game-tier3-ultimate-fx.js`, `js/boss-game-sprite-atlas.js`, `sw.js`, `index.html`
- Delete: `js/boss-game-tier3-shapes.js`
- Copy: sheet FX trong bảng vào `img/boss/fx/`

## Implementation Steps
1. Copy sheet FX; thêm def (đo khung: Flam 200×30 = 5? khung → xác nhận bằng chiều cao; Ice 320×32 = 10 khung…).
2. Thêm `fx.sprites` + vẽ; nối preset 5 hệ.
3. Tuyệt kỹ + cắt cảnh Faceset; thụ động.
4. Reduced-motion; xoá tier3-shapes; grep sạch.
5. Test + smoke test từng hệ (đổi hệ trong cây kỹ năng) + từng tuyệt kỹ.

## Success Criteria
- [x] 5 hệ nhìn khác nhau rõ; 3 bậc phân biệt được bằng mắt.
- [x] 5 tuyệt kỹ có VFX + cắt cảnh sprite; timing khớp `ultimateMs`/`impactMs`.
- [x] Reduced-motion không có loé/phủ toàn màn.
- [ ] FPS ≥ 50 khi tuyệt kỹ — **chưa đo** (chỉ xem số HUD debug tại thời điểm chụp ảnh tĩnh, không phải benchmark
  liên tục); user tự kiểm bằng `?fps` nếu cần số liệu chắc chắn.

## Risk Assessment
- Khung FX không vuông (Flam 200×30): phải xác định số khung theo ảnh, không suy từ chiều cao; ghi `frames` tường minh trong def.
- Gió yếu nhất về hình: nếu user chê thì tô màu lại (palette swap) Spirit/Smoke, không vẽ tay.

## Kết quả thực hiện (2026-09-24)
Xem báo cáo đầy đủ: `plans/reports/fullstack-developer-260924-1826-mage-pixel-art-phase-4-report.md`.
Tóm tắt: đo khung 16 sheet FX bằng công cụ decode PNG tự viết (không có sharp/pngjs) + xem lưới overlay xác nhận
biên khung khớp thật (không đoán); test `boss-game-sprite-atlas.test.js` xác nhận lại tự động qua IHDR khi chạy
`node tests/run-tests.js` (430/430 xanh). `sprite: {proj, impact}` là dữ liệu trong preset (data-driven, không
hard-code hệ trong code); trận đồ bậc 3 dùng 1 sheet `magicCircle` tô màu hệ qua `opt.solid` (bossTintedFrame) cho
cả 5 hệ (không chỉ lửa như mô tả ban đầu — tổng quát hơn, không cần thêm asset). Đã xoá hẳn
`js/boss-game-tier3-shapes.js` + mọi hàm vẽ tay (drawMeteor/IcePillar/RockSpikes/Tornado/LightningBolt/
drawMagicCircle) + cơ chế `fx.customs`/`bossFxSpawnCustom`. Cắt cảnh tuyệt kỹ dùng Faceset 38×38 (mage-f-face.png/
mage-m-face.png) thay `drawMage`. img/boss 339KB (dưới mốc mềm ~350KB).
