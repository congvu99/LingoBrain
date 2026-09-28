/* Phiên ôn (lớp toàn màn #stage): vòng đời 1 thẻ.
   Từ mới: 1 ngữ cảnh → 2 ghi nhớ → 3 kiểm tra (gõ) → 4 chấm → 5 output.
   Từ ôn lại: 3 kiểm tra (dạng do pickMode chọn) → 4 → 5. */

function newSession() { return { streak: {}, done: 0, graded: 0, pass: 0, fresh: 0, forgot: [] }; }
function restartSession() {
  queue = buildQueue(deck, srs, cfg, Date.now(), gameMiss);
  consumeGameMiss();
  cur = null; session = newSession();
  render();
}
// thêm n thẻ đã học (ngẫu nhiên) vào cuối phiên — lối "ôn thêm" khi hết thẻ đến hạn
function queueExtraReviews(n) {
  const ids = deck.words.filter(w => srs[w.id] && srs[w.id].state !== 'new' && queue.indexOf(w.id) < 0).map(w => w.id);
  for (let i = ids.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [ids[i], ids[j]] = [ids[j], ids[i]]; }
  queue = queue.concat(ids.slice(0, n));
}
let curIsNew = false;   // thẻ đang làm bắt đầu là từ mới (5 bước) hay ôn lại (vào thẳng bài kiểm tra)
// bước đầu tiên của thẻ hiện tại + chọn dạng kiểm tra
function firstStep() {
  const r = rec(cur.id);
  if (r.state === 'new') { mode = 'type'; return 1; }
  const sentences = (r.sentences || []).filter(s => rx(cur.word).test(s));
  mode = pickMode(r, { deckSize: deck.words.length, hasSentences: sentences.length > 0, hasVoice: hasVoice(cur.word), rand: Math.random });
  return 3;
}
function nextCard(silent) {
  cur = null; revealed = false; session.done++;
  if (!silent) toast('👍 Đã lưu câu của bạn');
  render();
}
// mọi dạng kiểm tra gọi khi đã lộ đáp án → cho phép sang bước 4
function finishTest() { revealed = true; }

// vẽ không tự đọc; chuyển bước / sang thẻ sau vẫn tự đọc như cũ
let muteAutoSpeak = false;
function autoSpeak(text) { if (!muteAutoSpeak) speak(text); }
function renderQuiet() { muteAutoSpeak = true; try { render(); } finally { muteAutoSpeak = false; } }

/* Vẽ theo lớp đang mở. Không mở phiên ôn → chỉ làm mới tab đang hiện (số trên Hôm nay, badge).
   Lớp game mà ván đã xong (game = null sau khi bấm Xong / ← thoát) → đóng lớp, về tab. */
function render() {
  if (stage !== 'review') {
    if (stage === 'game') { if (!game) closeStage(); return; }
    refreshTab();
    return;
  }
  updateDots();
  const app = $('#app');
  while (!cur && queue.length) {
    const id = queue.shift();
    cur = deck.words.find(w => w.id === id) || null;
    if (cur) { step = firstStep(); curIsNew = step === 1; revealed = false; if (curIsNew) session.fresh++; }
  }
  setStageProgress(session.done, session.done + liveQueueIds().length);
  if (!cur) {
    if (!deck.words.length) {
      // bộ từ rỗng chỉ xảy ra khi tải words.json thất bại (offline lần đầu / mở bằng file://)
      app.innerHTML = '<div class="card empty"><h2>Chưa tải được bộ từ</h2>' +
        '<p class="muted">Kiểm tra kết nối mạng rồi mở lại ứng dụng.</p>' +
        '<button class="btn-primary" id="btnRetryDeck">Thử lại</button></div>';
      $('#btnRetryDeck').onclick = () => location.reload();
    } else renderSessionEnd(app);
    return;
  }

  const w = cur, r = rec(w.id);
  // thanh 5 bước chỉ cho từ mới — từ ôn lại vào thẳng bước 3, hiện chấm "đã xong" cho bước không có là sai
  const dots = curIsNew ? '<div class="steps" aria-hidden="true">' + [1, 2, 3, 4, 5].map(i => '<div class="' + (i < step ? 'done' : i === step ? 'active' : '') + '"></div>').join('') + '</div>' : '';
  app.innerHTML = '<div class="card page">' + dots + '<div id="body"></div></div>';
  if (step === 3) TESTS[mode](w, r);
  else ({ 1: s1, 2: s2, 4: s4, 5: s5 })[step](w, r);
}

/* Hết hàng đợi: tổng kết phiên (nếu có chấm), lượt kế tiếp, lối học thêm */
function renderSessionEnd(app) {
  const now = Date.now();
  const nxt = deck.words.map(w => (srs[w.id] || {}).due || 0).filter(d => d > now).sort((a, b) => a - b)[0];
  // hàng đợi chỉ dựng lúc mở app → hết phiên phải có lối lấy tiếp lô từ mới, không thì chỉ ôn lại từ cũ
  const fresh = deckSummary(deck, srs, now).fresh, nNew = Math.min(fresh, cfg.newPerDay);
  const g = session.graded, rate = g ? Math.round(session.pass / g * 100) : 0;
  const forgot = session.forgot.map(id => deck.words.find(w => w.id === id)).filter(Boolean);
  app.innerHTML = '<div class="card page session-end">' +
    (g
      ? '<div class="ring" role="img" aria-label="Nhớ ' + rate + '% lượt chấm" style="--p:' + rate + '"><b>' + rate + '%</b></div>' +
        '<h2>Xong phiên</h2>' +
        '<div class="statline"><div><b>' + session.done + '</b><span>thẻ</span></div><div><b>' + session.fresh + '</b><span>từ mới</span></div><div><b>' + (g - session.pass) + '</b><span>lần quên</span></div></div>'
      : '<h2>Không còn thẻ nào</h2>') +
    '<p class="muted small">' + (nxt ? 'Lượt ôn kế tiếp: <b>' + new Date(nxt).toLocaleDateString('vi-VN') + '</b>' : '') +
      (fresh ? (nxt ? ' · ' : '') + 'còn <b>' + fresh + '</b> từ chưa học' : '') + '</p>' +
    (forgot.length
      ? '<p class="small">Từ vừa quên — sẽ gặp lại sớm:</p><div class="word-chips">' +
        forgot.map(w => '<button class="chip" data-say="' + esc(w.id) + '" aria-label="Nghe ' + esc(w.word) + '">🔊 ' + esc(w.word) + '</button>').join('') + '</div>'
      : '') +
    '<div class="stack-actions"><button class="btn-primary" id="btnEndDone">Xong</button>' +
      (nNew ? '<button id="btnMoreNew">Học thêm ' + nNew + ' từ mới</button>' : '') +
      '<button class="btn-ghost" id="btnAgain">Ôn thêm 10 thẻ</button></div></div>';
  app.querySelectorAll('[data-say]').forEach(b => { b.onclick = () => { const w = deck.words.find(x => x.id === b.dataset.say); if (w) speak(w.word); }; });
  $('#btnEndDone').onclick = () => closeStage();
  if (nNew) $('#btnMoreNew').onclick = restartSession;   // từ vừa học đã rời trạng thái 'new' → buildQueue lấy lô kế tiếp
  $('#btnAgain').onclick = () => { queueExtraReviews(10); cur = null; render(); };
}

function blanked(w, sentence) {
  const s = sentence || w.context;
  if (!s) return '<span class="blank"></span>';
  const b = '<span class="blank" aria-label="chỗ trống"></span>';
  // Khớp trên chuỗi ĐÃ escape (nếu không, từ chứa `&` sẽ không khớp và câu hiện nguyên đáp án)
  // và thay MỌI lần xuất hiện — câu lặp lại từ mà chỉ che lần đầu là lộ đáp án.
  return esc(s).replace(wordRx(esc(w.word), 'gi'), (m, pre) => pre + b);
}
function stepLabel(n, text) { return '<div class="step-label">' + (curIsNew ? 'Từ mới · ' + n + '/5 · ' : 'Ôn lại · ') + text + '</div>'; }

/* Bước 1 — ngữ cảnh thật (nghĩa Việt giấu sau nút để ép đoán) */
function s1(w) {
  $('#body').innerHTML = stepLabel(1, 'Ngữ cảnh thật') +
    '<div class="sentence">' + blanked(w) + '</div>' +
    (w.source ? '<div class="src">' + esc(w.source) + '</div>' : '') +
    '<p class="small muted">Đoán chỗ trống mang nghĩa gì trước khi lật.</p>' +
    (w.contextVi ? '<div id="viBox" class="vi" hidden>' + esc(w.contextVi) + '</div>' : '') +
    '<div class="row"><button id="b-listen">🔊 Nghe câu</button>' +
    (w.contextVi ? '<button class="btn-ghost" id="b-vi">Xem dịch</button>' : '') +
    '<span class="spacer"></span><button class="btn-primary" id="b-next">Xem từ →</button></div>';
  $('#b-listen').onclick = () => speak(w.context || w.word);
  if (w.contextVi) $('#b-vi').onclick = () => { $('#viBox').hidden = false; $('#b-vi').hidden = true; };
  $('#b-next').onclick = () => { step = 2; render(); };
  autoSpeak(w.context || w.word);
}

/* Bước 2 — ghi nhớ (mã hoá kép: hình + âm + nghĩa + mẹo) */
function s2(w) {
  const ctx = w.context ? '<div class="sentence sm">' + esc(w.context).replace(rx(w.word), m => '<span class="hi">' + m + '</span>') + '</div>' : '';
  $('#body').innerHTML = stepLabel(2, 'Ghi nhớ') +
    '<div class="center">' +
      (w.image ? '<img src="' + esc(w.image) + '" alt="" class="w-img">' : (w.emoji && w.emoji !== '📘' ? '<div class="emoji">' + esc(w.emoji) + '</div>' : '')) +
      '<div class="word-big">' + esc(w.word) + (w.pos ? '<span class="pos">' + esc(w.pos) + '</span>' : '') + '</div>' +
      '<div class="ipa">' + esc(w.ipa) + '</div>' +
      '<div class="meaning">' + esc(w.meaning) + '</div></div>' +
    (w.mnemonic ? '<div class="mnemonic">' + esc(w.mnemonic) + '</div>' : '') + ctx +
    '<div class="row"><button id="b-w">🔊 Từ</button><button id="b-s">🔊 Câu</button><button id="b-slow">🐢 Chậm</button>' +
    '<span class="spacer"></span><button class="btn-primary" id="b-next">Tự kiểm tra →</button></div>';
  $('#b-w').onclick = () => speak(w.word);
  $('#b-s').onclick = () => speak(w.context || w.word);
  $('#b-slow').onclick = () => speak(w.word, .6);
  $('#b-next').onclick = () => { step = 3; revealed = false; render(); };
  autoSpeak(w.word);
}

/* Bước 4 — chấm độ nhớ → SM-2 */
function s4(w, r) {
  const learning = r.state !== 'review';
  $('#body').innerHTML = stepLabel(4, 'Chấm độ nhớ') +
    '<div class="center"><div class="word-big sm">' + esc(w.word) + '</div><div class="muted small">' + esc(w.meaning) + '</div></div>' +
    '<p class="small muted center">' + (learning ? 'Từ đang học: đúng 2 lần liên tiếp trong phiên mới ra lịch ngày.' : 'Vừa làm: ' + MODE_LABEL[mode] + '. Chọn đúng để lịch ôn sát lúc sắp quên.') + '</p>' +
    '<div class="grade">' +
      ['Quên', 'Khó', 'Nhớ', 'Dễ'].map((x, g) =>
        '<button class="g' + g + '" data-g="' + g + '"><b>' + x + '</b><small>' + dueLabel(r, g) + '</small></button>').join('') +
    '</div>' +
    '<p class="small muted mono center">' + (learning ? 'đang học' : 'khoảng cách ' + r.ivl + ' ngày · dễ ' + r.ef.toFixed(2)) + ' · ôn ' + r.reps + ' · quên ' + r.lapses + '</p>';
  $('#body').querySelectorAll('.grade button').forEach(b => {
    b.onclick = () => {
      const g = +b.dataset.g;
      const out = applyGrade(srs, w.id, g, mode, Date.now(), session);
      save(K_SRS, srs);
      session.graded++;
      if (g === 0) { if (session.forgot.indexOf(w.id) < 0) session.forgot.push(w.id); } else session.pass++;
      if (out.requeue) {
        queue.splice(Math.min(REQUEUE_GAP, queue.length), 0, w.id);
        toast(g === 0 ? 'Gặp lại sau vài thẻ' : 'Tốt, gặp lại lần nữa để chắc');
        nextCard(true);
      } else { step = 5; render(); }
    };
  });
}

/* Bước 5 — output: câu của bạn */
function s5(w) {
  const past = (rec(w.id).sentences || []).slice(-2);
  $('#body').innerHTML = stepLabel(5, 'Dùng thử') +
    '<div class="center"><div class="word-big sm">' + esc(w.word) + '</div><div class="muted small">' + esc(w.meaning) + '</div></div>' +
    (w.outputPrompt ? '<div class="mnemonic">' + esc(w.outputPrompt) + '</div>' : '') +
    '<label class="f" for="own">Viết 1 câu của bạn có "' + esc(w.word) + '" rồi đọc to</label>' +
    '<textarea id="own" class="serif" placeholder="I reckon I can finish this tonight."></textarea>' +
    '<div id="ownMsg" class="small" role="alert"></div>' +
    (past.length ? '<div class="small muted">Câu cũ: ' + past.map(p => '“' + esc(p) + '”').join(' · ') + '</div>' : '') +
    '<div class="row"><button id="b-say">🔊 Đọc câu</button><span class="spacer"></span>' +
    '<button class="btn-ghost" id="b-skip">Bỏ qua</button><button class="btn-primary" id="b-done">Lưu & tiếp →</button></div>';
  const ta = $('#own');
  let leaving = false;   // chặn bấm đúp / Ctrl+Enter liên tục sau khi đã lưu
  $('#b-say').onclick = () => speak(ta.value || w.word);
  $('#b-skip').onclick = () => nextCard(true);
  $('#b-done').onclick = () => {
    if (leaving) return;
    const t = ta.value.trim();
    if (!t) { nextCard(true); return; }
    if (t.toLowerCase().indexOf(w.word.toLowerCase().split(' ')[0]) < 0) { $('#ownMsg').innerHTML = '<span class="bad">Câu chưa chứa từ này. Sửa lại nhé.</span>'; return; }
    const rw = srs[w.id] || (srs[w.id] = blankRec());
    rw.sentences = (rw.sentences || []).concat(t).slice(-5);
    rw.mt = Date.now();   // dấu sửa cho đồng bộ: thiếu thì câu của từ chưa chấm bị lọc sau lần xoá/khôi phục
    save(K_SRS, srs);
    leaving = true;
    const btn = $('#b-done');
    ['#b-done', '#b-skip', '#b-say'].forEach(id => $(id).disabled = true);
    btn.textContent = '🔊 Đang đọc…';
    // trần chờ đọc (onend của Chrome có lúc không bắn); phải phủ cả timeout fetch /api/tts (6s) + thời gian đọc
    const cap = Math.min(20000, 6000 + 100 * t.length);
    // Chỉ chuyển khi vẫn đúng màn này: rời tab / bấm từ ở thống kê / bước 5 được vẽ lại (nút cũ rời DOM) → thôi,
    // nếu không thẻ mới tự đọc đè audio ở tab khác hoặc cắt câu vừa lưu lần nữa; dừng hẳn câu cũ trước khi vẽ thẻ mới
    const go = () => { if (btn.isConnected && stage === 'review' && !game && cur === w && step === 5) { stopSpeaking(); nextCard(); } };
    Promise.race([speak(t), new Promise(r => setTimeout(r, cap))]).then(go, go);
  };
  ta.onkeydown = e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) $('#b-done').click(); };
}
