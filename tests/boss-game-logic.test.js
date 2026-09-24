/* Test máy trạng thái trận Pháp sư: gõ, niệm, va chạm trễ, khoá, chậm thời gian, đồng hồ, nguyên tố, Nộ. */
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
  // chạy step theo bước 16ms thật từ t0 tới t1
  function run(st, t0, t1) { for (let t = t0 + 16; t <= t1; t += 16) stepBattle(st, 16, t); }

  describe('boss logic — niệm và va chạm', () => {
    it('gõ đúng → cast → hp chỉ giảm tại impact (trễ theo bậc)', () => {
      const st = mk();
      type(st, 'cat', 0);
      assert.includes(types(st), 'cast');
      assert.equal(st.hp, 250);
      run(st, 20, 200); assert.equal(st.hp, 250, 'chưa tới 250ms');
      run(st, 200, 300); assert.equal(st.hp, 230, 'bậc 1 × tốc độ 2 = 20');
      assert.includes(types(st), 'impact');
    });
    it('chữ hoa / nháy cong được chuẩn hoá; dấu cách bị bỏ qua', () => {
      const st = mk({ groups: [G('ok', "don't")] });
      "DON ’T".split('').forEach((c, i) => typeKey(st, c, i));
      assert.includes(types(st), 'cast');
    });
    it('thắng chỉ sau impact + trễ kết', () => {
      const st = mk({ carryDmg: 240 });
      type(st, 'cat', 0);
      run(st, 20, 250); assert.equal(st.phase, 'play');
      run(st, 250, 1100); assert.equal(st.phase, 'play', 'chưa hết endDelay');
      run(st, 1100, 1300); assert.equal(st.phase, 'won');
    });
    it('carryDmg ≥ hp → vẫn còn 1 hp để kết liễu', () => assert.equal(mk({ carryDmg: 999 }).hp, 1));
    it('3 lỗi gõ → fizzle, miss, lộ đáp án rồi sang đề kế', () => {
      const st = mk();
      ['x', 'y', 'z'].forEach((c, i) => typeKey(st, c, i));
      assert.includes(types(st), 'fizzle'); assert.deepEqual(st.miss, ['cat']);
      run(st, 0, 1300); assert.equal(st.group.ids[0], 'dog');
    });
    it('Gió bậc 2 tha 1 lỗi mỗi từ; bậc 1 hiện chữ đầu', () => {
      const st = mk({ alloc: { wind: 2 } });
      assert.includes(types(st), 'hint');
      ['x', 'y', 'z'].forEach((c, i) => typeKey(st, c, i));
      assert.includes(types(st), 'typoForgiven'); assert.equal(st.typos, 2);
    });
    it('giveUp → lộ đáp án, miss, Nộ −2', () => {
      const st = mk(); st.rage = 5;
      giveUp(st, 0);
      assert.includes(types(st), 'giveup'); assert.equal(st.rage, 3); assert.deepEqual(st.miss, ['cat']);
    });
  });

  describe('boss logic — đáp án là tiền tố của đáp án khác (south/southern)', () => {
    const SS = () => mk({ groups: [{ key: 's', prompt: 'phía nam', answers: ['south', 'southern'], ids: ['south', 'southern'], words: [] }, G('dog')] });
    const casts = st => st.events.filter(e => e.type === 'cast');
    it('gõ trọn "southern" → một phép duy nhất, không lỗi gõ', () => {
      const st = SS(); type(st, 'southern', 0);
      assert.equal(casts(st).length, 1); assert.equal(casts(st)[0].word, 'southern'); assert.equal(st.typos, 0);
    });
    it('"south" rồi ngừng gõ 400ms → niệm "south", tốc độ tính tới chữ cuối', () => {
      const st = SS(); type(st, 'south', 0);
      assert.equal(casts(st).length, 0);
      run(st, 40, 400); assert.equal(casts(st).length, 0, 'chưa đủ 400ms');
      run(st, 400, 480); assert.equal(casts(st).length, 1); assert.equal(casts(st)[0].word, 'south'); assert.equal(casts(st)[0].speed, 2);
    });
    it('"south" + phím không đi tiếp → niệm "south", phím bị nuốt (không tính lỗi)', () => {
      const st = SS(); type(st, 'south', 0); typeKey(st, 'x', 60);
      assert.equal(casts(st).length, 1); assert.equal(st.typos, 0);
    });
    it('khớp đáp án ngắn đúng lúc now = 0 vẫn vào trạng thái chờ', () => {
      const st = SS(); st.typed = 'sout'; typeKey(st, 'h', 0);
      assert.equal(submitTyped(st, 10), 'cast');
    });
    it('bấm Bỏ khi đang chờ → niệm đáp án ngắn, không tính miss', () => {
      const st = SS(); type(st, 'south', 0); giveUp(st, 60);
      assert.equal(casts(st).length, 1); assert.deepEqual(st.miss, []);
    });
    it('Enter: đang chờ → niệm; chưa gõ → Bỏ', () => {
      const st = SS(); type(st, 'south', 0);
      assert.equal(submitTyped(st, 50), 'cast');
      const st2 = SS(); assert.equal(submitTyped(st2, 0), 'giveup'); assert.includes(types(st2), 'giveup');
      const st3 = SS(); typeKey(st3, 's', 0); assert.equal(submitTyped(st3, 5), '', 'đang gõ dở → Enter không làm gì');
    });
  });

  describe('boss logic — khoá, tạm dừng, tốc độ', () => {
    it('phím trong khoá bị bỏ; đề kế readyAt = lúc hết khoá', () => {
      const st = mk();
      type(st, 'cat', 0);
      typeKey(st, 'd', 100); assert.equal(st.typed, 'cat');
      run(st, 20, 400);
      assert.equal(st.group.ids[0], 'dog'); assert.ok(st.readyAt >= 270 && st.readyAt < 270 + 16, 'readyAt ' + st.readyAt + ' (niệm xong lúc 20 + trễ 250, bước 16ms đầu sau khoá)');
    });
    it('phím tới đúng lúc hết khoá (trước stepBattle kế) → tính cho đề MỚI', () => {
      const st = mk();
      type(st, 'cat', 0);                  // khoá tới 270
      typeKey(st, 'd', 275);
      assert.equal(st.group.ids[0], 'dog'); assert.equal(st.typed, 'd'); assert.equal(st.typos, 0); assert.equal(st.hp, 230);
    });
    it('tạm dừng không tính vào tốc độ', () => {
      const a = mk(), b = mk();
      pauseBattle(b, 5); resumeBattle(b, 60005);
      type(a, 'cat', 100); type(b, 'cat', 60100);
      const ca = a.events.find(e => e.type === 'cast'), cb = b.events.find(e => e.type === 'cast');
      assert.equal(ca.dmg, cb.dmg); assert.equal(b.pausedMs, 60000);
    });
    it('đồng hồ KHÔNG chạy trong khoá tuyệt kỹ (0,8s đồng hồ + 1 ❤️ → không mất ❤️)', () => {
      const st = mk({ alloc: { ice: 3 }, el: 'ice' });
      st.clock = 0.8; st.hearts = 1; st.rage = BOSS_TUNING.rageMax;
      assert.ok(useUltimate(st, 0));
      run(st, 0, 1490); assert.equal(st.hearts, 1); assert.equal(st.phase, 'play'); assert.near(st.clock, 0.8);
      assert.includes(types(st), 'ultimate');
    });
    it('đồng hồ chạy hết → trùm đánh, mất ❤️; hết ❤️ → thua', () => {
      const st = mk({ hearts: 1 });
      run(st, 0, 10100);
      assert.includes(types(st), 'hurt'); assert.equal(st.phase, 'lost');
    });
  });

  describe('boss logic — chậm thời gian', () => {
    it('gõ chữ đúng → chậm; ngừng > 1,5s → về 1', () => {
      const st = mk({ groups: [G('elephant')] });
      typeKey(st, 'e', 0);
      run(st, 0, 1000); assert.near(st.timeScale, BOSS_TUNING.slowScale, 0.01);
      run(st, 1000, 2500); assert.near(st.timeScale, 1, 0.01);
    });
    it('chữ sai không giữ chậm thời gian', () => {
      const st = mk({ groups: [G('elephant')] });
      typeKey(st, 'e', 0);
      typeKey(st, 'x', 1400); typeKey(st, 'y', 1450);
      run(st, 0, 2500); assert.near(st.timeScale, 1, 0.01);
    });
    it('trần chậm mỗi từ = 1,2s × số chữ thời gian thật', () => {
      const st = mk({ groups: [G('ab', 'abc')] });   // 3 chữ → trần 3,6s
      typeKey(st, 'a', 0);
      for (let t = 16; t <= 5000; t += 16) { if (t % 1000 < 16) { st.lastGoodKeyAt = t; } stepBattle(st, 16, t); }
      assert.near(st.timeScale, 1, 0.01); assert.ok(st.slowUsedMs <= 3600 + 16);
    });
  });

  describe('boss logic — nguyên tố + Nộ', () => {
    it('khiên Đất chặn 1 đòn', () => {
      const st = mk({ alloc: { earth: 2 } });
      run(st, 0, 10100);
      assert.includes(types(st), 'shieldBlock'); assert.equal(st.hearts, 3);
    });
    it('Băng bậc 2 đóng băng 3s thật (rand cố định)', () => {
      const st = mk({ alloc: { ice: 2 }, rand: () => 0.1 });
      const clockMax = st.clockMax;
      type(st, 'cat', 0);
      run(st, 0, 300); assert.includes(types(st), 'freeze');
      run(st, 300, 3000); assert.near(st.clock, clockMax, 1e-9);
      run(st, 3000, 3600); assert.includes(types(st), 'unfreeze'); assert.ok(st.clock < clockMax);
    });
    it('Lửa bậc 2 thiêu đốt 5/s × 3s sau impact', () => {
      const st = mk({ alloc: { fire: 2 } });
      type(st, 'cat', 0);
      run(st, 0, 4000); assert.near(250 - 23 - st.hp, 15, 0.01, 'impact 20×1,15 (bậc 1 Lửa) + thiêu 15'); assert.includes(types(st), 'burnTick');
    });
    it('Nộ +1 mỗi phép; đầy → rageFull; tuyệt kỹ Lửa ×3 cho 3 phép kế', () => {
      const st = mk({ alloc: { fire: 3 }, el: 'fire' });
      st.rage = BOSS_TUNING.rageMax - 1;
      type(st, 'cat', 0); assert.includes(types(st), 'rageFull');
      run(st, 0, 400);
      assert.ok(useUltimate(st, 400)); run(st, 400, 2000);
      assert.includes(types(st), 'ultimateEnd');
      type(st, 'dog', 2000);
      const casts = st.events.filter(e => e.type === 'cast');
      assert.equal(casts[1].dmg, 3 * spellDamage({ tier: 2, speed: 2, weakHit: true, mods: st.mods }));
      assert.equal(st.boost.left, 2);
    });
    const ult = (el, setup) => { const a = {}; a[el] = 3; const st = mk({ alloc: a, el }); st.rage = BOSS_TUNING.rageMax; if (setup) setup(st); assert.ok(useUltimate(st, 0)); return st; };
    it('Kỷ băng hà: dừng đồng hồ 8s thật SAU cắt cảnh', () => {
      const st = ult('ice'), c = st.clock;
      run(st, 0, 1500 + 7900); assert.near(st.clock, c, 1e-9);
      run(st, 9400, 10000); assert.ok(st.clock < c); assert.includes(types(st), 'unfreeze');
    });
    it('Xích sét: 3 phép kế đánh 2 lần', () => {
      const st = ult('storm'); run(st, 0, 1600);
      type(st, 'cat', 1600);
      const c = st.events.find(e => e.type === 'cast');
      assert.equal(c.hits, 2); assert.equal(c.dmg, 2 * spellDamage({ tier: 1, speed: 2, mods: st.mods, crit: true }), 'Sét bậc 2: gõ tốc độ max → chí mạng'); assert.equal(st.boost.left, 2);
    });
    it('Hồi sinh: hồi đầy ❤️', () => { const st = ult('earth', s => { s.hearts = 1; }); assert.equal(st.hearts, st.heartsMax); assert.equal(st.hearts, 3); });
    it('Lốc xoáy: nạp lại đồng hồ trùm', () => { const st = ult('wind', s => { s.clock = 0.5; }); assert.equal(st.clock, st.clockMax); });
    it('tạm dừng trong khoá + còn phép chưa chạm: mọi mốc dời đúng khoảng dừng', () => {
      const st = mk();
      type(st, 'cat', 0);                 // impactAt = 270
      pauseBattle(st, 100); stepBattle(st, 16, 5000); assert.equal(st.hp, 250, 'đang dừng không có gì chạy');
      resumeBattle(st, 10100);            // dời 10000
      run(st, 10100, 10260); assert.equal(st.hp, 250);
      run(st, 10260, 10300); assert.equal(st.hp, 230);
    });
    it('tạm dừng khi đang đóng băng: băng không tan trong lúc dừng', () => {
      const st = mk({ alloc: { ice: 2 }, rand: () => 0.1 });
      type(st, 'cat', 0); run(st, 0, 300);   // băng tới ~3270
      pauseBattle(st, 1000); resumeBattle(st, 61000);
      run(st, 61000, 63200); assert.ok(!types(st).includes('unfreeze'));
      run(st, 63200, 63400); assert.includes(types(st), 'unfreeze');
    });
    it('khung hình treo lâu (dt 30s) chỉ trừ tối đa 250ms đồng hồ', () => {
      const st = mk(), c = st.clock; stepBattle(st, 30000, 30000); assert.near(c - st.clock, 0.25, 1e-9);
    });
    it('tuyệt kỹ khi Nộ chưa đầy → không dùng được', () => assert.equal(useUltimate(mk({ alloc: { fire: 3 }, el: 'fire' }), 0), false));
  });
})();
