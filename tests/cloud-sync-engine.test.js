/* Test js/cloud-sync-engine.js trong Node với stub tối thiểu (localStorage, state app, fetch).
   Engine không đụng DOM ở top-level nên nạp được như module thuần. */
describe('cloud-sync-engine (Node)', () => {
  if (typeof require === 'undefined' || typeof syncNow === 'undefined') { it('bỏ qua ngoài Node', () => assert.ok(true)); return; }
  const G = globalThis;
  const store = {};
  const rec = o => Object.assign({ ef: 2.5, ivl: 1, due: 0, state: 'review', reps: 1, lapses: 0, last: 0, lastMode: 'type', sentences: [], hist: [] }, o);
  // dựng lại môi trường app giả cho mỗi test
  function setup(opts) {
    Object.keys(store).forEach(k => delete store[k]);
    G.localStorage = { getItem: k => k in store ? store[k] : null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
    G.load = (k, d) => { const v = store[k]; return v ? JSON.parse(v) : d; };
    G.save = (k, v, o) => { store[k] = JSON.stringify(v); if (G.saveThrowsFor === k) { G.saveThrowsFor = null; throw new Error('boom'); } onLocalSave(k, o); };
    G.toast = () => {}; G.tab = 'plan'; G.DEFAULT_PLAN = [{ id: 't1', time: '07:00', dur: '', title: 'x', desc: '' }];
    G.dkey = () => '2026-09-23';
    G.srs = {}; G.cfg = { newPerDay: 5, maxSession: 40 }; G.plan = G.DEFAULT_PLAN.slice(); G.gameScore = {};
    G.day = { date: '2026-09-23', done: {}, streak: 0, history: {}, caption: {} };
    G.bossProg = emptyBoss();   // tiến trình Pháp Sư Lexoria (app-storage.js không nạp trong test này, stub thủ công)
    G.fetchCalls = [];
    G.fetch = async (url, init) => { G.fetchCalls.push({ url, init, body: init && init.body ? JSON.parse(init.body) : null }); return G.nextResponse(init); };
    G.nextResponse = () => ({ status: 200, headers: { get: () => 'application/json' }, json: async () => ({ data: JSON.parse(G.fetchCalls[G.fetchCalls.length - 1].init.body).data }) });
    resetSyncRun();
    if (opts && opts.auth) setAuth({ token: 'tok_' + 'x'.repeat(40), username: 'minh' });
  }
  const respond = (status, body, ctype) => () => ({ status, headers: { get: () => ctype || 'application/json' }, json: async () => { if (body === undefined) throw new Error('not json'); return body; } });

  it('classifySyncResponse', () => {
    assert.equal(classifySyncResponse(200, { data: {} }), 'ok');
    assert.equal(classifySyncResponse(200, null), 'retry');
    assert.equal(classifySyncResponse(401, { error: 'x' }), 'auth');
    assert.equal(classifySyncResponse(413, { error: 'x' }), 'too-big');
    [429, 500, 502, 503, 404, 405].forEach(s => assert.equal(classifySyncResponse(s, null), 'retry', String(s)));
  });
  it('save cfg/plan/day đóng dấu ts; stamp:false thì không', () => {
    setup();
    save('eng.cfg.v1', cfg); save('eng.plan.v1', plan);
    const m = syncMeta(); assert.ok(m.cfgTs > 0); assert.ok(m.planTs > 0); assert.equal(m.dayTs, undefined);
    save('eng.day.v1', day, { stamp: false }); assert.equal(syncMeta().dayTs, undefined);
    save('eng.day.v1', day); assert.ok(syncMeta().dayTs > 0);
  });
  it('chưa đăng nhập: save không lên lịch sync', () => { setup(); save('eng.srs.v2', {}); assert.equal(syncRunState().dirty, false); });
  it('đã đăng nhập: save key đồng bộ → dirty; key không đồng bộ → không', () => {
    setup({ auth: true });
    save('eng.gamemiss.v1', []); assert.equal(syncRunState().dirty, false);
    save('eng.srs.v2', {}); assert.equal(syncRunState().dirty, true);
    cancelScheduledSync();
  });
  it('applySyncPayload: cfg const được Object.assign, không ném; không đóng dấu, không lên lịch', () => {
    setup({ auth: true });
    const cfgRef = cfg;
    applySyncPayload({ v: 1, srsEpoch: 0, srs: { w: rec({ last: 5 }) }, cfg: { data: { newPerDay: 9, maxSession: 40 }, ts: 77 }, plan: null, day: null, gameScore: { sprint: { best: 3, plays: 1 } } });
    assert.ok(cfg === cfgRef); assert.equal(cfg.newPerDay, 9); assert.ok(srs.w); assert.equal(gameScore.sprint.best, 3);
    assert.equal(syncMeta().cfgTs, 77); assert.equal(syncRunState().dirty, false); assert.equal(syncRunState().applying, false);
  });
  it('applySyncPayload lỗi giữa chừng → cờ applying vẫn trả về false', () => {
    setup({ auth: true });
    G.saveThrowsFor = 'eng.cfg.v1';
    let threw = false;
    try { applySyncPayload({ v: 1, srs: {}, cfg: { data: { newPerDay: 3, maxSession: 40 }, ts: 1 } }); } catch (e) { threw = true; }
    assert.ok(threw); assert.equal(syncRunState().applying, false);
  });
  it('stampRestoredSrs: mọi record mt = now, epoch = now', () => {
    setup();
    const s = { a: rec({ last: 1 }), b: rec({ last: 2 }) };
    stampRestoredSrs(s, 500);
    assert.equal(s.a.mt, 500); assert.equal(s.b.mt, 500); assert.equal(syncMeta().srsEpoch, 500);
  });
  it('resetLocalToDefaults: state về mặc định, ts/epoch = 0, bossProg → emptyBoss', () => {
    setup();
    srs = { w: rec({ last: 9 }) }; cfg.newPerDay = 20; setSyncMeta({ cfgTs: 5, planTs: 5, dayTs: 5, srsEpoch: 5 });
    bossProg = mergeBoss(bossProg, { xp: 500, wins: { '2026-09-01': 3 } });
    resetLocalToDefaults();
    assert.deepEqual(srs, {}); assert.equal(cfg.newPerDay, 5); assert.equal(plan[0].id, 't1');
    const m = syncMeta(); assert.equal(m.cfgTs + m.planTs + m.dayTs + m.srsEpoch, 0);
    assert.deepEqual(bossProg, emptyBoss()); assert.deepEqual(JSON.parse(store['eng.boss.v1']), emptyBoss());
  });
  it('applySyncPayload: day có ngày tương lai → giữ day local, không đóng dấu', () => {
    setup({ auth: true });
    day.done = { t1: 1 }; setSyncMeta({ dayTs: 5 });
    applySyncPayload({ v: 1, srs: {}, day: { data: { date: '2099-01-01', done: {}, streak: 0, history: {}, caption: {} }, ts: 999 } });
    assert.equal(day.date, '2026-09-23'); assert.deepEqual(day.done, { t1: 1 }); assert.equal(syncMeta().dayTs, 5);
  });
  it('applySyncPayload: áp boss bình thường', () => {
    setup({ auth: true });
    const boss = mergeBoss(emptyBoss(), { xp: 300, wins: { '2026-09-20': 4 } });
    applySyncPayload({ v: 1, srs: {}, boss });
    assert.equal(bossProg.xp, 300); assert.equal(bossProg.wins['2026-09-20'], 4);
    assert.deepEqual(JSON.parse(store['eng.boss.v1']), boss);
  });
  it('applySyncPayload: boss.day ngày tương lai → giữ day local của Pháp sư, xp vẫn áp', () => {
    setup({ auth: true });
    bossProg = mergeBoss(emptyBoss(), { day: { date: '2026-09-23', beat: 2, dmg: 50 } });
    const remoteBoss = mergeBoss(emptyBoss(), { xp: 900, day: { date: '2099-01-01', beat: 1, dmg: 10 } });
    applySyncPayload({ v: 1, srs: {}, boss: remoteBoss });
    assert.equal(bossProg.xp, 900, 'xp vẫn nhận từ server'); assert.deepEqual(bossProg.day, { date: '2026-09-23', beat: 2, dmg: 50 }, 'day tương lai bị giữ local');
  });
  it('switchOwner: đổi chủ → xoá mốc epoch + ts của chủ cũ (không xoá oan dữ liệu TK mới); replace → state mặc định', () => {
    setup();
    srs = { w: rec({ last: 9 }) }; gameMiss = ['w']; setSyncMeta({ owner: 'x', srsEpoch: 500, cfgTs: 5, planTs: 5, dayTs: 5 });
    switchOwner('y', false);
    let m = syncMeta();
    assert.equal(m.owner, 'y'); assert.equal(m.srsEpoch + m.cfgTs + m.planTs + m.dayTs, 0); assert.ok(srs.w, 'gộp: giữ record của máy');
    setSyncMeta({ owner: 'y', srsEpoch: 700 });
    switchOwner('z', true);
    m = syncMeta();
    assert.deepEqual(srs, {}); assert.equal(m.srsEpoch, 0); assert.equal(m.owner, 'z'); assert.deepEqual(gameMiss, []);
    assert.ok(day.date < '2000-01-01', 'day mặc định mang ngày cũ → day của TK trên server thắng (giữ streak đúng)');
  });
  it('needsOwnerPrompt: chủ khác thì hỏi dù máy chưa có từ nào', () => {
    setup();
    assert.equal(needsOwnerPrompt('a'), false, 'máy chưa từng thuộc TK nào');
    setSyncMeta({ owner: 'a' });
    assert.equal(needsOwnerPrompt('a'), false); assert.equal(needsOwnerPrompt('b'), true);
  });
  it('setAuth mở lại sync đã bị chặn vì 413', () => {
    setup({ auth: true }); syncRun.blocked = true; setAuth({ token: 'tok_' + 'y'.repeat(40), username: 'k' });
    assert.equal(syncRunState().blocked, false);
  });
  it('hasLocalProgress', () => { setup(); assert.equal(hasLocalProgress(), false); srs = { w: rec({}) }; assert.equal(hasLocalProgress(), true); });

  // Khôi phục backup (word-import.js restoreBackup): bossProg = mergeBoss(bossProg, cleanBoss(j.boss, now)).
  // word-import.js cần DOM ($('#setNew')…) nên test trực tiếp dòng gộp này (giống hệt logic thật) thay vì gọi restoreBackup().
  describe('khôi phục backup: gộp bossProg (mergeBoss + cleanBoss)', () => {
    it('backup rác (thiếu/hỏng boss) → bossProg vẫn hợp lệ, giữ nguyên tiến trình hiện có', () => {
      setup();
      bossProg = mergeBoss(emptyBoss(), { xp: 400, wins: { '2026-09-10': 3 }, alloc: { fire: 1 } });
      [undefined, null, 'x', 7, [], {}, { xp: 'constructor' }, { day: { beat: 'x' } }].forEach(junk => {
        const before = JSON.stringify(bossProg);
        bossProg = mergeBoss(bossProg, cleanBoss(junk, Date.now()));
        assert.equal(JSON.stringify(bossProg), before, 'rác không có xp/wins hợp lệ → không đổi gì (mergeBoss với emptyBoss ≡ chính nó)');
      });
    });
    it('backup có XP thấp hơn hiện tại → không làm tụt (max, không ghi đè)', () => {
      setup();
      bossProg = mergeBoss(emptyBoss(), { xp: 900, alloc: { fire: 3, ice: 2 } });
      bossProg = mergeBoss(bossProg, cleanBoss({ xp: 100, alloc: { fire: 1 } }, Date.now()));
      assert.equal(bossProg.xp, 900, 'XP backup thấp hơn không kéo tụt XP hiện tại');
      assert.equal(bossProg.alloc.fire, 3, 'alloc gộp max theo nhánh, không tụt');
    });
    it('backup có XP/tiến trình cao hơn → được nhận vào (gộp lên, không phải đè)', () => {
      setup();
      bossProg = mergeBoss(emptyBoss(), { xp: 100, wins: { '2026-09-10': 2 } });
      bossProg = mergeBoss(bossProg, cleanBoss({ xp: 500, wins: { '2026-09-15': 5 } }, Date.now()));
      assert.equal(bossProg.xp, 500);
      assert.deepEqual(bossProg.wins, { '2026-09-10': 2, '2026-09-15': 5 }, 'cả hai trận thắng đều còn — gộp, không thay');
    });
  });

  const N = 'cloud-sync-engine (Node) › ';
  G.__asyncTests = (G.__asyncTests || []).concat([
    { name: N + 'chưa đăng nhập: syncNow không gọi mạng', fn: async () => { setup(); await syncNow(); assert.equal(fetchCalls.length, 0); } },
    { name: N + 'vòng sync giữ boss: gửi lên rồi server hồi lại (echo) → bossProg không đổi', fn: async () => {
      setup({ auth: true });
      bossProg = mergeBoss(emptyBoss(), { xp: 250, wins: { '2026-09-10': 5 }, alloc: { fire: 2 } });
      await syncNow();   // stub echo: server trả đúng payload đã gửi
      assert.equal(fetchCalls[0].body.data.boss.xp, 250, 'boss có trong payload gửi lên');
      assert.equal(bossProg.xp, 250); assert.equal(bossProg.wins['2026-09-10'], 5); assert.equal(bossProg.alloc.fire, 2);
    } },
    { name: N + 'sync gửi PUT JSON có Bearer, trả về → áp + ghi syncedAt/owner', fn: async () => {
      setup({ auth: true });
      srs = { w: rec({ last: 10 }) };
      nextResponse = respond(200, { data: { v: 1, srs: { w: rec({ last: 10 }), cat: rec({ last: 3 }) } } });
      await syncNow();
      const c = fetchCalls[0];
      assert.equal(c.url, '/api/sync'); assert.equal(c.init.method, 'PUT');
      assert.equal(c.init.headers['Content-Type'], 'application/json'); assert.ok(/^Bearer tok_/.test(c.init.headers.Authorization));
      assert.ok(c.body.data.srs.w); assert.ok(srs.cat, 'nhận từ server');
      assert.ok(syncMeta().syncedAt > 0); assert.equal(syncMeta().owner, 'minh'); assert.equal(syncRunState().status, 'ok');
    } },
    { name: N + 'xoá tiến độ: epoch mới gửi đi; server trả dữ liệu cũ → local vẫn rỗng', fn: async () => {
      setup({ auth: true });
      markSrsReset(1000); srs = {};
      nextResponse = respond(200, { data: { v: 1, srsEpoch: 0, srs: { w: rec({ last: 500 }) } } });
      await syncNow();
      assert.equal(fetchCalls[0].body.data.srsEpoch, 1000); assert.deepEqual(Object.keys(srs), []);
    } },
    { name: N + 'lượt chấm xen giữa lúc request đang bay không bị mất', fn: async () => {
      setup({ auth: true });
      srs = { w: rec({ last: 10 }) };
      let release;
      nextResponse = () => new Promise(r => { release = () => r(respond(200, { data: { v: 1, srs: { w: rec({ last: 10 }) } } })()); });
      const p = syncNow();
      await new Promise(r => setTimeout(r, 0));
      srs.x = rec({ last: 20 }); save('eng.srs.v2', srs);   // chấm thẻ mới khi request chưa về (app luôn save sau khi chấm)
      release(); await p;
      assert.ok(srs.x, 'giữ lượt chấm xen giữa'); assert.equal(syncRunState().dirty, true, 'còn thay đổi chưa gửi');
      cancelScheduledSync();
    } },
    { name: N + '401 → đăng xuất; 413 → chặn auto sync; lỗi mạng/404 HTML → thử lại có backoff', fn: async () => {
      setup({ auth: true }); nextResponse = respond(401, { error: 'x' }); await syncNow();
      assert.equal(authInfo(), null); assert.equal(syncRunState().status, 'signedout');
      setup({ auth: true }); nextResponse = respond(413, { error: 'x' }); await syncNow();
      assert.equal(syncRunState().status, 'toobig'); srs = {}; save('eng.srs.v2', srs); assert.equal(syncRunState().dirty, false, '413 chặn lịch mới');
      setup({ auth: true }); nextResponse = () => { throw new TypeError('Failed to fetch'); }; await syncNow();
      assert.equal(syncRunState().status, 'retry'); assert.ok(syncRunState().backoff >= 30000); cancelScheduledSync();
      setup({ auth: true }); nextResponse = respond(404, undefined, 'text/html'); await syncNow();
      assert.equal(syncRunState().status, 'retry'); cancelScheduledSync();
    } },
    { name: N + 'phản hồi về sau khi đã đổi tài khoản → bỏ, không áp dữ liệu TK cũ, không xoá token mới', fn: async () => {
      setup({ auth: true });
      let release;
      nextResponse = () => new Promise(r => { release = () => r(respond(401, { error: 'x' })()); });
      const p = syncNow(); await new Promise(r => setTimeout(r, 0));
      setAuth({ token: 'tok_' + 'n'.repeat(40), username: 'moi' });
      release(); await p;
      assert.equal(authInfo() && authInfo().username, 'moi', '401 cũ không xoá token mới');
      setup({ auth: true });
      nextResponse = () => new Promise(r => { release = () => r(respond(200, { data: { v: 1, srs: { old: rec({ last: 9 }) } } })()); });
      const p2 = syncNow(); await new Promise(r => setTimeout(r, 0));
      setAuth({ token: 'tok_' + 'm'.repeat(40), username: 'moi2' });
      release(); await p2;
      assert.equal(srs.old, undefined, 'không áp dữ liệu của TK cũ'); assert.ok(syncMeta().owner !== 'minh');
      cancelScheduledSync();
    } },
    { name: N + 'request treo quá timeout → retry, không kẹt inFlight', fn: async () => {
      setup({ auth: true });
      G.SYNC_TIMEOUT_OVERRIDE = 30;
      nextResponse = (init) => new Promise((_, rej) => { init.signal.addEventListener('abort', () => rej(new Error('aborted'))); });
      await syncNow();
      G.SYNC_TIMEOUT_OVERRIDE = undefined;
      assert.equal(syncRunState().inFlight, false); assert.equal(syncRunState().status, 'retry'); cancelScheduledSync();
    } },
    { name: N + 'lần sync đầu thất bại → lần thành công sau mới gọi onInitialSyncApplied (với miss)', fn: async () => {
      setup({ auth: true });
      let calls = [];
      G.onInitialSyncApplied = miss => calls.push(miss);
      nextResponse = respond(503, { error: 'x' });
      await syncNow({ initial: true, miss: ['w1'] });
      assert.equal(calls.length, 0);
      syncRun.retryAt = 0; nextResponse = respond(200, { data: { v: 1 } });
      await syncNow();
      assert.deepEqual(calls, [['w1']]);
      await syncNow(); assert.equal(calls.length, 1, 'chỉ một lần');
      G.onInitialSyncApplied = undefined; cancelScheduledSync();
    } },
    { name: N + 'đang có request bay: syncNow lần 2 không gửi trùng, chỉ đánh dấu dirty', fn: async () => {
      setup({ auth: true });
      let release;
      nextResponse = () => new Promise(r => { release = () => r(respond(200, { data: { v: 1 } })()); });
      const p = syncNow(); await new Promise(r => setTimeout(r, 0));
      await syncNow();
      assert.equal(fetchCalls.length, 1); assert.equal(syncRunState().dirty, true);
      release(); await p; cancelScheduledSync();
    } }
  ]);
});
