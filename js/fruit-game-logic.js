/* Game Chém chữ (kiểu Fruit Ninja) — logic thuần, không chạm DOM. Chạy trong Node và trình duyệt.
   Thế giới tính bằng px của khung chơi (st.w × st.h). Mỗi đợt tung vài quả mang từ tiếng Anh: đúng 1 quả
   khớp đề (nghĩa Việt), còn lại là bom — từ đã học na ná từ đúng. Một nhát vuốt được chấm lúc kết thúc:
   trúng bom nào → sai, chỉ trúng quả đúng → đúng. Sai hoặc để quả đúng rơi → mất 1 ❤️ và đợt kết thúc.
   Trả sự kiện ('split' | 'right' | 'wrong' | 'drop') để phần hiệu ứng vẽ. Không ghi SM-2: từ sai chỉ vào st.miss.
   Cần comboMult() của word-games.js (nạp trước). */

const FRUIT_LIVES = 3, FRUIT_HITS_PER_LEVEL = 5;
const FRUIT_STROKE_MAX = 0.6;   // giây: nhát dài hơn tự chấm, không cho giữ tay quét dần cả màn
const FRUIT_MIN_SEG = 8;        // px: đoạn vuốt ngắn hơn không cắt → chạm không vuốt không chém
const FRUIT_FAST = 1.0;         // giây: chém trong ngần ấy từ lúc quả xuất hiện được +5
const FRUIT_STAGGER = 0.25;     // giây: các quả trong đợt xuất phát lệch nhau tối đa ngần ấy
const FRUIT_WAVE_GAP = 0.4;     // giây nghỉ giữa 2 đợt
const FRUIT_FONT = 16;          // px chữ nhãn (phần vẽ co lại nếu tràn)
// count: số quả/đợt · air: giây bay lên + rơi về ở cấp 0 · speedup: chia thời gian bay mỗi cấp · lookAlike: bom na ná (Dễ: ngẫu nhiên)
const FRUIT_DIFFICULTIES = {
  easy:   { id: 'easy',   label: 'Dễ',  count: 3, air: 3.4, speedup: 1.05, lookAlike: false },
  normal: { id: 'normal', label: 'Vừa', count: 4, air: 2.8, speedup: 1.07, lookAlike: true },
  hard:   { id: 'hard',   label: 'Khó', count: 5, air: 2.3, speedup: 1.09, lookAlike: true }
};
const FRUIT_DIFFICULTY_IDS = ['easy', 'normal', 'hard'];
const fruitDifficulty = id => FRUIT_DIFFICULTIES[id] || FRUIT_DIFFICULTIES.normal;
/* Kỷ lục riêng mỗi cấp: Vừa = 'fruit', còn lại 'fruit-<cấp>' (khớp TASK_ID của sync-merge.js) */
const fruitScoreKey = id => { const d = fruitDifficulty(id); return d.id === 'normal' ? 'fruit' : 'fruit-' + d.id; };
const fruitAirTime = (level, d) => d.air / Math.pow(d.speedup, level);
/* Bán kính theo độ dài chữ, kẹp theo bề ngang khung để 5 quả vẫn vừa màn điện thoại */
const fruitRadius = (text, w) => Math.max(w * 0.085, Math.min(w * 0.14, String(text).length * 0.3 * FRUIT_FONT));

/* Levenshtein, không phân biệt hoa thường */
function editDistance(a, b) {
  a = String(a).toLowerCase(); b = String(b).toLowerCase();
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = row;
  }
  return prev[b.length];
}

function fruitShuffled(arr, rand) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)) % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/* Nghĩa như đề hiển thị (planeLabel lấy vế trước ';'): final "cuối cùng; …" và finally "cuối cùng" cùng khoá */
const fruitMeaningKey = w => String(w.meaning || '').split(';')[0].trim().toLowerCase();

/* Ứng viên bom: khác từ đích, khác nghĩa hiển thị (trùng thì chém bom cũng đúng), không trùng chữ nhau */
function decoyCandidates(word, poolWords) {
  const seen = new Set([String(word.word).toLowerCase()]), meaning = fruitMeaningKey(word);
  return (poolWords || []).filter(w => {
    const k = String(w.word || '').toLowerCase();
    if (!k || w.id === word.id || fruitMeaningKey(w) === meaning || seen.has(k)) return false;
    seen.add(k); return true;
  });
}

const fruitCommonPrefix = (a, b) => { let i = 0; while (i < a.length && a[i] === b[i]) i++; return i; };
/* n bom na ná nhất: Levenshtein ≤ max(2, ⌊len×0.4⌋) hoặc chung ≥ 3 chữ đầu, xếp theo khoảng cách rồi cùng pos.
   Thiếu thì lùi về cùng pos + độ dài ±2, rồi bất kỳ. Xáo trước để các từ ngang hạng ra ngẫu nhiên. */
function lookAlikeWords(word, poolWords, n, rand) {
  rand = rand || Math.random;
  const t = String(word.word).toLowerCase(), lim = Math.max(2, Math.floor(t.length * 0.4));
  const samePos = w => !!w.pos && w.pos === word.pos;
  const scored = fruitShuffled(decoyCandidates(word, poolWords), rand).map(w => {
    const k = w.word.toLowerCase(), d = editDistance(t, k);
    return { w, d, near: d <= lim || fruitCommonPrefix(t, k) >= 3 };
  });
  const near = scored.filter(s => s.near).sort((x, y) => x.d - y.d || samePos(y.w) - samePos(x.w)).map(s => s.w);
  const rest = scored.filter(s => !s.near).map(s => s.w);
  const close = rest.filter(w => samePos(w) && Math.abs(w.word.length - t.length) <= 2);
  return near.concat(close, rest.filter(w => close.indexOf(w) < 0)).slice(0, n);
}

/* Cấp Dễ: bom ngẫu nhiên, dễ phân biệt hơn */
function randomDecoys(word, poolWords, n, rand) {
  return fruitShuffled(decoyCandidates(word, poolWords), rand || Math.random).slice(0, n);
}

/* words = từ đề (pickGameWords, đã trọng số theo lapses) · pool = mọi từ đã học để lấy bom · srs để biết từ hay quên */
function createFruitState(words, pool, srs, w, h, difficultyId) {
  return { diff: fruitDifficulty(difficultyId), words: words || [], pool: pool || [], srs: srs || {}, next: 0, uid: 0,
    wave: null, gap: 0, t: 0, stroke: { active: false, start: 0, hits: [] },
    lives: FRUIT_LIVES, hits: 0, level: 0, score: 0, right: 0, wrong: 0, streak: 0, bestStreak: 0,
    miss: [], confusions: {}, over: false, w: w || 360, h: h || 640 };
}

/* Khung đổi cỡ (xoay máy): co giãn mọi quả theo tỉ lệ để không ai nhảy chỗ */
function resizeFruitState(st, w, h) {
  const sx = w / st.w, sy = h / st.h;
  if (st.wave) for (const f of st.wave.fruits) { f.x *= sx; f.vx *= sx; f.y *= sy; f.vy *= sy; f.g *= sy; }
  st.w = w; st.h = h;
}

/* 1 quả đúng + (count−1) bom, xáo vào các làn ngang chia đều. Mỗi quả bay đúng `air` giây: đỉnh ở 25–40%
   chiều cao, trọng lực suy từ độ cao cần lên. Cả đợt viền vàng khi từ đích hay quên (lapses ≥ 2) — chỉ tô
   quả đúng là lộ đáp án. */
function buildFruitWave(st, rand) {
  rand = rand || Math.random;
  const n = st.words.length;
  if (!n) return null;
  const target = st.words[st.next++ % n], d = st.diff, air = fruitAirTime(st.level, d);
  const decoys = (d.lookAlike ? lookAlikeWords : randomDecoys)(target, st.pool, d.count - 1, rand);
  const items = fruitShuffled([target].concat(decoys), rand), lane = st.w / items.length;
  const fruits = items.map((w, i) => {
    const r = fruitRadius(w.word, st.w), x = lane * (i + 0.5) + (rand() - 0.5) * lane * 0.2;
    const y = st.h + r, rise = y - st.h * (0.25 + rand() * 0.15), g = 8 * rise / (air * air);
    const wait = rand() * FRUIT_STAGGER;
    return { uid: ++st.uid, word: w, text: w.word, correct: w === target, x, y, vx: (st.w / 2 - x) * rand() * 0.25 / air,
      vy: -Math.sqrt(2 * g * rise), g, r, rot: 0, vr: (rand() - 0.5) * 3, wait, bornAt: st.t + wait, cut: false, gone: false, reveal: false };
  });
  const gold = ((st.srs[target.id] || {}).lapses || 0) >= 2;
  return (st.wave = { target, fruits, air, gold, done: false });
}

function fruitLoseLife(st, target) {
  st.lives--; st.wrong++; st.streak = 0;
  if (st.miss.indexOf(target.id) < 0) st.miss.push(target.id);
  if (st.lives <= 0) st.over = true;
}

/* Bước vật lý. Quả đúng rơi qua đáy khi đợt còn mở → 'drop'. Đợt xong và mọi quả đã rời màn → nghỉ rồi đợt mới. */
function stepFruits(st, dt, rand) {
  const ev = [];
  if (st.over) return ev;
  dt = Math.min(0.05, dt); st.t += dt;
  if (st.stroke.active && st.t - st.stroke.start > FRUIT_STROKE_MAX) ev.push(...endStroke(st));   // giữ tay im cũng tự chấm
  const wave = st.wave;
  if (!wave) {
    if ((st.gap -= dt) <= 0) buildFruitWave(st, rand);
    return ev;
  }
  for (const f of wave.fruits) {
    if (f.gone) continue;
    if (f.wait > 0) { f.wait -= dt; continue; }
    f.vy += f.g * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.rot += f.vr * dt;
    if (f.vy > 0 && f.y - f.r > st.h) {
      f.gone = true;
      if (f.correct && !f.cut && !wave.done) { wave.done = true; fruitLoseLife(st, wave.target); ev.push({ type: 'drop', fruit: f, word: wave.target }); }
    }
  }
  if (wave.done && wave.fruits.every(f => f.cut || f.gone)) { st.wave = null; st.gap = FRUIT_WAVE_GAP; }
  return ev;
}

/* Khoảng cách từ tâm tới đoạn thẳng ≤ r */
function segmentHitsCircle(x0, y0, x1, y1, cx, cy, r) {
  const dx = x1 - x0, dy = y1 - y0, L = dx * dx + dy * dy;
  const k = L ? Math.max(0, Math.min(1, ((cx - x0) * dx + (cy - y0) * dy) / L)) : 0;
  return Math.hypot(x0 + k * dx - cx, y0 + k * dy - cy) <= r;
}

/* Một đoạn vuốt: quả bị cắt vỡ ngay (chỉ hình), ghi vào nhát; chấm ở endStroke */
function sliceSegment(st, x0, y0, x1, y1) {
  const ev = [], s = st.stroke;
  if (st.over || Math.hypot(x1 - x0, y1 - y0) < FRUIT_MIN_SEG) return ev;
  if (s.active && st.t - s.start > FRUIT_STROKE_MAX) ev.push(...endStroke(st));
  if (!s.active) { s.active = true; s.start = st.t; s.hits = []; }
  const wave = st.wave;
  if (!wave || wave.done) return ev;
  for (const f of wave.fruits) {
    if (f.cut || f.gone || f.wait > 0 || !segmentHitsCircle(x0, y0, x1, y1, f.x, f.y, f.r)) continue;
    f.cut = true; s.hits.push(f);
    ev.push({ type: 'split', fruit: f, a: Math.atan2(y1 - y0, x1 - x0) });
  }
  return ev;
}

/* Chấm nhát: trúng bom nào (kể cả cùng lúc với quả đúng) → sai, lộ quả đúng. Chỉ quả đúng → đúng. */
function endStroke(st) {
  const s = st.stroke, wave = st.wave;
  // chỉ quả của đợt đang bay: nhát vắt qua lúc đổi đợt (quả đúng rơi khi tay còn giữ) không được chấm bom cũ cho đợt mới
  const hits = wave ? s.hits.filter(f => wave.fruits.indexOf(f) >= 0) : [];
  s.active = false; s.hits = [];
  if (st.over || !hits.length || !wave || wave.done) return [];
  wave.done = true;
  const target = wave.target, bombs = hits.filter(f => !f.correct);
  if (bombs.length) {
    const cf = wave.fruits.find(f => f.correct);
    cf.reveal = true;
    bombs.forEach(b => { const k = target.word + '|' + b.text; st.confusions[k] = (st.confusions[k] || 0) + 1; });
    fruitLoseLife(st, target);
    return [{ type: 'wrong', fruit: cf, word: target, bombs }];
  }
  const f = hits[0];
  st.right++; st.streak++; st.bestStreak = Math.max(st.bestStreak, st.streak);
  st.hits++; st.level = Math.floor(st.hits / FRUIT_HITS_PER_LEVEL);
  const points = 10 * comboMult(st.streak) * (wave.gold ? 2 : 1) + (st.t - f.bornAt < FRUIT_FAST ? 5 : 0);
  st.score += points;
  return [{ type: 'right', fruit: f, word: target, points }];
}

if (typeof module !== 'undefined') module.exports = {
  FRUIT_LIVES, FRUIT_MIN_SEG, FRUIT_STROKE_MAX, FRUIT_DIFFICULTIES, FRUIT_DIFFICULTY_IDS,
  fruitDifficulty, fruitScoreKey, fruitAirTime, fruitRadius, editDistance, lookAlikeWords, randomDecoys,
  createFruitState, resizeFruitState, buildFruitWave, stepFruits, segmentHitsCircle, sliceSegment, endStroke
};
