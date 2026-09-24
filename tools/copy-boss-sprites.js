/* Copy các sheet Ninja Adventure (pixel-boy, CC0) mà game Pháp sư dùng thật vào img/boss/ — chạy tay một lần,
   không phải bước build. Gói gốc (≈109MB) nằm ngoài git ở assets/ninja-adventure/.
   Dùng: node tools/copy-boss-sprites.js [thư-mục-gói]   (mặc định: <repo>/assets/ninja-adventure)
   Đích đổi tên kebab-case, phẳng theo nhóm actor/ fx/ tile/ — khớp src trong js/boss-game-sprite-atlas.js. */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.resolve(process.argv[2] || path.join(ROOT, 'assets/ninja-adventure'));
const DEST = path.join(ROOT, 'img/boss');

/* đích (trong img/boss/) → nguồn (trong gói) */
const FILES = {
  'actor/mage-f.png': 'Actor/Character/SorcererBlack/SpriteSheet.png',
  'actor/mage-m.png': 'Actor/Character/NinjaMageOrange/SpriteSheet.png',
  'actor/slime.png': 'Actor/Monster/Slime/Slime.png',
  'fx/fireball.png': 'FX/Projectile/Fireball.png',
  'fx/flam.png': 'FX/Elemental/Flam/SpriteSheet.png',
  'fx/explosion.png': 'FX/Elemental/Explosion/SpriteSheet.png',
  'fx/smoke.png': 'FX/Smoke/Smoke/SpriteSheet.png',
  'tile/floor.png': 'Backgrounds/Tilesets/TilesetFloor.png',
  'tile/nature.png': 'Backgrounds/Tilesets/TilesetNature.png',
  'tile/house.png': 'Backgrounds/Tilesets/TilesetHouse.png',
  // quái 16px (4 hướng, phase 3)
  'actor/racoon.png': 'Actor/Monster/Racoon/SpriteSheet.png',
  'actor/skull.png': 'Actor/Monster/Skull/SpriteSheet.png',
  'actor/spirit.png': 'Actor/Monster/Spirit/SpriteSheet.png',
  'actor/mole.png': 'Actor/Monster/Mole/Mole.png',
  'actor/owl.png': 'Actor/Monster/Owl/Owl.png',
  'actor/flam-monster.png': 'Actor/Monster/Flam/SpriteSheet.png',
  'actor/young-dragon.png': 'Actor/Monster/Dragon/SpriteSheet.png',
  // trùm chương (dải ngang, có Idle/Hit/Attack riêng)
  'actor/giant-racoon-idle.png': 'Actor/Boss/GiantRacoon/Idle.png',
  'actor/giant-racoon-attack.png': 'Actor/Boss/GiantRacoon/Attack.png',
  'actor/giant-spirit-idle.png': 'Actor/Boss/GiantSpirit/Idle.png',
  'actor/giant-spirit-hit.png': 'Actor/Boss/GiantSpirit/Hit.png',
  'actor/tengu-blue-idle.png': 'Actor/Boss/TenguBlue/Idle.png',
  'actor/tengu-blue-hit.png': 'Actor/Boss/TenguBlue/Hit.png',
  'actor/tengu-blue-attack.png': 'Actor/Boss/TenguBlue/Attack.png',
  // Oblivion: rồng ghép mảnh (đầu + 2 cánh + thân), ghép ở boss-game-dragon-composite.js
  'actor/dragon-blue-head.png': 'Actor/Boss/DragonBlue/Head.png',
  'actor/dragon-blue-wing.png': 'Actor/Boss/DragonBlue/Wing.png',
  'actor/dragon-blue-body1.png': 'Actor/Boss/DragonBlue/Body1.png',
  'actor/dragon-blue-body2.png': 'Actor/Boss/DragonBlue/Body2.png',
  'actor/dragon-blue-body-end.png': 'Actor/Boss/DragonBlue/BodyEnd.png',
  // tile sân đấu 3 vùng còn lại (đá/đồ vật hàng xa của cliffs + dragonlair dùng chung TilesetNature đã copy ở trên)
  'tile/village.png': 'Backgrounds/Tilesets/TilesetVillageAbandoned.png',
  // đạn + va chạm hệ (phase 4) — đo khung thật bằng IHDR/xem ảnh, xem js/boss-game-sprite-atlas.js
  'fx/ice-spike.png': 'FX/Projectile/IceSpike.png',
  'fx/energy-ball.png': 'FX/Projectile/EnergyBall.png',
  'fx/rock-proj.png': 'FX/Projectile/SpriteSheetRock.png',
  'fx/spirit-wind.png': 'FX/Magic/Spirit/SpriteSheet.png',
  'fx/ice-flake.png': 'FX/Elemental/Ice/SpriteSheet.png',
  'fx/ice-pillar.png': 'FX/Elemental/Ice/SpriteSheetB.png',
  'fx/thunder.png': 'FX/Elemental/Thunder/SpriteSheet.png',
  'fx/rock-impact.png': 'FX/Elemental/Rock/SpriteSheet.png',
  'fx/rock-spike.png': 'FX/Elemental/RockSpike/SpriteSheet.png',
  'fx/smoke-circular.png': 'FX/Smoke/SmokeCircular/SpriteSheet.png',
  'fx/leaf.png': 'FX/Particle/Leaf.png',
  'fx/magic-circle.png': 'FX/Magic/Circle/SpriteSheetOrange.png',
  'fx/shield.png': 'FX/Magic/Shield/SpriteSheetBlue.png',
  'fx/boost.png': 'FX/Magic/Boost/SpriteSheet.png',
  'fx/aura.png': 'FX/Magic/Aura/SpriteSheet.png',   // buff Ôn từ quanh pháp sư (review phase 4: mục 8)
  // Faceset 38×38 cho cắt cảnh tuyệt kỹ (thay chân dung vẽ tay drawMage)
  'actor/mage-f-face.png': 'Actor/Character/SorcererBlack/Faceset.png',
  'actor/mage-m-face.png': 'Actor/Character/NinjaMageOrange/Faceset.png'
};

if (!fs.existsSync(SRC)) { console.error('Không thấy gói: ' + SRC); process.exit(1); }
let total = 0;
for (const [dest, src] of Object.entries(FILES)) {
  const from = path.join(SRC, src), to = path.join(DEST, dest);
  if (!fs.existsSync(from)) { console.error('Thiếu: ' + src); process.exit(1); }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  total += fs.statSync(to).size;
  console.log('✓ ' + dest);
}
console.log(Object.keys(FILES).length + ' file, ' + (total / 1024).toFixed(1) + 'KB → ' + path.relative(ROOT, DEST));
