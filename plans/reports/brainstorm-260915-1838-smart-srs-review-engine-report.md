# Brainstorm Report: LingoBrain v2 — Engine ôn từ thông minh (SM-2 + đa dạng bài tập)

- Date: 2026-09-15
- Topic: "Làm hệ thống dễ dùng và thông minh hơn" → thu hẹp: ma trận ôn từ khoa học, nhớ lâu, không AI
- Flags: none
- Status: APPROVED by user (hướng B, 6 phase, đúng thứ tự)

## 1. Bối cảnh codebase

- 1 file `index.html` (865 dòng, HTML+CSS+JS thuần), `words.json` 5 từ mẫu. Static, localStorage, không build/framework/server.
- 3 tab: Giáo án (7 việc, streak), Ôn từ (5 bước, Leitner 6 bậc `LADDER=[1,3,7,14,30,60]`), Quản lý (nạp JSON/form, backup).
- Storage keys: `eng.deck.v1`, `eng.srs.v1`, `eng.cfg.v1`, plan, day. SRS record: `{box,due,reps,lapses,last,sentences[]}`.
- Chưa có `docs/`, `plans/`.

## 2. Vấn đề (problem-first)

User mô tả giải pháp mơ hồ ("dễ dùng, thông minh"). Sau hỏi đáp: **vấn đề thật = học từ chưa khoa học, không chắc nhớ lâu; nạp từ tốn công; app chưa "app"**. Không muốn AI giai đoạn này.

Điểm yếu hiện tại (đã verify bằng đọc code):

| # | Vấn đề | Vị trí | Tác động |
|---|---|---|---|
| 1 | `shuffle(due).slice(0,maxSession)` bỏ rơi ngẫu nhiên thẻ quá hạn lâu | index.html:459 | Bug: thẻ quan trọng nhất có thể không bao giờ được ôn khi dồn |
| 2 | Không có learning steps trong phiên; từ mới gặp 1 lần rồi hẹn 1 ngày; từ quên gặp lại 1 lần cuối phiên | grade(), s4 | Encoding ngày đầu yếu → quên nhanh |
| 3 | Chỉ 1 dạng test (VI→gõ EN) | s3 | Nhớ thẻ thay vì nhớ từ |
| 4 | Leitner thang cố định cho mọi từ | nextBox/nextInterval | Từ khó và dễ giãn như nhau |
| 5 | So khớp chuỗi chính xác | s3 norm() | Typo 1 ký tự = quên, phá lịch |
| 6 | Bước 1 hiện contextVi trước khi "đoán" | s1 | Triệt tiêu nỗ lực gọi nhớ |
| 7 | Không có phản hồi tiến bộ | — | Không thấy hệ thống thông minh |
| 8 | Nạp từ cần JSON hoặc form 7 ô | importWords, #btnAdd | 10–15 phút/ngày |
| 9 | Không manifest/SW, ghi âm không lưu | — | Chưa dùng được như app |

## 3. Các hướng đã cân nhắc

| Hướng | Nội dung | Ưu | Nhược | Kết luận |
|---|---|---|---|---|
| A. Vá tối thiểu, giữ Leitner | Sửa bug, learning steps, fuzzy, ẩn VI, nạp text (~150 dòng) | Nhanh, rủi ro thấp | Vẫn 1 dạng test, thang cố định | Không đủ "thông minh" |
| **B. SM-2 + đa dạng test + thống kê** | A + SM-2 per-word ease, 5 dạng test xoay theo độ chín, stats, tách file (~450 dòng) | Đúng khoa học, không cần server/AI | Migrate dữ liệu, code ×1.5 | **CHỌN** |
| C. FSRS + PWA + notification + chấm phát âm | Đầy đủ nhất (~1000+ dòng) | — | FSRS cần hàng nghìn review để tối ưu tham số; iOS notification hạn chế; over-engineering | Loại |

AI (tự điền từ, chấm câu, chấm phát âm): user từ chối giai đoạn này. Để vòng sau.

## 4. Thiết kế đã duyệt

### Cấu trúc file
```
index.html              khung, CSS, tab Giáo án, tab Quản lý
js/srs-scheduler.js     SM-2, learning steps, queue, migrate
js/review-modes.js      5 bước + 5 dạng test
js/stats-dashboard.js   thống kê
js/word-import.js       parse text/JSON
js/recording-store.js   IndexedDB ghi âm
manifest.json, sw.js    PWA
```
Vẫn static, deploy kéo-thả. Không build tool, không framework.

### Phase 1 — Scheduler SM-2 (nền)
- Record mới: `{ef:2.5, ivl:0, due, state:'new'|'learning'|'review'|'relearn', reps, lapses, last, lastMode, sentences[], hist[{t,g,mode}]}` (hist giữ 50 gần nhất).
- Migrate từ v1: `ivl=LADDER[box]` (box<0 → 0, state new), `ef=max(1.3, 2.5-0.1*lapses)`, due giữ nguyên. Key mới `eng.srs.v2`, v1 giữ lại làm backup tới khi user xoá.
- Chấm → q: 😵=0 (fail), 😓=3, 🙂=4, 😎=5.
- Interval: reps=1 → 1 ngày; reps=2 → 3 ngày; sau: `round(ivl*ef)`; q=5 nhân 1.3. Fail: `ivl=1`, `ef=max(1.3,ef-0.2)`, state relearn.
- `ef' = ef + (0.1 - (5-q)*(0.08+(5-q)*0.02))`, sàn 1.3.
- Learning steps trong phiên: từ `new`/`relearn` sau khi chấm ≥3 được chèn lại vào queue ở vị trí +4; cần 2 lần đúng liên tiếp trong phiên mới tốt nghiệp ra lịch ngày. q=5 tốt nghiệp ngay. Fail trong phiên → reset đếm.
- Queue: due sort theo `(now-due)` giảm dần → slice maxSession; new xen mỗi 3 thẻ. Không shuffle toàn bộ.
- Fuzzy bước 3: chuẩn hoá lowercase, bỏ dấu câu; từ ≥5 ký tự chấp nhận Levenshtein ≤1 (đánh dấu "gần đúng", tô chỗ sai); cụm từ so từng token. Gần đúng vẫn tính pass, gợi ý chấm 😓.
- Bước 1: contextVi ẩn sau nút "Xem dịch".

### Phase 2 — 5 dạng kiểm tra
| Trạng thái | Dạng |
|---|---|
| new / learning / relearn | `type` (VI→gõ EN, hiện tại) |
| review, ivl<7 | `type` ↔ `dictation` (TTS đọc, gõ lại) |
| review, 7≤ivl≤30 | `mcq` (EN→chọn 1/4 nghĩa VI từ deck) ↔ `owncloze` (che từ trong câu user viết bước 5) ↔ `dictation` |
| review, ivl>30 | `speak` (VI hiện, nói to, tự lật, tự chấm) ↔ `owncloze` |
- Không lặp `lastMode` 2 lần liên tiếp. Fallback về `type` khi: deck<8 từ (mcq), không có sentences (owncloze), không có TTS voice EN (dictation).
- Mọi dạng → bước 4 chấm → bước 5 output (từ mới đủ 5 bước; ôn lại: test→4→5).
- mcq distractor: 3 nghĩa từ từ khác cùng `pos` nếu có, ngẫu nhiên.

### Phase 3 — Thống kê (dưới thẻ, tab Ôn từ)
- Tỉ lệ nhớ 7/30 ngày = pass/(pass+fail) từ hist.
- Dự báo số thẻ due 7 ngày tới (bar nhỏ).
- Top 5 từ lapses cao nhất, bấm → ôn ngay.
- Heatmap 30 ngày (số lượt/ngày).

### Phase 4 — Nạp từ bằng text
- 1 ô dán duy nhất, auto-detect JSON (`[`/`{` đầu) hay text.
- Text: mỗi dòng `word | nghĩa | câu | nguồn`; separator ưu tiên `|`, tab, ` - `. Bỏ dòng trống/`#`. Chỉ cần 2 cột.
- Form Thêm nhanh: word+meaning bắt buộc, còn lại thu vào `<details>`.

### Phase 5 — PWA
- `manifest.json`: name, short_name, display standalone, theme, icon SVG data-URI emoji 🧠.
- `sw.js`: cache-first cho index.html, js/*, words.json, manifest; versioned cache name; on update → toast "Có bản mới, tải lại".
- Chỉ đăng ký SW khi `location.protocol==='https:'||localhost`.

### Phase 6 — Lưu ghi âm shadowing
- IndexedDB `lingobrain` store `recordings` `{id, taskId, date, caption, blob}`; giữ 10 bản/việc mới nhất.
- Dưới việc có `act:'rec'`: danh sách bản ghi (ngày, giờ, play, xoá), ô caption "câu đang shadow" + 🔊 TTS để so A/B.
- Không chấm điểm.

## 5. Rủi ro & giảm thiểu
- Migrate SM-2 sai → phá lịch: giữ `eng.srs.v1` nguyên, test migrate với backup thật.
- TTS thiếu giọng EN trên Android → dictation tự tắt (fallback type).
- iOS Safari xoá IndexedDB sau 7 ngày không mở → ghi âm là dữ liệu tạm, ghi rõ trong UI.
- Tách file không phá `file://`: `<script src>` chạy được trên file://; chỉ `fetch(words.json)` vốn đã bị chặn như hiện tại.
- Backup/restore phải xuất `srs` v2; recordings không nằm trong backup (blob lớn) → ghi chú trong UI.

## 6. Tiêu chí chấp nhận
- Phase 1: nạp backup v1 → mở app → mọi từ có ef/ivl/state đúng công thức; 20 thẻ due với maxSession=5 → 5 thẻ quá hạn lâu nhất được chọn; từ mới chấm 🙂 → xuất hiện lại sau 4 thẻ, chấm 🙂 lần 2 → due ngày mai; gõ "recon" cho "reckon" → "gần đúng"; bước 1 không lộ contextVi.
- Phase 2: từ ivl=10 có sentences → không bao giờ nhận `type` 2 lần liên tiếp; deck 5 từ → không bao giờ ra mcq; dictation không hiện chữ trước khi trả lời.
- Phase 3: số liệu khớp khi đối chiếu tay với hist.
- Phase 4: dán 3 dòng `a | b`, `c - d`, `e<tab>f` → 3 từ; dán JSON cũ vẫn nạp.
- Phase 5: Lighthouse PWA installable; tắt mạng reload vẫn chạy.
- Phase 6: ghi 11 bản → còn 10; reload vẫn còn; xoá được.

## 7. Ngoài phạm vi
AI (điền từ, chấm câu, chấm phát âm), sync cloud, notification nhắc giờ, FSRS.

## 8. Bước tiếp theo
`/ck:plan` với report này → plan 6 phase, thứ tự 1→6, mỗi phase độc lập deploy được. Khuyến nghị `--tdd` cho phase 1 (scheduler là logic thuần, dễ test bằng file test HTML/Node nhỏ).

## Unresolved questions
- Có cần nút "Quay về v1" hay chỉ giữ key v1 im lặng? (mặc định: giữ key, không nút)
- Recording caption có nên gợi ý từ `context` của các từ nạp hôm nay? (mặc định: không, YAGNI)
