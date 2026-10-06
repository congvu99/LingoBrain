/* Test server/dialogue-routes.js + đăng ký GET/POST /api/dialogue trong auth-and-sync-routes.js.
   Pool giả (bảng dialogues/words trong RAM), provider giả. Chỉ chạy trong Node. */
describe('dialogue routes (Node)', () => {
  if (typeof require === 'undefined') { it('bỏ qua ngoài Node', () => assert.ok(true)); return; }
  const { createDialogueRoutes, dayOk, cleanIds } = require(path.join(ROOT, 'server', 'dialogue-routes.js'));
  const { createApi } = require(path.join(ROOT, 'server', 'auth-and-sync-routes.js'));
  const { Readable } = require('stream');

  const NOW = Date.parse('2026-10-06T05:00:00Z'), TODAY = '2026-10-06';
  const WORDS = { reckon: { id: 'reckon', word: 'reckon', pos: 'verb', meaning: 'nghĩ rằng' },
    stubborn: { id: 'stubborn', word: 'stubborn', pos: 'adj', meaning: 'bướng' } };

  // dialogues: key "user|day" → {data, gen_count, updatedAt}; mô phỏng đúng các câu SQL route dùng
  function fakePool(st) {
    st.rows = st.rows || {}; st.upserts = 0;
    return {
      async query(sql, p) {
        await new Promise(r => setTimeout(r, 1));
        if (/FROM words/.test(sql)) return { rows: p[0].map(id => WORDS[id]).filter(Boolean) };
        if (/SELECT data, gen_count FROM dialogues/.test(sql)) { const r = st.rows[p[0] + '|' + p[1]]; return { rows: r ? [r] : [] }; }
        if (/AS mine/.test(sql)) {
          const all = Object.entries(st.rows).filter(([, r]) => NOW - r.updatedAt < 86400000);
          const sum = list => list.reduce((s, [, r]) => s + r.gen_count, 0);
          return { rows: [{ mine: sum(all.filter(([k]) => k.split('|')[0] === String(p[0]))), total: sum(all) + (st.otherUsage || 0) }] };
        }
        if (/INSERT INTO dialogues/.test(sql)) {
          st.upserts++;
          const k = p[0] + '|' + p[1], cur = st.rows[k];
          if (!cur) { st.rows[k] = { data: p[2], gen_count: 1, updatedAt: NOW }; return { rows: [{ gen_count: 1 }] }; }
          if (cur.gen_count >= p[3]) return { rows: [] };
          cur.data = p[2]; cur.gen_count++; cur.updatedAt = NOW; return { rows: [{ gen_count: cur.gen_count }] };
        }
        return { rows: [] };
      }
    };
  }
  function turns(n) {
    return Array.from({ length: n }, (_, i) => ({ who: i % 2 ? 'you' : 'them', en: i === 1 ? 'I reckon so.' : 'Okay ' + i + '.', vi: 'v' + i, ids: [], hintVi: i % 2 ? 'ý ' + i : undefined }));
  }
  const GOOD = () => ({ scenario: 'Café', scenarioVi: 'Cà phê', roles: { you: 'customer', them: 'barista' }, turns: turns(10) });
  // provider giả: st.queue = danh sách kết quả (object | Error) lần lượt; st.delay ms; đếm lời gọi
  function fakeProvider(st) {
    st.calls = 0;
    return {
      generate: async ({ signal }) => {
        st.calls++;
        if (st.delay) await new Promise((res, rej) => {
          const t = setTimeout(res, st.delay);
          if (signal) signal.addEventListener('abort', () => { clearTimeout(t); const e = new Error('abort'); e.code = 'BUSY'; rej(e); });
        });
        const r = (st.queue && st.queue.length) ? st.queue.shift() : GOOD();
        if (r instanceof Error) throw r;
        return r;
      }
    };
  }
  function req(body, extra) {
    const r = Readable.from([Buffer.from(typeof body === 'string' ? body : JSON.stringify(body))]);
    r.headers = {}; r.socket = { destroyed: false };
    return Object.assign(r, extra);
  }
  function make(st, opts) {
    const prov = fakeProvider(st);
    return createDialogueRoutes(Object.assign({ pool: fakePool(st), getProvider: () => prov, now: () => NOW, log: () => {} }, opts));
  }
  const err = code => { const e = new Error(code); e.code = code; return e; };

  it('dayOk: chỉ nhận hôm qua/hôm nay/ngày mai (UTC server), định dạng đúng', () => {
    assert.ok(dayOk('2026-10-05', NOW) && dayOk(TODAY, NOW) && dayOk('2026-10-07', NOW));
    assert.ok(!dayOk('2026-10-08', NOW) && !dayOk('2026-02-30', NOW) && !dayOk('06/10/2026', NOW) && !dayOk(null, NOW));
  });
  it('cleanIds: lọc id lạ, bỏ trùng, chặn mảng quá dài', () => {
    assert.deepEqual(cleanIds(['a', 'a', 'b c', 5, 'how-s-it-going']), ['a', 'how-s-it-going']);
    assert.equal(cleanIds('x'), null);
    assert.equal(cleanIds(new Array(51).fill('a')), null);
  });

  globalThis.__asyncTests = (globalThis.__asyncTests || []).concat([
    { name: 'dialogue: tạo mới → 200 đúng contract; mở lại → cache, không gọi provider', fn: async () => {
      const st = {}, d = make(st);
      const [s1, b1] = await d.create(req({ day: TODAY, ids: ['reckon', 'stubborn', 'ghost'] }), 7, '1.1.1.1');
      assert.equal(s1, 200);
      assert.equal(b1.genCount, 1); assert.equal(b1.genMax, 3); assert.equal(b1.day, TODAY);
      assert.deepEqual(b1.dialogue.targetIds, ['reckon', 'stubborn']);
      assert.deepEqual(b1.dialogue.missing, ['stubborn']);
      const [s2, b2] = await d.create(req({ day: TODAY, ids: ['other'] }), 7, '1.1.1.1');
      assert.equal(s2, 200); assert.equal(b2.genCount, 1); assert.equal(st.calls, 1);
    } },
    { name: 'dialogue: 2 request song song regenerate → 1 lời gọi, gen_count +1', fn: async () => {
      const st = { delay: 20 }, d = make(st);
      await d.create(req({ day: TODAY, ids: ['reckon'] }), 7, 'ip');
      const before = st.calls;
      const [a, b] = await Promise.all([d.create(req({ day: TODAY, ids: ['reckon'], regenerate: true }), 7, 'ip'),
        d.create(req({ day: TODAY, ids: ['reckon'], regenerate: true }), 7, 'ip')]);
      assert.equal(a[0], 200); assert.equal(b[0], 200);
      assert.equal(st.calls - before, 1);
      assert.equal(a[1].genCount, 2); assert.equal(b[1].genCount, 2);
      assert.equal(st.rows['7|' + TODAY].gen_count, 2);
    } },
    { name: 'dialogue: hết 3 lượt trong 24h kể cả đổi day ±1 → 429', fn: async () => {
      const st = {}, d = make(st);
      assert.equal((await d.create(req({ day: '2026-10-05', ids: ['reckon'] }), 7, 'ip'))[0], 200);
      assert.equal((await d.create(req({ day: TODAY, ids: ['reckon'] }), 7, 'ip'))[0], 200);
      assert.equal((await d.create(req({ day: '2026-10-07', ids: ['reckon'] }), 7, 'ip'))[0], 200);
      const [s] = await d.create(req({ day: TODAY, ids: ['reckon'], regenerate: true }), 7, 'ip');
      assert.equal(s, 429);
      assert.equal(st.calls, 3);
      assert.equal((await d.create(req({ day: TODAY, ids: ['reckon'] }), 7, 'ip'))[0], 200, 'cache vẫn mở được');
    } },
    { name: 'dialogue: song song cho hôm qua/hôm nay/ngày mai → chỉ 1 lượt chạy, còn lại 429', fn: async () => {
      const st = { delay: 20 }, d = make(st);
      const days = ['2026-10-05', TODAY, '2026-10-07'];
      const res = await Promise.all(days.map(day => d.create(req({ day, ids: ['reckon'], regenerate: true }), 7, 'ip')));
      assert.deepEqual(res.map(r => r[0]).sort(), [200, 429, 429]);
      assert.equal(st.calls, 1);
    } },
    { name: 'dialogue: dòng ngày này đã chạm trần (cũ hơn 24h) → 429 trước khi gọi Gemini', fn: async () => {
      const st = { rows: { ['7|' + TODAY]: { data: {}, gen_count: 3, updatedAt: NOW - 2 * 86400000 } } }, d = make(st);
      assert.equal((await d.create(req({ day: TODAY, ids: ['reckon'], regenerate: true }), 7, 'ip'))[0], 429);
      assert.equal(st.calls, 0);
    } },
    { name: 'dialogue: trần toàn server → 429, không gọi provider', fn: async () => {
      const st = { otherUsage: 50 }, d = make(st);
      assert.equal((await d.create(req({ day: TODAY, ids: ['reckon'] }), 7, 'ip'))[0], 429);
      assert.equal(st.calls, 0);
    } },
    { name: 'dialogue: body sai → 400; không id hợp lệ trong DB → 400', fn: async () => {
      const st = {}, d = make(st);
      assert.equal((await d.create(req({ day: '2026-10-09', ids: ['reckon'] }), 7, 'ip'))[0], 400);
      assert.equal((await d.create(req({ day: TODAY, ids: [] }), 7, 'ip'))[0], 400);
      assert.equal((await d.create(req({ day: TODAY, ids: ['reckon'], regenerate: 'yes' }), 7, 'ip'))[0], 400);
      assert.equal((await d.create(req({ day: TODAY, ids: ['ghost'] }), 7, 'ip'))[0], 400);
      let status = 0;
      try { await d.create(req('{bad'), 7, 'ip'); } catch (e) { status = e.status; }
      assert.equal(status, 400);
    } },
    { name: 'dialogue: Gemini lỗi → 503, không tốn lượt; lần thử thứ 7/24h → 429', fn: async () => {
      const st = { queue: Array.from({ length: 6 }, () => err('UPSTREAM')) }, d = make(st);
      for (let i = 0; i < 6; i++) assert.equal((await d.create(req({ day: TODAY, ids: ['reckon'] }), 7, 'ip' + i))[0], 503);
      assert.equal(Object.keys(st.rows).length, 0);
      assert.equal((await d.create(req({ day: TODAY, ids: ['reckon'] }), 7, 'ipX'))[0], 429);
      assert.equal(st.calls, 6);
    } },
    { name: 'dialogue: Google hết lượt (QUOTA) → 429 rõ lý do, không gọi lại, không tốn lượt', fn: async () => {
      const st = { queue: [err('QUOTA')] }, d = make(st);
      const [s, b] = await d.create(req({ day: TODAY, ids: ['reckon'] }), 7, 'ip');
      assert.equal(s, 429); assert.ok(/hết lượt/.test(b.error));
      assert.equal(st.calls, 1); assert.equal(Object.keys(st.rows).length, 0);
    } },
    { name: 'dialogue: Google đang chặn → 429 ngay, không trừ lượt thử; hết chặn vẫn tạo được', fn: async () => {
      const st = {}; let wait = 120000;
      const prov = Object.assign(fakeProvider(st), { quotaWaitMs: () => wait });
      const d = createDialogueRoutes({ pool: fakePool(st), getProvider: () => prov, now: () => NOW, log: () => {} });
      for (let i = 0; i < 8; i++) {
        const [s, b] = await d.create(req({ day: TODAY, ids: ['reckon'] }), 7, 'ip');
        assert.equal(s, 429); assert.ok(/2 phút/.test(b.error), b.error);
      }
      assert.equal(st.calls, 0);
      wait = 0;
      assert.equal((await d.create(req({ day: TODAY, ids: ['reckon'] }), 7, 'ip'))[0], 200, 'không bị khoá vì lượt thử');
    } },
    { name: 'dialogue: JSON sai lần 1, đúng lần 2 → 200 (2 lời gọi); sai cả 2 → 503', fn: async () => {
      let st = { queue: [err('INVALID'), GOOD()] }, d = make(st);
      assert.equal((await d.create(req({ day: TODAY, ids: ['reckon'] }), 7, 'ip'))[0], 200);
      assert.equal(st.calls, 2);
      st = { queue: [{ turns: [] }, err('INVALID')] }; d = make(st);
      assert.equal((await d.create(req({ day: TODAY, ids: ['reckon'] }), 8, 'ip'))[0], 503);
      assert.equal(st.calls, 2);
    } },
    { name: 'dialogue: quá ngân sách → 503 + huỷ lời gọi; không gọi lại khi còn ít thời gian', fn: async () => {
      let t = NOW;
      const st = { delay: 200 };
      const prov = fakeProvider(st);
      const d = createDialogueRoutes({ pool: fakePool(st), getProvider: () => prov, now: () => t, budgetMs: 60, log: () => {} });
      const p = d.create(req({ day: TODAY, ids: ['reckon'] }), 7, 'ip');
      const started = Date.now();
      const [s] = await p;
      assert.equal(s, 503);
      assert.ok(Date.now() - started < 190, 'không chờ hết lời gọi Gemini');
      assert.equal(Object.keys(st.rows).length, 0);
    } },
    { name: 'dialogue: client đã ngắt khi tới lượt → không gọi provider', fn: async () => {
      const st = {}, d = make(st);
      const [s] = await d.create(req({ day: TODAY, ids: ['reckon'] }, { socket: { destroyed: true } }), 7, 'ip');
      assert.equal(s, 503);
      assert.equal(st.calls, 0);
    } },
    { name: 'dialogue: không provider → enabled false, create 501', fn: async () => {
      const d = createDialogueRoutes({ pool: fakePool({}), getProvider: () => null, log: () => {} });
      assert.deepEqual(d.status(), [200, { enabled: false }]);
      assert.equal((await d.create(req({ day: TODAY, ids: ['reckon'] }), 7, 'ip'))[0], 501);
    } },
    { name: 'createApi: GET /api/dialogue không auth; POST 501 trước auth khi tắt; 401 khi bật mà thiếu token', fn: async () => {
      const call = async (api, method, headers) => {
        const out = {};
        const r = req({ day: TODAY, ids: ['reckon'] }, { method, url: '/api/dialogue', headers: Object.assign({ 'content-type': 'application/json' }, headers) });
        r.socket = { remoteAddress: '9.9.9.9', destroyed: false };
        await api(r, { headersSent: false, writeHead(s) { out.status = s; }, end(b) { out.body = b ? JSON.parse(b) : null; } }, false);
        return out;
      };
      const pool = { async query() { return { rows: [] }; } };
      const off = createApi({ pool, isReady: () => true, trustHops: 0, log: () => {} });
      assert.deepEqual((await call(off, 'GET')).body, { enabled: false });
      assert.equal((await call(off, 'POST')).status, 501);
      const on = createApi({ pool, isReady: () => true, trustHops: 0, log: () => {}, dialogue: make({}) });
      assert.deepEqual((await call(on, 'GET')).body, { enabled: true });
      assert.equal((await call(on, 'POST')).status, 401);
    } }
  ]);
});
