---
phase: 3
title: "Full monster roster and regions"
status: pending
priority: P2
dependencies: [2]
---

# Phase 3: Full monster roster and regions

## Overview
Đủ 12 quái/trùm sprite + 4 sân đấu ghép tile; đổi tên quái trong truyện cho khớp hình. Giữ `id`, vùng, `weak`, `hpMul`, `clockMul` và khung 4 chương × 7 trận.

## Requirements
Bảng ánh xạ đề xuất (**chờ user duyệt**):

| id (giữ) | Vùng | Sprite gói | Tên mới | weak |
|---|---|---|---|---|
| goblin | ashford | Monster/Slime | Slime Xanh | fire |
| wolf | ashford | Monster/Racoon | Gấu Mèo Cướp | storm |
| goblinKing | ashford | Boss/GiantRacoon | Vua Gấu Mèo | fire |
| skeleton | catacombs | Monster/Skull | Đầu Lâu | earth |
| ghost | catacombs | Monster/Spirit | Hồn Ma | storm |
| lich | catacombs | Boss/GiantSpirit | Hồn Ma Chúa | earth |
| troll | cliffs | Monster/Mole | Chuột Chũi Đá | ice |
| harpy | cliffs | Monster/Owl | Cú Đêm | fire |
| wyvern | cliffs | Boss/TenguBlue | Thiên Cẩu | ice |
| darkKnight | dragonlair | Monster/Flam | Linh Hồn Lửa | ice |
| youngDragon | dragonlair | Monster/Dragon | Rồng Con | storm |
| oblivion | dragonlair | Boss/DragonBlue (ghép Head + 2 Wing + Body) | Oblivion | storm |

- Sân đấu 4 vùng (tile gói): Ashford = cỏ + nhà + cây (TilesetField/House/Nature); Hầm mộ = nền đất tối + tàn tích rêu (TilesetVillageAbandoned, floor nâu, tô tối); Núi đá = nền tuyết + đá (TilesetFloor tuyết, TilesetRelief, cây tuyết); Hang rồng = nền cam/cát + đá (TilesetFloor cam, TilesetDesert đá, hạt Fire).
- Oblivion: ghép mảnh rồng thành tư thế chính diện, cánh vỗ bằng xoay nhẹ, thân nhấp nhô theo sin.
- Trùm có sheet Hit/Attack/Charge thì dùng thật; quái 16px thì dùng hoạt ảnh code của phase 2.

## Architecture
- `boss-game-story.js`: mỗi quái thêm `sprite: 'giantRacoon'` (khoá trong `BOSS_SPRITES`), bỏ `shape/palette/features/attackFx`; `BOSS_REGIONS` bỏ `sky/ground` gradient, thêm `sky` màu phẳng + khoá bố cục arena.
- Thay tên trong 28 đoạn intro/outro (khoảng 37 chỗ) theo tên mới; giữ nguyên `{id}` từ.
- `boss-game-arena.js`: bảng bố cục cho 4 vùng (dữ liệu).
- File mới `js/boss-game-dragon-composite.js` nếu vẽ rồng ghép > 40 dòng.

## Related Code Files
- Modify: `js/boss-game-story.js`, `js/boss-game-arena.js`, `js/boss-game-sprite-atlas.js` (thêm def), `js/boss-game-sprite-actors.js`, `tests/boss-game-story.test.js` (mỗi quái có `sprite` tồn tại trong `BOSS_SPRITES`), `sw.js`, `index.html`
- Delete: `js/boss-game-monster-shapes.js`, `js/boss-game-monster-art.js`, `js/boss-game-scene.js`
- Copy: sheet quái/trùm/tile của bảng trên vào `img/boss/`

## Implementation Steps
1. Copy sheet; thêm def vào `BOSS_SPRITES` (kích thước khung đo từ ảnh thật: GiantRacoon 60px, GiantSpirit 50px, TenguBlue 68px, DragonBlue Head 44×46…).
2. Cập nhật dữ liệu quái + đổi tên trong truyện; test story kiểm `sprite` hợp lệ.
3. Arena 3 vùng còn lại; rồng ghép.
4. Xoá file vẽ tay quái/scene + gỡ khỏi index.html/sw.js; grep không còn `drawMonster`/`BOSS_SCENE_PAINTERS`.
5. Chạy test + smoke test mỗi vùng (`?beat=` hoặc tiện ích debug có sẵn).

## Success Criteria
- [ ] 12 quái hiển thị đúng vùng, đúng cỡ (trùm to hơn), có hoạt ảnh idle/trúng đòn/chết.
- [ ] 4 sân đấu khác nhau rõ; build offscreen < 30ms trên desktop.
- [ ] Truyện đọc trôi chảy với tên mới; test story xanh.

## Risk Assessment
- Tên vùng "Làng Ashford" (châu Âu) + sprite phương Đông: đã chấp nhận ở brainstorm.
- Racoon/Mole 16px có thể quá "dễ thương" cho truyện hắc ám: câu truyện có thể chỉnh giọng nhẹ nhàng hơn; user duyệt.
