/* Game Pháp Sư Lexoria — hình vẽ canvas cho phép bậc 3: trận đồ, thiên thạch, tia sét, cột băng, gai đá, lốc.
   Mỗi hàm thuần vẽ (không đổi state), nhận toạ độ + màu + tiến độ (0..1). Gọi từ boss-game-tier3-ultimate-fx.js.
   Tia sét dùng seed số nguyên → hình gãy khúc TẤT ĐỊNH (cùng seed ra cùng hình, không giật khi vẽ lại). */

/* Vòng rune xoay 2 lớp dưới chân pháp sư; fade = còn lại 0..1 (mờ dần khi sắp hết) */
function drawMagicCircle(ctx, x, y, r, color, t, fade) {
  ctx.save(); ctx.translate(x, y); ctx.globalAlpha = Math.min(1, fade * 2) * 0.85;
  ctx.strokeStyle = color; ctx.lineWidth = 2;
  ctx.rotate(t * 0.9); ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.stroke();
  for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.4); ctx.stroke(); }
  ctx.rotate(-t * 1.6); ctx.globalAlpha *= 0.7; ctx.beginPath(); ctx.arc(0, 0, r * 0.62, 0, 6.283); ctx.stroke();
  ctx.restore(); ctx.globalAlpha = 1;
}

/* Thiên thạch rơi từ trên xuống, nổ ở k=1 (đã có burst impact riêng lo phần nổ) */
function drawMeteor(ctx, x, y, r, k, color) {
  const fall = Math.min(1, k / 0.6), fade = k < 0.6 ? 1 : Math.max(0, 1 - (k - 0.6) / 0.4);
  const my = y - r * 3.2 * (1 - fall);
  ctx.globalAlpha = fade; ctx.strokeStyle = color; ctx.lineWidth = r * 0.1;
  ctx.beginPath(); ctx.moveTo(x, my - r * 1.4); ctx.lineTo(x, my - r * 0.5); ctx.stroke();
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, my, r * 0.32, 0, 6.283); ctx.fill();
  ctx.globalAlpha = 1;
}

/* Tia sét gãy khúc tất định (seed cố định hình); a → b, đỉnh alpha khi resolve ~0.15 */
function drawLightningBolt(ctx, a, b, seed, color, alpha) {
  if (alpha <= 0) return;
  let s = seed % 2147483647 || 1;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, alpha)); ctx.strokeStyle = color; ctx.lineWidth = 3;
  ctx.globalCompositeOperation = 'lighter'; ctx.beginPath(); ctx.moveTo(a.x, a.y);
  const n = 6;
  for (let i = 1; i <= n; i++) {
    const k = i / n, x = a.x + (b.x - a.x) * k + (rnd() - 0.5) * 26, y = a.y + (b.y - a.y) * k;
    ctx.lineTo(x, y);
  }
  ctx.stroke(); ctx.restore(); ctx.globalAlpha = 1;
}

/* Cột băng trồi lên dưới quái rồi vỡ vụn (mảnh vỡ do burst impact lo) */
function drawIcePillar(ctx, x, y, r, k, color) {
  const rise = Math.min(1, k / 0.5) * r * 1.6, fade = k < 0.75 ? 1 : Math.max(0, 1 - (k - 0.75) / 0.25);
  ctx.globalAlpha = fade; ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(x - r * 0.3, y); ctx.lineTo(x - r * 0.16, y - rise); ctx.lineTo(x + r * 0.16, y - rise); ctx.lineTo(x + r * 0.3, y); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.globalAlpha = 1;
}

/* Gai đá mọc quanh quái theo vòng tròn */
function drawRockSpikes(ctx, x, y, r, k, color) {
  const rise = Math.min(1, k / 0.4), fade = k < 0.7 ? 1 : Math.max(0, 1 - (k - 0.7) / 0.3);
  ctx.globalAlpha = fade; ctx.fillStyle = color;
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * 6.283, sx = x + Math.cos(a) * r * 0.5, sy = y + Math.sin(a) * r * 0.22, h = r * 0.5 * rise;
    ctx.beginPath(); ctx.moveTo(sx - r * 0.06, sy); ctx.lineTo(sx, sy - h); ctx.lineTo(sx + r * 0.06, sy); ctx.closePath(); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/* Lốc xoáy cuốn quái: vòng xoắn nhiều lớp quanh (x, y), xoay theo t */
function drawTornado(ctx, x, y, r, t, color, k) {
  const fade = k == null ? 1 : Math.min(1, k * 3, (1 - k) * 3 + 0.15);
  ctx.save(); ctx.globalAlpha = Math.max(0.15, fade) * 0.8; ctx.strokeStyle = color; ctx.lineWidth = 2;
  for (let ring = 0; ring < 4; ring++) {
    const ry = y - ring * r * 0.22, rr = r * (0.85 - ring * 0.14), rot = t * (2 + ring * 0.6);
    ctx.beginPath(); ctx.ellipse(x, ry, rr, rr * 0.32, rot, 0, 6.283); ctx.stroke();
  }
  ctx.restore(); ctx.globalAlpha = 1;
}
