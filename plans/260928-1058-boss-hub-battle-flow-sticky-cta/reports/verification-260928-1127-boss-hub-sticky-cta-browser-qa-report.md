# Browser QA (tự chạy) — boss hub sticky CTA

Ngày: 2026-09-28 · Công cụ: agent-browser (Chromium) · http://localhost:5179 (tĩnh)

> Báo cáo tester trước đó (`tester-260928-1058-…-visual-qa-report.md`) KHÔNG đáng tin: ảnh "hub" thực là tab Hôm nay, màn kết trận chỉ "gián tiếp". Đã xoá ảnh sai; kết quả dưới đây là kiểm tra lại thật.

## Kết quả
| Kiểm | KQ |
|---|---|
| Sảnh 375×812: thanh dính sát tab bar (bar bottom = scroller bottom = 735) | ✅ (sau fix) |
| Cuộn cuối sảnh: nút phụ/nhật ký không bị che | ✅ |
| "Cách chơi" đóng sẵn; nút 48px; không tràn ngang | ✅ |
| Cây nguyên tố → `#bossStart` → `#bossGame` | ✅ |
| Tiến hoá có thanh; chọn dạng lưu `fire-a`; bấm thanh → vào trận | ✅ |
| Thắng + vượt cấp 8: `Tiến hoá ngay` primary, `Cộng điểm (7)`/`Luyện phép`/`Về sảnh` ghost | ✅ |
| Kết trận → Tiến hoá ngay: `game.stop === stopBossHub` | ✅ |
| Thua → Về sảnh → Cây → ← → thoát: `bossPortraitStop` null, `game` null | ✅ |
| `refreshBossHub()` khi đang ở Tiến hoá → vẫn ở Tiến hoá | ✅ |
| 360×740 dark: không tràn, tương phản ổn | ✅ |
| Console errors | 0 |
| `node tests/run-tests.js` | 755/0 |

## Lỗi tìm thấy + đã sửa
- Thanh dừng cách tab bar 28px (sticky tính theo mép padding `.app-scroll`) → lộ nội dung phía sau. Fix: `.app-scroll:has(.boss-battle-bar){padding-bottom:0}`.
- Lưu ý: SW phục vụ CSS cũ khi test lại — phải unregister + xoá cache. Máy thật tự lên bản mới nhờ bump `2.24.8`.

## Chưa kiểm
- iOS thật (bàn phím bật khi bấm thanh từ màn phụ) — code gọi `startBossBattle` đồng bộ trong click, như nút cũ.
- `:has()` cần Safari 15.4+ / Chrome 105+; trình duyệt cũ hơn chỉ còn hở 28px (không hỏng chức năng).

Ảnh: `screenshots-verified/`.
