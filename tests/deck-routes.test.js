/* Test server/deck-routes.js + đăng ký route trong auth-and-sync-routes.js, pool giả. Chỉ chạy trong Node. */
describe('deck routes (Node)', () => {
  if (typeof require === 'undefined') { it('bỏ qua ngoài Node', () => assert.ok(true)); return; }
  const { createDeckRoutes, etagMatches } = require(path.join(ROOT, 'server', 'deck-routes.js'));
  const { createApi } = require(path.join(ROOT, 'server', 'auth-and-sync-routes.js'));
  const rows = require(path.join(ROOT, 'server', 'deck-rows.js'));
  const wordsJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'words.json'), 'utf8'));
  const audioJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'audio', 'index.json'), 'utf8'));
  const sortKeys = o => Object.keys(o).sort().reduce((a, k) => { a[k] = o[k]; return a; }, {});

  // pool giả: state.hash null → chưa seed; đếm số lần đọc danh sách từ
  function fakePool(state) {
    state.listed = 0;
    return {
      async query(sql) {
        await new Promise(r => setTimeout(r, 1));
        if (/SELECT content_hash/.test(sql)) return { rows: state.hash ? [{ content_hash: state.hash }] : [] };
        if (/FROM deck_meta/.test(sql)) return { rows: [{ deck: wordsJson.deck, updated: wordsJson.updated, voice: audioJson.voice }] };
        if (/FROM words/.test(sql)) { state.listed++; return { rows: state.words || rows.wordsToRows(wordsJson) }; }
        if (/FROM audio_clips/.test(sql)) return { rows: rows.audioToRows(audioJson) };
        return { rows: [] };
      }
    };
  }
  const req = (headers) => ({ headers: headers || {} });

  it('etagMatches: so khớp yếu, danh sách, *', () => {
    assert.ok(etagMatches('W/"abc"', '"abc"'));
    assert.ok(etagMatches('"x", "abc"', '"abc"'));
    assert.ok(etagMatches('*', '"abc"'));
    assert.ok(!etagMatches('"abd"', '"abc"'));
    assert.ok(!etagMatches(undefined, '"abc"'));
  });

  globalThis.__asyncTests = (globalThis.__asyncTests || []).concat([
    { name: 'GET words: body = words.json, ETag = hash, cache theo hash, single-flight', fn: async () => {
      const st = { hash: 'h1' };
      const d = createDeckRoutes({ pool: fakePool(st) });
      const [a, b] = await Promise.all([d.words(req()), d.words(req())]);
      assert.equal(a[0], 200);
      assert.deepEqual(JSON.parse(a[1]), wordsJson);
      assert.equal(a[2].ETag, '"h1"');
      assert.equal(b[1], a[1]);
      await d.words(req());
      assert.equal(st.listed, 1, 'dựng 1 lần');
      st.hash = 'h2';
      const c = await d.words(req());
      assert.equal(c[2].ETag, '"h2"'); assert.equal(st.listed, 2, 'hash đổi → dựng lại');
    } },
    { name: 'GET words: If-None-Match khớp → 304 không body', fn: async () => {
      const d = createDeckRoutes({ pool: fakePool({ hash: 'h1' }) });
      assert.equal((await d.words(req({ 'if-none-match': 'W/"h1"' })))[0], 304);
      assert.equal((await d.words(req({ 'if-none-match': '"x"' })))[0], 200);
    } },
    { name: 'chưa seed / bộ rỗng → 503 cả 2 route, nhớ 10s, invalidate xoá', fn: async () => {
      let t = 0;
      const st = { hash: null };
      const d = createDeckRoutes({ pool: fakePool(st), now: () => t });
      assert.equal((await d.words(req()))[0], 503);
      assert.equal((await d.audioIndex(req()))[0], 503);
      st.hash = 'h1';
      assert.equal((await d.words(req()))[0], 503, 'còn trong 10s');
      d.invalidate();
      assert.equal((await d.words(req()))[0], 200);
      const st2 = { hash: 'h', words: [] };
      assert.equal((await createDeckRoutes({ pool: fakePool(st2) }).words(req()))[0], 503, 'bảng words rỗng');
    } },
    { name: 'GET audio-index: body = audio/index.json (không xét thứ tự khoá)', fn: async () => {
      const d = createDeckRoutes({ pool: fakePool({ hash: 'h1' }) });
      const r = await d.audioIndex(req());
      const j = JSON.parse(r[1]);
      assert.equal(j.voice, audioJson.voice);
      assert.deepEqual(sortKeys(j.items), sortKeys(audioJson.items));
    } },
    { name: 'handleApi: GET /api/words không cần Content-Type; POST → 405; chưa ready → 503; login thiếu JSON → 415', fn: async () => {
      let ready = true;
      const api = createApi({ pool: fakePool({ hash: 'h1' }), isReady: () => ready, trustHops: 0, log: () => {} });
      const call = (method, url, headers) => new Promise(resolve => {
        const res = { headersSent: false, writeHead(s, h) { this.status = s; this.headers = h; this.headersSent = true; },
          end(b) { resolve({ status: this.status, headers: this.headers, body: b }); } };
        api({ method, url, headers: headers || {}, socket: { remoteAddress: '1.2.3.4' } }, res, false);
      });
      const ok = await call('GET', '/api/words');
      assert.equal(ok.status, 200); assert.equal(ok.headers.ETag, '"h1"'); assert.equal(ok.headers['Cache-Control'], 'no-cache');
      assert.equal(JSON.parse(ok.body).words.length, wordsJson.words.length);
      assert.equal((await call('GET', '/api/audio-index?x=1')).status, 200);
      assert.equal((await call('POST', '/api/words', { 'content-type': 'application/json' })).status, 405);
      assert.equal((await call('POST', '/api/login')).status, 415);
      assert.equal(typeof api.invalidateDeck, 'function');
      ready = false;
      assert.equal((await call('GET', '/api/words')).status, 503);
    } }
  ]);
});
