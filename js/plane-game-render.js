/* Game Bắn máy bay — vẽ cảnh lên canvas: tàu mình (xoay nòng theo mục tiêu, lửa động cơ), thiên thạch
   (đa giác lồi lõm tự xoay), tàu địch (mũi nghiêng theo hướng lượn), tàu mẹ (đèn nhấp nháy), đạn vệt sáng,
   nhãn nghĩa Việt + tiến độ gõ (chữ đã gõ hiện dần, còn lại là gạch dưới). Hiệu ứng lấy từ plane-game-effects.js. */

const RENDER_FONT = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif';
const RENDER_MONO = 'ui-monospace,"SF Mono",Menlo,Consolas,monospace';
const rockShapes = new WeakMap();   // mục tiêu → đỉnh đa giác, sinh 1 lần để thiên thạch giữ nguyên hình khi xoay
const labelLayouts = new WeakMap(); // mục tiêu → { maxW, lines, w, progress, prog, pw } — measureText mỗi khung tốn

function rockShape(t) {
  let v = rockShapes.get(t);
  if (!v) {
    v = [];
    for (let i = 0; i < 10; i++) v.push({ a: i / 10 * 6.283, r: t.r * (0.72 + Math.random() * 0.3) });
    rockShapes.set(t, v);
  }
  return v;
}

/* Ngắt nhãn thành nhiều dòng vừa maxW (greedy theo từ) — không cắt "…" nghĩa ngắn như "một (mạo từ …)" */
function labelLayout(ctx, t, maxW) {
  let L = labelLayouts.get(t);
  if (L && L.maxW === maxW) return L;         // khung đổi bề ngang (xoay máy) thì ngắt dòng lại
  const lines = [];
  let cur = '';
  for (const word of t.label.split(' ')) {
    const next = cur ? cur + ' ' + word : word;
    if (cur && ctx.measureText(next).width > maxW) { lines.push(cur); cur = word; } else cur = next;
  }
  if (cur) lines.push(cur);
  L = { maxW, lines, w: Math.max.apply(null, lines.map(l => ctx.measureText(l).width)), progress: -1, prog: '', pw: 0 };
  labelLayouts.set(t, L);
  return L;
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

function drawRock(ctx, t) {
  const v = rockShape(t);
  ctx.beginPath();
  v.forEach((p, i) => { const x = Math.cos(p.a) * p.r, y = Math.sin(p.a) * p.r; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
  ctx.closePath();
  ctx.fillStyle = '#5e5249'; ctx.fill();
  ctx.strokeStyle = '#a8968a'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = '#463c35';
  [[0.3, -0.2, 0.22], [-0.35, 0.25, 0.16], [0.05, 0.4, 0.12]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x * t.r, y * t.r, r * t.r, 0, 6.283); ctx.fill(); });
}

function drawEnemyShip(ctx, t, time) {
  const r = t.r;
  ctx.globalCompositeOperation = 'lighter';     // lửa động cơ ở đuôi (phía trên khi bay xuống)
  ctx.fillStyle = '#ff9f43'; ctx.globalAlpha = 0.5 + Math.sin(time * 30 + t.phase) * 0.25;
  ctx.beginPath(); ctx.ellipse(0, -r * 0.85, r * 0.22, r * 0.45, 0, 0, 6.283); ctx.fill();
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.moveTo(0, r); ctx.lineTo(r * 0.35, r * 0.1); ctx.lineTo(r, -r * 0.35); ctx.lineTo(r * 0.3, -r * 0.55);
  ctx.lineTo(0, -r * 0.4); ctx.lineTo(-r * 0.3, -r * 0.55); ctx.lineTo(-r, -r * 0.35); ctx.lineTo(-r * 0.35, r * 0.1); ctx.closePath();
  ctx.fillStyle = '#c9362f'; ctx.fill(); ctx.strokeStyle = '#ff8a7a'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.ellipse(0, r * 0.25, r * 0.16, r * 0.28, 0, 0, 6.283); ctx.fill();
}

function drawMothership(ctx, t, time) {
  const r = t.r;
  ctx.fillStyle = '#5a3cc0'; ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.42, 0, 0, 6.283); ctx.fill();
  ctx.strokeStyle = '#b9a3ff'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = '#b9a3ff'; ctx.beginPath(); ctx.ellipse(0, -r * 0.2, r * 0.42, r * 0.34, 0, Math.PI, 0); ctx.fill();
  for (let i = 0; i < 6; i++) {
    const on = Math.floor(time * 5 + i) % 3 === 0;
    ctx.fillStyle = on ? '#ffe66d' : '#6f5bc9';
    ctx.beginPath(); ctx.arc(-r * 0.75 + i * r * 0.3, r * 0.12, r * 0.07, 0, 6.283); ctx.fill();
  }
}

/* locked: 1 = đang bắn (vòng sáng), 0.5 = một trong nhiều ứng viên khi chưa rõ từ (vòng mờ), 0 = không */
function drawTarget(ctx, t, time, locked) {
  ctx.save(); ctx.translate(t.x, t.y);
  if (locked) {                      // vòng ngắm đứt nét xoay quanh mục tiêu đang khoá
    ctx.save(); ctx.rotate(time * 2); ctx.setLineDash([6, 6]); ctx.strokeStyle = '#5ee7ff'; ctx.lineWidth = 2; ctx.globalAlpha = locked;
    ctx.beginPath(); ctx.arc(0, 0, t.r * 1.35, 0, 6.283); ctx.stroke(); ctx.restore();
  }
  ctx.rotate(t.rot);
  if (t.kind === 'rock') drawRock(ctx, t); else if (t.kind === 'ship') drawEnemyShip(ctx, t, time); else drawMothership(ctx, t, time);
  ctx.restore();
}

/* Tàu mình: mũi xoay về mục tiêu, nghiêng thêm theo hướng đang bay (bank), cánh co lại như đang lượn,
   lửa động cơ dài ra khi tăng tốc */
function drawPlayerShip(ctx, st, time) {
  ctx.save(); ctx.translate(st.shipX, st.shipY);
  ctx.rotate(st.aim + Math.PI / 2 + st.bank * 0.6);
  ctx.scale(1 - Math.abs(st.bank) * 0.5, 1);
  ctx.globalCompositeOperation = 'lighter';
  const f = 10 + Math.abs(st.bank) * 16 + Math.sin(time * 40) * 3;
  ctx.fillStyle = '#38bdf8'; ctx.globalAlpha = 0.8;
  ctx.beginPath(); ctx.moveTo(-5, 12); ctx.lineTo(0, 12 + f); ctx.lineTo(5, 12); ctx.fill();
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(7, -4); ctx.lineTo(16, 10); ctx.lineTo(6, 8); ctx.lineTo(0, 13);
  ctx.lineTo(-6, 8); ctx.lineTo(-16, 10); ctx.lineTo(-7, -4); ctx.closePath();
  ctx.fillStyle = '#d7f7ff'; ctx.fill(); ctx.strokeStyle = '#5ee7ff'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#0ea5e9'; ctx.beginPath(); ctx.ellipse(0, -3, 3, 6, 0, 0, 6.283); ctx.fill();
  ctx.restore();
}

function drawBullets(ctx, st) {
  ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (const b of st.bullets) {
    if (b.held) {                      // đạn chờ: quả cầu sáng lơ lửng trên tàu
      ctx.fillStyle = 'rgba(94,231,255,.3)'; ctx.beginPath(); ctx.arc(b.x, b.y, 7, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#eaffff'; ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, 6.283); ctx.fill();
      continue;
    }
    const tx = b.x - b.vx * 0.018, ty = b.y - b.vy * 0.018;
    ctx.strokeStyle = 'rgba(94,231,255,.35)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.strokeStyle = '#eaffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over'; ctx.lineCap = 'butt';
}

/* Nhãn dưới mục tiêu: nghĩa Việt (tự xuống dòng), dòng cuối tiến độ "s t u _ _ _ _ _" (dấu cách giữ khoảng trống) */
function drawLabel(ctx, st, t, locked) {
  ctx.font = '600 13px ' + RENDER_FONT;
  const L = labelLayout(ctx, t, Math.min(190, st.w * 0.62)), lw = L.w;
  if (L.progress !== t.progress) {            // dòng tiến độ chỉ dựng lại khi gõ thêm chữ
    L.progress = t.progress;
    const hintAt = st.diff.hint && !t.progress ? skipFixed(t.text, 0) : -1;   // cấp Dễ: hiện sẵn chữ đầu để đọc
    L.prog = t.text.split('').map((c, i) => c === ' ' ? ' ' : i < t.progress || i === hintAt ? c : '_').join(' ');
    ctx.font = '700 11px ' + RENDER_MONO; L.pw = ctx.measureText(L.prog).width; ctx.font = '600 13px ' + RENDER_FONT;
  }
  const prog = L.prog, bw = Math.max(lw, L.pw) + 16, bh = 22 + L.lines.length * 16;
  const x = Math.min(Math.max(t.x, bw / 2 + 2), st.w - bw / 2 - 2), y = t.y + t.r + 8;
  roundRectPath(ctx, x - bw / 2, y, bw, bh, 9);
  ctx.fillStyle = 'rgba(8,12,34,.78)'; ctx.fill();
  ctx.strokeStyle = locked ? '#5ee7ff' : 'rgba(255,255,255,.18)'; ctx.lineWidth = locked ? 1.5 : 1; ctx.stroke();
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#f2f5ff';
  L.lines.forEach((line, i) => ctx.fillText(line, x, y + 16 + i * 16));
  ctx.font = '700 11px ' + RENDER_MONO; ctx.fillStyle = t.progress ? '#5ee7ff' : '#8f98c4';
  ctx.fillText(prog, x, y + 15 + L.lines.length * 16);
}

/* Vẽ trọn 1 khung: nền → mục tiêu → đạn → tàu mình → hạt → nhãn (nhãn trên cùng để luôn đọc được) → chớp */
function drawPlaneScene(ctx, st, fx, time) {
  const s = spaceShake(fx);
  ctx.save(); ctx.translate(s.x, s.y);
  drawSpaceBg(fx, ctx);
  const cands = st.lock === null && st.typed ? typingCandidates(st, st.typed) : [];
  for (const t of st.targets) drawTarget(ctx, t, time, t.uid === st.lock ? 1 : cands.indexOf(t) >= 0 ? 0.5 : 0);
  drawBullets(ctx, st);
  drawPlayerShip(ctx, st, time);
  drawSpaceFx(fx, ctx);
  for (const t of st.targets) if (!t.doomed) drawLabel(ctx, st, t, t.uid === st.lock || cands.indexOf(t) >= 0);
  ctx.restore();
  drawSpaceFlash(fx, ctx);
}
