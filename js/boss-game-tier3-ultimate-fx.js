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
  // perfect = gõ trọn HẾT từ trong chuỗi (e.perfect, tính ở bossEndChain theo hits — KHÔNG theo k, xem
  // boss-game-combo-chain.js) — bonus rank3/evo có thể đẩy k qua 1.5 dù gõ thiếu từ, không được phép giả mạo nhãn
  fx.ultimate = { id: e.id, name: u.name, color: u.color, life: ultS, max: ultS, perfect: !!e.perfect };
  if (!fx.reduced) fx.shake = Math.max(fx.shake, u.shake);
  if (!fx.reduced) { fx.flash = Math.max(fx.flash, u.flash); fx.flashColor = u.color; }   // giảm chuyển động: bỏ loé toàn màn
  const q = fx.layout.mon, m = fx.layout.mage;
  // meteor/chain: số quả/đòn theo hệ số chuỗi niệm (bossUltBoostCount), thay preset.hits cố định cũ; e.boosted
  // (dạng tiến hoá cấp 16 cộng thêm k) đổi công thức làm tròn sang ceil để luôn có tác dụng, xem bossUltBoostCount
  const hits = (e.id === 'meteor' || e.id === 'chain') && typeof bossUltBoostCount === 'function' ? bossUltBoostCount(e.k || 1, e.boosted) : u.hits;
  // Nhịp cắt cảnh: 0..T0 chỉ tên chiêu trên nền tối (drawBossUltimateCutscene), VFX chạy SAU đó, anim chậm
  // (rate) và to ~1.8× quái — trước đây VFX ×1 (~16×28px) nổ cùng lúc với tên dưới lớp tối 55% nên không thấy gì.
  const T0 = BOSS_ULT_INTRO_S, rate = fx.reduced ? 1 : BOSS_ULT_ANIM_RATE, big = (name, s) => bossUltVfxScale(name, s || q.s);
  // khoảng cách giữa n lượt VFX (anim `name`, thêm `pre` giây trước đó) — ≤ cap nhưng nén lại để lượt CUỐI xong trước
  // khi cắt cảnh hết (k cao → 5–6 quả/tia; trước đây rải cố định nên nổ đè lên từ gõ tiếp theo sau cắt cảnh)
  const gap = (name, n, cap, pre) => n > 1 ? Math.min(cap, Math.max(0.05, (ultS - 0.1 - T0 - (pre || 0) - bossSpriteAnimSec(name) / rate) / (n - 1))) : 0;
  if (e.id === 'meteor') {   // Fireball ×hits rơi chéo (vx/vy thật) + Explosion lớn lúc chạm, rải đều qua cắt cảnh
    const dur = 0.45, g = gap(u.bigSprite, hits, 0.35, dur);
    for (let i = 0; i < hits; i++) {
      const ex = q.x + (i - (hits - 1) / 2) * q.s * 0.3, ey = q.y - q.s * 0.45, delay = T0 + i * g;
      if (fx.reduced) {   // không rơi — chỉ nổ tại chỗ, lệch nhẹ độ trễ
        bossSpawnSprite(fx, u.bigSprite, ex, ey, big(u.bigSprite), { delay });
      } else {
        const sx = ex - q.s * 0.5, sy = q.y - q.s * 3;
        bossSpawnSprite(fx, u.sprite, sx, sy, big(u.sprite), { delay, vel: { vx: (ex - sx) / dur, vy: (ey - sy) / dur }, life: dur });
        bossSpawnSprite(fx, u.bigSprite, ex, ey, big(u.bigSprite), { delay: delay + dur, rate });
      }
    }
  } else if (e.id === 'chain') {   // Thiên Lôi giáng hits lần nối nhau quanh quái, mỗi tia cách nhau rõ ràng
    const g = gap(u.sprite, hits, 0.4);
    for (let i = 0; i < hits; i++) {
      bossSpawnSprite(fx, u.sprite, q.x + (i - (hits - 1) / 2) * q.s * 0.4, q.y - q.s * 0.7, big(u.sprite), { delay: T0 + i * g, rate });
    }
  } else if (e.id === 'revive') {
    // boost là anim một lượt (~0.6s) → bùng 3 lần nối nhau + vòng sáng (u.halo) quanh pháp sư suốt cắt cảnh
    for (let i = 0, g = gap(u.sprite, 3, 0.6); i < 3; i++) bossSpawnSprite(fx, u.sprite, m.x, m.y - m.s * 0.6, big(u.sprite, m.s), { delay: T0 + i * g, rate });
    if (u.halo) bossSpawnSprite(fx, u.halo, m.x, m.y - m.s * 0.55, big(u.halo, m.s), { delay: T0, life: ultS - T0 - 0.2 });
    bossBurst(fx, m.x, m.y - m.s * 0.5, { kind: 'orb', speed: 120, life: 1.6, size: 4, colors: ['#fff4c2', '#ffe08a'], drag: 1.2, g: -60, n: 26 });
  } else if (e.id === 'tornado') {   // lốc lớn dưới quái, sống suốt ultimateMs + tự "bay theo" quái bị nâng (bossMonsterLiftPx)
    bossSpawnSprite(fx, u.sprite, q.x, q.y - q.s * 0.45, big(u.sprite), { vel: { follow: true }, life: ultS, anim: 'cycle' });
    // khói lốc mờ, đứng riêng khó thấy → thêm xoáy chém (u.swirl) cuộn quanh quái suốt cắt cảnh
    for (let i = 0; u.swirl && i < 4; i++) {
      bossSpawnSprite(fx, u.swirl, q.x + (i % 2 ? 1 : -1) * q.s * 0.12, q.y - q.s * (0.35 + i * 0.12), big(u.swirl), { delay: T0 + i * 0.45, rate, vel: { follow: true } });
    }
  } else {   // iceAge: cột băng dưới quái, chậm, giữ khung cuối tới gần hết cắt cảnh (review #5)
    bossSpawnSprite(fx, u.sprite, q.x, q.y - q.s * 0.5, big(u.sprite), { delay: T0, rate, life: (ultS - T0 - 0.2) * rate });
  }
}

const BOSS_ULT_INTRO_S = 0.6, BOSS_ULT_ANIM_RATE = 0.55;   // giây hiện tên trước VFX; tốc độ anim VFX tuyệt kỹ

/* Thời lượng 1 lượt anim idle (giây, tốc độ gốc) — thiếu dữ liệu → 0.5s */
function bossSpriteAnimSec(name) {
  const a = BOSS_SPRITES[name] && BOSS_SPRITES[name].anims && BOSS_SPRITES[name].anims.idle;
  return a ? (a.frames || 1) / (a.fps || 12) : 0.5;
}

/* Cỡ VFX tuyệt kỹ ~1.8× cạnh quái (hoặc pháp sư) theo cạnh DÀI của khung (smokeCircular 30×14 nằm ngang) */
function bossUltVfxScale(name, s) {
  const def = BOSS_SPRITES[name];
  return pixelScale(s * 1.8, Math.max((def && def.fw) || 32, bossVfxFh(name)));
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
  if (typeof stepBossUltimateOverlayFx === 'function') stepBossUltimateOverlayFx(fx, dtReal);   // lớp phủ thêm (phase 3, js/boss-game-ultimate-overlay-fx.js)
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
  // lớp phủ tuyệt kỹ thêm (Fog/Raylight/hạt rơi/vòng dưới quái) — vẽ CUỐI, vẫn trong khối rung/zoom nên dưới HUD
  if (typeof drawBossUltimateOverlayFx === 'function') drawBossUltimateOverlayFx(ctx, fx, ui, now);
}

/* Vẽ sau ctx.restore() (không bị rung/zoom) — cắt cảnh phủ toàn màn. Chân dung = Faceset 38×38, đặt góc dưới-trái
   nhỏ (không đè lên tên chiêu giữa màn — review #13, trước đó chân dung to/giữa trùng vùng chữ trên màn hẹp
   390×340). Reduced-motion: chân dung đứng yên, không trượt vào (review #12). */
function drawBossUltimateCutscene(ctx, fx, ui, now) {
  const u = fx.ultimate;
  if (!u) return;
  const w = ui.w, h = ui.h, k = Math.min(1, (u.max - u.life) / 0.3), fade = Math.min(1, u.life / 0.3);
  const inOut = Math.min(k, fade);
  // sau phần giới thiệu (BOSS_ULT_INTRO_S): nền tối nhạt 0.55 → 0.12 và tên thu nhỏ lên trên để lộ VFX ở quái
  const out = Math.min(1, Math.max(0, (u.max - u.life - BOSS_ULT_INTRO_S) / 0.3));
  ctx.globalAlpha = (0.55 - 0.43 * out) * inOut; ctx.fillStyle = '#050212'; ctx.fillRect(0, 0, w, h); ctx.globalAlpha = 1;
  // Chân dung cắt cảnh: dùng faceset dạng tiến hoá đang dùng nếu có (ui.st.mageFace, đặt ở boss-game-ui.js), rơi
  // về faceset gốc theo giới tính khi ở dạng gốc (mageFace rỗng/không có)
  const slide = fx.reduced ? 0 : (1 - k) * -w * 0.3, faceName = (ui.st && ui.st.mageFace) || (ui.gender === 'm' ? 'mageMFace' : 'mageFFace');
  const fs = pixelScale(Math.min(h, w) * 0.24, 38);
  drawSprite(ctx, faceName, 'idle', 0, w * 0.16 + slide, h * 0.86, fs, { center: true, alpha: inOut * (1 - out) });   // mờ sau giới thiệu: che pháp sư (Hồi Sinh vẽ ở đó)
  // tên: giữa màn → dải trên, 34px → 22px; không lên cao hơn đáy HUD trên cùng (màn thấp ~340px)
  const fz = Math.round(34 - 12 * out), hudB = typeof BOSS_TOP_HUD_BOTTOM === 'number' ? BOSS_TOP_HUD_BOTTOM : 46;
  const ty = Math.max(hudB + fz + 4, h * (0.42 - 0.26 * out));
  ctx.globalAlpha = inOut; ctx.textAlign = 'center'; ctx.fillStyle = u.color;
  ctx.font = '800 ' + fz + 'px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif';
  ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.strokeText(u.name, w / 2, ty);
  ctx.fillText(u.name, w / 2, ty);
  if (u.perfect) {   // chuỗi niệm gõ trọn hết từ (k = 1.5)
    ctx.font = '800 16px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif';
    ctx.strokeText('HOÀN HẢO', w / 2, ty + fz * 0.7); ctx.fillText('HOÀN HẢO', w / 2, ty + fz * 0.7);
  }
  if (u.id === 'iceAge' && !fx.reduced) {   // sương phủ toàn màn — bỏ hẳn khi giảm chuyển động
    ctx.fillStyle = 'rgba(210,245,255,' + (0.25 - 0.15 * out) + ')'; ctx.fillRect(0, 0, w, h);   // nhạt đi khi VFX chạy
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(w * 0.5, h * 0.3); ctx.lineTo(w * 0.46, h * 0.5); ctx.lineTo(w * 0.53, h * 0.62); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

if (typeof module !== 'undefined') module.exports = { bossFxSpawnCircle, bossMonsterLiftPx };
