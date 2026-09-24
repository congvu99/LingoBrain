---
phase: 5
title: "Release verification"
status: pending
priority: P1
dependencies: [4]
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
