---
phase: 1
title: "Copy sprites and atlas entries"
status: completed
priority: P1
dependencies: []
effort: "M"
---

# Phase 1: Copy sprites and atlas entries

## Overview
Chép ~30 sheet chưa dùng từ bộ Ninja Adventure vào `img/boss/`, đo khung thật, khai khoá trong atlas dữ liệu để phase 2–5 chỉ việc tham chiếu tên.

## Requirements
- Khung (fw, fh, frames) đo bằng phân tích cột alpha/xem ảnh — không đoán theo chiều cao (cùng quy trình đã làm cho `BOSS_SKILL_SPRITES`).
- Không vượt 200 dòng ở `js/boss-game-sprite-atlas.js` (193 dòng) → khai vào file dữ liệu mới, gộp bằng `Object.assign` như `boss-game-skill-sprites.js`.

## Related Code Files
- Modify: `tools/copy-boss-sprites.js` (thêm mục FILES)
- Create: `js/boss-game-extra-sprites.js` (dữ liệu thuần `BOSS_EXTRA_SPRITES` + Object.assign vào `BOSS_SPRITES`)
- Modify: `index.html` (nạp sau `boss-game-skill-sprites.js`), `tests/run-tests.html`, `tests/run-tests.js` nếu liệt kê file
- Create: `img/boss/fx/*.png`, `img/boss/tile/*.png` (output script)

## Danh sách sheet (đích → nguồn)
FX (đạn/va chạm):
- `fx/plant-spike.png` ← FX/Projectile/PlantSpike.png · `fx/shuriken-magic.png` ← FX/Projectile/ShurikenMagic.png · `fx/big-shuriken.png` ← FX/Projectile/BigShuriken.png · `fx/kunai.png` ← FX/Projectile/Kunai/SpriteSheet.png
- `fx/slash-01..03.png` ← FX/Slash/SpriteSheetSlash01..03.png · `fx/slash-arc.png`, `fx/slash-multi.png`, `fx/slash-circular-b.png` ← FX/Slash/SpriteSheetArc/Multi/Circular.png
- `fx/claw-double.png`, `fx/cut.png`, `fx/cut-double.png`, `fx/slash-double-curved.png` ← FX/Attack/…
- `fx/circle-white.png`, `fx/circle-spark2.png` ← FX/Magic/Circle/SpriteSheetWhite/Spark2.png · `fx/spirit-blue.png` ← FX/Magic/Spirit/SpriteSheetBlue.png
- `fx/ice-flake-b.png` ← FX/Elemental/Ice/SpriteSheetFlake.png · `fx/plant-b.png` ← FX/Elemental/Plant/SpriteSheetB.png
Hạt/môi trường:
- `fx/particle-fire.png`, `particle-rain.png`, `particle-snow.png`, `particle-leaf-pink.png`, `particle-rock-gray.png`, `particle-clouds.png` ← FX/Particle/*
- `fx/fog.png`, `fx/raylight.png` ← FX/Environment/*
Tile/động:
- `tile/field.png`, `dungeon.png`, `relief.png`, `desert.png`, `towers.png`, `water.png`, `floor-detail.png` ← Backgrounds/Tilesets/*
- `tile/anim-flower.png`, `anim-plant.png`, `anim-water-ripples.png`, `anim-waterfall-top/middle/bottom.png`, `anim-flag-red.png`, `anim-flag-blue.png`, `anim-mill.png` ← Backgrounds/Animated/*

<!-- Updated: Validation Session 1 - bỏ chép trùng magic-spark/rock-b2 -->
- KHÔNG chép lại sheet đã có: `FX/Magic/Spark` = `sparkMagic`, `Rock/SpriteSheetB` = `rockB`, `Circle/SpriteSheetSpark` = `circleSpark` (đã kiểm `tools/copy-boss-sprites.js`). Trước khi thêm mục mới, grep nguồn trong FILES.

## Implementation Steps
1. Thêm mục FILES; chạy `node tools/copy-boss-sprites.js`; kiểm dung lượng tổng (`du -sh img/boss`), mục tiêu thêm ≤1MB — tileset lớn chỉ giữ nếu phase 5 dùng.
2. Đo khung từng sheet (script scratchpad đọc IHDR + alpha cột), ghi `fw/fh/frames/fps/loop/vfx`, `rotOffset` cho đạn có hướng.
3. Viết `js/boss-game-extra-sprites.js` (dữ liệu + comment cách đo), nạp đúng thứ tự.
4. Test nhanh: `tests/boss-game-sprite-atlas.test.js` thêm assert mọi `src` trong `BOSS_EXTRA_SPRITES` tồn tại trên đĩa và `fw×frames ≤ width` ảnh.

## Success Criteria
- [x] Mọi sheet mới nạp được (`bossSpriteReady`) trong trình duyệt.
- [x] Test atlas pass; không file logic nào vượt 200 dòng.

## Risk Assessment
- Đo sai khung → giật/lệch: xem từng sheet qua trang debug scratchpad vẽ lặp khung trước khi chốt.
- Phình dung lượng PWA: bỏ tileset không dùng ở phase 5.
