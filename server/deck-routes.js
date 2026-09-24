/* GET /api/words · /api/audio-index — bộ từ + audio index từ DB, đúng shape words.json / audio/index.json.
   Mỗi request đọc deck_meta.content_hash (1 dòng): hash trùng cache → trả body sẵn trong RAM; khác → dựng lại (1 lần dù nhiều
   request đồng thời). Không TTL nên CLI seed / instance khác seed đều thấy ngay. Chưa có bộ từ → 503, nhớ 10s để không dội DB.
   Handler trả [status, body, headers]; body chuỗi JSON sẵn. Test: tests/deck-routes.test.js */
const { rowsToWords } = require('./deck-rows.js');

const EMPTY_MS = 10000;
const WORD_SELECT = 'SELECT id, word, ipa, pos, meaning, context, context_vi, source, emoji, image, mnemonic, output_prompt FROM words ORDER BY sort_order';

// If-None-Match: danh sách cách dấu phẩy, proxy nén có thể đổi thành ETag yếu W/"…" → so khớp yếu
function etagMatches(header, etag) {
  if (!header) return false;
  const want = etag.replace(/^W\//, '');
  return String(header).split(',').some(t => { t = t.trim(); return t === '*' || t.replace(/^W\//, '') === want; });
}

function createDeckRoutes({ pool, now = Date.now }) {
  let cache = null;          // {hash, words, audio} — body chuỗi
  let building = null;       // promise đang dựng (single-flight)
  let emptyUntil = 0;

  async function build(hash) {
    const w = await pool.query(WORD_SELECT);
    if (!w.rows.length) return null;
    const meta = (await pool.query('SELECT deck, updated, voice FROM deck_meta WHERE id = 1')).rows[0] || {};
    const a = await pool.query('SELECT text, file FROM audio_clips ORDER BY text');
    const items = {};
    a.rows.forEach(r => { items[r.text] = r.file; });
    return {
      hash,
      words: JSON.stringify({ deck: meta.deck, updated: meta.updated, words: rowsToWords(w.rows) }),
      audio: JSON.stringify({ voice: meta.voice, items })
    };
  }
  async function load() {
    if (now() < emptyUntil) return null;
    const r = await pool.query('SELECT content_hash FROM deck_meta WHERE id = 1');
    const hash = r.rows[0] && r.rows[0].content_hash;
    if (!hash) { emptyUntil = now() + EMPTY_MS; return null; }
    if (cache && cache.hash === hash) return cache;
    if (!building) {
      building = build(hash).then(c => { if (c) cache = c; else emptyUntil = now() + EMPTY_MS; return c; })
        .finally(() => { building = null; });
    }
    return building;
  }
  async function serve(req, key) {
    const c = await load();
    if (!c) return [503, { error: 'Bộ từ chưa được nạp' }];
    const headers = { ETag: '"' + c.hash + '"', 'Cache-Control': 'no-cache' };
    if (etagMatches(req.headers['if-none-match'], headers.ETag)) return [304, null, headers];
    return [200, c[key], headers];
  }

  return {
    words: req => serve(req, 'words'),
    audioIndex: req => serve(req, 'audio'),
    invalidate() { cache = null; emptyUntil = 0; }
  };
}

module.exports = { createDeckRoutes, etagMatches };
