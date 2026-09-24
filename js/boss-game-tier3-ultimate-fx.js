/* Game Pháp Sư Lexoria — trận đồ (magic circle), hình lớn bậc 3 (thiên thạch/tia sét/cột băng/gai đá/lốc),
   cắt cảnh tuyệt kỹ + phủ băng khi đóng băng. Tách khỏi boss-game-spell-art.js để giữ mỗi file < 200 dòng.
   Mọi mốc thời gian đếm ngược bằng dtReal (giống fx.shake/flash) — không dùng performance.now() trực tiếp,
   để không lệch khi tab bị treo/pause. Cần boss-game-spell-art.js (bossBurst), boss-game-mage-art.js (drawMage). */

const BOSS_TIER3_LIFE = 0.9;   // hình lớn (thiên thạch/cột băng/gai đá/lốc/tia sét) sống chừng này sau khi chạm

function bossFxSpawnCircle(fx, x, y, r, color, life) {
  fx.circles = fx.circles || [];
  fx.circles.push({ x, y, r, color, life, max: life });
}
function bossFxSpawnCustom(fx, type, x, y, r, color, life) {
  fx.customs = fx.customs || [];
  fx.customs.push({ type, x, y, r, color, life: life || BOSS_TIER3_LIFE, max: life || BOSS_TIER3_LIFE });
}

/* Cắt cảnh tuyệt kỹ: tên chiêu giữa màn + chân dung pháp sư trượt vào; iceAge thêm sương phủ */
function bossFxUltimateEvent(fx, e, st) {
  if (e.type === 'ultimateEnd') { fx.ultimate = null; return; }
  const u = BOSS_ULTIMATE_PRESETS[e.id] || BOSS_ULTIMATE_PRESETS.meteor;
  fx.ultimate = { id: e.id, name: u.name, color: u.color, life: BOSS_TUNING.ultimateMs / 1000, max: BOSS_TUNING.ultimateMs / 1000 };
  if (!fx.reduced) fx.shake = Math.max(fx.shake, u.shake);
  fx.flash = Math.max(fx.flash, u.flash); fx.flashColor = u.color;
  const q = fx.layout.mon, m = fx.layout.mage;
  for (let i = 0; i < (u.hits || 0); i++) {
    bossFxSpawnCustom(fx, e.id === 'chain' ? 'bolt' : 'meteor', q.x + (i - u.hits / 2) * q.s * 0.18, q.y - q.s * 0.45, q.s * 0.8, u.color, 0.7 + i * 0.15);
  }
  if (e.id === 'tornado') bossFxSpawnCustom(fx, 'tornado', q.x, q.y - q.s * 0.45, q.s * 1.3, u.color, BOSS_TUNING.ultimateMs / 1000);
  if (e.id === 'revive') bossBurst(fx, m.x, m.y - m.s * 0.5, { kind: 'orb', speed: 120, life: 1.2, size: 4, colors: ['#fff4c2', '#ffe08a'], drag: 1.2, g: -60, n: 26 });
}

/* Lốc xoáy tuyệt kỹ nâng quái lên rồi quật xuống — chỉ dịch điểm vẽ, không đổi state trận */
function bossMonsterLiftPx(fx, dtRealUnused) {
  const c = (fx.customs || []).find(c => c.type === 'tornado' && c.life > 0);
  if (!c) return 0;
  const k = 1 - c.life / c.max;   // 0 → 1 theo thời gian sống
  return Math.sin(Math.min(1, k * 1.3) * Math.PI) * c.r * 0.35;
}

function stepBossTier3Fx(fx, dtReal) {
  (fx.circles || []).forEach(c => { c.life -= dtReal; });
  fx.circles = (fx.circles || []).filter(c => c.life > 0);
  (fx.customs || []).forEach(c => { c.life -= dtReal; });
  fx.customs = (fx.customs || []).filter(c => c.life > 0);
  if (fx.ultimate) { fx.ultimate.life -= dtReal; if (fx.ultimate.life <= 0) fx.ultimate = null; }
}

/* Vẽ trong khối transform (rung/zoom) đã áp dụng ở boss-game-render.js */
function drawBossPassiveFx(ctx, fx, st, now) {
  (fx.circles || []).forEach(c => drawMagicCircle(ctx, c.x, c.y, c.r, c.color, now / 1000, c.life / c.max));
  (fx.customs || []).forEach(c => {
    const k = Math.min(1, 1 - c.life / c.max);
    if (c.type === 'meteor') drawMeteor(ctx, c.x, c.y, c.r, k, c.color);
    else if (c.type === 'pillar') drawIcePillar(ctx, c.x, c.y, c.r, k, c.color);
    else if (c.type === 'spikes') drawRockSpikes(ctx, c.x, c.y, c.r, k, c.color);
    else if (c.type === 'tornado') drawTornado(ctx, c.x, c.y, c.r, now / 1000, c.color, k);
    else if (c.type === 'bolt') drawLightningBolt(ctx, { x: c.x, y: c.y - c.r * 2.2 }, { x: c.x, y: c.y }, Math.round(c.x + c.y), c.color, 1 - Math.abs(k - 0.15) * 3);
  });
  if (st.frozen) {   // phủ băng: quầng lạnh quanh quái (thân quái do drawMonster vẽ)
    const q = fx.layout.mon;
    ctx.globalAlpha = 0.35; ctx.fillStyle = '#bff4ff';
    ctx.beginPath(); ctx.ellipse(q.x, q.y - q.s * 0.32, q.s * 0.4, q.s * 0.24, 0, 0, 6.283); ctx.fill();
    ctx.globalAlpha = 1;
  }
}

/* Vẽ sau ctx.restore() (không bị rung/zoom) — cắt cảnh phủ toàn màn */
function drawBossUltimateCutscene(ctx, fx, ui, now) {
  const u = fx.ultimate;
  if (!u) return;
  const w = ui.w, h = ui.h, k = Math.min(1, (u.max - u.life) / 0.3), fade = Math.min(1, u.life / 0.3);
  const inOut = Math.min(k, fade);
  ctx.globalAlpha = 0.55 * inOut; ctx.fillStyle = '#050212'; ctx.fillRect(0, 0, w, h); ctx.globalAlpha = 1;
  const slide = (1 - k) * -w * 0.4;
  drawMage(ctx, w * 0.28 + slide, h * 0.72, Math.min(h * 0.52, w * 0.4), { gender: ui.gender, pose: 'cast', t: now / 1000, element: u.id === 'iceAge' ? 'ice' : u.id === 'chain' ? 'storm' : u.id === 'revive' ? 'earth' : u.id === 'tornado' ? 'wind' : 'fire' });
  ctx.globalAlpha = inOut; ctx.textAlign = 'center'; ctx.fillStyle = u.color;
  ctx.font = '800 34px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif';
  ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.strokeText(u.name, w / 2, h * 0.42);
  ctx.fillText(u.name, w / 2, h * 0.42);
  if (u.id === 'iceAge') {   // sương phủ + đồng hồ đóng băng nứt
    ctx.fillStyle = 'rgba(210,245,255,.25)'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(w * 0.5, h * 0.3); ctx.lineTo(w * 0.46, h * 0.5); ctx.lineTo(w * 0.53, h * 0.62); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

if (typeof module !== 'undefined') module.exports = { bossFxSpawnCircle, bossFxSpawnCustom, bossMonsterLiftPx };
