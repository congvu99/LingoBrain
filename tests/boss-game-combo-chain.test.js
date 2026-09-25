/* Test combo + thanh tuyệt kỹ + chuỗi niệm (js/boss-game-combo-chain.js) — hàm thuần + tích hợp qua createBattle. */
(function () {
  const G = (id, ans) => ({ key: id, prompt: '🐱 ' + id, answers: [ans || id], ids: [id], words: [] });
  const GROUPS = [G('cat'), G('dog'), G('sun'), G('elephant'), G('bee')];
  function mk(o) {
    o = o || {};
    return createBattle(Object.assign({
      monster: { id: 'goblin', hp: 1000, weak: 'fire' }, groups: GROUPS, tiers: new Map(),
      mods: modifiersFor(o.alloc || {}, o.el || 'fire'), hearts: 3, difficulty: 'normal', carryDmg: 0, rand: () => 0.99, now: 0
    }, o));
  }
  const type = (st, word, t0, gap) => word.split('').forEach((c, i) => typeKey(st, c, t0 + i * (gap || 10)));
  const types = st => st.events.map(e => e.type);
  function run(st, t0, t1) { for (let t = t0 + 16; t <= t1; t += 16) stepBattle(st, 16, t); }

  describe('combo-chain — hàm thuần', () => {
    it('bossChainFactor (chainWords=2): 0 → 0.5, 1 → 1, 2 → 1.5', () => {
      assert.equal(bossChainFactor(0), 0.5);
      assert.equal(bossChainFactor(1), 1);
      assert.equal(bossChainFactor(2), 1.5);
    });
    it('bossComboMul: trần comboCap 1.5, bước comboStep 0.05', () => {
      const st = { combo: 0 }; assert.equal(bossComboMul(st), 1);
      st.combo = 10; assert.near(bossComboMul(st), 1.5);
      st.combo = 100; assert.equal(bossComboMul(st), BOSS_TUNING.comboCap);
    });
    it('bossUltBoostCount: round(3×k), tối thiểu 1', () => {
      assert.equal(bossUltBoostCount(1), 3); assert.equal(bossUltBoostCount(1.5), 5); assert.equal(bossUltBoostCount(0.5), 2);
    });
    it('bossUltBoostCount(k, boosted): boosted → ceil(3×k) thay vì round (dạng tiến hoá cấp 16); mặc định (không truyền) vẫn round như cũ', () => {
      assert.equal(bossUltBoostCount(0.75, true), 3);    // ceil(2.25) = 3, round(2.25) sẽ là 2 — khác nhau rõ
      assert.equal(bossUltBoostCount(0.75), 2);           // không truyền boosted → hành vi CŨ giữ nguyên
      assert.equal(bossUltBoostCount(0.75, false), 2);
      assert.equal(bossUltBoostCount(1, true), 3);        // k=1 (không có dạng bonus) không đổi hiệu lực tuyệt kỹ cũ
    });
    it('bất biến: BOSS_TUNING.chainFactor phải có đúng chainWords+1 phần tử (retune chainWords mà quên nối thêm → bossChainFactor trả undefined → k=NaN)', () => {
      assert.equal(BOSS_TUNING.chainFactor.length, BOSS_TUNING.chainWords + 1);
    });
  });

  describe('evoUltBonus — cộng vào k chuỗi niệm, meteor/chain dùng ceil khi có bonus', () => {
    it('không có st.evoUltBonus (mọi trận cũ/không tiến hoá) → k/boost giữ NGUYÊN như trận không có dạng tiến hoá', () => {
      const st = mk({ alloc: {}, el: 'fire' }); st.ult = BOSS_TUNING.ultMax; useUltimate(st, 0);
      run(st, 10, 10 + BOSS_TUNING.chainMs + 50);   // hết giờ, chưa gõ từ nào (0 hit) → chainEnd theo timeout
      const end = st.events.find(e => e.type === 'chainEnd');
      assert.equal(end.k, 0.5);
      assert.equal(st.boost.left, bossUltBoostCount(0.5));   // round(1.5) = 2, giống hệt hành vi cũ
    });
    it('có st.evoUltBonus (dạng cấp 16, +0.25) → k cộng thêm bonus, meteor/chain dùng ceil để bonus luôn đổi số phép', () => {
      const st = mk({ alloc: {}, el: 'fire' }); st.ult = BOSS_TUNING.ultMax; st.evoUltBonus = 0.25; useUltimate(st, 0);
      run(st, 10, 10 + BOSS_TUNING.chainMs + 50);   // 0 hit → k = 0.5+0.25 = 0.75
      const end = st.events.find(e => e.type === 'chainEnd');
      assert.near(end.k, 0.75, 1e-9);
      assert.equal(st.boost.left, Math.ceil(3 * 0.75));   // 3, KHÁC round(2.25)=2 — bonus phải luôn có tác dụng
    });
    it('k=1 (1 của chainWords=2 từ, hiệu lực tuyệt kỹ cũ) VẪN giữ nguyên khi KHÔNG có dạng tiến hoá', () => {
      const st = mk({ alloc: {}, el: 'fire' }); st.ult = BOSS_TUNING.ultMax; useUltimate(st, 0);
      type(st, st.chain.words[0].answers[0], 10);   // 1/2 từ → hits=1 → k=1
      run(st, 10, st.chain ? 10 + BOSS_TUNING.chainMs + 50 : 10);   // hết giờ, không gõ từ thứ 2 → chainEnd theo timeout
      const end = st.events.find(e => e.type === 'chainEnd');
      assert.equal(end.k, 1);
      assert.equal(st.boost.left, 3);   // đúng bằng BOSS_BOOST_SPELLS cũ — không đổi khi không có bonus
    });
  });

  describe('rank3UltBonus (bậc 3 nhánh trường phái) — cộng vào k CÙNG đường với evoUltBonus, dùng chung ceil khi boosted', () => {
    it('rank < 3 → mods.ultBonus = 0, k không đổi so với không có dạng tiến hoá', () => {
      const st = mk({ alloc: { fire: 2 }, el: 'fire' }); st.ult = BOSS_TUNING.ultMax; useUltimate(st, 0);
      run(st, 10, 10 + BOSS_TUNING.chainMs + 50);   // 0 hit, không bonus → k=0.5
      const end = st.events.find(e => e.type === 'chainEnd');
      assert.equal(end.k, 0.5);
      assert.equal(st.boost.left, bossUltBoostCount(0.5));   // round, không ceil — không có bonus nào cả
    });
    it('rank 3 (trường phái đang chọn) → +rank3UltBonus (0.25) vào k, đếm là "boosted" (ceil)', () => {
      const st = mk({ alloc: { fire: 3 }, el: 'fire' }); st.ult = BOSS_TUNING.ultMax; useUltimate(st, 0);
      run(st, 10, 10 + BOSS_TUNING.chainMs + 50);   // 0 hit → k = 0.5 + 0.25 = 0.75
      const end = st.events.find(e => e.type === 'chainEnd');
      assert.near(end.k, 0.75, 1e-9);
      assert.equal(st.boost.left, Math.ceil(3 * 0.75));   // 3, KHÁC round(2.25)=2 — cùng luật boosted như evoUltBonus
    });
    it('rank 3 + dạng tiến hoá cấp 16 (evoUltBonus) → cộng dồn +0.5, vẫn 1 đường boosted duy nhất', () => {
      const st = mk({ alloc: { fire: 3 }, el: 'fire' }); st.ult = BOSS_TUNING.ultMax; st.evoUltBonus = 0.25; useUltimate(st, 0);
      run(st, 10, 10 + BOSS_TUNING.chainMs + 50);   // 0 hit → k = 0.5 + 0.25(rank3) + 0.25(evo) = 1
      const end = st.events.find(e => e.type === 'chainEnd');
      assert.near(end.k, 1, 1e-9);
      assert.equal(st.boost.left, Math.ceil(3 * 1));   // vẫn ceil (boosted=true vì tổng bonus > 0), không round
    });
    it('rank 3 ở nhánh KHÁC trường phái đang chọn → không cộng bonus (chỉ tính el đang active)', () => {
      const st = mk({ alloc: { ice: 3 }, el: 'fire' }); st.ult = BOSS_TUNING.ultMax; useUltimate(st, 0);
      run(st, 10, 10 + BOSS_TUNING.chainMs + 50);
      const end = st.events.find(e => e.type === 'chainEnd');
      assert.equal(end.k, 0.5);
      assert.equal(st.boost.left, bossUltBoostCount(0.5));
    });
  });

  describe('combo — cộng/giữ/reset', () => {
    it('cast không lỗi gõ → combo +1; cast có lỗi (typos>0 rồi vẫn niệm) → giữ NGUYÊN giá trị (không cộng thêm)', () => {
      const st = mk();
      type(st, 'cat', 0); assert.equal(st.combo, 1);
      typeKey(st, 'x', 700); type(st, 'dog', 710);   // 1 lỗi trước khi niệm đúng "dog" ở đề kế (đề đã sang "dog" sau khoá)
      assert.equal(st.combo, 1, 'cast có lỗi gõ tuyệt đối KHÔNG được cộng combo, phải giữ đúng 1');
      const dogCast = st.events.filter(e => e.type === 'cast').pop();
      assert.ok(dogCast && dogCast.element, '"dog" phải thực sự được niệm (event cast) để phép thử có ý nghĩa');
    });
    it('bị quái đánh trúng → combo về 0', () => {
      const st = mk({ hearts: 3 });
      type(st, 'cat', 0); assert.ok(st.combo > 0);
      run(st, 700, 11500);
      assert.includes(types(st), 'hurt'); assert.equal(st.combo, 0);
    });
    it('giveup → combo về 0', () => {
      const st = mk(); type(st, 'cat', 0); run(st, 700, 750);
      assert.ok(st.combo > 0); giveUp(st, 800); assert.equal(st.combo, 0);
    });
    it('fizzle (3 lỗi gõ) → combo về 0', () => {
      const st = mk(); type(st, 'cat', 0); run(st, 700, 750);
      assert.ok(st.combo > 0);
      ['x', 'y', 'z'].forEach((c, i) => typeKey(st, c, 800 + i));
      assert.includes(types(st), 'fizzle'); assert.equal(st.combo, 0);
    });
    it('khiên chặn KHÔNG reset combo (quyết định người dùng)', () => {
      const st = mk({ alloc: { earth: 2 }, el: 'fire' });
      type(st, 'cat', 0); const before = st.combo; run(st, 700, 11500);
      assert.includes(types(st), 'shieldBlock'); assert.equal(st.combo, before);
    });
    it('sát thương phép nhân theo combo (spellDamage nhận o.combo)', () => {
      const st = mk({ el: 'fire' });
      for (let i = 0; i < 3; i++) { type(st, GROUPS[i % GROUPS.length].answers[0], i * 700); run(st, i * 700, i * 700 + 650); }
      const c3 = st.events.filter(e => e.type === 'cast')[2];
      const mul = Math.min(BOSS_TUNING.comboCap, 1 + BOSS_TUNING.comboStep * 2);
      assert.near(c3.dmg / mul, spellDamage({ tier: 1, speed: 2, weakHit: true, mods: st.mods }), 1);
    });
  });

  describe('thanh tuyệt kỹ (st.ult)', () => {
    it('+1 mỗi cast đúng; +1 nữa nếu không lỗi gõ và tốc độ ≥ 1,5 → đầy phát ultFull', () => {
      const st = mk({ el: 'fire' });
      type(st, 'cat', 0);   // gõ nhanh (gap 10ms) → speed tối đa 2 ≥ 1.5 → +2
      assert.equal(st.ult, 2);
      assert.ok(!types(st).includes('ultFull'));
    });
    it('giveup: không còn trừ thanh tuyệt kỹ (chỉ không được cộng)', () => {
      const st = mk(); st.ult = 5; giveUp(st, 0); assert.equal(st.ult, 5);
    });
    it('tuyệt kỹ khi ult chưa đầy → không dùng được', () => assert.equal(useUltimate(mk({ alloc: {}, el: 'fire' }), 0), false));
  });

  describe('chuỗi niệm — kích hoạt + gõ', () => {
    const ready = () => { const st = mk({ alloc: {}, el: 'fire' }); st.ult = BOSS_TUNING.ultMax; return st; };
    it('useUltimate mở st.chain (chainWords=2 từ kế, không lặp đề đang hiện), reset ult, không áp hiệu lực ngay', () => {
      const st = ready(); const cur = st.group;
      assert.ok(useUltimate(st, 0));
      assert.equal(st.ult, 0);
      assert.ok(st.chain); assert.equal(st.chain.words.length, BOSS_TUNING.chainWords); assert.equal(st.chain.hits, 0);
      assert.ok(st.chain.words.every(g => g !== cur));
      assert.ok(!types(st).includes('ultimate'), 'chưa áp hiệu lực lúc vừa kích hoạt');
    });
    it('gõ trọn từng từ trong chuỗi → chainHit, sang từ kế; gõ sai → không fizzle, không threat', () => {
      const st = ready(); useUltimate(st, 0);
      const before = st.threat, w0 = st.chain.words[0].answers[0];
      typeKey(st, 'ZZZ'.charAt(0), 10);   // chữ chắc chắn sai (không phải chữ đầu của w0 hầu hết trường hợp thực tế)
      assert.equal(st.threat, before, 'gõ sai trong chuỗi không cộng threat');
      assert.ok(!types(st).includes('fizzle'));
      type(st, w0, 20);
      assert.includes(types(st), 'chainHit'); assert.equal(st.chain.hits, 1); assert.equal(st.chain.i, 1);
    });
    it('mỗi từ chuỗi gõ trọn gây 1 đòn sát thương ở bậc cao nhất trong chuỗi, KHÔNG tính tốc độ gõ — sát thương/tier đi qua event impact thật (FX/phản ứng quái dùng chung đường phép thường)', () => {
      const st = ready(); useUltimate(st, 0);
      const hpBefore = st.hp, tier = st.chain.tier, w0 = st.chain.words[0].answers[0];
      const expected = spellDamage({ tier, speed: 1, weakHit: st.monster.weak === st.mods.element, mods: st.mods, combo: bossComboMul(st) });
      type(st, w0, 10);   // gõ CHẬM (gap mặc định 10ms/chữ vẫn nhanh, nhưng công thức cố tình bỏ speed) → dmg không đổi dù nhanh/chậm
      const evs = st.events, iChain = evs.findIndex(e => e.type === 'chainHit'), iImpact = evs.findIndex(e => e.type === 'impact');
      assert.ok(iChain >= 0 && iImpact >= 0, 'phải có cả chainHit (tiến độ UI) lẫn impact (sát thương/FX thật)');
      assert.ok(iChain < iImpact, 'thứ tự event: chainHit rồi mới tới impact');
      const impact = evs[iImpact];
      assert.equal(impact.dmg, expected, 'sát thương = spellDamage bậc cao nhất trong chuỗi, speed cố định 1');
      assert.equal(impact.tier, tier);
      assert.equal(impact.hp, st.hp, 'impact.hp phải khớp HP quái NGAY sau đòn (giống impact phép thường)');
      assert.equal(evs[iChain].dmg, undefined, 'chainHit không còn mang dmg/tier — chỉ dùng cho UI tiến độ chuỗi');
      assert.near(hpBefore - st.hp, expected, 1e-6, 'HP quái phải giảm đúng bằng sát thương của đòn');
    });
    it('quái chết GIỮA chuỗi (chainHit hạ hết HP) → thắng ngay theo luồng wonAt thường (impact.hp=0), xoá st.chain, KHÔNG áp tuyệt kỹ', () => {
      const st = ready();
      st.hp = 1; st.hpMax = 1; st.monster.hp = 1;   // 1 HP: đòn chuỗi đầu tiên chắc chắn hạ gục
      useUltimate(st, 0);
      const w0 = st.chain.words[0].answers[0];
      type(st, w0, 10);
      assert.equal(st.hp, 0);
      const impact = st.events.find(e => e.type === 'impact');
      assert.ok(impact && impact.hp <= 0, 'impact.hp <= 0 → sprite-actors tan xác NGAY (bossMonsterDissolve), không chờ won');
      assert.equal(st.chain, null, 'chain phải được xoá ngay khi quái chết giữa chuỗi');
      assert.ok(st.wonAt > 0, 'phải đi theo luồng thắng bình thường (wonAt), không thắng tức thì');
      assert.ok(!types(st).includes('ultimate'), 'quái đã chết thì KHÔNG được áp hiệu lực tuyệt kỹ nữa');
      run(st, 20, st.wonAt + 50);
      assert.equal(st.phase, 'won');
    });
    it('gõ trọn cả 2 từ (chainWords) → k=1.5, "HOÀN HẢO" → chainEnd rồi áp tuyệt kỹ + mở cắt cảnh', () => {
      const st = ready(); useUltimate(st, 0);
      let t = 10;
      st.chain.words.slice().forEach(g => { type(st, g.answers[0], t); t += 200; });
      assert.equal(st.chain, null, 'chuỗi đã kết thúc');
      const end = st.events.find(e => e.type === 'chainEnd');
      assert.equal(end.hits, 2); assert.equal(end.k, 1.5);
      assert.includes(types(st), 'ultimate');
      assert.equal(st.boost.left, bossUltBoostCount(1.5));
    });
    it('hết chainMs chưa gõ từ nào → chainEnd theo số từ đã trúng (timeout, hits=0 → k=0.5)', () => {
      const st = ready(); useUltimate(st, 0);
      run(st, 200, 200 + BOSS_TUNING.chainMs + 50);
      assert.equal(st.chain, null);
      const end = st.events.find(e => e.type === 'chainEnd');
      assert.equal(end.hits, 0); assert.equal(end.k, 0.5);
    });
    it('hết chainMs mới gõ 1/2 từ → chainEnd theo timeout với hits=1 → k=1 (hiệu lực tuyệt kỹ cũ)', () => {
      const st = ready(); useUltimate(st, 0);
      type(st, st.chain.words[0].answers[0], 10);   // đúng 1/2 từ
      run(st, 200, 200 + BOSS_TUNING.chainMs + 50);
      assert.equal(st.chain, null);
      const end = st.events.find(e => e.type === 'chainEnd');
      assert.equal(end.hits, 1); assert.equal(end.k, 1);
    });
    it('thanh tấn công + DoT đứng yên trong lúc chuỗi', () => {
      const st = ready(); useUltimate(st, 0);
      const before = st.threat;
      run(st, 10, 5000);
      assert.near(st.threat, before, 1e-9);
    });
    it('kích hoạt chuỗi giữa lúc đang chậm thời gian (timeScale < 1) → về lại 1 ngay, không dính chậm suốt chuỗi', () => {
      const st = ready(); st.timeScale = BOSS_TUNING.slowScale;
      useUltimate(st, 0);
      assert.equal(st.timeScale, 1);
    });
    it('giveup trong chuỗi bị bỏ qua (không đổi gì)', () => {
      const st = ready(); useUltimate(st, 0);
      const ultBefore = st.ult; giveUp(st, 10);
      assert.equal(st.ult, ultBefore); assert.ok(st.chain);
    });
    it('tạm dừng trong chuỗi: resumeBattle dời st.chain.until đúng khoảng dừng', () => {
      const st = ready(); useUltimate(st, 0);
      const until0 = st.chain.until;
      pauseBattle(st, 100); resumeBattle(st, 5100);
      assert.near(st.chain.until, until0 + 5000, 1e-9);
    });
    it('k=1 (1 của chainWords=2 từ trúng) tái tạo NGUYÊN VẸN hiệu lực tuyệt kỹ cũ — Lửa: 3 phép cường hoá (BOSS_BOOST_SPELLS)', () => {
      const st = ready(); useUltimate(st, 0);
      let t = 10;
      st.chain.words.slice(0, 1).forEach(g => { type(st, g.answers[0], t); t += 200; });   // 1/2 từ → k=1
      run(st, t, t + BOSS_TUNING.chainMs + 50);   // hết giờ, không gõ từ thứ 2
      assert.equal(st.boost.id, 'meteor'); assert.equal(st.boost.left, BOSS_BOOST_SPELLS);
    });
    it('k=1 Kỷ băng hà: dừng thanh tấn công đúng BOSS_ICE_AGE_MS như cũ', () => {
      const st = mk({ alloc: {}, el: 'ice' }); st.ult = BOSS_TUNING.ultMax;
      useUltimate(st, 0);
      let t = 10;
      st.chain.words.slice(0, 1).forEach(g => { type(st, g.answers[0], t); t += 200; });
      run(st, t, t + BOSS_TUNING.chainMs + 50);
      const end = st.events.find(e => e.type === 'ultimate');
      assert.near(st.frozenUntil, end.until + BOSS_ICE_AGE_MS, 1e-6);
    });
    it('k=1 Hồi sinh: hồi đầy đúng như cũ (không cộng thêm khiên)', () => {
      const st = mk({ alloc: {}, el: 'earth' }); st.hearts = 1; st.ult = BOSS_TUNING.ultMax;
      const shieldBefore = st.shield;   // earth bậc 2 đã cho khiên nội tại sẵn — tuyệt kỹ k=1 KHÔNG cộng thêm
      useUltimate(st, 0);
      let t = 10;
      st.chain.words.slice(0, 1).forEach(g => { type(st, g.answers[0], t); t += 200; });
      run(st, t, t + BOSS_TUNING.chainMs + 50);
      assert.equal(st.hearts, st.heartsMax); assert.equal(st.shield, shieldBefore);
    });
    it('k=1 Lốc xoáy: threat 0, không khiên, không đóng băng thêm', () => {
      const st = mk({ alloc: {}, el: 'wind' }); st.threat = 0.7; st.ult = BOSS_TUNING.ultMax;
      useUltimate(st, 0);
      let t = 10;
      st.chain.words.slice(0, 1).forEach(g => { type(st, g.answers[0], t); t += 200; });
      run(st, t, t + BOSS_TUNING.chainMs + 50);
      assert.equal(st.threat, 0); assert.equal(st.shield, 0);
      assert.ok(!st.frozen, 'k=1 không được đóng băng thêm — đúng hiệu lực cũ');
    });
  });

  describe('tornado/revive đổi theo k>1 (H1 review: rank3/evo phải LUÔN có hiệu lực thấy được, kể cả Gió/Đất) — ' +
    'k=1 giữ NGUYÊN hiệu lực cũ (không khiên/không đóng băng thêm), k>1 mới tăng dần', () => {
    const mkSt = extra => Object.assign({ hearts: 1, heartsMax: 3, shield: 0, threat: 0.7, frozen: false, frozenUntil: 0,
      typed: '', armedAt: 0, ultEnd: false, lockUntil: 0, lockNext: false, timeScale: 1, events: [] }, extra);
    [[1, 0], [1.25, 1000], [1.5, 2000], [1.75, 3000]].forEach(([k, freezeMs]) => {
      it('Lốc xoáy k=' + k + ' → đóng băng thêm ' + (freezeMs / 1000) + 's (tornadoFreezeSecPerK×(k−1))', () => {
        const st = mkSt();
        bossApplyUltimate(st, 'tornado', k, 0, true, false);
        assert.equal(st.threat, 0, 'threat luôn về 0 bất kể k');
        if (freezeMs > 0) {
          assert.ok(st.frozen);
          assert.near(st.frozenUntil, BOSS_TUNING.ultimateMs + freezeMs, 1e-6);
        } else {
          assert.ok(!st.frozen, 'k=1 không đóng băng thêm — đúng hiệu lực cũ');
        }
      });
    });
    [[1, 0], [1.25, 1], [1.5, 1], [1.75, 2]].forEach(([k, shieldAdd]) => {
      it('Hồi sinh k=' + k + ' → +' + shieldAdd + ' khiên (reviveShieldK1/K2)', () => {
        const st = mkSt({ shield: 0 });
        bossApplyUltimate(st, 'revive', k, 0, true, false);
        assert.equal(st.shield, Math.min(BOSS_TUNING.shieldCap, shieldAdd));
      });
    });
    it('Hồi sinh: khiên cộng thêm vẫn kẹp shieldCap dù đã có khiên sẵn', () => {
      const st = mkSt({ shield: BOSS_TUNING.shieldCap });
      bossApplyUltimate(st, 'revive', 1.75, 0, true, false);
      assert.equal(st.shield, BOSS_TUNING.shieldCap);
    });
  });

  describe('perfect (nhãn "HOÀN HẢO") quyết theo hits, KHÔNG theo k — bonus chỉ được tăng SỐ, không giả nhãn (H2 review)', () => {
    it('rank3 + dạng cấp 16 (evo) + chỉ gõ 1/2 từ → k chạm 1.5 (ngưỡng "HOÀN HẢO" cũ) NHƯNG perfect=false; số liệu (khiên) vẫn cộng theo k, chỉ nhãn bị chặn', () => {
      const st = mk({ alloc: { earth: 3 }, el: 'earth' }); st.hearts = 1; st.ult = BOSS_TUNING.ultMax; st.evoUltBonus = 0.25;
      const shieldBefore = st.shield;   // earth bậc 2 đã cho khiên nội tại sẵn (=1)
      useUltimate(st, 0);
      type(st, st.chain.words[0].answers[0], 10);   // chỉ 1/2 từ
      run(st, 10, 10 + BOSS_TUNING.chainMs + 50);    // hết giờ, không gõ từ thứ 2
      const end = st.events.find(e => e.type === 'chainEnd'), ult = st.events.find(e => e.type === 'ultimate');
      assert.near(end.k, 1.5, 1e-9, 'rank3 (0.25) + evo (0.25) + hits=1 (k cơ bản 1) = 1.5');
      assert.equal(end.perfect, false, 'chỉ gõ 1/2 từ → không phải HOÀN HẢO dù k chạm mốc 1.5 cũ');
      assert.equal(ult.perfect, false);
      assert.equal(st.shield, Math.min(BOSS_TUNING.shieldCap, shieldBefore + 1), 'k=1.5 ≥ reviveShieldK1 → vẫn +1 khiên — bonus tăng SỐ dù nhãn không phải HOÀN HẢO');
    });
    it('gõ ĐỦ cả chainWords từ (không bonus) → k=1.5 và perfect=true — HOÀN HẢO đúng nghĩa khi gõ đủ', () => {
      const st = mk({ alloc: {}, el: 'fire' }); st.ult = BOSS_TUNING.ultMax; useUltimate(st, 0);
      let t = 10;
      st.chain.words.slice().forEach(g => { type(st, g.answers[0], t); t += 200; });
      const end = st.events.find(e => e.type === 'chainEnd'), ult = st.events.find(e => e.type === 'ultimate');
      assert.equal(end.hits, BOSS_TUNING.chainWords); assert.equal(end.perfect, true); assert.equal(ult.perfect, true);
    });
  });

  describe('pool nhỏ: chuỗi niệm LUÔN đủ chainWords từ, lặp lại khi thiếu đề khác (M1 review — chuỗi rỗng từng khiến 12s trôi qua không gõ được gì)', () => {
    const mkSmall = groups => createBattle({
      monster: { id: 'goblin', hp: 1000, weak: 'fire' }, groups, tiers: new Map(),
      mods: modifiersFor({}, 'fire'), hearts: 3, difficulty: 'normal', carryDmg: 0, rand: () => 0.99, now: 0
    });
    it('pool chỉ 1 đề (= đề đang hiện, không còn đề nào khác) → chuỗi vẫn đủ chainWords từ, lặp lại chính đề đang hiện', () => {
      const only = G('only');
      const st = mkSmall([only]); st.ult = BOSS_TUNING.ultMax;
      assert.ok(useUltimate(st, 0));
      assert.equal(st.chain.words.length, BOSS_TUNING.chainWords);
      assert.ok(st.chain.words.every(g => g === only), 'không còn đề nào khác → phải lặp lại chính đề đang hiện');
      // gõ hết cả chainWords lần (cùng 1 từ lặp lại) → chuỗi kết bình thường, không kẹt/không rỗng
      let t = 10; st.chain.words.slice().forEach(() => { type(st, only.answers[0], t); t += 200; });
      assert.equal(st.chain, null); assert.includes(types(st), 'ultimate');
    });
    it('pool 2 đề (1 đề khác ngoài đề đang hiện) → chuỗi vẫn đủ chainWords từ bằng cách lặp lại đề KHÁC đó, không phải đề đang hiện', () => {
      const a = G('aa'), b = G('bb');
      const st = mkSmall([a, b]); st.ult = BOSS_TUNING.ultMax;
      const cur = st.group;   // 'a' (đề đầu tiên bossNextPrompt chọn)
      assert.ok(useUltimate(st, 0));
      assert.equal(st.chain.words.length, BOSS_TUNING.chainWords);
      assert.ok(st.chain.words.every(g => g !== cur), 'còn 1 đề khác hợp lệ → ưu tiên lặp lại đề đó, không lặp đề đang hiện');
    });
  });

  describe('ultCooldownMs — hồi chiêu sau tuyệt kỹ: 6s KHÔNG được cộng thanh tuyệt kỹ từ bất kỳ nguồn nào (cân bằng Gió)', () => {
    it('bossComboOnCast: đang hồi chiêu (now < ultCooldownUntil) → combo vẫn +1 như thường, NHƯNG st.ult không cộng', () => {
      const st = { typos: 0, combo: 0, ult: 0, ultCooldownUntil: 5000, mods: { ultimate: 'meteor' }, events: [] };
      bossComboOnCast(st, 2, 1000);   // now=1000 < ultCooldownUntil=5000 → đang hồi chiêu
      assert.equal(st.combo, 1, 'combo không bị hồi chiêu chặn, chỉ thanh tuyệt kỹ');
      assert.equal(st.ult, 0, 'đang hồi chiêu → không được cộng thanh tuyệt kỹ');
    });
    it('bossComboOnCast: hết hồi chiêu (now ≥ ultCooldownUntil) → cộng lại bình thường', () => {
      const st = { typos: 0, combo: 0, ult: 0, ultCooldownUntil: 5000, mods: { ultimate: 'meteor' }, events: [] };
      bossComboOnCast(st, 2, 5000);
      assert.equal(st.ult, 2, 'hết hồi chiêu → cộng +1 (không lỗi) +1 (tốc độ ≥1,5) như thường');
    });
    it('bossComboOnCast: không có ultCooldownUntil (0, trận mới/chưa dùng tuyệt kỹ lần nào) → cộng bình thường', () => {
      const st = { typos: 0, combo: 0, ult: 0, ultCooldownUntil: 0, mods: { ultimate: 'meteor' }, events: [] };
      bossComboOnCast(st, 1, 999999);
      assert.equal(st.ult, 1);
    });
    it('ultAdd (chiêu tự phát, js/boss-game-skill-pick.js) cũng bị chặn trong lúc hồi chiêu — cùng luật với cast thường', () => {
      const st = { ult: 0, ultCooldownUntil: 5000, heartsMax: 3, hearts: 3, shield: 0, mods: { ultimate: 'meteor' }, events: [] };
      bossApplySkillEffect(st, { effect: { ultAdd: 5 } }, 10, false, 1000);   // now=1000 < 5000 → đang hồi chiêu
      assert.equal(st.ult, 0, 'ultAdd không được cộng trong lúc hồi chiêu');
    });
    it('ultAdd sau khi hết hồi chiêu → cộng bình thường, kẹp ultMax', () => {
      const st = { ult: 0, ultCooldownUntil: 5000, heartsMax: 3, hearts: 3, shield: 0, mods: { ultimate: 'meteor' }, events: [] };
      bossApplySkillEffect(st, { effect: { ultAdd: 5 } }, 10, false, 5000);
      assert.equal(st.ult, BOSS_TUNING.ultMax, 'cộng bình thường rồi kẹp ultMax');
    });
    it('tích hợp qua createBattle: dùng tuyệt kỹ xong → 6s battle-time kế tiếp niệm phép KHÔNG cộng thanh tuyệt kỹ, sau 6s thì cộng lại', () => {
      const st = mk({ alloc: {}, el: 'fire' }); st.ult = BOSS_TUNING.ultMax;
      useUltimate(st, 0);
      let t = 10; st.chain.words.slice().forEach(g => { type(st, g.answers[0], t); t += 200; });   // gõ hết chuỗi → áp tuyệt kỹ ngay
      const ult = st.events.find(e => e.type === 'ultimate');
      assert.ok(ult, 'phải đã áp tuyệt kỹ'); assert.equal(st.ult, 0);
      const cutsceneEnd = ult.until;
      run(st, t, cutsceneEnd + BOSS_TUNING.ultimateMs + 50);   // qua hết khoá cắt cảnh
      const readyAt = st.readyAt || cutsceneEnd;
      type(st, st.group.answers[0], readyAt + 20);   // niệm 1 phép NGAY sau cắt cảnh — vẫn trong 6s hồi chiêu
      assert.equal(st.ult, 0, 'vẫn đang hồi chiêu ngay sau cắt cảnh → không được cộng');
      const afterCooldown = cutsceneEnd + BOSS_TUNING.ultCooldownMs + 50;
      run(st, readyAt + 20, afterCooldown);
      type(st, st.group.answers[0], afterCooldown + 20);   // niệm phép SAU khi hết 6s hồi chiêu
      assert.ok(st.ult > 0, 'hết hồi chiêu → thanh tuyệt kỹ cộng lại bình thường');
    });
    it('tạm dừng dời ultCooldownUntil đúng khoảng dừng (giống lockUntil/frozenUntil/wonAt)', () => {
      const st = mk({ alloc: {}, el: 'fire' }); st.ult = BOSS_TUNING.ultMax;
      useUltimate(st, 0);
      let t = 10; st.chain.words.slice().forEach(g => { type(st, g.answers[0], t); t += 200; });
      const until0 = st.ultCooldownUntil;
      assert.ok(until0 > 0, 'phải đã đặt hồi chiêu sau khi áp tuyệt kỹ');
      pauseBattle(st, t + 100); resumeBattle(st, t + 5100);   // dừng 5000ms
      assert.near(st.ultCooldownUntil, until0 + 5000, 1e-9);
    });
  });

  describe('bố cục HUD chuỗi niệm — không đè lên HUD trên cùng ở khung hẹp', () => {
    // Khối HUD trên cùng (ô tuyệt kỹ/tim/tên quái, boss-game-render.js:drawBossHud) cao cố định tới y=46 bất kể
    // bề rộng màn hình — kiểm ở 3 cỡ tiêu biểu (điện thoại hẹp nhất ~360px, tablet, desktop).
    [360, 600, 900].forEach(w => {
      it('w=' + w + ': thanh chuỗi + tiêu đề vẽ hẳn dưới y=46 (mép dưới HUD trên cùng)', () => {
        const L = bossChainHudLayout(w);
        const titleTextTop = L.y - 6 - 13;   // baseline tiêu đề (y−6) trừ chiều cao chữ ước lượng (font 13px)
        assert.ok(titleTextTop > 46, 'w=' + w + ': titleTextTop=' + titleTextTop + ' phải > 46');
        assert.ok(L.x >= 0 && L.x + L.bw <= w, 'thanh chuỗi phải nằm trong bề rộng màn hình');
      });
    });
  });
})();
