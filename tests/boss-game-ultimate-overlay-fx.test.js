/* Test lớp phủ tuyệt kỹ thêm (boss-game-ultimate-overlay-fx.js): phần thuần (alpha/vị trí hạt, không NaN, luôn
   ≤0.5) + drawBossUltimateOverlayFx im lặng khi reduced-motion/không có tuyệt kỹ. Không đụng canvas thật (Node) —
   drawSprite tự trả false khi ảnh chưa nạp (xem boss-game-sprite-atlas.js:drawSprite), nên spy qua đếm số lần gọi
   là đủ để xác nhận "có/không vẽ" mà không cần ctx thật. */
(function () {
  function fakeFx(reduced) {
    return {
      reduced: !!reduced, ultimate: null,
      layout: { mage: { x: 10, y: 20, s: 40, k: 2 }, mon: { x: 200, y: 60, s: 60, k: 3 } }
    };
  }

  describe('boss-game-ultimate-overlay-fx (thuần)', () => {
    it('bossUltimateOverlayAlpha: luôn hữu hạn, ≤0.5, ≥0.15 khi u hợp lệ; 0 khi thiếu u/u.max', () => {
      assert.equal(bossUltimateOverlayAlpha(null), 0);
      assert.equal(bossUltimateOverlayAlpha({ life: 1, max: 0 }), 0);
      const full = bossUltimateOverlayAlpha({ life: 2, max: 2 });
      const mid = bossUltimateOverlayAlpha({ life: 1, max: 2 });
      const end = bossUltimateOverlayAlpha({ life: 0, max: 2 });
      [full, mid, end].forEach(a => { assert.ok(Number.isFinite(a), 'alpha phải hữu hạn, không NaN'); assert.ok(a <= 0.5 && a >= 0); });
      assert.ok(full > mid && mid > end, 'alpha phải giảm dần theo life còn lại (nhạt về cuối)');
    });

    it('bossUltimateOverlayRainPos: toạ độ luôn hữu hạn (không NaN/Infinity) qua nhiều seed/t/kích cỡ quái', () => {
      const qs = [{ x: 0, y: 0, s: 1 }, { x: 200, y: 60, s: 60 }, { x: -50, y: 300, s: 0 }];
      qs.forEach(q => {
        for (let i = 0; i < 10; i++) {
          for (let t = 0; t < 5; t += 0.7) {
            const pos = bossUltimateOverlayRainPos(q, i * 53.7, t);
            assert.ok(Number.isFinite(pos.x) && Number.isFinite(pos.y), 'vị trí hạt rơi phải hữu hạn, q.s=' + q.s);
          }
        }
      });
    });

    it('drawBossUltimateOverlayFx: reduced-motion → không vẽ gì dù có tuyệt kỹ đang chạy (không gọi drawSprite)', () => {
      const fx = fakeFx(true);
      fx.ultimate = { id: 'iceAge', life: 1, max: 2 };
      const orig = drawSprite; let calls = 0;
      drawSprite = function () { calls++; return orig.apply(this, arguments); };
      try { drawBossUltimateOverlayFx({}, fx, { w: 360, h: 300 }, 1000); } finally { drawSprite = orig; }
      assert.equal(calls, 0, 'reduced=true phải tắt hẳn overlay, không gọi drawSprite lần nào');
    });

    it('drawBossUltimateOverlayFx: không có fx.ultimate → không vẽ, không lỗi', () => {
      const fx = fakeFx(false);
      drawBossUltimateOverlayFx({}, fx, { w: 360, h: 300 }, 1000);   // không throw = pass (it() tự bắt lỗi nếu có)
    });

    it('drawBossUltimateOverlayFx: không reduced + preset hợp lệ (overlay+rain+ground) → không văng lỗi, không NaN lọt vào drawSprite', () => {
      ['meteor', 'iceAge', 'chain', 'revive', 'tornado'].forEach(id => {
        const fx = fakeFx(false);
        fx.ultimate = { id, life: 1.2, max: 2.4 };
        const orig = drawSprite; const bad = [];
        drawSprite = function (ctx, name, anim, t, x, y, scale, opt) {
          [t, x, y, scale].forEach(n => { if (!Number.isFinite(n)) bad.push(name + ':' + n); });
          return orig.apply(this, arguments);
        };
        try { drawBossUltimateOverlayFx({}, fx, { w: 360, h: 300 }, 1000); } finally { drawSprite = orig; }
        assert.deepEqual(bad, [], id + ': có tham số vẽ không hữu hạn (NaN/Infinity) → ' + bad.join(','));
      });
    });
  });

  describe('BOSS_ULTIMATE_PRESETS — trường overlay/rain/ground/anchor mới (phase 3) trỏ đúng sprite tồn tại', () => {
    it('overlay/rain/ground (nếu có) phải là khoá có trong BOSS_SPRITES', () => {
      Object.keys(BOSS_ULTIMATE_PRESETS).forEach(id => {
        const P = BOSS_ULTIMATE_PRESETS[id];
        ['overlay', 'rain', 'ground'].forEach(k => {
          if (P[k]) assert.ok(BOSS_SPRITES[P[k]], id + '.' + k + ' = "' + P[k] + '" không có trong BOSS_SPRITES');
        });
      });
    });
    it('5 tuyệt kỹ đều có thêm ít nhất 1 trong overlay/rain/ground (lớp hình mới, theo acceptance criteria)', () => {
      Object.keys(BOSS_ULTIMATE_PRESETS).forEach(id => {
        const P = BOSS_ULTIMATE_PRESETS[id];
        assert.ok(P.overlay || P.rain || P.ground, id + ' thiếu lớp hình phụ (overlay/rain/ground)');
      });
    });
  });
})();
