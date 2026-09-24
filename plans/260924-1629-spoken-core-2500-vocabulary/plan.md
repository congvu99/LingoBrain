---
title: Spoken core 2500 vocabulary
description: >-
  Thêm ~2500 mục khẩu ngữ (phrasal verb, cụm nói sẵn, discourse, từ đơn khẩu
  ngữ) vào words.json, xếp xen kẽ Oxford, có MP3 edge-tts
status: in-progress
priority: P2
branch: main
tags:
  - vocabulary
  - words-json
  - audio
blockedBy: []
blocks: []
created: '2026-09-24T09:35:56.606Z'
createdBy: 'ck:plan'
source: skill
---

# Spoken core 2500 vocabulary

## Overview
Bộ hiện có 2505 mục (2500 Oxford A1–B2). Thêm ~2500 mục "Spoken core" phục vụ giao tiếp với người bản địa, shape 12 trường không đổi, xếp xen kẽ 2 Oxford : 1 Spoken, tạo MP3 bằng edge-tts. Không đổi UI/game/schema.

Nguồn quyết định: [brainstorm report](../reports/brainstorm-260924-1629-spoken-core-2500-vocabulary-report.md)

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Batch tooling validator and interleave merge](./phase-01-batch-tooling-validator-and-interleave-merge.md) | Completed |
| 2 | [Phrasal verbs batch](./phase-02-phrasal-verbs-batch.md) | Completed |
| 3 | [Spoken chunks batch](./phase-03-spoken-chunks-batch.md) | Completed |
| 4 | [Discourse markers and spoken words batch](./phase-04-discourse-markers-and-spoken-words-batch.md) | In Progress |
| 5 | [Release verification](./phase-05-release-verification.md) | Pending |

Thứ tự: 1 → 2 → 3 → 4 → 5 (tuần tự; 2–4 cùng sửa `words.json`, không chạy song song).

## Ràng buộc đã kiểm chứng (từ code)
- Thẻ mới lấy theo thứ tự mảng `words` (`js/srs-scheduler.js:115-120`) → reorder `words.json` = xen kẽ có hiệu lực; SRS theo `id` → tiến độ cũ giữ nguyên.
- `wordRx` (`js/word-games.js:23`) chỉ khớp cụm **liền mạch**, đuôi chia chỉ ở cuối cụm → `context` phải chứa cụm liền (`figure out`, không `figure it out`/`figured out`), nếu không mất highlight + loại khỏi cloze.
- `fuzzyMatch` so số từ bằng nhau, `normalizeTyped` đổi nháy cong → thẳng → `word` dùng nháy thẳng `'`.
- `tests/audio-manifest.test.js` bắt mọi `word` + `context` có MP3, không MP3 mồ côi → mỗi đợt phải chạy edge-tts trước khi test.
- `PLANE_LABEL_MAX = 50` → vế nghĩa đầu (trước `;`) ≤ 49 ký tự.
- Server auto-seed theo content hash; guard chỉ chặn co bộ < 50% → thêm mục an toàn.

## Acceptance criteria
- `words.json` ≈ 5000 mục (±10%), 0 trùng id/word, validator pass 100%.
- Mục Spoken có `source` = `Spoken core · {phrasal verb|chunk|discourse|word}`, emoji ≠ 📘, `outputPrompt` riêng, `mnemonic` = "".
- Thứ tự: 5 mục phim đầu, sau đó O,O,S lặp; 10 thẻ mới đầu tiên của người mới có ≥ 3 mục Spoken.
- ≈ +5000 MP3, `audio/index.json` phủ đủ; `node tests/run-tests.js` pass.
- `APP_VERSION` + `CACHE` tăng khớp nhau.

## Ngoài phạm vi
Mnemonic; sửa 2500 Oxford cũ; UI/game; newPerDay mặc định.

## Dependencies
Không chặn/không bị chặn bởi plan khác. Plan in-progress khác (game, sync, postgres) chỉ đọc `words.json` qua shape cũ → không xung đột.
