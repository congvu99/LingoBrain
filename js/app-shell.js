/* Điều hướng tab, gắn sự kiện tab Quản lý, phím tắt, khởi động. Nạp cuối cùng. */

const TITLES = { plan: 'Hôm nay, mình học nhé!', game: 'Thêm từ mới, thêm tự tin.', manage: 'Góc học của riêng bạn.' };
const PAGE_INTRO = {
  plan: ['HÀNH TRÌNH MỖI NGÀY', 'Một chút tiếng Anh. Thêm một chút tự tin.'],
  game: ['ÔN TỪ & GHI NHỚ', 'Gặp lại từ quen, khám phá điều mới.'],
  manage: ['THEO CÁCH CỦA BẠN', 'Theo dõi bộ từ và tạo một lịch học vừa sức.']
};
function showTab(t) {
  closeGame();                           // bỏ ván đang chơi: không lưu điểm, vẫn lưu từ sai
  tab = t;
  ['plan', 'game', 'manage'].forEach(k => {
    $('#tab-' + k).hidden = t !== k;
    const b = $('#nav-' + k); b.classList.toggle('on', t === k); b.setAttribute('aria-current', t === k ? 'page' : 'false');
  });
  $('#hTitle').textContent = TITLES[t];
  $('#pageEyebrow').textContent = PAGE_INTRO[t][0];
  $('#pageSubtitle').textContent = PAGE_INTRO[t][1];
  $('#hSub').hidden = t !== 'game';
  $('#hSub').textContent = t === 'game' ? deck.words.length + ' từ' : '';
  $('#appScroll').scrollTo(0, 0);        // document bị khoá cuộn, nội dung cuộn trong #appScroll
  if (t === 'plan') renderPlan();
  if (t === 'game') render();
  if (t === 'manage') { renderList(); renderPlanEdit(); }
  const main = $('main'); if (main) main.focus({ preventScroll: true });
}
function updateDots() {
  const left = plan.length - planDone();
  const d1 = $('#dotPlan'); d1.hidden = left <= 0; d1.textContent = left;
  const s = deckSummary(deck, srs, Date.now()), n = s.due + Math.min(s.fresh, cfg.newPerDay);
  const d2 = $('#dotGame'); d2.hidden = n <= 0; d2.textContent = n > 99 ? '99+' : n;
}

function bindUI() {
  $('#nav-plan').onclick = () => showTab('plan');
  $('#btnTodayStart').onclick = () => showTab('game');
  $('#nav-game').onclick = () => showTab('game');
  $('#nav-manage').onclick = () => showTab('manage');

  $('#btnResetDay').onclick = () => { if (!confirm('Bỏ tích toàn bộ việc hôm nay?')) return; day.done = {}; save(K_DAY, day); renderPlan(); toast('Đã đặt lại'); };
  $('#btnPlanSave').onclick = () => { collectPlanEdit(); plan = plan.filter(t => t.title.trim()); save(K_PLAN, plan); renderPlanEdit(); renderPlan(); toast('✅ Đã lưu giáo án'); };
  $('#btnPlanAdd').onclick = () => { collectPlanEdit(); plan.push({ id: 't' + Date.now(), time: '22:00', dur: '10 phút', title: 'Việc mới', desc: '' }); renderPlanEdit(); };
  $('#btnPlanDefault').onclick = () => { if (!confirm('Khôi phục giáo án mặc định?')) return; plan = DEFAULT_PLAN.map(t => Object.assign({}, t)); save(K_PLAN, plan); renderPlanEdit(); renderPlan(); toast('Đã khôi phục'); };

  $('#setNew').value = cfg.newPerDay; $('#setMax').value = cfg.maxSession;
  $('#setNew').onchange = e => { cfg.newPerDay = Math.max(1, +e.target.value || 5); save(K_CFG, cfg); restartSession(); };
  $('#setMax').onchange = e => { cfg.maxSession = Math.max(5, +e.target.value || 40); save(K_CFG, cfg); restartSession(); };
  // backup chỉ chứa tiến độ + giáo án + cài đặt; bộ từ luôn lấy từ words.json
  $('#btnExportAll').onclick = () => download('lingobrain-backup-' + dkey() + '.json', { version: APP_VERSION, srs, cfg, plan, day, gameScore, gameMiss });
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
    restartSession(); renderList(); toast('Đã xoá tiến độ');
  };

  // phím tắt desktop: Space tiếp tục · 1–4 chấm · S nghe lại
  document.addEventListener('keydown', e => {
    if (/INPUT|TEXTAREA/.test(e.target.tagName)) return;
    // đang chơi: phím của màn ôn không áp dụng. Bắn máy bay: Esc = tạm dừng/chơi tiếp (thoát bằng nút ←)
    if (game) { if (e.key === 'Escape') { if (game.id === 'planes' && !game.over && planeUi && planeUi.started) togglePlanePause(); else quitGame(); } return; }
    if (tab !== 'game') return;
    if (e.key === ' ') { e.preventDefault(); const b = $('#b-next') || $('#b-reveal') || $('#b-check') || $('#b-done'); if (b && !b.hidden) b.click(); }
    if (e.key.toLowerCase() === 's' && cur) speak(cur.context || cur.word);
    if (step === 4 && '1234'.indexOf(e.key) >= 0) { const b = document.querySelector('.grade .g' + (+e.key - 1)); if (b) b.click(); }
  });
}

(async function init() {
  // words.json là nguồn duy nhất: tải mỗi lần mở (SW network-first → bản mới nhất, mất mạng thì bản đã cache)
  try {
    const r = await fetch('words.json?_=' + Date.now());
    if (!r.ok) throw 0;
    const j = await r.json();
    deck = { deck: j.deck || 'Bộ từ của tôi', words: (j.words || j).map(normWord).filter(Boolean) };
  } catch (e) { /* file:// hoặc offline lần đầu → giữ bộ rỗng, render() báo lỗi */ }
  try { localStorage.removeItem(K_DECK); } catch (e) {}
  if (pruneSrs(deck, srs)) save(K_SRS, srs);   // bỏ tiến độ của từ tự nạp cũ / từ đã gỡ khỏi words.json
  bindUI();
  rollDay();
  const initialMiss = gameMiss.slice();   // giữ lại để dựng lại hàng đợi sau lần đồng bộ đầu
  queue = buildQueue(deck, srs, cfg, Date.now(), gameMiss);
  consumeGameMiss();
  renderAccount(); bindSyncLifecycle();
  showTab('plan');
  syncNow({ initial: true, miss: initialMiss });   // chưa đăng nhập → không làm gì
  setInterval(() => { if (day.date !== dkey() && tab === 'plan') renderPlan(); }, 60000);
})();
