# QA — Hội thoại nhập vai Gemini (end-to-end)

Date: 2026-10-08 · Branch: main (sau 0b67260) · Tester: cook/test session

## Tổng quan
| Lớp | Cách chạy | Kết quả |
|---|---|---|
| Unit (toàn repo) | `node tests/run-tests.js` | **814 passed / 0 failed** |
| Integration Postgres thật | embedded-postgres 17 (scratchpad, không thêm vào repo) + `createApi` + route thật, Gemini giả, HTTP thật | **21/21 PASS** |
| `server.js` thật + Google thật (key giả) | `PORT=5191 DATABASE_URL=… GEMINI_API_KEY=<giả>` | GET `{enabled:true}`; POST → 503, log `UPSTREAM … API_KEY_INVALID` (đúng thiết kế) |
| UI end-to-end (Chrome, agent-browser) | web + API thật (5190), auth/sync thật, Gemini giả | PASS toàn luồng, 0 lỗi console |

## Integration Postgres thật — đã kiểm
- schema.sql chạy 2 lần (idempotent); CHECK `data ≤ 32KB` chặn (23514)
- GET không auth `{enabled:true}`; POST không token 401
- Tạo mới 200 (genCount 1/3), id lạ bị lọc, giữ thứ tự, `missing` đúng; DB lưu jsonb
- Mở lại cùng ngày → cache, 0 lời gọi Gemini
- Tạo lại 2, 3 → genCount 2, 3; lần 4 trong 24h → 429 (SUM thật); đổi sang ngày mai vẫn 429
- Song song hôm qua/hôm nay/ngày mai → [200, 429, 429]; song song cùng ngày → 2×200, 1 lời gọi, gen_count 1
- Tạo mới → xoá dòng > 30 ngày (`current_date - 30` chạy đúng)
- Google 429 → 429 "hết lượt" + Retry-After; lần sau chặn trước khi gọi Gemini
- IP mở > 5 lượt/phút → 429 lần 6; trần toàn server 10/24h → 429 "Máy chủ"

## UI end-to-end — đã kiểm
- Probe thật bật nút; từ chấm sai được ưu tiên (`stubborn` trước `reckon`)
- Mở → 10 lượt → tô đậm `reckon`, báo thiếu `stubborn`, "Tạo đoạn khác (1/3)"
- Xong → t6 tích; mở lại → 0 POST (cache)
- Tạo đoạn khác → DB `gen_count = 2`, cache client genCount 2

## Phát hiện & sửa trong lần test này
- **Log lỗi Gemini thiếu lý do** (chỉ `gemini http 400`) → khó chẩn đoán key/model/schema trên production. Đã sửa: log thêm `model=… <reason>: <message Google, ≤120 ký tự>` (vd. `API_KEY_INVALID: API key not valid…`). Không log prompt/nội dung. Test mới trong `tests/dialogue-content-validator.test.js`. **Chưa commit.**

## Ghi chú môi trường test (không phải lỗi app)
- Postgres từ chối chạy bằng Administrator → khởi động qua `pg_ctl` (restricted token)
- initdb Windows tạo DB WIN1252 → tạo DB `ENCODING 'UTF8'` cho giống production (postgres:17 Docker)
- Mọi request từ 127.0.0.1 dính giới hạn 5 lượt/phút/IP → test dùng `X-Forwarded-For` + `trustHops: 1` như production

## Chưa kiểm được (cần key thật)
- Gemini thật chấp nhận `responseSchema` + `thinkingConfig.thinkingLevel` + `systemInstruction` với model đã chọn
- Chất lượng/độ tự nhiên hội thoại, thời gian phản hồi thật (< 25s?) qua proxy VPS
- iPhone Safari thật (ghi âm, 🔊)

## Câu hỏi còn mở
- Key thật: free tier hay trả phí; RPD thực tế trong AI Studio
- Timeout proxy VPS với request ~25s
