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
  'tile/house.png': 'Backgrounds/Tilesets/TilesetHouse.png'
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
