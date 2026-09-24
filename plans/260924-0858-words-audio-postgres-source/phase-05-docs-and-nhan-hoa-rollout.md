---
phase: 5
title: "Docs + chạy trên Nhân Hòa + kiểm tra"
status: in-progress
priority: P2
dependencies: [2, 4]
---

# Phase 5: docs + rollout Nhân Hòa

## Overview
Cập nhật tài liệu, deploy, xác nhận bảng + dữ liệu + tài khoản chủ trên DB thật. Người dùng xác nhận DB production **trống hoàn toàn** → không cần reset.

## Điều kiện trước (bắt buộc)
- Đổi mật khẩu DB `sa` trên Nhân Hòa (mật khẩu cũ từng lộ qua chat) → cập nhật `DATABASE_URL` trong Environment (RT#14).
- Log hiện tại có `schema ready` (kết nối DB ổn).

## Requirements
- `docs/deployment-guide.md`:
  - Bước "Nạp dữ liệu": tự seed theo hash khi deploy; log mong đợi; `AUTO_SEED`.
  - Tạo tài khoản chủ bằng CLI (không `--reset`); các cờ và ý nghĩa; cảnh báo `--reset --yes --drop-users` chỉ cho dev, phải dừng app + `pg_dump` trước.
  - Quy trình sửa từ: sửa `words.json` (+ tạo audio) → commit → deploy → server tự cập nhật. Không chạy CLI bằng file local nhắm vào production.
  - Lệnh kiểm tra SQL + HTTP (dưới). Khắc phục sự cố: `ShrinkError`, `owner exists`, 503 "Bộ từ chưa được nạp".
  - Xoá đoạn debug tham chiếu `getClientIp` không tồn tại (dòng ~146) (RT#15).
- `docs/system-architecture.md`: 3 bảng mới, 2 route, hash/ETag, luồng client API → fallback, quy tắc prune chỉ khi nguồn API.
- `README.md`: đoạn ngắn "bộ từ đọc từ DB, `words.json` là nguồn biên tập + seed + fallback".

## Implementation Steps
1. Sửa docs (đọc bản hiện tại trước).
2. Commit + push → Nhân Hòa deploy. Log cần thấy: `listening on :3000` → `schema ready` → `deck seeded: 2505 words, 5009 audio (+2505 ~0 -0)`. Restart → `deck up to date`.
3. Tài khoản chủ — console resource Nhân Hòa (**không `--reset`**):
   ```bash
   export ADMIN_USERNAME=<tên>
   read -s ADMIN_PASSWORD && export ADMIN_PASSWORD
   node tools/seed-database.js --skip-deck
   unset ADMIN_PASSWORD
   ```
   Không có console → đăng ký tài khoản chủ qua app như user thường (không đặt `ADMIN_PASSWORD` vào Environment).
4. Kiểm tra SQL (psql/pgAdmin Nhân Hòa):
   ```sql
   SHOW server_encoding;                                  -- UTF8
   SELECT count(*) FROM words;                            -- = số từ trong words.json (2505)
   SELECT count(*) FROM audio_clips;                      -- = số mục audio/index.json (5009)
   SELECT content_hash, seeded_at FROM deck_meta;
   SELECT username, created_at FROM users;                -- có tài khoản chủ
   SELECT id, word, emoji, context_vi FROM words ORDER BY sort_order LIMIT 3;  -- tiếng Việt + emoji đúng
   ```
5. HTTP (RT#10):
   ```bash
   curl -s -D - -o /dev/null https://<domain>/api/words          # 200 + ETag
   curl -s -D - -o /dev/null -H 'If-None-Match: <etag>' https://<domain>/api/words   # 304
   curl -s https://<domain>/api/words | head -c 300
   curl -s -D - -o /dev/null -H 'Accept-Encoding: gzip' https://<domain>/api/words | grep -i content-encoding
   ```
   Không có gzip → ghi roadmap, không làm trong plan này.
6. App: đăng nhập tài khoản chủ; iPhone: toast bản mới → tải lại → học bình thường; bật chế độ máy bay → vẫn chạy.

## Success Criteria
- [ ] Toàn bộ Acceptance trong `plan.md` đạt trên production.
- [ ] Docs khớp hành vi thật (lệnh, env, log, cờ).

## Risk Assessment
- Rollback: trỏ lại bản trước → client 404 `/api/words` → dùng `words.json`, không prune. Bảng mới thừa vô hại.
- Tách role PG quyền thấp cho web (khỏi `sa`) — ngoài phạm vi, xem câu hỏi mở trong `plan.md`.
