---
phase: 6
title: "Lưu ghi âm shadowing"
status: completed
priority: P3
dependencies: [0]
---

# Phase 6: Lưu ghi âm shadowing

## Overview
Ghi âm ở việc `act:'rec'` được lưu vào IndexedDB, giữ 10 bản/việc, nghe lại/xoá dưới việc, kèm ô "câu đang shadow" + 🔊 TTS để so A/B. Không chấm điểm.

## Requirements
- Functional: reload còn bản ghi; bản thứ 11 đẩy bản cũ nhất; xoá được từng bản; caption lưu cùng bản ghi.
- Non-functional: lớp store thuần Promise trong `js/recording-store.js`; UI trong `js/daily-plan.js`; ghi âm không nằm trong backup JSON (ghi chú trong UI).

## Architecture
```js
// js/recording-store.js — IndexedDB 'lingobrain' v1, store 'recordings' keyPath 'id', index 'taskId'
openDb() → Promise<IDBDatabase>
addRecording({taskId,caption,blob}) → Promise<rec>     // id = Date.now(), date = dkey(); sau đó prune(taskId,10)
listRecordings(taskId) → Promise<rec[]>                // mới nhất trước
deleteRecording(id) → Promise
prune(taskId,keep) → Promise
```
UI dưới mỗi việc `rec`: input caption (giữ trong `day.caption[taskId]`, localStorage), nút 🔊 đọc caption bằng `speak`, nút ⏺ (hiện có) → dừng → `addRecording`; danh sách: `HH:MM · ▶ · 🗑`. Phát bằng `URL.createObjectURL(blob)`, revoke sau `ended`. Dòng nhỏ: "Bản ghi lưu trên máy này, không nằm trong backup."

Test: IndexedDB không có trong Node → test bằng `fake-indexeddb`? Không cài npm. Thay bằng `tests/recording-store.test.js` chạy **chỉ trong trình duyệt** (`run-tests.html`), skip trong Node bằng guard `typeof indexedDB==='undefined'`.

## Related Code Files
- Create: `js/recording-store.js`, `tests/recording-store.test.js`
- Modify: `js/daily-plan.js` (`startRec`, `renderPlan`), `index.html` (script + CSS nhỏ), `sw.js` ASSETS (thêm file mới, bump cache), `README.md` (mục Ghi âm)

## Implementation Steps (TDD)
1. Test browser (đỏ): add 11 bản taskId 't3' → list trả 10, không có bản đầu; delete 1 → 9; add taskId 't5' không ảnh hưởng 't3'; caption đọc lại đúng. Dọn DB `lingobrain-test` trước mỗi lần.
2. Cài store → xanh trong `run-tests.html`.
3. Nối UI: sửa `startRec` để lưu sau khi dừng; render danh sách; caption + 🔊.
4. Test tay trên điện thoại: ghi, reload, nghe, xoá; kiểm tra iOS Safari cho phép.

## Success Criteria
- [x] Test browser xanh
- [x] Ghi 11 bản → còn 10, reload còn
- [ ] Caption + 🔊 hoạt động, nghe A/B được (cần micro thật)
- [ ] Không lỗi khi trình duyệt chặn IndexedDB (private mode) → toast, vẫn nghe lại tạm như cũ (chưa thử private mode)

## Risk Assessment
- iOS xoá IndexedDB sau 7 ngày không dùng → ghi rõ "dữ liệu tạm".
- Blob webm/mp4 khác nhau theo trình duyệt → lưu `blob.type`, phát bằng chính type đó.
- Dung lượng: ~1MB/phút × 10 × 2 việc = chấp nhận; prune giữ giới hạn.
