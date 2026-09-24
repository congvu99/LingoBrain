---
phase: 2
title: Phrasal verbs batch
status: in-progress
priority: P2
dependencies:
  - 1
---

# Phase 2: Phrasal verbs batch

## Overview
~700 phrasal verb khẩu ngữ phổ biến, 2 đợt × ~350, mỗi đợt check → merge → MP3 → test → commit.

## Requirements
- Chọn phrasal verb dùng nhiều trong hội thoại (figure out, hang out, run into, put off, show up, come up with, get along, work out, end up, pick up...). Ưu tiên tần suất nói; bỏ loại quá trang trọng/cổ.
- Bỏ mục đã có (`reach out`, `make up for`).
- `pos` = `phrasal verb`; `source` = `Spoken core · phrasal verb`.

## Architecture
Quy tắc soạn nội dung (áp dụng cả phase 3–4):
- `ipa`: IPA Mỹ, cả cụm, dạng `/ˈfɪɡjər aʊt/`.
- `meaning`: nghĩa Việt ngắn, nghĩa phổ biến nhất trước, các nghĩa cách `;`, vế đầu ≤ 49 ký tự.
- `context`: câu hội thoại tự nhiên ≤ ~12 từ, **cụm liền mạch ở dạng nguyên mẫu**. `wordRx` chỉ chấp nhận đuôi chia ở cuối cả cụm, nên `figured out`/`figures out` sẽ không khớp. Thực tế: dùng sau `to`/`can`/`let's`/`gonna` hoặc câu mệnh lệnh, vd "I can't figure out this app."
- `contextVi`: dịch tự nhiên kiểu nói chuyện.
- `emoji`: 1 emoji hợp nghĩa.
- `outputPrompt`: tình huống cụ thể, chứa từ: "Dùng 'figure out' để kể một thứ bạn đang cố hiểu ở chỗ làm."

## Related Code Files
- Create: `plans/260924-1629-spoken-core-2500-vocabulary/data/batch-01-phrasal-verb.json`, `batch-02-phrasal-verb.json`
- Modify: `words.json`, `audio/*.mp3`, `audio/index.json`

## Implementation Steps
1. Lập danh sách ~720 phrasal verb (dư để bù loại trùng/lỗi), lọc với `words.json`.
2. Soạn batch 01 (~350 mục) theo quy tắc trên.
3. `node tools/spoken-core-batch.js check <batch>` → sửa đến khi 0 lỗi.
4. Spot-check ngẫu nhiên ~5% (18 mục): IPA, nghĩa, câu tự nhiên.
5. `merge` → `python tools/generate_edge_tts_audio.py` (venv `tools/requirements.txt`) → `node tests/run-tests.js`.
6. Commit: `feat(words): add spoken core phrasal verbs batch 1`.
7. Lặp 2–6 cho batch 02.

## Success Criteria
- [ ] ~700 phrasal verb mới trong `words.json`, check 0 lỗi.
- [ ] Audio test pass (không thiếu, không mồ côi).
- [ ] Toàn bộ test pass sau mỗi đợt.

## Risk Assessment
- Phrasal verb tách được (figure it out) là dạng tự nhiên hơn → chấp nhận câu dùng dạng liền; ghi chú dạng tách vào `meaning` nếu cần (vd `(tách được: figure it out)`), vẫn giữ vế đầu ≤ 49.
- edge-tts rate limit/mạng lỗi → script đã bỏ qua file có sẵn, chạy lại được.
