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
    it('bossChainFactor: 0–1 → 0.5, 2 → 1, 3 → 1.5', () => {
      assert.equal(bossChainFactor(0), 0.5); assert.equal(bossChainFactor(1), 0.5);
      assert.equal(bossChainFactor(2), 1); assert.equal(bossChainFactor(3), 1.5);
    });
    it('bossComboMul: trần comboCap 1.5, bước comboStep 0.05', () => {
      const st = { combo: 0 }; assert.equal(bossComboMul(st), 1);
      st.combo = 10; assert.near(bossComboMul(st), 1.5);
      st.combo = 100; assert.equal(bossComboMul(st), BOSS_TUNING.comboCap);
    });
    it('bossUltBoostCount: round(3×k), tối thiểu 1', () => {
      assert.equal(bossUltBoostCount(1), 3); assert.equal(bossUltBoostCount(1.5), 5); assert.equal(bossUltBoostCount(0.5), 2);
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
    it('giveup: ult −2 (giữ luật cũ)', () => {
      const st = mk(); st.ult = 5; giveUp(st, 0); assert.equal(st.ult, 3);
    });
    it('tuyệt kỹ khi ult chưa đầy → không dùng được', () => assert.equal(useUltimate(mk({ alloc: { fire: 3 }, el: 'fire' }), 0), false));
  });

  describe('chuỗi niệm — kích hoạt + gõ', () => {
    const ready = () => { const st = mk({ alloc: { fire: 3 }, el: 'fire' }); st.ult = BOSS_TUNING.ultMax; return st; };
    it('useUltimate mở st.chain (3 từ kế, không lặp đề đang hiện), reset ult, không áp hiệu lực ngay', () => {
      const st = ready(); const cur = st.group;
      assert.ok(useUltimate(st, 0));
      assert.equal(st.ult, 0);
      assert.ok(st.chain); assert.equal(st.chain.words.length, 3); assert.equal(st.chain.hits, 0);
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
    it('gõ trọn cả 3 từ (k=1.5, "HOÀN HẢO") → chainEnd rồi áp tuyệt kỹ + mở cắt cảnh', () => {
      const st = ready(); useUltimate(st, 0);
      let t = 10;
      st.chain.words.slice().forEach(g => { type(st, g.answers[0], t); t += 200; });
      assert.equal(st.chain, null, 'chuỗi đã kết thúc');
      const end = st.events.find(e => e.type === 'chainEnd');
      assert.equal(end.hits, 3); assert.equal(end.k, 1.5);
      assert.includes(types(st), 'ultimate');
      assert.equal(st.boost.left, bossUltBoostCount(1.5));
    });
    it('hết 9s chưa gõ xong 3 từ → chainEnd theo số từ đã trúng (timeout)', () => {
      const st = ready(); useUltimate(st, 0);
      type(st, st.chain.words[0].answers[0], 10);   // đúng 1 từ
      run(st, 200, 200 + BOSS_TUNING.chainMs + 50);
      assert.equal(st.chain, null);
      const end = st.events.find(e => e.type === 'chainEnd');
      assert.equal(end.hits, 1); assert.equal(end.k, 0.5);
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
    it('k=1 (2/3 từ trúng) tái tạo NGUYÊN VẸN hiệu lực tuyệt kỹ cũ — Lửa: 3 phép cường hoá (BOSS_BOOST_SPELLS)', () => {
      const st = ready(); useUltimate(st, 0);
      let t = 10;
      st.chain.words.slice(0, 2).forEach(g => { type(st, g.answers[0], t); t += 200; });   // 2/3 từ → k=1
      run(st, t, t + BOSS_TUNING.chainMs + 50);   // hết giờ, không gõ từ thứ 3
      assert.equal(st.boost.id, 'meteor'); assert.equal(st.boost.left, BOSS_BOOST_SPELLS);
    });
    it('k=1 Kỷ băng hà: dừng thanh tấn công đúng BOSS_ICE_AGE_MS như cũ', () => {
      const st = mk({ alloc: { ice: 3 }, el: 'ice' }); st.ult = BOSS_TUNING.ultMax;
      useUltimate(st, 0);
      let t = 10;
      st.chain.words.slice(0, 2).forEach(g => { type(st, g.answers[0], t); t += 200; });
      run(st, t, t + BOSS_TUNING.chainMs + 50);
      const end = st.events.find(e => e.type === 'ultimate');
      assert.near(st.frozenUntil, end.until + BOSS_ICE_AGE_MS, 1e-6);
    });
    it('k=1 Hồi sinh: hồi đầy đúng như cũ (không cộng thêm khiên)', () => {
      const st = mk({ alloc: { earth: 3 }, el: 'earth' }); st.hearts = 1; st.ult = BOSS_TUNING.ultMax;
      const shieldBefore = st.shield;   // earth bậc 2 đã cho khiên nội tại sẵn — tuyệt kỹ k=1 KHÔNG cộng thêm
      useUltimate(st, 0);
      let t = 10;
      st.chain.words.slice(0, 2).forEach(g => { type(st, g.answers[0], t); t += 200; });
      run(st, t, t + BOSS_TUNING.chainMs + 50);
      assert.equal(st.hearts, st.heartsMax); assert.equal(st.shield, shieldBefore);
    });
    it('k=1 Lốc xoáy: threat 0, không khiên', () => {
      const st = mk({ alloc: { wind: 3 }, el: 'wind' }); st.threat = 0.7; st.ult = BOSS_TUNING.ultMax;
      useUltimate(st, 0);
      let t = 10;
      st.chain.words.slice(0, 2).forEach(g => { type(st, g.answers[0], t); t += 200; });
      run(st, t, t + BOSS_TUNING.chainMs + 50);
      assert.equal(st.threat, 0); assert.equal(st.shield, 0);
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
