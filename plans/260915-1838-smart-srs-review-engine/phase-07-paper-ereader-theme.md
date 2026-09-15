---
phase: 7
title: "Giao diện giấy / máy đọc sách, mobile-first"
status: completed
priority: P2
dependencies: [0]
---

# Phase 7: Giao diện giấy / máy đọc sách, mobile-first

## Overview
Đổi toàn bộ CSS sang phong cách giấy ấm / e-reader: nền giấy, mực đen, serif cho nội dung học, ít màu, không gradient/bóng; ưu tiên màn hình ~390px; tôn trọng `prefers-color-scheme` với biến thể "giấy tối".

## Requirements
- Functional: mọi màn hình hiện có (3 tab, 5 bước, 5 dạng test, stats, quản lý) dùng chung token màu/chữ; touch target ≥44px; đọc được ngoài nắng (tương phản ≥7:1 cho chữ chính).
- Non-negotiable: không thêm font ngoài nếu offline không tải được → dùng stack hệ thống serif (`Georgia, 'Times New Roman', serif` / iOS `-apple-system-ui-serif`), mono cho IPA.
- Tuân theo quyết định do `/ck:ui-ux-pro-max` đưa ra (ghi vào `docs/design-guidelines.md`).

## Architecture
- Token trong `:root`: `--paper`, `--paper-2`, `--ink`, `--ink-muted`, `--rule`, `--accent` (đỏ son nhạt, chỉ cho trạng thái/nhấn), `--ok`, `--bad`.
- Dark: `@media (prefers-color-scheme: dark)` → giấy xám than `#1b1a17`, mực `#e8e2d6`.
- Thẻ ôn = "trang sách": viền hairline, không bo lớn (≤6px), không shadow; tiêu đề bước dạng mono nhỏ in hoa.
- Nút: viền mực 1px, nền giấy; primary = nền mực chữ giấy.
- Thanh tab dưới: nền giấy, đường kẻ trên, icon + chữ nhỏ.
- CSS grain nhẹ bằng `background-image` SVG noise data-URI, opacity thấp.

## Related Code Files
- Modify: `index.html` (toàn bộ `<style>`), có thể tách `css/paper-theme.css` nếu >250 dòng; cập nhật `sw.js` ASSETS + `manifest.json` theme_color.
- Create: `docs/design-guidelines.md`

## Implementation Steps
1. Chạy `/ck:ui-ux-pro-max` để chốt palette/typography/spacing cho kiểu e-reader mobile; ghi `docs/design-guidelines.md`.
2. Viết token + reset; thay CSS từng vùng: nav, plan, card, steps, grade, manage, stats.
3. Kiểm tra ở 360/390/430px và desktop; dark mode; tương phản bằng DevTools.
4. Đối chiếu `web-design-guidelines` (focus ring, tap size, reduced motion).

## Success Criteria
- [x] Không màu nào ngoài token; không gradient/shadow
- [ ] Chữ chính tương phản ≥7:1, phụ ≥4.5:1 (tính tay theo token, chưa đo DevTools)
- [x] Tap target ≥44px trên toàn app
- [ ] Dark mode tự đổi, vẫn "giấy" (chưa chụp dark)
- [ ] Không scroll ngang ở 360px (chỉ thử 390px)

## Risk Assessment
- Serif hệ thống khác nhau giữa Android/iOS → chấp nhận, stack fallback.
- Emoji trong nút xung đột với phong cách mực → giữ emoji chức năng (🔊 ⏺) nhưng giảm kích thước, bỏ emoji trang trí.
