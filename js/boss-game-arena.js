/* Game Pháp Sư Lexoria — sân đấu kiểu Pokémon ghép từ tile Ninja Adventure, vẽ offscreen 1 lần mỗi lần đổi cỡ/DPR/vùng
   (boss-game-render.js drawImage lại mỗi khung). Trời màu phẳng theo dải, hàng cây/nhà ở chân trời, nền cỏ lát tile,
   đế đất dưới quái và pháp sư (theo fx.layout). Bố cục từng vùng là DỮ LIỆU trong BOSS_ARENAS; vùng chưa có sân →
   null (render dùng nền vẽ tay cũ ở boss-game-scene.js). Cần boss-game-sprite-atlas.js (ảnh tileFloor/Nature/House). */

/* Ô tile: [sprite, sx, sy, sw, sh] theo px trong sheet gốc */
const BOSS_ARENAS = {
  ashford: {
    sky: ['#f7b27a', '#e58f7c', '#b86b8a'],          // dải trời hoàng hôn từ trên xuống
    grass: ['tileFloor', 0, 192, 16, 16],
    details: [['tileFloor', 16, 192, 16, 16], ['tileFloor', 32, 192, 16, 16], ['tileFloor', 48, 192, 16, 16],
      ['tileFloor', 64, 192, 16, 16], ['tileFloor', 32, 176, 16, 16], ['tileFloor', 48, 176, 16, 16]],
    base: ['tileFloor', 0, 112, 48, 48],               // mảng đất tròn 3×3 → ép dẹt thành đế elip
    // hàng xa (chân đặt ở đường chân trời), lặp lại theo chiều ngang; x = vị trí tương đối trong một nhịp
    far: [['tileNature', 256, 0, 32, 32], ['tileHouse', 0, 0, 64, 48], ['tileNature', 32, 0, 32, 32],
      ['tileNature', 256, 0, 32, 32], ['tileHouse', 192, 0, 64, 48], ['tileNature', 32, 0, 32, 32]]
  }
};

const BOSS_ARENA_SPRITES = ['tileFloor', 'tileNature', 'tileHouse'];
const BOSS_ARENA_HORIZON = 0.4;   // chân trời ở 40% chiều cao

/* Số giả ngẫu nhiên tất định theo ô (cỏ lốm đốm không nhảy mỗi lần resize) */
function bossArenaHash(x, y) { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); }

function bossArenaTile(ctx, t, x, y, kx, ky) {
  const img = bossSpriteImage(t[0]);
  if (img) ctx.drawImage(img, t[1], t[2], t[3], t[4], Math.round(x), Math.round(y), t[3] * kx, t[4] * (ky || kx));
}

/* Hệ số phóng tile: nền "xa" nên thưa pixel hơn nhân vật (~9 hàng tile trên chiều cao khung) */
function bossArenaScale(h) { return pixelScale(h / 9, 16); }

/* → canvas offscreen (cỡ thật = w×h×dpr) hoặc null nếu vùng chưa có sân / tile chưa nạp */
function buildBossArena(regionId, w, h, dpr, layout) {
  const A = BOSS_ARENAS[regionId];
  if (!A || typeof document === 'undefined' || !BOSS_ARENA_SPRITES.every(bossSpriteReady)) return null;
  const off = document.createElement('canvas');
  off.width = Math.max(1, Math.round(w * dpr)); off.height = Math.max(1, Math.round(h * dpr));
  const ctx = off.getContext('2d');
  ctx.scale(dpr, dpr); ctx.imageSmoothingEnabled = false;
  const k = bossArenaScale(h), T = 16 * k, hz = Math.round(h * BOSS_ARENA_HORIZON);
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
  if (layout) {   // đế đất: rộng ≈ 1.5× nhân vật, cao một nửa
    [layout.mon, layout.mage].forEach(q => {
      if (!q || !q.k) return;
      const kx = Math.max(1, Math.round(q.s * 1.5 / A.base[3])), ky = Math.max(1, Math.round(kx / 2));
      bossArenaTile(ctx, A.base, q.x - A.base[3] * kx / 2, q.y - A.base[4] * ky * 0.62, kx, ky);
    });
  }
  return off;
}
