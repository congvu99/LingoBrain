# Phase 4 — Phiên ôn toàn màn

Context: audit #3, #5, #10 · `js/review-steps-learn.js`, `js/review-tests.js`

## Wireframe
```
✕           Ôn từ          12/45   loa
━━━━━━━━━━━━━━━░░░░░░░░░░░░░░░░░░       ← tiến độ PHIÊN, không phải bước
           TỪ MỚI · 2/5                  ← chỉ từ mới có nhãn bước
               big  adj
               /bɪɡ/
              to, lớn
    The lobster's claws are bigger…

┌──────── vùng ngón cái (sticky) ────────┐
│ [        Tự kiểm tra →        ]        │
└────────────────────────────────────────┘
```
Chấm điểm (bước 4): 4 nút cố định đáy, nhãn chữ + lần ôn kế ("Quên · 1 phút", "Nhớ · 3 ngày") — không chỉ emoji.

## Yêu cầu
- Thanh 5 chấm chỉ cho từ mới; từ ôn lại hiện nhãn dạng kiểm tra ("Nghe rồi gõ"), không có chấm giả.
- Nút chính luôn sticky đáy trên safe-area; bàn phím mở thì bám trên bàn phím.
- Đổi nhãn: "Mã hoá kép" → "Ghi nhớ"; "Lật từ" → "Xem từ".
- Màn kết phiên: số thẻ, % nhớ, danh sách từ quên (bấm nghe) → [Xong] về Hôm nay; [Chơi với n từ vừa quên] khi đủ điều kiện game.
- ✕ giữa phiên: không hỏi xác nhận (tiến độ từng thẻ đã lưu), toast "Đã lưu 12/45".
- Phím tắt desktop giữ nguyên.

## Files
- Sửa: `js/review-steps-learn.js` (`render()` bỏ `renderStats`, gọi `setStageProgress`; viết lại màn "Xong phiên"), `js/review-tests.js` (nhãn), `css/paper-theme.css`

## Rủi ro
- Hiện lần ôn kế trên nút chấm cần tính thử không ghi. Nếu `applyGrade` không thuần → chạy trên bản sao `r`. Chạy lại test SM-2.
