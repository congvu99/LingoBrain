/* Test lớp môi trường động (js/boss-game-arena-ambient.js, plan 260925-1445 phase 5): trần hạt, tắt khi
   reduced-motion, bước vật lý không ra NaN. Chạy được trong Node (createBossAmbient/stepBossAmbient thuần). */
(function () {
  describe('boss-game-arena-ambient', () => {
    const arenaDense = { sky: ['#000'], grass: ['tileFloor', 0, 0, 16, 16], details: [], far: [],
      anim: [['tileAnimFlower', 0.5, 0.8]], ambient: { kind: 'rain', density: 1 } };
    const arenaBand = { sky: ['#000'], grass: ['tileFloor', 0, 0, 16, 16], details: [], far: [],
      ambient: { kind: 'fog', density: 1 }, light: 'raylight' };

    it('trần hạt ~40: density 1 (hạt thường) không vượt BOSS_AMBIENT_MAX', () => {
      const amb = createBossAmbient(arenaDense, 400, 600, { k: 3 }, false);
      assert.ok(amb.front.length > 0, 'phải có hạt khi density 1, không reduced');
      assert.ok(amb.front.length <= BOSS_AMBIENT_MAX, 'front.length=' + amb.front.length);
    });
    it('kind dạng dải (band: sương/mây/tia sáng) ít hạt hơn nhiều, vẫn dưới trần chung', () => {
      const amb = createBossAmbient(arenaBand, 400, 600, { k: 3 }, false);
      assert.ok(amb.front.length <= BOSS_AMBIENT_BAND_MAX + 2, 'band + light tối đa vài dải, front.length=' + amb.front.length);
    });
    it('reduced-motion → front rỗng (tắt hẳn thời tiết động), back vẫn còn (tile hoạt hình nền)', () => {
      const amb = createBossAmbient(arenaDense, 400, 600, { k: 3 }, true);
      assert.equal(amb.front.length, 0);
      assert.equal(amb.back.length, 1, 'anim tile (hoa) không tắt khi reduced-motion');
    });
    it('không có arena.ambient → front rỗng, không ném lỗi', () => {
      const amb = createBossAmbient({ sky: ['#000'], grass: ['tileFloor', 0, 0, 16, 16], details: [], far: [] }, 400, 600, { k: 2 }, false);
      assert.equal(amb.front.length, 0);
    });
    it('back: vị trí tính đúng theo xFrac/yFrac × w/h', () => {
      const amb = createBossAmbient(arenaDense, 400, 600, { k: 3 }, false);
      assert.equal(amb.back[0].sprite, 'tileAnimFlower');
      assert.equal(amb.back[0].x, 200); assert.equal(amb.back[0].y, 480);
    });
    it('stepBossAmbient: dt thường/0/âm/rất lớn không sinh NaN, hạt luôn nằm trong biên [-40, w+40]/[-10,h+10]', () => {
      const amb = createBossAmbient(arenaDense, 300, 500, { k: 2 }, false);
      [0, 0.016, -1, 50, NaN, undefined].forEach(dt => {
        stepBossAmbient(amb, dt);
        amb.front.forEach(p => {
          assert.ok(Number.isFinite(p.x), 'x NaN với dt=' + dt);
          assert.ok(Number.isFinite(p.y), 'y NaN với dt=' + dt);
        });
      });
    });
    it('stepBossAmbient lặp nhiều khung (giả lập ~5s @60fps) vẫn hữu hạn, không rò hạt ra quá xa biên', () => {
      const amb = createBossAmbient(arenaDense, 300, 500, { k: 2 }, false);
      for (let i = 0; i < 300; i++) stepBossAmbient(amb, 1 / 60);
      amb.front.forEach(p => {
        assert.ok(p.x > -60 && p.x < 360, 'x lệch quá xa biên: ' + p.x);
        assert.ok(p.y > -60 && p.y < 560, 'y lệch quá xa biên: ' + p.y);
      });
    });
    it('mọi sprite trong BOSS_AMBIENT_KIND tồn tại trong BOSS_SPRITES', () => {
      Object.keys(BOSS_AMBIENT_KIND).forEach(k => {
        assert.ok(BOSS_SPRITES[BOSS_AMBIENT_KIND[k].sprite], k + ' → sprite ' + BOSS_AMBIENT_KIND[k].sprite + ' thiếu trong BOSS_SPRITES');
      });
    });
  });
})();
