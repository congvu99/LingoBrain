/* Game Pháp Sư Lexoria — tiến trình, thuần: cấp/XP, trận hôm nay, ghi kết quả idempotent, chuỗi ngày săn,
   buff Ôn từ, tách đoạn truyện. Cần boss-progress-sync-merge.js nạp trước.
   Hàm ghi SỬA TRỰC TIẾP object truyền vào; UI luôn truyền global bossProg lúc ghi (không giữ tham chiếu cũ).
   CHỈ ĐỌC srs — không bao giờ ghi SM-2. */

const BOSS_DAY_MS = 86400000;
const bossLocalDate = t => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
// cộng ngày trên chuỗi YYYY-MM-DD (tính theo UTC nên không lệch vì giờ mùa hè)
const bossShiftDate = (date, days) => new Date(Date.parse(date + 'T00:00:00Z') + days * BOSS_DAY_MS).toISOString().slice(0, 10);

/* Mốc XP cộng dồn: cấp n cần 100·(1+2+…+(n−1)) → 1:0, 2:100, 3:300, 4:600 … */
function xpForLevel(n) { n = Math.max(1, n | 0); return 50 * n * (n - 1); }
function levelFromXp(xp) {
  let n = 1;
  while (xpForLevel(n + 1) <= (+xp || 0)) n++;
  return n;
}

// wins bỏ ngày tương lai so với date (đồng hồ máy khác chạy nhanh)
const winsUpTo = (wins, date) => Object.keys(wins || {}).filter(k => k <= date).map(k => wins[k]);

/* Beat kế = beat nhỏ nhất 0..27 chưa thắng; thắng đủ 28 → vô tận. Hai máy offline cùng thắng beat 5 → vẫn 6 (không nhảy cóc). */
function nextBeat(b, date) {
  const done = date ? winsUpTo(b.wins, date) : Object.keys(b.wins || {}).map(k => b.wins[k]);
  for (let i = 0; i < BOSS_BEATS; i++) if (done.indexOf(i) < 0) return i;
  return BOSS_ENDLESS;
}

/* Trận hôm nay: đã thắng hôm nay → Luyện phép; chưa → trận truyện (hoặc vô tận) mang vết thương cùng ngày + cùng beat */
function todayBattle(b, date) {
  if (b.wins && Object.prototype.hasOwnProperty.call(b.wins, date)) return { kind: 'practice', beat: -1, carryDmg: 0 };
  const beat = nextBeat(b, date);
  const carry = b.day && b.day.date === date && b.day.beat === beat ? b.day.dmg : 0;
  return { kind: beat < BOSS_ENDLESS ? 'story' : 'endless', beat, carryDmg: carry };
}

/* Ghi kết quả dạng tuyệt đối + max → gọi nhiều lần (ẩn app, pagehide, kết trận) = gọi 1 lần.
   r = {date, beat, carryDmg, dealt, xpAtStart, earned, won, story} — story = trận tính ngày (truyện hoặc vô tận) */
function recordProgress(b, r) {
  b.xp = Math.max(+b.xp || 0, (r.xpAtStart || 0) + (r.earned || 0));
  if (!r.story) return b;
  const dmg = (r.carryDmg || 0) + (r.dealt || 0), d = b.day;
  if (d && d.date === r.date && d.beat === r.beat) d.dmg = Math.max(d.dmg || 0, dmg);
  else if (!d || r.date > d.date || (r.date === d.date && r.beat > d.beat)) b.day = { date: r.date, beat: r.beat, dmg };
  if (r.won) {
    b.wins = b.wins || {};
    b.wins[r.date] = Math.max(b.wins[r.date] == null ? -1 : b.wins[r.date], r.beat);
  }
  return b;
}

/* Chuỗi ngày liên tiếp có thắng trận ngày, kết thúc hôm nay hoặc hôm qua; bỏ ngày tương lai */
function huntStreak(wins, today) {
  const has = d => Object.prototype.hasOwnProperty.call(wins || {}, d);
  let d = has(today) ? today : bossShiftDate(today, -1), n = 0;
  while (has(d)) { n++; d = bossShiftDate(d, -1); }
  return n;
}

/* Ôn xong hôm nay: có lượt ôn trong ngày VÀ không còn thẻ ôn (review) đến hạn. Thẻ đang học / từ mới không tính. */
function reviewDoneToday(srs, now, date) {
  let reviewed = false;
  for (const id in (srs || {})) {
    const r = srs[id];
    if (!r) continue;
    if (r.state === 'review' && (r.due || 0) <= now) return false;
    if (!reviewed && Array.isArray(r.hist)) reviewed = r.hist.some(h => h && typeof h.t === 'number' && bossLocalDate(h.t) === date);
  }
  return reviewed;
}
/* Buff cả ngày: đã chốt buffDate hôm nay, hoặc vừa đạt điều kiện (caller chốt b.buffDate = date) */
function reviewBuff(b, srs, now, date) { return b.buffDate === date || reviewDoneToday(srs, now, date); }

/* Đoạn truyện: '{id}' → từ trong bộ (đã học → tô màu, bấm nghe); id không có → chữ thường (không kèm ngoặc) */
function storySegments(text, deck, srs) {
  const byId = {};
  ((deck && deck.words) || []).forEach(w => { byId[w.id] = w; });
  const out = [];
  String(text || '').split(/\{([a-z0-9_-]{1,64})\}/).forEach((part, i) => {
    if (!part) return;
    if (i % 2 === 0) return out.push({ t: 'text', text: part });
    const w = Object.prototype.hasOwnProperty.call(byId, part) ? byId[part] : null;
    if (!w) return out.push({ t: 'text', text: part });
    const r = srs && srs[w.id];
    out.push({ t: 'word', id: w.id, word: w.word, learned: !!r && r.state !== 'new' });
  });
  return out;
}

if (typeof module !== 'undefined') module.exports = {
  bossLocalDate, bossShiftDate, xpForLevel, levelFromXp, nextBeat, todayBattle, recordProgress, huntStreak,
  reviewDoneToday, reviewBuff, storySegments
};
