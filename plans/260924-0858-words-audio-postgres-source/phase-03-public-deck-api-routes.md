---
phase: 3
title: "API GET /api/words + /api/audio-index"
status: completed
priority: P1
dependencies: [1]
---

# Phase 3: public deck API

## Overview
Hai route GET công khai trả bộ từ + audio index từ DB, đúng shape file tĩnh (hợp đồng `plan.md`). Cache RAM khoá theo `content_hash`, single-flight, ETag so khớp yếu.

## Requirements
- `server/deck-routes.js`: `createDeckRoutes({pool, log, now})` → `{ words(req), audioIndex(req), invalidate() }`.
  - Mỗi request: `SELECT content_hash FROM deck_meta` (1 dòng, rẻ) (RT#8). Hash = hash đang cache → dùng body cache. Khác/không có cache → dựng lại: `SELECT … FROM words ORDER BY sort_order` / `SELECT text, file FROM audio_clips` → body JSON chuỗi, giữ RAM theo hash. **Không TTL.**
  - Single-flight (RT#9): đang dựng → request khác `await` cùng promise.
  - Không có `deck_meta` / `words` rỗng → 503 `{error:'Bộ từ chưa được nạp'}`, cache kết quả 503 trong 10s (RT#9); áp cho **cả 2 route**.
  - ETag `"<content_hash>"`; `If-None-Match`: tách dấu phẩy, bỏ `W/` + khoảng trắng, khớp bất kỳ → 304 không body (RT#11).
  - `invalidate()` xoá cache + cache 503 (gọi từ `onReady` phase 1).
- Tích hợp `server/auth-and-sync-routes.js`:
  - `createApi` tạo `deckRoutes` và trả thêm `invalidateDeck` (đổi `module.exports`/giá trị trả về có kiểm soát — `server.js` hiện nhận `handleApi` là hàm; đổi thành `api.handle` + `api.invalidateDeck`, hoặc gắn `handleApi.invalidateDeck = …` để giữ tương thích; chọn cách gắn thuộc tính, ít sửa hơn).
  - `ROUTES` thêm `'GET /api/words'`, `'GET /api/audio-index'`; `PATHS` thêm 2 path.
  - Kiểm `isJsonRequest` chỉ khi method có body (POST/PUT) — sửa dòng hiện đang loại trừ riêng `/api/logout`.
  - Giữ `isReady()` → 503 và limiter `apiIp` 120/phút (đã đủ, không thêm limiter riêng).
  - `send` hỗ trợ body chuỗi sẵn + header thêm (`ETag`, `Cache-Control: no-cache` thay `no-store` cho 2 route này).
- File `auth-and-sync-routes.js` đang 131 dòng → sau sửa vẫn < 200.

## Related Code Files
- Create: `server/deck-routes.js`, `tests/deck-routes.test.js`
- Modify: `server/auth-and-sync-routes.js`, `server.js` (gọi `api.invalidateDeck` trong `onReady`)

## Implementation Steps (TDD)
1. **Test đỏ** `tests/deck-routes.test.js` (fake pool đếm query, rows = `wordsToRows(words.json thật)`):
   - body parse deep-equal `words.json` (`{deck, updated, words}`);
   - 2 request cùng hash → query danh sách từ 1 lần; hash đổi → dựng lại;
   - 2 request đồng thời lúc chưa cache → 1 lần dựng;
   - `If-None-Match: W/"<hash>"`, `"x", "<hash>"` → 304; sai → 200;
   - rỗng → 503 cho cả 2 route; trong 10s không query lại danh sách; `invalidate()` → query lại;
   - audio-index → `{voice, items}` deep-equal `audio/index.json`.
2. **Test đỏ** handleApi với req/res giả: `GET /api/words` không Content-Type → 200; `POST /api/words` → 405; `isReady=false` → 503; `POST /api/login` thiếu Content-Type vẫn 415 (hành vi cũ).
3. Code → xanh; chạy toàn bộ test.

## Success Criteria
- [ ] Test xanh; route cũ không đổi hành vi.
- [ ] Nhiều instance / CLI seed → mọi instance trả bộ mới ngay request kế tiếp (nhờ kiểm hash).

## Risk Assessment
- Mỗi request thêm 1 query nhỏ — với 2 request / lần mở app, chấp nhận.
- Body ~1.2MB × (words + audio) giữ RAM — nhỏ.
- Chưa gzip → xem phase 5.
