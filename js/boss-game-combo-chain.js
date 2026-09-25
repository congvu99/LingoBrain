/* Game Pháp Sư Lexoria — combo (nhân sát thương) + thanh tuyệt kỹ + chuỗi niệm 3 từ, thuần.
   Nạp SAU js/boss-game-spell-math.js + js/boss-game-elements.js, TRƯỚC js/boss-game-logic.js: logic gọi các hàm ở
   đây; các hàm ở đây gọi ngược bossEmit/bossLockFor (định nghĩa ở boss-game-logic.js) và
   normalizeTyped/isFixedTyped/typedLetters (plane-game-text.js) — chạy đúng vì mọi script đã nạp xong trước khi
   trận thật sự bắt đầu gọi các hàm này (không phụ thuộc thứ tự định nghĩa, chỉ phụ thuộc thứ tự GỌI). */

/* Combo: +1 mỗi cast KHÔNG lỗi gõ (typos === 0); cast có lỗi vẫn giữ combo, không cộng. Reset (bossComboBreak) khi
   bị quái đánh TRÚNG (mất tim), giveup, fizzle — khiên chặn KHÔNG reset (quyết định người dùng, xem plan.md). */
function bossComboOnCast(st, speed) {
  const T = BOSS_TUNING;
  if (st.typos === 0) st.combo++;
  if (st.ult < T.ultMax) {
    st.ult = Math.min(T.ultMax, st.ult + 1 + (st.typos === 0 && speed >= 1.5 ? 1 : 0));
    if (st.ult >= T.ultMax && st.mods.ultimate) bossEmit(st, 'ultFull', {});
  }
}

function bossComboBreak(st) { st.combo = 0; }

/* Hệ số nhân sát thương theo combo hiện tại, trần comboCap — dùng làm o.combo trong spellDamage */
function bossComboMul(st) { return Math.min(BOSS_TUNING.comboCap, 1 + BOSS_TUNING.comboStep * st.combo); }

/* 3 group kế trong st.groups, xoay vòng như bossNextPrompt, không lặp đề đang hiện (st.group) */
function bossChainWords(st) {
  const n = st.groups.length, words = [];
  for (let i = 1; i <= n && words.length < 3; i++) {
    const g = st.groups[(st.gi + i) % n];
    if (g !== st.group) words.push(g);
  }
  return words;
}

/* Bậc cao nhất trong 3 từ của chuỗi (cố định cho cả chuỗi — mỗi đòn chainHit đều gây sát thương ở bậc này) */
function bossChainMaxTier(st, words) {
  if (!words.length) return 1;
  return Math.max.apply(null, words.map(g => Math.max.apply(null, g.ids.map(id => st.tiers.get(id) || 1))));
}

/* Kích hoạt chuỗi niệm: 3 từ kế, 9s thật (BOSS_TUNING.chainMs); trong lúc chuỗi, stepBattle rẽ sang bossStepChain
   ở dưới, KHÔNG fill thanh tấn công / KHÔNG chạy DoT (xem boss-game-logic.js:stepBattle).
   timeScale về 1 ngay khi chuỗi mở — nếu tuyệt kỹ bấm giữa lúc đang chậm thời gian (gõ đúng), không để việc chậm
   dính lại suốt 9s chuỗi */
function bossStartChain(st, now) {
  const words = bossChainWords(st);
  st.chain = { words, i: 0, hits: 0, typed: '', tier: bossChainMaxTier(st, words), until: now + BOSS_TUNING.chainMs };
  st.timeScale = 1;
  bossEmit(st, 'chainStart', { tier: st.chain.tier });
}

/* Phím trong chuỗi: tiền tố đúng → gõ tiếp (emit chainKey để DOM #bossPrompt cập nhật tiến độ); gõ trọn
   từ → chainHit, sang từ kế; gõ sai → về lại từ đầu của CHÍNH từ đó, emit chainTypo (rung thẻ đề như gõ sai
   thường) — không tính typo, không cộng thanh tấn công, không fizzle (khác luật gõ đề thường). */
function bossChainKey(st, ch, now) {
  const c = st.chain;
  if (!c || st.phase !== 'play' || st.pausedAt) return;
  ch = normalizeTyped(ch);
  if (ch.length !== 1 || isFixedTyped(ch)) return;
  const g = c.words[c.i];
  if (!g) return;
  const targets = g.answers.map(typedLetters), next = c.typed + ch;
  if (targets.some(t => t.indexOf(next) === 0)) {
    c.typed = next;
    if (targets.indexOf(next) >= 0) bossChainHit(st, now); else bossEmit(st, 'chainKey', { typed: next });
  } else {
    c.typed = '';
    bossEmit(st, 'chainTypo', {});
  }
}

/* 1 từ chuỗi gõ trọn = 1 đòn sát thương ở bậc cao nhất của chuỗi (c.tier), KHÔNG tính tốc độ gõ (phase-3 spec) —
   dùng lại spellDamage với speed cố định 1, vẫn qua khắc hệ + o.combo như phép thường (nhất quán công thức sát
   thương, không cộng thêm luật riêng). Quái chết giữa chuỗi → thắng ngay theo luồng wonAt như phép thường, xoá
   st.chain và KHÔNG áp tuyệt kỹ.
   Emit CẢ 'impact' cùng shape với impact phép thường ({dmg, tier, hp}) — để bossFxEvent/bossActorEvent
   (spell-art.js/sprite-actors.js) chạy y hệt phép thường: rung/nháy trắng/VFX theo hệ + tan pixel NGAY khi hạ gục.
   fx.shots rỗng lúc chuỗi (khoá đảm bảo mọi đòn phép trước đó đã chạm) → impact tự rơi về preset hệ đang
   dùng, đúng như spell-art.js đã viết sẵn cho trường hợp "không có quả phép đang bay". 'chainHit' GIỮ LẠI chỉ để
   UI tiến độ chuỗi (progress dots/DOM) — không còn mang dmg/tier. */
function bossChainHit(st, now) {
  const c = st.chain, g = c.words[c.i], word = g.answers[0];
  const dmg = spellDamage({ tier: c.tier, speed: 1, weakHit: st.monster.weak === st.mods.element, mods: st.mods, combo: bossComboMul(st) });
  const real = Math.min(st.hp, dmg);
  st.hp -= real; st.dealt += real;
  c.hits++; c.i++; c.typed = '';
  bossEmit(st, 'chainHit', { hits: c.hits, word, prompt: g.prompt });
  bossEmit(st, 'impact', { dmg: real, tier: c.tier, hp: st.hp });
  if (st.hp <= 0 && !st.wonAt) {
    st.hp = 0; st.wonAt = now + BOSS_TUNING.endDelayMs; st.burn = null; st.chain = null;
    return;
  }
  if (c.i >= c.words.length) bossEndChain(st, now);
}

/* Gọi mỗi khung hình khi đang chuỗi (thay fill thanh tấn công/DoT) — hết giờ thật thì kết chuỗi luôn,
   dù chưa gõ trọn 3 từ (hệ số tính theo số từ đã trúng, xem bossChainFactor). */
function bossStepChain(st, now) {
  if (st.chain && now >= st.chain.until) bossEndChain(st, now);
}

function bossEndChain(st, now) {
  const c = st.chain, k = bossChainFactor(c.hits), id = st.mods.ultimate;
  st.chain = null;
  bossEmit(st, 'chainEnd', { hits: c.hits, k });
  bossApplyUltimate(st, id, k, now);
}

/* 0–1 từ trúng → 0.5 (yếu hơn cũ); 2 → 1 (đúng hiệu lực tuyệt kỹ cũ); 3 → 1.5 ("HOÀN HẢO") */
function bossChainFactor(hits) { return hits >= 3 ? 1.5 : hits === 2 ? 1 : 0.5; }

/* Số phép cường hoá (meteor/chain) theo hệ số — dùng chung cho hiệu lực trận VÀ số VFX phóng ra
   (js/boss-game-tier3-ultimate-fx.js); k=1 → 3 phép, đúng bằng BOSS_BOOST_SPELLS cũ. */
function bossUltBoostCount(k) { return Math.max(1, Math.round(BOSS_BOOST_SPELLS * k)); }

/* Áp hiệu lực tuyệt kỹ theo hệ số k rồi mở cắt cảnh ultimateMs (như useUltimate cũ) — k=1 tái tạo NGUYÊN VẸN
   hiệu lực tuyệt kỹ cũ (rageMax 8 từ trước đây), k=1.5 mạnh hơn ("HOÀN HẢO"), k=0.5 yếu hơn. */
function bossApplyUltimate(st, id, k, now) {
  const T = BOSS_TUNING, end = now + T.ultimateMs;
  if (id === 'meteor' || id === 'chain') st.boost = { id, left: bossUltBoostCount(k) };
  else if (id === 'iceAge') { st.frozenUntil = Math.max(st.frozenUntil, end + BOSS_ICE_AGE_MS * k); st.frozen = true; }
  else if (id === 'revive') {
    st.hearts = Math.min(st.heartsMax, st.hearts + Math.ceil((st.heartsMax - st.hearts) * k));
    if (k >= 1.5) st.shield = (st.shield || 0) + 1;
  } else if (id === 'tornado') {
    st.threat = 0;
    if (k >= 1.5) st.shield = (st.shield || 0) + 1;
  }
  st.typed = ''; st.armedAt = 0; st.ultEnd = true;
  bossEmit(st, 'ultimate', { id, until: end, k });
  bossLockFor(st, end, false);
}

/* Bố cục thanh chuỗi niệm (canvas, boss-game-render.js:drawBossChainHud) — TÁCH pure ở đây (không chạm ctx) để
   Node test được không cần canvas. BOSS_TOP_HUD_BOTTOM = mép dưới khối HUD trên cùng (ô tuyệt kỹ/tim/tên quái,
   boss-game-render.js:drawBossHud — pad 10, cao cố định 40px → pad−4 .. pad−4+40 = 6..46) — chuỗi niệm phải vẽ
   HẲN dưới mốc này ở mọi cỡ màn để không đè lên nhau ở khung hẹp (~360px). */
const BOSS_TOP_HUD_BOTTOM = 46;
/* +28 (không chỉ +8) vì tiêu đề "CHUỖI NIỆM · …" vẽ NGAY TRÊN thanh (y−6, cỡ chữ 13px) — phải chừa đủ chỗ cho cả
   chữ tiêu đề lẫn khoảng hở, không chỉ cho mép trên của thanh. */
function bossChainHudLayout(w) {
  const bw = Math.min(260, w * 0.6);
  return { x: w / 2 - bw / 2, bw, y: BOSS_TOP_HUD_BOTTOM + 28 };
}

if (typeof module !== 'undefined') module.exports = {
  bossComboOnCast, bossComboBreak, bossComboMul, bossChainWords, bossChainMaxTier, bossStartChain, bossChainKey,
  bossChainHit, bossStepChain, bossChainFactor, bossUltBoostCount, bossApplyUltimate, bossChainHudLayout
};
