---
phase: 1
title: "Scheduler SM-2 + learning steps + fuzzy"
status: completed
priority: P1
dependencies: [0]
---

# Phase 1: Scheduler SM-2 + learning steps + fuzzy

## Overview
Thay Leitner bằng SM-2 có hệ số dễ mỗi từ, learning steps trong phiên, xếp hàng ưu tiên quá hạn, migrate v1→v2, so khớp mờ ở bước 3, giấu nghĩa Việt ở bước 1.

## Requirements
- Functional: xem brainstorm §4 Phase 1. Tất cả logic thuần nằm trong `js/srs-scheduler.js`, không đụng DOM.
- Non-functional: migrate không mất từ; key v1 giữ nguyên.

## Architecture

Record v2 (`eng.srs.v2`):
```js
{ ef:2.5, ivl:0, due:0, state:'new'|'learning'|'review'|'relearn',
  reps:0, lapses:0, last:0, lastMode:'', sentences:[], hist:[] } // hist: {t,g,mode}, giữ 50
```
Trạng thái phiên (RAM, không lưu): `session = { streak:{[id]:n} }` đếm số lần đúng liên tiếp trong phiên của từ đang learning/relearn.

API thuần (input → output, không side-effect ngoài object truyền vào):
```js
migrateV1(srsV1) → srsV2                      // box→ivl=LADDER[box] (box<0→0,new), ef=max(1.3,2.5-0.1*lapses)
sm2Ease(ef,q) → ef'                           // ef+(0.1-(5-q)*(0.08+(5-q)*0.02)), sàn 1.3
nextInterval(rec,q) → days                    // reps1→1, reps2→3, else round(ivl*ef); q=5 ×1.3; q<3 → 1
applyGrade(rec,g,mode,now,session,id) → {rec,requeue:bool}
   // g: 0 quên,1 khó(q3),2 nhớ(q4),3 dễ(q5)
   // state new/relearn: g=0 → streak=0, requeue; g≥1 → streak++; g=3 hoặc streak≥2 → graduate (state review, due=now+ivl); else requeue
   // state review: g=0 → lapses++, ivl=1, ef-=0.2, state relearn, streak=0, requeue; g≥1 → ivl/ef/due cập nhật, state review
buildQueue(deck,srs,cfg,now) → [wordIds]      // due sort (now-due) desc → slice maxSession; new xen mỗi 3 thẻ
fuzzyMatch(answer,target) → {ok,near,diff}    // norm; token-wise; Levenshtein≤1 nếu len≥5 → near
```
`REQUEUE_GAP=4`: thẻ requeue chèn vào `queue.splice(min(4,queue.length),0,id)`.

## Related Code Files
- Modify: `js/srs-scheduler.js` (thay toàn bộ Leitner), `js/review-modes.js` (s1 giấu VI, s3 dùng fuzzyMatch, s4 dùng applyGrade + requeue), `js/word-import.js` (restore backup: nhận cả v1 lẫn v2), `js/app-storage.js` (K_SRS→`eng.srs.v2`, thêm `K_SRS_V1`)
- Create: `tests/srs-scheduler.test.js`

## Implementation Steps (TDD)
1. Viết `tests/srs-scheduler.test.js` (đỏ trước):
   - migrate: `{box:2,lapses:1,due:D}` → `{ivl:7,ef:2.4,state:'review',due:D}`; `{box:-1}` → `state:'new',ivl:0`.
   - sm2Ease: (2.5,5)=2.6; (2.5,3)=2.36; (1.3,0)=1.3.
   - nextInterval: reps=0 q=4 → 1; reps=1 → 3; reps=5 ivl=10 ef=2.5 q=4 → 25; q=5 → 33; q=0 → 1.
   - applyGrade new: g=2 lần 1 → requeue, state learning; g=2 lần 2 → review, due=now+1d. g=3 lần 1 → review ngay. g=0 giữa chừng → streak reset.
   - applyGrade review g=0 → relearn, ivl 1, ef −0.2, lapses+1, requeue.
   - buildQueue: 20 due (due cách nhau 1 ngày), maxSession=5 → 5 id quá hạn lâu nhất; 6 new + 9 due newPerDay=3 → new ở vị trí 3,7,11.
   - fuzzyMatch: ('recon','reckon') near; ('reckon.','reckon') ok; ('give up','Give  up') ok; ('cat','cot') không ok (len<5).
2. Cài scheduler cho tới khi xanh.
3. Migrate ở boot: nếu `eng.srs.v2` chưa có và `eng.srs.v1` có → migrateV1, save v2, **không xoá v1**.
4. Nối UI:
   - s1: contextVi ẩn, nút "Xem dịch" toggle.
   - s3: dùng `fuzzyMatch`; near → hiện "≈ Gần đúng" + tô ký tự sai (`diff`), speak đúng.
   - s4: `applyGrade` → nếu `requeue` thì chèn `cur` vào queue tại +4, toast "Gặp lại sau vài thẻ"; ngược lại step 5. Nhãn nút hiển thị `dueLabel` tính từ `nextInterval`.
   - Phần "Bậc: #n" → "Khoảng cách: N ngày · dễ: ef".
   - Backup export: `srs` v2. Restore: nếu record có `box` → migrate trước.
5. Chạy toàn bộ test; test tay bằng backup v1 thật của user (nhờ user cung cấp hoặc tự tạo 20 từ đa trạng thái).

## Success Criteria
- [x] Test scheduler xanh
- [x] Nạp backup v1 → count từ bằng nhau, không từ nào `state` undefined (qua unit test migrate, chưa có backup thật của user)
- [x] Từ mới chấm 🙂 → thấy lại sau 4 thẻ → chấm 🙂 → nút hiện "1 ngày" và không thấy lại
- [x] Gõ "recon" cho "reckon" → gần đúng, vẫn qua bước 4
- [x] Bước 1 không hiện nghĩa Việt cho đến khi bấm

## Risk Assessment
- Queue rỗng nhưng còn thẻ requeue → `render()` phải lấy từ queue trước khi kết thúc phiên (đã đúng vì requeue đẩy vào queue).
- Migrate chạy 2 lần → guard "v2 tồn tại thì bỏ qua".
- User đang giữa phiên khi deploy → session RAM mất, chỉ ảnh hưởng streak trong phiên, chấp nhận.
