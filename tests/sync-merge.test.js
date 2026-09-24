/* Test hàm thuần đồng bộ: gộp 2 payload, làm sạch payload lạ, state ↔ payload.
   Chạy trong Node (run-tests.js) và trình duyệt (run-tests.html). */
(function () {
  const NOW = 1790000000000;
  const rec = o => Object.assign({ ef: 2.5, ivl: 1, due: 0, state: 'review', reps: 1, lapses: 0, last: 0, lastMode: 'type', sentences: [], hist: [] }, o);
  // stringify ổn định (sort key) để so kết quả không phụ thuộc thứ tự key
  const canon = v => JSON.stringify(v, (k, x) => x && typeof x === 'object' && !Array.isArray(x)
    ? Object.keys(x).sort().reduce((o, key) => (o[key] = x[key], o), {}) : x);

  const A = {
    v: 1, srsEpoch: 0,
    srs: {
      apple: rec({ last: 100, reps: 2, sentences: ['I eat an apple.'], hist: [{ t: 100, g: 2, mode: 'type' }] }),
      bread: rec({ last: 50 })
    },
    cfg: { data: { newPerDay: 5, maxSession: 40 }, ts: 10 },
    plan: { data: [{ id: 't1', time: '07:00', dur: '10 phút', title: 'Xem clip', desc: '' }], ts: 5 },
    day: { data: { date: '2026-09-23', done: { t1: 1 }, streak: 3, history: { '2026-09-22': 7 }, caption: {} }, ts: 20 },
    gameScore: { sprint: { best: 30, plays: 4 } }
  };
  const B = {
    v: 1, srsEpoch: 0,
    srs: {
      apple: rec({ last: 200, reps: 3, ivl: 3, hist: [{ t: 100, g: 2, mode: 'type' }, { t: 200, g: 3, mode: 'mcq' }] }),
      cat: rec({ last: 70 })
    },
    cfg: { data: { newPerDay: 8, maxSession: 40 }, ts: 30 },
    plan: { data: [{ id: 't1', time: '08:00', dur: '10 phút', title: 'Xem clip', desc: '' }], ts: 1 },
    day: { data: { date: '2026-09-23', done: {}, streak: 3, history: { '2026-09-21': 5 }, caption: {} }, ts: 25 },
    gameScore: { sprint: { best: 20, plays: 9 }, planes: { best: 400, plays: 1 } }
  };

  describe('sync-merge — gộp srs', () => {
    const m = mergeSync(A, B);
    it('id chỉ có ở một bên được giữ', () => { assert.ok(m.srs.bread); assert.ok(m.srs.cat); });
    it('cùng id: trường lịch lấy từ bản last mới hơn', () => {
      assert.equal(m.srs.apple.last, 200); assert.equal(m.srs.apple.reps, 3); assert.equal(m.srs.apple.ivl, 3);
    });
    it('câu bước 5 của bản cũ hơn vẫn được giữ', () => assert.deepEqual(m.srs.apple.sentences, ['I eat an apple.']));
    it('hist hợp theo t+g+mode, không nhân đôi, sort theo t', () => assert.deepEqual(m.srs.apple.hist.map(h => h.t), [100, 200]));
    it('cùng last, một bên có thêm câu → giữ câu (lỗi mất câu bước 5)', () => {
      const r = rec({ last: 300 });
      const x = mergeSync({ srs: { w: r } }, { srs: { w: Object.assign({}, r, { sentences: ['new one'] }) } });
      assert.deepEqual(x.srs.w.sentences, ['new one']);
      const y = mergeSync({ srs: { w: Object.assign({}, r, { sentences: ['new one'] }) } }, { srs: { w: r } });
      assert.deepEqual(y.srs.w.sentences, ['new one']);
    });
    it('hai máy cùng ôn 1 từ offline → hist chứa cả hai lượt', () => {
      const x = mergeSync(
        { srs: { w: rec({ last: 10, hist: [{ t: 10, g: 2, mode: 'type' }] }) } },
        { srs: { w: rec({ last: 12, hist: [{ t: 12, g: 0, mode: 'mcq' }] }) } });
      assert.deepEqual(x.srs.w.hist.map(h => h.t), [10, 12]); assert.equal(x.srs.w.last, 12);
    });
    it('sentences giữ tối đa 5', () => {
      const x = mergeSync({ srs: { w: rec({ last: 1, sentences: ['a', 'b', 'c'] }) } }, { srs: { w: rec({ last: 2, sentences: ['d', 'e', 'f'] }) } });
      assert.equal(x.srs.w.sentences.length, 5); assert.equal(x.srs.w.sentences[4], 'f');
    });
    it('histMax cắt hist', () => {
      const hist = Array.from({ length: 30 }, (_, i) => ({ t: i + 1, g: 2, mode: 'type' }));
      const x = mergeSync({ srs: { w: rec({ last: 30, hist }) } }, {}, { histMax: 20 });
      assert.equal(x.srs.w.hist.length, 20); assert.equal(x.srs.w.hist[19].t, 30);
    });
    it('mt lấy max', () => {
      const x = mergeSync({ srs: { w: rec({ last: 1, mt: 50 }) } }, { srs: { w: rec({ last: 2, mt: 9 }) } });
      assert.equal(x.srs.w.mt, 50);
    });
  });

  describe('sync-merge — srsEpoch (xoá / khôi phục lan sang máy khác)', () => {
    it('epoch lớn hơn loại record cũ hơn mốc', () => {
      const x = mergeSync({ srsEpoch: 100, srs: {} }, { srsEpoch: 0, srs: { w: rec({ last: 50 }) } });
      assert.equal(x.srsEpoch, 100); assert.deepEqual(Object.keys(x.srs), []);
    });
    it('record sửa sau mốc (mt) được giữ — khôi phục backup', () => {
      const x = mergeSync({ srsEpoch: 100, srs: { w: rec({ last: 20, mt: 150 }) } }, { srsEpoch: 0, srs: { w: rec({ last: 90 }) } });
      assert.ok(x.srs.w); assert.equal(x.srs.w.mt, 150);
    });
    it('máy cũ lỡ mốc xoá không hồi sinh câu/hist cũ vào record ôn sau mốc', () => {
      const stale = { srs: { w: rec({ last: 50, sentences: ['OLD'], hist: [{ t: 10, g: 2, mode: 'type' }, { t: 50, g: 2, mode: 'type' }] }) } };
      const fresh = { srsEpoch: 100, srs: { w: rec({ last: 150, hist: [{ t: 150, g: 3, mode: 'type' }] }) } };
      const x = mergeSync(stale, fresh);
      assert.deepEqual(x.srs.w.sentences, []); assert.deepEqual(x.srs.w.hist.map(h => h.t), [150]);
      assert.equal(canon(mergeSync(mergeSync(stale, { srsEpoch: 100, srs: {} }), fresh)), canon(mergeSync(stale, mergeSync({ srsEpoch: 100, srs: {} }, fresh))), 'kết hợp');
    });
    it('record ôn sau mốc được giữ', () => {
      const x = mergeSync({ srsEpoch: 100, srs: {} }, { srs: { w: rec({ last: 120 }) } });
      assert.ok(x.srs.w);
    });
  });

  describe('sync-merge — cfg / plan / day / gameScore', () => {
    const m = mergeSync(A, B);
    it('cfg: ts mới hơn thắng', () => assert.equal(m.cfg.data.newPerDay, 8));
    it('plan: ts mới hơn thắng', () => assert.equal(m.plan.data[0].time, '07:00'));
    it('thiếu ts thua bản có ts', () => {
      const x = mergeSync({ cfg: { data: { newPerDay: 1, maxSession: 5 } } }, { cfg: { data: { newPerDay: 9, maxSession: 5 }, ts: 1 } });
      assert.equal(x.cfg.data.newPerDay, 9);
    });
    it('day: bỏ tích ở bản mới hơn → kết quả không còn tích', () => assert.deepEqual(m.day.data.done, {}));
    it('day: ngày mới hơn thắng dù ts cũ hơn (máy mở app sau không đè việc máy kia đã tích hôm nay)', () => {
      const ticked = { day: { data: { date: '2026-09-23', done: { t1: 1 }, streak: 2, history: {}, caption: {} }, ts: 100 } };
      const rolled = { day: { data: { date: '2026-09-23', done: {}, streak: 2, history: {}, caption: {} }, ts: 50 } };
      const yesterday = { day: { data: { date: '2026-09-22', done: { t1: 1, t2: 1 }, streak: 1, history: {}, caption: {} }, ts: 999 } };
      assert.deepEqual(mergeSync(ticked, rolled).day.data.done, { t1: 1 });
      assert.equal(mergeSync(yesterday, rolled).day.data.date, '2026-09-23');
      assert.equal(mergeSync(rolled, yesterday).day.data.date, '2026-09-23');
    });
    it('day: history max theo từng ngày từ cả hai', () => {
      assert.equal(m.day.data.history['2026-09-22'], 7); assert.equal(m.day.data.history['2026-09-21'], 5);
    });
    it('gameScore: max từng trường, game một bên vẫn giữ', () => {
      assert.deepEqual(m.gameScore.sprint, { best: 30, plays: 9 }); assert.deepEqual(m.gameScore.planes, { best: 400, plays: 1 });
    });
    it('một bên thiếu phần → lấy bên còn lại', () => {
      const x = mergeSync({ plan: A.plan }, {}); assert.equal(x.plan.data[0].id, 't1'); assert.equal(x.cfg, null);
    });
  });

  describe('sync-merge — tính chất đại số', () => {
    // kết hợp: đảm bảo khi sentences không xung đột; nếu xung đột, thứ tự câu có thể khác nhưng tập câu như nhau
    // và lần gộp kế hội tụ (idempotent + giao hoán) — xem phase 1 Risk Assessment
    const C = { srsEpoch: 0, srs: { apple: rec({ last: 150, hist: [{ t: 150, g: 1, mode: 'type' }] }), dog: rec({ last: 5 }) }, cfg: { data: { newPerDay: 3, maxSession: 20 }, ts: 30 } };
    it('giao hoán', () => assert.equal(canon(mergeSync(A, B)), canon(mergeSync(B, A))));
    it('idempotent', () => { const m = mergeSync(A, B); assert.equal(canon(mergeSync(m, m)), canon(m)); assert.equal(canon(mergeSync(m, A)), canon(m)); });
    it('kết hợp', () => assert.equal(canon(mergeSync(mergeSync(A, B), C)), canon(mergeSync(A, mergeSync(B, C)))));
    it('không mutate input', () => { const before = canon(A); mergeSync(A, B); assert.equal(canon(A), before); });
    it('idempotent cả với record chỉ có ở một bên, hist trùng/lộn xộn', () => {
      const dirty = { srs: { w: rec({ last: 9, hist: [{ t: 9, g: 2, mode: 'type' }, { t: 3, g: 1, mode: 'mcq' }, { t: 9, g: 2, mode: 'type' }], extra: 1 }) } };
      const m = mergeSync(dirty, {});
      assert.deepEqual(m.srs.w.hist.map(h => h.t), [3, 9]); assert.equal(m.srs.w.extra, undefined);
      assert.equal(canon(mergeSync(m, m)), canon(m));
    });
    it('record dữ liệu cũ hỏng (hist/sentences sai kiểu) không làm mergeSync ném lỗi', () => {
      [{ hist: 5 }, { hist: {} }, { hist: [null, 3] }, { sentences: 'abc' }, { sentences: [1, null, 'ok'] }].forEach(bad => {
        const x = mergeSync({ srs: { w: Object.assign(rec({ last: 1 }), bad) } }, { srs: { w: rec({ last: 2 }) } });
        assert.ok(Array.isArray(x.srs.w.hist) && Array.isArray(x.srs.w.sentences), JSON.stringify(bad));
        assert.ok(mergeSync({ srs: { w: Object.assign(rec({ last: 1 }), bad) } }, {}).srs.w, 'một bên ' + JSON.stringify(bad));
      });
    });
    it('gameScore: key __proto__ bị bỏ', () => {
      const x = mergeSync(JSON.parse('{"gameScore":{"__proto__":{"best":1},"ok":{"best":2,"plays":1}}}'), {});
      assert.deepEqual(Object.keys(x.gameScore), ['ok']); assert.equal(x.gameScore.best, undefined);
    });
    it('null / {} không ném lỗi', () => {
      const x = mergeSync(null, undefined); assert.equal(x.v, 1); assert.deepEqual(x.srs, {});
      assert.ok(mergeSync({}, { srs: null }).srs);
    });
  });

  describe('sync-merge — sanitizePayload', () => {
    it('payload rác không ném lỗi', () => {
      [null, undefined, 'x', 42, [], { srs: 'x' }, { srs: [] }, { cfg: 'x', plan: 7, day: [], gameScore: 'y' }].forEach(p => {
        const s = sanitizePayload(p, NOW); assert.equal(s.v, 1); assert.deepEqual(s.srs, {});
      });
    });
    it('bỏ key top-level lạ', () => assert.equal(sanitizePayload({ evil: 1 }, NOW).evil, undefined));
    it('chặn __proto__ / constructor làm id', () => {
      const s = sanitizePayload(JSON.parse('{"srs":{"__proto__":{"last":1},"constructor":{"last":1},"ok":{"last":1}}}'), NOW);
      assert.deepEqual(Object.keys(s.srs), ['ok']); assert.equal(s.srs.last, undefined, 'prototype không bị đổi');
    });
    it('id sai định dạng bị loại', () => assert.deepEqual(Object.keys(sanitizePayload({ srs: { '<img>': {}, 'A B': {}, good: {} } }, NOW).srs), ['good']));
    it('mốc tương lai xa kẹp về now (chống khoá chết một từ)', () => {
      const s = sanitizePayload({ srsEpoch: 1e308, srs: { w: { last: 1e308, mt: NOW + 5 * 86400000 } } }, NOW);
      assert.equal(s.srs.w.last, NOW); assert.equal(s.srs.w.mt, NOW); assert.equal(s.srsEpoch, NOW);
    });
    it('số không hợp lệ về mặc định', () => {
      const r = sanitizePayload({ srs: { w: { last: '9', reps: -3, ef: NaN, state: 'hack' } } }, NOW).srs.w;
      assert.equal(r.last, 0); assert.equal(r.reps, 0); assert.equal(r.ef, 2.5); assert.equal(r.state, 'new');
    });
    it('due tương lai hợp lệ được giữ', () => assert.equal(sanitizePayload({ srs: { w: { due: NOW + 90 * 86400000 } } }, NOW).srs.w.due, NOW + 90 * 86400000));
    it('sentences / hist bị giới hạn', () => {
      const r = sanitizePayload({ srs: { w: { sentences: ['a', 'b', 'c', 'd', 'e', 'f', 5, 'x'.repeat(600)], hist: [{ t: 1, g: 9, mode: 'type' }, { t: 2, g: 1, mode: 'mcq' }, 'bad'] } } }, NOW).srs.w;
      assert.equal(r.sentences.length, 5); assert.ok(r.sentences.every(s => typeof s === 'string' && s.length <= 500));
      assert.deepEqual(r.hist, [{ t: 2, g: 1, mode: 'mcq' }]);
    });
    it('task giáo án có id độc hại bị loại, act lạ bị bỏ', () => {
      const s = sanitizePayload({ plan: { data: [{ id: '"><img onerror=x>', title: 'x' }, { id: 't2', title: 'ok', act: 'evil' }], ts: 1 } }, NOW);
      assert.equal(s.plan.data.length, 1); assert.equal(s.plan.data[0].id, 't2'); assert.equal(s.plan.data[0].act, undefined);
    });
    it('giới hạn số key: srs ≤ 10000, done/caption ≤ 30, history ≤ 400 ngày mới nhất (chống phình payload)', () => {
      const srs = {}, done = {}, caption = {}, history = {};
      for (let i = 0; i < 12000; i++) srs['w' + i] = {};
      for (let i = 0; i < 50; i++) { done['t' + i] = 1; caption['t' + i] = 'x'; }
      for (let i = 0; i < 1000; i++) history[new Date(Date.UTC(2020, 0, 1) + i * 86400000).toISOString().slice(0, 10)] = 1;
      const s = sanitizePayload({ srs, day: { data: { date: '2026-09-23', done, caption, history }, ts: 1 } }, NOW);
      assert.equal(Object.keys(s.srs).length, 10000); assert.equal(Object.keys(s.day.data.done).length, 30);
      assert.equal(Object.keys(s.day.data.caption).length, 30); assert.equal(Object.keys(s.day.data.history).length, 400);
      assert.ok(s.day.data.history['2022-09-26'], 'giữ ngày mới nhất'); assert.equal(s.day.data.history['2020-01-01'], undefined);
    });
    it('mergeSync cũng giữ giới hạn khi hợp 2 bên', () => {
      const a = { srs: {} }, b = { srs: {} };
      for (let i = 0; i < 6000; i++) { a.srs['a' + i] = rec({ last: i }); b.srs['b' + i] = rec({ last: i }); }
      assert.equal(Object.keys(mergeSync(a, b).srs).length, 10000);
    });
    it('cfg kẹp theo giới hạn ô nhập', () => assert.deepEqual(sanitizePayload({ cfg: { data: { newPerDay: 999, maxSession: 1 }, ts: 1 } }, NOW).cfg.data, { newPerDay: 50, maxSession: 5 }));
    it('day: ngày sai định dạng → bỏ cả khối; key lạ trong done/caption bị loại', () => {
      assert.equal(sanitizePayload({ day: { data: { date: 'hôm nay' }, ts: 1 } }, NOW).day, null);
      const d = sanitizePayload({ day: { data: { date: '2026-09-23', done: { t1: 5, '<x>': 1 }, caption: { t1: 'hi', '"': 'x' }, history: { '2026-09-22': 3, bad: 1 }, streak: 2 }, ts: 1 } }, NOW).day.data;
      assert.deepEqual(d.done, { t1: 5 }); assert.deepEqual(d.caption, { t1: 'hi' }); assert.deepEqual(d.history, { '2026-09-22': 3 });
    });
    it('day có ngày tương lai xa (đồng hồ máy chạy nhanh) → bỏ cả khối, không lan sang máy khác', () => {
      // NOW = 1790000000000 ≈ 2026-09-21 UTC; cho phép tới +2 ngày (lệch múi giờ quanh nửa đêm)
      assert.equal(sanitizePayload({ day: { data: { date: '2027-01-01', done: {} }, ts: 1 } }, NOW).day, null);
      assert.ok(sanitizePayload({ day: { data: { date: '2026-09-22', done: {} }, ts: 1 } }, NOW).day);
    });
    it('dữ liệu sạch đi qua không đổi (trừ trường chuẩn hoá)', () => {
      const s = sanitizePayload(A, NOW);
      assert.equal(s.srs.apple.sentences[0], 'I eat an apple.'); assert.equal(s.cfg.data.newPerDay, 5);
      assert.equal(s.day.data.done.t1, 1); assert.deepEqual(s.gameScore.sprint, { best: 30, plays: 4 });
    });
  });

  describe('sync-merge — toPayload / fromPayload / isSyncedKey', () => {
    const state = { srs: A.srs, cfg: { newPerDay: 5, maxSession: 40 }, plan: A.plan.data, day: A.day.data, gameScore: A.gameScore };
    const meta = { cfgTs: 10, planTs: 5, dayTs: 20, srsEpoch: 7 };
    it('toPayload đúng dạng v1', () => {
      const p = toPayload(state, meta);
      assert.equal(p.v, 1); assert.equal(p.srsEpoch, 7); assert.equal(p.cfg.ts, 10); assert.equal(p.day.ts, 20); assert.equal(p.plan.data[0].id, 't1');
    });
    it('toPayload cắt hist còn 20, không đụng state gốc', () => {
      const hist = Array.from({ length: 50 }, (_, i) => ({ t: i + 1, g: 2, mode: 'type' }));
      const p = toPayload({ srs: { w: rec({ last: 50, hist }) } }, {});
      assert.equal(p.srs.w.hist.length, 20); assert.equal(hist.length, 50);
    });
    it('gộp local (50 hist) với response (20 hist) → local vẫn giữ đủ', () => {
      const hist = Array.from({ length: 50 }, (_, i) => ({ t: i + 1, g: 2, mode: 'type' }));
      const local = toPayload({ srs: { w: rec({ last: 50, hist }) } }, {}, 50);
      const resp = toPayload({ srs: { w: rec({ last: 50, hist }) } }, {});
      assert.equal(mergeSync(local, resp).srs.w.hist.length, 50);
    });
    it('fromPayload trả state + meta; phần thiếu → null', () => {
      const f = fromPayload(toPayload(state, meta));
      assert.equal(f.cfg.newPerDay, 5); assert.equal(f.plan[0].id, 't1'); assert.equal(f.meta.dayTs, 20); assert.equal(f.meta.srsEpoch, 7);
      const g = fromPayload({ v: 1 }); assert.equal(g.cfg, null); assert.equal(g.day, null); assert.deepEqual(g.srs, {});
    });
    it('isSyncedKey', () => {
      ['eng.srs.v2', 'eng.cfg.v1', 'eng.plan.v1', 'eng.day.v1', 'eng.gamescore.v1'].forEach(k => assert.ok(isSyncedKey(k), k));
      assert.equal(isSyncedKey('eng.gamemiss.v1'), false); assert.equal(isSyncedKey('eng.auth.v1'), false);
    });
    it('2505 từ đủ trường → payload < 8MB', () => {
      const srs = {};
      for (let i = 0; i < 2505; i++) srs['word-' + i] = rec({ last: NOW, mt: NOW, due: NOW, sentences: Array(5).fill('x'.repeat(80)), hist: Array.from({ length: 50 }, (_, k) => ({ t: NOW - k, g: 2, mode: 'owncloze' })) });
      assert.ok(JSON.stringify(toPayload({ srs }, {})).length < 8 * 1024 * 1024);
    });
  });
})();
