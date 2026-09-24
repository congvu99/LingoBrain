# System Architecture — LingoBrain v2

Cập nhật 2026-09-24. Web tĩnh + API Node.js. Dữ liệu người dùng trong `localStorage` (+ IndexedDB cho ghi âm) + PostgreSQL (tài khoản, tiến độ đồng bộ, bộ từ).

## File

```
index.html               khung HTML + 3 tab, nạp script theo thứ tự
css/paper-theme.css      giao diện giấy / e-reader (token trong docs/design-guidelines.md)
js/srs-scheduler.js      SM-2, learning steps, hàng đợi, pruneSrs, migrate v1→v2, so khớp mờ   [thuần]
js/app-storage.js        khoá localStorage, helper, trạng thái toàn cục
js/speech-synthesis.js   TTS (MP3 Neural pregenerated + Web Speech API fallback)
js/recording-store.js    IndexedDB ghi âm (10 bản/việc)
js/daily-plan.js         tab Giáo án + ghi âm shadowing
js/review-mode-picker.js chọn dạng kiểm tra theo độ chín, sinh đáp án MCQ          [thuần]
js/stats-dashboard.js    thống kê (computeStats thuần + renderStats)
js/word-import.js        tải backup, danh sách từ chỉ xem, khôi phục tiến độ (bỏ qua deck)
js/review-steps-learn.js vòng đời thẻ: bước 1,2,4,5, render, phiên
js/review-tests.js       bước 3: type · dictation · mcq · owncloze · speak
js/word-games.js         game: pool có trọng số, xáo chữ, đáp án từ, combo, gom từ sai  [thuần]
js/plane-game-text.js    Bắn máy bay: chuẩn hoá chữ gõ, nhãn nghĩa, loại mục tiêu theo độ dài  [thuần]
js/plane-game-logic.js   Bắn máy bay: mục tiêu, vật lý, tàu mình bay theo mục tiêu, đạn tự dẫn, va chạm, điểm  [thuần, cần comboMult + plane-game-text]
js/plane-game-typing.js  Bắn máy bay: nhắm bắn theo chữ gõ — ứng viên, đổi mục tiêu, đổi hướng đạn, Enter  [thuần]
js/plane-game-effects.js Bắn máy bay: nền vũ trụ (tinh vân + 3 lớp sao), hạt nổ, sóng xung kích, chớp, rung, chữ bay
js/plane-game-render.js  Bắn máy bay: vẽ canvas tàu mình / thiên thạch / tàu địch / tàu mẹ / đạn / nhãn tự xuống dòng
js/plane-game-ui.js      Bắn máy bay: khung phủ theo visualViewport, canvas DPR, vòng rAF, ô gõ từng chữ, tạm dừng
js/fruit-game-logic.js   Chém chữ: cấp độ, bom na ná (Levenshtein), đợt quả, vật lý ném, cắt đoạn vuốt, chấm nhát  [thuần, cần comboMult]
js/fruit-game-fruit-art.js Chém chữ: vẽ 7 loại quả bằng canvas (vỏ nguyên + mặt cắt ruột), không emoji/ảnh
js/fruit-game-render.js  Chém chữ: trạng thái hiệu ứng — nền gỗ, nửa quả, giọt nước, vết loang, sao, sóng, vệt dao, chữ bay
js/fruit-game-scene-draw.js Chém chữ: vẽ 1 khung — bóng đổ, quầng vàng/xanh, tia chém, vệt dao phát sáng, viền đỏ khi sai
js/fruit-game-ui.js      Chém chữ: khung phủ, pointer events vuốt, canvas DPR, vòng rAF, tạm dừng, chọn cấp
js/word-game-rounds.js   game: khung đồng hồ 60s + vẽ 3 dạng câu hỏi
js/word-game-ui.js       game: chip chọn, vòng đời ván, màn kết thúc
js/game-particles.js     DÙNG CHUNG (Bắn máy bay + Pháp sư): pool hạt burst/step, vẽ nhận ctx, rand tiêm được   [thuần]
js/game-viewport-fit.js  DÙNG CHUNG (Bắn máy bay + Pháp sư): co khung theo visualViewport
js/boss-progress-sync-merge.js  Pháp Sư Lexoria: BOSS_ELEMENTS, emptyBoss/cleanBoss/mergeBoss cho `eng.boss.v1`, dùng chung server   [thuần, nạp TRƯỚC sync-merge.js + app-storage.js]
js/boss-game-spell-math.js      Pháp sư: BOSS_TUNING, độ khó từ, bậc chiêu tương đối trong pool, hệ số tốc độ/sát thương, pool nhóm đồng nghĩa   [thuần]
js/boss-game-elements.js        Pháp sư: bảng cây 5 nguyên tố → modifier, điểm còn lại, điều kiện lên bậc   [thuần]
js/boss-game-logic.js           Pháp sư: máy trạng thái 1 trận (đồng hồ, chậm thời gian, khoá cắt cảnh, gõ/typo, Nộ, DoT, freeze, events[])   [thuần]
js/boss-game-progress.js        Pháp sư: đường cấp, trận hôm nay/beat kế, ghi tiến trình idempotent, chuỗi ngày, buff Ôn từ, đoạn truyện   [thuần]
js/boss-game-spell-presets.js   Pháp sư: dữ liệu hiệu ứng phép theo hệ × bậc + tuyệt kỹ + fallback bậc thiếu
js/boss-game-story.js           Pháp sư: dữ liệu vùng, quái, 28 đoạn truyện
js/boss-game-spell-art.js       Pháp sư: fx trận — hạt, quả phép bay đúng mốc va chạm, sóng xung kích, số sát thương, preset + fallback bậc
js/boss-game-sprite-atlas.js    Pháp sư: atlas sprite Ninja Adventure (BOSS_SPRITES, spriteFrame/drawSprite/loadBossSprites) — nhân vật/quái/trùm/VFX/tile, tất cả ảnh trận đều qua đây   [phần thuần: BOSS_SPRITES, spriteFrame, pixelScale]
js/boss-game-dragon-composite.js  Pháp sư: ghép trùm cuối Oblivion từ 5 mảnh rời (đầu/2 cánh/thân) — gói không có sheet rồng nguyên khối
js/boss-game-arena.js           Pháp sư: dựng sân đấu 4 vùng từ tileset (offscreen theo cỡ/dpr), thay nền vẽ tay cũ
js/boss-game-sprite-actors.js   Pháp sư: diễn viên sprite (nhún/lao/giật lùi/nháy trắng/tan pixel), vẽ pháp sư + quái mỗi khung, VFX di chuyển (fx.sprites)
js/boss-game-portrait-ui.js     Pháp sư: vòng lặp chân dung idle nhỏ (sảnh + màn chọn lần đầu), ngừng vẽ khi ẩn tab, tự dừng khi rời sảnh (canvas bị gỡ)
js/boss-game-tier3-ultimate-fx.js  Pháp sư: trận đồ (magic circle sprite), 5 cắt cảnh tuyệt kỹ (Faceset), hiệu ứng nội tại (phủ băng, khiên, bỏng, buff Ôn từ)
js/boss-game-render.js          Pháp sư: ghép khung hình cảnh trận từ state + hiệu ứng (toàn sprite, không còn vẽ tay)
js/boss-game-ui.js              Pháp sư: khung trận DOM/canvas, input ẩn + phím, vòng rAF, tạm dừng, lưu tiến trình giữa trận
js/boss-game-story-journal-ui.js  Pháp sư: quái theo beat (Vô tận/Luyện phép chọn theo ngày), thẻ truyện + Nhật ký (Faceset <img> quái), từ đã học bấm nghe
js/boss-game-hub-ui.js          Pháp sư: sảnh — chân dung sprite, cấp/XP, chuỗi ngày, buff Ôn từ, trận hôm nay, cấp độ, refreshBossHub sau sync
js/boss-game-first-run-ui.js    Pháp sư: màn lần đầu — chờ sync khi đang đăng nhập, chọn pháp sư nam/nữ (chân dung sprite xem trước)
js/boss-game-skill-tree-ui.js   Pháp sư: cây kỹ năng nguyên tố + chọn trường phái, icon Skill Icon/Spell cạnh mỗi hệ
js/boss-game-result-ui.js       Pháp sư: thẻ đề trong trận, lưu tiến trình (persistBattle), màn kết (XP, lên cấp, outro, từ sai, chốt trùng thắng)
js/app-shell.js          tab, bindUI, phím tắt, init
js/pwa-register.js       đăng ký service worker, tự cập nhật (kiểm tra khi mở lại app, tải lại lúc rảnh)
js/deck-source.js        tải bộ từ từ /api/words (DB) → fallback words.json; pruneSrs chỉ khi từ API    [thuần]
sw.js, manifest.json     PWA network-first /api/words + /api/audio-index (SW cache); audio/ cache-first riêng
server.js                Node.js entry: routing, PWA, DB pool, auto-seed từ words.json + audio/index.json
server/schema.sql        DDL: users, sessions, progress (tài khoản + đồng bộ) + words, audio_clips, deck_meta (bộ từ)
server/database.js       Pool + readSchema, sslOption
server/auth-and-sync-routes.js   POST /register · /login · PUT /sync · GET /progress
server/deck-routes.js    GET /api/words · /api/audio-index (ETag, If-None-Match, RAM cache, single-flight)
server/deck-rows.js      wordsToRows, audioToRows, rowsToWords, contentHash (utils)
server/deck-seeder.js    seedIfChanged, loadDeckFiles, seedDeck, advisory lock, shrink guard
server/owner-account.js  upsertOwner (tạo/reset tài khoản chủ từ CLI)
server/seed-cli-args.js  parseArgs (--reset, --skip-deck, --allow-shrink, --reset-owner-password, ...)
server/password-hashing-and-session-tokens.js  hashPassword, verifyPassword, generateToken
tools/generate_edge_tts_audio.py   tạo MP3 từ words.json (dùng edge-tts), output: audio/<sha1>.mp3 + audio/index.json
tools/seed-database.js   CLI: nạp schema + bộ từ + tạo tài khoản chủ (chủ yếu để tạo owner, server tự seed)
tools/copy-boss-sprites.js  chạy tay: copy sheet Ninja Adventure (CC0) dùng thật vào img/boss/ cho game Pháp sư
tools/spoken-core-batch.js  CLI check|merge|reorder batch mục "Spoken core" vào words.json; xen kẽ 2 Oxford : 1 Spoken (dùng slug của srs-scheduler, wordRx của word-games)
audio/                   MP3 giọng Neural (en-US-ChristopherNeural), index.json ánh xạ text→file
img/boss/                sprite pixel Pháp sư (Ninja Adventure — xem README mục Credit), chép bằng tools/copy-boss-sprites.js, precache trong sw.js
tests/                   harness tự viết; `node tests/run-tests.js` (thuần) · tests/run-tests.html (thêm IndexedDB + DB test)
```

Script là classic `<script src>` dùng global, không ES module → mở `file://` vẫn chạy. Module "thuần" không đụng DOM/localStorage ở top-level và có `module.exports` để Node test.

## Schema PostgreSQL (server/schema.sql)

| Bảng | Cột chính | Mục đích |
|---|---|---|
| `users` | `id` (PK), `username` (UNIQUE), `pass_hash`, `created_at` | Tài khoản người dùng |
| `sessions` | `token_hash` (PK), `user_id` (FK), `created_at`, `last_used_at` | Phiên đăng nhập (1 user → nhiều phiên) |
| `progress` | `user_id` (PK, FK), `data` (JSONB), `updated_at` | Tiến độ đồng bộ (SRS, giáo án, cài đặt) |
| `words` | `id` (PK), 12 cột nội dung (snake_case), `sort_order`, `updated_at` | Bộ từ (seed từ words.json) |
| `audio_clips` | `text` (PK), `file` (CHECK: `^[0-9a-f]{12}\.mp3$`) | Audio index (seed từ audio/index.json) |
| `deck_meta` | `id` (PK = 1), `deck`, `updated`, `voice`, `content_hash`, `seeded_at` | Metadata: tên bộ, hash (để auto-seed), giọng TTS |

Auto-seed: so `content_hash` của `words.json` + `audio/index.json` với `deck_meta.content_hash` → khác → seed 1 transaction (advisory lock đầu tiên, chối shrink nếu < 50% bộ hiện tại).

## API (Công khai)

**GET /api/words** — bộ từ (shape như words.json)
```
Response 200: {deck, updated, words: [{id, word, ipa, pos, meaning, context, contextVi, source, emoji, image, mnemonic, outputPrompt}]}
Header: ETag: "<content_hash>", Cache-Control: no-cache
If-None-Match khớp (so khớp yếu, chấp nhận W/"…" và danh sách) → 304
Chưa seed / bảng rỗng → 503 {error: "Bộ từ chưa được nạp"} · DB chưa ready → 503 {error: "Máy chủ chưa sẵn sàng, thử lại sau"}
```

**GET /api/audio-index** — audio index (shape như audio/index.json)
```
Response 200: {voice: "en-US-ChristopherNeural", items: {text: "file.mp3", ...}}
Header, 304, 503 như /api/words
```

**POST /api/register** — đăng ký tài khoản (không auth)
```
Body: {username, password}
201 {token, username} → tạo users + progress {"v":1} + session
409 → username đã tồn tại
400 → sai định dạng (tên 3–20 a-z 0-9 _, mật khẩu 6–128)
```

**POST /api/login** — đăng nhập
```
Body: {username, password}
200 {token, username} → tạo session (hết hạn trượt 180 ngày)
401 → sai tài khoản hoặc mật khẩu
503 → DB chưa ready
```

**PUT /api/sync** — gửi tiến độ (auth: Authorization: Bearer token)
```
Body: {data: {v, srsEpoch, srs, cfg, plan, day, gameScore, boss}}
200 {data, updatedAt} → merge + lưu, trả bản merged
401 → token sai/hết hạn
503 → DB chưa ready
```

**POST /api/logout** — thu hồi phiên hiện tại (Bearer token) → 204

**HEAD không route** (405) — dùng `curl -D - -o /dev/null URL` thay vì `curl -I`.

**Rate limit:** 120/min/IP (xem `TRUST_PROXY_HOPS` ở Bước 2). Chung limiter cho tất cả `/api/*`.

## Luồng bộ từ trên client

1. **App mở:** `js/deck-source.js` gọi `fetchFirstOk()` → thử `/api/words` trước, lỗi (404/503/mất mạng) → fallback `words.json`
2. **Nếu từ API (`tag='api'`):** gọi `pruneSrs(srs, deck)` để xoá tiến độ từ bị gỡ khỏi bộ từ
3. **Nếu từ fallback file (`tag='file'`):** KHÔNG gọi pruneSrs (file có thể lệch DB → giữ tiến độ)
4. **SW cache:** `/api/words` và `/api/audio-index` network-first (query lấy bản mới, offline dùng cache)
5. **ETag + If-None-Match:** request có `If-None-Match` trùng ETag → server trả 304 (không gửi lại body)

## Dữ liệu

| Key | Nội dung |
|---|---|
| `eng.deck.v1` | **đã bỏ** (từ v2.6.0): bộ từ tải từ `words.json` mỗi lần mở, init xoá khoá cũ này |
| `eng.srs.v2` | `{[id]: {ef, ivl, due, state, reps, lapses, last, lastMode, sentences[], hist[]}}` |
| `eng.srs.v1` | bản Leitner cũ, giữ nguyên làm dự phòng sau migrate |
| `eng.cfg.v1` | `{newPerDay, maxSession}` |
| `eng.plan.v1`, `eng.day.v1` | giáo án, checkbox/streak/caption hôm nay |
| `eng.gamemiss.v1` | `[id]` từ trả lời sai trong game, tối đa 10 — kênh duy nhất từ game sang engine ôn |
| `eng.gamescore.v1` | `{[gameId]: {best, plays}}` kỷ lục mỗi game; Bắn máy bay / Chém chữ tách theo cấp: `planes` (Vừa), `planes-easy`, `planes-hard`, `fruit` (Vừa), `fruit-easy`, `fruit-hard` (tổng 9 khoá, sync-merge cho tối đa 20) |
| `eng.auth.v1` | `{token, username}` khi đăng nhập (dùng cho `/api/sync`) |
| `eng.syncmeta.v1` | `{cfgTs, planTs, dayTs, srsEpoch, owner, syncedAt}` — mốc đồng bộ |
| `eng.boss.v1` | Tiến trình Pháp Sư Lexoria: `{v, xp, wins:{date:beat}, day:{date,beat,dmg}\|null, alloc:{el:0..3}, gender:{v,ts}, element:{v,ts}, buffDate}` — không có `deviceId` |
| IndexedDB `lingobrain/recordings` | `{id, taskId, date, caption, blob, type}` |

`bossProg` (biến toàn cục, `js/app-storage.js`) giữ `eng.boss.v1` đang hoạt động; `saveBoss()` = `save('eng.boss.v1', bossProg)`. Đồng bộ có thể **thay hẳn object** `bossProg` (`applySyncPayload`), nên mọi nơi ghi tiến trình phải đọc `bossProg` **tại thời điểm ghi**, không giữ tham chiếu cũ.

## Đồng bộ Pháp Sư Lexoria (js/boss-progress-sync-merge.js · sync-merge.js · cloud-sync-engine.js)

`eng.boss.v1` đi qua đúng đường ống đồng bộ dùng chung với SRS/giáo án/cài đặt (`sync-merge.js`: `mergeSync`, `sanitizePayload`, `toPayload`, `fromPayload`; `cloud-sync-engine.js`: `localPayload`, `applySyncPayload`). `boss-progress-sync-merge.js` nạp **trước** `sync-merge.js` và `app-storage.js`; hai file kia gọi `emptyBoss`/`cleanBoss`/`mergeBoss` qua `bossApi()` (require ở Node server, global ở trình duyệt).

Luật gộp từng trường của `mergeBoss(a, b)` (giao hoán, kết hợp, idempotent, không bao giờ ném với dữ liệu rác):
- `xp`: lấy **max** (chấp nhận mất XP nếu 2 máy cùng chơi offline trong ngày; ghi dạng tuyệt đối `xp = max(xp, xpLúcVàoTrận + xpTrậnNày)` nên idempotent).
- `wins` (`{date: beat}`): hợp theo từng ngày, cùng ngày lấy `beat` lớn hơn; giữ 400 ngày gần nhất.
- `day` (vết thương trận dở): ngày lớn hơn thắng; cùng ngày → `beat` lớn hơn; cùng ngày + beat → `dmg` max. Client giữ `day` **local** nếu bản đồng bộ mang ngày tương lai (`f.boss.day.date > dkey()`) — cùng lý do với guard `day` (task hằng ngày) đã có sẵn ở `applySyncPayload`.
- `alloc` (điểm cây kỹ năng): **max theo từng nhánh** — không có cơ chế trừ điểm nên bậc chỉ tăng, gộp max luôn an toàn.
- `gender`, `element` (`{v, ts}`): mốc `ts` lớn hơn thắng cả khối; hoà thì so `v` để tất định.
- `buffDate`: lấy chuỗi lớn hơn (ngày gần nhất đã đạt buff Ôn từ).

**Hợp đồng CHỈ TIẾN**: một khi đã phát hành, `boss` không bao giờ bị gỡ khỏi `sanitizePayload`/`mergeSync` phía server — gỡ sẽ xoá `boss` của **mọi** tài khoản trên DB ở lần sync kế tiếp (server chạy `sanitizePayload` trên cả bản đã lưu lẫn bản mới trước khi ghi lại). **Rollback chỉ làm ở client**: gỡ `'boss'` khỏi `GAME_IDS` (`js/word-games.js`) để ẩn chip, hạ `APP_VERSION`/`CACHE`; trường `boss` vẫn đi qua sync vô hại (không ai đọc/ghi nó nữa).

`switchOwner(username, replace)` (`cloud-sync-engine.js`) mang `boss` sang tài khoản mới **giống hệt SRS**: `replace=false` (gộp) giữ nguyên `bossProg` hiện có để gộp với dữ liệu tài khoản ở lần sync kế; `replace=true` (dùng dữ liệu tài khoản) gọi `resetLocalToDefaults()` → `bossProg = emptyBoss()` rồi để dữ liệu server thắng hoàn toàn khi gộp (đây là hành vi chủ ý, không phải thiếu sót).

Backup (Tải backup / Khôi phục, `js/app-shell.js` + `js/word-import.js`) mang thêm trường `boss: bossProg`. Khôi phục **luôn gộp** `bossProg = mergeBoss(bossProg, cleanBoss(j.boss, Date.now()))` — cả khi đã đăng nhập lẫn chưa, khác với SRS/giáo án/cài đặt (các trường đó bị **thay** bằng backup). Vì vậy backup cũ hơn hoặc thiếu `boss` không bao giờ làm tụt cấp/xoá tiến trình Pháp sư. Nút "Xoá tiến độ" (`app-shell.js`) chỉ xoá SM-2 (`srs`, `gameMiss`) — không đụng `bossProg`, giống cách nó không đụng `gameScore`.

## Sprite Pháp Sư Lexoria (Ninja Adventure — pixel-boy & AAA, CC0)

Toàn bộ hình vẽ trận (pháp sư, quái, trùm, VFX, sân đấu) và chân dung DOM (sảnh, màn chọn, thẻ truyện, Nhật ký,
cây kỹ năng) đều dùng sprite từ gói **Ninja Adventure**, không còn hình vẽ tay canvas. Đường ống:
1. Gói gốc (~109MB) nằm ở `assets/ninja-adventure/` — chỉ để tra cứu, không nằm trong sw.js, server không phục vụ. `tools/copy-boss-sprites.js` copy tay
   đúng sheet dùng thật (đổi tên kebab-case, phẳng vào `img/boss/{actor,fx,tile}/`) — chạy lại khi cần thêm sheet.
2. `js/boss-game-sprite-atlas.js` khai báo `BOSS_SPRITES` (khoá → `{src, fw, fh, anims}`), cắt khung qua
   `spriteFrame`/`drawSprite` (canvas, `imageSmoothingEnabled=false`, toạ độ làm tròn, scale số nguyên).
3. `js/boss-game-sprite-actors.js` (trận, canvas) + `js/boss-game-dragon-composite.js` (trùm cuối ghép 5 mảnh)
   vẽ pháp sư/quái mỗi khung, bù chuyển động thiếu khung bằng code (nhún, lao, nháy trắng, tan pixel).
4. `js/boss-game-arena.js` dựng sân đấu 4 vùng từ tileset; `js/boss-game-tier3-ultimate-fx.js` lo trận đồ/VFX
   tuyệt kỹ/cắt cảnh Faceset; `js/boss-game-portrait-ui.js` lo chân dung idle nhỏ ở sảnh/màn chọn.
5. Story/Journal/cây kỹ năng dùng thẳng `<img>` Faceset/icon (`image-rendering: pixelated`, `css/paper-theme.css`)
   với `src` lấy từ bảng hằng (`BOSS_MONSTERS[].face`, `img/boss/fx/icon-<hệ>[-disabled].png`), không phải hình vẽ.
6. Mọi ảnh nằm trong `sw.js` ASSETS (offline PWA); `tests/boss-game-sprite-atlas.test.js` + `boss-game-story.test.js`
   kiểm khung không tràn ảnh và mọi ảnh có trên đĩa + trong `sw.js`.

## Thuật toán ôn (js/srs-scheduler.js)

- **SM-2**: q = {😵0, 😓3, 🙂4, 😎5}. `ef' = ef + 0.1 − (5−q)(0.08 + (5−q)0.02)`, sàn 1.3. Khoảng cách: lần 1 = 1 ngày, lần 2 = 3, sau `round(ivl×ef)`, 😎 ×1.3. Quên: ivl=1, ef−0.2, state `relearn`.
- **Learning steps**: từ `new/learning/relearn` chấm ≥😓 → quay lại sau 4 thẻ; đúng 2 lần liên tiếp trong phiên (hoặc 😎) mới ra lịch ngày. Đếm trong `session.streak` (RAM).
- **Hàng đợi**: thẻ đến hạn xếp quá hạn lâu nhất trước, cắt `maxSession`; từ mới xen sau mỗi 3 thẻ ôn.
- **So khớp mờ**: từ ≥5 ký tự chấp nhận lệch 1 ký tự (Levenshtein), cụm từ so từng token.

## Game từ vựng (js/word-games.js · word-game-rounds.js · word-game-ui.js · plane-game-*.js · fruit-game-*.js)

5 game ngắn vào từ hàng chip đầu tab Ôn từ. Lấp 3 chỗ 5 dạng kiểm tra không chạm tới:

| Game | Luyện | Thể thức | Mở khi |
|---|---|---|---|
| `scramble` Xếp chữ | chính tả, không cần bàn phím | 10 từ/ván, không đồng hồ | ≥8 từ đã học có nghĩa, dài 3–14 ký tự |
| `sprint` Chạy 60 giây | phản xạ nhanh | 60s, từ → chọn nghĩa, combo | ≥8 từ đã học có nghĩa |
| `cloze` Điền câu tốc độ | từ nào hợp câu nào | 60s, câu khoét lỗ → chọn từ, combo | ≥8 từ đã học có `context` chứa chính từ đó |
| `planes` Bắn máy bay | nhớ chủ động + chính tả | kiểu ZType trên canvas: mỗi chữ cái đúng = 1 viên đạn, chữ cuối nổ; 3 mạng, tăng tốc mỗi 5 lần hạ | ≥8 từ đã học có nghĩa |
| `fruit` Chém chữ | phân biệt từ na ná | kiểu Fruit Ninja: đề nghĩa Việt, vuốt chém 1 quả đúng giữa bom na ná; 3 mạng, tăng tốc mỗi 5 lần đúng | ≥8 từ đã học có nghĩa, ≤16 ký tự |

**Ranh giới cứng: game không ghi gì vào SM-2.** Không gọi `applyGrade`, không đụng `ef/ivl/due/state/reps/lapses/hist`. Lý do: một ván 60s ≈ 25 lượt, đoán mò 4 đáp án đúng 25% → lịch ôn phình sai chỉ sau vài ván. Điểm cũng không vào `hist` nên tỉ lệ nhớ 7/30 ngày vẫn phản ánh ôn thật.

Kênh duy nhất từ game sang engine ôn là **danh sách từ sai**: `flushMiss()` nhét id lên đầu `queue` đang chạy và lưu ra `eng.gamemiss.v1`; `buildQueue(deck, srs, cfg, now, miss)` đẩy chúng lên đầu phiên ở lần dựng hàng đợi kế (lọc bỏ id đã biến mất khỏi bộ hoặc chưa học, không nhân đôi). `consumeGameMiss()` dọn khoá sau khi đã vào hàng đợi.

- Chọn từ: trọng số `1 + lapses × 2` → từ hay quên ra nhiều hơn.
- Đang chơi: `syncGameChrome()` giấu hàng chip và bảng thống kê, vì cả hai là anh em của `#app` nên không bị game vẽ đè; bấm vào chúng giữa ván sẽ đổi hàng đợi hoặc nuốt mất từ sai.
- Đồng hồ dùng mốc tuyệt đối `endsAt`, không cộng dồn mỗi tick → khoá màn hình giữa ván vẫn hết đúng giờ. `stopGameTimer()` chạy trong cả `endGame()` lẫn `closeGame()`.
- Bỏ ván giữa chừng: không lưu điểm, không tăng `plays`, **vẫn lưu từ sai**. `startGame()` luôn `closeGame()` trước để không bao giờ bỏ rơi một ván đang chạy.
- Mỗi ván có `game.seq`; `setTimeout` chờ sang câu kế so lại `seq` trước khi chạy, nếu không callback của ván cũ sẽ lái ván mới.

### Bắn máy bay (kiểu ZType, Canvas 2D)

- **Logic thuần** (`plane-game-logic.js`), thế giới tính bằng px của khung (`st.w × st.h`), mọi ngẫu nhiên đi qua tham số `rand` → test tất định. `resizePlaneState` co giãn vị trí/vận tốc khi bàn phím bật/tắt.
- Loại mục tiêu theo số chữ cái (bỏ dấu cách): ≤4 thiên thạch (xoay, nảy mép), 5–8 tàu địch (lượn sóng + kéo dần về phía tàu mình), ≥9 tàu mẹ. Thời gian rơi × `0.65 + 0.075 × số chữ` × ngẫu nhiên ±10% → từ dài có nhiều thời gian hơn.
- Nhắm bắn (`plane-game-typing.js`): **người chơi tự chọn từ, game không chọn thay**. `st.typed` là chuỗi chữ cái đang gõ; ứng viên = mục tiêu còn sống có `letters` bắt đầu bằng `typed` (mọi ứng viên hiện tiến độ + vòng ngắm mờ). Mỗi chữ: lấy **đuôi dài nhất** của `typed + c` còn khớp đầu một từ nào đó (gõ "ca" rồi "d" → chuyển sang "dog", không cần Enter). Còn ≥ 2 ứng viên → `st.lock = null`, viên đạn là **đạn chờ** (`held`: lơ lửng thành hàng trên tàu, `hoverHeld`); còn đúng 1 (hoặc gõ trọn từ mà không còn từ dài hơn cùng đầu) → khoá, `releaseHeld` cho mọi đạn chờ lao vào. Đạn đang dẫn vào mục tiêu bị loại (đổi ý) chuyển sang mục tiêu mới hoặc về chờ. `settleHeld` mỗi bước: ứng viên còn 1 do mục tiêu khác biến mất → bắn vào nó; hết ứng viên → đạn chờ tan. Enter: trùng trọn một từ (`give` khi có `give up`) → hạ từ đó; không thì xoá chuỗi, đạn chờ tan. Không khớp gì: đạn lệch, **không trừ điểm/combo**; sai `PLANE_WRONG_TO_MISS` = 3 chữ trên mục tiêu đang khoá → vào `miss`. Mục tiêu đã `doomed` chạm khiên vẫn tính là hạ.
- Cấp độ (`PLANE_DIFFICULTIES` easy/normal/hard): `fall` (giây rơi của từ 5 chữ ở đợt 0), `start`/`cap` (số mục tiêu), `speedup` mỗi đợt 5 lần hạ, `gap` xuất hiện, `hint` (Dễ: dòng tiến độ hiện sẵn chữ đầu). Chọn trên màn Bắt đầu, lưu `cfg.planeLevel` (có trong backup), không đổi giữa ván. Kỷ lục: `planeScoreKey` → Vừa giữ khoá cũ `planes`, còn lại `planes-easy` / `planes-hard`; `endGame()` dùng `game.scoreKey || game.id` nên 3 game khác không đổi.
- Mỗi viên trúng: `vy -= BULLET_KICK·h` (giật lên, trần `-cruise`, không vượt mép trên), sau đó `vy` hồi về tốc độ hành trình → chuyển động có quán tính, không đều đều. Đạn còn đang đuổi mục tiêu không bao giờ bị xoá (nếu xoá, `pending` treo và từ gõ xong không nổ).
- Tàu mình (`moveShip`): lò xo kéo về x của mục tiêu đang khoá (`SHIP_SPRING`, giảm chấn hơi dưới tới hạn → trượt quá chút rồi dừng), trần tốc độ, kẹp trong mép. `bank` tỉ lệ vận tốc ngang → phần vẽ nghiêng thân, co cánh, kéo dài lửa động cơ. Hết mục tiêu: chỉ còn giảm chấn nhẹ, trôi chậm dần rồi đứng tại chỗ.
- Logic trả mảng sự kiện `fire | hit | explode | shield`; `plane-game-effects.js` biến thành hạt (tối đa 500, giảm 60% khi `prefers-reduced-motion`), sóng xung kích, chớp, rung, chữ tiếng Anh bay lên. Nền tinh vân vẽ sẵn vào canvas phụ mỗi lần đổi cỡ.
- Nhãn: vế nghĩa trước `;`, giữ ghi chú trong ngoặc ("một (mạo từ không xác định)"), tối đa 50 ký tự, tự xuống dòng khi vẽ (cache theo mục tiêu trong `WeakMap`).
- Ô gõ ẩn: mỗi ký tự trong sự kiện `input` = 1 phát bắn, rồi xoá ô; bỏ qua khi IME đang soạn (`isComposing`, xử lý ở `compositionend`). Canvas theo `devicePixelRatio` (tối đa 2).
- Dùng chung object `game`: `syncPlaneGame()` chép `score/right/wrong/streak/bestStreak/miss` sang `game` → `endGame()`/`flushMiss()` dùng chung. `game.stop = stopPlaneLoop` được `stopGameTimer()` gọi → huỷ rAF, gỡ listener, gỡ `html.game-lock`.
- iOS: khung `position:fixed` đặt `top/height` theo `visualViewport`; `focus()` gọi đồng bộ trong handler chạm "Bắt đầu"/"Chơi tiếp"; `blur`/`visibilitychange` → tạm dừng (dừng hẳn rAF). `#app` nằm trong `.wrap` (z-index 1) nên giấu tabbar khi chơi. Esc: ô gõ tự bắt để tạm dừng/tiếp; `app-shell` gọi `togglePlanePause()` thay vì `quitGame()` (trừ màn kết thúc).

### Chém chữ (kiểu Fruit Ninja, Canvas 2D)

- **Logic thuần** (`fruit-game-logic.js`), px của khung, ngẫu nhiên qua `rand`. Đợt = 1 quả đúng + `count − 1` bom (Dễ 3 · Vừa 4 · Khó 5 quả), xáo vào làn ngang chia đều, xuất phát lệch nhau ≤ 0,25s. Mỗi quả bay đúng `air / speedup^level` giây: đỉnh ở 25–40% chiều cao, trọng lực suy từ độ cao cần lên. Đợt xong + mọi quả rời màn → nghỉ 0,4s rồi đợt mới.
- **Bom chỉ lấy từ đã học** (`gamePool(deck, srs, 'fruit')`), bỏ từ trùng nghĩa/trùng chữ với đích. Vừa/Khó `lookAlikeWords`: Levenshtein ≤ max(2, ⌊len×0,4⌋) hoặc chung ≥ 3 chữ đầu, xếp theo khoảng cách rồi cùng `pos`; thiếu thì lùi về cùng `pos` + độ dài ±2, rồi bất kỳ. Dễ: `randomDecoys`.
- **Chấm theo nhát**: `sliceSegment` (đoạn ≥ 8px) cắt quả ngay về hình (`split`) và ghi vào `stroke.hits`; `endStroke` (nhả tay, hoặc tự gọi khi nhát > 0,6s) chấm: có bom → `wrong` (−1 ❤️, `miss`, `confusions['đích|bom']++`, quả đúng `reveal`), chỉ quả đúng → `right` (10 × `comboMult` × 2 nếu đợt vàng + 5 nếu < 1s từ lúc xuất hiện). Quả đúng rơi qua đáy khi đợt còn mở → `drop` (−1 ❤️, `miss`). Mọi kết quả đều kết thúc đợt. Đợt vàng: từ đích `lapses ≥ 2` → **cả đợt** viền vàng (chỉ tô quả đúng là lộ đáp án).
- UI (`fruit-game-ui.js`): pointer events trên canvas, `passive:false` + `preventDefault`, `setPointerCapture`, `getCoalescedEvents` để nhát nhanh không lọt quả; chỉ nhận khi `started && !paused`. `speak()` từ đúng khi chém đúng và khi lộ đáp án. `syncFruitGame()` chép `score/right/wrong/streak/bestStreak/miss/confusions` sang `game`; `game.stop = stopFruitLoop` (huỷ rAF, đếm ngược, listener, `html.game-lock`). `visibilitychange`/⏸/Esc → tạm dừng (dừng hẳn rAF). Cấp lưu `cfg.fruitLevel`, kỷ lục `fruitScoreKey`.
- `endGame()` dùng chung thêm khối "Bạn hay nhầm" chỉ khi `game.confusions` có dữ liệu (top 5) → 4 game khác không đổi.

`wordRx(word, flags)` trong `js/word-games.js` là hàm khớp-từ-trong-câu dùng chung: chặn biên hai đầu (`art` không khớp trong `smart`), cho đuôi chia thường gặp (`reckon` khớp `reckoned`), chạy được trên chuỗi đã escape HTML (từ chứa `&`). `blanked()` của màn ôn và bộ lọc pool `cloze` cùng dùng nó nên luôn đồng ý với nhau. `blanked()` thay **mọi** lần xuất hiện — câu lặp từ mà chỉ che lần đầu là lộ đáp án.

## Chọn dạng kiểm tra (js/review-mode-picker.js)

| state / ivl | pool |
|---|---|
| new, learning, relearn | type |
| review < 7 | type, dictation |
| review 7–30 | mcq, owncloze, dictation |
| review > 30 | speak, owncloze |

Lọc: mcq cần ≥8 từ; owncloze cần câu bước 5 có chứa từ; dictation cần giọng TTS. Không lặp `lastMode`. Rỗng → type.

## Luồng thẻ

Từ mới: 1 ngữ cảnh (nghĩa Việt giấu) → 2 mã hoá kép → 3 gõ từ → 4 chấm → (requeue | 5 output). Từ ôn: 3 (dạng đã chọn) → 4 → 5. Câu ở bước 5 lưu `sentences` (5 câu) và trở thành nguyên liệu owncloze.
