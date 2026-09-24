# Brainstorm — Pháp Sư Lexoria (game đấu trùm RPG niệm chú bằng gõ từ)

- Ngày: 2026-09-24 · Trạng thái: **đã duyệt thiết kế** · Flags: không
- Game id đề xuất: `boss` · Tên tạm: **Pháp Sư Lexoria**

## 1. Vấn đề & yêu cầu

**Vấn đề thật (user xác nhận):** 5 game hiện có (Xếp chữ, Chạy 60s, Điền câu, Bắn máy bay, Chém chữ) *thiếu lý do quay lại* — chơi vài lần là chán, không có tiến trình/việc dở dang/cốt truyện.

**Ghi nhận từ scout:**
- PWA JS thuần, canvas cho game; pattern `*-game-logic.js` (thuần, có test) + render + ui; đăng ký ở `js/word-games.js` (`GAME_IDS`).
- Luật chung game ↔ SM-2: đúng không ghi gì, sai → từ lên đầu phiên ôn kế (`addMiss`). Game mới **giữ nguyên** luật này.
- 2505 từ, 100% có `context/contextVi/ipa/emoji`; 5010 MP3 Neural (từ + câu); `speech-synthesis.js` đã xử lý unlock audio iOS.
- Gõ trên iPhone + co khung theo bàn phím đã giải ở `plane-game-typing.js` / `plane-game-ui.js` → tái dùng.
- `sync-merge.js` đồng bộ whitelist key, `gameScore` gộp `max` → dữ liệu mới phải thiết kế mergeable (giao hoán).

**Output mong đợi:** game thứ 6 trong hàng "Chơi nhanh", chơi được trên iPhone PWA + desktop, tiến trình đồng bộ giữa máy, nằm trong backup.

## 2. Các hướng đã xét

| Hướng | Ưu | Nhược | Kết luận |
|---|---|---|---|
| A. Điệp viên radio (nghe) | lấp lỗ hổng nghe, dùng MP3 sẵn, rủi ro thấp | không giải "lý do quay lại" | loại vòng này |
| B. Tàu ghép câu (trật tự từ) | luyện ngữ pháp, dữ liệu sẵn | ít "wow" | loại |
| C. Ô chữ mỗi ngày | thong thả, thói quen ngày | thuật toán sinh khó, vẫn nghĩa→chính tả | loại |
| **D. Đấu trùm RPG** | giải thẳng retention: việc dở dang + tiến trình + truyện | phạm vi lớn | **chọn, thu gọn** |

Biến thể D: D1 trùm mỗi ngày (**chọn**) · D2 chiến dịch bản đồ (rộng x2–3) · D3 biến phiên Ôn từ thành trận (loại: tự chấm 😎 để chém mạnh → phá lịch SM-2).

Các quyết định user đã chốt (theo thứ tự): D1 → thêm Cấp/XP + Buff từ Ôn từ → lên cấp mở chiêu → không giới hạn lượt → **Canvas** (thay DOM) → thêm cốt truyện fantasy châu Âu → **chỉ Pháp sư (nam/nữ), bỏ Hiệp sĩ, niệm chú = gõ từ**, gõ nhanh = mạnh, cây **5 nguyên tố** → thẻ truyện + Nhật ký → truyện Việt + từ Anh → Lửa·Băng·Sét·Đất·Gió → đồng hồ liên tục → **từ khó = chiêu lớn, mọi chiêu có hiệu ứng đẹp, chậm thời gian khi gõ**.

## 3. Giải pháp chốt

### 3.1 Thế giới & hành trình
Vương quốc **Lexoria**; rồng **Oblivion — Kẻ Nuốt Lời** hút chữ khỏi thế gian; mỗi từ tiếng Anh nhớ được là 1 rune. Người chơi = pháp sư (chọn nam/nữ, chỉ khác ngoại hình).

4 chương × 7 trận (6 quái + 1 trùm chương) = 28 trận. Tiến truyện theo **số trận thắng**, tối đa **1 trận cốt truyện/ngày** (móc quay lại). Thua → trùm giữ vết thương trong ngày, đánh lại ngay, không giới hạn lượt. Xong trận ngày → **Luyện phép** (quái ngẫu nhiên, chỉ XP). Hết 28 trận → vô tận.

| Ch. | Vùng | Quái | Trùm chương | Yếu |
|---|---|---|---|---|
| 1 | Làng Ashford | Goblin, Sói | Vua Goblin | 🔥 |
| 2 | Hầm mộ | Xương, Ma | Lich | 🌿 |
| 3 | Núi đá | Troll, Harpy | Wyvern | ❄️ |
| 4 | Hang rồng | Hiệp sĩ đen, Rồng con | Oblivion | ⚡ |

Truyện: thẻ 2–3 câu trước trận, 1–2 câu sau thắng; tiếng Việt cài từ Anh trong bộ từ (đã học → tô màu, bấm nghe). **Nhật ký hành trình** đọc lại đoạn đã mở.

### 3.2 Trận đấu
- Đề: `emoji + nghĩa Việt`; **gõ đúng từ = niệm chú**. Chỉ bốc từ **đã học**, ưu tiên từ khó/hay sai (từ chưa học không thể làm chú — không thể gõ từ chưa thấy).
- Trùm đánh theo **đồng hồ liên tục**: Dễ 12s / Vừa 10s / Khó 8s (cấp nới mốc cho iPhone). 3 ❤️.
- Sai 3 chữ trên 1 từ hoặc bấm Bỏ → phép tắt, lộ từ, từ vào danh sách ôn trước.
- Quái ~250 HP, trùm chương ~500 HP.

**Sát thương** = `gốc(bậc) × tốc độ(1–2) × khắc hệ(1.5)`
- Tốc độ so mốc `1,5s + 0,35s/chữ`, đo bằng **thời gian thật**.

**Bậc chiêu theo độ khó từ** (báo trước trên thẻ đề — Đại chú viền vàng, rune rực):

| Bậc | Điều kiện | Gốc |
|---|---|---|
| ✦ Chú nhỏ | từ quen (interval dài, ease cao) | 10 |
| ✦✦ Chú lớn | trung bình hoặc dài ≥7 | 20 |
| ✦✦✦ Đại chú | lapses ≥2, ease <2.0, đang học/vừa quên, hoặc dài ≥10 | 40 |

Niệm xong → phát MP3 của từ (luyện nghe miễn phí).

**Chậm thời gian khi gõ:** gõ chữ đầu → thế giới ×0.35 (đồng hồ trùm, hoạt ảnh, hạt), viền tối + nhạt màu + zoom nhẹ, mỗi chữ đúng thắp 1 rune quanh vòng phép. Niệm xong → bật về ×1 đúng lúc chiêu nổ. Ngừng gõ >1,5s → về ×1 (chặn lạm dụng).

### 3.3 Cây 5 nguyên tố
Mỗi cấp +1 điểm; 15 điểm max (~5–6 tuần). Trước trận chọn 1 **trường phái** (màu phép, khắc hệ, tuyệt kỹ). **Nộ** +1/phép, đầy 8 → tuyệt kỹ.

| | Bậc 1 | Bậc 2 | Bậc 3 — tuyệt kỹ |
|---|---|---|---|
| 🔥 Lửa | +15% sát thương | thiêu đốt 5/s × 3s | Mưa sao băng: 3 phép kế ×3 |
| ❄️ Băng | đồng hồ trùm +1,5s | 25% đóng băng trùm 3s | Kỷ băng hà: dừng đồng hồ 8s |
| ⚡ Sét | nới mốc tốc độ 20% | tốc độ max → chí mạng ×1.5 | Xích sét: 3 phép kế đánh 2 lần |
| 🌿 Đất | +1 ❤️ tối đa | khiên chặn 1 đòn/trận | Hồi sinh: hồi đầy ❤️ |
| 🌪️ Gió | hiện chữ cái đầu | tha 1 lỗi gõ/từ | Lốc xoáy: đồng hồ trùm về 0 |

**Mọi chiêu có hiệu ứng:** 5 hệ × 3 bậc = 15 phép + 5 tuyệt kỹ (cắt cảnh ~1,5s) + hiệu ứng nội tại (lửa âm ỉ, băng phủ đồng hồ, sét nảy, khiên đất, gió cuốn chữ gợi ý).

### 3.4 XP & buff
- XP ≈ sát thương/2; thắng trận truyện +100; mốc cấp cộng dồn 100·n.
- **Buff từ Ôn từ:** hôm nay đã ôn hết thẻ due (≥1 thẻ ôn và 0 due) → +1 ❤️, XP ×1.5. Game **chỉ đọc** SM-2.

### 3.5 Đồ hoạ
Canvas: nền theo vùng; pháp sư nam/nữ có động tác vung trượng; quái từ **5 dáng tham số** (người/thú/xác sống/bay/rồng) × màu/chi tiết → 12 con. **Bộ máy hạt dựng theo cấu hình**: mỗi hiệu ứng = config (màu, hình hạt, quỹ đạo, lớp additive) + vài hàm vẽ riêng (trận đồ, thiên thạch, tia sét). Trần ~300 hạt, tự hạ chất lượng khi FPS <45.

### 3.6 Dữ liệu & đồng bộ
Key `eng.boss.v1` (thêm vào `SYNC_KEYS` + backup):
```
{ xp, wins:[date…], day:{date, dmg}, prefs:{data:{gender, element, alloc}, ts} }
```
Merge: `xp` max · `wins` hợp (tiến truyện = `wins.length`, chuỗi ngày suy từ `wins`) · `day.dmg` max nếu cùng ngày, khác ngày lấy ngày mới · `prefs` pickTs. Điểm kỹ năng còn = `level-1 − Σalloc` (kẹp ≥0). Ngày theo giờ máy.

## 4. File dự kiến
Mới (mỗi file <200 dòng): `boss-game-logic.js` (máy trạng thái trận, sát thương, đồng hồ, chậm thời gian) · `boss-game-elements.js` (cây nguyên tố + hiệu ứng số) · `boss-game-progress.js` (XP/cấp/ngày/wins/merge) · `boss-game-story.js` (chương, quái, 28 đoạn) · `boss-game-particles.js` (bộ máy hạt + preset) · `boss-game-spell-art.js` · `boss-game-mage-art.js` · `boss-game-monster-art.js` · `boss-game-render.js` · `boss-game-ui.js` · `boss-game-hub-ui.js` (chọn pháp sư, cây, Nhật ký).
Sửa: `js/word-games.js`, `js/sync-merge.js`, `js/app-storage.js` (key, backup), `index.html`, `sw.js` + `APP_VERSION`, `README.md`, `docs/system-architecture.md`, tests.
Cân nhắc: tách phần dùng chung từ `plane-game-typing.js` nếu cần, không copy.

## 5. Phase
1. Logic thuần + test (chiến đấu, bậc chiêu, sát thương, đồng hồ, nguyên tố, XP, merge).
2. Trận tối thiểu: gõ, canvas, bộ máy hạt, chậm thời gian, pháp sư nam/nữ, 5 phép bậc 1.
3. Phép bậc 2–3, 5 tuyệt kỹ, hiệu ứng nội tại.
4. Quái (5 dáng → 12), dữ liệu truyện 28 đoạn, thẻ truyện, Nhật ký.
5. Màn chính: chọn pháp sư, cây nguyên tố, trường phái, buff Ôn từ.
6. Tích hợp: sync, backup, PWA/version, docs, cân bằng, kiểm tra FPS iPhone.

Cắt khẩn cấp: phase 1–2 + 6 rút gọn = bản chơi được.

## 6. Rủi ro
- **Khối lượng** — game lớn nhất app (~11 file + 28 đoạn truyện + ~25 hiệu ứng).
- **Hiệu năng iPhone** — canvas nhiều hạt additive; cần trần hạt + hạ chất lượng động.
- **Cân bằng** — HP, đồng hồ, mốc tốc độ phải chơi thử trên iPhone.
- **Hợp đồng sync** — sửa `sync-merge.js` cần test giao hoán/kết hợp.
- Lạm dụng chậm thời gian — đã chặn bằng timeout 1,5s + đo tốc độ theo thời gian thật.

## 7. Tiêu chí xong
- Game thứ 6 hiện trong "Chơi nhanh", mở khi ≥8 từ đã học.
- Gõ đúng → phép nổ đúng bậc (Đại chú với từ hay quên), MP3 đọc từ; gõ → thời gian chậm, niệm xong → bật lại.
- Thắng trận truyện → thẻ truyện + Nhật ký mở đoạn mới; trận truyện kế chỉ mở ngày mai.
- Đánh dở, mở máy khác → máu trùm đúng; XP/cấp/cây nguyên tố đồng bộ.
- Lên cấp → có điểm cộng vào nhánh; tuyệt kỹ bậc 3 dùng được khi Nộ đầy.
- Ôn xong hôm nay → trận có +1 ❤️.
- Từ sai/bỏ → đầu phiên ôn kế; SM-2 không bị ghi gì khác.
- FPS ≥45 trên iPhone khi tung tuyệt kỹ; `node tests/run-tests.js` xanh.

## 8. Ngoài phạm vi
Câu hỏi nghe, trang bị, tổ đội/Hiệp sĩ, bảng xếp hạng, visual novel, từ chưa học, âm thanh hiệu ứng tổng hợp.

## Câu hỏi chưa giải
- Tên chính thức của game (tạm "Pháp Sư Lexoria")?
- Ai viết 28 đoạn truyện — Claude soạn nháp rồi user duyệt?
- Âm thanh hiệu ứng phép (ngoài MP3 từ) có cần ở vòng sau không?
