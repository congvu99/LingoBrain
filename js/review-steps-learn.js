/* Tab Ôn từ: vòng đời 1 thẻ.
   Từ mới: 1 ngữ cảnh → 2 mã hoá kép → 3 kiểm tra (gõ) → 4 chấm → 5 output.
   Từ ôn lại: 3 kiểm tra (dạng do pickMode chọn) → 4 → 5. */

function restartSession() {
  queue = buildQueue(deck, srs, cfg, Date.now());
  cur = null; session = { streak: {} };
  render();
}
// bước đầu tiên của thẻ hiện tại + chọn dạng kiểm tra
function firstStep() {
  const r = rec(cur.id);
  if (r.state === 'new') { mode = 'type'; return 1; }
  const sentences = (r.sentences || []).filter(s => rx(cur.word).test(s));
  mode = pickMode(r, { deckSize: deck.words.length, hasSentences: sentences.length > 0, hasVoice: hasVoice(), rand: Math.random });
  return 3;
}
function nextCard(silent) {
  cur = null; revealed = false;
  if (!silent) toast('👍 Đã lưu câu của bạn');
  render();
}
// mọi dạng kiểm tra gọi khi đã lộ đáp án → cho phép sang bước 4
function finishTest() { revealed = true; }

function render() {
  const s = deckSummary(deck, srs, Date.now());
  $('#sDue').textContent = s.due; $('#sNew').textContent = s.fresh;
  $('#sLearn').textContent = s.learn; $('#sMature').textContent = s.mature;
  updateDots();
  $('#hSub').textContent = tab === 'game' ? deck.words.length + ' từ' : '';

  const app = $('#app');
  while (!cur && queue.length) {
    const id = queue.shift();
    cur = deck.words.find(w => w.id === id) || null;
    if (cur) { step = firstStep(); revealed = false; }
  }
  if (!cur) {
    if (!deck.words.length) {
      app.innerHTML = '<div class="card empty"><h2>Chưa có từ nào</h2>' +
        '<p class="muted">Học xong buổi sáng thì nạp 5–7 từ vừa gạch chân vào đây.</p>' +
        '<button class="btn-primary" id="btnGoAdd">Nạp từ ngay</button></div>';
      $('#btnGoAdd').onclick = () => { showTab('manage'); $('#dImport').open = true; $('#importBox').focus(); };
    } else {
      const nxt = deck.words.map(w => (srs[w.id] || {}).due || 0).filter(d => d > Date.now()).sort((a, b) => a - b)[0];
      app.innerHTML = '<div class="card empty"><h2>Xong phiên ôn hôm nay</h2>' +
        '<p class="muted">' + (nxt ? 'Lượt ôn kế tiếp: <b>' + new Date(nxt).toLocaleDateString('vi-VN') + '</b>' : 'Nạp thêm từ mới để học tiếp.') + '</p>' +
        '<div class="row center"><button id="btnAgain">Ôn thêm 10 thẻ</button><button class="btn-primary" id="btnBackPlan">Về giáo án</button></div></div>';
      $('#btnAgain').onclick = () => {
        const ids = deck.words.filter(w => srs[w.id] && srs[w.id].state !== 'new').map(w => w.id);
        for (let i = ids.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [ids[i], ids[j]] = [ids[j], ids[i]]; }
        queue = ids.slice(0, 10); cur = null; render();
      };
      $('#btnBackPlan').onclick = () => showTab('plan');
    }
    renderStats(deck, srs, Date.now(), id => { queue.unshift(id); cur = null; render(); });
    return;
  }

  const w = cur, r = rec(w.id);
  const dots = [1, 2, 3, 4, 5].map(i => '<div class="' + (i < step ? 'done' : i === step ? 'active' : '') + '"></div>').join('');
  app.innerHTML = '<div class="card page"><div class="steps" aria-hidden="true">' + dots + '</div><div id="body"></div></div>';
  if (step === 3) TESTS[mode](w, r);
  else ({ 1: s1, 2: s2, 4: s4, 5: s5 })[step](w, r);
  renderStats(deck, srs, Date.now(), id => { queue.unshift(id); cur = null; render(); });
}

function blanked(w, sentence) {
  const s = sentence || w.context;
  return s ? esc(s).replace(rx(w.word), '<span class="blank" aria-label="chỗ trống"></span>') : '<span class="blank"></span>';
}
function stepLabel(n, text) { return '<div class="step-label">Bước ' + n + ' · ' + text + '</div>'; }

/* Bước 1 — ngữ cảnh thật (nghĩa Việt giấu sau nút để ép đoán) */
function s1(w) {
  $('#body').innerHTML = stepLabel(1, 'Ngữ cảnh thật') +
    '<div class="sentence">' + blanked(w) + '</div>' +
    (w.source ? '<div class="src">' + esc(w.source) + '</div>' : '') +
    '<p class="small muted">Đoán chỗ trống mang nghĩa gì trước khi lật.</p>' +
    (w.contextVi ? '<div id="viBox" class="vi" hidden>' + esc(w.contextVi) + '</div>' : '') +
    '<div class="row"><button id="b-listen">🔊 Nghe câu</button>' +
    (w.contextVi ? '<button class="btn-ghost" id="b-vi">Xem dịch</button>' : '') +
    '<span class="spacer"></span><button class="btn-primary" id="b-next">Lật từ →</button></div>';
  $('#b-listen').onclick = () => speak(w.context || w.word);
  if (w.contextVi) $('#b-vi').onclick = () => { $('#viBox').hidden = false; $('#b-vi').hidden = true; };
  $('#b-next').onclick = () => { step = 2; render(); };
  speak(w.context || w.word);
}

/* Bước 2 — mã hoá kép */
function s2(w) {
  const ctx = w.context ? '<div class="sentence sm">' + esc(w.context).replace(rx(w.word), m => '<span class="hi">' + m + '</span>') + '</div>' : '';
  $('#body').innerHTML = stepLabel(2, 'Mã hoá kép') +
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
  speak(w.word);
}

/* Bước 4 — chấm độ nhớ → SM-2 */
function s4(w, r) {
  const learning = r.state !== 'review';
  $('#body').innerHTML = stepLabel(4, 'Chấm độ nhớ') +
    '<div class="center"><div class="word-big sm">' + esc(w.word) + '</div><div class="muted small">' + esc(w.meaning) + '</div></div>' +
    '<p class="small muted center">' + (learning ? 'Từ đang học: đúng 2 lần liên tiếp trong phiên mới ra lịch ngày.' : 'Vừa làm: ' + MODE_LABEL[mode] + '. Chọn đúng để lịch ôn sát lúc sắp quên.') + '</p>' +
    '<div class="grade">' +
      [['😵', 'Quên'], ['😓', 'Khó'], ['🙂', 'Nhớ'], ['😎', 'Dễ']].map((x, g) =>
        '<button class="g' + g + '" data-g="' + g + '"><span class="face">' + x[0] + '</span>' + x[1] + '<small>' + dueLabel(r, g) + '</small></button>').join('') +
    '</div>' +
    '<p class="small muted mono center">' + (learning ? 'đang học' : 'khoảng cách ' + r.ivl + ' ngày · dễ ' + r.ef.toFixed(2)) + ' · ôn ' + r.reps + ' · quên ' + r.lapses + '</p>';
  $('#body').querySelectorAll('.grade button').forEach(b => {
    b.onclick = () => {
      const g = +b.dataset.g;
      const out = applyGrade(srs, w.id, g, mode, Date.now(), session);
      save(K_SRS, srs);
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
  $('#b-say').onclick = () => speak(ta.value || w.word);
  $('#b-skip').onclick = () => nextCard(true);
  $('#b-done').onclick = () => {
    const t = ta.value.trim();
    if (!t) { nextCard(true); return; }
    if (t.toLowerCase().indexOf(w.word.toLowerCase().split(' ')[0]) < 0) { $('#ownMsg').innerHTML = '<span class="bad">Câu chưa chứa từ này. Sửa lại nhé.</span>'; return; }
    const rw = srs[w.id] || (srs[w.id] = blankRec());
    rw.sentences = (rw.sentences || []).concat(t).slice(-5);
    save(K_SRS, srs); speak(t); nextCard();
  };
  ta.onkeydown = e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) $('#b-done').click(); };
}
