# Phase 1 — Hợp đồng số liệu `todayMetrics()`

Context: [plan.md](plan.md) · audit #1, #2 · `js/srs-scheduler.js` (`deckSummary`, `buildQueue`)

## Yêu cầu
- 1 hàm thuần trả mọi số "hôm nay"; badge, CTA Hôm nay, màn kết phiên, Tiến bộ chỉ đọc từ đây.
- "Còn hôm nay" phải **bằng đúng** độ dài hàng đợi `buildQueue` (từ sai trong game hiển thị riêng "+n từ sai trong game").

## Interface
```js
// js/srs-scheduler.js (cạnh deckSummary, export cho test)
todayMetrics(deck, srs, cfg, now, miss) → {
  reviewsToday,   // min(due, cfg.maxSession)
  newToday,       // min(fresh, cfg.newPerDay)
  gameMissToday,  // miss hợp lệ, không trùng
  leftToday,      // tổng 3 cái trên === buildQueue(...).length
  estMinutes,     // ước lượng: ôn 10s, mới 60s, làm tròn lên
  learned, learning, mature, unlearned, total
}
```
`deckSummary` giữ lại (game/test đang dùng) nhưng UI không gọi trực tiếp nữa.

## Files
- Sửa: `js/srs-scheduler.js`, `js/app-shell.js` (`updateDots`)
- Thêm: `tests/today-metrics.test.js` — bất biến `leftToday === buildQueue().length` trên 5 bộ dữ liệu (rỗng, toàn mới, due > maxSession, có miss, có learning).

## Rủi ro
- `estMinutes` lệch → chỉ ghi "~", không hứa. Rollback: revert 1 file.
