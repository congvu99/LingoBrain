# Code review — Game Chém chữ (fruit-slice-word-game)

Ngày: 2026-09-24 · Plan: `plans/260924-1106-fruit-slice-word-game/` · Chỉ đọc, không sửa file sản phẩm.

## Phạm vi
- Mới: `js/fruit-game-logic.js` (197), `js/fruit-game-render.js` (175), `js/fruit-game-ui.js` (190), `tests/fruit-game-logic.test.js` (167). Tất cả < 200 dòng.
- Sửa: `js/word-games.js`, `js/word-game-ui.js` (165), `js/app-shell.js`, `css/paper-theme.css` (khối .fruit-*), `index.html`, `sw.js` (ASSETS + CACHE), `js/app-storage.js`, `tests/run-tests.js`, `tests/word-games.test.js`, README, docs/system-architecture.md.
- Bỏ qua theo yêu cầu: sw.js `cache:'reload'`, selector input css, tests/pwa-assets.test.js.
- `node tests/run-tests.js`: **309 passed, 0 failed** (có 23 dòng test fruit).
- Xác minh bằng mô phỏng vm (word-games.js + fruit-game-logic.js, scratchpad) cho lỗi High #1.

## Đánh giá chung
Cấu trúc bám sát khuôn Bắn máy bay, vòng đời dọn dẹp đúng (game.stop → stopFruitLoop, off[], game-lock, countdown cleared), ranh giới SM-2 giữ nguyên. Có 2 lỗi luật chơi thật (High) làm mất tim oan / dạy sai, và 1 lỗi bố cục canvas (Medium). Không có Critical.

## Critical
Không có.

## High

### H1. Nhát chém vắt qua 2 đợt: bom của đợt cũ bị chấm cho đợt mới → mất 2 tim, đợt mới bị huỷ trước khi người chơi thấy
- `js/fruit-game-logic.js:141` (drop đặt `wave.done` nhưng không xoá `st.stroke.hits`), `:144` (đợt mới sau 0.4s), `:129` + `:172-183` (endStroke lấy `st.wave` hiện tại, không kiểm hits thuộc đợt nào).
- Kịch bản: nhát bắt đầu, cắt bom của đợt A (chưa nhả tay) → quả đúng A rơi (`drop`, −1 ❤️) → mọi quả A đã cut/gone → nghỉ `FRUIT_WAVE_GAP=0.4s` < `FRUIT_STROKE_MAX=0.6s` → đợt B dựng → nhát tự chấm (0.6s) với `wave = B`, `hits = [bom A]` → `wrong` cho B: −1 ❤️ nữa, `miss` += đích B, `confusions['đíchB|bomA']` sai, B `done` ngay khi vừa ra.
- Đã tái hiện bằng vm: sự kiện `['drop:w0', 'wrong:w1']`, lives 3 → 1, confusions `{"word1|word6":1,"word1|word3":1}` (word6/word3 là bom của w0).
- Người chơi kiểu Fruit Ninja giữ tay vuốt liên tục → kích hoạt thường xuyên. Làm sai kênh gameMiss (từ B vào hàng ôn oan) và màn "Bạn hay nhầm".
- Sửa (chọn 1, nên làm cả 2):
  ```js
  // endStroke: chỉ chấm quả thuộc đợt hiện tại
  const hits = s.hits.filter(f => wave && wave.fruits.indexOf(f) >= 0);
  // hoặc khi đợt kết thúc (drop / right / wrong): st.stroke.hits = [];  (và/hoặc lưu s.wave = st.wave lúc mở nhát, bỏ nếu khác)
  ```
  Thêm test: cắt bom, không endStroke, cho quả đúng rơi + chạy qua gap → không có `wrong` cho đợt mới, lives = 2.

### H2. Bom có thể mang CÙNG nghĩa hiển thị với đề → chém "sai" mà thực ra đúng, dạy sai
- `js/fruit-game-logic.js:54` loại bom chỉ khi `w.meaning === word.meaning` (so nguyên chuỗi); đề hiển thị lại là `planeLabel()` = đoạn nghĩa trước `;` (`js/plane-game-text.js:19-25`, `js/fruit-game-ui.js:140`).
- Dữ liệu thật `words.json`: 116 nhóm trùng đoạn nghĩa đầu, chỉ 57 nhóm trùng nguyên chuỗi → ~59 nhóm lọt. Ví dụ: `final` = "cuối cùng; trận chung kết" vs `finally` = "cuối cùng"; `high` "cao; mức cao" vs `tall` "cao"; `buy` "mua" vs `purchase` "mua; sự mua".
- Tệ hơn: `lookAlikeWords` (Vừa/Khó) xếp `finally` lên ĐẦU cho đích `final` (chung 5 chữ đầu) → đề "cuối cùng", 2 quả đều khớp; chém `finally` → −1 ❤️, `final` vào miss, màn kết thúc ghi "final ✂️ finally" như lỗi của người học.
- Sửa: so trên nhãn chuẩn hoá, ví dụ loại bom khi `firstMeaning(w) === firstMeaning(word)` (lowercase, trim, đoạn trước `;`), tốt nhất loại khi bất kỳ đoạn nghĩa nào giao nhau. Hàm chuẩn hoá nên dùng chung với planeLabel để đề và bộ lọc không lệch nhau. Thêm test với cặp `final`/`finally`.

## Medium

### M1. Khung chơi đổi chiều cao khi đề xuống dòng nhưng canvas không fit lại → mất dải đáy / lộ dải trống
- `css/paper-theme.css` `.fruit-prompt` chỉ `min-height:44px`, `.fruit-field{flex:1}`; `js/fruit-game-ui.js:116-127` chỉ fit khi `window.resize`; `:123` gán cứng `style.width/height` px.
- `planeLabel` cho tới 50 ký tự (PLANE_LABEL_MAX) ở 19px trong ~343px → thường 2 dòng. Đề 1→2 dòng: field thấp ~26px, canvas giữ cỡ cũ bị `overflow:hidden` cắt đáy → quả biến mất trước khi logic coi là rơi, chữ "✓ từ đúng" khi `drop` vẽ ở `fx.h − 28` (`fruit-game-render.js:82`) gần như bị che. Đề 2→1 dòng: dải trống dưới canvas, quả "mọc" giữa chừng.
- Sửa: `ResizeObserver` trên `ui.field` gọi `fitFruitGame` (đăng ký/gỡ qua `off[]`), hoặc cố định chiều cao đề cho 2 dòng (`height` + `-webkit-line-clamp:2`).

### M2. Nhãn chồng nhau ở cấp Khó trên màn 375px
- `fruit-game-logic.js:29,106-108`: 5 làn trên ~343px → làn 68px, bán kính tới `w*0.14`≈48px (đường kính 96px); nhãn 15px của từ 12–16 ký tự rộng ~110–140px; `vx` còn kéo quả về giữa. Nhát chém một quả dễ quẹt quả bên cạnh (tính sai), chữ khó đọc — trái tiêu chí "chữ trên quả đọc được" ở 375×667.
- Gợi ý: Khó giảm `count` khi `st.w` nhỏ, hoặc kẹp r ≤ lane*0.45 và xếp đỉnh bay lệch tầng theo làn chẵn/lẻ; kiểm tay trên iPhone thật trước khi đóng plan.

### M3. Tên global chung chung trong không gian global dùng chung
- `fruit-game-logic.js`: `shuffled`, `editDistance`, `commonPrefix`, `loseLife`, `decoyCandidates`, `segmentHitsCircle`; `fruit-game-render.js`: `labelFont`, `labelFonts`, `drawHalf`, `drawBlade`, `juiceBurst`.
- Hiện KHÔNG trùng (đã grep toàn bộ js/). Rủi ro: `function` trùng tên giữa classic script → bản nạp sau ghi đè im lặng; `const` trùng → SyntaxError làm chết cả script. `shuffled` còn là bản thứ 4 của cùng Fisher-Yates (word-games.js:77,108, review-mode-picker.js:46).
- Gợi ý: tiền tố `fruit` (`fruitShuffled`, `fruitLoseLife`, `fruitLabelFont`…) hoặc dùng lại helper xáo có sẵn nếu tách được.

## Low

- L1. `fruit-game-ui.js:55-63`: `ui.ptr` không được reset khi tạm dừng / mất capture. Nếu `pointerup/pointercancel` không tới (mất capture khi chuyển app trên vài trình duyệt), mọi `pointerdown` sau bị chặn bởi `ui.ptr` → không chém được, quả đúng rơi hết tim. Thêm `lostpointercapture` → release, và/hoặc reset `ui.ptr` trong `pauseFruits`.
- L2. `fruit-game-ui.js:45-51`: đếm ngược xong khi app đang ẩn → vào chơi luôn, không tạm dừng (Bắn máy bay cũng vậy). Thêm `if (document.hidden) pauseFruits()` trong callback done.
- L3. `fruit-game-logic.js:27`: không có sàn tốc độ; Khó cấp 20 (100 lần đúng) `air`≈0.41s — không thể chơi. Kẹp `Math.max(1.0, …)`.
- L4. `endStroke` wrong khi trúng cả quả đúng + bom: quả đúng đã `cut` nên vầng `reveal` (render.js:111, bỏ qua quả cut ở :161) không hiện; chỉ có "✗ bom". Thêm chữ "✓ đích" như nhánh `drop` (render.js:82).
- L5. Khoá cặp nhầm `target.word + '|' + b.text` (logic.js:181) tách lại bằng `split('|')` (word-game-ui.js:162): từ chứa `|` hiển thị sai. Không XSS (đã `esc`). Có thể lưu mảng/đối tượng thay vì nối chuỗi.
- L6. `speak()` cho `drop` và cho `right/wrong` tự chấm 0.6s chạy từ rAF, không trong cử chỉ người dùng — iOS có thể chặn lần đầu. speak() đã fallback sang speechSynthesis khi `play()` reject; chấp nhận, ghi chú.
- L7. `passive:false` trên pointer events không có tác dụng (chỉ touch/wheel mới passive); chặn cuộn thật nhờ `touch-action:none` + `html.game-lock`. Comment `fruit-game-ui.js:54` và docs nói ngược → sửa lời cho đúng.
- L8. `fruitBladePoint` không xoá vệt khi bắt đầu nhát mới → 2 nhát sát nhau nối thành 1 vệt (thuần hình).
- L9. `fruitListen` lặp lại `listen` của plane-game-ui.js (vì `listen` gắn cứng `planeUi`). Chấp nhận được; cân nhắc 1 helper chung nhận mảng off.

## Đánh giá các chủ ý lệch plan
1. Viền vàng cả đợt: **hợp lý** — chỉ tô quả đúng là lộ đáp án; điểm ×2 vẫn gắn với từ hay quên. Cần sửa plan (bảng quyết định "🌟 Quả vàng") cho khớp; README/docs đã ghi đúng.
2. Chữ ký `createFruitState(words, pool, srs, w, h, diff)` / `stepFruits(st, dt, rand)`: **hợp lý** (pool lưu trong state, rand cho tất định test). Cập nhật phase-01.
3. Bỏ `FRUIT_MAX_WORD` khỏi logic, `FRUIT_WORD_MAX` ở word-games.js: **hợp lý**, tránh phụ thuộc thứ tự nạp; logic không cần hằng này (fruitRadius tự kẹp).
4. Dùng `planeLabel()`: DRY đúng hướng nhưng là nguồn gốc H2 (đề cắt ở `;` còn bộ lọc bom so nguyên chuỗi) và M1 (50 ký tự → 2 dòng). Nếu giữ, bộ lọc bom phải dùng cùng chuẩn hoá. Phụ thuộc chéo plane-game-text.js đã ghi ở header fruit-game-ui.js.

## Kiểm tra bắt buộc
- (a) Tiêu chí nghiệm thu:
  - [x] test xanh, có test fruit-game-logic
  - [x] `eng.srs.v2` không đổi: fruit chỉ đọc `srs[id].lapses`; chỉ ghi K_CFG (fruitLevel), K_GAMESCORE, K_GAMEMISS. Từ sai → `st.miss` → syncFruitGame (trong stopFruitLoop, trước flushMiss) → đầu hàng đợi. **Nhưng H1 đẩy từ oan vào miss.**
  - [x] Quét cả màn trúng bom → không điểm; đoạn < 8px không cắt (logic + UI đều lọc)
  - [~] Cặp nhầm hiển thị đúng định dạng; **H1/H2 làm dữ liệu sai**
  - [ ] iPhone Safari/PWA: chưa kiểm tay được; rủi ro M1, M2, L1
  - [x] Chuột kéo + Esc tạm dừng/tiếp (app-shell.js nhánh fruit)
  - [x] < 8 từ → chip khoá + lý do (test gameAvailability)
  - [x] Kỷ lục theo cấp: `fruit`/`fruit-easy`/`fruit-hard` khớp TASK_ID, tổng 9 ≤ 20; nằm trong backup (word-import xuất cả gameScore); offline: 3 file trong ASSETS, CACHE = APP_VERSION = 2.13.0
- (b) Touchpoints: `gameBestKey` giữ nguyên hành vi planes/khác; `startGame` chỉ thêm nhánh; `endGame` thêm `confusionsHtml(undefined)` → '' cho game cũ → giao diện không đổi; Esc: planes giữ nguyên, fruit trước khi started → quitGame như cũ; `stopGameTimer`/`closeGame`/`flushMiss` không đổi, thứ tự sync→flush đúng; setTimeout endGame kiểm `game.seq`. Không hồi quy.
- (c) Contract: không đổi khoá localStorage; khoá kỷ lục hợp lệ; cfg sync chỉ mang newPerDay/maxSession (fruitLevel không sync — giống planeLevel, không hồi quy).
- (d) Pattern: bám khuôn plane; không trùng global (M3 là rủi ro tương lai).
- (e) Runtime: rAF/listener/countdown dọn sạch khi thoát giữa ván/đếm ngược; `render()` return sớm khi `game` nên không vẽ đè; `setPointerCapture` bọc try; `getCoalescedEvents` có guard; XSS: đề dùng `textContent`, confusions dùng `esc`, nhãn quả vẽ canvas; vật lý: quả luôn rơi ra (trọng lực dương), đợt luôn `done` qua drop/endStroke, đợt không treo — nhưng H1 là lỗi chuyển đợt.

## Hành động đề xuất
1. Sửa H1 (lọc hits theo đợt + xoá hits khi đợt xong) + test hồi quy.
2. Sửa H2 (so nghĩa đã chuẩn hoá giống đề) + test `final`/`finally`.
3. M1: ResizeObserver hoặc cố định chiều cao đề.
4. Kiểm tay iPhone 375×667 cấp Khó (M2), sau đó L1–L3.
5. Cập nhật plan/phase-01 cho các chủ ý lệch 1–3.

## Metrics
- Type coverage: N/A (JS thuần)
- Test: 309/309 pass; logic fruit có test cho mọi hàm công khai; UI/render không test tự động (theo plan)
- Lint: không có lint trong repo

## Câu hỏi chưa giải quyết
- Khi bom trùng nghĩa hiển thị với đích: loại hẳn khỏi bom (khuyến nghị) hay chấp nhận cả hai là đúng?
- Có muốn trần tốc độ (L3) không, hay chấp nhận "chơi tới khi chết" không giới hạn?

Status: DONE_WITH_CONCERNS
Summary: Tích hợp và vòng đời đúng khuôn, test 309/309 xanh, không hồi quy touchpoints/contract; nhưng có 2 lỗi luật chơi High (nhát chém vắt qua 2 đợt gây mất 2 tim — đã tái hiện; bom trùng nghĩa hiển thị với đề) và 1 lỗi bố cục canvas Medium.
Concerns/Blockers: H1, H2 nên sửa trước khi đóng plan; tiêu chí iPhone chưa kiểm tay.
