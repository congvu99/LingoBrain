/* Game Pháp Sư Lexoria — sảnh (hub) đầy đủ: chân dung, cấp/XP, chuỗi ngày săn trùm, buff Ôn từ, trận hôm nay,
   cấp độ, nút Cây nguyên tố/Nhật ký/Bắt đầu. Sảnh dùng `game` riêng (stop = stopBossHub); mỗi trận tạo `game`
   mới ở startBossBattle. Màn lần đầu ở js/boss-game-first-run-ui.js; quái theo beat, thẻ truyện, Nhật ký ở
   js/boss-game-story-journal-ui.js. */

const BOSS_DIFFS = [{ id: 'easy', label: 'Dễ' }, { id: 'normal', label: 'Vừa' }, { id: 'hard', label: 'Khó' }];
const BOSS_BEATS_PER_CHAPTER = 7;

const bossDifficulty = id => BOSS_DIFFS.some(d => d.id === id) ? id : 'normal';

/* Trận hôm nay theo tiến trình hiện tại (đọc global bossProg lúc gọi) */
function bossTodayOpts(difficulty) {
  const date = dkey(), tb = todayBattle(bossProg, date);
  return { date, kind: tb.kind, beat: tb.beat, carryDmg: tb.carryDmg, difficulty: bossDifficulty(difficulty) };
}

function bossBattleTitle(o) {
  if (o.kind === 'practice') return 'Luyện phép (chỉ XP)';
  if (o.kind === 'endless') return 'Vô tận';
  return 'Chương ' + (Math.floor(o.beat / BOSS_BEATS_PER_CHAPTER) + 1) + ' · Trận ' + (o.beat % BOSS_BEATS_PER_CHAPTER + 1);
}

function openBossHub() {
  game = { id: 'boss', seq: ++gameSeq, miss: [], over: false, stop: stopBossHub };
  syncGameChrome();
  startBossHub();
}

function startBossHub() {
  if (bossProg.gender.ts === 0 && bossShowFirstRun()) return;   // màn lần đầu (js/boss-game-first-run-ui.js)
  const date = dkey(), buff = reviewBuff(bossProg, srs, Date.now(), date);
  if (buff && bossProg.buffDate !== date) { bossProg.buffDate = date; saveBoss(); }   // chốt cả ngày
  renderBossHub(buff);
}

function renderBossHub(buff) {
  const xp = bossProg.xp, lv = levelFromXp(xp), from = xpForLevel(lv), to = xpForLevel(lv + 1);
  const diff = bossDifficulty(cfg.bossLevel), o = bossTodayOpts(diff), mon = bossPickMonster(o.beat, bossProg.wins).monster, hp = bossMonsterHp(mon);
  const streak = huntStreak(bossProg.wins, o.date);
  const pct = o.carryDmg ? Math.max(1, Math.round((hp - o.carryDmg) / hp * 100)) : 100;
  $('#app').innerHTML = '<div class="card page boss-hub">' + gameHeadHtml('Lv ' + lv) +
    '<div class="boss-hub-portrait"><canvas id="bossPortrait" width="96" height="120" aria-label="chân dung pháp sư"></canvas>' +
      '<div class="boss-hub-level"><b class="serif">Pháp Sư Lexoria · Cấp ' + lv + '</b>' +
        '<div class="bar-track" aria-label="kinh nghiệm"><div class="bar" style="width:' + Math.round((xp - from) / (to - from) * 100) + '%"></div></div>' +
        '<span class="mono small muted">' + Math.floor(xp - from) + ' / ' + (to - from) + ' XP' + (streak ? ' · 🔥 ' + streak + ' ngày' : '') + '</span></div></div>' +
    bossBuffChipHtml(buff) +
    '<div class="boss-hub-today"><span class="step-label">Hôm nay</span><b class="serif">' + esc(bossBattleTitle(o)) + '</b>' +
      (o.kind === 'practice' ? '<span class="small ok">Đã hạ trùm hôm nay — Luyện phép để lấy thêm XP.</span>'
        : '<span class="small">' + esc(mon.name) + ' · ' + hp + ' HP' +
          (o.carryDmg ? ' · <b class="ok">còn ' + pct + '% HP</b> (vết thương giữ trong ngày)' : '') + '</span>') + '</div>' +
    bossStoryCardHtml(o, mon) +
    '<div class="plane-diff boss-diff" id="bossDiff" role="radiogroup" aria-label="cấp độ">' +
      BOSS_DIFFS.map(d => '<button role="radio" data-diff="' + d.id + '" aria-checked="' + (d.id === diff) + '">' + d.label +
        '<b class="mono">' + BOSS_TUNING.clock[d.id] + 's</b></button>').join('') + '</div>' +
    '<p class="small muted">Đề là <b>nghĩa tiếng Việt</b>. Gõ đúng từ tiếng Anh = niệm chú; từ càng khó chiêu càng lớn, gõ càng nhanh càng đau. ' +
      'Đang gõ thì thời gian chậm lại. Trùm đánh theo vòng đồng hồ. Enter khi chưa gõ = Bỏ, Esc = tạm dừng. ' +
      '<small>Tắt bộ gõ tiếng Việt trước khi chơi.</small></p>' +
    bossJournalHtml(bossProg.wins) +
    '<div class="row boss-hub-nav"><button class="btn-ghost" id="bossTreeBtn">🌳 Cây nguyên tố</button>' +
      '<button class="btn-ghost" id="bossJournalBtn">📖 Nhật ký</button></div>' +
    '<div class="row"><button class="btn-primary" id="bossStart">' + (o.kind === 'story' ? 'Chiến đấu' : 'Bắt đầu') + '</button></div></div>';
  bindGameQuit();
  bossBindWordTap($('.boss-hub'));
  bossDrawPortrait();
  $('#bossDiff').querySelectorAll('button').forEach(b => {
    b.onclick = () => { cfg.bossLevel = bossDifficulty(b.dataset.diff); save(K_CFG, cfg); startBossHub(); };
  });
  const goReview = $('#bossBuffReview');
  if (goReview) goReview.onclick = () => showTab('plan');
  $('#bossTreeBtn').onclick = () => renderSkillTree();
  $('#bossJournalBtn').onclick = () => renderJournal();
  $('#bossStart').onclick = () => startBossBattle(bossTodayOpts(cfg.bossLevel));   // cử chỉ thật → focus ô gõ được trên iOS
}

function bossBuffChipHtml(buff) {
  return buff
    ? '<p class="small ok boss-buff-chip">✨ Đã ôn xong: +1 ❤️, XP ×' + BOSS_TUNING.buffXpMul + '</p>'
    : '<p class="small muted boss-buff-chip">Ôn xong thẻ đến hạn hôm nay để được buff.' +
      '<button class="btn-sm btn-ghost" id="bossBuffReview">Sang Ôn từ</button></p>';
}

function bossDrawPortrait() {
  bossPortraitLoop($('#bossPortrait'), bossMageSprite(bossProg.gender.v));
}

/* Dọn interval "đang đồng bộ" + vòng lặp chân dung nếu người dùng thoát giữa chừng (sảnh hoặc màn lần đầu) */
function stopBossHub() {
  clearInterval(bossFirstRunWait);
  if (bossPortraitStop) { bossPortraitStop(); bossPortraitStop = null; }
}

/* Gọi từ refreshAfterSync (js/cloud-sync-account-ui.js) sau khi áp dữ liệu đồng bộ; không đụng trận đang chạy */
function refreshBossHub() {
  if (game && game.id === 'boss' && game.stop === stopBossHub) startBossHub();
}
