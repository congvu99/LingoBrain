---
phase: 2
title: "5 dạng kiểm tra xoay theo độ chín"
status: completed
priority: P1
dependencies: [1]
---

# Phase 2: 5 dạng kiểm tra xoay theo độ chín

## Overview
Thêm 4 dạng kiểm tra (dictation, mcq, owncloze, speak) bên cạnh gõ từ; chọn dạng theo `state/ivl`, không lặp `lastMode`, fallback về `type` khi thiếu điều kiện.

## Requirements
- Functional: bảng chọn dạng ở brainstorm §4 Phase 2. Mọi dạng kết thúc ở bước 4 → 5.
- Non-functional: logic chọn dạng thuần, test được; UI mỗi dạng ≤60 dòng.

## Architecture
```js
// js/review-mode-picker.js (thuần)
MODES = ['type','dictation','mcq','owncloze','speak']
pickMode(rec, ctx) → mode
  // ctx = {deckSize, hasSentences, hasVoice, rand}
  // pool theo state/ivl:
  //   new|learning|relearn → ['type']
  //   review ivl<7          → ['type','dictation']
  //   review 7..30          → ['mcq','owncloze','dictation']
  //   review >30            → ['speak','owncloze']
  // lọc: mcq cần deckSize≥8; owncloze cần hasSentences; dictation cần hasVoice
  // bỏ rec.lastMode nếu pool còn >1; pool rỗng → 'type'
buildMcqOptions(word, deck, rand) → [{meaning,correct}] ×4  // ưu tiên cùng pos, không trùng meaning
```
`js/review-modes.js` tách thành: `review-steps-learn.js` (s1, s2, s5, render, nextCard) và `review-tests.js` (tType=s3 hiện tại, tDictation, tMcq, tOwncloze, tSpeak). Mỗi test gọi `finishTest(ok)` → set `revealed`, lưu `rec.lastMode`, step=4.

UI từng dạng:
- dictation: nút 🔊 (auto phát 1 lần), 🐢, input gõ, `fuzzyMatch`. Không hiện từ/nghĩa/câu trước khi trả lời.
- mcq: từ + IPA + 🔊, 4 nút nghĩa; chọn sai → tô đỏ, tô xanh đúng.
- owncloze: câu ngẫu nhiên trong `rec.sentences`, che từ bằng `rx(word)`, input gõ, `fuzzyMatch`. Nếu câu không chứa từ (user sửa) → fallback type.
- speak: nghĩa Việt + outputPrompt, nút "Tôi đã nói → lật"; lật hiện từ + 🔊; sang bước 4 (tự chấm).
- Bước 4 hiện nhãn dạng vừa làm (vd "Nghe gõ").

## Related Code Files
- Create: `js/review-mode-picker.js`, `js/review-tests.js`, `tests/review-mode-picker.test.js`
- Modify: `js/review-modes.js` → đổi tên `js/review-steps-learn.js`; `index.html` (script tags); `js/srs-scheduler.js` (`applyGrade` nhận `mode` ghi vào hist)

## Implementation Steps (TDD)
1. Test picker (đỏ trước):
   - new → 'type' luôn, kể cả deckSize 100.
   - review ivl=3 hasVoice=false → 'type'.
   - review ivl=10 deckSize=5 hasSentences=false hasVoice=true → 'dictation'.
   - review ivl=10 deckSize=20 hasSentences=true lastMode='mcq' → ∈ {owncloze,dictation}, 200 lần không ra 'mcq'.
   - review ivl=40 hasSentences=false → 'speak'.
   - buildMcqOptions: 4 option, đúng 1 correct, không trùng meaning, deck 8 từ đủ.
2. Cài picker → xanh.
3. Tách `review-modes.js` thành 2 file, giữ hành vi (test smoke phase 0 vẫn xanh, chạy tay 5 bước).
4. Cài 4 UI test mode + `finishTest`. `firstStep()`: new → 1; else → 3 với `mode=pickMode(...)`.
5. Bước 4: `applyGrade(rec,g,mode,...)`; hist ghi mode.
6. Test tay: ép `ivl` bằng console cho 3 từ (3/10/40) và duyệt đủ 5 dạng; deck 5 từ không ra mcq; tắt voice (`voice=null`) không ra dictation.

## Success Criteria
- [x] Test picker xanh
- [x] Mỗi dạng chạy hết → bước 4 → 5 không lỗi
- [x] Không dạng nào lộ đáp án trước khi trả lời
- [x] `rec.hist[i].mode` ghi đúng dạng

## Risk Assessment
- TTS chưa load voice lúc boot → `hasVoice` tính lại mỗi lần pickMode, không cache.
- owncloze với câu chứa từ ở dạng biến thể ("reckoned") → `rx(word)` không khớp → fallback type (đã có trong thiết kế).
