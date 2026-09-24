/* Game Chém chữ — vẽ 1 khung hình: nền gỗ, vết loang, quả (bóng đổ + vỏ canvas + nhãn), nửa quả, giọt nước,
   tia chém, vệt dao, hạt lấp lánh, vòng sóng, chữ bay, chớp + viền đỏ. Đọc state của fruit-game-logic.js và fx của
   fruit-game-render.js, vẽ quả bằng fruit-game-fruit-art.js. Không đổi state. */

/* Chữ nhãn: 17px, co tới 15px nếu tràn quả; dài hơn nữa thì cho tràn — viền tối vẫn đọc được trên nền gỗ */
function fruitLabelFont(ctx, f) {
  let px = fruitLabelFonts.get(f);
  if (!px) {
    for (px = 17; px > FRUIT_LABEL_MIN; px--) { ctx.font = '800 ' + px + 'px ' + FRUIT_FACE; if (ctx.measureText(f.text).width <= f.r * 1.8) break; }
    fruitLabelFonts.set(f, px);
  }
  return px;
}

function fruitOutlinedText(ctx, text, x, y, px, color) {
  ctx.font = '800 ' + px + 'px ' + FRUIT_FACE; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(4, px * 0.28); ctx.strokeStyle = 'rgba(25,12,4,.92)'; ctx.strokeText(text, x, y);
  ctx.fillStyle = color; ctx.fillText(text, x, y);
}

/* Ngôi sao 4 cánh lấp lánh */
function fruitStarPath(ctx, x, y, s, rot) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) { const a = rot + i * Math.PI / 4, d = i % 2 ? s * 0.28 : s; ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * d, y + Math.sin(a) * d); }
  ctx.closePath();
}

function drawFruitBody(ctx, f, gold, time) {
  const r = f.r;
  ctx.fillStyle = 'rgba(0,0,0,.35)';            // bóng đổ mềm lệch xuống dưới: quả nổi khỏi mặt gỗ
  ctx.beginPath(); ctx.ellipse(f.x + r * 0.12, f.y + r * 0.22, r * 1.02, r * 0.98, 0, 0, 6.283); ctx.fill();
  if (f.reveal || gold) {                        // quầng sáng: xanh = đáp án bị lộ, vàng = đợt hay quên
    const pulse = 0.55 + Math.sin(time * (f.reveal ? 12 : 5)) * 0.25, g = ctx.createRadialGradient(f.x, f.y, r * 0.8, f.x, f.y, r * 1.55);
    g.addColorStop(0, f.reveal ? 'rgba(80,255,150,' + pulse + ')' : 'rgba(255,210,63,' + pulse * 0.7 + ')'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, r * 1.55, 0, 6.283); ctx.fill();
  }
  ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot);
  drawWholeFruit(ctx, fruitKind(f), r, f.uid);
  ctx.restore();
  if (gold) {                                    // 2 tia lấp lánh chạy vòng quanh mép quả
    ctx.fillStyle = '#fff3b0';
    for (let k = 0; k < 2; k++) { const a = time * 2.2 + k * Math.PI; fruitStarPath(ctx, f.x + Math.cos(a) * r * 1.05, f.y + Math.sin(a) * r * 1.05, r * 0.2, time * 3); ctx.fill(); }
  }
  fruitOutlinedText(ctx, f.text, f.x, f.y + r * 0.08, fruitLabelFont(ctx, f), '#fff');   // nhãn không xoay theo quả
}

/* Nửa quả: mặt cắt ruột bị cắt nửa theo đường chém, mép cắt có vệt ướt sáng */
function drawFruitHalf(ctx, p) {
  ctx.save(); ctx.globalAlpha = Math.min(1, p.life * 2); ctx.translate(p.x, p.y); ctx.rotate(p.a + p.rot);
  ctx.beginPath(); ctx.rect(-p.r * 1.3, p.side > 0 ? 0 : -p.r * 1.3, p.r * 2.6, p.r * 1.3); ctx.clip();
  drawFruitFace(ctx, p.kind, p.r, p.seed);
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-p.r * 0.9, 0); ctx.lineTo(p.r * 0.9, 0); ctx.stroke();
  ctx.restore();
}

/* Vệt dao: dải thon từ đuôi (mảnh, mờ) tới mũi (dày, sáng); quầng xanh lam bên ngoài, lõi trắng */
function drawFruitBlade(ctx, fx) {
  const pts = fx.blade, n = pts.length;
  if (n < 2) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  [[16, 'rgba(90,190,255,'], [8, 'rgba(190,240,255,'], [3, 'rgba(255,255,255,']].forEach(([wid, col]) => {
    for (let i = 1; i < n; i++) {
      const a = pts[i].life / FRUIT_BLADE_LIFE, t = i / (n - 1);
      ctx.strokeStyle = col + (a * (wid > 10 ? 0.25 : 0.9)) + ')'; ctx.lineWidth = wid * (0.25 + 0.75 * t) * (0.4 + 0.6 * a);
      ctx.beginPath(); ctx.moveTo(pts[i - 1].x, pts[i - 1].y); ctx.lineTo(pts[i].x, pts[i].y); ctx.stroke();
    }
  });
  ctx.restore();
}

function drawFruitFxLayer(ctx, fx) {
  for (const d of fx.drops) {                   // giọt nước kéo vệt theo hướng bay
    const a = Math.max(0, d.life / d.max), sp = Math.hypot(d.vx, d.vy);
    ctx.globalAlpha = a; ctx.fillStyle = d.color;
    ctx.beginPath(); ctx.ellipse(d.x, d.y, d.size * (1 + Math.min(2.5, sp / 250)), d.size, Math.atan2(d.vy, d.vx), 0, 6.283); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const s of fx.slashes) {                 // tia chém loé qua quả vừa bị cắt
    const a = s.life / s.max, dx = Math.cos(s.a) * s.len / 2, dy = Math.sin(s.a) * s.len / 2;
    const g = ctx.createLinearGradient(s.x - dx, s.y - dy, s.x + dx, s.y + dy);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,' + a + ')'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = g; ctx.lineWidth = 2 + 6 * a; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(s.x - dx, s.y - dy); ctx.lineTo(s.x + dx, s.y + dy); ctx.stroke();
  }
  for (const r of fx.rings) { ctx.globalAlpha = r.life / r.max; ctx.strokeStyle = r.color; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, 6.283); ctx.stroke(); }
  for (const p of fx.stars) { ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillStyle = p.color; fruitStarPath(ctx, p.x, p.y, p.size, p.rot); ctx.fill(); }
  ctx.restore();
  ctx.globalAlpha = 1;
  drawFruitBlade(ctx, fx);
  for (const t of fx.texts) {                    // chữ điểm nảy: to ra rồi co về cỡ thật
    const age = 1 - t.life / t.max, k = t.pop ? 1 + Math.max(0, 0.6 - age * 4) : 1;
    ctx.globalAlpha = Math.min(1, t.life / t.max * 2);
    fruitOutlinedText(ctx, t.text, t.x, t.y, Math.round(t.size * k), t.color);
  }
  ctx.globalAlpha = 1;
}

function drawFruitScene(ctx, st, fx, time) {
  const sx = fx.shake ? (Math.random() - 0.5) * fx.shake : 0, sy = fx.shake ? (Math.random() - 0.5) * fx.shake : 0;
  ctx.save(); ctx.translate(sx, sy);
  if (fx.bg) ctx.drawImage(fx.bg, 0, 0, fx.w, fx.h);
  for (const s of fx.splats) {
    ctx.globalAlpha = Math.min(1, s.life / s.max * 1.5) * 0.5; ctx.fillStyle = s.color;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill();
    for (const b of s.blobs) { ctx.beginPath(); ctx.arc(s.x + b.dx, s.y + b.dy, b.r, 0, 6.283); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  const wave = st && st.wave;
  if (wave) for (const f of wave.fruits) if (!f.cut && !f.gone && f.wait <= 0) drawFruitBody(ctx, f, wave.gold, time);
  fx.halves.forEach(p => drawFruitHalf(ctx, p));
  drawFruitFxLayer(ctx, fx);
  ctx.restore();
  if (fx.flash > 0) { ctx.globalAlpha = Math.min(0.4, fx.flash); ctx.fillStyle = fx.flashColor; ctx.fillRect(0, 0, fx.w, fx.h); ctx.globalAlpha = 1; }
  if (fx.edge > 0) {                             // viền đỏ phát sáng từ mép vào khi mất tim
    const g = ctx.createRadialGradient(fx.w / 2, fx.h / 2, Math.min(fx.w, fx.h) * 0.35, fx.w / 2, fx.h / 2, Math.max(fx.w, fx.h) * 0.75);
    g.addColorStop(0, 'rgba(255,30,30,0)'); g.addColorStop(1, 'rgba(255,30,30,' + fx.edge * 0.65 + ')');
    ctx.fillStyle = g; ctx.fillRect(0, 0, fx.w, fx.h);
  }
}
