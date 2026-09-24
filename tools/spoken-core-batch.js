#!/usr/bin/env node
/* Bổ sung bộ "Spoken core" vào words.json theo từng đợt: kiểm tra file batch, gộp, sắp xen kẽ với Oxford.
   Dùng:
     node tools/spoken-core-batch.js check <batch.json>    in lỗi từng mục, exit 1 nếu có lỗi
     node tools/spoken-core-batch.js merge <batch.json>    chỉ ghi khi check sạch; nối batch rồi sắp lại toàn bộ
     node tools/spoken-core-batch.js reorder               chỉ sắp lại (idempotent)
   Batch = mảng mục cùng shape words.json. words.json vẫn là nguồn duy nhất của bộ từ. */
const fs = require('fs'), path = require('path');
const { wordRx, CLOZE_MAX_SENTENCE } = require('../js/word-games.js');
const { slug } = require('../js/srs-scheduler.js'); // id = slug(word), cùng quy tắc với app: "o'clock" → "o-clock"

const ROOT = path.join(__dirname, '..');
const WORDS_PATH = path.join(ROOT, 'words.json');
const FIELDS = ['id', 'word', 'ipa', 'pos', 'meaning', 'context', 'contextVi', 'source', 'emoji', 'image', 'mnemonic', 'outputPrompt'];
const SPOKEN_PREFIX = 'Spoken core · ';
const SPOKEN_GROUPS = ['chunk', 'word', 'phrasal verb', 'discourse']; // cũng là thứ tự xoay vòng khi sắp thẻ mới
const WORD_MAX = 30;            // cụm dài hơn khó gõ trong game và tràn thẻ
const MEANING_HEAD_MAX = 49;    // vế nghĩa đầu hiện trên máy bay (PLANE_LABEL_MAX = 50)
const GENERIC_EMOJI = '📘';
const GENERIC_PROMPT = 'Đặt một câu của riêng bạn';
const INTERLEAVE = ['O', 'O', 'S']; // cứ 2 từ Oxford thì 1 mục Spoken

const groupOf = w => /^Oxford/.test(w.source || '') ? 'O' : String(w.source || '').indexOf(SPOKEN_PREFIX) === 0 ? 'S' : 'F';

/* Trả mảng lỗi {index, id, msg} (chặn merge) và cảnh báo (không chặn) */
function validateEntries(deckWords, batch) {
  const errors = [], warnings = [];
  if (!Array.isArray(batch)) return { errors: [{ index: -1, id: '', msg: 'batch phải là mảng' }], warnings };
  const ids = new Set(deckWords.map(w => w.id)), words = new Set(deckWords.map(w => String(w.word).toLowerCase()));
  batch.forEach((e, index) => {
    const id = e && e.id || '', err = msg => errors.push({ index, id, msg });
    if (!e || typeof e !== 'object') return err('mục không phải object');
    const keys = Object.keys(e);
    FIELDS.forEach(f => { if (typeof e[f] !== 'string') err('thiếu/không phải chuỗi: ' + f); });
    keys.filter(k => FIELDS.indexOf(k) < 0).forEach(k => err('trường thừa: ' + k));
    if (FIELDS.some(f => typeof e[f] !== 'string')) return;
    const w = e.word;
    if (e.id !== slug(w)) err('id phải là "' + slug(w) + '"');
    if (ids.has(e.id)) err('trùng id');
    if (words.has(w.toLowerCase())) err('trùng word');
    ids.add(e.id); words.add(w.toLowerCase());
    if (/[’‘]/.test(w)) err('word dùng nháy cong, đổi sang nháy thẳng');
    if (w !== w.trim() || /\s{2,}/.test(w) || !w) err('word có khoảng trắng thừa/rỗng');
    if (w.length > WORD_MAX) err('word dài hơn ' + WORD_MAX + ' ký tự');
    if (/[.?!,]$/.test(w)) err('word không kết thúc bằng dấu câu');
    if (!/^\/.+\/$/.test(e.ipa)) err('ipa phải dạng /…/');
    ['pos', 'meaning', 'context', 'contextVi'].forEach(f => { if (!e[f].trim()) err(f + ' rỗng'); });
    if (e.meaning.split(';')[0].trim().length > MEANING_HEAD_MAX) err('vế nghĩa đầu (trước ;) dài hơn ' + MEANING_HEAD_MAX + ' ký tự');
    if (/[’‘]/.test(e.context)) err('context dùng nháy cong, đổi sang nháy thẳng để khớp word');
    else if (!wordRx(w).test(e.context)) err('context không chứa "' + w + '" liền mạch (đuôi chia chỉ ở cuối cụm)');
    if (!e.emoji.trim() || e.emoji === GENERIC_EMOJI) err('emoji rỗng hoặc là 📘');
    if (e.outputPrompt.indexOf(GENERIC_PROMPT) === 0) err('outputPrompt đang dùng câu chung');
    if (e.outputPrompt.toLowerCase().indexOf(w.toLowerCase()) < 0) err('outputPrompt không chứa word');
    if (SPOKEN_GROUPS.map(g => SPOKEN_PREFIX + g).indexOf(e.source) < 0) err('source phải là "' + SPOKEN_PREFIX + '{' + SPOKEN_GROUPS.join('|') + '}"');
    if (e.mnemonic !== '' || e.image !== '') err('mnemonic và image phải rỗng');
    if (e.context.length > CLOZE_MAX_SENTENCE) warnings.push({ index, id, msg: 'context > ' + CLOZE_MAX_SENTENCE + ' ký tự: không vào game điền câu' });
  });
  return { errors, warnings };
}

/* Xoay vòng các nhóm con Spoken (cụm nói sẵn → từ đơn → phrasal verb → từ nối) để thẻ mới không dồn một loại liền nhau.
   Giữ thứ tự nội bộ mỗi nhóm con → chạy lại cho cùng kết quả. */
function rotateSpoken(spoken) {
  const sub = SPOKEN_GROUPS.map(g => spoken.filter(w => w.source === SPOKEN_PREFIX + g));
  const out = [], n = Math.max(0, ...sub.map(s => s.length));
  for (let i = 0; i < n; i++) sub.forEach(s => { if (i < s.length) out.push(s[i]); });
  const known = new Set(SPOKEN_GROUPS.map(g => SPOKEN_PREFIX + g));
  return out.concat(spoken.filter(w => !known.has(w.source))); // nhóm con lạ: không làm rơi mục
}

/* Mục phim (F) giữ đầu; sau đó lặp O,O,S; nhóm nào hết thì nối phần còn lại. Giữ thứ tự nội bộ mỗi nhóm. */
function interleave(words) {
  const g = { F: [], O: [], S: [] };
  words.forEach(w => g[groupOf(w)].push(w));
  g.S = rotateSpoken(g.S);
  const out = g.F.slice(), pos = { O: 0, S: 0 };
  while (pos.O < g.O.length || pos.S < g.S.length) {
    INTERLEAVE.forEach(k => { if (pos[k] < g[k].length) out.push(g[k][pos[k]++]); });
  }
  return out;
}

/* ---- CLI: đọc/ghi giữ nguyên kiểu xuống dòng và dòng cuối của words.json để diff chỉ còn nội dung ---- */
function readDeck() {
  const raw = fs.readFileSync(WORDS_PATH, 'utf8');
  const eol = raw.indexOf('\r\n') >= 0 ? '\r\n' : '\n';
  return { deck: JSON.parse(raw), eol, tail: /\n$/.test(raw) ? eol : '' };
}
function writeDeck(deck, eol, tail) {
  fs.writeFileSync(WORDS_PATH, JSON.stringify(deck, null, 2).replace(/\n/g, eol) + tail);
}
function printIssues(list, label) {
  list.forEach(x => console.log(label + ' #' + x.index + ' [' + x.id + '] ' + x.msg));
}
function main(argv) {
  const [cmd, file] = argv;
  const { deck, eol, tail } = readDeck();
  if (cmd === 'reorder') {
    deck.words = interleave(deck.words); writeDeck(deck, eol, tail);
    console.log('Đã sắp lại ' + deck.words.length + ' mục'); return 0;
  }
  if ((cmd !== 'check' && cmd !== 'merge') || !file) { console.log('Dùng: check|merge <batch.json> hoặc reorder'); return 2; }
  const batch = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
  if (!Array.isArray(batch)) { console.log('batch phải là mảng'); return 1; }
  const { errors, warnings } = validateEntries(deck.words, batch);
  printIssues(warnings, 'WARN'); printIssues(errors, 'ERR ');
  console.log(batch.length + ' mục · ' + errors.length + ' lỗi · ' + warnings.length + ' cảnh báo');
  if (errors.length) return 1;
  if (cmd === 'merge') {
    const ordered = batch.map(e => FIELDS.reduce((o, f) => (o[f] = e[f], o), {})); // cùng thứ tự khoá như words.json
    deck.words = interleave(deck.words.concat(ordered));
    deck.updated = new Date().toISOString().slice(0, 10);
    writeDeck(deck, eol, tail);
    console.log('Đã gộp → ' + deck.words.length + ' mục');
  }
  return 0;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));
module.exports = { FIELDS, SPOKEN_PREFIX, SPOKEN_GROUPS, groupOf, validateEntries, interleave };
