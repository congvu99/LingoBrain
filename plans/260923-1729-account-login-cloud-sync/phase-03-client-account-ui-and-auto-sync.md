---
phase: 3
title: "Client: UI tài khoản, auto sync, xoá/khôi phục, service worker"
status: completed
priority: P1
dependencies: [1, 2]
---

# Phase 3: Client — `js/cloud-sync.js` + UI trong tab Quản lý

## Overview
Form đăng nhập/đăng ký trong `<details>` "Cài đặt & sao lưu" (`index.html:83`). Sync tự động, im lặng khi lỗi mạng. Không đăng nhập → không có request `/api/*`, app y hệt hiện tại. Hợp đồng dữ liệu: `plan.md`.

## Requirements
**Meta & dấu thời gian**
- `save(k, v)` (`js/app-storage.js:10`): sau `setItem`, nếu `k` là `K_CFG|K_PLAN|K_DAY` → cập nhật `cfgTs|planTs|dayTs = Date.now()` trong `eng.syncmeta.v1`; rồi `if (typeof onLocalSave === 'function') onLocalSave(k);`.
- `mt`: `applyGrade` (`js/srs-scheduler.js:70`) đặt `r.mt = now`; lưu câu bước 5 (`js/review-steps-learn.js:170`) đặt `rw.mt = Date.now()` — **bắt buộc**, kể cả record vừa tạo bằng `blankRec()` (`last: 0`): thiếu `mt` thì câu của từ chưa chấm bị lọc mất sau mỗi lần xoá/khôi phục (`srsEpoch > 0`).
- "Xoá tiến độ" (`js/app-shell.js:57-61`): `srs = {}`; **chỉ khi đang đăng nhập** mới đặt `srsEpoch = Date.now()` (quyết định người dùng: chưa đăng nhập thì xoá/khôi phục chỉ trên máy này). Đang đăng nhập → chữ confirm "…cả trên tài khoản và các máy khác?".
- `restoreBackup` (`js/word-import.js:27-39`): sau khi gán srs → `srsEpoch = now`, mọi record `mt = now`; `day` được `save` nên có `dayTs` mới. Đang đăng nhập → confirm "Dữ liệu tài khoản sẽ bị thay bằng backup này?". `gameScore` vẫn gộp max (kỷ lục không giảm — ghi rõ trong docs).

**Kích hoạt sync** (chỉ khi có token)
- (a) cuối `init()` (`js/app-shell.js:76-91`); (b) `onLocalSave(k)` với `isSyncedKey(k)`, debounce **10s**; (c) `visibilitychange → hidden`: gửi ngay (fetch thường, không keepalive); (d) `visibilitychange → visible` / `pageshow`: sync nếu lần cuối > 60s.
- Chỉ 1 request bay; thay đổi trong lúc bay → `dirty`, chạy lại khi xong.

**Áp kết quả**
- `local = mergeSync(toPayload(state hiện tại, meta), response.data)` → `applySyncPayload(local)`:
  - dựng xong mọi giá trị mới trước, rồi gán: `srs = …`, `Object.assign(cfg, …)` (**`cfg` là `const`** — `js/app-storage.js:28`), `plan = …` (bỏ qua nếu khung sửa giáo án đang có thay đổi chưa lưu), `day = …`, `gameScore = …`; ghi syncmeta (`ts`, `srsEpoch`, `syncedAt`)
  - cờ `applying = true` trong **try/finally**; `save` trong lúc applying không gọi `onLocalSave`, không đổi `ts`
  - **không** gọi `pruneSrs` (queue/deckSummary đã lọc theo `deck.words`)
  - làm mới: `#setNew/#setMax`, `renderPlan()`, badge; `renderPlanEdit()` nếu không có thay đổi dở
- Sau áp lần mở app: dựng lại `queue = buildQueue(deck, srs, cfg, now, initialMiss)` **chỉ khi** chưa trả lời thẻ nào; `initialMiss` = bản sao `gameMiss` lấy trong `init()` trước `consumeGameMiss()`. Các lần sau không đụng phiên đang chạy.

**Tài khoản & máy dùng chung**
- `eng.auth.v1 = {token, username}`; `eng.syncmeta.v1.owner` = username đã sync gần nhất trên máy.
- Đăng nhập/đăng ký thành công:
  - `owner` rỗng hoặc bằng username → sync ngay (gộp local lên TK)
  - `owner` khác username **và** local có dữ liệu → `confirm('Máy đang có tiến độ của <owner>. OK = dùng dữ liệu tài khoản <username>; Huỷ = gộp vào')`. OK → đặt state về mặc định (srs `{}`, cfg/plan/day mặc định, ts = 0, epoch = 0) rồi sync (server thắng nhờ ts/last lớn hơn)
- Đăng xuất: `POST /api/logout` (bỏ qua lỗi) → xoá `eng.auth.v1`, **giữ** dữ liệu local và `owner`.

**Xử lý phản hồi**
| Phản hồi | Hành vi |
|---|---|
| 200 JSON | áp, trạng thái "✓ Đã đồng bộ lúc HH:MM" |
| 401 | xoá token, hiện form, toast "Phiên đăng nhập hết hạn" |
| 413 | trạng thái "⚠️ Dữ liệu quá lớn để đồng bộ", dừng auto sync tới lần mở app kế |
| 429, 5xx, 503, 404/405, không phải JSON, lỗi mạng | giữ `dirty`, backoff 30s → 60s → … tối đa 10 phút; trạng thái "⚠️ Chưa đồng bộ — sẽ thử lại"; không toast dồn dập |

**UI** (trong `<details>` Cài đặt & sao lưu, trên nút backup; dùng class có sẵn `row`, `f`, `btn-sm`, `btn-ghost`, `small muted` theo `docs/design-guidelines.md`)
- Chưa đăng nhập: `input#acUser` (`autocomplete=username`, `autocapitalize=off`), `input#acPass` (`type=password`), `button#acLogin` "Đăng nhập", `button#acRegister.btn-ghost` "Đăng ký", ghi chú "Đăng nhập để đồng bộ từ đã học giữa các thiết bị. Quên mật khẩu sẽ không lấy lại được."
- Đã đăng nhập: "👤 <b>tên</b> · trạng thái", `button#acLogout.btn-sm.btn-ghost` "Đăng xuất". Tên qua `esc()`.
- Kiểm định dạng phía client (cùng regex server); nút disable khi đang gọi; lỗi server hiện nguyên thông báo `error`.

**Bảo mật hiển thị**
- `js/daily-plan.js:94-107`: `esc()` mọi `taskId` trong selector/attribute (`data-rec`, `data-say`, `data-list`) và `r.id` (`data-play`, `data-del`) — dữ liệu giáo án giờ đến từ máy khác.

**Service worker**
- `sw.js` fetch: `if (url.pathname.startsWith('/api/')) return;` (hiện non-GET đã bỏ qua ở `sw.js:47`; thêm để chắc khi sau này có GET). Thêm `./js/sync-merge.js`, `./js/cloud-sync.js` vào `ASSETS`; bump `CACHE` = `APP_VERSION`.

## Architecture
- Thứ tự nạp trong `index.html`: `srs-scheduler.js` → `sync-merge.js` → `app-storage.js` → … → `word-import.js` → `cloud-sync.js` → `app-shell.js`.
- `js/cloud-sync.js` (~180 dòng; vượt 200 thì tách `js/cloud-sync-account-ui.js`): `loadMeta/saveMeta`, `buildLocalPayload`, `applySyncPayload`, `onLocalSave`, `scheduleSync`, `syncNow({initial})`, `api(path, body)` (phân loại phản hồi theo bảng), `resetLocalToDefaults`, `renderAccount`, `bindAccountUI`.

## Related Code Files
- Create: `js/cloud-sync.js`, `tests/cloud-sync-apply.test.js`
- Modify: `js/app-storage.js` (K_AUTH, K_SYNCMETA, hook trong `save`), `js/srs-scheduler.js` (`mt` trong `applyGrade`), `js/review-steps-learn.js` (`mt` khi lưu câu), `js/word-import.js` (epoch + `mt` khi khôi phục, confirm), `js/app-shell.js` (init: `initialMiss`, `syncNow({initial:true})`; nút xoá tiến độ), `js/daily-plan.js` (`esc()`), `index.html` (UI + 2 `<script>`), `sw.js`, `tests/run-tests.html` (nạp `cloud-sync-apply` nếu chạy được trên trình duyệt)

## Implementation Steps (TDD)
1. **Test trước** `tests/cloud-sync-apply.test.js` (Node, nạp `js/cloud-sync.js` trong vm với stub `save`, `localStorage`, `document`, `fetch` tối thiểu — guard trong `describe`):
   - `applySyncPayload` với `cfg` const → `cfg.newPerDay` đổi, không ném; lỗi giữa chừng → `applying` về false
   - save trong lúc applying không gọi sync, không đổi `ts`
   - reset: `srsEpoch` tăng; payload gửi đi có epoch mới; response cũ (epoch thấp, còn record) → sau áp local vẫn rỗng
   - restore: record `mt = now`, epoch = now
   - owner khác + chọn "dùng dữ liệu TK" → state về mặc định trước khi sync
   - phân loại phản hồi: 401/413/429/404 HTML/lỗi mạng → đúng nhánh
   - `srs-scheduler` test hiện có: thêm ca `applyGrade` đặt `mt`
2. `node tests/run-tests.js` → đỏ → viết/sửa → xanh (gồm `pwa-assets` sau bump).
3. Thử tay: server local + Postgres Docker (`docker run -e POSTGRES_PASSWORD=dev -p 5432:5432 postgres:16`; `DATABASE_URL=postgres://postgres:dev@localhost:5432/postgres npm start`), 2 profile trình duyệt = 2 máy:
   - học ở A → B thấy; cùng ôn 1 từ offline cả hai → online → hist có cả hai lượt
   - viết câu bước 5 sau khi chấm > 10s → B thấy câu
   - bỏ tích việc ở A → B bỏ tích
   - xoá tiến độ ở A (offline) → online → B mở → B cũng rỗng
   - A đăng xuất, đăng nhập TK khác → hỏi, chọn OK → thấy dữ liệu TK mới, TK cũ không bị gộp
   - tắt server giữa chừng → "⚠️ Chưa đồng bộ", bật lại → tự hội tụ

## Success Criteria
- [ ] Không đăng nhập: không có request `/api/*`
- [ ] Mọi kịch bản thử tay ở bước 3 đạt
- [ ] Đang ôn dở thẻ, sync nền về → thẻ hiện tại không bị reset; từ sai trong game vẫn lên đầu
- [ ] Tắt mạng: không toast lỗi dồn dập

## Ghi chú triển khai (sau code review)
- Tách thành `js/cloud-sync-engine.js` (sync, test Node: `tests/cloud-sync-engine.test.js`) + `js/cloud-sync-account-ui.js` (DOM). `save(k, v, opts)` chỉ gọi hook `onLocalSave`; đóng dấu ts nằm trong engine.
- `rollDay` lưu với `{stamp:false}`; `day` gộp theo **ngày mới hơn trước, rồi ts**; ngày tương lai bị server loại + client không áp; `rollDay` không lùi.
- Đổi chủ (`switchOwner`): luôn hỏi khi chủ khác, luôn xoá `srsEpoch`/ts của chủ cũ; reset mặc định dùng ngày `1970-01-01` để day của TK thắng.
- Phản hồi về sau khi đổi tài khoản bị bỏ; fetch timeout 20s; dựng lại hàng đợi sau lần sync **thành công** đầu (cả sau đăng nhập); không vẽ lại tab Giáo án khi đang gõ/ghi âm; listener `online`; CSP `media-src data:` (mở khoá audio iOS).
- Còn lại (chấp nhận, ghi docs): máy mở app ngày mới với dữ liệu hôm qua cũ rồi tích việc có thể làm streak lệch; lệch đồng hồ ảnh hưởng quyết định epoch/ts.

## Risk Assessment
- Vòng lặp apply → save → sync → cờ `applying` + try/finally.
- Hai tab cùng mở: tab cũ ghi đè localStorage bằng srs cũ → epoch lọc được record trước mốc xoá; các trường hợp khác gộp theo trường nên không mất lượt ôn. Không làm đồng bộ giữa tab (YAGNI).
- iOS đóng app khi ẩn → lần gửi cuối có thể không tới; dữ liệu local không mất, sync ở lần mở kế (trigger d).
- Lệch đồng hồ cho `ts` cfg/plan/day → server kẹp tương lai `now + 1 ngày` (phase 1).
