/* Test chọn/áp 35 chiêu tự phát (js/boss-game-skill-roster.js, js/boss-game-skill-pick.js) + tích hợp qua
   boss-game-logic.js/combo-chain.js castComplete/bossChainHit. Tests Before (TDD): sát thương phép
   basic (không chiêu đặc biệt) ở cấp 1 phải bằng ĐÚNG sát thương hiện tại (spellDamage thường, không nhân gì
   thêm) — xem test đầu tiên dưới đây. */
(function () {
  const G = (id, ans) => ({ key: id, prompt: '🐱 ' + id, answers: [ans || id], ids: [id], words: [] });
  const GROUPS = [G('cat'), G('dog'), G('sun'), G('elephant'), G('bee'), G('owl')];
  function mk(o) {
    o = o || {};
    return createBattle(Object.assign({
      monster: { id: 'goblin', hp: 1000, weak: 'fire' }, groups: GROUPS, tiers: new Map(),
      mods: modifiersFor(o.alloc || {}, o.el || 'fire'), hearts: 3, difficulty: 'normal', carryDmg: 0, rand: () => 0.99, now: 0
    }, o));
  }
  const type = (st, word, t0, gap) => word.split('').forEach((c, i) => typeKey(st, c, t0 + i * (gap || 10)));
  const types = st => st.events.map(e => e.type);
  const casts = st => st.events.filter(e => e.type === 'cast');
  function run(st, t0, t1) { for (let t = t0 + 16; t <= t1; t += 16) stepBattle(st, 16, t); }

  describe('Tests Before — sát thương basic ở cấp 1 = sát thương hiện tại (không đổi)', () => {
    ['fire', 'ice', 'storm', 'earth', 'wind'].forEach(el => {
      it('hệ ' + el + ': cấp mặc định (1) → dmg = spellDamage thường, không skill nào áp', () => {
        const st = mk({ el });
        type(st, 'cat', 0);
        const c = casts(st)[0];
        assert.equal(c.dmg, spellDamage({ tier: 1, speed: 2, weakHit: st.monster.weak === el, mods: st.mods, combo: 1 }));
        assert.equal(c.skill, null, 'basic không có fx → skill id rỗng trên event');
      });
    });
  });

  describe('BOSS_SKILLS — toàn vẹn dữ liệu (35 chiêu)', () => {
    it('đủ 5 hệ × 7 slot, mỗi skill có id/name/icon/effect; basic fx=null, còn lại fx có trong BOSS_SKILL_FX', () => {
      BOSS_ELEMENTS.forEach(el => {
        BOSS_SKILL_SLOTS.forEach(slot => {
          const s = BOSS_SKILLS[el][slot];
          assert.ok(s && s.id && s.name && s.icon && s.effect, el + '/' + slot + ' thiếu trường');
          if (slot === 'basic') assert.equal(s.fx, null);
          else assert.ok(BOSS_SKILL_FX[s.fx], el + '/' + slot + ': fx key "' + s.fx + '" không có trong BOSS_SKILL_FX');
        });
      });
    });
    it('mở cấp đúng bảng: 1,2,3,4,6,8,10', () => {
      assert.deepEqual(BOSS_SKILL_UNLOCK_LEVEL, { basic: 1, combo3: 2, long: 3, fast: 4, combo6: 6, execute: 8, counter: 10 });
    });
  });

  describe('bossPickSkill — khoá theo cấp + điều kiện + ưu tiên tất định', () => {
    const T = BOSS_SKILLS.fire;
    it('cấp 1: mọi ctx đều chỉ ra basic (mọi slot khác chưa mở)', () => {
      const ctx = { combo: 6, letters: 20, speed: 2, hpRatio: 0.1, afterHit: true };
      assert.equal(bossPickSkill(ctx, 'fire', 1), T.basic);
    });
    it('combo3 mở ở cấp 2, kích khi combo bội số 3 (không phải 0)', () => {
      assert.equal(bossPickSkill({ combo: 3, letters: 1, speed: 1, hpRatio: 1 }, 'fire', 2), T.combo3);
      assert.equal(bossPickSkill({ combo: 0, letters: 1, speed: 1, hpRatio: 1 }, 'fire', 2), T.basic, 'combo=0 không tính là bội số 3');
    });
    it('long mở cấp 3 (từ ≥ 8 chữ); fast mở cấp 4 (speed ≥ 2)', () => {
      assert.equal(bossPickSkill({ combo: 0, letters: 8, speed: 1, hpRatio: 1 }, 'fire', 3), T.long);
      assert.equal(bossPickSkill({ combo: 0, letters: 7, speed: 1, hpRatio: 1 }, 'fire', 3), T.basic, '7 chữ chưa đủ dài');
      assert.equal(bossPickSkill({ combo: 0, letters: 1, speed: 2, hpRatio: 1 }, 'fire', 4), T.fast);
    });
    it('combo6 mở cấp 6; execute mở cấp 8 (HP < 30%); counter mở cấp 10 (afterHit)', () => {
      assert.equal(bossPickSkill({ combo: 6, letters: 1, speed: 1, hpRatio: 1 }, 'fire', 6), T.combo6);
      assert.equal(bossPickSkill({ combo: 0, letters: 1, speed: 1, hpRatio: 0.29 }, 'fire', 8), T.execute);
      assert.equal(bossPickSkill({ combo: 0, letters: 1, speed: 1, hpRatio: 1, afterHit: true }, 'fire', 10), T.counter);
    });
    it('chưa đủ cấp thì rớt về basic dù ctx khớp điều kiện slot cao hơn', () => {
      assert.equal(bossPickSkill({ combo: 0, letters: 1, speed: 1, hpRatio: 0.1 }, 'fire', 7), T.basic, 'execute cần cấp 8');
      assert.equal(bossPickSkill({ combo: 0, letters: 1, speed: 1, hpRatio: 1, afterHit: true }, 'fire', 9), T.basic, 'counter cần cấp 10');
    });
    it('ưu tiên tất định khi nhiều slot cùng khớp: execute > counter > combo6 > long > fast > combo3 > basic', () => {
      const ctx = { combo: 6, letters: 10, speed: 2, hpRatio: 0.1, afterHit: true };   // khớp execute/counter/combo6/long/fast/combo3
      assert.equal(bossPickSkill(ctx, 'fire', 10), T.execute);
      assert.equal(bossPickSkill(Object.assign({}, ctx, { hpRatio: 1 }), 'fire', 10), T.counter);
      assert.equal(bossPickSkill(Object.assign({}, ctx, { hpRatio: 1, afterHit: false }), 'fire', 10), T.combo6);
      assert.equal(bossPickSkill(Object.assign({}, ctx, { hpRatio: 1, afterHit: false, combo: 2 }), 'fire', 10), T.long);
      assert.equal(bossPickSkill(Object.assign({}, ctx, { hpRatio: 1, afterHit: false, combo: 2, letters: 3 }), 'fire', 10), T.fast);
      assert.equal(bossPickSkill(Object.assign({}, ctx, { hpRatio: 1, afterHit: false, combo: 3, letters: 3, speed: 1 }), 'fire', 10), T.combo3);
    });
    it('bảng skills tuỳ chỉnh (mặc định BOSS_SKILLS[el]) — cho phase sau (tiến hoá) truyền bảng khác', () => {
      const custom = { basic: { id: 'x', fx: null, effect: {} } };
      assert.equal(bossPickSkill({ combo: 0, letters: 1, speed: 1, hpRatio: 1 }, 'fire', 1, custom), custom.basic);
    });
  });

  describe('bossApplySkillEffect — primitive', () => {
    it('dmgMul nhân thẳng vào dmg', () => {
      const st = { shield: 0, heartsMax: 3, hearts: 3, ult: 0 };
      assert.equal(bossApplySkillEffect(st, { effect: { dmgMul: 1.5 } }, 100, false).dmg, 150);
    });
    it('extraHits n: +n×50%D (D = dmg TRƯỚC hiệu ứng chiêu), hits += n', () => {
      const st = { shield: 0, heartsMax: 3, hearts: 3, ult: 0 };
      const r = bossApplySkillEffect(st, { effect: { extraHits: 2 } }, 100, false);
      assert.equal(r.dmg, 200); assert.equal(r.hits, 3);   // 100 + 2×50 = 200
    });
    it('crit ép ×critMul; đã crit sẵn (alreadyCrit) thì KHÔNG cộng dồn', () => {
      const st = { shield: 0, heartsMax: 3, hearts: 3, ult: 0 };
      assert.equal(bossApplySkillEffect(st, { effect: { crit: true } }, 100, false).dmg, Math.round(100 * BOSS_TUNING.critMul));
      assert.equal(bossApplySkillEffect(st, { effect: { crit: true } }, 100, true).dmg, 100, 'đã crit sẵn → không nhân lại');
    });
    it('shield +n cộng NGAY, kẹp shieldCap dù cộng nhiều lần', () => {
      const st = { shield: 0, heartsMax: 3, hearts: 3, ult: 0 };
      bossApplySkillEffect(st, { effect: { shield: 1 } }, 10, false);
      bossApplySkillEffect(st, { effect: { shield: 5 } }, 10, false);
      assert.equal(st.shield, BOSS_TUNING.shieldCap);
    });
    it('heal +n cộng NGAY, kẹp heartsMax', () => {
      const st = { shield: 0, heartsMax: 3, hearts: 2, ult: 0 };
      bossApplySkillEffect(st, { effect: { heal: 5 } }, 10, false);
      assert.equal(st.hearts, 3);
    });
    it('ultAdd +n cộng NGAY, kẹp ultMax', () => {
      const st = { shield: 0, heartsMax: 3, hearts: 3, ult: BOSS_TUNING.ultMax - 1 };
      bossApplySkillEffect(st, { effect: { ultAdd: 5 } }, 10, false);
      assert.equal(st.ult, BOSS_TUNING.ultMax);
    });
    it('threatDrainMul/burn/freeze được trả về (áp lúc impact, không áp ngay)', () => {
      const st = { shield: 0, heartsMax: 3, hearts: 3, ult: 0 };
      const r = bossApplySkillEffect(st, { effect: { threatDrainMul: 2, burn: { dps: 9, sec: 2 }, freeze: { sec: 1 } } }, 10, false);
      assert.equal(r.threatDrainMul, 2); assert.deepEqual(r.burn, { dps: 9, sec: 2 }); assert.deepEqual(r.freeze, { sec: 1 });
    });
  });

  describe('shieldCap — trần khiên áp MỌI nguồn cộng (skill/tuyệt kỹ/nội tại)', () => {
    it('nội tại Đất bậc 2 (shield:1) kẹp ngay lúc tạo trận (dưới trần, không đổi)', () => {
      const st = mk({ alloc: { earth: 2 }, el: 'earth' });
      assert.equal(st.shield, 1);
    });
    it('tuyệt kỹ Hồi sinh/Lốc xoáy k≥1.5 cộng +1 khiên, kẹp shieldCap dù đã có khiên nội tại', () => {
      const st = mk({ alloc: { earth: 3 }, el: 'earth' }); st.ult = BOSS_TUNING.ultMax; st.shield = BOSS_TUNING.shieldCap;
      assert.ok(useUltimate(st, 0));
      let t = 10;
      st.chain.words.slice().forEach(g => { type(st, g.answers[0], t); t += 200; });   // 3/3 → k=1.5
      assert.equal(st.shield, BOSS_TUNING.shieldCap, 'đã ở trần, tuyệt kỹ k≥1,5 không được vượt');
    });
    it('chiêu Giáp đá (earth counter, shield +1) kẹp trần khi cộng dồn nhiều lần', () => {
      const st = { shield: BOSS_TUNING.shieldCap - 1, heartsMax: 3, hearts: 3, ult: 0 };
      bossApplySkillEffect(st, BOSS_SKILLS.earth.counter, 10, false);
      bossApplySkillEffect(st, BOSS_SKILLS.earth.counter, 10, false);
      assert.equal(st.shield, BOSS_TUNING.shieldCap);
    });
  });

  describe('burn — chiêu vs nội tại: mạnh hơn (dps×sec) thắng, không cộng dồn', () => {
    it('bossStrongerBurn: so đúng dps×sec, thiếu 1 bên → dùng bên còn lại', () => {
      assert.deepEqual(bossStrongerBurn(null, { dps: 1, sec: 1 }), { dps: 1, sec: 1 });
      assert.deepEqual(bossStrongerBurn({ dps: 1, sec: 1 }, null), { dps: 1, sec: 1 });
      assert.deepEqual(bossStrongerBurn({ dps: 5, sec: 3 }, { dps: 10, sec: 3 }), { dps: 10, sec: 3 }, 'chiêu (30 dps·s) mạnh hơn nội tại (15)');
      assert.deepEqual(bossStrongerBurn({ dps: 5, sec: 10 }, { dps: 10, sec: 3 }), { dps: 5, sec: 10 }, 'nội tại (50) mạnh hơn chiêu (30)');
    });
    it('bossApplyHit: burn của lần chạm này MẠNH HƠN passive → áp đúng burn mạnh, không cộng dồn 2 nguồn', () => {
      const st = mk({ alloc: { fire: 2 }, el: 'fire' });   // nội tại Lửa bậc 2: burn {dps:5, sec:3} = 15 dps·s
      bossApplyHit(st, 0, 1, 1, { burn: { dps: 10, sec: 3 } });   // Vòng lửa (combo6): 30 dps·s > 15 → thắng
      assert.deepEqual(st.burn, { dps: 10, left: 3, acc: 0, sum: 0 });
    });
    it('so với đốt ĐANG CHÁY (không chỉ đốt mới của đòn này): Vòng lửa cháy dở, đòn thường kế chỉ có nội tại yếu hơn → GIỮ NGUYÊN đốt mạnh đang cháy', () => {
      const st = mk({ alloc: { fire: 2 }, el: 'fire' });   // nội tại Lửa bậc 2: burn {dps:5, sec:3} = 15 dps·s
      bossApplyHit(st, 0, 1, 1, { burn: { dps: 10, sec: 3 } });   // Vòng lửa: 30 dps·s đang cháy
      assert.deepEqual(st.burn, { dps: 10, left: 3, acc: 0, sum: 0 });
      bossApplyHit(st, 500, 1, 1, {});   // đòn thường kế tiếp, chỉ có nội tại {5,3}=15 < đốt đang cháy 30
      assert.equal(st.burn.dps, 10, 'nội tại yếu hơn KHÔNG được đè mất đốt mạnh hơn đang cháy');
      assert.equal(st.burn.left, 3, 'đốt đang cháy không bị reset lại khi thua so sánh');
    });
    it('chỉ nội tại (không có burn nào đang cháy, không skill) vẫn refresh mỗi đòn như trước (parity cấp 1)', () => {
      const st = mk({ alloc: { fire: 2 }, el: 'fire' });
      bossApplyHit(st, 0, 1, 1, {});
      assert.deepEqual(st.burn, { dps: 5, left: 3, acc: 0, sum: 0 });
      // đòn kế xảy ra khi đốt trước còn dở (left < sec đầy) — nội tại vẫn refresh lại full sec như hành vi cũ
      st.burn.left = 1;
      bossApplyHit(st, 500, 1, 1, {});
      assert.deepEqual(st.burn, { dps: 5, left: 3, acc: 0, sum: 0 });
    });
  });

  describe('freeze — chiêu ĐÓNG BĂNG CHẮC CHẮN (không qua freezeChance)', () => {
    it('bossApplyHit với opt.freeze → frozen ngay dù rand() không bao giờ trúng freezeChance', () => {
      const st = mk({ el: 'fire', rand: () => 0.999 });   // rand cao → freezeChance nội tại (không có ở Lửa) chắc chắn không trúng
      bossApplyHit(st, 100, 1, 1, { freeze: { sec: 2 } });
      assert.ok(st.frozen); assert.equal(st.frozenUntil, 100 + 2000);
    });
  });

  describe('counter — chỉ kích khi MẤT TIM, không khi khiên chặn', () => {
    it('khiên chặn đòn → afterHit vẫn false (counter không được chọn dù đã mở cấp 10)', () => {
      const st = mk({ alloc: { earth: 2 }, el: 'fire', hearts: 3, level: 10 });
      run(st, 0, 10100);
      assert.includes(types(st), 'shieldBlock');
      assert.equal(st.afterHit, false, 'khiên chặn KHÔNG bật cờ afterHit (quyết định người dùng)');
    });
    it('mất tim thật → afterHit=true, cast KẾ chọn counter (nếu không slot ưu tiên cao hơn khớp)', () => {
      const st = mk({ el: 'fire', hearts: 3, level: 10 });
      run(st, 0, 10100);
      assert.includes(types(st), 'hurt'); assert.equal(st.afterHit, true);
      type(st, st.group.answers[0], 10100);
      const c = casts(st).pop();
      assert.equal(c.skill, BOSS_SKILLS.fire.counter.fx);
      assert.equal(st.afterHit, false, 'đã tiêu thụ ở cast kế');
    });
  });

  describe('execute — dùng HP LÚC NIỆM (cast time), không đợi impact', () => {
    it('HP vừa xuống dưới 30% ngay TRƯỚC cast này (do impact phép trước đó) → cast này ra execute', () => {
      const st = mk({ el: 'fire', level: 8 });
      st.hpMax = 100; st.hp = 25;   // 25% < 30% NGAY LÚC NIỆM
      type(st, 'cat', 0);
      const c = casts(st)[0];
      assert.equal(c.skill, BOSS_SKILLS.fire.execute.fx);
    });
    it('HP còn ≥ 30% lúc niệm dù impact SAU đó (cùng lần cast) sẽ hạ xuống dưới 30% → KHÔNG tính execute cho lần này', () => {
      const st = mk({ el: 'fire', level: 8 });
      st.hpMax = 100; st.hp = 35;
      type(st, 'cat', 0);
      const c = casts(st)[0];
      assert.ok(c.skill !== BOSS_SKILLS.fire.execute.fx, 'execute chỉ xét hpRatio TẠI LÚC NIỆM, 35% chưa đủ thấp');
    });
  });

  describe('combo3/combo6 — chỉ khớp khi CHÍNH cast này tăng combo (không lỗi gõ)', () => {
    it('combo đang ở 5, cast không lỗi gõ tăng lên 6 → combo6 khớp', () => {
      const st = { typos: 0, combo: 5, mods: { element: 'fire' }, level: 10, skillTable: undefined, hp: 100, hpMax: 100, afterHit: false };
      const r = bossResolveSkillCast(st, 10, false, 3, 1);
      assert.equal(r.skillId, BOSS_SKILLS.fire.combo6.fx);
    });
    it('combo ĐANG ở 6 (bội số) nhưng cast NÀY có lỗi gõ (giữ nguyên combo, không cộng) → KHÔNG khớp combo6, rớt về basic', () => {
      const st = { typos: 1, combo: 6, mods: { element: 'fire' }, level: 10, skillTable: undefined, hp: 100, hpMax: 100, afterHit: false };
      const r = bossResolveSkillCast(st, 10, false, 3, 1);
      assert.equal(r.skillId, null, 'basic không có fx → skillId null');
    });
    it('tương tự với combo3: combo đang ở 3, cast có lỗi gõ → không khớp combo3', () => {
      const st = { typos: 1, combo: 3, mods: { element: 'fire' }, level: 10, skillTable: undefined, hp: 100, hpMax: 100, afterHit: false };
      const r = bossResolveSkillCast(st, 10, false, 3, 1);
      assert.equal(r.skillId, null);
    });
  });

  describe('ultFull — chiêu tự phát làm đầy thanh tuyệt kỹ cũng phải báo (không chỉ combo cast thường)', () => {
    it('ultAdd vừa làm đầy thanh (chưa đầy trước đó) → emit ultFull', () => {
      const st = { shield: 0, heartsMax: 3, hearts: 3, ult: BOSS_TUNING.ultMax - 1, mods: { ultimate: 'meteor' }, events: [] };
      bossApplySkillEffect(st, { effect: { ultAdd: 5 } }, 10, false);
      assert.ok(st.events.some(e => e.type === 'ultFull'));
    });
    it('thanh đã đầy sẵn từ trước → không emit lại', () => {
      const st = { shield: 0, heartsMax: 3, hearts: 3, ult: BOSS_TUNING.ultMax, mods: { ultimate: 'meteor' }, events: [] };
      bossApplySkillEffect(st, { effect: { ultAdd: 1 } }, 10, false);
      assert.equal(st.events.filter(e => e.type === 'ultFull').length, 0);
    });
    it('trường phái chưa mở tuyệt kỹ (mods.ultimate rỗng) → không emit dù thanh đầy', () => {
      const st = { shield: 0, heartsMax: 3, hearts: 3, ult: BOSS_TUNING.ultMax - 1, mods: { ultimate: null }, events: [] };
      bossApplySkillEffect(st, { effect: { ultAdd: 5 } }, 10, false);
      assert.equal(st.events.length, 0);
    });
  });

  describe('skillName — bossResolveSkillCast trả tên chiêu ĐÃ ghi đè theo dạng tiến hoá (không phải tên gốc cố định)', () => {
    it('skillTable của dạng fire-a: combo3 trả "Tam hoả" (tên gốc "Song hoả")', () => {
      const skillTable = bossSkillsFor('fire', BOSS_EVO.fire['fire-a'], BOSS_SKILLS.fire);
      const st = { typos: 0, combo: 2, mods: { element: 'fire' }, level: 10, skillTable, hp: 100, hpMax: 100, afterHit: false };
      const r = bossResolveSkillCast(st, 10, false, 3, 1);
      assert.equal(r.skillName, 'Tam hoả');
      assert.ok(r.skillName !== BOSS_SKILLS.fire.combo3.name, 'phải khác tên gốc, không rơi về bảng cố định');
    });
    it('không có dạng tiến hoá (skillTable mặc định) → skillName = tên gốc BOSS_SKILLS', () => {
      const st = { typos: 0, combo: 2, mods: { element: 'fire' }, level: 10, skillTable: undefined, hp: 100, hpMax: 100, afterHit: false };
      const r = bossResolveSkillCast(st, 10, false, 3, 1);
      assert.equal(r.skillName, BOSS_SKILLS.fire.combo3.name);
    });
    it('basic (không chiêu đặc biệt, không fx) → skillName null', () => {
      const st = { typos: 0, combo: 0, mods: { element: 'fire' }, level: 1, skillTable: undefined, hp: 100, hpMax: 100, afterHit: false };
      const r = bossResolveSkillCast(st, 10, false, 1, 1);
      assert.equal(r.skillName, null);
    });
    it('tích hợp trận thật: event cast của dạng fire-a ở combo3 mang skillName "Tam hoả"', () => {
      const skills = { fire: bossSkillsFor('fire', BOSS_EVO.fire['fire-a'], BOSS_SKILLS.fire) };
      const st = mk({ el: 'fire', level: 10, skills });
      // mỗi cast tier 1 khoá tới impactAt(+250) + afterImpactMs(+350) = 600ms sau khi gõ xong — chờ đủ giữa các từ
      // để phím không bị khoá nuốt (bossCanAct trả false khi đang khoá).
      type(st, 'cat', 0);   // combo 0→1, chưa khớp combo3
      type(st, 'dog', 700);   // combo 1→2, chưa khớp
      type(st, 'sun', 1400, 900);   // combo 2→3 → combo3 "Tam hoả" (gõ chậm để KHÔNG khớp fast, ưu tiên cao hơn combo3)
      const c = casts(st).pop();
      assert.equal(c.skillName, 'Tam hoả');
    });
  });

  describe('evolved — bossResolveSkillCast báo đúng dạng tiến hoá đang active có ghi đè slot đó không (phase 3, hiển thị thuần)', () => {
    it('skillTable của dạng fire-a: combo3 bị ghi đè → evolved=true', () => {
      const skillTable = bossSkillsFor('fire', BOSS_EVO.fire['fire-a'], BOSS_SKILLS.fire);
      const st = { typos: 0, combo: 2, mods: { element: 'fire' }, level: 10, skillTable, hp: 100, hpMax: 100, afterHit: false };
      const r = bossResolveSkillCast(st, 10, false, 3, 1);
      assert.equal(r.evolved, true);
    });
    it('skillTable của dạng fire-a: slot KHÔNG bị ghi đè (fast, dạng fire-a không đụng slot này) → evolved=false', () => {
      const skillTable = bossSkillsFor('fire', BOSS_EVO.fire['fire-a'], BOSS_SKILLS.fire);
      const st = { typos: 0, combo: 0, mods: { element: 'fire' }, level: 10, skillTable, hp: 100, hpMax: 100, afterHit: false };
      const r = bossResolveSkillCast(st, 10, false, 1, 2);   // speed≥2 → fast, fire-a không override slot này
      assert.equal(r.skillId, BOSS_SKILLS.fire.fast.fx);
      assert.equal(r.evolved, false);
    });
    it('không có dạng tiến hoá (skillTable mặc định undefined) → evolved luôn false dù slot đó CÓ bị hệ khác ghi đè', () => {
      const st = { typos: 0, combo: 2, mods: { element: 'fire' }, level: 10, skillTable: undefined, hp: 100, hpMax: 100, afterHit: false };
      const r = bossResolveSkillCast(st, 10, false, 3, 1);
      assert.equal(r.evolved, false);
    });
    it('basic (không chiêu đặc biệt) → evolved=false', () => {
      const st = { typos: 0, combo: 0, mods: { element: 'fire' }, level: 1, skillTable: undefined, hp: 100, hpMax: 100, afterHit: false };
      const r = bossResolveSkillCast(st, 10, false, 1, 1);
      assert.equal(r.evolved, false);
    });
    it('tích hợp trận thật: pendingImpacts/event cast + impact đều mang evolved đúng, không đổi skillId/dmg', () => {
      const skills = { fire: bossSkillsFor('fire', BOSS_EVO.fire['fire-a'], BOSS_SKILLS.fire) };
      const st = mk({ el: 'fire', level: 10, skills });
      type(st, 'cat', 0);
      type(st, 'dog', 700);
      type(st, 'sun', 1400, 900);   // combo 2→3 → combo3 (Tam hoả, fire-a ghi đè) — xem test skillName tương tự phía trên
      const c = casts(st).pop();
      assert.equal(c.skillName, 'Tam hoả'); assert.equal(c.evolved, true, 'event cast phải mang evolved');
      // 'sun' gõ 3 chữ cách nhau 900ms bắt đầu từ 1400 → chữ cuối (cast thật) ở 1400+2×900=3200, impact +260 = 3460
      run(st, 1400, 3600);
      const impact = st.events.filter(e => e.type === 'impact').pop();
      assert.ok(impact, 'phải có impact sau khi chờ đủ');
      assert.equal(impact.evolved, true, 'event impact cũng phải mang evolved (gắn qua pendingImpacts)');
    });
  });

  describe('chain hits — KHÔNG kích chiêu tự phát, nhưng VẪN áp thụ động (đòn chuỗi đi qua CÙNG đường bossApplyHit)', () => {
    it('chuỗi niệm ở cấp cao (đủ mở mọi slot) vẫn không gắn skill vào impact của đòn chuỗi', () => {
      const st = mk({ alloc: { fire: 3 }, el: 'fire', level: 10 });
      st.ult = BOSS_TUNING.ultMax;
      assert.ok(useUltimate(st, 0));
      type(st, st.chain.words[0].answers[0], 10);
      const impact = st.events.find(e => e.type === 'impact');
      assert.equal(impact.skill, null, 'đòn chuỗi không được chọn chiêu tự phát (quyết định người dùng)');
    });
    it('nội tại Lửa bậc 2 (burn) vẫn cháy sau đòn chuỗi — chain đi qua CÙNG bossApplyHit với phép thường', () => {
      const st = mk({ alloc: { fire: 3 }, el: 'fire' });
      st.ult = BOSS_TUNING.ultMax;
      assert.ok(useUltimate(st, 0));
      type(st, st.chain.words[0].answers[0], 10);
      assert.ok(st.burn, 'thiêu đốt nội tại phải áp cho đòn chuỗi, không chỉ đòn phép thường');
    });
  });
})();
