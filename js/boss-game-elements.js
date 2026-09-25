/* Game Pháp Sư Lexoria — cây 5 nguyên tố, thuần. Cần boss-progress-sync-merge.js (BOSS_ELEMENTS) nạp trước.
   Nội tại bậc 1–2 của MỌI nhánh đã cộng điểm đều bật; trường phái (activeEl) chỉ quyết định màu phép, khắc hệ và
   tuyệt kỹ — tuyệt kỹ CÓ SẴN ngay khi chọn trường phái, không cần cộng điểm nhánh đó (mở sớm, xem BOSS_ULTIMATES).
   Bậc 3 của nhánh trường phái đang chọn không cộng modifier như bậc 1–2 (ELEMENT_RANKS chỉ có bậc 1–2) — thay vào
   đó cộng m.ultBonus = BOSS_TUNING.rank3UltBonus (+0.25 vào hệ số k chuỗi niệm, xem bossEndChain ở
   js/boss-game-combo-chain.js), cộng dồn với evoUltBonus (dạng tiến hoá cấp 16) qua cùng một đường bonus. */

const BOSS_ULTIMATES = { fire: 'meteor', ice: 'iceAge', storm: 'chain', earth: 'revive', wind: 'tornado' };
const BOSS_BOOST_SPELLS = 3;          // Mưa sao băng / Xích sét cường hoá 3 phép kế
const BOSS_ICE_AGE_MS = 8000;         // Kỷ băng hà dừng đồng hồ trùm (thời gian thật)

/* Bảng brainstorm §3.3: mỗi bậc là phần cộng vào modifiers. Chỉ có bậc 1–2 — tuyệt kỹ (BOSS_ULTIMATES) giờ
   gắn thẳng theo trường phái đang chọn (modifiersFor), không còn nằm ở bậc 3 nữa. */
const ELEMENT_RANKS = {
  fire:  { 1: { dmgMul: 0.15 }, 2: { burn: { dps: 5, sec: 3 } } },
  ice:   { 1: { clockAdd: 1.5 }, 2: { freezeChance: 0.25, freezeSec: 3 } },
  storm: { 1: { speedLoosen: 0.2 }, 2: { fastCrit: true } },
  earth: { 1: { maxHeartsAdd: 1 }, 2: { shield: 1 } },
  wind:  { 1: { hintFirst: true }, 2: { typoForgive: 1 } }
};
const ELEMENT_LABEL = { fire: '🔥 Lửa', ice: '❄️ Băng', storm: '⚡ Sét', earth: '🌿 Đất', wind: '🌪️ Gió' };

const rankOf = (alloc, el) => Math.max(0, Math.min(3, Math.round(+(alloc && alloc[el]) || 0)));

function modifiersFor(alloc, activeEl) {
  const el = BOSS_ELEMENTS.indexOf(activeEl) >= 0 ? activeEl : BOSS_ELEMENTS[0];
  const m = {
    element: el, dmgMul: 1, burn: null, clockAdd: 0, freezeChance: 0, freezeSec: 0, speedLoosen: 0, fastCrit: false,
    maxHeartsAdd: 0, shield: 0, hintFirst: false, typoForgive: 0, ultimate: null, ultBonus: 0
  };
  BOSS_ELEMENTS.forEach(e => {
    const r = rankOf(alloc, e);
    for (let k = 1; k <= Math.min(2, r); k++) {
      const add = ELEMENT_RANKS[e][k];
      for (const key in add) {
        if (key === 'dmgMul') m.dmgMul += add.dmgMul;
        else if (typeof add[key] === 'number' && key !== 'freezeSec') m[key] += add[key];
        else m[key] = add[key];
      }
    }
  });
  m.ultimate = BOSS_ULTIMATES[el];   // mở sớm: tuyệt kỹ luôn có ngay theo trường phái đang chọn, không cần bậc
  if (rankOf(alloc, el) >= 3) m.ultBonus = BOSS_TUNING.rank3UltBonus;   // bậc 3 = tuyệt kỹ mạnh hơn, không phải mở khoá nữa
  return m;
}

const allocSum = alloc => BOSS_ELEMENTS.reduce((s, e) => s + rankOf(alloc, e), 0);
/* Điểm còn = cấp−1 − tổng đã cộng, kẹp ≥ 0 (alloc gộp max giữa máy có thể vượt điểm theo cấp) */
function pointsLeft(level, alloc) { return Math.max(0, (level | 0) - 1 - allocSum(alloc)); }
/* Cộng được bậc kế cho nhánh el: nhánh hợp lệ, chưa bậc 3, còn điểm (bậc luôn tăng theo thứ tự 1→2→3) */
function canRankUp(alloc, el, level) {
  return BOSS_ELEMENTS.indexOf(el) >= 0 && rankOf(alloc, el) < 3 && pointsLeft(level, alloc) > 0;
}

if (typeof module !== 'undefined') module.exports = {
  BOSS_ULTIMATES, BOSS_BOOST_SPELLS, BOSS_ICE_AGE_MS, ELEMENT_RANKS, ELEMENT_LABEL, modifiersFor, pointsLeft, canRankUp
};
