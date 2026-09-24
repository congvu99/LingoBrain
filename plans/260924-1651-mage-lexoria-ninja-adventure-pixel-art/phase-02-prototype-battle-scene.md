---
phase: 2
title: "Prototype battle scene"
status: in-progress
priority: P1
dependencies: [1]
---

# Phase 2: Prototype battle scene

## Overview
Bản thử để user duyệt cảm nhận: một trận với pháp sư sprite, quái Slime (trận đầu chương 1), nền sân Ashford ghép tile và VFX hệ Lửa. Hệ khác tạm dùng VFX Lửa tô màu (hoặc giữ hạt cũ) cho tới phase 4.

## Requirements
- Góc Pokémon: pháp sư quay lưng ở dưới-trái (khoảng 22%, 86% khung), quái quay mặt ở trên-phải (khoảng 70%, 52%). Quái đứng trên đế đất elip, có bóng.
- Cỡ: pháp sư ≈ 28–32% chiều cao khung, quái thường ≈ 30%, trùm ≈ 45%; phóng số nguyên.
- Hoạt ảnh gắn event có sẵn (không đổi logic):
  - `idle`: pháp sư khung đứng + nhún 1px; quái 4 khung đi hướng xuống.
  - `key`/chant: pháp sư khung "Special" hoặc "Item" + vòng rune hiện có.
  - `cast`: khung Attack hướng lên, đạn `Fireball` bay theo đường cong tới quái.
  - `impact`: quái nháy trắng + giật lùi 2–4px; `Explosion`/`Flam` tại quái; rung màn giữ như cũ.
  - `hurt` (trùm đánh): quái lao về phía pháp sư rồi về; pháp sư nháy + lùi.
  - `won`: quái tan thành ô pixel (lấy màu từ sprite qua `getImageData` một lần) + `Smoke`.
- Nền: dựng offscreen **một lần mỗi lần đổi cỡ** từ tile (cỏ, lối đất, cây, 1–2 nhà ở hàng xa), trời màu phẳng theo vùng. Không vẽ gradient mỗi khung.
- Hạt: đổi cách vẽ của boss thành ô vuông pixel (`fillRect` làm tròn), vẫn dùng `game-particles.js`.

## Architecture
- `boss-game-render.js`: `layoutBoss` mới (vị trí Pokémon, `scale` nguyên), gọi `drawBossMageSprite` và `drawBossMonsterSprite` thay `drawMage`/`drawMonster`; đồng hồ trùm chuyển thành thanh dưới HP (vòng tròn quanh quái không hợp góc mới).
- File mới `js/boss-game-sprite-actors.js`: trạng thái hoạt ảnh diễn viên (`fx.actor = {mon:{lunge, recoil, flash, dying}, mage:{...}}`), cập nhật từ `bossFxEvent`, vẽ bằng `drawSprite`.
- File mới `js/boss-game-arena.js`: `buildBossArena(regionId, w, h, dpr)` trả canvas offscreen ghép tile; bảng bố cục tile theo vùng là dữ liệu.
- `boss-game-scene.js` giữ tạm cho 3 vùng chưa làm (xoá ở phase 3).

## Related Code Files
- Create: `js/boss-game-sprite-actors.js`, `js/boss-game-arena.js`
- Modify: `js/boss-game-render.js`, `js/boss-game-spell-art.js` (đạn/va chạm dùng sprite hệ Lửa, hạt ô vuông), `js/boss-game-ui.js` (gọi `loadBossSprites` trước đếm ngược, build arena khi resize), `index.html`, `sw.js`, `js/app-storage.js`
- Không đổi: `boss-game-logic.js`, `boss-game-progress.js`, sync

## Implementation Steps
1. Arena Ashford: bảng tile + build offscreen theo DPR; kích thước logic làm tròn theo bội số scale.
2. Actors: pháp sư và quái sprite + trạng thái lunge/recoil/flash/dying theo event.
3. VFX Lửa: Fireball bay (xoay theo hướng), Flam/Explosion tại impact; bậc 1/2/3 = scale ×1/×1.5/×2 + số đạn như cũ.
4. Đổi hạt boss sang ô vuông pixel.
5. Nạp sprite lúc vào trận (đếm ngược 3-2-1 che thời gian nạp); lỗi nạp thì vẫn chơi được (bỏ qua vẽ).
6. Smoke test trên desktop (`?fps`) + chụp màn; gửi user link LAN/iPhone để duyệt.

## Success Criteria
- [x] Trận đầu chương 1 hiện pháp sư + Slime + nền Ashford bằng sprite, sắc nét ở DPR 2.
- [x] Niệm Lửa: ra đòn + Fireball + nổ khớp `impact`; quái nháy/giật; thắng thì quái tan.
- [ ] FPS desktop ≥ 50; test xanh; không file > 200 dòng.
- [ ] **User duyệt trên iPhone** trước khi sang phase 3.

## Risk Assessment
- 16px phóng ×6–×8 trông thô trên màn to: cho phép scale theo cỡ khung, không cố định.
- Canvas cỡ lẻ ở DPR 2 gây nhoè: làm tròn cỡ backing store theo bội số của scale.
- `getImageData` trên ảnh cùng origin là an toàn (không bị taint); chỉ gọi một lần khi quái chết.
- Rollback: revert commit phase 2 là về hình vẽ tay (phase 1 không đổi hình).
