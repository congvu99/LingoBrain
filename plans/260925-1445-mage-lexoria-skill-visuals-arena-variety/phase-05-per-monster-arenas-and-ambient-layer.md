---
phase: 5
title: "Per-monster arenas and ambient layer"
status: completed
priority: P2
dependencies: [1]
effort: "L"
---

# Phase 5: Per-monster arenas and ambient layer

## Overview
12 sân riêng theo quái (bố cục nền/hàng xa/đồ trang trí/trời khác nhau, dùng thêm tileset chưa dùng) + lớp ambient vẽ mỗi khung (tile động + thời tiết/ánh sáng).

## Requirements
- Fallback: quái không có sân riêng → sân vùng `BOSS_ARENAS[regionId]` như cũ.
- Nền tĩnh vẫn vẽ offscreen 1 lần (hiệu năng); chỉ ambient vẽ mỗi khung.
- Tile autotile: chỉ lấy tâm khối tròn (bài học cũ trong arena.js: rìa dính nền trắng).
- Ambient: trần hạt (~40), tắt khi reduced-motion; `quality<1` giảm nửa.

## Architecture
- `js/boss-game-arena-layouts.js` (dữ liệu): `BOSS_MONSTER_ARENAS[monsterId] = { base: regionId, sky?, grass?, details?, far?, near: [[tile, xFrac, row]], anim: [[animSprite, xFrac, yFrac]], ambient: { kind, density }, light?: 'raylight'|'clouds' }` — `base` kế thừa trường thiếu từ sân vùng.
  <!-- Updated: Validation Session 1 - id quái thật (goblinKing/lich/wyvern) -->
  - Ashford: goblin đồng cỏ hoa (Field + anim-flower), wolf bìa rừng (Nature cây dày + lá rơi), goblinKing làng (House + cờ đỏ + cối xay, Raylight)
  - Catacombs: skeleton hầm (Dungeon, Fog nhẹ), ghost nghĩa địa (Village bia mộ, Fog dày), lich đền (Towers, Fog + ánh tím)
  - Cliffs: troll mỏ đá (Relief + RockGray), harpy đỉnh núi (Clouds + Snow), wyvern thác băng (Water + waterfall anim + Snow)
  - Dragonlair: darkKnight hang (lava + tàn lửa), youngDragon sa mạc cháy (Desert + particleFire), oblivion miệng núi lửa (tàn lửa dày + trời đỏ nhấp nháy)
- `buildBossArena(regionId, …)` → `buildBossArena(arenaKey, …)`: resolver `bossArenaFor(monster, region)` gộp base + override. Cache trong `boss-game-render.js` khoá theo `monster.id` thay `region.id`.
- `js/boss-game-arena-ambient.js` (~150 dòng): `createBossAmbient(arena, w, h, layout)` (vị trí anim tile tính 1 lần), `stepBossAmbient(amb, dt)`, `drawBossAmbient(ctx, amb, t, layer)` — layer 'back' (anim tile, sau nền, trước nhân vật), 'front' (thời tiết/sương/ánh sáng, sau nhân vật, trước HUD).
  - kinds: leaf, leafPink, snow, rain, ember (particleFire), fog (cuộn ngang, alpha 0.25–0.4), clouds.

## Related Code Files
- Create: `js/boss-game-arena-layouts.js`, `js/boss-game-arena-ambient.js`, `tests/boss-game-arena-ambient.test.js`
- Modify: `js/boss-game-arena.js` (nhận arena đã resolve; giữ ≤200 dòng — hiện 110), `js/boss-game-render.js` (khoá cache, gọi draw ambient 2 lớp; hiện 158 dòng), `js/boss-game-ui.js` (truyền monster), `index.html`, `tests/boss-game-arena.test.js`

## Implementation Steps
1. Resolver `bossArenaFor` + test (fallback, kế thừa trường).
2. Đổi khoá cache render theo monster; kiểm 4 vùng như cũ khi chưa có override.
3. Đo toạ độ tile cần dùng (tâm khối) cho 12 sân; viết dữ liệu.
4. Module ambient + test (trần hạt, reduced → không tạo hạt, step không NaN).
5. Nối 2 lớp vào render; soát 12 trận (mobile dọc + desktop).

## Success Criteria
- [x] 12 quái có sân khác nhau rõ; mỗi sân có ít nhất 1 yếu tố chuyển động.
- [x] Không viền trắng autotile; không tụt fps rõ trên desktop; reduced-motion tắt ambient.
- [x] arena.js, render.js ≤200 dòng.

## Risk Assessment
- Đo toạ độ tile tốn công: làm theo vùng, xong vùng nào soát vùng đó.
- Lớp front che quái/chữ: alpha thấp, không vẽ đè vùng HUD.
