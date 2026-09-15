/* Chọn dạng kiểm tra theo độ chín của từ. Module thuần.
   Dạng: type (VI→gõ EN) · dictation (nghe→gõ) · mcq (EN→chọn nghĩa) · owncloze (điền vào câu tự viết) · speak (nói to, tự chấm) */

const MODES = ['type', 'dictation', 'mcq', 'owncloze', 'speak'];
const MODE_LABEL = { type: 'Gõ từ', dictation: 'Nghe rồi gõ', mcq: 'Chọn nghĩa', owncloze: 'Điền câu của bạn', speak: 'Nói ra' };
const MCQ_MIN_DECK = 8;

/* rec: record SRS. ctx: { deckSize, hasSentences, hasVoice, rand } */
function pickMode(rec, ctx) {
  let pool;
  if (!rec || rec.state !== 'review') pool = ['type'];
  else if (rec.ivl < 7) pool = ['type', 'dictation'];
  else if (rec.ivl <= 30) pool = ['mcq', 'owncloze', 'dictation'];
  else pool = ['speak', 'owncloze'];

  pool = pool.filter(m =>
    (m !== 'mcq' || ctx.deckSize >= MCQ_MIN_DECK) &&
    (m !== 'owncloze' || ctx.hasSentences) &&
    (m !== 'dictation' || ctx.hasVoice));
  if (pool.length > 1 && rec && rec.lastMode) {
    const without = pool.filter(m => m !== rec.lastMode);
    if (without.length) pool = without;
  }
  if (!pool.length) return 'type';
  const rand = ctx.rand || Math.random;
  return pool[Math.floor(rand() * pool.length) % pool.length];
}

/* 4 lựa chọn nghĩa: 1 đúng + 3 nhiễu, ưu tiên cùng loại từ, không trùng nghĩa */
function buildMcqOptions(word, deck, rand) {
  rand = rand || Math.random;
  const seen = new Set([word.meaning]);
  const cands = deck.words.filter(w => w.id !== word.id && w.meaning && !seen.has(w.meaning));
  const same = cands.filter(w => w.pos && w.pos === word.pos), other = cands.filter(w => !(w.pos && w.pos === word.pos));
  const pickFrom = (arr, n, out) => {
    const a = arr.slice();
    while (a.length && out.length < n) {
      const w = a.splice(Math.floor(rand() * a.length) % a.length, 1)[0];
      if (seen.has(w.meaning)) continue;
      seen.add(w.meaning); out.push({ meaning: w.meaning, pos: w.pos, correct: false });
    }
  };
  const distractors = [];
  pickFrom(same, 3, distractors); pickFrom(other, 3, distractors);
  const opts = distractors.concat({ meaning: word.meaning, pos: word.pos, correct: true });
  for (let i = opts.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)) % (i + 1); [opts[i], opts[j]] = [opts[j], opts[i]]; }
  return opts;
}

if (typeof module !== 'undefined') module.exports = { MODES, MODE_LABEL, MCQ_MIN_DECK, pickMode, buildMcqOptions };
