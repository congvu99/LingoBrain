---
phase: 2
title: "Canvas, vuốt chém, vòng lặp"
status: done
priority: P1
dependencies: [1]
---

# Phase 2: Canvas, vuốt chém, vòng lặp

## Overview
Phần nhìn và tay: canvas vẽ quả + nhãn chữ, vệt dao theo ngón tay, hiệu ứng vỡ quả; khung DOM, pointer events, rAF, tạm dừng, chọn cấp. Theo đúng khuôn `plane-game-ui.js`.

## Requirements
- Functional: đề (emoji + nghĩa) trên cùng; HUD ❤️ · điểm · ×combo; vuốt chém bằng ngón tay/chuột; quả vỡ đôi + nước quả; quả đúng sáng xanh khi sai; 🔊 `speak(word)` khi chém đúng và khi lộ đáp án; chọn Dễ/Vừa/Khó + kỷ lục trên lớp phủ Bắt đầu; đếm 3-2-1; tạm dừng khi ẩn app / ⏸ / Esc.
- Non-functional: 60fps iPhone; DPR ≤ 2; chữ nhãn ≥ 15px, có viền tối cho dễ đọc; `touch-action: none` + `overscroll-behavior: none` (không cuộn, không kéo-để-tải-lại); `prefers-reduced-motion` → bỏ rung/hạt; mỗi file < 200 dòng.

## Architecture

```
fruit-game-render.js  createFruitFx() · fruitFxEvent(fx, ev) · stepFruitFx(fx, dt) · drawFruitScene(ctx, st, fx, blade, t)
                      - nền gỗ tối kiểu Fruit Ninja, vẽ sẵn 1 lần; quả màu rực, nước quả bắn tóe, vệt dao sáng <!-- Updated: Validation Session 1 - phong cách sặc sỡ -->
                      - quả = hình tròn màu + emoji trái cây ngẫu nhiên nhỏ, nhãn từ ở giữa; 🌟 viền vàng
                      - nửa quả sau khi cắt: 2 nửa văng ra theo pháp tuyến nhát chém, xoay, rơi
                      - vệt dao: ≤ 12 điểm gần nhất, mờ dần trong 0.15s
fruit-game-ui.js      startFruitGame() · chooseFruitDifficulty(id) · fruitFrame(t) · pause/resume · stopFruitLoop()
                      pointerdown/move/up/cancel trên canvas (setPointerCapture) → sliceSegment/endStroke
                      game.stop = stopFruitLoop (dọn qua stopGameTimer như Bắn máy bay)
```

Luồng sự kiện: `stepFruits`/`sliceSegment`/`endStroke` trả sự kiện → `fruitFxEvent` vẽ, `right` → `speak`, `wrong`/`drop` → tô xanh quả đúng + `speak` + rung nhẹ; `right|wrong|drop` → `syncFruitGame()` chép số liệu sang `game` (score, right, wrong, streak, bestStreak, miss, confusions) và vẽ lại HUD. `st.over` → đợi 1.1s rồi `endGame()`.

Chọn từ: `game.words` từ `pickGameWords` (đã trọng số theo lapses); bom lấy từ cùng pool đã học `gamePool(deck, srs, 'fruit')`. <!-- Updated: Validation Session 1 - bom chỉ từ đã học -->

Chặn cuộn: thêm `html.game-lock` khi vào game, gỡ khi thoát (như Bắn máy bay).

## Related Code Files
- Create: `js/fruit-game-render.js`, `js/fruit-game-ui.js`
- Read để dùng lại: `js/plane-game-ui.js` (fit khung, pause, listen/off, DPR), `js/plane-game-effects.js` (hạt, rung, reduced motion), `js/speech-synthesis.js` (`speak`)

## Implementation Steps
1. `fruit-game-render.js`: fx state, nền vẽ sẵn 1 lần mỗi lần đổi cỡ, vẽ quả + nhãn (đo `measureText` để co chữ nếu tràn), nửa quả, hạt nước, vệt dao, chữ điểm bay lên.
2. `fruit-game-ui.js`: markup (`gameHeadHtml`, đề, canvas, lớp phủ chọn cấp/Bắt đầu, ⏸); `fitFruitGame` theo khung (không cần visualViewport cho bàn phím, nhưng vẫn lắng `resize`).
3. Pointer: `pointerdown` → bắt đầu nhát, `setPointerCapture`; `pointermove` → `sliceSegment(prev, cur)` (dùng `getCoalescedEvents` nếu có để nhát nhanh không lọt quả); `pointerup/cancel` → `endStroke`.
4. Vòng lặp rAF, `dt` kẹp 0.05; dừng hẳn rAF khi tạm dừng; `visibilitychange` → tạm dừng.
5. `chooseFruitDifficulty` lưu `cfg.fruitLevel`, `game.scoreKey = fruitScoreKey(id)`, `game.levelLabel`.
6. Kiểm thử tay trên Chrome giả lập iPhone + desktop.

## Success Criteria
- [ ] Chém được bằng ngón tay (giả lập touch) và chuột; chạm không vuốt không chém
- [ ] Không cuộn trang / kéo-để-tải-lại khi vuốt
- [ ] Quả đúng rơi → mất tim, đọc từ đúng
- [ ] Thoát giữa ván → rAF dừng, listener gỡ sạch, từ sai vẫn vào hàng đợi
- [ ] Chữ đọc được ở khung 375×667

## Risk Assessment
- iOS Safari: vuốt sát mép trái kích hoạt "back" trong Safari (không phải PWA) → đặt vùng chơi có lề ngang, ghi chú README.
- Nhãn dài chồng nhau: ném quả theo làn ngang chia đều + lệch ngẫu nhiên nhỏ.
- Pointer events trên canvas bị nút lớp phủ nuốt: chỉ nghe khi `started && !paused`.
