/* Điều hướng 4 tab + lớp toàn màn (#stage: phiên ôn / game), gắn sự kiện tab Tôi, phím tắt, khởi động. Nạp cuối cùng. */

const TABS = ['plan', 'play', 'progress', 'manage'];
let stage = null;            // null | 'review' | 'game' | 'dialogue' — đang mở lớp toàn màn thì ẩn tab + thanh điều hướng
let stageLeaving = false;    // đã gọi history.back, chờ popstate (chặn bấm ✕ hai lần làm lùi ra khỏi app)

function paintTab(full) {
  TABS.forEach(k => {
    $('#tab-' + k).hidden = tab !== k;
    const b = $('#nav-' + k); b.classList.toggle('on', tab === k); b.setAttribute('aria-current', tab === k ? 'page' : 'false');
  });
  if (tab === 'plan') renderPlan();
  if (tab === 'play') renderGameChips();
  if (tab === 'progress') renderProgress();
  if (tab === 'manage' && full) renderPlanEdit();   // vẽ lại khung sửa làm mất chữ đang gõ → chỉ khi vừa vào tab
  updateDots();
  if (full) {
    $('#appScroll').scrollTo(0, 0);        // document bị khoá cuộn, nội dung cuộn trong #appScroll
    const main = $('main'); if (main) main.focus({ preventScroll: true });
  }
}
// vẽ lại nhẹ tab đang hiện (sau khi hàng đợi / tiến độ đổi) — không cuộn, không cướp focus
function refreshTab() { if (!stage) paintTab(false); }
function showTab(t) {
  tab = t;
  if (stage) closeStage();                 // leaveStage vẽ tab mới
  else paintTab(true);
}

/* ---- lớp toàn màn ----
   Mở: đẩy 1 mục history để nút/vuốt "quay lại" của hệ điều hành đóng lớp thay vì rời app.
   Đổi loại (game → ôn) khi đang mở: không đẩy thêm mục. */
function openStage(kind) {
  // rời màn hội thoại sang loại khác: tắt micro / huỷ request như khi đóng hẳn
  if (stage === 'dialogue' && kind !== 'dialogue' && typeof closeDialogue === 'function') closeDialogue();
  if (!stage) {
    try { history.pushState({ lbStage: 1 }, ''); } catch (e) {}
    $('#main').hidden = true; $('#stage').hidden = false;
    document.documentElement.classList.add('in-stage');
  }
  stage = kind;
  // game: chỉ hiện ✕ khi màn đang vẽ không có nút ← riêng (CSS :has(#gQuit)) — màn nào cũng phải có lối thoát
  $('#stage').classList.toggle('is-game', kind === 'game');
  $('#appScroll').scrollTo(0, 0);
}
function closeStage() {
  if (!stage || stageLeaving) return;
  if (history.state && history.state.lbStage) {
    stageLeaving = true;
    history.back();
    setTimeout(() => { if (stageLeaving) leaveStage(); }, 500);   // popstate không tới (trình duyệt lạ) → vẫn thoát
  } else leaveStage();
}
function leaveStage() {
  stageLeaving = false;
  if (!stage) return;
  closeGame();                             // bỏ ván đang chơi: không lưu điểm, vẫn lưu từ sai
  if (stage === 'dialogue' && typeof closeDialogue === 'function') closeDialogue();   // tắt micro, huỷ request, thu hồi blob
  if (typeof stopSpeaking === 'function') stopSpeaking();
  stage = null;
  $('#stage').hidden = true; $('#main').hidden = false;
  document.documentElement.classList.remove('in-stage');
  $('#app').innerHTML = '';
  paintTab(true);
}
window.addEventListener('popstate', () => { if (stage) leaveStage(); else stageLeaving = false; });

function startReview() { openStage('review'); render(); }
function setStageProgress(done, total, unit) {
  const p = $('#stageProg');
  $('#stageFill').style.width = (total ? Math.round(done / total * 100) : 0) + '%';
  p.setAttribute('aria-valuemax', total); p.setAttribute('aria-valuenow', done);
  p.setAttribute('aria-valuetext', done + ' trên ' + total + ' ' + (unit || 'thẻ'));
  $('#stageCount').textContent = total ? done + '/' + total : '';
}

function liveQueueIds() { return (cur ? [cur.id] : []).concat(queue); }
function updateDots() {
  const n = liveQueueIds().length;
  const d = $('#dotPlan'); d.hidden = n <= 0; d.textContent = n > 99 ? '99+' : n;
  d.setAttribute('aria-label', n + ' thẻ cần ôn hôm nay');
}

function bindUI() {
  TABS.forEach(k => { $('#nav-' + k).onclick = () => showTab(k); });
  $('#stageClose').onclick = () => { const wasReview = stage === 'review'; closeStage(); if (wasReview && session.done) toast('Đã lưu ' + session.done + ' thẻ'); };
  $('#btnHabits').onclick = () => { habitsOpen = !habitsOpen; renderPlan(); };
  $('#libBox').addEventListener('toggle', () => { if ($('#libBox').open) renderList(); });

  $('#btnResetDay').onclick = () => { if (!confirm('Bỏ tích toàn bộ việc hôm nay?')) return; day.done = {}; save(K_DAY, day); renderPlan(); toast('Đã đặt lại'); };
  $('#btnPlanSave').onclick = () => { collectPlanEdit(); plan = plan.filter(t => t.title.trim()); save(K_PLAN, plan); renderPlanEdit(); renderPlan(); toast('✅ Đã lưu giáo án'); };
  $('#btnPlanAdd').onclick = () => { collectPlanEdit(); plan.push({ id: 't' + Date.now(), time: '22:00', dur: '10 phút', title: 'Việc mới', desc: '' }); renderPlanEdit(); };
  $('#btnPlanDefault').onclick = () => { if (!confirm('Khôi phục giáo án mặc định?')) return; plan = DEFAULT_PLAN.map(t => Object.assign({}, t)); save(K_PLAN, plan); renderPlanEdit(); renderPlan(); toast('Đã khôi phục'); };

  $('#setNew').value = cfg.newPerDay; $('#setMax').value = cfg.maxSession;
  $('#setNew').onchange = e => { cfg.newPerDay = Math.max(1, +e.target.value || 5); save(K_CFG, cfg); restartSession(); };
  $('#setMax').onchange = e => { cfg.maxSession = Math.max(5, +e.target.value || 40); save(K_CFG, cfg); restartSession(); };
  // backup chỉ chứa tiến độ + giáo án + cài đặt; bộ từ luôn lấy từ máy chủ (js/deck-source.js)
  $('#btnExportAll').onclick = () => download('lingobrain-backup-' + dkey() + '.json', { version: APP_VERSION, srs, cfg, plan, day, gameScore, gameMiss, boss: bossProg });
  $('#btnRestore').onclick = () => $('#fileRestore').click();
  $('#fileRestore').onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => { try { restoreBackup(JSON.parse(rd.result)); } catch (err) { toast('❌ File không hợp lệ'); } };
    rd.readAsText(f); e.target.value = '';
  };
  $('#btnResetProg').onclick = () => {
    const all = authInfo() ? ' — cả trên tài khoản và các máy khác' : '';
    if (!confirm('Xoá hết tiến độ học từ (bộ từ vẫn giữ)' + all + '?')) return;
    // đang đăng nhập: đặt mốc xoá → lan sang tài khoản + máy khác. Chưa đăng nhập: chỉ xoá trên máy này
    // (lần đăng nhập sau dữ liệu tài khoản gộp về như bình thường)
    if (all) markSrsReset(Date.now());
    srs = {}; save(K_SRS, srs);
    gameMiss = []; save(K_GAMEMISS, gameMiss);   // từ sai gắn với tiến độ cũ, giữ lại vô nghĩa. Kỷ lục game thì giữ.
    // bossProg (Pháp Sư Lexoria) KHÔNG bị xoá ở đây (user chốt, giống kỷ lục game) — nút này chỉ xoá lịch SM-2
    restartSession(); toast('Đã xoá tiến độ');
  };

  // phím tắt desktop: Space tiếp tục · 1–4 chấm · S nghe lại
  document.addEventListener('keydown', e => {
    if (/INPUT|TEXTAREA/.test(e.target.tagName)) return;
    // đang chơi: phím của màn ôn không áp dụng. Bắn máy bay / Chém chữ: Esc = tạm dừng/chơi tiếp (thoát bằng nút ←)
    if (game) {
      if (e.key !== 'Escape') return;
      if (game.id === 'planes' && !game.over && planeUi && planeUi.started) togglePlanePause();
      else if (game.id === 'fruit' && !game.over && fruitUi && fruitUi.started) toggleFruitPause();
      // Pháp sư: trong trận Esc xử lý ở ô gõ; tới đây là lúc ô gõ mất focus (đang tạm dừng) → chơi tiếp
      else if (game.id === 'boss' && !game.over && bossUi && bossUi.started) toggleBossPause();
      else quitGame();
      return;
    }
    if (stage === 'dialogue' && e.key === 'Escape') { closeStage(); return; }
    if (stage !== 'review') return;
    if (e.key === 'Escape') { closeStage(); return; }
    if (e.key === ' ') { e.preventDefault(); const b = $('#b-next') || $('#b-reveal') || $('#b-check') || $('#b-done'); if (b && !b.hidden) b.click(); }
    if (e.key.toLowerCase() === 's' && cur) speak(cur.context || cur.word);
    if (step === 4 && '1234'.indexOf(e.key) >= 0) { const b = document.querySelector('.grade .g' + (+e.key - 1)); if (b) b.click(); }
  });
}

/* Màn chờ khởi động (#boot trong index.html): mạng chậm thì đổi lời nhắn, xong thì mờ dần rồi gỡ khỏi DOM */
const BOOT_SLOW_MS = 5000, BOOT_FADE_MS = 260;
function hideBoot() {
  const el = $('#boot');
  if (!el) return;
  clearTimeout(bootSlowT);
  el.classList.add('boot-done');
  setTimeout(() => el.remove(), BOOT_FADE_MS);
}
const bootSlowT = setTimeout(() => { const m = $('#bootMsg'); if (m) m.textContent = 'Mạng hơi chậm, vẫn đang tải…'; }, BOOT_SLOW_MS);

(async function init() {
  try { await boot(); } finally { hideBoot(); }   // lỗi giữa chừng cũng không được kẹt màn chờ
})();

async function boot() {
  // bộ từ tải mỗi lần mở: /api/words (DB; SW network-first, mất mạng thì bản đã cache) → lỗi thì words.json
  const src = await fetchFirstOk(deckSources(Date.now()), u => fetch(u), isDeckJson);
  if (src) {
    const j = src.data;
    deck = { deck: j.deck || 'Bộ từ của tôi', words: (j.words || j).map(normWord).filter(Boolean) };
  } /* không nguồn nào được (file:// hoặc offline lần đầu) → giữ bộ rỗng, render() báo lỗi */
  try { localStorage.removeItem(K_DECK); } catch (e) {}
  // bỏ tiến độ của từ đã gỡ khỏi bộ — chỉ khi bộ từ đến từ API; bản fallback words.json có thể lệch DB nên không dọn
  if (src && shouldPruneDeck(src.tag) && pruneSrs(deck, srs)) save(K_SRS, srs);
  bindUI();
  rollDay();
  const initialMiss = gameMiss.slice();   // giữ lại để dựng lại hàng đợi sau lần đồng bộ đầu
  queue = buildQueue(deck, srs, cfg, Date.now(), gameMiss);
  consumeGameMiss();
  renderAccount(); bindSyncLifecycle();
  showTab('plan');
  syncNow({ initial: true, miss: initialMiss });   // chưa đăng nhập → không làm gì
  setInterval(() => { if (day.date !== dkey() && tab === 'plan' && !stage) renderPlan(); }, 60000);
}
