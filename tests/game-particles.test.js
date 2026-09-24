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
  });
})();
