/* Giao diện tài khoản trong tab Quản lý (Cài đặt & sao lưu): đăng nhập / đăng ký / đăng xuất + trạng thái đồng bộ.
   Đồng bộ nằm ở js/cloud-sync-engine.js; file này là lớp DOM + các hook engine gọi (onSyncStatus, onInitialSyncApplied, refreshAfterSync). */

const ACCOUNT_USER_RX = /^[a-z0-9_]{3,20}$/;   // cùng quy tắc với server

function syncStatusText(s) {
  if (s === 'syncing') return '⏳ Đang đồng bộ…';
  if (s === 'retry') return '⚠️ Chưa đồng bộ — sẽ thử lại';
  if (s === 'toobig') return '⚠️ Dữ liệu quá lớn để đồng bộ';
  const t = syncMeta().syncedAt;
  return t ? '✓ Đã đồng bộ lúc ' + new Date(t).toTimeString().slice(0, 5) : 'Chưa đồng bộ lần nào';
}
function onSyncStatus(s) {
  if (s === 'signedout') return renderAccount();
  const el = document.getElementById('acStatus');
  if (el) el.textContent = syncStatusText(s);
}

function renderAccount() {
  const box = document.getElementById('acct');
  if (!box) return;
  const a = authInfo();
  if (a) {
    box.innerHTML = '<div class="acct-card acct-signed">' +
      '<span class="acct-avatar" aria-hidden="true">' + esc(a.username.charAt(0).toUpperCase()) + '</span>' +
      '<div class="acct-who"><b>' + esc(a.username) + '</b><span id="acStatus" class="small muted"></span></div>' +
      '<button type="button" class="btn-sm" id="acLogout">Đăng xuất</button></div>';
    $('#acStatus').textContent = syncStatusText(syncRunState().status);
    $('#acLogout').onclick = accountLogout;
    return;
  }
  box.innerHTML = '<form class="acct-card" id="acForm" autocomplete="on" novalidate>' +
    '<div class="acct-head"><span class="acct-icon" aria-hidden="true">' + ACCT_ICON.cloud + '</span>' +
      '<div><h3>Đồng bộ giữa các thiết bị</h3><p class="small muted">Đăng nhập để học tiếp trên điện thoại, máy tính.</p></div></div>' +
    '<label class="f" for="acUser">Tên đăng nhập</label>' +
    '<div class="field">' + ACCT_ICON.user + '<input id="acUser" name="username" type="text" placeholder="vd: lan_anh" autocomplete="username" autocapitalize="off" autocorrect="off" spellcheck="false" maxlength="20"></div>' +
    '<label class="f" for="acPass">Mật khẩu</label>' +
    '<div class="field">' + ACCT_ICON.lock + '<input id="acPass" name="password" type="password" placeholder="Ít nhất 6 ký tự" autocomplete="current-password" maxlength="128">' +
      '<button type="button" class="field-btn" id="acShowPass" aria-label="Hiện mật khẩu" aria-pressed="false">' + ACCT_ICON.eye + '</button></div>' +
    '<p class="acct-msg small" id="acMsg" role="status" aria-live="polite"></p>' +
    '<button type="submit" class="btn-primary acct-submit" id="acLogin">Đăng nhập</button>' +
    '<p class="acct-alt small muted">Chưa có tài khoản? <button type="button" class="btn-link" id="acRegister">Tạo tài khoản mới</button></p>' +
    '<p class="acct-note small muted">Quên mật khẩu sẽ không lấy lại được — hãy ghi nhớ cẩn thận.</p>' +
  '</form>';
  $('#acForm').onsubmit = e => { e.preventDefault(); accountSubmit('login'); };
  $('#acRegister').onclick = () => accountSubmit('register');
  $('#acShowPass').onclick = () => {
    const p = $('#acPass'), show = p.type === 'password';
    p.type = show ? 'text' : 'password';
    $('#acShowPass').setAttribute('aria-pressed', show);
    $('#acShowPass').setAttribute('aria-label', show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
  };
}

// icon nét (cùng kiểu thanh điều hướng): stroke theo currentColor
const ACCT_SVG = d => '<svg viewBox="0 0 24 24" aria-hidden="true">' + d + '</svg>';
const ACCT_ICON = {
  cloud: ACCT_SVG('<path d="M7 18h10a4 4 0 0 0 .6-7.96A6 6 0 0 0 6.1 9.2 4.5 4.5 0 0 0 7 18z"/><path d="m9.5 13.5 2 2 3.5-3.5"/>'),
  user: ACCT_SVG('<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>'),
  lock: ACCT_SVG('<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>'),
  eye: ACCT_SVG('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>')
};

async function accountSubmit(kind) {
  const u = $('#acUser').value.trim().toLowerCase(), p = $('#acPass').value;
  const msg = t => { $('#acMsg').textContent = t; };
  if (!ACCOUNT_USER_RX.test(u)) return msg('Tên 3–20 ký tự: chữ thường không dấu, số hoặc dấu _');
  if (p.length < 6 || p.length > 128) return msg('Mật khẩu 6–128 ký tự');
  const btns = [$('#acLogin'), $('#acRegister')], busy = kind === 'login' ? btns[0] : btns[1];
  // nút vừa bấm hiện vòng xoay; cả hai khoá để không gửi 2 yêu cầu song song
  const setBusy = on => { btns.forEach(x => { x.disabled = on; }); busy.classList.toggle('is-loading', on); busy.setAttribute('aria-busy', on); };
  setBusy(true);
  let r, j = null;
  try {
    r = await fetch('/api/' + kind, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: u, password: p }) });
    try { j = await r.json(); } catch (e) { j = null; }
  } catch (e) {
    setBusy(false);
    return msg('Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.');
  }
  setBusy(false);
  if (!r.ok || !j || !j.token) return msg((j && j.error) || 'Máy chủ chưa bật đồng bộ (lỗi ' + r.status + ')');
  // máy đang giữ dữ liệu của tài khoản khác → hỏi, mặc định dùng dữ liệu tài khoản mới (không tự gộp dữ liệu người khác).
  // Chưa từng thuộc TK nào → gộp tiến độ đang có lên tài khoản.
  if (needsOwnerPrompt(j.username)) {
    const replace = confirm('Máy này đang có dữ liệu của "' + syncMeta().owner + '".\nOK = dùng dữ liệu của tài khoản "' + j.username + '" (bỏ dữ liệu đang có trên máy)\nHuỷ = gộp tiến độ trên máy vào tài khoản này');
    switchOwner(j.username, replace);
    if (replace) restartSession();
  } else switchOwnerIfNew(j.username);
  setAuth(j);
  renderAccount();
  toast(kind === 'register' ? '✅ Đã tạo tài khoản, đang đồng bộ…' : '✅ Đã đăng nhập, đang đồng bộ…');
  syncNow({ initial: true, miss: [] });   // dựng lại hàng đợi ôn khi dữ liệu tài khoản về
}

async function accountLogout() {
  const a = authInfo();
  if (a) fetch('/api/logout', { method: 'POST', headers: { Authorization: 'Bearer ' + a.token } }).catch(() => {});
  clearAuth(); renderAccount();
  toast('Đã đăng xuất — tiến độ vẫn giữ trên máy này');
}

function switchOwnerIfNew(username) { if (!syncMeta().owner) setSyncMeta({ owner: username }); }

/* ---- hook engine gọi sau khi áp dữ liệu từ server ---- */
// lần mở app: dựng lại hàng đợi với dữ liệu mới nếu người dùng chưa vào ôn/chơi (giữ từ sai trong game lên đầu)
function onInitialSyncApplied(miss) {
  if (tab === 'game' || game) return;
  queue = buildQueue(deck, srs, cfg, Date.now(), miss || []);
  cur = null;
}
// vẽ lại phần đang hiện; không đụng thẻ ôn đang làm dở
function refreshAfterSync() {
  const n = $('#setNew'), m = $('#setMax');
  if (n && document.activeElement !== n) n.value = cfg.newPerDay;
  if (m && document.activeElement !== m) m.value = cfg.maxSession;
  // đang gõ câu shadowing / đang ghi âm ở tab Giáo án → vẽ lại sẽ mất chữ đang gõ và nút ghi âm; chỉ cập nhật số đếm
  const ae = document.activeElement;
  const typing = ae && /^(INPUT|TEXTAREA)$/.test(ae.tagName) && ae.type !== 'checkbox' && ae.closest && ae.closest('#tab-plan');
  const busyPlan = typing || (typeof mediaRec !== 'undefined' && mediaRec && mediaRec.state === 'recording');
  if (tab === 'plan' && !busyPlan) renderPlan();
  if (tab === 'manage') { renderList(); if (!planEditPending()) renderPlanEdit(); }
  updateDots();
  // refreshBossHub (boss-game-hub-ui.js) vẽ lại sảnh Pháp Sư Lexoria; không đụng nếu đang trong trận (hub tự biết khi nào nên vẽ lại)
  if (typeof refreshBossHub === 'function') refreshBossHub();
}
