/* Test phần thuần của atlas sprite (boss-game-sprite-atlas.js): cắt khung theo thời gian, hướng, dải ngang, scale.
   Chạy trong Node và trình duyệt; kiểm file ảnh + ASSETS chỉ chạy ở Node (có fs). */
(function () {
  const CHAR = { fw: 16, fh: 16, anims: { walk: { row: 0, frames: 4, fps: 6, dir: 'up' }, idle: { row: 0, frames: 1, dir: 'down' },
    attack: { row: 4, frames: 1, dir: 'right' }, special: { row: 6, col: 1, frames: 1 } } };
  const STRIP = { fw: 40, fh: 40, anims: { idle: { frames: 9, fps: 18, loop: false } } };

  describe('boss-game-sprite-atlas', () => {
    it('sheet 4 hướng: cột = hướng, khung đi dọc theo thời gian và lặp', () => {
      assert.deepEqual(spriteFrame(CHAR, 'walk', 0), { sx: 16, sy: 0, sw: 16, sh: 16 });
      assert.equal(spriteFrame(CHAR, 'walk', 1 / 6 + 1e-6).sy, 16);
      assert.equal(spriteFrame(CHAR, 'walk', 3.5 / 6).sy, 48);
      assert.equal(spriteFrame(CHAR, 'walk', 4 / 6 + 1e-6).sy, 0, 'lặp về khung đầu');
      assert.deepEqual(spriteFrame(CHAR, 'attack', 5), { sx: 48, sy: 64, sw: 16, sh: 16 });
    });
    it('anim không có hướng: đi ngang từ col ở hàng row', () => {
      assert.deepEqual(spriteFrame(CHAR, 'special', 0), { sx: 16, sy: 96, sw: 16, sh: 16 });
      assert.deepEqual(spriteFrame(STRIP, 'idle', 0.12), { sx: 80, sy: 0, sw: 40, sh: 40 });
    });
    it('loop:false giữ khung cuối và báo xong', () => {
      assert.equal(spriteFrame(STRIP, 'idle', 10).sx, 320);
      assert.ok(!spriteAnimDone(STRIP, 'idle', 0.4));
      assert.ok(spriteAnimDone(STRIP, 'idle', 0.5));
      assert.ok(!spriteAnimDone(CHAR, 'walk', 99), 'anim lặp không bao giờ xong');
    });
    it('thiếu anim → idle; t âm/thiếu → khung đầu', () => {
      assert.deepEqual(spriteFrame(CHAR, 'nope', 0), spriteFrame(CHAR, 'idle', 0));
      assert.equal(spriteFrame(STRIP, 'idle', -1).sx, 0);
      assert.equal(spriteFrame(STRIP, 'idle').sx, 0);
    });
    it('pixelScale luôn là số nguyên ≥ 1', () => {
      assert.equal(pixelScale(100, 16), 6);
      assert.equal(pixelScale(3, 16), 1);
      assert.equal(pixelScale(0, 16), 1);
      [17, 33, 90, 250].forEach(px => assert.ok(Number.isInteger(pixelScale(px, 16))));
    });
    it('mọi sprite có src trong img/boss/ và khung hợp lệ', () => {
      Object.keys(BOSS_SPRITES).forEach(k => {
        const d = BOSS_SPRITES[k];
        assert.ok(/^img\/boss\/[a-z]+\/[a-z0-9-]+\.png$/.test(d.src), k + ' src ' + d.src);
        assert.ok(d.fw > 0 && d.fh > 0 && d.anims, k);
      });
    });
    if (typeof fs === 'undefined') return;
    it('mọi ảnh sprite có trên đĩa và nằm trong sw.js ASSETS (offline)', () => {
      const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
      Object.keys(BOSS_SPRITES).forEach(k => {
        const src = BOSS_SPRITES[k].src;
        assert.ok(fs.existsSync(path.join(ROOT, src)), 'thiếu file ' + src);
        assert.ok(sw.indexOf("'./" + src + "'") >= 0, 'sw.js ASSETS thiếu ' + src);
      });
    });
    it('khung của mọi anim nằm trong ảnh (đọc cỡ PNG từ IHDR)', () => {
      Object.keys(BOSS_SPRITES).forEach(k => {
        const d = BOSS_SPRITES[k], b = fs.readFileSync(path.join(ROOT, d.src)), W = b.readUInt32BE(16), H = b.readUInt32BE(20);
        Object.keys(d.anims).forEach(a => {
          const n = d.anims[a].frames || 1;
          for (let i = 0; i < n; i++) {
            const f = spriteFrame(d, a, (i + 0.5) / (d.anims[a].fps || 1));
            assert.ok(f.sx + f.sw <= W && f.sy + f.sh <= H, k + '.' + a + ' khung ' + i + ' ra ngoài ảnh ' + W + '×' + H);
          }
        });
      });
    });
  });
})();
