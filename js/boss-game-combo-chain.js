/* Game Pháp Sư Lexoria — combo (nhân sát thương) + thanh tuyệt kỹ + chuỗi niệm (BOSS_TUNING.chainWords từ), thuần.
   Nạp SAU js/boss-game-spell-math.js + js/boss-game-elements.js, TRƯỚC js/boss-game-logic.js: logic gọi các hàm ở
   đây; các hàm ở đây gọi ngược bossEmit/bossLockFor (định nghĩa ở boss-game-logic.js) và
   normalizeTyped/isFixedTyped/typedLetters (plane-game-text.js) — chạy đúng vì mọi script đã nạp xong trước khi
   trận thật sự bắt đầu gọi các hàm này (không phụ thuộc thứ tự định nghĩa, chỉ phụ thuộc thứ tự GỌI). */

/* Combo: +1 mỗi cast KHÔNG lỗi gõ (typos === 0); cast có lỗi vẫn giữ combo, không cộng. Reset (bossComboBreak) khi
   bị quái đánh TRÚNG (mất tim), giveup, fizzle — khiên chặn KHÔNG reset (quyết định người dùng, xem plan.md).
   now dùng để kiểm hồi chiêu (st.ultCooldownUntil, đặt ở bossApplyUltimate): trong lúc hồi chiêu, combo vẫn cộng
   bình thường nhưng thanh tuyệt kỹ (st.ult) KHÔNG được cộng từ nguồn nào (cân bằng Gió: ultAdd + ultMax thấp từng
   dồn tuyệt kỹ gần như liên tục, xem sim trong report). */
function bossComboOnCast(st, speed, now) {
  const T = BOSS_TUNING;
  if (st.typos === 0) st.combo++;
  if (st.ult < T.ultMax && !(st.ultCooldownUntil && now < st.ultCooldownUntil)) {
    st.ult = Math.min(T.ultMax, st.ult + 1 + (st.typos === 0 && speed >= 1.5 ? 1 : 0));
    if (st.ult >= T.ultMax && st.mods.ultimate) bossEmit(st, 'ultFull', {});
  }
}

function bossComboBreak(st) { st.combo = 0; }

/* Hệ số nhân sát thương theo combo hiện tại, trần comboCap — dùng làm o.combo trong spellDamage */
function bossComboMul(st) { return Math.min(BOSS_TUNING.comboCap, 1 + BOSS_TUNING.comboStep * st.combo); }

/* Luôn đúng chainWords từ — pool đủ lớn thì xoay vòng như bossNextPrompt, không lặp đề đang hiện; pool nhỏ (ít
   hơn chainWords đề KHÁC đề đang hiện) thì LẶP LẠI các đề khác đó cho đủ; pool chỉ có 1 đề (= đề đang hiện, không
   còn đề nào khác) thì đành lặp lại chính đề đang hiện — không bao giờ trả về chuỗi rỗng/thiếu (M1: chuỗi rỗng
   từng khiến 12s trôi qua không có gì để gõ). */
function bossChainWords(st) {
  const n = st.groups.length, want = BOSS_TUNING.chainWords, words = [];
  if (!n) return words;   // không có đề nào cả — không nên xảy ra (bossNextPrompt luôn cần ≥1 đề để mở trận)
  for (let i = 1; words.length < want; i++) {
    const g = st.groups[(st.gi + i) % n];
    if (g !== st.group || n === 1) words.push(g);
  }
  return words;
}

/* Bậc cao nhất trong các từ của chuỗi (cố định cho cả chuỗi — mỗi đòn chainHit đều gây sát thương ở bậc này) */
function bossChainMaxTier(st, words) {
  if (!words.length) return 1;
  return Math.max.apply(null, words.map(g => Math.max.apply(null, g.ids.map(id => st.tiers.get(id) || 1))));
}

/* Kích hoạt chuỗi niệm: chainWords từ kế (BOSS_TUNING.chainWords), chainMs thật (BOSS_TUNING.chainMs); trong lúc
   chuỗi, stepBattle rẽ sang bossStepChain ở dưới, KHÔNG fill thanh tấn công / KHÔNG chạy DoT (xem
   boss-game-logic.js:stepBattle). timeScale về 1 ngay khi chuỗi mở — nếu tuyệt kỹ bấm giữa lúc đang chậm thời gian
   (gõ đúng), không để việc chậm dính lại suốt chuỗi */
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
   Đi qua bossApplyHit (js/boss-game-skill-pick.js) CÙNG đường với impact phép thường — để thụ động
   lúc trúng đòn (thiêu đốt/đóng băng nội tại) cũng áp cho đòn chuỗi, nhất quán với phép thường; KHÔNG chọn chiêu
   tự phát cho đòn chuỗi (quyết định người dùng: chuỗi niệm không kích chiêu, chỉ nội tại) — bossApplyHit tự lo
   phần emit 'impact' cùng shape phép thường ({dmg, tier, hp}) để bossFxEvent/bossActorEvent chạy y hệt.
   fx.shots rỗng lúc chuỗi (khoá đảm bảo mọi đòn phép trước đó đã chạm) → impact tự rơi về preset hệ đang dùng.
   'chainHit' GIỮ LẠI chỉ để UI tiến độ chuỗi (progress dots/DOM) — không còn mang dmg/tier. */
function bossChainHit(st, now) {
  const c = st.chain, g = c.words[c.i], word = g.answers[0];
  const dmg = spellDamage({ tier: c.tier, speed: 1, weakHit: st.monster.weak === st.mods.element, mods: st.mods, combo: bossComboMul(st) });
  c.hits++; c.i++; c.typed = '';
  bossEmit(st, 'chainHit', { hits: c.hits, word, prompt: g.prompt });
  bossApplyHit(st, now, dmg, c.tier, {});
  if (st.hp <= 0) { st.chain = null; return; }   // wonAt đã đặt trong bossApplyHit; chỉ cần xoá chain, KHÔNG áp tuyệt kỹ
  if (c.i >= c.words.length) bossEndChain(st, now);
}

/* Gọi mỗi khung hình khi đang chuỗi (thay fill thanh tấn công/DoT) — hết giờ thật thì kết chuỗi luôn,
   dù chưa gõ trọn hết từ (hệ số tính theo số từ đã trúng, xem bossChainFactor). */
function bossStepChain(st, now) {
  if (st.chain && now >= st.chain.until) bossEndChain(st, now);
}

/* Bonus cộng THẲNG vào k trước khi tính số phép cường hoá, gộp CHUNG một đường từ 2 nguồn cộng dồn được:
   st.evoUltBonus (0 hoặc 0.25 — dạng tiến hoá cấp 16, xem bossEvoUltBonus/js/boss-game-evolution.js) và
   st.mods.ultBonus (0 hoặc 0.25 — đạt bậc 3 nhánh trường phái đang chọn, xem js/boss-game-elements.js:modifiersFor);
   có cả 2 → +0.5. k=1 (1/chainWords từ trúng, hiệu lực tuyệt kỹ cũ) + 0.25 = 1.25 vẫn round(3×1.25)=4 KHÔNG đổi ở
   round thường — vì vậy meteor/chain đổi sang ceil(3×k) KHI có bonus (quyết định người dùng: "thưởng phải luôn có
   tác dụng"), các tuyệt kỹ khác (iceAge tuyến tính, revive/tornado theo bậc k, xem bossApplyUltimate) giữ nguyên.
   perfect = gõ trọn HẾT từ trong chuỗi (hits === số từ thật của chuỗi, luôn = chainWords từ khi có bonus M1) —
   CỐ Ý tính theo hits, KHÔNG theo k, để bonus (rank3/evo) không thể giả mạo "HOÀN HẢO"/nhãn perfect khi người chơi
   chỉ gõ được 1 phần chuỗi (review H2) — bonus chỉ được phép tăng SỐ, không được đổi nhãn. */
function bossEndChain(st, now) {
  const c = st.chain, bonus = (st.evoUltBonus || 0) + (st.mods.ultBonus || 0), k = bossChainFactor(c.hits) + bonus, id = st.mods.ultimate;
  const perfect = c.words.length > 0 && c.hits >= c.words.length;
  st.chain = null;
  bossEmit(st, 'chainEnd', { hits: c.hits, k, perfect });
  bossApplyUltimate(st, id, k, now, bonus > 0, perfect);
}

/* 0 từ trúng → 0.5 (yếu hơn cũ); 1 → 1 (đúng hiệu lực tuyệt kỹ cũ); chainWords (2) → 1.5 ("HOÀN HẢO") —
   bảng hệ số ở BOSS_TUNING.chainFactor, độ dài = chainWords + 1 */
function bossChainFactor(hits) { return BOSS_TUNING.chainFactor[Math.min(hits, BOSS_TUNING.chainWords)]; }

/* Số phép cường hoá (meteor/chain) theo hệ số — dùng chung cho hiệu lực trận VÀ số VFX phóng ra
   (js/boss-game-tier3-ultimate-fx.js); k=1 → 3 phép, đúng bằng BOSS_BOOST_SPELLS cũ. boosted (mặc định
   false — mọi lời gọi cũ giữ nguyên round) → ceil thay vì round, để evoUltBonus luôn đổi số phép cường hoá. */
function bossUltBoostCount(k, boosted) {
  return Math.max(1, boosted ? Math.ceil(BOSS_BOOST_SPELLS * k) : Math.round(BOSS_BOOST_SPELLS * k));
}

/* Áp hiệu lực tuyệt kỹ theo hệ số k rồi mở cắt cảnh ultimateMs (như useUltimate cũ) — k=1 tái tạo NGUYÊN VẸN
   hiệu lực tuyệt kỹ cũ (rageMax 8 từ trước đây), k=0.5 yếu hơn, k>1 (từ gõ trọn chuỗi VÀ/HOẶC bonus rank3/evo)
   mạnh hơn. boosted chỉ đổi công thức làm tròn số phép cường hoá meteor/chain. perfect (gõ trọn HẾT từ, xem
   bossEndChain) chỉ dùng để BÁO cho FX/HUD (nhãn "HOÀN HẢO") — KHÔNG dùng để quyết định số liệu ở đây; số liệu
   revive/tornado chỉ phụ thuộc k, để bonus rank3/evo LUÔN có tác dụng thấy được dù gõ thiếu từ (review H1: trước
   đây tornado/revive chỉ đổi ở mốc cứng k≥1.5 nên +0.25 một mình không bao giờ đủ). */
function bossApplyUltimate(st, id, k, now, boosted, perfect) {
  const T = BOSS_TUNING, end = now + T.ultimateMs;
  st.ultCooldownUntil = end + T.ultCooldownMs;   // hồi chiêu tính từ lúc cắt cảnh KẾT THÚC (end), không phải lúc bấm
  if (id === 'meteor' || id === 'chain') st.boost = { id, left: bossUltBoostCount(k, boosted) };
  else if (id === 'iceAge') { st.frozenUntil = Math.max(st.frozenUntil, end + BOSS_ICE_AGE_MS * k); st.frozen = true; }
  else if (id === 'revive') {
    st.hearts = Math.min(st.heartsMax, st.hearts + Math.ceil((st.heartsMax - st.hearts) * k));
    const add = k >= T.reviveShieldK2 ? 2 : k >= T.reviveShieldK1 ? 1 : 0;   // k=1 (cũ) < reviveShieldK1 → 0, đúng hiệu lực cũ
    if (add) st.shield = Math.min(T.shieldCap, (st.shield || 0) + add);
  } else if (id === 'tornado') {
    st.threat = 0;
    // k=1 (cũ) → k>1 sai → không đóng băng thêm, đúng hiệu lực cũ; k>1 (chỉ có được nhờ gõ trọn chuỗi và/hoặc
    // bonus) → đóng băng thanh tấn công thêm — dùng lại field frozen/frozenUntil (Băng bậc 2), tôn trọng pause/resume
    if (k > 1) { st.frozenUntil = Math.max(st.frozenUntil, end + T.tornadoFreezeSecPerK * (k - 1) * 1000); st.frozen = true; }
  }
  st.typed = ''; st.armedAt = 0; st.ultEnd = true;
  bossEmit(st, 'ultimate', { id, until: end, k, boosted, perfect });
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
