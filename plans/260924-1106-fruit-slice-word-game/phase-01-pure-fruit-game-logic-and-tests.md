---
phase: 1
title: "Logic thuần + test"
status: done
priority: P1
dependencies: []
---

# Phase 1: Logic thuần + test

## Overview
`js/fruit-game-logic.js`: toàn bộ luật chơi không chạm DOM, chạy được trong Node. Phần UI chỉ việc gọi hàm và vẽ sự kiện trả về.

## Requirements
- Functional: sinh đợt quả, chọn bom na ná, vật lý bay (ném lên + trọng lực), kiểm tra vuốt cắt quả, chấm nhát chém, tim/điểm/combo/cấp, ghi miss + cặp nhầm.
- Non-functional: tất định khi truyền `rand`; < 200 dòng; không phụ thuộc ngoài `comboMult()` (word-games.js, nạp trước).

## Architecture

```js
const FRUIT_LIVES = 3, FRUIT_HITS_PER_LEVEL = 5, FRUIT_MAX_WORD = 16;
const FRUIT_STROKE_MAX = 0.6, FRUIT_MIN_SEG = 8, FRUIT_FAST = 1.0;
const FRUIT_DIFFICULTIES = {
  easy:   { id:'easy',   label:'Dễ',  count:3, air:3.4, speedup:1.05, lookAlike:false },
  normal: { id:'normal', label:'Vừa', count:4, air:2.8, speedup:1.07, lookAlike:true  },
  hard:   { id:'hard',   label:'Khó', count:5, air:2.3, speedup:1.09, lookAlike:true  }
};
fruitDifficulty(id) · fruitScoreKey(id)           // 'fruit' | 'fruit-easy' | 'fruit-hard'
editDistance(a, b)                                // Levenshtein, chữ thường
lookAlikeWords(word, poolWords, n, rand)          // xếp hạng na ná → n từ; poolWords = từ đã học
randomDecoys(word, poolWords, n, rand)            // Dễ: ngẫu nhiên, khác nghĩa
createFruitState(words, w, h, diffId, srs)        // words = pickGameWords(...) của khung game
buildFruitWave(st, poolWords, rand)               // 1 đúng + (count-1) bom từ pool đã học, xáo vị trí ném
stepFruits(st, dt) → events[]                     // bay, quả đúng rơi → 'drop'
sliceSegment(st, x0,y0,x1,y1) → events[]          // đoạn vuốt cắt quả → 'split' (chỉ hình), ghi vào stroke
endStroke(st) → events[]                          // chấm: 'right' | 'wrong'; kết thúc đợt
```

State chính: `{ diff, words, next, wave:{ target, fruits[], t, done }, stroke:{ hits:Set, t }, lives, hits, level, score, right, wrong, streak, bestStreak, miss[], confusions:{ 'target|decoy': n }, over, w, h }`.

Quả: `{ uid, word, text, correct, gold, x, y, vx, vy, r, rot, vr, cut:false, bornAt }`. Bán kính theo độ dài chữ (đo gần đúng `len × 0.3 × fontPx`, kẹp min/max theo `st.w`).

Vật lý ném: chọn `vy0` sao cho đỉnh ≈ 25–40% chiều cao từ trên; trọng lực `g` suy từ `air / speedup^level` (thời gian lên + xuống ≈ air). `vx` nhỏ, hướng vào giữa. Các quả trong đợt xuất phát lệch nhau 0–0.25s.

Luật chấm `endStroke`:
1. `stroke.hits` rỗng → không gì.
2. Có ít nhất 1 bom → `wrong`: −1 ❤️, streak = 0, miss += target.id, confusions[target|decoy]++ cho từng bom trúng, đợt kết thúc (sự kiện kèm quả đúng để UI tô xanh + đọc).
3. Chỉ trúng quả đúng → `right`: điểm = 10 × comboMult(streak) × (gold?2:1) + (t − bornAt < FRUIT_FAST ? 5 : 0); hits++, level = ⌊hits/5⌋; đợt kết thúc.
- `sliceSegment` bỏ qua đoạn < FRUIT_MIN_SEG; tự gọi `endStroke` khi `stroke.t > FRUIT_STROKE_MAX`.
- Quả đã `cut` hoặc đợt đã `done` không cắt được nữa.
- Hết tim → `over = true`.

## Related Code Files
- Create: `js/fruit-game-logic.js`, `tests/fruit-game-logic.test.js`
- Modify: `tests/run-tests.js` (thêm vào `PURE_MODULES`, sau `js/word-games.js`)

## Implementation Steps
1. Viết hằng số, bảng cấp độ, `fruitDifficulty`, `fruitScoreKey`.
2. `editDistance`, `lookAlikeWords` (tiêu chí: Levenshtein ≤ max(2, ⌊len×0.4⌋) hoặc chung ≥3 chữ đầu → xếp theo khoảng cách, cùng `pos` trước; lùi: cùng `pos` + độ dài ±2 → bất kỳ; loại trùng `word`/`meaning` với đích), `randomDecoys`.
3. `createFruitState`, `buildFruitWave` (gold = `srs[id].lapses ≥ 2`).
4. `stepFruits`: tích phân vật lý, quả đúng qua đáy khi chưa cắt → `drop` (−1 ❤️, miss), đợt xong khi mọi quả ra khỏi màn → đợt mới.
5. `segmentHitsCircle(x0,y0,x1,y1,cx,cy,r)` + `sliceSegment` + `endStroke`.
6. Test (xem dưới), chạy `node tests/run-tests.js`.

## Tests
- `lookAlikeWords('stubborn')` trên bộ giả chứa `stumble`, `stubby`, `table` → `stubby`/`stumble` đứng trước `table`; không trả chính nó, không trùng nghĩa.
- Bộ từ không có từ na ná → vẫn đủ n bom (fallback).
- Đợt luôn có đúng 1 quả `correct`, đủ `count` quả, text không trùng.
- Nhát trúng đúng + bom → `wrong`, không cộng điểm, confusions ghi đúng khoá.
- Nhát chỉ trúng đúng → `right`, điểm có combo/gold/nhanh.
- Đoạn < 8px không cắt; nhát > 0.6s tự chấm.
- Quả đúng rơi qua đáy → mất tim + miss; bom rơi → không sao.
- 3 lần mất tim → `over`; mọi hàm no-op khi `over`.
- Tăng cấp sau 5 lần đúng làm thời gian bay giảm.
- `fruitScoreKey` khớp `/^[a-z0-9_-]{1,32}$/`.

## Success Criteria
- [ ] Test mới + toàn bộ test cũ xanh
- [ ] File < 200 dòng, không chạm `document`/`window`

## Risk Assessment
- Pool đã học nhỏ (≥ 8) → nhiều từ không có bom na ná thật, fallback cùng `pos`/bất kỳ chạy thường xuyên. Chấp nhận (user chọn: mọi chữ trên màn đều quen). Pool lớn dần theo tiến độ học.
- Luật "đợt kết thúc khi sai" có thể thấy gắt → hằng số dễ đổi, ghi chú trong code.
