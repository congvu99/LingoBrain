/* Game Chém chữ — cảnh canvas kiểu Fruit Ninja: nền ván gỗ tối có đèn rọi (vẽ sẵn 1 lần mỗi lần đổi cỡ), quả vẽ
   bằng canvas (fruit-game-fruit-art.js) có bóng đổ + nhãn từ viền tối, nửa quả văng theo pháp tuyến nhát chém,
   tia chém loé, giọt nước kéo vệt, vết loang bắn tóe trên gỗ, vệt dao thon phát sáng, hạt lấp lánh + chữ điểm nảy
   khi đúng, sóng đỏ + viền đỏ quanh màn + rung khi sai. Nhận sự kiện qua fruitFxEvent(). Không đụng DOM ngoài canvas. */

const FRUIT_FACE = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif';
const FRUIT_FX_MAX = 400;         // trần số hạt: máy yếu không tụt khung khi chém liên tiếp
const FRUIT_BLADE_LIFE = 0.18;    // giây: vệt dao mờ hết
const FRUIT_LABEL_MIN = 15;       // px: chữ nhãn không co nhỏ hơn (đọc được trên iPhone)
const fruitLabelFonts = new WeakMap();  // quả → cỡ chữ đã đo, measureText mỗi khung tốn

function createFruitFx() {
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  return { w: 0, h: 0, bg: null, halves: [], drops: [], splats: [], stars: [], slashes: [], rings: [], texts: [], blade: [],
    shake: 0, flash: 0, flashColor: '#fff', edge: 0, reduced };
}

/* Ván gỗ: các tấm dọc sáng tối xen kẽ, vân gỗ, khe tối; đèn rọi ấm giữa màn, tối dần ra mép */
function buildWoodBg(w, h, dpr) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w * dpr); c.height = Math.ceil(h * dpr);
  const g = c.getContext('2d');
  g.scale(dpr, dpr);
  g.fillStyle = '#2a190c'; g.fillRect(0, 0, w, h);
  const planks = Math.max(3, Math.round(w / 90)), pw = w / planks;
  for (let i = 0; i < planks; i++) {
    const lin = g.createLinearGradient(i * pw, 0, (i + 1) * pw, 0);
    lin.addColorStop(0, i % 2 ? '#4a2e17' : '#3d2512'); lin.addColorStop(0.5, i % 2 ? '#553519' : '#472b15'); lin.addColorStop(1, i % 2 ? '#43291a' : '#381f0f');
    g.fillStyle = lin; g.fillRect(i * pw, 0, pw, h);
    g.lineWidth = 1;
    for (let k = 0; k < 9; k++) {
      const x = i * pw + Math.random() * pw, bend = (Math.random() - 0.5) * 22;
      g.strokeStyle = 'rgba(' + (k % 2 ? '255,215,160,.06' : '20,8,0,.22') + ')';
      g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + bend, h * 0.33, x - bend, h * 0.66, x, h); g.stroke();
    }
    g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(i * pw - 1.5, 0, 3, h);
    g.fillStyle = 'rgba(255,220,170,.07)'; g.fillRect(i * pw + 1.5, 0, 1, h);
  }
  const spot = g.createRadialGradient(w / 2, h * 0.35, 0, w / 2, h * 0.35, Math.max(w, h) * 0.8);
  spot.addColorStop(0, 'rgba(255,190,110,.16)'); spot.addColorStop(0.45, 'rgba(0,0,0,0)'); spot.addColorStop(1, 'rgba(0,0,0,.7)');
  g.fillStyle = spot; g.fillRect(0, 0, w, h);
  return c;
}

function resizeFruitFx(fx, w, h, dpr) { fx.w = w; fx.h = h; fx.bg = buildWoodBg(w, h, dpr); }

/* Điểm vệt dao do phần giao diện đẩy vào theo ngón tay/chuột */
function fruitBladePoint(fx, x, y) { fx.blade.push({ x, y, life: FRUIT_BLADE_LIFE }); if (fx.blade.length > 28) fx.blade.shift(); }

const fruitFxCount = (fx, n) => Math.round(n * (fx.reduced ? 0.4 : 1));
function fruitJuiceBurst(fx, f, color, n, a) {
  for (let i = 0, m = fruitFxCount(fx, n); i < m && fx.drops.length < FRUIT_FX_MAX; i++) {
    const d = a + (Math.random() < 0.5 ? 0 : Math.PI) + (Math.random() - 0.5) * 2.2, s = 120 + Math.random() * 340, life = 0.45 + Math.random() * 0.55;
    fx.drops.push({ x: f.x, y: f.y, vx: Math.cos(d) * s + f.vx * 0.3, vy: Math.sin(d) * s - 80, size: 2 + Math.random() * 4, color, life, max: life });
  }
}
function fruitSparkle(fx, x, y, n, color) {
  for (let i = 0, m = fruitFxCount(fx, n); i < m && fx.stars.length < FRUIT_FX_MAX; i++) {
    const a = Math.random() * 6.283, s = 60 + Math.random() * 220, life = 0.5 + Math.random() * 0.5;
    fx.stars.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, size: 3 + Math.random() * 5, rot: Math.random() * 3, color, life, max: life });
  }
}
/* Vết loang: tâm + các tia bắn tóe hướng theo nhát chém, giọt tròn ở đầu tia */
function addFruitSplat(fx, f, color, a) {
  const blobs = [];
  for (let i = 0; i < 11; i++) {
    const d = a + (i % 2 ? 0 : Math.PI) + (Math.random() - 0.5) * 1.6, len = f.r * (0.4 + Math.random() * 1.3);
    blobs.push({ dx: Math.cos(d) * len, dy: Math.sin(d) * len, r: f.r * (0.06 + Math.random() * 0.14) });
  }
  fx.splats.push({ x: f.x, y: f.y, r: f.r * 0.55, blobs, color, life: 3, max: 3 });
  if (fx.splats.length > 10) fx.splats.shift();
}

function fruitFxEvent(fx, e) {
  const f = e.fruit;
  if (e.type === 'split') {
    const kind = fruitKind(f), nx = -Math.sin(e.a), ny = Math.cos(e.a), push = 110 + f.r * 1.6;
    [1, -1].forEach(side => fx.halves.push({ x: f.x, y: f.y, vx: f.vx + nx * push * side, vy: Math.min(f.vy, 0) * 0.3 + ny * push * side - 90,
      rot: 0, vr: side * (2.5 + Math.random() * 3), a: e.a, side, r: f.r, kind, seed: f.uid, life: 1.8 }));
    fruitJuiceBurst(fx, f, kind.juice, 26, e.a);
    addFruitSplat(fx, f, kind.juice, e.a);
    fx.slashes.push({ x: f.x, y: f.y, a: e.a, len: f.r * 3.2, life: 0.22, max: 0.22 });
  } else if (e.type === 'right') {
    fruitSparkle(fx, f.x, f.y, 16, e.points >= 20 ? '#ffe066' : '#bfffd8');
    fx.rings.push({ x: f.x, y: f.y, r: f.r, vr: 320, life: 0.4, max: 0.4, color: '#9dffc6' });
    fx.texts.push({ x: f.x, y: f.y - f.r, text: '+' + Math.floor(e.points), life: 1.1, max: 1.1, color: e.points >= 20 ? '#ffd23f' : '#8dffb0', size: 26, pop: true });
    fx.flash = Math.max(fx.flash, 0.1); fx.flashColor = '#fff6d6';
  } else if (e.type === 'wrong' || e.type === 'drop') {
    (e.bombs || []).forEach(b => {
      fx.rings.push({ x: b.x, y: b.y, r: b.r * 0.6, vr: 420, life: 0.45, max: 0.45, color: '#ff5a5a' });
      fx.texts.push({ x: b.x, y: b.y - b.r * 0.2, text: '✗ ' + b.text, life: 1.3, max: 1.3, color: '#ff8a8a', size: 18 });
    });
    if (e.type === 'drop') fx.texts.push({ x: Math.max(60, Math.min(fx.w - 60, f.x)), y: fx.h - 30, text: '✓ ' + f.text, life: 1.6, max: 1.6, color: '#8dffb0', size: 20, pop: true });
    if (!fx.reduced) fx.shake = Math.max(fx.shake, 12);
    fx.edge = 1;                      // viền đỏ phát sáng quanh màn
    fx.flash = Math.max(fx.flash, 0.18); fx.flashColor = '#ff2b2b';
  }
}

function stepFruitFx(fx, dt) {
  const g = fx.h * 1.8, fade = a => a.filter(p => (p.life -= dt) > 0);
  fx.halves = fx.halves.filter(p => { p.life -= dt; p.vy += g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; return p.life > 0 && p.y - p.r < fx.h; });
  fx.drops = fx.drops.filter(p => { p.life -= dt; p.vx *= 1 - 1.2 * dt; p.vy += g * 0.7 * dt; p.x += p.vx * dt; p.y += p.vy * dt; return p.life > 0; });
  fx.stars = fx.stars.filter(p => { p.life -= dt; p.vx *= 1 - 2.5 * dt; p.vy = p.vy * (1 - 2.5 * dt) + 60 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += 4 * dt; return p.life > 0; });
  fx.rings = fx.rings.filter(r => { r.life -= dt; r.r += r.vr * dt; return r.life > 0; });
  fx.texts = fx.texts.filter(t => { t.life -= dt; t.y -= 42 * dt; return t.life > 0; });
  fx.splats = fade(fx.splats); fx.slashes = fade(fx.slashes); fx.blade = fade(fx.blade);
  fx.shake = Math.max(0, fx.shake - 45 * dt);
  fx.flash = Math.max(0, fx.flash - 2 * dt);
  fx.edge = Math.max(0, fx.edge - 1.6 * dt);
}
