# System Architecture — LingoBrain v2

Cập nhật 2026-09-15. Web tĩnh, không build tool, không framework, không server. Dữ liệu trong `localStorage` (+ IndexedDB cho ghi âm).

## File

```
index.html               khung HTML + 3 tab, nạp script theo thứ tự
css/paper-theme.css      giao diện giấy / e-reader (token trong docs/design-guidelines.md)
js/srs-scheduler.js      SM-2, learning steps, hàng đợi, migrate v1→v2, so khớp mờ   [thuần]
js/app-storage.js        khoá localStorage, helper, trạng thái toàn cục
js/speech-synthesis.js   TTS (Web Speech API)
js/recording-store.js    IndexedDB ghi âm (10 bản/việc)
js/daily-plan.js         tab Giáo án + ghi âm shadowing
js/review-mode-picker.js chọn dạng kiểm tra theo độ chín, sinh đáp án MCQ          [thuần]
js/stats-dashboard.js    thống kê (computeStats thuần + renderStats)
js/word-import.js        parseImport (text/JSON) [thuần] + nạp/xuất/danh sách
js/review-steps-learn.js vòng đời thẻ: bước 1,2,4,5, render, phiên
js/review-tests.js       bước 3: type · dictation · mcq · owncloze · speak
js/app-shell.js          tab, bindUI, phím tắt, init
js/pwa-register.js       đăng ký service worker, toast bản mới
sw.js, manifest.json     PWA cache-first; đổi CACHE (= APP_VERSION) khi deploy
tests/                   harness tự viết; `node tests/run-tests.js` (thuần) · tests/run-tests.html (thêm IndexedDB)
```

Script là classic `<script src>` dùng global, không ES module → mở `file://` vẫn chạy. Module "thuần" không đụng DOM/localStorage ở top-level và có `module.exports` để Node test.

## Dữ liệu

| Key | Nội dung |
|---|---|
| `eng.deck.v1` | `{deck, words[]}` — từ vựng |
| `eng.srs.v2` | `{[id]: {ef, ivl, due, state, reps, lapses, last, lastMode, sentences[], hist[]}}` |
| `eng.srs.v1` | bản Leitner cũ, giữ nguyên làm dự phòng sau migrate |
| `eng.cfg.v1` | `{newPerDay, maxSession}` |
| `eng.plan.v1`, `eng.day.v1` | giáo án, checkbox/streak/caption hôm nay |
| IndexedDB `lingobrain/recordings` | `{id, taskId, date, caption, blob, type}` |

## Thuật toán ôn (js/srs-scheduler.js)

- **SM-2**: q = {😵0, 😓3, 🙂4, 😎5}. `ef' = ef + 0.1 − (5−q)(0.08 + (5−q)0.02)`, sàn 1.3. Khoảng cách: lần 1 = 1 ngày, lần 2 = 3, sau `round(ivl×ef)`, 😎 ×1.3. Quên: ivl=1, ef−0.2, state `relearn`.
- **Learning steps**: từ `new/learning/relearn` chấm ≥😓 → quay lại sau 4 thẻ; đúng 2 lần liên tiếp trong phiên (hoặc 😎) mới ra lịch ngày. Đếm trong `session.streak` (RAM).
- **Hàng đợi**: thẻ đến hạn xếp quá hạn lâu nhất trước, cắt `maxSession`; từ mới xen sau mỗi 3 thẻ ôn.
- **So khớp mờ**: từ ≥5 ký tự chấp nhận lệch 1 ký tự (Levenshtein), cụm từ so từng token.

## Chọn dạng kiểm tra (js/review-mode-picker.js)

| state / ivl | pool |
|---|---|
| new, learning, relearn | type |
| review < 7 | type, dictation |
| review 7–30 | mcq, owncloze, dictation |
| review > 30 | speak, owncloze |

Lọc: mcq cần ≥8 từ; owncloze cần câu bước 5 có chứa từ; dictation cần giọng TTS. Không lặp `lastMode`. Rỗng → type.

## Luồng thẻ

Từ mới: 1 ngữ cảnh (nghĩa Việt giấu) → 2 mã hoá kép → 3 gõ từ → 4 chấm → (requeue | 5 output). Từ ôn: 3 (dạng đã chọn) → 4 → 5. Câu ở bước 5 lưu `sentences` (5 câu) và trở thành nguyên liệu owncloze.
