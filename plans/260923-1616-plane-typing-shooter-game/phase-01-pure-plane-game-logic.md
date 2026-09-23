---
phase: 1
title: "Logic thuần + test"
status: completed
priority: P1
dependencies: []
---

# Phase 1: Logic thuần + test

## Overview
Module `js/plane-game-logic.js` không chạm DOM: trạng thái ván, spawn, rơi theo `dt`, bắn, cấp độ, điểm, mạng. Test tất định bằng `rand` + `dt` truyền vào.

## Requirements
- Functional: spawn không trùng từ đang bay; tăng cấp mỗi 5 kill; chạm đất −1 mạng + ghi miss; hết mạng → `over`; điểm = độ dài từ × `comboMult(streak)`.
- Non-functional: < 200 dòng; không global ngoài các hàm/const khai báo; chạy được trong Node vm và trình duyệt.

## Architecture

Toạ độ chuẩn hoá: `y ∈ [0,1]` (0 = đỉnh, 1 = mặt đất), `x ∈ [0.1,0.9]` → UI tự nhân với kích thước khung (màn thấp rơi chậm tương ứng, công bằng).

```js
const PLANE_LIVES = 3, PLANE_FALL_SECONDS = 9, PLANE_START_MAX = 3, PLANE_CAP = 5,
      PLANE_KILLS_PER_LEVEL = 5, PLANE_SPEEDUP = 1.08, PLANE_SPAWN_GAP = 1.6, PLANE_LABEL_MAX = 18;

createPlaneState(words)  // { words, next:0, planes:[], lives, kills, level, streak, bestStreak, score, right, wrong, miss:[], spawnIn:0, uid:0, over:false }
stepPlanes(st, dt, rand) // dt giây, kẹp ≤ 0.05; y += dt/fallSeconds(level); chạm y>=1 → landed; spawn khi spawnIn<=0 && planes.length < maxPlanes(level)
                         // trả { landed:[plane], spawned:[plane] } để UI vẽ hiệu ứng
tryShoot(st, typed)      // normalizeTyped(typed) === normalizeTyped(plane.word.word) → xoá plane, kill++, streak++, score += len × comboMult; trả plane | null
normalizeTyped(s)        // lowercase, trim, gộp khoảng trắng, ’ → '
planeLabel(w)            // emoji + ' ' + vế đầu của meaning trước ';' (rồi ','), > PLANE_LABEL_MAX → cắt '…'
fallSeconds(level)       // PLANE_FALL_SECONDS / PLANE_SPEEDUP^level
maxPlanes(level)         // min(PLANE_CAP, PLANE_START_MAX + level)
```

- Bốc từ: `st.words` là danh sách đã `pickGameWords` (trọng số lapses). Hết danh sách → quay vòng từ đầu, bỏ qua từ đang bay.
- Nếu mọi từ còn lại đều đang bay → hoãn spawn (không crash với pool nhỏ = 8 từ).
- Chạm đất: `lives--`, `streak = 0`, `wrong++`, `miss` thêm id (khử trùng), `lives === 0 → over = true`.
- Plane: `{ uid, word, label, x, y }`. `x` từ `rand`, tránh trùng cột với plane đang ở `y < 0.25`.

## Related Code Files
- Create: `js/plane-game-logic.js`, `tests/plane-game-logic.test.js`
- Modify: `tests/run-tests.js` (thêm vào `PURE_MODULES` sau `js/word-games.js` — cần `comboMult`)

## Implementation Steps
1. Viết test trước theo danh sách ở Success Criteria (dùng helper `seq()` giống `word-games.test.js`).
2. Viết `js/plane-game-logic.js` đến khi test xanh.
3. `node tests/run-tests.js` toàn bộ xanh.

## Success Criteria
- [ ] `normalizeTyped`: `' Stubborn '` → `'stubborn'`; `'don’t'` → `"don't"`; `'give  up'` → `'give up'`
- [ ] `tryShoot` khớp đúng → trả plane, xoá khỏi `planes`, `score` tăng `len × comboMult`; gõ sai / khớp một phần → `null`, không đổi state
- [ ] `stepPlanes` không spawn từ đang bay; pool 8 từ chơi 200 bước không lặp trùng trên màn
- [ ] Plane vượt `y>=1` → `lives−1`, id vào `miss` đúng 1 lần, `streak=0`; 3 lần → `over=true`
- [ ] 5 kill → `level=1`, `fallSeconds` giảm 8%, `maxPlanes` = 4; trần 5
- [ ] `dt` lớn (vd 3s sau khi tạm dừng) được kẹp → không có plane nhảy thẳng xuống đất
- [ ] `planeLabel` cắt đúng theo `;`/`,` và `…`

## Risk Assessment
- `comboMult` định nghĩa ở `word-games.js` → thứ tự nạp: `word-games.js` trước `plane-game-logic.js` (cả Node runner lẫn `index.html`).
- Từ có dấu cách / gạch nối: normalize xử lý khoảng trắng; gạch nối giữ nguyên.
