---
phase: 5
title: "PWA offline"
status: completed
priority: P3
dependencies: [0]
---

# Phase 5: PWA offline

## Overview
Thêm `manifest.json` + `sw.js` để cài lên màn hình chính và chạy không mạng; có toast khi có bản mới.

## Requirements
- Functional: Lighthouse "Installable"; tắt mạng reload vẫn chạy; deploy bản mới → toast "Có bản mới, tải lại" → bấm là cập nhật.
- Non-functional: chỉ đăng ký SW trên `https:` hoặc `localhost`; `file://` không lỗi.

## Architecture
- `manifest.json`: name "LingoBrain", short_name, start_url `./`, display `standalone`, theme/background theo CSS hiện có, icons 192/512 = SVG data-URI emoji 🧠 (`image/svg+xml`, `purpose any`).
- `sw.js`: `CACHE='lingobrain-v{N}'`; `ASSETS=['./','./index.html','./words.json','./manifest.json', ...js/*]`; install → `cache.addAll`; activate → xoá cache khác tên; fetch → cache-first, network fallback, ghi cache lại. `self.skipWaiting()` khi nhận message `SKIP_WAITING`.
- `index.html`: `<link rel="manifest">`, meta theme-color, apple-touch-icon; `js/pwa-register.js`: đăng ký SW, `updatefound` → toast có nút "Tải lại" → postMessage SKIP_WAITING → `controllerchange` → `location.reload()`.
- Danh sách `ASSETS` phải khớp file thật: thêm `tests/pwa-assets.test.js` đọc `sw.js` và kiểm tra mỗi asset tồn tại trên đĩa (Node `fs`).

## Related Code Files
- Create: `manifest.json`, `sw.js`, `js/pwa-register.js`, `tests/pwa-assets.test.js`
- Modify: `index.html` (head + script), `README.md` (mục "Cài như app", lưu ý bump `CACHE` khi deploy)

## Implementation Steps (TDD)
1. Test asset list (đỏ): parse `ASSETS` từ `sw.js`, mọi đường dẫn tồn tại; mọi `<script src>` trong index.html nằm trong ASSETS.
2. Viết `sw.js`, `manifest.json`, `pwa-register.js` → xanh.
3. Chạy `npx serve .` → Chrome DevTools Application: manifest OK, SW active; Network offline → reload chạy.
4. Đổi `CACHE` version → reload → toast hiện → bấm → bản mới.

## Success Criteria
- [x] Test asset xanh
- [ ] Lighthouse PWA installable (chưa đo)
- [ ] Offline reload chạy đủ 3 tab (chưa thử tay)
- [ ] `file://` mở không lỗi console (chưa thử)

## Risk Assessment
- Quên bump `CACHE` → user kẹt bản cũ: README nhắc; cân nhắc lấy version từ hằng `APP_VERSION` trong `app-storage.js` và test so khớp.
- iOS Safari không tự hiện prompt cài: hướng dẫn "Chia sẻ → Thêm vào MH chính" trong README.
