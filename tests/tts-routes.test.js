/* Test server/tts-routes.js + server/tts-edge-provider.js + đăng ký route trong auth-and-sync-routes.js.
   Pool giả (Map trong RAM), provider giả (không gọi mạng thật). Chỉ chạy trong Node. */
describe('tts routes (Node)', () => {
  if (typeof require === 'undefined') { it('bỏ qua ngoài Node', () => assert.ok(true)); return; }
  const { createTtsRoutes, normalizeTtsText, looksLikeMp3 } = require(path.join(ROOT, 'server', 'tts-routes.js'));
  const { createEdgeTtsProvider, escapeXml } = require(path.join(ROOT, 'server', 'tts-edge-provider.js'));
  const { createApi } = require(path.join(ROOT, 'server', 'auth-and-sync-routes.js'));

  const tick = () => new Promise(r => setTimeout(r, 5));
  function validMp3(len) { const b = Buffer.alloc(len || 2000, 0); b.write('ID3', 0, 'ascii'); return b; }
  // pool giả: state.rows = key → mp3 Buffer; đếm INSERT/DELETE để test cache
  function fakePool(state) {
    if (!state.rows) state.rows = {};
    state.inserts = 0; state.pruned = 0;
    return {
      async query(sql, params) {
        if (/SELECT mp3 FROM tts_clips/.test(sql)) { const b = state.rows[params[0]]; return { rows: b ? [{ mp3: b }] : [] }; }
        if (/INSERT INTO tts_clips/.test(sql)) { state.inserts++; state.rows[params[0]] = params[2]; return { rows: [] }; }
        if (/DELETE FROM tts_clips/.test(sql)) { state.pruned++; return { rows: [] }; }
        return { rows: [] };
      }
    };
  }
  // provider giả: ghi lại câu được gọi; state.fail → ném lỗi; state.buf → mp3 trả về (mặc định hợp lệ)
  function fakeProvider(state) {
    if (!state.calls) state.calls = [];
    return {
      voice: 'TestVoice',
      synth: async text => {
        state.calls.push(text);
        if (state.fail) throw new Error(state.fail);
        await new Promise(r => setTimeout(r, 1));
        return state.buf || validMp3();
      }
    };
  }
  const withText = (t, headers) => ({ headers: Object.assign({ 'x-lb-tts': '1' }, headers),
    url: '/api/tts?text=' + encodeURIComponent(t), destroyed: false, socket: { destroyed: false } });

  it('normalizeTtsText: rỗng/201 ký tự/ký tự điều khiển/<>/decode lỗi → null; gộp khoảng trắng', () => {
    assert.equal(normalizeTtsText(''), null);
    assert.equal(normalizeTtsText(encodeURIComponent('a'.repeat(201))), null);
    assert.equal(normalizeTtsText(encodeURIComponent('a\u0001b')), null);
    assert.equal(normalizeTtsText(encodeURIComponent('a<b')), null);
    assert.equal(normalizeTtsText(encodeURIComponent('a>b')), null);
    assert.equal(normalizeTtsText(encodeURIComponent('  hello   world  ')), 'hello world');
    assert.equal(normalizeTtsText('%'), null);
  });

  it('looksLikeMp3: kích cỡ 1KB–300KB + ID3/frame sync', () => {
    assert.ok(looksLikeMp3(validMp3(2000)));
    assert.ok(!looksLikeMp3(Buffer.alloc(10)));
    assert.ok(!looksLikeMp3(validMp3(400000)));
    const frame = Buffer.alloc(2000, 0); frame[0] = 0xff; frame[1] = 0xfb;
    assert.ok(looksLikeMp3(frame));
    assert.ok(!looksLikeMp3(Buffer.alloc(2000, 0)));
  });

  it('escapeXml: escape & < > " \' đúng 1 lần, không escape lặp', () => {
    assert.equal(escapeXml('&<>"\''), '&amp;&lt;&gt;&quot;&apos;');
    assert.equal(escapeXml('&amp;'), '&amp;amp;');
  });

  globalThis.__asyncTests = (globalThis.__asyncTests || []).concat([
    { name: 'miss: gọi provider 1 lần + INSERT + headers đủ; hit: không gọi provider lại', fn: async () => {
      const ps = {}, pv = {};
      const routes = createTtsRoutes({ pool: fakePool(ps), getProvider: () => fakeProvider(pv), enabled: true, cacheMax: 2000, dailyMax: 1000 });
      const [status, body, headers] = await routes.tts(withText('Hello world'), '1.1.1.1');
      assert.equal(status, 200);
      assert.ok(Buffer.isBuffer(body));
      assert.equal(headers['Cache-Control'], 'private, max-age=86400');
      assert.equal(headers.Vary, 'X-LB-TTS');
      assert.ok(!/immutable/.test(headers['Cache-Control']));
      assert.equal(headers['Cross-Origin-Resource-Policy'], 'same-origin');
      assert.equal(headers['X-Content-Type-Options'], 'nosniff');
      assert.equal(pv.calls.length, 1);
      await tick();   // INSERT chạy nền, phản hồi không chờ
      assert.equal(ps.inserts, 1);
      const [status2] = await routes.tts(withText('Hello world'), '9.9.9.9');   // IP khác, cùng câu → cache hit
      assert.equal(status2, 200);
      assert.equal(pv.calls.length, 1, 'cache hit không gọi lại provider');
    } },
    { name: '2 request đồng thời cùng câu → provider gọi 1 lần (single-flight)', fn: async () => {
      const pv = {};
      const routes = createTtsRoutes({ pool: fakePool({}), getProvider: () => fakeProvider(pv), enabled: true, cacheMax: 2000, dailyMax: 1000 });
      const [a, b] = await Promise.all([
        routes.tts(withText('Same sentence'), '1.1.1.1'),
        routes.tts(withText('Same sentence'), '1.1.1.2')
      ]);
      assert.equal(a[0], 200); assert.equal(b[0], 200);
      assert.equal(pv.calls.length, 1);
    } },
    { name: '3 request đồng thời cùng câu → 1 INSERT; chỉ request mở lượt bị tính giới hạn', fn: async () => {
      const ps = {}, pv = {};
      const routes = createTtsRoutes({ pool: fakePool(ps), getProvider: () => fakeProvider(pv), enabled: true, cacheMax: 2000, dailyMax: 1 });
      const res = await Promise.all(['1.1.1.1', '1.1.1.2', '1.1.1.3'].map(ip => routes.tts(withText('Shared one'), ip)));
      res.forEach(r => assert.equal(r[0], 200, 'request nhập chung không bị trần ngày = 1 chặn'));
      await tick();
      assert.equal(ps.inserts, 1);
    } },
    { name: 'request bị chặn theo phút không ăn vào trần toàn server', fn: async () => {
      const routes = createTtsRoutes({ pool: fakePool({}), getProvider: () => fakeProvider({}), enabled: true, cacheMax: 2000, dailyMax: 25 });
      for (let i = 0; i < 40; i++) await routes.tts(withText('spam ' + i), '6.6.6.6');   // 20 qua, 20 bị 429 theo phút
      const [s] = await routes.tts(withText('innocent'), '7.7.7.7');
      assert.equal(s, 200, 'IP khác vẫn còn hạn mức ngày (25 − 20 = 5)');
    } },
    { name: 'cache hit không tính giới hạn tạo mới', fn: async () => {
      const ps = { rows: {} }, pv = {};
      const routes = createTtsRoutes({ pool: fakePool(ps), getProvider: () => fakeProvider(pv), enabled: true, cacheMax: 2000, dailyMax: 1000 });
      await routes.tts(withText('cached line'), '5.5.5.5'); await tick();
      for (let i = 0; i < 30; i++) assert.equal((await routes.tts(withText('cached line'), '5.5.5.5'))[0], 200);
      assert.equal((await routes.tts(withText('fresh line'), '5.5.5.5'))[0], 200, 'vẫn còn hạn mức phút sau 30 hit');
    } },
    { name: 'tới lượt trong hàng đợi mà đã quá hạn 5s → không gọi provider', fn: async () => {
      let clock = 0; const pv = {};
      const slow = { voice: 'V', synth: async text => { pv.calls = (pv.calls || 0) + 1; await tick(); clock += 6000; return validMp3(); } };
      const routes = createTtsRoutes({ pool: fakePool({}), getProvider: () => slow, enabled: true, cacheMax: 2000, dailyMax: 1000, now: () => clock });
      const res = await Promise.all(['q1', 'q2', 'q3'].map((t, i) => routes.tts(withText(t), '8.8.8.' + i)));
      assert.equal(pv.calls, 2, 'task thứ 3 tới lượt khi đồng hồ đã quá hạn → bỏ');
      assert.equal(res[2][0], 429);
    } },
    { name: 'provider lỗi 1 lần → 502, không INSERT; lần sau vẫn gọi lại được (map đã xoá)', fn: async () => {
      const ps = {}, pv = { fail: 'boom' };
      const routes = createTtsRoutes({ pool: fakePool(ps), getProvider: () => fakeProvider(pv), enabled: true, cacheMax: 2000, dailyMax: 1000 });
      const [status] = await routes.tts(withText('Retry me'), '2.2.2.2');
      assert.equal(status, 502);
      assert.equal(ps.inserts, 0);
      pv.fail = null;
      const [status2] = await routes.tts(withText('Retry me'), '2.2.2.3');
      assert.equal(status2, 200);
      assert.equal(pv.calls.length, 2);
    } },
    { name: 'thiếu X-LB-TTS → 403', fn: async () => {
      const routes = createTtsRoutes({ pool: fakePool({}), getProvider: () => fakeProvider({}), enabled: true, cacheMax: 2000, dailyMax: 1000 });
      const [status] = await routes.tts(withText('Hi', { 'x-lb-tts': undefined }), '3.3.3.3');
      assert.equal(status, 403);
    } },
    { name: '21 miss/phút cùng IP → 429 kèm Retry-After', fn: async () => {
      const routes = createTtsRoutes({ pool: fakePool({}), getProvider: () => fakeProvider({}), enabled: true, cacheMax: 2000, dailyMax: 1000 });
      let last;
      for (let i = 0; i < 21; i++) last = await routes.tts(withText('sentence number ' + i), '4.4.4.4');
      assert.equal(last[0], 429);
      assert.ok(last[2]['Retry-After']);
    } },
    { name: 'vượt dailyMax toàn server → 429', fn: async () => {
      const routes = createTtsRoutes({ pool: fakePool({}), getProvider: () => fakeProvider({}), enabled: true, cacheMax: 2000, dailyMax: 2 });
      await routes.tts(withText('one'), '5.5.5.1');
      await routes.tts(withText('two'), '5.5.5.2');
      const r3 = await routes.tts(withText('three'), '5.5.5.3');
      assert.equal(r3[0], 429);
    } },
    { name: 'semaphore đầy (2 chạy + hàng đợi 10) → 429, không phải 503', fn: async () => {
      const provider = { voice: 'v', synth: () => new Promise(r => setTimeout(() => r(validMp3()), 150)) };
      const routes = createTtsRoutes({ pool: fakePool({}), getProvider: () => provider, enabled: true, cacheMax: 2000, dailyMax: 1000 });
      const calls = [];
      for (let i = 0; i < 13; i++) calls.push(routes.tts(withText('unique sentence ' + i), '6.6.6.' + i));
      const results = await Promise.all(calls);
      assert.ok(results.some(r => r[0] === 429), 'ít nhất 1 request bị từ chối vì hàng đợi đầy');
      assert.ok(!results.some(r => r[0] === 503), 'không được trả 503 (đó là tín hiệu DB chưa sẵn sàng)');
    } },
    { name: 'enabled=false → 501; getProvider ném lỗi → 501', fn: async () => {
      const pool = fakePool({});
      const r1 = createTtsRoutes({ pool, getProvider: () => fakeProvider({}), enabled: false, cacheMax: 2000, dailyMax: 1000 });
      assert.equal((await r1.tts(withText('x'), '7.7.7.1'))[0], 501);
      const r2 = createTtsRoutes({ pool, getProvider: () => { throw new Error('lib lỗi'); }, enabled: true, cacheMax: 2000, dailyMax: 1000 });
      assert.equal((await r2.tts(withText('x'), '7.7.7.2'))[0], 501);
    } },
    { name: 'MP3 < 1KB hoặc sai header → 502, không INSERT', fn: async () => {
      const ps = {};
      const routes1 = createTtsRoutes({ pool: fakePool(ps), getProvider: () => ({ voice: 'v', synth: async () => Buffer.alloc(10) }),
        enabled: true, cacheMax: 2000, dailyMax: 1000 });
      const [status1] = await routes1.tts(withText('too short'), '8.8.8.1');
      assert.equal(status1, 502);
      assert.equal(ps.inserts, 0);
      const routes2 = createTtsRoutes({ pool: fakePool(ps), getProvider: () => ({ voice: 'v', synth: async () => Buffer.alloc(2000, 0) }),
        enabled: true, cacheMax: 2000, dailyMax: 1000 });
      const [status2] = await routes2.tts(withText('bad header'), '8.8.8.2');
      assert.equal(status2, 502);
      assert.equal(ps.inserts, 0);
    } },
    { name: 'If-None-Match khớp ETag → 304', fn: async () => {
      const routes = createTtsRoutes({ pool: fakePool({}), getProvider: () => fakeProvider({}), enabled: true, cacheMax: 2000, dailyMax: 1000 });
      const [status, , headers] = await routes.tts(withText('cache me'), '9.9.9.1');
      assert.equal(status, 200);
      const [status2] = await routes.tts(withText('cache me', { 'if-none-match': headers.ETag }), '9.9.9.2');
      assert.equal(status2, 304);
    } },
    { name: 'request đã đóng trước lượt → provider không được gọi', fn: async () => {
      const pv = {};
      const routes = createTtsRoutes({ pool: fakePool({}), getProvider: () => fakeProvider(pv), enabled: true, cacheMax: 2000, dailyMax: 1000 });
      const r = withText('gone before turn'); r.destroyed = true;
      const [status] = await routes.tts(r, '10.10.10.1');
      assert.equal(status, 502);
      assert.equal(pv.calls.length, 0);
    } },
    { name: 'provider: timeout gọi close() (stub MsEdgeTTS)', fn: async () => {
      let closed = false;
      class StubTts {
        setMetadata() { return new Promise(() => {}); }   // treo mãi → buộc timeout
        toStream() { return { audioStream: new (require('stream').PassThrough)() }; }
        close() { closed = true; }
      }
      const provider = createEdgeTtsProvider({ voice: 'v', timeoutMs: 20, MsEdgeTTS: StubTts, OUTPUT_FORMAT: 'fmt' });
      let err = null;
      try { await provider.synth('hello & world'); } catch (e) { err = e; }
      assert.ok(err, 'phải reject khi timeout');
      assert.ok(closed, 'close() phải được gọi khi timeout');
    } },
    { name: 'createApi: đăng ký GET /api/tts (IP thật qua XFF), POST → 405, thiếu tts → 501', fn: async () => {
      const routes = createTtsRoutes({ pool: fakePool({}), getProvider: () => fakeProvider({}), enabled: true, cacheMax: 2000, dailyMax: 1000 });
      const api = createApi({ pool: fakePool({}), isReady: () => true, trustHops: 1, log: () => {}, tts: routes });
      const call = (apiFn, method, url, headers) => new Promise(resolve => {
        const res = { headersSent: false, writeHead(s, h) { this.status = s; this.headers = h; this.headersSent = true; },
          end(b) { resolve({ status: this.status, headers: this.headers, body: b }); } };
        apiFn({ method, url, headers: Object.assign({ 'x-lb-tts': '1' }, headers), socket: { remoteAddress: '1.2.3.4' } }, res, false);
      });
      const ok = await call(api, 'GET', '/api/tts?text=' + encodeURIComponent('registered call'), { 'x-forwarded-for': '55.55.55.55' });
      assert.equal(ok.status, 200);
      assert.ok(Buffer.isBuffer(ok.body));
      assert.equal((await call(api, 'POST', '/api/tts')).status, 405);

      const apiNoTts = createApi({ pool: fakePool({}), isReady: () => true, trustHops: 0, log: () => {} });
      assert.equal((await call(apiNoTts, 'GET', '/api/tts?text=x')).status, 501);
    } }
  ]);
});
