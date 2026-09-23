/* Game từ vựng — phần vẽ từng dạng câu hỏi. Nạp trước js/word-game-ui.js.
   Dùng trạng thái `game` và các helper (markRight/markWrong/endGame/gameHeadHtml) của file đó. */

const ANSWER_PAUSE = 350;    // ms giữ đáp án trên màn trước khi sang câu kế
const CLOZE_PAUSE = 450;     // câu dài hơn, cần thêm nhịp để đọc lại
const LOW_TIME = 10000;      // 10 giây cuối thì thanh đồng hồ đổi màu

/* ---- khung 60 giây, dùng chung cho Chạy 60 giây và Điền câu tốc độ ---- */

function startTimedGame() {
  game.endsAt = Date.now() + SPRINT_SECONDS * 1000;
  // mốc thời gian tuyệt đối, không cộng dồn mỗi tick → khoá màn hình giữa ván vẫn hết đúng giờ
  game.timer = setInterval(tickTimer, 200);
  nextTimedWord();
}

function stopGameTimer() {
  if (game && game.timer) { clearInterval(game.timer); game.timer = null; }
  if (game && game.stop) { game.stop(); game.stop = null; }   // game có vòng lặp riêng (Bắn máy bay) tự dọn
}

function tickTimer() {
  if (!game || game.over) return;
  const left = Math.max(0, game.endsAt - Date.now());
  const t = $('#gTime'), bar = $('#gBar');
  if (t) t.textContent = Math.ceil(left / 1000) + 's';
  if (bar) { bar.style.width = (left / (SPRINT_SECONDS * 1000) * 100) + '%'; bar.classList.toggle('low', left <= LOW_TIME); }
  if (left <= 0) endGame();
}

function timedHeadHtml() {
  const mult = comboMult(game.streak);
  return '<div class="game-head">' +
    '<button class="btn-sm btn-ghost" id="gQuit" aria-label="thoát game">←</button>' +
    '<span class="mono small" id="gTime">' + SPRINT_SECONDS + 's</span><span class="spacer"></span>' +
    '<span class="mono small">' + Math.floor(game.score) + ' đ</span>' +
    (mult > 1 ? '<span class="combo mono">🔥 ×' + mult + '</span>' : '') +
    '</div><div class="bar-track"><div class="bar" id="gBar"></div></div>';
}

/* Câu kế. Hết pool thì xáo lại vòng mới (ván 60s dài hơn bộ từ nhỏ). */
function nextTimedWord(skipped) {
  if (!game || game.over) return;
  if (game.i >= game.words.length) {
    const lastId = game.words.length ? game.words[game.words.length - 1].id : null;
    game.words = pickGameWords(gamePool(deck, srs, game.id), srs, TIMED_ROUND, Math.random);
    // đừng hỏi lại ngay từ vừa hỏi ở cuối vòng trước
    if (game.words.length > 1 && game.words[0].id === lastId) game.words.push(game.words.shift());
    game.i = 0;
  }
  if (!game.words.length) return endGame();
  // từ không dựng nổi 4 đáp án thì bỏ qua, nhưng đừng bỏ qua mãi
  if ((skipped || 0) >= game.words.length) return endGame();
  ROUNDS[game.id](game.words[game.i], skipped || 0);
}

function skipTimedWord(skipped) { game.i++; nextTimedWord(skipped + 1); }

/* Chốt một câu: chấm, giữ đáp án trên màn một nhịp, rồi sang câu kế. Sai KHÔNG trừ giờ. */
function timedAnswer(w, ok, pause) {
  game.locked = true;
  if (ok) markRight(true); else markWrong(w);
  const seq = game.seq;                  // ván đã đổi (thoát / chơi lại) thì callback này lỗi thời
  setTimeout(() => {
    if (!game || game.over || game.seq !== seq) return;
    game.locked = false; game.i++; nextTimedWord();
  }, pause || ANSWER_PAUSE);
}

/* ---- Chạy 60 giây: thấy từ → chọn nghĩa ---- */

function tSprint(w, skipped) {
  const opts = buildMcqOptions(w, deck, Math.random);
  if (opts.length < 4) return skipTimedWord(skipped);
  $('#app').innerHTML = '<div class="card page">' + timedHeadHtml() +
    '<div class="center"><div class="word-big">' + esc(w.word) + '</div>' +
    '<div class="ipa">' + esc(w.ipa) + '</div>' +
    '<button class="btn-sm" id="gSpeak">🔊 Nghe</button></div>' +
    '<div class="mcq" id="gOpts">' + opts.map((o, i) =>
      '<button data-i="' + i + '" class="serif">' + esc(o.meaning) + '</button>').join('') + '</div></div>';
  bindGameQuit();
  $('#gSpeak').onclick = () => speak(w.word);
  speak(w.word);
  $('#gOpts').querySelectorAll('button').forEach(b => b.onclick = () => {
    if (game.locked) return;                       // chặn bấm dồn khi đang chờ sang câu kế
    const ok = opts[+b.dataset.i].correct;
    $('#gOpts').querySelectorAll('button').forEach((x, i) => {
      x.disabled = true;
      if (opts[i].correct) x.classList.add('right'); else if (x === b) x.classList.add('wrong');
    });
    timedAnswer(w, ok);
  });
}

/* ---- Điền câu tốc độ: câu thật khoét lỗ → chọn TỪ ---- */

function tCloze(w, skipped) {
  const opts = buildWordOptions(w, deck, Math.random);
  if (opts.length < 4) return skipTimedWord(skipped);
  // chỉ câu + nguồn. Nghĩa tiếng Việt chỉ hiện sau khi đã chọn, không thì lộ đáp án
  $('#app').innerHTML = '<div class="card page">' + timedHeadHtml() +
    '<div class="sentence">' + blanked(w) + '</div>' +
    (w.source ? '<div class="src">' + esc(w.source) + '</div>' : '') +
    '<div class="mcq two" id="gOpts">' + opts.map((o, i) =>
      '<button data-i="' + i + '" class="serif">' + esc(o.word) + '</button>').join('') + '</div>' +
    '<div id="gVerdict" role="alert"></div></div>';
  bindGameQuit();
  $('#gOpts').querySelectorAll('button').forEach(b => b.onclick = () => {
    if (game.locked) return;
    const ok = opts[+b.dataset.i].correct;
    $('#gOpts').querySelectorAll('button').forEach((x, i) => {
      x.disabled = true;
      if (opts[i].correct) x.classList.add('right'); else if (x === b) x.classList.add('wrong');
    });
    $('#gVerdict').innerHTML = '<div class="meaning sm">' + esc(w.meaning) + '</div>';
    speak(w.context);                    // nghe cả câu — game này là về câu, không phải về từ
    timedAnswer(w, ok, CLOZE_PAUSE);
  });
}

const ROUNDS = { sprint: tSprint, cloze: tCloze };

/* ---- Xếp chữ: 10 từ, không đồng hồ ---- */

function renderScramble() {
  if (game.i >= game.words.length) return endGame();
  const w = game.words[game.i];
  const tiles = scrambleTiles(w.word, Math.random);
  const slots = tiles.map(t => t.fixed ? { ch: t.ch, fixed: true } : { ch: '', fixed: false });

  $('#app').innerHTML = '<div class="card page">' + gameHeadHtml((game.i + 1) + ' / ' + game.words.length) +
    '<div class="meaning center">' + esc(w.meaning) + '</div>' +
    '<div class="slots" id="gSlots"></div><div class="tiles" id="gTiles"></div>' +
    '<div id="gVerdict" role="alert"></div>' +
    '<div class="row"><button class="btn-sm" id="gBack">⌫ Xoá</button><button class="btn-sm btn-ghost" id="gGiveUp">Chịu</button></div></div>';
  bindGameQuit();

  const used = tiles.map(() => false);
  const order = [];   // chỉ số ô chữ đã đặt, theo thứ tự đặt

  function draw() {
    $('#gSlots').innerHTML = slots.map((s, i) =>
      '<span class="slot' + (s.fixed ? ' fixed' : s.ch ? ' filled' : '') + '"' + (s.ch && !s.fixed ? ' data-slot="' + i + '"' : '') + '>' + esc(s.ch || '') + '</span>').join('');
    $('#gTiles').innerHTML = tiles.map((t, i) =>
      t.fixed ? '' : '<button class="tile"' + (used[i] ? ' disabled' : '') + ' data-tile="' + i + '">' + esc(t.ch) + '</button>').join('');
    $('#gTiles').querySelectorAll('.tile').forEach(b => b.onclick = () => place(+b.dataset.tile));
    $('#gSlots').querySelectorAll('[data-slot]').forEach(s => s.onclick = () => takeBack(+s.dataset.slot));
  }
  function nextFree() { return slots.findIndex(s => !s.fixed && !s.ch); }
  function place(ti) {
    if (game.locked || used[ti]) return;
    const si = nextFree(); if (si < 0) return;
    used[ti] = true; slots[si].ch = tiles[ti].ch; order.push({ si, ti });
    draw();
    if (nextFree() < 0) check();
  }
  function takeBack(si) {
    if (game.locked) return;
    const k = order.findIndex(o => o.si === si); if (k < 0) return;
    used[order[k].ti] = false; slots[si].ch = ''; order.splice(k, 1);
    draw();
  }
  function check(giveUp) {
    game.locked = true;
    const answer = slots.map(s => s.ch).join('');
    const ok = !giveUp && answer.toLowerCase() === w.word.toLowerCase();
    if (ok) { markRight(false); speak(w.word); } else markWrong(w);
    $('#gSlots').querySelectorAll('.slot').forEach(s => s.classList.add(ok ? 'right' : 'wrong'));
    $('#gVerdict').innerHTML = (ok
      ? '<div class="verdict-line"><span class="ok">✓ Chính xác</span> '
      : '<div class="verdict-line"><span class="bad">✗ Đáp án:</span> ') +
      '<b class="word-big xs">' + esc(w.word) + '</b> <span class="ipa">' + esc(w.ipa) + '</span></div>' +
      '<div class="row"><button class="btn-primary" id="gNext">Tiếp →</button></div>';
    $('#gBack').hidden = true; $('#gGiveUp').hidden = true;
    $('#gNext').onclick = () => { game.locked = false; game.i++; renderScramble(); };
    $('#gNext').focus();
  }

  draw();
  $('#gBack').onclick = () => { if (order.length) takeBack(order[order.length - 1].si); };
  $('#gGiveUp').onclick = () => check(true);
}
