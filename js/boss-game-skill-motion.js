/* Game Pháp Sư Lexoria — module quỹ đạo đạn phép (6 kiểu). Tách khỏi drawBossShotSprite cũ
   (boss-game-sprite-actors.js) để mỗi chiêu chọn quỹ đạo riêng (phase 2, xem plans/…/phase-02-…).
   Bất biến bắt buộc: bossShotPos(s, 1) LUÔN = (s.x1, s.y1) — đạn phải chạm quái đúng lúc, mọi kiểu.
   Trường trên shot (fx.shots, gán ở boss-game-spell-art.js khi 'cast'):
     x0,y0,x1,y1: điểm xuất phát/đích (world px) — x1,y1 luôn là điểm chạm quái thật.
     motion: 1 trong BOSS_MOTIONS, mặc định 'arc' nếu thiếu (giữ hình basic hiện tại).
     h: chỉ số quả đạn trong cùng lượt niệm (0-based, dùng cho fan lệch góc + Xích sét nhiều quả).
     hits: tổng số quả đạn trong lượt niệm này (dùng cùng h để canh giữa cho fan).
     reduced: cờ prefers-reduced-motion tại lúc niệm (fx.reduced) — sky/fan bay dài đổi thành straight.
     mageS: chiều cao pháp sư lúc niệm (dùng làm mốc cỡ, xem drawBossShotSprite). */

const BOSS_MOTIONS = ['arc', 'straight', 'sky', 'ground', 'fan', 'spin'];

const BOSS_ARC_H = 30;              // biên độ vòng cung (px) — công thức gốc drawBossShotSprite cũ
const BOSS_SKY_DROP = 240;          // độ cao rơi của quỹ đạo 'sky' (px)
const BOSS_FAN_SPREAD = 0.55;       // rad lệch góc mỗi bậc chỉ số quả đạn (fan)
const BOSS_SPIN_OMEGA = Math.PI * 7; // tốc độ tự xoay của sprite khi motion = 'spin' (rad/s), riêng với hướng bay

/* motion thật sự dùng để tính quỹ đạo: mặc định 'arc'; reduced-motion đổi sky/fan (bay dài, dễ chóng mặt)
   thành 'straight' (nổ thẳng tới đích, không lượn) — giữ nguyên spin/ground/straight/arc. */
function bossEffectiveMotion(s) {
  const m = s.motion || 'arc';
  if (s.reduced && (m === 'sky' || m === 'fan')) return 'straight';
  return m;
}

/* Control point bezier bậc 2 của quỹ đạo 'fan': lệch vuông góc đường thẳng x0,y0→x1,y1 theo chỉ số quả đạn h,
   canh giữa quanh 0 bằng (hits-1)/2 để cả chùm toả đều hai bên rồi hội tụ đúng x1,y1 tại k=1. */
function bossFanControl(s) {
  const n = Math.max(1, s.hits || 1), h = s.h || 0, centered = h - (n - 1) / 2;
  const lineA = Math.atan2(s.y1 - s.y0, s.x1 - s.x0) || 0, dist = Math.hypot(s.x1 - s.x0, s.y1 - s.y0) || 1;
  const ctrlA = lineA + centered * BOSS_FAN_SPREAD, ctrlD = dist * 0.5;
  return { x: s.x0 + Math.cos(ctrlA) * ctrlD, y: s.y0 + Math.sin(ctrlA) * ctrlD };
}

/* Điểm rơi xuất phát của quỹ đạo 'sky': trên trời, hơi lệch ngang so với đích (mageS làm mốc cỡ vì đó là
   trường có sẵn trên shot; không dùng x0,y0 vì 'sky' không xuất phát từ tay pháp sư). */
function bossSkyStart(s) {
  const off = (s.mageS || 32) * 0.6;
  return { x: s.x1 - off, y: s.y1 - BOSS_SKY_DROP };
}

/* Vị trí đạn tại tiến độ k (0..1, k=0 lúc niệm xong bắt đầu bay, k=1 lúc chạm — xem BOSS_TUNING.impactMs). */
function bossShotPos(s, k) {
  const m = bossEffectiveMotion(s);
  if (m === 'straight') {
    const e = k * k;   // easing nhanh dần (ease-in) — khác cảm giác với arc/fan dù cùng đường thẳng
    return { x: s.x0 + (s.x1 - s.x0) * e, y: s.y0 + (s.y1 - s.y0) * e };
  }
  if (m === 'sky') {
    const st = bossSkyStart(s), e = k * k;
    return { x: st.x + (s.x1 - st.x) * e, y: st.y + (s.y1 - st.y) * e };
  }
  if (m === 'ground') return { x: s.x1, y: s.y1 };   // ẩn tới k=1 (xem drawBossFx) — vị trí thật không cần lượn
  if (m === 'fan') {
    const c = bossFanControl(s), mk = 1 - k;
    return { x: mk * mk * s.x0 + 2 * mk * k * c.x + k * k * s.x1, y: mk * mk * s.y0 + 2 * mk * k * c.y + k * k * s.y1 };
  }
  // 'arc' và 'spin' (spin bay như arc, chỉ khác cách sprite tự xoay — xem bossShotDir/drawBossShotSprite)
  return { x: s.x0 + (s.x1 - s.x0) * k, y: s.y0 + (s.y1 - s.y0) * k - Math.sin(k * Math.PI) * BOSS_ARC_H };
}

/* Hướng bay tại k (rad, atan2) — đạo hàm giải tích của bossShotPos theo k, dùng xoay sprite có "đầu" rõ
   (def.rotOffset, xem drawBossShotSprite). Luôn hữu hạn: rơi về atan2(y1-y0, x1-x0) khi vector đạo hàm ~0. */
function bossShotDir(s, k) {
  const m = bossEffectiveMotion(s);
  const fallback = () => Math.atan2(s.y1 - s.y0, s.x1 - s.x0) || 0;
  if (m === 'straight' || m === 'ground') return fallback();
  if (m === 'sky') { const st = bossSkyStart(s); return Math.atan2(s.y1 - st.y, s.x1 - st.x) || fallback(); }
  if (m === 'fan') {
    const c = bossFanControl(s), mk = 1 - k;
    const dx = 2 * mk * (c.x - s.x0) + 2 * k * (s.x1 - c.x), dy = 2 * mk * (c.y - s.y0) + 2 * k * (s.y1 - c.y);
    return (dx || dy) ? Math.atan2(dy, dx) : fallback();
  }
  // 'arc'/'spin': đạo hàm của x0+(x1-x0)k, y0+(y1-y0)k−sin(kπ)·H là (x1-x0, (y1-y0)−cos(kπ)·π·H)
  const dx = s.x1 - s.x0, dy = (s.y1 - s.y0) - Math.cos(k * Math.PI) * Math.PI * BOSS_ARC_H;
  return (dx || dy) ? Math.atan2(dy, dx) : fallback();
}

/* Đạn sprite dọc quỹ đạo bossShotPos; xoay theo bossShotDir CHỈ khi def có rotOffset (hình có "đầu" rõ, vd
   fireball hướng lên/iceSpikeProj nằm ngang; xoáy gió spiritProj không xoay theo hướng). motion='spin' bỏ qua
   rotOffset, tự xoay liên tục theo BOSS_SPIN_OMEGA (như shuriken/lá xoay tít bất kể hướng bay).
   Cỡ theo fh THẬT (bossVfxFh, boss-game-sprite-actors.js) — trước hardcode 16 khiến spiritProj to gấp đôi. */
/* Tra BOSS_SKILL_VISUALS (js/boss-game-skill-visuals.js) theo id chiêu; evolved=true (dạng tiến hoá đang active
   ghi đè slot đó, xem js/boss-game-skill-pick.js:bossSkillEvolved) → đọc thêm BOSS_EVO_SKILL_VISUALS[skillId]:
   {extends:true, scale, addImpact} = kế thừa bản gốc (nhân scale, nối thêm addImpact vào impact[]) hoặc schema
   đầy đủ (không extends) = thay HẲN bản gốc. Không có mục evo cho id đó → rơi về bản gốc (chưa mọi chiêu đều có
   nâng cấp riêng, xem BOSS_EVO — chỉ slot nào bị ghi đè ở ≥1 dạng mới cần mục evo).
   null khi không có chiêu (basic) hoặc chưa nạp dữ liệu (giữ hình basic hiện tại, không ném lỗi). */
function bossSkillVisualFor(skillId, evolved) {
  if (!skillId || typeof BOSS_SKILL_VISUALS === 'undefined') return null;
  const base = BOSS_SKILL_VISUALS[skillId] || null;
  if (!evolved || typeof BOSS_EVO_SKILL_VISUALS === 'undefined') return base;
  const evo = BOSS_EVO_SKILL_VISUALS[skillId];
  if (!evo) return base;
  if (!evo.extends) return evo;
  if (!base) return evo;
  return Object.assign({}, base, {
    scale: (base.scale || 1) * (evo.scale || 1),
    impact: (base.impact || []).concat(evo.addImpact || [])
  });
}

function drawBossShotSprite(ctx, s, x, y, k) {
  const def = BOSS_SPRITES[s.sprite];
  // Cỡ theo chiều cao pháp sư (cùng lưới pixel với cảnh): size preset 8/12/16+ ≈ 1×/1.25×/1.5× pháp sư, không vượt 1.5×
  // Chặn sau làm tròn theo cạnh DÀI của khung (đạn xoay theo hướng bay, vd iceSpikeProj 18×10 nằm ngang).
  const mageS = s.mageS || 32, target = Math.min(1.5, 0.5 + s.p.projectile.size / 16) * mageS;
  const cap = Math.max(1, Math.floor(1.5 * mageS / Math.max((def && def.fw) || 0, bossVfxFh(s.sprite))));
  const scale = Math.min(cap, Math.max(1, Math.round(pixelScale(target, bossVfxFh(s.sprite)) * s.scale)));
  const opt = { center: true };
  if (s.motion === 'spin') opt.rot = s.t * BOSS_SPIN_OMEGA;
  else if (def && def.rotOffset != null) opt.rot = bossShotDir(s, k) + def.rotOffset;
  return drawSprite(ctx, s.sprite, 'idle', s.t, x, y, scale, opt);
}
