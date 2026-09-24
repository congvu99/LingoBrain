---
phase: 1
title: Batch tooling validator and interleave merge
status: completed
priority: P1
dependencies: []
---

# Phase 1: Batch tooling validator and interleave merge

## Overview
Một script Node thuần: kiểm tra file batch JSON rồi gộp vào `words.json` và sắp lại thứ tự xen kẽ. Dùng chung cho phase 2–4.

## Requirements
- Functional:
  - `node tools/spoken-core-batch.js check <batch.json>` → in lỗi theo mục, exit 1 nếu có lỗi.
  - `node tools/spoken-core-batch.js merge <batch.json>` → chỉ ghi khi check pass; nối batch + reorder toàn bộ; ghi `words.json` giữ format hiện tại (2 space indent, `deck`, `updated` = hôm nay).
  - `node tools/spoken-core-batch.js reorder` → chỉ sắp lại (idempotent).
- Non-functional: không dependency mới; logic thuần tách để test được.

## Architecture
Batch file: mảng mục 12 trường, cùng shape `words.json`. Lưu ở `plans/260924-1629-spoken-core-2500-vocabulary/data/batch-XX-<group>.json` (không ship; `words.json` vẫn là nguồn duy nhất).

Luật check (mỗi mục):
- Đủ 12 trường, đều string; không trường thừa.
- `id` = `slug(word)` dùng lại từ `js/srs-scheduler.js` (ký tự ngoài `[a-z0-9]` → `-`): `reach out` → `reach-out`, `o'clock` → `o-clock`, `I'm down` → `i-m-down`. Bỏ nháy sẽ trùng Oxford (`it's`→`its`, `I'll`→`ill`) nên không dùng.
- Không trùng `id` và `word.toLowerCase()` với `words.json` hiện tại + trong batch.
- `word`: không nháy cong, ≤ 30 ký tự, không khoảng trắng đầu/cuối/kép.
- `ipa` khớp `^/.+/$`.
- `meaning`, `context`, `contextVi` không rỗng; vế nghĩa đầu (trước `;`) ≤ 49 ký tự.
- `wordRx(word).test(context)` = true (import từ `js/word-games.js`; nếu file không export cho Node thì thêm `module.exports` guard theo mẫu `js/plane-game-text.js:42`).
- `emoji` không rỗng, ≠ `📘`.
- `outputPrompt` không bắt đầu bằng `Đặt một câu của riêng bạn`, có chứa `word`.
- `source` ∈ `Spoken core · phrasal verb|chunk|discourse|word`.
- `mnemonic` = "", `image` = "".
- Cảnh báo (không chặn): `context` dài hơn `CLOZE_MAX_SENTENCE` (không vào game cloze).

Reorder: nhóm F = mục không phải Oxford/Spoken (5 mục phim, giữ đầu, giữ thứ tự), O = `source` bắt đầu `Oxford`, S = `Spoken core`. Kết quả = F + lặp [O, O, S]; hết nhóm nào thì nối phần còn lại của nhóm kia. Thứ tự nội bộ O/S giữ nguyên.

## Related Code Files
- Create: `tools/spoken-core-batch.js`, `tests/spoken-core-batch.test.js`
- Modify: `tests/run-tests.js` (đăng ký test nếu runner liệt kê file thủ công), có thể `js/word-games.js` (export Node)
- Read: `js/word-games.js`, `tests/test-harness.js`, `tests/deck-rows.test.js` (mẫu test)

## Implementation Steps
1. Đọc `tests/run-tests.js` + `test-harness.js` để theo đúng cách nạp test.
2. Dùng lại `slug` (srs-scheduler); viết hàm thuần `validateEntries(deckWords, batch) → errors[]`, `interleave(words) → words`.
3. Viết CLI `check|merge|reorder` quanh hàm thuần; `merge` ghi file bằng `JSON.stringify(obj, null, 2) + '\n'` (so khớp format hiện tại trước khi ghi).
4. Test: slug (`I'm down`, `no one`), trùng id/word, nháy cong, IPA sai, context không chứa cụm (`figured out` với `figure out` → lỗi), emoji 📘, interleave 7 O + 3 S + 2 F → đúng thứ tự, idempotent (reorder 2 lần = 1 lần).
5. Chạy `node tools/spoken-core-batch.js reorder` trên bộ hiện tại → diff `words.json` phải rỗng (chưa có S).

## Success Criteria
- [ ] Test mới pass, `node tests/run-tests.js` pass toàn bộ.
- [ ] `reorder` trên bộ hiện tại không đổi file.

## Risk Assessment
- Format ghi lệch (escape unicode, indent) → diff khổng lồ: kiểm tra round-trip bằng `reorder` bước 5.
- `js/word-games.js` phụ thuộc DOM khi require → nếu có, sao chép tối thiểu `wordRx` là không được (DRY); thay vào đó tách export guard.
