/* Bước 3 — 5 dạng kiểm tra. Mỗi dạng vẽ vào #body, khi lộ đáp án gọi finishTest() và hiện nút "Chấm độ nhớ →". */

function answerBox(placeholder) {
  return '<input type="text" id="ans" class="serif" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="' + placeholder + '" aria-label="câu trả lời">' +
    '<div id="verdict" role="alert"></div>' +
    '<div class="row"><button class="btn-primary" id="b-check">Kiểm tra</button><button class="btn-ghost" id="b-skip">Không nhớ, xem đáp án</button></div>';
}
function toGradeButton() {
  const b = $('#b-check'); b.textContent = 'Chấm độ nhớ →'; b.onclick = () => { step = 4; render(); };
  const s = $('#b-skip'); if (s) s.hidden = true;
}
// so khớp + hiện kết quả chung cho các dạng gõ
function wireTyping(w, checkFn, revealHtml) {
  const inp = $('#ans'); inp.focus();
  function reveal(checked) {
    if (revealed) return;
    finishTest();
    const m = checked ? checkFn(inp.value) : { ok: false, near: false };
    $('#verdict').innerHTML =
      '<div class="verdict-line">' + (m.ok ? (m.near ? '<span class="ok">≈ Gần đúng</span>' : '<span class="ok">✓ Chính xác</span>') : '<span class="bad">✗ Đáp án:</span>') +
      ' <b class="word-big xs">' + esc(w.word) + '</b> <span class="ipa">' + esc(w.ipa) + '</span></div>' +
      (m.near ? '<div class="small muted">Bạn gõ: “' + esc(inp.value) + '”</div>' : '') +
      revealHtml;
    speak(w.word);
    toGradeButton();
  }
  $('#b-check').onclick = () => reveal(true);
  $('#b-skip').onclick = () => reveal(false);
  inp.onkeydown = e => { if (e.key !== 'Enter') return; e.preventDefault(); if (revealed) { step = 4; render(); } else reveal(true); };
}

/* type — nghĩa Việt + câu che từ → gõ từ */
function tType(w) {
  $('#body').innerHTML = stepLabel(3, 'Nhớ lại chủ động · Gõ từ') +
    '<div class="meaning">' + esc(w.meaning) + '</div>' +
    (w.context ? '<div class="sentence sm">' + blanked(w) + '</div>' : '') +
    (w.source ? '<div class="src">' + esc(w.source) + '</div>' : '') +
    '<label class="f" for="ans">Từ tiếng Anh là gì? Gõ ra mới là nhớ thật.</label>' + answerBox('gõ từ rồi Enter…');
  wireTyping(w, v => fuzzyMatch(v, w.word), w.mnemonic ? '<div class="mnemonic">' + esc(w.mnemonic) + '</div>' : '');
}

/* dictation — chỉ nghe, không thấy chữ → gõ */
function tDictation(w) {
  $('#body').innerHTML = stepLabel(3, 'Nghe rồi gõ') +
    '<p class="small muted">Nghe rồi gõ lại từ. Chưa hiện nghĩa.</p>' +
    '<div class="row"><button id="b-w">🔊 Từ</button><button id="b-s">🔊 Câu</button><button id="b-slow">🐢 Chậm</button></div>' +
    '<label class="f" for="ans">Bạn nghe được từ gì?</label>' + answerBox('gõ từ vừa nghe…');
  $('#b-w').onclick = () => speak(w.word); $('#b-s').onclick = () => speak(w.context || w.word); $('#b-slow').onclick = () => speak(w.word, .6);
  wireTyping(w, v => fuzzyMatch(v, w.word), '<div class="meaning">' + esc(w.meaning) + '</div>' + (w.context ? '<div class="sentence sm">' + esc(w.context) + '</div>' : ''));
  setTimeout(() => speak(w.word), 150);
}

/* owncloze — điền vào câu do chính bạn viết ở bước 5 */
function tOwncloze(w, r) {
  const cands = (r.sentences || []).filter(s => rx(w.word).test(s));
  if (!cands.length) { mode = 'type'; return tType(w); }
  const s = cands[Math.random() * cands.length | 0];
  $('#body').innerHTML = stepLabel(3, 'Điền câu của bạn') +
    '<div class="sentence">' + blanked(w, s) + '</div><div class="src">câu bạn đã viết</div>' +
    '<label class="f" for="ans">Từ nào điền vào chỗ trống?</label>' + answerBox('gõ từ rồi Enter…');
  wireTyping(w, v => fuzzyMatch(v, w.word), '<div class="meaning">' + esc(w.meaning) + '</div>');
}

/* mcq — từ Anh → chọn 1 trong 4 nghĩa */
function tMcq(w) {
  const opts = buildMcqOptions(w, deck, Math.random);
  $('#body').innerHTML = stepLabel(3, 'Chọn nghĩa') +
    '<div class="center"><div class="word-big">' + esc(w.word) + '</div><div class="ipa">' + esc(w.ipa) + '</div>' +
    '<button class="btn-sm" id="b-w">🔊 Nghe</button></div>' +
    '<div class="mcq">' + opts.map((o, i) => '<button data-i="' + i + '" class="serif">' + esc(o.meaning) + '</button>').join('') + '</div>' +
    '<div id="verdict" role="alert"></div>' +
    '<div class="row"><button class="btn-primary" id="b-check" hidden>Chấm độ nhớ →</button></div>';
  $('#b-w').onclick = () => speak(w.word);
  speak(w.word);
  $('#body').querySelectorAll('.mcq button').forEach(b => b.onclick = () => {
    if (revealed) return;
    finishTest();
    const pick = opts[+b.dataset.i];
    $('#body').querySelectorAll('.mcq button').forEach(x => {
      const o = opts[+x.dataset.i];
      x.disabled = true;
      if (o.correct) x.classList.add('right'); else if (x === b) x.classList.add('wrong');
    });
    $('#verdict').innerHTML = pick.correct ? '<span class="ok">✓ Đúng</span>' : '<span class="bad">✗ Sai. Nghĩa đúng đã tô đậm.</span>' +
      (w.context ? '<div class="sentence sm">' + esc(w.context) + '</div>' : '');
    $('#b-check').hidden = false; toGradeButton();
  });
}

/* speak — nghĩa Việt → nói to → tự lật, tự chấm */
function tSpeak(w) {
  $('#body').innerHTML = stepLabel(3, 'Nói ra') +
    '<div class="meaning">' + esc(w.meaning) + '</div>' +
    (w.context ? '<div class="sentence sm">' + blanked(w) + '</div>' : '') +
    (w.outputPrompt ? '<div class="mnemonic">' + esc(w.outputPrompt) + '</div>' : '') +
    '<p class="small muted">Nói to từ và 1 câu có từ đó, rồi lật kiểm tra. Tự chấm thật lòng.</p>' +
    '<div id="verdict" role="alert"></div>' +
    '<div class="row"><button class="btn-primary" id="b-reveal">Tôi đã nói → lật</button></div>';
  $('#b-reveal').onclick = () => {
    if (revealed) { step = 4; render(); return; }
    finishTest();
    $('#verdict').innerHTML = '<div class="verdict-line"><b class="word-big xs">' + esc(w.word) + '</b> <span class="ipa">' + esc(w.ipa) + '</span></div>' +
      (w.context ? '<div class="sentence sm">' + esc(w.context) + '</div>' : '');
    speak(w.word);
    $('#b-reveal').textContent = 'Chấm độ nhớ →';
  };
}

const TESTS = { type: tType, dictation: tDictation, mcq: tMcq, owncloze: tOwncloze, speak: tSpeak };
