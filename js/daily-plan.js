/* Tab Giáo án: 7 việc theo giờ, checkbox, streak, ghi âm shadowing (lưu IndexedDB). */

const DEFAULT_PLAN = [
  { id: 't1', time: '07:00', dur: '10 phút', title: 'Xem video/clip mới (không phụ đề)', desc: 'Xem 1 lần, cố đoán nghĩa qua hình ảnh, chưa cần hiểu hết.' },
  { id: 't2', time: '07:10', dur: '15 phút', title: 'Xem lại có phụ đề Anh', desc: 'Gạch chân 5–7 từ/cụm mới, ghi kèm IPA + nghĩa tiếng Việt.', act: 'add' },
  { id: 't3', time: '12:00', dur: '15 phút', title: 'Shadowing 5 câu hay nhất', desc: 'Nghe từng câu → dừng → nói lại bắt chước ngữ điệu, lặp 3 lần/câu.', act: 'rec' },
  { id: 't4', time: '20:00', dur: '15 phút', title: 'Nghe 1 bài hát chủ đề tuần', desc: 'Nghe không lyric 2 lần → đọc lyric, gạch từ mới → hát nhẩm theo.', act: 'add' },
  { id: 't5', time: '20:20', dur: '10 phút', title: 'Ghi âm kể lại nội dung clip sáng', desc: 'Kể bằng lời của mình 2–3 câu, tự nghe lại so với bản gốc.', act: 'rec' },
  { id: 't6', time: 'trong ca làm', dur: '1 câu / ca', title: 'Bắt chuyện với khách nước ngoài', desc: 'Chủ động hỏi/nhận xét 1 câu ngắn với khách — luyện phản xạ hội thoại thật.', act: 'add' },
  { id: 't7', time: '21:00', dur: '5 phút', title: 'Ôn từ vựng kiểu nhớ lại chủ động', desc: 'Che nghĩa tiếng Việt, tự nhớ trước rồi mới lật xem — đúng thì tích, sai thì học lại.', act: 'play' }
];

plan = load(K_PLAN, null) || DEFAULT_PLAN.map(t => Object.assign({}, t));
day = load(K_DAY, null) || { date: dkey(), done: {}, streak: 0, history: {}, caption: {} };

function rollDay() {
  const t = dkey();
  if (day.date === t) return;
  const wasFull = plan.length && plan.every(x => day.done[x.id]);
  day.history = day.history || {};
  day.history[day.date] = Object.keys(day.done).length;
  const yesterday = dkey(Date.now() - DAY);
  day.streak = wasFull ? (day.date === yesterday ? (day.streak || 0) + 1 : 1) : 0;
  day.date = t; day.done = {};
  save(K_DAY, day);
}
function planDone() { return plan.filter(t => day.done[t.id]).length; }
function toggleTask(id) {
  const wasAll = plan.every(t => day.done[t.id]);
  if (day.done[id]) delete day.done[id]; else day.done[id] = Date.now();
  save(K_DAY, day); renderPlan();
  if (!wasAll && plan.every(t => day.done[t.id])) toast('🎉 Xong hết giáo án hôm nay!');
}
function nowMinutes() { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); }
function taskMinutes(t) { const m = /^(\d{1,2}):(\d{2})/.exec(t.time); return m ? +m[1] * 60 + +m[2] : -1; }
function currentTaskId() {
  const now = nowMinutes();
  let best = null;
  for (const t of plan) {
    if (day.done[t.id]) continue;
    const m = taskMinutes(t);
    if (m < 0) continue;
    if (m <= now + 10) best = t.id;            // việc gần nhất tới giờ mà chưa làm
    else if (!best) { best = t.id; break; }    // chưa tới giờ việc nào → việc kế tiếp
  }
  return best;
}

function renderPlan() {
  rollDay();
  const done = planDone(), total = plan.length, cid = currentTaskId();
  $('#pDone').textContent = done + '/' + total;
  const percent = total ? Math.round(done / total * 100) : 0;
  $('#pBar').style.width = percent + '%';
  $('#pPercent').textContent = percent + '%';
  $('#planProgress').setAttribute('aria-valuenow', percent);
  $('#planProgress').setAttribute('aria-valuetext', done + ' trên ' + total + ' hoạt động hoàn thành');
  $('#pEncourage').textContent = total && done === total ? 'Bạn đã làm rất tốt. Hẹn gặp lại ngày mai!' : done ? 'Thêm một bước nhỏ, thêm một niềm vui.' : 'Mỗi bước nhỏ đều đáng tự hào.';
  const summary = deckSummary(deck, srs, Date.now());
  $('#btnTodayStart').innerHTML = (summary.learn || summary.mature ? 'Tiếp tục ôn từ' : 'Bắt đầu học từ') + ' <span aria-hidden="true">↗</span>';
  $('#pStreak').textContent = day.streak || 0;
  $('#planDate').textContent = new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' });

  $('#taskList').innerHTML = plan.map((t, index) => {
    const isDone = !!day.done[t.id], isNow = (t.id === cid);
    let acts = '';
    if (!isDone) {
      // 'add' (nạp từ) đã bỏ vì bộ từ chỉ lấy từ words.json; giáo án đã lưu còn act này → dẫn sang ôn từ
      if (t.act === 'play' || t.act === 'add') acts = '<button class="btn-sm btn-primary" data-act="play" data-id="' + esc(t.id) + '">Vào ôn từ ngay →</button>';
      if (t.act === 'rec') acts = '<button class="btn-sm" data-act="rec" data-id="' + esc(t.id) + '">⏺ Ghi âm</button>';
    }
    return '<div class="task' + (isDone ? ' done' : '') + (isNow ? ' now' : '') + '">' +
      '<button class="chk" data-chk="' + esc(t.id) + '" aria-label="' + (isDone ? 'Bỏ đánh dấu: ' : 'Hoàn thành: ') + esc(t.title) + '" aria-pressed="' + isDone + '">' + (isDone ? '✓' : '') + '</button>' +
      '<div class="t-main">' +
        '<div class="t-meta"><span class="task-number" aria-hidden="true">' + String(index + 1).padStart(2, '0') + '</span><span class="t-time">' + esc(t.time) + '</span><span class="t-dur">' + esc(t.dur) + '</span>' + (isNow ? '<span class="badge-now">Gợi ý lúc này</span>' : '') + '</div>' +
        '<div class="t-title">' + esc(t.title) + '</div>' +
        '<div class="t-desc">' + esc(t.desc) + '</div>' +
        (acts ? '<div class="t-act">' + acts + '</div>' : '') +
        (t.act === 'rec' && !isDone ? '<div class="rec-box" data-rec="' + esc(t.id) + '"></div>' : '') +
      '</div></div>';
  }).join('');

  $('#taskList').querySelectorAll('[data-chk]').forEach(b => b.onclick = () => toggleTask(b.dataset.chk));
  $('#taskList').querySelectorAll('[data-act]').forEach(b => b.onclick = () => {
    if (b.dataset.act === 'play') showTab('game');
    if (b.dataset.act === 'rec') startRec(b, b.dataset.id);
  });
  plan.filter(t => t.act === 'rec' && !day.done[t.id]).forEach(t => renderRecordings(t.id));
  updateDots();
}

/* ---- ghi âm: caption để nghe TTS so A/B, danh sách bản ghi đã lưu ---- */
function renderRecordings(taskId) {
  const box = document.querySelector('[data-rec="' + taskId + '"]');
  if (!box) return;
  const cap = (day.caption || {})[taskId] || '';
  box.innerHTML =
    '<div class="rec-cap"><input type="text" class="rec-caption" placeholder="Câu đang shadow (để nghe mẫu)" value="' + esc(cap) + '" aria-label="câu đang shadow">' +
    '<button class="btn-sm" data-say="' + taskId + '" aria-label="nghe mẫu">🔊</button></div>' +
    '<div class="rec-list" data-list="' + taskId + '"></div>';
  const inp = box.querySelector('.rec-caption');
  inp.onchange = () => { day.caption = day.caption || {}; day.caption[taskId] = inp.value.trim(); save(K_DAY, day); };
  box.querySelector('[data-say]').onclick = () => speak(inp.value.trim() || 'Say the sentence, then record yourself.');
  listRecordings(taskId).then(list => {
    const el = box.querySelector('.rec-list');
    if (!list.length) { el.innerHTML = ''; return; }
    el.innerHTML = list.map(r => '<div class="rec-it"><span class="mono">' + esc(r.date.slice(5)) + ' ' + new Date(r.id).toTimeString().slice(0, 5) + '</span>' +
      '<button class="btn-sm" data-play="' + r.id + '">▶ Nghe</button><button class="btn-ghost btn-sm" data-del="' + r.id + '" aria-label="xoá bản ghi">✕</button></div>').join('') +
      '<div class="small muted">Giữ 10 bản gần nhất trên máy này, không nằm trong backup.</div>';
    el.querySelectorAll('[data-play]').forEach(b => b.onclick = () => {
      const r = list.find(x => x.id === +b.dataset.play); if (!r) return;
      const a = new Audio(URL.createObjectURL(r.blob)); a.onended = () => URL.revokeObjectURL(a.src); a.play();
    });
    el.querySelectorAll('[data-del]').forEach(b => b.onclick = () => deleteRecording(+b.dataset.del).then(() => renderRecordings(taskId)));
  }).catch(() => {});
}

let mediaRec = null, recChunks = [];
async function startRec(btn, id) {
  if (mediaRec && mediaRec.state === 'recording') { mediaRec.stop(); return; }
  if (!navigator.mediaDevices || !window.MediaRecorder) return toast('❌ Trình duyệt không hỗ trợ ghi âm');
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRec = new MediaRecorder(stream); recChunks = [];
    mediaRec.ondataavailable = e => { if (e.data.size) recChunks.push(e.data); };
    mediaRec.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(recChunks, { type: mediaRec.mimeType || 'audio/webm' });
      btn.textContent = '⏺ Ghi lại'; btn.classList.remove('btn-primary'); mediaRec = null;
      const caption = ((day.caption || {})[id]) || '';
      addRecording({ taskId: id, caption, blob })
        .then(() => { toast('✅ Đã lưu bản ghi'); renderRecordings(id); })
        .catch(() => {                                       // không lưu được → nghe tạm
          const box = document.querySelector('[data-rec="' + id + '"]');
          if (box) box.insertAdjacentHTML('beforeend', '<audio controls src="' + URL.createObjectURL(blob) + '"></audio>');
          toast('⚠️ Không lưu được, chỉ nghe tạm');
        });
    };
    mediaRec.start();
    btn.textContent = '⏹ Dừng ghi'; btn.classList.add('btn-primary');
  } catch (e) { toast('❌ Không truy cập được micro'); }
}

/* ---- sửa giáo án ---- */
function renderPlanEdit() {
  $('#planEdit').innerHTML = plan.map((t, i) =>
    '<div class="card card-sm">' +
      '<div class="grid2">' +
        '<div><label class="f">Giờ</label><input type="text" data-p="time" data-i="' + i + '" value="' + esc(t.time) + '"></div>' +
        '<div><label class="f">Thời lượng</label><input type="text" data-p="dur" data-i="' + i + '" value="' + esc(t.dur) + '"></div>' +
      '</div>' +
      '<label class="f">Việc</label><input type="text" data-p="title" data-i="' + i + '" value="' + esc(t.title) + '">' +
      '<label class="f">Mô tả</label><input type="text" data-p="desc" data-i="' + i + '" value="' + esc(t.desc) + '">' +
      '<div class="row"><button class="btn-sm btn-ghost" data-pdel="' + i + '">✕ Xoá việc này</button></div>' +
    '</div>').join('');
  $('#planEdit').querySelectorAll('[data-pdel]').forEach(b => b.onclick = () => { plan.splice(+b.dataset.pdel, 1); renderPlanEdit(); });
}
function collectPlanEdit() {
  $('#planEdit').querySelectorAll('[data-p]').forEach(inp => { const t = plan[+inp.dataset.i]; if (t) t[inp.dataset.p] = inp.value; });
}
