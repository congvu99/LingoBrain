/* Thuật toán lặp ngắt quãng SM-2 + learning steps trong phiên.
   Module thuần: không đụng DOM/localStorage, chạy được trong Node để test.
   Record v2 mỗi từ:
     { ef, ivl, due, state:'new'|'learning'|'review'|'relearn', reps, lapses, last, lastMode, sentences[], hist[{t,g,mode}] } */

const DAY = 86400000;
const LADDER = [1, 3, 7, 14, 30, 60];          // thang Leitner cũ, chỉ dùng để migrate v1
const REQUEUE_GAP = 4;                          // thẻ học dở quay lại sau N thẻ
const GRADUATE_STREAK = 2;                      // số lần đúng liên tiếp trong phiên để ra lịch ngày
const HIST_MAX = 50;
const GRADE_Q = [0, 3, 4, 5];                   // 😵 😓 🙂 😎 → chất lượng SM-2

function slug(s) { return String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

// chuẩn hoá 1 từ nạp vào (JSON/text/form) về đúng schema
function normWord(w) {
  const word = String(w.word || w.term || '').trim();
  if (!word) return null;
  return {
    id: w.id || slug(word), word,
    ipa: w.ipa || '', pos: w.pos || '', meaning: w.meaning || w.vi || '',
    context: w.context || w.sentence || '', contextVi: w.contextVi || w.sentenceVi || '',
    source: w.source || '', emoji: w.emoji || '📘', image: w.image || '',
    mnemonic: w.mnemonic || '', outputPrompt: w.outputPrompt || ''
  };
}

function blankRec() {
  return { ef: 2.5, ivl: 0, due: 0, state: 'new', reps: 0, lapses: 0, last: 0, lastMode: '', sentences: [], hist: [] };
}

// v1 (Leitner: box/due/reps/lapses) → v2. Record đã là v2 (có ef) giữ nguyên.
function migrateV1(srsV1) {
  const out = {};
  for (const id in srsV1) {
    const o = srsV1[id] || {};
    if (typeof o.ef === 'number') { out[id] = Object.assign(blankRec(), o); continue; }
    const box = typeof o.box === 'number' ? o.box : -1;
    const r = blankRec();
    r.ivl = box < 0 ? 0 : LADDER[Math.min(box, LADDER.length - 1)];
    r.ef = Math.max(1.3, 2.5 - 0.1 * (o.lapses || 0));
    r.state = box < 0 ? 'new' : 'review';
    r.due = o.due || 0; r.reps = o.reps || 0; r.lapses = o.lapses || 0; r.last = o.last || 0;
    r.sentences = o.sentences || [];
    out[id] = r;
  }
  return out;
}

// SM-2: hệ số dễ mới theo chất lượng trả lời q (0..5)
function sm2Ease(ef, q) {
  return Math.max(1.3, ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
}

// khoảng cách (ngày) tới lần ôn kế tiếp
function nextInterval(rec, q) {
  if (q < 3) return 1;
  if (rec.reps <= 0 || rec.ivl <= 0) return 1;
  if (rec.reps === 1) return 3;
  const base = Math.round(rec.ivl * rec.ef);
  return Math.max(rec.ivl + 1, q === 5 ? Math.round(base * 1.3) : base);
}

/* Chấm 1 lượt. g: 0 quên · 1 khó · 2 nhớ · 3 dễ. session.streak đếm số lần đúng liên tiếp trong phiên.
   Trả về { rec, requeue }: requeue=true → chèn lại vào hàng đợi sau REQUEUE_GAP thẻ. */
function applyGrade(srs, id, g, mode, now, session) {
  const r = srs[id] || (srs[id] = blankRec());
  const q = GRADE_Q[g] || 0;
  r.hist = (r.hist || []).concat({ t: now, g, mode }).slice(-HIST_MAX);
  r.last = now; r.lastMode = mode;
  session.streak = session.streak || {};

  if (r.state === 'review') {
    if (g === 0) {                                   // quên từ đã thuộc → học lại trong phiên
      r.lapses++; r.ivl = 1; r.ef = Math.max(1.3, r.ef - 0.2);
      r.state = 'relearn'; session.streak[id] = 0;
      return { rec: r, requeue: true };
    }
    r.ivl = nextInterval(r, q); r.ef = sm2Ease(r.ef, q); r.reps++;
    r.due = now + r.ivl * DAY;
    return { rec: r, requeue: false };
  }

  // new / learning / relearn: learning steps trong phiên
  if (g === 0) { session.streak[id] = 0; if (r.state === 'new') r.state = 'learning'; return { rec: r, requeue: true }; }
  const streak = (session.streak[id] || 0) + 1;
  session.streak[id] = streak;
  if (g === 3 || streak >= GRADUATE_STREAK) {       // tốt nghiệp → ra lịch ngày
    r.ef = sm2Ease(r.ef, q);
    r.ivl = r.state === 'relearn' ? 1 : (g === 3 ? 3 : 1);
    r.reps++; r.state = 'review'; r.due = now + r.ivl * DAY;
    session.streak[id] = 0;
    return { rec: r, requeue: false };
  }
  if (r.state === 'new') r.state = 'learning';
  return { rec: r, requeue: true };
}

// nhãn hiển thị trên nút chấm
function dueLabel(rec, g) {
  if (g === 0) return 'gặp lại ngay';
  const learning = rec.state !== 'review';
  if (learning && g < 3) return 'gặp lại sau vài thẻ';
  const d = learning ? (g === 3 ? 3 : 1) : nextInterval(rec, GRADE_Q[g]);
  return d === 1 ? '1 ngày' : d < 30 ? d + ' ngày' : Math.round(d / 30) + ' tháng';
}

/* Hàng đợi phiên: thẻ đến hạn xếp theo quá hạn lâu nhất trước (cắt maxSession),
   từ mới xen vào sau mỗi 3 thẻ ôn. Không tráo ngẫu nhiên để không bỏ rơi thẻ quá hạn. */
function buildQueue(deck, srs, cfg, now, miss) {
  const due = [], fresh = [];
  for (const w of deck.words) {
    const r = srs[w.id];
    if (!r || r.state === 'new') fresh.push(w.id);
    else if (r.due <= now) due.push({ id: w.id, over: now - r.due });
  }
  due.sort((a, b) => b.over - a.over);
  const reviews = due.slice(0, cfg.maxSession).map(x => x.id);
  const news = fresh.slice(0, cfg.newPerDay);
  const out = [];
  let ni = 0;
  for (let i = 0; i < reviews.length; i++) {
    out.push(reviews[i]);
    if ((i + 1) % 3 === 0 && ni < news.length) out.push(news[ni++]);
  }
  while (ni < news.length) out.push(news[ni++]);
  // từ trả lời sai trong game: lên đầu phiên, không nhân đôi, không tính vào cfg.maxSession
  const front = (miss || []).filter(id =>
    deck.words.some(w => w.id === id) && srs[id] && srs[id].state !== 'new' && out.indexOf(id) < 0);
  return front.concat(out);
}

/* Xoá tiến độ của id không còn trong bộ từ (bộ từ chỉ lấy từ words.json). Trả về số bản ghi đã xoá.
   Bộ từ rỗng = tải words.json thất bại, KHÔNG dọn, nếu không sẽ mất sạch tiến độ. */
function pruneSrs(deck, srs) {
  if (!deck || !deck.words || !deck.words.length) return 0;
  const ids = new Set(deck.words.map(w => w.id));
  let n = 0;
  for (const id of Object.keys(srs)) if (!ids.has(id)) { delete srs[id]; n++; }
  return n;
}

// tóm tắt bộ từ cho 4 ô số
function deckSummary(deck, srs, now) {
  let due = 0, fresh = 0, learn = 0, mature = 0;
  for (const w of deck.words) {
    const r = srs[w.id];
    if (!r || r.state === 'new') { fresh++; continue; }
    if (r.state === 'review' && r.due <= now) due++;
    if (r.state !== 'review') due++;
    if (r.ivl >= 21) mature++; else learn++;
  }
  return { due, fresh, learn, mature };
}

/* So khớp mờ: bỏ dấu câu/hoa thường; từ ≥5 ký tự chấp nhận lệch 1 ký tự (near). Cụm từ so từng token. */
function normAnswer(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim(); }
function levenshtein(a, b) {
  const m = a.length, n = b.length, row = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = row[0]; row[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[n];
}
function fuzzyMatch(answer, target) {
  const a = normAnswer(answer).split(' ').filter(Boolean), t = normAnswer(target).split(' ').filter(Boolean);
  if (!a.length || a.length !== t.length) return { ok: false, near: false };
  let near = false;
  for (let i = 0; i < t.length; i++) {
    if (a[i] === t[i]) continue;
    if (t[i].length >= 5 && levenshtein(a[i], t[i]) <= 1) { near = true; continue; }
    return { ok: false, near: false };
  }
  return { ok: true, near };
}

if (typeof module !== 'undefined') module.exports = { DAY, LADDER, REQUEUE_GAP, slug, normWord, blankRec, migrateV1, sm2Ease, nextInterval, applyGrade, dueLabel, buildQueue, pruneSrs, deckSummary, fuzzyMatch, levenshtein, normAnswer };
