---
title: 'Boss arena wider camera: unified pixel scale'
description: >-
  Một hệ số pixel chung (worldK) cho tile nền, pháp sư, quái và đạn phép → cảnh
  rộng hơn, lưới pixel đồng nhất
status: in-progress
priority: P2
branch: main
tags:
  - boss-game
  - pixel-art
  - render
blockedBy: []
blocks: []
created: '2026-09-25T04:49:54.271Z'
createdBy: 'ck:plan'
source: skill
---

# Boss arena wider camera: unified pixel scale

## Overview
Cảnh đấu trùm đang dùng 3 hệ số phóng khác nhau (tile ≈ h/9, pháp sư 30% cạnh ngắn, quái 30–45%), nên pixel nhân vật to gấp khoảng 2 lần pixel nền: cảm giác cận cảnh, chật, "giả". Plan này đưa tất cả về một `worldK = clamp(round(h/14/16), 2, 6)` (khoảng 14 hàng tile, pháp sư ≥32px) và cho đạn phép tính cỡ theo pháp sư.

Nguồn: [brainstorm report](../reports/brainstorm-260925-1140-boss-arena-wider-camera-unified-pixel-scale-report.md)

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Unified world pixel scale](./phase-01-unified-world-pixel-scale.md) | Completed |
| 2 | [Projectile scale and visual QA](./phase-02-projectile-scale-and-visual-qa.md) | In Progress |

## Acceptance criteria
- 1 pixel pháp sư = 1 pixel quái thường = 1 pixel tile nền (cùng `worldK`).
- Phone dọc thấy ≥12 hàng tile; desktop cảnh rộng tương ứng, không vỡ bố cục.
- Trùm (kể cả Oblivion, sheet Attack/Hit) không tràn lên HUD.
- Đạn phép cao ≤1.5× chiều cao pháp sư.
- `node tests/run-tests.js` pass (có test mới cho `bossWorldScale`).

## Out of scope
Nền nhiều lớp/tiền cảnh, đổi vị trí nhân vật/chân trời, camera động, zoom slow-mo, game khác.

## Dependencies
- Liên quan (không chặn): `260925-0913-mage-lexoria-combat-depth-skills-evolution` (in-progress, đang sửa dở cùng file `boss-game-render.js`, `boss-game-sprite-actors.js` trong working tree). Làm plan này **sau khi** thay đổi đó đã commit, tránh diff lẫn lộn.
- Deploy: bump `APP_VERSION` (js/app-storage.js) + `CACHE` (sw.js) cùng số.
