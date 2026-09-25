---
title: Đọc xong câu tự viết mới chuyển thẻ
description: >-
  Bước 5: lưu câu → đọc hết câu người dùng → mới nextCard(), hết đọc chồng với
  ngữ cảnh thẻ mới
status: completed
priority: P2
branch: main
tags:
  - bug
  - speech
  - review
blockedBy: []
blocks: []
created: '2026-09-25T02:29:03.019Z'
createdBy: 'ck:plan'
source: skill
---

# Đọc xong câu tự viết mới chuyển thẻ

## Overview
Bấm "Lưu & tiếp →" ở bước 5 gọi `speak(t); nextCard();` liền nhau → thẻ mới tự đọc ngữ cảnh chồng lên câu người dùng (Web Speech vs thẻ Audio MP3, `cancel()` không đáng tin khi gọi cùng tick). Sửa: `speak()` trả Promise khi đọc xong; bước 5 chờ Promise (có giới hạn thời gian) rồi mới chuyển thẻ.

Nguồn: [brainstorm report](../reports/brainstorm-260925-0916-save-sentence-overlapping-speech-report.md)

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Speak completion and save-then-advance](./phase-01-speak-completion-and-save-then-advance.md) | Completed |

## Dependencies
Không. Kế hoạch khác từng đụng `js/speech-synthesis.js` / `js/review-steps-learn.js` (260923-1729 cloud sync, 260924-0858 audio source) đều đã xong các phase đó.

## Acceptance Criteria
- Lưu câu → nghe trọn câu → thẻ mới mới đọc; không chồng tiếng (Chrome, Edge, Safari iOS).
- Không có giọng / audio lỗi / `onend` không bắn → vẫn chuyển thẻ trong ≤ giới hạn thời gian.
- Bấm Lưu / Ctrl+Enter nhiều lần không nhảy 2 thẻ.
- Chỗ khác gọi `speak()` không đổi hành vi; `npm test` xanh.
