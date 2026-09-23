---
phase: 1
title: "Hàm thuần: gộp, sanitize, payload + test"
status: completed
priority: P1
dependencies: []
---

# Phase 1: `js/sync-merge.js` (thuần, dùng chung client + server)

## Overview
Toàn bộ logic dữ liệu của sync nằm ở đây để test được bằng Node: gộp 2 payload, làm sạch payload lạ, chuyển state ↔ payload. Hợp đồng + quy tắc gộp: xem `plan.md` mục "Hợp đồng dữ liệu sync".

## Requirements
- `mergeSync(a, b, opts?)` — `opts.histMax` (mặc định 50; server dùng 20). **Giao hoán, idempotent, kết hợp** → client luôn áp `local = mergeSync(local, response)` an toàn khi có lượt ghi xen giữa.
- `sanitizePayload(p, now)` — trả payload hợp lệ, không bao giờ ném lỗi:
  - bỏ key top-level lạ; object thường tạo bằng `Object.create(null)` hoặc bỏ qua `__proto__`/`constructor`/`prototype`
  - `srs` id khớp `^[a-z0-9_-]{1,64}$`; số (`ef ivl due reps lapses last mt ts srsEpoch`) phải hữu hạn, ≥ 0; mốc thời gian > `now + 1 ngày` → kẹp về `now` (chống lệch đồng hồ / `1e308` khoá chết một từ)
  - `state` ∈ `new|learning|review|relearn`; `sentences` ≤ 5 chuỗi ≤ 500 ký tự; `hist` ≤ 50 mục `{t,g,mode}` hợp lệ
  - `plan.data` ≤ 30 task, `id` khớp `^[a-z0-9_-]{1,32}$`, chuỗi ≤ 300 ký tự; `day.data.done/caption/history` key hợp lệ, caption ≤ 500 ký tự; `gameScore` ≤ 20 game, số hữu hạn
- `toPayload(state, meta, histMax)` — `state = {srs, cfg, plan, day, gameScore}`, `meta = eng.syncmeta.v1` → payload v1; `hist` cắt `histMax` cuối (client gửi 20).
- `fromPayload(p)` — trả `{srs, cfg, plan, day, gameScore, meta: {cfgTs, planTs, dayTs, srsEpoch}}`; phần thiếu → `null` (bên gọi giữ mặc định).
- Trần kích thước (cả sanitize lẫn mergeSync): `srs` ≤ 5000 record (giữ mới nhất theo `max(last, mt)`), `done`/`caption` ≤ 30 key, `history` ≤ 400 ngày mới nhất.
- `srsEpoch` lọc **từng bên trước khi gộp** (bản cũ hơn mốc không góp câu/hist vào record mới); record chỉ có ở một bên cũng qua chuẩn hoá như hai bên (idempotent); `hist`/`sentences` sai kiểu không làm `mergeSync` ném lỗi.
- `isSyncedKey(k)` — true cho `eng.srs.v2 | eng.cfg.v1 | eng.plan.v1 | eng.day.v1 | eng.gamescore.v1`.
- Không mutate input; không đụng DOM/localStorage.

## Architecture
```
mergeSync(a, b)
  epoch = max(a.srsEpoch, b.srsEpoch)
  srs   = ∪ id → mergeRec(ra, rb, histMax), rồi lọc max(last, mt) ≥ epoch
  cfg/plan/day = pickTs(a.x, b.x)       ; day.data.history = maxByDate(a, b)
  gameScore = maxScores(a, b)
mergeRec(ra, rb): winner = cmp(last) → cmp(reps) → cmp(stringify(sched))
  out = {...sched(winner), sentences: uniq(loser ∪ winner).slice(-5),
         hist: uniqBy(t+g+mode, ra ∪ rb).sort(t).slice(-histMax), mt: max}
```
`cmp` tất định trên cả hai phía → giao hoán.

## Related Code Files
- Create: `js/sync-merge.js` (~150 dòng; > 200 thì tách `js/sync-payload-sanitize.js`), `tests/sync-merge.test.js`
- Modify: `tests/run-tests.js` (thêm `'js/sync-merge.js'` vào `PURE_MODULES`), `tests/run-tests.html` (thêm `<script>` cho `js/sync-merge.js` và `tests/sync-merge.test.js`)

## Implementation Steps (TDD)
1. **Test trước** `tests/sync-merge.test.js` (dùng `describe/it/assert` của `tests/test-harness.js`; guard môi trường, nếu cần, đặt **trong** callback `describe`, không `return` top-level):
   - srs: id chỉ ở A/B → giữ; cùng id, B `last` mới hơn → trường lịch của B
   - **cùng `last`, A có thêm 1 câu → kết quả giữ câu** (lỗi mất câu bước 5)
   - A và B cùng ôn 1 từ offline (`last` khác) → `hist` chứa cả hai lượt, trường lịch theo bản mới hơn
   - `srsEpoch`: A epoch=100 srs rỗng, B epoch=0 có record `last=50` → kết quả rỗng; record `mt=150` (khôi phục) → giữ
   - cfg/plan/day: `ts` mới hơn thắng; thiếu `ts` thua; day: bỏ tích ở bản mới → kết quả không có tích; `history` max theo ngày từ cả hai
   - gameScore: max từng trường
   - giao hoán + idempotent + kết hợp trên fixture đủ phần (so stringify đã sort key)
   - `null`, `{}`, `{srs:"x"}`, `{srs:{"__proto__":{}}}`, `last:1e308`, `last:"9"`, id `"<img>"` → sanitize không ném, ra payload sạch; `1e308` kẹp về `now`
   - `plan.data[i].id = '"><img onerror=x>'` → bị loại
   - `toPayload` cắt `hist` còn 20; `fromPayload(toPayload(x))` ≈ x (trừ hist)
   - kích thước: 2505 record đủ trường (hist 20, 5 câu 80 ký tự) → `JSON.stringify(toPayload(...)).length < 8MB`
   - `isSyncedKey('eng.gamemiss.v1') === false`
2. `node tests/run-tests.js` → đỏ.
3. Viết `js/sync-merge.js`; cuối file `if (typeof module !== 'undefined') module.exports = { mergeSync, sanitizePayload, toPayload, fromPayload, isSyncedKey };`.
4. Chạy lại → xanh; mở `tests/run-tests.html` qua `npx serve .` → xanh.

## Success Criteria
- [ ] Tất cả test sync-merge xanh ở Node và trình duyệt; test cũ không đổi
- [ ] Không tham chiếu DOM/localStorage/global app trong file

## Risk Assessment
- Lệch đồng hồ giữa máy → chọn nhầm trường lịch một từ: chấp nhận; `hist` vẫn hợp nên không mất lượt ôn trong thống kê. Kẹp tương lai `now + 1 ngày` chặn trường hợp cực đoan.
- `sentences` không có thao tác xoá nên hợp là đúng; nếu sau này có xoá câu → cần tombstone riêng.
- Thứ tự `sentences` có nghĩa (`review-steps-learn.js:152` lấy 2 câu cuối) nên không sort. Khi 2 máy viết câu khác nhau cho cùng từ, tính **kết hợp** chỉ đúng với tập câu, không với thứ tự; giao hoán + idempotent vẫn đúng → lần sync kế hội tụ về cùng thứ tự. Test kết hợp dùng fixture không xung đột câu.
