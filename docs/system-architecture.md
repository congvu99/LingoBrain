# System Architecture — LingoBrain v2

Cập nhật 2026-09-16. Web tĩnh, không build tool, không framework, không server. Dữ liệu trong `localStorage` (+ IndexedDB cho ghi âm).

## File

```
index.html               khung HTML + 3 tab, nạp script theo thứ tự
css/paper-theme.css      giao diện giấy / e-reader (token trong docs/design-guidelines.md)
js/srs-scheduler.js      SM-2, learning steps, hàng đợi, migrate v1→v2, so khớp mờ   [thuần]
js/app-storage.js        khoá localStorage, helper, trạng thái toàn cục
js/speech-synthesis.js   TTS (MP3 Neural pregenerated + Web Speech API fallback)
js/recording-store.js    IndexedDB ghi âm (10 bản/việc)
js/daily-plan.js         tab Giáo án + ghi âm shadowing
js/review-mode-picker.js chọn dạng kiểm tra theo độ chín, sinh đáp án MCQ          [thuần]
js/stats-dashboard.js    thống kê (computeStats thuần + renderStats)
js/word-import.js        parseImport (text/JSON) [thuần] + nạp/xuất/danh sách
js/review-steps-learn.js vòng đời thẻ: bước 1,2,4,5, render, phiên
js/review-tests.js       bước 3: type · dictation · mcq · owncloze · speak
js/word-games.js         game: pool có trọng số, xáo chữ, đáp án từ, combo, gom từ sai  [thuần]
js/word-game-rounds.js   game: khung đồng hồ 60s + vẽ 3 dạng câu hỏi
js/word-game-ui.js       game: chip chọn, vòng đời ván, màn kết thúc
js/app-shell.js          tab, bindUI, phím tắt, init
js/pwa-register.js       đăng ký service worker, toast bản mới
sw.js, manifest.json     PWA cache-first; đổi CACHE (= APP_VERSION) khi deploy; audio/ cache-first riêng
tools/generate_edge_tts_audio.py   tạo MP3 từ words.json (dùng edge-tts), output: audio/<sha1>.mp3 + audio/index.json
audio/                   MP3 giọng Neural (en-US-ChristopherNeural), index.json ánh xạ text→file
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
| `eng.gamemiss.v1` | `[id]` từ trả lời sai trong game, tối đa 10 — kênh duy nhất từ game sang engine ôn |
| `eng.gamescore.v1` | `{[gameId]: {best, plays}}` kỷ lục mỗi game |
| IndexedDB `lingobrain/recordings` | `{id, taskId, date, caption, blob, type}` |

## Thuật toán ôn (js/srs-scheduler.js)

- **SM-2**: q = {😵0, 😓3, 🙂4, 😎5}. `ef' = ef + 0.1 − (5−q)(0.08 + (5−q)0.02)`, sàn 1.3. Khoảng cách: lần 1 = 1 ngày, lần 2 = 3, sau `round(ivl×ef)`, 😎 ×1.3. Quên: ivl=1, ef−0.2, state `relearn`.
- **Learning steps**: từ `new/learning/relearn` chấm ≥😓 → quay lại sau 4 thẻ; đúng 2 lần liên tiếp trong phiên (hoặc 😎) mới ra lịch ngày. Đếm trong `session.streak` (RAM).
- **Hàng đợi**: thẻ đến hạn xếp quá hạn lâu nhất trước, cắt `maxSession`; từ mới xen sau mỗi 3 thẻ ôn.
- **So khớp mờ**: từ ≥5 ký tự chấp nhận lệch 1 ký tự (Levenshtein), cụm từ so từng token.

## Game từ vựng (js/word-games.js · word-game-rounds.js · word-game-ui.js)

3 game ngắn vào từ hàng chip đầu tab Ôn từ. Lấp 3 chỗ 5 dạng kiểm tra không chạm tới:

| Game | Luyện | Thể thức | Mở khi |
|---|---|---|---|
| `scramble` Xếp chữ | chính tả, không cần bàn phím | 10 từ/ván, không đồng hồ | ≥8 từ đã học có nghĩa, dài 3–14 ký tự |
| `sprint` Chạy 60 giây | phản xạ nhanh | 60s, từ → chọn nghĩa, combo | ≥8 từ đã học có nghĩa |
| `cloze` Điền câu tốc độ | từ nào hợp câu nào | 60s, câu khoét lỗ → chọn từ, combo | ≥8 từ đã học có `context` chứa chính từ đó |

**Ranh giới cứng: game không ghi gì vào SM-2.** Không gọi `applyGrade`, không đụng `ef/ivl/due/state/reps/lapses/hist`. Lý do: một ván 60s ≈ 25 lượt, đoán mò 4 đáp án đúng 25% → lịch ôn phình sai chỉ sau vài ván. Điểm cũng không vào `hist` nên tỉ lệ nhớ 7/30 ngày vẫn phản ánh ôn thật.

Kênh duy nhất từ game sang engine ôn là **danh sách từ sai**: `flushMiss()` nhét id lên đầu `queue` đang chạy và lưu ra `eng.gamemiss.v1`; `buildQueue(deck, srs, cfg, now, miss)` đẩy chúng lên đầu phiên ở lần dựng hàng đợi kế (lọc bỏ id đã biến mất khỏi bộ hoặc chưa học, không nhân đôi). `consumeGameMiss()` dọn khoá sau khi đã vào hàng đợi.

- Chọn từ: trọng số `1 + lapses × 2` → từ hay quên ra nhiều hơn.
- Đang chơi: `syncGameChrome()` giấu hàng chip và bảng thống kê, vì cả hai là anh em của `#app` nên không bị game vẽ đè; bấm vào chúng giữa ván sẽ đổi hàng đợi hoặc nuốt mất từ sai.
- Đồng hồ dùng mốc tuyệt đối `endsAt`, không cộng dồn mỗi tick → khoá màn hình giữa ván vẫn hết đúng giờ. `stopGameTimer()` chạy trong cả `endGame()` lẫn `closeGame()`.
- Bỏ ván giữa chừng: không lưu điểm, không tăng `plays`, **vẫn lưu từ sai**. `startGame()` luôn `closeGame()` trước để không bao giờ bỏ rơi một ván đang chạy.
- Mỗi ván có `game.seq`; `setTimeout` chờ sang câu kế so lại `seq` trước khi chạy, nếu không callback của ván cũ sẽ lái ván mới.

`wordRx(word, flags)` trong `js/word-games.js` là hàm khớp-từ-trong-câu dùng chung: chặn biên hai đầu (`art` không khớp trong `smart`), cho đuôi chia thường gặp (`reckon` khớp `reckoned`), chạy được trên chuỗi đã escape HTML (từ chứa `&`). `blanked()` của màn ôn và bộ lọc pool `cloze` cùng dùng nó nên luôn đồng ý với nhau. `blanked()` thay **mọi** lần xuất hiện — câu lặp từ mà chỉ che lần đầu là lộ đáp án.

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
