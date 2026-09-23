# LingoBrain — Giáo án + Ôn từ (SM-2, 5 dạng kiểm tra)

Web tĩnh, **ưu tiên mobile**, giao diện xanh ngọc thân thiện, ưu tiên iPhone, không server, không AI. Tiến độ lưu trong `localStorage`. Cài được như app (PWA), chạy offline.

```
eng/
├── index.html        khung app (3 tab)
├── css/paper-theme.css
├── js/               13 module nhỏ (xem docs/system-architecture.md)
├── sw.js, manifest.json   PWA
├── words.json        bộ từ (nguồn duy nhất, người dùng không sửa được)
├── audio/            MP3 giọng máy tạo sẵn + index.json
├── tools/            tạo MP3 (generate_edge_tts_audio.py)
└── tests/            node tests/run-tests.js · tests/run-tests.html
```

3 tab ở thanh dưới: **Giáo án** · **Ôn từ** · **Quản lý**. Số đỏ trên tab = việc còn lại / thẻ cần ôn.

## Chạy thử

```bash
npx serve .          # hoặc: python -m http.server 8080
node tests/run-tests.js
```

> Phải chạy qua HTTP(S) hoặc localhost: mở thẳng `index.html` (file://) thì trình duyệt chặn `fetch`, không đọc được `words.json` → báo "Chưa tải được bộ từ". PWA/offline cũng chỉ hoạt động qua HTTPS hoặc localhost.

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
| 07:10 | Xem lại có phụ đề, gạch 5–7 từ | Vào ôn từ → |
| 12:00 | Shadowing 5 câu | ⏺ Ghi âm |
| 20:00 | Nghe bài hát chủ đề tuần | Vào ôn từ → |
| 20:20 | Ghi âm kể lại clip sáng | ⏺ Ghi âm |
| trong ca | Bắt chuyện 1 câu với khách | Vào ôn từ → |
| 21:00 | Ôn từ | Vào ôn từ |

**Ghi âm**: gõ câu đang shadow → 🔊 nghe mẫu (MP3 Neural hoặc Web Speech) → ⏺ ghi → nghe lại A/B. Bản ghi lưu trên máy (IndexedDB), giữ 10 bản gần nhất mỗi việc, **không nằm trong backup**. iOS có thể xoá nếu 7 ngày không mở app.

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
- Thẻ quá hạn lâu nhất luôn được ôn trước. Mặc định 5 từ mới/ngày, tối đa 40 thẻ ôn/phiên (chỉnh trong Góc của bạn).

**Thống kê** dưới thẻ: tỉ lệ nhớ 7/30 ngày, lịch tải 7 ngày tới, heatmap 30 ngày, từ hay quên (bấm để ôn ngay).

## Game từ vựng

Hàng **Chơi nhanh** ở đầu tab Ôn từ. Bốn game ngắn, luyện những thứ mà 5 dạng kiểm tra ở trên không chạm tới:

| Game | Luyện gì | Thể thức | Mở khi |
|---|---|---|---|
| **Xếp chữ** | chính tả, không cần bàn phím | 10 từ/ván, không đồng hồ — chạm chữ cái ghép thành từ | ≥8 từ đã học |
| **Chạy 60 giây** | phản xạ nhanh | 60 giây, thấy từ chọn nghĩa, chuỗi đúng 5 → ×1.5, 10 → ×2 | ≥8 từ đã học |
| **Điền câu tốc độ** | từ nào hợp câu nào | 60 giây, câu ví dụ khoét lỗ, chọn 1 trong 4 từ | ≥8 từ đã học **có câu ví dụ** |
| **Bắn máy bay** | nhớ chủ động + chính tả, dưới áp lực | nền vũ trụ; thiên thạch / tàu địch / tàu mẹ mang `emoji + nghĩa Việt` lao về tàu bạn. Mỗi chữ cái gõ đúng bắn 1 viên đạn, chữ cuối làm nổ tung. Từ càng dài bay càng chậm; 3 ❤️, mỗi 5 lần hạ thì nhanh hơn 8% | ≥8 từ đã học |

**Chơi game không làm giãn lịch ôn.** Trả lời đúng không ghi gì vào SM-2; trả lời sai thì từ đó được đẩy lên đầu phiên ôn kế tiếp. Nói cách khác game chỉ rút ngắn lịch, không bao giờ kéo dài — đoán mò trong 4 đáp án sẽ không làm hỏng tiến độ.

Chip bị xám nghĩa là chưa đủ điều kiện, chạm vào sẽ nói rõ còn thiếu gì. **Điền câu tốc độ** cần từ đã học có trường `context` (câu ví dụ) trong `words.json`.

**Bắn máy bay:** bấm **Bắt đầu** (iPhone: để bật bàn phím; khung chơi tự co vừa phần trên bàn phím). Gõ chữ cái đầu là khoá vào mục tiêu gần tàu nhất có từ bắt đầu bằng chữ đó, tàu của bạn nghiêng mình bay sang phía mục tiêu; chữ đã gõ đúng hiện dần dưới nhãn (`s t u _ _ _ _ _`). Dấu cách, gạch nối tự bỏ qua. **Enter** nhả khoá để đổi mục tiêu. Gõ sai chỉ làm đạn bay trượt, không trừ điểm; sai 3 chữ trên cùng một mục tiêu thì từ đó được ôn trước. Mục tiêu chạm tàu: mất 1 ❤️, từ hiện màu đỏ và vào danh sách ôn trước. Đóng bàn phím, chuyển app, bấm ⏸ hoặc Esc thì tạm dừng. Nên tắt Telex/Unikey khi chơi.

Bỏ ván giữa chừng (đổi tab hoặc bấm ←) thì không tính điểm, nhưng **từ vừa sai vẫn vào hàng đợi ôn**. Kỷ lục mỗi game lưu trên máy và nằm trong file backup.

## Bộ từ

Bộ từ **chỉ** lấy từ `words.json`; người dùng không nạp, thêm, sửa hay xoá từ được. Tab Quản lý chỉ hiện danh sách từ để xem.

- Mỗi lần mở app đều tải `words.json` (service worker network-first: có mạng lấy bản mới nhất, mất mạng dùng bản đã cache). Sửa `words.json` rồi deploy là người dùng thấy ở lần mở kế tiếp.
- Trường: `word`, `meaning` (bắt buộc), `ipa`, `pos`, `context`, `contextVi`, `source`, `emoji`, `image`, `mnemonic`, `outputPrompt`. `id` sinh từ `word` nếu thiếu.
- Tiến độ gắn theo `id`: sửa nội dung từ thì tiến độ giữ nguyên; **gỡ từ khỏi `words.json` thì tiến độ của từ đó bị xoá** ở lần mở kế tiếp (tải `words.json` lỗi thì không xoá gì).
- Backup (Góc của bạn → Tải backup) chỉ gồm tiến độ, giáo án, cài đặt, kỷ lục game. Khôi phục backup bản cũ có kèm bộ từ thì phần bộ từ bị bỏ qua.

## Tạo MP3 giọng máy

Sau khi sửa `words.json` (thêm/xoá từ), chạy:

```bash
pip install -r tools/requirements.txt
python tools/generate_edge_tts_audio.py            # toàn bộ (idempotent)
python tools/generate_edge_tts_audio.py --limit 5  # thử 5 từ đầu
python tools/generate_edge_tts_audio.py --voice en-US-AndrewNeural  # đổi giọng
```

Tạo ra `audio/<sha1-12>.mp3` (một file per từ+ngữ cảnh) + `audio/index.json` ánh xạ. Giọng mặc định `en-US-ChristopherNeural`; khi phát, ưu tiên MP3 nếu có, nếu lỗi → Web Speech. Test `tests/audio-manifest.test.js` kiểm tra toàn vẹn (bộ từ có MP3, không file thừa).

> edge-tts dùng endpoint không chính thức của Microsoft: hợp dự án cá nhân, có thể ngừng chạy bất cứ lúc nào. MP3 đã tạo vẫn dùng mãi; câu không có MP3 (vd. câu người dùng tự gõ) đọc bằng Web Speech.

## Sao lưu

Dữ liệu nằm trong trình duyệt + domain đang dùng. Góc của bạn → **Tải backup** (bộ từ + tiến độ + giáo án + hôm nay + kỷ lục game) → **Khôi phục** ở máy khác. Backup của bản cũ (Leitner) tự chuyển sang SM-2 khi khôi phục; tiến độ cũ trong trình duyệt cũng tự chuyển lần đầu mở bản mới (bản cũ giữ nguyên ở key `eng.srs.v1`).

## Phím tắt (desktop)

`Space` tiếp tục / kiểm tra · `1`–`4` chấm ở bước 4 · `S` nghe lại · `Ctrl/⌘+Enter` lưu câu ở bước 5

## Tài liệu

- `docs/system-architecture.md` — cấu trúc module, dữ liệu, thuật toán, ranh giới game ↔ SM-2
- `docs/design-guidelines.md` — màu, chữ và bố cục giao diện
- `plans/` — kế hoạch và báo cáo brainstorm
