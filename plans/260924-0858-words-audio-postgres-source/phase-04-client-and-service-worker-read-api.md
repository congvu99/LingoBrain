---
phase: 4
title: "Client + SW đọc API, fallback file, prune chỉ khi nguồn API, bump version"
status: completed
priority: P1
dependencies: [3]
---

# Phase 4: client + service worker

## Overview
App đọc bộ từ + audio index từ API; lỗi (404 khi rollback, 503, offline) → `words.json` / `audio/index.json`. **Chỉ prune tiến độ khi bộ từ đến từ API** — fallback không bao giờ xoá tiến độ (RT#2). SW cache bản API để offline.

## Requirements
- Thuần `js/deck-source.js`: `fetchFirstOk(sources, fetchFn)` với `sources = [{url, tag}]` → `{data, tag}` của nguồn đầu tiên `ok` + parse được + đúng shape (`words`/mảng trần khác rỗng; `items` là object); không thì nguồn kế; hết → null.
  - Bộ từ: `[{url:'api/words', tag:'api'}, {url:'words.json?_=' + now, tag:'file'}]`.
  - Audio: `[{url:'api/audio-index', tag:'api'}, {url:'audio/index.json', tag:'file'}]`.
  - Kiểm lại tên file audio khớp `/^[0-9a-f]{12}\.mp3$/` trước khi dùng (bỏ mục sai) (RT#12).
- `js/app-shell.js` init: dùng `fetchFirstOk`; `pruneSrs` **chỉ khi `tag === 'api'`** (bản API từ SW cache cũng mang tag `api` vì URL là `api/words`). Sửa comment dòng 48, 81, 89 (RT#15).
- `js/srs-scheduler.js:135`: sửa comment về nguồn bộ từ (không đổi logic).
- `js/speech-synthesis.js`: audio map qua `fetchFirstOk`; comment đầu file cập nhật nguồn.
- `sw.js`:
  - Nhánh mới **trước** dòng bỏ qua `/api/`: `/api/words`, `/api/audio-index` → network-first, `res.ok` → lưu `CACHE` khoá `./api/words` / `./api/audio-index`; lỗi mạng hoặc `status >= 500` → bản cache (không có → trả response gốc/lỗi để client fallback file). 304 do trình duyệt xử lý với HTTP cache; SW luôn lưu response 200.
  - Giữ `words.json`, `audio/index.json` trong `ASSETS`; thêm `./js/deck-source.js`.
- `index.html`: `<script src="js/deck-source.js">` trước `speech-synthesis.js` và `app-shell.js`.
- Bump `APP_VERSION` = `CACHE` = `2.11.0`; `package.json` `2.11.0`.
- `tests/run-tests.js`: thêm `js/deck-source.js` vào `PURE_MODULES`; `tests/run-tests.html` nạp theo.

## Related Code Files
- Create: `js/deck-source.js`, `tests/deck-source.test.js`
- Modify: `js/app-shell.js`, `js/srs-scheduler.js` (comment), `js/speech-synthesis.js`, `sw.js`, `index.html`, `js/app-storage.js`, `package.json`, `tests/run-tests.js`, `tests/run-tests.html`

## Implementation Steps (TDD)
1. **Test đỏ** `tests/deck-source.test.js` (fetch giả): API 200 hợp lệ → tag `api`, không gọi nguồn 2; API 404/503/HTML/`words: []`/throw → tag `file`; cả hai lỗi → null; audio có file `../x` → bị bỏ.
2. **Test đỏ** quyết định prune: tách hàm thuần nhỏ `shouldPrune(tag)` (hoặc kiểm trong test app-shell nếu có harness) — `file` → false, `api` → true.
3. `pwa-assets` test: `deck-source.js` có trong ASSETS + index.html; version 2.11.0 khớp.
4. Code → xanh; chạy toàn bộ test.
5. Thử tay: `DATABASE_URL=… npm start` → Network thấy `/api/words` 200; sai `DATABASE_URL` → app vẫn có bộ từ từ `words.json`, tiến độ không bị xoá; offline sau lần đầu → chạy.

## Success Criteria
- [ ] Test xanh; `pwa-assets` xanh.
- [ ] Fallback file không bao giờ gọi `pruneSrs`.
- [ ] 3 kịch bản thử tay đạt.

## Risk Assessment
- Lần đầu sau bump version: SW xoá CACHE cũ (kể cả bản API cache) → nếu offline ngay lúc đó dùng `words.json` trong ASSETS mới, không prune → an toàn.
- Từ đã gỡ khỏi bộ chỉ được dọn khi app tải được API — chấp nhận (dư tiến độ vô hại).
