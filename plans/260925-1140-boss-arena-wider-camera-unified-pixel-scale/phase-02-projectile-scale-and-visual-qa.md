---
phase: 2
title: Projectile scale and visual QA
status: completed
priority: P2
dependencies:
  - 1
effort: 1h
---

# Phase 2: Projectile scale and visual QA

## Overview
Đổi cỡ đạn phép từ px cố định sang tính theo chiều cao pháp sư. Sau đó rà các VFX khác và kiểm bằng mắt 4 vùng × phone dọc + desktop.

## Requirements
- Đạn phép hiện có cỡ `projectile.size * 4` px (size preset 6–18 → 24–72px), không phụ thuộc cỡ nhân vật. Bên cạnh pháp sư 32px thì đạn to quá.
- Công thức mới: target = `m.s * (0.5 + size / 16)`, kẹp tối đa `1.5 * m.s`. Nghĩa là size 8 → 1× pháp sư, 12 → 1.25×, 16+ → 1.5×.
- Giữ hệ số `s.scale` (combo/chain) nhân sau như hiện tại.

## Architecture
- `drawBossShotSprite(ctx, s, x, y, k)` không có `fx`. Truyền chiều cao pháp sư qua shot lúc spawn (`s.mageS = fx.layout.mage.s`) hoặc thêm tham số từ chỗ gọi. Chọn cách nào ít chạm nhất sau khi đọc chỗ gọi (grep `drawBossShotSprite`).
- Biên độ cung bay cố định `Math.PI * 30` px → đổi thành tỉ lệ theo `mageS` (≈ `mageS * 0.9`) để cung không quá cao so với cảnh nhỏ. Chỉ đổi nếu thấy lệch khi kiểm mắt.

## Related Code Files
- Modify: `js/boss-game-sprite-actors.js` — `drawBossShotSprite` (dòng ~182-188).
- Modify (nếu cần): nơi spawn shot (grep `projectile` / `shots.push` trong `js/boss-game-skill-fx.js`, `js/boss-game-ui.js`).
- Review only: `js/boss-game-skill-fx.js`, `js/boss-game-tier3-ultimate-fx.js`, `js/boss-game-sprite-actors.js` `bossVfxK`: xác nhận đều theo `layout.s/k`, không hardcode px cho sprite.
- Modify: `js/app-storage.js` `APP_VERSION` + `sw.js` `CACHE` (bump khớp nhau).

## Implementation Steps
1. Grep chỗ gọi `drawBossShotSprite` và chỗ tạo shot, chọn cách truyền `mageS`.
2. Thay dòng scale:
   ```js
   const target = Math.min(1.5, 0.5 + s.p.projectile.size / 16) * mageS;
   const scale = Math.max(1, Math.round(pixelScale(target, bossVfxFh(s.sprite)) * s.scale));
   ```
   Cập nhật comment ("bậc ≈ 1×/1.25×/1.5× chiều cao pháp sư").
3. Rà VFX: grep các số px cứng dùng làm cỡ sprite trong các file boss FX. Chữ HUD (font 34px/16px của ultimate) giữ nguyên, đó là UI chứ không phải thế giới.
4. Bump version (APP_VERSION = CACHE).
5. `node tests/run-tests.js` (test `pwa-assets` kiểm tra version khớp).
6. Kiểm mắt (`npm start`, DevTools device mode):
   - iPhone dọc 390×844 và desktop 1440×900.
   - 4 vùng: ashford, catacombs, cliffs, dragonlair.
   - Quái thường + ít nhất 1 trùm lớn + Oblivion.
   - Bắn phép bậc 1/2/3, combo, ultimate cấp 3, slow-mo.
   - Kiểm: lưới pixel đều, ≥12 hàng tile trên phone, trùm không chạm HUD, chữ đang gõ và threat bar không che nhân vật, đạn ≤1.5× pháp sư.

## Success Criteria
- [ ] Đạn phép ≤1.5× chiều cao pháp sư ở mọi cỡ khung.
- [ ] Không còn cỡ sprite VFX hardcode px lệch lưới rõ rệt.
- [ ] Version bumped, tests pass.
- [ ] Checklist kiểm mắt đạt ở cả 2 cỡ màn hình.

## Risk Assessment
- Chữ gõ trên đầu pháp sư hoặc threat bar (min 46px) lấn nhân vật nhỏ → nếu có, chỉnh offset theo `m.s` chứ không nới cỡ nhân vật.
- Zoom slow-mo 1.06 phóng không nguyên lần → lệch lưới tạm thời, chấp nhận (ngoài phạm vi).
- Rollback: revert file sprite-actors + chỗ spawn shot.
