/* Game Pháp Sư Lexoria — lớp môi trường động vẽ MỖI KHUNG trên sân đấu (khác nền tĩnh boss-game-arena.js, build
   offscreen 1 lần). Đọc BOSS_MONSTER_ARENAS[monster.id].anim/ambient/light (boss-game-arena-layouts.js) qua arena
   đã resolve (bossArenaFor). Hai lớp, gọi rời ở boss-game-render.js:
   'back'  = tile hoạt hình vị trí CỐ ĐỊNH (hoa/cờ/cối xay/thác nước) — sau nền, trước nhân vật, KHÔNG tắt khi
             reduced-motion (chuyển động nhỏ tại chỗ, không gây chóng mặt).
   'front' = hạt thời tiết bay (lá/tuyết/mưa/tàn lửa/sương/mây) — sau nhân vật, trước HUD; trần BOSS_AMBIENT_MAX
             hạt, TẮT HẲN khi reduced-motion, quality<1 → vẽ nửa số hạt (bỏ hạt lẻ, không đổi state).
   Thuần (chạy Node để test) trừ drawBossAmbient (đụng ctx canvas, chỉ chạy khi gọi, cần boss-game-sprite-atlas.js). */

const BOSS_AMBIENT_MAX = 40, BOSS_AMBIENT_BAND_MAX = 4;

/* kind → sprite (BOSS_SPRITES/BOSS_EXTRA_SPRITES) + kiểu chuyển động. band = dải lớn trôi ngang chậm (sương/mây/
   tia sáng, ít con vì ảnh to); còn lại = hạt nhỏ rơi/bay có vận tốc riêng theo trục. */
/* mul = hệ số nhân với worldK (layout.k, cùng lưới pixel nền/nhân vật) để ra scale NGUYÊN thật (review M2: trước
   đây scale cố định 1.1–1.6 không theo worldK → lệch lưới pixel (nhoè cạnh) và quá nhỏ trên màn desktop k lớn).
   review QA (tester 260925-1528): mul cũ (1.4–1.6) × fw/fh thật của sprite hạt (8–12px) × k (2–6) ra hạt tới
   ~40px (≈0.8× pháp sư, m.s = 16×k) — che tên chiêu/số dame/nửa quái ở mật độ cao (oblivion 0.9). Hạ mul theo
   TỪNG sprite sao cho cỡ hiển thị (fw|fh lớn nhất × mul × k) ≈ 0.3–0.4× m.s = 0.3–0.4×16k = 4.8–6.4k. */
const BOSS_AMBIENT_KIND = {
  leaf: { sprite: 'windLeaf', vy: [14, 26], vx: [-18, 18], mul: 0.45 },          // windLeaf 12×7 → ~5.4k
  leafPink: { sprite: 'particleLeafPink', vy: [12, 22], vx: [-14, 14], mul: 0.45 }, // 12×7 → ~5.4k
  snow: { sprite: 'particleSnow', vy: [8, 18], vx: [-6, 6], mul: 0.65 },         // 8×8 → ~5.2k
  rain: { sprite: 'particleRain', vy: [220, 320], vx: [-4, 4], mul: 0.65 },      // 8×8 → ~5.2k
  ember: { sprite: 'particleFire', vy: [-46, -22], vx: [-8, 8], mul: 0.45 },     // 8×12 → ~5.4k
  fog: { sprite: 'fog', band: true, vx: [8, 14], alpha: 0.32, mul: 1 },         // dải phủ trời, không phải hạt — giữ nguyên
  clouds: { sprite: 'particleClouds', band: true, vx: [4, 9], alpha: 0.45, mul: 1.1 },
  raylight: { sprite: 'raylight', band: true, vx: [2, 4], alpha: 0.5, mul: 1 }
};

/* Giả ngẫu nhiên tất định theo chỉ số hạt (rebuild cùng cỡ khung không nhảy hình, cùng kiểu bossArenaHash) */
function bossAmbientRand(seed) { const n = Math.sin(seed * 91.7 + 12.9) * 43758.5453; return n - Math.floor(n); }

/* Tile hoạt hình vị trí cố định (arena.anim), toạ độ px tính 1 lần theo w/h hiện tại. a[2] = phân số y THƯỜNG,
   HOẶC chuỗi 'stackDown' → xếp khít ngay dưới đáy tile ngay trước đó trong mảng (y = đáy tile trước + fh×scale
   tile này — drawSprite/boss-game-sprite-atlas.js neo (x,y) ở ĐÁY khung, xem translate(x, y-h/2)). Dùng cho thác
   nước 3 tầng (wyvern, boss-game-arena-layouts.js): trước đây 3 mốc % cố định không khớp đúng fh×scale thật →
   hở/lệch tuỳ chiều cao khung; xếp theo fh×scale thì luôn khít bất kể k hay w/h. */
function bossAmbientBack(arena, w, h, layout) {
  const k = (layout && layout.k) || 2;
  let prevBottom = null;
  return (arena.anim || []).map(a => {
    const scale = a[3] || k;
    const fh = (typeof BOSS_SPRITES !== 'undefined' && BOSS_SPRITES[a[0]] && BOSS_SPRITES[a[0]].fh) || 16;
    const y = (a[2] === 'stackDown' && prevBottom != null) ? prevBottom + fh * scale : Math.round(a[2] * h);
    prevBottom = y;
    return { sprite: a[0], x: Math.round(a[1] * w), y, scale };
  });
}

/* 1 hạt thời tiết mới tại chỉ số i (band: dải theo 1/3 chiều cao xen kẽ; hạt thường: rải đều toàn khung).
   k = worldK (layout.k) → scale nguyên ≥1, cỡ hạt theo đúng lưới pixel nền (review M2). */
function bossAmbientSpawn(kind, cfg, i, w, h, k) {
  const rx = bossAmbientRand(i), ry = bossAmbientRand(i + 500), rs = bossAmbientRand(i + 900);
  // phase: lệch mốc thời gian animation riêng từng hạt (review QA: trước đây mọi hạt dùng chung ui.time →
  // nhấp nháy/đổi khung đồng loạt cùng lúc, trông giả). Nhân 8 giây cho đủ lệch pha rõ với anim fps 10–16.
  const p = { kind, scale: Math.max(1, Math.round((k || 1) * cfg.mul)), phase: bossAmbientRand(i + 2100) * 8 };
  if (cfg.band) {
    p.x = rx * w; p.y = (i % 3) * h / 3 + ry * h / 3; p.vx = cfg.vx[0] + rs * (cfg.vx[1] - cfg.vx[0]); p.alpha = cfg.alpha;
  } else {
    p.x = rx * w; p.y = ry * h; p.vy = cfg.vy[0] + rs * (cfg.vy[1] - cfg.vy[0]);
    p.vx = cfg.vx[0] + bossAmbientRand(i + 1300) * (cfg.vx[1] - cfg.vx[0]);
  }
  return p;
}

/* → { back[], front[], w, h, reduced }. reduced-motion → front rỗng (tắt hẳn thời tiết động, giữ tile nền). */
function createBossAmbient(arena, w, h, layout, reduced) {
  const back = bossAmbientBack(arena, w, h, layout), front = [], k = (layout && layout.k) || 1;
  if (!reduced && arena.ambient) {
    const cfg = BOSS_AMBIENT_KIND[arena.ambient.kind];
    if (cfg) {
      const density = Math.max(0, Math.min(1, arena.ambient.density != null ? arena.ambient.density : 0.5));
      const n = Math.max(1, Math.round((cfg.band ? BOSS_AMBIENT_BAND_MAX : BOSS_AMBIENT_MAX) * density));
      for (let i = 0; i < n; i++) front.push(bossAmbientSpawn(arena.ambient.kind, cfg, i, w, h, k));
    }
  }
  if (!reduced && arena.light && BOSS_AMBIENT_KIND[arena.light] && (!arena.ambient || arena.ambient.kind !== arena.light)) {
    const cfg = BOSS_AMBIENT_KIND[arena.light];
    for (let i = 0; i < 2; i++) front.push(bossAmbientSpawn(arena.light, cfg, i + 4000, w, h, k));
  }
  return { back, front, w, h, reduced: !!reduced };
}

/* dt giây thật (ambient không theo st.timeScale — thời tiết vẫn trôi đều lúc trùm bị chậm thời gian) */
function stepBossAmbient(amb, dt) {
  const d = Math.max(0, Math.min(0.1, dt || 0));
  for (const p of amb.front) {
    p.x += (p.vx || 0) * d;
    if (p.vy != null) {   // hạt rơi/bay: vòng lặp vô hạn cả 2 trục khi ra khỏi khung
      p.y += p.vy * d;
      if (p.y > amb.h + 10) p.y = -10; else if (p.y < -10) p.y = amb.h + 10;
      if (p.x > amb.w + 10) p.x = -10; else if (p.x < -10) p.x = amb.w + 10;
    } else if (p.x > amb.w + 40) p.x = -40; else if (p.x < -40) p.x = amb.w + 40;   // dải trôi ngang: chỉ cuộn x
  }
}

/* layer 'back' (t = giây game, cho spriteFrame lặp) | 'front' (hạt thời tiết; quality<1 → bỏ hạt lẻ, vẽ nửa) */
function drawBossAmbient(ctx, amb, t, layer, quality) {
  if (!amb) return;
  if (layer === 'back') { amb.back.forEach(b => drawSprite(ctx, b.sprite, 'idle', t, b.x, b.y, b.scale)); return; }
  const half = quality != null && quality < 1;
  amb.front.forEach((p, i) => {
    if (half && i % 2) return;
    const cfg = BOSS_AMBIENT_KIND[p.kind];
    if (!cfg) return;
    ctx.globalAlpha = cfg.alpha != null ? cfg.alpha : 1;
    drawSprite(ctx, cfg.sprite, 'idle', t + (p.phase || 0), p.x, p.y, p.scale, { center: true });
  });
  ctx.globalAlpha = 1;
}

if (typeof module !== 'undefined') {
  module.exports = { BOSS_AMBIENT_MAX, BOSS_AMBIENT_BAND_MAX, BOSS_AMBIENT_KIND, createBossAmbient, stepBossAmbient, drawBossAmbient };
}
