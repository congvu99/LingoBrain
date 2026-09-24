/* Test server/deck-seeder.js + schema.sql + database.start({onReady}) bằng client giả ghi lại câu SQL. Chỉ chạy trong Node. */
describe('deck seeder (Node)', () => {
  if (typeof require === 'undefined') { it('bỏ qua ngoài Node', () => assert.ok(true)); return; }
  const seeder = require(path.join(ROOT, 'server', 'deck-seeder.js'));
  const database = require(path.join(ROOT, 'server', 'database.js'));

  // client giả: ghi mọi câu SQL; trả kết quả theo kịch bản (count hiện có, hash hiện có)
  function fakeClient({ count = 0, hash = null } = {}) {
    const log = [];
    return {
      log,
      async query(sql, params) {
        log.push({ sql, params });
        if (/count\(\*\)/i.test(sql)) return { rows: [{ n: count }] };
        if (/SELECT content_hash/i.test(sql)) return { rows: hash ? [{ content_hash: hash }] : [] };
        if (/^\s*INSERT INTO words/i.test(sql)) return { rows: params[0].map(() => ({ inserted: true })) };
        if (/^\s*DELETE/i.test(sql)) return { rowCount: 0, rows: [] };
        return { rows: [], rowCount: 0 };
      }
    };
  }
  const words = n => ({ deck: 'D', updated: 'u', words: Array.from({ length: n }, (_, i) => ({ id: 'w' + i, word: 'w' + i })) });
  const audio = { voice: 'v', items: { w0: 'abcdef012345.mp3' } };

  it('schema.sql có đủ 6 bảng + CHECK tên file audio; database.js không còn DDL', () => {
    const sql = database.readSchema();
    ['users', 'sessions', 'progress', 'words', 'audio_clips', 'deck_meta'].forEach(t =>
      assert.ok(new RegExp('CREATE TABLE IF NOT EXISTS ' + t + '\\b').test(sql), t));
    assert.ok(/CHECK \(file ~/.test(sql), 'CHECK audio');
    assert.ok(!/CREATE TABLE/.test(fs.readFileSync(path.join(ROOT, 'server', 'database.js'), 'utf8')));
  });

  globalThis.__asyncTests = (globalThis.__asyncTests || []).concat([
    { name: 'seedDeck: khoá trước tiên, lô 500, xoá id không còn, ghi deck_meta', fn: async () => {
      const c = fakeClient();
      const r = await seeder.seedDeck(c, { wordsJson: words(1200), audioJson: audio, hash: 'h1' });
      assert.ok(/pg_advisory_xact_lock/.test(c.log[0].sql), 'câu đầu là advisory lock');
      assert.equal(c.log.filter(q => /^\s*INSERT INTO words/i.test(q.sql)).length, 3);
      assert.ok(c.log.some(q => /DELETE FROM words WHERE NOT/i.test(q.sql)));
      assert.ok(c.log.some(q => /DELETE FROM audio_clips WHERE NOT/i.test(q.sql)));
      const meta = c.log.find(q => /INSERT INTO deck_meta/i.test(q.sql));
      assert.ok(meta && meta.params.indexOf('h1') >= 0, 'deck_meta có hash');
      assert.equal(r.words, 1200); assert.equal(r.added, 1200); assert.equal(r.audio, 1);
    } },
    { name: 'seedDeck: WHERE của upsert chỉ so cột nội dung, không so updated_at / hàng nguyên', fn: async () => {
      const c = fakeClient();
      await seeder.seedDeck(c, { wordsJson: words(2), audioJson: audio, hash: 'h' });
      const up = c.log.find(q => /^\s*INSERT INTO words/i.test(q.sql)).sql;
      const where = up.slice(up.lastIndexOf('WHERE'));
      assert.ok(/IS DISTINCT FROM/.test(where));
      assert.ok(!/updated_at|sort_order/.test(where) && !/\.\*/.test(where), where);
      assert.ok(c.log.some(q => /UPDATE words SET sort_order/.test(q.sql)), 'cập nhật thứ tự riêng');
    } },
    { name: 'seedDeck: bộ rỗng → ném; co < 50% → ném; allowShrink → qua', fn: async () => {
      let err = null;
      try { await seeder.seedDeck(fakeClient({ count: 10 }), { wordsJson: { words: [] }, audioJson: audio, hash: 'h' }); } catch (e) { err = e; }
      assert.ok(err && err.code === 'DECK_SHRINK', 'rỗng');
      err = null;
      const c = fakeClient({ count: 2505 });
      try { await seeder.seedDeck(c, { wordsJson: words(1000), audioJson: audio, hash: 'h' }); } catch (e) { err = e; }
      assert.ok(err && err.code === 'DECK_SHRINK', 'co');
      assert.ok(!c.log.some(q => /^\s*(INSERT|DELETE)/i.test(q.sql)), 'không ghi gì');
      await seeder.seedDeck(fakeClient({ count: 2505 }), { wordsJson: words(1000), audioJson: audio, hash: 'h', allowShrink: true });
      err = null;
      try { await seeder.seedDeck(fakeClient(), { wordsJson: words(3), audioJson: { items: {} }, hash: 'h' }); } catch (e) { err = e; }
      assert.ok(err && err.code === 'DECK_SHRINK' && /audio/.test(err.message), 'audio rỗng');
    } },
    { name: 'seedIfChanged: hash bằng → bỏ qua; khác → seed', fn: async () => {
      const load = () => ({ wordsJson: words(3), audioJson: audio, hash: 'same' });
      const mkPool = c => ({ connect: async () => Object.assign(c, { release() {}, on() {}, removeListener() {} }) });
      const same = fakeClient({ hash: 'same' });
      assert.equal((await seeder.seedIfChanged(mkPool(same), load, () => {})).changed, false);
      assert.ok(!same.log.some(q => /INSERT INTO words/i.test(q.sql)));
      const diff = fakeClient({ hash: 'old' });
      assert.equal((await seeder.seedIfChanged(mkPool(diff), load, () => {})).changed, true);
      assert.ok(diff.log.some(q => /INSERT INTO words/i.test(q.sql)));
      assert.ok(diff.log.some(q => /COMMIT/.test(q.sql)));
    } },
    { name: 'database.start: onReady lỗi kết nối → thử lại; lỗi dữ liệu → dừng', fn: async () => {
      const mk = () => { const db = database.createDatabase('postgres://x@127.0.0.1:1/x', { ssl: false, log: () => {} }); db.pool.query = async () => ({ rows: [] }); return db; };
      let n = 0;
      const a = mk();
      await a.start({ firstWaitMs: 1, onReady: async () => { if (++n < 3) throw Object.assign(new Error('x'), { code: 'ECONNRESET' }); } });
      assert.equal(n, 3); assert.equal(a.ready, true);
      let m = 0;
      const b = mk();
      await b.start({ firstWaitMs: 1, onReady: async () => { m++; throw new Error('bad data'); } });
      assert.equal(m, 1);
      await a.pool.end(); await b.pool.end();
    } }
  ]);
});
