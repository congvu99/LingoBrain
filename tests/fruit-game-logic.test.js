/* Game Chém chữ — logic thuần. Chạy trong Node và trình duyệt. */

function mkFruitWords(list) {
  return list.map((w, i) => ({ id: 'f' + i, word: w, meaning: 'nghĩa ' + i, pos: i % 2 ? 'verb' : 'noun' }));
}
const fruitHalf = () => 0.5;
const FRUIT_POOL = mkFruitWords(['stubborn', 'stumble', 'stubby', 'table', 'linger', 'reckon', 'giggle', 'wander', 'bother']);
/* Bước cho tới khi mọi quả của đợt đang bay đã xuất phát (hết thời gian chờ lệch nhau) */
function launchWave(st) { for (let i = 0; i < 20 && (!st.wave || st.wave.fruits.some(f => f.wait > 0)); i++) stepFruits(st, 0.05, fruitHalf); return st.wave; }
/* Vạch 1 đoạn ngang qua tâm quả (dài 2r, luôn ≥ 8px) */
function slash(st, f) { return sliceSegment(st, f.x - f.r, f.y, f.x + f.r, f.y); }
function newFruitState(diff) { return createFruitState(FRUIT_POOL.slice(0, 1).concat(FRUIT_POOL.slice(1)), FRUIT_POOL, {}, 360, 640, diff); }

describe('fruit · cấp độ + khoá kỷ lục', () => {
  it('khoá kỷ lục khớp TASK_ID của sync-merge', () => {
    FRUIT_DIFFICULTY_IDS.forEach(id => assert.ok(/^[a-z0-9_-]{1,32}$/.test(fruitScoreKey(id)), fruitScoreKey(id)));
    assert.equal(fruitScoreKey('normal'), 'fruit'); assert.equal(fruitScoreKey('hard'), 'fruit-hard'); assert.equal(fruitScoreKey('xx'), 'fruit');
  });
  it('lên cấp → thời gian bay giảm', () => {
    const d = fruitDifficulty('normal');
    assert.ok(fruitAirTime(1, d) < fruitAirTime(0, d));
  });
  it('editDistance', () => {
    assert.equal(editDistance('stubborn', 'stubborn'), 0); assert.equal(editDistance('Kitten', 'sitting'), 3); assert.equal(editDistance('', 'abc'), 3);
  });
});

describe('fruit · bom na ná', () => {
  const target = FRUIT_POOL[0];
  it('stubby / stumble đứng trước table, không trả chính nó', () => {
    const got = lookAlikeWords(target, FRUIT_POOL, 8, Math.random).map(w => w.word);
    assert.ok(got.indexOf('stubborn') < 0, 'có chính nó');
    assert.ok(got.indexOf('stubby') < got.indexOf('table') && got.indexOf('stumble') < got.indexOf('table'), got.join(','));
    assert.deepEqual(got.slice(0, 2).sort(), ['stubby', 'stumble']);
  });
  it('bỏ từ trùng nghĩa hoặc trùng chữ', () => {
    const pool = FRUIT_POOL.concat({ id: 'x1', word: 'stubborns', meaning: target.meaning }, { id: 'x2', word: 'Stubby', meaning: 'khác' });
    const got = lookAlikeWords(target, pool, 20, Math.random).map(w => w.word);
    assert.ok(got.indexOf('stubborns') < 0, 'trùng nghĩa'); assert.equal(got.filter(w => w.toLowerCase() === 'stubby').length, 1);
  });
  it('bỏ bom trùng nghĩa hiển thị (vế trước ;) — final / finally cùng "cuối cùng"', () => {
    const final = { id: 'a', word: 'final', meaning: 'cuối cùng; chung kết', pos: 'adj' };
    const pool = [final, { id: 'b', word: 'finally', meaning: 'Cuối cùng', pos: 'adv' }].concat(FRUIT_POOL);
    assert.ok(lookAlikeWords(final, pool, 20, Math.random).every(w => w.word !== 'finally'));
    assert.ok(randomDecoys(final, pool, 20, Math.random).every(w => w.word !== 'finally'));
  });
  it('không có từ na ná → vẫn đủ n bom (lùi về cùng pos / bất kỳ)', () => {
    const pool = mkFruitWords(['zebra', 'apple', 'mountain', 'ok', 'cloud']);
    assert.equal(lookAlikeWords({ id: 'q', word: 'xylophone', meaning: 'm', pos: 'noun' }, pool, 4, Math.random).length, 4);
  });
  it('randomDecoys đủ n, khác từ đích', () => {
    const got = randomDecoys(target, FRUIT_POOL, 4, Math.random);
    assert.equal(got.length, 4); assert.ok(got.every(w => w.id !== target.id));
  });
});

describe('fruit · đợt quả', () => {
  it('đúng 1 quả đúng, đủ count quả, chữ không trùng, đều bay lên từ dưới đáy', () => {
    FRUIT_DIFFICULTY_IDS.forEach(id => {
      for (let k = 0; k < 20; k++) {
        const st = newFruitState(id); st.next = k;
        const w = buildFruitWave(st, Math.random);
        assert.equal(w.fruits.length, fruitDifficulty(id).count, id);
        assert.equal(w.fruits.filter(f => f.correct).length, 1);
        assert.equal(new Set(w.fruits.map(f => f.text)).size, w.fruits.length);
        assert.ok(w.fruits.every(f => f.y > st.h && f.vy < 0));
      }
    });
  });
  it('quả bay lên tới 25–40% chiều cao rồi rơi xuống', () => {
    const st = newFruitState('normal'); launchWave(st);
    const f = st.wave.fruits[0]; let top = f.y;
    for (let i = 0; i < 200 && !f.gone; i++) { stepFruits(st, 0.02, fruitHalf); top = Math.min(top, f.y); }
    assert.ok(top > st.h * 0.2 && top < st.h * 0.45, 'đỉnh ' + top);
  });
  it('cả đợt viền vàng khi từ đích có lapses ≥ 2', () => {
    const st = createFruitState(FRUIT_POOL, FRUIT_POOL, { f0: { lapses: 2 } }, 360, 640, 'normal');
    assert.ok(buildFruitWave(st, Math.random).gold); assert.ok(!buildFruitWave(st, Math.random).gold);
  });
  it('lên cấp → đợt sau bay nhanh hơn', () => {
    const st = newFruitState('normal'), a0 = buildFruitWave(st, Math.random).air;
    st.level = 1; assert.ok(buildFruitWave(st, Math.random).air < a0);
  });
});

describe('fruit · nhát chém', () => {
  it('chỉ trúng quả đúng → right, điểm có nhanh (+5)', () => {
    const st = newFruitState('normal'), w = launchWave(st);
    const ok = w.fruits.find(f => f.correct);
    assert.equal(slash(st, ok)[0].type, 'split');
    const ev = endStroke(st);
    assert.equal(ev[0].type, 'right'); assert.equal(ev[0].points, 15);
    assert.equal(st.score, 15); assert.equal(st.right, 1); assert.equal(st.hits, 1); assert.ok(w.done);
  });
  it('điểm nhân combo + đợt vàng, chậm thì không +5', () => {
    const st = createFruitState(FRUIT_POOL, FRUIT_POOL, { f0: { lapses: 3 } }, 360, 640, 'normal');
    st.streak = 9; const w = launchWave(st);
    for (let i = 0; i < 25; i++) stepFruits(st, 0.05, fruitHalf);   // quá 1s kể từ lúc xuất hiện
    slash(st, w.fruits.find(f => f.correct));
    assert.equal(endStroke(st)[0].points, 10 * 2 * 2);
  });
  it('trúng cả quả đúng + bom → wrong, không cộng điểm, ghi cặp nhầm, lộ quả đúng', () => {
    const st = newFruitState('normal'), w = launchWave(st);
    const ok = w.fruits.find(f => f.correct), bomb = w.fruits.find(f => !f.correct);
    slash(st, ok); slash(st, bomb);
    const ev = endStroke(st);
    assert.equal(ev[0].type, 'wrong'); assert.equal(st.score, 0); assert.equal(st.lives, FRUIT_LIVES - 1);
    assert.deepEqual(st.confusions, { ['stubborn|' + bomb.text]: 1 });
    assert.deepEqual(st.miss, ['f0']); assert.ok(ok.reveal); assert.equal(st.streak, 0);
  });
  it('đợt đã xong thì không cắt được nữa', () => {
    const st = newFruitState('normal'), w = launchWave(st);
    slash(st, w.fruits.find(f => f.correct)); endStroke(st);
    assert.equal(slash(st, w.fruits.find(f => !f.correct)).length, 0);
    assert.equal(endStroke(st).length, 0);
  });
  it('đoạn < 8px không cắt (chạm không vuốt)', () => {
    const st = newFruitState('normal'), w = launchWave(st), f = w.fruits[0];
    assert.equal(sliceSegment(st, f.x, f.y, f.x + FRUIT_MIN_SEG - 1, f.y).length, 0);
    assert.ok(!f.cut); assert.equal(endStroke(st).length, 0);
  });
  it('nhát > 0.6s tự chấm dù chưa nhả tay', () => {
    const st = newFruitState('normal'), w = launchWave(st);
    slash(st, w.fruits.find(f => f.correct));
    let ev = [];
    for (let i = 0; i < 15; i++) ev = ev.concat(stepFruits(st, 0.05, fruitHalf));
    assert.ok(ev.some(e => e.type === 'right'), JSON.stringify(ev.map(e => e.type)));
    assert.ok(!st.stroke.active);
  });
  it('quét 1 nhát qua cả màn → trúng bom → không ghi điểm', () => {
    const st = newFruitState('hard'), w = launchWave(st);
    for (const f of w.fruits) slash(st, f);
    assert.equal(endStroke(st)[0].type, 'wrong'); assert.equal(st.score, 0);
  });
});

describe('fruit · rơi + hết tim', () => {
  function runUntilGone(st) { let ev = []; for (let i = 0; i < 400 && st.wave; i++) ev = ev.concat(stepFruits(st, 0.02, fruitHalf)); return ev; }
  it('quả đúng rơi qua đáy → mất tim + miss; bom rơi không sao', () => {
    const st = newFruitState('normal'); launchWave(st);
    const ev = runUntilGone(st);
    assert.deepEqual(ev.map(e => e.type), ['drop']);
    assert.equal(st.lives, FRUIT_LIVES - 1); assert.deepEqual(st.miss, ['f0']); assert.equal(st.wrong, 1);
  });
  it('nhát vắt qua lúc đổi đợt: bom đợt cũ không bị chấm cho đợt mới', () => {
    const st = newFruitState('normal'), w = launchWave(st);
    slash(st, w.fruits.find(f => !f.correct));             // cắt bom, chưa nhả tay…
    st.stroke.start = 1e9;                                  // …ngay trước lúc quả đúng rơi (chưa tới 0.6s tự chấm)
    const ev = runUntilGone(st);                            // quả đúng rơi → mất 1 tim, đợt cũ dọn đi
    st.stroke.start = st.t;
    for (let i = 0; i < 20 && !st.wave; i++) ev.push(...stepFruits(st, 0.05, fruitHalf));
    ev.push(...endStroke(st));
    assert.deepEqual(ev.filter(e => e.type !== 'split').map(e => e.type), ['drop']);
    assert.equal(st.lives, FRUIT_LIVES - 1); assert.deepEqual(st.miss, ['f0']); assert.deepEqual(st.confusions, {});
    assert.ok(st.wave && !st.wave.done, 'đợt mới vẫn mở');
  });
  it('chém đúng xong, bom rơi hết → không mất tim, sang đợt mới', () => {
    const st = newFruitState('normal'), w = launchWave(st);
    slash(st, w.fruits.find(f => f.correct)); endStroke(st);
    assert.equal(runUntilGone(st).length, 0); assert.equal(st.lives, FRUIT_LIVES);
    for (let i = 0; i < 20 && !st.wave; i++) stepFruits(st, 0.05, fruitHalf);
    assert.equal(st.wave.target.id, 'f1');
  });
  it('3 lần mất tim → over, mọi hàm no-op', () => {
    const st = newFruitState('normal');
    for (let k = 0; k < FRUIT_LIVES; k++) { launchWave(st); runUntilGone(st); for (let i = 0; i < 20 && !st.wave && !st.over; i++) stepFruits(st, 0.05, fruitHalf); }
    assert.ok(st.over); assert.equal(st.lives, 0);
    const t = st.t;
    assert.equal(stepFruits(st, 0.05, fruitHalf).length, 0); assert.equal(st.t, t);
    assert.equal(sliceSegment(st, 0, 0, 300, 300).length, 0); assert.equal(endStroke(st).length, 0);
  });
  it('5 lần đúng → lên cấp 1', () => {
    const st = newFruitState('normal');
    for (let k = 0; k < 5; k++) {
      const w = launchWave(st);
      slash(st, w.fruits.find(f => f.correct)); endStroke(st); runUntilGone(st);
    }
    assert.equal(st.level, 1); assert.equal(st.right, 5); assert.equal(st.bestStreak, 5);
  });
  it('đổi cỡ khung co giãn vị trí quả', () => {
    const st = newFruitState('normal'), w = launchWave(st), x = w.fruits[0].x;
    resizeFruitState(st, 720, 640);
    assert.near(w.fruits[0].x, x * 2, 1e-9); assert.equal(st.w, 720);
  });
});
