/* Game Bắn máy bay — hiệu ứng canvas: nền vũ trụ (tinh vân + 3 lớp sao trôi), hạt nổ có vật lý
   (tia lửa, mảnh vỡ xoay, khói), sóng xung kích, chớp sáng, rung màn, chữ tiếng Anh bay lên sau khi nổ.
   Nhận sự kiện từ stepPlanes()/typeChar() qua spaceFxEvent(). Không phụ thuộc DOM ngoài canvas được truyền vào. */

const FX_MAX_PARTS = 500;          // trần số hạt: máy yếu không tụt khung khi nổ liên tiếp
const FX_KIND_COLOR = { rock: '#a08c78', ship: '#ff5a4e', mother: '#b57bff' };
const FX_STAR_LAYERS = [{ speed: 14, size: 1, alpha: 0.45 }, { speed: 34, size: 1.5, alpha: 0.7 }, { speed: 70, size: 2, alpha: 1 }];

function createSpaceFx() {
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  return { w: 0, h: 0, bg: null, stars: [], parts: [], rings: [], texts: [], shake: 0, flash: 0, flashColor: '#fff', reduced };
}

/* Nền vẽ sẵn 1 lần vào canvas phụ mỗi khi đổi cỡ: gradient + tinh vân mờ + sao tĩnh li ti */
function buildSpaceBg(w, h, dpr) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w * dpr); c.height = Math.ceil(h * dpr);
  const g = c.getContext('2d');
  g.scale(dpr, dpr);
  const lin = g.createLinearGradient(0, 0, 0, h);
  lin.addColorStop(0, '#03040d'); lin.addColorStop(0.6, '#0a0f2c'); lin.addColorStop(1, '#141a3d');
  g.fillStyle = lin; g.fillRect(0, 0, w, h);
  [[0.25, 0.3, '#7b3fe4'], [0.8, 0.55, '#1fa3b8'], [0.45, 0.85, '#c2417a']].forEach(([x, y, col]) => {
    const rad = Math.max(w, h) * 0.45, n = g.createRadialGradient(x * w, y * h, 0, x * w, y * h, rad);
    n.addColorStop(0, col + '38'); n.addColorStop(1, col + '00');
    g.fillStyle = n; g.fillRect(0, 0, w, h);
  });
  g.fillStyle = '#ffffff';
  for (let i = 0; i < (w * h) / 900; i++) { g.globalAlpha = 0.15 + Math.random() * 0.35; g.fillRect(Math.random() * w, Math.random() * h, 0.8, 0.8); }
  return c;
}

function resizeSpaceFx(fx, w, h, dpr) {
  fx.w = w; fx.h = h;
  fx.bg = buildSpaceBg(w, h, dpr);
  fx.stars = [];
  const n = Math.round((w * h) / 3200);
  for (let i = 0; i < n; i++) fx.stars.push({ x: Math.random() * w, y: Math.random() * h, l: i % FX_STAR_LAYERS.length });
}

function addPart(fx, p) { if (fx.parts.length < FX_MAX_PARTS) fx.parts.push(p); }

/* Nổ tung: số hạt giảm khi người dùng bật "giảm chuyển động" */
function burst(fx, x, y, n, opt) {
  n = Math.round(n * (fx.reduced ? 0.4 : 1));
  for (let i = 0; i < n; i++) {
    const a = opt.a != null ? opt.a + (Math.random() - 0.5) * (opt.spread || Math.PI * 2) : Math.random() * Math.PI * 2;
    const s = opt.speed * (0.35 + Math.random() * 0.9), life = opt.life * (0.6 + Math.random() * 0.6);
    addPart(fx, { kind: opt.kind, x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: life,
      size: opt.size * (0.6 + Math.random() * 0.8), color: opt.colors[i % opt.colors.length],
      rot: Math.random() * 6.283, vr: (Math.random() - 0.5) * 10, drag: opt.drag || 2.2, g: opt.g || 0 });
  }
}

function spaceFxEvent(fx, e) {
  if (e.type === 'fire') {
    burst(fx, e.x + Math.cos(e.a) * 14, e.y + Math.sin(e.a) * 14, 3, { kind: 'spark', a: e.a, spread: 0.6, speed: 180, life: 0.12, size: 2, colors: ['#bff6ff'] });
  } else if (e.type === 'hit') {
    burst(fx, e.x, e.y, 8, { kind: 'spark', a: e.a + Math.PI, spread: 2.2, speed: 260, life: 0.3, size: 2, colors: ['#ffe28a', '#ff9f43'] });
  } else if (e.type === 'explode' || e.type === 'shield') {
    const big = e.kind === 'mother' ? 1.6 : e.kind === 'ship' ? 1.15 : 0.9, bad = e.type === 'shield';
    const col = FX_KIND_COLOR[e.kind];
    burst(fx, e.x, e.y, 34 * big, { kind: 'spark', speed: 340 * big, life: 0.55, size: 2.2, colors: bad ? ['#ff6b6b', '#ffd3d3'] : ['#fff4c2', '#ffc24b', '#ff7a3c'] });
    burst(fx, e.x, e.y, 10 * big, { kind: 'debris', speed: 170 * big, life: 1.1, size: e.r * 0.35, colors: [col], drag: 0.6, g: 160 });
    burst(fx, e.x, e.y, 7 * big, { kind: 'smoke', speed: 50, life: 0.9, size: e.r * 0.9, colors: ['#8b93b8'], drag: 1.2 });
    fx.rings.push({ x: e.x, y: e.y, r: e.r * 0.5, vr: 260 * big, life: 0.45, max: 0.45, color: bad ? '#ff6b6b' : '#9ff2ff' });
    fx.texts.push({ x: e.x, y: e.y, text: e.word, life: 1.3, max: 1.3, color: bad ? '#ff8a8a' : '#8dffc4' });
    if (!fx.reduced) fx.shake = Math.max(fx.shake, bad ? 12 : 5 * big);
    fx.flash = Math.max(fx.flash, bad ? 0.3 : 0.14 * big);
    fx.flashColor = bad ? '#ff3b3b' : '#fff1c9';
  }
}

function stepSpaceFx(fx, dt) {
  for (const s of fx.stars) { s.y += FX_STAR_LAYERS[s.l].speed * dt; if (s.y > fx.h) { s.y -= fx.h; s.x = Math.random() * fx.w; } }
  fx.parts = fx.parts.filter(p => {
    p.life -= dt;
    const k = Math.max(0, 1 - p.drag * dt);
    p.vx *= k; p.vy = p.vy * k + p.g * dt;
    p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
    return p.life > 0;
  });
  fx.rings = fx.rings.filter(r => { r.life -= dt; r.r += r.vr * dt; return r.life > 0; });
  fx.texts = fx.texts.filter(t => { t.life -= dt; t.y -= 38 * dt; return t.life > 0; });
  fx.shake = Math.max(0, fx.shake - 40 * dt);
  fx.flash = Math.max(0, fx.flash - 2.2 * dt);
}

function drawSpaceBg(fx, ctx) {
  if (fx.bg) ctx.drawImage(fx.bg, 0, 0, fx.w, fx.h);
  ctx.fillStyle = '#ffffff';
  for (const s of fx.stars) {
    const L = FX_STAR_LAYERS[s.l];
    ctx.globalAlpha = L.alpha;
    ctx.fillRect(s.x, s.y, L.size, L.size * (1 + L.speed / 90));   // lớp gần kéo vệt dài hơn → cảm giác bay tới
  }
  ctx.globalAlpha = 1;
}

function drawSpaceFx(fx, ctx) {
  for (const p of fx.parts) {
    const a = Math.max(0, p.life / p.max);
    if (p.kind === 'debris') {
      ctx.save(); ctx.globalAlpha = a; ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66); ctx.restore();
    } else if (p.kind === 'smoke') {
      ctx.globalAlpha = a * 0.25; ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1.6 - a * 0.6), 0, 6.283); ctx.fill();
    }
  }
  ctx.globalCompositeOperation = 'lighter';
  for (const p of fx.parts) {
    if (p.kind !== 'spark') continue;
    ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.strokeStyle = p.color; ctx.lineWidth = p.size;
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03); ctx.stroke();
  }
  for (const r of fx.rings) {
    ctx.globalAlpha = r.life / r.max; ctx.strokeStyle = r.color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, 6.283); ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.font = '700 17px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif'; ctx.textAlign = 'center';
  for (const t of fx.texts) { ctx.globalAlpha = Math.min(1, t.life / t.max * 2); ctx.fillStyle = t.color; ctx.fillText(t.text, t.x, t.y); }
  ctx.globalAlpha = 1;
}

function drawSpaceFlash(fx, ctx) {
  if (fx.flash <= 0) return;
  ctx.globalAlpha = Math.min(0.6, fx.flash); ctx.fillStyle = fx.flashColor;
  ctx.fillRect(0, 0, fx.w, fx.h); ctx.globalAlpha = 1;
}

function spaceShake(fx) {
  return fx.shake ? { x: (Math.random() - 0.5) * fx.shake, y: (Math.random() - 0.5) * fx.shake } : { x: 0, y: 0 };
}
