/* Màn nhập vai hội thoại AI trong lớp toàn màn (stage 'dialogue').
   Lượt "them": câu EN + 🔊 (chỉ khi bấm) + "Xem dịch". Lượt "you": gợi ý VI + từ cần dùng → ghi âm tạm / gõ →
   "Xem câu mẫu". Hết lượt → xem lại cả đoạn, tạo đoạn khác, gọi onDialogueDone.
   Chuỗi từ AI chỉ vào DOM qua textContent. closeDialogue() (gọi từ leaveStage/openStage) huỷ request, tắt micro,
   thu hồi blob URL. Mạng + bộ nhớ: js/daily-dialogue-api-client.js */

let dlg = null;          // { c: bản lưu (+ answers: {lượt → câu đã gõ}), rec, recUrl, typed, shown, words: Map id→word }
let dlgReq = 0, dlgAbort = null;

function todayDialogueIds() { return pickTodayWords(deck.words, srs, today(), today() + DAY); }

function dlgEl(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
function dlgBtn(label, cls, fn) { const b = dlgEl('button', cls, label); b.type = 'button'; b.onclick = fn; return b; }

function openDialogue(regenerate) {
  const c = dialogueCache();
  if (c && !regenerate) { openStage('dialogue'); dlgStart(c); return; }
  if (!dialogueUser()) { toast('Đăng nhập ở tab Tôi để dùng hội thoại AI'); return; }
  const ids = todayDialogueIds();
  if (!ids.length) { toast('Ôn ít nhất 1 từ hôm nay trước'); return; }
  if (navigator.onLine === false) { toast('Cần mạng để tạo hội thoại'); return; }
  openStage('dialogue');
  dlgCleanup();
  dlgRender(dlgStatus('Đang soạn hội thoại…', 'Thường mất 5–20 giây.'));
  setStageProgress(0, 0, 'lượt');
  const token = ++dlgReq, user = dialogueUser();   // gắn bản lưu với user lúc GỬI, không phải lúc nhận
  dlgAbort = new AbortController();
  requestDialogue({ ids, regenerate: !!regenerate, signal: dlgAbort.signal }).then(res => {
    if (res.ok) {
      const b = res.body;
      const fresh = { user, day: b.day, genCount: b.genCount, genMax: b.genMax, dialogue: b.dialogue, pos: -1, done: false };
      saveDialogueCache(fresh);                        // lưu cả khi người dùng đã đóng màn → mở lại không tạo lại
      if (token === dlgReq && stage === 'dialogue') dlgStart(fresh);
      return;
    }
    if (token !== dlgReq || stage !== 'dialogue') return;   // đã đóng / mở màn khác → không vẽ đè
    if (res.off && typeof refreshTab === 'function') refreshTab();
    const box = dlgStatus(res.error, '');
    const row = dlgEl('div', 'dlg-actions');
    if (!res.off && res.status !== 429 && res.status !== 401) row.appendChild(dlgBtn('Thử lại', 'btn-primary', () => openDialogue(regenerate)));
    row.appendChild(dlgBtn('Đóng', '', closeStage));
    box.appendChild(row);
    dlgRender(box);
  });
}

function dlgStatus(title, sub) {
  const box = dlgEl('div', 'card dlg-status');
  box.appendChild(dlgEl('p', 'dlg-status-title', title));
  if (sub) box.appendChild(dlgEl('p', 'muted small', sub));
  return box;
}
function dlgRender(node) { const app = $('#app'); app.textContent = ''; app.appendChild(node); }

function dlgStart(c) {
  dlgCleanup();
  const words = new Map();
  for (const id of c.dialogue.targetIds || []) { const w = deck.words.find(x => x.id === id); if (w) words.set(id, w.word); }
  dlg = { c, rec: null, recUrl: null, typed: '', shown: false, words };
  dlgPaint();
}

function dlgSave() { if (dlg) saveDialogueCache(dlg.c); }
function dlgGo(pos) {
  if (dlg.rec) { dlg.rec.cancel(); dlg.rec = null; }   // bỏ bản đang ghi dở, không để blob về muộn gắn nhầm lượt sau
  const cur = dlg.c.dialogue.turns[dlg.c.pos];
  if (cur && cur.who === 'you' && dlg.typed) dlg.c.answers = Object.assign({}, dlg.c.answers, { [dlg.c.pos]: dlg.typed });
  dlg.c.pos = pos; dlg.shown = false; dlg.typed = '';
  if (dlg.recUrl) { URL.revokeObjectURL(dlg.recUrl); dlg.recUrl = null; }
  const turns = dlg.c.dialogue.turns;
  if (pos >= turns.length && !dlg.c.done) { dlg.c.done = true; dlgSave(); if (typeof onDialogueDone === 'function') onDialogueDone(); }
  else dlgSave();
  if (typeof stopSpeaking === 'function') stopSpeaking();
  dlgPaint();
}

// khung chat: cuộn tới lượt đang làm (lượt đầu / màn kết thì về đầu trang)
function dlgScrollToCurrent() {
  const el = document.querySelector('#app .dlg-current');
  if (el && el.scrollIntoView) el.scrollIntoView({ block: 'start' });
  else $('#appScroll').scrollTo(0, 0);
}

// câu người học đã gõ ở lượt i (đã lưu), hiện dưới bong bóng câu mẫu
function dlgAnswerEl(i) {
  const a = dlg.c.answers && dlg.c.answers[i];
  return a ? dlgEl('p', 'dlg-typed', 'Bạn gõ: ' + a) : null;
}

// câu EN với từ mục tiêu tô đậm: dựng text node + <b>, vị trí lấy từ matchSpans (cùng quy tắc server dùng đo phủ)
function dlgSentence(en) {
  const spans = [];
  for (const w of dlg.words.values()) for (const s of matchSpans(en, w)) spans.push(s);
  spans.sort((a, b) => a[0] - b[0]);
  const frag = document.createDocumentFragment();
  let at = 0;
  for (const [s, e] of spans) {
    if (s < at) continue;
    if (s > at) frag.appendChild(document.createTextNode(en.slice(at, s)));
    frag.appendChild(dlgEl('b', null, en.slice(s, e)));
    at = e;
  }
  if (at < en.length) frag.appendChild(document.createTextNode(en.slice(at)));
  return frag;
}

function dlgSpeakBtn(text) { return dlgBtn('🔊', 'btn-sm dlg-speak', () => speak(text)); }

function dlgBubble(t, full) {
  const b = dlgEl('div', 'dlg-bubble ' + (t.who === 'you' ? 'you' : 'them'));
  b.appendChild(dlgEl('span', 'dlg-who', t.who === 'you' ? 'Bạn · ' + dlg.c.dialogue.roles.you : dlg.c.dialogue.roles.them));
  const p = dlgEl('p', 'dlg-en'); p.appendChild(dlgSentence(t.en)); b.appendChild(p);
  const row = dlgEl('div', 'dlg-row'); row.appendChild(dlgSpeakBtn(t.en));
  if (full) b.appendChild(dlgEl('p', 'dlg-vi muted', t.vi));
  else {
    const vi = dlgEl('p', 'dlg-vi muted', t.vi); vi.hidden = true;
    row.appendChild(dlgBtn('Xem dịch', 'btn-sm btn-ghost', e => { vi.hidden = !vi.hidden; e.target.textContent = vi.hidden ? 'Xem dịch' : 'Ẩn dịch'; }));
    b.appendChild(vi);
  }
  b.appendChild(row);
  return b;
}

function dlgPaint() {
  if (!dlg || stage !== 'dialogue') return;
  const d = dlg.c.dialogue, pos = dlg.c.pos, n = d.turns.length;
  setStageProgress(Math.max(0, Math.min(pos, n)), n, 'lượt');
  const root = dlgEl('div', 'dlg');
  if (pos < 0) {
    root.appendChild(dlgEl('p', 'eyebrow', 'Hội thoại hôm nay'));
    root.appendChild(dlgEl('h2', 'dlg-title', d.scenarioVi));
    root.appendChild(dlgEl('p', 'muted', d.scenario + ' · Bạn là ' + d.roles.you + ', nói chuyện với ' + d.roles.them + '.'));
    root.appendChild(dlgChips([...dlg.words.keys()]));
    root.appendChild(dlgEl('p', 'small muted', 'Đến lượt bạn: đọc gợi ý tiếng Việt, tự nói (hoặc gõ) câu tiếng Anh, rồi mới xem câu mẫu.'));
    root.appendChild(dlgBtn('Bắt đầu', 'btn-primary dlg-next', () => dlgGo(0)));
  } else if (pos >= n) dlgPaintEnd(root);
  else {
    root.appendChild(dlgEl('p', 'eyebrow', d.scenarioVi));
    // các lượt đã qua: đầy đủ câu + 🔊 + dịch (ẩn sau nút) + câu đã gõ — xem lại được cả đoạn trong lúc làm
    for (let i = 0; i < pos; i++) {
      const past = dlgBubble(d.turns[i], false); past.classList.add('past'); root.appendChild(past);
      const ans = dlgAnswerEl(i); if (ans) root.appendChild(ans);
    }
    const t = d.turns[pos];
    const cur = dlgEl('div', 'dlg-current');
    if (t.who === 'them' || dlg.shown) {
      cur.appendChild(dlgBubble(t, false));
      if (t.who === 'you' && dlg.typed) cur.appendChild(dlgEl('p', 'dlg-typed', 'Bạn gõ: ' + dlg.typed));
      if (t.who === 'you' && dlg.recUrl) cur.appendChild(dlgPlayRec());
      cur.appendChild(dlgBtn(pos === n - 1 ? 'Xong' : 'Tiếp', 'btn-primary dlg-next', () => dlgGo(pos + 1)));
    } else cur.appendChild(dlgYourTurn(t));
    root.appendChild(cur);
  }
  dlgRender(root);
  dlgScrollToCurrent();   // mọi lần vẽ lại (sang lượt, xem câu mẫu, ghi âm) giữ màn ở lượt đang làm
}

function dlgChips(ids) {
  const row = dlgEl('div', 'dlg-chips');
  for (const id of ids) if (dlg.words.has(id)) row.appendChild(dlgEl('span', 'dlg-chip', dlg.words.get(id)));
  return row;
}

function dlgYourTurn(t) {
  const box = dlgEl('div', 'dlg-bubble you ask');
  box.appendChild(dlgEl('span', 'dlg-who', 'Đến lượt bạn · ' + dlg.c.dialogue.roles.you));
  box.appendChild(dlgEl('p', 'dlg-hint', t.hintVi));
  if (t.ids.length) box.appendChild(dlgChips(t.ids));
  const row = dlgEl('div', 'dlg-row');
  const recBtn = dlgBtn(dlg.rec ? '⏹ Dừng' : '⏺ Nói thử', 'btn-sm', () => dlgToggleRec());
  row.appendChild(recBtn);
  box.appendChild(row);
  if (dlg.recUrl) box.appendChild(dlgPlayRec());
  const ta = dlgEl('textarea', 'dlg-input'); ta.rows = 2; ta.placeholder = 'Hoặc gõ câu của bạn (không bắt buộc)'; ta.value = dlg.typed;
  ta.setAttribute('aria-label', 'Câu tiếng Anh của bạn'); ta.oninput = () => { dlg.typed = ta.value.trim().slice(0, 300); };
  box.appendChild(ta);
  box.appendChild(dlgBtn('Xem câu mẫu', 'btn-primary dlg-next', () => { dlgStopRec().then(() => { dlg.shown = true; dlgPaint(); }); }));
  return box;
}

function dlgPlayRec() {
  const a = dlgEl('audio', 'dlg-audio'); a.controls = true; a.src = dlg.recUrl;
  return a;
}

/* ---- ghi âm tạm: chỉ giữ trong RAM của lượt hiện tại, không lưu IndexedDB; mỗi lần ghi 1 handle riêng ---- */
async function dlgStartMic() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const stopTracks = () => stream.getTracks().forEach(tr => tr.stop());
  let mr;
  try { mr = new MediaRecorder(stream); } catch (e) { stopTracks(); throw e; }
  const chunks = [];
  mr.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  mr.start();
  return {
    stop: () => new Promise(res => {
      mr.onstop = () => { stopTracks(); res(chunks.length ? new Blob(chunks, { type: mr.mimeType || 'audio/webm' }) : null); };
      if (mr.state !== 'inactive') mr.stop(); else { stopTracks(); res(null); }
    }),
    cancel: () => { mr.onstop = null; try { if (mr.state !== 'inactive') mr.stop(); } catch (e) {} stopTracks(); }
  };
}
async function dlgToggleRec() {
  if (!dlg) return;
  if (dlg.rec) { await dlgStopRec(); dlgPaint(); return; }
  if (dlg.recPending) return;   // đang chờ hộp xin quyền micro: bấm lần 2 không mở thêm stream
  if (!navigator.mediaDevices || !window.MediaRecorder) { toast('❌ Trình duyệt không hỗ trợ ghi âm'); return; }
  const d = dlg;
  d.recPending = true;
  try {
    const rec = await dlgStartMic();
    if (dlg !== d || stage !== 'dialogue') { rec.cancel(); return; }   // đóng màn / sang lượt khác trong lúc chờ quyền micro
    dlg.rec = rec;
    dlgPaint();
  } catch (e) { toast('❌ Không truy cập được micro'); }
  finally { d.recPending = false; }
}
async function dlgStopRec() {
  if (!dlg || !dlg.rec) return;
  const rec = dlg.rec; dlg.rec = null;
  const blob = await rec.stop();
  if (!dlg) return;
  if (dlg.recUrl) URL.revokeObjectURL(dlg.recUrl);
  dlg.recUrl = blob ? URL.createObjectURL(blob) : null;
}

function dlgPaintEnd(root) {
  const d = dlg.c.dialogue;
  root.appendChild(dlgEl('p', 'eyebrow', 'Xong hội thoại'));
  root.appendChild(dlgEl('h2', 'dlg-title', d.scenarioVi));
  d.turns.forEach((t, i) => { root.appendChild(dlgBubble(t, true)); const ans = dlgAnswerEl(i); if (ans) root.appendChild(ans); });
  const miss = (d.missing || []).map(id => dlg.words.get(id)).filter(Boolean);
  if (miss.length) root.appendChild(dlgEl('p', 'small muted', 'Chưa xuất hiện trong đoạn này: ' + miss.join(', ')));
  const row = dlgEl('div', 'dlg-actions');
  const left = Math.max(0, (dlg.c.genMax || 0) - (dlg.c.genCount || 0));
  const again = dlgBtn('Tạo đoạn khác (' + (dlg.c.genCount || 0) + '/' + (dlg.c.genMax || 0) + ')', '', () => openDialogue(true));
  again.disabled = !left || !dialogueUser();
  row.appendChild(again);
  row.appendChild(dlgBtn('Xong', 'btn-primary', closeStage));
  root.appendChild(row);
}

/* ---- dọn dẹp: gọi khi rời stage (✕, back hệ điều hành, đổi tab) hoặc đổi sang stage khác ---- */
function dlgCleanup() {
  if (!dlg) return;
  if (dlg.rec) { dlg.rec.cancel(); dlg.rec = null; }
  if (dlg.recUrl) { URL.revokeObjectURL(dlg.recUrl); dlg.recUrl = null; }
  dlg = null;
}
function closeDialogue() {
  dlgReq++;                                  // response nào về sau đó cũng không vẽ
  // huỷ request đang chờ: server vẫn tạo xong và lưu DB → lần mở sau lấy bản đó, không tốn thêm lượt
  if (dlgAbort) { dlgAbort.abort(); dlgAbort = null; }
  dlgCleanup();
}
