/* Game Pháp Sư Lexoria — phản hồi DOM trong trận (thẻ đề), lưu tiến trình, màn kết trận.
   Mọi text động vào DOM đi qua esc()/textContent. Ghi tiến trình qua recordProgress (tuyệt đối + max → gọi bao nhiêu lần
   cũng như một) trên global bossProg ĐỌC LÚC GHI (đồng bộ có thể đã thay object). Không ghi srs. */

/* Tiêu thụ st.events: hiệu ứng canvas + thẻ đề + đọc từ vừa niệm */
function bossUiEvents(ui) {
  const st = ui.st, ev = st.events;
  if (!ev.length) return;
  st.events = [];
  for (const e of ev) {
    bossFxEvent(ui.fx, e, st);
    if (e.type === 'next') { ui.reveal = ''; ui.hint = ''; renderBossPrompt(ui); }
    else if (e.type === 'hint') { ui.hint = e.letter; renderBossLetters(ui); }
    else if (e.type === 'key') renderBossLetters(ui);
    else if (e.type === 'typo') bossPromptShake();
    else if (e.type === 'cast') { renderBossLetters(ui); if (e.word) speak(e.word); }
    else if (e.type === 'giveup' || e.type === 'fizzle') { ui.reveal = e.answer; renderBossLetters(ui); }
  }
}

function renderBossPrompt(ui) {
  const st = ui.st, box = $('#bossPrompt');
  if (!box) return;
  const tier = st.tier === 3 ? 3 : st.tier === 2 ? 2 : 1;   // attribute chỉ lấy từ whitelist
  box.setAttribute('data-tier', String(tier));
  $('#bossTier').textContent = '✦'.repeat(tier);
  $('#bossTier').title = ['', 'Chú nhỏ', 'Chú lớn', 'Đại chú'][tier];
  $('#bossPromptText').textContent = st.group.prompt;
  renderBossLetters(ui);
}

/* "s t u _ _ _": chữ đã gõ + gạch chỗ còn lại (giữ dấu cách / gạch nối). Lộ đáp án khi bỏ / hỏng phép. */
function renderBossLetters(ui) {
  const st = ui.st, el = $('#bossLetters');
  if (!el) return;
  if (ui.reveal) { el.innerHTML = '<span class="boss-reveal">' + esc(ui.reveal) + '</span>'; return; }
  const k = Math.max(0, st.targets.findIndex(t => t.indexOf(st.typed) === 0)), text = st.group.answers[k];
  const pos = progressFor(text, st.typed.length);
  let rest = text.slice(pos).replace(/[^ \-'.]/g, '_');
  if (!st.typed && ui.hint) rest = '<i class="boss-hint">' + esc(ui.hint) + '</i>' + esc(rest.slice(1));
  else rest = esc(rest);
  el.innerHTML = '<b>' + esc(text.slice(0, pos)) + '</b>' + rest;
}

function bossPromptShake() {
  const box = $('#bossPrompt');
  if (!box) return;
  box.classList.remove('typo'); void box.offsetWidth; box.classList.add('typo');   // chạy lại animation
}

/* Số Đại chú (✦✦✦) đã niệm thành công trong trận */
function bossUltCastCount(st) { return st.log.filter(l => l.ok && l.tier === 3).length; }

/* true = trận truyện/vô tận này đã bị máy khác thắng trong lúc đánh (sync giữa trận) → tính như Luyện phép */
function bossDupWin(o) { return o.kind !== 'practice' && todayBattle(bossProg, o.date).kind === 'practice'; }

/* XP trận = sát thương × xpPerDmg (+ thưởng thắng trận truyện, trừ khi trùng thắng) × buff Ôn từ */
function bossEarned(ui) {
  const st = ui.st, T = BOSS_TUNING, isStoryWin = st.phase === 'won' && ui.opts.kind !== 'practice' && !bossDupWin(ui.opts);
  return Math.floor((st.dealt * T.xpPerDmg + (isStoryWin ? T.xpStoryWin : 0)) * (ui.buff ? T.buffXpMul : 1));
}

/* Lưu giữa trận / kết trận: ẩn app, pagehide, thoát, đổi tab đều gọi — idempotent */
function persistBattle(ui) {
  if (!ui || !ui.st) return;
  const o = ui.opts, dup = bossDupWin(o);
  recordProgress(bossProg, { date: o.date, beat: o.beat, carryDmg: o.carryDmg, dealt: ui.st.dealt, xpAtStart: ui.xpAtStart,
    earned: bossEarned(ui), won: ui.st.phase === 'won' && !dup, story: o.kind !== 'practice' && !dup });
  saveBoss();
}

function showBossResult(ui) {
  const st = ui.st, o = ui.opts, won = st.phase === 'won', dup = bossDupWin(o);
  game.miss = st.miss.slice();
  const missed = game.miss.slice();
  flushMiss();
  persistBattle(ui);
  teardownBossLoop(ui);
  game.over = true; game.stop = null;    // màn kết: pwa-register không coi là đang chơi dở
  const earned = bossEarned(ui), lv0 = levelFromXp(ui.xpAtStart), lv1 = levelFromXp(bossProg.xp), leveledUp = lv1 > lv0;
  const from1 = xpForLevel(lv1), to1 = xpForLevel(lv1 + 1);
  const startPct = Math.max(0, Math.min(100, leveledUp ? 0 : (ui.xpAtStart - from1) / (to1 - from1) * 100));
  const endPct = Math.max(0, Math.min(100, (bossProg.xp - from1) / (to1 - from1) * 100));
  const words = missed.map(id => (deck.words.find(w => w.id === id) || {}).word).filter(Boolean);
  const note = dup ? 'Máy khác đã thắng trận này hôm nay — tính như Luyện phép.'
    : o.kind === 'practice' ? 'Luyện phép chỉ cộng XP.'
    : won ? 'Trận hôm nay đã xong — ngày mai có trận mới.'
    : 'Oblivion cười khẩy… quái còn giữ vết thương trong hôm nay: ' + Math.ceil(st.hp) + '/' + st.hpMax + ' HP. Đánh lại ngay được.';
  $('#app').innerHTML = '<div class="card page game-end boss-result">' +
    '<div class="step-label">' + esc(GAME_LABEL.boss + ' · ' + ui.monsterName) + '</div>' +
    '<div class="game-end-score"><b>' + (won ? 'Thắng!' : 'Thua') + '</b><span class="mono">+' + earned + ' XP' + (ui.buff ? ' ✨' : '') + '</span></div>' +
    '<p class="small muted">Tổng sát thương: <b>' + Math.round(st.dealt) + '</b> · Đại chú đã niệm: <b>' + bossUltCastCount(st) + '</b></p>' +
    '<div class="bar-track" aria-label="kinh nghiệm"><div class="bar" id="bossResultBar" style="width:' + startPct + '%"></div></div>' +
    '<span class="mono small muted">Lv ' + lv1 + ' · ' + Math.floor(bossProg.xp - from1) + ' / ' + (to1 - from1) + ' XP</span>' +
    (leveledUp ? '<p class="ok"><b>LÊN CẤP ' + lv1 + '!</b> Có thêm 1 điểm cho cây nguyên tố.</p>' : '') +
    '<p class="small muted">' + esc(note) + '</p>' +
    (words.length ? '<p class="small">' + words.length + ' từ vừa sai sẽ được ôn trước ở phiên tới:</p><p class="serif">' + words.map(esc).join(' · ') + '</p>'
      : '<p class="small ok">Không sai từ nào.</p>') +
    '<div class="row"><button class="btn-primary" id="bossAgain">' + (won ? 'Luyện phép' : 'Đánh lại') + '</button>' +
    '<button class="btn-ghost" id="bossToHub">Về sảnh</button></div></div>';
  requestAnimationFrame(() => { const bar = $('#bossResultBar'); if (bar) bar.style.width = endPct + '%'; });
  // "Đánh lại" / "Luyện phép" là cử chỉ thật → startBossBattle focus được ô gõ trên iOS
  $('#bossAgain').onclick = () => startBossBattle(bossTodayOpts(o.difficulty));
  $('#bossToHub').onclick = () => {
    // trận truyện thắng thật (không trùng) → outro (Phase 4); chưa có thì thẳng về sảnh
    if (won && o.kind === 'story' && !dup && typeof showStoryCard === 'function') showStoryCard(o.beat, 'outro', () => openBossHub());
    else openBossHub();
  };
}
