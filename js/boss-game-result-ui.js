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
    bossSkillFxEvent(ui.fx, e);   // tên chiêu nổi + VFX phụ theo skill.fx (js/boss-game-skill-fx.js)
    bossMonsterAttackFxEvent(ui.fx, e, ui.monster && ui.monster.id);   // đòn quái VFX riêng (js/boss-game-monster-attack-fx.js)
    if (e.type === 'next') { ui.reveal = ''; ui.hint = ''; renderBossPrompt(ui); bossSetCasting(false); }
    else if (e.type === 'hint') { ui.hint = e.letter; renderBossLetters(ui); }
    else if (e.type === 'key') renderBossLetters(ui);
    else if (e.type === 'typo') bossPromptShake();
    else if (e.type === 'cast') { renderBossLetters(ui); if (e.word) speak(e.word); bossSetCasting(true); }
    else if (e.type === 'giveup' || e.type === 'fizzle') { ui.reveal = e.answer; renderBossLetters(ui); }
    // chuỗi niệm: thẻ đề #bossPrompt đổi sang hiện từ chuỗi + tiến độ gõ + rung khi sai. Sát thương/FX
    // va chạm của chainHit đi qua event 'impact' THẬT (bossChainHit emit cùng lúc, xem boss-game-combo-chain.js) —
    // bossFxEvent ở đầu vòng lặp này đã lo phần đó (burst/rung/loé + bossActorEvent: nháy trắng/giật lùi/tan xác
    // khi hạ gục), không cần gọi riêng nữa.
    else if (e.type === 'chainStart') renderBossChainPrompt(ui);
    else if (e.type === 'chainKey') renderBossChainPrompt(ui);
    else if (e.type === 'chainTypo') { bossPromptShake(); renderBossChainPrompt(ui); }
    // Hiện TRỌN từ vừa gõ xong (không phải từ kế đang chờ) — dùng thẳng e.word/e.prompt thay vì gọi lại
    // renderBossChainPrompt(ui) (đọc c.words[c.i] đã trỏ sang từ KẾ, hoặc rỗng nếu vừa xong từ cuối/hạ gục
    // → thẻ đề sẽ kẹt thiếu 1 chữ cuối).
    else if (e.type === 'chainHit') { if (e.word) speak(e.word); renderBossChainCompletedWord(ui, e); }
    else if (e.type === 'ultimate') bossSetCasting(true);   // che ô đề (cả cắt cảnh sau chuỗi)
    // hết khoá tuyệt kỹ: bỏ che + LUÔN vẽ lại đề bình thường đang có (chuỗi niệm không gọi 'next' — không đề mới,
    // chỉ tiếp tục đề trước khi bấm tuyệt kỹ) — thiếu nhánh này thẻ đề kẹt "✦ đang niệm…" mãi
    else if (e.type === 'ultimateEnd') { bossSetCasting(false); renderBossPrompt(ui); }
  }
}

/* Trong khoá niệm (chạm + đuôi cố định): ô đề mờ + "✦ đang niệm…" thay vì chữ, bỏ khi 'next' hiện đề kế */
function bossSetCasting(on) {
  const box = $('#bossPrompt');
  if (box) box.classList.toggle('is-casting', on);
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

/* Thẻ đề trong lúc chuỗi niệm: cùng #bossPrompt/#bossTier/#bossPromptText/#bossLetters với đề thường, chỉ đổi
   nguồn dữ liệu sang st.chain (từ đang chờ gõ + tiến độ typed riêng của chuỗi), không tạo DOM mới. */
function renderBossChainPrompt(ui) {
  const st = ui.st, c = st.chain, box = $('#bossPrompt');
  if (!box || !c) return;
  const g = c.words[c.i];
  if (!g) return;
  const tier = Math.max(1, Math.min(3, c.tier));
  box.setAttribute('data-tier', String(tier));
  $('#bossTier').textContent = '✦'.repeat(tier);
  $('#bossTier').title = ['', 'Chú nhỏ', 'Chú lớn', 'Đại chú'][tier];
  $('#bossPromptText').textContent = 'CHUỖI NIỆM · ' + g.prompt;
  const text = g.answers[0], pos = progressFor(text, c.typed.length);
  const rest = text.slice(pos).replace(/[^ \-'.]/g, '_');
  $('#bossLetters').innerHTML = '<b>' + esc(text.slice(0, pos)) + '</b>' + esc(rest);
}

/* Đúng lúc chainHit: hiện TRỌN từ vừa gõ xong (không gạch chân dở) — dùng e.word/e.prompt từ chính event, không
   đọc st.chain (đã sang từ kế hoặc null nếu vừa xong từ cuối/hạ gục) → không kẹt thiếu chữ cuối. */
function renderBossChainCompletedWord(ui, e) {
  const box = $('#bossPrompt');
  if (!box) return;
  $('#bossPromptText').textContent = 'CHUỖI NIỆM · ' + e.prompt;
  $('#bossLetters').innerHTML = '<b>' + esc(e.word) + '</b>';
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
/* Chốt "trùng thắng" MỘT lần khi trận vừa kết thúc, TRƯỚC khi chính trận này ghi wins (ghi xong thì bossDupWin luôn true).
   Còn đang đánh thì kiểm trực tiếp, không chốt. */
function bossDup(ui) {
  if (ui.dup == null && ui.st.phase !== 'play') ui.dup = bossDupWin(ui.opts);
  return ui.dup != null ? ui.dup : bossDupWin(ui.opts);
}

/* XP trận = sát thương × xpPerDmg (+ thưởng thắng trận truyện, trừ khi trùng thắng) × buff Ôn từ */
function bossEarned(ui) {
  const st = ui.st, T = BOSS_TUNING, isStoryWin = st.phase === 'won' && ui.opts.kind !== 'practice' && !bossDup(ui);
  return Math.floor((st.dealt * T.xpPerDmg + (isStoryWin ? T.xpStoryWin : 0)) * (ui.buff ? T.buffXpMul : 1));
}

/* Lưu giữa trận / kết trận: ẩn app, pagehide, thoát, đổi tab đều gọi — idempotent */
function persistBattle(ui) {
  if (!ui || !ui.st) return;
  const o = ui.opts, dup = bossDup(ui);
  recordProgress(bossProg, { date: o.date, beat: o.beat, carryDmg: o.carryDmg, dealt: ui.st.dealt, xpAtStart: ui.xpAtStart,
    earned: bossEarned(ui), won: ui.st.phase === 'won' && !dup, story: o.kind !== 'practice' && !dup });
  saveBoss();
}

function showBossResult(ui) {
  const st = ui.st, o = ui.opts, won = st.phase === 'won', dup = bossDup(ui);
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
  // Thắng trận truyện thật (không trùng máy khác) → đoạn kết (outro); từ đã học tô màu + bấm nghe
  const storyOutro = won && o.kind === 'story' && !dup && BOSS_STORY[o.beat]
    ? '<p class="serif boss-story-outro">' + bossStoryHtml(BOSS_STORY[o.beat].outro) + '</p>' : '';
  $('#app').innerHTML = '<div class="card page game-end boss-result">' +
    '<div class="step-label">' + esc(GAME_LABEL.boss + ' · ' + ui.monsterName) + '</div>' +
    '<div class="game-end-score"><b>' + (won ? 'Thắng!' : 'Thua') + '</b><span class="mono">+' + earned + ' XP' + (ui.buff ? ' ✨' : '') + '</span></div>' +
    '<p class="small muted">Tổng sát thương: <b>' + Math.round(st.dealt) + '</b> · Đại chú đã niệm: <b>' + bossUltCastCount(st) + '</b></p>' +
    '<div class="bar-track" aria-label="kinh nghiệm"><div class="bar" id="bossResultBar" style="width:' + startPct + '%"></div></div>' +
    '<span class="mono small muted">Lv ' + lv1 + ' · ' + Math.floor(bossProg.xp - from1) + ' / ' + (to1 - from1) + ' XP</span>' +
    (leveledUp ? '<p class="ok"><b>LÊN CẤP ' + lv1 + '!</b> Có thêm 1 điểm cho cây nguyên tố.</p>' : '') +
    (leveledUp && bossEvoMilestoneReached(lv0, lv1) ? '<p class="ok boss-evo-badge-result">🧬 <b>Có thể tiến hoá!</b> Vào sảnh → Tiến hoá để chọn dạng mới.</p>' : '') +
    '<p class="small muted">' + esc(note) + '</p>' + storyOutro +
    (words.length ? '<p class="small">' + words.length + ' từ vừa sai sẽ được ôn trước ở phiên tới:</p><p class="serif">' + words.map(esc).join(' · ') + '</p>'
      : '<p class="small ok">Không sai từ nào.</p>') +
    '<div class="row"><button class="btn-primary" id="bossAgain">' + (won ? 'Luyện phép' : 'Đánh lại') + '</button>' +
    '<button class="btn-ghost" id="bossToHub">Về sảnh</button></div></div>';
  requestAnimationFrame(() => { const bar = $('#bossResultBar'); if (bar) bar.style.width = endPct + '%'; });
  bossBindWordTap($('.boss-result'));
  // "Đánh lại" / "Luyện phép" là cử chỉ thật → startBossBattle focus được ô gõ trên iOS
  $('#bossAgain').onclick = () => startBossBattle(bossTodayOpts(o.difficulty));
  $('#bossToHub').onclick = () => openBossHub();
}
