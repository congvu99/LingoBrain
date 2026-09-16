---
title: "LingoBrain — 3 game từ vựng (Xếp chữ · Chạy 60 giây · Điền câu tốc độ)"
status: completed
created: 2026-09-16
mode: standard
source: plans/reports/brainstorm-260916-0925-vocabulary-mini-games-report.md
blockedBy: []
blocks: []
---

# LingoBrain — 3 game từ vựng

Thêm 3 game ngắn vào tab Ôn từ, lấp 3 lỗ hổng mà 5 dạng kiểm tra hiện tại không chạm tới: chính tả không cần bàn phím, phản xạ nhanh, và từ nào hợp câu nào. Game **không ghi vào SM-2** — chỉ đẩy từ sai lên đầu phiên ôn kế tiếp.

## Ràng buộc chung

- Static, không bundler. Script nạp qua `<script src>` theo thứ tự, dùng biến global (không ES module, để `file://` vẫn chạy).
- Logic thuần tách riêng để test bằng `node tests/run-tests.js`; file DOM không test.
- **Không đụng `applyGrade` / `ef` / `ivl` / `due` / `hist`.** Đây là ranh giới cứng của cả plan.
- Mỗi file < 200 dòng. Thêm file mới → thêm `<script>` vào `index.html` **và** dòng trong `ASSETS` của `sw.js`, bump `APP_VERSION` + `CACHE` (test `pwa-assets` bắt buộc khớp).
- Mỗi pha deploy được độc lập; pha sau không phá pha trước.

## Phases

| # | Phase | File | Depends | Status |
|---|---|---|---|---|
| 1 | Module thuần + hàng đợi từ sai | `phase-01-pure-module-and-miss-queue.md` | — | completed |
| 2 | Khung game + Xếp chữ | `phase-02-game-shell-and-scramble.md` | 1 | completed |
| 3 | Chạy 60 giây | `phase-03-sprint-timer-game.md` | 2 | completed |
| 4 | Điền câu tốc độ | `phase-04-cloze-sprint-game.md` | 3 | completed |
| 5 | Backup, PWA, tài liệu | `phase-05-backup-pwa-docs.md` | 4 | completed |

## Kiến trúc

```
js/word-games.js      THUẦN  chọn từ có trọng số · xáo chữ · sinh đáp án từ · combo · gom từ sai
js/word-game-ui.js    DOM    menu 3 chip · vòng đời ván · đồng hồ · màn kết thúc
js/word-game-rounds.js DOM   vẽ từng dạng câu hỏi (nạp trước word-game-ui.js)
js/srs-scheduler.js   SỬA    buildQueue() nhận thêm tham số miss[] (optional, tương thích ngược)
js/app-storage.js     SỬA    K_GAMEMISS, K_GAMESCORE, bump APP_VERSION
```

Lưu trữ mới:

```
eng.gamemiss.v1   →  ["stubborn","reckon",...]                    tối đa 10, khử trùng
eng.gamescore.v1  →  { scramble:{best,plays}, sprint:{...}, cloze:{...} }
```

## Tiêu chí nghiệm thu (toàn plan)

- [x] `node tests/run-tests.js` xanh, gồm test mới cho `word-games.js` và `buildQueue(miss)`
- [x] Chơi sai N từ → mở tab Ôn từ → đúng N từ đó nằm đầu hàng đợi
- [x] Chơi 1 ván bất kỳ → khoá `eng.srs.v2` **không đổi một byte**
- [x] < 8 từ đã học → cả 3 chip khoá kèm thông báo còn thiếu bao nhiêu từ
- [x] Bộ từ không có `context` → chip C xám, A và B vẫn chơi được
- [x] Kỷ lục mỗi game còn sau khi tải lại trang, và có trong file backup
- [x] Cài PWA rồi ngắt mạng vẫn chơi được cả 3 game

## Ngoài phạm vi

Bảng xếp hạng · đăng nhập · âm thanh nền · hoạt hình · đồng bộ nhiều máy · chế độ 2 người · game ghép cặp (memory) · đưa điểm game vào biểu đồ Thống kê.

## Câu hỏi chưa chốt

- Điểm combo có tách công thức riêng cho game C không (câu dài hơn, ít lượt hơn trong 60s)? Plan hiện dùng chung; tách sau nếu chơi thật thấy lệch.
- Ván bỏ dở có tính vào `plays` không? Plan hiện: không.
