---
phase: 3
title: "Spoken chunks batch"
status: pending
priority: P2
dependencies: [2]
---

# Phase 3: Spoken chunks batch

## Overview
~800 cụm nói sẵn / câu phản xạ, 2 đợt × ~400. Quy trình giống phase 2.

## Requirements
- Nhóm nội dung (cân đối): chào/đáp xã giao (how's it going, not much), đồng ý/phản đối (fair enough, I'm not sure about that), phản ứng cảm xúc (no way, that's awesome), nhờ/đề nghị (do you mind, would you like to), xin lỗi/cảm ơn (my bad, no worries, I appreciate it), trì hoãn/suy nghĩ (let me think, it depends), hẹn hò kế hoạch (I'm down, what are you up to), công việc/khách hàng (I'll get back to you, how can I help you).
- Bỏ mục đã có (`by the way`? kiểm, `all right`, `according to`...).
- `pos` = `phrase`; `source` = `Spoken core · chunk`.
- `word` ≤ 30 ký tự, nháy thẳng; không dấu câu cuối (bỏ `?`, `!`, `.`) để gõ/khớp ổn định.

## Architecture
Quy tắc soạn như phase 2. `context` là 1 lượt thoại ngắn chứa nguyên cụm, có thể kèm câu dẫn: "A: Sorry I'm late. B: No worries, we just started." → giữ ≤ `CLOZE_MAX_SENTENCE` khi có thể.

## Related Code Files
- Create: `plans/260924-1629-spoken-core-2500-vocabulary/data/batch-03-chunk.json`, `batch-04-chunk.json`
- Modify: `words.json`, `audio/*.mp3`, `audio/index.json`

## Implementation Steps
1. Lập ~830 cụm theo nhóm, lọc trùng với `words.json`.
2. Soạn batch 03 → check → spot-check 5% → merge → MP3 → test → commit `feat(words): add spoken core chunks batch 1`.
3. Lặp cho batch 04.
4. Mở app (skill `run`) kiểm dạng "Gõ từ", "Nghe rồi gõ" với 3 cụm có nháy (`I'm down`, `it's up to you`) trên bàn phím nháy cong.

## Success Criteria
- [ ] ~800 cụm mới, check 0 lỗi, test pass mỗi đợt.
- [ ] Gõ cụm có nháy cong được chấm đúng.

## Risk Assessment
- Cụm dài làm game gõ máy bay khó: `letterCount` tăng thời gian rơi theo số chữ → chấp nhận; nếu > 30 ký tự thì validator chặn.
- Viết hoa đầu cụm (`I'm`) — `fuzzyMatch`/`normalizeTyped` hạ thường → ok.
