---
phase: 3
title: "Docs and deploy"
status: pending
priority: P3
dependencies: [1, 2]
effort: "45m"
---

# Phase 3: Docs and deploy

## Overview
Ghi env mới, luồng audio mới, lưu ý quyền riêng tư, xử lý sự cố; bump version; kiểm trên Nhân Hòa.

## Requirements
- Docs phản ánh đúng code phase 1–2; không bịa thông số Nhân Hòa chưa kiểm.
- **Chờ** các thay đổi đang dở chưa commit của kế hoạch boss game (`sw.js`, `js/app-storage.js`…) được commit trước khi bump version, tránh đè. [RT#15]

## Related Code Files
- Modify: `docs/deployment-guide.md`:
  - env `TTS_ENABLED`, `TTS_VOICE`, `TTS_CACHE_MAX`, `TTS_DAILY_MAX`;
  - dòng "Node.js 18+" giữ được nhờ polyfill crypto — ghi rõ; [RT#6]
  - bước kiểm `/api/tts`; xử lý sự cố: 502 hàng loạt = outbound bị chặn hoặc Microsoft từ chối phiên bản Edge hard-code trong `msedge-tts` → bump thư viện, tạm `TTS_ENABLED=false`; [RT#14]
  - xoá cache TTS khi cần: `DELETE FROM tts_clips;` (trình duyệt tự làm mới sau ≤ 1 ngày). [RT#4]
- Modify: `docs/system-architecture.md` (thứ tự nguồn audio, bảng `tts_clips`, mã lỗi 501/429, rate limit, chặn hotlink).
- Modify: `docs/project-changelog.md` nếu có; bump version SW/app theo mục "Mỗi lần deploy, bump version" trong deployment-guide.

## Implementation Steps
1. Đọc 2 doc, thêm mục ngắn; ghi quyền riêng tư: câu tự gõ gửi tới Microsoft Edge TTS, có thể nằm trong log proxy (`?text=`), cache dùng chung.
2. Bump version theo quy trình (client đổi `speech-synthesis.js`) sau khi phần boss game đã commit.
3. Sau deploy (GET, không dùng `curl -I` — HEAD trả 405): [RT#14]
   `curl -s -H "X-LB-TTS: 1" -o /dev/null -w "%{http_code} %{content_type} %{size_download} %{time_total}\n" "<domain>/api/tts?text=hello%20there"` → `200 audio/mpeg >1000`; ghi lại `time_total` (đo độ trễ tạo lần đầu và lần 2).
   Thiếu header → 403. Log không có câu. Thử trên điện thoại (Chrome Android, Safari iOS).

## Success Criteria
- [ ] Docs khớp code (tên env, giới hạn, mã lỗi, Node).
- [ ] Production trả MP3 (ghi độ trễ đo được) hoặc, nếu bị chặn, đã `TTS_ENABLED=false` và ghi lại.

## Risk Assessment
- Xung đột `deployment-guide.md` với phase dở của kế hoạch khác → sửa sau cùng, chỉ thêm mục.
