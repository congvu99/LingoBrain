/* Game Pháp Sư Lexoria — "Sổ chiêu": liệt kê 7 chiêu tự phát của hệ đang chọn (icon, tên, điều kiện, khoá/mở
   theo cấp). Cần js/boss-game-skill-roster.js (BOSS_SKILLS/BOSS_SKILL_UNLOCK_LEVEL/BOSS_SKILL_SLOTS),
   js/boss-game-progress.js (levelFromXp), js/boss-game-hub-ui.js (startBossHub) nạp trước. */

const BOSS_SKILL_SLOT_LABEL = {
  basic: 'Mọi từ', combo3: 'Combo vừa chạm bội số 3', long: 'Từ ≥ 8 chữ', fast: 'Gõ tốc độ ×2',
  combo6: 'Combo vừa chạm bội số 6', execute: 'Quái dưới 30% HP', counter: 'Cast đầu sau khi bị đánh trúng'
};

/* Tóm tắt hiệu ứng bằng chữ (không lộ số cân bằng chi tiết trong BOSS_TUNING, chỉ nêu LOẠI hiệu ứng) */
function bossSkillEffectSummary(effect) {
  const parts = [];
  if (effect.dmgMul) parts.push('sát thương ×' + effect.dmgMul);
  if (effect.extraHits) parts.push('+' + effect.extraHits + ' đòn phụ');
  if (effect.crit) parts.push('chí mạng');
  if (effect.burn) parts.push('thiêu đốt');
  if (effect.freeze) parts.push('đóng băng ' + effect.freeze.sec + 's');
  if (effect.threatDrainMul) parts.push('giảm thanh quái ×' + effect.threatDrainMul);
  if (effect.shield) parts.push('+' + effect.shield + ' khiên');
  if (effect.heal) parts.push('+' + effect.heal + ' ❤️');
  if (effect.ultAdd) parts.push('+' + effect.ultAdd + ' thanh tuyệt kỹ');
  return parts.length ? parts.join(' · ') : 'sát thương phép thường';
}

function bossSkillRowHtml(el, slot, level, skills) {
  const skill = skills[slot], need = BOSS_SKILL_UNLOCK_LEVEL[slot], unlocked = level >= need;
  return '<div class="boss-skill-row" data-locked="' + !unlocked + '">' +
    '<img class="boss-skill-icon" src="' + esc(skill.icon) + '" alt="" aria-hidden="true">' +
    '<div class="boss-skill-info"><b class="serif">' + esc(skill.name) + '</b>' +
    '<span class="small muted">' + esc(BOSS_SKILL_SLOT_LABEL[slot]) + ' · ' + esc(bossSkillEffectSummary(skill.effect)) + '</span></div>' +
    '<span class="mono small boss-skill-lv">' + (unlocked ? 'Mở' : 'Cấp ' + need) + '</span></div>';
}

function renderSkillBook() {
  // Dùng bảng chiêu của ĐÚNG dạng tiến hoá đang dùng (bossActiveForm, đủ cấp) — dạng nào ghi đè slot nào thì Sổ
  // chiêu hiện tên/hiệu ứng đã nâng cấp, không phải bảng gốc BOSS_SKILLS cố định.
  const lv = levelFromXp(bossProg.xp), el = bossProg.element.v;
  const form = bossActiveForm(bossProg.evo, el, lv);
  const skills = bossSkillsFor(el, BOSS_EVO[el][form], BOSS_SKILLS[el]);
  $('#app').innerHTML = '<div class="card page boss-skill-book">' +
    '<div class="game-head"><button class="btn-sm btn-ghost" id="bossSkillBookBack" aria-label="về sảnh">←</button>' +
      '<b class="serif">📖 Sổ chiêu · ' + esc(ELEMENT_LABEL[el] || el) + '</b><span class="spacer"></span>' +
      '<span class="mono small">Cấp ' + lv + '</span></div>' +
    '<div class="boss-skill-list">' + BOSS_SKILL_SLOTS.map(slot => bossSkillRowHtml(el, slot, lv, skills)).join('') + '</div>' +
    '<p class="small muted">Mỗi từ niệm chỉ ra tối đa 1 chiêu đặc biệt (ưu tiên: nguy cấp > phản đòn > combo lớn > từ dài > gõ nhanh > combo nhỏ > chiêu thường).</p></div>';
  $('#bossSkillBookBack').onclick = () => startBossHub();
}
