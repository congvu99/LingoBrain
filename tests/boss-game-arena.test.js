/* Test hệ số pixel chung của cảnh đấu trùm (boss-game-arena.js bossWorldScale): tile nền, pháp sư và quái cùng
   một k nguyên → cùng lưới pixel. Chạy trong Node và trình duyệt. */
(function () {
  describe('boss-game-arena', () => {
    it('bossWorldScale: ~14 hàng tile theo chiều cao, kẹp 2..6', () => {
      assert.equal(bossWorldScale(300), 2, 'khung thấp vẫn ≥ 2 (pháp sư 32px)');
      assert.equal(bossWorldScale(450), 2, 'điện thoại dọc');
      assert.equal(bossWorldScale(800), 4, 'desktop');
      assert.equal(bossWorldScale(3000), 6, 'kẹp trên');
    });
    it('bossWorldScale luôn là số nguyên (không nhoè pixel)', () => {
      [0, 120, 333, 517, 671, 999, 1440].forEach(h => assert.ok(Number.isInteger(bossWorldScale(h)), 'h=' + h));
    });
    it('buildBossArena không có document → null, không ném lỗi (nhận arena đã resolve, không còn regionId chuỗi)', () => {
      assert.equal(buildBossArena(BOSS_ARENAS.ashford, 390, 450, 2, { k: 2 }), null);
    });
  });

  describe('bossArenaFor (phase 5 — sân riêng theo quái)', () => {
    const region = BOSS_REGIONS.find(r => r.id === 'ashford');
    it('quái không có BOSS_MONSTER_ARENAS → trả nguyên BOSS_ARENAS[region.id] (fallback)', () => {
      assert.equal(bossArenaFor({ id: 'no-such-monster-id' }, region), BOSS_ARENAS.ashford);
    });
    it('monster null → fallback nguyên sân vùng (không ném lỗi); thiếu cả 2 → falsy', () => {
      assert.equal(bossArenaFor(null, region), BOSS_ARENAS.ashford);
      assert.ok(!bossArenaFor({ id: 'no-such-monster-id' }, null));
    });
    it('quái có override: field thiếu (sky/grass/patchColor) kế thừa từ base, field có ghi đè', () => {
      const A = bossArenaFor({ id: 'wolf' }, region);   // wolf: chỉ override far + ambient
      assert.equal(A.sky, BOSS_ARENAS.ashford.sky, 'sky phải kế thừa (không override)');
      assert.equal(A.patchColor, BOSS_ARENAS.ashford.patchColor);
      assert.ok(A.far !== BOSS_ARENAS.ashford.far, 'far phải bị đè bởi BOSS_MONSTER_ARENAS.wolf.far');
      assert.ok(A.ambient && A.ambient.kind, 'phải có ambient.kind');
    });
    it('base khác region gốc (không có) vẫn dùng field của monster.base đúng vùng khai báo', () => {
      const A = bossArenaFor({ id: 'lich' }, BOSS_REGIONS.find(r => r.id === 'catacombs'));
      assert.equal(A.sky, BOSS_ARENAS.catacombs.sky);
    });
    it('mọi quái trong BOSS_MONSTERS resolve ra sân hợp lệ: sky/grass/details/far/patchColor + ambient.kind hợp lệ', () => {
      BOSS_MONSTERS.forEach(m => {
        const region2 = BOSS_REGIONS.find(r => r.id === m.region);
        const A = bossArenaFor(m, region2);
        assert.ok(A && A.sky && A.grass && A.details && A.far && A.patchColor, m.id + ' thiếu field sân cơ bản');
        const M = BOSS_MONSTER_ARENAS[m.id];
        assert.ok(M, m.id + ' phải có BOSS_MONSTER_ARENAS riêng (phase 5)');
        assert.ok(M.ambient && BOSS_AMBIENT_KIND[M.ambient.kind], m.id + ' ambient.kind không hợp lệ: ' + (M.ambient && M.ambient.kind));
      });
    });
    if (typeof fs !== 'undefined') {
      it('mọi khoá sprite trong BOSS_MONSTER_ARENAS (far/details/anim) tồn tại trong BOSS_SPRITES và nằm trong ảnh PNG thật', () => {
        const dims = {};
        function pngDim(src) { if (!dims[src]) { const b = fs.readFileSync(path.join(ROOT, src)); dims[src] = [b.readUInt32BE(16), b.readUInt32BE(20)]; } return dims[src]; }
        Object.keys(BOSS_MONSTER_ARENAS).forEach(id => {
          const M = BOSS_MONSTER_ARENAS[id];
          (M.far || []).concat(M.details || []).forEach(t => {
            const def = BOSS_SPRITES[t[0]];
            assert.ok(def, id + ' tile ' + t[0] + ' không có trong BOSS_SPRITES');
            const [W, H] = pngDim(def.src);
            assert.ok(t[1] + t[3] <= W && t[2] + t[4] <= H, id + ' tile ' + t[0] + ' ' + JSON.stringify(t) + ' ra ngoài ảnh ' + W + '×' + H);
          });
          (M.anim || []).forEach(a => assert.ok(BOSS_SPRITES[a[0]], id + ' anim sprite ' + a[0] + ' không có trong BOSS_SPRITES'));
        });
      });
    }
  });
})();
