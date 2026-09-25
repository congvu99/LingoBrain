---
phase: 1
title: Unified world pixel scale
status: completed
priority: P2
dependencies: []
effort: 1h
---

# Phase 1: Unified world pixel scale

## Overview
Tạo hàm thuần `bossWorldScale(h)`. Tile nền, pháp sư, quái thường và trùm dùng chung hệ số này, thay cho các hệ số riêng hiện tại.

## Requirements
- `worldK = clamp(round(h / 14 / 16), 2, 6)`, tức khoảng 14 hàng tile theo chiều cao, pháp sư tối thiểu 32px.
- Tile, pháp sư, quái thường dùng đúng `worldK`. Trùm dùng `worldK` với `fh` gốc.
- Giữ vòng `while` hạ `kq` khi khung cao nhất (Idle/Hit/Attack/Oblivion) chạm HUD.
- Giữ vị trí: pháp sư (0.22w, 0.86h), quái (0.7w, 0.52h), chân trời 0.4h.

## Architecture
- `bossWorldScale` đặt trong `js/boss-game-arena.js` (file này được nạp trong `tests/run-tests.js`, còn `boss-game-render.js` thì không) → test được trong Node.
- `layoutBoss` tính `worldK` một lần và lưu vào `fx.layout.k`. `buildBossArena(region, w, h, dpr, layout)` đọc `layout.k`, fallback `bossWorldScale(h)` khi không có layout.
- Cache nền (`fx.bgW/bgH/bgDpr/bgRegion`) vẫn đúng: worldK chỉ phụ thuộc h, mà đổi h thì đã build lại.

## Related Code Files
- Modify: `js/boss-game-arena.js` — đổi `bossArenaScale(h)` thành `bossWorldScale(h)` (công thức mới), `buildBossArena` dùng `layout.k`.
- Modify: `js/boss-game-render.js` — `layoutBoss`: dùng `worldK` cho `km`, `kq`; thêm `fx.layout.k`; sửa comment đầu hàm.
- Modify: `tests/boss-game-sprite-atlas.test.js` (hoặc file test arena nếu có) — test `bossWorldScale`.

## Implementation Steps
1. `boss-game-arena.js`:
   ```js
   /* Hệ số pixel chung cho cả cảnh (tile + pháp sư + quái): ~14 hàng tile trên chiều cao khung, tối thiểu 2
      (pháp sư 32px) để pixel nhân vật và nền cùng một lưới — trông như một thế giới pixel thật, không "dán" lên nền. */
   const BOSS_WORLD_ROWS = 14;
   function bossWorldScale(h) { return Math.min(6, Math.max(2, Math.round(h / BOSS_WORLD_ROWS / 16))); }
   ```
   Xóa `bossArenaScale`. Trong `buildBossArena`: `const k = (layout && layout.k) || bossWorldScale(h)`.
2. `layoutBoss`:
   ```js
   const k = bossWorldScale(h);
   let kq = k;
   while (kq > 1 && fhMax * kq > monY - h * 0.14) kq--;
   fx.layout.k = k;
   fx.layout.mage = { x: ..., y: ..., s: 16 * k, k };
   fx.layout.mon  = { ..., s: fh * kq, k: kq, ... };
   ```
   Bỏ nhánh `hpMul >= 2 ? 0.45 : 0.3`: trùm to hơn quái nhờ `fh` gốc lớn hơn.
3. Grep `bossArenaScale` toàn repo để chắc không còn chỗ nào gọi.
4. Thêm test: `bossWorldScale(300) === 2` (kẹp dưới), `bossWorldScale(450) === 2`, `bossWorldScale(800) === 4`, `bossWorldScale(3000) === 6` (kẹp trên), kết quả luôn là số nguyên.
5. `node tests/run-tests.js`.

## Success Criteria
- [ ] `fx.layout.k === fx.layout.mage.k` và quái thường dùng cùng k.
- [ ] Tile nền dùng cùng k (đo ô cỏ = 16·k px).
- [ ] Không còn tham chiếu `bossArenaScale`.
- [ ] Test mới pass, toàn bộ suite pass.

## Risk Assessment
- Trùm có `fh` lớn (TenguBlue Attack 82) ở khung thấp sẽ bị hạ kq, lệch lưới 1 bậc → chấp nhận (hiếm gặp, ưu tiên không tràn HUD).
- Quái thường cao 32px trên phone có thể nhỏ hơn mong muốn → kiểm bằng mắt ở phase 2. Nếu quá nhỏ, chỉnh `BOSS_WORLD_ROWS` (một hằng số duy nhất).
- Rollback: revert 2 file.
