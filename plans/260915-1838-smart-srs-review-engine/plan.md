---
title: "LingoBrain v2 — Engine ôn từ thông minh (SM-2 + đa dạng bài tập)"
status: completed
created: 2026-09-15
mode: tdd
source: plans/reports/brainstorm-260915-1838-smart-srs-review-engine-report.md
blockedBy: []
blocks: []
---

# LingoBrain v2 — Engine ôn từ thông minh

Thay Leitner bằng SM-2 có learning steps, thêm 4 dạng kiểm tra xoay theo độ chín, thống kê, nạp từ bằng text, PWA, lưu ghi âm. Vẫn static, không build tool, không framework, không AI.

## Ràng buộc chung
- Static: `index.html` + `js/*.js` + `sw.js` + `manifest.json`. Không bundler. Script load qua `<script src>` theo thứ tự, dùng global (không ES module để giữ `file://` chạy được).
- Test: file `tests/run-tests.html` mở bằng trình duyệt (hoặc `node tests/run-tests.js` cho logic thuần). Test framework tự viết ~30 dòng (`assert`, `describe`), không cài npm.
- Không mất tiến độ user: migrate v1→v2, giữ key v1.
- Mỗi phase deploy được độc lập; phase sau không phá phase trước.
- TDD: mỗi phase viết test trước cho logic thuần, chạy đỏ, code, chạy xanh, rồi mới nối UI.

## Phases

| # | Phase | File | Depends | Status |
|---|---|---|---|---|
| 0 | Tách file + test harness | [phase-00-split-files-and-test-harness.md](phase-00-split-files-and-test-harness.md) | — | completed |
| 1 | Scheduler SM-2 + learning steps + fuzzy | [phase-01-sm2-scheduler.md](phase-01-sm2-scheduler.md) | 0 | completed |
| 2 | 5 dạng kiểm tra xoay theo độ chín | [phase-02-review-modes.md](phase-02-review-modes.md) | 1 | completed |
| 3 | Thống kê tiến bộ | [phase-03-stats-dashboard.md](phase-03-stats-dashboard.md) | 1 | completed |
| 4 | Nạp từ bằng text | [phase-04-text-import.md](phase-04-text-import.md) | 0 | completed |
| 5 | PWA offline | [phase-05-pwa.md](phase-05-pwa.md) | 0 | completed |
| 6 | Lưu ghi âm shadowing | [phase-06-recording-store.md](phase-06-recording-store.md) | 0 | completed |
| 7 | Giao diện giấy / e-reader, mobile-first | [phase-07-paper-ereader-theme.md](phase-07-paper-ereader-theme.md) | 0 | completed |

Thứ tự thực hiện: 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 (user duyệt; phase 7 thêm theo yêu cầu 18:53). Phase 4–7 chỉ phụ thuộc 0 về mặt kỹ thuật.

User yêu cầu (18:53): sau plan tự cook toàn bộ không hỏi, tự quyết; chạy `/ck:ui-ux-pro-max` chọn giao diện giấy/máy đọc sách ưu tiên mobile; xong thì commit + push.

## Acceptance (toàn plan)
- Backup v1 thật nạp vào → mọi từ có `ef/ivl/state`, không từ nào mất.
- Phiên ôn: thẻ quá hạn lâu nhất luôn được chọn trước; từ mới/quên quay lại sau 4 thẻ; tốt nghiệp sau 2 lần đúng.
- Từ có `ivl≥7` nhận ≥2 dạng kiểm tra khác nhau qua các phiên; deck <8 từ không bao giờ ra mcq.
- Dán text `word | nghĩa` nhiều dòng → nạp đúng; JSON cũ vẫn nạp.
- Lighthouse PWA installable; tắt mạng reload vẫn chạy.
- Ghi âm giữ 10 bản/việc, reload còn.
- Tất cả test trong `tests/` xanh.

## Rủi ro chính
- Migrate sai phá lịch → test bằng backup thật + giữ key v1.
- TTS thiếu giọng EN → dictation fallback về type.
- SW cache cũ kẹt → versioned cache + toast reload.

## Tài liệu cần cập nhật khi xong
- `README.md`: cấu trúc file, thuật toán SM-2, 5 dạng test, nạp text, PWA, ghi âm.
- Tạo `docs/system-architecture.md` (ngắn) sau phase 2.
