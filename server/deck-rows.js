/* Chuyển bộ từ / audio index giữa dạng file JSON và dòng DB. Thuần (chỉ node:crypto), test: tests/deck-rows.test.js */
const crypto = require('crypto');

// [khoá trong words.json, cột DB] — thứ tự này cũng là thứ tự khoá khi trả về cho client
const WORD_FIELDS = [
  ['id', 'id'], ['word', 'word'], ['ipa', 'ipa'], ['pos', 'pos'], ['meaning', 'meaning'], ['context', 'context'],
  ['contextVi', 'context_vi'], ['source', 'source'], ['emoji', 'emoji'], ['image', 'image'],
  ['mnemonic', 'mnemonic'], ['outputPrompt', 'output_prompt']
];
const AUDIO_FILE_RX = /^[0-9a-f]{12}\.mp3$/;

// cùng shape client chấp nhận (js/app-shell.js): {words:[...]} hoặc mảng trần
function deckWordsOf(json) {
  if (Array.isArray(json)) return json;
  return json && Array.isArray(json.words) ? json.words : [];
}
const str = v => (v == null ? '' : String(v));

// bỏ mục thiếu id/word; id trùng giữ mục đầu; sort_order = vị trí trong danh sách đã lọc
function wordsToRows(json) {
  const seen = new Set(), rows = [];
  deckWordsOf(json).forEach(w => {
    if (!w || !str(w.id) || !str(w.word) || seen.has(str(w.id))) return;
    seen.add(str(w.id));
    const row = {};
    WORD_FIELDS.forEach(([k, col]) => { row[col] = str(w[k]); });
    row.sort_order = rows.length;
    rows.push(row);
  });
  return rows;
}

function rowsToWords(rows) {
  return rows.map(r => {
    const w = {};
    WORD_FIELDS.forEach(([k, col]) => { w[k] = str(r[col]); });
    return w;
  });
}

// tên file không đúng dạng hash (đường dẫn lạ) bị bỏ
function audioToRows(index) {
  const items = (index && index.items) || {};
  return Object.keys(items).filter(t => typeof items[t] === 'string' && AUDIO_FILE_RX.test(items[t]))
    .map(t => ({ text: t, file: items[t] }));
}

function contentHash(wordsBuf, audioBuf) {
  return crypto.createHash('sha1').update(wordsBuf).update('\n').update(audioBuf).digest('hex');
}

module.exports = { WORD_FIELDS, AUDIO_FILE_RX, deckWordsOf, wordsToRows, rowsToWords, audioToRows, contentHash };
