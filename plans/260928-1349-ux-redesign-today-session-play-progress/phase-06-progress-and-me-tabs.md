# Phase 6 — Tab Tiến bộ + Tôi

Context: audit #2, #6, #9 · `js/stats-dashboard.js`, tab Quản lý trong `index.html`, `js/cloud-sync-account-ui.js`

## Tiến bộ
```
Đã học 120              Tỉ lệ nhớ 93%    Chuỗi 12
[████████ Đang nhớ 80 ░░░░ Đã thuộc 40]
Dự báo 7 ngày (cột + số, hôm nay tô đậm)
30 ngày qua (heatmap + chú thích "ít … nhiều")
Hay quên nhất:  reckon ×2 ›   would ×2 ›    (hàng có mũi tên; bấm = mở stage ôn 1 từ)
Thư viện 5033 từ ›   (tìm + lọc Chưa học / Đang nhớ / Đã thuộc; phân trang 50)
```
- `computeStats()` giữ nguyên (đã có test); viết lại `renderStats`, KPI lấy từ `todayMetrics()`.
- Thư viện: tái dùng `renderList()`; hiện render hết ~5033 dòng → phân trang 50.

## Tôi
Thứ tự: Tài khoản & đồng bộ → Nhịp học (từ mới/ngày, tối đa/phiên) → Thói quen (sửa giáo án) → Sao lưu → **Vùng nguy hiểm** (Xoá tiến độ, tách cuối trang, màu `--bad`).

## Files
- Sửa: `js/stats-dashboard.js`, `js/daily-plan.js` (`renderList`, `renderPlanEdit` chỉ đổi container), `index.html`, `css/paper-theme.css`
