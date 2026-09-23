/* Game từ vựng — logic thuần, không đụng DOM/localStorage, chạy được trong Node để test.
   Ranh giới cứng: module này KHÔNG ghi gì vào SM-2. Kênh liên lạc duy nhất với engine ôn
   là danh sách id từ trả lời sai (addMiss) → buildQueue() đẩy lên đầu phiên ôn kế tiếp. */

const GAME_IDS = ['scramble', 'sprint', 'cloze', 'planes'];
const GAME_LABEL = { scramble: 'Xếp chữ', sprint: 'Chạy 60 giây', cloze: 'Điền câu tốc độ', planes: 'Bắn máy bay' };
const MIN_LEARNED = 8;          // đủ từ để sinh 3 đáp án nhiễu
const SCRAMBLE_ROUND = 10;      // số từ mỗi ván Xếp chữ
const TIMED_ROUND = 60;         // từ bốc sẵn mỗi vòng của ván tính giờ (60s được ~25-30 câu)
const SCRAMBLE_MAX_LEN = 14;    // từ dài hơn thì ô chữ tràn màn hình nhỏ
const CLOZE_MAX_SENTENCE = 120; // câu dài hơn thì tràn trên máy nhỏ
const SPRINT_SECONDS = 60;
const MISS_MAX = 10;
const SCRAMBLE_TRIES = 10;      // số lần xáo lại tối đa để khác từ gốc

/* Khớp một từ nằm trong câu. Ba yêu cầu, thiếu cái nào cũng lộ đáp án hoặc phá câu:
   - chỉ khớp trọn từ, không khớp vào giữa từ khác  (`art` KHÔNG khớp trong `smart`)
   - vẫn khớp dạng chia đuôi thường gặp            (`reckon` khớp `reckoned`)
   - dùng được cả trên chuỗi thô lẫn chuỗi đã escape HTML (từ chứa `&` như AT&T) */
const WORD_CHAR = 'A-Za-zÀ-ɏ0-9';
const INFLECT = '(?:s|es|ed|d|ing|ly|er|est)?';
function wordRx(word, flags) {
  const src = String(word).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp('(^|[^' + WORD_CHAR + '])(' + src + INFLECT + ')(?![' + WORD_CHAR + '])', flags || 'i');
}

// ký tự được ghim tại chỗ, không xáo: dấu cách, gạch nối, nháy đơn
const isFixedChar = ch => " -'’".indexOf(ch) >= 0;
const isLetter = ch => !isFixedChar(ch);

/* Pool từ cho 1 game: chỉ từ đã học, cộng điều kiện riêng từng game */
function gamePool(deck, srs, gameId) {
  return (deck.words || []).filter(w => {
    const r = srs[w.id];
    if (!r || r.state === 'new') return false;
    if (gameId === 'scramble') return !!w.meaning && w.word.length > 2 && w.word.length <= SCRAMBLE_MAX_LEN;
    if (gameId === 'sprint' || gameId === 'planes') return !!w.meaning;
    if (gameId === 'cloze') return !!w.context && w.context.length <= CLOZE_MAX_SENTENCE && wordRx(w.word).test(w.context);
    return true;
  });
}

/* Game nào mở được, thiếu bao nhiêu từ nữa → dùng để tô xám chip */
function gameAvailability(deck, srs) {
  const out = {};
  for (const id of GAME_IDS) {
    const have = gamePool(deck, srs, id).length;
    out[id] = { ok: have >= MIN_LEARNED, have, need: Math.max(0, MIN_LEARNED - have) };
  }
  return out;
}

/* Bốc n từ không trùng, trọng số 1 + lapses*2 → từ hay quên ra nhiều hơn */
function pickGameWords(pool, srs, n, rand) {
  rand = rand || Math.random;
  const rest = pool.slice(), out = [];
  const weight = w => { const r = srs[w.id]; return 1 + (r && r.lapses || 0) * 2; };
  while (rest.length && out.length < n) {
    let total = 0;
    for (const w of rest) total += weight(w);
    let x = rand() * total, k = 0;
    while (k < rest.length - 1 && (x -= weight(rest[k])) > 0) k++;
    out.push(rest.splice(k, 1)[0]);
  }
  return out;
}

/* Ô chữ cái cho game Xếp chữ. Dấu cách / gạch nối giữ nguyên vị trí (fixed), chỉ xáo phần chữ. */
function scrambleTiles(word, rand) {
  rand = rand || Math.random;
  const chars = String(word).split('');
  const letters = chars.filter(isLetter);
  for (let t = 0; t < SCRAMBLE_TRIES; t++) {
    const a = letters.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)) % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
    if (a.join('') !== letters.join('') || letters.length < 2) {
      let k = 0;
      return chars.map(ch => isLetter(ch) ? { ch: a[k++], fixed: false } : { ch, fixed: true });
    }
  }
  // từ toàn chữ giống nhau (aaa) — xáo kiểu gì cũng trùng, trả nguyên còn hơn loop mãi
  return chars.map(ch => ({ ch, fixed: !isLetter(ch) }));
}

/* 4 lựa chọn TỪ cho game Điền câu: 1 đúng + 3 nhiễu, ưu tiên cùng pos và độ dài gần */
function buildWordOptions(word, deck, rand) {
  rand = rand || Math.random;
  const cands = deck.words.filter(w => w.id !== word.id && w.word && w.word !== word.word && w.meaning !== word.meaning);
  const near = w => Math.abs(w.word.length - word.word.length) <= 2;
  const samePos = w => w.pos && w.pos === word.pos;
  const tiers = [
    cands.filter(w => samePos(w) && near(w)),
    cands.filter(w => samePos(w) && !near(w)),
    cands.filter(w => !samePos(w))
  ];
  const seen = new Set([word.word]), picked = [];
  for (const tier of tiers) {
    const a = tier.slice();
    while (a.length && picked.length < 3) {
      const w = a.splice(Math.floor(rand() * a.length) % a.length, 1)[0];
      if (seen.has(w.word)) continue;
      seen.add(w.word); picked.push({ word: w.word, correct: false });
    }
  }
  const opts = picked.concat({ word: word.word, correct: true });
  for (let i = opts.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)) % (i + 1); [opts[i], opts[j]] = [opts[j], opts[i]]; }
  return opts;
}

/* Hệ số combo theo chuỗi đúng liên tiếp */
function comboMult(streak) { return streak >= 10 ? 2 : streak >= 5 ? 1.5 : 1; }

/* Thêm id từ sai vào danh sách: khử trùng, giữ tối đa MISS_MAX (bỏ cái cũ nhất) */
function addMiss(list, id) {
  const out = (list || []).filter(x => x !== id);
  out.push(id);
  return out.slice(-MISS_MAX);
}

if (typeof module !== 'undefined') module.exports = {
  GAME_IDS, GAME_LABEL, MIN_LEARNED, SCRAMBLE_ROUND, TIMED_ROUND, SPRINT_SECONDS, MISS_MAX,
  wordRx, gamePool, gameAvailability, pickGameWords, scrambleTiles, buildWordOptions, comboMult, addMiss
};
