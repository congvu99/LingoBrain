/* Game Pháp Sư Lexoria — DỮ LIỆU sheet FX/tile mới chưa dùng ở bộ Ninja Adventure (plan 260925-1445 phase 1),
   thuần, KHÔNG có hàm (được phép vượt 200 dòng). Gắn vào BOSS_SPRITES (js/boss-game-sprite-atlas.js, nạp TRƯỚC
   file này, sau boss-game-skill-sprites.js) bằng Object.assign ở cuối file — không sửa sprite-atlas.js.
   Khung/kích thước đo bằng phân tích cột alpha (script scratchpad, IHDR + zlib inflate PNG thô, đếm đoạn cột có
   alpha>10 rồi khớp W/fw ra số nguyên) + xem ảnh thật (Read tool) để chốt — không suy từ chiều cao đơn thuần,
   cùng quy trình đã làm cho BOSS_SKILL_SPRITES (js/boss-game-skill-sprites.js). Sheet dải ngang 32×32 (Attack/Magic
   Circle) khớp file circle-spark2.png xem bằng mắt (5 vòng tròn rõ, W=160/32=5) → dùng làm mốc cho cả họ.
   vfx = hệ số cỡ hiển thị khi dùng làm VFX va chạm (bossVfxScale, boss-game-sprite-actors.js); KHÔNG áp cho đạn
   bay (đạn tự tính theo projectile.size) — vẫn khai để chiêu nào dùng lại làm impact có sẵn giá trị. */

const BOSS_EXTRA_SPRITES = {
  // ---- đạn/burst mới (Projectile) — hình đối xứng/không rõ "đầu", không khai rotOffset ----
  plantSpike: { src: 'img/boss/fx/plant-spike.png', fw: 24, fh: 20, vfx: 0.4, anims: { idle: { frames: 4, fps: 14, loop: false } } },
  shurikenMagic: { src: 'img/boss/fx/shuriken-magic.png', fw: 16, fh: 16, vfx: 0.35, anims: { idle: { frames: 2, fps: 12, loop: false } } },
  bigShuriken: { src: 'img/boss/fx/big-shuriken.png', fw: 46, fh: 23, vfx: 0.4, anims: { idle: { frames: 1 } } },   // 1 khung tĩnh — xoay bằng opt.rot lúc vẽ nếu cần quay tròn
  kunai: { src: 'img/boss/fx/kunai.png', fw: 65, fh: 59, vfx: 0.4, anims: { idle: { frames: 10, fps: 16, loop: false } } },
  // ---- slash/cut/claw (Slash + Attack) — dải ngang, fh khác nhau theo sheet gốc ----
  slash01: { src: 'img/boss/fx/slash-01.png', fw: 26, fh: 32, vfx: 0.45, anims: { idle: { frames: 5, fps: 16, loop: false } } },
  slash02: { src: 'img/boss/fx/slash-02.png', fw: 66, fh: 50, vfx: 0.6, anims: { idle: { frames: 6, fps: 16, loop: false } } },
  slash03: { src: 'img/boss/fx/slash-03.png', fw: 57, fh: 42, vfx: 0.55, anims: { idle: { frames: 4, fps: 14, loop: false } } },
  slashArc: { src: 'img/boss/fx/slash-arc.png', fw: 38, fh: 34, vfx: 0.5, anims: { idle: { frames: 6, fps: 16, loop: false } } },
  slashMulti: { src: 'img/boss/fx/slash-multi.png', fw: 27, fh: 30, vfx: 0.45, anims: { idle: { frames: 10, fps: 18, loop: false } } },
  slashCircularB: { src: 'img/boss/fx/slash-circular-b.png', fw: 32, fh: 32, vfx: 0.5, anims: { idle: { frames: 4, fps: 14, loop: false } } },
  clawDouble: { src: 'img/boss/fx/claw-double.png', fw: 32, fh: 32, vfx: 0.5, anims: { idle: { frames: 4, fps: 14, loop: false } } },
  cut: { src: 'img/boss/fx/cut.png', fw: 32, fh: 32, vfx: 0.45, anims: { idle: { frames: 4, fps: 16, loop: false } } },
  cutDouble: { src: 'img/boss/fx/cut-double.png', fw: 32, fh: 32, vfx: 0.5, anims: { idle: { frames: 5, fps: 16, loop: false } } },
  slashDoubleCurved: { src: 'img/boss/fx/slash-double-curved.png', fw: 32, fh: 32, vfx: 0.5, anims: { idle: { frames: 4, fps: 14, loop: false } } },
  // ---- magic circle / spirit (Magic) — cùng lưới 32×32, khớp mắt circle-spark2 (5 vòng rõ) ----
  circleWhite: { src: 'img/boss/fx/circle-white.png', fw: 32, fh: 32, vfx: 0.5, anims: { idle: { frames: 4, fps: 10 } } },
  circleSpark2: { src: 'img/boss/fx/circle-spark2.png', fw: 32, fh: 32, vfx: 0.55, anims: { idle: { frames: 5, fps: 12 } } },
  spiritBlue: { src: 'img/boss/fx/spirit-blue.png', fw: 32, fh: 32, vfx: 0.45, anims: { idle: { frames: 5, fps: 12, loop: false } } },
  // ---- elemental biến thể B — khớp cỡ khung của bản gốc cùng họ đã có trong BOSS_SKILL_SPRITES ----
  iceFlakeB: { src: 'img/boss/fx/ice-flake-b.png', fw: 32, fh: 32, vfx: 0.4, anims: { idle: { frames: 9, fps: 16, loop: false } } },
  plantB: { src: 'img/boss/fx/plant-b.png', fw: 30, fh: 26, vfx: 0.5, anims: { idle: { frames: 7, fps: 12, loop: false } } },
  // ---- hạt môi trường (Particle) — vfx nhỏ, dùng cho lớp ambient động sân đấu (phase 5) ----
  particleFire: { src: 'img/boss/fx/particle-fire.png', fw: 8, fh: 12, vfx: 0.15, anims: { idle: { frames: 12, fps: 14 } } },
  particleRain: { src: 'img/boss/fx/particle-rain.png', fw: 8, fh: 8, vfx: 0.12, anims: { idle: { frames: 3, fps: 12 } } },
  particleSnow: { src: 'img/boss/fx/particle-snow.png', fw: 8, fh: 8, vfx: 0.12, anims: { idle: { frames: 7, fps: 10 } } },
  particleLeafPink: { src: 'img/boss/fx/particle-leaf-pink.png', fw: 12, fh: 7, vfx: 0.12, anims: { idle: { frames: 6, fps: 12 } } },
  particleRockGray: { src: 'img/boss/fx/particle-rock-gray.png', fw: 16, fh: 16, vfx: 0.2, anims: { idle: { frames: 5, fps: 10 } } },
  particleClouds: { src: 'img/boss/fx/particle-clouds.png', fw: 80, fh: 36, vfx: 0.9, anims: { idle: { frames: 1 } } },   // 1 khung tĩnh — trôi bằng code (dịch toạ độ), không đổi khung
  // ---- overlay môi trường (Environment) — phủ toàn màn, 1 hoặc vài khung mờ dần ----
  fog: { src: 'img/boss/fx/fog.png', fw: 320, fh: 180, vfx: 3, anims: { idle: { frames: 1 } } },
  raylight: { src: 'img/boss/fx/raylight.png', fw: 72, fh: 102, vfx: 1.8, anims: { idle: { frames: 3, fps: 4 } } },
  // ---- tileset sân đấu (phase 5) — lưới 16×16, cắt theo toạ độ ở boss-game-arena.js, không có anim (giống tileFloor/tileNature) ----
  tileField: { src: 'img/boss/tile/field.png', fw: 16, fh: 16, anims: {} },
  tileDungeon: { src: 'img/boss/tile/dungeon.png', fw: 16, fh: 16, anims: {} },
  tileRelief: { src: 'img/boss/tile/relief.png', fw: 16, fh: 16, anims: {} },
  tileDesert: { src: 'img/boss/tile/desert.png', fw: 16, fh: 16, anims: {} },
  tileTowers: { src: 'img/boss/tile/towers.png', fw: 16, fh: 16, anims: {} },
  tileWater: { src: 'img/boss/tile/water.png', fw: 16, fh: 16, anims: {} },
  tileFloorDetail: { src: 'img/boss/tile/floor-detail.png', fw: 16, fh: 16, anims: {} },
  // ---- tile động (Animated) — dải ngang thật, khung đo bằng mắt (xem ảnh: hoa 2 khung, hoa/cỏ/gợn nước/cờ 16×16
  // ×4, thác 16×16×3–5, cối xay 64×64×4) ----
  tileAnimFlower: { src: 'img/boss/tile/anim-flower.png', fw: 10, fh: 8, anims: { idle: { frames: 2, fps: 3 } } },
  tileAnimPlant: { src: 'img/boss/tile/anim-plant.png', fw: 16, fh: 16, anims: { idle: { frames: 4, fps: 4 } } },
  tileAnimWaterRipples: { src: 'img/boss/tile/anim-water-ripples.png', fw: 16, fh: 16, anims: { idle: { frames: 4, fps: 6 } } },
  tileAnimWaterfallTop: { src: 'img/boss/tile/anim-waterfall-top.png', fw: 16, fh: 16, anims: { idle: { frames: 5, fps: 8 } } },
  tileAnimWaterfallMiddle: { src: 'img/boss/tile/anim-waterfall-middle.png', fw: 16, fh: 16, anims: { idle: { frames: 5, fps: 8 } } },
  tileAnimWaterfallBottom: { src: 'img/boss/tile/anim-waterfall-bottom.png', fw: 16, fh: 16, anims: { idle: { frames: 3, fps: 8 } } },
  tileAnimFlagRed: { src: 'img/boss/tile/anim-flag-red.png', fw: 16, fh: 16, anims: { idle: { frames: 4, fps: 5 } } },
  tileAnimFlagBlue: { src: 'img/boss/tile/anim-flag-blue.png', fw: 16, fh: 16, anims: { idle: { frames: 4, fps: 5 } } },
  tileAnimMill: { src: 'img/boss/tile/anim-mill.png', fw: 64, fh: 64, anims: { idle: { frames: 4, fps: 8 } } }
};

if (typeof BOSS_SPRITES !== 'undefined') Object.assign(BOSS_SPRITES, BOSS_EXTRA_SPRITES);
if (typeof module !== 'undefined') module.exports = { BOSS_EXTRA_SPRITES };
