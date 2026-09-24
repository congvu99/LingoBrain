---
phase: 4
title: Discourse markers and spoken words batch
status: in-progress
priority: P2
dependencies:
  - 3
---

# Phase 4: Discourse markers and spoken words batch

## Overview
~200 từ nối / dạng rút gọn / cảm thán + ~800 từ đơn khẩu ngữ tần suất cao chưa có. 2 đợt × ~500.

## Requirements
- Discourse (`Spoken core · discourse`, `pos` = `discourse marker` | `exclamation` | `informal`): actually, basically, I mean, you know, kind of, anyway, gonna, wanna, gotta, kinda, yeah, nope, oops, wow...
  - `meaning` ghi rõ dạng đầy đủ cho rút gọn: `gonna` → "sẽ (= going to, văn nói)".
- Từ đơn (`Spoken core · word`, `pos` như Oxford: noun/verb/adjective...): lấy từ danh sách tần suất lời nói SUBTLEX-US (top ~6000), bỏ mục đã có trong `words.json`, bỏ tên riêng, từ tục, từ thuần học thuật. Ví dụ: okay, awesome, weird, grab, mess, stuff, guy, cool (nếu chưa có).
- Không thêm từ tục/xúc phạm.

## Architecture
Quy tắc soạn như phase 2. Nguồn danh sách: tải SUBTLEX-US (WebFetch) nếu truy cập được; không được thì dùng hiểu biết tần suất + ghi rõ trong commit/report là danh sách tự lập.

## Related Code Files
- Create: `plans/260924-1629-spoken-core-2500-vocabulary/data/batch-05-discourse-and-word.json`, `batch-06-word.json`
- Modify: `words.json`, `audio/*.mp3`, `audio/index.json`

## Implementation Steps
1. Lập danh sách discourse (~210) + từ đơn (~850), lọc trùng.
2. Batch 05 = 200 discourse + ~300 từ đơn; batch 06 = ~500 từ đơn còn lại (số cuối chỉnh để tổng Spoken ≈ 2500).
3. Mỗi batch: check → spot-check 5% → merge → MP3 → test → commit `feat(words): add spoken core discourse and words batch N`.

## Success Criteria
- [ ] Tổng mục Spoken ≈ 2500 (±10%), check 0 lỗi, test pass.
- [ ] Không có từ tục; không trùng Oxford.

## Risk Assessment
- Từ đơn đa nghĩa (e.g. `grab`) → `meaning` nghĩa khẩu ngữ trước.
- `wordRx` với từ ngắn (`yeah`, `oh`) vẫn khớp trọn từ → ok; kiểm câu không chứa từ đó như một phần từ khác.
