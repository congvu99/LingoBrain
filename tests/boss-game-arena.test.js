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
    it('buildBossArena không có document → null, không ném lỗi', () => {
      assert.equal(buildBossArena('ashford', 390, 450, 2, { k: 2 }), null);
    });
  });
})();
