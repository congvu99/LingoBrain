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
    it('giveUp → lộ đáp án, miss, thanh tuyệt kỹ không đổi, combo về 0', () => {
      const st = mk(); st.ult = 5; st.combo = 3;
      giveUp(st, 0);
      assert.includes(types(st), 'giveup'); assert.equal(st.ult, 5); assert.equal(st.combo, 0); assert.deepEqual(st.miss, ['cat']);
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
    it('phím trong khoá bị bỏ; đề kế readyAt = lúc hết khoá (chạm + đuôi cố định)', () => {
      const st = mk();
      type(st, 'cat', 0);
      typeKey(st, 'd', 100); assert.equal(st.typed, 'cat');
      run(st, 20, 650);
      assert.equal(st.group.ids[0], 'dog'); assert.ok(st.readyAt >= 620 && st.readyAt < 620 + 16, 'readyAt ' + st.readyAt + ' (niệm xong lúc 20, chạm 270 + đuôi 350 = 620, bước 16ms đầu sau khoá)');
    });
    it('phím tới đúng lúc hết khoá (trước stepBattle kế) → tính cho đề MỚI', () => {
      const st = mk();
      type(st, 'cat', 0);                  // khoá tới 620 (chạm 270 + đuôi bậc 1: 350)
      typeKey(st, 'd', 625);
      assert.equal(st.group.ids[0], 'dog'); assert.equal(st.typed, 'd'); assert.equal(st.typos, 0); assert.equal(st.hp, 230);
    });
    it('tạm dừng không tính vào tốc độ', () => {
      const a = mk(), b = mk();
      pauseBattle(b, 5); resumeBattle(b, 60005);
      type(a, 'cat', 100); type(b, 'cat', 60100);
      const ca = a.events.find(e => e.type === 'cast'), cb = b.events.find(e => e.type === 'cast');
      assert.equal(ca.dmg, cb.dmg); assert.equal(b.pausedMs, 60000);
    });
    it('thanh tấn công KHÔNG tăng trong chuỗi niệm tuyệt kỹ (gần đầy + 1 ❤️ → không mất ❤️)', () => {
      const st = mk({ alloc: {}, el: 'ice' });
      st.threat = 0.92; st.hearts = 1; st.ult = BOSS_TUNING.ultMax;
      assert.ok(useUltimate(st, 0));
      run(st, 0, BOSS_TUNING.chainMs - 100); assert.equal(st.hearts, 1); assert.equal(st.phase, 'play'); assert.near(st.threat, 0.92);
    });
    it('thanh tấn công đầy → trùm đánh, mất ❤️; hết ❤️ → thua', () => {
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
      type(st, 'cat', 0);
      run(st, 0, 300); assert.includes(types(st), 'freeze');
      const frozenThreat = st.threat;
      run(st, 300, 3000); assert.near(st.threat, frozenThreat, 1e-9);
      run(st, 3000, 3600); assert.includes(types(st), 'unfreeze'); assert.ok(st.threat > frozenThreat);
    });
    it('đóng băng: quái KHÔNG tấn công dù thanh đã đầy (do typo/giveup dồn) — chỉ đánh sau khi hết băng', () => {
      const st = mk({ alloc: { ice: 2 }, rand: () => 0.1 });
      type(st, 'cat', 0);
      run(st, 0, 300); assert.includes(types(st), 'freeze');
      st.threat = 1;   // mô phỏng typo/giveup dồn thanh đầy trong lúc đang đóng băng
      run(st, 300, 3000);
      assert.ok(!types(st).includes('bossAttack'), 'thanh đầy nhưng còn đóng băng → không được đánh');
      assert.equal(st.hearts, 3, 'chưa mất tim nào trong lúc đóng băng');
      run(st, 3000, 3700);
      assert.includes(types(st), 'unfreeze');
      assert.includes(types(st), 'bossAttack', 'hết băng → đánh ngay ở lượt kế, không chờ đầy lại từ đầu');
    });
    it('Lửa bậc 2 thiêu đốt 5/s × 3s sau impact', () => {
      const st = mk({ alloc: { fire: 2 } });
      type(st, 'cat', 0);
      run(st, 0, 4000); assert.near(250 - 23 - st.hp, 15, 0.01, 'impact 20×1,15 (bậc 1 Lửa) + thiêu 15'); assert.includes(types(st), 'burnTick');
    });
    /* Pool trận này chỉ 3 đề (cat/dog/sun) → trừ đề đang hiện, chuỗi niệm luôn còn ĐÚNG chainWords=2 từ; gõ đúng
       1/2 từ rồi hết giờ → hits=1 → k=1 (bossChainFactor) → bossApplyUltimate tái tạo NGUYÊN VẸN hiệu lực tuyệt
       kỹ CŨ (trước phase 3: nộ 8 từ áp thẳng, không qua chuỗi). Chi tiết hệ số 0.5/1.5 + pool lớn hơn xem
       tests/boss-game-combo-chain.test.js — file này chỉ khoá lại đúng hiệu lực cũ qua k=1. */
    function ultOld(st, now) {
      assert.ok(useUltimate(st, now));
      assert.equal(st.chain.words.length, 2, 'pool 3 đề, trừ đề đang hiện còn đúng chainWords=2 từ');
      const start = now + 10;
      type(st, st.chain.words[0].answers[0], start);   // đúng 1/2 từ → hits=1 → k=1 khi hết giờ
      const until = st.chain.until;
      run(st, start, until + 50);
      assert.equal(st.chain, null, 'hết chainMs → chuỗi kết theo timeout với 1/2 từ');
      return until + 50;
    }
    it('Thanh tuyệt kỹ +1/+2 mỗi phép (tốc độ ≥1,5 gõ đúng thì +2); đầy → ultFull; k=1 tái tạo hiệu lực Lửa ×3 cho 3 phép kế', () => {
      const st = mk({ alloc: {}, el: 'fire' });
      st.ult = BOSS_TUNING.ultMax - 2;
      type(st, 'cat', 0); assert.equal(st.ult, BOSS_TUNING.ultMax); assert.includes(types(st), 'ultFull');
      run(st, 0, 650);   // qua khoá niệm bậc 1 → đã sang đề "dog"
      const t = ultOld(st, 650);
      run(st, t, t + BOSS_TUNING.ultimateMs + 50);
      assert.includes(types(st), 'ultimateEnd');
      st.combo = 0;   // cô lập phép thử: chỉ xét hệ số ×3 của tuyệt kỹ, không cộng dồn combo từ phép "cat" trước đó
      type(st, 'dog', t + BOSS_TUNING.ultimateMs + 50);
      const casts = st.events.filter(e => e.type === 'cast'), last = casts[casts.length - 1];
      assert.equal(last.dmg, 3 * spellDamage({ tier: 2, speed: 2, weakHit: true, mods: st.mods }));
      assert.equal(st.boost.left, 2);
    });
    it('Kỷ băng hà (k=1): dừng thanh tấn công đúng BOSS_ICE_AGE_MS SAU cắt cảnh, như cũ', () => {
      const st = mk({ alloc: {}, el: 'ice' }); st.ult = BOSS_TUNING.ultMax;
      const c = st.threat, t = ultOld(st, 0);
      const end = st.events.find(e => e.type === 'ultimate').until;
      run(st, t, end + BOSS_ICE_AGE_MS - 100); assert.near(st.threat, c, 1e-9);
      run(st, end + BOSS_ICE_AGE_MS - 100, end + BOSS_ICE_AGE_MS + 500); assert.ok(st.threat > c); assert.includes(types(st), 'unfreeze');
    });
    it('Xích sét (k=1): 3 phép kế đánh 2 lần, đúng hiệu lực cũ', () => {
      const st = mk({ alloc: {}, el: 'storm' }); st.ult = BOSS_TUNING.ultMax;
      const t = ultOld(st, 0);
      run(st, t, t + BOSS_TUNING.ultimateMs + 50);
      type(st, st.group.answers[0], t + BOSS_TUNING.ultimateMs + 50);
      const c = st.events.filter(e => e.type === 'cast').pop();
      assert.equal(c.hits, 2); assert.equal(st.boost.left, 2);
    });
    it('Hồi sinh (k=1): hồi đầy ❤️, không cộng thêm khiên — đúng hiệu lực cũ', () => {
      const st = mk({ alloc: {}, el: 'earth' }); st.hearts = 1; st.ult = BOSS_TUNING.ultMax;
      const shieldBefore = st.shield;   // earth bậc 2 đã cho khiên nội tại sẵn — tuyệt kỹ k=1 KHÔNG cộng thêm
      ultOld(st, 0);
      assert.equal(st.hearts, st.heartsMax); assert.equal(st.hearts, 3); assert.equal(st.shield, shieldBefore);
    });
    it('Lốc xoáy (k=1): xả thanh tấn công về 0, không khiên — đúng hiệu lực cũ', () => {
      const st = mk({ alloc: {}, el: 'wind' }); st.threat = 0.7; st.ult = BOSS_TUNING.ultMax;
      ultOld(st, 0);
      assert.equal(st.threat, 0); assert.equal(st.shield, 0);
    });
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
    it('khung hình treo lâu (dt 30s) chỉ tăng tối đa 250ms thanh tấn công', () => {
      const st = mk(); stepBattle(st, 30000, 30000); assert.near(st.threat, 0.25 / st.threatSec, 1e-9);
    });
    it('tuyệt kỹ khi thanh tuyệt kỹ chưa đầy → không dùng được', () => assert.equal(useUltimate(mk({ alloc: {}, el: 'fire' }), 0), false));
  });

  describe('boss logic — nhịp niệm (khoá = chạm + đuôi cố định afterImpactMs)', () => {
    const mkOne = (tier, word, extra) => mk(Object.assign({ groups: [G('w', word)], tiers: new Map([['w', tier]]) }, extra));
    [1, 2, 3].forEach(tier => {
      it('bậc ' + tier + ': không có next trước chạm + đuôi; có next ngay sau mốc', () => {
        const st = mkOne(tier, 'ab');
        st.events = [];   // bỏ 'next' đầu trận (đề đầu tiên, không liên quan khoá đang xét)
        type(st, 'ab', 0);   // niệm xong tại t=10
        const lockUntil = 10 + BOSS_TUNING.impactMs[tier] + BOSS_TUNING.afterImpactMs[tier];
        run(st, 10, lockUntil - 20);
        assert.ok(!types(st).includes('next'), 'chưa hết đuôi khoá bậc ' + tier + ' đã hiện next');
        run(st, lockUntil - 20, lockUntil + 20);
        assert.includes(types(st), 'next');
      });
    });
    it('thanh tấn công không đổi trong khoá niệm (bậc 3, đuôi dài nhất 600ms)', () => {
      const st = mkOne(3, 'ab');
      type(st, 'ab', 0);
      const before = st.threat;
      const lockUntil = 10 + BOSS_TUNING.impactMs[3] + BOSS_TUNING.afterImpactMs[3];
      run(st, 10, lockUntil - 20);
      assert.near(st.threat, before, 1e-9);
    });
    it('phím gõ trong khoá không tạo typo/key (không mất chữ oan)', () => {
      const st = mkOne(2, 'ab');
      type(st, 'ab', 0);
      st.events = [];   // chỉ xét sự kiện phát sinh SAU cast, trong lúc khoá
      typeKey(st, 'z', 20);
      assert.deepEqual(types(st), []);
      assert.equal(st.typos, 0);
    });
    it('wonAt = chạm + endDelay, không cộng thêm đuôi khoá (phép kết liễu không bị trễ)', () => {
      const st = mkOne(3, 'ab', { carryDmg: 249 });   // hp=1, chiêu bậc 3 chắc chắn đủ kết liễu
      type(st, 'ab', 0);
      run(st, 10, 10 + BOSS_TUNING.impactMs[3] + 20);
      assert.near(st.wonAt, 10 + BOSS_TUNING.impactMs[3] + BOSS_TUNING.endDelayMs, 1e-9);
    });
    it('mô phỏng ~40 phép: tổng thời gian thêm do đuôi khoá ≤ 25s', () => {
      const tiers = new Array(12).fill(3).concat(new Array(16).fill(2), new Array(12).fill(1));   // đúng tỉ lệ tierShare 30/40/30
      const groups = tiers.map((t, i) => G('w' + i, 'ab'));
      const tiersMap = new Map(tiers.map((t, i) => ['w' + i, t]));
      const st = mk({ groups, tiers: tiersMap });
      let now = 0, added = 0;
      tiers.forEach(() => {
        type(st, 'ab', now); now += 10;   // niệm ngay ở tốc độ tối đa
        const t = st.tier;
        added += BOSS_TUNING.afterImpactMs[t];
        const lockUntil = now + BOSS_TUNING.impactMs[t] + BOSS_TUNING.afterImpactMs[t];
        run(st, now, lockUntil + 20);
        now = lockUntil + 20;
      });
      assert.ok(added <= 25000, 'tổng thời gian thêm ' + added + 'ms (>25000ms) qua ' + tiers.length + ' phép');
    });
  });
})();
