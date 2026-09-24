---
phase: 5
title: "Hub portraits cleanup and docs"
status: completed
priority: P3
dependencies: [3, 4]
---

# Phase 5: Hub portraits cleanup and docs

## Overview
Đưa sprite vào phần DOM (sảnh, màn chọn pháp sư, thẻ truyện, nhật ký, cây kỹ năng), xoá vẽ tay pháp sư, cập nhật docs/credit và chốt phiên bản.

## Requirements
- Sảnh + màn lần đầu: pháp sư sprite hướng xuống, khung idle lặp chậm (canvas nhỏ, phóng số nguyên) thay `drawMage`.
- Thẻ truyện + nhật ký: Faceset quái 38×38 (`<img>` với `image-rendering: pixelated`) thay emoji `BOSS_SHAPE_EMOJI`.
- Cây kỹ năng: icon `Skill Icon/Spell` (BookFire/BookIce/BookThunder/BookRock/BookWind) cạnh 5 hệ; nhánh chưa mở dùng bản `Disabled`.
- Xoá `js/boss-game-mage-art.js`; grep không còn `drawMage`, `mageStaffTip`, `BOSS_SHAPE_EMOJI`.
- README: mục credit "Ninja Adventure by pixel-boy & AAA — CC0"; `docs/system-architecture.md` cập nhật danh sách file boss (thêm atlas/actors/arena, bỏ file vẽ tay).
- Bump CACHE/APP_VERSION lần cuối.

## Related Code Files
- Modify: `js/boss-game-hub-ui.js`, `js/boss-game-first-run-ui.js`, `js/boss-game-story-journal-ui.js`, `js/boss-game-skill-tree-ui.js`, `css/paper-theme.css` (`.boss-face { image-rendering: pixelated }`), `README.md`, `docs/system-architecture.md`, `index.html`, `sw.js`, `js/app-storage.js`
- Delete: `js/boss-game-mage-art.js`

## Implementation Steps
1. Hàm dùng chung `bossDrawIdleSprite(canvas, name)` (trong actors hoặc atlas) cho sảnh + màn chọn; dừng rAF khi rời sảnh (`stopBossHub`).
2. Faceset/icon vào thẻ truyện, nhật ký, cây kỹ năng.
3. Xoá mage-art; gỡ khỏi index/sw; grep sạch.
4. Docs + credit; bump phiên bản.
5. Toàn bộ test; code-reviewer; smoke test sảnh → trận → kết trận → nhật ký, online + offline (tắt mạng sau khi cài SW).

## Success Criteria
- [x] Không còn hình vẽ tay nào trong game Pháp sư (`js/boss-game-mage-art.js` đã xoá; grep `drawMage`/`mageStaffTip`/
      `BOSS_SHAPE_EMOJI`/`MAGE_ROBE` sạch trong `js/`+`index.html`+`sw.js`).
- [x] Offline (sau khi cài SW) hiện đủ hình ở sảnh + trận — `sw.js` ASSETS có đủ Faceset 12 quái + 2 pháp sư +
      10 icon hệ (thường/disabled); test mới xác nhận mọi `BOSS_MONSTERS[].face` có trên đĩa + trong ASSETS.
- [x] Test xanh (436/436); docs khớp code (`docs/system-architecture.md`, `README.md`).
      **Review**: code-reviewer không có lỗi Critical/High (plans/reports/code-reviewer-260924-1926-mage-pixel-art-phase-5-review-report.md);
      đã sửa M1 (chân dung tự dừng khi canvas bị gỡ, chỉ vẽ khi đổi khung) + M2 (test icon hệ) → 436/436.

## Risk Assessment
- rAF ở sảnh chạy mãi gây hao pin: dừng khi `stopBossHub` và khi ẩn tab.
- `<img>` Faceset trong HTML động: src lấy từ bảng hằng (không từ dữ liệu người dùng) nên không có rủi ro XSS.
