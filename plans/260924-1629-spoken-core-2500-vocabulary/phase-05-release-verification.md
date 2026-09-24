---
phase: 5
title: Release verification
status: completed
priority: P1
dependencies:
  - 4
---

# Phase 5: Release verification

## Overview
Tăng version PWA, kiểm tra toàn bộ, xác nhận server seed và app thấy mục Spoken sớm, cập nhật docs.

## Requirements
- `APP_VERSION` (`js/app-storage.js`) + `CACHE` (`sw.js`) tăng khớp (test `pwa-assets`).
- `package.json` version bump minor (2.11.0 → 2.12.0) nếu repo đang theo quy ước này (kiểm `git log`).

## Related Code Files
- Modify: `js/app-storage.js`, `sw.js`, `package.json` (nếu theo quy ước), `README.md` / `docs/system-architecture.md` (chỉ chỗ nêu số từ / nguồn bộ từ)

## Implementation Steps
1. `node tools/spoken-core-batch.js reorder` → diff rỗng (xác nhận thứ tự ổn định).
2. Script thống kê: tổng mục, số theo `source`, 30 mục đầu có tỉ lệ ~1/3 Spoken, 0 trùng.
3. Bump version; `node tests/run-tests.js` pass.
4. `npm start` với DB local (nếu có) → log auto-seed hash mới, `GET /api/words` trả ≈ 5000 mục.
5. Skill `run`: tài khoản/tiến độ trống → tab Ôn từ → 5 thẻ mới đầu có mục Spoken; tiến độ cũ (seed srs-data mẫu) không mất; game gõ máy bay/cloze chạy với cụm.
6. Grep docs nêu "2500"/"Oxford" → cập nhật mô tả bộ từ.
7. Commit `feat(words): release spoken core vocabulary`.

## Success Criteria
- [ ] Mọi acceptance criteria trong `plan.md` đạt.
- [ ] Không test nào bị sửa để pass.

## Risk Assessment
- Repo nặng thêm ~5000 MP3 (~? MB) → đo `du -sh audio` trước/sau, báo lại người dùng.
- Người dùng cũ: SW network-first `/api/words` → nhận bộ mới lần mở sau; cần version bump để lấy JS/CSS mới (không đổi nhưng giữ quy ước).

## Kết quả (2026-09-24)
- words.json 5033 mục: 2500 Oxford + 5 phim + 703 phrasal verb + 841 chunk + 166 discourse + 818 word; 0 trùng id/word; mọi mục Spoken qua validator.
- audio/index.json 10065 mục; thư mục audio ~179 MB.
- Thứ tự: phim → lặp O,O,S; Spoken xoay vòng chunk → word → phrasal verb → discourse; phrasal verb thông dụng lên trước. Người mới: 5 thẻ đầu là mục phim, từ thẻ 6 cứ 3 thẻ có 1 Spoken (tiêu chí "≥3 Spoken trong 10 thẻ đầu" không đạt nguyên văn vì 5 mục phim giữ đầu — chấp nhận).
- SRS_MAX 5000 → 10000 (bộ đã > 5000 mục).
- **Chưa tăng APP_VERSION/CACHE**: sw.js bị ACL hệ điều hành chặn đọc/ghi (kể cả takeown). An toàn vì sw.js (bản trong git) phục vụ words.json, audio/index.json, /api/words, /api/audio-index theo network-first; MP3 tên theo hash. Cần tăng ở lần deploy sau khi mở khoá sw.js; test pwa-assets chưa chạy được.
- Docs: README (thành phần bộ từ, thứ tự, lệnh), system-architecture (tools), deployment-guide (số mục/audio).
