# 🧠 English Daily — Giáo án + Ôn từ 5 bước

Web tĩnh, **ưu tiên mobile**, không server, không database. Tiến độ lưu trong `localStorage`.

```
eng/
├── index.html    ← toàn bộ app (HTML + CSS + JS, không thư viện ngoài)
├── words.json    ← bộ từ khởi điểm (bạn nạp thêm mỗi ngày trong app)
└── README.md
```

3 tab ở thanh dưới: **📅 Giáo án** · **🎮 Ôn từ** · **⚙️ Quản lý**. Số đỏ trên tab = việc còn lại / từ đến hạn.

## Chạy thử

```bash
npx serve .          # hoặc: python -m http.server 8080
```

> Mở thẳng `index.html` (file://) vẫn chạy, nhưng trình duyệt chặn `fetch` nên bộ từ ban đầu trống — nạp JSON trong tab ⚙️ là xong.

## Đẩy lên hosting (miễn phí, 1 phút)

| Cách | Thao tác |
|---|---|
| **Netlify Drop** | kéo thả thư mục vào https://app.netlify.com/drop |
| **GitHub Pages** | push repo → Settings → Pages → branch `main` / root |
| **Vercel** | `npx vercel --prod` |
| **Cloudflare Pages** | New project → upload thư mục |

Trên điện thoại: mở link → **Thêm vào màn hình chính** là dùng như app.

## 📅 Tab Giáo án

7 việc theo giờ, mỗi việc 1 checkbox. Thanh tiến độ **x/7 việc xong**, việc đúng khung giờ hiện tại được gắn nhãn **BÂY GIỜ**.

| Giờ | Việc | Nút phụ trong app |
|---|---|---|
| 07:00 | Xem clip mới (không phụ đề) — 10' | |
| 07:10 | Xem lại có phụ đề Anh, gạch 5–7 từ — 15' | ➕ Nạp từ vừa gạch |
| 12:00 | Shadowing 5 câu hay nhất — 15' | ⏺ Ghi âm |
| 20:00 | Nghe bài hát chủ đề tuần — 15' | ➕ Nạp từ vừa gạch |
| 20:20 | Ghi âm kể lại clip sáng — 10' | ⏺ Ghi âm |
| trong ca làm | Bắt chuyện 1 câu với khách nước ngoài | ➕ Nạp từ vừa gạch |
| 21:00 | Ôn từ vựng kiểu nhớ lại chủ động — 5' | 🎮 Vào ôn từ ngay |

- **Tự reset sang ngày mới** (kể cả khi app đang mở). Nút `↺ Đặt lại cho ngày mới` để reset thủ công.
- **🔥 Chuỗi ngày**: chỉ tăng khi hôm trước tích **đủ cả 7 việc**.
- **⏺ Ghi âm**: dùng micro của máy, nghe lại ngay để so với bản gốc. Bản ghi **không được lưu lại** (tránh phình bộ nhớ) — tải lại trang là mất.
- Sửa giờ/việc cho hợp ca làm: ⚙️ Quản lý → **🗓 Sửa giáo án**.

Luồng trong ngày: gạch từ lúc sáng → bấm **➕ Nạp từ** → tối bấm **🎮 Vào ôn từ ngay** ở việc 21:00.

## 🎮 Tab Ôn từ — 5 bước

| Bước | Trong app | Vì sao |
|---|---|---|
| 1. Ngữ cảnh thật | Câu phim/nhạc, từ bị che `_____`, tự đọc câu lên | Não nhớ tình huống tốt hơn từ trơ trọi |
| 2. Mã hoá kép | Emoji/ảnh + phát âm (🔊 từ / câu / 🐢 chậm) + mẹo nhớ | Lưu qua nhiều kênh → dễ gọi lại |
| 3. **Nhớ lại chủ động** | **Gõ lại từ trước khi xem đáp án** | Quan trọng nhất — tạo "nỗ lực gọi nhớ" |
| 4. Lặp ngắt quãng | Tự chấm 😵 / 😓 / 🙂 / 😎 | Xếp lịch ôn đúng lúc sắp quên |
| 5. Output | Viết 1 câu của mình chứa từ + đọc to | "Hiểu được" → "dùng được" |

Từ mới đi đủ 5 bước; từ ôn lại vào thẳng bước 3 → 4 → 5.

**Ma trận ngắt quãng** (Leitner 6 bậc): **1 → 3 → 7 → 14 → 30 → 60 ngày**

- 😵 Quên → về bậc đầu, gặp lại ngay cuối phiên hôm nay
- 😓 Khó → giữ bậc · 🙂 Nhớ → +1 bậc · 😎 Dễ → +2 bậc

Thứ tự thẻ mỗi phiên được tráo ngẫu nhiên. Mặc định 5 từ mới/ngày, tối đa 40 thẻ ôn/phiên (chỉnh trong ⚙️).

## Nạp từ

⚙️ Quản lý → dán JSON / chọn file `.json` / form **Thêm nhanh 1 từ**. Chỉ `word` + `meaning` bắt buộc:

```json
[
  {
    "word": "reckon",
    "ipa": "/ˈrek.ən/",
    "pos": "verb",
    "meaning": "nghĩ rằng, cho là",
    "context": "I reckon we'll be there before midnight.",
    "contextVi": "Tôi nghĩ trước nửa đêm là tới nơi.",
    "source": "Peaky Blinders — S1E2",
    "emoji": "🤔",
    "image": "",
    "mnemonic": "réc-cần → rẹc cái là biết mình cần gì.",
    "outputPrompt": "Dùng 'reckon' nói một dự đoán của bạn."
  }
]
```

`id` tự sinh từ `word` — **nạp lại cùng từ = cập nhật nội dung, tiến độ học giữ nguyên**. Muốn lưu vĩnh viễn vào repo: **Tải words.json** rồi thay file và deploy lại.

## Sao lưu

Dữ liệu nằm trong localStorage của **đúng trình duyệt + đúng domain**. Xoá dữ liệu duyệt web là mất.

⚙️ Quản lý → **Tải backup** (bộ từ + tiến độ + giáo án + checkbox hôm nay) → **Khôi phục** trên máy/điện thoại khác.

## Phím tắt (desktop)

`Space` tiếp tục · `1`–`4` chấm điểm ở bước 4 · `S` nghe lại · `Ctrl/⌘+Enter` lưu câu ở bước 5
