# LingoBrain — Giáo án + Ôn từ (SM-2, 5 dạng kiểm tra)

Web tĩnh, **ưu tiên mobile**, giao diện giấy / máy đọc sách, không server, không AI. Tiến độ lưu trong `localStorage`. Cài được như app (PWA), chạy offline.

```
eng/
├── index.html        khung app (3 tab)
├── css/paper-theme.css
├── js/               13 module nhỏ (xem docs/system-architecture.md)
├── sw.js, manifest.json   PWA
├── words.json        bộ từ khởi điểm
└── tests/            node tests/run-tests.js · tests/run-tests.html
```

3 tab ở thanh dưới: **Giáo án** · **Ôn từ** · **Quản lý**. Số đỏ trên tab = việc còn lại / thẻ cần ôn.

## Chạy thử

```bash
npx serve .          # hoặc: python -m http.server 8080
node tests/run-tests.js
```

> Mở thẳng `index.html` (file://) vẫn chạy, nhưng trình duyệt chặn `fetch` nên bộ từ ban đầu trống. Nạp từ trong tab Quản lý là xong. PWA/offline chỉ hoạt động qua HTTPS hoặc localhost.

## Đẩy lên hosting (miễn phí)

| Cách | Thao tác |
|---|---|
| **Netlify Drop** | kéo thả thư mục vào https://app.netlify.com/drop |
| **GitHub Pages** | push repo → Settings → Pages → branch `main` / root |
| **Vercel** | `npx vercel --prod` |
| **Cloudflare Pages** | New project → upload thư mục |

Trên điện thoại: mở link → **Thêm vào màn hình chính** (iOS: nút Chia sẻ). Từ đó mở không mạng vẫn chạy.

**Khi deploy bản mới:** tăng `APP_VERSION` trong `js/app-storage.js` và `CACHE` trong `sw.js` (test `pwa-assets` bắt buộc 2 số này khớp). Người dùng sẽ thấy toast "Có bản mới → Tải lại".

## Tab Giáo án

7 việc theo giờ, mỗi việc 1 checkbox. Việc đúng khung giờ được đánh dấu **bây giờ**. Tự reset sang ngày mới. **Chuỗi ngày** chỉ tăng khi hôm trước tích đủ.

| Giờ | Việc | Nút phụ |
|---|---|---|
| 07:00 | Xem clip mới (không phụ đề) | |
| 07:10 | Xem lại có phụ đề, gạch 5–7 từ | + Nạp từ |
| 12:00 | Shadowing 5 câu | ⏺ Ghi âm |
| 20:00 | Nghe bài hát chủ đề tuần | + Nạp từ |
| 20:20 | Ghi âm kể lại clip sáng | ⏺ Ghi âm |
| trong ca | Bắt chuyện 1 câu với khách | + Nạp từ |
| 21:00 | Ôn từ | Vào ôn từ |

**Ghi âm**: gõ câu đang shadow → 🔊 nghe mẫu bằng giọng máy → ⏺ ghi → nghe lại A/B. Bản ghi lưu trên máy (IndexedDB), giữ 10 bản gần nhất mỗi việc, **không nằm trong backup**. iOS có thể xoá nếu 7 ngày không mở app.

## Tab Ôn từ

**Từ mới** đi 5 bước: 1 ngữ cảnh thật (nghĩa Việt giấu sau nút "Xem dịch") → 2 mã hoá kép (emoji, IPA, 🔊, mẹo nhớ) → 3 gõ lại từ → 4 chấm độ nhớ → 5 viết câu của mình.

**Từ ôn lại** vào thẳng bước 3 với **dạng kiểm tra xoay theo độ chín**, không lặp cùng dạng 2 lần liền:

| Từ đang ở | Dạng kiểm tra |
|---|---|
| mới / đang học / vừa quên | Gõ từ |
| lịch < 7 ngày | Gõ từ ↔ Nghe rồi gõ |
| lịch 7–30 ngày | Chọn nghĩa (4 đáp án) ↔ Điền vào câu bạn tự viết ↔ Nghe rồi gõ |
| lịch > 30 ngày | Nói ra tự chấm ↔ Điền câu bạn tự viết |

Chọn nghĩa cần ≥8 từ trong bộ; điền câu cần bạn đã lưu câu ở bước 5.

**Gõ từ** chấp nhận lệch 1 ký tự với từ ≥5 chữ (báo "≈ Gần đúng").

**Chấm & lịch ôn (SM-2, thuật toán Anki):** 😵 Quên · 😓 Khó · 🙂 Nhớ · 😎 Dễ. Mỗi từ có hệ số dễ riêng: từ hay quên giãn chậm, từ dễ giãn nhanh (1 → 3 → ×2.5 → …).

- **Từ mới / vừa quên** quay lại sau 4 thẻ trong cùng phiên; **đúng 2 lần liên tiếp** (hoặc 😎) mới ra lịch ngày. Đây là bước then chốt để nhớ lâu.
- Thẻ quá hạn lâu nhất luôn được ôn trước. Mặc định 5 từ mới/ngày, tối đa 40 thẻ ôn/phiên (chỉnh trong Quản lý).

**Thống kê** dưới thẻ: tỉ lệ nhớ 7/30 ngày, lịch tải 7 ngày tới, heatmap 30 ngày, từ hay quên (bấm để ôn ngay).

## Nạp từ

Quản lý → **Nạp từ mới**: dán mỗi dòng một từ, chỉ 2 cột đầu bắt buộc:

```
reckon | nghĩ rằng, cho là | I reckon we'll be there by midnight. | Peaky Blinders S1E2
stubborn | bướng bỉnh
```

Dấu tách: `|` (ưu tiên), tab, hoặc ` - `. Dòng bắt đầu `#` bị bỏ. Dán JSON như bản cũ vẫn được (trường `word`, `meaning`, `ipa`, `pos`, `context`, `contextVi`, `source`, `emoji`, `image`, `mnemonic`, `outputPrompt`). Form **Thêm 1 từ có chi tiết** cho IPA, mẹo nhớ.

`id` sinh từ `word`: **nạp lại cùng từ = cập nhật nội dung, tiến độ giữ nguyên**. Muốn lưu vào repo: **Tải words.json** rồi thay file.

App chỉ tự đọc `words.json` lần đầu (khi trình duyệt chưa có bộ từ). Đã thay `words.json` trên hosting mà app vẫn hiện bộ cũ → Quản lý → **Nạp lại words.json** (mở bằng `file://` thì dùng **Chọn file**).

## Sao lưu

Dữ liệu nằm trong trình duyệt + domain đang dùng. Quản lý → **Tải backup** (bộ từ + tiến độ + giáo án + hôm nay) → **Khôi phục** ở máy khác. Backup của bản cũ (Leitner) tự chuyển sang SM-2 khi khôi phục; tiến độ cũ trong trình duyệt cũng tự chuyển lần đầu mở bản mới (bản cũ giữ nguyên ở key `eng.srs.v1`).

## Phím tắt (desktop)

`Space` tiếp tục / kiểm tra · `1`–`4` chấm ở bước 4 · `S` nghe lại · `Ctrl/⌘+Enter` lưu câu ở bước 5

## Tài liệu

- `docs/system-architecture.md` — cấu trúc module, dữ liệu, thuật toán
- `docs/design-guidelines.md` — token màu/chữ giao diện giấy
- `plans/` — kế hoạch và báo cáo brainstorm
