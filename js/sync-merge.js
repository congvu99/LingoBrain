/* Đồng bộ tiến độ đa thiết bị — phần thuần, dùng chung trình duyệt + Node server.
   Không đụng DOM/localStorage. Hợp đồng payload v1:
     { v:1, srsEpoch, srs:{[id]:rec}, cfg:{data,ts}, plan:{data,ts}, day:{data,ts}, gameScore:{[g]:{best,plays}}, boss }
     boss = eng.boss.v1, làm sạch/gộp ở boss-progress-sync-merge.js (hợp đồng chỉ tiến, không được gỡ).
   mergeSync giao hoán + idempotent → client luôn áp local = mergeSync(local, response) an toàn. */
(function (root) {
  const SYNC_DAY = 86400000;
  const SYNC_KEYS = ['eng.srs.v2', 'eng.cfg.v1', 'eng.plan.v1', 'eng.day.v1', 'eng.gamescore.v1', 'eng.boss.v1'];
  const SCHED = ['ef', 'ivl', 'due', 'state', 'reps', 'lapses', 'last', 'lastMode'];   // trường lịch SM-2
  const STATES = ['new', 'learning', 'review', 'relearn'];
  const WORD_ID = /^[a-z0-9_-]{1,64}$/, TASK_ID = /^[a-z0-9_-]{1,32}$/, DATE = /^\d{4}-\d{2}-\d{2}$/;
  const BANNED = ['__proto__', 'constructor', 'prototype'];
  const SENT_MAX = 5, HIST_KEEP = 50, HIST_SEND = 20;
  // trần số key: chặn payload phình (words.json có ~5000 mục, chừa gấp đôi; giáo án tối đa 30 việc)
  const SRS_MAX = 10000, TASK_MAX = 30, HISTORY_DAYS = 400;

  // lấy lúc gọi: Node (server, có module) → require; trình duyệt / vm test → hàm global đã nạp trước
  const bossApi = () => typeof module !== 'undefined' && module.exports ? require('./boss-progress-sync-merge.js') : root;
  const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
  const okKey = (k, rx) => rx.test(k) && BANNED.indexOf(k) < 0;
  const str = v => JSON.stringify(v);
  const clone = v => v == null ? null : JSON.parse(JSON.stringify(v));
  const cmp = (a, b) => a > b ? 1 : a < b ? -1 : 0;
  const arr = v => Array.isArray(v) ? v : [];
  const recency = r => Math.max(r.last || 0, r.mt || 0);
  // giữ tối đa max record mới nhất (tất định: recency giảm dần, rồi id) — top-k theo thứ tự toàn phần nên vẫn kết hợp
  function capSrs(srs) {
    const ids = Object.keys(srs);
    if (ids.length <= SRS_MAX) return srs;
    const out = {};
    ids.sort((x, y) => recency(srs[y]) - recency(srs[x]) || cmp(x, y)).slice(0, SRS_MAX).forEach(id => { out[id] = srs[id]; });
    return out;
  }
  // history: giữ HISTORY_DAYS ngày mới nhất (key YYYY-MM-DD so chuỗi = so ngày)
  function capHistory(h) { const out = {}; Object.keys(h).sort().slice(-HISTORY_DAYS).forEach(k => { out[k] = h[k]; }); return out; }

  /* ---------- gộp ---------- */
  // record thắng: last lớn hơn → reps → trường lịch → câu (tất định cả hai phía ⇒ giao hoán)
  function recKey(r) { const s = {}; SCHED.forEach(k => { s[k] = r[k]; }); return s; }
  function cmpRec(a, b) {
    return cmp(a.last || 0, b.last || 0) || cmp(a.reps || 0, b.reps || 0) ||
      cmp(str(recKey(a)), str(recKey(b))) || cmp(str(arr(a.sentences)), str(arr(b.sentences)));
  }
  function mergeRec(a, b, histMax) {
    a = a || b; b = b || a;   // chỉ có một bên → gộp với chính nó để chuẩn hoá y như hai bên (giữ idempotent)
    const win = cmpRec(a, b) >= 0 ? a : b, lose = win === a ? b : a;
    const out = recKey(win);
    // câu: của bản thua (chưa có) trước, bản thắng sau → câu mới nhất của bản thắng nằm cuối
    const ws = arr(win.sentences).filter(s => typeof s === 'string');
    const sent = arr(lose.sentences).filter(s => typeof s === 'string' && ws.indexOf(s) < 0).concat(ws);
    out.sentences = sent.filter((s, i) => sent.indexOf(s) === i).slice(-SENT_MAX);
    // hist: hợp theo t+g+mode → hai máy ôn cùng từ offline vẫn đủ lượt
    const seen = {}, hist = [];
    arr(a.hist).concat(arr(b.hist)).forEach(h => {
      if (!isObj(h) || typeof h.t !== 'number') return;
      const k = h.t + '|' + h.g + '|' + h.mode;
      if (!seen[k]) { seen[k] = 1; hist.push({ t: h.t, g: h.g, mode: h.mode }); }
    });
    hist.sort((x, y) => x.t - y.t || cmp(x.g + x.mode, y.g + y.mode));
    out.hist = hist.slice(-histMax);
    const mt = Math.max(a.mt || 0, b.mt || 0);
    if (mt) out.mt = mt;
    return clone(out);
  }
  // {data, ts}: ts lớn hơn thắng nguyên khối; hoà → so chuỗi
  function pickTs(a, b) {
    if (!isObj(a)) return isObj(b) ? clone(b) : null;
    if (!isObj(b)) return clone(a);
    const c = cmp(a.ts || 0, b.ts || 0) || cmp(str(a.data), str(b.data));
    return clone(c >= 0 ? a : b);
  }
  function mergeSync(a, b, opts) {
    a = isObj(a) ? a : {}; b = isObj(b) ? b : {};
    const histMax = (opts && opts.histMax) || HIST_KEEP;
    const epoch = Math.max(+a.srsEpoch || 0, +b.srsEpoch || 0);
    const sa = isObj(a.srs) ? a.srs : {}, sb = isObj(b.srs) ? b.srs : {};
    // lọc từng bên TRƯỚC khi gộp: bản cũ hơn mốc xoá/khôi phục không được góp câu/hist vào record mới
    const live = r => isObj(r) && recency(r) >= epoch ? r : null;
    let srs = {};
    Object.keys(sa).concat(Object.keys(sb)).forEach(id => {
      if (srs[id] || BANNED.indexOf(id) >= 0) return;
      const ra = live(sa[id]), rb = live(sb[id]);
      if (ra || rb) srs[id] = mergeRec(ra, rb, histMax);
    });
    srs = capSrs(srs);
    // day: ngày mới hơn thắng trước (máy mở app sau không đè việc máy kia đã tích hôm nay), cùng ngày mới so ts
    const dayDate = d => isObj(d) && isObj(d.data) && typeof d.data.date === 'string' ? d.data.date : '';
    const dc = cmp(dayDate(a.day), dayDate(b.day));
    const day = dc > 0 ? pickTs(a.day, null) : dc < 0 ? pickTs(b.day, null) : pickTs(a.day, b.day);
    if (day && isObj(day.data)) {   // history: max theo ngày từ cả hai bên
      const h = {};
      [a.day, b.day].forEach(d => { const x = d && isObj(d.data) && isObj(d.data.history) ? d.data.history : {}; for (const k in x) if (BANNED.indexOf(k) < 0) h[k] = Math.max(h[k] || 0, +x[k] || 0); });
      day.data.history = capHistory(h);
    }
    const gameScore = {}, ga = isObj(a.gameScore) ? a.gameScore : {}, gb = isObj(b.gameScore) ? b.gameScore : {};
    Object.keys(ga).concat(Object.keys(gb)).forEach(g => {
      if (BANNED.indexOf(g) >= 0) return;
      const x = ga[g] || {}, y = gb[g] || {};
      gameScore[g] = { best: Math.max(+x.best || 0, +y.best || 0), plays: Math.max(+x.plays || 0, +y.plays || 0) };
    });
    return { v: 1, srsEpoch: epoch, srs, cfg: pickTs(a.cfg, b.cfg), plan: pickTs(a.plan, b.plan), day, gameScore, boss: bossApi().mergeBoss(a.boss, b.boss) };
  }

  /* ---------- làm sạch payload lạ (server chạy trước khi gộp) ---------- */
  function num(v, def, min, max) { return typeof v === 'number' && isFinite(v) ? Math.min(max, Math.max(min, v)) : def; }
  function int(v, def, min, max) { return Math.round(num(v, def, min, max)); }
  function text(v, max) { return typeof v === 'string' ? v.slice(0, max) : ''; }
  // mốc thời gian: hữu hạn ≥ 0; tương lai quá now+1 ngày → kẹp về now (chống lệch đồng hồ, chống 1e308 khoá chết)
  function stamp(v, now) { const t = num(v, 0, 0, Infinity); return t > now + SYNC_DAY ? now : t; }
  function cleanRec(r, now) {
    r = isObj(r) ? r : {};
    const out = {
      ef: num(r.ef, 2.5, 1.3, 10), ivl: num(r.ivl, 0, 0, 36500), due: num(r.due, 0, 0, 8.64e15),
      state: STATES.indexOf(r.state) >= 0 ? r.state : 'new', reps: int(r.reps, 0, 0, 1e6), lapses: int(r.lapses, 0, 0, 1e6),
      last: stamp(r.last, now), lastMode: text(r.lastMode, 20),
      sentences: (Array.isArray(r.sentences) ? r.sentences : []).filter(s => typeof s === 'string').map(s => s.slice(0, 500)).slice(-SENT_MAX),
      hist: (Array.isArray(r.hist) ? r.hist : []).filter(h => isObj(h) && typeof h.t === 'number' && isFinite(h.t) && [0, 1, 2, 3].indexOf(h.g) >= 0)
        .map(h => ({ t: stamp(h.t, now), g: h.g, mode: text(h.mode, 20) })).slice(-HIST_KEEP)
    };
    const mt = stamp(r.mt, now);
    if (mt) out.mt = mt;
    return out;
  }
  function cleanMap(o, rx, fn, max) {
    const out = {};
    let n = 0;
    if (isObj(o)) Object.keys(o).forEach(k => {
      if (n >= (max || Infinity) || !okKey(k, rx)) return;
      const v = fn(o[k]);
      if (v !== undefined) { out[k] = v; n++; }
    });
    return out;
  }
  function cleanTs(x, now, fn) {
    if (!isObj(x)) return null;
    const data = fn(x.data);
    return data == null ? null : { data, ts: stamp(x.ts, now) };
  }
  function cleanPlan(d) {
    if (!Array.isArray(d)) return null;
    return d.filter(t => isObj(t) && typeof t.id === 'string' && okKey(t.id, TASK_ID)).slice(0, TASK_MAX).map(t => {
      const o = { id: t.id, time: text(t.time, 300), dur: text(t.dur, 300), title: text(t.title, 300), desc: text(t.desc, 300) };
      if (['add', 'rec', 'play'].indexOf(t.act) >= 0) o.act = t.act;
      return o;
    });
  }
  function cleanDay(d, now) {
    if (!isObj(d) || typeof d.date !== 'string' || !DATE.test(d.date)) return null;
    // ngày tương lai (đồng hồ máy chạy nhanh) sẽ thắng mọi máy theo luật "ngày mới hơn thắng" → loại; +2 ngày chừa lệch múi giờ
    if (d.date > new Date(now + 2 * SYNC_DAY).toISOString().slice(0, 10)) return null;
    return {
      date: d.date, streak: int(d.streak, 0, 0, 1e5),
      done: cleanMap(d.done, TASK_ID, v => typeof v === 'number' && isFinite(v) ? stamp(v, now) : undefined, TASK_MAX),
      history: capHistory(cleanMap(d.history, DATE, v => typeof v === 'number' && isFinite(v) ? int(v, 0, 0, 1000) : undefined)),
      caption: cleanMap(d.caption, TASK_ID, v => typeof v === 'string' ? v.slice(0, 500) : undefined, TASK_MAX)
    };
  }
  function sanitizePayload(p, now) {
    p = isObj(p) ? p : {};
    let games = 0;
    return {
      v: 1, srsEpoch: stamp(p.srsEpoch, now),
      srs: capSrs(cleanMap(p.srs, WORD_ID, r => cleanRec(r, now))),
      cfg: cleanTs(p.cfg, now, d => isObj(d) ? { newPerDay: int(d.newPerDay, 5, 1, 50), maxSession: int(d.maxSession, 40, 5, 200) } : null),
      plan: cleanTs(p.plan, now, cleanPlan),
      day: cleanTs(p.day, now, d => cleanDay(d, now)),
      gameScore: cleanMap(p.gameScore, TASK_ID, g => isObj(g) && ++games <= 20 ? { best: num(g.best, 0, 0, 1e9), plays: int(g.plays, 0, 0, 1e9) } : undefined),
      boss: bossApi().cleanBoss(p.boss, now)
    };
  }

  /* ---------- state app ↔ payload ---------- */
  // state = {srs, cfg, plan, day, gameScore, boss}; meta = eng.syncmeta.v1. hist gửi đi chỉ histMax mục cuối.
  function toPayload(state, meta, histMax) {
    state = state || {}; meta = meta || {};
    const n = histMax || HIST_SEND, srs = {};
    for (const id in (state.srs || {})) { const r = Object.assign({}, state.srs[id]); r.hist = (r.hist || []).slice(-n); srs[id] = r; }
    const wrap = (data, ts) => data == null ? null : { data: clone(data), ts: ts || 0 };
    return {
      v: 1, srsEpoch: meta.srsEpoch || 0, srs: clone(srs),
      cfg: state.cfg ? wrap({ newPerDay: state.cfg.newPerDay, maxSession: state.cfg.maxSession }, meta.cfgTs) : null,
      plan: wrap(state.plan, meta.planTs), day: wrap(state.day, meta.dayTs), gameScore: clone(state.gameScore || {}), boss: clone(state.boss)
    };
  }
  function fromPayload(p) {
    p = isObj(p) ? p : {};
    const d = x => isObj(x) && x.data != null ? clone(x.data) : null, t = x => isObj(x) ? x.ts || 0 : 0;
    return {
      srs: clone(isObj(p.srs) ? p.srs : {}), cfg: d(p.cfg), plan: d(p.plan), day: d(p.day), gameScore: clone(isObj(p.gameScore) ? p.gameScore : {}), boss: clone(isObj(p.boss) ? p.boss : null),
      meta: { cfgTs: t(p.cfg), planTs: t(p.plan), dayTs: t(p.day), srsEpoch: +p.srsEpoch || 0 }
    };
  }
  function isSyncedKey(k) { return SYNC_KEYS.indexOf(k) >= 0; }

  const api = { mergeSync, sanitizePayload, toPayload, fromPayload, isSyncedKey };
  Object.assign(root, api);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
