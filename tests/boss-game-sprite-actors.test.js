/* Test phần thuần của diễn viên sprite (boss-game-sprite-actors.js) không đụng DOM: bossSpawnSprite/stepBossActors.
   Review phase 4 #1: VFX di chuyển dùng anim LẶP VÔ HẠN (vd fireball) không bao giờ có spriteAnimDone === true,
   nên phải tự gỡ theo `life` tường minh — nếu thiếu fix này, fx.sprites phình to mãi không dừng. */
(function () {
  function fakeFx() {
    return { sprites: [], actor: createBossActors(), reduced: false, layout: { mon: { x: 0, y: 0, s: 60, k: 2 } } };
  }

  describe('boss-game-sprite-actors (thuần)', () => {
    it('VFX di chuyển có life rõ ràng tự gỡ khỏi fx.sprites dù anim lặp vô hạn (fireball)', () => {
      const fx = fakeFx();
      bossSpawnSprite(fx, 'fireball', 0, 0, 2, { vel: { vx: 100, vy: 50 }, life: 0.5 });
      assert.equal(fx.sprites.length, 1);
      for (let i = 0; i < 20; i++) stepBossActors(fx, 0.05);   // 1s thật > life 0.5s, > cả ultimateMs (1.5s cần ~30 bước)
      assert.equal(fx.sprites.length, 0, 'sprite di chuyển (anim lặp vô hạn) phải bị gỡ đúng theo life, không tồn tại mãi');
    });
    it('VFX một lượt (loop:false, không set life) vẫn gỡ theo spriteAnimDone như cũ', () => {
      const fx = fakeFx();
      bossSpawnSprite(fx, 'explosion', 0, 0, 1);   // explosion: loop:false, 9 khung/18fps ≈ 0.5s
      for (let i = 0; i < 20; i++) stepBossActors(fx, 0.05);
      assert.equal(fx.sprites.length, 0);
    });
    it('VFX life dài hơn ultimateMs (vd lốc xoáy follow) vẫn còn sống giữa chừng, tự gỡ đúng lúc hết life', () => {
      const fx = fakeFx();
      bossSpawnSprite(fx, 'smokeCircular', 0, 0, 1, { vel: { follow: true }, life: 1.5, anim: 'cycle' });
      for (let i = 0; i < 20; i++) stepBossActors(fx, 0.05);   // 1s < 1.5s life → còn sống
      assert.equal(fx.sprites.length, 1, 'chưa hết life (1.5s) thì chưa bị gỡ');
      for (let i = 0; i < 15; i++) stepBossActors(fx, 0.05);   // +0.75s → tổng 1.75s > 1.5s
      assert.equal(fx.sprites.length, 0, 'hết life thì phải bị gỡ dù anim cycle lặp vô hạn');
    });
    it('review C1: VFX một lượt spawn qua bossActorEvent (impact) + bossMonsterAttackFxEvent (đòn quái) dùng sprite anim LẶP (không loop:false, vd circleSpark2/particleFire/fog) tự gỡ hết sau 10s, không tồn tại mãi', () => {
      const fx = { sprites: [], actor: createBossActors(), reduced: false,
        layout: { mon: { x: 100, y: 100, s: 64, k: 2 }, mage: { x: 20, y: 120, s: 32, k: 2 } } };
      const st = { mods: { element: 'storm' }, tier: 2, targets: [] };
      for (let i = 0; i < 5; i++) bossActorEvent(fx, { type: 'impact', skill: 'storm-combo6', evolved: true, tier: 2, hp: 10 }, st);
      for (let i = 0; i < 5; i++) bossMonsterAttackFxEvent(fx, { type: 'hurt' }, 'lich');   // spiritDouble + fog (fog: frames:1, loop mặc định)
      assert.ok(fx.sprites.length > 0, 'phải có sprite được spawn để test có ý nghĩa');
      for (let i = 0; i < 200; i++) stepBossActors(fx, 0.05);   // 10s thật
      assert.equal(fx.sprites.length, 0, 'mọi VFX một lượt (kể cả anim lặp vô hạn) phải tự gỡ trong 10s, không rò rỉ fx.sprites');
    });
    it('bossVfxScale ≥ 1 (số nguyên) và tôn trọng vfx factor riêng từng khoá (windLeaf nhỏ hơn hẳn explosion)', () => {
      const leaf = bossVfxScale('windLeaf', 96), boom = bossVfxScale('explosion', 96);
      assert.ok(Number.isInteger(leaf) && leaf >= 1);
      assert.ok(Number.isInteger(boom) && boom >= 1);
      assert.ok(leaf * BOSS_SPRITES.windLeaf.fh <= boom * BOSS_SPRITES.explosion.fh, 'windLeaf phải nhỏ hơn hẳn explosion cùng chiều cao quái');
    });
  });
})();
