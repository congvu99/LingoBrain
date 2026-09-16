# Brainstorm — 3 game từ vựng cho LingoBrain

- Ngày: 2026-09-16
- Trạng thái: đã chốt, chờ lập kế hoạch
- Cờ: không (`--html` / `--wiki` không dùng)
- Nhánh: `main`

## 1. Vấn đề

Yêu cầu ban đầu: "thêm 1 hoặc 2 game khác liên quan tới từ vựng".

Đảo ngược về vấn đề thật: app **không thiếu bài tập** — đã có 5 dạng kiểm tra (`type · dictation · mcq · owncloze · speak`) xoay theo độ chín của từ. Thêm game chỉ đáng làm nếu lấp lỗ hổng thật. Ba lỗ hổng xác định được:

1. **Chính tả / hình dạng chữ** — chỉ luyện qua gõ bàn phím; trên mobile bàn phím tự sửa và che nửa màn hình
2. **Tốc độ / phản xạ tự động** — mọi dạng hiện tại không giới hạn thời gian; nhớ chậm ≠ dùng được khi nói
3. **Từ nào hợp câu nào (collocation)** — `mcq` chọn *nghĩa*, chưa dạng nào bắt chọn *từ* trong câu thật

## 2. Bối cảnh codebase

- Web tĩnh, không server, PWA, mobile-first, theme giấy. 3 tab dưới: `plan · game · manage`
- SM-2 thật trong `js/srs-scheduler.js` (ef/ivl/due/state/lapses/hist) — đã có test Node
- Tách sẵn: module thuần (test được) vs module DOM. Runner nạp `PURE_MODULES` trong `tests/run-tests.js`
- Tái dùng được: `buildMcqOptions()`, `speak()`, `fuzzyMatch()`, `blanked()`, `esc()`, `load/save()`
- Trường từ: `word, ipa, pos, meaning, context, contextVi, source, emoji, mnemonic, outputPrompt` — `context` là optional (nạp text 2 cột không có)
- Ràng buộc: file < 200 dòng · thêm file phải thêm `<script>` vào `index.html`, thêm vào `ASSETS` của `sw.js`, bump `APP_VERSION` + `CACHE` (test `pwa-assets` bắt buộc khớp)

## 3. Các phương án đã cân nhắc

| Game | Lỗ hổng lấp | Dữ liệu cần | Công sức | Giá trị học | Kết luận |
|---|---|---|---|---|---|
| A. Xếp chữ | chính tả, không cần bàn phím | `word`+`meaning` (100% từ) | ~120 dòng | Cao | **Chọn** |
| B. Chạy 60 giây | tốc độ, phản xạ | tái dùng `buildMcqOptions` | ~100 dòng | Trung bình | **Chọn** |
| C. Điền câu tốc độ | collocation | cần `context` | ~130 dòng | Cao | **Chọn** (có cổng chặn) |
| D. Ghép cặp (memory) | không lấp gì | `word`+`meaning` | ~110 dòng | Thấp | **Loại** |

**Loại D**: lưới 6 cặp cho phép loại trừ dần — cặp cuối đúng miễn phí. Nhìn "game" nhất nhưng học ít nhất.

**Quyết định kiến trúc then chốt**: B và C là *cùng một game* (60 giây, chọn 1 trong 4, combo), chỉ khác bộ sinh câu hỏi. Gộp chung 1 engine → 3 game tốn công gần bằng 2.

### Game có ghi vào SM-2 không?

| Phương án | Đánh giá |
|---|---|
| Ghi đầy đủ như ôn thật | **Loại**. Ván 60s ≈ 30 lượt; đoán mò 4 đáp án đúng 25% → `ivl × ef` phình sai chỉ sau vài ván |
| Không ghi gì | An toàn nhưng game thành giải trí thuần, không đóng góp cho việc học |
| **Chỉ tín hiệu xấu** | **Chọn**. Đúng → không ghi. Sai → đẩy vào phiên ôn kế tiếp. Không bao giờ giãn lịch, chỉ rút ngắn |

## 4. Giải pháp chốt

### 4.1 File

| File | Vai trò | Test |
|---|---|---|
| `js/word-games.js` (mới) | **Thuần**: chọn từ có trọng số, xáo chữ, `buildWordOptions()`, tính điểm/combo, gom từ sai | ✅ Node |
| `js/word-game-ui.js` (mới) | DOM: menu 3 chip, đồng hồ, vẽ 3 dạng câu, màn kết thúc | ❌ |
| `tests/word-games.test.js` (mới) | test module thuần | — |
| `js/srs-scheduler.js` | `buildQueue()` nhận thêm tham số `miss[]` | ✅ |
| `js/app-storage.js` | thêm `K_GAMEMISS`, `K_GAMESCORE`; bump `APP_VERSION` | — |
| `index.html` | 2 `<script>` + markup hàng chip trong `#tab-game` | — |
| `css/paper-theme.css` | ô chữ cái, đồng hồ, chip game, màn kết thúc | — |
| `sw.js` | 2 dòng `ASSETS` + bump `CACHE` | ✅ `pwa-assets` |
| `tests/run-tests.js` | thêm `js/word-games.js` vào `PURE_MODULES` | — |

Tách 2 file theo đúng lối `review-steps-learn.js` / `review-tests.js` đang có.

### 4.2 Tích hợp SRS — store rời, không đụng record

```
K_GAMEMISS  = 'eng.gamemiss.v1'  →  ["stubborn", "reckon", ...]   tối đa 10, khử trùng
K_GAMESCORE = 'eng.gamescore.v1' →  { scramble:{best,plays}, sprint:{...}, cloze:{...} }
```

- Game **không gọi `applyGrade()`**, không ghi `ef/ivl/due/hist`
- Sai → đẩy id vào `K_GAMEMISS`
- `buildQueue()` chèn các id đó lên đầu phiên (chỉ từ đã học, không nhân đôi nếu đã có trong hàng đợi)
- Ôn xong → xoá khỏi danh sách
- Cả 2 khoá nằm trong backup (`btnExportAll`)

Lý do: SM-2 đang chạy đúng và có test. Store rời không bao giờ làm hỏng lịch ôn kể cả khi game có bug. Điểm không vào `hist` → tỉ lệ nhớ 7/30 ngày trong Thống kê vẫn phản ánh ôn thật.

### 4.3 Chọn từ

```
pool   = từ có rec.state !== 'new'
weight = 1 + lapses × 2        (quên 3 lần → bốc trúng gấp 7 lần từ chưa quên)
```

Cổng vào: cần **≥ 8 từ đã học** (B/C cần 3 đáp án nhiễu). Chưa đủ → menu hiện "Học thêm N từ nữa để mở khoá", không cho bấm.

### 4.4 Ba game

**A · Xếp chữ** — 10 từ/ván, **không đồng hồ**

```
        bướng bỉnh
   [b][o][r][s][t][u][b][n]        ← chạm để lấy
   s t u b _ _ _ _                 ← ô đang ghép, chạm để trả lại
                       [⌫ Xoá] [Chịu]
```

Đủ chữ → tự kiểm tra; đúng thì 🔊 đọc từ rồi sang từ kế. Cố ý không đặt đồng hồ: chính tả cần chậm, ép nhanh là dạy sai. Xáo phải đảm bảo khác từ gốc. Từ nhiều chữ (`take off`) giữ nguyên dấu cách như ô cố định.

**B · Chạy 60 giây** — hiện từ + IPA + 🔊 → chọn nghĩa. Tái dùng nguyên `buildMcqOptions()`.

**C · Điền câu tốc độ** — câu thật đã khoét lỗ (`blanked()`) + nguồn phim → chọn 1 trong 4 **từ**. Cần `buildWordOptions()` mới: nhiễu ưu tiên **cùng `pos` + độ dài gần nhau** (`stubborn/struggle/stumble` mới là bài tập; `stubborn/table/run` đoán được ngay).

**Khung chung B+C**: đồng hồ lùi 60s · sai **không trừ giờ** (phạt kép gây nản) · combo ×1 → ×1.5 (chuỗi 5) → ×2 (chuỗi 10), sai về ×1.

**Cổng riêng cho C**: chỉ mở khi ≥ 8 từ đã học **có `context`**. Không đủ → chip xám kèm "cần thêm câu ví dụ".

### 4.5 Màn kết thúc

```
Chạy 60 giây · 23 đúng / 27      Điểm 31   ★ Kỷ lục cũ 28
Chuỗi dài nhất 9

4 từ vừa sai sẽ được ôn trước ở phiên tới:
reckon · stubborn · linger · odds

[Chơi lại]  [Vào ôn từ]  [Xong]
```

### 4.6 Vị trí

Hàng 3 chip nhỏ trên đầu tab **Ôn từ** (`#tab-game`). Khi hàng đợi hết thẻ, thẻ "Hết thẻ hôm nay" hiện luôn 3 chip — biến lúc rảnh thành lúc luyện. Giữ nguyên 3 tab dưới. Game chiếm `#body` với nút ← quay lại; chuyển tab giữa ván = bỏ ván (không lưu điểm, **vẫn lưu từ sai**).

## 5. Ngoài phạm vi

Bảng xếp hạng · đăng nhập · âm thanh nền · hoạt hình · đồng bộ nhiều máy · chế độ 2 người · game D (ghép cặp) · ghi điểm game vào biểu đồ Thống kê.

## 6. Rủi ro

| Rủi ro | Xử lý |
|---|---|
| C không đủ từ có `context` | Cổng chặn ≥8 + thông báo rõ; chip xám thay vì màn trống |
| Xáo chữ ra đúng từ gốc | Xáo lại tới khi khác; từ 1–2 chữ cái loại khỏi pool game A |
| Từ có dấu cách / gạch nối | Giữ nguyên làm ô cố định, không xáo |
| TTS đọc chồng khi bấm nhanh | `speechSynthesis.cancel()` trước mỗi lần trong game tốc độ |
| Quên bump `CACHE` / `APP_VERSION` | Test `pwa-assets` đã bắt buộc khớp — sẽ đỏ nếu quên |
| `K_GAMEMISS` phình vô hạn | Cap 10, khử trùng, xoá sau khi ôn |

## 7. Tiêu chí nghiệm thu

- `node tests/run-tests.js` xanh, gồm test mới cho `pickGameWords` (trọng số lapses), `scrambleLetters` (khác gốc), `buildWordOptions` (4 đáp án, 1 đúng, ưu tiên cùng `pos`)
- Chơi sai N từ → mở tab Ôn từ → đúng N từ đó nằm đầu hàng đợi
- Chơi 1 ván bất kỳ → `srs` trong localStorage **không đổi một byte**
- Bộ từ < 8 từ đã học → cả 3 chip bị khoá kèm thông báo
- Bộ từ không có `context` → chip C xám, A và B vẫn chơi được
- Kỷ lục mỗi game lưu lại sau khi tải lại trang và có trong file backup
- Chạy được offline sau khi cài PWA

## 8. Bước kế tiếp

1. `/ck:plan` chia pha: (1) module thuần + test, (2) khung UI + game A, (3) khung 60s + game B, (4) game C + cổng chặn, (5) tích hợp `buildQueue` + backup, (6) PWA/CSS/tài liệu
2. Cập nhật `README.md` (mục tab Ôn từ) và `docs/system-architecture.md` (module mới, khoá lưu trữ mới)

## 9. Câu hỏi chưa giải quyết

- Điểm combo có nên khác nhau giữa B và C không (C khó hơn, câu dài hơn, ít lượt hơn trong 60s)? Đề xuất: giữ chung công thức ở bản đầu, tách nếu chơi thật thấy lệch.
- Từ sai trong game A (xếp chữ) có đẩy vào `K_GAMEMISS` như B/C không? Đề xuất: có, cùng cơ chế — sai chính tả cũng là tín hiệu yếu thật.
- Ván bỏ dở giữa chừng có tính vào `plays` của kỷ lục không? Đề xuất: không.
