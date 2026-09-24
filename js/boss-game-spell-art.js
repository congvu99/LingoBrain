/* Game Pháp Sư Lexoria — hiệu ứng phép trên canvas: hạt (js/game-particles.js), quả phép bay, sóng xung kích,
   số sát thương, rung/loé. Chỉ phản ứng theo st.events của boss-game-logic.js (không tự quyết thời điểm).
   Quả phép bay đúng BOSS_TUNING.impactMs → chạm quái đúng lúc event 'impact'.
   Cần game-particles.js, boss-game-spell-presets.js, boss-game-mage-art.js (mageStaffTip),
   boss-game-sprite-actors.js (diễn viên/đạn sprite ở sân tile — hàm chỉ gọi lúc chạy, nạp sau file này cũng được).
   Trận đồ/thiên thạch/tia sét/cột băng/gai đá/lốc + cắt cảnh tuyệt kỹ nằm ở js/boss-game-tier3-ultimate-fx.js
   (nạp sau file này) — gọi qua bossFxSpawnCircle/bossFxSpawnCustom/bossFxUltimateEvent/stepBossTier3Fx nếu có, để file này không vượt 200 dòng. */

const BOSS_FX_MAX_PARTS = 300;

function createBossFx() {
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  return { ps: createParticles(BOSS_FX_MAX_PARTS, reduced), shots: [], castN: 0, rings: [], texts: [], reduced,
    actor: createBossActors(), sprites: [],   // diễn viên + VFX sprite (boss-game-sprite-actors.js)
    shake: 0, flash: 0, flashColor: '#fff', monHit: 0, mageHurt: 0, castPose: 0, typo: 0,
    layout: { mage: { x: 0, y: 0, s: 1 }, mon: { x: 0, y: 0, s: 1 } } };
}

/* Preset theo hệ × bậc; thiếu bậc → preset bậc base phóng to (fallback nằm sẵn trong dữ liệu) */
function bossSpellPreset(el, tier) {
  const P = BOSS_SPELL_PRESETS[el] || BOSS_SPELL_PRESETS.fire;
  if (P[tier]) return { p: P[tier], scale: 1 };
  const fb = BOSS_SPELL_FALLBACK[tier] || { base: 1, scale: 1 };
  return { p: P[fb.base] || P[1], scale: fb.scale };
}

function bossBurst(fx, x, y, o, scale) {
  const k = scale || 1;
  burst(fx.ps, x, y, (o.n || 8) * k, k === 1 ? o : Object.assign({}, o, { speed: o.speed * Math.sqrt(k), size: o.size * k }));
}
const bossRuneAt = (m, i, total) => {
  const a = -Math.PI / 2 + i / Math.max(1, total) * Math.PI * 2, r = m.s * 0.55;
  return { x: m.x + Math.cos(a) * r, y: m.y - m.s * 0.45 + Math.sin(a) * r * 0.9 };
};

function bossFxEvent(fx, e, st) {
  const L = fx.layout, m = L.mage, q = L.mon;
  const total = Math.max.apply(null, st.targets.map(t => t.length));
  if (e.type === 'key') {
    const r = bossRuneAt(m, e.n - 1, total);
    bossBurst(fx, r.x, r.y, BOSS_FX_COMMON.rune);
  } else if (e.type === 'typo') {
    fx.typo = 0.3;
    bossBurst(fx, m.x, m.y - m.s * 0.5, BOSS_FX_COMMON.typo);
  } else if (e.type === 'cast') {
    const { p, scale } = bossSpellPreset(e.element, e.tier), tip = L.pixel ? bossMageCastPoint(m) : mageStaffTip(m.x, m.y, m.s, 'cast');
    p.cast.forEach(o => bossBurst(fx, tip.x, tip.y, o, scale));
    const dur = BOSS_TUNING.impactMs[e.tier] / 1000, id = ++fx.castN;
    for (let h = 0; h < (e.hits || 1); h++) {
      fx.shots.push({ x0: tip.x, y0: tip.y, x1: q.x, y1: q.y - q.s * 0.45 + (h ? q.s * 0.15 : 0), t: -h * 0.08, dur, p, scale, id });
    }
    fx.castPose = 0.4;
    if (e.crit) bossBurst(fx, tip.x, tip.y, BOSS_FX_COMMON.fastCrit);
    // trận đồ bậc 3: xuất hiện dưới chân pháp sư, sống đúng bằng thời gian bay tới lúc phép chạm
    if (p.circle && typeof bossFxSpawnCircle === 'function') bossFxSpawnCircle(fx, m.x, m.y - m.s * 0.1, m.s * 0.5, p.circle, dur);
  } else if (e.type === 'impact') {
    const shot = fx.shots[0];
    if (shot) fx.shots = fx.shots.filter(s => s.id !== shot.id);   // Xích sét: 2 quả cùng một lần niệm
    const { p, scale } = shot || bossSpellPreset(st.mods.element, e.tier);
    const x = q.x, y = q.y - q.s * 0.45;
    p.impact.forEach(o => bossBurst(fx, x, y, o, scale));
    fx.rings.push({ x, y, r: q.s * 0.15, vr: 380 * scale, life: 0.45, max: 0.45, color: p.ring });
    if (!fx.reduced) fx.shake = Math.max(fx.shake, p.shake * scale);
    fx.flash = Math.max(fx.flash, (fx.reduced ? 0.4 : 1) * p.flash * scale); fx.flashColor = p.flashColor;
    fx.monHit = 0.25;
    bossFxText(fx, x, y - q.s * 0.3, '−' + Math.round(e.dmg), e.tier === 3 ? '#ffd23f' : '#ffffff', 16 + e.tier * 5);
    // hình lớn bậc 3 (thiên thạch/tia sét/cột băng/gai đá/lốc) tại quái
    if (p.custom && typeof bossFxSpawnCustom === 'function') bossFxSpawnCustom(fx, p.custom, q.x, q.y - q.s * 0.45, q.s, p.ring);
  } else if (e.type === 'burnTick') {
    bossBurst(fx, q.x, q.y - q.s * 0.4, { kind: 'orb', speed: 80, life: 0.5, size: 4, colors: ['#ff9a3c', '#ff5a1f'], g: -80, n: 6 });
    bossFxText(fx, q.x + q.s * 0.3, q.y - q.s * 0.7, '−' + Math.round(e.dmg), '#ffb347', 14);
  } else if (e.type === 'fizzle' || e.type === 'giveup') {
    bossBurst(fx, m.x + m.s * 0.2, m.y - m.s * 0.9, BOSS_FX_COMMON.fizzle);
  } else if (e.type === 'hint') {   // gợi ý chữ (Gió) — lá bay quanh chữ đầu
    const r = bossRuneAt(m, 0, total);
    bossBurst(fx, r.x, r.y, BOSS_FX_COMMON.hint);
  } else if (e.type === 'typoForgiven') {   // gió lướt tha lỗi gõ sai (Gió)
    bossBurst(fx, m.x, m.y - m.s * 0.6, BOSS_FX_COMMON.typoForgiven);
  } else if (e.type === 'unfreeze') {
    bossBurst(fx, q.x, q.y - q.s * 0.4, BOSS_FX_COMMON.unfreeze);
  } else if (e.type === 'hurt') {
    bossBurst(fx, m.x, m.y - m.s * 0.5, BOSS_FX_COMMON.bossHit);
    fx.mageHurt = 0.45;
    if (!fx.reduced) fx.shake = Math.max(fx.shake, 10);
    fx.flash = Math.max(fx.flash, 0.28); fx.flashColor = '#ff2d4d';
  } else if (e.type === 'shieldBlock') {
    bossBurst(fx, m.x + m.s * 0.3, m.y - m.s * 0.5, BOSS_FX_COMMON.shield);
    bossBurst(fx, m.x + m.s * 0.3, m.y - m.s * 0.5, BOSS_FX_COMMON.shieldPop);
    fx.rings.push({ x: m.x + m.s * 0.3, y: m.y - m.s * 0.5, r: m.s * 0.08, vr: 200, life: 0.35, max: 0.35, color: '#c9a36b' });
    bossFxText(fx, m.x, m.y - m.s * 1.1, 'Khiên chặn!', '#d9c08a', 15);
  } else if (e.type === 'won') {
    bossBurst(fx, q.x, q.y - q.s * 0.45, { kind: 'spark', speed: 420, life: 0.8, size: 2.6, colors: ['#fff4c2', '#ffd23f', '#ffffff'], n: 60 });
  } else if (e.type === 'ultimate' || e.type === 'ultimateEnd') {
    if (typeof bossFxUltimateEvent === 'function') bossFxUltimateEvent(fx, e, st);
  }
  bossActorEvent(fx, e, st);   // sau cùng: shot của lần niệm này đã có trong fx.shots để gắn sprite đạn
}

function bossFxText(fx, x, y, text, color, size) { fx.texts.push({ x, y, text, color, size, life: 1.1, max: 1.1 }); }

/* dtGame = thật × timeScale (hạt, chữ bay chậm theo thế giới); dtReal cho quả phép (phải chạm đúng mốc impact thật) */
function stepBossFx(fx, dtGame, dtReal) {
  stepParticles(fx.ps, dtGame);
  for (const s of fx.shots) {
    s.t += dtReal;
    const k = Math.min(1, Math.max(0, s.t / s.dur)), tr = s.p.projectile.trail;
    if (s.t > 0 && k < 1) bossBurst(fx, s.x0 + (s.x1 - s.x0) * k, s.y0 + (s.y1 - s.y0) * k - Math.sin(k * Math.PI) * 30, tr, s.scale);
  }
  fx.rings = fx.rings.filter(r => { r.life -= dtGame; r.r += r.vr * dtGame; return r.life > 0; });
  fx.texts = fx.texts.filter(t => { t.life -= dtGame; t.y -= 42 * dtGame; return t.life > 0; });
  fx.shake = Math.max(0, fx.shake - 40 * dtReal);
  fx.flash = Math.max(0, fx.flash - 2.2 * dtReal);
  ['monHit', 'mageHurt', 'castPose', 'typo'].forEach(k => { fx[k] = Math.max(0, fx[k] - dtReal); });
  stepBossActors(fx, dtReal);
  if (typeof stepBossTier3Fx === 'function') stepBossTier3Fx(fx, dtReal);   // trận đồ/thiên thạch/… + cắt cảnh tuyệt kỹ
}

/* Hạt kiểu pixel: ô vuông toạ độ nguyên (không nhoè), cạnh ≥ 2px */
function bossPixelDot(ctx, x, y, size) {
  const z = Math.max(2, Math.round(size));
  ctx.fillRect(Math.round(x - z / 2), Math.round(y - z / 2), z, z);
}

function drawBossFx(ctx, fx, quality) {
  drawParticles(ctx, fx.ps, (ctx, p, a) => {
    if (p.kind === 'shard') { ctx.globalAlpha = a; ctx.fillStyle = p.color; bossPixelDot(ctx, p.x, p.y, p.size * 1.2); }
    else if (p.kind === 'smoke') { ctx.globalAlpha = a * 0.28; ctx.fillStyle = p.color; bossPixelDot(ctx, p.x, p.y, p.size * (3.2 - a * 1.2)); }
  });
  ctx.globalCompositeOperation = 'lighter';
  drawParticles(ctx, fx.ps, (ctx, p, a) => {
    if (p.kind === 'spark' || p.kind === 'orb') {   // tia lửa: ô chính + ô đuôi nhỏ theo hướng bay
      ctx.globalAlpha = a; ctx.fillStyle = p.color;
      bossPixelDot(ctx, p.x, p.y, p.kind === 'orb' ? p.size * (1 + a) : p.size * 1.4);
      if (p.kind === 'spark') bossPixelDot(ctx, p.x - p.vx * 0.025, p.y - p.vy * 0.025, p.size);
    }
  });
  for (const s of fx.shots) {
    if (s.t <= 0) continue;
    const k = Math.min(1, s.t / s.dur), pr = s.p.projectile, r = pr.size * s.scale;
    const x = s.x0 + (s.x1 - s.x0) * k, y = s.y0 + (s.y1 - s.y0) * k - Math.sin(k * Math.PI) * 30;
    ctx.globalAlpha = 1;
    if (s.sprite) {   // đạn sprite (Lửa) không quầng gradient; ảnh chưa nạp → rơi xuống quả cầu cũ
      ctx.globalCompositeOperation = 'source-over';
      const ok = drawBossShotSprite(ctx, s, x, y, k);
      ctx.globalCompositeOperation = 'lighter';
      if (ok) continue;
    }
    if (quality >= 1) {   // quầng sáng tốn fill-rate: bỏ khi đang hạ chất lượng
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
      g.addColorStop(0, pr.glow); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 3, 0, 6.283); ctx.fill();
    }
    ctx.fillStyle = pr.color; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
  }
  for (const r of fx.rings) {
    ctx.globalAlpha = r.life / r.max; ctx.strokeStyle = r.color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, 6.283); ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.textAlign = 'center';
  for (const t of fx.texts) {
    ctx.globalAlpha = Math.min(1, t.life / t.max * 2);
    ctx.font = '800 ' + t.size + 'px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.strokeText(t.text, t.x, t.y);
    ctx.fillStyle = t.color; ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}
