/* Test dữ liệu hình riêng 30 chiêu (boss-game-skill-visuals.js): đủ id, sprite/motion hợp lệ, không trùng
   (proj, motion, impact[0]) trong cùng hệ, mỗi sprite ≤2 lần/hệ. Thuần, không đụng DOM. */
(function () {
  const ELEMENTS = ['fire', 'ice', 'storm', 'earth', 'wind'];
  const SPECIAL_SLOTS = ['combo3', 'long', 'fast', 'combo6', 'execute', 'counter'];

  describe('boss-game-skill-visuals (thuần)', () => {
    it('đủ 30 chiêu đặc biệt (5 hệ × 6 slot), không có basic', () => {
      let n = 0;
      ELEMENTS.forEach(el => SPECIAL_SLOTS.forEach(slot => {
        const id = BOSS_SKILLS[el][slot].id;
        assert.ok(BOSS_SKILL_VISUALS[id], id + ' thiếu trong BOSS_SKILL_VISUALS');
        n++;
      }));
      assert.equal(n, 30);
      ELEMENTS.forEach(el => assert.ok(!BOSS_SKILL_VISUALS[BOSS_SKILLS[el].basic.id], 'basic không nên có visuals riêng'));
    });

    it('mọi entry: motion ∈ BOSS_MOTIONS, proj (nếu có)/impact[] ∈ BOSS_SPRITES, scale > 0', () => {
      Object.keys(BOSS_SKILL_VISUALS).forEach(id => {
        const v = BOSS_SKILL_VISUALS[id];
        assert.ok(BOSS_MOTIONS.indexOf(v.motion) >= 0, id + ': motion "' + v.motion + '" không hợp lệ');
        if (v.proj) assert.ok(BOSS_SPRITES[v.proj], id + ': proj "' + v.proj + '" không có trong BOSS_SPRITES');
        assert.ok(Array.isArray(v.impact) && v.impact.length > 0, id + ': impact phải là mảng khác rỗng');
        v.impact.forEach(name => assert.ok(BOSS_SPRITES[name], id + ': impact "' + name + '" không có trong BOSS_SPRITES'));
        assert.ok(Array.isArray(v.cast), id + ': cast phải là mảng');
        v.cast.forEach(name => assert.ok(BOSS_SPRITES[name], id + ': cast "' + name + '" không có trong BOSS_SPRITES'));
        assert.ok(v.scale > 0, id + ': scale phải > 0');
        assert.ok(v.impact.every(n => !/^#/.test(n)), id + ': không được dùng "solid" tô màu (mã hex) làm impact');
      });
    });

    it('không có trường solid/impactSprite sót lại (đã dọn ở BOSS_SKILL_FX/roster)', () => {
      Object.keys(BOSS_SKILL_FX).forEach(id => {
        assert.ok(!BOSS_SKILL_FX[id].impactSprite, id + ': BOSS_SKILL_FX vẫn còn impactSprite (phải dọn hết)');
      });
    });

    ELEMENTS.forEach(el => {
      it('hệ ' + el + ': không 2 chiêu trùng (proj, motion, impact[0])', () => {
        const seen = {};
        SPECIAL_SLOTS.forEach(slot => {
          const id = BOSS_SKILLS[el][slot].id, v = BOSS_SKILL_VISUALS[id];
          const key = v.proj + '|' + v.motion + '|' + v.impact[0];
          assert.ok(!seen[key], el + '/' + slot + ' trùng tổ hợp (proj,motion,impact[0]) với ' + seen[key]);
          seen[key] = slot;
        });
      });

      it('hệ ' + el + ': mỗi khoá sprite (proj/cast/impact) dùng ≤2 lần', () => {
        const count = {};
        SPECIAL_SLOTS.forEach(slot => {
          const v = BOSS_SKILL_VISUALS[BOSS_SKILLS[el][slot].id];
          const names = [].concat(v.proj || [], v.cast, v.impact);
          names.forEach(n => { count[n] = (count[n] || 0) + 1; });
        });
        Object.keys(count).forEach(n => assert.ok(count[n] <= 2, el + ': sprite "' + n + '" dùng ' + count[n] + ' lần (>2)'));
      });
    });

    it('bossSkillVisualFor: trả đúng entry theo id, null khi không có/id rỗng', () => {
      assert.equal(bossSkillVisualFor('fire-combo3'), BOSS_SKILL_VISUALS['fire-combo3']);
      assert.equal(bossSkillVisualFor(null), null);
      assert.equal(bossSkillVisualFor('fire-basic'), null);
      assert.equal(bossSkillVisualFor('khong-ton-tai'), null);
    });
  });

  describe('BOSS_EVO_SKILL_VISUALS (phase 3) — hình nâng cấp cho chiêu bị dạng tiến hoá ghi đè slot', () => {
    it('mọi skillId có slot bị ghi đè ở ≥1 dạng của BOSS_EVO đều có mục ở đây (không thiếu)', () => {
      ELEMENTS.forEach(el => {
        const overridden = new Set();
        Object.keys(BOSS_EVO[el]).forEach(formId => {
          Object.keys(BOSS_EVO[el][formId].skillOverrides || {}).forEach(slot => overridden.add(slot));
        });
        overridden.forEach(slot => {
          const id = BOSS_SKILLS[el][slot].id;
          assert.ok(BOSS_EVO_SKILL_VISUALS[id], el + '/' + slot + ' (' + id + ') bị ghi đè ở BOSS_EVO nhưng thiếu BOSS_EVO_SKILL_VISUALS');
        });
      });
    });

    it('mọi entry: schema extends hợp lệ (scale>0, addImpact[] toàn khoá có trong BOSS_SPRITES) hoặc schema đầy đủ hợp lệ như BOSS_SKILL_VISUALS', () => {
      Object.keys(BOSS_EVO_SKILL_VISUALS).forEach(id => {
        const v = BOSS_EVO_SKILL_VISUALS[id];
        if (v.extends) {
          assert.ok(v.scale > 0, id + ': evo scale phải > 0');
          assert.ok(Array.isArray(v.addImpact) && v.addImpact.length > 0, id + ': evo addImpact phải là mảng khác rỗng');
          v.addImpact.forEach(name => assert.ok(BOSS_SPRITES[name], id + ': evo addImpact "' + name + '" không có trong BOSS_SPRITES'));
        } else {
          assert.ok(BOSS_MOTIONS.indexOf(v.motion) >= 0, id + ': evo motion không hợp lệ');
          (v.impact || []).forEach(name => assert.ok(BOSS_SPRITES[name], id + ': evo impact "' + name + '" không có trong BOSS_SPRITES'));
        }
      });
    });

    it('bossSkillVisualFor(id, true) đổi khác bản gốc (scale nhân lên + impact dài hơn), evolved=false vẫn trả bản gốc y nguyên', () => {
      const base = bossSkillVisualFor('fire-combo3', false);
      const evo = bossSkillVisualFor('fire-combo3', true);
      assert.equal(base, BOSS_SKILL_VISUALS['fire-combo3'], 'evolved=false phải trả ĐÚNG tham chiếu gốc, không copy');
      assert.ok(evo.scale > base.scale, 'evolved=true phải scale to hơn gốc');
      assert.ok(evo.impact.length > base.impact.length, 'evolved=true phải có thêm lớp impact');
      assert.deepEqual(evo.impact.slice(0, base.impact.length), base.impact, 'impact gốc phải giữ nguyên thứ tự, chỉ nối thêm');
    });

    it('id không có mục evo (vd earth-fast, không dạng nào ghi đè) → evolved=true vẫn rơi về bản gốc, không lỗi', () => {
      assert.equal(BOSS_EVO_SKILL_VISUALS['earth-fast'], undefined, 'earth-fast không có dạng nào ghi đè slot fast');
      assert.equal(bossSkillVisualFor('earth-fast', true), BOSS_SKILL_VISUALS['earth-fast']);
    });
  });
})();
