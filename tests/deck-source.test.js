/* Test js/deck-source.js: API trước, lỗi → file tĩnh; chỉ prune tiến độ khi bộ từ đến từ API. */
describe('deck source', () => {
  const okRes = body => ({ ok: true, json: async () => body });
  const failRes = status => ({ ok: false, status, json: async () => ({}) });
  const deckOk = { deck: 'D', words: [{ id: 'a', word: 'a' }] };

  it('isDeckJson / isAudioIndexJson', () => {
    assert.ok(isDeckJson(deckOk)); assert.ok(isDeckJson([{ id: 'a' }]));
    assert.ok(!isDeckJson({ words: [] })); assert.ok(!isDeckJson(null)); assert.ok(!isDeckJson('<html>'));
    assert.ok(isAudioIndexJson({ items: {} })); assert.ok(!isAudioIndexJson({ items: [] })); assert.ok(!isAudioIndexJson(null));
  });
  it('cleanAudioItems bỏ tên file lạ', () => {
    const m = cleanAudioItems({ a: 'abcdef012345.mp3', b: '../x.mp3', c: 1 });
    assert.deepEqual(Object.keys(m), ['a']); assert.equal(m.a, 'abcdef012345.mp3');
    assert.equal(m.constructor, undefined);
  });
  it('shouldPruneDeck: chỉ khi nguồn là api', () => {
    assert.equal(shouldPruneDeck('api'), true);
    assert.equal(shouldPruneDeck('file'), false);
    assert.equal(shouldPruneDeck(null), false);
  });
  it('deckSources: API trước, file sau', () => {
    const s = deckSources(5);
    assert.equal(s[0].tag, 'api'); assert.equal(s[0].url, 'api/words');
    assert.equal(s[1].tag, 'file'); assert.equal(s[1].url, 'words.json?_=5');
    assert.equal(audioSources()[0].url, 'api/audio-index');
  });

  (typeof globalThis !== 'undefined' ? globalThis : window).__asyncTests = ((typeof globalThis !== 'undefined' ? globalThis : window).__asyncTests || []).concat([
    { name: 'fetchFirstOk: API 200 hợp lệ → api, không gọi file', fn: async () => {
      const calls = [];
      const r = await fetchFirstOk(deckSources(1), url => { calls.push(url); return Promise.resolve(okRes(deckOk)); }, isDeckJson);
      assert.equal(r.tag, 'api'); assert.equal(calls.length, 1); assert.equal(r.data.deck, 'D');
    } },
    { name: 'fetchFirstOk: API 404/503/rỗng/sai JSON/throw → file', fn: async () => {
      const bad = [failRes(404), failRes(503), okRes({ words: [] }), { ok: true, json: async () => { throw new Error('html'); } }, null];
      for (const b of bad) {
        const r = await fetchFirstOk(deckSources(1), url => /^api/.test(url) ? (b ? Promise.resolve(b) : Promise.reject(new Error('offline'))) : Promise.resolve(okRes(deckOk)), isDeckJson);
        assert.equal(r && r.tag, 'file');
      }
    } },
    { name: 'fetchFirstOk: mọi nguồn lỗi → null', fn: async () => {
      assert.equal(await fetchFirstOk(deckSources(1), () => Promise.reject(new Error('x')), isDeckJson), null);
    } }
  ]);
});
