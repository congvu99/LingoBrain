---
phase: 1
title: "Module thuần + hàng đợi từ sai"
status: completed
priority: P1
dependencies: []
---

# Phase 1: Module thuần + hàng đợi từ sai

## Overview

Tạo `js/word-games.js` (thuần, test được bằng Node) và mở rộng `buildQueue()` để nhận danh sách từ sai trong game. Không có UI ở pha này — kết thúc pha, `node tests/run-tests.js` xanh và app chạy y như cũ.

## Requirements

- Chức năng: chọn từ có trọng số theo `lapses`, xáo chữ cái, sinh 4 đáp án **từ**, tính hệ số combo, gom/khử trùng từ sai, kiểm tra điều kiện mở khoá từng game.
- Phi chức năng: không đụng DOM, `localStorage`, `window`. Mọi hàm nhận `rand` để test tất định.
- Tương thích ngược: `buildQueue(deck, srs, cfg, now)` gọi thiếu tham số thứ 5 vẫn chạy đúng như trước.

## Architecture

### `js/word-games.js` — API xuất ra

```js
const GAME_IDS = ['scramble', 'sprint', 'cloze'];
const GAME_LABEL = { scramble: 'Xếp chữ', sprint: 'Chạy 60 giây', cloze: 'Điền câu tốc độ' };
const MIN_LEARNED = 8;      // cần đủ từ để sinh 3 đáp án nhiễu
const SCRAMBLE_ROUND = 10;  // số từ mỗi ván Xếp chữ
const SPRINT_SECONDS = 60;
const MISS_MAX = 10;

gamePool(deck, srs, gameId)        // → [word]  từ đã học, lọc theo yêu cầu riêng từng game
gameAvailability(deck, srs)        // → { scramble:{ok,have,need}, sprint:{...}, cloze:{...} }
pickGameWords(pool, srs, n, rand)  // → [word]  bốc trọng số, không lặp trong 1 ván
scrambleTiles(word, rand)          // → [{ ch, fixed }]  fixed=true cho dấu cách / gạch nối
buildWordOptions(word, deck, rand) // → [{ word, correct }] 4 phần tử, nhiễu ưu tiên cùng pos + độ dài gần
comboMult(streak)                  // → 1 | 1.5 | 2
addMiss(list, id)                  // → mảng mới, khử trùng, cap MISS_MAX (bỏ phần tử cũ nhất)
```

### Quy tắc từng hàm

**`gamePool(deck, srs, gameId)`** — lọc `srs[w.id]` tồn tại và `state !== 'new'`, cộng thêm:

| Game | Lọc thêm | Lý do |
|---|---|---|
| `scramble` | bỏ từ có `word.length <= 2` | 2 chữ cái xáo xong nhìn ra ngay |
| `sprint` | cần `w.meaning` | phải có nghĩa để làm đáp án |
| `cloze` | cần `w.context` **và** `rx(w.word).test(w.context)` | phải khoét được lỗ thật |

`rx()` nằm trong `app-storage.js` (không thuần) → **copy lại một bản nội bộ** trong `word-games.js`, không import. 3 dòng, chấp nhận trùng lặp nhỏ để giữ module thuần.

**`gameAvailability`** — `ok = pool.length >= MIN_LEARNED`, `need = MIN_LEARNED - have` khi thiếu. Dùng để tô xám chip.

**`pickGameWords`** — cần `srs` để đọc `lapses`. Trọng số `1 + (lapses || 0) * 2`. Cách làm: cộng dồn trọng số, bốc theo `rand() * total`, xoá phần tử đã bốc rồi lặp. `n` lớn hơn `pool.length` → trả toàn bộ pool đã xáo.

**`scrambleTiles`** — tách ký tự; ký tự không phải chữ (dấu cách, `-`, `'`) đánh dấu `fixed: true` và **giữ nguyên vị trí**; chỉ xáo phần chữ. Xáo lại tối đa 10 lần cho tới khi chuỗi kết quả khác chuỗi gốc; hết 10 lần vẫn trùng (ví dụ `aaa`) thì trả nguyên — không loop vô hạn.

**`buildWordOptions`** — 1 đúng + 3 nhiễu. Thứ tự ưu tiên nhiễu:
1. cùng `pos` và `|len - len(word)| <= 2`
2. cùng `pos`
3. còn lại

Không lấy từ trùng `word` hoặc trùng `meaning` với từ đúng. Xáo thứ tự cuối cùng. Thiếu ứng viên → trả mảng ngắn hơn 4; nơi gọi phải bỏ qua từ đó.

**`comboMult`** — `streak >= 10 → 2`, `streak >= 5 → 1.5`, còn lại `1`.

### `buildQueue()` — thêm tham số thứ 5

```js
function buildQueue(deck, srs, cfg, now, miss) {
  // ... phần cũ giữ nguyên, ra mảng `out`
  const front = (miss || [])
    .filter(id => deck.words.some(w => w.id === id))   // còn trong bộ
    .filter(id => srs[id] && srs[id].state !== 'new')  // đã học
    .filter(id => out.indexOf(id) < 0);                // chưa có trong hàng đợi
  return front.concat(out);
}
```

Từ sai luôn lên đầu, không nhân đôi, không tính vào `cfg.maxSession` (cap 10 ở `addMiss` là đủ).

## Related Code Files

- Create: `js/word-games.js`
- Create: `tests/word-games.test.js`
- Modify: `js/srs-scheduler.js` — `buildQueue()` + dòng `module.exports`
- Modify: `tests/run-tests.js` — thêm `'js/word-games.js'` vào `PURE_MODULES`
- Modify: `tests/srs-scheduler.test.js` — thêm case cho `miss`

## Implementation Steps

1. Viết `tests/word-games.test.js` trước, dùng `rand` giả (`let i=0; const rand=()=>SEQ[i++%SEQ.length]`).
2. Viết `js/word-games.js`, cuối file `if (typeof module !== 'undefined') module.exports = {...}` theo đúng lối các module thuần khác.
3. Thêm vào `PURE_MODULES` trong `tests/run-tests.js`.
4. Sửa `buildQueue()` + thêm test `miss`.
5. `node tests/run-tests.js` → xanh.

**Chưa** thêm `<script>` vào `index.html` ở pha này (chưa ai gọi tới) → chưa cần đụng `sw.js`/`APP_VERSION`.

## Success Criteria

- [x] `gamePool` loại hết từ `state === 'new'`; `cloze` chỉ trả từ có `context` chứa từ đó
- [x] `pickGameWords` với từ `lapses:3` xuất hiện nhiều hơn rõ rệt từ `lapses:0` qua 1000 lần bốc
- [x] `pickGameWords` không trả trùng id trong cùng một lần gọi
- [x] `scrambleTiles('stubborn')` ra chuỗi khác `'stubborn'`; `scrambleTiles('take off')` giữ dấu cách đúng vị trí thứ 5
- [x] `buildWordOptions` trả đúng 4 phần tử, đúng 1 cái `correct`, không trùng từ
- [x] `comboMult(4)===1`, `comboMult(5)===1.5`, `comboMult(10)===2`
- [x] `addMiss` khử trùng và không vượt 10 phần tử
- [x] `buildQueue(deck,srs,cfg,now)` (4 tham số) cho kết quả y hệt trước khi sửa
- [x] `buildQueue(...,['stubborn'])` đưa `stubborn` lên đầu, không nhân đôi nếu nó đã đến hạn
- [x] `node tests/run-tests.js` xanh toàn bộ

## Risk Assessment

| Rủi ro | Xử lý |
|---|---|
| `scrambleTiles` loop vô hạn với từ toàn chữ giống nhau | Cap 10 lần thử, hết thì trả nguyên |
| Sửa `buildQueue` làm hỏng test SM-2 sẵn có | Tham số thứ 5 optional, nhánh mới chỉ chạy khi có `miss` |
| Trùng lặp `rx()` giữa 2 file | Chấp nhận: 3 dòng, đổi lại giữ được module thuần |
| Bộ từ nhỏ → `buildWordOptions` không đủ nhiễu | Trả mảng ngắn; pha sau bỏ qua từ đó thay vì crash |
