/* Game Pháp Sư Lexoria — toán phép, thuần: số cân bằng, độ khó từ, bậc chiêu tương đối, tốc độ, sát thương, pool đề.
   Chạy trong Node và trình duyệt. Cần plane-game-text.js (normalizeTyped, typedLetters, planeLabel) nạp trước.
   Mọi con số cân bằng CHỈ nằm trong BOSS_TUNING. */

const BOSS_TUNING = {
  // ~40 phép/quái thường (sát thương trung bình ~25 × ~4s/từ ≈ 2–3 phút ở cấp Vừa), trùm chương gấp đôi (~4–5 phút)
  hp: { minion: 1000, boss: 2000 },
  tierBase: [0, 10, 20, 40],          // sát thương gốc theo bậc ✦ / ✦✦ / ✦✦✦
  tierShare: [0.3, 0.4],              // 30% từ khó nhất trong pool → ✦✦✦, 40% kế → ✦✦, còn lại ✦
  speed: { baseMs: 1500, perLetterMs: 350 },
  clock: { easy: 12, normal: 10, hard: 8 },   // giây để thanh tấn công đầy (hub hiện "10s"); tên giữ nguyên, xem boss-game-threat-gauge.js
  threatDrain: 0.35, threatTypo: 0.1, threatMiss: 0.25,   // thanh tấn công (0..1): niệm đúng giảm, gõ sai/bỏ tăng
  ultMax: 10,                         // thanh tuyệt kỹ (thay Nộ 8 từ cũ) — xem js/boss-game-combo-chain.js
  comboStep: 0.05, comboCap: 1.5,     // combo: sát thương ×min(comboCap, 1 + comboStep×combo)
  chainMs: 9000,                      // chuỗi niệm (thời gian thật) sau khi kích hoạt tuyệt kỹ
  impactMs: [0, 250, 450, 800],       // trễ từ lúc niệm xong tới lúc phép chạm, theo bậc
  afterImpactMs: [0, 350, 450, 600],  // đuôi cố định sau va chạm (đỉnh VFX nổ) trước khi hiện đề kế; đuôi sprite được chạy tiếp dưới đề mới
  endDelayMs: 900,                    // hp ≤ 0 tại impact → màn thắng sau chừng này
  revealMs: 1200,                     // lộ đáp án (bỏ / hỏng phép) trước khi sang đề kế
  prefixWaitMs: 400,                  // gõ xong đáp án ngắn mà còn đáp án dài hơn (south/southern) → chờ chừng này rồi mới niệm
  ultimateMs: 1500,                   // cắt cảnh tuyệt kỹ (thời gian thật, đồng hồ trùm dừng)
  slowScale: 0.35, slowIdleMs: 1500, slowCapPerLetterMs: 1200,
  weakMul: 1.5, critMul: 1.5,
  xpPerDmg: 0.1, xpStoryWin: 100, buffXpMul: 1.5   // ~200 XP/trận truyện → đủ 15 điểm cây (cấp 16) sau vài tuần chơi đều
};
const BOSS_MIN_SELF_LETTERS = 3;      // nghĩa chứa chính từ (≥3 chữ: piano, taxi…) → lộ đáp án, loại khỏi pool

/* Điểm độ khó của một từ với người chơi: càng hay quên / đang học / interval ngắn / từ dài → càng khó */
function wordDifficulty(rec, letters) {
  const r = rec || {};
  return 2 * (r.lapses || 0) + 2 * ((r.ef || 2.5) < 2 ? 1 : 0) + 3 * (r.state !== 'review' ? 1 : 0) +
    Math.max(0, (21 - (r.ivl || 0)) / 7) + (letters >= 10 ? 1 : 0);
}

/* Bậc chiêu TƯƠNG ĐỐI trong pool của chính người chơi (người mới học vẫn đủ 3 bậc).
   words: [{id, word}] → Map id → 1|2|3. Hoà điểm → so id (tất định). */
function assignTiers(words, srs) {
  srs = srs || {};
  const scored = words.map(w => ({ id: w.id, d: wordDifficulty(srs[w.id], typedLetters(String(w.word || '')).length) }));
  scored.sort((a, b) => b.d - a.d || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const n = scored.length, n3 = Math.round(n * BOSS_TUNING.tierShare[0]), n2 = Math.round(n * BOSS_TUNING.tierShare[1]);
  const out = new Map();
  scored.forEach((s, i) => out.set(s.id, i < n3 ? 3 : i < n3 + n2 ? 2 : 1));
  return out;
}

/* Hệ số tốc độ 1..2: mốc = (base + perLetter·chữ)·(1+loosen); ≤ nửa mốc → 2, ≥ mốc → 1, giữa → tuyến tính */
function speedMult(ms, letters, loosen) {
  const mark = (BOSS_TUNING.speed.baseMs + BOSS_TUNING.speed.perLetterMs * letters) * (1 + (loosen || 0));
  if (ms <= mark / 2) return 2;
  if (ms >= mark) return 1;
  return 2 - (ms - mark / 2) / (mark / 2);
}

/* Sát thương một phép = gốc(bậc) × tốc độ × khắc hệ × nội tại (Lửa) × chí mạng (Sét) × combo */
function spellDamage(o) {
  const mods = o.mods || {};
  return Math.round(BOSS_TUNING.tierBase[o.tier] * (o.speed || 1) * (o.weakHit ? BOSS_TUNING.weakMul : 1) *
    (mods.dmgMul || 1) * (o.crit ? BOSS_TUNING.critMul : 1) * (o.combo || 1));
}

/* Khoá đề = đúng cái người chơi nhìn thấy (emoji + vế nghĩa hiển thị) → hai từ cùng đề gộp chung, gõ từ nào cũng đúng */
function bossPromptKey(w) {
  const label = planeLabel({ meaning: w.meaning }).toLowerCase().replace(/\s+/g, ' ').trim();
  return (w.emoji || '') + '|' + label;
}

/* Pool đề: bỏ từ tự lộ đáp án (so với phần nghĩa HIỂN THỊ trên đề), nhóm theo đề → [{key, prompt, answers:[normalizeTyped(word)], ids, words}] */
function buildBossPool(pool) {
  const groups = new Map();
  (pool || []).forEach(w => {
    const ans = normalizeTyped(w.word), mean = normalizeTyped(planeLabel({ meaning: w.meaning }));
    if (!ans || (typedLetters(ans).length >= BOSS_MIN_SELF_LETTERS && mean.indexOf(ans) >= 0)) return;
    const key = bossPromptKey(w);
    let g = groups.get(key);
    if (!g) { g = { key, prompt: planeLabel(w), answers: [], ids: [], words: [] }; groups.set(key, g); }
    if (g.answers.indexOf(ans) < 0) g.answers.push(ans);
    g.ids.push(w.id); g.words.push(w);
  });
  return Array.from(groups.values());
}

/* Trọng số bốc đề (truyền vào pickGameWords): ưu tiên từ hay quên / ease thấp / đang học */
function bossWordWeight(rec) {
  const r = rec || {};
  return 1 + 2 * (r.lapses || 0) + 2 * ((r.ef || 2.5) < 2 ? 1 : 0) + 2 * (r.state !== 'review' ? 1 : 0);
}

if (typeof module !== 'undefined') module.exports = {
  BOSS_TUNING, wordDifficulty, assignTiers, speedMult, spellDamage, bossPromptKey, buildBossPool, bossWordWeight
};
