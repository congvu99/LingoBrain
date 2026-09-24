/* Game Pháp Sư Lexoria — nền 4 vùng, vẽ 1 lần vào canvas offscreen theo cỡ khung + DPR (chỉ vẽ lại khi resize).
   buildRegionBackdrop(region, w, h, dpr) → HTMLCanvasElement đã vẽ sẵn; boss-game-render.js drawImage lại mỗi khung
   hình (rẻ, không tính toán lại gradient/hình). region = 1 phần tử BOSS_REGIONS (boss-game-story.js). */

function buildRegionBackdrop(region, w, h, dpr) {
  const off = document.createElement('canvas');
  off.width = Math.max(1, Math.round(w * (dpr || 1)));
  off.height = Math.max(1, Math.round(h * (dpr || 1)));
  const ctx = off.getContext('2d');
  ctx.scale(dpr || 1, dpr || 1);
  (BOSS_SCENE_PAINTERS[region && region.id] || bossPaintAshford)(ctx, w, h, region);
  return off;
}

/* Làng Ashford — hoàng hôn tím cam, mái nhà lô nhô, vài ô cửa sổ sáng đèn */
function bossPaintAshford(ctx, w, h, region) {
  const sky = region.sky, g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, sky[0]); g.addColorStop(0.55, sky[1]); g.addColorStop(1, sky[2]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255,240,200,.85)';   // mặt trời lặn
  ctx.beginPath(); ctx.arc(w * 0.78, h * 0.22, Math.min(w, h) * 0.07, 0, 6.283); ctx.fill();
  const horizon = h * 0.66;
  ctx.fillStyle = region.ground; ctx.fillRect(0, horizon, w, h - horizon);
  ctx.fillStyle = '#1a1226';   // mái nhà lô nhô (răng cưa)
  const roofY = horizon - h * 0.05, n = 6, rw = w / n;
  ctx.beginPath(); ctx.moveTo(0, horizon);
  for (let i = 0; i <= n; i++) { const x = i * rw; ctx.lineTo(x, i % 2 ? roofY : roofY - h * 0.05); }
  ctx.lineTo(w, horizon); ctx.closePath(); ctx.fill();
  ctx.fillStyle = region.accent;   // đèn cửa sổ
  for (let i = 0; i < n; i++) { if (i % 2) continue; ctx.fillRect(i * rw + rw * 0.35, roofY + h * 0.01, w * 0.02, w * 0.02); }
}

/* Hầm mộ — đá tối, hàng nến cháy hai bên, sương mờ dưới chân */
function bossPaintCatacombs(ctx, w, h, region) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, region.sky[0]); g.addColorStop(1, region.sky[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#2f2b3a';   // khối đá lát tường xa
  for (let i = 0; i < 5; i++) ctx.fillRect((i / 5) * w, h * 0.1, w / 5 - 4, h * 0.42);
  const horizon = h * 0.7;
  ctx.fillStyle = region.ground; ctx.fillRect(0, horizon, w, h - horizon);
  const candleX = [w * 0.12, w * 0.32, w * 0.68, w * 0.88];
  candleX.forEach(x => {   // nến: thân + quầng sáng
    const y = horizon - h * 0.02;
    const gl = ctx.createRadialGradient(x, y - h * 0.05, 0, x, y - h * 0.05, h * 0.12);
    gl.addColorStop(0, 'rgba(255,200,120,.5)'); gl.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = gl; ctx.fillRect(x - h * 0.12, y - h * 0.17, h * 0.24, h * 0.24);
    ctx.fillStyle = '#d8cfae'; ctx.fillRect(x - 3, y - h * 0.06, 6, h * 0.06);
    ctx.fillStyle = region.accent; ctx.beginPath(); ctx.ellipse(x, y - h * 0.07, 3, 6, 0, 0, 6.283); ctx.fill();
  });
  ctx.fillStyle = 'rgba(200,200,220,.06)'; ctx.fillRect(0, horizon - h * 0.06, w, h * 0.1);   // sương mờ ngang mặt đất
}

/* Núi đá — trời xanh nhạt nhiều mây, vách đá răng cưa xám */
function bossPaintCliffs(ctx, w, h, region) {
  const sky = region.sky, g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, sky[0]); g.addColorStop(0.6, sky[1]); g.addColorStop(1, sky[2]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255,255,255,.75)';   // mây
  [[0.18, 0.18, 0.09], [0.55, 0.12, 0.07], [0.82, 0.24, 0.08], [0.36, 0.3, 0.06]].forEach(([cx, cy, cr]) => {
    const r = Math.min(w, h) * cr; ctx.beginPath();
    ctx.ellipse(w * cx, h * cy, r * 1.5, r * 0.7, 0, 0, 6.283);
    ctx.ellipse(w * cx + r, h * cy + r * 0.15, r, r * 0.6, 0, 0, 6.283); ctx.fill();
  });
  const horizon = h * 0.68;
  ctx.fillStyle = region.ground;
  ctx.beginPath(); ctx.moveTo(0, h);
  for (let i = 0; i <= 8; i++) ctx.lineTo((i / 8) * w, horizon + (i % 2 ? h * 0.05 : -h * 0.04));
  ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = region.accent; ctx.globalAlpha = 0.3; ctx.lineWidth = 2;
  for (let i = 1; i < 8; i += 2) { ctx.beginPath(); ctx.moveTo((i / 8) * w, horizon - h * 0.04); ctx.lineTo((i / 8) * w - w * 0.02, h); ctx.stroke(); }
  ctx.globalAlpha = 1;
}

/* Hang rồng — đỏ cam tối, hồ dung nham phát sáng, mạch vàng chạy trên vách */
function bossPaintDragonlair(ctx, w, h, region) {
  const sky = region.sky, g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, sky[0]); g.addColorStop(0.6, sky[1]); g.addColorStop(1, sky[2]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#120705';   // vách hang tối phía trên
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w, 0); ctx.lineTo(w * 0.9, h * 0.3); ctx.lineTo(w * 0.6, h * 0.12);
  ctx.lineTo(w * 0.3, h * 0.28); ctx.lineTo(0, h * 0.1); ctx.closePath(); ctx.fill();
  const horizon = h * 0.72;
  ctx.fillStyle = region.ground; ctx.fillRect(0, horizon, w, h - horizon);
  const lava = ctx.createLinearGradient(0, horizon - h * 0.06, 0, h);   // dòng dung nham phát sáng ở mép nền
  lava.addColorStop(0, region.accent); lava.addColorStop(1, 'rgba(255,60,20,0)');
  ctx.fillStyle = lava; ctx.fillRect(0, horizon - h * 0.05, w, h * 0.1);
  ctx.strokeStyle = 'rgba(255,190,90,.55)'; ctx.lineWidth = 2;   // mạch vàng trên vách
  [0.15, 0.45, 0.75].forEach(x0 => { ctx.beginPath(); ctx.moveTo(w * x0, 0);
    ctx.quadraticCurveTo(w * x0 + w * 0.05, h * 0.15, w * x0 - w * 0.02, h * 0.3); ctx.stroke(); });
}

const BOSS_SCENE_PAINTERS = { ashford: bossPaintAshford, catacombs: bossPaintCatacombs, cliffs: bossPaintCliffs, dragonlair: bossPaintDragonlair };
