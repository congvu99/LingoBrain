---
title: "LingoBrain — Đăng nhập username/mật khẩu + đồng bộ tiến độ đa thiết bị"
status: in-progress
created: 2026-09-23
mode: tdd
source: plans/reports/brainstorm-260923-1729-account-login-cloud-sync-report.md
blockedBy: []
blocks: []
---

# Đăng nhập + đồng bộ tiến độ

Node server nhỏ (`node:http`, dep duy nhất `pg`) phục vụ web tĩnh + `/api/*` cùng domain trên Nhân Hòa; PostgreSQL managed. `localStorage` vẫn là nguồn chính, offline-first, đăng nhập **không bắt buộc**. Sync tự động; gộp **theo từng trường của từng từ** bằng hàm thuần dùng chung client ↔ server; xoá/khôi phục lan sang máy khác nhờ `srsEpoch`.

## Ràng buộc chung

- Frontend: vanilla JS, classic `<script>` global, không build, file < 200 dòng.
- Module thuần: không đụng DOM/localStorage top-level, có `module.exports` → test `node tests/run-tests.js` (+ nạp trong `tests/run-tests.html`).
- **TDD:** mỗi phase viết test trước (đỏ) → code (xanh) → refactor. Không nới test để qua.
- Thêm file frontend → `<script>` trong `index.html` + `ASSETS` trong `sw.js`; bump `APP_VERSION` = `CACHE` (test `pwa-assets`).
- Không đổi thuật toán SM-2. Record `eng.srs.v2` chỉ **thêm** trường tuỳ chọn `mt` (thời điểm sửa gần nhất).
- Không lưu mật khẩu/token thô trong DB; không commit `DATABASE_URL`.
- **Origin production giữ nguyên** (scheme + host) khi chuyển sang Node — `localStorage` gắn theo origin.

## Hợp đồng dữ liệu sync (nguồn duy nhất — phase khác chỉ tham chiếu)

```js
// payload v1 — client gửi, server lưu JSONB, server trả cùng dạng
{ v: 1,
  srsEpoch: 0,                            // mốc xoá/khôi phục gần nhất; gộp = max
  srs: { [id]: SrsRec },                  // SrsRec như eng.srs.v2 + mt; hist gửi tối đa 20 mục gần nhất
  cfg:  { data: {newPerDay, maxSession}, ts },
  plan: { data: [task...], ts },
  day:  { data: {date, done, streak, history, caption}, ts },
  gameScore: { [gameId]: {best, plays} } }
// PUT /api/sync body: { data: payload } → 200 { data: merged, updatedAt }
```

**Quy tắc gộp `mergeSync(a, b)`** (giao hoán, idempotent, kết hợp):
| Phần | Quy tắc |
|---|---|
| `srsEpoch` | max |
| `srs[id]` | bỏ record có `max(last, mt) < srsEpoch`. Còn lại gộp **theo trường**: trường lịch (`ef ivl due state reps lapses last lastMode`) lấy từ bản "thắng" (`last` lớn hơn → `reps` → stringify trường lịch); `sentences` = hợp, bỏ trùng, câu của bản thua trước, bản thắng sau, giữ 5 cuối; `hist` = hợp theo khoá `t+g+mode`, sort `t`, giữ `histMax` cuối; `mt` = max |
| `cfg`, `plan` | `ts` lớn hơn thắng nguyên khối (hoà → stringify) |
| `day` | `date` mới hơn thắng; cùng ngày → `ts` lớn hơn; `day.data.history` = max theo từng ngày; ngày > hôm nay+2 bị loại |
| `gameScore[g]` | `best` max, `plays` max |

Meta local: `eng.auth.v1 = {token, username}`; `eng.syncmeta.v1 = {cfgTs, planTs, dayTs, srsEpoch, owner, syncedAt}`.
Không sync: `eng.gamemiss.v1`, ghi âm IndexedDB.

## Phases

| # | Phase | File | Depends | Status |
|---|---|---|---|---|
| 1 | Hàm thuần: gộp, sanitize, payload + test | [phase-01-pure-sync-merge-module.md](phase-01-pure-sync-merge-module.md) | — | completed |
| 2 | Node server: static an toàn, DB, auth, sync API | [phase-02-node-server-auth-sync-api.md](phase-02-node-server-auth-sync-api.md) | 1 | completed |
| 3 | Client: UI tài khoản, auto sync, xoá/khôi phục, SW | [phase-03-client-account-ui-and-auto-sync.md](phase-03-client-account-ui-and-auto-sync.md) | 1, 2 | completed |
| 4 | Deploy Nhân Hòa, smoke test, rollback, docs | [phase-04-deploy-smoke-test-docs.md](phase-04-deploy-smoke-test-docs.md) | 3 | pending |

## Acceptance (toàn plan)

- [ ] Đăng ký username đã có (khác hoa/thường) → 409 "Tên đã có người dùng"
- [ ] Máy A học 5 từ → máy B đăng nhập cùng TK thấy 5 từ đó đúng lịch
- [ ] A, B cùng ôn offline (kể cả cùng một từ) → có mạng → cả hai hội tụ, không mất lượt ôn, không mất câu bước 5
- [ ] Không đăng nhập: app chạy y như v2.8.x, không gọi `/api/*`; mất mạng: không lỗi, không chặn học
- [ ] Lần đầu đăng nhập máy đã có tiến độ (chưa từng thuộc TK nào) → gộp, không mất
- [ ] Máy có dữ liệu của TK X, đăng nhập TK Y → hỏi trước, mặc định dùng dữ liệu TK Y
- [ ] "Xoá tiến độ" hoặc "Khôi phục backup" khi đang đăng nhập → máy khác cũng nhận (không bị kéo dữ liệu cũ về), kể cả khi thao tác lúc offline
- [ ] Bỏ tích / "Đặt lại" việc hôm nay trên máy A → máy B cũng bỏ tích
- [ ] DB sập hoặc `DATABASE_URL` sai → web tĩnh vẫn 200, API 503
- [ ] `node tests/run-tests.js` xanh; không truy cập được `server/`, `package.json`, `.git`, `plans/`, `tools/`, `tests/`

## Lưu ý thứ tự

Plan `260923-1616-plane-typing-shooter-game` (in-progress, chờ test iPhone) cũng bump `APP_VERSION`/`CACHE`. Làm plan này sau khi plan đó commit, rồi bump tiếp từ version mới nhất.

## Red Team Review

### Session — 2026-09-23
**Findings:** 17 (15 accepted, 2 rejected) · gộp từ 28 phát hiện của 3 reviewer (Security Adversary, Assumption Destroyer, Failure Mode Analyst)
**Severity breakdown:** 2 Critical, 7 High, 6 Medium (accepted) + 2 Medium (rejected)

| # | Finding | Severity | Disposition | Applied To |
|---|---|---|---|---|
| 1 | Xoá tiến độ / khôi phục backup bị máy khác kéo dữ liệu cũ về (không tombstone; cờ `resetSrs` mất khi request lỗi) | Critical | Accept → `srsEpoch` + `mt`, bỏ `resetSrs` | Hợp đồng, P1, P2, P3 |
| 2 | Câu bước 5 không bump `last` → hoà → bản không có câu thắng | Critical | Accept → gộp theo trường, `sentences`/`hist` hợp | Hợp đồng, P1, P3 |
| 3 | `day` gộp hợp `done` → bỏ tích/Đặt lại bị hồi; streak max sai | High | Accept → `day` LWW theo `ts`, chỉ `history` max | Hợp đồng, P1, P3 |
| 4 | Payload > 5MB với tài khoản lâu năm; 413/4xx không xử lý; keepalive gần như không chạy | High | Accept → hist sync ≤ 20, body 10MB, debounce 10s, xử lý mọi non-2xx, bỏ keepalive | P1, P2, P3 |
| 5 | XFF giả → bypass rate limit; scrypt thành vector DoS | High | Accept → XFF phải-nhất theo số hop, đếm mọi request auth, cap Map, semaphore scrypt, đếm sai theo username | P2 |
| 6 | DB sập / `GET /%` / pool error làm chết cả web tĩnh | High | Accept → listen trước, schema retry nền, bắt lỗi toàn cục | P2, P4 |
| 7 | Gán `cfg` (const) → TypeError, cờ `applying` kẹt | High | Accept → `Object.assign`, try/finally, làm mới UI | P3 |
| 8 | Đăng xuất giữ dữ liệu → TK khác đăng nhập hút dữ liệu người trước | High | Accept → `owner` trong syncmeta + hỏi khi khác người | P3 |
| 9 | Cutover đổi origin mất localStorage; rollback → `/api` trả 404/HTML | High | Accept → giữ origin, non-JSON = sync không khả dụng, ghi rollback | P3, P4 |
| 10 | Sync lần đầu 2 máy: `FOR UPDATE` không khoá khi chưa có dòng | Medium | Accept → tạo dòng progress lúc đăng ký + `ON CONFLICT DO NOTHING` trước SELECT | P2 |
| 11 | Payload không validate (`last:1e308`, `__proto__`); `taskId` từ sync chèn HTML không escape | Medium | Accept → `sanitizePayload` + `esc()` trong daily-plan | P1, P2, P3 |
| 12 | Thiếu security header; test traversal thiếu `%5c`/`%00`/mã hoá hỏng; whitelist ảnh gốc là pattern | Medium | Accept → danh sách tên rõ ràng, header + CSP, thêm ca test | P2 |
| 13 | Token không hết hạn | Medium | Accept (một phần) → hết hạn trượt 180 ngày; không làm "đăng xuất mọi thiết bị" | P2 |
| 14 | Guard `return` top-level trong test = SyntaxError; `run-tests.html` không nạp test mới | Medium | Accept → guard trong `describe`, sửa `run-tests.html` | P1, P2 |
| 15 | Dựng lại queue sau sync làm mất `gameMiss`; `pruneSrs` khi apply gây dao động giữa máy khác `words.json` | Medium | Accept → không prune khi apply, giữ id gameMiss khi dựng lại | P3 |
| 16 | Mật khẩu ≥6 yếu; 409 lộ username | Medium | **Reject** — min 6 là quyết định người dùng; báo trùng là yêu cầu gốc; bộ đếm sai theo username (#5) giảm rủi ro dò | — |
| 17 | Nút "đăng xuất mọi thiết bị" | Medium | **Reject** — YAGNI cho app cá nhân; #13 đủ | — |

### Whole-Plan Consistency Sweep
- Delta: bỏ `resetSrs` (thay `srsEpoch`); srs gộp theo trường thay vì cả record; `day` có `ts`; body 5MB → 10MB; debounce 3s → 10s; bỏ keepalive; thêm `mt`, `owner`, `sanitizePayload`, `toPayload/fromPayload/isSyncedKey`; thêm file `js/review-steps-learn.js`, `js/word-import.js`, `js/daily-plan.js`, `js/srs-scheduler.js`, `tests/run-tests.html`.
- Đã rà `plan.md` + 4 phase: không còn `resetSrs`, "backup khôi phục thắng nhờ ts", "keepalive", "5MB", "debounce 3s", "x-forwarded-for đầu tiên", guard `return` top-level. Hợp đồng dữ liệu chỉ định nghĩa ở `plan.md`.
- Mâu thuẫn còn lại: 0. Brainstorm report giữ bản gốc (lịch sử quyết định), plan này là nguồn đúng.
