# Review Phase 1 — Pháp Sư Lexoria (logic thuần + test)

## Phạm vi
- Mới: js/boss-progress-sync-merge.js (103), js/boss-game-spell-math.js (85), js/boss-game-elements.js (52), js/boss-game-logic.js (170), js/boss-game-progress.js (93), 4 file test.
- Sửa: js/sync-merge.js (198 dòng, sát trần 200), js/word-games.js, tests/run-tests.{js,html}, tests/word-games.test.js.
- `node tests/run-tests.js`: 382 pass / 0 fail. Chưa chạy run-tests.html trên trình duyệt (không có browser).
- Kiểm thêm bằng sim vm (scratchpad): fuzz 5000 bộ merge, sync không nạp file boss, pool trên words.json thật, các ca pause/ultimate/dt lớn.

## Đánh giá chung
Logic gọn, đúng spec phần lớn. Merge giao hoán/kết hợp/idempotent đạt trên fuzz (cả input sạch lẫn rác). 1 lỗi chặn deploy (trình duyệt), 3 lỗi mức trung bình.

## Critical / chặn deploy
**C1. sync trình duyệt ném lỗi nếu chưa nạp boss-progress-sync-merge.js** — js/sync-merge.js:18,101,168
- index.html:145 chỉ nạp sync-merge.js; sw.js ASSETS cũng không có file boss. Plan dời script tag sang phase 2/6.
- Sim: `mergeSync` → `TypeError: bossApi(...).mergeBoss is not a function`; `sanitizePayload` tương tự. cloud-sync-engine.js:127 gọi mergeSync → **mọi lần sync của mọi user hỏng** nếu commit/deploy phase 1 riêng lẻ.
- Test không bắt được vì PURE_MODULES và run-tests.html nạp file boss trước.
- Sửa: thêm `<script src="js/boss-progress-sync-merge.js">` ngay trước index.html:145 + đưa vào `ASSETS` trong sw.js + bump CACHE/APP_VERSION **ngay trong commit phase 1** (hoặc ít nhất không deploy trước khi làm). Thêm test pwa-assets/index script order nếu có sẵn mẫu.

## Medium
**M1. Đáp án là tiền tố của đáp án khác → niệm sớm, phím thừa thành lỗi gõ ở đề sau** — js/boss-game-logic.js:45
- words.json thật có 8 nhóm: south/southern, north/northern, east/eastern, action/act, second/secondly, relationship/relation, lab/laboratory, camp/camping.
- Sim gõ "southern" 150ms/phím: cast tại "south", sau khoá 250ms (✦) 'r','n' rơi vào đề kế → 2 typo (thêm 1 là fizzle + miss oan). Tốc độ cũng đo trên từ ngắn.
- Sửa (chọn 1): (a) khi `typed` khớp target nhưng còn target dài hơn bắt đầu bằng nó → hoãn cast đến phím kế không tiếp tục được / idle ~400ms (xử lý trong stepBattle); (b) buildBossPool tách từ tiền tố sang nhóm riêng hoặc bỏ đáp án ngắn; (c) sau cast, nuốt các phím tiếp tục đúng từ dài hơn cho tới khi hết khoá + một khoảng ngắn.

**M2. `mergeBoss(x, emptyBoss()) ≢ x` khi ts=0 và v nhỏ hơn mặc định theo chuỗi** — js/boss-progress-sync-merge.js:82
- `element {v:'earth', ts:0}` gộp với empty → 'fire' ('earth' < 'fire'). Fuzz: 255/5000 ca vi phạm identity (test hiện chỉ dùng ts=5).
- Chỉ an toàn nếu UI luôn ghi ts>0 khi chọn — invariant ngầm, chưa có ở đâu.
- Sửa: thứ tự toàn phần (ts, v≠def, v): hoà ts → ưu tiên giá trị khác mặc định rồi mới so chuỗi. Vẫn giao hoán/kết hợp/idempotent (max trên thứ tự toàn phần), và emptyBoss là phần tử nhỏ nhất → identity đúng. Thêm case ts=0 vào fuzz test.

**M3. Loại từ quá tay: so trên TOÀN nghĩa thay vì nhãn hiển thị** — js/boss-game-spell-math.js:66-67
- Đề hiển thị = planeLabel (vế trước ';'), nhưng kiểm tra lộ đáp án dùng cả `w.meaning`. 26 từ bị loại, trong đó không lộ gì trên đề: there ("ở đó"), rock ("đá, tảng đá"), chip ("khoai tây chiên"), yard ("sân"), flash ("lóe sáng").
- Sửa: `mean = normalizeTyped(planeLabel({ meaning: w.meaning }))`.

## Low
- **L1** cleanBoss ném `RangeError` khi `now` không hữu hạn (okDate → toISOString) — js/boss-progress-sync-merge.js:21. "Tổng" chỉ theo `x`. Server truyền Date.now() nên ổn; nên `now = isFinite(now) ? now : Date.now()` cho app-storage phase 2.
- **L2** stepBattle với dt lớn (tab nền 30s, không pause) chỉ trừ 1 ❤️ rồi reset đồng hồ — js/boss-game-logic.js:153-155. Phụ thuộc UI gọi pauseBattle khi visibilitychange; nên kẹp `dtMs` (vd ≤100) trong logic.
- **L3** Lệch đồng hồ: `b.day` có ngày tương lai (máy khác) → recordProgress không ghi dmg hôm nay — js/boss-game-progress.js:44. Chấp nhận được, ghi chú.
- **L4** Test thiếu: tuyệt kỹ iceAge/chain/revive/tornado (chỉ có meteor), pause trong khoá/khi có pendingImpacts/khi đang freeze. Sim cho thấy hành vi đúng (pendingImpacts + lockUntil dời đúng, iceAge dừng đồng hồ 8s thật) — nên đóng thành test. Perf test dựa tỉ lệ wall-clock → có thể flaky khi GC.
- **L5** `burnTick.dmg` báo dps chứ không phải dmg thực đã kẹp — js/boss-game-logic.js:164 (nit hiển thị).
- **L6** createBattle với `groups` rỗng ném (gi = NaN) — js/boss-game-logic.js:25-27. Caller phase 5 phải chặn (buildBossPool có thể nhỏ hơn pool vì loại/gộp).

## Kiểm tra theo yêu cầu
(a) Tiêu chí phase 1:
- mergeBoss giao hoán/kết hợp/idempotent/tổng: ĐẠT (test + fuzz 5000 sạch và rác, 0 vi phạm). Identity: ĐẠT với dữ liệu ts>0; lỗi ở ts=0 (M2).
- Client cũ không boss → server giữ boss: ĐẠT (test + sim qua sanitize→mergeSync).
- Đồng hồ không chạy trong khoá: ĐẠT (return trước khi trừ clock/burn, logic.js:137). Thắng không trước impact: ĐẠT (hp chỉ giảm ở bossApplyImpacts/burn, burn chỉ bật sau impact; won sau endDelayMs).
- Newbie 3 bậc: ĐẠT (xếp hạng tương đối, hoà → id).
- Không ghi srs/applyGrade: ĐẠT (grep js/boss-*.js sạch).
(b) sync-merge.js: diff chỉ cộng thêm `boss` + gom capHistory 1 dòng (hành vi y hệt); test sync cũ xanh. pickGameWords: 2 caller (word-game-ui.js:67, word-game-rounds.js:55) truyền 4 tham số → nhánh mặc định y hệt; có test so sánh cùng rand. fruit-game-* không gọi pickGameWords.
(c) Payload thêm `boss`: đúng thiết kế chỉ tiến; toPayload `clone(undefined)` → null → server cleanBoss → empty → giữ boss server. Rủi ro duy nhất là C1.
(d) Không trùng tên top-level giữa js/*.js + tests/*.test.js (quét tự động). Mọi file < 200 dòng (sync-merge.js 198 — hết chỗ, lần sửa sau phải tách).
(e) Máy trạng thái: pause/resume dời readyAt/lastGoodKeyAt/lockUntil/frozenUntil/wonAt/pendingImpacts đúng; trần chậm theo độ dài từ dài nhất đúng; lock ép timeScale=1; rage cap đúng; boost meteor ×3 / chain ×2 (hits chỉ để vẽ). Progress: recordProgress idempotent (max tuyệt đối); todayBattle lọc wins tương lai; huntStreak dùng dịch ngày UTC trên chuỗi (không lệch DST); reviewDoneToday dùng ngày local.

## Sai lệch có chủ ý
- pauseBattle/resumeBattle: CHẤP NHẬN (tránh tên global chung chung). Cập nhật spec.
- Perf 1e6 key "≤3× Object.keys": CHẤP NHẬN. Sort/lọc đã bị chặn bởi WINS_SCAN; liệt kê O(n) không tránh được, cùng lớp rủi ro với cleanMap srs sẵn có; body cap 10MB (~≤600k key) + rate limit.
- Tornado = nạp lại clockMax: CHẤP NHẬN (hiểu nghĩa đen "về 0" = trùm đánh ngay, vô lý cho tuyệt kỹ). Lưu ý cân bằng: yếu hơn hẳn Kỷ băng hà (8s). Sửa câu chữ trong spec/brainstorm.
- Hoà ts=0 so chuỗi: tất định nhưng phá identity → xem M2.

## Hành động đề xuất
1. C1: script tag + sw.js ASSETS + bump version trong cùng commit (bắt buộc trước khi deploy).
2. M2: đổi tie-break mergePick, thêm case ts=0 vào fuzz.
3. M1: chọn cách xử lý đáp án tiền tố + test "southern".
4. M3: kiểm tra lộ đáp án trên planeLabel.
5. L1/L2/L4 khi làm phase 2.

## Câu hỏi mở
- Tornado: xác nhận ý đồ thiết kế (reset nạp đòn) và có cần buff (vd +thêm giây) để cân với Kỷ băng hà?
- M1: ưu tiên UX nào — hoãn niệm cho từ dài, hay chỉ giữ một đáp án trong nhóm tiền tố?
- C1: có định deploy/commit phase 1 độc lập không? Nếu có, bắt buộc kéo script tag về phase 1.

Status: DONE_WITH_CONCERNS
Summary: Logic và merge đạt tiêu chí phase 1 (fuzz sạch), nhưng sync trình duyệt sẽ vỡ nếu deploy trước khi index.html/sw.js nạp boss-progress-sync-merge.js; thêm 3 lỗi trung bình (tiền tố đáp án, identity ts=0, loại từ quá tay).

## Xác minh lại sau sửa (396/0)
- C1, M2 (fuzz ident 0/5000), M3 (loại 20 từ, đều lộ đáp án trên nhãn), L1, L2, L5: ĐẠT. M1 sim: 3 đáp án lồng nhau (go/good/goodness) gõ đủ hoặc dừng giữa + idle → đúng; armed + phím sai → niệm ngắn, nuốt phím; pause khi armed → dời đúng; lock không mang armed qua đề kế.
- Mới (Low): armedAt=0 làm cờ → gõ xong đáp án ngắn đúng lúc now=0 thì không bao giờ armed (logic.js:47); dùng `now || 1e-9` như pauseBattle.
- Mới (Low): giveUp khi đang armed → tính miss dù đã gõ đúng (logic.js:93); nên niệm hoặc UI luôn đi qua submitTyped.
- Có sẵn từ trước (Low): phím tới đúng lúc hết khoá nhưng trước stepBattle kế → so với đề CŨ, bị tính typo và mất phím đầu (logic.js:38,157-161). Sửa: tách bossEndLock(st, now) gọi ở đầu typeKey/submitTyped/giveUp/useUltimate.
