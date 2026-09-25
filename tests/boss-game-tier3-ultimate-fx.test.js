/* Test nhịp VFX tuyệt kỹ (boss-game-tier3-ultimate-fx.js:bossFxUltimateEvent): VFX chạy SAU phần hiện tên
   (BOSS_ULT_INTRO_S), đủ lớn, và mọi sprite xong TRƯỚC khi cắt cảnh hết (BOSS_TUNING.ultimateMs) — kể cả khi
   chuỗi niệm gõ trọn cho 5–6 quả/tia (trước đây rải cố định → nổ đè lên từ gõ tiếp theo). Thuần, không ctx. */
(function () {
  function ultFx() {
    const fx = createBossFx();
    fx.layout = { mage: { x: 60, y: 300, s: 40, k: 2 }, mon: { x: 260, y: 180, s: 60, k: 2 } };
    return fx;
  }
  const lastEnd = fx => {   // giây thật đến khi sprite cuối cùng biến mất
    let t = 0;
    while (fx.sprites.length && t < 10) { stepBossActors(fx, 0.02); t += 0.02; }
    return t;
  };

  describe('boss-game-tier3-ultimate-fx (nhịp VFX tuyệt kỹ)', () => {
    ['meteor', 'chain'].forEach(id => {
      [1, 1.5, 2].forEach(k => {
        it(id + ' k=' + k + ': mọi VFX xong trước khi cắt cảnh hết', () => {
          const fx = ultFx();
          bossFxUltimateEvent(fx, { type: 'ultimate', id, k, boosted: true }, {});
          assert.ok(fx.sprites.length >= 1);
          assert.ok(lastEnd(fx) <= BOSS_TUNING.ultimateMs / 1000 + 0.05, 'VFX tràn quá cắt cảnh');
        });
      });
    });
    ['iceAge', 'revive', 'tornado'].forEach(id => {
      it(id + ': VFX xong trước khi cắt cảnh hết', () => {
        const fx = ultFx();
        bossFxUltimateEvent(fx, { type: 'ultimate', id, k: 1 }, {});
        assert.ok(lastEnd(fx) <= BOSS_TUNING.ultimateMs / 1000 + 0.1);
      });
    });
    it('VFX chính chờ qua phần hiện tên và to ≥ ~1.5× quái', () => {
      const fx = ultFx();
      bossFxUltimateEvent(fx, { type: 'ultimate', id: 'chain', k: 1 }, {});
      const s = fx.sprites[0], def = BOSS_SPRITES[s.name];
      assert.ok(-s.t / s.rate >= BOSS_ULT_INTRO_S - 1e-9, 'VFX nổ cùng lúc tên chiêu');
      assert.ok(Math.max(def.fw, def.fh) * s.scale >= fx.layout.mon.s * 1.5);
    });
  });
})();
