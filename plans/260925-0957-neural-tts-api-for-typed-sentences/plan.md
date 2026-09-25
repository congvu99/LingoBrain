---
title: Giọng Neural cho câu tự gõ qua /api/tts
description: >-
  Câu không có MP3 dựng sẵn (câu tự gõ, từ tự nạp) → GET /api/tts tạo MP3 Edge
  TTS giọng Andrew Multilingual, cache Postgres; lỗi/offline → Web Speech như cũ
status: in-progress
priority: P2
branch: main
tags:
  - speech
  - tts
  - server
  - client
blockedBy: []
blocks: []
created: '2026-09-25T03:01:53.626Z'
createdBy: 'ck:plan'
source: skill
---

# Giọng Neural cho câu tự gõ qua /api/tts

## Overview
Câu người dùng tự gõ không có MP3 dựng sẵn → hiện đọc bằng Web Speech (Chrome/Android/iOS: máy móc, `rate .92` rề rà). Thêm `GET /api/tts?text=` trên server Node: tạo MP3 bằng Edge TTS (thư viện `msedge-tts` 2.0.8), cache Postgres theo hash (giọng + câu), trả `audio/mpeg`. Client `speak()`: MP3 dựng sẵn → `/api/tts` → Web Speech.

```
speak(text) ─► audioMap có? ─► audio/<file>.mp3                                  (như cũ)
             └ không ─► online, ≤200 ký tự, TTS không tắt tạm? ─► api/tts?text=… (+X-LB-TTS) ─► phát MP3
                                                             └ lỗi / 501 / 503 / offline ─► Web Speech (+watchdog)
server: GET /api/tts ─► header X-LB-TTS? ─► chuẩn hoá + kiểm tra ─► tts_clips có key? ─► trả bytea
                                                                 └ không ─► rate limit (IP + toàn server) ─► semaphore, hạn 5s ─► Edge TTS ─► kiểm MP3 ─► INSERT ─► trả
```

## Quyết định đã chốt (người dùng)
- Giọng: `en-US-AndrewMultilingualNeural` (env `TTS_VOICE`, đổi được). MP3 dựng sẵn giữ Christopher.
- Quyền: công khai, không cần đăng nhập; giới hạn theo IP chỉ tính lần tạo mới + trần toàn server; chặn trang khác nhúng.
- Provider: thư viện `msedge-tts` khoá `2.0.8`, tách file provider để đổi Azure/Google sau.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Server TTS route provider and cache](./phase-01-server-tts-route-provider-and-cache.md) | Completed |
| 2 | [Client speak uses api tts](./phase-02-client-speak-uses-api-tts.md) | Completed |
| 3 | [Docs and deploy](./phase-03-docs-and-deploy.md) | Pending |

**Phase 1 Bước 0 (kiểm Node + outbound trên Nhân Hòa) chạy trước mọi thứ** — bị chặn thì dừng. Sau đó phase 1 và 2 code song song (contract cố định ở phase 1); phase 3 sau cùng, chờ phần boss game đang dở được commit.

## Dependencies
Không chặn. Chạm cùng `docs/deployment-guide.md` với phase còn dở của 260924-0858 (phase 5 rollout) và 260923-1729 (phase 4 deploy docs) — chỉ thêm mục env mới, sửa sau cùng. Bump version đụng `sw.js`/`js/app-storage.js` mà kế hoạch 260925-0913 (mage combat) đang sửa dở.

## Acceptance Criteria
- Gõ câu mới → 🔊 / Lưu: nghe giọng Andrew Neural trên Chrome/Android/iOS (độ trễ lần đầu đo ở phase 3); lần 2 cùng câu phát nhanh (cache trình duyệt 1 ngày / DB).
- Từ/câu có MP3 dựng sẵn: không đổi (không gọi `/api/tts`).
- Server không DB / TTS lỗi / bị chặn / 429 / 503 tạm / offline → vẫn đọc Web Speech, không treo; chỉ 501 (tắt) mới tạm bỏ TTS 10 phút; bước 5 không đọc đè sang thẻ mới.
- Câu > 200 ký tự, rỗng, chứa `<`/`>` → 400; thiếu `X-LB-TTS` → 403; spam câu mới từ 1 IP → 429; cache hit không tính giới hạn tạo mới (vẫn nằm trong giới hạn chung 120/phút/IP của mọi `/api/*`).
- Không log nội dung câu, không lưu nguyên văn câu trong DB. `npm test` xanh, có test mới cho route và cho `speak()`.

## Red Team Review

### Session — 2026-09-25
**Findings:** 15 sau gộp (15 accepted, 0 rejected; 1 đề xuất đổi thiết kế về quyền riêng tư chỉ ghi docs)
**Severity breakdown:** 1 Critical, 7 High, 7 Medium
Reports: [security](reports/from-code-reviewer-to-planner-red-team-security-adversary-plan-review-report.md) · [assumption](reports/from-code-reviewer-to-planner-red-team-assumption-destroyer-plan-review-report.md) · [failure mode](reports/from-code-reviewer-to-planner-red-team-failure-mode-analyst-plan-review-report.md)

| # | Finding | Severity | Disposition | Applied To |
|---|---------|----------|-------------|------------|
| 1 | Hotlink `<audio>` từ trang khác đốt quota, không trần toàn cục | Critical | Accept | Phase 1, 2 |
| 2 | msedge-tts không escape XML → SSML injection, `&` gây 502 | High | Accept | Phase 1, 2 |
| 3 | 503 đa nghĩa → client tắt TTS cả phiên | High | Accept | Phase 1, 2 |
| 4 | MP3 hỏng lưu vĩnh viễn + `immutable` 1 năm, voice không trong cache key trình duyệt | High | Accept | Phase 1, 3 |
| 5 | Sai contract router/limiter (`fn(req)`, `hit(key, now)`, sweep, default createApi) | High | Accept | Phase 1 |
| 6 | msedge-tts 2.0.8 cần `crypto` global (Node ≥19) | High | Accept | Phase 1, 3 |
| 7 | Provider treo / rò WebSocket / single-flight kẹt | High | Accept | Phase 1 |
| 8 | Timeout lệch (cap bước 5 < fetch 6s < hàng đợi server) → đọc đè | High | Accept | Phase 1, 2 |
| 9 | Lượt speak cũ không abort fetch; server làm việc cho client đã huỷ | Medium | Accept | Phase 1, 2 |
| 10 | iOS chặn Web Speech fallback trễ → Promise treo | Medium | Accept | Phase 2 |
| 11 | require msedge-tts lỗi làm sập cả web tĩnh | Medium | Accept | Phase 1 |
| 12 | Ước tính dung lượng sai ~6×, cột `text` lưu nguyên văn | Medium | Accept (modified) | Phase 1 |
| 13 | Cache hit vẫn bị limiter chung 120/phút — sai tiêu chí | Medium | Accept (sửa wording) | plan.md, Phase 1 |
| 14 | `curl -I` → 405; khoá version; Edge version hard-code | Medium | Accept | Phase 1, 3 |
| 15 | Phase 2 thiếu test thật; bump version xung đột plan boss game | Medium | Accept | Phase 2, 3 |

### Whole-Plan Consistency Sweep
- Decision delta: 300→200 ký tự; 503 bận → 429; tắt = 501; `immutable`/1 năm → `max-age=86400`; 5000→2000 dòng, bỏ cột `text`; header `X-LB-TTS` + CORP; hạn server 5s < client 6s; cap bước 5 `6000 + 100·len` ≤ 20s + `stopSpeaking()`; `msedge-tts` `^2.0.8` → `2.0.8`; test phase 2 là file thật trong `tests/`.
- Đã rà `plan.md` + 3 phase: không còn "300 ký tự", "immutable", "503 → ttsOff", "TTS_CACHE_MAX 5000", "harness vm như lần sửa trước", "`^2.0.8`", "`curl -I`" ngoài mục mô tả finding. Contract phase 1 ↔ Requirements phase 2 khớp (header, 501/404/405 tắt tạm, 429/502/503 một lần, 200 ký tự, `<>`).
- Unresolved: 0 mâu thuẫn. Còn chờ dữ kiện thật: Node version + outbound Nhân Hòa (Bước 0).
