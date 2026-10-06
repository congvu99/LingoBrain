---
title: Hội thoại nhập vai hằng ngày bằng Gemini
description: >-
  Mỗi ngày 1 hội thoại đời sống do Gemini tạo từ các từ đã chấm hôm nay; người
  học nhập vai (nói/gõ trước, xem câu mẫu sau).
status: completed
priority: P2
branch: main
tags:
  - gemini
  - dialogue
  - roleplay
  - api
blockedBy: []
blocks: []
created: '2026-10-06T03:24:34.716Z'
createdBy: 'ck:plan'
source: skill
---

# Hội thoại nhập vai hằng ngày bằng Gemini

## Overview
Thay thế thực tế cho thói quen `t6` "Bắt chuyện với khách nước ngoài": server gọi Gemini tạo 1 hội thoại 10–14 lượt (tình huống đời sống xoay vòng) chứa ≤8 từ đã chấm hôm nay. Client chạy nhập vai trong lớp toàn màn: lượt của người học ẩn câu mẫu, chỉ có gợi ý VI → nói/gõ → xem câu mẫu + 🔊. Xong → tự tích `t6`.

Nguồn quyết định: [brainstorm report](../reports/brainstorm-261006-1015-gemini-daily-roleplay-dialogue-report.md)

## Quyết định đã chốt
- Hình thức nhập vai (B), không chat realtime
- Bối cảnh: xoay vòng ~20 tình huống đời sống, server chọn theo ngày + lần tạo
- Từ: đã chấm hôm nay, tối đa 8, ưu tiên sai (`g===0`) → mới → ôn
- Bắt buộc đăng nhập để tạo; `GET /api/dialogue` không auth báo bật/tắt
- Hạn mức: 3 lần tạo thành công / user / 24h trượt (mọi `day`); 6 lần thử / user / 24h; giới hạn IP; trần server `DIALOGUE_DAILY_MAX` (mặc định 50) tính từ DB
- Client chỉ gửi `ids`; server tra từ trong DB (không text tự do)
- Độ phủ từ chỉ để báo (`missing`), không gọi lại vì phủ thấp; chỉ gọi lại 1 lần khi JSON sai cấu trúc và còn ngân sách
- Ngân sách tổng 25s server (huỷ được lời gọi Gemini), client huỷ ở 35s
- TTS: `/api/tts` có sẵn, **chỉ phát khi bấm**; docs ghi liên hệ `TTS_DAILY_MAX` ≥ 12 × `DIALOGUE_DAILY_MAX` + câu tự gõ
- Không thêm SDK: `fetch` REST Gemini; model qua `GEMINI_MODEL` (mặc định `gemini-3.6-flash`, xác minh lúc làm)

## Phases
| Phase | Name | Status |
|-------|------|--------|
| 1 | [Server Gemini dialogue route](./phase-01-server-gemini-dialogue-route.md) | Completed |
| 2 | [Client word picker and roleplay UI](./phase-02-client-word-picker-and-roleplay-ui.md) | Completed |
| 3 | [Integration docs and PWA](./phase-03-integration-docs-and-pwa.md) | Completed |

Phase 2 dùng contract của phase 1 (mục "Contract") và module chung `js/dialogue-word-match.js` (tạo ở phase 1). Phase 3 sau cả 1 + 2. Deploy: server trước client.

## Acceptance criteria
- Đăng nhập + đã chấm ≥1 từ → bấm nút → ≤25s có hội thoại 10–14 lượt (`missing` liệt kê từ chưa xuất hiện)
- Mở lại trong ngày → không gọi Gemini (cache local + DB)
- Bấm đúp / 2 tab → tốn 1 lượt; lượt thứ 4 trong 24h (kể cả đổi `day`) → 429; restart server không reset trần
- Không token → 401; thiếu `GEMINI_API_KEY` → `GET {enabled:false}`, POST 501 không cần token, nút ẩn
- Đóng màn bằng ✕/back khi đang ghi hoặc đang tải → micro tắt, không vẽ đè màn khác
- t6 giữ nút "💬 Hội thoại" sau đồng bộ; hoàn thành → `t6` được tích đúng ngày
- `node tests/run-tests.js` xanh, gồm test mới: word-match, validator, provider, route, word picker, sync-merge `talk`

## Dependencies
Không chồng plan đang mở. Tái dùng: `server/tts-routes.js` (mẫu guard, check-then-hit, turn-time guard), `authUser`, `/api/tts`, `openStage`/`leaveStage` (`js/app-shell.js`), `normAnswer` (`js/srs-scheduler.js`), `today()`/`dkey()` (`js/app-storage.js`).

## Red Team Review

### Session — 2026-10-06
**Findings:** 14 (14 accepted, 0 rejected) — gộp từ 27 phát hiện của 3 reviewer (Security Adversary, Failure Mode Analyst, Assumption Destroyer)
**Severity breakdown:** 1 Critical, 8 High, 5 Medium

| # | Finding | Severity | Disposition | Applied To |
|---|---------|----------|-------------|------------|
| 1 | `cleanPlan` xoá `act:'talk'` khi sync → t6 mất nút | Critical | Accept | Completed |
| 2 | Migrate t6 lúc nạp bị sync đè, lật qua lại | High | Accept | Completed |
| 3 | `normWord` không phải hàm chuẩn hoá; cụm từ 33% deck → phủ sai, gọi Gemini 2 lần | High | Accept | Completed |
| 4 | Single-flight chỉ bọc lời gọi đầu; `gen_count` tăng 2 khi bấm đúp | High | Accept | Phase 1 |
| 5 | Hạn mức lách bằng ±1 ngày, lần lỗi không đếm, trần RAM reset, không limit IP | High | Accept | Phase 1 |
| 6 | Deadline không huỷ Gemini, ngân sách 20s + retry vô lý | High | Accept | Phase 1, 2 |
| 7 | Câu thoại đốt trần `/api/tts` chung | High | Accept (user chọn A) | Phase 2, 3 |
| 8 | 501 sau auth → không ẩn được nút; 404/405 khi rollback | Medium | Accept | Phase 1, 2 |
| 9 | Helper ghi âm chung phá guard `mediaRec` của sync re-render | High | Accept (recorder riêng) | Phase 2 |
| 10 | Stage không có hook đóng: micro bật, response trễ đè màn khác, toast/nhãn sai, nửa đêm | High | Accept | Phase 2, 3 |
| 11 | Chỉ validate `en`; tô đậm bằng regex trên HTML | Medium | Accept | Phase 1, 2 |
| 12 | Cache local không gắn user; hàm ngày trùng | Medium | Accept | Phase 2 |
| 13 | Test runner cần `PURE_MODULES`; "sai" = `g===0` | Medium | Accept | Phase 1, 2 |
| 14 | Nút chỉ ở "Xong rồi" quá hẹp; `#homeExtra` bị gán đè | Medium | Accept | Phase 3 |

### Whole-Plan Consistency Sweep
- Đã đổi đồng bộ: 20s → 25s server / 35s client; "gọi lại khi phủ <70%" → bỏ (chỉ gọi lại khi JSON sai); `normWord` → `normAnswer` + `js/dialogue-word-match.js`; trần mặc định 300 → 50; "migrate t6" → render-time; helper ghi âm chung → recorder riêng; "🔊 tự phát" → chỉ khi bấm; "chỉ ở màn Xong rồi" → khi có ≥1 lượt chấm hôm nay.
- Còn lệch: brainstorm report (mục 4, 7) vẫn ghi phương án cũ (20s, retry phủ, `normWord`) — là hồ sơ quyết định lúc đó, plan này là nguồn đúng.
- Mâu thuẫn chưa giải quyết: 0.

## Câu hỏi còn mở
- Model Gemini + tên field schema/thinking hiện hành (xác minh docs lúc làm phase 1)
- Timeout proxy hosting có cho request ~25s không (thử sau deploy)
- Key Gemini free tier hay trả phí (free tier: Google có thể dùng dữ liệu gửi lên — chỉ là danh sách từ vựng, ghi vào README)

## Kết quả triển khai (2026-10-06)
- 3/3 phase xong; `node tests/run-tests.js` 805 passed / 0 failed; smoke test trình duyệt (fetch giả lập) đạt: mở màn, nhập vai, tô đậm, tích t6, cache, ✕/Esc/back, 429, tắt; mobile 390px không tràn.
- Lệch plan: thêm `js/daily-dialogue-api-client.js` (tách mạng/cache khỏi UI); `package.json` giữ 2.11.0 (đánh số riêng, chỉ `APP_VERSION`/`CACHE` → 2.26.0); `thinkingLevel: 'low'` (3.7/3.8 không có `minimal`), `maxOutputTokens` 8192; id Gemini tự khai được tin khi tính `missing` (chỉ ảnh hưởng báo cáo); single-flight khoá theo **user** (request song song khác ngày → 429) thay vì `userId|day`; t6 không còn `act` cũng coi là talk (client cũ ≤2.25 đồng bộ xoá `talk`).
- Code review: 0 Critical; đã sửa H1 (trần token + finishReason trong log), M1 (lách hạn mức song song khác ngày), M2 (rollDay trước khi tích t6), M3 (micro rò khi bấm 2 lần lúc xin quyền), L2, L3, L5, L6. Bỏ qua L1 (cửa sổ vài ms, chỉ tốn thêm 1 lượt của chính user).
- Tối ưu tính ứng dụng (sau triển khai): `server/dialogue-prompt-builder.js` — 20 thẻ tình huống có vai/mục tiêu/trục trặc (chủ yếu người nước ngoài ở VN hỏi/nhờ mình), Gemini chọn 1 trong 3 thẻ hợp từ nhất, `systemInstruction` quy tắc "câu dùng lại được ngay" + đoạn mẫu, `DIALOGUE_LEARNER_CONTEXT` (env), tối đa 6 từ, temperature 0.75.
- Chuẩn bị production (2026-10-06): Google 429 → code QUOTA, model bị bỏ qua theo retryDelay (30s–10 phút), `GEMINI_MODEL_FALLBACK` tuỳ chọn, mọi model bị chặn → 429 trước khi trừ lượt thử (review H1); `DIALOGUE_DAILY_MAX` mặc định 10 (gói miễn phí); xoay thẻ tình huống bước 9/ngày (ngày liền kề không trùng thẻ); runner test: test treo → FAIL thay vì thoát im lặng mã 0; hướng dẫn bật key trên VPS ở docs/deployment-vps-guide.html.
- Chưa kiểm: gọi Gemini thật (cần key), Postgres thật, iPhone Safari thật, timeout proxy hosting.
