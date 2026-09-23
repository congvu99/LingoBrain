/* Test server/request-guards.js — IP sau proxy, rate limit, semaphore scrypt, đọc body giới hạn. Chỉ chạy trong Node. */
describe('request-guards (Node)', () => {
  if (typeof require === 'undefined') { it('bỏ qua ngoài Node', () => assert.ok(true)); return; }
  const g = require(path.join(ROOT, 'server', 'request-guards.js'));
  const { Readable } = require('stream');

  it('clientIp lấy phần tử do proxy tin cậy thêm (tính từ phải)', () => {
    assert.equal(g.clientIp({ 'x-forwarded-for': '6.6.6.6, 9.9.9.9' }, '10.0.0.1', 1), '9.9.9.9');
    assert.equal(g.clientIp({ 'x-forwarded-for': '6.6.6.6, 8.8.8.8, 9.9.9.9' }, '10.0.0.1', 2), '8.8.8.8');
  });
  it('clientIp: hops 0 hoặc không có header → socket', () => {
    assert.equal(g.clientIp({ 'x-forwarded-for': '6.6.6.6' }, '10.0.0.1', 0), '10.0.0.1');
    assert.equal(g.clientIp({}, '10.0.0.1', 1), '10.0.0.1');
  });
  it('clientIp: header ngắn hơn số hop → phần tử trái nhất', () => assert.equal(g.clientIp({ 'x-forwarded-for': '9.9.9.9' }, 's', 3), '9.9.9.9'));

  it('isJsonRequest: chỉ nhận application/json (form text/plain chéo site phải qua preflight)', () => {
    assert.equal(g.isJsonRequest({ 'content-type': 'application/json' }), true);
    assert.equal(g.isJsonRequest({ 'content-type': 'application/json; charset=utf-8' }), true);
    ['text/plain', 'application/x-www-form-urlencoded', 'multipart/form-data', undefined].forEach(t =>
      assert.equal(g.isJsonRequest({ 'content-type': t }), false, String(t)));
  });
  it('rate limiter: vượt limit → chặn, qua window → mở lại', () => {
    const rl = g.createRateLimiter({ limit: 2, windowMs: 1000, maxKeys: 100 });
    assert.equal(rl.hit('a', 0), true); assert.equal(rl.hit('a', 10), true); assert.equal(rl.hit('a', 20), false);
    assert.equal(rl.check('a', 30), false); assert.equal(rl.check('b', 30), true);
    assert.equal(rl.hit('a', 1500), true);
  });
  it('rate limiter: check không tăng đếm', () => {
    const rl = g.createRateLimiter({ limit: 1, windowMs: 1000, maxKeys: 10 });
    rl.check('x', 0); rl.check('x', 1); assert.equal(rl.hit('x', 2), true);
  });
  it('rate limiter: không vượt maxKeys (key giả ngẫu nhiên không làm phình RAM)', () => {
    const rl = g.createRateLimiter({ limit: 5, windowMs: 60000, maxKeys: 50 });
    for (let i = 0; i < 1000; i++) rl.hit('k' + i, i);
    assert.ok(rl.size() <= 50);
  });
  it('rate limiter: sweep xoá key hết hạn', () => {
    const rl = g.createRateLimiter({ limit: 5, windowMs: 1000, maxKeys: 50 });
    rl.hit('a', 0); rl.sweep(5000); assert.equal(rl.size(), 0);
  });

  globalThis.__asyncTests = (globalThis.__asyncTests || []).concat([
    { name: 'request-guards (Node) › semaphore chạy tối đa n việc cùng lúc', fn: async () => {
      const sem = g.createSemaphore(2, 10);
      let running = 0, peak = 0;
      const job = () => sem.run(async () => { running++; peak = Math.max(peak, running); await new Promise(r => setTimeout(r, 5)); running--; return 1; });
      const out = await Promise.all([job(), job(), job(), job(), job()]);
      assert.equal(peak, 2); assert.deepEqual(out, [1, 1, 1, 1, 1]);
    } },
    { name: 'request-guards (Node) › semaphore hàng chờ đầy → từ chối busy', fn: async () => {
      const sem = g.createSemaphore(1, 1);
      const slow = () => sem.run(() => new Promise(r => setTimeout(r, 10)));
      const p1 = slow(), p2 = slow();
      let err = null; try { await slow(); } catch (e) { err = e; }
      assert.ok(err && err.code === 'BUSY'); await Promise.all([p1, p2]);
    } },
    { name: 'request-guards (Node) › semaphore: việc lỗi vẫn nhả slot', fn: async () => {
      const sem = g.createSemaphore(1, 5);
      try { await sem.run(async () => { throw new Error('x'); }); } catch (e) {}
      assert.equal(await sem.run(async () => 7), 7);
    } },
    { name: 'request-guards (Node) › readJsonBody đọc JSON', fn: async () => {
      assert.deepEqual(await g.readJsonBody(Readable.from([Buffer.from('{"a":'), Buffer.from('1}')]), 100), { a: 1 });
    } },
    { name: 'request-guards (Node) › readJsonBody quá cỡ → 413', fn: async () => {
      let err = null; try { await g.readJsonBody(Readable.from([Buffer.from('x'.repeat(200))]), 100); } catch (e) { err = e; }
      assert.equal(err && err.status, 413);
    } },
    { name: 'request-guards (Node) › readJsonBody quá cỡ: đọc hết (bỏ dữ liệu) rồi mới báo 413, không cắt stream', fn: async () => {
      // cắt kết nối giữa chừng thì client nhận ECONNRESET thay vì 413 → tưởng lỗi mạng, thử lại mãi
      const s = new Readable({ read() {} });
      let settled = false;
      const p = g.readJsonBody(s, 100).catch(e => { settled = true; return e; });
      s.push(Buffer.from('x'.repeat(80))); s.push(Buffer.from('x'.repeat(80)));
      await new Promise(r => setTimeout(r, 10));
      assert.equal(s.destroyed, false, 'không destroy khi còn dưới trần cứng'); assert.equal(settled, false, 'chưa báo lỗi trước khi đọc hết');
      s.push(null);
      assert.equal((await p).status, 413);
    } },
    { name: 'request-guards (Node) › readJsonBody vượt gấp đôi giới hạn → 413 và cắt stream', fn: async () => {
      const s = Readable.from([Buffer.from('x'.repeat(150)), Buffer.from('x'.repeat(150)), Buffer.from('x'.repeat(150))]);
      let err = null; try { await g.readJsonBody(s, 100); } catch (e) { err = e; }
      assert.equal(err && err.status, 413); assert.ok(s.destroyed);
    } },
    { name: 'request-guards (Node) › readJsonBody JSON hỏng / rỗng / không phải object → 400', fn: async () => {
      for (const body of ['{bad', '', '[1]', '"x"']) {
        let err = null; try { await g.readJsonBody(Readable.from([Buffer.from(body)]), 100); } catch (e) { err = e; }
        assert.equal(err && err.status, 400, body);
      }
    } },
    { name: 'request-guards (Node) › readJsonBody stream lỗi → reject, không treo', fn: async () => {
      const s = new Readable({ read() { this.destroy(new Error('boom')); } });
      let err = null; try { await g.readJsonBody(s, 100); } catch (e) { err = e; }
      assert.equal(err && err.status, 400);
    } }
  ]);
});
