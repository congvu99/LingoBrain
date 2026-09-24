---
phase: 1
title: "Logic thuần: toán phép, trận đấu, nguyên tố, tiến trình, sanitize/merge + test"
status: completed
priority: P1
dependencies: []
---

# Phase 1: Logic thuần + test

## Overview
Toàn bộ luật chơi, nhịp trận và dữ liệu tiến trình dưới dạng hàm thuần chạy được trong Node. Không DOM, không localStorage. Là chỗ duy nhất cân bằng số và chỗ duy nhất quyết định thời điểm (render chỉ vẽ theo `events[]`).

## Requirements
- Functional: bậc chiêu tương đối; sát thương theo tốc độ + khắc hệ + nguyên tố; trận đấu với đồng hồ, ❤️, Nộ, typo, bỏ, chậm thời gian, khoá cắt cảnh, trễ va chạm; cây nguyên tố; XP/cấp/điểm; trận hôm nay/beat kế; buff Ôn từ; sanitize + merge `boss` giao hoán/kết hợp/idempotent, **không bao giờ ném lỗi**.
- Non-functional: tất định khi truyền `rand`; file < 200 dòng; không đụng DOM ở top-level; `boss-progress-sync-merge.js` không phụ thuộc file game nào (server `require` qua `sync-merge.js`).

## Architecture

### `js/boss-progress-sync-merge.js` (IIFE kiểu `sync-merge.js`: gắn `globalThis` + `module.exports`)
```js
BOSS_ELEMENTS = ['fire','ice','storm','earth','wind']    // NGUỒN DUY NHẤT; boss-game-elements.js đọc lại
BOSS_BEATS = 28; BOSS_ENDLESS = 28; WINS_KEEP = 400; WINS_SCAN = 800
emptyBoss() → { v:1, xp:0, wins:{}, day:null, alloc:{}, gender:{v:'f',ts:0}, element:{v:'fire',ts:0}, buffDate:'' }
cleanBoss(x, now)   // TỔNG: mọi đầu vào (null, string, array, object hỏng) → object hợp lệ
  xp: num 0..1e9
  wins: isObj → Object.keys(x).slice(0, WINS_SCAN) TRƯỚC mọi xử lý; key DATE regex, không BANNED,
        ≤ ngày(now)+2; value int 0..28; giữ WINS_KEEP ngày mới nhất (sort key giảm dần)
  day: DATE, ≤ +2 ngày, beat int 0..28, dmg num 0..1e7, không hợp lệ → null
  alloc: chỉ key ∈ BOSS_ELEMENTS, int 0..3 (KHÔNG kiểm theo điểm/XP)
  gender: {v ∈ {m,f} || 'f', ts: stamp(ts, now)} · element: {v ∈ BOSS_ELEMENTS || 'fire', ts: stamp}
  buffDate: DATE ≤ +2 ngày || ''
  field lạ bị bỏ
mergeBoss(a, b)     // TỔNG: cleanBoss-coerce kiểu nhẹ (isObj/num) bên trong, không ném
  xp: max · wins: hợp key, cùng key → beat max, cắt WINS_KEEP mới nhất
  day: date lớn hơn; cùng date → beat lớn hơn; cùng date+beat → dmg max
  alloc: max theo nhánh · gender/element: ts lớn hơn thắng (hoà → so v theo chuỗi, tất định)
  buffDate: max chuỗi
```
Dùng lại mẫu `num/int/stamp/DATE/BANNED` — định nghĩa lại cục bộ trong IIFE (không phụ thuộc thứ tự nạp), hoặc chuyển các helper nhỏ này vào file merge rồi `sync-merge.js` dùng chung (chọn cách ít sửa `sync-merge.js` nhất; không được làm đổi hành vi hiện có).

### Sửa `js/sync-merge.js` (cộng thêm, hợp đồng chỉ tiến)
- Chú thích hợp đồng thêm `boss`; `SYNC_KEYS` thêm `'eng.boss.v1'`.
- Lấy hàm **lúc gọi**: `const bossApi = () => typeof module !== 'undefined' && module.exports ? require('./boss-progress-sync-merge.js') : root;` (vm test có `require` nhưng không có `module` → đi nhánh `root`).
- `mergeSync` trả thêm `boss: bossApi().mergeBoss(a.boss, b.boss)`; `sanitizePayload` thêm `boss: bossApi().cleanBoss(p.boss, now)`; `toPayload`/`fromPayload` mang `state.boss`.
- Thiếu `boss` một bên = `emptyBoss()` → `mergeBoss(x, empty)` ≡ `x` (test) để client cũ không làm mất `boss` trên server.

### `js/boss-game-spell-math.js`
```js
BOSS_TUNING = { hp:{minion:250, boss:500}, tierBase:[0,10,20,40], tierShare:[0.3,0.4],   // 30% ✦✦✦, 40% ✦✦
  speed:{baseMs:1500, perLetterMs:350}, clock:{easy:12, normal:10, hard:8}, rageMax:8,
  impactMs:[0,250,450,800], endDelayMs:900, slowScale:0.35, slowIdleMs:1500, slowCapPerLetterMs:1200,
  weakMul:1.5, xpPerDmg:0.5, xpStoryWin:100, buffXpMul:1.5 }
wordDifficulty(rec, letters)   // 2·lapses + 2·(ef<2) + 3·(state≠'review') + max(0,(21−ivl)/7) + (letters≥10)
assignTiers(words, srs)        // xếp theo độ khó giảm dần (hoà → id), gán 3/2/1 theo tierShare → Map id→tier
speedMult(ms, letters, loosen=0)   // mốc=(base+perLetter·letters)·(1+loosen); ≤mốc/2 → 2; ≥mốc → 1; tuyến tính
spellDamage({tier, speed, weakHit, mods, crit})
bossPromptKey(w)               // emoji + '|' + nghĩa chuẩn hoá (lowercase, gộp khoảng trắng)
buildBossPool(pool)            // bỏ từ có nghĩa chứa chính nó (≥3 chữ, so normalizeTyped);
                               // nhóm theo bossPromptKey → [{key, prompt, answers:[normalizeTyped(word)...], ids}]
bossWordWeight(rec)            // 1 + 2·lapses + 2·(ef<2) + 2·(state≠'review') — truyền vào pickGameWords(…, weightFn)
```
Sửa `pickGameWords(pool, srs, n, rand, weightFn)` (`js/word-games.js:56`): `weightFn` tuỳ chọn, mặc định giữ `1 + lapses·2` → caller cũ không đổi.

### `js/boss-game-elements.js`
```js
ELEMENT_RANKS[el][1..3]    // bảng brainstorm §3.3; key lấy từ BOSS_ELEMENTS
modifiersFor(alloc, activeEl)
  // nội tại (bậc 1–2) mọi nhánh đã cộng đều bật; trường phái chỉ đổi màu phép, khắc hệ, tuyệt kỹ (nếu bậc 3)
  // → {dmgMul, burn:{dps,sec}, clockAdd, freezeChance, freezeSec, speedLoosen, fastCrit,
  //    maxHeartsAdd, shield, hintFirst, typoForgive, ultimate: id|null}
pointsLeft(level, alloc)   // max(0, level−1 − Σalloc)
canRankUp(alloc, el, level)   // bậc kế đúng thứ tự, còn điểm
```

### `js/boss-game-logic.js` — `createBattle({monster, groups, tiers, mods, hearts, difficulty, carryDmg, rand, now})`
```
st = { phase:'play'|'won'|'lost', hp, hpMax, hearts, clock, clockMax, timeScale, rage,
       group (đề hiện tại), typed, typos, readyAt (ms thật, đề tương tác được), pausedMs,
       lastGoodKeyAt, slowUsedMs, lockUntil, pendingImpacts:[], shield, frozenUntil, burn, ultimate,
       dealt (sát thương đã gây trận này), log:[], miss:[], events:[] }
typeKey(st, ch, now)      // trong lock → bỏ qua; chữ khớp tiền tố của ≥1 answer → tiến, lastGoodKeyAt=now;
                          // sai → typos++ (Gió tha 1/từ → 'typoForgiven'); typos≥3 → 'fizzle', miss += ids nhóm
castComplete(st, now)     // 'cast'{element,tier,dmg,impactAt} → pendingImpacts; rage+1; lock ngắn tới impact
giveUp(st, now)           // 'giveup' lộ đáp án, miss, rage = max(0, rage−2)
useUltimate(st, now)      // rage≥rageMax && ultimate → 'ultimate'{id}, lockUntil = now+1500 (thời gian thật)
pause(st, now) / resume(st, now)   // cộng pausedMs, giữ readyAt đúng
stepBattle(st, dtReal, now)
  // lock: đồng hồ, DoT dừng; hết lock → đề kế readyAt = now
  // timeScale → slowScale nếu typed>0 && now−lastGoodKeyAt<slowIdleMs && slowUsedMs < cap·letters; else → 1 (lerp 8/s)
  // clock −= dt·timeScale (trừ khi frozenUntil>now — Kỷ băng hà 8s và freeze 3s tính THỜI GIAN THẬT)
  // clock≤0 → 'bossAttack' → shield? 'shieldBlock' : hearts−1 'hurt'; reset clock
  // burn DoT 'burnTick'; pendingImpacts tới hạn → trừ hp 'impact'; hp≤0 tại impact → 'won' sau endDelayMs
  // hearts≤0 → 'lost'
```
Danh sách `events[]` đầy đủ (render/UI chỉ tiêu thụ): `key, typo, typoForgiven, fizzle, hint, cast, impact, fastCrit, burnTick, freeze, unfreeze, bossAttack, shieldBlock, hurt, rageFull, ultimate, ultimateEnd, giveup, next, won, lost`.

### `js/boss-game-progress.js`
```js
xpForLevel(n) · levelFromXp(xp)       // mốc cộng dồn 100·(1+…+(n−1))
nextBeat(b)                           // beat nhỏ nhất 0..27 không có trong values(wins); tất cả có → BOSS_ENDLESS
todayBattle(b, date)                  // wins[date] có → {kind:'practice'} ; else beat=nextBeat → story|endless,
                                      // carryDmg = day khớp (date, beat) ? day.dmg : 0; bỏ qua wins ngày > date
recordProgress(b, {date, beat, carryDmg, dealt, xpAtStart, earned, won, story})
                                      // tuyệt đối + max: xp=max(xp, xpAtStart+earned); story: day.dmg=max(…, carry+dealt);
                                      // won && story → wins[date]=beat; idempotent (gọi nhiều lần = 1 lần)
huntStreak(wins, today)               // chuỗi ngày liên tiếp có key, kết thúc hôm nay hoặc hôm qua; bỏ ngày tương lai
reviewDoneToday(srs, now, date)       // có hist.t trong ngày && 0 thẻ state==='review' && due<=now
reviewBuff(b, srs, now, date)         // buffDate===date || reviewDoneToday → true (caller chốt buffDate=date)
storySegments(text, deck, srs)        // '{id}' → {t:'word', word, learned}; id không có → text thường
```
Ghi chú: sửa trực tiếp object truyền vào; UI luôn truyền global `bossProg` lúc ghi (không giữ tham chiếu cũ).

## Related Code Files
- Create: `js/boss-progress-sync-merge.js`, `js/boss-game-spell-math.js`, `js/boss-game-elements.js`, `js/boss-game-logic.js`, `js/boss-game-progress.js`
- Create: `tests/boss-progress-sync-merge.test.js`, `tests/boss-game-spell-math.test.js`, `tests/boss-game-logic.test.js`, `tests/boss-game-progress.test.js`
- Modify: `js/sync-merge.js`, `js/word-games.js` (`pickGameWords` `weightFn`; `gamePool` nhánh `'boss'`: đã học + có `meaning`), `tests/sync-merge.test.js`, `tests/word-games.test.js`, `tests/run-tests.js`, `tests/run-tests.html`

## Implementation Steps
1. `boss-progress-sync-merge.js` + test:
   - giao hoán, kết hợp, idempotent trên ví dụ ngẫu nhiên có seed;
   - `mergeBoss(x, emptyBoss()) ≡ x`; payload thiếu `boss` giữ `boss` bên kia qua `mergeSync`;
   - rác hai phía (`null`, `'x'`, `[]`, `{wins:{}}`, `{xp:null}`, `{day:{beat:'constructor'}}`, `__proto__`) → không ném, ra object hợp lệ;
   - `wins` 1e6 key sanitize < 50ms; ngày tương lai > +2 bị loại; `alloc` {fire:99, hack:1} → {fire:3};
   - 2 máy offline cùng thắng beat 5 khác ngày → hợp → `nextBeat` = 6 (không nhảy cóc); lệch đồng hồ +1 ngày.
2. Sửa `sync-merge.js`; toàn bộ test sync cũ xanh không đổi.
3. `boss-game-spell-math.js` + test: `assignTiers` với fixture "người mới học" (mọi ivl < 21) vẫn ra đủ 3 bậc theo tỉ lệ; `speedMult` biên; `buildBossPool` gộp phone/telephone cùng nghĩa, loại `piano`, `January` khớp `january`.
4. `pickGameWords` `weightFn` + test caller cũ không đổi kết quả với cùng `rand`.
5. `boss-game-elements.js` + test: từng nhánh bậc 1–3, `pointsLeft`, `canRankUp` đúng thứ tự.
6. `boss-game-logic.js` + test: gõ đúng → cast → impact trễ → hp giảm tại impact; thắng chỉ sau impact + trễ; 3 typo → fizzle + miss; Gió tha; giveUp; chữ sai không giữ chậm thời gian; trần chậm mỗi từ; đồng hồ **không chạy** khi lock (tuyệt kỹ với 0,8s đồng hồ + 1 ❤️ → không mất ❤️); phím trong lock bị bỏ; `readyAt` sau lock + trừ pause; khiên, freeze (`rand` cố định, thời gian thật), burn; Nộ + tuyệt kỹ.
7. `boss-game-progress.js` + test: cấp tại 0/99/100/300/2800; `todayBattle` 3 nhánh + carry; `recordProgress` gọi 2 lần = 1 lần; streak qua ngày trống, bỏ ngày tương lai; `reviewDoneToday` với thẻ learning còn lại → vẫn true, thẻ review đến hạn 20h → false trước 20h thì true; `storySegments`.
8. Thứ tự `PURE_MODULES` (`tests/run-tests.js`): `js/boss-progress-sync-merge.js` **đầu tiên**, rồi các file cũ, rồi (sau `plane-game-text.js` và `word-games.js`) `boss-game-spell-math.js` → `boss-game-elements.js` → `boss-game-logic.js` → `boss-game-progress.js`. `tests/run-tests.html` thêm đúng thứ tự: `boss-progress-sync-merge.js` trước `sync-merge.js`; `word-games.js`, `plane-game-text.js` trước các file boss; kèm file test mới.
9. `node tests/run-tests.js` xanh; mở `tests/run-tests.html` xanh.

## Success Criteria
- [x] Mọi test mới + cũ xanh (Node + trình duyệt).
- [x] `mergeBoss` giao hoán/kết hợp/idempotent/tổng (không ném với rác) có test.
- [x] Client cũ (không `boss`) gộp với server có `boss` → giữ nguyên `boss`.
- [x] Đồng hồ trùm không chạy trong khoá; thắng không xảy ra trước khi phép chạm.
- [x] Fixture người mới học ra đủ 3 bậc chiêu.
- [x] Không file nào đụng `applyGrade` / ghi `srs`.

## Risk Assessment
- Hợp đồng sync dùng chung server: sai → server 500 cho mọi sync của user. Giảm: `cleanBoss`/`mergeBoss` tổng + test rác + test hiệu năng.
- Hợp đồng chỉ tiến: sau khi phát hành không gỡ `boss` khỏi sanitize/merge. Rollback = client gỡ chip.
- Số cân bằng chỉ nằm trong `BOSS_TUNING`; đổi số không làm hỏng dữ liệu đã lưu (không có giá trị nào được kiểm theo đường cấp ở server).

## Ghi chú triển khai (2026-09-24)
- Xong, 399 test Node xanh (từ 311); mô phỏng thứ tự nạp của run-tests.html cũng xanh. Review: `plans/reports/from-code-reviewer-to-main-260924-1514-mage-lexoria-phase-01-pure-logic-review-report.md`.
- Khác spec:
  - pause/resume đổi tên thành `pauseBattle`/`resumeBattle`, helper nội bộ có tiền tố `boss*` để khỏi đụng global.
  - Test hiệu năng `wins` 1e6 key: đổi `<50ms` thành `≤ 3× chi phí Object.keys`, vì riêng việc liệt kê đã ~260ms; body sync bị giới hạn 10MB.
  - Hoà `ts` ở gender/element: xếp theo (ts, v≠mặc định, v) để `mergeBoss(x, emptyBoss()) ≡ x` đúng cả khi ts=0.
  - `buildBossPool` chỉ so với phần nghĩa hiển thị (planeLabel), không so cả `meaning`.
  - `stepBattle` kẹp dt ≤ 250ms.
- Thêm theo quyết định user:
  - Kéo sớm từ P6 về đây: `index.html` nạp `boss-progress-sync-merge.js` trước `sync-merge.js`, `sw.js` ASSETS có file này. Chưa bump version (để P6). Lý do: sync trên trình duyệt ném lỗi nếu thiếu file.
  - Đáp án là tiền tố của đáp án khác (south/southern): hoãn niệm. Niệm khi phím kế không đi tiếp (phím đó bị nuốt), khi Enter (`submitTyped`), khi bấm Bỏ, hoặc sau `prefixWaitMs` 400ms không gõ.
  - Lốc xoáy = nạp lại đồng hồ trùm (giữ).
- Phím tới đúng lúc hết khoá được áp cho đề mới ngay (`bossCanAct`/`bossEndLock`).
- Phase 5 phải chặn `createBattle` khi groups rỗng. P6 lo `b.day` mang ngày tương lai (client giữ day local).
