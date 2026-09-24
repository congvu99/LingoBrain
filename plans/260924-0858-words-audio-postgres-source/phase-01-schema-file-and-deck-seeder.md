---
phase: 1
title: "schema.sql + rows thuần + seeder + auto-seed theo hash"
status: completed
priority: P1
dependencies: []
---

# Phase 1: schema file + deck seeder

## Overview
Tách schema ra `server/schema.sql` (nguồn duy nhất), thêm 3 bảng bộ từ (hợp đồng trong `plan.md`). Hàm thuần JSON ↔ rows, `seedDeck` trong 1 transaction có khoá + chống co. Server tự seed khi `content_hash` khác, có retry.

## Requirements
- `database.js` đọc `schema.sql` (export `readSchema()`), bỏ chuỗi `SCHEMA`; export thêm `sslOption`.
- `db.start({ onReady })`: sau `schema ready` gọi `await onReady()`; `onReady` ném lỗi mà `isDbUnavailable(e)` → retry cùng backoff (2s→30s); lỗi khác (dữ liệu, chống co) → log 1 lần, dừng (RT#7). `ready` vẫn true ngay sau schema (API bộ từ tự trả 503 khi rỗng).
- Thuần (`server/deck-rows.js`):
  - `deckWordsOf(json)` = `Array.isArray(json) ? json : json.words` — **cùng shape client** (`js/app-shell.js:86`) (RT#3).
  - `wordsToRows(json)` → rows snake_case, bỏ mục thiếu `id`/`word`, id trùng giữ mục đầu, trường thiếu → `''`, `sort_order` = index.
  - `rowsToWords(rows)` → camelCase đúng 12 khoá, thứ tự khoá như `words.json`.
  - `audioToRows(index)` → `[{text, file}]`, bỏ file không khớp `/^[0-9a-f]{12}\.mp3$/`.
  - `contentHash(wordsBuf, audioBuf)` → sha1 hex.
- `server/deck-seeder.js`:
  - `seedDeck(client, {wordsJson, audioJson, hash, allowShrink})` (client đã trong tx):
    1. `SELECT pg_advisory_xact_lock(SEED_LOCK_ID)` — **câu đầu tiên** (RT#13).
    2. Chống co (RT#3): `SELECT count(*) FROM words`; rows mới = 0 → ném; hiện có > 0 và rows mới < 50% hiện có và `!allowShrink` → ném `ShrinkError` (kèm số).
    3. Upsert theo lô 500 dòng bằng `unnest($1::text[], …)`: `ON CONFLICT (id) DO UPDATE SET <cột nội dung>, updated_at = now() WHERE (words.word, words.ipa, words.pos, words.meaning, words.context, words.context_vi, words.source, words.emoji, words.image, words.mnemonic, words.output_prompt) IS DISTINCT FROM (excluded.word, …, excluded.output_prompt)` — **không so `updated_at`, `sort_order`** (RT#6); `sort_order` cập nhật riêng bằng `UPDATE … FROM unnest` để thêm/bớt 1 từ không đổi `updated_at` của các từ phía sau (code review). Chống co áp dụng cả `audio_clips` (code review).
    4. `DELETE FROM words WHERE NOT (id = ANY($1))`; tương tự `audio_clips` (upsert theo `text`, so `file`).
    5. Upsert `deck_meta` (deck, updated, voice, content_hash, seeded_at=now()).
    6. Trả `{words, audio, added, updated, deleted}` (dùng `RETURNING (xmax = 0) AS inserted` + rowCount DELETE).
  - `seedIfChanged(pool, loadFiles, log)`: đọc 2 file → hash → `withTransaction`: lock → `SELECT content_hash FROM deck_meta` → bằng → log `deck up to date`, bỏ qua; khác/không có → `seedDeck` (không `allowShrink`) → log `deck seeded: N words, M audio (+a ~u -d)`. Trả `{changed}`.
- `server.js`: `db.start({ onReady: async () => { if (AUTO_SEED) await seedIfChanged(...); api.invalidateDeck(); } })` (RT#7, `invalidateDeck` ở phase 3; phase 1 để no-op nếu phase 3 chưa xong).

## Architecture
```
start → schema.sql → ready=true → onReady:
   read words.json + audio/index.json → hash
   tx: advisory lock → deck_meta.content_hash == hash ? skip : seedDeck (chống co) → COMMIT
   lỗi kết nối → retry backoff | lỗi dữ liệu → log, giữ DB cũ
   → api.invalidateDeck()
```
Advisory lock → nhiều instance / CLI không seed chồng. Transaction → không nửa vời. Hash → sửa JSON + deploy tự cập nhật, không lệch DB ↔ file.

## Related Code Files
- Create: `server/schema.sql`, `server/deck-rows.js`, `server/deck-seeder.js`, `tests/deck-rows.test.js`, `tests/deck-seeder.test.js`
- Modify: `server/database.js`, `server.js`

## Implementation Steps (TDD)
1. **Test đỏ** `tests/deck-rows.test.js` với file thật: `wordsToRows` length = `deckWordsOf(json).length` (không viết cứng, RT#5); `sort_order` liên tục; round-trip `rowsToWords(wordsToRows(j))` deep-equal `j.words`; mảng trần cũng parse; mục thiếu id/trùng id/trường thiếu; `audioToRows` length = `Object.keys(items).length`; loại `../x.mp3`; `contentHash` ổn định + đổi khi 1 byte đổi.
2. **Test đỏ** `tests/deck-seeder.test.js` (fake client theo kịch bản):
   - câu đầu tiên là `pg_advisory_xact_lock`;
   - SQL upsert **không** chứa `words.*` / `excluded.*` / `updated_at` trong mệnh đề WHERE;
   - số câu INSERT = ceil(n/500); có DELETE id không còn;
   - rows = 0 → ném; hiện 2505 mới 1000 → ném `ShrinkError`; `allowShrink` → qua;
   - `seedIfChanged`: hash bằng → không INSERT; hash khác → seed + ghi hash.
3. **Test đỏ** `database.js`: `readSchema()` chứa 6 `CREATE TABLE IF NOT EXISTS` + CHECK audio; file `database.js` không còn `CREATE TABLE`; `start({onReady})` retry khi onReady ném lỗi `ECONNRESET`, không retry khi lỗi thường (fake pool, backoff tiêm vào để test nhanh).
4. Code → xanh; chạy toàn bộ test.

## Success Criteria
- [ ] Test mới + cũ xanh.
- [ ] `schema.sql` là nơi duy nhất có DDL.
- [ ] Seed lại dữ liệu giống hệt → 0 dòng `updated_at` đổi (kiểm thật 1 lần trên PG docker nếu có, không bắt buộc).

## Risk Assessment
- Advisory lock trong tx → tự nhả khi COMMIT/ROLLBACK.
- Đọc 1.2MB mỗi lần start để hash: rẻ, chấp nhận.
- Encoding DB phải UTF8 (kiểm ở phase 5).
- Chống co 50% có thể chặn một lần dọn bộ từ có chủ đích → dùng CLI `--allow-shrink`.
