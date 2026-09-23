/* Game từ vựng — phần giao diện. Khung dùng chung (chip, vòng đời ván, màn kết thúc)
   Phần vẽ từng dạng câu hỏi nằm ở js/word-game-rounds.js (nạp trước file này).
   Ranh giới: không gọi applyGrade, không ghi srs. Từ sai chỉ đi qua gameMiss. */

let game = null;   // null = không chơi | { id, seq, words, i, right, wrong, score, streak, bestStreak, miss[], locked, over }
let gameSeq = 0;   // số thứ tự ván, để callback treo của ván cũ tự nhận ra mình đã lỗi thời

/* ---- chip chọn game ---- */

function gameOpen(id, a) { return a[id].ok; }

function gameLockReason(id, a) {
  if (id === 'cloze' && a.cloze.have < MIN_LEARNED && a.sprint.have >= MIN_LEARNED)
    return 'Cần học thêm từ có câu ví dụ';
  return 'Cần học thêm ' + a[id].need + ' từ nữa';
}

function gameChipsHtml(a) {
  return GAME_IDS.map(id => {
    const best = (gameScore[id] || {}).best;
    const open = gameOpen(id, a);
    // aria-disabled thay cho disabled: nút disabled không phát click nên trên điện thoại
    // người dùng chạm vào sẽ không nhận được lời giải thích vì sao bị khoá
    return '<button class="game-chip" data-game="' + id + '"' + (open ? '' : ' aria-disabled="true" title="' + esc(gameLockReason(id, a)) + '"') + '>' +
      '<span>' + GAME_LABEL[id] + '</span>' +
      (open ? (best ? '<b class="mono">★ ' + best + '</b>' : '') : '<b class="mono">🔒</b>') +
      '</button>';
  }).join('');
}

function bindGameChips(root, a) {
  root.querySelectorAll('.game-chip').forEach(b => {
    b.onclick = () => { if (gameOpen(b.dataset.game, a)) startGame(b.dataset.game); else toast('🔒 ' + gameLockReason(b.dataset.game, a)); };
  });
}

/* Đang chơi thì giấu mọi thứ quanh #app: chip (bấm sẽ thay ván mới, nuốt mất từ sai)
   và bảng thống kê (bấm sẽ đổi hàng đợi ôn mà màn hình không phản ứng gì). */
function syncGameChrome() {
  const playing = !!game;
  ['#gameChips', '#statsBox', '#deckStats'].forEach(sel => { const el = $(sel); if (el) el.hidden = playing; });
}

function renderGameChips() {
  const box = $('#gameChips');
  if (!box) return;
  syncGameChrome();
  if (game) return;
  const a = gameAvailability(deck, srs);          // quét bộ từ 1 lần, dùng lại cho cả vẽ lẫn gắn sự kiện
  const anyOk = GAME_IDS.some(id => gameOpen(id, a));
  box.innerHTML = '<span class="game-chips-label mono">Chơi nhanh</span>' + gameChipsHtml(a) +
    (anyOk ? '' : '<span class="small muted">học thêm từ để mở khoá</span>');
  bindGameChips(box, a);
}

/* ---- vòng đời một ván ---- */

function startGame(id) {
  closeGame();                    // ván cũ (nếu có) phải được chốt: dừng đồng hồ, lưu từ sai
  const pool = gamePool(deck, srs, id);
  const n = id === 'scramble' ? SCRAMBLE_ROUND : TIMED_ROUND;
  game = { id, seq: ++gameSeq, words: pickGameWords(pool, srs, n, Math.random), i: 0, right: 0, wrong: 0, score: 0, streak: 0, bestStreak: 0, miss: [], locked: false, over: false, timer: null, endsAt: 0 };
  if (!game.words.length) { game = null; return toast('❌ Chưa đủ từ đã học'); }
  syncGameChrome();
  if (id === 'scramble') renderScramble(); else if (id === 'planes') startPlaneGame(); else startTimedGame();
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

function markWrong(w) { game.wrong++; game.streak = 0; if (game.miss.indexOf(w.id) < 0) game.miss.push(w.id); }
function markRight(useCombo) {
  game.right++; game.streak++;
  game.bestStreak = Math.max(game.bestStreak, game.streak);
  game.score += useCombo ? comboMult(game.streak) : 1;
}

function gameHeadHtml(progress) {
  return '<div class="game-head">' +
    '<button class="btn-sm btn-ghost" id="gQuit" aria-label="thoát game">←</button>' +
    '<b class="serif">' + esc(GAME_LABEL[game.id]) + '</b><span class="spacer"></span>' +
    '<span class="mono small">' + esc(progress) + '</span></div>';
}
function bindGameQuit() { $('#gQuit').onclick = quitGame; }

function endGame() {
  if (!game || game.over) return;
  game.over = true;               // chặn đồng hồ / setTimeout còn treo vẽ đè lên màn kết thúc
  stopGameTimer();
  const missed = game.miss.slice();      // flushMiss dọn game.miss, phải chụp trước
  flushMiss();
  const score = Math.floor(game.score);
  const prev = gameScore[game.id] || { best: 0, plays: 0 };
  const beat = score > prev.best;
  gameScore[game.id] = { best: Math.max(prev.best, score), plays: prev.plays + 1 };
  save(K_GAMESCORE, gameScore);

  const missWords = missed.map(id => (deck.words.find(w => w.id === id) || {}).word).filter(Boolean);
  $('#app').innerHTML = '<div class="card page game-end">' +
    '<div class="step-label">' + esc(GAME_LABEL[game.id]) + ' · xong</div>' +
    '<div class="game-end-score"><b>' + score + '</b><span>điểm</span></div>' +
    '<p class="small muted">' + game.right + ' đúng / ' + (game.right + game.wrong) + ' · chuỗi dài nhất ' + game.bestStreak +
    ' · ' + (beat ? '<b class="ok">★ kỷ lục mới</b>' : 'kỷ lục ' + prev.best) + '</p>' +
    (missWords.length
      ? '<p class="small">' + missWords.length + ' từ vừa sai sẽ được ôn trước ở phiên tới:</p>' +
        '<p class="serif">' + missWords.map(esc).join(' · ') + '</p>'
      : '<p class="small ok">Không sai từ nào.</p>') +
    '<div class="row"><button class="btn-primary" id="gAgain">Chơi lại</button>' +
    '<button id="gToReview">Vào ôn từ</button><button class="btn-ghost" id="gDone">Xong</button></div></div>';

  const id = game.id;
  $('#gAgain').onclick = () => { game = null; startGame(id); };
  $('#gToReview').onclick = () => { game = null; restartSession(); };
  $('#gDone').onclick = () => { game = null; render(); };
}
