/* Test bộ máy hạt dùng chung (Bắn máy bay, Pháp sư). Chạy trong Node và trình duyệt. */
(function () {
  const OPT = { kind: 'spark', speed: 100, life: 0.5, size: 2, colors: ['#fff', '#f00'] };
  const seeded = () => { let a = 7; return () => (a = (a * 16807) % 2147483647) / 2147483647; };

  describe('game-particles', () => {
    it('trần max hạt dù nổ liên tiếp; mảng không phình quá max', () => {
      const ps = createParticles(300, false, seeded());
      for (let i = 0; i < 20; i++) burst(ps, 0, 0, 40, OPT);
      assert.equal(ps.n, 300); assert.equal(ps.items.length, 300);
    });
    it('hạt chết được tái dùng object, không cấp phát thêm', () => {
      const ps = createParticles(50, false, seeded());
      burst(ps, 0, 0, 50, OPT);
      const before = ps.items.slice();
      stepParticles(ps, 5);                        // mọi hạt hết đời (life ≤ 0.6s)
      assert.equal(ps.n, 0);
      burst(ps, 0, 0, 50, OPT);
      assert.equal(ps.items.length, 50);
      assert.ok(ps.items.every(p => before.indexOf(p) >= 0));
    });
    it('chỉ bỏ hạt chết, giữ hạt sống', () => {
      const ps = createParticles(10, false, seeded());
      burst(ps, 0, 0, 5, Object.assign({}, OPT, { life: 0.1 }));
      burst(ps, 0, 0, 5, Object.assign({}, OPT, { life: 10 }));
      stepParticles(ps, 0.2);
      assert.equal(ps.n, 5);
      let seen = 0; drawParticles(null, ps, (c, p, a) => { seen++; assert.ok(p.max > 1 && a > 0 && a <= 1); });
      assert.equal(seen, 5);
    });
    it('rand tiêm → tất định', () => {
      const a = createParticles(20, false, seeded()), b = createParticles(20, false, seeded());
      burst(a, 1, 2, 10, OPT); burst(b, 1, 2, 10, OPT);
      assert.deepEqual(a.items, b.items);
    });
    it('giảm chuyển động + quality bớt số hạt', () => {
      const r = createParticles(100, true, seeded()); burst(r, 0, 0, 50, OPT); assert.equal(r.n, 20);
      const q = createParticles(100, false, seeded()); q.quality = 0.5; burst(q, 0, 0, 50, OPT); assert.equal(q.n, 25);
    });
    it('vật lý: trọng lực (drag 0 = mặc định 2.2 như Bắn máy bay → dùng drag rất nhỏ)', () => {
      const ps = createParticles(1, false, () => 0.5);
      burst(ps, 0, 0, 1, Object.assign({}, OPT, { a: 0, spread: 0, g: 100, drag: 1e-9 }));
      const p = ps.items[0], vx = p.vx;
      stepParticles(ps, 0.1);
      assert.near(p.x, vx * 0.1); assert.near(p.vy, 10);
    });
    it('Pháp Sư Lexoria — tổ hợp nặng nhất (Đại chú mỗi hệ + Mưa sao băng bằng preset thật) ≤ trần hạt', () => {
      const ps = createParticles(300, false, seeded());   // 300 = BOSS_FX_MAX_PARTS (boss-game-spell-art.js, file DOM không nạp ở đây)
      let requested = 0;
      Object.keys(BOSS_SPELL_PRESETS).forEach(el => {   // Đại chú (bậc 3) mỗi hệ: cast + impact
        const p = BOSS_SPELL_PRESETS[el][3];
        p.cast.concat(p.impact).forEach(o => { requested += o.n || 8; burst(ps, 100, 100, o.n || 8, o); });
      });
      const meteor = BOSS_ULTIMATE_PRESETS.meteor;   // Mưa sao băng: nhiều thiên thạch nổ cùng lúc
      for (let i = 0; i < (meteor.hits || 5); i++) {
        requested += 30; burst(ps, 120 + i * 10, 100, 30, { kind: 'spark', speed: 400, life: 0.6, size: 2.4, colors: [meteor.color], n: 30 });
      }
      assert.ok(requested > 300, 'kịch bản test phải nặng hơn trần 300 hạt (đang xin ' + requested + ')');
      assert.ok(ps.n <= 300, 'số hạt sống không vượt trần 300, đang có ' + ps.n);
      assert.equal(ps.items.length, ps.n);
    });
  });
})();
