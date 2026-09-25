/* Game Pháp Sư Lexoria — VFX riêng từng quái lúc ra đòn trúng pháp sư (event 'hurt'/'shieldBlock', xem
   js/boss-game-logic.js:187 bossEmit hạ tim). Trước đây chỉ có lunge (bossActorEvent, boss-game-sprite-actors.js)
   — không đạn bay riêng, nổ THẲNG tại pháp sư cùng lúc lunge để tránh lệch thời điểm với lúc trừ tim (YAGNI:
   không thêm event telegraph). Quái có sheet Attack thật (TenguBlue/wyvern, GiantRacoon/goblinKing) vẫn giữ
   nguyên anim Attack ở bossMonSpriteVariant — VFX ở đây là LỚP CỘNG THÊM, không thay thế.
   id quái = js/boss-game-story.js BOSS_MONSTERS (12 quái thật, không phải tên hiển thị/sprite atlas). */

const BOSS_MONSTER_ATTACK_FX = {
  goblin: { impact: ['water'], at: 'mage', scale: 0.8 },                        // Slime Xanh — tát nước
  wolf: { impact: ['claw'], at: 'mage', scale: 0.8 },                           // Gấu Mèo Cướp — cào
  goblinKing: { impact: ['clawDouble', 'rockImpact'], at: 'mage', scale: 1 },   // Vua Gấu Mèo — cào đôi + đá văng
  skeleton: { impact: ['spiritBlue'], at: 'mage', scale: 0.8 },                 // Đầu Lâu — luồng hồn xanh
  ghost: { impact: ['spiritBlue', 'smoke'], at: 'mage', scale: 0.7 },           // Hồn Ma — hồn xanh + khói tan
  lich: { impact: ['spiritDouble', 'fog'], at: 'mage', scale: 0.85 },           // Hồn Ma Chúa — hồn đôi + sương ngắn
  troll: { impact: ['rockSpike'], at: 'mageFeet', scale: 0.8 },                 // Chuột Chũi Đá — gai đá dưới chân
  harpy: { impact: ['cut'], at: 'mage', scale: 0.8 },                          // Cú Đêm — móng vuốt xé
  wyvern: { impact: ['slashDoubleCurved'], at: 'mage', scale: 0.8 },           // Thiên Cẩu — chém cong đôi
  darkKnight: { impact: ['flam'], at: 'mage', scale: 0.8 },                    // Linh Hồn Lửa — bùng lửa
  youngDragon: { impact: ['fireball', 'explosion'], at: 'mage', scale: 0.6 },  // Rồng Con — cầu lửa ngắn + nổ nhỏ
  oblivion: { impact: ['explosion', 'thunder'], at: 'mage', scale: 0.7 }       // Oblivion — nổ + sét
};

/* Điểm vào duy nhất — gọi cho MỌI event trong bossUiEvents (js/boss-game-result-ui.js), bỏ qua event khác/quái
   không có mục (id lạ/thiếu dữ liệu → no-op, giữ hành vi cũ chỉ lunge). Trần cỡ VFX 1.0×m.s (review QA tester
   260925-1528: trần 0.8× cũ + scale 0.6-0.8 của claw/spirit làm goblinKing/lich gần như không thấy VFX lúc trúng
   đòn; nới lên 1.0× vẫn không che kín pháp sư vì VFX neo tâm quanh vai/chân, không phủ cả khung) — ÁP DỤNG BẤT KỂ
   `vfx` riêng của sprite (vd fog=3 dùng cho lớp ambient phủ màn ở phase 5 sẽ to hơn nhiều nếu không chặn ở đây),
   không chỉ dựa vào field `scale` trong dữ liệu ở trên. */
function bossMonsterAttackFxEvent(fx, e, monsterId) {
  if (e.type !== 'hurt' && e.type !== 'shieldBlock') return;
  const d = BOSS_MONSTER_ATTACK_FX[monsterId];
  if (!d || typeof BOSS_SPRITES === 'undefined') return;
  const m = fx.layout.mage, n = d.impact.length;
  const baseY = d.at === 'mageFeet' ? m.y : m.y - m.s * 0.5;
  d.impact.forEach((name, i) => {
    if (!BOSS_SPRITES[name]) return;
    const raw = typeof bossVfxScale === 'function' ? bossVfxScale(name, m.s, d.scale || 1) : 1;
    const cap = typeof bossVfxScale === 'function' ? bossVfxScale(name, m.s * 1.0, 1) : raw;
    const scale = Math.min(raw, cap);
    const x = m.x + (i - (n - 1) / 2) * m.s * 0.16, y = baseY - i * m.s * 0.05;
    bossSpawnSprite(fx, name, x, y, scale, { delay: i * 0.05 });
  });
}

if (typeof module !== 'undefined') module.exports = { BOSS_MONSTER_ATTACK_FX, bossMonsterAttackFxEvent };
