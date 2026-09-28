/* Game từ vựng — phần giao diện. Khung dùng chung (thẻ game ở tab Chơi, vòng đời ván, màn kết thúc)
   Phần vẽ từng dạng câu hỏi nằm ở js/word-game-rounds.js (nạp trước file này).
   Ranh giới: không gọi applyGrade, không ghi srs. Từ sai chỉ đi qua gameMiss. */

let game = null;   // null = không chơi | { id, seq, words, i, right, wrong, score, streak, bestStreak, miss[], locked, over }
let gameSeq = 0;   // số thứ tự ván, để callback treo của ván cũ tự nhận ra mình đã lỗi thời

/* ---- tab Chơi: thẻ game ---- */

function gameOpen(id, a) { return a[id].ok; }

function gameLockReason(id, a) {
  if (id === 'cloze' && a.cloze.have < MIN_LEARNED && a.sprint.have >= MIN_LEARNED)
    return 'Cần thêm ' + a.cloze.need + ' từ đã học có câu ví dụ';
  return 'Cần học thêm ' + a[id].need + ' từ nữa';
}

/* Game có cấp độ lưu kỷ lục riêng từng cấp → thẻ hiện kỷ lục của cấp đang chọn */
function gameBestKey(id) {
  return id === 'planes' ? planeScoreKey(cfg.planeLevel) : id === 'fruit' ? fruitScoreKey(cfg.fruitLevel) : id;
}

const GAME_ICON = {
  scramble: '<rect x="3" y="6" width="7" height="7" rx="1.5"/><rect x="14" y="11" width="7" height="7" rx="1.5"/>',
  sprint: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  cloze: '<path d="M4 7h16M4 12h5M15 12h5M4 17h10"/>',
  planes: '<path d="M12 2l3 8 7 3-7 2-3 7-3-7-7-2 7-3z"/>',
  fruit: '<path d="M4 20 18 6l2-2M14 4l6 6"/>'
};
const gameIcon = id => '<span class="game-ic" aria-hidden="true"><svg viewBox="0 0 24 24">' + GAME_ICON[id] + '</svg></span>';

// aria-disabled thay cho disabled: nút disabled không phát click nên trên điện thoại
// người dùng chạm vào sẽ không nhận được lời giải thích vì sao bị khoá
function gameCardHtml(id, a) {
  const open = gameOpen(id, a), best = (gameScore[gameBestKey(id)] || {}).best;
  return '<button class="card game-card" data-game="' + id + '"' + (open ? '' : ' aria-disabled="true"') + '>' +
    gameIcon(id) + '<b>' + esc(GAME_LABEL[id]) + '</b><span class="game-purpose">' + esc(GAME_META[id].purpose) + '</span>' +
    (open
      ? '<span class="game-foot"><span>' + esc(GAME_META[id].length) + '</span>' + (best ? '<span class="game-best">★ ' + esc(best) + '</span>' : '') + '</span>'
      : '<span class="game-lock-reason">🔒 ' + esc(gameLockReason(id, a)) + '</span>') +
    '</button>';
}

// Pháp sư Lexoria: thẻ nổi bật (RPG theo cốt truyện, không có kỷ lục điểm → hiện cấp + trận hôm nay)
function bossFeatureHtml(a) {
  const open = gameOpen('boss', a);
  return '<button class="card boss-feature" data-game="boss"' + (open ? '' : ' aria-disabled="true"') + '>' +
    '<span class="eyebrow">Pháp sư Lexoria · Lv ' + levelFromXp(bossProg.xp) + '</span>' +
    '<b>' + esc(open ? bossBattleTitle(bossTodayOpts(cfg.bossLevel)) : 'Chưa mở') + '</b>' +
    '<span class="game-purpose">' + esc(open ? GAME_META.boss.purpose : gameLockReason('boss', a)) + '</span>' +
    (open ? '<span class="boss-cta">Vào sảnh</span>' : '') + '</button>';
}

function bindGameChips(root, a) {
  root.querySelectorAll('[data-game]').forEach(b => {
    b.onclick = () => { if (gameOpen(b.dataset.game, a)) startGame(b.dataset.game); else toast('🔒 ' + gameLockReason(b.dataset.game, a)); };
  });
}

/* Đang chơi: game nằm trong lớp toàn màn (#stage) che hết tab + thanh điều hướng, nên không bấm nhầm được
   thẻ game khác / thống kê giữa ván. Gọi ở mọi chỗ tạo `game` (startGame, sảnh Pháp sư). */
function syncGameChrome() { if (game) openStage('game'); }

function renderGameChips() {
  const box = $('#gameChips');
  if (!box || game) return;
  const a = gameAvailability(deck, srs);          // quét bộ từ 1 lần, dùng lại cho cả vẽ lẫn gắn sự kiện
  const left = liveQueueIds().length;
  box.innerHTML =
    (left ? '<button class="nudge" id="btnNudgeReview">Còn ' + left + ' thẻ cần ôn hôm nay<b>Ôn trước ›</b></button>' : '') +
    bossFeatureHtml(a) +
    '<h2 class="sec-title">Chơi nhanh</h2>' +
    '<div class="game-grid">' + GAME_IDS.filter(id => id !== 'boss').map(id => gameCardHtml(id, a)).join('') + '</div>' +
    '<p class="small muted">Trả lời đúng không đổi lịch ôn; từ sai được đưa lên đầu phiên ôn kế tiếp.</p>';
  bindGameChips(box, a);
  if (left) $('#btnNudgeReview').onclick = startReview;
}

/* ---- vòng đời một ván ---- */

function startGame(id) {
  closeGame();                    // ván cũ (nếu có) phải được chốt: dừng đồng hồ, lưu từ sai
  // Pháp sư: hub riêng, mỗi trận tự tạo `game` mới (js/boss-game-ui.js); không bốc từ, không qua endGame/gameScore
  if (id === 'boss') { game = { id, seq: ++gameSeq, miss: [], over: false, stop: stopBossHub }; syncGameChrome(); return startBossHub(); }
  const pool = gamePool(deck, srs, id);
  const n = id === 'scramble' ? SCRAMBLE_ROUND : TIMED_ROUND;
  game = { id, seq: ++gameSeq, words: pickGameWords(pool, srs, n, Math.random), i: 0, right: 0, wrong: 0, score: 0, streak: 0, bestStreak: 0, miss: [], locked: false, over: false, timer: null, endsAt: 0 };
  if (!game.words.length) { game = null; return toast('❌ Chưa đủ từ đã học'); }
  syncGameChrome();
  if (id === 'scramble') renderScramble(); else if (id === 'planes') startPlaneGame(); else if (id === 'fruit') startFruitGame(); else startTimedGame();
}

/* Chốt từ sai của ván: nhét lên đầu hàng đợi của phiên đang chạy, đồng thời lưu ra
   localStorage để lần mở app sau vẫn còn nếu người dùng thoát ngay bây giờ.
   Gọi lần thứ hai không làm gì thêm. */
function flushMiss() {
  if (!game || !game.miss.length) return;
  game.miss.forEach(id => {
    gameMiss = addMiss(gameMiss, id);
    if (queue.indexOf(id) < 0 && (!cur || cur.id !== id)) queue.unshift(id);
  });
  game.miss = [];
  save(K_GAMEMISS, gameMiss);
}

/* dọn ván đang chơi mà không vẽ lại — dùng khi nơi gọi sẽ tự vẽ (đổi tab) */
function closeGame() {
  if (!game) return;
  stopGameTimer();
  flushMiss();
  game = null;
}
function quitGame() { if (game) { closeGame(); render(); } }

/* Đếm ngược 3-2-1 trước ván tính giờ: người chơi kịp đặt tay, đồng hồ chưa chạy.
   show(n) vẽ số, done() khi hết. Trả id interval để nơi gọi huỷ khi thoát giữa chừng
   (stopGameTimer clearInterval game.timer; Bắn máy bay giữ ở planeUi.countdown). */
const READY_FROM = 3, READY_TICK_MS = 650;
function readyCountdown(show, done) {
  let n = READY_FROM;
  show(n);
  const id = setInterval(() => { n--; if (n > 0) show(n); else { clearInterval(id); done(); } }, READY_TICK_MS);
  return id;
}
// mỗi số là 1 phần tử mới → animation .ready-num chạy lại từ đầu
function readyNumHtml(n) { return '<span class="ready-num">' + n + '</span>'; }

function markWrong(w) { game.wrong++; game.streak = 0; if (game.miss.indexOf(w.id) < 0) game.miss.push(w.id); }
function markRight(useCombo) {
  game.right++; game.streak++;
  game.bestStreak = Math.max(game.bestStreak, game.streak);
  game.score += useCombo ? comboMult(game.streak) : 1;
}

/* extraHtml: nút riêng của game (vd ⏸) đặt cuối header — HTML tin cậy, không escape */
function gameHeadHtml(progress, extraHtml = '') {
  return '<div class="game-head">' +
    '<button class="btn-sm btn-ghost" id="gQuit" aria-label="thoát game">←</button>' +
    '<b class="serif">' + esc(GAME_LABEL[game.id]) + '</b><span class="spacer"></span>' +
    '<span class="mono small">' + esc(progress) + '</span>' + extraHtml + '</div>';
}
function bindGameQuit() { $('#gQuit').onclick = quitGame; }

function endGame() {
  if (!game || game.over) return;
  game.over = true;               // chặn đồng hồ / setTimeout còn treo vẽ đè lên màn kết thúc
  stopGameTimer();
  const missed = game.miss.slice();      // flushMiss dọn game.miss, phải chụp trước
  flushMiss();
  const score = Math.floor(game.score);
  const key = game.scoreKey || game.id;   // game có cấp độ (Bắn máy bay) lưu kỷ lục riêng từng cấp
  const prev = gameScore[key] || { best: 0, plays: 0 };
  const beat = score > prev.best;
  gameScore[key] = { best: Math.max(prev.best, score), plays: prev.plays + 1 };
  save(K_GAMESCORE, gameScore);

  const missWords = missed.map(id => (deck.words.find(w => w.id === id) || {}).word).filter(Boolean);
  const mixups = confusionsHtml(game.confusions);
  $('#app').innerHTML = '<div class="card page game-end">' +
    '<div class="step-label">' + esc(GAME_LABEL[game.id] + (game.levelLabel ? ' · ' + game.levelLabel : '')) + ' · xong</div>' +
    '<div class="game-end-score"><b>' + score + '</b><span>điểm</span></div>' +
    '<p class="small muted">' + game.right + ' đúng / ' + (game.right + game.wrong) + ' · chuỗi dài nhất ' + game.bestStreak +
    ' · ' + (beat ? '<b class="ok">★ kỷ lục mới</b>' : 'kỷ lục ' + prev.best) + '</p>' +
    (missWords.length
      ? '<p class="small">' + missWords.length + ' từ vừa sai sẽ được ôn trước ở phiên tới:</p>' +
        '<p class="serif">' + missWords.map(esc).join(' · ') + '</p>'
      : '<p class="small ok">Không sai từ nào.</p>') + mixups +
    '<div class="row"><button class="btn-primary" id="gAgain">Chơi lại</button>' +
    '<button id="gToReview">Vào ôn từ</button><button class="btn-ghost" id="gDone">Xong</button></div></div>';

  const id = game.id;
  $('#gAgain').onclick = () => { game = null; startGame(id); };
  $('#gToReview').onclick = () => { game = null; openStage('review'); restartSession(); };
  $('#gDone').onclick = () => { game = null; render(); };
}

/* Chém chữ: cặp từ đích ✂️ bom đã chém nhầm, nhiều nhất trước, tối đa 5 dòng. Game khác không có → rỗng */
const CONFUSIONS_SHOWN = 5;
function confusionsHtml(conf) {
  const rows = Object.keys(conf || {}).map(k => ({ k, n: conf[k] })).sort((a, b) => b.n - a.n).slice(0, CONFUSIONS_SHOWN);
  if (!rows.length) return '';
  return '<div class="game-confusions"><p class="small">Bạn hay nhầm:</p><ul>' + rows.map(r => {
    const [target, decoy] = r.k.split('|');
    return '<li class="serif">' + esc(target) + ' <span aria-label="nhầm với">✂️</span> ' + esc(decoy) + (r.n > 1 ? ' <b class="mono">×' + r.n + '</b>' : '') + '</li>';
  }).join('') + '</ul></div>';
}
