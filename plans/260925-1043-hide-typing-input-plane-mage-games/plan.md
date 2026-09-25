---
title: Hide typing input in plane and mage games
description: >-
  Bỏ ô nhập hiển thị ở Bắn máy bay + Pháp sư (input tàng hình làm mồi bàn phím
  iOS), dời nút ⏸/Bỏ/Tuyệt kỹ, trả ~56px cho canvas.
status: pending
priority: P2
branch: main
tags:
  - frontend
  - game
  - ios
  - ux
blockedBy: []
blocks: []
created: '2026-09-25T03:46:38.150Z'
createdBy: 'ck:plan'
source: skill
mode: 'default (brainstorm đã chốt thiết kế, không spawn researcher)'
---

# Hide typing input in plane and mage games

## Overview
Ô `<input>` ở 2 game chỉ là mồi focus (value bị xoá sau mỗi ký tự; chữ đang gõ đã hiện trên canvas / `#bossLetters`) nhưng chiếm hàng `.plane-input-row` ~56px sát bàn phím ảo iPhone. Plan: input tàng hình trong field, dời nút theo ngữ cảnh. Nguồn: [brainstorm report](../reports/brainstorm-260925-1043-hide-typing-input-plane-mage-games-report.md).

## Quyết định đã chốt
- Phương án A: ⏸ lên header (cả 2 game); Pháp sư "Bỏ" vào cột phải `#bossPrompt`; "✨ Tuyệt kỹ" nổi góc dưới-phải `#bossField`.
- Chỉ 2 game — **không** đụng Chém chữ.

## Ràng buộc
- Static, script global; không thêm file JS mới (không cần sửa `ASSETS`/`PURE_MODULES`).
- File code ≤ 200 dòng: `boss-game-ui.js` đang 194 → thay đổi phải net ≤ +6 dòng.
- Bump `APP_VERSION` (`js/app-storage.js`) = `CACHE` (`sw.js`) +0.0.1 từ giá trị lúc implement (hiện `2.21.1`).
- `gameHeadHtml` dùng chung → chỉ thêm tham số tuỳ chọn, output mặc định không đổi.

## Phases
| Phase | Name | Status |
|-------|------|--------|
| 1 | [Hidden input and relocated controls](./phase-01-hidden-input-and-relocated-controls.md) | Completed |
| 2 | [Device verification](./phase-02-device-verification.md) | Pending |

## Dependencies
- Plan `260925-0913-mage-lexoria-combat-depth-skills-evolution` (phase 4/5 pending) sửa cùng `js/boss-game-ui.js`, `css/paper-theme.css` → không chạy song song; không chặn logic. Working tree còn thay đổi chưa commit của plan đó → commit trước khi làm plan này.

## Acceptance (toàn plan)
- Không còn ô nhập hiển thị; iPhone Safari + PWA: "Bắt đầu"/"Chơi tiếp" bật bàn phím, gõ bắn/niệm bình thường, không zoom/nhảy scroll.
- Field cao thêm ~56px.
- ⏸/Bỏ/Tuyệt kỹ bấm không đóng bàn phím, không tự pause.
- Đóng bàn phím → pause như cũ; "Chơi tiếp" bật lại.
- Desktop: phím, Enter, Shift+Enter, Esc, IME/Telex composition không đổi.
- `node tests/run-tests.js` xanh.

## Câu hỏi chưa giải
- Không.
