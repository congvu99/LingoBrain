/* Game Chém chữ — vẽ quả bằng canvas (không dùng emoji/ảnh): 7 loại quả, mỗi loại có vỏ nguyên (drawWholeFruit)
   và mặt cắt ruột (drawFruitFace) cho nửa quả sau khi chém. Vẽ trong toạ độ cục bộ tâm (0,0), bán kính r.
   Chi tiết ngẫu nhiên (đốm, hạt, lông) lấy từ fruitNoise(seed, i) → cùng 1 quả vẽ mỗi khung y hệt, không nhấp nháy. */

const FRUIT_TAU = Math.PI * 2;
// juice: màu nước quả bắn ra + vết loang
const FRUIT_KINDS = [
  { id: 'melon', juice: '#ff2d4a' }, { id: 'orange', juice: '#ff9a1f' }, { id: 'lemon', juice: '#ffe23d' },
  { id: 'apple', juice: '#fff0c8' }, { id: 'plum', juice: '#c46bff' }, { id: 'kiwi', juice: '#9fe05a' }, { id: 'peach', juice: '#ffab7a' }
];
const fruitKind = f => FRUIT_KINDS[f.uid % FRUIT_KINDS.length];
const fruitNoise = (seed, i) => { const x = Math.sin(seed * 127.1 + i * 311.7) * 43758.5453; return x - Math.floor(x); };

/* Khối cầu bóng: sáng ở góc trên-trái, tối dần về mép dưới-phải */
function fruitSphere(ctx, r, light, mid, dark) {
  const g = ctx.createRadialGradient(-r * 0.38, -r * 0.42, r * 0.05, 0, 0, r * 1.05);
  g.addColorStop(0, light); g.addColorStop(0.45, mid); g.addColorStop(1, dark);
  return g;
}
function fruitCircle(ctx, r) { ctx.beginPath(); ctx.arc(0, 0, r, 0, FRUIT_TAU); }
function fruitGloss(ctx, r) {   // vệt bóng loáng + viền sáng mép dưới (ánh phản chiếu)
  const g = ctx.createRadialGradient(-r * 0.38, -r * 0.45, 0, -r * 0.38, -r * 0.45, r * 0.55);
  g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; fruitCircle(ctx, r); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = r * 0.06;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.9, 0.35 * Math.PI, 0.75 * Math.PI); ctx.stroke();
}
function fruitLeaf(ctx, x, y, len, a) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  const g = ctx.createLinearGradient(0, -len * 0.3, 0, len * 0.3); g.addColorStop(0, '#8be05a'); g.addColorStop(1, '#2f8a2a');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.5, -len * 0.42, len, 0); ctx.quadraticCurveTo(len * 0.5, len * 0.42, 0, 0); ctx.fill();
  ctx.strokeStyle = 'rgba(20,70,20,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len * 0.9, 0); ctx.stroke();
  ctx.restore();
}
function fruitStem(ctx, r) {
  ctx.strokeStyle = '#5a3514'; ctx.lineWidth = Math.max(2, r * 0.09); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, -r * 0.78); ctx.quadraticCurveTo(r * 0.05, -r * 1.05, r * 0.2, -r * 1.18); ctx.stroke();
}
function fruitDots(ctx, r, seed, n, color, size, spread) {
  ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const a = fruitNoise(seed, i) * FRUIT_TAU, d = Math.sqrt(fruitNoise(seed, i + 99)) * r * spread;
    ctx.beginPath(); ctx.arc(Math.cos(a) * d, Math.sin(a) * d, size, 0, FRUIT_TAU); ctx.fill();
  }
}

/* Vỏ nguyên */
function drawWholeFruit(ctx, kind, r, seed) {
  ctx.save();
  if (kind.id === 'melon') {
    ctx.fillStyle = fruitSphere(ctx, r, '#7be07f', '#2f9e44', '#0f4a1f'); fruitCircle(ctx, r); ctx.fill();
    ctx.save(); fruitCircle(ctx, r); ctx.clip();
    ctx.strokeStyle = 'rgba(8,50,20,.75)'; ctx.lineWidth = r * 0.17;
    for (let k = -3; k <= 3; k++) {       // sọc cong theo khối cầu, mép răng cưa nhẹ
      const x = k * r * 0.34;
      ctx.beginPath(); ctx.moveTo(x * 0.6, -r);
      for (let t = 1; t <= 6; t++) ctx.lineTo(x * (0.6 + 0.4 * Math.sin(t / 6 * Math.PI)) + (t % 2 ? 1 : -1) * r * 0.05, -r + t * r / 3);
      ctx.stroke();
    }
    ctx.restore();
  } else if (kind.id === 'orange') {
    ctx.fillStyle = fruitSphere(ctx, r, '#ffe0a0', '#ff8c1a', '#b8470a'); fruitCircle(ctx, r); ctx.fill();
    fruitDots(ctx, r, seed, 46, 'rgba(120,40,0,.18)', r * 0.028, 0.95);
    ctx.fillStyle = '#6a8a1a'; ctx.beginPath(); ctx.arc(r * 0.05, -r * 0.86, r * 0.07, 0, FRUIT_TAU); ctx.fill();
    fruitLeaf(ctx, r * 0.08, -r * 0.88, r * 0.55, -0.5);
  } else if (kind.id === 'lemon') {
    ctx.scale(1.12, 0.9);
    ctx.fillStyle = fruitSphere(ctx, r, '#fffbd0', '#f7d51d', '#b38e00');
    ctx.beginPath(); ctx.arc(0, 0, r, 0, FRUIT_TAU);
    ctx.moveTo(r * 0.95, -r * 0.12); ctx.quadraticCurveTo(r * 1.18, 0, r * 0.95, r * 0.12);   // 2 núm hai đầu
    ctx.moveTo(-r * 0.95, -r * 0.12); ctx.quadraticCurveTo(-r * 1.18, 0, -r * 0.95, r * 0.12); ctx.fill();
    fruitDots(ctx, r, seed, 34, 'rgba(140,100,0,.16)', r * 0.025, 0.9);
  } else if (kind.id === 'apple') {
    ctx.fillStyle = fruitSphere(ctx, r, '#ff9d8a', '#e0312f', '#7a0d0d');
    ctx.beginPath(); ctx.moveTo(0, -r * 0.7);              // 2 thuỳ trên + lõm cuống
    ctx.bezierCurveTo(r * 0.55, -r * 1.12, r * 1.18, -r * 0.5, r * 0.95, r * 0.25);
    ctx.bezierCurveTo(r * 0.78, r * 0.95, r * 0.2, r * 1.05, 0, r * 0.9);
    ctx.bezierCurveTo(-r * 0.2, r * 1.05, -r * 0.78, r * 0.95, -r * 0.95, r * 0.25);
    ctx.bezierCurveTo(-r * 1.18, -r * 0.5, -r * 0.55, -r * 1.12, 0, -r * 0.7); ctx.fill();
    ctx.strokeStyle = 'rgba(255,220,120,.18)'; ctx.lineWidth = r * 0.05;
    for (let i = 0; i < 5; i++) { const x = (i - 2) * r * 0.28; ctx.beginPath(); ctx.moveTo(x * 0.7, -r * 0.5); ctx.quadraticCurveTo(x, 0, x * 0.7, r * 0.7); ctx.stroke(); }
    fruitStem(ctx, r); fruitLeaf(ctx, r * 0.12, -r * 0.98, r * 0.6, -0.3);
  } else if (kind.id === 'plum') {
    ctx.fillStyle = fruitSphere(ctx, r, '#e3b6ff', '#7b3fbf', '#2c0d52'); fruitCircle(ctx, r); ctx.fill();
    ctx.fillStyle = 'rgba(210,190,255,.12)'; fruitCircle(ctx, r * 0.96); ctx.fill();   // lớp phấn trắng mờ
    ctx.strokeStyle = 'rgba(30,5,60,.45)'; ctx.lineWidth = r * 0.05;
    ctx.beginPath(); ctx.moveTo(r * 0.1, -r * 0.92); ctx.quadraticCurveTo(r * 0.5, 0, r * 0.12, r * 0.92); ctx.stroke();
  } else if (kind.id === 'kiwi') {
    ctx.fillStyle = fruitSphere(ctx, r, '#d9b07a', '#8a5a2b', '#3e240c'); fruitCircle(ctx, r); ctx.fill();
    ctx.strokeStyle = 'rgba(245,220,170,.28)'; ctx.lineWidth = 1;    // lông tơ
    for (let i = 0; i < 70; i++) {
      const a = fruitNoise(seed, i) * FRUIT_TAU, d = Math.sqrt(fruitNoise(seed, i + 7)) * r * 0.95, x = Math.cos(a) * d, y = Math.sin(a) * d;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * r * 0.07, y + Math.sin(a) * r * 0.07); ctx.stroke();
    }
  } else {   // peach
    ctx.fillStyle = fruitSphere(ctx, r, '#fff0d0', '#ffa27a', '#c2413a'); fruitCircle(ctx, r); ctx.fill();
    const b = ctx.createRadialGradient(r * 0.35, r * 0.1, 0, r * 0.35, r * 0.1, r * 0.8);
    b.addColorStop(0, 'rgba(230,40,60,.55)'); b.addColorStop(1, 'rgba(230,40,60,0)');
    ctx.fillStyle = b; fruitCircle(ctx, r); ctx.fill();
    ctx.strokeStyle = 'rgba(150,40,30,.45)'; ctx.lineWidth = r * 0.05;
    ctx.beginPath(); ctx.moveTo(-r * 0.05, -r * 0.95); ctx.quadraticCurveTo(-r * 0.45, -r * 0.1, -r * 0.1, r * 0.85); ctx.stroke();
    fruitLeaf(ctx, 0, -r * 0.95, r * 0.5, -0.9);
  }
  if (kind.id !== 'kiwi') fruitGloss(ctx, r);
  ctx.restore();
}

/* Mặt cắt: vỏ mỏng ngoài cùng, ruột + hạt/múi/lõi. Nửa quả = hình này bị cắt nửa (clip) theo đường chém */
function drawFruitFace(ctx, kind, r, seed) {
  const ring = (rr, color) => { ctx.fillStyle = color; fruitCircle(ctx, rr); ctx.fill(); };
  const flesh = (rr, c0, c1) => { const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rr); g.addColorStop(0, c0); g.addColorStop(1, c1); ring(rr, g); };
  if (kind.id === 'melon') {
    ring(r, '#1f7a34'); ring(r * 0.9, '#e9f7d8'); flesh(r * 0.82, '#ff5c6c', '#e8243c');
    ctx.fillStyle = '#1a0d0d';
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * FRUIT_TAU + fruitNoise(seed, i) * 0.3, d = r * (0.42 + fruitNoise(seed, i + 20) * 0.2);
      ctx.save(); ctx.translate(Math.cos(a) * d, Math.sin(a) * d); ctx.rotate(a);
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.07, r * 0.04, 0, 0, FRUIT_TAU); ctx.fill(); ctx.restore();
    }
  } else if (kind.id === 'orange' || kind.id === 'lemon') {
    const o = kind.id === 'orange';
    ring(r, o ? '#f07a10' : '#e8c410'); ring(r * 0.9, '#fff8e8');
    const n = 10;
    for (let i = 0; i < n; i++) {          // múi: hình quạt, cách nhau bởi màng trắng
      const a0 = i / n * FRUIT_TAU + 0.05, a1 = (i + 1) / n * FRUIT_TAU - 0.05;
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.84);
      g.addColorStop(0, o ? '#ffd28a' : '#fffbc0'); g.addColorStop(1, o ? '#ff9a2a' : '#f5dc3c');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(Math.cos((a0 + a1) / 2) * r * 0.1, Math.sin((a0 + a1) / 2) * r * 0.1);
      ctx.arc(0, 0, r * 0.84, a0, a1); ctx.closePath(); ctx.fill();
    }
    ring(r * 0.1, '#fff8e8');
  } else if (kind.id === 'apple') {
    ring(r, '#c8201e'); flesh(r * 0.93, '#fffaf0', '#fbe6b8');
    ctx.strokeStyle = 'rgba(160,110,40,.45)'; ctx.lineWidth = r * 0.04;
    ctx.beginPath();
    for (let i = 0; i <= 10; i++) { const a = i / 10 * FRUIT_TAU, d = r * (i % 2 ? 0.14 : 0.32); ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * d, Math.sin(a) * d); }
    ctx.stroke();
    ctx.fillStyle = '#4a2a10';
    [0.4, 2.5, 4.6].forEach(a => { ctx.beginPath(); ctx.ellipse(Math.cos(a) * r * 0.2, Math.sin(a) * r * 0.2, r * 0.06, r * 0.035, a, 0, FRUIT_TAU); ctx.fill(); });
  } else if (kind.id === 'plum' || kind.id === 'peach') {
    const p = kind.id === 'plum';
    ring(r, p ? '#4a1a80' : '#e0604a'); flesh(r * 0.92, p ? '#ffe28a' : '#ffd08a', p ? '#e0a33a' : '#ff9a4a');
    const g = ctx.createRadialGradient(-r * 0.08, -r * 0.1, 0, 0, 0, r * 0.4);
    g.addColorStop(0, '#b0643a'); g.addColorStop(1, '#6a2e14');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.3, r * 0.38, 0.3, 0, FRUIT_TAU); ctx.fill();
  } else {   // kiwi
    ring(r, '#6a4420'); flesh(r * 0.93, '#c8f58a', '#5fa82a');
    ctx.strokeStyle = 'rgba(240,255,220,.35)'; ctx.lineWidth = 1;
    for (let i = 0; i < 24; i++) { const a = i / 24 * FRUIT_TAU; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.2, Math.sin(a) * r * 0.2); ctx.lineTo(Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85); ctx.stroke(); }
    ctx.fillStyle = '#f4ffe6'; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.2, r * 0.26, 0, 0, FRUIT_TAU); ctx.fill();
    ctx.fillStyle = '#120a04';
    for (let i = 0; i < 22; i++) { const a = i / 22 * FRUIT_TAU + fruitNoise(seed, i) * 0.15, d = r * (0.32 + fruitNoise(seed, i + 40) * 0.08);
      ctx.beginPath(); ctx.ellipse(Math.cos(a) * d, Math.sin(a) * d, r * 0.045, r * 0.022, a, 0, FRUIT_TAU); ctx.fill(); }
  }
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r);   // mặt cắt ướt: ánh sáng loang
  g.addColorStop(0, 'rgba(255,255,255,.28)'); g.addColorStop(0.6, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; fruitCircle(ctx, r); ctx.fill();
}
