/* Game Pháp Sư Lexoria — FX riêng của 35 chiêu tự phát: tên chiêu nổi lên (float text) lúc niệm + 1 VFX sprite
   phụ chồng lên preset hệ×bậc bình thường lúc phép chạm. Nạp SAU js/boss-game-skill-roster.js (BOSS_SKILL_FX) +
   js/boss-game-spell-art.js (bossBurst/bossFxText) + js/boss-game-sprite-actors.js (bossSpawnSprite/bossVfxScale).
   Gọi từ js/boss-game-result-ui.js (bossUiEvents), KHÔNG từ boss-game-spell-art.js (file đó vẽ preset hệ×bậc
   chung, không phải FX riêng từng chiêu). Chỉ đọc st.events qua e — không tự quyết thời điểm. */

/* 'cast' mang e.skill (id) khi bossPickSkill chọn được chiêu KHÁC basic (basic không có FX riêng — dùng nguyên
   preset hệ×bậc, xem js/boss-game-spell-presets.js) — nổi tên chiêu cạnh pháp sư + burst nhẹ tại đầu trượng.
   e.skillName (bossResolveSkillCast, js/boss-game-skill-pick.js) = tên chiêu ĐÃ ghi đè theo dạng tiến hoá nếu
   có — ưu tiên hiện tên này thay vì tên gốc cố định BOSS_SKILL_FX[e.skill].text (fx/màu vẫn theo id gốc, chỉ
   chữ nổi lên đổi tên). */
function bossSkillFxCastEvent(fx, e) {
  const d = BOSS_SKILL_FX[e.skill];
  if (!d) return;
  const m = fx.layout.mage, tip = bossMageCastPoint(m);
  if (d.castBurst) bossBurst(fx, tip.x, tip.y, d.castBurst);
  bossFxText(fx, m.x, m.y - m.s * 1.35, e.skillName || d.text, d.color, 14);
}

/* 'impact' mang e.skill khi pendingImpact đó do chiêu gây ra (boss-game-logic.js castComplete gắn skill vào
   pendingImpacts) — spawn thêm 1 VFX sprite tại quái, lệch nhẹ để không đè khít VFX hệ×bậc đã có. */
function bossSkillFxImpactEvent(fx, e) {
  const d = BOSS_SKILL_FX[e.skill];
  if (!d || !d.impactSprite) return;
  const q = fx.layout.mon, s = d.impactSprite, name = s.name;
  if (typeof BOSS_SPRITES === 'undefined' || !BOSS_SPRITES[name]) return;
  const scale = typeof bossVfxScale === 'function' ? bossVfxScale(name, q.s, 1) : 1;
  bossSpawnSprite(fx, name, q.x + q.s * 0.16, q.y - q.s * 0.55, scale, { delay: 0.05 });
}

/* Điểm vào duy nhất — gọi cho MỌI event trong boss-game-result-ui.js (bỏ qua event không liên quan chiêu). */
function bossSkillFxEvent(fx, e) {
  if (e.type === 'cast' && e.skill) bossSkillFxCastEvent(fx, e);
  else if (e.type === 'impact' && e.skill) bossSkillFxImpactEvent(fx, e);
}

if (typeof module !== 'undefined') module.exports = { bossSkillFxEvent };
