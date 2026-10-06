---
phase: 1
title: Server Gemini dialogue route
status: completed
priority: P1
dependencies: []
---

# Phase 1: Server Gemini dialogue route

## Overview
`GET /api/dialogue` (không auth, báo bật/tắt) + `POST /api/dialogue` (auth): nhận `ids` từ hôm nay → tra deck DB → gọi Gemini (structured JSON) → validate → lưu `(user_id, day)` → trả hội thoại. Toàn bộ pipeline chạy trong 1 promise single-flight; hạn mức bền (DB) + chặn lạm dụng theo user/IP.

## Requirements
- Functional: bật/tắt; tạo / trả cache / tạo lại (≤3 lần thành công / user / 24h); tình huống xoay vòng; đo phủ từ **chỉ để báo** (`missing`), không gọi lại vì phủ thấp.
- Non-functional: key chỉ ở env; không log nội dung/prompt; 1 ngân sách tổng 25s; huỷ được lời gọi Gemini; semaphore 2; trần toàn server bền qua restart.

## Contract (phase 2 dựa vào — không đổi tuỳ ý)
`GET /api/dialogue` (không auth) → `200 { "enabled": true|false }`, `Cache-Control: no-store`. Không có key → `{ enabled: false }`.

`POST /api/dialogue`, `Authorization: Bearer …`, `Content-Type: application/json`, body ≤4KB:
```json
{ "day": "2026-10-06", "ids": ["reckon", "figure-out"], "regenerate": false }
```
Response 200:
```json
{ "day": "2026-10-06", "genCount": 1, "genMax": 3,
  "dialogue": {
    "scenario": "Ordering at a café", "scenarioVi": "Gọi đồ ở quán cà phê",
    "roles": { "you": "customer", "them": "barista" },
    "turns": [ { "who": "them", "en": "...", "vi": "...", "ids": [] },
               { "who": "you",  "en": "...", "vi": "...", "hintVi": "...", "ids": ["reckon"] } ],
    "targetIds": ["reckon", "figure-out"], "missing": [] } }
```
Thứ tự xử lý lỗi (khớp TTS): **501 (thiếu key, trước auth)** → 401 → 400 (body sai / `day` ngoài {hôm qua, hôm nay, ngày mai} theo UTC server / 0 id hợp lệ) → cache hit 200 → 429 (hết lượt user / IP / trần server) → 503 (Gemini lỗi, timeout, bận).
`regenerate: false` + đã có dòng ngày đó → trả cache (kể cả `ids` khác). `regenerate: true` → tạo mới nếu còn lượt.

## Architecture
```
GET  → [200, {enabled: !!dialogue}]
POST → dialogue ? … : 501
  authUser → parse body (readJsonBody 4KB) → validate day/ids
  SELECT data, gen_count FROM dialogues WHERE user_id, day → có & !regenerate → 200 cache
  key = userId + '|' + day
  inflight.has(key) → await chung (không tính lượt, không gọi gì thêm)
  else  // mở lượt mới: KIỂM TRA hết rồi mới HIT (mẫu tts-routes.js:95-99)
    usedUser24h = SELECT coalesce(sum(gen_count),0) FROM dialogues WHERE user_id=$1 AND updated_at > now()-'24h'
    usedServer  = SELECT coalesce(sum(gen_count),0) FROM dialogues WHERE updated_at > now()-'24h'
    usedUser24h ≥ 3 → 429 · usedServer ≥ DIALOGUE_DAILY_MAX → 429
    !userAttempts.ok(userId) (6 lần thử/24h, RAM) || !ipMinute.ok(ip) (5/phút) || !ipDay.ok(ip) (30/ngày) → 429
    hit cả 3 limiter RAM
    inflight.set(key, run()) ; finally delete
  run():   // TOÀN BỘ trong single-flight, deadline tổng 25s tính từ đầu request
    words = SELECT id, word, pos, meaning FROM words WHERE id = ANY($1)  (giữ thứ tự ids, cắt 8)
    scenario = pickScenario(day, genCountHiệnTại)
    sem.run: lúc tới lượt, nếu quá hạn hoặc req.destroyed → ném BUSY (không gọi Gemini)  (mẫu tts-routes.js:100-104)
    raw = provider.generate({ scenario, words, signal })   // AbortController hết hạn tổng → abort
    v = validateDialogue(raw, words)
    !v.ok && còn ≥8s → gọi lại 1 lần (CHỈ khi sai cấu trúc) ; vẫn hỏng → 503
    UPSERT có điều kiện (1 lần, trong promise chung):
      INSERT INTO dialogues (user_id, day, data, gen_count) VALUES ($1,$2,$3,1)
      ON CONFLICT (user_id, day) DO UPDATE SET data=$3, gen_count=dialogues.gen_count+1, updated_at=now()
        WHERE dialogues.gen_count < $4
      RETURNING gen_count            → không dòng → 429
    DELETE FROM dialogues WHERE user_id=$1 AND day < current_date - 30
```
- Kết quả vẫn lưu DB khi client đã bỏ đi (lần mở sau = cache hit) — **cố ý**, ghi comment.
- Hạn mức "3" = số lần **tạo thành công** trong 24h trượt qua mọi `day` (chặn chiêu ±1 ngày). Lần thử lỗi bị chặn bằng limiter RAM 6/24h/user + IP. Trần server tính từ DB → bền qua restart; đếm thành công (mỗi thành công ≤2 lời gọi Gemini).
- Giả định **1 process** (inflight + limiter RAM) — đúng với deploy hiện tại; ghi vào docs.

Modules:
- `server/request-guards.js`: chuyển `withDeadline` (đang nằm riêng trong `tts-routes.js:49-54`) ra đây, export; `tts-routes.js` dùng lại (không đổi hành vi).
- `server/gemini-dialogue-provider.js`: `createGeminiDialogueProvider({ apiKey, model, fetchImpl = fetch })` → `{ generate({ scenario, words, signal }) }`. `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`, header `x-goog-api-key`, `generationConfig: { responseMimeType: 'application/json', responseSchema, temperature: 0.9, maxOutputTokens: 2048, thinkingConfig: { thinkingBudget: 0 } }`. Lỗi HTTP/parse → `{ code: 'UPSTREAM' }`; abort → `{ code: 'BUSY' }`. **Xác minh trên docs lúc làm**: model id, tên `responseSchema`/`responseJsonSchema`, cú pháp `thinkingConfig` cho model đã chọn.
- `server/dialogue-content-validator.js` [thuần]: `SCENARIOS` (~20 tình huống đời sống), `pickScenario(day, n)`, `buildPrompt(scenario, words)`, `cleanText(s, max)`, `validateDialogue(raw, words)`, `findMissing(turns, words)`.
  - `cleanText`: string, gom khoảng trắng, trim, cắt `max`, loại `[\u0000-\u001f\u007f<>]` → rỗng = không hợp lệ. Áp cho **mọi** trường: `scenario`/`scenarioVi` ≤80, `roles.you/them` ≤40, `en` 1–200 (khớp `/api/tts`), `vi`/`hintVi` ≤300.
  - Cấu trúc: `turns` 10–14; `who ∈ {you, them}`; lượt `you` bắt buộc `hintVi`; `ids` lọc theo `words`. JSON đã làm sạch ≤16KB.
  - Phủ từ: dùng `js/dialogue-word-match.js` [thuần, dùng chung server + client — server `require` như `js/sync-merge.js`; client dùng để tô đậm ở phase 2]: `matchSpans(sentence, phrase)` → `[[start, end]]` trên câu gốc, `isCovered(sentences, phrase)`. Chuẩn hoá theo `normAnswer` (`js/srs-scheduler.js:169`). Từ/cụm coi là có khi chuỗi chuẩn hoá của cụm xuất hiện trong chuỗi chuẩn hoá của các câu `en`, hoặc token cuối có đuôi s/es/ed/d/ing; cụm có tân ngữ chen (figure **it** out) chấp nhận khoảng chen ≤2 token. Không bắt dạng bất quy tắc → rơi vào `missing` (chấp nhận được). Thêm id Gemini tự khai trong `turns[].ids` nếu khớp lỏng.
- `server/dialogue-routes.js`: `createDialogueRoutes({ pool, getProvider, perUserMax = 3, dailyMax, budgetMs = 25000, now, log })` → `{ status(), create(req, userId, ip) }`.

Prompt (`buildPrompt`, tóm tắt): người học Việt = `you`, người kia bản xứ trong `{scenario}`; tiếng Anh hội thoại tự nhiên, câu ngắn, contractions, A2–B1; dùng mỗi mục (`word — pos — nghĩa VI`) ≥1 lần đúng nghĩa, ưu tiên lượt `you`; **tự nhiên hơn đủ từ** — không ép; `hintVi` = ý chính (không dịch sát); 10–14 lượt. Danh sách từ lấy từ DB (nội dung bộ từ), không có chữ do client gửi.

## Related Code Files
- Create: `js/dialogue-word-match.js` (+ thêm vào `PURE_MODULES`, `tests/dialogue-word-match.test.js`), `server/gemini-dialogue-provider.js`, `server/dialogue-content-validator.js`, `server/dialogue-routes.js`, `tests/dialogue-content-validator.test.js`, `tests/dialogue-routes.test.js`
- Modify: `server/schema.sql`, `server/request-guards.js` (+`withDeadline`), `server/tts-routes.js` (dùng `withDeadline` chung), `server/auth-and-sync-routes.js` (ROUTES `GET`/`POST /api/dialogue`, PATHS, nhận `dialogue`), `server.js` (env + nạp provider lười như TTS)

Schema:
```sql
-- Hội thoại nhập vai /api/dialogue: 1 dòng / user / ngày (ngày theo máy người dùng, server cho lệch ±1).
-- gen_count = số lần tạo thành công của dòng; hạn mức tính SUM trong 24h qua mọi dòng của user.
CREATE TABLE IF NOT EXISTS dialogues (
  user_id int NOT NULL REFERENCES users(id) ON DELETE CASCADE, day date NOT NULL,
  data jsonb NOT NULL CHECK (octet_length(data::text) <= 32768),
  gen_count int NOT NULL DEFAULT 1 CHECK (gen_count >= 1),
  updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (user_id, day));
CREATE INDEX IF NOT EXISTS dialogues_updated_at ON dialogues (updated_at);
```

## Implementation Steps
1. Bảng + index vào `server/schema.sql`.
2. Chuyển `withDeadline` sang `request-guards.js`; chạy `tests/request-guards.test.js` + test TTS hiện có.
3. Validator + test: scenario ổn định theo ngày; mọi trường bị `cleanText`; sai cấu trúc/thiếu `hintVi`/quá dài → lỗi; phủ đúng với cụm từ (`figure out` / "figured it out"), contraction (`how's it going`), đuôi -s/-ed/-ing; bất quy tắc → `missing`.
4. Provider + test với `fetchImpl` giả: body request đúng cấu hình; HTTP 4xx/5xx → UPSTREAM; abort → BUSY; không log prompt.
5. Route + test (pool giả theo mẫu `tests/deck-routes.test.js`, provider giả):
   - không key → GET `{enabled:false}`, POST 501 **không cần token**
   - cache hit không gọi provider, không tốn lượt
   - 2 request song song cùng user/day, `regenerate:true` → provider gọi 1 lần, `gen_count` +1 đúng 1
   - đã dùng 3 trong 24h (kể cả ở `day` khác) → 429; `day` lệch 2 ngày → 400
   - provider ném / quá hạn → 503, `gen_count` không đổi; lần thử thứ 7 trong 24h → 429
   - JSON hỏng lần 1, đúng lần 2 → 200 (2 lời gọi); hỏng cả 2 → 503
   - client ngắt kết nối khi đang xếp hàng → provider không được gọi
6. Nối route vào `auth-and-sync-routes.js`; `server.js`: `GEMINI_API_KEY`, `GEMINI_MODEL` (mặc định `gemini-3.6-flash`), `DIALOGUE_DAILY_MAX` (mặc định 50). Không key → `dialogue = null`.
7. Log 1 dòng/lần: `dialogue ok user=… ms=… coverage=… gen=… calls=…` / `dialogue fail code=… ms=…`.

## Success Criteria
- [ ] Test validator, provider, route xanh; test cũ (TTS, request-guards, createApi không `dialogue`) xanh
- [ ] Gọi thật với key: JSON đúng contract trong ≤25s
- [ ] Bấm đúp / 2 tab không tốn 2 lượt; ±1 ngày không vượt 3 lượt/24h; restart server không reset trần
- [ ] Không nội dung hội thoại/prompt trong log

## Risk Assessment
- Gemini đổi tên field/model → cô lập trong provider + env; xác minh docs lúc làm.
- Proxy hosting cắt request dài (chưa rõ timeout proxy, `docs/deployment-guide.md`) → ngân sách 25s; kiểm tra thật sau deploy.
- Nhiều process sau này → inflight/limiter RAM không còn đúng; UPSERT có điều kiện vẫn giữ hạn mức thành công đúng.
- Rollback: bỏ `GEMINI_API_KEY` → `{enabled:false}`, client ẩn nút; bảng thừa vô hại.
