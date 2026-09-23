# LingoBrain — thiết kế giao diện

Cập nhật 2026-09-23. Ưu tiên iPhone, dễ đọc và dễ thao tác cho nhiều độ tuổi. Hướng mới: xanh ngọc đậm, nền trắng ấm, điểm nhấn đào và xanh lá nhạt. Thay thế phong cách giấy nâu trước đây theo yêu cầu người dùng.

## Màu

| Token | Sáng | Tối | Công dụng |
|---|---|---|---|
| `--paper` | `#F5F7F5` | `#101F20` | Nền trang |
| `--paper-2` | `#EDF2EF` | `#1E3332` | Nền phụ, trạng thái hoàn thành |
| `--card` | `#FFFFFF` | `#192C2C` | Thẻ, điều hướng |
| `--ink` | `#203B3A` | `#E8F2EA` | Chữ chính |
| `--ink-muted` | `#586D68` | `#B1C5BD` | Chữ phụ |
| `--accent` | `#176A60` | `#9BDFC5` | Nút chính, tiến độ, tab đang chọn |
| `--accent-wash` | `#E1F2EB` | `#234B40` | Nền nhấn nhẹ |
| `--peach` | `#F6DBC6` | `#493A30` | Chuỗi ngày, từ đã thuộc |
| `--peach-ink` | `#84512D` | `#FFD2AF` | Chữ trên nền đào |
| `--ok` | `#24734F` | `#A1DBAE` | Hoàn thành, trả lời đúng |
| `--bad` | `#B13E3E` | `#FFADA4` | Trả lời sai, thao tác xoá |

Thẻ chào dùng xanh đậm `#194F49`, chữ trắng và nút đào `#F7DFC8`. Sách minh hoạ bằng CSS, không cần tải ảnh hay font từ mạng. Chế độ tối tự theo hệ thống; hỗ trợ giảm chuyển động và tăng tương phản.

## Chữ và vùng chạm

- Font sans hệ thống (SF trên iPhone), hỗ trợ tiếng Việt. Mono chỉ dùng cho IPA, mã định dạng và số liệu kỹ thuật.
- Nội dung chính 16px, mô tả 14–15px; câu tiếng Anh 21–23px; từ lớn 36px. Nhãn phụ nhỏ hơn để phân cấp.
- Input ít nhất 16px để tránh iOS tự zoom khi focus.
- Nút chính 48px; nút phụ và checkbox ít nhất 44px. Nút chấm nhớ cao 92px.
- Focus rõ, có liên kết bỏ qua tới nội dung. Tiến độ có phần trăm và giá trị cho trình đọc màn hình. Màu trạng thái đi kèm chữ, dấu kiểm hoặc biểu tượng.

## Bố cục

- iPhone: lề 18px (12px ở màn dưới 360px), nội dung một cột, thanh điều hướng dưới 76px cộng safe area. Giữ vùng an toàn cho notch và Home indicator.
- Từ 800px: phần chào và tiến độ hai cột; lịch học hai cột. Chiều rộng nội dung tối đa 1060px, màn ôn từ và cài đặt tối đa 740px.
- Thẻ bo 20–28px, nút 14px, bóng nhẹ. Không dùng hình nền nhiễu.
- Ba tab: **Hôm nay**, **Ôn từ**, **Góc của bạn**. Tab đang chọn có nền nhấn dưới icon và chữ đậm.
- Nút trong thẻ chào vào màn ôn từ; số liệu tiến độ và số từ lấy từ dữ liệu thật.
- Thanh tiến độ lịch học dùng `.progwrap > .bar`; đồng hồ game dùng `.bar-track > .bar` để hai chiều cao không ghi đè nhau.

## PWA

Biểu tượng sách dùng `icon.svg`, bản PNG 192/512 và `apple-touch-icon.png` 180px. Tất cả nằm trong cache offline. `APP_VERSION` và tên cache service worker phải khớp; bản thiết kế này là 2.5.0. Tên `paper-theme.css` giữ nguyên để tương thích đường dẫn.
