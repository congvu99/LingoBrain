---
phase: 6
title: "Tích hợp: sync/backup, bảng người dùng hợp đồng, PWA, docs, cân bằng, FPS iPhone"
status: in-progress
priority: P1
dependencies: [3, 5]
---

# Phase 6: Tích hợp, đồng bộ, phát hành

## Overview
Nối đồng bộ đa máy + backup cho `bossProg`, rà đủ mọi nơi dùng các hợp đồng bị đổi, bump PWA, cập nhật docs, cân bằng số và đo hiệu năng trên iPhone thật. (Chip, `bossProg`, `K_BOSS` đã có từ phase 2.)

## Requirements
- Functional:
  - **Đồng bộ** (`cloud-sync-engine.js`): `localPayload` thêm `boss: bossProg`; `applySyncPayload`: `bossProg = f.boss` **trừ** `day` — nếu `f.boss.day && f.boss.day.date > dkey()` thì giữ `day` local (giống guard `day` hiện có, `cloud-sync-engine.js:85-86`), rồi `save(K_BOSS, bossProg)`; `resetLocalToDefaults` (`:61-73`, nhánh "dùng dữ liệu tài khoản") → `bossProg = emptyBoss()`.
  - **Nút "Xoá tiến độ"** (`app-shell.js:57-66`) **không** đụng `bossProg` (user chốt; giống kỷ lục game).
  - **`switchOwner(replace=false)`** (`cloud-sync-engine.js:56-59`) mang `boss` sang tài khoản mới như SRS — hành vi chủ ý, ghi vào docs.
  - **Backup**: `app-shell.js:49` xuất thêm `boss: bossProg`. `word-import.js` khôi phục: `bossProg = mergeBoss(bossProg, cleanBoss(j.boss, Date.now()))` ở **cả hai** nhánh đăng nhập/không (user chốt: gộp, không thay); backup cũ không có `boss` → giữ nguyên. Sửa câu xác nhận `word-import.js:31` nói rõ "tiến trình Pháp sư được gộp, không bị thay".
  - Rollback: chỉ gỡ `'boss'` khỏi `GAME_IDS` + hạ version; **không** gỡ `boss` khỏi `sync-merge.js`.
- Non-functional: `APP_VERSION` + `CACHE` = `2.14.0`; mọi file mới trong `ASSETS` (`sw.js`, test `pwa-assets`); test xanh; FPS ≥ 45 ở `quality = 1` trên iPhone khi Đại chú + tuyệt kỹ.

## Bảng người dùng hợp đồng (phải sửa/kiểm hết)

| Hợp đồng | Nơi dùng | Việc |
|---|---|---|
| `mergeSync` / `sanitizePayload` | `server/auth-and-sync-routes.js:5,99`; `cloud-sync-engine.js:127` | Phase 1 thêm `boss` (tổng, không ném); server không sửa code |
| `toPayload` / `localPayload` | `cloud-sync-engine.js:76,120,127` | thêm `boss` |
| `fromPayload` / `applySyncPayload` | `cloud-sync-engine.js:77-91` | áp `boss` + guard ngày tương lai |
| `resetLocalToDefaults` | `cloud-sync-engine.js:61-73` | `bossProg = emptyBoss()` |
| `switchOwner` | `cloud-sync-engine.js:56-59` | không sửa; ghi docs |
| `SYNC_KEYS` / `isSyncedKey` | `sync-merge.js:7`; `cloud-sync-engine.js:35` | phase 1 thêm key |
| Xoá tiến độ | `app-shell.js:57-66`; `cloud-sync-engine.js:48` | không sửa (giữ `bossProg`) |
| Backup xuất / khôi phục | `app-shell.js:49`; `word-import.js:27-42` | thêm `boss`, khôi phục = gộp |
| `refreshAfterSync` | `cloud-sync-account-ui.js:113-124` | phase 5 → `refreshBossHub` |
| `GAME_IDS`/`GAME_LABEL`/`gameAvailability` | `word-games.js:5-6,46-53`; `word-game-ui.js:24,30,55,118,139`; `tests/word-games.test.js:54-72` | phase 2 |
| `gameChipsHtml`/`gameBestKey` | `word-game-ui.js:19-33` | phase 2 nhánh `'boss'` |
| `startGame` / `endGame` | `word-game-ui.js:63-71,123-151` | phase 2 nhánh riêng, không qua `endGame` |
| `pickGameWords` | `word-games.js:56`; `word-game-rounds.js:55`; `fruit-game-ui.js:24`; `word-game-ui.js:65` | phase 1 `weightFn` mặc định giữ nguyên |
| Esc global | `app-shell.js:67-75` | phase 2 (hub); trong trận do input xử lý |
| Stub test cloud-sync | `tests/cloud-sync-engine.test.js:9-20` | thêm `G.bossProg = emptyBoss()` (và nạp file merge) |
| `ASSETS` | `sw.js:5+`; `tests/pwa-assets.test.js:12-16` | mọi file mới |

## Thứ tự script đầy đủ (index.html)
Giữ nguyên vị trí mọi script cũ; chỉ chèn:
1. `js/boss-progress-sync-merge.js` **ngay trước** `js/sync-merge.js` (đang ở `index.html:145`, trước `app-storage.js:146`).
2. `js/game-particles.js` và `js/game-viewport-fit.js` **trước** `js/plane-game-effects.js` / `js/plane-game-ui.js`.
3. Sau các script game hiện có (sau `plane-game-text.js`, `word-games.js`, `word-game-ui.js`): `boss-game-spell-math.js` → `boss-game-elements.js` → `boss-game-logic.js` → `boss-game-progress.js` → `boss-game-story.js` → `boss-game-spell-presets.js` → `boss-game-spell-art.js` → `boss-game-mage-art.js` → `boss-game-monster-shapes.js` → `boss-game-monster-art.js` → `boss-game-scene.js` → `boss-game-render.js` → `boss-game-ui.js` → `boss-game-hub-ui.js` → `boss-game-skill-tree-ui.js` → `boss-game-result-ui.js`.

`sw.js` `ASSETS` thêm đủ 19 file trên (merge + 2 dùng chung + 16 boss). `PURE_MODULES` và `run-tests.html` theo phase 1 bước 8 (+ `game-particles.js`).

Tương thích phiên bản: server và web tĩnh chạy cùng một tiến trình Node → deploy đồng thời. Client 2.13.x vẫn gửi payload không `boss` → server giữ `boss` (test phase 1).

## Related Code Files
- Modify: `js/cloud-sync-engine.js`, `js/app-shell.js`, `js/word-import.js`, `js/app-storage.js` (`APP_VERSION`), `index.html`, `sw.js`, `tests/cloud-sync-engine.test.js`, `README.md`, `docs/system-architecture.md`
- Tuỳ theo nội dung: `docs/design-guidelines.md` (tông fantasy của khung game)

## Implementation Steps
1. Sync: `localPayload`/`applySyncPayload` (guard ngày)/`resetLocalToDefaults`; test `cloud-sync-engine.test.js` (stub `bossProg`; vòng push/pull giữ `boss`; `day` tương lai không đè local; reset → `emptyBoss`).
2. Backup xuất/khôi phục gộp + test khôi phục backup rác → `bossProg` hợp lệ, backup XP thấp hơn không làm tụt cấp.
3. `index.html` theo thứ tự trên; `sw.js` `ASSETS`; bump `2.14.0` hai nơi.
4. Cân bằng trên iPhone: quái thường ~2–3 phút, trùm chương ~4–5 phút ở cấp Vừa; chỉ sửa `BOSS_TUNING`, cập nhật test biên nếu đổi số.
5. Đo FPS bằng `?fps` (ghi kèm `quality`); chỉnh trần hạt/preset.
6. Docs: README mục **Pháp Sư Lexoria** (luật, bậc chiêu tương đối, chậm thời gian, cây nguyên tố, 1 trận truyện/ngày, buff Ôn từ, ranh giới SM-2, khôi phục = gộp, Xoá tiến độ không xoá Pháp sư); `docs/system-architecture.md` (module mới + 2 module dùng chung, `eng.boss.v1`, payload thêm `boss`, luật gộp từng trường, **hợp đồng chỉ tiến / rollback chỉ client**).
7. `node tests/run-tests.js` + `tests/run-tests.html` xanh; smoke test 2 máy (laptop + iPhone) cùng tài khoản.

## Success Criteria
- [ ] Đánh dở trên laptop → mở iPhone cùng tài khoản: HP quái, XP, cấp, cây, trường phái đúng.
- [ ] Backup → khôi phục máy khác (đăng nhập hay không): tiến trình Pháp sư gộp, không tụt.
- [ ] Nút Xoá tiến độ không đổi cấp/cây/truyện Pháp sư.
- [ ] Test `pwa-assets` + toàn bộ test xanh; `2.14.0` khớp.
- [ ] `?fps` ≥ 45 ở `quality = 1` trên iPhone thật; trận Vừa đúng khoảng thời gian mục tiêu.
- [ ] README + system-architecture khớp hành vi (gồm luật rollback).

## Risk Assessment
- Rollback sai cách (gỡ `boss` khỏi `sync-merge.js`) xoá dữ liệu mọi tài khoản → ghi rõ trong docs + chú thích đầu `boss-progress-sync-merge.js`.
- Khôi phục backup cũ → luôn gộp, không thay.
- Rollback đúng: hạ `APP_VERSION`, gỡ `'boss'` khỏi `GAME_IDS`; `boss` vẫn đi qua sync vô hại.

## Ghi chú triển khai (2026-09-24)
- Xong: sync/backup/refreshAfterSync + test; README + system-architecture; 2.14.0; cân bằng tạm hp 1000/2000, xpPerDmg 0.1; review tích hợp (dup-win, quái theo ngày, hp.boss) đã sửa.
- Còn (cần user/máy thật): FPS iPhone với `?fps`; smoke 2 máy cùng tài khoản; chỉnh cân bằng sau chơi thử; bố cục khung thấp cắt chân pháp sư/quái; reduced-motion cho loé tuyệt kỹ + lốc; quái lao tới khi ra đòn / tan hạt khi chết (P4 bước duyệt).
