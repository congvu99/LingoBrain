/* Game Pháp Sư Lexoria — máy trạng thái trận, thuần. Chỗ DUY NHẤT quyết định thời điểm: render/UI chỉ vẽ theo st.events.
   Thời gian: `now` = ms thật (performance.now); đồng hồ trùm và DoT chạy theo thời gian game (thật × timeScale).
   Khoá (lockUntil: chờ phép chạm, lộ đáp án, cắt cảnh tuyệt kỹ): đồng hồ + DoT dừng, phím bị bỏ, đề kế hiện sau khoá.
   Cần plane-game-text.js, word-games.js (addMiss), boss-game-spell-math.js, boss-game-elements.js nạp trước. */

function createBattle(o) {
  const T = BOSS_TUNING, mods = o.mods || modifiersFor({}, 'fire'), now = o.now || 0;
  const hpMax = o.monster.hp, clockMax = (T.clock[o.difficulty] || T.clock.normal) + mods.clockAdd;
  const st = {
    phase: 'play', monster: o.monster, groups: o.groups, gi: -1, tiers: o.tiers || new Map(), mods, rand: o.rand || Math.random,
    hpMax, hp: Math.max(1, hpMax - (o.carryDmg || 0)), hearts: o.hearts, heartsMax: o.hearts, clock: clockMax, clockMax,
    timeScale: 1, rage: 0, group: null, targets: [], tier: 1, typed: '', typos: 0, forgiven: false,
    readyAt: now, pausedMs: 0, pausedAt: 0, lastGoodKeyAt: -Infinity, slowUsedMs: 0,
    armedAt: 0, lockUntil: 0, lockNext: false, ultEnd: false, pendingImpacts: [], shield: mods.shield, frozenUntil: 0, frozen: false,
    burn: null, boost: null, wonAt: 0, dealt: 0, log: [], miss: [], events: []
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
/* Thao tác người chơi được không: bắt kịp va chạm + hết khoá NGAY lúc phím tới (không chờ stepBattle kế),
   để phím đầu của đề mới không bị so với đề cũ */
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
  bossEmit(st, 'typo', { typos: st.typos });
  if (st.typos >= 3) {
    bossAddMisses(st);
    st.log.push({ ids: st.group.ids, word: st.group.answers[0], ok: false });
    bossEmit(st, 'fizzle', { answer: st.group.answers[0] });
    bossLockFor(st, now + BOSS_TUNING.revealMs, true);
  }
}

/* at = lúc gõ chữ cuối (mặc định now) — tốc độ tính tới đó, va chạm tính từ now */
function castComplete(st, now, at) {
  const T = BOSS_TUNING, m = st.mods, letters = st.typed.length;
  const ms = Math.max(0, (at || now) - st.readyAt);
  st.armedAt = 0;
  const speed = speedMult(ms, letters, m.speedLoosen);
  const crit = !!m.fastCrit && speed >= 2;
  let dmg = spellDamage({ tier: st.tier, speed, weakHit: st.monster.weak === m.element, mods: m, crit }), hits = 1;
  if (st.boost) {
    if (st.boost.id === 'meteor') dmg *= 3; else { dmg *= 2; hits = 2; }
    if (--st.boost.left <= 0) st.boost = null;
  }
  const impactAt = now + T.impactMs[st.tier];
  st.pendingImpacts.push({ at: impactAt, dmg, tier: st.tier });
  st.log.push({ ids: st.group.ids, word: st.typed, ok: true, ms, tier: st.tier, dmg });
  bossEmit(st, 'cast', { element: m.element, tier: st.tier, dmg, speed, crit, hits, impactAt, word: st.group.answers[st.targets.indexOf(st.typed)] });
  if (crit) bossEmit(st, 'fastCrit', {});
  if (st.rage < T.rageMax && ++st.rage === T.rageMax && m.ultimate) bossEmit(st, 'rageFull', {});
  bossLockFor(st, impactAt, true);
}

/* Enter: đang chờ đáp án ngắn → niệm luôn; chưa gõ gì → Bỏ. Trả về đã làm gì để UI biết. */
function submitTyped(st, now) {
  if (!bossCanAct(st, now)) return '';
  if (st.armedAt) { castComplete(st, now, st.armedAt); return 'cast'; }
  if (!st.typed) { giveUp(st, now); return 'giveup'; }
  return '';
}

function giveUp(st, now) {
  if (!bossCanAct(st, now)) return;
  if (st.armedAt) { castComplete(st, now, st.armedAt); return; }   // đã gõ trọn đáp án ngắn → niệm, không tính miss oan
  bossAddMisses(st);
  st.log.push({ ids: st.group.ids, word: st.group.answers[0], ok: false });
  st.rage = Math.max(0, st.rage - 2);
  bossEmit(st, 'giveup', { answer: st.group.answers[0] });
  bossLockFor(st, now + BOSS_TUNING.revealMs, true);
}

function useUltimate(st, now) {
  const T = BOSS_TUNING, id = st.mods.ultimate;
  if (!id || st.rage < T.rageMax || !bossCanAct(st, now)) return false;
  st.rage = 0;
  const end = now + T.ultimateMs;
  if (id === 'meteor' || id === 'chain') st.boost = { id, left: BOSS_BOOST_SPELLS };
  else if (id === 'iceAge') { st.frozenUntil = Math.max(st.frozenUntil, end + BOSS_ICE_AGE_MS); st.frozen = true; }
  else if (id === 'revive') st.hearts = st.heartsMax;
  else if (id === 'tornado') st.clock = st.clockMax;
  st.typed = ''; st.armedAt = 0; st.ultEnd = true;
  bossEmit(st, 'ultimate', { id, until: end });
  bossLockFor(st, end, false);
  return true;
}

/* Tạm dừng: dời mọi mốc thời gian thật đi đúng khoảng dừng → tốc độ, khoá, va chạm, đóng băng không bị tính giờ dừng */
function pauseBattle(st, now) { if (!st.pausedAt) st.pausedAt = now || 1e-9; }
function resumeBattle(st, now) {
  if (!st.pausedAt) return;
  const d = Math.max(0, now - st.pausedAt);
  st.pausedAt = 0; st.pausedMs += d;
  st.readyAt += d; st.lastGoodKeyAt += d;
  ['armedAt', 'lockUntil', 'frozenUntil', 'wonAt'].forEach(k => { if (st[k]) st[k] += d; });   // 0 = chưa đặt, giữ nguyên
  st.pendingImpacts.forEach(p => { p.at += d; });
}

function bossApplyImpacts(st, now) {
  const m = st.mods;
  st.pendingImpacts = st.pendingImpacts.filter(p => {
    if (p.at > now) return true;
    const real = Math.min(st.hp, p.dmg);
    st.hp -= real; st.dealt += real;
    bossEmit(st, 'impact', { dmg: p.dmg, tier: p.tier, hp: st.hp });
    if (m.burn) st.burn = { dps: m.burn.dps, left: m.burn.sec, acc: 0, sum: 0 };
    if (m.freezeChance && st.rand() < m.freezeChance) {
      st.frozenUntil = Math.max(st.frozenUntil, now + m.freezeSec * 1000); st.frozen = true;
      bossEmit(st, 'freeze', { until: st.frozenUntil });
    }
    return false;
  });
  if (st.hp <= 0 && !st.wonAt) { st.hp = 0; st.wonAt = now + BOSS_TUNING.endDelayMs; st.burn = null; }
}

const BOSS_MAX_STEP_MS = 250;   // khung hình bị treo lâu (tab nền chưa kịp pause) không được trừ cả đống đồng hồ một lần
function stepBattle(st, dtMs, now) {
  const T = BOSS_TUNING;
  if (st.phase !== 'play' || st.pausedAt) return;
  dtMs = Math.min(Math.max(0, dtMs), BOSS_MAX_STEP_MS);
  bossApplyImpacts(st, now);
  if (st.wonAt) { if (now >= st.wonAt) { st.phase = 'won'; bossEmit(st, 'won', {}); } return; }
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
  // đồng hồ trùm (đóng băng tính thời gian thật)
  if (st.frozen && now >= st.frozenUntil) { st.frozen = false; bossEmit(st, 'unfreeze', {}); }
  if (!st.frozen) st.clock -= dt;
  if (st.clock <= 0) {
    st.clock = st.clockMax;
    bossEmit(st, 'bossAttack', {});
    if (st.shield > 0) { st.shield--; bossEmit(st, 'shieldBlock', {}); }
    else { st.hearts--; bossEmit(st, 'hurt', { hearts: st.hearts }); }
    if (st.hearts <= 0) { st.phase = 'lost'; bossEmit(st, 'lost', {}); return; }
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
