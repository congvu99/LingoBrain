---
title: Boss hub battle flow sticky CTA
description: >-
  Thanh Chiến đấu dính đáy ở sảnh + màn phụ; màn kết trận có nút Tiến hoá ngay /
  Cộng điểm
status: completed
priority: P2
branch: main
tags:
  - boss-game
  - ux
  - mobile
blockedBy: []
blocks: []
created: '2026-09-28T04:10:48.098Z'
createdBy: 'ck:plan'
source: skill
---

# Boss hub battle flow sticky CTA

## Overview
Chọn hệ / tiến hoá xong phải `←` về sảnh + cuộn đáy mới bắt đầu trận; màn kết trận chỉ hướng dẫn bằng chữ. Sửa: thanh CTA dính đáy dùng chung ở sảnh, Cây nguyên tố, Tiến hoá, Sổ chiêu; màn kết trận có CTA nâng cấp theo ngữ cảnh; hướng dẫn sảnh gom vào "Cách chơi".

Nguồn: [brainstorm report](../reports/brainstorm-260928-1058-boss-hub-battle-flow-sticky-cta-report.md) (hướng A, đã duyệt).

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Shared battle bar and hub cleanup](./phase-01-shared-battle-bar-and-hub-cleanup.md) | Completed |
| 2 | [Result screen upgrade shortcuts](./phase-02-result-screen-upgrade-shortcuts.md) | Completed |
| 3 | [Verify and release bump](./phase-03-verify-and-release-bump.md) | Completed |

Thứ tự: 1 → 2 → 3 (phase 2 dùng helper `bossOpenHubScreen` của phase 1).

## Acceptance criteria
- 375px: từ Cây nguyên tố / Tiến hoá / Sổ chiêu → 1 chạm vào trận; iOS bật bàn phím.
- Thắng + qua mốc tiến hoá: `Tiến hoá ngay` → chọn dạng → `Chiến đấu`, không qua sảnh.
- Thanh CTA không che nội dung cuối, không đè tab bar; đọc rõ ở sáng/tối.
- Thoát (`gQuit`) từ màn phụ mở từ kết trận vẫn dọn vòng lặp chân dung.
- `node tests/run-tests.js` qua; `APP_VERSION` = `CACHE` bump khớp.

## Out of scope
`confirm()` khi cộng điểm; sảnh dạng tab; dẫn đường nhiều bước; đổi độ khó trên thanh CTA.

## Dependencies
Không chặn/bị chặn plan khác. Lưu ý `260925-1043-hide-typing-input-plane-mage-games` (pending) chạm `js/boss-game-ui.js` phần ô gõ trong trận — plan này không sửa file đó.
