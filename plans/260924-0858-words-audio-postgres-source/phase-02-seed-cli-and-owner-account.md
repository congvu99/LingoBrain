---
phase: 2
title: "CLI tools/seed-database.js + tài khoản chủ"
status: completed
priority: P1
dependencies: [1]
---

# Phase 2: seed CLI + owner account

## Overview
Script chạy tay (console Nhân Hòa hoặc local dev): tạo schema, seed bộ từ (bỏ qua hash — luôn chạy), tạo tài khoản chủ từ env, reset có rào chắn. Không bắt buộc cho bộ từ (server tự seed), chủ yếu để tạo tài khoản chủ.

## Requirements
- Dùng: `node tools/seed-database.js [--reset --yes [--drop-users]] [--allow-shrink] [--reset-owner-password] [--skip-deck]`
  - Env: `DATABASE_URL` (bắt buộc), `PGSSL`, `PGSSLROOTCERT`, `ADMIN_USERNAME` + `ADMIN_PASSWORD` (cả hai hoặc không).
- `parseArgs(argv, env)` thuần → `{reset, dropUsers, allowShrink, resetOwnerPassword, skipDeck, admin|null}` hoặc lỗi rõ:
  - `--reset` thiếu `--yes`; `--drop-users` không kèm `--reset`; cờ lạ; chỉ có 1 biến admin; `--reset-owner-password` không có admin.
  - username/password qua `validateUsername`/`validatePassword` sẵn có.
- **Băm mật khẩu trước BEGIN** (scrypt không nằm trong tx, RT#13).
- Transaction, thứ tự:
  1. `pg_advisory_xact_lock(SEED_LOCK_ID)` — **đầu tiên** (RT#13).
  2. `--reset` (RT#1): `SELECT count(*) FROM users` > 0 và thiếu `--drop-users` → ném "Đã có N tài khoản — dừng. Thêm --drop-users nếu thật sự muốn xoá (hãy pg_dump trước)". Qua → in số dòng sẽ mất (users/progress/words) rồi `DROP TABLE IF EXISTS … CASCADE`.
  3. `schema.sql`.
  4. `!skipDeck` → `seedDeck({allowShrink})` (chống co áp dụng, RT#3) → in `+a ~u -d`.
  5. admin → `upsertOwner` (RT#4):
     - `INSERT INTO users (username, pass_hash) VALUES ($1,$2) ON CONFLICT (username) DO NOTHING RETURNING id` → có id → `INSERT INTO progress … '{"v":1}' ON CONFLICT DO NOTHING` → `owner <u> created`.
     - Không có id (đã tồn tại): thiếu `--reset-owner-password` → ném "Tên <u> đã tồn tại (tạo lúc <created_at>) — thêm --reset-owner-password nếu đó là tài khoản của bạn". Có cờ → `UPDATE users SET pass_hash` + **luôn** `DELETE FROM sessions WHERE user_id=$1` → `owner <u> password reset, N sessions revoked`; progress giữ nguyên.
- In: `schema ok · words … · audio … · owner …`. Không in mật khẩu/URL. Thoát 0/1; luôn `pool.end()`.
- `PGSSL=true` mà thiếu `PGSSLROOTCERT` → in cảnh báo "TLS không xác thực chứng chỉ" (không chặn — mạng nội bộ Nhân Hòa dùng `PGSSL=false`).
- Logic thuần + `upsertOwner` trong `server/owner-account.js` và `server/seed-cli-args.js`; `tools/seed-database.js` chỉ nối dây (`require.main === module`).

## Architecture
```
parseArgs → hash mật khẩu → Pool → withTransaction:
  lock → [reset: kiểm users → DROP] → schema.sql → [seedDeck] → [upsertOwner] → COMMIT → in tóm tắt
```

## Related Code Files
- Create: `tools/seed-database.js`, `server/seed-cli-args.js`, `server/owner-account.js`, `tests/seed-database-cli.test.js`
- Modify: — (dùng `readSchema`, `sslOption`, `withTransaction` export ở phase 1)

## Implementation Steps (TDD)
1. **Test đỏ** parseArgs: `[]`; `--reset` → lỗi; `--reset --yes`; `--drop-users` lẻ → lỗi; cờ lạ; admin thiếu 1 biến; `Owner_1` → `owner_1`; mật khẩu 5 ký tự → lỗi; `--reset-owner-password` không admin → lỗi.
2. **Test đỏ** `upsertOwner(fakeClient)`: user mới → INSERT users + progress, không đụng sessions; user có sẵn không cờ → ném, không UPDATE; có cờ → UPDATE + DELETE sessions, không đụng progress; `pass_hash` bắt đầu `scrypt$` và `verifyPassword` khớp.
3. **Test đỏ** kịch bản reset (fake client): lock trước DROP; users=3 không `--drop-users` → ném, không có DROP; có cờ → DROP rồi DDL, tất cả trong BEGIN…COMMIT; scrypt không gọi giữa BEGIN và COMMIT (hash truyền vào sẵn).
4. Code → xanh.

## Success Criteria
- [ ] Test xanh; chạy 2 lần → lần 2 báo `owner … exists` và thoát ≠0 (hoặc bỏ env admin → 0).
- [ ] Không thể chiếm tài khoản / xoá user thật bằng lệnh mặc định.
- [ ] Không in bí mật.

## Risk Assessment
- `--reset --yes --drop-users` vẫn phá huỷ → chỉ dùng dev; docs yêu cầu dừng app + `pg_dump` trước (nếu không, request đang chạy dính 42P01 → 500).
- Mật khẩu qua env có thể vào shell history → docs dùng `read -s`.
