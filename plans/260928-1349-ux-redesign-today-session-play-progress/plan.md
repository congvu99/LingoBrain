# Thiết kế lại UX: Hôm nay · Phiên học · Chơi · Tiến bộ · Tôi

Status: **DONE (2026-09-28)** — user duyệt mockup + 4 đề xuất. Lệch plan: số "hôm nay" tính từ hàng đợi thật (`queueBreakdown`) thay cho `todayMetrics()`; streak = ngày có ≥1 lượt chấm (không thêm trường vào day). Nhịp học giữ ô number (không stepper); thư viện chưa có ô tìm/lọc.
Audit: [reports/ux-audit-260928-1349-current-state-report.md](reports/ux-audit-260928-1349-current-state-report.md)

## Nguyên tắc

1. **Mở app = 1 câu hỏi, 1 nút**: "Hôm nay còn gì? → Bắt đầu". Không hero marketing, không lịch 7 việc ở màn đầu.
2. **1 con số = 1 định nghĩa**, tính ở 1 hàm thuần, dùng chung cho badge, CTA, màn kết.
3. **Làm ở chỗ làm, xem số ở chỗ xem số**: phiên ôn/game chạy toàn màn (không tab bar, không dashboard); thống kê sang tab riêng.
4. **Ôn trước, chơi sau**: game là phần thưởng/luyện thêm, không đứng trước thẻ ôn.
5. Giữ nguyên style xanh ngọc + đào, SM-2, 5 bước từ mới, ranh giới game ↔ SRS.

## IA mới

```
Tab bar (4):  Hôm nay  ·  Chơi  ·  Tiến bộ  ·  Tôi
Lớp toàn màn (#stage, che tab bar):  Phiên ôn  |  từng game  (✕ thoát, n/N trên cùng)

Hôm nay   ─ Thẻ "Phiên hôm nay": 45 thẻ · ~9 phút  [Bắt đầu]   ← CTA duy nhất
          ─ Thói quen: việc tiếp theo 1 dòng + "3/7 · xem tất cả" (gập)
          ─ Sau khi xong phiên: "Mai 13 thẻ" + [Học thêm 5 từ] + gợi ý 1 game
Chơi      ─ Pháp sư Lexoria (thẻ lớn) + 5 thẻ game: luyện gì · thời lượng · kỷ lục · lý do khoá hiện sẵn
Tiến bộ   ─ Đã học (Đang nhớ/Đã thuộc) · Tỉ lệ nhớ 30 ngày · Chuỗi · Dự báo 7 ngày · Heatmap có chú thích
          ─ Hay quên → ôn ngay · Thư viện từ (tìm + lọc Chưa học/Đang nhớ/Đã thuộc)
Tôi       ─ Tài khoản/đồng bộ · Nhịp học · Sửa thói quen · Sao lưu · Vùng nguy hiểm (xoá tiến độ)
```

## Từ điển số liệu (hợp đồng — phase 1)

| Tên hiển thị | Định nghĩa | Nơi hiện |
|---|---|---|
| **Còn hôm nay** | `min(dueReviews, maxSession) + newLeftToday + learning` = đúng số thẻ `buildQueue` sẽ phát | CTA Hôm nay, badge tab duy nhất |
| Cần ôn / Từ mới | 2 thành phần của "Còn hôm nay" | dòng phụ dưới CTA |
| Đã học | từ `state ≠ new` | Tiến bộ |
| Đang nhớ / Đã thuộc | `ivl < 21` / `ivl ≥ 21` | Tiến bộ (thanh xếp chồng) |
| Chưa học | `state = new` | chỉ trong Thư viện |
| Tỉ lệ nhớ | pass/(pass+fail) 30 ngày | Tiến bộ |

Bỏ: pill "5033 từ", ô "Từ mới 4913" ở màn ôn, badge giáo án trên tab.

## Phases

| # | Phase | Effort | Phụ thuộc |
|---|---|---|---|
| 1 | [Hợp đồng số liệu `todayMetrics()`](phase-01-today-metrics-contract.md) | 0.5d | — |
| 2 | [Shell 4 tab + lớp toàn màn `#stage`](phase-02-shell-tabs-and-fullscreen-stage.md) | 1d | 1 |
| 3 | [Màn Hôm nay](phase-03-home-today-screen.md) | 1d | 1, 2 |
| 4 | [Phiên ôn toàn màn](phase-04-fullscreen-review-session.md) | 1d | 2 |
| 5 | [Tab Chơi](phase-05-play-tab-game-catalog.md) | 0.5–1d | 2 |
| 6 | [Tab Tiến bộ + Tôi](phase-06-progress-and-me-tabs.md) | 1d | 1, 2 |
| 7 | [QA, docs, phát hành](phase-07-qa-docs-release.md) | 0.5d | tất cả |

Tổng ≈ **5.5–6.5 ngày dev**. Phase 3/4/5/6 chạy song song được sau phase 2 (file tách rời, trừ `css/paper-theme.css` → gom CSS về cuối mỗi phase, 1 người sở hữu).

## Tiêu chí chấp nhận

- Mở app (iPhone 390×844): CTA "Bắt đầu" nằm trong 1 màn đầu, không cuộn; không có lịch giờ ở màn đầu.
- Mọi con số "việc hôm nay" trên mọi màn = số thẻ phiên thực phát (test tự động).
- Trong phiên/game: không thấy tab bar, chip game, dashboard; luôn có ✕ và n/N.
- Từ ôn lại không hiện bước "đã xong" giả.
- `node tests/run-tests.js` xanh; APP_VERSION = CACHE sw; sáng/tối, reduced-motion, 375px, ngang.
- Không đổi schema `localStorage`/sync/backup (backup cũ khôi phục được).

## Ngoài phạm vi (ghi nhận, làm riêng)

- Lỗi `wordRx` không bắt phụ âm nhân đôi (big→bigger lộ đáp án) — đề xuất fix riêng 0.5d, nên làm **trước** redesign.
- Rà emoji không khớp nghĩa trong `words.json`.

## Quyết định cần user chốt

1. Giáo án 7 việc: **thu gọn thành "Thói quen"** trên Hôm nay (đề xuất) hay đẩy hẳn sang tab riêng?
2. Chuỗi ngày (streak): tính theo **xong phiên ôn** (đề xuất, app đo được) hay giữ "tích đủ 7 việc"? Đổi = đổi hành vi hiện có.
3. Game khi còn thẻ đến hạn: **cho chơi, chỉ gợi ý ôn trước** (đề xuất) hay khoá tới khi ôn xong?
4. Tab bar 4 mục (Hôm nay · Chơi · Tiến bộ · Tôi) — OK?
