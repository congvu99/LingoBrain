/* Tiến trình game Pháp Sư Lexoria (eng.boss.v1) — làm sạch + gộp, thuần, dùng chung trình duyệt + Node server.
   Nạp TRƯỚC sync-merge.js và app-storage.js (app-storage khởi tạo bossProg bằng emptyBoss).
   Hợp đồng CHỈ TIẾN: đã phát hành thì không gỡ boss khỏi sanitizePayload/mergeSync (gỡ = xoá boss mọi tài khoản).
   cleanBoss/mergeBoss là hàm TỔNG: mọi đầu vào (null, chuỗi, mảng, object hỏng) → object hợp lệ, không bao giờ ném. */
(function (root) {
  const BOSS_ELEMENTS = ['fire', 'ice', 'storm', 'earth', 'wind'];   // nguồn duy nhất cho mọi file boss
  const BOSS_BEATS = 28, BOSS_ENDLESS = 28;                            // beat 0..27 = truyện; 28 = vô tận
  const WINS_KEEP = 400, WINS_SCAN = 800, DAY_MS = 86400000;
  const DATE = /^\d{4}-\d{2}-\d{2}$/, BANNED = ['__proto__', 'constructor', 'prototype'];

  const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const cmp = (a, b) => a > b ? 1 : a < b ? -1 : 0;
  function num(v, def, min, max) { return typeof v === 'number' && isFinite(v) ? Math.min(max, Math.max(min, v)) : def; }
  function int(v, def, min, max) { return Math.round(num(v, def, min, max)); }
  // mốc ts: hữu hạn ≥ 0; tương lai quá now+1 ngày → kẹp về now (giống stamp của sync-merge.js)
  function stamp(v, now) { const t = num(v, 0, 0, Infinity); return t > now + DAY_MS ? now : t; }
  // ngày hợp lệ: đúng dạng, không quá now+2 ngày (chừa lệch múi giờ; ngày tương lai sẽ thắng mọi máy → loại)
  function okDate(d, now) {
    return typeof d === 'string' && DATE.test(d) && BANNED.indexOf(d) < 0 &&
      d <= new Date(now + 2 * DAY_MS).toISOString().slice(0, 10);
  }
  const isBeat = v => typeof v === 'number' && v >= 0 && v <= BOSS_ENDLESS && Math.round(v) === v;

  /* Tiến hoá: formId = '<hệ>-<a|b>[1|2]'; '' = dạng gốc. Danh sách ID ĐẶT Ở ĐÂY vì server dùng chung
     (require trực tiếp file này) — chỉ id, không tên/sprite/chỉ số (ở js/boss-game-evolution-forms.js, phía client).
     HỢP ĐỒNG CHỈ TIẾN: id đã phát hành KHÔNG được đổi tên/xoá khỏi mảng dưới — chỉ được thêm id mới (vd 'fire-a3').
     Thêm id mới: phải deploy server nhận id đó TRƯỚC — server cũ không biết id lạ, tự rơi về '' (thắng theo LWW nếu ts mới hơn). */
  const BOSS_EVO_FORMS = {
    fire: ['fire-a', 'fire-b', 'fire-a1', 'fire-a2', 'fire-b1', 'fire-b2'],
    ice: ['ice-a', 'ice-b', 'ice-a1', 'ice-a2', 'ice-b1', 'ice-b2'],
    storm: ['storm-a', 'storm-b', 'storm-a1', 'storm-a2', 'storm-b1', 'storm-b2'],
    earth: ['earth-a', 'earth-b', 'earth-a1', 'earth-a2', 'earth-b1', 'earth-b2'],
    wind: ['wind-a', 'wind-b', 'wind-a1', 'wind-a2', 'wind-b1', 'wind-b2']
  };
  function emptyEvo() {
    const evo = {};
    BOSS_ELEMENTS.forEach(el => { evo[el] = { v: '', ts: 0 }; });
    return evo;
  }

  function emptyBoss() {
    return { v: 1, xp: 0, wins: {}, day: null, alloc: {}, gender: { v: 'f', ts: 0 }, element: { v: 'fire', ts: 0 }, buffDate: '', evo: emptyEvo() };
  }
  // giữ WINS_KEEP ngày mới nhất (key YYYY-MM-DD so chuỗi = so ngày)
  function capWins(w) {
    const out = {};
    Object.keys(w).sort().reverse().slice(0, WINS_KEEP).sort().forEach(k => { out[k] = w[k]; });
    return out;
  }
  function cleanPick(x, now, allowed, def) {
    x = isObj(x) ? x : {};
    return { v: allowed.indexOf(x.v) >= 0 ? x.v : def, ts: stamp(x.ts, now) };
  }
  function cleanBoss(x, now) {
    now = typeof now === 'number' && isFinite(now) ? now : Date.now();   // okDate gọi toISOString → now hỏng sẽ ném
    x = isObj(x) ? x : {};
    const out = emptyBoss();
    out.xp = num(x.xp, 0, 0, 1e9);
    if (isObj(x.wins)) {
      const w = {};
      // cắt số key TRƯỚC mọi xử lý: payload 1e6 key không được làm server chậm
      Object.keys(x.wins).slice(0, WINS_SCAN).forEach(k => { if (okDate(k, now) && isBeat(x.wins[k])) w[k] = x.wins[k]; });
      out.wins = capWins(w);
    }
    const d = x.day;
    if (isObj(d) && okDate(d.date, now) && isBeat(d.beat)) out.day = { date: d.date, beat: d.beat, dmg: num(d.dmg, 0, 0, 1e7) };
    if (isObj(x.alloc)) BOSS_ELEMENTS.forEach(el => {
      if (own(x.alloc, el) && typeof x.alloc[el] === 'number' && isFinite(x.alloc[el])) out.alloc[el] = int(x.alloc[el], 0, 0, 3);
    });
    out.gender = cleanPick(x.gender, now, ['m', 'f'], 'f');
    out.element = cleanPick(x.element, now, BOSS_ELEMENTS, 'fire');
    out.buffDate = okDate(x.buffDate, now) ? x.buffDate : '';
    const evoIn = isObj(x.evo) ? x.evo : {};
    out.evo = {};
    BOSS_ELEMENTS.forEach(el => { out.evo[el] = cleanPick(evoIn[el], now, BOSS_EVO_FORMS[el], ''); });
    return out;
  }

  /* ---------- gộp: giao hoán + kết hợp + idempotent; mergeBoss(x, emptyBoss()) ≡ x ---------- */
  // ép kiểu nhẹ (không kiểm ngày tương lai — việc đó của cleanBoss ở server); không ném
  const coerce = x => isObj(x) ? x : {};
  function mergeWins(a, b) {
    const w = {};
    [coerce(a), coerce(b)].forEach(o => Object.keys(o).slice(0, WINS_SCAN).forEach(k => {
      if (!DATE.test(k) || !isBeat(o[k])) return;
      w[k] = own(w, k) ? Math.max(w[k], o[k]) : o[k];
    }));
    return capWins(w);
  }
  const okDay = d => isObj(d) && typeof d.date === 'string' && DATE.test(d.date) && isBeat(d.beat);
  function mergeDay(a, b) {
    a = okDay(a) ? a : null; b = okDay(b) ? b : null;
    if (!a || !b) { const d = a || b; return d ? { date: d.date, beat: d.beat, dmg: num(d.dmg, 0, 0, 1e7) } : null; }
    const c = cmp(a.date, b.date) || cmp(a.beat, b.beat);
    if (c) return mergeDay(c > 0 ? a : null, c > 0 ? null : b);
    return { date: a.date, beat: a.beat, dmg: Math.max(num(a.dmg, 0, 0, 1e7), num(b.dmg, 0, 0, 1e7)) };
  }
  // {v, ts}: ts lớn hơn thắng; hoà → giá trị khác mặc định thắng (emptyBoss là phần tử nhỏ nhất ⇒ gộp với rỗng giữ nguyên),
  // rồi so v theo chuỗi — thứ tự toàn phần nên vẫn giao hoán + kết hợp
  function mergePick(a, b, allowed, def) {
    const f = x => { x = coerce(x); return { v: allowed.indexOf(x.v) >= 0 ? x.v : def, ts: num(x.ts, 0, 0, Infinity) }; };
    const x = f(a), y = f(b);
    return (cmp(x.ts, y.ts) || cmp(+(x.v !== def), +(y.v !== def)) || cmp(String(x.v), String(y.v))) >= 0 ? x : y;
  }
  function mergeBoss(a, b) {
    a = coerce(a); b = coerce(b);
    const alloc = {}, aa = coerce(a.alloc), ab = coerce(b.alloc);
    BOSS_ELEMENTS.forEach(el => {
      const v = Math.max(int(aa[el], -1, -1, 3), int(ab[el], -1, -1, 3));
      if (v >= 0) alloc[el] = v;
    });
    const buff = [a.buffDate, b.buffDate].filter(d => typeof d === 'string' && DATE.test(d)).sort().pop() || '';
    const ae = coerce(a.evo), be = coerce(b.evo), evo = {};
    BOSS_ELEMENTS.forEach(el => { evo[el] = mergePick(ae[el], be[el], BOSS_EVO_FORMS[el], ''); });
    return {
      v: 1, xp: Math.max(num(a.xp, 0, 0, 1e9), num(b.xp, 0, 0, 1e9)), wins: mergeWins(a.wins, b.wins),
      day: mergeDay(a.day, b.day), alloc,
      gender: mergePick(a.gender, b.gender, ['m', 'f'], 'f'), element: mergePick(a.element, b.element, BOSS_ELEMENTS, 'fire'),
      buffDate: buff, evo
    };
  }

  const api = { BOSS_ELEMENTS, BOSS_BEATS, BOSS_ENDLESS, BOSS_EVO_FORMS, emptyBoss, cleanBoss, mergeBoss };
  Object.assign(root, api);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
