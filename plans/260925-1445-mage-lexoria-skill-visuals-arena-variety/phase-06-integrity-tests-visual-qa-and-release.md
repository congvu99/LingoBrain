---
phase: 6
title: "Integrity tests visual QA and release"
status: completed
priority: P1
dependencies: [2, 3, 4, 5]
effort: "M"
---

# Phase 6: Integrity tests visual QA and release

## Overview
Khoá toàn vẹn dữ liệu bằng test, soát hình trên trình duyệt, bump version PWA, cập nhật docs.

## Requirements
- Test chạy được bằng `node tests/run-tests.js` và `tests/run-tests.html`.

## Implementation Steps
1. `tests/boss-game-skill-visuals.test.js`:
   - mọi skill id không phải basic trong `BOSS_SKILLS` có `BOSS_SKILL_VISUALS`
   - mọi `proj/cast/impact` ∈ `BOSS_SPRITES`; `motion` ∈ `BOSS_MOTIONS`
   - trong cùng hệ: không trùng (proj, motion, impact[0]); mỗi sprite ≤2 lần
   - mọi skillId có slot bị ghi đè trong `skillOverrides` của `BOSS_EVO` có `BOSS_EVO_SKILL_VISUALS`
   - mọi `BOSS_ULTIMATE_PRESETS` có ít nhất 1 trường mới (overlay/rain/motion) hợp lệ
   - mọi quái trong story có `BOSS_MONSTER_ATTACK_FX` + `BOSS_MONSTER_ARENAS` với khoá tile/anim tồn tại
2. Kiểm mọi file logic mới/sửa ≤200 dòng (`wc -l`).
3. Visual QA (agent-browser hoặc chrome): 4 vùng × mobile dọc (390×844) + desktop; chụp 30 chiêu, 5 tuyệt kỹ, 12 sân, đòn quái; ghi report `reports/`.
4. Tăng `APP_VERSION` (js/app-storage.js) + `CACHE` (sw.js); thêm TẤT CẢ ảnh + js mới vào danh sách precache của sw.js (sw.js liệt kê từng file, vd sw.js:80 — đã kiểm; quyết định: precache hết); test pwa-assets pass. <!-- Updated: Validation Session 1 - precache hết ảnh mới -->
5. Cập nhật `docs/system-architecture.md` (module mới, luồng visuals/motion/ambient, cách thêm hình cho chiêu/sân mới).

## Success Criteria
- [x] Toàn bộ test pass.
- [x] Report visual QA không còn lỗi hình nghiêm trọng.
- [x] Version khớp; docs cập nhật.

## Risk Assessment
- Test "không trùng" quá gắt khiến phải ép hình xấu: nếu cần, nới thành không trùng (proj, motion) + impact khác — ghi lý do trong test.
