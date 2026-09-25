/* Test module quỹ đạo đạn (boss-game-skill-motion.js): bossShotPos/bossShotDir thuần, không đụng DOM/canvas
   (drawBossShotSprite cần ctx thật nên không test ở đây — theo mẫu boss-game-sprite-actors.test.js). */
(function () {
  const BASE = { x0: 10, y0: 20, x1: 110, y1: 220, mageS: 32 };

  describe('boss-game-skill-motion (thuần)', () => {
    it('BOSS_MOTIONS liệt kê đúng 6 kiểu theo plan', () => {
      assert.deepEqual(BOSS_MOTIONS, ['arc', 'straight', 'sky', 'ground', 'fan', 'spin']);
    });

    BOSS_MOTIONS.forEach(motion => {
      it('bossShotPos(s,1) = (x1,y1) cho motion ' + motion + ' (bất biến chạm đúng đích)', () => {
        const s = Object.assign({}, BASE, { motion, h: 1, hits: 3 });
        const p = bossShotPos(s, 1);
        assert.near(p.x, s.x1, 1e-6);
        assert.near(p.y, s.y1, 1e-6);
      });

      it('bossShotDir hữu hạn tại mọi mốc k cho motion ' + motion, () => {
        const s = Object.assign({}, BASE, { motion, h: 0, hits: 2 });
        [0, 0.25, 0.5, 0.75, 1].forEach(k => {
          const a = bossShotDir(s, k);
          assert.ok(Number.isFinite(a), motion + ' k=' + k + ' → góc phải hữu hạn, được ' + a);
        });
      });
    });

    ['arc', 'straight', 'fan', 'spin'].forEach(motion => {
      it('bossShotPos(s,0) ≈ gốc (x0,y0) cho motion ' + motion, () => {
        const s = Object.assign({}, BASE, { motion, h: 0, hits: 1 });
        const p = bossShotPos(s, 0);
        assert.near(p.x, s.x0, 1e-6);
        assert.near(p.y, s.y0, 1e-6);
      });
    });

    it('sky KHÔNG xuất phát từ (x0,y0) lúc k=0 (rơi từ trên trời xuống, không phải từ tay pháp sư)', () => {
      const s = Object.assign({}, BASE, { motion: 'sky' });
      const p = bossShotPos(s, 0);
      assert.ok(Math.abs(p.y - s.y0) > 30, 'sky phải bắt đầu cao hơn hẳn y0, được y=' + p.y);
    });

    it('ground KHÔNG xuất phát từ (x0,y0) lúc k=0 (ẩn tới impact, luôn ở vị trí đích)', () => {
      const s = Object.assign({}, BASE, { motion: 'ground' });
      const p = bossShotPos(s, 0);
      assert.near(p.x, s.x1, 1e-6);
      assert.near(p.y, s.y1, 1e-6);
    });

    it('fan: nhiều quả đạn (h khác nhau) toả khác đường ở giữa quỹ đạo nhưng hội tụ đúng đích tại k=1', () => {
      const s0 = Object.assign({}, BASE, { motion: 'fan', h: 0, hits: 3 });
      const s1 = Object.assign({}, BASE, { motion: 'fan', h: 1, hits: 3 });
      const s2 = Object.assign({}, BASE, { motion: 'fan', h: 2, hits: 3 });
      const mid0 = bossShotPos(s0, 0.5), mid1 = bossShotPos(s1, 0.5), mid2 = bossShotPos(s2, 0.5);
      assert.ok(Math.abs(mid0.x - mid1.x) > 1 || Math.abs(mid0.y - mid1.y) > 1, 'quả 0 và 1 phải lệch đường giữa quỹ đạo');
      assert.ok(Math.abs(mid1.x - mid2.x) > 1 || Math.abs(mid1.y - mid2.y) > 1, 'quả 1 và 2 phải lệch đường giữa quỹ đạo');
      [s0, s1, s2].forEach(s => {
        const end = bossShotPos(s, 1);
        assert.near(end.x, s.x1, 1e-6); assert.near(end.y, s.y1, 1e-6);
      });
    });

    it('reduced-motion đổi sky → straight (bay thẳng tới đích, không rơi từ trên trời)', () => {
      const s = Object.assign({}, BASE, { motion: 'sky', reduced: true });
      const p0 = bossShotPos(s, 0);
      assert.near(p0.x, s.x0, 1e-6); assert.near(p0.y, s.y0, 1e-6);
    });

    it('reduced-motion đổi fan → straight (mọi quả cùng đường thẳng, không toả)', () => {
      const a = Object.assign({}, BASE, { motion: 'fan', h: 0, hits: 3, reduced: true });
      const b = Object.assign({}, BASE, { motion: 'fan', h: 2, hits: 3, reduced: true });
      const ma = bossShotPos(a, 0.5), mb = bossShotPos(b, 0.5);
      assert.near(ma.x, mb.x, 1e-6); assert.near(ma.y, mb.y, 1e-6);
    });

    it('reduced-motion KHÔNG đổi arc/ground/spin (giữ nguyên cảm giác)', () => {
      const arc = Object.assign({}, BASE, { motion: 'arc', reduced: true });
      const plain = Object.assign({}, BASE, { motion: 'arc', reduced: false });
      assert.deepEqual(bossShotPos(arc, 0.5), bossShotPos(plain, 0.5));
    });

    it('arc tái hiện ĐÚNG công thức gốc drawBossShotSprite cũ (−sin(kπ)·30)', () => {
      const s = Object.assign({}, BASE, { motion: 'arc' });
      const k = 0.37;
      const wantY = s.y0 + (s.y1 - s.y0) * k - Math.sin(k * Math.PI) * 30;
      const wantX = s.x0 + (s.x1 - s.x0) * k;
      const p = bossShotPos(s, k);
      assert.near(p.x, wantX, 1e-9); assert.near(p.y, wantY, 1e-9);
    });

    it('shot thiếu s.motion mặc định "arc" (giữ hình basic hiện tại)', () => {
      const s = Object.assign({}, BASE);   // không set motion
      const withArc = Object.assign({}, BASE, { motion: 'arc' });
      assert.deepEqual(bossShotPos(s, 0.6), bossShotPos(withArc, 0.6));
    });

    const Q = { x: 200, y: 300, s: 48 }, CY = Q.y - Q.s * 0.45;
    it('bossImpactSpawns: basic (vis null) giữ vị trí/cỡ cũ theo bossVfxScale', () => {
      const out = bossImpactSpawns(['flam', 'explosion'], Q, CY, null, 1.5);
      assert.equal(out.length, 2);
      assert.equal(out[0].scale, bossVfxScale('flam', Q.s, 1.5));
      assert.equal(out[1].x, Q.x + 0.5 * Q.s * 0.14);
    });
    it('bossImpactSpawns: hình chính của chiêu có hình riêng cao ≥ ~1.1× quái', () => {
      const out = bossImpactSpawns(['flam'], Q, CY, { impact: ['flam'], scale: 1 }, 1);
      assert.ok(BOSS_SPRITES.flam.fh * out[0].scale >= Q.s * 0.9);
    });
    it('bossImpactSpawns: pillar n → n bản hình chính xếp chồng lên từ chân quái, lớp sau giữ nguyên', () => {
      const out = bossImpactSpawns(['flam', 'particleFire'], Q, CY, { impact: ['flam', 'particleFire'], scale: 1.3, pillar: 3 }, 1);
      assert.equal(out.length, 4);
      assert.deepEqual(out.slice(0, 3).map(o => o.name), ['flam', 'flam', 'flam']);
      assert.ok(out[0].y > out[1].y && out[1].y > out[2].y, 'cột đi lên');
      assert.ok(out[0].y < Q.y, 'đáy cột trên chân quái');
      assert.equal(out[3].name, 'particleFire');
    });
  });
})();
