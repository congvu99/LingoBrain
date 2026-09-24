---
title: "LingoBrain — Game Pháp Sư Lexoria (đấu trùm RPG, niệm chú bằng gõ từ)"
status: in-progress
created: 2026-09-24
mode: hard (không spawn researcher — brainstorm đã chốt thiết kế; red-team đã chạy)
source: plans/reports/brainstorm-260924-1426-mage-lexoria-boss-rpg-game-report.md
blockedBy: []
blocks: []
---

# LingoBrain — Game ⚔️ Pháp Sư Lexoria

Chip thứ 6 trong "Chơi nhanh". Pháp sư (nam/nữ) đánh quái theo cốt truyện 4 chương × 7 trận. Đề = `emoji + nghĩa Việt`; **gõ đúng từ = niệm chú**. Từ càng khó (so với các từ khác của chính người chơi) → chiêu càng lớn (3 bậc); gõ càng nhanh → sát thương càng cao; đang gõ thì thời gian chậm lại. Trùm đánh theo đồng hồ liên tục. Lên cấp → điểm vào cây 5 nguyên tố (Lửa·Băng·Sét·Đất·Gió). Tối đa 1 trận cốt truyện/ngày; ngoài ra Luyện phép lấy XP. **Không ghi SM-2**, chỉ đẩy từ sai qua `gameMiss`.

## Ràng buộc chung

- Static, không bundler, script global, nạp theo thứ tự trong `index.html`. **Mọi** file code < 200 dòng; chỉ `boss-game-story.js` và `boss-game-spell-presets.js` là dữ liệu thuần (không hàm) được dài hơn.
- Logic thuần riêng, test bằng `node tests/run-tests.js` (thêm vào `PURE_MODULES` + `tests/run-tests.html`, đúng thứ tự phụ thuộc). File DOM/canvas không test tự động.
- **Không đụng `applyGrade` / `ef` / `ivl` / `due` / `hist` / `eng.srs.v2`** — chỉ đọc `srs`.
- Thêm file → `<script>` trong `index.html` + `ASSETS` trong `sw.js`; bump `APP_VERSION` (`js/app-storage.js`) và `CACHE` (`sw.js`) khớp nhau: `2.13.2` → `2.14.0`.
- Canvas + `requestAnimationFrame`, DPR ≤ 2, trần hạt 300, tự hạ chất lượng khi FPS < 45.
- Server chạy `sanitizePayload` **trên cả bản đã lưu lẫn bản gửi lên** rồi ghi lại (`server/auth-and-sync-routes.js:99-101`) → `boss` phải nằm trong hợp đồng payload v1. **Hợp đồng chỉ tiến**: một khi đã phát hành, không bao giờ gỡ `boss` khỏi `sanitizePayload`/`mergeSync` (gỡ = xoá `boss` của mọi tài khoản trên DB). Rollback chỉ làm ở client (gỡ chip).
- Mọi text động đưa vào DOM (từ/nghĩa từ API, truyện, tên quái, danh sách từ sai, số trên chip, giá trị đồng bộ/khôi phục) đi qua `esc()` (`js/app-storage.js:17`) hoặc `textContent`; class/attribute chỉ lấy từ whitelist; attribute luôn nháy kép.

## Phases (thứ tự làm: 1 → 2 → 4 → 5 → 3 → 6)

| # | Phase | File | Depends | Status |
|---|---|---|---|---|
| 1 | Logic thuần: toán phép, trận đấu, nguyên tố, tiến trình, sanitize/merge + test | [phase-01-pure-battle-progress-and-sync-logic.md](phase-01-pure-battle-progress-and-sync-logic.md) | — | completed |
| 2 | Trận tối thiểu + lưu tiến trình + hub tối giản + chip; hạt dùng chung, chậm thời gian, pháp sư, phép bậc 1 | [phase-02-battle-shell-particles-and-slow-motion.md](phase-02-battle-shell-particles-and-slow-motion.md) | 1 | pending |
| 3 | Phép bậc 2–3, 5 tuyệt kỹ, hiệu ứng nội tại | [phase-03-tier-spells-ultimates-and-passive-fx.md](phase-03-tier-spells-ultimates-and-passive-fx.md) | 2 | pending |
| 4 | Quái (5 dáng → 12 con), nền vùng, dữ liệu 28 đoạn truyện, thẻ truyện, Nhật ký | [phase-04-monsters-regions-and-story.md](phase-04-monsters-regions-and-story.md) | 1, 2 | pending |
| 5 | Hub đầy đủ: chọn pháp sư, cây nguyên tố, trường phái, buff Ôn từ, kết trận, luồng truyện | [phase-05-hub-skill-tree-and-battle-flow.md](phase-05-hub-skill-tree-and-battle-flow.md) | 2, 4 | pending |
| 6 | Tích hợp: sync/backup, bảng người dùng hợp đồng, PWA, docs, cân bằng, FPS iPhone | [phase-06-integration-sync-pwa-docs-balance.md](phase-06-integration-sync-pwa-docs-balance.md) | 3, 5 | pending |

**Cắt khẩn cấp:** 1 → 2 → 5 → 6, bỏ 3 và 4 = bản chơi được với 1 quái mặc định, không thẻ truyện, mọi bậc chiêu dùng preset bậc 1 phóng to (fallback nằm sẵn trong dữ liệu preset).

## Danh sách file (chốt, không có file "tuỳ chọn")

```
THUẦN (test Node, thứ tự PURE_MODULES)
js/boss-progress-sync-merge.js IIFE dùng chung server: BOSS_ELEMENTS, BOSS_BEATS, emptyBoss, cleanBoss, mergeBoss
                               (nạp TRƯỚC sync-merge.js và app-storage.js)
js/boss-game-spell-math.js     BOSS_TUNING · độ khó từ · bậc tương đối trong pool · hệ số tốc độ · sát thương · pool nhóm đồng nghĩa
js/boss-game-elements.js       ELEMENT_RANKS (dùng BOSS_ELEMENTS) → modifiers; tuyệt kỹ; điểm còn lại
js/boss-game-logic.js          máy trạng thái trận: đồng hồ, timeScale, lock, gõ/typo/bỏ, độ trễ va chạm, Nộ, DoT, freeze, events[]
js/boss-game-progress.js       đường cấp · trận hôm nay/beat kế · ghi idempotent · chuỗi ngày · buff Ôn từ · storySegments
js/game-particles.js           DÙNG CHUNG: pool hạt burst/step (tách từ plane-game-effects.js), draw nhận ctx, rand tiêm được
DỮ LIỆU
js/boss-game-story.js          vùng, 12 quái, 28 đoạn truyện ({id} = từ trong bộ)
js/boss-game-spell-presets.js  opts burst theo hệ × bậc + tuyệt kỹ + nội tại + fallback bậc
CANVAS
js/boss-game-spell-art.js      trận đồ, thiên thạch, tia sét, cột băng, gai đá, lốc
js/boss-game-mage-art.js       pháp sư nam/nữ: idle, chant (rune), cast, hurt
js/boss-game-monster-art.js    drawMonster + pose/palette/hiệu ứng trúng đòn, đóng băng
js/boss-game-monster-shapes.js 5 dáng: humanoid, beast, wraith, flyer, dragon
js/boss-game-scene.js          nền 4 vùng (offscreen), hậu kỳ chậm thời gian, rung/loé
js/boss-game-render.js         ghép khung hình từ state + fx
DOM
js/game-viewport-fit.js        DÙNG CHUNG: co khung theo visualViewport (tách từ fitPlaneGame, Bắn máy bay dùng lại)
js/boss-game-ui.js             khung trận, input ẩn + phím, rAF, tạm dừng, lưu tiến trình khi ẩn/đóng
js/boss-game-hub-ui.js         hub, màn lần đầu, thẻ truyện, Nhật ký
js/boss-game-skill-tree-ui.js  cây nguyên tố + chọn trường phái
js/boss-game-result-ui.js      màn kết trận (XP, lên cấp, outro, từ sai)
TEST
tests/boss-progress-sync-merge.test.js · tests/boss-game-spell-math.test.js · tests/boss-game-logic.test.js
tests/boss-game-progress.test.js · tests/boss-game-story.test.js · tests/game-particles.test.js
SỬA
js/sync-merge.js · js/cloud-sync-engine.js · js/cloud-sync-account-ui.js · js/app-storage.js · js/app-shell.js
js/word-import.js · js/word-games.js · js/word-game-ui.js · js/plane-game-effects.js · js/plane-game-ui.js
index.html · sw.js · css/paper-theme.css · README.md · docs/system-architecture.md
tests/sync-merge.test.js · tests/cloud-sync-engine.test.js · tests/word-games.test.js · tests/run-tests.js · tests/run-tests.html
```

Dùng lại: `normalizeTyped`, `isFixedTyped`, `typedLetters`, `progressFor`, `skipFixed` (`plane-game-text.js`); `pickGameWords` (thêm tham số `weightFn`), `gamePool`, `addMiss` (`word-games.js`); `game`, `gameSeq`, `flushMiss()`, `readyCountdown()` (`word-game-ui.js`); `speak()`; `dkey()`, `esc()`, `load()/save()` (`app-storage.js`); mẫu `num/int/stamp/DATE/BANNED` của `sync-merge.js`.

## Quyết định kỹ thuật (chốt)

| Vấn đề | Chốt |
|---|---|
| Dữ liệu `eng.boss.v1` | `{v:1, xp, wins:{date:beat}, day:{date,beat,dmg}\|null, alloc:{el:0..3}, gender:{v,ts}, element:{v,ts}, buffDate}` — **không có deviceId** |
| XP | Một số, gộp **max** (đúng brainstorm). Chấp nhận mất XP khi 2 máy cùng chơi offline trong ngày. Ghi dạng tuyệt đối `xp = max(xp, xpLúcVàoTrận + xpTrậnNày)` → idempotent |
| Cây kỹ năng | `alloc` gộp **max theo từng nhánh** (không có reset điểm → bậc chỉ tăng); `cleanBoss` chỉ kiểm dạng (nhánh ∈ BOSS_ELEMENTS, 0..3), không kiểm theo điểm; UI tính điểm còn = `level−1 − Σalloc` kẹp ≥ 0 |
| Giới tính / trường phái | Mỗi cái `{v, ts}` riêng, bản `ts` lớn hơn thắng (`ts` kẹp bằng `stamp`). **Lần đầu** = `gender.ts === 0`; đang đăng nhập mà chưa sync thành công phiên này → hub chờ sync (hoặc lỗi/offline) rồi mới hiện màn chọn |
| Tiến truyện | `wins:{date: beat}` (beat 0..27; 28 = vô tận). Cùng ngày → beat lớn hơn. Beat kế = beat nhỏ nhất 0..27 chưa có trong giá trị. Hôm nay đã thắng = có key hôm nay. Bỏ qua ngày > hôm nay. Giữ 400 ngày gần nhất |
| Vết thương trận | `day:{date, beat, dmg}` ngày lớn hơn thắng (ngày > +2 bị loại khi sanitize; client giữ `day` local nếu bản đồng bộ có ngày > `dkey()`); cùng ngày+beat → dmg max; cùng ngày khác beat → beat lớn hơn. Ghi dạng tuyệt đối `dmg = max(dmg, mangTheo + gâyTrongTrận)` |
| Lưu giữa trận | Ghi XP + vết thương khi `visibilitychange` (ẩn), `pagehide`, `game.stop` (đổi tab/←) và kết trận — idempotent nhờ dạng tuyệt đối + max |
| Buff Ôn từ | Điều kiện: có `hist.t` hôm nay **và** 0 thẻ `state==='review' && due<=now` (không tính từ mới). Lần đầu đạt trong ngày → chốt `buffDate = hôm nay` (gộp max) → giữ cả ngày |
| Bậc chiêu | Điểm độ khó `2·lapses + 2·(ef<2) + 3·(state≠review) + max(0,(21−ivl)/7) + (chữ≥10)`; xếp hạng **trong pool của người chơi**: 30% khó nhất ✦✦✦, 40% giữa ✦✦, còn lại ✦ |
| Đề trùng nghĩa | Pool nhóm theo `emoji + nghĩa` chuẩn hoá → gõ từ nào trong nhóm cũng đúng; loại từ có nghĩa chứa chính nó (piano, taxi…); đích chuẩn hoá bằng `normalizeTyped` |
| Tốc độ | Thời gian thật từ lúc đề **tương tác được** (sau cắt cảnh/khoá) → chữ cuối, trừ thời gian tạm dừng |
| Chậm thời gian | `timeScale → 0.35` khi đã gõ ≥1 chữ đúng và chữ đúng cuối < 1500ms; chữ sai không làm mới; trần chậm mỗi từ = `1,2s × số chữ` thời gian thật, quá thì về 1 |
| Khoá / cắt cảnh | `lockUntil` (tuyệt kỹ 1,5s, độ trễ va chạm): đồng hồ trùm **dừng**; phím trong lúc khoá bị bỏ, ô input xoá; đề kế hiện sau khoá |
| Va chạm | Sát thương tính khi `impact` (trễ 250/450/800ms theo bậc), thắng khi HP ≤ 0 tại `impact` + trễ kết 900ms |
| Phím | Xử lý trong `input.onkeydown`: Esc tạm dừng, Enter khi chưa gõ = Bỏ, **Shift+Enter = tuyệt kỹ**; mọi nút trong trận chặn `mousedown/touchstart` để không mất focus |
| `game` | Mỗi **trận** một `game` mới (`seq = ++gameSeq`); hub dùng `game` riêng; không qua `endGame`/`gameScore`; màn kết đặt `game.over = true`; `MISS_MAX` 10 giữ như mọi game |
| Xoá tiến độ / khôi phục | Nút "Xoá tiến độ" **không** xoá tiến trình Pháp sư (user chốt). Khôi phục backup luôn **gộp** `mergeBoss` (đăng nhập hay không) (user chốt) |
| Rollback | Chỉ client: gỡ `'boss'` khỏi `GAME_IDS`. Server giữ nguyên `boss` trong hợp đồng |

## Red Team Review

### Session — 2026-09-24
**Findings:** 15 sau gộp (từ 37 thô của 4 reviewer) — 15 accepted, 0 rejected (một số gợi ý phụ bị bác, ghi ở cột Ghi chú)
**Severity breakdown:** 1 Critical, 9 High, 5 Medium

| # | Finding | Severity | Disposition | Applied To |
|---|---|---|---|---|
| 1 | Khởi tạo `bossProg` trước khi `emptyBoss` được nạp → trắng app; thứ tự PURE_MODULES/run-tests.html | Critical | Accept | Plan, P1, P2, P6 |
| 2 | XP G-counter + deviceId mất XP qua backup/reset/cap không tất định | High | Accept → quay về `xp` max theo brainstorm, bỏ deviceId (bác gợi ý `_old`/cap 64 vì không còn cần) | Plan, P1, P6 |
| 3 | Cây kỹ năng trong khối LWW + "lần đầu = ts 0" xoá cây trên máy khác | High | Accept → `alloc` max theo nhánh, gender/element LWW riêng, chờ sync lần đầu | Plan, P1, P5 |
| 4 | `cleanBoss` thiếu trường, ngày tương lai, DoS mảng lớn, `mergeBoss` ném lỗi dừng sync, backup rác | High | Accept | Plan, P1, P6 |
| 5 | Mất vết thương/XP khi SW reload lúc ẩn, iOS kill, đổi tab | High | Accept | Plan, P2, P5 |
| 6 | Vòng đời `game`/seq, `endGame`, sync thay global giữa trận, sót người dùng hợp đồng | High | Accept | Plan, P2, P5, P6 |
| 7 | Buff Ôn từ chập chờn theo giờ và thẻ learning | High | Accept → điều kiện mới + chốt `buffDate` | Plan, P1, P5 |
| 8 | Ngưỡng bậc tuyệt đối làm bậc 1 gần như không có tháng đầu; bản cắt thiếu preset | High | Accept → bậc tương đối trong pool + fallback preset | Plan, P1, P2, P3 |
| 9 | Đề trùng nghĩa / lộ đáp án / chữ hoa làm sai oan và bẩn `gameMiss` | High | Accept | Plan, P1 |
| 10 | Rollback theo plan xoá `boss` mọi tài khoản trên DB | High | Accept → hợp đồng chỉ tiến, rollback client | Plan, P1, P6 |
| 11 | Bản cắt khẩn cấp không build được; vòng tiến trình xếp sau hiệu ứng | Medium | Accept → lưu tiến trình + chip ở P2, P5 phụ thuộc [2,4] (bác phần dời chế độ vô tận — rẻ, giữ) | Plan, P2, P5, P6 |
| 12 | Nhịp trận ngoài logic thuần (đồng hồ chạy lúc cắt cảnh, thắng trước khi phép chạm), lách chậm thời gian, phím bị input nuốt | Medium | Accept | Plan, P1, P2, P3 |
| 13 | `beat = wins.length` nhảy cóc trận khi 2 máy offline | Medium | Accept → `wins:{date:beat}` | Plan, P1 |
| 14 | Không có quy tắc escape cho DOM mới; host tĩnh không CSP | Medium | Accept quy tắc escape (bác thêm meta CSP — ngoài phạm vi) | Plan, P4, P5, P6 |
| 15 | Bộ máy hạt/fit viewport thứ 3, file "tuỳ chọn", tiêu chí không kiểm được | Medium | Accept | Plan, P2, P3, P6 |

### Whole-Plan Consistency Sweep
Đã rà `plan.md` + 6 phase sau khi sửa: bỏ mọi nhắc `deviceId`/G-counter/`prefs` gộp/`spell-director`/file tuỳ chọn/`wins` dạng mảng/`deckSummary().due===0`/ngưỡng `ivl<21` tuyệt đối; thứ tự script và PURE_MODULES ghi đầy đủ ở P6; phụ thuộc phase cập nhật ở bảng và frontmatter. Không còn mâu thuẫn chưa giải.

## Câu hỏi mở
- Tên chính thức của game (tạm chip "Pháp sư", hub "Pháp Sư Lexoria").
- 28 đoạn truyện: Claude soạn nháp, user duyệt (P4).
- Có cần nút reset điểm kỹ năng không (hiện không có — nếu thêm phải đổi luật gộp `alloc` max).
