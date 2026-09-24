/* Test làm sạch + gộp tiến trình Pháp sư (eng.boss.v1). Chạy trong Node và trình duyệt. */
(function () {
  const NOW = Date.parse('2026-09-24T08:00:00Z');
  const canon = v => JSON.stringify(v, (k, x) => x && typeof x === 'object' && !Array.isArray(x)
    ? Object.keys(x).sort().reduce((o, key) => (o[key] = x[key], o), {}) : x);
  // PRNG có seed → ví dụ ngẫu nhiên tất định
  function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function randBoss(r) {
    const pick = a => a[Math.floor(r() * a.length)], d = () => '2026-09-' + String(10 + Math.floor(r() * 14)).padStart(2, '0');
    const wins = {};
    for (let i = Math.floor(r() * 5); i > 0; i--) wins[d()] = Math.floor(r() * 29);
    const alloc = {};
    BOSS_ELEMENTS.forEach(e => { if (r() < 0.5) alloc[e] = Math.floor(r() * 4); });
    return {
      v: 1, xp: Math.floor(r() * 3000), wins, day: r() < 0.3 ? null : { date: d(), beat: Math.floor(r() * 5), dmg: Math.floor(r() * 400) },
      alloc, gender: { v: pick(['m', 'f']), ts: Math.floor(r() * 5) }, element: { v: pick(BOSS_ELEMENTS), ts: Math.floor(r() * 5) },
      buffDate: r() < 0.5 ? '' : d()
    };
  }

  describe('boss sync — gộp', () => {
    const r = mulberry(42);
    it('giao hoán, kết hợp, idempotent (200 bộ ngẫu nhiên có seed)', () => {
      for (let i = 0; i < 200; i++) {
        const a = randBoss(r), b = randBoss(r), c = randBoss(r);
        assert.equal(canon(mergeBoss(a, b)), canon(mergeBoss(b, a)), 'giao hoán #' + i);
        assert.equal(canon(mergeBoss(mergeBoss(a, b), c)), canon(mergeBoss(a, mergeBoss(b, c))), 'kết hợp #' + i);
        const ab = mergeBoss(a, b);
        assert.equal(canon(mergeBoss(ab, ab)), canon(ab), 'idempotent #' + i);
        assert.equal(canon(mergeBoss(ab, a)), canon(ab), 'hấp thụ #' + i);
      }
    });
    it('mergeBoss(x, emptyBoss()) ≡ x (x đã sạch, đã chọn pháp sư)', () => {
      const x = cleanBoss({ xp: 250, wins: { '2026-09-20': 0, '2026-09-21': 1 }, day: { date: '2026-09-22', beat: 2, dmg: 120 },
        alloc: { fire: 2, wind: 1 }, gender: { v: 'm', ts: 5 }, element: { v: 'earth', ts: 5 }, buffDate: '2026-09-21' }, NOW);
      assert.equal(canon(mergeBoss(x, emptyBoss())), canon(x));
    });
    it('mergeBoss(x, emptyBoss()) ≡ x cả khi ts = 0 (200 bộ ngẫu nhiên đã sạch)', () => {
      const r2 = mulberry(7);
      for (let i = 0; i < 200; i++) {
        const x = cleanBoss(randBoss(r2), NOW); x.gender.ts = 0; x.element.ts = 0;
        assert.equal(canon(mergeBoss(x, emptyBoss())), canon(x), '#' + i);
        assert.equal(canon(mergeBoss(emptyBoss(), x)), canon(x), '#' + i);
      }
    });
    it('cleanBoss với now hỏng không ném', () => { [NaN, undefined, 'x', Infinity].forEach(n => assert.equal(cleanBoss({ xp: 1 }, n).xp, 1)); });
    it('luật từng trường', () => {
      const m = mergeBoss(
        { xp: 100, wins: { '2026-09-20': 3 }, day: { date: '2026-09-21', beat: 4, dmg: 50 }, alloc: { fire: 1, ice: 3 }, gender: { v: 'm', ts: 9 }, element: { v: 'ice', ts: 1 }, buffDate: '2026-09-20' },
        { xp: 300, wins: { '2026-09-20': 5, '2026-09-22': 6 }, day: { date: '2026-09-21', beat: 4, dmg: 90 }, alloc: { fire: 2 }, gender: { v: 'f', ts: 3 }, element: { v: 'wind', ts: 2 }, buffDate: '2026-09-22' });
      assert.equal(m.xp, 300);
      assert.deepEqual(m.wins, { '2026-09-20': 5, '2026-09-22': 6 });
      assert.deepEqual(m.day, { date: '2026-09-21', beat: 4, dmg: 90 });
      assert.deepEqual(m.alloc, { fire: 2, ice: 3 });
      assert.equal(m.gender.v, 'm'); assert.equal(m.element.v, 'wind'); assert.equal(m.buffDate, '2026-09-22');
    });
    it('day: ngày lớn hơn thắng; cùng ngày khác beat → beat lớn hơn', () => {
      assert.equal(mergeBoss({ day: { date: '2026-09-22', beat: 1, dmg: 5 } }, { day: { date: '2026-09-21', beat: 9, dmg: 400 } }).day.date, '2026-09-22');
      assert.deepEqual(mergeBoss({ day: { date: '2026-09-22', beat: 1, dmg: 300 } }, { day: { date: '2026-09-22', beat: 2, dmg: 5 } }).day, { date: '2026-09-22', beat: 2, dmg: 5 });
    });
    it('rác hai phía → không ném, ra object hợp lệ', () => {
      const junk = [null, undefined, 'x', 7, [], {}, { wins: {} }, { xp: null }, { day: { beat: 'constructor' } }, { wins: [1, 2] },
        JSON.parse('{"__proto__":{"xp":5},"alloc":{"__proto__":3,"fire":"2"},"wins":{"__proto__":1}}'), { gender: 'm', element: { v: 'hack', ts: NaN } }];
      junk.forEach(a => junk.forEach(b => {
        const m = mergeBoss(a, b);
        assert.equal(typeof m.xp, 'number'); assert.ok(m.wins && typeof m.wins === 'object');
        assert.ok(['m', 'f'].indexOf(m.gender.v) >= 0); assert.ok(BOSS_ELEMENTS.indexOf(m.element.v) >= 0);
        assert.equal(canon(cleanBoss(a, NOW)), canon(cleanBoss(a, NOW)));
      }));
    });
    it('2 máy offline cùng thắng beat 5 khác ngày → nextBeat = 6 (không nhảy cóc)', () => {
      const base = {}; for (let i = 0; i < 5; i++) base['2026-09-0' + (i + 1)] = i;
      const a = { wins: Object.assign({ '2026-09-10': 5 }, base) }, b = { wins: Object.assign({ '2026-09-11': 5 }, base) };
      assert.equal(nextBeat(mergeBoss(a, b), '2026-09-12'), 6);
    });
  });

  describe('boss sync — làm sạch', () => {
    it('đầu vào rác → emptyBoss', () => {
      [null, 'x', [], 5].forEach(x => assert.equal(canon(cleanBoss(x, NOW)), canon(emptyBoss())));
    });
    it('alloc {fire:99, hack:1} → {fire:3}', () => assert.deepEqual(cleanBoss({ alloc: { fire: 99, hack: 1 } }, NOW).alloc, { fire: 3 }));
    it('ngày tương lai > +2 bị loại, +1 (lệch đồng hồ) được giữ', () => {
      const c = cleanBoss({ wins: { '2026-09-25': 1, '2026-09-30': 2 }, day: { date: '2026-10-01', beat: 1, dmg: 5 }, buffDate: '2027-01-01' }, NOW);
      assert.deepEqual(c.wins, { '2026-09-25': 1 }); assert.equal(c.day, null); assert.equal(c.buffDate, '');
    });
    it('beat/dmg/xp kẹp và kiểu sai bị bỏ', () => {
      const c = cleanBoss({ xp: -5, wins: { '2026-09-01': 29, '2026-09-02': 1.5, '2026-09-03': '4', '2026-09-04': 28 }, day: { date: '2026-09-02', beat: 3, dmg: 1e12 } }, NOW);
      assert.equal(c.xp, 0); assert.deepEqual(c.wins, { '2026-09-04': 28 }); assert.equal(c.day.dmg, 1e7);
    });
    it('ts tương lai bị kẹp về now; field lạ bị bỏ', () => {
      const c = cleanBoss({ gender: { v: 'm', ts: 1e300 }, hack: 1 }, NOW);
      assert.equal(c.gender.ts, NOW); assert.equal(c.hack, undefined);
    });
    // liệt kê 1e6 key đã tốn ~chừng ấy thời gian (JSON.parse ở server cũng O(n)); điều cần chặn là sort/lọc trên cả 1e6 key
    it('wins 1e6 key: chỉ xử lý WINS_SCAN key đầu (≤ 3× chi phí liệt kê), giữ ≤ 400 ngày', () => {
      const w = {};
      for (let i = 0; i < 500; i++) w[new Date(NOW - i * 86400000).toISOString().slice(0, 10)] = 1;
      for (let i = 0; i < 1e6; i++) w['k' + i] = 1;
      let t0 = Date.now(); Object.keys(w); const base = Date.now() - t0;
      t0 = Date.now(); const c = cleanBoss({ wins: w }, NOW), ms = Date.now() - t0;
      assert.ok(ms <= 3 * base + 50, 'mất ' + ms + 'ms, liệt kê ' + base + 'ms');
      assert.ok(Object.keys(c.wins).length <= 400 && Object.keys(c.wins).length > 0);
    });
  });

  describe('boss sync — qua mergeSync / sanitizePayload', () => {
    const boss = cleanBoss({ xp: 500, wins: { '2026-09-20': 0 }, gender: { v: 'm', ts: 3 } }, NOW);
    it('client cũ (không boss) gộp với server có boss → giữ boss', () => {
      assert.equal(canon(mergeSync({ v: 1 }, { v: 1, boss }).boss), canon(boss));
      assert.equal(canon(mergeSync({ v: 1, boss }, { v: 1 }).boss), canon(boss));
    });
    it('sanitizePayload luôn có boss hợp lệ', () => {
      assert.equal(canon(sanitizePayload({}, NOW).boss), canon(emptyBoss()));
      assert.equal(sanitizePayload({ boss: { xp: 77 } }, NOW).boss.xp, 77);
    });
    it('toPayload / fromPayload mang boss', () => {
      const p = toPayload({ srs: {}, boss }, {});
      assert.equal(canon(p.boss), canon(boss));
      assert.equal(canon(fromPayload(p).boss), canon(boss));
      assert.equal(fromPayload({}).boss, null);
    });
    it('eng.boss.v1 là key đồng bộ', () => assert.ok(isSyncedKey('eng.boss.v1')));
  });
})();
