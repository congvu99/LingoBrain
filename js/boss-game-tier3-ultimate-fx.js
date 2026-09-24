/* Game Pháp Sư Lexoria — trận đồ (magic circle sprite dưới chân pháp sư, vẽ TRƯỚC pháp sư — lớp mặt đất),
   tuyệt kỹ (VFX sprite + cắt cảnh Faceset), thụ động đóng băng/khiên/khiên Ôn từ/bỏng. Tách khỏi
   boss-game-spell-art.js để giữ mỗi file < 200 dòng.
   Mọi mốc thời gian đếm ngược bằng dtReal (giống fx.shake/flash) — không dùng performance.now() trực tiếp,
   để không lệch khi tab bị treo/pause. Cần boss-game-spell-art.js (bossBurst), boss-game-sprite-actors.js
   (bossSpawnSprite, bossVfxScale), boss-game-sprite-atlas.js (drawSprite, BOSS_SPRITES). */

function bossFxSpawnCircle(fx, x, y, r, color, life) {
  fx.circles = fx.circles || [];
  fx.circles.push({ x, y, r, color, life, max: life });
}

/* Cắt cảnh tuyệt kỹ: tên chiêu giữa màn + VFX sprite theo BOSS_ULTIMATE_PRESETS; iceAge thêm sương phủ (bỏ khi
   prefers-reduced-motion — chỉ giữ VFX tại chỗ, không loé/phủ toàn màn). Meteor rơi thật (vx/vy) cũng tắt khi
   reduced — chỉ còn nổ tại chỗ (review phase 4 #12). */
function bossFxUltimateEvent(fx, e, st) {
  if (e.type === 'ultimateEnd') { fx.ultimate = null; return; }
  const u = BOSS_ULTIMATE_PRESETS[e.id] || BOSS_ULTIMATE_PRESETS.meteor, ultS = BOSS_TUNING.ultimateMs / 1000;
  fx.ultimate = { id: e.id, name: u.name, color: u.color, life: ultS, max: ultS };
  if (!fx.reduced) fx.shake = Math.max(fx.shake, u.shake);
  if (!fx.reduced) { fx.flash = Math.max(fx.flash, u.flash); fx.flashColor = u.color; }   // giảm chuyển động: bỏ loé toàn màn
  const q = fx.layout.mon, m = fx.layout.mage;
  if (e.id === 'meteor') {   // Fireball ×hits rơi chéo (vx/vy thật) + Explosion lớn lúc chạm
    const dur = 0.5;
    for (let i = 0; i < u.hits; i++) {
      const ex = q.x + (i - (u.hits - 1) / 2) * q.s * 0.16, ey = q.y - q.s * 0.45;
      if (fx.reduced) {   // không rơi — chỉ nổ tại chỗ, lệch nhẹ độ trễ
        bossSpawnSprite(fx, u.bigSprite, ex, ey, bossVfxScale(u.bigSprite, q.s), { delay: i * 0.1 });
      } else {
        const sx = ex - q.s * 0.3, sy = q.y - q.s * 2.4, delay = i * 0.12;
        bossSpawnSprite(fx, u.sprite, sx, sy, bossVfxScale(u.sprite, q.s, 1.15), { delay, vel: { vx: (ex - sx) / dur, vy: (ey - sy) / dur }, life: dur });
        bossSpawnSprite(fx, u.bigSprite, ex, ey, bossVfxScale(u.bigSprite, q.s, 1.15), { delay: delay + dur });
      }
    }
  } else if (e.id === 'chain') {   // Thiên Lôi nhảy hits lần quanh quái
    for (let i = 0; i < u.hits; i++) {
      bossSpawnSprite(fx, u.sprite, q.x + (i - (u.hits - 1) / 2) * q.s * 0.32, q.y - q.s * 0.45, bossVfxScale(u.sprite, q.s, 1.15), { delay: i * 0.15 });
    }
  } else if (e.id === 'revive') {
    bossSpawnSprite(fx, u.sprite, m.x, m.y - m.s * 0.6, bossVfxScale(u.sprite, m.s, 1.15), { life: Math.min(0.9, ultS) });
    bossBurst(fx, m.x, m.y - m.s * 0.5, { kind: 'orb', speed: 120, life: 1.2, size: 4, colors: ['#fff4c2', '#ffe08a'], drag: 1.2, g: -60, n: 26 });
  } else if (e.id === 'tornado') {   // lốc lớn dưới quái, sống suốt ultimateMs + tự "bay theo" quái bị nâng (bossMonsterLiftPx)
    bossSpawnSprite(fx, u.sprite, q.x, q.y - q.s * 0.45, bossVfxScale(u.sprite, q.s), { vel: { follow: true }, life: ultS, anim: 'cycle' });
  } else {   // iceAge: cột băng dưới quái, giữ khung cuối lâu hơn anim tự nhiên cho đỡ hụt (review #5)
    bossSpawnSprite(fx, u.sprite, q.x, q.y - q.s * 0.45, bossVfxScale(u.sprite, q.s, 1.15), { life: Math.min(1.1, ultS) });
  }
}

/* Lốc xoáy tuyệt kỹ nâng quái lên rồi quật xuống — chỉ dịch điểm vẽ, không đổi state trận */
function bossMonsterLiftPx(fx) {
  const u = fx.ultimate;
  if (!u || u.id !== 'tornado') return 0;
  const k = 1 - u.life / u.max;   // 0 → 1 theo thời gian sống
  return Math.sin(Math.min(1, k * 1.3) * Math.PI) * fx.layout.mon.s * 0.3;
}

function stepBossTier3Fx(fx, dtReal) {
  (fx.circles || []).forEach(c => { c.life -= dtReal; });
  fx.circles = (fx.circles || []).filter(c => c.life > 0);
  if (fx.ultimate) { fx.ultimate.life -= dtReal; if (fx.ultimate.life <= 0) fx.ultimate = null; }
}

/* Lớp mặt đất: trận đồ (sprite magicCircle lặp, tô màu hệ qua opt.solid, bóp dẹt scaleY phối cảnh giả 3D) — vẽ
   TRƯỚC pháp sư (gọi trong drawBossScene trước drawBossMageSprite) để pháp sư đứng "trên" trận đồ, không bị che
   (review #7). Trước đây gộp chung với thụ động và vẽ SAU pháp sư — đã tách riêng. */
function drawBossGroundFx(ctx, fx) {
  (fx.circles || []).forEach(c => {
    const fade = Math.min(1, c.life / c.max * 2) * 0.9, spin = (c.max - c.life) * 2;
    drawSprite(ctx, 'magicCircle', 'idle', spin, c.x, c.y, Math.max(1, Math.round(c.r * 2 / 32)),
      { center: true, alpha: fade, solid: c.color, scaleY: 0.42 });
  });
}

/* Thụ động vẽ SAU pháp sư (không cần lớp mặt đất): đóng băng (quầng lạnh + bông tuyết bay quanh quái), bỏng
   (flam nhỏ lặp cạnh quái khi st.burn), khiên (nổi 1 lần rồi giữ khung cuối, neo chân — không lặp nhấp nháy,
   review #6), buff Ôn từ (aura lặp quanh pháp sư khi ui.buff, review #8). */
function drawBossPassiveFx(ctx, fx, st, ui, now) {
  const t = now / 1000, q = fx.layout.mon, m = fx.layout.mage;
  if (st.frozen) {
    ctx.globalAlpha = 0.35; ctx.fillStyle = '#bff4ff';   // quầng lạnh quanh quái (thân quái do drawBossMonsterSprite vẽ)
    ctx.beginPath(); ctx.ellipse(q.x, q.y - q.s * 0.32, q.s * 0.4, q.s * 0.24, 0, 0, 6.283); ctx.fill();
    ctx.globalAlpha = 1;
    drawSprite(ctx, 'iceFlake', 'cycle', t, q.x + Math.cos(t * 1.6) * q.s * 0.3, q.y - q.s * 0.55 + Math.sin(t * 1.6) * q.s * 0.12, Math.max(1, q.k), { center: true, alpha: 0.85 });
  }
  if (st.burn) {
    drawSprite(ctx, 'flam', 'cycle', t, q.x + q.s * 0.22, q.y - q.s * 0.55, (bossVfxScale('flam', q.s, 0.45)), { center: true, alpha: 0.8 });
  }
  if (st.shield > 0) {
    if (!fx.actor.shieldAt) fx.actor.shieldAt = now;   // mốc lúc CÓ khiên (lazy — không đụng logic trận), rise 1 lần
    drawSprite(ctx, 'shieldSprite', 'idle', (now - fx.actor.shieldAt) / 1000, m.x + m.s * 0.22, m.y, (bossVfxScale('shieldSprite', m.s)), { alpha: 0.95 });
  } else fx.actor.shieldAt = 0;
  if (ui && ui.buff) {
    drawSprite(ctx, 'auraSprite', 'idle', t, m.x, m.y - m.s * 0.5, (bossVfxScale('auraSprite', m.s)), { center: true, alpha: 0.55 });
  }
}

/* Vẽ sau ctx.restore() (không bị rung/zoom) — cắt cảnh phủ toàn màn. Chân dung = Faceset 38×38, đặt góc dưới-trái
   nhỏ (không đè lên tên chiêu giữa màn — review #13, trước đó chân dung to/giữa trùng vùng chữ trên màn hẹp
   390×340). Reduced-motion: chân dung đứng yên, không trượt vào (review #12). */
function drawBossUltimateCutscene(ctx, fx, ui, now) {
  const u = fx.ultimate;
  if (!u) return;
  const w = ui.w, h = ui.h, k = Math.min(1, (u.max - u.life) / 0.3), fade = Math.min(1, u.life / 0.3);
  const inOut = Math.min(k, fade);
  ctx.globalAlpha = 0.55 * inOut; ctx.fillStyle = '#050212'; ctx.fillRect(0, 0, w, h); ctx.globalAlpha = 1;
  const slide = fx.reduced ? 0 : (1 - k) * -w * 0.3, faceName = ui.gender === 'm' ? 'mageMFace' : 'mageFFace';
  const fs = pixelScale(Math.min(h, w) * 0.24, 38);
  drawSprite(ctx, faceName, 'idle', 0, w * 0.16 + slide, h * 0.86, fs, { center: true, alpha: inOut });
  ctx.globalAlpha = inOut; ctx.textAlign = 'center'; ctx.fillStyle = u.color;
  ctx.font = '800 34px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif';
  ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.strokeText(u.name, w / 2, h * 0.42);
  ctx.fillText(u.name, w / 2, h * 0.42);
  if (u.id === 'iceAge' && !fx.reduced) {   // sương phủ toàn màn — bỏ hẳn khi giảm chuyển động
    ctx.fillStyle = 'rgba(210,245,255,.25)'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(w * 0.5, h * 0.3); ctx.lineTo(w * 0.46, h * 0.5); ctx.lineTo(w * 0.53, h * 0.62); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

if (typeof module !== 'undefined') module.exports = { bossFxSpawnCircle, bossMonsterLiftPx };
