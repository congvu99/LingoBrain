/* Game Pháp Sư Lexoria — ghép một khung hình từ state trận (boss-game-logic.js) + fx (boss-game-spell-art.js).
   Chỉ vẽ, không đổi state. Nền và quái ở đây là bản tạm (phase sau thay bằng nền vùng + 12 quái).
   Chậm thời gian: k = mức chậm 0..1 → zoom tới 1.06 về phía pháp sư, lớp xám + viền tối. */

const BOSS_HEART = '❤️', BOSS_HEART_EMPTY = '🖤';

/* Vị trí pháp sư (trái-dưới) và quái (phải) theo cỡ khung; ghi vào fx.layout để hiệu ứng dùng chung toạ độ */
function layoutBoss(fx, w, h) {
  const s = Math.min(h * 0.42, w * 0.34);
  fx.layout.mage = { x: w * 0.2, y: h * 0.88, s };
  fx.layout.mon = { x: w * 0.7, y: h * 0.84, s: Math.min(h * 0.5, w * 0.42) };
}

function slowAmount(st) { return Math.max(0, Math.min(1, (1 - st.timeScale) / (1 - BOSS_TUNING.slowScale))); }

function drawBossBackdrop(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#120b2e'); g.addColorStop(0.62, '#2b1d4f'); g.addColorStop(0.63, '#1b2a1f'); g.addColorStop(1, '#0d150f');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255,240,200,.85)';   // trăng
  ctx.beginPath(); ctx.arc(w * 0.82, h * 0.16, Math.min(w, h) * 0.06, 0, 6.283); ctx.fill();
}

/* Quái tạm dáng thú: thân elip, đầu có sừng, mắt đỏ; nhún theo thời gian game; trúng đòn loé trắng */
function drawTempMonster(ctx, q, t, hit, frozen) {
  const bob = Math.sin(t * 2.4) * q.s * 0.02, s = q.s;
  ctx.save(); ctx.translate(q.x, q.y + bob);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(0, -bob, s * 0.36, s * 0.06, 0, 0, 6.283); ctx.fill();
  const body = frozen ? '#6aa9c9' : '#3a2450', dark = frozen ? '#3d7894' : '#24163a';
  ctx.fillStyle = dark;
  [-0.2, -0.05, 0.12, 0.26].forEach(lx => ctx.fillRect(lx * s, -s * 0.2, s * 0.07, s * 0.2));   // chân
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.ellipse(0, -s * 0.32, s * 0.34, s * 0.19, 0, 0, 6.283); ctx.fill();          // thân
  ctx.beginPath(); ctx.ellipse(-s * 0.3, -s * 0.48, s * 0.15, s * 0.13, -0.3, 0, 6.283); ctx.fill(); // đầu (quay về pháp sư)
  ctx.fillStyle = '#d8c9a8';
  [[-0.36, -0.58, -0.5], [-0.24, -0.6, -0.34]].forEach(([x, y, tx]) => {                            // sừng
    ctx.beginPath(); ctx.moveTo(x * s, y * s); ctx.quadraticCurveTo(tx * s, (y - 0.14) * s, (tx - 0.04) * s, (y - 0.2) * s); ctx.lineTo((x + 0.04) * s, y * s); ctx.fill();
  });
  ctx.fillStyle = frozen ? '#e6fbff' : '#ff3b3b';
  ctx.beginPath(); ctx.arc(-s * 0.37, -s * 0.49, s * 0.022, 0, 6.283); ctx.fill();                  // mắt
  if (hit > 0) { ctx.globalAlpha = Math.min(1, hit * 4) * 0.7; ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(-s * 0.05, -s * 0.36, s * 0.42, s * 0.26, 0, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1; }
  ctx.restore();
}

/* Vòng nạp đòn của trùm quanh quái; còn < 25% → nhấp nháy đỏ; đang đóng băng → xanh băng */
function drawBossClock(ctx, st, q, now) {
  const k = Math.max(0, st.clock / st.clockMax), r = q.s * 0.5, cx = q.x, cy = q.y - q.s * 0.36;
  ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(255,255,255,.12)';
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.283); ctx.stroke();
  const danger = k < 0.25 && !st.frozen;
  ctx.strokeStyle = st.frozen ? '#9fe8ff' : danger ? (Math.floor(now / 160) % 2 ? '#ff3b3b' : '#ff9a9a') : '#f5c25b';
  ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + (1 - k) * 6.283); ctx.stroke();   // phần đã nạp
}

function drawRuneCircle(ctx, st, fx) {
  const m = fx.layout.mage, total = Math.max.apply(null, st.targets.map(t => t.length)), lit = st.typed.length;
  if (!lit && !fx.typo) return;
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < total; i++) {
    const p = bossRuneAt(m, i, total), on = i < lit;
    ctx.globalAlpha = on ? 1 : 0.25;
    ctx.fillStyle = fx.typo > 0 && i === lit ? '#ff4d4d' : on ? '#ffe9a8' : '#8a7fb8';
    ctx.beginPath(); ctx.arc(p.x, p.y, on ? 4.5 : 3, 0, 6.283); ctx.fill();
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}

function drawBossHud(ctx, st, ui) {
  const w = ui.w, pad = 10, bw = Math.min(220, w * 0.48), k = st.hp / st.hpMax;
  ctx.font = '700 13px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif';
  ctx.textAlign = 'right'; ctx.fillStyle = '#f3e9ff'; ctx.fillText(ui.monsterName, w - pad, pad + 12);
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(w - pad - bw, pad + 18, bw, 10);
  ctx.fillStyle = k > 0.3 ? '#e04f6f' : '#ff2d2d'; ctx.fillRect(w - pad - bw, pad + 18, bw * k, 10);
  ctx.fillStyle = '#fff'; ctx.font = '600 10px ui-monospace,Menlo,Consolas,monospace';
  ctx.fillText(Math.ceil(st.hp) + '/' + st.hpMax, w - pad - 3, pad + 27);
  ctx.textAlign = 'left'; ctx.font = '16px -apple-system,"Segoe UI Emoji",sans-serif';
  ctx.fillText(BOSS_HEART.repeat(Math.max(0, st.hearts)) + BOSS_HEART_EMPTY.repeat(Math.max(0, st.heartsMax - st.hearts)) +
    (st.shield ? ' 🛡️' : ''), pad, pad + 16);
  for (let i = 0; i < BOSS_TUNING.rageMax; i++) {   // Nộ: 8 ô
    ctx.fillStyle = i < st.rage ? (st.rage >= BOSS_TUNING.rageMax ? '#ffd23f' : '#ff8a3c') : 'rgba(255,255,255,.15)';
    ctx.fillRect(pad + i * 13, pad + 24, 10, 6);
  }
  if (ui.showFps) {
    ctx.fillStyle = '#9f9'; ctx.font = '11px ui-monospace,monospace';
    ctx.fillText(Math.round(ui.fps) + ' fps · ' + ui.fx.ps.n + ' hạt · q ' + ui.quality, pad, ui.h - 8);
  }
}

/* ui = {w, h, time (giây game), gender, monsterName, fps, showFps, quality, fx}; now = ms thật */
function drawBossScene(ctx, st, ui, now) {
  const fx = ui.fx, w = ui.w, h = ui.h, m = fx.layout.mage, k = slowAmount(st);
  ctx.save();
  if (fx.shake) ctx.translate((Math.random() - 0.5) * fx.shake, (Math.random() - 0.5) * fx.shake);
  const z = 1 + 0.06 * k, zx = m.x, zy = m.y - m.s * 0.5;
  if (z !== 1) { ctx.translate(zx, zy); ctx.scale(z, z); ctx.translate(-zx, -zy); }
  drawBossBackdrop(ctx, w, h);
  drawTempMonster(ctx, fx.layout.mon, ui.time, fx.monHit, st.frozen);
  drawBossClock(ctx, st, fx.layout.mon, now);
  const pose = fx.mageHurt > 0 ? 'hurt' : fx.castPose > 0 ? 'cast' : st.typed.length ? 'chant' : 'idle';
  drawMage(ctx, m.x, m.y, m.s, { gender: ui.gender, pose, t: ui.time, element: st.mods.element });
  drawRuneCircle(ctx, st, fx);
  drawBossFx(ctx, fx, ui.quality);
  ctx.restore();
  if (k > 0.01) {   // hậu kỳ chậm thời gian: nhạt màu + viền tối
    ctx.fillStyle = 'rgba(40,36,60,' + (0.22 * k) + ')'; ctx.fillRect(0, 0, w, h);
    const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,' + (0.55 * k) + ')');
    ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
  }
  if (fx.flash > 0) { ctx.globalAlpha = Math.min(0.6, fx.flash); ctx.fillStyle = fx.flashColor; ctx.fillRect(0, 0, w, h); ctx.globalAlpha = 1; }
  drawBossHud(ctx, st, ui);
}
