---
phase: 4
title: "Điền câu tốc độ"
status: completed
priority: P2
dependencies: [3]
---

# Phase 4: Điền câu tốc độ

## Overview

Game C: hiện câu ví dụ thật đã khoét lỗ, chọn 1 trong 4 **từ**. Tái dùng nguyên khung 60 giây của pha 3 — chỉ khác hàm vẽ câu hỏi. Kèm cổng chặn khi bộ từ không đủ câu ví dụ.

## Requirements

- Chức năng: dùng `context` thật + `blanked()` sẵn có, 4 lựa chọn từ do `buildWordOptions` sinh, cùng đồng hồ/combo/điểm với pha 3.
- Phi chức năng: khi không đủ dữ liệu phải nói rõ lý do, tuyệt đối không mở ra màn trống.

## Architecture

### Cổng chặn

Chip `cloze` mở khi `gameAvailability(deck, srs).cloze.ok` — tức ≥ 8 từ **đã học và có `context` chứa chính từ đó**. Không đủ → chip xám, nhãn:

> Cần thêm câu ví dụ — nạp từ kèm cột thứ 3

Đây là trạng thái rất dễ gặp: nạp bằng text 2 cột (`stubborn | bướng bỉnh`) không có `context`. Nhãn phải chỉ đúng cách khắc phục, không chỉ báo "chưa đủ".

### Vẽ một câu hỏi

```
   60s ▓▓▓▓▓▓░░░░░░        Điểm 8   🔥 ×1.5

   You're the most ______ person I've ever met.
   The Notebook

   [ stubborn ]  [ struggle ]
   [ stumble  ]  [ stubble  ]
```

- Câu: `blanked(w)` — hàm sẵn có trong `review-steps-learn.js`, đã `esc()` bên trong.
- Nguồn phim (`w.source`) hiện nhỏ bên dưới bằng lớp `.src` sẵn có.
- Lựa chọn: `buildWordOptions(w, deck, Math.random)` từ pha 1. Trả < 4 → **bỏ qua từ đó**, sang từ kế (không hiện 2–3 lựa chọn).
- Sau khi chọn: tô đúng/sai, hiện thêm `w.meaning`, `speak(w.context)` (cả câu, không chỉ từ — đây là game về câu), tự sang câu kế sau ~450ms (lâu hơn pha 3 vì có câu để đọc).
- Điểm/combo giống hệt pha 3, dùng chung `comboMult`.

### Chống lộ đáp án

Nếu `contextVi` có chứa nghĩa tiếng Việt thì **không hiện** ở bước hỏi — chỉ hiện sau khi đã chọn.

## Related Code Files

- Modify: `js/word-game-rounds.js` (hoặc `js/word-game-ui.js` nếu chưa tách) — thêm hàm vẽ câu hỏi cloze
- Modify: `js/word-game-ui.js` — mở khoá chip `cloze`, nhãn lý do khi khoá
- Modify: `css/paper-theme.css` — tái dùng `.sentence`, `.blank`, `.mcq`; thêm biến thể 2 cột cho lựa chọn từ ngắn

## Implementation Steps

1. Thêm nhánh `cloze` vào bộ vẽ câu hỏi, tái dùng toàn bộ khung đồng hồ/điểm của pha 3.
2. Mở khoá chip trong `renderGameChips()`, viết nhãn lý do khoá cho đúng 2 trường hợp (thiếu từ đã học vs thiếu câu ví dụ).
3. Thử với bộ từ `words.json` gốc (có `context`) và với một bộ text 2 cột (không có `context`).
4. `node tests/run-tests.js`.

## Success Criteria

- [x] Bộ từ gốc → chơi được, câu hiện đúng chỗ trống, không lộ từ trong câu
- [x] Bộ từ nạp bằng text 2 cột → chip xám kèm nhãn nói rõ cần cột thứ 3; A và B vẫn chơi bình thường
- [x] Nhiễu là từ cùng loại/độ dài gần (kiểm mắt 10 câu liên tiếp, không thấy cặp kiểu `stubborn` vs `run`)
- [x] Từ không đủ nhiễu bị bỏ qua êm, không hiện câu hỏi 3 lựa chọn
- [x] `contextVi` không lộ trước khi chọn
- [x] Đồng hồ, combo, điểm, từ sai hoạt động y hệt pha 3
- [x] `eng.srs.v2` không đổi sau 1 ván
- [x] `node tests/run-tests.js` xanh

## Sửa sau code review

`blanked()` dùng `rx()` — regex không cờ `g`, không chặn biên, dựng từ chuỗi **chưa** escape. Ba chỗ lộ đáp án:

| Câu | Trước | Sau |
|---|---|---|
| `I reckon you reckon too.` | `I ___ you reckon too.` — đáp án nằm ngay cạnh chỗ trống | `I ___ you ___ too.` |
| `He is a smart art lover.` (từ `art`) | `He is a sm___ art lover.` — vừa vỡ câu vừa lộ | `He is a smart ___ lover.` |
| `The AT&T store.` (từ `AT&T`) | không khớp → hiện nguyên câu kèm đáp án | `The ___ store.` |

Sửa bằng `wordRx(word, flags)` mới trong `js/word-games.js` (thuần, có test): chặn biên hai đầu, cho phép đuôi chia thường gặp (`s|es|ed|d|ing|ly|er|est`), dựng được trên chuỗi đã escape HTML. `gamePool('cloze')` và `blanked()` dùng chung một hàm nên pool và màn hình luôn đồng ý với nhau.

**Đụng vào hành vi ôn sẵn có:** `blanked()` cũng là hàm của bước 1 và dạng `owncloze`. Nay che mọi lần xuất hiện thay vì lần đầu, và không che nhầm vào giữa từ khác. Cả hai đều tốt hơn cho màn ôn.

**Không làm:** "cho phép chạm để bỏ qua ngay" trong 450ms chờ — đụng với khoá chống bấm dồn, và 450ms đã đủ ngắn.

## Risk Assessment

| Rủi ro | Xử lý |
|---|---|
| Bộ từ đủ 8 từ có `context` nhưng nhiễu quá dễ | Ưu tiên cùng `pos` + độ dài gần đã có ở pha 1; nếu vẫn dễ, hạ ngưỡng chênh lệch độ dài xuống 1 |
| Câu ví dụ quá dài, tràn màn hình nhỏ | `.sentence` đã có sẵn cỡ chữ; câu > 120 ký tự loại khỏi pool game C |
| `blanked()` không khớp khi từ trong câu ở dạng chia (`reckoned`) | `rx()` khớp không dấu biên → `reckon` vẫn khớp trong `reckoned`; chấp nhận, chỗ trống che phần gốc là đủ |
| Nghe cả câu làm chậm nhịp game | Đặt 450ms và cho phép chạm để bỏ qua ngay |
