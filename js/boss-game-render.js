/* Game Pháp Sư Lexoria — ghép một khung hình từ state trận (boss-game-logic.js) + fx (boss-game-spell-art.js).
   Chỉ vẽ, không đổi state. Nền vùng (boss-game-scene.js) build offscreen 1 lần/đổi cỡ, cache theo ui.fx.bg*;
   quái vẽ bằng boss-game-monster-art.js theo ui.monster (BOSS_MONSTERS, boss-game-story.js).
   Chậm thời gian: k = mức chậm 0..1 → zoom tới 1.06 về phía pháp sư, lớp xám + viền tối.
   Trận đồ/hình lớn bậc 3/cắt cảnh tuyệt kỹ nằm ở js/boss-game-tier3-ultimate-fx.js — gọi qua hook drawBossPassiveFx
   (trong khối rung/zoom) và drawBossUltimateCutscene (sau khi bỏ transform, phủ toàn màn). */

const BOSS_HEART = '❤️', BOSS_HEART_EMPTY = '🖤';

/* Vị trí pháp sư (trái-dưới) và quái (phải) theo cỡ khung; ghi vào fx.layout để hiệu ứng dùng chung toạ độ */
function layoutBoss(fx, w, h) {
  const s = Math.min(h * 0.42, w * 0.34);
  fx.layout.mage = { x: w * 0.2, y: h * 0.88, s };
  fx.layout.mon = { x: w * 0.7, y: h * 0.84, s: Math.min(h * 0.5, w * 0.42) };
}

function slowAmount(st) { return Math.max(0, Math.min(1, (1 - st.timeScale) / (1 - BOSS_TUNING.slowScale))); }

/* Nền vùng: build offscreen 1 lần khi đổi cỡ/DPR/vùng, sau đó chỉ drawImage lại mỗi khung hình (rẻ) */
function drawBossRegion(ctx, ui, w, h) {
  const fx = ui.fx, region = ui.region;
  if (!fx.bg || fx.bgW !== w || fx.bgH !== h || fx.bgDpr !== ui.dpr || fx.bgRegion !== (region && region.id)) {
    fx.bg = buildRegionBackdrop(region, w, h, ui.dpr || 1);
    fx.bgW = w; fx.bgH = h; fx.bgDpr = ui.dpr; fx.bgRegion = region && region.id;
  }
  ctx.drawImage(fx.bg, 0, 0, w, h);
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

function drawBossHud(ctx, st, ui, now) {
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
  const rageFull = st.rage >= BOSS_TUNING.rageMax, glow = rageFull ? 0.5 + 0.5 * Math.sin(now / 130) : 0;
  for (let i = 0; i < BOSS_TUNING.rageMax; i++) {   // Nộ: 8 ô — đầy thì rung nhẹ + sáng nhấp nháy
    ctx.fillStyle = i < st.rage ? (rageFull ? (glow > 0.5 ? '#fff6c2' : '#ffd23f') : '#ff8a3c') : 'rgba(255,255,255,.15)';
    const jitter = rageFull && !ui.fx.reduced ? Math.sin(now / 45 + i) * 1.2 : 0;
    ctx.fillRect(pad + i * 13, pad + 24 + jitter, 10, 6);
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
  drawBossRegion(ctx, ui, w, h);
  const lift = typeof bossMonsterLiftPx === 'function' ? bossMonsterLiftPx(fx) : 0;
  ctx.save(); if (lift) ctx.translate(0, -lift);
  drawMonster(ctx, fx.layout.mon, ui.monster, { t: ui.time, hit: fx.monHit, frozen: st.frozen, pose: bossMonsterPose(st, fx) });
  drawBossClock(ctx, st, fx.layout.mon, now);
  ctx.restore();
  const pose = fx.mageHurt > 0 ? 'hurt' : fx.castPose > 0 ? 'cast' : st.typed.length ? 'chant' : 'idle';
  drawMage(ctx, m.x, m.y, m.s, { gender: ui.gender, pose, t: ui.time, element: st.mods.element });
  drawRuneCircle(ctx, st, fx);
  drawBossFx(ctx, fx, ui.quality);
  if (typeof drawBossPassiveFx === 'function') drawBossPassiveFx(ctx, fx, st, now);   // trận đồ, hình lớn bậc 3, phủ băng
  ctx.restore();
  if (k > 0.01) {   // hậu kỳ chậm thời gian: nhạt màu + viền tối
    ctx.fillStyle = 'rgba(40,36,60,' + (0.22 * k) + ')'; ctx.fillRect(0, 0, w, h);
    const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,' + (0.55 * k) + ')');
    ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
  }
  if (fx.flash > 0) { ctx.globalAlpha = Math.min(0.6, fx.flash); ctx.fillStyle = fx.flashColor; ctx.fillRect(0, 0, w, h); ctx.globalAlpha = 1; }
  drawBossHud(ctx, st, ui, now);
  if (typeof drawBossUltimateCutscene === 'function') drawBossUltimateCutscene(ctx, fx, ui, now);   // cắt cảnh tuyệt kỹ, phủ cả HUD
}
