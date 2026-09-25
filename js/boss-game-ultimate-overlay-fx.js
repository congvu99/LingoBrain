/* Game Pháp Sư Lexoria — lớp phủ tuyệt kỹ thêm (Fog/Raylight phủ + hạt rơi + vòng dưới chân quái), plan
   260925-1445 phase 3. Đọc trường overlay/rain/ground/anchor mới trên BOSS_ULTIMATE_PRESETS
   (js/boss-game-spell-presets.js) theo fx.ultimate đang chạy (js/boss-game-tier3-ultimate-fx.js:bossFxUltimateEvent).
   Vẽ TỪ BÊN TRONG drawBossPassiveFx (tier3-ultimate-fx.js) — nằm TRONG khối ctx rung/zoom, TRƯỚC ctx.restore(),
   nên luôn ở DƯỚI HUD/chữ gõ (drawBossHud vẽ SAU khi restore, xem boss-game-render.js) — không cần lo che chữ.
   Tắt hẳn khi prefers-reduced-motion (fx.reduced, xem createBossFx) — mọi hạt vị trí tính trực tiếp theo
   fx.ultimate.life + seed theo chỉ số hạt (không giữ state riêng) nên không cần vòng lặp vật lý; step chỉ giữ để
   đối xứng quy ước các module fx khác (stepBossTier3Fx…), hiện là no-op thật sự. */

/* alpha luôn ≤ 0.5 (yêu cầu risk assessment phase 3 — không được che HUD/chữ gõ dù vẽ dưới lớp), nhạt dần về cuối
   thời lượng tuyệt kỹ; u.max luôn > 0 (BOSS_TUNING.ultimateMs cố định) nên không chia cho 0 → không NaN. */
function bossUltimateOverlayAlpha(u) {
  if (!u || !u.max) return 0;
  return Math.min(0.5, 0.15 + Math.max(0, u.life / u.max) * 0.35);
}

/* Vị trí hạt rơi lặp tuần hoàn quanh quái tại thời điểm t (giây, đếm từ lúc mở tuyệt kỹ) — suy trực tiếp từ seed
   theo chỉ số hạt bằng phép chia dư, không có state để không rò rỉ bộ nhớ suốt trận (nhiều tuyệt kỹ liên tiếp). */
function bossUltimateOverlayRainPos(q, seed, t) {
  const span = Math.max(1, q.s * 2.2);
  const x = q.x + (((seed * 13 + t * 260) % span) - span / 2);
  const y = (q.y - q.s * 1.4) + (((seed * 31 + t * 900) % (q.s * 2.4 || 1)) );
  return { x, y };
}

function stepBossUltimateOverlayFx(fx, dtReal) { /* thuần thời gian, không state riêng — xem ghi chú đầu file */ }

const BOSS_ULTIMATE_OVERLAY_RAIN_N = 7;

function bossUltimateOverlayDrawRain(ctx, q, key, t, alpha) {
  for (let i = 0; i < BOSS_ULTIMATE_OVERLAY_RAIN_N; i++) {
    const pos = bossUltimateOverlayRainPos(q, i * 53.7, t);
    drawSprite(ctx, key, 'idle', t + i, pos.x, pos.y, Math.max(1, q.k), { center: true, alpha });
  }
}

function bossUltimateOverlayDrawLayer(ctx, fx, ui, key, anchor, t, alpha) {
  const def = BOSS_SPRITES[key];
  if (!def) return;
  if (anchor === 'mage') {
    const m = fx.layout.mage;
    drawSprite(ctx, key, 'idle', t, m.x, m.y - m.s * 1.1, Math.max(1, Math.round(m.s * 1.6 / def.fh)), { center: true, alpha });
    return;
  }
  const w = (ui && ui.w) || fx.layout.mon.s * 6, h = (ui && ui.h) || fx.layout.mon.s * 4;
  drawSprite(ctx, key, 'idle', t, w / 2, h * 0.42, Math.max(1, Math.round(w / def.fw)), { center: true, alpha: alpha * 0.85 });
}

function bossUltimateOverlayDrawGround(ctx, q, key, t, alpha) {
  const def = BOSS_SPRITES[key];
  if (!def) return;
  drawSprite(ctx, key, 'idle', t, q.x, q.y - q.s * 0.08, Math.max(1, Math.round(q.s * 0.7 / def.fh)), { center: true, alpha });
}

/* Gọi cuối drawBossPassiveFx (tier3-ultimate-fx.js) — vẽ đủ overlay/rain/ground của preset đang chạy theo
   fx.ultimate.id; im lặng (không vẽ gì) khi không có tuyệt kỹ đang chạy hoặc đang giảm chuyển động. */
function drawBossUltimateOverlayFx(ctx, fx, ui, now) {
  const u = fx.ultimate;
  if (!u || fx.reduced) return;
  const P = typeof BOSS_ULTIMATE_PRESETS !== 'undefined' && BOSS_ULTIMATE_PRESETS[u.id];
  if (!P) return;
  const q = fx.layout.mon, t = u.max - u.life, alpha = bossUltimateOverlayAlpha(u);
  if (alpha <= 0) return;
  if (P.overlay) bossUltimateOverlayDrawLayer(ctx, fx, ui, P.overlay, P.anchor, t, alpha);
  if (P.rain) bossUltimateOverlayDrawRain(ctx, q, P.rain, t, alpha);
  if (P.ground) bossUltimateOverlayDrawGround(ctx, q, P.ground, t, alpha);
}

if (typeof module !== 'undefined') module.exports = {
  bossUltimateOverlayAlpha, bossUltimateOverlayRainPos, stepBossUltimateOverlayFx, drawBossUltimateOverlayFx
};
