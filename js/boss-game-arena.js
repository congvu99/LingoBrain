/* Game Pháp Sư Lexoria — sân đấu kiểu Pokémon ghép từ tile Ninja Adventure, vẽ offscreen 1 lần mỗi lần đổi cỡ/DPR/vùng
   (boss-game-render.js drawImage lại mỗi khung). Trời màu phẳng theo dải, hàng cây/nhà ở chân trời, nền cỏ lát tile,
   đế đất dưới quái và pháp sư (theo fx.layout). Bố cục cả 4 vùng là DỮ LIỆU trong BOSS_ARENAS; ảnh tile chưa nạp
   xong → trả null, boss-game-render.js tự vẽ tạm 1 màu phẳng (không ném lỗi). Cần boss-game-sprite-atlas.js. */

/* Ô tile: [sprite, sx, sy, sw, sh] theo px trong sheet gốc. `patchColor` = màu đế đất dưới chân quái/pháp sư,
   vẽ bằng ô pixel (không dùng ảnh) để không lộ viền vuông của khối tròn autotile — xem bossArenaPatch.
   Toạ độ đo bằng công cụ crop PNG riêng (đọc IHDR + zlib inflate), xem báo cáo phase 3. `details` CHỈ lấy từ
   đúng tâm khối tròn autotile (cột/hàng rìa của khối tròn dính nền trắng của ảnh gốc → lộ hình vuông trắng khi lát). */
const BOSS_ARENAS = {
  ashford: {
    sky: ['#f7b27a', '#e58f7c', '#b86b8a'], patchColor: '#5f6720',   // dải trời hoàng hôn từ trên xuống
    grass: ['tileFloor', 0, 192, 16, 16],
    details: [['tileFloor', 16, 192, 16, 16], ['tileFloor', 32, 192, 16, 16], ['tileFloor', 48, 192, 16, 16],
      ['tileFloor', 64, 192, 16, 16], ['tileFloor', 32, 176, 16, 16], ['tileFloor', 48, 176, 16, 16]],
    // hàng xa (chân đặt ở đường chân trời), lặp lại theo chiều ngang; x = vị trí tương đối trong một nhịp
    far: [['tileNature', 256, 0, 32, 32], ['tileHouse', 0, 0, 64, 48], ['tileNature', 32, 0, 32, 32],
      ['tileNature', 256, 0, 32, 32], ['tileHouse', 192, 0, 64, 48], ['tileNature', 32, 0, 32, 32]]
  },
  // Hầm mộ: nền đất nâu tối (tâm khối tròn biến thể nâu của TilesetFloor, ô phẳng không viền),
  // tàn tích rêu (tường đổ + bia mộ) lấy từ TilesetVillageAbandoned
  catacombs: {
    sky: ['#171528', '#0b0a14'], patchColor: '#5e4d3d',
    grass: ['tileFloor', 192, 240, 16, 16],
    details: [['tileFloor', 192, 240, 16, 16]],   // chỉ tâm khối tròn — rìa dính nền trắng của ảnh gốc
    far: [['tileVillage', 0, 0, 64, 48], ['tileVillage', 160, 0, 64, 44], ['tileVillage', 0, 0, 64, 48],
      ['tileVillage', 160, 0, 64, 44]]
  },
  // Núi đá: nền băng xanh nhạt (tâm khối tròn biến thể xanh), đá xám (TilesetNature) ở hàng xa
  cliffs: {
    sky: ['#8fb6d9', '#c9d8e6', '#eef3f6'], patchColor: '#849ea5',
    grass: ['tileFloor', 16, 352, 16, 16],
    details: [['tileFloor', 16, 352, 16, 16]],
    far: [['tileNature', 257, 80, 55, 48], ['tileNature', 254, 131, 33, 28], ['tileNature', 257, 80, 55, 48],
      ['tileNature', 254, 131, 33, 28]]
  },
  // Hang rồng: nền dung nham cam (tâm khối tròn biến thể cam), đá nâu (TilesetNature) ở hàng xa,
  // trời đỏ sẫm gần đen cho cảm giác hang sâu
  dragonlair: {
    sky: ['#2a0a06', '#3c1208', '#170603'], patchColor: '#83502b',
    grass: ['tileFloor', 192, 352, 16, 16],
    details: [['tileFloor', 192, 352, 16, 16]],
    far: [['tileNature', 193, 80, 55, 48], ['tileNature', 206, 131, 33, 28], ['tileNature', 193, 80, 55, 48],
      ['tileNature', 206, 131, 33, 28]]
  }
};

const BOSS_ARENA_SPRITES = ['tileFloor', 'tileNature', 'tileHouse', 'tileVillage'];
const BOSS_ARENA_HORIZON = 0.4;   // chân trời ở 40% chiều cao

/* Số giả ngẫu nhiên tất định theo ô (cỏ lốm đốm không nhảy mỗi lần resize) */
function bossArenaHash(x, y) { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); }

function bossArenaTile(ctx, t, x, y, kx, ky) {
  const img = bossSpriteImage(t[0]);
  if (img) ctx.drawImage(img, t[1], t[2], t[3], t[4], Math.round(x), Math.round(y), t[3] * kx, t[4] * (ky || kx));
}

/* Đế đất hình elip dưới chân — vẽ bằng ô pixel (fillRect theo hàng), không dùng ảnh autotile: khối tròn trong
   TilesetFloor có nền trắng đặc ở 4 góc (không trong suốt), cắt icon 48×48 sẽ lộ hình vuông trắng quanh đế. */
function bossArenaPatch(ctx, cx, cy, rx, ry, unit, color) {
  ctx.fillStyle = color;
  const rows = Math.max(1, Math.round(ry / unit));
  for (let j = -rows; j <= rows; j++) {
    const frac = 1 - (j / (rows + 0.5)) ** 2;
    if (frac <= 0) continue;
    const half = Math.round(rx * Math.sqrt(frac) / unit) * unit;
    if (half <= 0) continue;
    ctx.fillRect(Math.round(cx - half), Math.round(cy + j * unit - unit / 2), half * 2, unit);
  }
}

/* Hệ số pixel chung cho cả cảnh (tile + pháp sư + quái): ~14 hàng tile trên chiều cao khung, kẹp 2..6 (pháp sư
   ≥ 32px). Mọi lớp cùng một lưới pixel → nhân vật như đứng trong thế giới pixel, không "dán" lên nền cận cảnh. */
const BOSS_WORLD_ROWS = 14;
function bossWorldScale(h) { return Math.min(6, Math.max(2, Math.round(h / BOSS_WORLD_ROWS / 16))); }

/* → canvas offscreen (cỡ thật = w×h×dpr) hoặc null nếu vùng chưa có sân / tile chưa nạp */
function buildBossArena(regionId, w, h, dpr, layout) {
  const A = BOSS_ARENAS[regionId];
  if (!A || typeof document === 'undefined' || !BOSS_ARENA_SPRITES.every(bossSpriteReady)) return null;
  const off = document.createElement('canvas');
  off.width = Math.max(1, Math.round(w * dpr)); off.height = Math.max(1, Math.round(h * dpr));
  const ctx = off.getContext('2d');
  ctx.scale(dpr, dpr); ctx.imageSmoothingEnabled = false;
  const k = (layout && layout.k) || bossWorldScale(h), T = 16 * k, hz = Math.round(h * BOSS_ARENA_HORIZON);
  A.sky.forEach((c, i) => {   // dải trời phẳng, mỗi dải cao bằng nhau tới chân trời
    const y0 = Math.round(hz * i / A.sky.length), y1 = Math.round(hz * (i + 1) / A.sky.length);
    ctx.fillStyle = c; ctx.fillRect(0, y0, w, y1 - y0);
  });
  for (let y = hz, row = 0; y < h; y += T, row++) {   // nền cỏ + lốm đốm cỏ chi tiết
    for (let x = 0, col = 0; x < w; x += T, col++) {
      const r = bossArenaHash(col, row);
      bossArenaTile(ctx, r < 0.22 ? A.details[Math.floor(r * 100) % A.details.length] : A.grass, x, y, k);
    }
  }
  let x = -T * 0.5, i = 0;   // hàng cây/nhà: chân chạm chân trời, lấn xuống nửa ô cho có chiều sâu
  while (x < w) {
    const t = A.far[i++ % A.far.length];
    bossArenaTile(ctx, t, x, hz + T * 0.5 - t[4] * k, k);
    x += t[3] * k;
  }
  if (layout) {   // đế đất: elip pixel rộng ≈ 0.55× chiều cao quái, cao gần một nửa bề rộng
    [layout.mon, layout.mage].forEach(q => {
      if (!q || !q.k) return;
      bossArenaPatch(ctx, q.x, q.y - q.k, q.s * 0.55, q.s * 0.16, q.k, A.patchColor);
    });
  }
  return off;
}
