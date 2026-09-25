/* Game Pháp Sư Lexoria — máy trạng thái trận, thuần. Chỗ DUY NHẤT quyết định thời điểm: render/UI chỉ vẽ theo st.events.
   Thời gian: `now` = ms thật (performance.now); đồng hồ trùm và DoT chạy theo thời gian game (thật × timeScale).
   Khoá (lockUntil: chờ phép chạm, lộ đáp án, cắt cảnh tuyệt kỹ): đồng hồ + DoT dừng, phím bị bỏ, đề kế hiện sau khoá.
   Chuỗi niệm (st.chain): stepBattle/typeKey rẽ sang boss-game-combo-chain.js — đồng hồ + DoT đứng, KHÔNG lockUntil.
   Cần nạp trước: plane-game-text.js, word-games.js (addMiss), boss-game-spell-math/elements/threat-gauge/combo-chain/skill-pick.js. */

function createBattle(o) {
  const T = BOSS_TUNING, mods = o.mods || modifiersFor({}, 'fire'), now = o.now || 0;
  const hpMax = o.monster.hp, threatSec = (T.clock[o.difficulty] || T.clock.normal) + mods.clockAdd;
  const st = {
    phase: 'play', monster: o.monster, groups: o.groups, gi: -1, tiers: o.tiers || new Map(), mods, rand: o.rand || Math.random,
    hpMax, hp: Math.max(1, hpMax - (o.carryDmg || 0)), hearts: o.hearts, heartsMax: o.hearts, threat: 0, threatSec,
    timeScale: 1, combo: 0, ult: 0, chain: null, group: null, targets: [], tier: 1, typed: '', typos: 0, forgiven: false,
    readyAt: now, pausedMs: 0, pausedAt: 0, lastGoodKeyAt: -Infinity, slowUsedMs: 0,
    armedAt: 0, lockUntil: 0, lockNext: false, ultEnd: false, ultCooldownUntil: 0, pendingImpacts: [],
    shield: Math.min(T.shieldCap, mods.shield || 0), frozenUntil: 0, frozen: false,
    burn: null, boost: null, wonAt: 0, dealt: 0, log: [], miss: [], events: [],
    // chiêu tự phát (js/boss-game-skill-pick.js): level mở theo cấp; skillTable = bảng slot→skill của
    // ĐÚNG hệ đang chơi (mặc định BOSS_SKILLS[el] nếu undefined) — o.skills (dạng BOSS_SKILLS cả 5 hệ) cho phép
    // tiến hoá truyền bảng khác mà không đổi chữ ký hàm này; afterHit = cờ "vừa bị đánh trúng" (slot counter).
    level: o.level || 1, skillTable: (o.skills && o.skills[mods.element]) || undefined, afterHit: false
  };
  bossNextPrompt(st, now);
  return st;
}

const bossLocked = (st, now) => now < st.lockUntil;
/* Hết khoá → báo kết thúc tuyệt kỹ, sang đề kế (hoặc gõ lại đề cũ) */
function bossEndLock(st, now) {
  st.lockUntil = 0;
  if (st.ultEnd) { st.ultEnd = false; bossEmit(st, 'ultimateEnd', {}); }
  if (st.lockNext) { st.lockNext = false; bossNextPrompt(st, now); } else { st.typed = ''; st.readyAt = now; st.armedAt = 0; }
}
/* Thao tác người chơi được không: bắt kịp va chạm + hết khoá NGAY lúc phím tới, để phím đầu đề mới không so với đề cũ */
function bossCanAct(st, now) {
  if (st.phase !== 'play' || st.pausedAt) return false;
  bossApplyImpacts(st, now);
  if (st.wonAt || bossLocked(st, now)) return false;
  if (st.lockUntil) bossEndLock(st, now);
  return true;
}
const bossEmit = (st, type, data) => { st.events.push(Object.assign({ type }, data)); };

function bossNextPrompt(st, now) {
  st.gi = (st.gi + 1) % st.groups.length;
  const g = st.group = st.groups[st.gi];
  st.targets = g.answers.map(typedLetters);
  st.tier = Math.max.apply(null, g.ids.map(id => st.tiers.get(id) || 1));
  st.typed = ''; st.typos = 0; st.forgiven = false; st.slowUsedMs = 0; st.readyAt = now; st.lastGoodKeyAt = -Infinity; st.armedAt = 0;
  bossEmit(st, 'next', { prompt: g.prompt, tier: st.tier });
  if (st.mods.hintFirst) bossEmit(st, 'hint', { letter: st.targets[0].charAt(0) });
}

function bossLockFor(st, until, next) { st.lockUntil = Math.max(st.lockUntil, until); st.lockNext = st.lockNext || next; st.timeScale = 1; }
function bossAddMisses(st) { st.group.ids.forEach(id => { st.miss = addMiss(st.miss, id); }); }

function typeKey(st, ch, now) {
  if (st.chain) return bossChainKey(st, ch, now);
  if (!bossCanAct(st, now)) return;
  ch = normalizeTyped(ch);
  if (ch.length !== 1 || isFixedTyped(ch)) return;
  const next = st.typed + ch;
  if (st.targets.some(t => t.indexOf(next) === 0)) {
    st.typed = next; st.lastGoodKeyAt = now; st.armedAt = 0;
    bossEmit(st, 'key', { typed: next, n: next.length });
    if (st.targets.indexOf(next) >= 0) {
      // đáp án ngắn là tiền tố của đáp án dài hơn cùng đề → chờ (phím đi tiếp / Enter / ngừng gõ) thay vì niệm ngay
      if (st.targets.some(t => t.length > next.length && t.indexOf(next) === 0)) st.armedAt = now || 1e-9;
      else castComplete(st, now);
    }
    return;
  }
  if (st.armedAt) { castComplete(st, now, st.armedAt); return; }   // phím không đi tiếp → niệm đáp án ngắn, nuốt phím
  if (st.mods.typoForgive && !st.forgiven) { st.forgiven = true; bossEmit(st, 'typoForgiven', {}); return; }
  st.typos++;
  bossEmit(st, 'typo', { typos: st.typos }); bossThreatAdd(st, BOSS_TUNING.threatTypo);
  if (st.typos >= 3) {
    bossAddMisses(st);
    st.log.push({ ids: st.group.ids, word: st.group.answers[0], ok: false });
    bossEmit(st, 'fizzle', { answer: st.group.answers[0] }); bossThreatAdd(st, BOSS_TUNING.threatMiss);
    bossComboBreak(st);
    bossLockFor(st, now + BOSS_TUNING.revealMs, true);
  }
}

/* at = lúc gõ chữ cuối (mặc định now) — tốc độ tính tới đó, va chạm tính từ now */
function castComplete(st, now, at) {
  const T = BOSS_TUNING, m = st.mods, letters = st.typed.length;
  const ms = Math.max(0, (at || now) - st.readyAt);
  st.armedAt = 0;
  const speed = speedMult(ms, letters, m.speedLoosen);
  const crit = !!m.fastCrit && speed >= 2, combo = bossComboMul(st);
  let dmg = spellDamage({ tier: st.tier, speed, weakHit: st.monster.weak === m.element, mods: m, crit, combo }), hits = 1;
  // Chiêu tự phát (js/boss-game-skill-pick.js:bossResolveSkillCast) — chọn + áp hiệu ứng lên dmg/hits,
  // KHÔNG đổi công thức nhân sát thương cơ bản ở trên (giữ nguyên hợp đồng combo ×1.5 hiện có).
  const r = bossResolveSkillCast(st, dmg, crit, letters, speed, now);
  dmg = r.dmg; hits = r.hits;
  if (st.boost) {
    if (st.boost.id === 'meteor') dmg *= 3; else { dmg *= 2; hits = 2; }
    if (--st.boost.left <= 0) st.boost = null;
  }
  dmg = Math.round(dmg);
  const impactAt = now + T.impactMs[st.tier];
  st.pendingImpacts.push({ at: impactAt, dmg, tier: st.tier, skill: r.skillId, burn: r.burn, freeze: r.freeze });
  st.log.push({ ids: st.group.ids, word: st.typed, ok: true, ms, tier: st.tier, dmg });
  bossEmit(st, 'cast', { element: m.element, tier: st.tier, dmg, speed, crit, hits, impactAt, word: st.group.answers[st.targets.indexOf(st.typed)], skill: r.skillId, skillName: r.skillName });
  if (crit) bossEmit(st, 'fastCrit', {});
  bossComboOnCast(st, speed, now);
  bossThreatDrainOnCast(st, speed, r.threatDrainMul);   // áp lúc niệm xong, không đợi impact
  bossLockFor(st, impactAt + T.afterImpactMs[st.tier], true);   // khoá = chạm + đuôi cố định (đỉnh VFX nổ); đề kế chờ hết đuôi mới hiện
}

/* Enter: đang chờ đáp án ngắn → niệm luôn; chưa gõ gì → Bỏ. Trả về đã làm gì để UI biết. */
function submitTyped(st, now) {
  if (st.chain) return '';
  if (!bossCanAct(st, now)) return '';
  if (st.armedAt) { castComplete(st, now, st.armedAt); return 'cast'; }
  if (!st.typed) { giveUp(st, now); return 'giveup'; }
  return '';
}

function giveUp(st, now) {
  if (st.chain) return;   // bỏ trong chuỗi niệm: bỏ qua
  if (!bossCanAct(st, now)) return;
  if (st.armedAt) { castComplete(st, now, st.armedAt); return; }   // đã gõ trọn đáp án ngắn → niệm, không tính miss oan
  bossAddMisses(st);
  st.log.push({ ids: st.group.ids, word: st.group.answers[0], ok: false });
  // Bỏ không còn trừ thanh tuyệt kỹ — cái giá đã đủ qua threatMiss + mất combo, khỏi phạt kép (thanh nạp nhanh hơn)
  bossComboBreak(st);
  bossEmit(st, 'giveup', { answer: st.group.answers[0] }); bossThreatAdd(st, BOSS_TUNING.threatMiss);
  bossLockFor(st, now + BOSS_TUNING.revealMs, true);
}

function useUltimate(st, now) {   // mở chuỗi niệm; combo-chain.js áp hiệu lực theo hệ số khi chuỗi kết thúc
  const T = BOSS_TUNING, id = st.mods.ultimate;
  if (!id || st.chain || st.ult < T.ultMax || !bossCanAct(st, now)) return false;
  st.ult = 0;
  bossStartChain(st, now);
  return true;
}

/* Tạm dừng: dời mọi mốc thời gian thật đi đúng khoảng dừng → tốc độ, khoá, va chạm, đóng băng không bị tính giờ dừng */
function pauseBattle(st, now) { if (!st.pausedAt) st.pausedAt = now || 1e-9; }
function resumeBattle(st, now) {
  if (!st.pausedAt) return;
  const d = Math.max(0, now - st.pausedAt);
  st.pausedAt = 0; st.pausedMs += d;
  st.readyAt += d; st.lastGoodKeyAt += d;
  ['armedAt', 'lockUntil', 'frozenUntil', 'wonAt', 'ultCooldownUntil'].forEach(k => { if (st[k]) st[k] += d; });   // 0 = chưa đặt, giữ nguyên
  if (st.chain) st.chain.until += d;
  st.pendingImpacts.forEach(p => { p.at += d; });
}

function bossApplyImpacts(st, now) {
  st.pendingImpacts = st.pendingImpacts.filter(p => {
    if (p.at > now) return true;
    bossApplyHit(st, now, p.dmg, p.tier, { skill: p.skill, burn: p.burn, freeze: p.freeze, displayDmg: p.dmg });
    return false;
  });
}

const BOSS_MAX_STEP_MS = 250;   // khung hình treo lâu không được trừ cả đống đồng hồ một lần
function stepBattle(st, dtMs, now) {
  const T = BOSS_TUNING;
  if (st.phase !== 'play' || st.pausedAt) return;
  dtMs = Math.min(Math.max(0, dtMs), BOSS_MAX_STEP_MS);
  bossApplyImpacts(st, now);
  if (st.wonAt) { if (now >= st.wonAt) { st.phase = 'won'; bossEmit(st, 'won', {}); } return; }
  if (st.chain) return bossStepChain(st, now);   // chuỗi niệm: đồng hồ trùm + DoT đứng, không fill/burn bên dưới
  if (bossLocked(st, now)) return;
  if (st.lockUntil) bossEndLock(st, now);
  if (st.armedAt && now - st.armedAt >= T.prefixWaitMs) { castComplete(st, now, st.armedAt); return; }
  // chậm thời gian: đang gõ đúng, chữ đúng cuối chưa quá slowIdleMs, chưa vượt trần theo độ dài từ
  const cap = T.slowCapPerLetterMs * Math.max.apply(null, st.targets.map(t => t.length));
  const slow = st.typed.length > 0 && now - st.lastGoodKeyAt < T.slowIdleMs && st.slowUsedMs < cap;
  if (slow) st.slowUsedMs += dtMs;
  const target = slow ? T.slowScale : 1;
  st.timeScale += (target - st.timeScale) * Math.min(1, 8 * dtMs / 1000);
  if (Math.abs(st.timeScale - target) < 0.01) st.timeScale = target;
  const dt = dtMs / 1000 * st.timeScale;
  // thanh tấn công của trùm (đóng băng tính thời gian thật) — đầy ≥ 1 → quái đánh, xem boss-game-threat-gauge.js
  if (st.frozen && now >= st.frozenUntil) { st.frozen = false; bossEmit(st, 'unfreeze', {}); }
  if (!st.frozen) bossThreatFill(st, dt);
  if (!st.frozen && st.threat >= 1) {   // đóng băng: thanh có thể đã đầy do typo/giveup trước đó nhưng KHÔNG đánh cho tới khi hết băng
    bossEmit(st, 'bossAttack', {});
    const hadShield = st.shield > 0, lost = bossThreatAttack(st) === 'lost';
    bossEmit(st, hadShield ? 'shieldBlock' : 'hurt', hadShield ? {} : { hearts: st.hearts });
    if (!hadShield) { bossComboBreak(st); st.afterHit = true; }   // counter chỉ kích khi MẤT TIM, không khi khiên chặn
    if (lost) { st.phase = 'lost'; bossEmit(st, 'lost', {}); return; }
  }
  if (st.burn) {   // thiêu đốt theo thời gian game
    const g = Math.min(st.burn.left, dt), dmg = Math.min(st.hp, st.burn.dps * g);
    st.hp -= dmg; st.dealt += dmg; st.burn.left -= g; st.burn.acc += g; st.burn.sum += dmg;
    if (st.burn.acc >= 1) { st.burn.acc -= 1; bossEmit(st, 'burnTick', { dmg: st.burn.sum, hp: st.hp }); st.burn.sum = 0; }
    if (st.burn.left <= 0) st.burn = null;
    if (st.hp <= 0) { st.hp = 0; st.wonAt = now + T.endDelayMs; st.burn = null; }
  }
}

if (typeof module !== 'undefined') module.exports = { createBattle, typeKey, castComplete, submitTyped, giveUp, useUltimate, pauseBattle, resumeBattle, stepBattle };
