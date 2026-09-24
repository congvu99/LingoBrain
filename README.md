# LingoBrain — Giáo án + Ôn từ (SM-2, 5 dạng kiểm tra)

Web tĩnh, **ưu tiên mobile**, giao diện xanh ngọc thân thiện, ưu tiên iPhone, không server, không AI. Tiến độ lưu trong `localStorage`. Cài được như app (PWA), chạy offline.

```
eng/
├── index.html        khung app (3 tab)
├── css/paper-theme.css
├── js/               15 module nhỏ (xem docs/system-architecture.md)
├── sw.js, manifest.json   PWA (cache /api/words, /api/audio-index)
├── server.js + server/      Node.js (auth, sync, bộ từ từ DB qua API)
├── words.json        bộ từ (nguồn biên tập + seed input + fallback offline)
├── audio/            MP3 giọng máy tạo sẵn + index.json
├── tools/            tạo MP3 (generate_edge_tts_audio.py), seed DB (seed-database.js), thêm mục Spoken core (spoken-core-batch.js)
└── tests/            node tests/run-tests.js · tests/run-tests.html
```

3 tab ở thanh dưới: **Giáo án** · **Ôn từ** · **Quản lý**. Số đỏ trên tab = việc còn lại / thẻ cần ôn.

## Chạy thử

```bash
# Development (local): tĩnh + API
npm install
npm start

# Hoặc chỉ tĩnh (offline mode):
npx serve .          # hoặc: python -m http.server 8080

# Tests:
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

**Khi deploy bản mới:**
- Tăng `APP_VERSION` trong `js/app-storage.js` và `CACHE` trong `sw.js` (test `pwa-assets` bắt buộc 2 số này khớp)
- Server tự nạp bộ từ từ `words.json` + `audio/index.json` nếu hash nội dung khác trong `deck_meta`; xem `node tools/seed-database.js --help` để tạo tài khoản chủ
- Máy người dùng (cả điện thoại/PWA) **tự lên bản mới**: mở app hoặc quay lại app từ nền thì tự kiểm tra, tải xong tự tải lại trang (đang chơi dở / đang gõ thì chờ xong); bộ từ cập nhật tự động qua `/api/words`

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

Hàng **Chơi nhanh** ở đầu tab Ôn từ. Năm game ngắn, luyện những thứ mà 5 dạng kiểm tra ở trên không chạm tới:

| Game | Luyện gì | Thể thức | Mở khi |
|---|---|---|---|
| **Xếp chữ** | chính tả, không cần bàn phím | 10 từ/ván, không đồng hồ — chạm chữ cái ghép thành từ | ≥8 từ đã học |
| **Chạy 60 giây** | phản xạ nhanh | 60 giây, thấy từ chọn nghĩa, chuỗi đúng 5 → ×1.5, 10 → ×2 | ≥8 từ đã học |
| **Điền câu tốc độ** | từ nào hợp câu nào | 60 giây, câu ví dụ khoét lỗ, chọn 1 trong 4 từ | ≥8 từ đã học **có câu ví dụ** |
| **Bắn máy bay** | nhớ chủ động + chính tả, dưới áp lực | nền vũ trụ; thiên thạch / tàu địch / tàu mẹ mang `emoji + nghĩa Việt` lao về tàu bạn. Mỗi chữ cái gõ đúng bắn 1 viên đạn, chữ cuối làm nổ tung. Từ càng dài bay càng chậm; 3 ❤️, mỗi 5 lần hạ thì nhanh hơn 8% | ≥8 từ đã học |
| **Chém chữ** | phân biệt từ na ná, nhìn nghĩa nhận ra từ | kiểu Fruit Ninja trên nền gỗ: đề là `emoji + nghĩa Việt`, mỗi đợt tung 3–5 quả mang từ tiếng Anh, 1 quả đúng, còn lại là bom — từ đã học viết na ná. Vuốt chém quả đúng; 3 ❤️ | ≥8 từ đã học (≤16 ký tự) |

**Chơi game không làm giãn lịch ôn.** Trả lời đúng không ghi gì vào SM-2; trả lời sai thì từ đó được đẩy lên đầu phiên ôn kế tiếp. Nói cách khác game chỉ rút ngắn lịch, không bao giờ kéo dài — đoán mò trong 4 đáp án sẽ không làm hỏng tiến độ.

Chip bị xám nghĩa là chưa đủ điều kiện, chạm vào sẽ nói rõ còn thiếu gì. **Điền câu tốc độ** cần từ đã học có trường `context` (câu ví dụ) trong `words.json`.

**Bắn máy bay:** chọn cấp **Dễ / Vừa / Khó** rồi bấm **Bắt đầu** (iPhone: để bật bàn phím; khung chơi tự co vừa phần trên bàn phím). Dễ rơi chậm (15s), ít mục tiêu, hiện sẵn chữ cái đầu; Vừa 11s; Khó 8s và đông hơn. Mỗi cấp một kỷ lục, cấp lần trước được chọn sẵn. **Muốn hạ mục tiêu nào thì gõ từ của nó** — game không tự chọn thay bạn. Mọi mục tiêu có từ bắt đầu bằng chữ đang gõ đều hiện tiến độ (`s t u _ _ _ _ _`). Khi chữ đang gõ còn khớp nhiều từ (`re` → `reckon` / `reach out`), game không chọn thay: đạn vẫn bắn ra theo từng chữ nhưng lơ lửng chờ trên tàu; chữ tiếp theo chốt mục tiêu và toàn bộ đạn chờ lao vào nó. Đổi ý giữa chừng cứ gõ từ khác, không cần xoá. Tàu của bạn nghiêng mình bay sang phía mục tiêu đang bắn. Hai từ trùng đầu như `give` / `give up`: gõ tiếp `up` để hạ `give up`, hoặc **Enter** để hạ `give`; Enter khi chưa gõ trọn từ nào thì xoá chữ đang gõ. Dấu cách, gạch nối tự bỏ qua. Gõ sai chỉ làm đạn bay trượt, không trừ điểm; sai 3 chữ trên cùng một mục tiêu thì từ đó được ôn trước. Mục tiêu chạm tàu: mất 1 ❤️, từ hiện màu đỏ và vào danh sách ôn trước. Đóng bàn phím, chuyển app, bấm ⏸ hoặc Esc thì tạm dừng. Nên tắt Telex/Unikey khi chơi.

**Chém chữ:** chọn **Dễ / Vừa / Khó** (3 / 4 / 5 quả mỗi đợt; Dễ lấy bom ngẫu nhiên, Vừa và Khó lấy bom **na ná** từ đúng — `stubborn` đi cùng `stubby`, `stumble`). Vuốt ngón tay (hoặc kéo chuột) qua quả mang từ đúng; chạm không vuốt không chém. **Một nhát được chấm lúc nhả tay** (hoặc sau 0,6 giây): trúng bom nào — kể cả khi trúng luôn quả đúng — là sai, nên quét bừa cả màn không ghi được điểm. Chém nhầm hoặc để quả đúng rơi: mất 1 ❤️, quả đúng sáng xanh và được đọc to, từ đó vào danh sách ôn trước. Điểm: 10 × combo, ×2 khi cả đợt viền vàng (từ bạn hay quên), +5 nếu chém trong 1 giây. Mỗi 5 lần đúng quả bay nhanh hơn. Màn kết thúc liệt kê **cặp hay nhầm** (`stubborn ✂️ stumble ×2`). Chuyển app, bấm ⏸ hoặc Esc thì tạm dừng. Mỗi cấp một kỷ lục. Trong Safari (không phải app đã cài), vuốt sát mép trái có thể bị hiểu là "quay lại" — khung chơi đã chừa lề, nên cài app ra màn hình chính khi chơi.

Bỏ ván giữa chừng (đổi tab hoặc bấm ←) thì không tính điểm, nhưng **từ vừa sai vẫn vào hàng đợi ôn**. Kỷ lục mỗi game lưu trên máy và nằm trong file backup.

## Pháp Sư Lexoria

Chip riêng (khác 5 game "Chơi nhanh" ở trên) trong hàng game, mở khi có ≥8 từ đã học. Pháp sư (chọn nam/nữ) đánh quái theo cốt truyện 4 chương × 7 trận + chế độ **Luyện phép** (không giới hạn ngày) và **vô tận** (sau khi hết 28 trận truyện).

- Đề hiện `emoji + nghĩa Việt`; **gõ đúng từ tiếng Anh = niệm chú**. Gõ càng nhanh, sát thương phép càng cao; đang gõ đúng thì thời gian trận chậm hẳn lại (buông tay hoặc gõ sai >1,5 giây thì trở lại bình thường).
- Bậc chiêu (1–3 sao) không tính theo ngưỡng tuyệt đối, mà xếp hạng **tương đối trong chính bộ từ người chơi đang có**: 30% từ khó nhất luôn ra chiêu bậc 3, 40% giữa ra bậc 2, còn lại bậc 1 — người mới học vẫn thấy đủ 3 bậc chiêu ngay từ đầu.
- Trùm đánh liên tục theo một đồng hồ chạy — hết giờ trước khi hạ trùm thì mất 1 tim; hạ trùm trước khi hết tim thì thắng.
- Lên cấp có điểm để đổ vào cây kỹ năng 5 nguyên tố (Lửa · Băng · Sét · Đất · Gió); đủ điểm mở tuyệt kỹ (Shift+Enter khi đủ Nộ) và các hiệu ứng nội tại của nhánh.
- Chỉ chơi được **1 trận cốt truyện mỗi ngày**; chơi thêm thì vào chế độ Luyện phép (không cộng tiến trình truyện, vẫn cộng XP).
- Buff "Ôn từ": ôn xong hết thẻ đến hạn trong ngày (không tính từ mới) sẽ được cộng thêm hiệu quả cho trận hôm đó.
- **Không đụng lịch SM-2**: giống các game khác, trả lời sai chỉ đẩy từ đó vào `gameMiss` để lên đầu phiên ôn kế tiếp — Pháp Sư Lexoria không tự ghi điểm, không đổi `ef`/`ivl`/`due`.
- Tiến trình (`eng.boss.v1`: cấp, XP, cây kỹ năng, giới tính, trường phái, trận đã thắng, vết thương trận dở) đồng bộ đa máy như tiến độ học, và nằm trong file **Tải backup**. **Khôi phục backup luôn gộp** tiến trình Pháp sư (lấy XP/cấp cao hơn, dồn các trận đã thắng) — không bao giờ làm tụt cấp hay xoá tiến trình đang có, dù đăng nhập hay không.
- Nút **Xoá tiến độ** (Góc của bạn) chỉ xoá lịch ôn SM-2 — **không đụng tiến trình Pháp sư**, giống cách nó không đụng kỷ lục các game khác.

## Bộ từ

Bộ từ đọc từ **API `/api/words` (DB)** nếu có, hoặc **fallback `words.json`** nếu lỗi/offline. Người dùng không nạp, thêm, sửa hay xoá từ được. Tab Quản lý chỉ hiện danh sách từ để xem.

- Client: tải từ API trước (cache qua service worker network-first); lỗi 404, 503 hoặc offline → dùng `words.json`. Chỉ lấy tiến độ (pruneSrs) khi bộ từ đến từ API — bản fallback có thể lệch DB nên không bao giờ được xoá tiến độ.
- Chỉnh sửa: sửa `words.json` (+ tạo lại audio `python tools/generate_edge_tts_audio.py` nếu cần) → commit → deploy → server tự cập nhật DB từ `words.json` + `audio/index.json` khi nhận thấy hash nội dung đổi. Không chạy CLI với file local lên production.
- Trường: `word`, `meaning` (bắt buộc), `ipa`, `pos`, `context`, `contextVi`, `source`, `emoji`, `image`, `mnemonic`, `outputPrompt`. `id` sinh từ `word` nếu thiếu.
- Tiến độ gắn theo `id`: sửa nội dung từ thì tiến độ giữ nguyên; **gỡ từ khỏi `words.json` thì tiến độ của từ đó bị xoá** ở lần mở kế tiếp khi bộ từ từ API (tải từ file không xoá gì).
- Backup (Góc của bạn → Tải backup) chỉ gồm tiến độ, giáo án, cài đặt, kỷ lục game. Khôi phục backup bản cũ có kèm bộ từ thì phần bộ từ bị bỏ qua.
- Thành phần (~5030 mục): 2500 từ Oxford 3000/5000 (A1–B2) + ~2530 mục **Spoken core** cho giao tiếp với người bản địa — `source` = `Spoken core · phrasal verb` (703), `· chunk` (841 cụm nói sẵn), `· discourse` (166 từ nối/rút gọn như gonna, I mean), `· word` (818 từ đơn khẩu ngữ lọc từ tần suất phụ đề phim).
- Thứ tự = thứ tự thẻ mới: mục phim đầu, rồi lặp 2 Oxford : 1 Spoken; trong Spoken xoay vòng chunk → word → phrasal verb → discourse. Oxford hết (~thẻ 3750) thì phần Spoken còn lại nối cuối.
- Thêm mục Spoken theo đợt: `node tools/spoken-core-batch.js check <batch.json>` (kiểm id = slug(word), trùng, IPA, context chứa từ liền mạch, emoji/prompt riêng…) → `merge <batch.json>` (gộp + sắp lại) → tạo MP3. `reorder` chỉ sắp lại, chạy lại không đổi gì.

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

Dữ liệu nằm trong trình duyệt + domain đang dùng. Góc của bạn → **Tải backup** (tiến độ + giáo án + hôm nay + kỷ lục game + tiến trình Pháp Sư Lexoria) → **Khôi phục** ở máy khác. Backup của bản cũ (Leitner) tự chuyển sang SM-2 khi khôi phục; tiến độ cũ trong trình duyệt cũng tự chuyển lần đầu mở bản mới (bản cũ giữ nguyên ở key `eng.srs.v1`). Riêng tiến trình Pháp sư luôn **gộp**, không bị backup cũ hơn ghi đè (xem mục Pháp Sư Lexoria).

## Phím tắt (desktop)

`Space` tiếp tục / kiểm tra · `1`–`4` chấm ở bước 4 · `S` nghe lại · `Ctrl/⌘+Enter` lưu câu ở bước 5

## Tài liệu

- `docs/system-architecture.md` — cấu trúc module, dữ liệu, thuật toán, ranh giới game ↔ SM-2
- `docs/design-guidelines.md` — màu, chữ và bố cục giao diện
- `plans/` — kế hoạch và báo cáo brainstorm
