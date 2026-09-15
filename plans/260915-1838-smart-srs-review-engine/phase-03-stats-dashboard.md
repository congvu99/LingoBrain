---
phase: 3
title: "Thống kê tiến bộ"
status: completed
priority: P2
dependencies: [1]
---

# Phase 3: Thống kê tiến bộ

## Overview
Bảng thống kê dưới thẻ ôn: tỉ lệ nhớ 7/30 ngày, dự báo 7 ngày tới, top 5 từ hay quên, heatmap 30 ngày. Tính từ `rec.hist` và `rec.due`.

## Requirements
- Functional: số liệu đúng khi đối chiếu tay; bấm từ hay quên → ôn ngay từ đó.
- Non-functional: tính toán thuần trong `js/stats-dashboard.js` (không DOM) + `renderStats()` riêng; CSS thuần, không chart lib.

## Architecture
```js
computeStats(deck, srs, now) → {
  retention7:{pass,fail,rate}, retention30:{...},   // hist g≥1 = pass, g=0 = fail
  forecast:[n0..n6],                                // số due mỗi ngày trong 7 ngày (n0 = hôm nay, gồm quá hạn)
  hardest:[{id,word,lapses,ef}] ×5,                 // lapses desc, ef asc, chỉ từ đã học
  heatmap:[{day,count}] ×30                         // số hist trong ngày
}
```
UI: `<details id="stats">` mở mặc định khi đã có ≥1 hist. Heatmap = 30 ô `div` gradient theo count (0/1-5/6-15/16+). Forecast = 7 thanh cao theo tỉ lệ max.

## Related Code Files
- Create: `js/stats-dashboard.js`, `tests/stats-dashboard.test.js`
- Modify: `index.html` (khung stats + CSS), `js/review-steps-learn.js` (`render()` gọi `renderStats()`)

## Implementation Steps (TDD)
1. Test (đỏ trước) với fixture 4 từ, hist tự dựng: retention7 = 3/4; forecast[0] gồm 1 quá hạn + 1 hôm nay; hardest[0] là từ lapses=3; heatmap ngày hôm nay count đúng; từ chưa học không vào hardest.
2. Cài `computeStats` → xanh.
3. `renderStats()` + CSS; bấm từ trong hardest → `queue.unshift(id); cur=null; render()`.
4. Test tay trên deck thật sau vài phiên.

## Success Criteria
- [x] Test xanh
- [x] Số liệu khớp đếm tay trên 1 bộ dữ liệu nhỏ
- [ ] Không chậm rõ rệt với 500 từ × 50 hist (đo `performance.now()` <20ms) (chưa đo)

## Risk Assessment
- hist chỉ có từ phase 1 → retention rỗng lúc đầu: hiện "chưa đủ dữ liệu".
