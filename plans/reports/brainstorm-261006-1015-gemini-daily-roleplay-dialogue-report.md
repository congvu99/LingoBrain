# Brainstorm — Hội thoại nhập vai hằng ngày bằng Gemini (từ vựng hôm nay)

- Date: 2026-10-06 · Branch: main · Flags: none
- Status: design approved → chờ `/ck:plan`

## 1. Vấn đề
- Thói quen `t6` "Bắt chuyện với khách nước ngoài" (`js/daily-plan.js:9`): thực tế hiếm khi có người để nói chuyện → không làm được, không luyện được phản xạ.
- Vấn đề gốc: **thiếu sản sinh câu trong tình huống thật**, chứ không phải thiếu input. Một đoạn hội thoại đọc bị động ≈ ví dụ `context` đã có → giá trị thấp.
- Mục tiêu: mỗi ngày có 1 tình huống đời sống, tự nhiên, thiết yếu, chứa các từ vừa ôn hôm nay; người học phải tự nói/gõ trước khi xem câu mẫu.

## 2. Phương án đã cân nhắc
| Cách | Ưu | Nhược | Kết luận |
|---|---|---|---|
| A. Hội thoại tĩnh (đọc + TTS) | 1 lần gọi/ngày, cache, offline | Bị động | Loại |
| **B. Nhập vai (ẩn câu của mình, gợi ý VI → nói/gõ → xem câu mẫu)** | Có sản sinh câu, chi phí vẫn 1 lần gọi/ngày | UI phức tạp hơn A; không chấm câu tự do | **Chọn** |
| C. Chat AI thời gian thực | Gần thật nhất | N lần gọi/buổi, độ trễ, STT, không offline, rủi ro lạm dụng key | Để vòng sau nếu B có người dùng |

## 3. Quyết định đã chốt (user)
- Hình thức: **B. Nhập vai**
- Bối cảnh: **xoay vòng đời sống** (server chọn theo ngày từ danh sách ~20 tình huống: cà phê, hỏi đường, siêu thị, khám bệnh, gọi đồ ăn, khách sạn, small talk đồng nghiệp/khách, sửa đồ, ngân hàng, taxi…)
- Nguồn từ: **từ đã chấm hôm nay** (mới + ôn), tối đa 8, ưu tiên chấm sai → mới → ôn lại
- Vị trí UI: nút ở màn "Xong rồi" của phiên ôn + nút phụ ở thói quen `t6`; chạy trong lớp toàn màn
- Auth: **bắt buộc đăng nhập**
- Tạo lại: **tối đa 3 lần/user/ngày**
- Hoàn thành hội thoại → **tự tích t6** (vẫn bỏ tích tay được)

## 4. Thiết kế

### Server — `POST /api/dialogue` (module mới `server/dialogue-routes.js` + `server/gemini-dialogue-provider.js`)
- Auth Bearer bắt buộc; mẫu theo `server/tts-routes.js` (rate limiter, semaphore 2, single-flight, trần server/ngày).
- Body: `{ day: "YYYY-MM-DD", ids: [string], regenerate?: bool }`. Server tra `word/meaning/pos` từ deck DB; bỏ id lạ; cắt ≤8. **Không nhận text tự do** → chặn prompt injection + route không thành proxy Gemini.
- `day` validate ±1 ngày so với giờ server (lệch múi giờ).
- Tình huống: `SCENARIOS[(hash(day)+genCount) % N]` → tạo lại ra tình huống khác.
- Gemini structured output (responseSchema JSON):
  ```json
  { "scenario": "Ordering at a café", "scenarioVi": "Gọi đồ ở quán cà phê",
    "roles": { "you": "customer", "them": "barista" },
    "turns": [ { "who": "them|you", "en": "...", "vi": "...", "hintVi": "...(chỉ lượt you)", "ids": ["reckon"] } ] }
  ```
- Prompt yêu cầu: tiếng Anh hội thoại tự nhiên (contractions, câu ngắn, A2–B1), 10–14 lượt, người học là `you`, mỗi từ mục tiêu xuất hiện ≥1 lần đúng nghĩa đã cho, ưu tiên đặt từ vào lượt `you`.
- Validate sau gọi: schema, 10–14 lượt, `en` ≤200 ký tự (khớp `/api/tts`), không `< >`/ký tự điều khiển; độ phủ từ (`normWord` + fuzzy từ `srs-scheduler.js`) <70% → gọi lại 1 lần, sau đó chấp nhận + trả `missing: [ids]`.
- Cache: bảng `dialogues(user_id, day, data jsonb, gen_count int, updated_at)` PK `(user_id, day)`. GET cùng ngày, không `regenerate` → trả cache, không gọi Gemini. `gen_count ≥3` → 429.
- Env: `GEMINI_API_KEY` (không có → route 501, tính năng ẩn), `GEMINI_MODEL` (mặc định bản Flash mới nhất — xác minh docs khi plan), `DIALOGUE_DAILY_MAX` (trần toàn server).
- Gọi Gemini bằng `fetch` (Node ≥18), không thêm SDK (YAGNI); timeout 20s.

### Client
- `js/daily-dialogue-word-picker.js` [thuần, có test]: `pickTodayWords(deck, srs, now, max=8)` từ `srs[id].hist[].t ≥ startOfDay`.
- `js/daily-dialogue-roleplay-ui.js`: lớp toàn màn (✕, n/N)
  1. Intro: tình huống + vai + danh sách từ mục tiêu
  2. Lượt `them`: câu EN + 🔊 (`/api/tts`), VI ẩn sau "Xem dịch"
  3. Lượt `you`: `hintVi` + chip từ cần dùng → ⏺ ghi âm (tái dùng `recording-store.js`) hoặc ô gõ → "Xem câu mẫu" → 🔊
  4. Kết thúc: toàn bộ đoạn, tô đậm từ mục tiêu, "Tạo đoạn khác (n/3)"; tự tích `t6`
- Lưu `eng.dialogue.v1` = `{day, data, pos}` localStorage, **không sync** → mở lại / offline trong ngày được, tiếp tục từ lượt dở.
- Render toàn bộ bằng `textContent` (output LLM là untrusted).

### Trạng thái lỗi / biên
| Trường hợp | Xử lý |
|---|---|
| Chưa chấm từ nào hôm nay | Nút khoá: "Ôn ít nhất 1 từ trước" |
| Chưa đăng nhập | CTA đăng nhập (tab Tôi) |
| Offline, chưa có cache | "Cần mạng để tạo hội thoại" |
| Server không có key (501) | Ẩn nút |
| Gemini lỗi/timeout/schema hỏng 2 lần | 503 + "Thử lại sau" |
| Hết 3 lần / trần server | 429 + thông báo VI |
| Qua ngày mới khi đang dở | Giữ đoạn cũ tới khi đóng; mở lại → ngày mới |

## 5. Vận hành & bảo mật
- Log: chỉ `{userId, day, model, ms, status, coverage, tokens}` — không log nội dung (như TTS).
- Metric thủ công qua log: tỷ lệ lỗi Gemini, coverage trung bình, số lần tạo lại/ngày → nếu tạo lại nhiều = chất lượng prompt kém.
- Chi phí: ~1–3 call/user/ngày × ~1.5k token → không đáng kể với Flash; trần `DIALOGUE_DAILY_MAX` chặn sự cố.
- Key chỉ ở env server; không bao giờ xuống client. `.env` không commit.
- Privacy: chỉ gửi từ vựng (công khai trong deck) lên Google, không gửi dữ liệu cá nhân / ghi âm.

## 6. Ảnh hưởng tài liệu / tương thích
- README: sửa nguyên tắc "không server, không AI" → "AI tuỳ chọn (Gemini) cho hội thoại; phần còn lại vẫn offline".
- `docs/system-architecture.md`: route, bảng `dialogues`, khoá `eng.dialogue.v1`, module mới.
- `docs/deployment-guide.md`: env Gemini.
- `schema.sql`: thêm bảng (idempotent `CREATE TABLE IF NOT EXISTS`). Không đụng sync payload → không breaking.
- Tăng `APP_VERSION` + `CACHE` sw.js; thêm file JS mới vào danh sách precache nếu có test `pwa-assets`.

## 7. Tiêu chí nghiệm thu
- Đã chấm ≥1 từ → bấm nút → ≤20s có hội thoại 10–14 lượt, tình huống đời sống, ≥70% từ mục tiêu xuất hiện
- Lượt `you` ẩn câu mẫu đến khi bấm; ghi âm/gõ hoạt động; 🔊 mọi câu
- Mở lại trong ngày → không gọi Gemini lại (cache local + DB)
- Lần tạo thứ 4 trong ngày → 429; ids lạ bị bỏ; body có text tự do bị bỏ qua
- Không đăng nhập → 401; thiếu key → 501, nút ẩn
- Hoàn thành → t6 tích; test thuần cho word-picker, validator output, route (mock provider)

## 8. Rủi ro
- LLM nhét từ gượng ép → giữ ≤8 từ, cho phép `missing`, prompt ưu tiên tự nhiên hơn đủ từ.
- Tên/giá model Gemini thay đổi → `GEMINI_MODEL` env, xác minh docs lúc plan.
- Không chấm câu tự do (B) → chấp nhận; nâng cấp lên C sau nếu có nhu cầu.
- Phụ thuộc mạng → đã có cache ngày.

## 9. Bước tiếp theo
- `/ck:plan` với report này. Phase gợi ý: (1) provider + validator + route + schema, (2) word-picker + UI nhập vai, (3) tích hợp màn Xong rồi/t6 + docs + PWA version.

## Câu hỏi còn mở
- Model Gemini cụ thể + free tier hiện hành (xác minh lúc plan).
- Có cần hiển thị gợi ý tiếng Việt cho lượt `you` dạng ý chính hay dịch sát? (đề xuất: ý chính, để buộc tự diễn đạt)
