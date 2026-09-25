---
phase: 2
title: "Device verification"
status: pending
priority: P2
dependencies: [1]
---

# Phase 2: Device verification

## Overview
Kiểm tay trên iPhone thật (Safari + PWA đã cài) và desktop — hành vi bàn phím ảo không test tự động được.

## Requirements
- iPhone Safari tab + PWA standalone; 1 máy nhỏ (SE/mini, 320–375px) nếu có.
- Desktop Chrome/Edge.

## Related Code Files
- Không sửa code, trừ fix lỗi tìm thấy (quay lại phase 1).

## Implementation Steps
1. Hard reload / đợi SW cập nhật version mới.
2. Bắn máy bay: chọn cấp → Bắt đầu → bàn phím bật sau đếm ngược; gõ bắn; Enter nhả khoá; ⏸ header → pause; Chơi tiếp → bàn phím lại; bấm "Done"/vuốt đóng bàn phím → pause.
3. Pháp sư: Bắt đầu trận → gõ niệm; "Bỏ" trong thẻ đề đổi từ, bàn phím không đóng; đầy thanh → "✨ Tuyệt kỹ" hiện góc dưới-phải, bấm dùng được, không đóng bàn phím; ⏸ header.
4. Soát: không thấy ô nhập/caret/kính lúp; trang không nhảy scroll/zoom khi focus; Tuyệt kỹ không che HUD/quái; header 320px không tràn.
5. Desktop: gõ, Enter, Shift+Enter, Esc; click nút không blur.
6. Bộ gõ Telex bật (nếu thử): composition không bắn giữa chừng như trước.

## Success Criteria
- [ ] Tất cả bước 2–6 đạt trên iPhone + desktop.
- [ ] So ảnh chụp trước/sau: field cao thêm ~56px khi bàn phím mở.

## Risk Assessment
- iOS phiên bản cũ xử lý input opacity 0 khác → fallback: `opacity:.01` thay `0`.
- Không có iPhone thật → ghi rõ "chưa kiểm máy thật" trong report, không đánh dấu completed.
