---
phase: 3
title: Integration docs and PWA
status: completed
priority: P2
dependencies:
  - 1
  - 2
---

# Phase 3: Integration docs and PWA

## Overview
Nối màn nhập vai vào tab Hôm nay + thói quen `t6`, tự tích `t6` khi xong, cho `act: 'talk'` đi qua đồng bộ, cập nhật PWA version và docs.

## Requirements
- **Sync**: `cleanPlan` (`js/sync-merge.js:143`) chỉ giữ `act ∈ {add, rec, play}` → thêm `'talk'`, kèm test. Server phải deploy cùng/ trước client (server cũ sẽ xoá `talk`).
- **t6 người dùng cũ**: **không** ghi đè giáo án đã lưu (lưu lúc nạp sẽ bị bản đồng bộ đè lại, `js/daily-plan.js:13` chạy trước `cloud-sync-engine.js`). Lúc vẽ (`renderPlan`): `act === 'talk' || (t.id === 't6' && t.act === 'add')` → nút "💬 Hội thoại" mở `openDialogue()`. Mặc định giáo án mới: `t6.act = 'talk'`.
- **Nút ở tab Hôm nay** (`js/home-today-screen.js`): hiện "💬 Luyện hội thoại hôm nay" khi `dialogueEnabled()` và `gradesBetween(srs, today(), today() + DAY).count ≥ 1` — ở **cả** thẻ đang ôn dở lẫn thẻ đã xong ("Xong rồi"). Ghép chung HTML với gợi ý game trong `#homeExtra` (một lần gán), không gán `innerHTML` đè nhau.
- **Hoàn thành** → `rollDay()` rồi `markPlanDone('t6')`: chỉ đặt (không đảo), đã tích thì thôi; người dùng vẫn bỏ tích tay được. Giữ `save(K_DAY, …)` như `togglePlan` để `day` đồng bộ.

## Related Code Files
- Modify: `js/sync-merge.js` (allowlist `talk`), `tests/sync-merge.test.js` (hoặc file test sync hiện có — `talk` sống qua `sanitizePayload` + `mergeSync`), `js/daily-plan.js` (`markPlanDone`, nút `talk`, default t6), `js/home-today-screen.js`, `sw.js` (precache 3 file JS mới, `CACHE` → `lingobrain-v2.26.0`), `js/app-storage.js` (`APP_VERSION` 2.26.0), `package.json` (2.26.0), `README.md`, `docs/system-architecture.md`, `docs/deployment-guide.md`
- Tests: `tests/pwa-assets.test.js` phải xanh (mọi script trong `index.html` có trong `sw.js` ASSETS; version khớp)

## Implementation Steps
1. `sync-merge.js`: thêm `'talk'`; test giáo án có `act:'talk'` đi qua `sanitizePayload` + `mergeSync` vẫn còn.
2. `daily-plan.js`: `markPlanDone(id)`; default t6 `talk`; `renderPlan` hiện nút `data-act="talk"` theo điều kiện trên (ẩn nếu `dialogueEnabled()` false — fallback "Vào ôn từ →" như cũ).
3. `daily-dialogue-roleplay-ui.js`: `onDialogueDone` → `rollDay()`, `markPlanDone('t6')`, vẽ lại tab Hôm nay.
4. `home-today-screen.js`: nút theo điều kiện, ghép với gợi ý game.
5. `sw.js`, `app-storage.js`, `package.json`: thêm file + tăng version.
6. Docs:
   - README: đổi "không server, không AI" → "AI tuỳ chọn (Gemini) chỉ cho hội thoại nhập vai; cần đăng nhập + mạng lần tạo đầu; phần còn lại vẫn offline". Mô tả tính năng ở mục Tab Hôm nay + Thói quen t6. Ghi chú quyền riêng tư: chỉ danh sách từ vựng được gửi tới Google.
   - `system-architecture.md`: `GET/POST /api/dialogue` (contract + thứ tự lỗi), bảng `dialogues`, khoá `eng.dialogue.v1` (không sync, gắn user), module mới, `act: 'talk'`, giả định 1 process.
   - `deployment-guide.md`: `GEMINI_API_KEY`, `GEMINI_MODEL`, `DIALOGUE_DAILY_MAX` (mặc định 50); **liên hệ với `TTS_DAILY_MAX`**: mỗi đoạn ~12 câu, nghe hết ≈ 12 lần tạo TTS → `TTS_DAILY_MAX` nên ≥ 12 × `DIALOGUE_DAILY_MAX` + nhu cầu câu tự gõ; không đặt key → tính năng tắt; thứ tự deploy server trước.
7. `node tests/run-tests.js`; thử end-to-end trên localhost với key thật.

## Success Criteria
- [ ] Từ tab Hôm nay (đang ôn dở hoặc đã xong) và từ t6 đều mở được màn nhập vai
- [ ] Sau đồng bộ, t6 vẫn còn nút "💬 Hội thoại" (cả máy thứ 2)
- [ ] Xong hội thoại → t6 tích trong đúng ngày, chuỗi ngày đúng
- [ ] `pwa-assets` + sync-merge test xanh; bản mới tự cập nhật trên PWA đã cài
- [ ] Docs khớp code (route, env, khoá storage, liên hệ TTS)

## Risk Assessment
- Client mới + server cũ: `talk` bị server cũ xoá → deploy server trước; render-time fallback vẫn hiện nút cho t6 `add`.
- Quên tăng version → PWA giữ JS cũ; `pwa-assets` bắt.
- Rollback code server: client 2.26 nhận 404 → coi là tắt, ẩn nút (phase 2).
