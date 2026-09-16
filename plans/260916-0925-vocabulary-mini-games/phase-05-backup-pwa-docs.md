---
phase: 5
title: "Backup, PWA, tài liệu"
status: completed
priority: P3
dependencies: [4]
---

# Phase 5: Backup, PWA, tài liệu

## Overview

Khép các đầu dây còn hở: kỷ lục và từ sai vào file backup, offline chạy đủ, README và tài liệu kiến trúc phản ánh đúng những gì vừa thêm.

## Requirements

- Chức năng: `Tải backup` gồm `gameScore` + `gameMiss`; `Khôi phục` nạp lại được; backup của bản cũ (không có 2 trường này) vẫn khôi phục bình thường.
- Phi chức năng: cài PWA rồi ngắt mạng vẫn chơi được cả 3 game.
- Tài liệu: đúng với code, không hứa gì chưa làm.

## Architecture

### Backup — `js/app-shell.js` + `js/word-import.js`

`btnExportAll` thêm 2 trường:

```js
download('lingobrain-backup-' + dkey() + '.json',
  { version: APP_VERSION, deck, srs, cfg, plan, day, gameScore, gameMiss });
```

`restoreBackup(j)` thêm, đặt **sau** dòng gán `srs` và **trước** `restartSession()`:

```js
gameScore = j.gameScore || {};
gameMiss  = (j.gameMiss || []).filter(id => deck.words.some(w => w.id === id));
save(K_GAMESCORE, gameScore); save(K_GAMEMISS, gameMiss);
```

Lọc theo `deck` mới vì bộ từ khôi phục có thể khác. Backup cũ thiếu 2 trường → về mặc định rỗng, không lỗi.

### Nút xoá tiến độ

`btnResetProg` hiện xoá `srs`. Bổ sung xoá luôn `gameMiss` (từ sai của bộ tiến độ cũ thành vô nghĩa). **Giữ lại `gameScore`** — kỷ lục là thành tích cá nhân, không phải tiến độ học; nếu muốn xoá thì thêm nút riêng, không gộp.

### PWA

Rà lại `ASSETS` trong `sw.js` khớp đủ file js mới (`word-games.js`, `word-game-ui.js`, và `word-game-rounds.js` nếu pha 3 đã tách). `APP_VERSION` và `CACHE` phải khớp — test `pwa-assets` đã bắt việc này, chạy lại cho chắc.

### Tài liệu

`README.md` — thêm mục **Game từ vựng** dưới mục *Tab Ôn từ*:
- bảng 3 game: tên · luyện gì · điều kiện mở khoá
- nói rõ: **game không làm giãn lịch ôn**, chỉ đẩy từ sai lên đầu phiên sau
- ghi điều kiện của Điền câu tốc độ (cần cột thứ 3 khi nạp từ) — nối với mục *Nạp từ* sẵn có

`docs/system-architecture.md` — thêm:
- 2–3 module mới vào danh sách module + thứ tự nạp
- 2 khoá `localStorage` mới vào bảng dữ liệu
- một dòng về ranh giới: game đọc `srs` nhưng không ghi; kênh liên lạc duy nhất là `K_GAMEMISS` → `buildQueue`

`docs/design-guidelines.md` — thêm token/lớp mới nếu pha 2–4 có sinh ra (`.tile`, `.game-bar`, `.game-chip`).

## Related Code Files

- Modify: `js/app-shell.js` — `btnExportAll`, `btnResetProg`
- Modify: `js/word-import.js` — `restoreBackup()`
- Modify: `sw.js` — rà `ASSETS`, `CACHE`
- Modify: `README.md`
- Modify: `docs/system-architecture.md`
- Modify: `docs/design-guidelines.md` (nếu có lớp CSS mới)

## Implementation Steps

1. Sửa export/restore/reset.
2. Rà `ASSETS` + version, chạy `node tests/run-tests.js`.
3. Thử vòng tròn: chơi vài ván → tải backup → xoá sạch `localStorage` → khôi phục → kiểm kỷ lục và từ sai.
4. Thử khôi phục một backup bản cũ (v2.0.1, không có 2 trường mới).
5. Cập nhật README + docs, đọc lại xem có câu nào hứa quá không.
6. Thử offline: `npx serve .` → cài PWA → ngắt mạng → chơi cả 3 game.

## Success Criteria

- [x] File backup mới chứa `gameScore` và `gameMiss`
- [x] Xoá sạch `localStorage` rồi khôi phục → kỷ lục 3 game và từ sai trở lại đúng
- [x] Khôi phục backup bản cũ (thiếu 2 trường) không lỗi, 2 trường về rỗng
- [x] Khôi phục bộ từ khác → `gameMiss` tự lọc bỏ id không còn tồn tại
- [x] "Xoá hết tiến độ học từ" xoá `gameMiss`, **giữ** `gameScore`
- [x] Offline sau khi cài PWA → chơi được cả 3 game
- [x] README mô tả đúng 3 game, nói rõ không ảnh hưởng lịch ôn, nêu điều kiện của game C
- [x] `docs/system-architecture.md` có module mới + 2 khoá mới + ranh giới không-ghi-SRS
- [x] `node tests/run-tests.js` xanh

## Sửa sau code review

`restoreBackup()` gán `deck` rồi mới lọc `gameMiss` theo `deck.words` — backup hỏng (`deck` không có mảng `words`) sẽ ném lỗi giữa chừng: `localStorage` còn nguyên bộ cũ nhưng `deck` trong RAM đã hỏng, lần lưu kế tiếp (thêm/xoá 1 từ) ghi đè mất bộ từ thật. Thêm kiểm `Array.isArray(j.deck.words)` **trước** mọi phép gán.

Hạn chế đã biết, không sửa: `restartSession()` chạy ngay sau khôi phục sẽ tiêu thụ `gameMiss` vừa nạp (đưa vào hàng đợi rồi xoá khoá). Đúng ý đồ "tiêu thụ một lần", nhưng nghĩa là tải lại trang trước khi ôn thì mất. Chấp nhận.

## Risk Assessment

| Rủi ro | Xử lý |
|---|---|
| `restoreBackup` đọc `gameMiss` trước khi `deck` được gán → lọc sai | Đặt đoạn mới sau dòng gán `deck`/`srs`, trước `restartSession()` |
| Khôi phục xong `restartSession()` tiêu thụ luôn `gameMiss` vừa nạp | Đúng ý đồ — từ sai lên đầu phiên ngay sau khôi phục |
| Tài liệu hứa tính năng chưa có | Bước 5 đọc lại sau khi viết, đối chiếu với tiêu chí nghiệm thu |
| Quên file mới trong `ASSETS` → offline vỡ | Test `pwa-assets` đối chiếu thẳng với `<script src>` trong `index.html` |
