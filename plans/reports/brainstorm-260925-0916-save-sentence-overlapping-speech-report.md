# Brainstorm: câu tự viết bị đọc chồng với câu thẻ mới

Date: 2026-09-25 · Mode: markdown only

## Vấn đề
Bước 5 (Dùng thử) → gõ câu → "Lưu & tiếp →" → app đọc câu vừa gõ và chuyển ngay sang thẻ mới; thẻ mới tự đọc câu ngữ cảnh → 2 câu đọc chồng nhau.

## Nguyên nhân
- `js/review-steps-learn.js:172`: `speak(t); nextCard();` gọi liền nhau.
- `nextCard()` → `render()` → thẻ mới bước 1 `speak(w.context)` (dòng 103).
- Câu tự gõ không có trong audioMap → Web Speech; câu ngữ cảnh có MP3 → thẻ `Audio`. Hai đường phát riêng. `speechSynthesis.cancel()` ngay sau `speak()` cùng tick không đáng tin (nhất là giọng Edge "Online (Natural)") → chồng tiếng.
- Nếu cancel có chạy thì câu người dùng bị cắt mất → sai về trình tự, không phải lỗi của `speak`.

## Các cách đã cân nhắc
| | Cách | Kết luận |
|---|---|---|
| A | Không đọc khi lưu | Đơn giản nhất nhưng mất phần nghe lại câu mình viết |
| **B** | Đọc xong mới `nextCard()` | **Đã chọn** |
| C | Ở lại bước 5, nút "Tiếp" | Thêm 1 lần bấm mỗi từ |

## Giải pháp đã chốt (B)
1. `js/speech-synthesis.js`: `speak(text, rate)` trả về Promise, resolve khi:
   - MP3: sự kiện `ended` / `error` / `pause` của player (lượt phát này),
   - Web Speech: `onend` / `onerror` của utterance,
   - lượt phát bị lượt `speak()` mới hơn thay thế (token đổi) → resolve luôn,
   - không có giọng / text rỗng → resolve ngay.
   Caller cũ bỏ qua giá trị trả về → giữ tương thích.
2. `js/review-steps-learn.js` bước 5, nút Lưu: lưu srs → khoá `#b-done/#b-skip/#b-say` → `Promise.race([speak(t), timeout])` → `nextCard()`.
   - Timeout cap ~8s (hoặc theo độ dài câu, max ~10s) phòng `onend` của Chrome không bắn.
   - Guard chống gọi `nextCard()` 2 lần (bấm nhanh / Ctrl+Enter).
3. Không đổi: Bỏ qua, nút 🔊, luồng các bước khác.

## Rủi ro
- `onend` Chrome không bắn với câu dài → timeout lo, cao nhất chờ ~8–10s.
- Người dùng rời tab / chuyển tab app trong lúc chờ → `nextCard()` chạy trễ; cần kiểm tra thẻ hiện tại vẫn là `w` trước khi chuyển.
- iOS: `play()` bị chặn → rơi sang Web Speech (đường có sẵn), Promise vẫn resolve.

## Tiêu chí nghiệm thu
- Lưu câu → nghe trọn câu mình viết → rồi thẻ mới mới đọc ngữ cảnh; không chồng tiếng (Chrome, Edge, Safari iOS).
- Không có giọng / audio lỗi → vẫn chuyển thẻ trong ≤ timeout.
- Bấm Lưu nhiều lần không nhảy 2 thẻ.
- Các nơi khác gọi `speak()` không đổi hành vi.

## Ngoài phạm vi
Chồng tiếng ở mini game / boss game (chưa báo lỗi).

## Câu hỏi còn mở
- Timeout cố định 8s hay tính theo độ dài câu? (đề xuất: `min(10s, 1.5s + 80ms × số ký tự)`)
