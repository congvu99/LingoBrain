/* Game Pháp Sư Lexoria — DỮ LIỆU sheet FX mới cho 35 chiêu tự phát, thuần, KHÔNG có hàm (được phép vượt
   200 dòng). Gắn thêm vào BOSS_SPRITES (js/boss-game-sprite-atlas.js, nạp TRƯỚC file này) bằng Object.assign ở
   cuối file — không cần sửa sprite-atlas.js (giữ file đó ≤ 200 dòng, xem plan.md "Ràng buộc chung").
   Khung/kích thước đo bằng phân tích cột alpha (script scratchpad) + so khớp quy ước sheet cùng họ đã có trong
   BOSS_SPRITES (rockImpact 30×30×14, shieldSprite 24×26×6, spiritProj 32×32×5…) — không suy từ chiều cao đơn thuần.
   vfx = hệ số cỡ hiển thị khi dùng làm VFX va chạm (bossVfxScale, boss-game-sprite-actors.js), ước lượng theo cùng
   họ hiệu ứng đã có (spark/slash nhỏ ~0.4–0.5, cột/trụ to ~0.75, khiên/aura vừa ~0.45–0.55). */

const BOSS_SKILL_SPRITES = {
  sparkMagic: { src: 'img/boss/fx/spark-magic.png', fw: 30, fh: 35, vfx: 0.4, anims: { idle: { frames: 9, fps: 16, loop: false } } },
  cutX: { src: 'img/boss/fx/cut-x.png', fw: 32, fh: 32, vfx: 0.5, anims: { idle: { frames: 4, fps: 14, loop: false } } },
  slashCurved: { src: 'img/boss/fx/slash-curved.png', fw: 32, fh: 32, vfx: 0.5, anims: { idle: { frames: 4, fps: 14, loop: false } } },
  claw: { src: 'img/boss/fx/claw.png', fw: 32, fh: 32, vfx: 0.5, anims: { idle: { frames: 4, fps: 14, loop: false } } },
  water: { src: 'img/boss/fx/water.png', fw: 44, fh: 33, vfx: 0.6, anims: { idle: { frames: 10, fps: 14, loop: false } } },
  waterPillar: { src: 'img/boss/fx/water-pillar.png', fw: 30, fh: 41, vfx: 0.75, anims: { idle: { frames: 9, fps: 14, loop: false } } },
  plant: { src: 'img/boss/fx/plant.png', fw: 30, fh: 28, vfx: 0.5, anims: { idle: { frames: 8, fps: 12, loop: false } } },
  rockB: { src: 'img/boss/fx/rock-b.png', fw: 30, fh: 30, vfx: 0.55, anims: { idle: { frames: 14, fps: 16, loop: false } } },
  spiritDouble: { src: 'img/boss/fx/spirit-double.png', fw: 32, fh: 32, vfx: 0.45, anims: { idle: { frames: 5, fps: 12, loop: false } } },
  shieldYellow: { src: 'img/boss/fx/shield-yellow.png', fw: 24, fh: 26, vfx: 0.45, anims: { idle: { frames: 6, fps: 10, loop: false } } },
  circleSpark: { src: 'img/boss/fx/circle-spark.png', fw: 32, fh: 32, vfx: 0.55, anims: { idle: { frames: 6, fps: 12, loop: false } } },
  slashCircular: { src: 'img/boss/fx/slash-circular.png', fw: 54, fh: 55, vfx: 0.65, anims: { idle: { frames: 7, fps: 14, loop: false } } },
  bigEnergyBall: { src: 'img/boss/fx/big-energy-ball.png', fw: 24, fh: 24, vfx: 0.45, anims: { idle: { frames: 4, fps: 14, loop: false } } }
};

/* Icon 24×24/chiêu (Ui/Skill Icon/…) không cần khai trong BOSS_SPRITES — skill-book-ui.js dùng thẳng
   BOSS_SKILLS[el][slot].icon làm src <img>, không qua drawSprite/canvas. */

if (typeof BOSS_SPRITES !== 'undefined') Object.assign(BOSS_SPRITES, BOSS_SKILL_SPRITES);
// BOSS_EVO_SPRITES (js/boss-game-evolution-sprites.js) nạp TRƯỚC atlas — gộp ở ĐÂY (sau atlas) thay vì
// tại chỗ khai báo, cùng cơ chế Object.assign như BOSS_SKILL_SPRITES ở trên, không cần sửa sprite-atlas.js.
if (typeof BOSS_SPRITES !== 'undefined' && typeof BOSS_EVO_SPRITES !== 'undefined') Object.assign(BOSS_SPRITES, BOSS_EVO_SPRITES);
if (typeof module !== 'undefined') module.exports = { BOSS_SKILL_SPRITES };
