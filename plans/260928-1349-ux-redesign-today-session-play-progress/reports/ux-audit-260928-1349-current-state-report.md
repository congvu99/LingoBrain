# UX audit — LingoBrain v2.24.8 (iPhone 390×844, 120 từ đã học)

Ảnh chụp thật, dữ liệu seed 120 từ đã học / 55 đến hạn. Bằng chứng: code + DOM runtime.

## Vấn đề gốc: IA đặt sai trọng tâm

Vòng lặp lõi của app là **ôn SRS mỗi ngày** (lý do người dùng quay lại). Hiện tại:
- Mở app → tab "Hôm nay" = hero marketing ("Việc nhỏ hôm nay. Tiến bộ ngày mai.") + 7 việc theo giờ. Nút ôn từ nằm trong hero, ngang hàng lời chào.
- Lịch 7 việc chiếm màn đầu nhưng 6/7 việc làm **ngoài app** (xem clip, nghe nhạc, nói với khách) → app hiển thị thứ nó không kiểm soát, đẩy thứ nó kiểm soát (ôn từ) xuống.
- → Trả lời câu hỏi: **không**, người dùng không cần thấy lịch ngay khi mở. Cần thấy "hôm nay còn bao nhiêu, bấm 1 nút là học".

## Phát hiện (xếp theo mức độ)

| # | Vấn đề | Bằng chứng | Mức |
|---|---|---|---|
| 1 | 4 con số cho cùng khái niệm "việc hôm nay" | badge tab = 60 (due 55 + new 5), ô "Đến hạn" = 55, biểu đồ "55 nay", phiên thật = 45 thẻ (`buildQueue` cắt `maxSession=40` + 5 mới) | Cao |
| 2 | Số vô nghĩa ở vị trí nổi bật | "Từ mới 4913" = toàn bộ từ chưa học, không phải từ mới hôm nay (5); pill "5033 từ"; "120 từ đã học" ở dashboard dưới vs 80+40 ở trên | Cao |
| 3 | Thẻ ôn bị đẩy dưới màn gập | card bắt đầu y≈475/844; ô gõ y≈690; trên nó là ~190px tiêu đề + 4 ô số + 6 chip game | Cao |
| 4 | Game đặt **trước** bài ôn | hàng "Chơi nhanh" nằm trên thẻ ôn → mời bỏ việc chính; 6 chip cùng trọng số, không mô tả luyện gì, khoá chỉ báo bằng toast | Cao |
| 5 | Phiên ôn không có cảm giác "phiên" | không có n/N, không nút thoát; tab bar + dashboard vẫn hiện; từ ôn lại vào bước 3 nhưng thanh 5 chấm hiện 2 bước "đã xong" không hề có | TB |
| 6 | Dashboard thống kê dính dưới thẻ ôn | tỉ lệ nhớ, dự báo, heatmap (không chú thích), "Hay quên" (nút ghost trông như chữ) — chỗ đọc số liệu ≠ chỗ làm bài | TB |
| 7 | Chrome lặp mỗi tab | brand + eyebrow + H1 + subtitle ≈190px, lời động viên chung chung chiếm chỗ | TB |
| 8 | Badge đỏ trên tab "Hôm nay" = 7 việc giáo án | tạo áp lực cho việc ngoài app; 2 badge (7 + 60) tranh nhau | TB |
| 9 | "Góc của bạn" trộn 3 loại | cài đặt + thư viện 5033 từ + sửa giáo án trong `<details>`; "Xoá tiến độ" không tách vùng nguy hiểm | Thấp |
| 10 | Thuật ngữ nội bộ lộ ra UI | "Mã hoá kép", "Bước 3 · Nghe rồi gõ", "Chạy 60 giây" | Thấp |

## Lỗi phụ phát hiện khi audit (ngoài phạm vi UX)

- **Lộ đáp án bước 1**: `wordRx` (`js/word-games.js:22`) có `INFLECT = s|es|ed|d|ing|ly|er|est` nhưng không bắt phụ âm nhân đôi → "big" trong "The lobster's claws are **bigger**…" không bị che. Ảnh hưởng mọi từ kiểu big→bigger, stop→stopped, run→running (bước 1, Điền câu, Điền câu tốc độ).
- Emoji không khớp nghĩa (big → 🎨) — vấn đề nội dung `words.json`.

## Giữ nguyên (không đảo quyết định user)

- Bảng màu xanh ngọc + đào (`docs/design-guidelines.md`, user chốt 2026-09-23). Skill gợi ý claymorphism/Kalam/xanh dương — **bỏ qua**, vấn đề là IA không phải style.
- Luồng 5 bước từ mới, SM-2, ranh giới game ↔ SRS, 1 trận truyện/ngày của Pháp sư.
