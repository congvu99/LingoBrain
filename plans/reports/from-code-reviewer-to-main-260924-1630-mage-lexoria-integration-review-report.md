# Review nhánh integration-mage (c1bee31..HEAD) — Pháp Sư Lexoria P3/P4/P5 + chỉnh tích hợp

Status: DONE_WITH_CONCERNS
Summary: Merge sạch (thứ tự script, sw.js ASSETS khớp index.html, không trùng global, không gọi hàm không tồn tại, 419/419 test xanh, mọi file code < 200 dòng). Có 1 lỗi High lộ ra mỗi lần thắng trận truyện (XP hiển thị thiếu thưởng thắng; ẩn app trong 700ms cuối thì báo nhầm "máy khác đã thắng" + mất outro) và 1 lỗi Medium về quái ngẫu nhiên ở Vô tận (hub/cây hiển thị sai quái, vết thương mang sang quái khác → có thể thắng chỉ bằng 1 đòn).

## Phạm vi
- 24 file, +1129/−79. Commit: 10c23e0 (P3), 65adea7 (P5), d538445 (P4), 3 merge, ecb5e79 (cân bằng + 2.14.0).
- Đã kiểm: `node tests/run-tests.js` → 419 passed, 0 failed. Script kiểm global trùng (lấy mọi file trong index.html) → không có. So index.html với sw.js ASSETS → không thiếu, không thừa.
- Chạy lại logic thật bằng vm (spell-math + progress + merge) để xác nhận lỗi H1 (số liệu bên dưới).

## (a) Merge / nạp script — OK
- Hằng dùng lúc nạp: `BOSS_MONSTER_SHAPES` (monster-art) cần shape* → monster-shapes nạp trước: OK. Presets tự định nghĩa `BOSS_TIER3_CIRCLE_COLOR`/`BOSS_TIER3_CUSTOM`: OK. tier3-ultimate-fx chỉ dùng preset lúc gọi: OK.
- Không còn chỗ dùng `bossTempMonster`/`showStoryCard`; `refreshBossHub` gọi từ cloud-sync-account-ui.js:125 (có guard typeof).
- run-tests.js/html: đã thêm presets + story + story test, thứ tự hợp lệ.

## High

### H1. Màn kết tính lại `bossDupWin` SAU khi đã ghi win → XP hiển thị thiếu thưởng thắng; ẩn app lúc sắp hiện màn kết → báo "máy khác đã thắng", mất outro
- js/boss-game-result-ui.js:77-80: `persistBattle(ui)` ghi `wins[date]` rồi mới gọi `earned = bossEarned(ui)`; `bossEarned` (dòng 58-61) gọi `bossDupWin` (dòng 55) → `todayBattle` lúc này đã trả `practice` → `isStoryWin = false`.
- Đã tái hiện bằng vm: dealt 1000, thắng beat 0 → XP thật ghi 200, màn kết hiện **+100 XP** (thiếu xpStoryWin, có buff thì thiếu 150). Xảy ra với MỌI lần thắng truyện/vô tận. Dữ liệu không hỏng (recordProgress lấy max), nhưng hiển thị sai.
- Biến thể nặng hơn: phase chuyển 'won' → chờ BOSS_END_DELAY 700ms (boss-game-ui.js:139-141). Trong khoảng đó listener `visibilitychange`/`pagehide` (boss-game-ui.js:56-57) vẫn gọi `persistBattle` → ghi win. Khi quay lại, showBossResult tính `dup` (result-ui.js:73) = true → note "Máy khác đã thắng trận này hôm nay", **không hiện outro**, XP hiển thị thiếu thưởng. Chính là trường hợp "trùng máy khác" báo nhầm.
- Sửa: chốt kết quả 1 lần khi trận kết. Ví dụ trong `persistBattle`, lần đầu gặp `st.phase !== 'play'` thì lưu `ui.final = { dup: bossDupWin(o), earned: bossEarned(ui) }` (trước khi gọi recordProgress); các lần gọi sau và `showBossResult` dùng `ui.final.dup`/`ui.final.earned` thay vì tính lại. Nên có test thuần: persist 2 lần rồi hiện màn kết → dup=false, earned có thưởng.

## Medium

### M1. Vô tận/Luyện phép: quái ngẫu nhiên mỗi lần gọi → hub/cây hiển thị sai quái; vết thương Vô tận mang sang quái khác (thắng 1 đòn)
- js/boss-game-story-journal-ui.js:18-26: `bossPickMonster` dùng `Math.random` khi beat ngoài 0..27. Được gọi riêng ở hub (hub-ui.js:38), cây (skill-tree-ui.js:16), trận (boss-game-ui.js:28) → 3 quái khác nhau.
  - Hub Vô tận hiện "Goblin · 1000 HP · còn X%" nhưng vào trận gặp quái khác; cây nguyên tố "Trùm hôm nay sợ hệ" đổi mỗi lần mở (Luyện phép cũng bị).
  - `todayBattle` trả `carryDmg` cho beat 28 (progress.js:33); `createBattle` đặt `hp = max(1, hpMax − carry)` (logic.js:11). Thua Oblivion (2000) sau khi gây 1500 → trận Vô tận kế bốc Goblin (1000) → HP = 1 → thắng ngay, nhận xpStoryWin + tính chuỗi ngày.
- Sửa: rand tất định theo ngày cho beat ngoài truyện (vd. hash chuỗi `date` → seeded PRNG), truyền cùng `date` từ `bossTodayOpts` cho hub, cây và trận; hoặc chốt `monsterId` vào `opts`/`bossProg.day` lúc bắt đầu và chỉ áp `carryDmg` khi cùng quái. Luyện phép có thể giữ ngẫu nhiên nhưng cây không nên ghi "trùm hôm nay" khi kind = practice.

### M2. docs/system-architecture.md lỗi thời sau khi tách file
- docs/system-architecture.md:41-53: thiếu `boss-game-scene.js`, `boss-game-tier3-shapes.js`, `boss-game-tier3-ultimate-fx.js`, `boss-game-first-run-ui.js`, `boss-game-story-journal-ui.js`; dòng hub-ui vẫn ghi "màn lần đầu, thẻ truyện, Nhật ký" (đã tách ra); spell-art ghi vẽ thiên thạch/tia sét (nay ở tier3). Sửa: bổ sung 5 dòng, đúng thứ tự nạp.

## Low
- L1. `refreshBossHub` (hub-ui.js:91-93) chỉ xét `game.stop === stopBossHub`; cây nguyên tố/nhật ký/màn chọn giới tính vẫn dùng game hub → sync về giữa chừng sẽ kéo người dùng khỏi cây về hub, hoặc reset lựa chọn Nữ/Nam về 'f'. Sửa: cờ màn hiện tại (`game.screen = 'hub'|'tree'|'gender'`), chỉ vẽ lại khi 'hub' (hoặc vẽ lại đúng màn đang mở).
- L2. boss-game-ui.js:24-26: `game.stop()` của hub đã bị gọi rồi mới `toast` khi `!groups.length` → game hub mất `stop`, hub không còn được refresh sau sync. Sửa: kiểm `groups` trước khi dừng game cũ.
- L3. `BOSS_TUNING.hp.boss` (spell-math.js:7) không được đọc — `bossMonsterHp` (story-journal-ui.js:6) = `hpMul × hp.minion`. Chỉnh hp.boss không có tác dụng. Sửa: `m.hpMul >= 2 ? hp.boss : hp.minion`, hoặc bỏ `hp.boss`.
- L4. Reduced-motion chưa đủ theo spec (tắt rung, giảm loé): tier3-ultimate-fx.js:219 loé tuyệt kỹ không giảm khi `fx.reduced` (impact có ×0.4); lốc nâng quái (dòng 229-234) và chân dung trượt vào (dòng 270) không kiểm reduced.
- L5. Phủ băng vẽ 2 lần (monster-art.js:29-32 và tier3-ultimate-fx.js:255-260) — trùng, chọn 1 chỗ.
- L6. Comment lỗi thời: spell-art.js:6 ("bossFxTier3*" — tên thật là bossFxSpawnCircle/Custom/UltimateEvent, stepBossTier3Fx); story.js:2 ("logic tra cứu nằm ở boss-game-hub-ui.js" — nay ở story-journal-ui); tier3-ultimate-fx.js:59 ("drawTempMonster" đã bỏ). Ngoài phạm vi diff: cloud-sync-account-ui.js:124 có "phase 5" trong comment (trái rule Stable Code Artifacts).
- L7. Spec phase 4 chưa đủ (điểm user duyệt, không chặn): quái "ra đòn" chỉ nghiêng người, chưa lao tới; "chết tan thành hạt màu palette" đang dùng tia vàng chung (spell-art 'won').
- L8. Văn truyện: vài chỗ ghép sai từ loại, đọc gượng: "trong bóng {silent}", "vẻ {silent}", "cái {frozen} chết chóc", "cảm giác {quiet}", "hơi thở dần {silent}", "Dân làng thở phào, {return} về nhà". Nên dùng danh từ (silence, quiet…) hoặc đổi câu.

## Các mục đã kiểm, không có lỗi
- (b) Lần đầu: `gender.ts === 0` → chờ sync khi đã đăng nhập và đang online (status idle/syncing), poll 500ms, dọn interval ở stopBossHub; sync về có gender → vào thẳng hub. Buff chốt `buffDate` ở cả hub và lúc bắt đầu trận. Cây: `canRankUp` kiểm trước và sau hộp xác nhận (confirm chặn luồng nên sync không chen vào được), alloc chỉ tăng, không reset; trường phái `{v, ts: Date.now()}`, whitelist BOSS_ELEMENTS. `refreshBossHub` không đụng trận (game trận có stop = stopBossBattle, màn kết stop = null). `bossDupWin` chặn ghi wins trùng (đúng về dữ liệu; lỗi hiển thị ở H1). Outro chỉ khi thắng truyện và không trùng (nhưng xem H1). Đánh lại/Luyện phép dùng `bossTodayOpts` đọc lại tiến trình.
- (c) Chỉ ghi qua `recordProgress(bossProg, …)` + `saveBoss()`, luôn đọc global `bossProg` lúc ghi; ngoài ra chỉ ghi `buffDate`/`gender`/`alloc`/`element` + saveBoss, đúng spec. Không ghi srs (chỉ đọc trong reviewBuff/storySegments).
- (d) XSS: tên quái, truyện, từ, note, nhãn hệ đều qua `esc()` (escape cả `"` nên dùng trong attribute an toàn) hoặc textContent/fillText; `data-tier`/`data-state`/`data-el`/`data-diff` lấy từ whitelist/hằng số.
- (e) Trần 300 hạt có test preset thật (vượt 300 khi xin); quality 0.5 khi FPS < 45; nền offscreen build lại theo w/h/dpr/vùng; tuyệt kỹ: logic khoá `now + ultimateMs (1500)`, cắt cảnh sống 1,5s theo dtReal và bị xoá bởi event `ultimateEnd` → không lệch dù khung hình giật; trận đồ sống đúng thời gian bay.
- (f) Test story: đủ 28 đoạn, mọi {id} có trong words.json, trùm mỗi chương hpMul 2 và đúng khắc hệ. Từ chưa học chỉ hiện chữ tiếng Anh, không kèm nghĩa.
- (g) Dòng code: boss-game-ui 193, logic 199, còn lại < 150; spell-presets 208 (dữ liệu). Không trùng tên global.

## Việc nên làm (theo thứ tự)
1. H1: chốt `dup`/`earned` khi trận kết (+ test).
2. M1: chọn quái tất định theo ngày cho Vô tận/Luyện phép; áp carry chỉ khi cùng quái.
3. M2: cập nhật docs/system-architecture.md.
4. L1–L4 khi rảnh; L6 dọn comment.

## Câu hỏi còn mở
- Truyện hiện từ tiếng Anh (kể cả từ chưa học) ngay trên hub trước trận, câu tiếng Việt quanh đó gần như dịch luôn từ → người chơi có thể thấy đáp án của đề ngay trước khi vào trận. Đây là chủ đích "cài từ" hay cần ẩn từ đang có trong pool trận hôm nay?
- Cấp độ Dễ/Vừa/Khó lưu ở `cfg.bossLevel` (K_CFG, có đồng bộ, đóng dấu cfgTs), trong khi spec P5 ghi "lưu local, không đồng bộ". Phần này có từ P2 (không nằm trong diff) — có cần sửa theo spec không?
