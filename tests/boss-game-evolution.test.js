/* Test logic tiến hoá thuần: bossEvoUnlocked, bossActiveForm, bossEvoMods, bossSkillsFor,
   bossEvoUltBonus + tính nhất quán dữ liệu BOSS_EVO (30 dạng) và BOSS_EVO_SPRITES (60 sprite/face). */
(function () {
  const SLOTS = ['basic', 'combo3', 'long', 'fast', 'combo6', 'execute', 'counter'];

  describe('bossEvoUnlocked', () => {
    it('dạng gốc luôn mở, mọi cấp', () => {
      BOSS_ELEMENTS.forEach(el => { assert.ok(bossEvoUnlocked(el, '', 1)); assert.ok(bossEvoUnlocked(el, '', 0)); });
    });
    it('dạng cấp 8 mở đúng ở cấp 8, đóng ở cấp 7', () => {
      assert.ok(bossEvoUnlocked('fire', 'fire-a', 8));
      assert.ok(!bossEvoUnlocked('fire', 'fire-a', 7));
      assert.ok(bossEvoUnlocked('fire', 'fire-a', 20));
    });
    it('dạng cấp 16 mở đúng ở cấp 16, đóng ở cấp 15 (kể cả khi cha chưa từng chọn)', () => {
      assert.ok(bossEvoUnlocked('fire', 'fire-a1', 16));
      assert.ok(!bossEvoUnlocked('fire', 'fire-a1', 15));
    });
    it('id lạ hoặc sai hệ → false', () => {
      assert.ok(!bossEvoUnlocked('fire', 'ice-a', 99));
      assert.ok(!bossEvoUnlocked('fire', 'fire-z9', 99));
      assert.ok(!bossEvoUnlocked('fire', 'hack', 99));
    });
  });

  describe('bossActiveForm', () => {
    it('rơi về gốc khi chưa đủ cấp, không xoá dữ liệu prog', () => {
      const prog = { fire: { v: 'fire-a1', ts: 5 } };
      assert.equal(bossActiveForm(prog, 'fire', 10), '');   // cần cấp 16
      assert.equal(prog.fire.v, 'fire-a1');                 // dữ liệu vẫn còn nguyên
      assert.equal(bossActiveForm(prog, 'fire', 16), 'fire-a1');
    });
    it('thiếu evo cho hệ → dạng gốc', () => {
      assert.equal(bossActiveForm({}, 'fire', 30), '');
      assert.equal(bossActiveForm(null, 'fire', 30), '');
    });
  });

  describe('bossEvoMods', () => {
    it('dạng gốc (form rỗng/undefined) → {}', () => {
      assert.deepEqual(bossEvoMods(undefined), {});
      assert.deepEqual(bossEvoMods(null), {});
    });
    it('khớp mods khai trong BOSS_EVO', () => {
      assert.deepEqual(bossEvoMods(BOSS_EVO.fire['fire-a']), { dmgMul: 0.08 });
      assert.deepEqual(bossEvoMods(BOSS_EVO.earth['earth-b2']), { shield: 1 });
    });
  });

  describe('bossEvoUltBonus', () => {
    it('dạng cấp 8: 0; dạng cấp 16: 0.25', () => {
      BOSS_ELEMENTS.forEach(el => {
        Object.keys(BOSS_EVO[el]).forEach(id => {
          const form = BOSS_EVO[el][id];
          assert.equal(bossEvoUltBonus(form), form.level === 16 ? 0.25 : 0);
        });
      });
    });
    it('form rỗng → 0', () => { assert.equal(bossEvoUltBonus(undefined), 0); });
  });

  describe('bossSkillsFor', () => {
    const base = { basic: { name: 'gốc', effect: {} }, long: { name: 'dài gốc', effect: { dmgMul: 1.8 } }, combo3: { name: 'combo gốc', effect: { extraHits: 1 } } };
    it('không có override → trả bản sao, giữ nguyên nội dung', () => {
      const out = bossSkillsFor('fire', undefined, base);
      assert.deepEqual(out, base);
      assert.ok(out !== base);   // object mới, không sửa base
    });
    it('override thay toàn bộ effect + tên (name) của đúng slot, slot khác giữ nguyên', () => {
      const form = BOSS_EVO.fire['fire-a'];   // ghi đè long + combo3
      const out = bossSkillsFor('fire', form, base);
      assert.deepEqual(out.long.effect, { dmgMul: 2.0 });
      assert.deepEqual(out.combo3.effect, { extraHits: 2 });
      assert.equal(out.long.name, 'Đại hoả trụ');   // override cung cấp tên chiêu nâng cấp, đè tên gốc
      assert.deepEqual(out.basic, base.basic);       // basic không bị đụng
      assert.deepEqual(base.long.effect, { dmgMul: 1.8 });   // base gốc không bị sửa
      assert.equal(base.long.name, 'dài gốc');       // base gốc không bị sửa tên
    });
  });

  describe('BOSS_EVO — tính nhất quán dữ liệu (30 dạng)', () => {
    it('id trong BOSS_EVO khớp hệt BOSS_EVO_FORMS (boss-progress-sync-merge.js)', () => {
      BOSS_ELEMENTS.forEach(el => {
        assert.deepEqual(Object.keys(BOSS_EVO[el]).sort(), BOSS_EVO_FORMS[el].slice().sort());
      });
    });
    it('đúng 30 dạng, 6 dạng/hệ', () => {
      let total = 0;
      BOSS_ELEMENTS.forEach(el => { total += Object.keys(BOSS_EVO[el]).length; assert.equal(Object.keys(BOSS_EVO[el]).length, 6); });
      assert.equal(total, 30);
    });
    it('cấp 8: parent rỗng; cấp 16: parent là dạng cấp 8 cùng hệ đã khai báo', () => {
      BOSS_ELEMENTS.forEach(el => {
        Object.keys(BOSS_EVO[el]).forEach(id => {
          const form = BOSS_EVO[el][id];
          if (form.level === 8) { assert.equal(form.parent, ''); }
          else {
            assert.equal(form.level, 16);
            assert.ok(BOSS_EVO[el][form.parent], id + ' cha phải tồn tại');
            assert.equal(BOSS_EVO[el][form.parent].level, 8, id + ' cha phải là dạng cấp 8');
          }
          assert.ok(id.indexOf(el + '-') === 0, id + ' phải đúng tiền tố hệ ' + el);
        });
      });
    });
    it('mọi slot ghi đè thuộc 7 slot hợp lệ; cấp 8 không ghi đè slot counter (mở cấp 10)', () => {
      BOSS_ELEMENTS.forEach(el => {
        Object.keys(BOSS_EVO[el]).forEach(id => {
          const form = BOSS_EVO[el][id];
          const slots = Object.keys(form.skillOverrides);
          assert.ok(slots.length >= 1, id + ' phải ghi đè ít nhất 1 chiêu');
          slots.forEach(s => assert.ok(SLOTS.indexOf(s) >= 0, id + ' slot lạ: ' + s));
          if (form.level === 8) assert.ok(slots.indexOf('counter') < 0, id + ' cấp 8 chưa được dùng counter');
        });
      });
    });
    it('mỗi dạng có đúng 1 modifier (mods)', () => {
      BOSS_ELEMENTS.forEach(el => Object.keys(BOSS_EVO[el]).forEach(id => {
        assert.equal(Object.keys(BOSS_EVO[el][id].mods).length, 1, id + ' phải có đúng 1 modifier');
      }));
    });
    it('sprite/face của mỗi dạng có trong BOSS_EVO_SPRITES', () => {
      BOSS_ELEMENTS.forEach(el => Object.keys(BOSS_EVO[el]).forEach(id => {
        const form = BOSS_EVO[el][id];
        assert.ok(BOSS_EVO_SPRITES[form.sprite], id + ' thiếu sprite ' + form.sprite);
        assert.ok(BOSS_EVO_SPRITES[form.face], id + ' thiếu face ' + form.face);
      }));
    });
  });

  describe('BOSS_EVO — skillOverrides = FULL base effect + ít nhất 1 primitive tăng thật (quyết định user "strict")', () => {
    // Luật chặt: TOÀN BỘ primitive của gốc phải còn trong override, KHÔNG khoá nào thấp hơn (freeze theo sec,
    // burn theo dps×sec, còn lại theo số, crit boolean giữ true) — không cho phép "thay hẳn primitive khác" như
    // bản nới trước; VÀ phải có ít nhất 1 primitive THẬT SỰ mạnh hơn gốc: hoặc 1 khoá chung có trị số cao hơn,
    // hoặc 1 khoá HOÀN TOÀN MỚI (không có ở gốc) — nếu không thì override chỉ đổi tên, không phải nâng cấp thật.
    function coversBase(baseEff, upEff) {
      return Object.keys(baseEff).every(k => {
        if (!(k in upEff)) return false;
        if (k === 'freeze') return upEff.freeze.sec >= baseEff.freeze.sec;
        if (k === 'burn') return upEff.burn.dps * upEff.burn.sec >= baseEff.burn.dps * baseEff.burn.sec;
        if (k === 'crit') return true;   // đã qua "in" ở trên (gốc true thì override cũng phải true)
        return upEff[k] >= baseEff[k];
      });
    }
    function hasRealIncrease(baseEff, upEff) {
      return Object.keys(upEff).some(k => {
        if (!(k in baseEff)) return true;   // primitive hoàn toàn mới = nâng cấp thật
        if (k === 'freeze') return upEff.freeze.sec > baseEff.freeze.sec;
        if (k === 'burn') return upEff.burn.dps * upEff.burn.sec > baseEff.burn.dps * baseEff.burn.sec;
        if (k === 'crit') return false;   // boolean, không có "tăng" khi cả 2 đều true
        return upEff[k] > baseEff[k];
      });
    }
    it('mọi override (60 mục, 30 dạng × 2 chiêu nâng cấp) giữ ĐỦ effect gốc + tăng thật ít nhất 1 primitive', () => {
      BOSS_ELEMENTS.forEach(el => {
        Object.keys(BOSS_EVO[el]).forEach(formId => {
          const overrides = BOSS_EVO[el][formId].skillOverrides;
          Object.keys(overrides).forEach(slot => {
            const base = BOSS_SKILLS[el][slot].effect, up = overrides[slot].effect;
            assert.ok(coversBase(base, up), el + '/' + formId + '/' + slot + ': ' + JSON.stringify(up) + ' thiếu/thấp hơn 1 primitive của gốc ' + JSON.stringify(base));
            assert.ok(hasRealIncrease(base, up), el + '/' + formId + '/' + slot + ': ' + JSON.stringify(up) + ' không tăng primitive nào so gốc ' + JSON.stringify(base) + ' (chỉ đổi tên)');
          });
        });
      });
    });
    it('7 override từng bớt 1 primitive gốc giờ giữ ĐỦ, không bớt cái nào', () => {
      assert.deepEqual(BOSS_EVO.ice['ice-b'].skillOverrides.combo6.effect, { shield: 1, freeze: { sec: 2.5 }, threatDrainMul: 1.5 });
      assert.deepEqual(BOSS_EVO.ice['ice-b1'].skillOverrides.combo6.effect, { shield: 1, freeze: { sec: 3 } });
      assert.deepEqual(BOSS_EVO.storm['storm-b2'].skillOverrides.combo3.effect, { crit: true, ultAdd: 1 });
      assert.deepEqual(BOSS_EVO.earth['earth-a1'].skillOverrides.combo6.effect, { heal: 1, dmgMul: 1.3, extraHits: 2 });
      assert.deepEqual(BOSS_EVO.earth['earth-b'].skillOverrides.combo6.effect, { heal: 1, dmgMul: 1.3, shield: 1 });
      assert.deepEqual(BOSS_EVO.earth['earth-b'].skillOverrides.combo3.effect, { dmgMul: 1.5, threatDrainMul: 1.5 });
      assert.deepEqual(BOSS_EVO.wind['wind-b'].skillOverrides.combo3.effect, { ultAdd: 1, threatDrainMul: 1.5 });
    });
    it('3 override từng CHỈ đổi tên (bằng hệt gốc) giờ có nâng cấp thật', () => {
      assert.deepEqual(BOSS_EVO.ice['ice-b'].skillOverrides.combo3.effect, { freeze: { sec: 1.5 }, dmgMul: 1.25 });
      assert.deepEqual(BOSS_EVO.earth['earth-b1'].skillOverrides.combo6.effect, { heal: 1, dmgMul: 1.35 });
      assert.deepEqual(BOSS_EVO.wind['wind-b1'].skillOverrides.combo6.effect, { ultAdd: 2, dmgMul: 1.45 });
    });
    it('ice-b1 counter / earth-b1 counter (đã sửa lượt trước) vẫn giữ nguyên, không bị lượt "strict" này đụng lại', () => {
      assert.ok(BOSS_EVO.ice['ice-b1'].skillOverrides.counter.effect.freeze.sec >= 3.5);
      assert.equal(BOSS_EVO.ice['ice-b1'].skillOverrides.counter.effect.dmgMul, 1.4);
      const kimCang = BOSS_EVO.earth['earth-b1'].skillOverrides.counter.effect;
      assert.equal(kimCang.shield, 1);
      assert.ok(kimCang.heal >= 1, 'Kim cang phải mạnh hơn gốc (shield 1 trơn), không chỉ hoà');
    });
    it('mọi override có tên chiêu nâng cấp (name), khác rỗng — dùng cho float text + Sổ chiêu', () => {
      BOSS_ELEMENTS.forEach(el => {
        Object.keys(BOSS_EVO[el]).forEach(formId => {
          const overrides = BOSS_EVO[el][formId].skillOverrides;
          Object.keys(overrides).forEach(slot => {
            assert.ok(overrides[slot].name && typeof overrides[slot].name === 'string', el + '/' + formId + '/' + slot + ' thiếu name');
          });
        });
      });
    });
  });

  describe('bossFoldEvoMods', () => {
    it('form rỗng/undefined → mods không đổi (object mới, không sửa mods gốc)', () => {
      const mods = { element: 'fire', dmgMul: 1, shield: 0 };
      const out = bossFoldEvoMods(mods, undefined);
      assert.deepEqual(out, mods);
      assert.ok(out !== mods);
    });
    it('cộng đúng khoá dmgMul (fire-a: +0.08) vào dmgMul đã có từ cây nguyên tố', () => {
      const mods = { element: 'fire', dmgMul: 1.15 };
      const out = bossFoldEvoMods(mods, BOSS_EVO.fire['fire-a']);
      assert.near(out.dmgMul, 1.23, 1e-9);
    });
    it('cộng đúng khoá số chưa từng có trong mods (shield: +1, earth-b2)', () => {
      const mods = { element: 'earth', dmgMul: 1 };
      const out = bossFoldEvoMods(mods, BOSS_EVO.earth['earth-b2']);
      assert.equal(out.shield, 1);
      assert.equal(out.dmgMul, 1);   // khoá khác không đổi
    });
  });

  describe('bossFormSprite / bossFormFace', () => {
    it('formId rỗng hoặc sai hệ → chuỗi rỗng', () => {
      assert.equal(bossFormSprite('fire', ''), '');
      assert.equal(bossFormSprite('fire', 'ice-a'), '');
      assert.equal(bossFormFace('fire', ''), '');
    });
    it('formId hợp lệ → đúng khoá sprite/face khai trong BOSS_EVO', () => {
      assert.equal(bossFormSprite('fire', 'fire-a1'), 'evoFireA1');
      assert.equal(bossFormFace('fire', 'fire-a1'), 'evoFireA1Face');
    });
  });

  describe('bossEvoHasUpgrade / bossEvoMilestoneReached', () => {
    it('cấp < 8: chưa có gì để tiến hoá', () => { assert.ok(!bossEvoHasUpgrade('fire', 7, '')); });
    it('cấp ≥ 8, đang ở gốc → có thể tiến hoá', () => { assert.ok(bossEvoHasUpgrade('fire', 8, '')); });
    it('đã chọn dạng cấp 8, cấp chưa tới 16 → không còn nhắc (đã dùng hết mốc hiện có)', () => {
      assert.ok(!bossEvoHasUpgrade('fire', 10, 'fire-a'));
    });
    it('đã chọn dạng cấp 8, vừa lên cấp 16 → có dạng con để tiến hoá tiếp', () => {
      assert.ok(bossEvoHasUpgrade('fire', 16, 'fire-a'));
    });
    it('đã chọn dạng cấp 16 → hết nhắc', () => { assert.ok(!bossEvoHasUpgrade('fire', 20, 'fire-a1')); });
    it('bossEvoMilestoneReached: vượt mốc 8 hoặc 16 giữa lv0/lv1', () => {
      assert.ok(bossEvoMilestoneReached(6, 8)); assert.ok(bossEvoMilestoneReached(15, 16));
      assert.ok(!bossEvoMilestoneReached(9, 12)); assert.ok(!bossEvoMilestoneReached(16, 18));
      assert.ok(bossEvoMilestoneReached(7, 16));   // nhảy cả 2 mốc cùng lúc vẫn tính đạt
    });
  });

  describe('bossEvoMilestoneTier', () => {
    it('< 8 → 0; 8..15 → 8; ≥ 16 → 16', () => {
      assert.equal(bossEvoMilestoneTier(1), 0);
      assert.equal(bossEvoMilestoneTier(7), 0);
      assert.equal(bossEvoMilestoneTier(8), 8);
      assert.equal(bossEvoMilestoneTier(15), 8);
      assert.equal(bossEvoMilestoneTier(16), 16);
      assert.equal(bossEvoMilestoneTier(99), 16);
    });
  });

  describe('bossBattleMods', () => {
    it('không có evo (v rỗng) → mods giống hệt modifiersFor, form rỗng, formData undefined', () => {
      const evoProg = { fire: { v: '', ts: 0 } };
      const r = bossBattleMods({}, 'fire', evoProg, 1);
      assert.deepEqual(r.mods, modifiersFor({}, 'fire'));
      assert.equal(r.form, ''); assert.equal(r.formData, undefined);
    });
    it('có evo đủ cấp → mods cộng thêm đúng modifier của dạng, formData đúng bản ghi', () => {
      const evoProg = { fire: { v: 'fire-a', ts: 1 } };
      const r = bossBattleMods({}, 'fire', evoProg, 8);
      assert.equal(r.form, 'fire-a');
      assert.equal(r.formData, BOSS_EVO.fire['fire-a']);
      assert.near(r.mods.dmgMul, modifiersFor({}, 'fire').dmgMul + 0.08, 1e-9);
    });
    it('có evo nhưng CHƯA đủ cấp → rơi về gốc, không áp mods dạng (không xoá evoProg)', () => {
      const evoProg = { fire: { v: 'fire-a1', ts: 1 } };
      const r = bossBattleMods({}, 'fire', evoProg, 10);
      assert.equal(r.form, ''); assert.equal(r.formData, undefined);
      assert.deepEqual(r.mods, modifiersFor({}, 'fire'));
      assert.equal(evoProg.fire.v, 'fire-a1');
    });
  });

  describe('BOSS_EVO_SPRITES — đủ 30 sheet + 30 faceset, đúng khuôn', () => {
    it('đúng 60 mục', () => { assert.equal(Object.keys(BOSS_EVO_SPRITES).length, 60); });
    it('sheet nhân vật 16×16 dùng chung khuôn hoạt ảnh; faceset 38×38 1 khung', () => {
      Object.keys(BOSS_EVO_SPRITES).forEach(k => {
        const s = BOSS_EVO_SPRITES[k];
        assert.ok(/^img\/boss\/actor\/evo-.*\.png$/.test(s.src), k + ' đường dẫn sai: ' + s.src);
        if (/Face$/.test(k)) { assert.equal(s.fw, 38); assert.equal(s.fh, 38); }
        else { assert.equal(s.fw, 16); assert.equal(s.fh, 16); }
      });
    });
  });
})();
