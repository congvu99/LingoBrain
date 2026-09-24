/* Nạp bộ từ + audio index vào DB trong 1 transaction. Test: tests/deck-seeder.test.js
   - advisory lock là câu đầu tiên → nhiều instance / CLI không seed chồng, không deadlock
   - chống co: bộ mới rỗng hoặc < 50% bộ hiện có → từ chối (trừ allowShrink), DB giữ nguyên
   - seedIfChanged: chỉ seed khi hash 2 file nguồn khác hash trong deck_meta → sửa words.json + deploy là tự cập nhật */
const fs = require('fs');
const path = require('path');
const { wordsToRows, audioToRows, contentHash } = require('./deck-rows.js');
const { withTransaction } = require('./database.js');

const SEED_LOCK_ID = 7715001;
const BATCH = 500;
const WORD_COLS = ['id', 'word', 'ipa', 'pos', 'meaning', 'context', 'context_vi', 'source', 'emoji', 'image', 'mnemonic', 'output_prompt', 'sort_order'];
// cột nội dung — so sánh để bỏ qua dòng không đổi. Không so updated_at, không so sort_order (thêm/bớt 1 từ làm dịch
// sort_order của mọi từ phía sau → cập nhật riêng bằng REORDER_WORDS để updated_at chỉ đổi khi nội dung đổi)
const WORD_DATA_COLS = WORD_COLS.slice(1, -1);

const UPSERT_WORDS = `INSERT INTO words (${WORD_COLS.join(', ')})
SELECT * FROM unnest(${WORD_COLS.map((c, i) => '$' + (i + 1) + (c === 'sort_order' ? '::int[]' : '::text[]')).join(', ')})
ON CONFLICT (id) DO UPDATE SET ${WORD_DATA_COLS.map(c => c + ' = excluded.' + c).join(', ')}, sort_order = excluded.sort_order, updated_at = now()
WHERE (${WORD_DATA_COLS.map(c => 'words.' + c).join(', ')}) IS DISTINCT FROM (${WORD_DATA_COLS.map(c => 'excluded.' + c).join(', ')})
RETURNING (xmax = 0) AS inserted`;
const REORDER_WORDS = `UPDATE words SET sort_order = x.o FROM unnest($1::text[], $2::int[]) AS x(id, o)
WHERE words.id = x.id AND words.sort_order <> x.o`;
const UPSERT_AUDIO = `INSERT INTO audio_clips (text, file) SELECT * FROM unnest($1::text[], $2::text[])
ON CONFLICT (text) DO UPDATE SET file = excluded.file WHERE audio_clips.file IS DISTINCT FROM excluded.file`;
const UPSERT_META = `INSERT INTO deck_meta (id, deck, updated, voice, content_hash, seeded_at) VALUES (1, $1, $2, $3, $4, now())
ON CONFLICT (id) DO UPDATE SET deck = excluded.deck, updated = excluded.updated, voice = excluded.voice,
  content_hash = excluded.content_hash, seeded_at = now()`;

function shrinkError(msg) { return Object.assign(new Error(msg), { code: 'DECK_SHRINK' }); }
const lock = client => client.query('SELECT pg_advisory_xact_lock($1)', [SEED_LOCK_ID]);

// bộ mới rỗng, hoặc < 50% số dòng đang có → từ chối (file hỏng / bản cũ), trừ allowShrink
async function guardShrink(client, table, next, file, allowShrink) {
  const current = +(await client.query('SELECT count(*)::int AS n FROM ' + table)).rows[0].n;
  if (!next) throw shrinkError(file + ' không có mục hợp lệ — không seed');
  if (current > 0 && next < current * 0.5 && !allowShrink)
    throw shrinkError(file + ' chỉ còn ' + next + '/' + current + ' mục (< 50%) — không seed. Chạy CLI với --allow-shrink nếu cố ý');
}

// client đã ở trong transaction. Trả số lượng + thay đổi để in/log.
async function seedDeck(client, { wordsJson, audioJson, hash, allowShrink }) {
  await lock(client);
  const words = wordsToRows(wordsJson), audio = audioToRows(audioJson);
  await guardShrink(client, 'words', words.length, 'words.json', allowShrink);
  await guardShrink(client, 'audio_clips', audio.length, 'audio/index.json', allowShrink);
  let added = 0, updated = 0;
  for (let i = 0; i < words.length; i += BATCH) {
    const part = words.slice(i, i + BATCH);
    const r = await client.query(UPSERT_WORDS, WORD_COLS.map(c => part.map(w => w[c])));
    r.rows.forEach(x => { if (x.inserted) added++; else updated++; });
  }
  await client.query(REORDER_WORDS, [words.map(w => w.id), words.map(w => w.sort_order)]);
  const del = await client.query('DELETE FROM words WHERE NOT (id = ANY($1::text[]))', [words.map(w => w.id)]);
  for (let i = 0; i < audio.length; i += BATCH) {
    const part = audio.slice(i, i + BATCH);
    await client.query(UPSERT_AUDIO, [part.map(a => a.text), part.map(a => a.file)]);
  }
  await client.query('DELETE FROM audio_clips WHERE NOT (text = ANY($1::text[]))', [audio.map(a => a.text)]);
  const meta = Array.isArray(wordsJson) ? {} : wordsJson;
  await client.query(UPSERT_META, [meta.deck || 'Bộ từ của tôi', String(meta.updated || ''), String((audioJson && audioJson.voice) || ''), hash]);
  return { words: words.length, audio: audio.length, added, updated, deleted: del.rowCount || 0 };
}

// đọc 2 file nguồn trong thư mục gốc repo
function loadDeckFiles(root) {
  const wordsBuf = fs.readFileSync(path.join(root, 'words.json'));
  const audioBuf = fs.readFileSync(path.join(root, 'audio', 'index.json'));
  return { wordsJson: JSON.parse(wordsBuf), audioJson: JSON.parse(audioBuf), hash: contentHash(wordsBuf, audioBuf) };
}

async function seedIfChanged(pool, load, log) {
  const files = load();
  return withTransaction(pool, async client => {
    await lock(client);
    const r = await client.query('SELECT content_hash FROM deck_meta WHERE id = 1');
    if (r.rows.length && r.rows[0].content_hash === files.hash) { log('deck up to date'); return { changed: false }; }
    const s = await seedDeck(client, files);
    log('deck seeded: ' + s.words + ' words, ' + s.audio + ' audio (+' + s.added + ' ~' + s.updated + ' -' + s.deleted + ')');
    return Object.assign({ changed: true }, s);
  });
}

module.exports = { SEED_LOCK_ID, seedDeck, seedIfChanged, loadDeckFiles };
