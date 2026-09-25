---
phase: 1
title: "Threat gauge replaces boss clock"
status: completed
priority: P1
dependencies: []
---

# Phase 1: Threat gauge replaces boss clock

## Overview
Thay đồng hồ đếm ngược `st.clock` bằng thanh tấn công `st.threat` (0..1) vẽ dưới quái: đầy theo giờ, gõ xong từ giảm, gõ sai/bỏ tăng, đầy → quái đánh.

## Requirements
- Tốc độ đầy/giây = `1 / (clock[độ khó] + mods.clockAdd)` × `timeScale` (slow-mo khi đang gõ đúng vẫn giữ). `monster.clockMul` vẫn **không** đọc (giữ như hiện tại, ngoài phạm vi).
- Cast đúng: `threat -= threatDrain × speed` (speed 1..2 từ `speedMult`), kẹp ≥ 0. Áp **lúc niệm xong** (`castComplete`), không đợi impact.
- Mỗi lần `typo`: `+threatTypo`. `giveup` / `fizzle`: `+threatMiss`. Chạm 1 bởi các cộng này → quái đánh ngay ở `stepBattle` kế.
- Đầy (≥ 1) → `bossAttack`; khiên chặn hoặc −❤️; `threat = 0`.
- Khoá (lockUntil), pause, đóng băng: thanh không tăng (giữ hành vi đồng hồ cũ).
- Tuyệt kỹ Gió `tornado`: `threat = 0` (thay "nạp lại đồng hồ").
- `BOSS_TUNING` thêm: `threatDrain: 0.35, threatTypo: 0.1, threatMiss: 0.25`. `clock` giữ tên (giây để đầy thanh) để hub hiện "10s" vẫn đúng.
- Non-functional: file ≤ 200 dòng; không đổi API public của `createBattle/typeKey/stepBattle/...`.

## Architecture
- Tách `js/boss-game-threat-gauge.js` (thuần): `bossThreatRate(st)`, `bossThreatFill(st, dt)`, `bossThreatAdd(st, amt)`, `bossThreatDrainOnCast(st, speed)`, `bossThreatAttack(st)` (trả về 'lost'|''). Nạp trước `boss-game-logic.js`.
- `boss-game-logic.js`: phần "đồng hồ trùm" trong `stepBattle` gọi module mới; `st.clock/clockMax` bị thay bằng `st.threat` + `st.threatSec` (= clock + clockAdd).
- Render: `drawBossClockBar` (`boss-game-render.js`) → `drawBossThreatBar` vẽ **dưới sprite quái** (toạ độ từ `fx.layout` monster), >0.75 đỏ, >0.9 rung (tắt rung khi `ui.fx.reduced`), đóng băng tô xanh băng.
- `boss-game-sprite-actors.js:153` `angry` = `st.threat > 0.88`.

## Related Code Files
- Create: `js/boss-game-threat-gauge.js`, `tests/boss-game-threat-gauge.test.js`
- Modify: `js/boss-game-logic.js`, `js/boss-game-spell-math.js`, `js/boss-game-render.js`, `js/boss-game-sprite-actors.js`, `tests/boss-game-logic.test.js`, `tests/run-tests.js`, `tests/run-tests.html`, `index.html`, `sw.js`, `js/app-storage.js`, `README.md` (mục game Pháp sư, nếu mô tả đồng hồ)

## Implementation Steps
1. **Tests Before**: chạy `node tests/run-tests.js` ghi baseline. Liệt kê test dùng `st.clock` (`boss-game-logic.test.js` dòng ~115, 156–160, 181–183, 192, 209) — đây là hành vi **cố ý thay đổi**; viết lại chúng theo `threat` (đỏ trước).
2. Viết `tests/boss-game-threat-gauge.test.js` (đỏ): fill theo dt & timeScale; clockAdd làm chậm; drain theo speed kẹp 0; typo/giveup/fizzle cộng; đầy → bossAttack + threat=0; khiên chặn; hết tim → lost; frozen/lock/pause không tăng; tornado → 0; bước dt lớn bị kẹp `BOSS_MAX_STEP_MS`.
3. Tạo `boss-game-threat-gauge.js`, thêm số vào `BOSS_TUNING`.
4. Sửa `createBattle` (khởi `threat: 0, threatSec`), `castComplete` (drain), `typeKey` (typo, fizzle), `giveUp`, `useUltimate` tornado, `stepBattle` (fill + attack). Xoá `clock/clockMax`.
5. Render thanh dưới quái; bỏ thanh đồng hồ góc phải trên; cập nhật `angry`.
6. Đăng ký file: `index.html`, `sw.js` ASSETS, `PURE_MODULES`, `run-tests.html`; bump `2.19.0`.
7. **Regression gate**: `node tests/run-tests.js` xanh; kiểm `wc -l js/boss-game-*.js` ≤ 200.

## Success Criteria
- [x] Mọi test mới + test viết lại xanh; không test cũ nào bị xoá mà không có test thay.
- [ ] Đứng yên ở độ khó Vừa: bị đánh sau ~10s; gõ nhanh đều: thanh dao động thấp, hiếm bị đánh. _(chưa kiểm bằng mắt — test định lượng thay thế)_
- [x] Thanh vẽ dưới quái, đỏ/rung đúng ngưỡng, không còn đồng hồ cũ. _(chưa kiểm bằng mắt ở 3 cỡ khung)_
- [x] `pwa-assets` xanh, APP_VERSION = CACHE.

## Risk Assessment
- Cân bằng lệch (quá dễ vì drain lớn): số trong `BOSS_TUNING`, duyệt ở cổng sau phase 2.
- Render dưới quái đè tên/HP quái: đặt thanh ngay dưới chân sprite, test ở 3 cỡ khung (`game-viewport-fit.js`).
- Rollback: revert commit phase; không đụng dữ liệu lưu.
