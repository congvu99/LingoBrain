/* Game Pháp Sư Lexoria — atlas sprite pixel (Ninja Adventure, pixel-boy, CC0; ảnh ở img/boss/, chép bằng
   tools/copy-boss-sprites.js). Hai phần:
   - THUẦN (chạy trong vm để test): BOSS_SPRITES mô tả sheet, spriteFrame(def, anim, t) → ô cắt, pixelScale.
   - DOM: loadBossSprites nạp/cache Image, drawSprite vẽ chuẩn pixel (không nhoè), nháy trắng qua canvas tạm.
   Hai kiểu sheet: nhân vật/quái 4 hướng (anim có `dir` → cột = hướng, khung đi dọc xuống từ `row`);
   trùm/VFX/tile là dải ngang (khung đi ngang từ `col`, ở hàng `row`). Ảnh chưa nạp xong → bỏ qua lượt vẽ, không ném lỗi. */

const BOSS_SPRITE_DIR = { down: 0, up: 1, left: 2, right: 3 };

/* Nhân vật 64×112: hàng 0–3 đi, 4 tấn công, 5 nhảy, 6 = [chết, đặc biệt 1, đặc biệt 2, cầm đồ] */
const BOSS_CHAR_ANIMS = {
  idle: { row: 0, frames: 1, dir: 'up' }, walk: { row: 0, frames: 4, fps: 6, dir: 'up' },
  attack: { row: 4, frames: 1, dir: 'up' }, jump: { row: 5, frames: 1, dir: 'up' },
  special: { row: 6, col: 1, frames: 1 }, face: { row: 0, frames: 1, dir: 'down' }
};

const BOSS_SPRITES = {
  mageF: { src: 'img/boss/actor/mage-f.png', fw: 16, fh: 16, anims: BOSS_CHAR_ANIMS },
  mageM: { src: 'img/boss/actor/mage-m.png', fw: 16, fh: 16, anims: BOSS_CHAR_ANIMS },
  slime: { src: 'img/boss/actor/slime.png', fw: 16, fh: 16, anims: { idle: { row: 0, frames: 4, fps: 6, dir: 'down' } } },
  fireball: { src: 'img/boss/fx/fireball.png', fw: 16, fh: 16, anims: { idle: { frames: 4, fps: 14 } } },   // đuôi lửa chĩa xuống: bay "lên"
  flam: { src: 'img/boss/fx/flam.png', fw: 25, fh: 30, anims: { idle: { frames: 8, fps: 16, loop: false } } },
  explosion: { src: 'img/boss/fx/explosion.png', fw: 40, fh: 40, anims: { idle: { frames: 9, fps: 18, loop: false } } },
  smoke: { src: 'img/boss/fx/smoke.png', fw: 32, fh: 32, anims: { idle: { frames: 6, fps: 12, loop: false } } },
  // tileset: chỉ cắt ô bằng toạ độ (boss-game-arena.js), không có anim
  tileFloor: { src: 'img/boss/tile/floor.png', fw: 16, fh: 16, anims: {} },
  tileNature: { src: 'img/boss/tile/nature.png', fw: 16, fh: 16, anims: {} },
  tileHouse: { src: 'img/boss/tile/house.png', fw: 16, fh: 16, anims: {} }
};

/* Ô cắt của khung tại thời điểm t (giây). loop:false → giữ khung cuối. Thiếu anim → 'idle'. */
function spriteFrame(def, animName, t) {
  const a = def.anims[animName] || def.anims.idle || { frames: 1 };
  const n = Math.max(1, a.frames || 1), step = Math.floor(Math.max(0, t || 0) * (a.fps || 0));
  const i = a.loop === false ? Math.min(n - 1, step) : step % n;
  if (a.dir) return { sx: BOSS_SPRITE_DIR[a.dir] * def.fw, sy: ((a.row || 0) + i) * def.fh, sw: def.fw, sh: def.fh };
  return { sx: ((a.col || 0) + i) * def.fw, sy: (a.row || 0) * def.fh, sw: def.fw, sh: def.fh };
}

/* Anim một lượt đã chạy hết chưa (VFX tự gỡ khi xong) */
function spriteAnimDone(def, animName, t) {
  const a = def.anims[animName] || def.anims.idle || { frames: 1 };
  return a.loop === false && t * (a.fps || 1) >= (a.frames || 1);
}

/* Hệ số phóng số nguyên ≥ 1 để khung cao frameH gần targetPx nhất (pixel không bị kéo lệch) */
function pixelScale(targetPx, frameH) { return Math.max(1, Math.round(targetPx / frameH)); }

/* ---------- DOM ---------- */

const bossSpriteImgs = {};   // src → { img, ok }
const bossSpriteTint = {};   // 'name|sx|sy|màu' → canvas bóng một màu (nháy trắng, phủ băng)

/* Nạp các sprite theo tên (mặc định: tất cả). Promise luôn resolve (lỗi nạp = bỏ qua vẽ, trận vẫn chơi) */
function loadBossSprites(names) {
  if (typeof Image === 'undefined') return Promise.resolve();
  return Promise.all((names || Object.keys(BOSS_SPRITES)).map(name => {
    const def = BOSS_SPRITES[name];
    if (!def) return null;
    let e = bossSpriteImgs[def.src];
    if (!e) {
      e = bossSpriteImgs[def.src] = { img: new Image(), ok: false };
      e.wait = new Promise(res => { e.img.onload = () => { e.ok = true; res(); }; e.img.onerror = () => res(); });
      e.img.src = def.src;
    }
    return e.wait;
  }));
}

function bossSpriteImage(name) {
  const def = BOSS_SPRITES[name], e = def && bossSpriteImgs[def.src];
  return e && e.ok ? e.img : null;
}
function bossSpriteReady(name) { return !!bossSpriteImage(name); }

/* Bóng một màu của đúng ô khung (source-in chỉ tô phần có pixel, không tràn ra nền); cache theo khung + màu */
function bossTintedFrame(name, f, color) {
  const key = name + '|' + f.sx + '|' + f.sy + '|' + color;
  let c = bossSpriteTint[key];
  if (!c) {
    c = bossSpriteTint[key] = document.createElement('canvas');
    c.width = f.sw; c.height = f.sh;
    const x = c.getContext('2d');
    x.drawImage(bossSpriteImage(name), f.sx, f.sy, f.sw, f.sh, 0, 0, f.sw, f.sh);
    x.globalCompositeOperation = 'source-in'; x.fillStyle = color; x.fillRect(0, 0, f.sw, f.sh);
  }
  return c;
}

/* Vẽ khung anim của sprite. (x, y) = giữa-chân (mặc định) hoặc tâm (opt.center); scale = số nguyên.
   opt = { flash (0..1 độ phủ bóng), tint (màu bóng, mặc định trắng), alpha, flipX, rot (radian, quanh tâm), center }.
   Trả false nếu ảnh chưa sẵn sàng. */
function drawSprite(ctx, name, anim, t, x, y, scale, opt) {
  const img = bossSpriteImage(name);
  if (!img) return false;
  const o = opt || {}, f = spriteFrame(BOSS_SPRITES[name], anim, t), w = f.sw * scale, h = f.sh * scale;
  ctx.save();
  ctx.imageSmoothingEnabled = false;   // trong save/restore: không rò sang drawImage có phóng khác của ctx
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  ctx.translate(Math.round(x), Math.round(o.center ? y : y - h / 2));   // gốc = tâm khung
  if (o.rot) ctx.rotate(o.rot);
  if (o.flipX) ctx.scale(-1, 1);
  const dx = -Math.round(w / 2), dy = -Math.round(h / 2);
  ctx.drawImage(img, f.sx, f.sy, f.sw, f.sh, dx, dy, w, h);
  if (o.flash > 0) {
    ctx.globalAlpha *= Math.min(1, o.flash);
    ctx.drawImage(bossTintedFrame(name, f, o.tint || '#ffffff'), dx, dy, w, h);
  }
  ctx.restore();
  return true;
}

/* Các ô pixel có màu của một khung (gộp step×step cho ít mảnh) — dùng khi quái tan thành pixel. Gọi 1 lần/lần chết. */
function bossSpritePixels(name, anim, t, step) {
  const img = bossSpriteImage(name);
  if (!img) return [];
  const f = spriteFrame(BOSS_SPRITES[name], anim, t), c = document.createElement('canvas');
  c.width = f.sw; c.height = f.sh;
  const x = c.getContext('2d');
  x.drawImage(img, f.sx, f.sy, f.sw, f.sh, 0, 0, f.sw, f.sh);
  const d = x.getImageData(0, 0, f.sw, f.sh).data, out = [], s = step || 1;
  for (let py = 0; py < f.sh; py += s) {
    for (let px = 0; px < f.sw; px += s) {
      const i = (py * f.sw + px) * 4;
      if (d[i + 3] > 128) out.push({ x: px, y: py, color: 'rgb(' + d[i] + ',' + d[i + 1] + ',' + d[i + 2] + ')' });
    }
  }
  return out;
}

if (typeof module !== 'undefined') module.exports = { BOSS_SPRITES, spriteFrame, spriteAnimDone, pixelScale };
