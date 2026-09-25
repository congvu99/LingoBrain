---
phase: 1
title: Speak completion and save-then-advance
status: completed
priority: P2
dependencies: []
effort: 30m
---

# Phase 1: Speak completion and save-then-advance

## Overview
`speak()` trả Promise resolve khi lượt đọc kết thúc (xong / lỗi / bị lượt mới thay thế). Nút Lưu ở bước 5 chờ Promise đó (race với timeout) rồi mới `nextCard()`.

## Requirements
- Functional: câu người dùng đọc hết trước khi thẻ kế tiếp render & tự đọc.
- Functional: Promise luôn resolve (không treo) ở mọi nhánh: text rỗng, không có Web Speech, MP3 fetch/play lỗi → rơi sang Web Speech, lượt `speak()` mới hơn chen vào.
- Non-functional: caller hiện tại (`speak(x)` không dùng giá trị trả về) giữ nguyên hành vi. Không thêm file/module mới.

## Architecture
```
b-done click ─► lưu srs ─► khoá nút ─► Promise.race([speak(t), sleep(cap)]) ─► (cur===w && step===5) ? nextCard() : bỏ
speak(t):  resolve lượt trước (pendingDone) ─► cancel/pause ─► MP3? play → onended/onerror
                                                        └─ không / lỗi → speakSystem → u.onend/onerror
```

## Related Code Files
- Modify: `js/speech-synthesis.js`
- Modify: `js/review-steps-learn.js` (hàm `s5`)

## Implementation Steps
1. `js/speech-synthesis.js`
   - Thêm `let pendingDone = null;` cạnh `playToken`.
   - `speakSystem(text, rate, done)`: không có `speechSynthesis` → `done && done()`; có → `u.onend = u.onerror = () => done && done();`.
   - `speak(text, rate)` trả `new Promise(resolve => {...})`:
     - text rỗng → `resolve()` ngay.
     - Đầu hàm: `if (pendingDone) pendingDone(); pendingDone = resolve;` (lượt cũ bị thay → resolve, không treo). Định nghĩa `done = () => { if (pendingDone === resolve) pendingDone = null; resolve(); }`.
     - Nhánh không MP3: `speakSystem(text, rate, done)`.
     - Nhánh MP3: `player.onended` → `done()` (so token); `player.onerror` và `.catch` dùng chung `fallback` chạy đúng 1 lần (cờ `fell`), gỡ handler player rồi `speakSystem(text, rate, done)` (sau review: onerror + play() reject không đọc 2 đường; mẫu im lặng unlockAudio không báo xong nhầm).
     - Nhánh `token !== playToken` sau fetch: không cần gọi gì (đã resolve qua `pendingDone` của lượt mới).
   - Cập nhật comment đầu hàm: "trả Promise resolve khi đọc xong / lỗi / bị lượt mới thay".
2. `js/review-steps-learn.js` — `s5`, handler `#b-done`:
   - Biến cục bộ `let leaving = false;` trong `s5`; đầu handler `if (leaving) return;` (chặn bấm đúp & Ctrl+Enter).
   - Sau `save(K_SRS, srs)`: `leaving = true;` disable `#b-done`, `#b-skip`, `#b-say`; đổi nhãn `#b-done` thành `🔊 Đang đọc…`.
   - `const cap = Math.min(15000, 1500 + 100 * t.length);` (nâng sau review: rate .92 + độ trễ giọng Natural online)
   - `Promise.race([speak(t), timeout(cap)]).then(go, go)`, `go` chỉ `nextCard()` khi `btn.isConnected && tab === 'game' && !game && cur === w && step === 5` (sau review: chặn rời tab / bước 5 vẽ lại cùng thẻ; `.then(go, go)` tránh kẹt nút khi reject).
     - Guard `cur === w && step === 5`: người dùng bấm từ ở bảng thống kê (`cur = null; render()`) hoặc sync đổi thẻ trong lúc chờ → không nhảy thẻ ngoài ý muốn. Bước 5 bị vẽ lại (quay lại tab, sync re-render) → nút cũ rời DOM → không tự chuyển; câu đã lưu, người dùng bấm Bỏ qua.
   - Toast "👍 Đã lưu câu của bạn" vẫn do `nextCard()` hiện (giữ nguyên).
3. Không đổi `#b-skip`, `#b-say`, các bước khác.

## Success Criteria
- [ ] Chrome/Edge: câu tự gõ (không có MP3) đọc hết rồi thẻ từ mới mới đọc ngữ cảnh — không chồng.
- [ ] Câu có MP3 sẵn (hiếm, nhưng có thể trùng) → chờ `ended` rồi chuyển.
- [ ] Tắt mạng / giọng lỗi → chuyển trong ≤ cap.
- [x] Bấm Lưu 3 lần nhanh / Ctrl+Enter liên tục → chỉ sang 1 thẻ.
- [ ] Nút 🔊 các bước 1–3, mini game vẫn đọc như cũ; bấm 🔊 liên tục vẫn cắt câu cũ.
- [x] `npm test` xanh (446/446); harness stub vm 19/19 case speak() PASS (scratchpad, không commit).

## Test / Validation
- `speech-synthesis.js` đụng `window`/`Audio` ở top-level → không nạp được trong `tests/run-tests.js` (vm); không thêm unit test, kiểm tay theo Success Criteria trên Chrome + Edge (và Safari iOS nếu có máy).
- Chạy `npm test` để đảm bảo không vỡ test hiện có.

## Risk Assessment
- `onend` Chrome không bắn (câu dài / tab nền) → cap timeout lo, tối đa 15s.
- `player.onended` là handler dùng chung → luôn gán lại mỗi lượt + so token → lượt cũ không resolve nhầm.
- Rollback: revert 2 file; không đổi dữ liệu/schema.
