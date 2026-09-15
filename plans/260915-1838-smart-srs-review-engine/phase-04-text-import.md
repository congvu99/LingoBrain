---
phase: 4
title: "Nạp từ bằng text"
status: completed
priority: P2
dependencies: [0]
---

# Phase 4: Nạp từ bằng text

## Overview
Một ô dán nhận cả JSON lẫn text nhiều dòng `word | nghĩa | câu | nguồn`. Form thêm nhanh rút còn 2 ô bắt buộc.

## Requirements
- Functional: JSON cũ vẫn nạp; text tách theo `|`, tab, ` - ` (ưu tiên theo thứ tự); bỏ dòng trống và dòng bắt đầu `#`; cột 3 = context, 4 = source.
- Non-functional: parser thuần trong `js/word-import.js`, test được.

## Architecture
```js
parseImport(raw) → {words:[...], errors:[{line,reason}]}
  // trim; nếu bắt đầu '[' hoặc '{' → JSON.parse (như cũ)
  // else: từng dòng → detectSep(line) → split → normWord({word,meaning,context,source})
  // dòng thiếu nghĩa → errors
importWords(raw) dùng parseImport, toast "Thêm a, cập nhật b, bỏ c dòng lỗi"
```
UI: gộp ô `#importBox` + nút "Nạp" + placeholder mẫu 2 dòng text. Form Thêm nhanh: word + meaning; các ô còn lại trong `<details>Thêm chi tiết</details>`.

## Related Code Files
- Modify: `js/word-import.js`, `index.html` (tab Quản lý)
- Create: `tests/word-import.test.js`

## Implementation Steps (TDD)
1. Test (đỏ): 3 dòng `a | b`, `c - d`, `e\tf` → 3 từ; dòng `# note` bỏ; `x` (không nghĩa) → 1 error; JSON array cũ → như trước; `give up - bỏ cuộc - Don't give up! - Movie` → context/source đúng; từ có `-` trong nghĩa nhưng dùng `|` → không cắt nhầm.
2. Cài `parseImport` → xanh.
3. Nối UI, cập nhật placeholder + README đoạn "Nạp từ".

## Success Criteria
- [x] Test xanh
- [x] Dán 5 dòng text từ ghi chú điện thoại → nạp đúng, toast đúng số
- [x] Nạp JSON mẫu cũ vẫn chạy

## Risk Assessment
- ` - ` xuất hiện trong câu ngữ cảnh → chỉ tách ` - ` khi không có `|`/tab; README ghi rõ ưu tiên `|`.
