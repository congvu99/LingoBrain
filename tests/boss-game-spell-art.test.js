/* Test phần thuần của js/boss-game-spell-art.js: bossFxEvent 'cast' spawn vis.cast (BOSS_SKILL_VISUALS[*].cast)
   cạnh pháp sư — review M1: trường này trước đây không ai đọc (dead data). */
(function () {
  function fakeFx() {
    return Object.assign(createBossFx(), { layout: { mage: { x: 20, y: 120, s: 32, k: 2 }, mon: { x: 100, y: 100, s: 64, k: 2 } } });
  }
  function fakeSt() { return { mods: { element: 'fire' }, tier: 2, targets: [{ length: 1 }] }; }

  describe('boss-game-spell-art (thuần)', () => {
    it("review M1: chiêu có vis.cast (vd fire-long: ['magicCircle']) spawn sprite đó tại bossMageCastPoint lúc 'cast'", () => {
      const fx = fakeFx();
      bossFxEvent(fx, { type: 'cast', element: 'fire', tier: 2, skill: 'fire-long', hits: 1 }, fakeSt());
      assert.ok(fx.sprites.some(s => s.name === 'magicCircle'), 'phải có sprite magicCircle spawn cạnh pháp sư lúc niệm fire-long');
    });

    it("chiêu vis.cast rỗng (vd fire-combo3: cast: []) → không spawn sprite thừa nào tại điểm niệm", () => {
      const fx = fakeFx();
      bossFxEvent(fx, { type: 'cast', element: 'fire', tier: 1, skill: 'fire-combo3', hits: 1 }, fakeSt());
      assert.equal(fx.sprites.length, 0, 'cast rỗng thì không spawn sprite VFX cast nào (chỉ hạt burst, không tính fx.sprites)');
    });

    it('chiêu basic (không có e.skill/vis) → không lỗi, không spawn sprite cast', () => {
      const fx = fakeFx();
      bossFxEvent(fx, { type: 'cast', element: 'fire', tier: 1, hits: 1 }, fakeSt());   // ném lỗi → test tự fail
      assert.equal(fx.sprites.length, 0);
    });
  });
})();
