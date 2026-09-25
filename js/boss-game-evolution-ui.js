/* Game Pháp Sư Lexoria — màn "Tiến hoá" (DOM): cây gốc→a|b (cấp 8)→a1|a2|b1|b2 (cấp 16) của hệ ĐANG CHỌN
   (bossProg.element.v). Khoá/mở theo cấp (bossEvoUnlocked); đổi tự do giữa mọi dạng đã mở, kể cả quay lại dạng
   gốc — chạm 1 lần là lưu ngay (không có nút "Xác nhận" riêng, giống cây kỹ năng skill-tree-ui.js).
   Lưu qua saveBoss() — ĐÚNG đường lưu/đồng bộ dùng chung mọi trường boss khác (sanitizePayload/cleanBoss lo lọc
   dữ liệu rác phía server, KHÔNG tự ghi localStorage riêng ở đây).
   Cần js/boss-game-evolution-forms.js (BOSS_EVO), js/boss-game-evolution-sprites.js (BOSS_EVO_SPRITES, faceset),
   js/boss-game-evolution.js (bossEvoUnlocked/bossActiveForm), js/boss-game-elements.js (ELEMENT_LABEL),
   js/boss-game-skill-book-ui.js (BOSS_SKILL_SLOT_LABEL, bossSkillEffectSummary),
   js/boss-game-hub-ui.js (startBossHub), js/app-storage.js (bossMarkEvoNoticeSeen) nạp trước. */

/* 1 nút cây: formId === '' là dạng gốc (luôn mở, không có faceset riêng — dùng icon hệ thay cho gọn) */
function bossEvoNodeHtml(el, formId, level, activeV) {
  const form = formId ? BOSS_EVO[el][formId] : null;
  const unlocked = bossEvoUnlocked(el, formId, level);
  const active = activeV === formId;
  const face = form && BOSS_EVO_SPRITES[form.face];
  const icon = face ? face.src : ('img/boss/fx/icon-' + el + '.png');
  return '<button class="boss-evo-node" data-form="' + esc(formId) + '" data-state="' + (active ? 'active' : unlocked ? 'open' : 'locked') + '"' +
    (unlocked ? '' : ' disabled') + '>' +
    '<img class="boss-evo-icon" src="' + esc(icon) + '" alt="" aria-hidden="true">' +
    '<b class="serif small">' + esc(form ? form.name : 'Dạng gốc') + '</b>' +
    '<span class="mono small">' + (active ? 'Đang dùng' : unlocked ? 'Chọn' : 'Cấp ' + form.level) + '</span></button>';
}

/* Nhãn ngắn cho modifier duy nhất của mỗi dạng (mods luôn có đúng 1 khoá, xem boss-game-evolution-forms.js). */
function bossEvoStatLabel(mods) {
  const LABEL = {
    dmgMul: v => 'Sát thương +' + Math.round(v * 100) + '%', clockAdd: v => 'Đồng hồ trùm +' + v + 's',
    speedLoosen: v => 'Nới mốc tốc độ +' + v, maxHeartsAdd: v => '+' + v + ' ❤️ tối đa', shield: v => '+' + v + ' khiên khởi đầu'
  };
  const k = Object.keys(mods || {})[0];
  return k ? (LABEL[k] ? LABEL[k](mods[k]) : k + ' +' + mods[k]) : '';
}

/* Khối chi tiết dưới mỗi nút: chỉ số dạng + tên/hiệu ứng 2 chiêu nâng cấp (bossSkillEffectSummary/
   BOSS_SKILL_SLOT_LABEL, js/boss-game-skill-book-ui.js) — rỗng cho dạng gốc (không có form). */
function bossEvoNodeDetailHtml(form) {
  if (!form) return '';
  const skillsHtml = Object.keys(form.skillOverrides).map(slot => {
    const sk = form.skillOverrides[slot];
    return '<p class="small muted boss-evo-skill"><b>' + esc(sk.name) + '</b> (' + esc(BOSS_SKILL_SLOT_LABEL[slot]) + ') — ' +
      esc(bossSkillEffectSummary(sk.effect)) + '</p>';
  }).join('');
  return '<p class="small muted boss-evo-stat">' + esc(bossEvoStatLabel(form.mods)) + '</p>' + skillsHtml;
}

function bossEvoNodeWrapHtml(el, formId, level, activeV) {
  const form = formId ? BOSS_EVO[el][formId] : null;
  return '<div class="boss-evo-node-wrap">' + bossEvoNodeHtml(el, formId, level, activeV) + bossEvoNodeDetailHtml(form) + '</div>';
}

function renderBossEvolution() {
  // activeV = dạng ĐANG DÙNG thật sự (bossActiveForm, level-gated) — không phải giá trị thô đã lưu (bossProg.evo[el].v),
  // vì dạng đã chọn có thể chưa đủ cấp (rơi về gốc) mà vẫn giữ nguyên lựa chọn đã lưu.
  const el = bossProg.element.v, lv = levelFromXp(bossProg.xp), activeV = bossActiveForm(bossProg.evo, el, lv);
  bossMarkEvoNoticeSeen(el, lv);   // đã mở màn này ở mốc hiện tại → tắt huy hiệu "Có thể tiến hoá!" tới mốc kế
  const ids = BOSS_EVO_FORMS[el], t8 = ids.filter(id => BOSS_EVO[el][id].level === 8);
  const childrenOf = pid => ids.filter(id => BOSS_EVO[el][id].parent === pid);
  $('#app').innerHTML = '<div class="card page boss-evo">' +
    '<div class="game-head"><button class="btn-sm btn-ghost" id="bossEvoBack" aria-label="về sảnh">←</button>' +
      '<b class="serif">🧬 Tiến hoá · ' + esc(ELEMENT_LABEL[el] || el) + '</b><span class="spacer"></span><span class="mono small">Cấp ' + lv + '</span></div>' +
    '<p class="small muted">Đổi tự do giữa các dạng đã mở, kể cả quay lại dạng gốc. Dạng cấp 16 chỉ cần đạt cấp 16 ' +
      '(không cần đã chọn dạng cấp 8 cùng nhánh trước).</p>' +
    '<div class="boss-evo-row boss-evo-root">' + bossEvoNodeWrapHtml(el, '', lv, activeV) + '</div>' +
    '<div class="boss-evo-tree">' + t8.map(pid =>
      '<div class="boss-evo-branch">' +
        '<div class="boss-evo-row">' + bossEvoNodeWrapHtml(el, pid, lv, activeV) + '</div>' +
        '<div class="boss-evo-row boss-evo-children">' + childrenOf(pid).map(cid => bossEvoNodeWrapHtml(el, cid, lv, activeV)).join('') + '</div>' +
      '</div>'
    ).join('') + '</div></div>';
  $('#bossEvoBack').onclick = () => startBossHub();
  $('.boss-evo').querySelectorAll('.boss-evo-node').forEach(b => { b.onclick = () => bossChooseEvo(el, b.dataset.form, lv); });
}

/* Lưu lựa chọn: {v, ts} với ts = Date.now() (mergeBoss LWW theo ts từng hệ, xem boss-progress-sync-merge.js) —
   qua saveBoss() y hệt mọi trường boss khác (gender/element ở rankUp/chooseElement, boss-game-skill-tree-ui.js). */
function bossChooseEvo(el, formId, level) {
  if (!bossEvoUnlocked(el, formId, level)) return;
  bossProg.evo[el] = { v: formId, ts: Date.now() };
  saveBoss();
  renderBossEvolution();
}
