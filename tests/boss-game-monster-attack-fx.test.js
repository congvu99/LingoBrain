/* Test phần thuần của js/boss-game-monster-attack-fx.js: mọi quái BOSS_MONSTERS (boss-game-story.js) có mục
   BOSS_MONSTER_ATTACK_FX, sprite khai báo tồn tại trong BOSS_SPRITES, spawn đúng lúc 'hurt'/'shieldBlock',
   no-op cho id lạ/event khác (giữ hành vi cũ chỉ lunge, xem bossActorEvent). */
(function () {
  function fakeFx() {
    return { sprites: [], actor: createBossActors(), reduced: false, layout: { mage: { x: 40, y: 60, s: 32, k: 2 } } };
  }

  describe('boss-game-monster-attack-fx (thuần)', () => {
    it('12 quái thật trong BOSS_MONSTERS đều có mục BOSS_MONSTER_ATTACK_FX', () => {
      BOSS_MONSTERS.forEach(m => {
        assert.ok(BOSS_MONSTER_ATTACK_FX[m.id], 'thiếu mục attack FX cho quái ' + m.id);
      });
    });

    it('mọi sprite khai báo trong BOSS_MONSTER_ATTACK_FX tồn tại trong BOSS_SPRITES', () => {
      Object.keys(BOSS_MONSTER_ATTACK_FX).forEach(id => {
        const d = BOSS_MONSTER_ATTACK_FX[id];
        assert.ok(Array.isArray(d.impact) && d.impact.length > 0, id + ': impact phải là mảng khác rỗng');
        assert.ok(d.at === 'mage' || d.at === 'mageFeet', id + ': at phải là mage/mageFeet');
        d.impact.forEach(name => assert.ok(BOSS_SPRITES[name], id + ': sprite "' + name + '" không có trong BOSS_SPRITES'));
      });
    });

    it("spawn đúng số sprite VFX tại pháp sư lúc 'hurt'", () => {
      const fx = fakeFx();
      bossMonsterAttackFxEvent(fx, { type: 'hurt', hearts: 2 }, 'goblinKing');
      assert.equal(fx.sprites.length, BOSS_MONSTER_ATTACK_FX.goblinKing.impact.length);
      assert.ok(fx.sprites.every(s => BOSS_MONSTER_ATTACK_FX.goblinKing.impact.includes(s.name)));
    });

    it("cũng spawn lúc 'shieldBlock' (đòn bị khiên chặn vẫn có VFX quái ra đòn)", () => {
      const fx = fakeFx();
      bossMonsterAttackFxEvent(fx, { type: 'shieldBlock' }, 'wolf');
      assert.equal(fx.sprites.length, 1);
      assert.equal(fx.sprites[0].name, 'claw');
    });

    it('at: mageFeet spawn thấp hơn (y lớn hơn) so với at: mage cùng gốc pháp sư', () => {
      const fx = fakeFx();
      bossMonsterAttackFxEvent(fx, { type: 'hurt' }, 'troll');   // rockSpike, at: mageFeet
      assert.ok(fx.sprites[0].y >= fx.layout.mage.y - fx.layout.mage.s * 0.1, 'mageFeet phải gần chân (y ≈ m.y), không lơ lửng trên đầu');
    });

    it('cỡ VFX (scale) không vượt trần 1.0×m.s dù sprite có vfx factor lớn (fog=3, lich dùng ngắn)', () => {
      const fx = fakeFx();
      bossMonsterAttackFxEvent(fx, { type: 'hurt' }, 'lich');
      const fog = fx.sprites.find(s => s.name === 'fog');
      const cap = bossVfxScale('fog', fx.layout.mage.s * 1.0, 1);
      assert.ok(fog.scale <= cap, 'scale fog (' + fog.scale + ') phải ≤ trần 1.0×m.s (' + cap + ')');
    });

    it('id quái không có mục (lạ) hoặc event không liên quan → no-op, không spawn gì', () => {
      const fx = fakeFx();
      bossMonsterAttackFxEvent(fx, { type: 'hurt' }, 'unknownMonster');
      assert.equal(fx.sprites.length, 0);
      bossMonsterAttackFxEvent(fx, { type: 'impact' }, 'goblin');
      assert.equal(fx.sprites.length, 0, "event 'impact' không phải đòn quái ra tay, không được spawn");
    });
  });
})();
