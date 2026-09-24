# Brainstorm — Game "🍉 Chém Chữ" (kiểu Fruit Ninja)

- Ngày: 2026-09-24
- Trạng thái: đã chốt ý tưởng, chưa bàn cách làm
- Cờ: không
- Nhánh: `main`

## 1. Vấn đề

Yêu cầu: "còn game nào nữa không, nên ý tưởng học từ hiệu quả". Làm rõ: user muốn **game hành động vui kiểu Bắn máy bay**, không phải bài tập thêm. User muốn chốt ý tưởng trước, cách làm sau.

Nguyên tắc chọn: vui nhưng không cho thắng bằng đoán mò. Game vui mà học ít thì chơi vài ngày là chán.

## 2. Bối cảnh codebase

- Đã có 4 game (`js/word-games.js`): Xếp chữ (chính tả), Chạy 60 giây (thấy từ → chọn nghĩa), Điền câu tốc độ (collocation), Bắn máy bay (thấy nghĩa → gõ từ, canvas + cấp độ)
- 5 dạng kiểm tra SM-2: type · dictation · mcq · owncloze · speak
- Quy tắc với SM-2: game chỉ ghi từ sai vào danh sách ôn trước (`addMiss` → `buildQueue`), không giãn lịch
- Mỗi từ có `meaning`, `emoji`, `context`, `contextVi`, MP3 Neural
- Khung Bắn máy bay (`plane-game-*.js`: logic/render/effects/ui) có thể tái dùng một phần (vòng lặp canvas, hiệu ứng nổ, tạm dừng, kỷ lục theo cấp)

## 3. Các ý tưởng đã cân nhắc

| Game | Vui | Học được | Công sức | Kết luận |
|---|---|---|---|---|
| 🧟 Zombie Nghe: nghe MP3, gõ từ để bắn | ★★★ | ★★★ | Thấp | Để sau, mình khuyên làm (lấp chỗ thiếu luyện nghe) |
| 🐉 Đánh Trùm Tuần: trùm từ 10 từ hay quên | ★★★ | ★★★ | Cao | Để sau |
| 🎣 Câu Cá Ghép Câu: câu cá theo thứ tự thành câu | ★★ | ★★★ | Trung bình | Để sau |
| **🍉 Chém Trái Cây** | ★★★ | ★★ | Trung bình | **User chọn** |
| 🏎️ Đua Bóng Ma | ★★ | ★★ | Thấp–Trung bình | Để sau |
| 🐍 Rắn Săn Chữ | ★★ | ★ | Trung bình | Loại, trùng với Xếp chữ |
| Đúng/Sai 30 giây | ★ | ★ | Thấp | Loại, đoán mò đúng 50% |
| Nói nhanh (nhận giọng) | ★★ | ★★★ | Cao | Loại tạm thời, nhận giọng trên iOS Safari chập chờn |

## 4. Thiết kế chốt

```
┌─────────────────────────────┐
│  🤔 "nghĩ rằng, cho là"   ❤️❤️❤️ │
│                  ×3 combo   │
│      🍊reach    🍉reckon     │
│   💣recon            🍋rock  │
│         🍎 regret            │
└─────────────────────────────┘
```

| Mục | Chốt |
|---|---|
| Đề bài | 📖 Nghĩa Việt (kèm emoji nếu có) → chém quả mang từ tiếng Anh đúng |
| Mỗi đợt | 3–5 quả, đúng 1 quả đúng. Bom là từ na ná; thiếu từ na ná thì lấy từ cùng `pos` |
| Mất ❤️ | Chém quả sai **hoặc** để quả đúng rơi. Một nhát trúng cả đúng lẫn sai tính là **sai** (chặn mẹo quét cả màn) |
| Thưởng | Chém trúng thì 🔊 đọc từ · chém nhanh (< ~1 giây) được thêm combo · 🌟 quả vàng là từ `lapses` cao, ×2 điểm |
| Thể thức | Chơi tới hết 3 ❤️, tốc độ tăng dần. Dễ / Vừa / Khó, kỷ lục riêng từng cấp |
| Cấp độ (dự kiến) | Dễ 3 quả, bay chậm, bom ngẫu nhiên · Vừa 4 quả, bom na ná · Khó 5 quả, bay nhanh |
| Màn kết thúc | Danh sách **cặp hay nhầm** (`stubborn ✂️ stumble ×2`). Từ chém sai vào danh sách ôn trước |
| Chơi được khi | Đã học ≥ 8 từ (`MIN_LEARNED`) |

**Ngoài phạm vi lần này:** kiểu đề chỉ nghe, kiểu đề chỉ emoji, chế độ 60 giây.

## 5. Rủi ro và cân nhắc

1. **Nhận diện chứ không tự nhớ ra**: người chơi thấy đáp án trên quả nên nhớ kém hơn Bắn máy bay. Chỉ nên là game khởi động/giải trí. Bom na ná là thứ giữ giá trị học.
2. **Khó đọc chữ trên iPhone**: chữ trên vật thể đang bay. Tối đa ~5 quả; từ dài (`give up on`) cần cỡ quả co giãn hoặc giới hạn độ dài.
3. **Chất lượng bom**: bộ B1 có thể không có cặp đủ giống cho mọi từ, cần phương án dự phòng (cùng `pos`, độ dài gần nhau). Có thể tái dùng ý tưởng `buildWordOptions()`.
4. **Nhận diện nhát vuốt**: phải phân biệt nhát chém với chạm nhầm, và xử lý khi một nhát cắt nhiều quả.
5. **Ràng buộc repo**: file < 200 dòng, thêm `<script>` + `ASSETS` trong `sw.js`, bump `APP_VERSION` + `CACHE`.

## 6. Tiêu chí thành công

- Không thể thắng bằng cách vuốt bừa hoặc quét cả màn
- Chữ trên quả đọc được trên iPhone màn nhỏ
- Màn kết thúc hiện đúng các cặp từ đã chém nhầm; từ sai được ôn trước ở phiên sau
- Chơi mượt 60fps trên iPhone, tạm dừng khi chuyển app (giống Bắn máy bay)

## 7. Bước tiếp theo

- Bàn cách làm: tách module thuần (sinh đợt quả, chọn bom, tính điểm) để test Node và phần canvas/vuốt; mức tái dùng khung Bắn máy bay
- Cách tính với SM-2 (mặc định giữ quy tắc cũ: chỉ báo từ sai)
- Lập plan: `/ck:plan`

## Câu hỏi chưa giải quyết

- Có tái dùng trực tiếp `plane-game-effects.js` / vòng lặp render hay viết engine riêng?
- Thế nào là "na ná": theo khoảng cách chỉnh sửa, cùng tiền tố, hay cùng `pos`? Ngưỡng bao nhiêu?
- Quy tắc tăng tốc cụ thể và số quả theo cấp cần chơi thử để chỉnh
