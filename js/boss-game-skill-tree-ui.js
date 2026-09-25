/* Game Pháp Sư Lexoria — cây nguyên tố (DOM): 5 cột × 3 bậc + chọn trường phái. Điểm chỉ tăng, không có
   reset (mergeBoss gộp alloc theo max từng nhánh — xem boss-progress-sync-merge.js). Nội tại bậc 1–2 của MỌI
   nhánh đã cộng đều bật; trường phái chỉ quyết định màu phép, khắc hệ và tuyệt kỹ — tuyệt kỹ có sẵn ngay khi chọn
   trường phái (mở sớm), bậc 3 của nhánh trường phái đang dùng cộng thêm BOSS_TUNING.rank3UltBonus vào hệ số tuyệt
   kỹ (m.ultBonus, xem js/boss-game-elements.js). Cần js/boss-game-elements.js (nạp SAU boss-game-spell-math.js —
   cần BOSS_TUNING), js/boss-progress-sync-merge.js (BOSS_ELEMENTS), js/boss-game-hub-ui.js (bossTodayOpts)
   + boss-game-story-journal-ui.js (bossPickMonster) nạp trước. */

/* Chỉ số 2 (bậc 3) không cộng modifier như bậc 1–2 — nếu đang là trường phái active thì cộng thêm rank3UltBonus vào
   hệ số tuyệt kỹ; nếu KHÔNG phải trường phái active thì bậc 3 không có tác dụng gì (ultBonus chỉ tính trên el đang
   chọn) nên dòng chữ để trung lập, không hứa hẹn quá mức. KHÔNG hardcode số % ở đây (review M3: hiệu lực thật đổi
   theo tuyệt kỹ — vd meteor/chain làm tròn lên nên % thật khác +25% danh nghĩa) — chỉ nêu đúng con số hệ số lấy
   thẳng từ BOSS_TUNING, khỏi lệch khi cân bằng lại số liệu. */
const BOSS_RANK3_TXT = 'Tuyệt kỹ mạnh hơn (+' + BOSS_TUNING.rank3UltBonus + ' hệ số) nếu đang dùng trường phái này: ';
const BOSS_RANK_DESC = {
  fire: ['+15% sát thương mọi phép', 'Trùm bị đốt thêm sát thương theo thời gian', BOSS_RANK3_TXT + 'Mưa sao băng'],
  ice: ['+1,5 giây cho đồng hồ trùm', '25% cơ hội đóng băng trùm khi trúng', BOSS_RANK3_TXT + 'Kỷ băng hà'],
  storm: ['Nới lỏng mốc tốc độ gõ', 'Gõ siêu nhanh = chí mạng', BOSS_RANK3_TXT + 'Xích sét'],
  earth: ['+1 ❤️ trái tim', '+1 khiên chặn một đòn của trùm', BOSS_RANK3_TXT + 'Hồi sinh đầy máu'],
  wind: ['Gợi ý chữ cái đầu mỗi đề', 'Tha một lỗi gõ mỗi từ', BOSS_RANK3_TXT + 'Lốc xoáy dừng đồng hồ']
};

function renderSkillTree() {
  const lv = levelFromXp(bossProg.xp), left = pointsLeft(lv, bossProg.alloc);
  const o = bossTodayOpts(bossDifficulty(cfg.bossLevel)), mon = bossPickMonster(o.beat, bossProg.wins).monster;
  $('#app').innerHTML = '<div class="card page boss-tree">' +
    '<div class="game-head"><button class="btn-sm btn-ghost" id="bossTreeBack" aria-label="về sảnh">←</button>' +
      '<b class="serif">Cây nguyên tố</b><span class="spacer"></span><span class="mono small">Điểm còn: ' + left + '</span></div>' +
    '<div class="boss-tree-grid">' + BOSS_ELEMENTS.map(el => bossTreeColHtml(el, lv)).join('') + '</div>' +
    '<p class="small muted">Trùm hôm nay sợ hệ: <b>' + esc(ELEMENT_LABEL[mon.weak] || mon.weak) + '</b></p></div>';
  $('#bossTreeBack').onclick = () => startBossHub();
  BOSS_ELEMENTS.forEach(el => {
    const col = document.querySelector('.boss-tree-col[data-el="' + el + '"]');
    if (!col) return;
    col.querySelectorAll('.boss-tree-rank').forEach(b => { b.onclick = () => rankUp(el); });
    const pick = col.querySelector('.boss-tree-pick');
    if (pick) pick.onclick = () => chooseElement(el);
  });
}

function bossTreeColHtml(el, lv) {
  const rank = rankOf(bossProg.alloc, el), active = bossProg.element.v === el;
  const ranks = [1, 2, 3].map(r => {
    const state = rank >= r ? 'done' : (rank === r - 1 && canRankUp(bossProg.alloc, el, lv)) ? 'next' : 'locked';
    return '<button class="boss-tree-rank" data-state="' + state + '"' + (state === 'next' ? '' : ' disabled') +
      ' title="' + esc(BOSS_RANK_DESC[el][r - 1]) + '">' + (state === 'done' ? '✓' : r === 3 ? '★' : r) + '</button>';
  }).join('');
  // icon 24×24 hệ (Ui/Skill Icon/Spell, chép bằng tools/copy-boss-sprites.js); nhánh chưa mở (rank 0) → bản Disabled
  const icon = 'img/boss/fx/icon-' + el + (rank ? '' : '-disabled') + '.png';
  return '<div class="boss-tree-col" data-el="' + el + '"' + (active ? ' data-active="true"' : '') + '>' +
    '<b class="serif"><img class="boss-tree-icon" src="' + icon + '" alt="" aria-hidden="true">' + esc(ELEMENT_LABEL[el]) + '</b>' +
    '<div class="boss-tree-ranks">' + ranks + '</div>' +
    '<p class="small muted">' + esc(BOSS_RANK_DESC[el][Math.min(2, rank)]) + '</p>' +
    '<button class="btn-sm boss-tree-pick"' + (active ? ' disabled' : '') + '>' + (active ? 'Đang dùng' : 'Chọn trường phái') + '</button></div>';
}

/* Chạm bậc kế → xác nhận → cộng 1 điểm (chỉ khi hợp lệ; alloc chỉ tăng, không có nút reset) */
function rankUp(el) {
  const lv = levelFromXp(bossProg.xp);
  if (!canRankUp(bossProg.alloc, el, lv)) return;
  const cur = rankOf(bossProg.alloc, el);
  if (!confirm('Cộng 1 điểm vào ' + ELEMENT_LABEL[el] + '?\n' + BOSS_RANK_DESC[el][cur])) return;
  bossProg.alloc = bossProg.alloc || {};
  bossProg.alloc[el] = cur + 1;
  saveBoss();
  renderSkillTree();
}

function chooseElement(el) {
  if (BOSS_ELEMENTS.indexOf(el) < 0 || el === bossProg.element.v) return;
  bossProg.element = { v: el, ts: Date.now() };
  saveBoss();
  renderSkillTree();
}
