# Phase 3 — Màn Hôm nay

Context: audit #1, #7, #8 · `js/daily-plan.js`, `index.html#tab-plan`

## Wireframe (390px, không cuộn)
```
Chào buổi chiều                 ✦ 12 ngày
┌────────────────────────────────────┐
│ PHIÊN HÔM NAY                      │
│ 45 thẻ · ~9 phút                   │
│ 40 ôn lại · 5 từ mới               │
│ [███████░░░░░]  12/45              │  ← chỉ khi đã bắt đầu
│ [          Bắt đầu          ]      │  ← CTA duy nhất, 56px
└────────────────────────────────────┘
THÓI QUEN  3/7                 Xem tất cả ›
○ 20:00  Nghe 1 bài hát chủ đề tuần        ← chỉ việc tiếp theo
```
Xong phiên: thẻ đổi thành "Xong hôm nay ✓ · Mai 13 thẻ" + [Học thêm 5 từ] (nút phụ) + "Khởi động: Chạy 60 giây với 6 từ vừa quên ›".
Bộ từ lỗi: giữ "Chưa tải được bộ từ" + Thử lại.

## Yêu cầu
- Số liệu chỉ lấy từ `todayMetrics()`.
- 7 việc: gập mặc định, mở tại chỗ; hộp ghi âm shadowing chỉ hiện khi mở việc `act: 'rec'`.
- Badge tab: chỉ "Còn hôm nay" trên tab Hôm nay; bỏ badge giáo án.
- Streak: theo quyết định #2.

## Files
- Sửa: `js/daily-plan.js` (tách `renderHabits()` khỏi `renderPlan()`; `rollDay`/`toggleTask`/ghi âm giữ nguyên), `index.html`, `css/paper-theme.css`
- Xoá: markup `.welcome-card`, `.learning-art` + CSS liên quan

## Rủi ro
- Người quen checklist 7 việc mất cái nhìn nhanh → "3/7" luôn hiện, mở 1 chạm.
