/* Game Pháp Sư Lexoria — FX riêng của 35 chiêu tự phát: tên chiêu nổi lên (float text) + burst nhẹ lúc niệm.
   VFX va chạm/đạn riêng từng chiêu nằm ở js/boss-game-skill-visuals.js (BOSS_SKILL_VISUALS). Nạp SAU
   js/boss-game-skill-roster.js (BOSS_SKILL_FX) +
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

/* VFX va chạm riêng từng chiêu (đạn/impact sprite thật) nay ở js/boss-game-skill-visuals.js (BOSS_SKILL_VISUALS,
   đọc trực tiếp bởi bossActorEvent, boss-game-sprite-actors.js) — file này chỉ còn lo tên chiêu nổi lên lúc niệm,
   không vẽ thêm lớp impact nào nữa (tránh chồng 2 lớp, phase 2 plan 260925-1445). */

/* Điểm vào duy nhất — gọi cho MỌI event trong boss-game-result-ui.js (bỏ qua event không liên quan chiêu). */
function bossSkillFxEvent(fx, e) {
  if (e.type === 'cast' && e.skill) bossSkillFxCastEvent(fx, e);
}

if (typeof module !== 'undefined') module.exports = { bossSkillFxEvent };
