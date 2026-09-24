/* Test toán phép + cây nguyên tố Pháp sư. Chạy trong Node và trình duyệt. */
(function () {
  describe('boss spell math — bậc chiêu tương đối', () => {
    it('người mới học (mọi ivl < 21) vẫn đủ 3 bậc theo tỉ lệ 30/40/30', () => {
      const words = [], srs = {};
      for (let i = 0; i < 20; i++) {
        words.push({ id: 'w' + String(i).padStart(2, '0'), word: 'word' });
        srs[words[i].id] = { state: i % 3 ? 'review' : 'learning', ivl: i % 7, ef: 2.5, lapses: i % 4 === 0 ? 1 : 0 };
      }
      const t = assignTiers(words, srs), count = [0, 0, 0, 0];
      t.forEach(v => count[v]++);
      assert.deepEqual(count.slice(1), [6, 8, 6]);
    });
    it('từ hay quên / đang học lên ✦✦✦, từ quen ivl dài xuống ✦', () => {
      const words = [{ id: 'easy', word: 'cat' }, { id: 'mid', word: 'table' }, { id: 'hard', word: 'stubborn' }];
      const srs = { easy: { state: 'review', ivl: 60, ef: 2.6 }, mid: { state: 'review', ivl: 10, ef: 2.3 }, hard: { state: 'relearn', ivl: 1, ef: 1.7, lapses: 3 } };
      const t = assignTiers(words, srs);
      assert.equal(t.get('hard'), 3); assert.equal(t.get('easy'), 1);
    });
    it('wordDifficulty đúng công thức', () => {
      assert.near(wordDifficulty({ lapses: 2, ef: 1.9, state: 'review', ivl: 7 }, 10), 4 + 2 + 0 + 2 + 1);
      assert.equal(wordDifficulty({ state: 'review', ivl: 30, ef: 2.5 }, 3), 0);
    });
  });

  describe('boss spell math — tốc độ + sát thương', () => {
    it('speedMult biên: ≤ nửa mốc → 2, ≥ mốc → 1, giữa tuyến tính', () => {
      const mark = 1500 + 350 * 4;   // 2900
      assert.equal(speedMult(0, 4), 2); assert.equal(speedMult(mark / 2, 4), 2);
      assert.equal(speedMult(mark, 4), 1); assert.equal(speedMult(99999, 4), 1);
      assert.near(speedMult(mark * 0.75, 4), 1.5);
    });
    it('Sét nới mốc 20%', () => assert.equal(speedMult(2900, 4, 0.2), 2 - (2900 - 1740) / 1740));
    it('spellDamage = gốc × tốc độ × khắc hệ × Lửa × chí mạng', () => {
      assert.equal(spellDamage({ tier: 3, speed: 2, weakHit: true, mods: { dmgMul: 1.15 }, crit: true }), Math.round(40 * 2 * 1.5 * 1.15 * 1.5));
      assert.equal(spellDamage({ tier: 1, speed: 1 }), 10);
    });
  });

  describe('boss spell math — pool đề', () => {
    const pool = [
      { id: 'phone', word: 'phone', meaning: 'điện thoại', emoji: '📱' },
      { id: 'telephone', word: 'telephone', meaning: 'Điện  thoại', emoji: '📱' },
      { id: 'piano', word: 'piano', meaning: 'đàn piano', emoji: '🎹' },
      { id: 'jan', word: 'January', meaning: 'tháng Một', emoji: '📅' },
      { id: 'go', word: 'go', meaning: 'đi (go on)', emoji: '🚶' }
    ];
    const g = buildBossPool(pool);
    it('gộp phone/telephone cùng đề → cả hai đều đúng', () => {
      const ph = g.find(x => x.ids.indexOf('phone') >= 0);
      assert.deepEqual(ph.answers, ['phone', 'telephone']); assert.deepEqual(ph.ids, ['phone', 'telephone']);
    });
    it('loại từ có nghĩa chứa chính nó (≥3 chữ), giữ từ ngắn', () => {
      assert.ok(!g.some(x => x.ids.indexOf('piano') >= 0)); assert.ok(g.some(x => x.ids.indexOf('go') >= 0));
    });
    it('chỉ so với vế nghĩa hiển thị: từ chỉ lộ ở vế sau ";" vẫn được giữ', () => {
      const p = buildBossPool([{ id: 'rock', word: 'rock', meaning: 'đá; nhạc rock', emoji: '🪨' }]);
      assert.equal(p.length, 1);
    });
    it('January chuẩn hoá thành january', () => assert.deepEqual(g.find(x => x.ids[0] === 'jan').answers, ['january']));
    it('bossWordWeight ưu tiên từ khó', () => {
      assert.equal(bossWordWeight({ state: 'review', lapses: 0, ef: 2.5 }), 1);
      assert.equal(bossWordWeight({ state: 'learning', lapses: 2, ef: 1.8 }), 1 + 4 + 2 + 2);
    });
  });

  describe('boss elements', () => {
    it('chưa cộng điểm → modifiers trung tính, không tuyệt kỹ', () => {
      const m = modifiersFor({}, 'fire');
      assert.equal(m.dmgMul, 1); assert.equal(m.ultimate, null); assert.equal(m.element, 'fire');
    });
    it('từng nhánh bậc 1–2', () => {
      assert.near(modifiersFor({ fire: 1 }, 'ice').dmgMul, 1.15);
      assert.deepEqual(modifiersFor({ fire: 2 }, 'ice').burn, { dps: 5, sec: 3 });
      assert.equal(modifiersFor({ ice: 1 }, 'fire').clockAdd, 1.5);
      const ice = modifiersFor({ ice: 2 }, 'fire'); assert.equal(ice.freezeChance, 0.25); assert.equal(ice.freezeSec, 3);
      assert.equal(modifiersFor({ storm: 1 }, 'fire').speedLoosen, 0.2); assert.equal(modifiersFor({ storm: 2 }, 'fire').fastCrit, true);
      assert.equal(modifiersFor({ earth: 1 }, 'fire').maxHeartsAdd, 1); assert.equal(modifiersFor({ earth: 2 }, 'fire').shield, 1);
      assert.equal(modifiersFor({ wind: 1 }, 'fire').hintFirst, true); assert.equal(modifiersFor({ wind: 2 }, 'fire').typoForgive, 1);
    });
    it('tuyệt kỹ chỉ khi nhánh của trường phái đạt bậc 3', () => {
      assert.equal(modifiersFor({ ice: 3 }, 'fire').ultimate, null);
      assert.equal(modifiersFor({ ice: 3 }, 'ice').ultimate, 'iceAge');
      BOSS_ELEMENTS.forEach(e => { const a = {}; a[e] = 3; assert.equal(modifiersFor(a, e).ultimate, BOSS_ULTIMATES[e]); });
    });
    it('trường phái lạ → hệ đầu tiên', () => assert.equal(modifiersFor({}, 'hack').element, 'fire'));
    it('pointsLeft kẹp ≥ 0', () => {
      assert.equal(pointsLeft(1, {}), 0); assert.equal(pointsLeft(5, { fire: 2 }), 2); assert.equal(pointsLeft(2, { fire: 3, ice: 3 }), 0);
    });
    it('canRankUp: còn điểm, chưa bậc 3, nhánh hợp lệ', () => {
      assert.ok(canRankUp({}, 'fire', 2)); assert.ok(!canRankUp({}, 'fire', 1));
      assert.ok(!canRankUp({ fire: 3 }, 'fire', 10)); assert.ok(!canRankUp({}, 'hack', 10));
    });
  });
})();
