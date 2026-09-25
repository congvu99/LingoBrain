/* Game Pháp Sư Lexoria — ghép một khung hình từ state trận (boss-game-logic.js) + fx (boss-game-spell-art.js).
   Chỉ vẽ, không đổi state. Mọi vùng/quái/pháp sư giờ đều là sân tile + sprite (phase 3–5 xoá hết vẽ tay).
   Nền build offscreen 1 lần/đổi cỡ (boss-game-arena.js); ảnh tile chưa nạp xong → tạm phẳng 1 màu (không ném lỗi).
   Quái + pháp sư vẽ bằng boss-game-sprite-actors.js; sprite chưa nạp xong → bỏ qua vẽ lượt đó (không throw, không
   còn phương án vẽ tay dự phòng — mọi ảnh đã precache trong sw.js nên gần như không xảy ra).
   Chậm thời gian: k = mức chậm 0..1 → zoom tới 1.06 về phía pháp sư, lớp xám + viền tối.
   Trận đồ (magic circle, lớp mặt đất — vẽ TRƯỚC pháp sư) + VFX tuyệt kỹ/thụ động/cắt cảnh nằm ở
   js/boss-game-tier3-ultimate-fx.js — gọi qua hook drawBossGroundFx, drawBossPassiveFx (trong khối rung/zoom) và
   drawBossUltimateCutscene (sau khi bỏ transform, phủ toàn màn). */

const BOSS_HEART = '❤️', BOSS_HEART_EMPTY = '🖤';

/* Vị trí pháp sư và quái theo cỡ khung; ghi vào fx.layout để hiệu ứng dùng chung toạ độ. Góc Pokémon cố định:
   pháp sư quay lưng dưới-trái, quái quay mặt trên-phải. k = hệ số phóng nguyên (chung với tile nền, xem
   bossWorldScale), s = chiều cao hiển thị (px).
   fh lấy từ chính sprite quái (16 quái thường, 40–82 trùm có sheet riêng, tổng khung với Oblivion ghép mảnh)
   để trùm to hơn quái thường theo đúng tỉ lệ ảnh gốc, không bị kéo méo. */
function layoutBoss(fx, w, h, ui) {
  const mon = ui && ui.monster, def = mon && BOSS_SPRITES[mon.sprite];
  const isOblivion = mon && mon.sprite === 'oblivion';
  const fh = isOblivion ? BOSS_OBLIVION_HEIGHT : (def && def.fh) || 16;
  // Trùm đổi sang sheet Hit/Attack lúc trận (thường cao hơn Idle, ví dụ TenguBlue Attack 82 > Idle 68) — lấy
  // khung cao nhất trong 3 sheet để kẹp k, tránh đỉnh đầu tràn lên HUD đúng lúc đang ra đòn/trúng đòn.
  const fhMax = isOblivion ? fh : Math.max(fh,
    (mon && BOSS_SPRITES[mon.spriteHit] && BOSS_SPRITES[mon.spriteHit].fh) || 0,
    (mon && BOSS_SPRITES[mon.spriteAttack] && BOSS_SPRITES[mon.spriteAttack].fh) || 0);
  const monY = Math.round(h * 0.52), k = bossWorldScale(h);
  // Quái dùng chung k với nền/pháp sư (trùm to hơn nhờ fh gốc lớn hơn). Trùm cao (Oblivion ghép mảnh, sheet Attack)
  // ở khung thấp → hạ k tới khi khung cao nhất vẫn vừa dưới HUD, chấp nhận lệch lưới 1 bậc thay vì tràn lên trên.
  let kq = k;
  while (kq > 1 && fhMax * kq > monY - h * 0.14) kq--;
  fx.layout.k = k;
  fx.layout.mage = { x: Math.round(w * 0.22), y: Math.round(h * 0.86), s: 16 * k, k };
  fx.layout.mon = { x: Math.round(w * 0.7), y: monY, s: fh * kq, k: kq,
    sprite: mon && mon.sprite, spriteHit: mon && mon.spriteHit, spriteAttack: mon && mon.spriteAttack };
}

function slowAmount(st) { return Math.max(0, Math.min(1, (1 - st.timeScale) / (1 - BOSS_TUNING.slowScale))); }

/* Nền vùng: build offscreen 1 lần khi đổi cỡ/DPR/vùng, sau đó chỉ drawImage lại mỗi khung hình (rẻ).
   Tile chưa nạp xong ảnh → phẳng 1 màu (dải trời cuối cùng của vùng) để không vẽ hỏng/ném lỗi. */
function drawBossRegion(ctx, ui, w, h) {
  const fx = ui.fx, region = ui.region, A = region && BOSS_ARENAS[region.id];
  if (!A || !BOSS_ARENA_SPRITES.every(bossSpriteReady)) {
    ctx.fillStyle = (A && A.sky[A.sky.length - 1]) || '#161022';
    ctx.fillRect(0, 0, w, h);
    return;
  }
  if (!fx.bg || fx.bgW !== w || fx.bgH !== h || fx.bgDpr !== ui.dpr || fx.bgRegion !== region.id) {
    fx.bg = buildBossArena(region.id, w, h, ui.dpr || 1, fx.layout);
    fx.bgW = w; fx.bgH = h; fx.bgDpr = ui.dpr; fx.bgRegion = region.id;
  }
  if (fx.bg) ctx.drawImage(fx.bg, 0, 0, w, h);
}

/* Thanh tấn công của trùm (st.threat, 0..1), vẽ ngay dưới chân sprite quái (fx.layout.mon):
   > 0,75 → nhấp nháy đỏ; > 0,9 → rung nhẹ (tắt khi ui.fx.reduced); đang đóng băng → tô xanh băng, không rung. */
function drawBossThreatBar(ctx, st, fx, now) {
  const q = fx.layout.mon, bw = Math.max(46, Math.round(q.s * 0.85)), k = Math.max(0, Math.min(1, st.threat));
  const danger = k > 0.75 && !st.frozen, shake = k > 0.9 && !st.frozen && !fx.reduced;
  const jx = shake ? (Math.random() - 0.5) * 2 : 0, jy = shake ? (Math.random() - 0.5) * 2 : 0;
  const x = Math.round(q.x - bw / 2 + jx), y = Math.round(q.y + Math.max(4, q.k * 2) + jy);
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(x, y, bw, 5);
  ctx.fillStyle = st.frozen ? '#9fe8ff' : danger ? (Math.floor(now / 160) % 2 ? '#ff3b3b' : '#ff9a9a') : '#f5c25b';
  ctx.fillRect(x, y, Math.round(bw * k), 5);
}

function drawRuneCircle(ctx, st, fx) {
  const m = fx.layout.mage, total = Math.max.apply(null, st.targets.map(t => t.length)), lit = st.typed.length;
  if (!lit && !fx.typo) return;
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < total; i++) {
    const p = bossRuneAt(m, i, total), on = i < lit;
    ctx.globalAlpha = on ? 1 : 0.25;
    ctx.fillStyle = fx.typo > 0 && i === lit ? '#ff4d4d' : on ? '#ffe9a8' : '#8a7fb8';
    bossPixelDot(ctx, p.x, p.y, (m.k || 1) * (on ? 2 : 1.25));   // theo lưới pixel của pháp sư
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}

function drawBossHud(ctx, st, ui, now) {
  const w = ui.w, pad = 10, bw = Math.min(220, w * 0.48), k = st.hp / st.hpMax;
  const comboOn = st.combo >= 2, ultW = BOSS_TUNING.ultMax * 13 + 6 + (comboOn ? 70 : 0);
  ctx.fillStyle = 'rgba(20,12,30,.55)';   // trời sân tile sáng: nền tối sau HUD cho chữ/ô tuyệt kỹ đọc được
  ctx.fillRect(pad - 4, pad - 4, ultW, 40); ctx.fillRect(w - pad - bw - 4, pad - 4, bw + 8, 34);
  ctx.font = '700 13px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif';
  ctx.textAlign = 'right'; ctx.fillStyle = '#f3e9ff'; ctx.fillText(ui.monsterName, w - pad, pad + 12);
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(w - pad - bw, pad + 18, bw, 10);
  ctx.fillStyle = k > 0.3 ? '#e04f6f' : '#ff2d2d'; ctx.fillRect(w - pad - bw, pad + 18, bw * k, 10);
  ctx.fillStyle = '#fff'; ctx.font = '600 10px ui-monospace,Menlo,Consolas,monospace';
  ctx.fillText(Math.ceil(st.hp) + '/' + st.hpMax, w - pad - 3, pad + 27);
  ctx.textAlign = 'left'; ctx.font = '16px -apple-system,"Segoe UI Emoji",sans-serif';
  ctx.fillText(BOSS_HEART.repeat(Math.max(0, st.hearts)) + BOSS_HEART_EMPTY.repeat(Math.max(0, st.heartsMax - st.hearts)) +
    (st.shield ? ' 🛡️' : ''), pad, pad + 16);
  const ultFull = st.ult >= BOSS_TUNING.ultMax, glow = ultFull ? 0.5 + 0.5 * Math.sin(now / 130) : 0;
  const ultCooling = !!(st.ultCooldownUntil && now < st.ultCooldownUntil);   // hồi chiêu: tô xám mờ, không tính đầy/rung
  for (let i = 0; i < BOSS_TUNING.ultMax; i++) {   // thanh tuyệt kỹ: ultMax ô — đầy thì rung nhẹ + sáng nhấp nháy
    ctx.fillStyle = ultCooling ? 'rgba(150,150,165,.35)' : i < st.ult ? (ultFull ? (glow > 0.5 ? '#fff6c2' : '#ffd23f') : '#ff8a3c') : 'rgba(255,255,255,.15)';
    const jitter = ultFull && !ultCooling && !ui.fx.reduced ? Math.sin(now / 45 + i) * 1.2 : 0;
    ctx.fillRect(pad + i * 13, pad + 24 + jitter, 10, 6);
  }
  if (comboOn) {   // "COMBO ×n" ngay cạnh thanh tuyệt kỹ, ẩn khi combo < 2
    ctx.textAlign = 'left'; ctx.fillStyle = '#ffd23f'; ctx.font = '700 12px ui-monospace,Menlo,Consolas,monospace';
    ctx.fillText('COMBO ×' + st.combo, pad + BOSS_TUNING.ultMax * 13 + 10, pad + 30);
  }
  if (ui.showFps) {
    ctx.fillStyle = '#9f9'; ctx.font = '11px ui-monospace,monospace';
    ctx.fillText(Math.round(ui.fps) + ' fps · ' + ui.fx.ps.n + ' hạt · q ' + ui.quality, pad, ui.h - 8);
  }
}

/* Chế độ chuỗi niệm: thanh thời gian chainMs (đếm ngược) + chainWords chấm tiến độ + đề đang chờ gõ, giữa màn phía trên.
   x/y/bw tính ở bossChainHudLayout (boss-game-combo-chain.js, thuần) — đặt HẲN dưới khối HUD trên cùng (ô tuyệt
   kỹ/tim/tên quái) để không đè nhau ở khung hẹp ~360px. */
function drawBossChainHud(ctx, st, ui, now) {
  const c = st.chain, w = ui.w, L = bossChainHudLayout(w), bw = L.bw, x = L.x, y = L.y;
  const remain = Math.max(0, Math.min(1, (c.until - now) / BOSS_TUNING.chainMs));
  ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(x, y, bw, 8);
  ctx.fillStyle = '#b06bff'; ctx.fillRect(x, y, bw * remain, 8);
  const n = BOSS_TUNING.chainWords, dot = 10, gap = 8, total = dot * n + gap * (n - 1), dx = w / 2 - total / 2;
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = i < c.hits ? '#ffd23f' : 'rgba(255,255,255,.25)';
    ctx.beginPath(); ctx.arc(dx + i * (dot + gap) + dot / 2, y + 20, dot / 2, 0, 6.283); ctx.fill();
  }
  ctx.textAlign = 'center'; ctx.fillStyle = '#f3e9ff'; ctx.font = '700 13px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif';
  ctx.fillText('CHUỖI NIỆM · ' + (c.words[c.i] ? c.words[c.i].prompt : ''), w / 2, y - 6);
}

/* ui = {w, h, time (giây game), gender, monsterName, fps, showFps, quality, fx}; now = ms thật */
function drawBossScene(ctx, st, ui, now) {
  const fx = ui.fx, w = ui.w, h = ui.h, m = fx.layout.mage, k = slowAmount(st);
  ctx.save();
  if (fx.shake) ctx.translate((Math.random() - 0.5) * fx.shake, (Math.random() - 0.5) * fx.shake);
  const z = 1 + 0.06 * k, zx = m.x, zy = m.y - m.s * 0.5;
  if (z !== 1) { ctx.translate(zx, zy); ctx.scale(z, z); ctx.translate(-zx, -zy); }
  drawBossRegion(ctx, ui, w, h);
  if (typeof drawBossGroundFx === 'function') drawBossGroundFx(ctx, fx);   // trận đồ — lớp mặt đất, vẽ trước pháp sư (review #7)
  const lift = typeof bossMonsterLiftPx === 'function' ? bossMonsterLiftPx(fx) : 0;
  ctx.save(); if (lift) ctx.translate(0, -lift);
  drawBossMonsterSprite(ctx, fx, st, ui.time);   // sprite chưa nạp → tự bỏ qua, không văng lỗi
  ctx.restore();
  if (st.phase === 'play') drawBossThreatBar(ctx, st, fx, now);   // ẩn sau khi thắng/thua, khỏi đè lên khung kết trận
  drawBossMageSprite(ctx, fx, st, ui.gender, ui.time);   // sprite chưa nạp → tự bỏ qua, không văng lỗi
  drawRuneCircle(ctx, st, fx);
  drawBossSpriteFx(ctx, fx);
  drawBossFx(ctx, fx, ui.quality);
  if (typeof drawBossPassiveFx === 'function') drawBossPassiveFx(ctx, fx, st, ui, now);   // đóng băng/bỏng/khiên/buff Ôn từ
  ctx.restore();
  if (k > 0.01) {   // hậu kỳ chậm thời gian: nhạt màu + viền tối
    ctx.fillStyle = 'rgba(40,36,60,' + (0.22 * k) + ')'; ctx.fillRect(0, 0, w, h);
    const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,' + (0.55 * k) + ')');
    ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
  }
  if (fx.flash > 0) { ctx.globalAlpha = Math.min(0.6, fx.flash); ctx.fillStyle = fx.flashColor; ctx.fillRect(0, 0, w, h); ctx.globalAlpha = 1; }
  drawBossHud(ctx, st, ui, now);
  if (st.chain) drawBossChainHud(ctx, st, ui, now);
  if (typeof drawBossUltimateCutscene === 'function') drawBossUltimateCutscene(ctx, fx, ui, now);   // cắt cảnh tuyệt kỹ, phủ cả HUD
}
