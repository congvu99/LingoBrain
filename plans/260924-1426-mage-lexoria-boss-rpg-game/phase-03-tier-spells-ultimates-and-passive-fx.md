---
phase: 3
title: "Phép bậc 2–3, 5 tuyệt kỹ, hiệu ứng nội tại"
status: pending
priority: P2
dependencies: [2]
---

# Phase 3: Chiêu lớn, tuyệt kỹ, nội tại

## Overview
Hoàn tất yêu cầu "từ khó = chiêu lớn, mọi chiêu đều có hiệu ứng đẹp". Thêm 10 phép bậc 2–3 (thay fallback phóng to), 5 tuyệt kỹ (cắt cảnh ~1,5s), hiệu ứng cho mọi nội tại. **Toàn bộ nhịp thời gian (khoá, trễ va chạm, dừng đồng hồ) đã nằm trong `boss-game-logic.js` ở phase 1**; phase này chỉ vẽ theo `events[]` và thêm nút tuyệt kỹ. Làm sau phase 5 (thứ tự 1 → 2 → 4 → 5 → 3 → 6).

## Requirements
- Functional — phép theo hệ × bậc:

| Hệ | ✦ bậc 1 (phase 2) | ✦✦ Chú lớn | ✦✦✦ Đại chú |
|---|---|---|---|
| 🔥 Lửa | tia lửa | cầu lửa xoáy, nổ vòng lửa | trận đồ đỏ dưới chân → thiên thạch rơi, rung màn |
| ❄️ Băng | mảnh băng | giáo băng xuyên, sương lan | trận đồ xanh → cột băng trồi dưới quái, vỡ vụn |
| ⚡ Sét | tia điện | sét đánh từ trời xuống | trận đồ tím → bão sét nhiều tia, loé trắng màn |
| 🌿 Đất | đá văng | khối đá bay xoay | trận đồ nâu → gai đá mọc quanh quái, bụi mù |
| 🌪️ Gió | lưỡi gió | vòi rồng nhỏ cuốn quái | trận đồ ngọc → lốc lớn nâng quái rồi quật xuống |

  Độ dài hoạt ảnh mỗi bậc khớp `BOSS_TUNING.impactMs` (250/450/800ms tới lúc va chạm) — render không tự quyết thời điểm.
- Tuyệt kỹ (event `ultimate{id}`, logic đã khoá 1,5s thời gian thật và dừng đồng hồ): **Mưa sao băng**, **Kỷ băng hà** (dừng đồng hồ 8s thời gian thật: sương phủ, đồng hồ đóng băng nứt), **Xích sét**, **Hồi sinh**, **Lốc xoáy**. Cắt cảnh: tên chiêu lớn giữa màn + chân dung pháp sư trượt vào. Phím gõ trong lúc khoá bị bỏ và ô input xoá (logic phase 1); đề kế hiện sau khoá, đo tốc độ từ lúc đó.
- Nội tại có hình, map 1-1 với event: `burnTick` (lửa âm ỉ + số DoT nhỏ), `freeze`/`unfreeze` (lớp băng, quái đứng im; băng phủ vòng đồng hồ khi có `clockAdd`), `fastCrit` (tia điện nhỏ), `shieldBlock` (bong bóng khiên đá vỡ), `hint`/`typoForgiven` (lá bay quanh chữ gợi ý, gió lướt).
- Thanh Nộ: rung + sáng khi `rageFull`; nút tuyệt kỹ (chặn mất focus như các nút khác) + **Shift+Enter** trên desktop.
- Non-functional: Đại chú + tuyệt kỹ giữ FPS ≥ 45 ở `quality = 1` trên iPhone 12 trở lên (đo bằng `?fps`, ghi lại `quality`); `quality 0.5` vẫn nhận ra được chiêu; `prefers-reduced-motion` tắt rung, giảm loé.

## Architecture
- **`js/boss-game-spell-art.js`**: `drawMagicCircle(ctx, x, y, r, color, t)` (vòng rune xoay 2 lớp), `drawMeteor`, `drawLightningBolt(ctx, a, b, seed)` (gãy khúc tất định), `drawIcePillar`, `drawRockSpikes`, `drawTornado`. Mỗi hàm < 30 dòng; file < 200 dòng (6 hàm).
- **`js/boss-game-spell-presets.js`** (dữ liệu): thêm preset bậc 2–3 + tuyệt kỹ + nội tại dưới dạng opts `burst` của `game-particles.js` + `{circle, custom:'meteor'|'bolt'|…, shake, flash}`; bỏ dần `fallback` khi có preset thật (giữ cấu trúc fallback cho an toàn).
- **`js/boss-game-render.js`**: bảng tra event → preset/hàm vẽ; lên lịch các lớp hình theo `impactAt` có sẵn trong event `cast`. **Không** có file điều phối riêng.
- Kiểm trần hạt: test thuần trong `tests/game-particles.test.js` — phát tổ hợp nặng nhất (Đại chú mỗi hệ + Mưa sao băng) bằng preset thật → số hạt đỉnh ≤ 300.

## Related Code Files
- Create: `js/boss-game-spell-art.js`
- Modify: `js/boss-game-spell-presets.js`, `js/boss-game-render.js`, `js/boss-game-ui.js` (nút tuyệt kỹ, Shift+Enter), `css/paper-theme.css` (cắt cảnh DOM), `index.html`, `sw.js` (ASSETS), `tests/game-particles.test.js`

## Implementation Steps
1. `drawMagicCircle` + lịch vẽ theo `impactAt`.
2. 5 phép bậc 2, rồi 5 phép bậc 3; xem trên trang nháp lặp lại (scratchpad, không commit).
3. 5 tuyệt kỹ + cắt cảnh + nút/phím.
4. Hiệu ứng nội tại theo event.
5. Test trần hạt với preset thật; đo FPS iPhone bằng `?fps`; chỉnh preset tới khi đạt.
6. **Điểm duyệt của user** (không phải cổng pass/fail tự động): quay màn hình 15 phép + 5 tuyệt kỹ gửi user xem.

## Success Criteria
- [ ] 15 phép + 5 tuyệt kỹ + nội tại đều có hình riêng; mỗi event trong danh sách phase 1 có hình.
- [ ] Trận đồ, rung, loé chỉ có ở bậc 3 → phân biệt rõ bậc.
- [ ] Test trần hạt ≤ 300 cho tổ hợp nặng nhất xanh.
- [ ] `?fps` ghi ≥ 45 FPS ở `quality = 1` trên iPhone khi Đại chú trong Mưa sao băng.
- [ ] Tung tuyệt kỹ khi đồng hồ còn 0,8s và 1 ❤️ → không mất ❤️ (logic phase 1, kiểm lại trên máy).
- [ ] User duyệt video hiệu ứng.

## Risk Assessment
- Khối lượng hiệu ứng lớn → ưu tiên bậc 3 + tuyệt kỹ; bậc 2 có thể giản lược, fallback luôn còn.
- Chồng nhiều phép → trần 300 cắt hạt cũ nhất trước (`game-particles.js`).
