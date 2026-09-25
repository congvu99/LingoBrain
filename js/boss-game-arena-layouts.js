/* Game Pháp Sư Lexoria — DỮ LIỆU THUẦN (không hàm, được phép vượt 200 dòng): sân riêng cho từng quái trong
   BOSS_MONSTERS (12 id — xem js/boss-game-story.js), phủ lên sân vùng dùng chung (BOSS_ARENAS, boss-game-arena.js).
   `base` = vùng kế thừa mọi trường CÒN THIẾU (sky/grass/details/far/patchColor) — resolver bossArenaFor (đặt ở
   boss-game-arena.js, nạp TRƯỚC file này, chỉ đọc BOSS_MONSTER_ARENAS lúc gọi nên thứ tự nạp 2 chiều đều được)
   gộp base + override bằng Object.assign nông (field có ở đây → đè hẳn field của vùng, không gộp sâu mảng).
   `anim`: tile hoạt hình vị trí CỐ ĐỊNH (hoa/cờ/cối xay/thác) = [sprite, xFrac, yFrac, scale?] — vẽ lớp 'back' của
   boss-game-arena-ambient.js (sau nền, trước nhân vật), scale thiếu → dùng layout.k (cùng lưới pixel nền).
   `ambient`: lớp thời tiết bay lớp 'front' (sau nhân vật, trước HUD) — { kind ∈ BOSS_AMBIENT_KIND, density 0..1 }.
   `light`: hiệu ứng phụ thêm vào lớp 'front' (không thay ambient.kind) — 'raylight' (tia sáng) | 'clouds' (mây trôi).
   Toạ độ tile mới (field/relief/desert/towers/water/dungeon/floor-detail) đo bằng thuật toán "hình chữ nhật lớn
   nhất toàn màu, không dính viền gần-trắng" (scratchpad Node script, cùng nguyên lý IHDR+zlib inflate như phase 1/3)
   — tránh đúng lỗi viền trắng autotile đã ghi ở boss-game-arena.js (chỉ lấy vùng an toàn, có biên lùi vào trong). */

const BOSS_MONSTER_ARENAS = {
  // ---- Ashford (làng) ----
  goblin: {   // đồng cỏ hoa: hoa nở rải rác trên nền cỏ sẵn có + thêm 1 mảng cỏ hoa TilesetField (tileset mới)
    base: 'ashford',
    // crop cũ [6,11,16,16] lệch lưới 16px của field.png (đọc bằng script scratchpad find-solid-tiles.js) → dính
    // rìa gần-trắng bo tròn của khối màu cam, ra ô vuông phẳng "đào" thay vì cỏ hoa. [16,64,16,16] = tâm khối
    // xanh nhạt (băng thứ 2/5 dải màu field.png), opaque hoàn toàn, sáng hơn cỏ ashford gốc → đọc được như mảng cỏ hoa.
    details: BOSS_ARENAS.ashford.details.concat([['tileField', 16, 64, 16, 16]]),
    anim: [['tileAnimFlower', 0.3, 0.8], ['tileAnimFlower', 0.6, 0.86], ['tileAnimFlower', 0.8, 0.79]],
    ambient: { kind: 'leaf', density: 0.35 }
  },
  wolf: {   // bìa rừng rậm: toàn cây (bỏ nhà), lá rơi dày hơn
    base: 'ashford',
    far: [['tileNature', 256, 0, 32, 32], ['tileNature', 32, 0, 32, 32], ['tileNature', 256, 0, 32, 32],
      ['tileNature', 32, 0, 32, 32], ['tileNature', 256, 0, 32, 32], ['tileNature', 32, 0, 32, 32]],
    ambient: { kind: 'leaf', density: 0.75 }
  },
  goblinKing: {   // làng: nhà + cờ đỏ/xanh phất + cối xay quay xa, tia nắng xuyên (Raylight)
    // review QA (tester 260925-1528): far[] cũ house(64)+tower(12)+house(64)+nature(32) khiến nhà 2 rơi đúng vào
    // x≈0.7 (vị trí trùm, layoutBoss) ở khung 390/560px k=4 → cối xay (0.5,0.4, cỡ 64×64×k rất to) đè lên nhà 1 +
    // trùm. Đổi thứ tự (nature chen giữa) đẩy nhà 2 ra ngoài khung/qua khỏi trùm, cối xay dời sang góc trời trái
    // (0.08, 0.3) + ghim scale cố định 2 (không theo k) để không phình to ở khung DPR cao, cờ dời sát 2 bên nhà 1.
    base: 'ashford',
    far: [['tileHouse', 0, 0, 64, 48], ['tileNature', 32, 0, 32, 32], ['tileTowers', 202, 6, 12, 24],
      ['tileHouse', 192, 0, 64, 48]],
    anim: [['tileAnimFlagRed', 0.14, 0.56], ['tileAnimFlagBlue', 0.34, 0.56], ['tileAnimMill', 0.08, 0.3, 2]],
    ambient: { kind: 'leaf', density: 0.2 }, light: 'raylight'
  },
  // ---- Catacombs (hầm mộ) ----
  skeleton: {   // hầm gần cửa vào: sương nhẹ, thêm đồ vật TilesetDungeon (tileset mới) giữa tàn tích làng bỏ hoang
    base: 'catacombs',
    far: [['tileVillage', 0, 0, 64, 48], ['tileDungeon', 40, 20, 24, 12], ['tileVillage', 160, 0, 64, 44]],
    ambient: { kind: 'fog', density: 0.3 }
  },
  ghost: {   // nghĩa địa sâu hơn: lặp dày đặc 1 kiểu mộ + đồ vật dungeon khác vị trí skeleton, trời tối hơn hẳn
    // (review QA: trước đây kế thừa nguyên far catacombs gốc — giống hệt skeleton, chỉ khác mật độ sương)
    base: 'catacombs',
    sky: ['#0f0d1c', '#060509'],
    far: [['tileVillage', 160, 0, 64, 44], ['tileDungeon', 64, 32, 16, 16], ['tileVillage', 160, 0, 64, 44]],
    ambient: { kind: 'fog', density: 0.65 }
  },
  lich: {   // đền sâu nhất: tháp đá cao lồng trong sương, ánh u ám (sky gốc catacombs đã tối/tím)
    base: 'catacombs',
    far: [['tileVillage', 160, 0, 64, 44], ['tileTowers', 298, 38, 14, 24], ['tileVillage', 0, 0, 64, 48]],
    ambient: { kind: 'fog', density: 0.5 }
  },
  // ---- Cliffs (núi đá) ----
  troll: {   // mỏ đá: vách đá TilesetRelief (tileset mới) trên hàng xa, nền băng gốc cliffs giữ nguyên (xanh nhạt
    // = tâm khối tròn biến thể xanh của TilesetFloor, ĐÚNG Ý ĐỒ — không phải lỗi, xem BOSS_ARENAS.cliffs)
    base: 'cliffs',
    // review QA (tester 260925-1528): crop cũ [24,90,48,30] rơi vào rìa gần-trắng giữa 2 khối tường đá của
    // relief.png → mảng phẳng màu kem lẫn nền. [64,0,48,32] = mảng tường đá xám-lục đặc (script find-solid-tiles.js
    // + xem ảnh scratchpad), opaque, khớp đúng 3 cột lưới 16px.
    far: [['tileNature', 257, 80, 55, 48], ['tileRelief', 64, 0, 48, 32], ['tileNature', 254, 131, 33, 28]],
    // floor-detail.png là sheet ICON vụn (nhánh cây/xương/đá — nền TRONG SUỐT ở MỌI ô, không có ô 16×16 nào đặc
    // hoàn toàn, đã xác nhận bằng script scratchpad find-solid-tiles.js quét cả sheet). Dùng icon này làm `details`
    // (thế chỗ hẳn ô cỏ, không đè lên) luôn lộ 3/4 ô trong suốt → "lỗ sàn". Bỏ hẳn override, giữ details cliffs gốc.
    ambient: { kind: 'fog', density: 0.2 }   // bụi đá cuộn nhẹ dưới chân vách
  },
  harpy: {   // đỉnh núi: mây trôi + tuyết bay
    base: 'cliffs',
    ambient: { kind: 'snow', density: 0.5 }, light: 'clouds'
  },
  wyvern: {   // thác băng: thác nước 3 tầng (top/middle/bottom) đổ liên tục sát vách đá + hồ nhỏ TilesetWater
    base: 'cliffs',
    // crop nước cũ [24,200,40,36] rơi vào dải ván gỗ cam của water.png (không phải nước) → mảng sọc cam. Đổi sang
    // hồ nước tròn viền nâu [0,0,48,48] (script find-solid-tiles.js + xem ảnh scratchpad, đủ 3×3 ô lưới 16px).
    far: [['tileNature', 257, 80, 55, 48], ['tileWater', 0, 0, 48, 48], ['tileNature', 254, 131, 33, 28]],
    // 3 tầng thác XẾP LIỀN NHAU thật (không còn hở/lệch): tầng top đặt mốc y=0.4h, tầng middle/bottom dùng
    // 'stackDown' (bossAmbientBack, boss-game-arena-ambient.js) → y = đáy tầng trước + fh×scale tầng này, luôn
    // khít bất kể k (world scale) hay chiều cao khung — trước đây 3 mốc % cố định (0.36/0.46/0.56) không khớp
    // đúng fh×scale thật nên hở/lệch tuỳ khung.
    anim: [['tileAnimWaterfallTop', 0.5, 0.4], ['tileAnimWaterfallMiddle', 0.5, 'stackDown'], ['tileAnimWaterfallBottom', 0.5, 'stackDown']],
    ambient: { kind: 'snow', density: 0.35 }
  },
  // ---- Dragonlair (hang rồng) ---- (review QA: 3 sân trước gần như giống hệt nhau — chỉ youngDragon có far
  // riêng — nay mỗi sân thêm 1 mốc kiến trúc/đá riêng + darkKnight/oblivion lệch sky để phân biệt rõ)
  darkKnight: {   // cửa hang: tháp canh đổ nát xa xa (TilesetTowers, tái dùng crop đã kiểm ở lich), tàn lửa nhẹ
    base: 'dragonlair',
    far: [['tileNature', 193, 80, 55, 48], ['tileTowers', 202, 6, 12, 24], ['tileNature', 206, 131, 33, 28]],
    ambient: { kind: 'ember', density: 0.4 }
  },
  youngDragon: {   // sa mạc cháy: công trình TilesetDesert (tileset mới) cháy dở giữa đá nâu, tàn lửa dày hơn
    base: 'dragonlair',
    far: [['tileNature', 193, 80, 55, 48], ['tileDesert', 178, 8, 50, 18], ['tileNature', 206, 131, 33, 28]],
    ambient: { kind: 'ember', density: 0.55 }
  },
  oblivion: {   // miệng núi lửa: tường đá nứt cao (TilesetRelief, tái dùng crop đã kiểm ở troll) + trời tối nhất,
    // tàn lửa dày đặc nhất trận
    base: 'dragonlair',
    sky: ['#1a0503', '#2a0806', '#0d0301'],
    far: [['tileNature', 193, 80, 55, 48], ['tileRelief', 64, 0, 48, 32], ['tileNature', 206, 131, 33, 28]],
    ambient: { kind: 'ember', density: 0.9 }
  }
};

if (typeof module !== 'undefined') module.exports = { BOSS_MONSTER_ARENAS };
