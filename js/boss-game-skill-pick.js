/* Game Pháp Sư Lexoria — chọn chiêu tự phát + áp hiệu ứng, thuần. Nạp SAU js/boss-game-skill-roster.js
   (BOSS_SKILLS/BOSS_SKILL_PRIORITY/BOSS_SKILL_UNLOCK_LEVEL) + js/boss-game-spell-math.js (BOSS_TUNING),
   TRƯỚC js/boss-game-logic.js (castComplete gọi 2 hàm dưới đây).
   Không đụng DOM/canvas — logic thuần, test được trong Node (tests/boss-game-skill-pick.test.js). */

/* ctx = {combo, letters, speed, hpRatio, afterHit}: combo = giá trị SẼ có sau cast này (đã cộng, nếu không lỗi
   gõ) — dùng để bắt đúng lúc "vừa chạm bội số 3/6"; hpRatio = st.hp/st.hpMax TẠI LÚC NIỆM (execute dùng đúng mốc
   này, không đợi impact — quyết định người dùng, xem plan.md Session 2); afterHit = cast đầu tiên sau khi bị
   quái đánh TRÚNG (mất tim) — khiên chặn KHÔNG bật cờ này (xem js/boss-game-logic.js:stepBattle). */
function bossSkillSlotMatches(slot, ctx) {
  switch (slot) {
    case 'execute': return ctx.hpRatio < 0.3;
    case 'counter': return !!ctx.afterHit;
    case 'combo6': return ctx.combo > 0 && ctx.combo % 6 === 0;
    case 'long': return ctx.letters >= 8;
    case 'fast': return ctx.speed >= 2;
    case 'combo3': return ctx.combo > 0 && ctx.combo % 3 === 0;
    case 'basic': return true;
    default: return false;
  }
}

/* skills = bảng slot→skill của MỘT hệ (dạng BOSS_SKILLS[el]); mặc định BOSS_SKILLS[el] — cho phép phase sau
   (tiến hoá) truyền bảng khác (đổi hiệu ứng/FX theo dạng tiến hoá) mà không đụng file này.
   Trả về skill khớp slot ưu tiên cao nhất đã MỞ (level ≥ BOSS_SKILL_UNLOCK_LEVEL[slot]) và ĐÚNG điều kiện;
   basic luôn khớp (return true) nên hàm không bao giờ trả null nếu bảng skills hợp lệ. */
function bossPickSkill(ctx, el, level, skills) {
  const table = skills || (typeof BOSS_SKILLS !== 'undefined' && BOSS_SKILLS[el]);
  if (!table) return null;
  for (let i = 0; i < BOSS_SKILL_PRIORITY.length; i++) {
    const slot = BOSS_SKILL_PRIORITY[i];
    if ((level | 0) < (BOSS_SKILL_UNLOCK_LEVEL[slot] || 1)) continue;
    if (bossSkillSlotMatches(slot, ctx) && table[slot]) return table[slot];
  }
  return table.basic || null;
}

/* dps×sec lớn hơn thắng (quyết định người dùng: "burn từ chiêu vs nội tại vs đốt đang cháy — mạnh hơn thắng");
   không cộng dồn; bằng nhau ưu tiên giữ `a` (dùng để giữ nguyên đốt đang cháy khi so với ứng viên mới yếu hơn/bằng). */
function bossStrongerBurn(a, b) {
  if (!a) return b || null;
  if (!b) return a;
  return (a.dps * a.sec) >= (b.dps * b.sec) ? a : b;
}

/* Áp effect của skill lên sát thương/thanh của trận. baseDmg = D (sát thương phép TRƯỚC hiệu ứng chiêu, đã qua
   bậc×speed×khắc hệ×nội tại×combo — spellDamage bình thường); alreadyCrit = đã chí mạng sẵn (Sét nội tại
   fastCrit) hay chưa, để `crit` không cộng dồn ×critMul hai lần.
   Trả {dmg (đã Math.round), hits (số quả/đòn để FX vẽ — KHÔNG tách pendingImpacts riêng, xem boss-game-logic.js),
   threatDrainMul, burn, freeze} — burn/freeze gắn vào pendingImpacts để boss-game-logic.js/bossApplyHit áp lúc
   phép CHẠM (impact), không áp ngay lúc niệm. shield/heal/ultAdd áp NGAY (phòng thủ/hồi, không cần chờ chạm). */
function bossApplySkillEffect(st, skill, baseDmg, alreadyCrit, now) {
  const eff = (skill && skill.effect) || {}, T = BOSS_TUNING;
  let dmg = baseDmg, hits = 1;
  if (eff.crit && !alreadyCrit) dmg *= T.critMul;
  if (eff.dmgMul) dmg *= eff.dmgMul;
  if (eff.extraHits) { dmg += eff.extraHits * baseDmg * 0.5; hits += eff.extraHits; }
  if (eff.shield) st.shield = Math.min(T.shieldCap, (st.shield || 0) + eff.shield);
  if (eff.heal) st.hearts = Math.min(st.heartsMax, st.hearts + eff.heal);
  // ultAdd cũng bị chặn trong lúc hồi chiêu (st.ultCooldownUntil) — cùng luật với bossComboOnCast, không có
  // đường tắt nào cộng thanh tuyệt kỹ được trong lúc hồi (Gió ultAdd dồn quá nhanh).
  if (eff.ultAdd && !(st.ultCooldownUntil && now < st.ultCooldownUntil)) {
    const wasFull = st.ult >= T.ultMax;
    st.ult = Math.min(T.ultMax, st.ult + eff.ultAdd);
    if (!wasFull && st.ult >= T.ultMax && st.mods && st.mods.ultimate && st.events) bossEmit(st, 'ultFull', {});   // chiêu tự phát làm đầy thanh tuyệt kỹ cũng phải báo, giống combo cast (bossComboOnCast)
  }
  return {
    dmg: Math.round(dmg), hits, threatDrainMul: eff.threatDrainMul || 1,
    burn: eff.burn || null, freeze: eff.freeze || null
  };
}

/* Gọi từ boss-game-logic.js:castComplete — chọn chiêu (nếu có) + áp effect lên dmg đã tính bằng spellDamage,
   trả về đủ dữ liệu để castComplete gắn vào pendingImpacts/event 'cast' mà KHÔNG cần biết chi tiết chọn/áp chiêu
   thế nào (giữ castComplete ngắn, logic.js ≤ 200 dòng — xem plan.md "Ràng buộc chung").
   combo dùng để bắt "vừa chạm bội số 3/6" = combo SẼ có SAU cast này (cộng đúng như bossComboOnCast sẽ làm),
   KHÔNG phải combo đã dùng để nhân dmg đầu vào (đó vẫn là combo TRƯỚC khi cộng — giữ nguyên hợp đồng nhân combo hiện có). */
function bossResolveSkillCast(st, dmg, crit, letters, speed, now) {
  // comboNow = combo SẼ có sau cast này NẾU không lỗi gõ; cast có typo không tăng combo (bossComboOnCast) nên
  // comboNow phải về 0 (không phải st.combo cũ) — nếu không, 1 cast lỗi ngay tại bội số 3/6 vẫn khớp combo3/combo6
  // (bossSkillSlotMatches yêu cầu ctx.combo > 0 && % === 0, 0 luôn trượt điều kiện này).
  const comboNow = st.typos === 0 ? st.combo + 1 : 0;
  const ctx = { combo: comboNow, letters, speed, hpRatio: st.hp / st.hpMax, afterHit: st.afterHit };
  const skill = bossPickSkill(ctx, st.mods.element, st.level, st.skillTable);
  st.afterHit = false;   // "cast đầu tiên sau khi bị đánh" tiêu thụ ngay ở lần niệm kế, dù slot nào được chọn
  if (!skill) return { dmg, hits: 1, threatDrainMul: 1, skillId: null, skillName: null, burn: null, freeze: null };
  const applied = bossApplySkillEffect(st, skill, dmg, crit, now);
  return {
    dmg: applied.dmg, hits: applied.hits, threatDrainMul: applied.threatDrainMul,
    // skillName = tên chiêu ĐÃ ghi đè theo dạng tiến hoá nếu có (st.skillTable, xem bossSkillsFor) — float text
    // (skill-fx.js) phải hiện đúng tên nâng cấp, không phải tên gốc cố định trong BOSS_SKILL_FX[skill.id].text.
    skillId: skill.fx ? skill.id : null, skillName: skill.fx ? skill.name : null, burn: applied.burn, freeze: applied.freeze
  };
}

/* Đường áp va chạm DÙNG CHUNG cho phép thường (bossApplyImpacts, boss-game-logic.js) và đòn chuỗi niệm
   (bossChainHit, boss-game-combo-chain.js) — trước đây chainHit tự trừ HP/emit impact
   riêng nên bỏ lỡ thụ động lúc trúng đòn (thiêu đốt/đóng băng nội tại) và không thể áp burn/freeze của chiêu tự
   phát; giờ CẢ HAI đường đều gọi hàm này → hành vi nhất quán (đặt ở đây, không phải logic.js, để giữ file đó
   ≤ 200 dòng — xem plan.md "Ràng buộc chung"; gọi bossEmit dù định nghĩa ở logic.js vẫn chạy đúng vì chỉ phụ
   thuộc thứ tự GỌI, không phải thứ tự định nghĩa — cùng quy ước với boss-game-combo-chain.js).
   displayDmg khác dmg khi phép thường hiển thị số sát thương DANH NGHĨA (kể cả overkill);
   opt.burn/opt.freeze = hiệu ứng chiêu tự phát gắn vào ĐÚNG lần chạm này. */
function bossApplyHit(st, now, dmg, tier, opt) {
  const o = opt || {}, m = st.mods;
  const real = Math.min(st.hp, dmg);
  st.hp -= real; st.dealt += real;
  bossEmit(st, 'impact', { dmg: o.displayDmg != null ? o.displayDmg : dmg, tier, hp: st.hp, skill: o.skill || null });
  // "đốt mạnh hơn thắng" phải so với đốt ĐANG CHÁY (thời gian còn lại), không chỉ đốt mới của lần chạm này — nếu
  // không, nội tại yếu hơn (refresh mỗi đòn) sẽ đè mất đốt mạnh hơn của chiêu tự phát đang chạy dở. Không có đốt
  // đang cháy (st.burn null) thì rơi về đúng hành vi cũ: so nội tại vs chiêu của ĐÚNG lần chạm này rồi refresh.
  const running = st.burn ? { dps: st.burn.dps, sec: st.burn.left } : null;
  const candidate = bossStrongerBurn(m.burn, o.burn);
  const burn = running ? bossStrongerBurn(running, candidate) : candidate;
  if (burn && burn !== running) st.burn = { dps: burn.dps, left: burn.sec, acc: 0, sum: 0 };
  if (o.freeze) {   // đóng băng CHẮC CHẮN của chiêu tự phát (không qua freezeChance)
    st.frozenUntil = Math.max(st.frozenUntil, now + o.freeze.sec * 1000); st.frozen = true;
    bossEmit(st, 'freeze', { until: st.frozenUntil });
  } else if (m.freezeChance && st.rand() < m.freezeChance) {
    st.frozenUntil = Math.max(st.frozenUntil, now + m.freezeSec * 1000); st.frozen = true;
    bossEmit(st, 'freeze', { until: st.frozenUntil });
  }
  if (st.hp <= 0 && !st.wonAt) { st.hp = 0; st.wonAt = now + BOSS_TUNING.endDelayMs; st.burn = null; }
  return real;
}

if (typeof module !== 'undefined') module.exports = {
  bossSkillSlotMatches, bossPickSkill, bossStrongerBurn, bossApplySkillEffect, bossResolveSkillCast, bossApplyHit
};
