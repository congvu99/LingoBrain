# 2026-09-15 — LingoBrain v2: từ Leitner 1 file tới SM-2 nhiều dạng test

## Việc gì
Một phiên: brainstorm → plan 8 phase (TDD) → cook toàn bộ → push `24ee3fe`.

- Thay Leitner bằng SM-2 + learning steps trong phiên. Sửa bug `shuffle(due).slice()` bỏ rơi thẻ quá hạn.
- 5 dạng kiểm tra xoay theo `ivl`; câu user viết ở bước 5 tái dùng làm cloze.
- Thống kê, nạp text `word | nghĩa`, PWA, ghi âm IndexedDB, giao diện giấy/e-reader.
- 865 dòng inline → 13 module `js/` (<200 dòng/file) + harness test tự viết, 61 test.

## Quyết định
- Không AI, không server: user chốt ở brainstorm. "Thông minh" = thuật toán + đa dạng test.
- SM-2 thay vì FSRS: 5–7 từ/ngày không đủ dữ liệu cho FSRS.
- Classic script + global, không ES module: giữ `file://` mở được.
- Giữ `eng.srs.v1` sau migrate làm dự phòng.
- Viết lại module mới thay vì tách file rồi sửa: 1 lần viết, ít token hơn.

## Va vấp
- `.claude/skills/.venv` trỏ Python không tồn tại → dùng `python` hệ thống.
- `ui-ux-pro-max --design-system` trả về style "Vibrant/Baloo" trái yêu cầu; tra `--domain style` mới ra "E-Ink / Paper".
- `agent-browser open` treo >2 phút → thay bằng script CDP thuần Node (WebSocket sẵn) + Chrome headless: chạy 15 giây, bắt được console, chụp ảnh, đi hết 5 bước.
- Heredoc Bash với nội dung Unicode dài bị lỗi quote → dùng Write tool.

## Chưa kiểm chứng (đã bỏ tick trong plan)
Lighthouse installable, offline reload thật, dark mode chụp ảnh, micro thật, private mode, 360px, hiệu năng 500 từ.
