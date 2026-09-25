/* Test thanh tấn công (threat) của trùm — thuần: đầy theo giờ, gõ xong từ giảm, gõ sai/bỏ tăng, đầy → quái đánh.
   Phần tích hợp (khoá/tạm dừng/đóng băng/kẹp dt/tuyệt kỹ Gió) dùng chung createBattle/stepBattle với
   boss-game-logic.test.js — chỉ lặp lại đúng phần liên quan threat, không lặp toàn bộ máy trạng thái ở đó. */
(function () {
  const G = (id, ans) => ({ key: id, prompt: '🐱 ' + id, answers: [ans || id], ids: [id], words: [] });
  const GROUPS = [G('cat'), G('dog'), G('sun')];
  function mk(o) {
    o = o || {};
    return createBattle(Object.assign({
      monster: { id: 'goblin', hp: 250, weak: 'fire' }, groups: GROUPS, tiers: new Map([['cat', 1], ['dog', 2], ['sun', 3]]),
      mods: modifiersFor(o.alloc || {}, o.el || 'ice'), hearts: 3, difficulty: 'normal', carryDmg: 0, rand: () => 0.99, now: 0
    }, o));
  }
  const type = (st, word, t0, gap) => word.split('').forEach((c, i) => typeKey(st, c, t0 + i * (gap || 10)));
  const types = st => st.events.map(e => e.type);
  function run(st, t0, t1) { for (let t = t0 + 16; t <= t1; t += 16) stepBattle(st, 16, t); }

  describe('threat gauge — hàm thuần', () => {
    it('bossThreatRate = 1 / threatSec', () => {
      const st = { threatSec: 10 };
      assert.near(bossThreatRate(st), 0.1);
    });
    it('clockAdd (đã gộp vào threatSec lúc tạo trận) làm thanh đầy chậm hơn', () => {
      const fast = { threatSec: 10 }, slow = { threatSec: 12 };
      assert.ok(bossThreatRate(slow) < bossThreatRate(fast));
    });
    it('bossThreatFill: dt (đã nhân timeScale) đầy đúng theo tốc độ', () => {
      const st = { threat: 0, threatSec: 10 };
      bossThreatFill(st, 1);
      assert.near(st.threat, 0.1);
      bossThreatFill(st, 5);   // dt nhỏ hơn do timeScale chậm thời gian vẫn cùng công thức
      assert.near(st.threat, 0.6);
    });
    it('bossThreatDrainOnCast: giảm theo tốc độ gõ, kẹp ≥ 0', () => {
      const st = { threat: 0.5 };
      bossThreatDrainOnCast(st, 1);
      assert.near(st.threat, 0.5 - BOSS_TUNING.threatDrain);
      bossThreatDrainOnCast(st, 2);
      assert.equal(st.threat, 0, 'kẹp 0, không âm');
    });
    it('bossThreatAdd: cộng dồn, kẹp ≥ 0, không kẹp trần (stepBattle kế phát hiện đầy)', () => {
      const st = { threat: 0 };
      bossThreatAdd(st, BOSS_TUNING.threatTypo);
      assert.near(st.threat, BOSS_TUNING.threatTypo);
      bossThreatAdd(st, -10);
      assert.equal(st.threat, 0, 'kẹp 0');
      bossThreatAdd(st, 1.5);
      assert.near(st.threat, 1.5, 1e-9, 'không kẹp trần ở hàm add');
    });
    it('bossThreatAttack: reset thanh, còn khiên → trừ khiên, không trừ tim, trả về rỗng', () => {
      const st = { threat: 1, shield: 1, hearts: 3 };
      const r = bossThreatAttack(st);
      assert.equal(st.threat, 0); assert.equal(st.shield, 0); assert.equal(st.hearts, 3); assert.equal(r, '');
    });
    it('bossThreatAttack: hết khiên → trừ tim, còn sống trả về rỗng, hết tim trả về "lost"', () => {
      const a = { threat: 1, shield: 0, hearts: 2 };
      assert.equal(bossThreatAttack(a), ''); assert.equal(a.hearts, 1);
      const b = { threat: 1, shield: 0, hearts: 1 };
      assert.equal(bossThreatAttack(b), 'lost'); assert.equal(b.hearts, 0);
    });
  });

  describe('threat gauge — tích hợp trận (createBattle/stepBattle)', () => {
    it('đứng yên: thanh đầy dần theo giờ tới 1 rồi quái đánh, thanh về 0', () => {
      const st = mk({ hearts: 1 });
      assert.equal(st.threat, 0);
      run(st, 0, 5000); assert.ok(st.threat > 0.4 && st.threat < 0.6, 'threat ' + st.threat);
      run(st, 5000, 10100);
      assert.includes(types(st), 'bossAttack'); assert.includes(types(st), 'hurt'); assert.equal(st.threat, 0);
      assert.equal(st.phase, 'lost');
    });
    it('niệm đúng ngay lúc gõ xong (castComplete) → thanh giảm, không đợi impact', () => {
      const st = mk();
      run(st, 0, 3000);
      const before = st.threat;
      type(st, 'cat', 3000);   // tier 1, gõ nhanh → speed 2
      assert.ok(st.threat < before, 'giảm ngay khi niệm xong, chưa tới impact');
    });
    it('gõ sai (typo) mỗi lần +threatTypo', () => {
      const st = mk();
      const before = st.threat;
      typeKey(st, 'x', 10);
      assert.near(st.threat, before + BOSS_TUNING.threatTypo);
    });
    it('bỏ (giveUp) hoặc hỏng phép (fizzle) cộng thêm +threatMiss', () => {
      const st = mk();
      const before = st.threat;
      giveUp(st, 0);
      assert.near(st.threat, before + BOSS_TUNING.threatMiss);
    });
    it('3 lỗi gõ liên tiếp → mỗi lỗi +threatTypo, lỗi thứ 3 (fizzle) cộng thêm +threatMiss', () => {
      const st = mk();
      const before = st.threat;
      ['x', 'y', 'z'].forEach((c, i) => typeKey(st, c, i));
      assert.includes(types(st), 'fizzle');
      assert.near(st.threat, before + 3 * BOSS_TUNING.threatTypo + BOSS_TUNING.threatMiss);
    });
    it('chạm 1 bởi cộng dồn (typo/miss) → quái đánh ngay ở stepBattle kế, không đợi đầy theo giờ', () => {
      const st = mk({ hearts: 3 }); st.threat = 1 - BOSS_TUNING.threatMiss + 0.001;
      giveUp(st, 0);
      assert.ok(st.threat >= 1 - 1e-9, 'threat trước khi stepBattle kế đã ≥ 1');
      stepBattle(st, 16, 1216);   // qua khoá revealMs rồi mới xử lý được (bossCanAct)
      assert.includes(types(st), 'bossAttack'); assert.equal(st.threat, 0); assert.equal(st.hearts, 2);
    });
    it('khiên Đất chặn 1 đòn khi đầy, không trừ tim', () => {
      const st = mk({ alloc: { earth: 2 } });
      run(st, 0, 10100);
      assert.includes(types(st), 'shieldBlock'); assert.equal(st.hearts, 3);
    });
    it('khoá (lockUntil), tạm dừng, đóng băng: thanh không tăng', () => {
      const st = mk();
      type(st, 'cat', 0);                 // khoá tới impactAt (270)
      stepBattle(st, 16, 100); assert.equal(st.threat, 0, 'đang khoá → không tăng');
      const st2 = mk(); pauseBattle(st2, 5); stepBattle(st2, 16, 5000); assert.equal(st2.threat, 0, 'đang dừng → không tăng');
      const st3 = mk({ alloc: { ice: 2 }, rand: () => 0.1 });
      type(st3, 'cat', 0); run(st3, 0, 300);   // trúng đòn Băng bậc 2 → đóng băng
      assert.includes(types(st3), 'freeze');
      const frozenThreat = st3.threat;
      run(st3, 300, 1000); assert.near(st3.threat, frozenThreat, 1e-9, 'đóng băng → không tăng');
    });
    it('tuyệt kỹ Gió (tornado, sau khi gõ hết chuỗi niệm k=1): thanh về 0', () => {
      const st = mk({ alloc: { wind: 3 }, el: 'wind' });
      st.ult = BOSS_TUNING.ultMax; st.threat = 0.7;
      assert.ok(useUltimate(st, 0));   // pool 3 đề, trừ đề đang hiện → chuỗi còn đúng 2 từ (xem boss-game-combo-chain.test.js)
      let t = 10;
      st.chain.words.forEach(g => { type(st, g.answers[0], t); t += 200; });
      assert.equal(st.chain, null); assert.equal(st.threat, 0);
    });
  });
})();
