/* Điều hướng tab, gắn sự kiện tab Quản lý, phím tắt, khởi động. Nạp cuối cùng. */

const TITLES = { plan: 'Giáo án hôm nay', game: 'Ôn từ', manage: 'Quản lý' };
function showTab(t) {
  closeGame();                           // bỏ ván đang chơi: không lưu điểm, vẫn lưu từ sai
  tab = t;
  ['plan', 'game', 'manage'].forEach(k => {
    $('#tab-' + k).hidden = t !== k;
    const b = $('#nav-' + k); b.classList.toggle('on', t === k); b.setAttribute('aria-current', t === k ? 'page' : 'false');
  });
  $('#hTitle').textContent = TITLES[t];
  $('#hSub').textContent = t === 'game' ? deck.words.length + ' từ' : '';
  window.scrollTo(0, 0);
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
  $('#nav-game').onclick = () => showTab('game');
  $('#nav-manage').onclick = () => showTab('manage');

  $('#btnResetDay').onclick = () => { if (!confirm('Bỏ tích toàn bộ việc hôm nay?')) return; day.done = {}; save(K_DAY, day); renderPlan(); toast('Đã đặt lại'); };
  $('#btnPlanSave').onclick = () => { collectPlanEdit(); plan = plan.filter(t => t.title.trim()); save(K_PLAN, plan); renderPlanEdit(); renderPlan(); toast('✅ Đã lưu giáo án'); };
  $('#btnPlanAdd').onclick = () => { collectPlanEdit(); plan.push({ id: 't' + Date.now(), time: '22:00', dur: '10 phút', title: 'Việc mới', desc: '' }); renderPlanEdit(); };
  $('#btnPlanDefault').onclick = () => { if (!confirm('Khôi phục giáo án mặc định?')) return; plan = DEFAULT_PLAN.map(t => Object.assign({}, t)); save(K_PLAN, plan); renderPlanEdit(); renderPlan(); toast('Đã khôi phục'); };

  // nạp từ: 1 ô dán (text hoặc JSON), file, form nhanh
  $('#btnImport').onclick = () => { importWords($('#importBox').value); $('#importBox').value = ''; };
  $('#btnFile').onclick = () => $('#fileIn').click();
  $('#fileIn').onchange = e => { const f = e.target.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => importWords(rd.result); rd.readAsText(f); e.target.value = ''; };
  $('#btnSample').onclick = () => { $('#importBox').value = 'reckon | nghĩ rằng, cho là | I reckon we\'ll be there before midnight. | Peaky Blinders S1E2\nstubborn | bướng bỉnh | You\'re the most stubborn person I\'ve ever met. | The Notebook'; };
  $('#btnAdd').onclick = () => {
    const w = normWord({ word: $('#aWord').value, ipa: $('#aIpa').value, meaning: $('#aMeaning').value, context: $('#aCtx').value, source: $('#aSrc').value, emoji: $('#aEmoji').value, mnemonic: $('#aMne').value });
    if (!w || !w.meaning) return toast('❌ Cần ít nhất từ + nghĩa');
    importWords(JSON.stringify([w]));
    ['#aWord', '#aIpa', '#aMeaning', '#aCtx', '#aSrc', '#aEmoji', '#aMne'].forEach(s => $(s).value = '');
    $('#aWord').focus();
  };

  $('#setNew').value = cfg.newPerDay; $('#setMax').value = cfg.maxSession;
  $('#setNew').onchange = e => { cfg.newPerDay = Math.max(1, +e.target.value || 5); save(K_CFG, cfg); restartSession(); };
  $('#setMax').onchange = e => { cfg.maxSession = Math.max(5, +e.target.value || 40); save(K_CFG, cfg); restartSession(); };
  $('#btnExportAll').onclick = () => download('lingobrain-backup-' + dkey() + '.json', { version: APP_VERSION, deck, srs, cfg, plan, day, gameScore, gameMiss });
  $('#btnExportDeck').onclick = () => download('words.json', deck);
  // nạp lại bộ từ gốc trên máy chủ (không cần xoá localStorage); trùng id = cập nhật nội dung, tiến độ giữ nguyên
  $('#btnReloadDeck').onclick = async () => {
    try {
      const r = await fetch('words.json?_=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) throw 0;
      importWords(await r.text());
    } catch (e) { toast('❌ Không tải được words.json (mở bằng file:// thì dùng "Chọn file")'); }
  };
  $('#btnRestore').onclick = () => $('#fileRestore').click();
  $('#fileRestore').onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => { try { const j = JSON.parse(rd.result); if (j.deck && j.srs) restoreBackup(j); else importWords(rd.result); } catch (err) { toast('❌ File không hợp lệ'); } };
    rd.readAsText(f); e.target.value = '';
  };
  $('#btnResetProg').onclick = () => {
    if (!confirm('Xoá hết tiến độ học từ (bộ từ vẫn giữ)?')) return;
    srs = {}; save(K_SRS, srs);
    gameMiss = []; save(K_GAMEMISS, gameMiss);   // từ sai gắn với tiến độ cũ, giữ lại vô nghĩa. Kỷ lục game thì giữ.
    restartSession(); renderList(); toast('Đã xoá tiến độ');
  };

  // phím tắt desktop: Space tiếp tục · 1–4 chấm · S nghe lại
  document.addEventListener('keydown', e => {
    if (/INPUT|TEXTAREA/.test(e.target.tagName)) return;
    if (game) { if (e.key === 'Escape') quitGame(); return; }   // đang chơi: phím của màn ôn không áp dụng
    if (tab !== 'game') return;
    if (e.key === ' ') { e.preventDefault(); const b = $('#b-next') || $('#b-reveal') || $('#b-check') || $('#b-done'); if (b && !b.hidden) b.click(); }
    if (e.key.toLowerCase() === 's' && cur) speak(cur.context || cur.word);
    if (step === 4 && '1234'.indexOf(e.key) >= 0) { const b = document.querySelector('.grade .g' + (+e.key - 1)); if (b) b.click(); }
  });
}

(async function init() {
  if (!deck) {
    try {
      const r = await fetch('words.json?_=' + Date.now());
      if (!r.ok) throw 0;
      const j = await r.json();
      deck = { deck: j.deck || 'Bộ từ của tôi', words: (j.words || j).map(normWord).filter(Boolean) };
    } catch (e) { deck = { deck: 'Bộ từ của tôi', words: [] }; }   // file:// chặn fetch → bộ trống
    save(K_DECK, deck);
  }
  bindUI();
  rollDay();
  queue = buildQueue(deck, srs, cfg, Date.now(), gameMiss);
  consumeGameMiss();
  showTab('plan');
  setInterval(() => { if (day.date !== dkey() && tab === 'plan') renderPlan(); }, 60000);
})();
