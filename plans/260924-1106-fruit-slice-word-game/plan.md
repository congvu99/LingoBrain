---
title: "LingoBrain — Game Chém Chữ (kiểu Fruit Ninja)"
status: in-progress
created: 2026-09-24
mode: standard
source: plans/reports/brainstorm-260924-1106-fruit-slice-word-game-report.md
blockedBy: []
blocks: []
---

# LingoBrain — Game 🍉 Chém Chữ

Chip thứ 5 trong "Chơi nhanh". Đề = nghĩa Việt (+ emoji). Mỗi đợt tung 3–5 quả mang từ tiếng Anh, đúng 1 quả đúng; bom là từ na ná. Vuốt chém quả đúng. Chém sai hoặc để quả đúng rơi → mất ❤️. Hết 3 ❤️ thì kết thúc. **Không ghi SM-2**, chỉ đẩy từ sai qua `gameMiss`.

## Ràng buộc chung

- Static, không bundler, script global. File < 200 dòng.
- Logic thuần riêng, test bằng `node tests/run-tests.js` (thêm vào `PURE_MODULES`). File DOM/canvas không test tự động.
- **Không đụng `applyGrade` / `ef` / `ivl` / `due` / `hist` / `eng.srs.v2`.**
- Thêm file → `<script>` trong `index.html` + `ASSETS` trong `sw.js` + bump `APP_VERSION` (`js/app-storage.js`) và `CACHE` (`sw.js`) khớp nhau (test `pwa-assets`). Hiện tại `2.12.0` → `2.13.0`.
- Khoá kỷ lục phải khớp `TASK_ID = /^[a-z0-9_-]{1,32}$/` và tổng ≤ 20 khoá (`sync-merge.js`). Sau plan: 9 khoá.
- Canvas + `requestAnimationFrame`, DPR tối đa 2 (giống Bắn máy bay).

## Phases

| # | Phase | File | Depends | Status |
|---|---|---|---|---|
| 1 | Logic thuần + test | [phase-01-pure-fruit-game-logic-and-tests.md](phase-01-pure-fruit-game-logic-and-tests.md) | — | done |
| 2 | Canvas, vuốt chém, vòng lặp | [phase-02-canvas-render-and-swipe-ui.md](phase-02-canvas-render-and-swipe-ui.md) | 1 | done |
| 3 | Tích hợp chip, màn kết thúc, PWA, docs | [phase-03-integration-pwa-and-docs.md](phase-03-integration-pwa-and-docs.md) | 2 | done |

## Kiến trúc

```
js/fruit-game-logic.js   MỚI THUẦN  bảng cấp độ · lookAlikeWords · buildFruitWave · stepFruits · sliceSegment · endStroke
js/fruit-game-render.js  MỚI CANVAS nền, quả + nhãn, vệt dao, nước quả/mảnh vỡ, chữ bay
js/fruit-game-ui.js      MỚI DOM    khung chơi · pointer events · rAF · tạm dừng · chọn cấp · 🔊 speak()
js/word-games.js         SỬA        GAME_IDS/GAME_LABEL + 'fruit'; gamePool nhánh 'fruit'
js/word-game-ui.js       SỬA        startGame → startFruitGame(); chip đọc kỷ lục theo cấp; endGame hiện cặp hay nhầm
js/app-shell.js          SỬA        Esc: fruit đang chơi → tạm dừng
css/paper-theme.css      SỬA        .fruit-game / .fruit-field / overlay (dùng lại kiểu .plane-*)
tests/fruit-game-logic.test.js MỚI
```

Hình ảnh: **sặc sỡ kiểu Fruit Ninja** (nền gỗ tối, quả màu rực, nước quả, vệt dao sáng). Âm thanh: chỉ giọng đọc từ 🔊.

Dùng chung object `game`, `endGame()`, `flushMiss()`, `readyCountdown()`, `comboMult()`, `pickGameWords()` → màn kết thúc, kỷ lục, backup, sync tự chạy.

## Quyết định kỹ thuật (chốt trong plan)

| Vấn đề | Chốt |
|---|---|
| Nguồn bom | **Chỉ từ đã học** (cùng pool `gamePool(deck, srs, 'fruit')`, ≥ 8 từ nên luôn đủ 4 bom), xếp theo độ na ná <!-- Updated: Validation Session 1 - bom chỉ từ đã học --> |
| "Na ná" | Levenshtein ≤ max(2, ⌊len×0.4⌋) **hoặc** chung ≥ 3 chữ đầu; xếp theo khoảng cách rồi cùng `pos`; thiếu thì lùi về cùng `pos` + độ dài ±2, rồi bất kỳ |
| Chém sai | −1 ❤️, ghi cặp nhầm, **đợt kết thúc** (user xác nhận): quả đúng sáng xanh + 🔊 đọc từ đúng (dạy lại ngay) |
| Một nhát trúng cả đúng + sai | Tính sai. Chấm ở cuối nhát (nhả tay hoặc nhát dài > 0.6s tự cắt) |
| Chạm không vuốt | Không chém: đoạn vuốt phải ≥ 8px |
| Quả đúng rơi khỏi đáy | −1 ❤️, từ vào miss, đợt kết thúc |
| Điểm | 10 × combo × (🌟 ? 2 : 1) + 5 nếu chém < 1s sau khi quả xuất hiện |
| 🌟 Quả vàng | từ đúng có `lapses ≥ 2` → **cả đợt** viền vàng, điểm ×2 (chỉ tô quả đúng là lộ đáp án) |
| Tăng tốc | mỗi 5 lần đúng lên 1 bậc: thời gian bay × 1/speedup |
| Khoá kỷ lục | `fruit` (Vừa) · `fruit-easy` · `fruit-hard`; nhớ `cfg.fruitLevel` |
| Từ quá dài | pool bỏ từ > 16 ký tự (nhãn không vừa quả); hằng `FRUIT_WORD_MAX` ở `word-games.js` |
| Bom trùng nghĩa hiển thị | loại bom có vế nghĩa trước `;` trùng đề (`final`/`finally` đều "cuối cùng") |

## Tiêu chí nghiệm thu (toàn plan)

- [x] `node tests/run-tests.js` xanh, có test cho `fruit-game-logic.js`
- [x] Chơi 1 ván → `eng.srs.v2` không đổi; từ sai nằm đầu hàng đợi ôn
- [x] Vuốt quét cả màn không ghi được điểm nào; chạm không vuốt không chém
- [x] Màn kết thúc liệt kê đúng cặp nhầm (`stubborn ✂️ stumble ×2`)
- [ ] iPhone Safari + PWA: chữ trên quả đọc được, vuốt không cuộn trang / không kéo-để-tải-lại, chuyển app → tự dừng
- [x] Laptop: chém bằng chuột kéo được, Esc tạm dừng/tiếp
- [x] < 8 từ đã học → chip khoá kèm lý do
- [ ] Kỷ lục từng cấp còn sau tải lại, nằm trong backup, offline PWA chơi được

## Ngoài phạm vi

Đề chỉ nghe, đề chỉ emoji, chế độ 60 giây, âm thanh hiệu ứng, ghi SM-2, bảng xếp hạng, sprite ảnh quả.

## Ghi chú chồng lấn

Plan `260923-1616-plane-typing-shooter-game` còn `in-progress` (chờ test iPhone thật). Cùng sửa `word-games.js`, `word-game-ui.js`, `app-shell.js` nhưng khác nhánh logic → không chặn nhau.

## Câu hỏi chưa chốt

- Thời gian bay / số quả từng cấp là số khởi điểm, cần chỉnh sau khi chơi thật trên iPhone.

## Validation Log

### Session 1 — 2026-09-24

| Câu hỏi | Trả lời | Ảnh hưởng |
|---|---|---|
| Chém trúng bom thì sao? | Hết đợt, lộ đáp án | Giữ nguyên |
| Bom lấy từ đâu? | **Chỉ từ đã học** (khác đề xuất) | Phase 1: `lookAlikeWords`/`randomDecoys` nhận pool đã học; Phase 2: bỏ `deck.words` |
| Phong cách hình ảnh? | Sặc sỡ kiểu Fruit Ninja | Phase 2: nền gỗ tối, quả màu rực |
| Tiếng hiệu ứng? | Không, chỉ đọc từ | Giữ ngoài phạm vi |

### Verification Results
- Claims checked: 12
- Verified: 12 | Failed: 0 | Unverified: 0
- Tier: Standard
- Ghi chú: `html.game-lock` (css/paper-theme.css:265) có sẵn → Phase 2 dùng lại thay vì tự chặn cuộn

### Whole-Plan Consistency Sweep
- Đã tìm `deck.words` trong mọi file plan: chỉ còn ở chỗ nói nguồn từ cho `gamePool`; không còn chỗ nói bom lấy từ cả bộ
- Không còn mâu thuẫn chưa giải quyết

## Implementation Log (2026-09-24)

- Giao diện: quả vẽ hoàn toàn bằng canvas (fruit-game-fruit-art.js), cảnh vẽ ở fruit-game-scene-draw.js; hiệu ứng: vệt dao phát sáng, tia chém, giọt kéo vệt, vết loang, sao, sóng, viền đỏ.
- 3 phase xong; `node tests/run-tests.js` 311/311 (26 test fruit). Smoke Chrome (desktop, pointer events giả lập): chém đúng/điểm, chạm không chém, quét cả màn = 0 điểm, Esc, hết tim → màn kết thúc + "Bạn hay nhầm", chip khoá < 8 từ, `eng.srs.v2` không đổi.
- Chữ ký thực tế: `createFruitState(words, pool, srs, w, h, diff)`, `stepFruits(st, dt, rand)`, `buildFruitWave(st, rand)`.
- Review sửa: nhát vắt qua 2 đợt chấm bom cũ cho đợt mới; bom trùng nghĩa hiển thị; `ResizeObserver` khung chơi; `lostpointercapture`; tạm dừng chấm nhát dở; đếm xong lúc ẩn app → dừng.
- Còn lại: kiểm tay iPhone Safari + PWA (chữ, vuốt không cuộn, chuyển app tự dừng), offline, nhãn chồng nhau cấp Khó ở 375px, chỉnh số khởi điểm tốc độ / trần tốc độ.
