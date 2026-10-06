/* Chọn từ cho hội thoại nhập vai: các từ có lượt chấm trong [from, to) (thường là hôm nay).
   Thuần. Ưu tiên: chấm sai (g === 0) → mới học trong khoảng (lượt hist đầu tiên nằm trong khoảng) → ôn lại;
   cùng nhóm thì lượt chấm gần nhất trước. Bỏ id không còn trong bộ từ. Test: tests/daily-dialogue-word-picker.test.js */

function pickTodayWords(deckWords, srs, from, to, max) {
  const limit = max == null ? 6 : max;   // khớp WORDS_MAX của server: nhiều từ hơn → hội thoại gượng
  const inDeck = new Set((deckWords || []).map(w => w.id));
  const picked = [];
  for (const id in (srs || {})) {
    if (!inDeck.has(id)) continue;
    const hist = (srs[id] && srs[id].hist) || [];
    const today = hist.filter(h => h && h.t >= from && h.t < to);
    if (!today.length) continue;
    const rank = today.some(h => h.g === 0) ? 0 : (hist[0].t >= from ? 1 : 2);
    picked.push({ id, rank, last: Math.max.apply(null, today.map(h => h.t)) });
  }
  picked.sort((a, b) => (a.rank - b.rank) || (b.last - a.last));
  return picked.slice(0, limit).map(p => p.id);
}

if (typeof module !== 'undefined') module.exports = { pickTodayWords };
