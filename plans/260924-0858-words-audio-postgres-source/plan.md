---
title: "LingoBrain — Bộ từ + audio index lấy từ PostgreSQL (schema.sql, seed, /api/words)"
status: in-progress
created: 2026-09-24
mode: tdd
source: plans/reports/brainstorm-260924-0858-words-audio-postgres-migration-report.md
blockedBy: []
blocks: []
related: [260923-1729-account-login-cloud-sync]
---

# Bộ từ + audio index từ PostgreSQL

DB `lingoBrain` (Nhân Hòa) thành nguồn app đọc bộ từ (2505 từ) + audio index (5009 mục). MP3 vẫn là file tĩnh `audio/`. `words.json` + `audio/index.json` vẫn nằm trong repo: là **nguồn biên tập + dữ liệu seed + fallback offline**. Server tự seed khi khởi động nếu **hash nội dung 2 file khác hash trong DB** (bảng rỗng cũng tính là khác) → sửa JSON + deploy là đủ, không bắt buộc chạy CLI. Tài khoản chủ tạo bằng CLI + env.

## Ràng buộc chung
- Node ≥18, dep duy nhất `pg`; `node:http`; file < 200 dòng; kebab-case; comment tiếng Việt như code hiện có.
- **TDD:** mỗi phase test trước (đỏ) → code (xanh). Test chạy `node tests/run-tests.js`, không cần DB thật (fake client ghi lại query + trả kịch bản). Số lượng kỳ vọng **tính từ file nguồn**, không viết cứng (RT#5).
- Module Node-only test theo mẫu `tests/database-availability.test.js` (`require(path.join(ROOT, ...))`, bỏ qua ngoài Node).
- Không đổi bảng `users/sessions/progress`, không đổi API sync/auth, không đổi SM-2.
- Không commit/log mật khẩu, `DATABASE_URL`. Không đặt `ADMIN_PASSWORD` vào Environment của resource (RT#14).
- Thêm/đổi file frontend → bump `APP_VERSION` (`js/app-storage.js`) = `CACHE` (`sw.js`).

## Hợp đồng (nguồn duy nhất — phase khác chỉ tham chiếu)

```sql
-- thêm vào server/schema.sql (sau 3 bảng cũ, giữ nguyên chúng)
CREATE TABLE IF NOT EXISTS words (
  id text PRIMARY KEY, word text NOT NULL, ipa text NOT NULL DEFAULT '', pos text NOT NULL DEFAULT '',
  meaning text NOT NULL DEFAULT '', context text NOT NULL DEFAULT '', context_vi text NOT NULL DEFAULT '',
  source text NOT NULL DEFAULT '', emoji text NOT NULL DEFAULT '', image text NOT NULL DEFAULT '',
  mnemonic text NOT NULL DEFAULT '', output_prompt text NOT NULL DEFAULT '',
  sort_order int NOT NULL, updated_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS audio_clips (
  text text PRIMARY KEY, file text NOT NULL CHECK (file ~ '^[0-9a-f]{12}\.mp3$'));   -- RT#12
CREATE TABLE IF NOT EXISTS deck_meta (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1), deck text NOT NULL, updated text NOT NULL DEFAULT '',
  voice text NOT NULL DEFAULT '', content_hash text NOT NULL, seeded_at timestamptz DEFAULT now());  -- RT#2
```

- `content_hash` = sha1(`words.json` bytes + `\n` + `audio/index.json` bytes). Seed khi hash khác; API dùng hash làm ETag + khoá cache.
- Hằng khoá seed: `pg_advisory_xact_lock(<SEED_LOCK_ID>)` — **câu lệnh đầu tiên** của mọi transaction seed (server lẫn CLI) (RT#13).

| API (public, GET, không auth, không cần Content-Type) | Trả về |
|---|---|
| `GET /api/words` | `{deck, updated, words:[{id, word, ipa, pos, meaning, context, contextVi, source, emoji, image, mnemonic, outputPrompt}]}` sắp `sort_order` — shape `words.json` |
| `GET /api/audio-index` | `{voice, items:{[text]: file}}` — shape `audio/index.json` |

- Header: `ETag: "<content_hash>"`, `Cache-Control: no-cache`; `If-None-Match` so khớp **yếu** (bỏ `W/`, tách dấu phẩy) → 304 (RT#11). DB chưa ready → 503 (sẵn có). Bảng rỗng → 503 `{error:'Bộ từ chưa được nạp'}` cho **cả 2 route**.
- Env mới: `ADMIN_USERNAME`, `ADMIN_PASSWORD` (chỉ CLI đọc, đặt trong shell phiên chạy). `AUTO_SEED=false` tắt tự seed (mặc định bật).
- Cờ CLI: `--reset --yes [--drop-users]`, `--allow-shrink`, `--reset-owner-password`, `--skip-deck`.

## Phases

| # | Phase | File | Depends | Status |
|---|---|---|---|---|
| 1 | schema.sql + rows thuần + seeder (lock, hash, chống co) + auto-seed có retry | [phase-01-schema-file-and-deck-seeder.md](phase-01-schema-file-and-deck-seeder.md) | — | completed |
| 2 | CLI `tools/seed-database.js`: reset có rào chắn, tài khoản chủ an toàn | [phase-02-seed-cli-and-owner-account.md](phase-02-seed-cli-and-owner-account.md) | 1 | completed |
| 3 | API `GET /api/words`, `/api/audio-index` (cache theo hash, single-flight, ETag yếu) | [phase-03-public-deck-api-routes.md](phase-03-public-deck-api-routes.md) | 1 | completed |
| 4 | Client + SW: đọc API, fallback file, prune chỉ khi nguồn API, bump version | [phase-04-client-and-service-worker-read-api.md](phase-04-client-and-service-worker-read-api.md) | 3 | completed |
| 5 | Docs + chạy trên Nhân Hòa + kiểm tra | [phase-05-docs-and-nhan-hoa-rollout.md](phase-05-docs-and-nhan-hoa-rollout.md) | 2, 4 | in-progress (docs xong, chờ rollout) |

Phase 2 và 3 độc lập (khác file) → làm song song được.

## Acceptance (toàn plan)
- [ ] `node tests/run-tests.js` xanh (test cũ + mới).
- [ ] DB trống + deploy → log `schema ready` → `deck seeded: <N> words, <M> audio` (N, M = số trong 2 file: hiện 2505 / 5009); restart không đổi file → không seed lại (log `deck up to date`).
- [ ] Sửa 1 từ trong `words.json` + deploy → server tự seed, DB đổi đúng 1 dòng `updated_at`; gỡ 1 từ → xoá đúng 1 dòng.
- [ ] `words.json` rỗng/co > 50% → seed từ chối, DB giữ nguyên (trừ `--allow-shrink` ở CLI).
- [ ] `--reset` thiếu `--yes` → thoát ≠0; `--reset --yes` khi `users` > 0 và thiếu `--drop-users` → thoát ≠0, không đụng DB.
- [ ] CLI tạo tài khoản chủ mới → đăng nhập được; username đã tồn tại mà thiếu `--reset-owner-password` → thoát ≠0; có cờ → đổi mật khẩu + xoá mọi session, **không mất progress**.
- [ ] `GET /api/words` deep-equal `words.json`; `If-None-Match: W/"<hash>"` → 304.
- [ ] App đọc API; API lỗi → dùng `words.json` **và không prune**; offline sau lần đầu → chạy.
- [ ] Không có mật khẩu/URL DB thật trong repo, log.

## Liên quan
- `260923-1729-account-login-cloud-sync` phase 4 (deploy, pending) — cùng sửa `docs/deployment-guide.md`; phase 5 ở đây bổ sung bước seed, không đụng phần sync.

## Red Team Review

### Session — 2026-09-24
**Findings:** 15 (15 accepted, 3 phần bị reject có lý do) · **Severity:** 2 Critical, 4 High, 9 Medium · Reviewers: Security Adversary, Failure Mode Analyst, Assumption Destroyer.

| # | Finding | Severity | Disposition | Applied To |
|---|---|---|---|---|
| 1 | Rollout chạy `--reset` trên DB đang sống → mất tài khoản | Critical | Accept — bỏ khỏi runbook; chặn khi users>0 trừ `--drop-users`; dừng app + pg_dump | Phase 2, 5 |
| 2 | DB lệch words.json + `pruneSrs` xoá vĩnh viễn tiến độ khách | Critical | Accept — seed theo `content_hash`; client prune chỉ khi nguồn API | Plan, Phase 1, 3, 4 |
| 3 | Không chặn bộ từ co/rỗng; parse lệch client (`j.words \|\| j`) | High | Accept — từ chối 0 / <50% trừ `--allow-shrink`; parse cùng shape; in diff | Phase 1, 2 |
| 4 | Upsert chủ chiếm tài khoản trùng tên, giữ token cũ | High | Accept — DO NOTHING; cần `--reset-owner-password`, luôn xoá session | Phase 2 |
| 5 | Audio 5009 không phải 5010 | High | Accept — tính từ file | Plan, Phase 1, 5 |
| 6 | `words.* IS DISTINCT FROM excluded.*` luôn đúng | High | Accept — so cột nội dung | Phase 1 |
| 7 | Seed lỗi không retry; `invalidate` wiring mơ hồ | Medium | Accept — `db.start({onReady})`, retry backoff | Phase 1, 3 |
| 8 | TTL RAM + nhiều instance/CLI → lệch bộ | Medium | Accept — revalidate bằng `content_hash` mỗi request, bỏ TTL | Phase 3 |
| 9 | Cache miss đồng loạt chiếm pool; 503 không cache | Medium | Accept single-flight + cache 503 10s; **Reject** limiter riêng (120/phút/IP đủ — `server/auth-and-sync-routes.js:17`) | Phase 3 |
| 10 | `curl -sI` = HEAD → 405 | Medium | Accept — docs dùng `curl -s -D - -o /dev/null` | Phase 5 |
| 11 | ETag yếu sau proxy gzip → không bao giờ 304 | Medium | Accept — so khớp yếu | Plan, Phase 3 |
| 12 | Tên file audio chỉ kiểm lúc seed | Medium | Accept — CHECK constraint | Plan |
| 13 | Deadlock thứ tự khoá CLI/server; scrypt trong tx | Medium | Accept — lock đầu tiên, hash trước BEGIN | Plan, Phase 2 |
| 14 | Bí mật: ADMIN_PASSWORD trong Environment; user `sa` dùng chung | Medium | Accept bỏ fallback Environment + đổi mật khẩu DB là điều kiện; **Reject** tách role PG (ngoài phạm vi → câu hỏi mở); **Reject** xoá dòng docs:52 (mật khẩu ví dụ `MyPass@123`, không thật) | Plan, Phase 5 |
| 15 | Comment cũ "words.json nguồn duy nhất"; docs nhắc `getClientIp` không tồn tại | Medium | Accept | Phase 4, 5 |

### Whole-Plan Consistency Sweep
- Delta: `seedIfEmpty` → `seedIfChanged` (hash); TTL 5 phút → revalidate hash; 5010 → tính từ file (5009); `--reset` khỏi runbook; owner upsert → insert-or-fail.
- Đã quét 6 file: không còn `5010`, `seedIfEmpty`, `TTL`, `IS DISTINCT FROM excluded.*`, `curl -sI`, `ON CONFLICT (username) DO UPDATE`, fallback Environment cho mật khẩu. 0 mâu thuẫn tồn đọng.
- Người dùng xác nhận DB production **trống hoàn toàn** → runbook chỉ chạy seed thường.

## Câu hỏi chưa giải quyết
1. Log Nhân Hòa đã có `schema ready` chưa? Chưa → xử lý kết nối DB trước phase 5.
2. Console resource Nhân Hòa có chạy được `node tools/seed-database.js` không? (Chỉ cần cho tài khoản chủ — bộ từ đã tự seed.) Không → đăng ký tài khoản chủ qua app/`/api/register` như user thường.
3. Nhân Hòa có cho tạo role PG quyền thấp (tách web khỏi `sa`) không?
4. Nhân Hòa chạy >1 instance? Proxy có gzip không?
