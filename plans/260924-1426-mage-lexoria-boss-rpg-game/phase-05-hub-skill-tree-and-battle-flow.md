---
phase: 5
title: "Hub đầy đủ: chọn pháp sư, cây nguyên tố, trường phái, buff Ôn từ, kết trận, luồng truyện"
status: pending
priority: P1
dependencies: [2, 4]
---

# Phase 5: Hub, cây kỹ năng, luồng trận

## Overview
Mở rộng hub tối giản (phase 2) thành vòng chơi hoàn chỉnh: chạm chip → (lần đầu: chọn pháp sư + mở đầu truyện) → hub → thẻ intro → trận → kết trận (XP, lên cấp, outro) → hub. Đây là phần giải "lý do quay lại" nên làm trước hiệu ứng bậc 2–3 (phase 3). Nếu phase 4 bị cắt (bản khẩn cấp): dùng 1 quái mặc định, bỏ thẻ truyện/Nhật ký.

## Requirements
- Functional:
  - **Lần đầu** = `bossProg.gender.ts === 0`. Nếu đang đăng nhập mà phiên này chưa có lần sync thành công → hub hiện "Đang đồng bộ…" tới khi sync xong/lỗi/offline (tránh màn chọn ghi đè lựa chọn đã có ở máy khác). Màn chọn: pháp sư nam/nữ (chân dung `drawMage`) → ghi `gender = {v, ts: Date.now()}` → đoạn mở đầu truyện → hub.
  - **Hub**: chân dung + `Lv N`, thanh XP tới cấp kế, chuỗi ngày săn trùm 🔥N (`huntStreak`); thẻ "Trận hôm nay" (quái + chương + `HP còn X%` từ `carryDmg`) hoặc "Đã hạ trùm hôm nay — Luyện phép"; chip buff "✨ Đã ôn xong: +1 ❤️, XP ×1.5" (hoặc "Ôn xong thẻ đến hạn hôm nay để được buff" + nút sang Ôn từ); Dễ/Vừa/Khó (nhớ cấp lần trước — lưu local ngoài `eng.boss.v1`, không đồng bộ); nút **Cây nguyên tố**, **Nhật ký**, **Bắt đầu**.
  - **Buff**: mở hub và bắt đầu trận gọi `reviewBuff(bossProg, srs, Date.now(), dkey())`; true mà `buffDate !== hôm nay` → `bossProg.buffDate = dkey()` + `saveBoss()` → buff giữ cả ngày dù sau đó có thẻ mới đến hạn.
  - **Cây nguyên tố** (`boss-game-skill-tree-ui.js`): 5 cột × 3 bậc, điểm còn = `pointsLeft(level, alloc)`; chạm bậc kế → xác nhận → `alloc[el]++` (chỉ khi `canRankUp`); chọn **trường phái** → `element = {v, ts: Date.now()}`; hiện quái hôm nay sợ hệ gì. Không có reset điểm (luật gộp `alloc` max dựa vào điều này).
  - **Kết trận** (`boss-game-result-ui.js`, `game.over = true`): thắng → sát thương tổng, số Đại chú, XP (+buff), thanh XP chạy, **LÊN CẤP!** (+1 điểm) nếu có, outro truyện hoặc "Luyện phép xong"; thua → "Oblivion cười…" + HP quái còn lại (giữ trong ngày) + **Đánh lại** (trận mới = `game` mới). Cả hai: danh sách từ sai/bỏ (sẽ ôn trước), render bằng `textContent`.
  - **Ghi tiến trình** chỉ qua `recordProgress(bossProg, …)` + `saveBoss()` (phase 1), dùng `date`/`beat`/`xpAtStart` chụp **lúc bắt đầu trận** (qua nửa đêm vẫn ghi cho ngày bắt đầu). Kết trận truyện: kiểm lại `todayBattle` — nếu máy khác đã thắng trận hôm nay trong lúc đánh (sync giữa trận), trận này tính như Luyện phép (không ghi `wins` trùng).
  - **Sau sync**: `refreshAfterSync` (`cloud-sync-account-ui.js:113`) gọi `refreshBossHub()` nếu hub đang mở (không đụng trận đang chạy).
- Non-functional: hub DOM (chỉ chân dung là canvas); chạy tốt ở 320px ngang; tông fantasy tối trong khung game (như Bắn máy bay dùng tông vũ trụ); mọi text động qua `esc`/`textContent`, class hệ lấy từ `BOSS_ELEMENTS` whitelist.

## Architecture
- `js/boss-game-hub-ui.js`: `startBossHub()`, `stopBossHub()`, `renderBossHub()`, `refreshBossHub()`, màn lần đầu, `showStoryCard(beat, when, next)`, `renderJournal()`.
- `js/boss-game-skill-tree-ui.js`: `renderSkillTree()`, `rankUp(el)`, `chooseElement(el)`.
- `js/boss-game-result-ui.js`: `showBossResult(result)`.
- Trận: `startBossBattle({monster, groups: buildBossPool(pickGameWords(gamePool(deck, srs, 'boss'), srs, n, rand, bossWordWeight)), tiers: assignTiers(...), mods: modifiersFor(alloc, element.v), hearts: 3 + mods.maxHeartsAdd + (buff ? 1 : 0), difficulty, carryDmg, date, beat, xpAtStart: bossProg.xp})`.

## Related Code Files
- Create: `js/boss-game-skill-tree-ui.js`, `js/boss-game-result-ui.js`
- Modify: `js/boss-game-hub-ui.js`, `js/boss-game-ui.js` (callback kết trận), `js/cloud-sync-account-ui.js` (`refreshAfterSync` → `refreshBossHub`), `css/paper-theme.css`, `index.html`, `sw.js` (ASSETS)

## Implementation Steps
1. Màn lần đầu + chờ sync khi đăng nhập + mở đầu truyện.
2. Hub đầy đủ + trận hôm nay + buff chốt `buffDate` + chọn cấp.
3. Cây nguyên tố + trường phái.
4. Luồng: hub → thẻ intro → trận → kết trận → outro → hub; nhánh thắng/thua/bỏ × truyện/luyện/vô tận đều qua `recordProgress`.
5. Nhật ký.
6. `refreshBossHub` sau sync.
7. Chơi thử 3 ngày giả (tiêm `date`): trận truyện mở mỗi ngày đúng 1; thử sync giữa trận từ máy thứ hai.

## Success Criteria
- [ ] Hạ trùm → đóng app → mở lại: hub báo đã hạ, chỉ còn Luyện phép; ngày mai mở trận kế.
- [ ] Thua giữa trận truyện → hub hiện HP quái còn lại, đánh lại tiếp từ đó.
- [ ] Máy B chưa từng chơi, đăng nhập cùng tài khoản với máy A đã có cây Lửa 3/Đất 2 → B không hiện màn chọn lần đầu sau khi sync, cây giữ nguyên trên cả hai.
- [ ] Đủ XP → LÊN CẤP → +1 điểm; cộng bậc 1 Đất → trận sau có +1 ❤️.
- [ ] Ôn xong thẻ đến hạn → hub hiện buff; tối có thẻ mới đến hạn → buff vẫn còn trong ngày.
- [ ] Nhật ký hiện đúng các đoạn đã mở.

## Risk Assessment
- Nhiều nhánh ghi tiến trình → chỉ một hàm `recordProgress` (đã test phase 1), UI chỉ gọi.
- Sync thay object `bossProg` giữa chừng → không giữ tham chiếu; mọi ghi đọc global tại thời điểm ghi.
