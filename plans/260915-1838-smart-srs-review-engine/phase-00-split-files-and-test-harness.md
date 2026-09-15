---
phase: 0
title: "Tách file + test harness"
status: completed
priority: P1
dependencies: []
---

# Phase 0: Tách file + test harness

## Overview
Tách JS trong `index.html` ra `js/` theo mối quan tâm, hành vi không đổi. Dựng harness test tối giản chạy được cả trong trình duyệt lẫn Node.

## Requirements
- Functional: app chạy y hệt trước khi tách (3 tab, ôn từ, nạp, backup).
- Non-functional: không bundler; script global; `file://` vẫn mở được.

## Architecture
```
index.html            HTML + CSS + <script src> theo thứ tự + bootstrap (bindUI, showTab)
js/app-storage.js     load/save/today/dkey/esc/$/rx/toast, K_* keys
js/daily-plan.js      DEFAULT_PLAN, rollDay, renderPlan, plan edit, startRec
js/srs-scheduler.js   normWord, rec/recW, LADDER, nextBox/grade/buildQueue/stats (tạm giữ Leitner, phase 1 thay)
js/review-modes.js    speak/pickVoice, render, s1..s5, nextCard
js/word-import.js     importWords, download, renderList
tests/test-harness.js describe/it/assert (~30 dòng), chạy trong browser (tests/run-tests.html) và Node
tests/run-tests.html  load js/*.js + tests/*.test.js, in kết quả ra DOM
```
Logic thuần (scheduler, import) phải không đụng `document` ở top-level để Node chạy được. Guard: `if (typeof module!=='undefined') module.exports = {...}`.

## Related Code Files
- Create: `js/app-storage.js`, `js/daily-plan.js`, `js/srs-scheduler.js`, `js/review-modes.js`, `js/word-import.js`, `tests/test-harness.js`, `tests/run-tests.html`, `tests/run-tests.js`
- Modify: `index.html` (cắt `<script>` inline, thêm `<script src>`)

## Implementation Steps (TDD)
1. Viết `tests/test-harness.js`: `describe`, `it`, `assert.equal/deepEqual/ok`, tổng kết pass/fail, `process.exit(1)` khi Node fail.
2. Viết `tests/smoke.test.js`: `normWord({word:' Reckon '})` → id `reckon`; `nextBox(0,2)===1`; `slug('A b')==='a-b'`. Chạy Node → đỏ (chưa có file).
3. Cắt code từ `index.html` ra từng file theo bảng trên, giữ nguyên tên hàm/global.
4. `index.html`: `<script src="js/app-storage.js">` … theo thứ tự phụ thuộc, cuối cùng inline `bindUI(); rollDay(); showTab('plan');` (giữ bootstrap hiện có).
5. Chạy `node tests/run-tests.js` → xanh. Mở `tests/run-tests.html` → xanh.
6. Mở app qua `npx serve .`: đi hết 5 bước 1 từ, nạp JSON, backup/restore, sửa giáo án. Đối chiếu localStorage không đổi key.

## Success Criteria
- [x] `node tests/run-tests.js` xanh
- [x] App chạy như cũ, không lỗi console
- [x] Không file JS nào >250 dòng (trừ review-modes tạm ~300, phase 2 sẽ tách tiếp)
- [x] `file://index.html` mở được (deck trống như trước)

## Risk Assessment
- Thứ tự script sai → `ReferenceError` lúc load: giữ đúng thứ tự phụ thuộc, test smoke bắt.
- Node không có `localStorage` → `load/save` guard `typeof localStorage!=='undefined'`.
