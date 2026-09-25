---
phase: 2
title: "Cast pacing hold next word"
status: completed
priority: P1
dependencies: [1]
---

# Phase 2: Cast pacing hold next word

## Overview
Chỉ hiện đề mới khi phép đã chạm và vụ nổ qua đỉnh (chạm + đuôi cố định). Thanh quái dừng trong lúc chờ nên không phạt người chơi.

## Requirements
<!-- Updated: Validation Session 1 - khoá = chạm + đuôi cố định (VFX nổ bắt đầu TẠI lúc chạm, vd rockImpact ~875ms) -->
- Khoá sau niệm = `impactMs[tier] + afterImpactMs[tier]`; `BOSS_TUNING.afterImpactMs: [0, 350, 450, 600]` → tổng ~0.6/0.9/1.4s (chỉnh sau cổng duyệt). Không chờ hết sprite nổ (khói tàn mờ dần khi đề mới đã hiện).
- Event `next` phát **sau** khoá (đã đúng cơ chế `lockNext`) — chỉ đổi mốc khoá.
- Ô gõ trống + mờ trong khoá (UI), phím gõ trong khoá bị bỏ (đã có `bossCanAct`) → không mất chữ oan: phím sớm không tính typo.
- Impact vẫn phát đúng `impactMs` (hoạt ảnh không đổi); `wonAt` không bị trễ thêm.
- Non-functional: không làm trận dài quá +25s ở ~40 phép (ghi số thực đo trong test mô phỏng).

## Architecture
- `castComplete` (`boss-game-logic.js`): `bossLockFor(st, now + T.impactMs[tier] + T.afterImpactMs[tier], true)`.
- `boss-game-result-ui.js` / `boss-game-ui.js`: khi nhận `cast` → thêm class `is-casting` cho ô đề (mờ, "✦ đang niệm…"); khi `next` → bỏ class.
- Đỉnh VFX nổ nằm trong `afterImpactMs`; phần đuôi sprite (vd `rockImpact` 14 khung/16fps) được phép chạy tiếp dưới đề mới.

## Related Code Files
- Modify: `js/boss-game-logic.js`, `js/boss-game-spell-math.js`, `js/boss-game-result-ui.js`, `js/boss-game-ui.js`, `css/paper-theme.css`, `tests/boss-game-logic.test.js`, `sw.js`, `js/app-storage.js`

## Implementation Steps
1. **Tests Before**: test hiện có cho thứ tự `cast → impact → next` phải còn xanh; ghi lại.
2. **Tests After (đỏ)**: sau cast bậc t, không có `next` trước `now + impactMs[t] + afterImpactMs[t]`; có `next` ngay sau mốc; `threat` không đổi trong khoá; phím gõ trong khoá không tạo `typo`/`key`; phép kết liễu → `won` không trễ vì đuôi khoá.
3. Thêm `afterImpactMs`, sửa `castComplete`.
4. UI trạng thái "đang niệm", CSS mờ.
5. Xem bằng mắt 5 hệ × 3 bậc, chỉnh `afterImpactMs`.
6. Bump version; **Regression gate** `node tests/run-tests.js`.
7. **Cổng duyệt**: user chơi thử máy thật (thanh quái + nhịp). Ghi số chỉnh vào `BOSS_TUNING`.

## Success Criteria
- [ ] Không đề mới nào hiện khi phép còn bay hoặc chưa qua đỉnh nổ (kiểm bằng mắt ở cả 3 bậc). _(chưa kiểm bằng mắt; test logic khoá xanh)_
- [x] Test khoá/nhịp xanh; test cũ xanh.
- [ ] User duyệt cảm giác sau phase 1+2. _(user bỏ cổng này 2026-09-25; vẫn nên chơi thử máy thật)_

## Risk Assessment
- Nhịp chậm gây chán: `afterImpactMs` chỉnh bằng một số; có thể giảm cho bậc 1.
- Phím gõ sớm bị nuốt gây khó chịu: hiển thị rõ trạng thái "đang niệm".
