/* Đồng bộ tiến độ với server (chỉ khi đã đăng nhập). localStorage vẫn là nguồn chính; lỗi mạng thì im lặng thử lại.
   Không đụng DOM ở top-level → nạp được trong Node để test (tests/cloud-sync-engine.test.js).
   Cần: js/sync-merge.js (mergeSync, toPayload, fromPayload, isSyncedKey) + global của app-storage/daily-plan.
   Giao diện tài khoản: js/cloud-sync-account-ui.js (hook onSyncStatus). */

const K_AUTH = 'eng.auth.v1', K_SYNCMETA = 'eng.syncmeta.v1';
const SYNC_DEBOUNCE = 10000, SYNC_BACKOFF_MIN = 30000, SYNC_BACKOFF_MAX = 600000, SYNC_TIMEOUT = 20000;
const TS_FIELD = { 'eng.cfg.v1': 'cfgTs', 'eng.plan.v1': 'planTs', 'eng.day.v1': 'dayTs' };

let syncRun;
function resetSyncRun() {
  if (syncRun) clearTimeout(syncRun.timer);
  // initialMiss !== null: còn chờ lần sync THÀNH CÔNG đầu tiên để dựng lại hàng đợi (lần đầu có thể lỗi rồi thử lại)
  syncRun = { inFlight: false, dirty: false, applying: false, timer: 0, backoff: 0, retryAt: 0, status: 'idle', blocked: false, lastAt: 0, initialMiss: null };
}
resetSyncRun();
function syncRunState() { return Object.assign({}, syncRun); }

/* ---- meta + tài khoản trong localStorage (ghi thẳng, không qua save() để khỏi kích hoạt hook) ---- */
function readJson(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
function writeJson(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* bộ nhớ đầy: bỏ qua */ } }
function syncMeta() { return readJson(K_SYNCMETA, {}); }
function setSyncMeta(patch) { const m = Object.assign(syncMeta(), patch); writeJson(K_SYNCMETA, m); return m; }
function authInfo() { const a = readJson(K_AUTH, null); return a && a.token ? a : null; }
function setAuth(a) { writeJson(K_AUTH, { token: a.token, username: a.username }); syncRun.blocked = false; }
function clearAuth() { try { localStorage.removeItem(K_AUTH); } catch (e) {} cancelScheduledSync(); }

function setSyncStatus(s) { syncRun.status = s; if (typeof onSyncStatus === 'function') onSyncStatus(s); }

/* ---- hook từ save() (app-storage.js): đóng dấu ts cho cfg/plan/day + lên lịch sync ---- */
// opts.stamp === false: lưu kỹ thuật (vd. rollDay sang ngày mới) — không phải người dùng sửa, không được thắng khi gộp
function onLocalSave(k, opts) {
  if (syncRun.applying) return;
  if (TS_FIELD[k] && !(opts && opts.stamp === false)) setSyncMeta({ [TS_FIELD[k]]: Date.now() });
  if (isSyncedKey(k)) scheduleSync();
}
function scheduleSync(delay) {
  if (!authInfo() || syncRun.blocked) return;
  syncRun.dirty = true;
  clearTimeout(syncRun.timer);
  const wait = Math.max(delay == null ? SYNC_DEBOUNCE : delay, syncRun.retryAt - Date.now(), 0);
  syncRun.timer = setTimeout(() => syncNow(), wait);
}
function cancelScheduledSync() { clearTimeout(syncRun.timer); syncRun.timer = 0; syncRun.dirty = false; }

/* ---- xoá / khôi phục / đổi tài khoản ---- */
// "Xoá tiến độ": mốc epoch → mọi record sửa trước mốc bị loại khi gộp, kể cả từ máy khác chưa biết đã xoá
function markSrsReset(now) { setSyncMeta({ srsEpoch: now }); }
// khôi phục backup: record cũ mang mt = now để thắng mốc epoch mới → backup thay dữ liệu tài khoản
function stampRestoredSrs(s, now) { for (const id in s) s[id].mt = now; setSyncMeta({ srsEpoch: now }); }
function hasLocalProgress() { return Object.keys(srs || {}).length > 0; }
// máy đang giữ dữ liệu của tài khoản khác → phải hỏi (cả khi chưa có từ nào: còn giáo án, cài đặt, kỷ lục)
function needsOwnerPrompt(username) { const o = syncMeta().owner; return !!o && o !== username; }
// đổi chủ dữ liệu trên máy. Mốc xoá/khôi phục và dấu ts là của chủ cũ — mang sang sẽ xoá oan tiến độ TK mới → luôn về 0.
// replace = true: bỏ dữ liệu trên máy, dùng dữ liệu tài khoản; false: gộp record của máy vào tài khoản.
function switchOwner(username, replace) {
  if (replace) resetLocalToDefaults();
  setSyncMeta({ owner: username, srsEpoch: 0, cfgTs: 0, planTs: 0, dayTs: 0 });
}
// chọn "dùng dữ liệu tài khoản": state về mặc định, ts = 0 → dữ liệu server thắng hết khi gộp
function resetLocalToDefaults() {
  syncRun.applying = true;
  try {
    srs = {}; Object.assign(cfg, { newPerDay: 5, maxSession: 40 });
    plan = DEFAULT_PLAN.map(t => Object.assign({}, t));
    // ngày cũ → day của tài khoản trên server luôn thắng (streak đúng); rollDay sau khi áp sẽ đưa về hôm nay
    day = { date: '1970-01-01', done: {}, streak: 0, history: {}, caption: {} };
    gameScore = {}; gameMiss = [];
    save('eng.gamemiss.v1', gameMiss);
    save('eng.srs.v2', srs); save('eng.cfg.v1', cfg); save('eng.plan.v1', plan); save('eng.day.v1', day); save('eng.gamescore.v1', gameScore);
    setSyncMeta({ cfgTs: 0, planTs: 0, dayTs: 0, srsEpoch: 0 });
  } finally { syncRun.applying = false; }
}

/* ---- áp dữ liệu đã gộp vào state app ---- */
function localPayload(histMax) { return toPayload({ srs, cfg, plan, day, gameScore }, syncMeta(), histMax); }
function applySyncPayload(p) {
  const f = fromPayload(p), m = {};
  const keepPlan = typeof planEditPending === 'function' && planEditPending();   // đang sửa giáo án dở → không đè
  syncRun.applying = true;
  try {
    srs = f.srs; save('eng.srs.v2', srs);
    if (f.cfg) { Object.assign(cfg, f.cfg); save('eng.cfg.v1', cfg); m.cfgTs = f.meta.cfgTs; }   // cfg là const → Object.assign
    if (f.plan && !keepPlan) { plan = f.plan; save('eng.plan.v1', plan); m.planTs = f.meta.planTs; }
    // day ngày tương lai (máy khác lệch đồng hồ) → giữ local, nếu không rollDay sẽ xoá tích + gây vòng lặp sync
    if (f.day && !(typeof dkey === 'function' && f.day.date > dkey())) { day = f.day; save('eng.day.v1', day); m.dayTs = f.meta.dayTs; }
    gameScore = f.gameScore; save('eng.gamescore.v1', gameScore);
    m.srsEpoch = f.meta.srsEpoch;
    setSyncMeta(m);
  } finally { syncRun.applying = false; }
}

/* ---- gọi server ---- */
function classifySyncResponse(status, json) {
  if (status >= 200 && status < 300 && json) return 'ok';
  if (status === 401) return 'auth';
  if (status === 413) return 'too-big';
  return 'retry';   // 429, 5xx, 503, 404/405 (hosting tĩnh sau rollback), không phải JSON
}
// timeout: request treo (mạng chập chờn, iOS đóng băng trang) không được giữ inFlight mãi
async function putSync(payload, token) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), (typeof SYNC_TIMEOUT_OVERRIDE !== 'undefined' && SYNC_TIMEOUT_OVERRIDE) || SYNC_TIMEOUT);
  try {
    const r = await fetch('/api/sync', { method: 'PUT', signal: ctl.signal, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ data: payload }) });
    let json = null;
    if (/json/i.test((r.headers && r.headers.get && r.headers.get('content-type')) || '')) { try { json = await r.json(); } catch (e) { json = null; } }
    return { kind: classifySyncResponse(r.status, json && json.data ? json : null), json };
  } finally { clearTimeout(t); }
}
// opts.initial: lần mở app — sau khi áp gọi onInitialSyncApplied(opts.miss) để dựng lại hàng đợi nếu chưa vào ôn
async function syncNow(opts) {
  const auth = authInfo();
  if (!auth || syncRun.blocked) return;
  if (opts && opts.initial) syncRun.initialMiss = opts.miss || [];
  if (syncRun.inFlight) { syncRun.dirty = true; return; }
  clearTimeout(syncRun.timer);
  syncRun.inFlight = true; syncRun.dirty = false; syncRun.lastAt = Date.now(); setSyncStatus('syncing');
  let res;
  try { res = await putSync(localPayload(), auth.token); } catch (e) { res = { kind: 'retry' }; }
  syncRun.inFlight = false; syncRun.lastAt = Date.now();
  // đổi/đăng xuất tài khoản trong lúc request bay → phản hồi thuộc TK cũ: bỏ, không áp, không xoá token mới
  const current = authInfo();
  if (!current || current.token !== auth.token) { if (current) scheduleSync(0); return; }
  if (res.kind === 'ok') {
    // gộp với state HIỆN TẠI (không ghi đè): lượt chấm xen giữa lúc request bay vẫn giữ, hist local 50 mục vẫn đủ
    applySyncPayload(mergeSync(localPayload(50), res.json.data));
    syncRun.backoff = 0; syncRun.retryAt = 0;
    setSyncMeta({ syncedAt: Date.now(), owner: auth.username });
    setSyncStatus('ok');
    // hook giao diện lỗi không được làm kẹt trạng thái / bỏ lịch sync kế
    try {
      if (typeof rollDay === 'function') rollDay();   // dữ liệu về có thể là ngày cũ
      if (syncRun.initialMiss && typeof onInitialSyncApplied === 'function') { const miss = syncRun.initialMiss; syncRun.initialMiss = null; onInitialSyncApplied(miss); }
      if (typeof refreshAfterSync === 'function') refreshAfterSync();
    } catch (e) { if (typeof console !== 'undefined') console.error('sync hook', e); }
    if (syncRun.dirty) scheduleSync();
  } else if (res.kind === 'auth') {
    clearAuth(); setSyncStatus('signedout');
    if (typeof toast === 'function') toast('Phiên đăng nhập hết hạn, hãy đăng nhập lại');
  } else if (res.kind === 'too-big') {
    syncRun.blocked = true; cancelScheduledSync(); setSyncStatus('toobig');
  } else {
    syncRun.backoff = Math.min(syncRun.backoff ? syncRun.backoff * 2 : SYNC_BACKOFF_MIN, SYNC_BACKOFF_MAX);
    syncRun.retryAt = Date.now() + syncRun.backoff;
    setSyncStatus('retry');
    scheduleSync(syncRun.backoff);
  }
}

/* ---- vòng đời trang: gọi 1 lần từ app-shell init ---- */
function bindSyncLifecycle() {
  const wake = () => { if (authInfo() && !syncRun.inFlight && Date.now() - syncRun.lastAt > 60000 && Date.now() >= syncRun.retryAt) syncNow(); };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { if (syncRun.dirty && Date.now() >= syncRun.retryAt) syncNow(); }
    else wake();
  });
  window.addEventListener('pageshow', wake);
  window.addEventListener('online', () => { syncRun.retryAt = 0; if (authInfo()) syncNow(); });   // có mạng lại: khỏi chờ backoff
}
