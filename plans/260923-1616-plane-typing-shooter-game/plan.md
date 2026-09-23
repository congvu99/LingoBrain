---
title: "LingoBrain — Game Bắn máy bay gõ từ (iPhone + laptop)"
status: in-progress
created: 2026-09-23
mode: standard
source: plans/reports/brainstorm-260923-1616-plane-typing-shooter-game-report.md
blockedBy: []
blocks: []
---

# LingoBrain — Game Bắn máy bay

Chip thứ 4 trong "Chơi nhanh". Máy bay ✈️ mang nhãn `emoji + nghĩa Việt` rơi xuống; gõ đúng từ tiếng Anh → tự bắn rụng (không cần Enter). 3 mạng. Từ lọt → `gameMiss`. **Không ghi SM-2.**

## Ràng buộc chung

- Static, không bundler, script global (không ES module). File < 200 dòng.
- Logic thuần tách riêng, test bằng `node tests/run-tests.js` (thêm vào `PURE_MODULES`). File DOM không test tự động.
- **Không đụng `applyGrade` / `ef` / `ivl` / `due` / `hist` / `eng.srs.v2`.**
- Thêm file → `<script>` trong `index.html` + dòng `ASSETS` trong `sw.js` + bump `APP_VERSION` (`js/app-storage.js`) và `CACHE` (`sw.js`) khớp nhau (test `pwa-assets`).
- Render DOM + `requestAnimationFrame`, chỉ animate `transform`/`opacity`.

## Phases

| # | Phase | File | Depends | Status |
|---|---|---|---|---|
| 1 | Logic thuần + test | `phase-01-pure-plane-game-logic.md` | — | completed |
| 2 | UI, vòng lặp, tối ưu iPhone/laptop | `phase-02-plane-game-ui-and-mobile-viewport.md` | 1 | completed |
| 3 | Tích hợp chip, PWA, docs, test máy thật | `phase-03-integration-pwa-docs.md` | 2 | in-progress (chờ test iPhone thật) |

## Kiến trúc

```
js/plane-game-logic.js  MỚI THUẦN  createPlaneState · stepPlanes(dt) · spawnPlane · tryShoot · normalizeTyped · planeLabel
js/plane-game-ui.js     MỚI DOM    khung chơi · rAF loop · visualViewport · focus · pause · hiệu ứng
js/word-games.js        SỬA        GAME_IDS/GAME_LABEL + 'planes'; gamePool nhánh 'planes'
js/word-game-ui.js      SỬA        startGame → startPlaneGame(); stopGameTimer gọi game.stop
js/word-game-rounds.js  SỬA        stopGameTimer gọi thêm game.stop() nếu có
js/app-shell.js         SỬA        Esc: game planes → pause thay vì quit
css/paper-theme.css     SỬA        .plane-field / .plane / .laser / .boom / keyframes
tests/plane-game-logic.test.js MỚI
```

Dùng chung object `game` + `endGame()` + `flushMiss()` của khung game hiện có → màn kết thúc, kỷ lục, backup (`gameScore.planes`) tự hoạt động.

## Tiêu chí nghiệm thu (toàn plan)

- [x] `node tests/run-tests.js` xanh (117), có test cho `plane-game-logic.js`
- [x] Chơi 1 ván → `eng.srs.v2` không đổi byte nào; từ lọt nằm đầu hàng đợi ôn
- [ ] iPhone Safari + PWA: "Bắt đầu" bật bàn phím ngay; máy bay không bị bàn phím che; trang không cuộn; chuyển app → tự dừng
- [x] Laptop Chrome: gõ liên tục mượt 60fps, Esc = tạm dừng/tiếp
- [x] < 8 từ đã học → chip khoá kèm lý do
- [ ] Kỷ lục `planes` còn sau tải lại + nằm trong file backup; offline PWA chơi được

## Ngoài phạm vi

Âm thanh, boss, sprite ảnh, nền cuộn, bảng xếp hạng, chế độ nghe audio, ghi SM-2, so khớp gần đúng, khoá mục tiêu kiểu ZType.

## Câu hỏi chưa chốt

- Tốc độ rơi ban đầu (9s đỉnh → đáy) cần chỉnh sau khi chơi thật trên iPhone.

## Ghi chú triển khai (2026-09-23)

- Đã kiểm trên Chrome headless (khung iPhone 14/16, 375×400 giả lập bàn phím bật, 1366×768, dark mode): bắn, Enter, Esc dừng/tiếp, blur → dừng, thoát sạch, srs không đổi.
- Sau review bổ sung: không bắn khi đang dừng; Esc trong ô gõ = toggle; không tự bắn khi chữ gõ còn là tiền tố của từ khác đang bay (Enter mới bắn); chặn IME đang soạn (Telex); safe-area đáy/cạnh cho PWA; dừng rAF khi tạm dừng; chế độ `compact` khi vùng chơi < 360px; giấu tabbar khi chơi.
- **Còn lại:** test iPhone thật (Safari + PWA): bàn phím bật ngay, không bị che, không cuộn, QuickType, xoay máy; offline PWA; tinh chỉnh `PLANE_FALL_SECONDS`.

## Nâng cấp kiểu ZType + Canvas (2026-09-23, theo phản hồi người dùng)

Người dùng thấy bản DOM "thô sơ, đơ". Đã chốt: mỗi chữ cái = 1 viên đạn từ tàu mình; vật lý (quán tính, giật khi trúng đạn, lượn sóng, nảy mép); nền vũ trụ; thiên thạch / tàu địch / tàu mẹ theo độ dài từ; hiệu ứng nổ. Gõ sai **không phạt** (chỉ đạn trượt); không âm thanh. Bổ sung sau: từ dài rơi chậm hơn (liên tục theo số chữ cái, ±10%); nhãn giữ ghi chú trong ngoặc, tự xuống dòng thay vì cắt "…".

- Viết lại `js/plane-game-logic.js` + test (120 xanh); thêm `js/plane-game-effects.js`, `js/plane-game-render.js`; `js/plane-game-ui.js` chuyển sang canvas.
- Đã quyết định lại so với bản đầu: bỏ "không khoá mục tiêu kiểu ZType" và "so khớp cả từ" khỏi ngoài phạm vi — người dùng chọn cơ chế từng chữ, chấp nhận việc lộ chữ đúng/sai theo từng phím.
