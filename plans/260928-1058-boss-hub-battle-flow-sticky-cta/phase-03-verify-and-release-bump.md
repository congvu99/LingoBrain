---
phase: 3
title: Verify and release bump
status: completed
priority: P2
dependencies:
  - 1
  - 2
---

# Phase 3: Verify and release bump

## Overview
Chạy test, kiểm tra trực quan trên khung mobile, bump version PWA.

## Requirements
- `node tests/run-tests.js` qua hết.
- `APP_VERSION` (`js/app-storage.js`) và `CACHE` (`sw.js`) bump patch kế tiếp, khớp nhau (test `pwa-assets`).
- Trực quan: 375×812 + 360px, sáng + tối.

## Related Code Files
- Modify: `js/app-storage.js`, `sw.js`
- Không thêm file JS mới → không sửa danh sách precache.

## Implementation Steps
1. Đọc version hiện tại lúc làm (working tree đang có `2.24.7` chưa commit từ thay đổi khác) → bump lên patch kế (vd `2.24.8`) ở cả 2 file.
2. `node tests/run-tests.js`.
3. `npm start` (hoặc `npx serve .`), mở bằng agent-browser 375px: sảnh → Cây → chọn trường phái → bấm Chiến đấu; Tiến hoá → chọn dạng → Chiến đấu; Sổ chiêu → Chiến đấu. Chụp ảnh sảnh (đáy trang, thanh không che nhật ký/nút phụ).
4. Kết trận: cần XP gần mốc 8 để test nút "Tiến hoá ngay" — seed `bossProg.xp` qua console/localStorage trên bản local, không commit dữ liệu seed.
5. Kiểm console không lỗi khi thoát từ màn phụ mở từ kết trận.

## Success Criteria
- [ ] Test qua, version khớp.
- [ ] Ảnh chụp 375px xác nhận thanh CTA đúng vị trí ở 4 màn + màn kết trận có CTA nâng cấp.
- [ ] Không lỗi console.

## Risk Assessment
- Commit xen với thay đổi đang dở (`review-steps-learn.js`, `review-tests.js`, `app-shell.js`) → khi commit chỉ stage file của plan này + version; hỏi user nếu version 2.24.7 chưa phát hành.
