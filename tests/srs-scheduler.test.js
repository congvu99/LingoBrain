const D = 86400000;
const NOW = new Date(2026, 8, 15, 12).getTime();

describe('normWord / slug', () => {
  it('slug + id from word', () => { assert.equal(normWord({ word: ' Reckon ' }).id, 'reckon'); assert.equal(slug('Give Up!'), 'give-up'); });
  it('empty word → null', () => { assert.equal(normWord({ word: '  ' }), null); });
});

describe('migrateV1', () => {
  it('box 2 lapses 1 → review ivl 7 ef 2.4', () => {
    const r = migrateV1({ a: { box: 2, due: 123, reps: 3, lapses: 1, last: 5, sentences: ['x'] } }).a;
    assert.equal(r.ivl, 7); assert.near(r.ef, 2.4); assert.equal(r.state, 'review'); assert.equal(r.due, 123);
    assert.deepEqual(r.sentences, ['x']); assert.equal(r.reps, 3);
  });
  it('box -1 → new', () => { const r = migrateV1({ a: { box: -1, due: 0, reps: 0, lapses: 0 } }).a; assert.equal(r.state, 'new'); assert.equal(r.ivl, 0); });
  it('ef floor 1.3', () => { assert.near(migrateV1({ a: { box: 0, lapses: 20 } }).a.ef, 1.3); });
  it('already v2 untouched', () => { const r = migrateV1({ a: { ef: 2.1, ivl: 4, state: 'review' } }).a; assert.near(r.ef, 2.1); });
});

describe('sm2Ease', () => {
  it('q5 +0.1', () => assert.near(sm2Ease(2.5, 5), 2.6));
  it('q3 −0.14', () => assert.near(sm2Ease(2.5, 3), 2.36));
  it('floor', () => assert.near(sm2Ease(1.3, 0), 1.3));
});

describe('nextInterval', () => {
  it('first review → 1', () => assert.equal(nextInterval({ reps: 0, ivl: 0, ef: 2.5 }, 4), 1));
  it('second → 3', () => assert.equal(nextInterval({ reps: 1, ivl: 1, ef: 2.5 }, 4), 3));
  it('later → ivl*ef', () => assert.equal(nextInterval({ reps: 5, ivl: 10, ef: 2.5 }, 4), 25));
  it('easy bonus', () => assert.equal(nextInterval({ reps: 5, ivl: 10, ef: 2.5 }, 5), 33));
  it('fail → 1', () => assert.equal(nextInterval({ reps: 5, ivl: 10, ef: 2.5 }, 0), 1));
});

describe('applyGrade — dấu sửa mt cho đồng bộ', () => {
  it('chấm đặt mt = now (record sửa sau mốc xoá/khôi phục không bị lọc khi sync)', () => {
    const srs = {};
    applyGrade(srs, 'w', 2, 'type', 1234, { streak: {} });
    assert.equal(srs.w.mt, 1234); assert.equal(srs.w.last, 1234);
  });
});
describe('applyGrade — learning steps', () => {
  it('new: 🙂 lần 1 requeue, lần 2 graduate 1 ngày', () => {
    const srs = {}, session = { streak: {} };
    let r = applyGrade(srs, 'w', 2, 'type', NOW, session);
    assert.equal(r.requeue, true); assert.equal(srs.w.state, 'learning');
    r = applyGrade(srs, 'w', 2, 'type', NOW, session);
    assert.equal(r.requeue, false); assert.equal(srs.w.state, 'review'); assert.equal(srs.w.due, NOW + D); assert.equal(srs.w.ivl, 1);
  });
  it('new: 😎 graduate ngay', () => {
    const srs = {}, session = { streak: {} };
    const r = applyGrade(srs, 'w', 3, 'type', NOW, session);
    assert.equal(r.requeue, false); assert.equal(srs.w.state, 'review');
  });
  it('😵 giữa chừng reset streak', () => {
    const srs = {}, session = { streak: {} };
    applyGrade(srs, 'w', 2, 'type', NOW, session);
    applyGrade(srs, 'w', 0, 'type', NOW, session);
    const r = applyGrade(srs, 'w', 2, 'type', NOW, session);
    assert.equal(r.requeue, true, 'cần thêm 1 lần đúng nữa');
  });
  it('review 😵 → relearn, ivl 1, ef −0.2, lapses+1, requeue', () => {
    const srs = { w: Object.assign(blankRec(), { state: 'review', ivl: 10, ef: 2.5, reps: 4, due: NOW }) }, session = { streak: {} };
    const r = applyGrade(srs, 'w', 0, 'mcq', NOW, session);
    assert.equal(r.requeue, true); assert.equal(srs.w.state, 'relearn'); assert.equal(srs.w.ivl, 1); assert.near(srs.w.ef, 2.3); assert.equal(srs.w.lapses, 1);
  });
  it('review 🙂 → due = now + ivl*ef', () => {
    const srs = { w: Object.assign(blankRec(), { state: 'review', ivl: 10, ef: 2.5, reps: 4, due: NOW }) }, session = { streak: {} };
    applyGrade(srs, 'w', 2, 'dictation', NOW, session);
    assert.equal(srs.w.ivl, 25); assert.equal(srs.w.due, NOW + 25 * D); assert.equal(srs.w.hist.length, 1); assert.equal(srs.w.hist[0].mode, 'dictation');
    assert.equal(srs.w.lastMode, 'dictation');
  });
  it('hist capped 50', () => {
    const srs = {}, session = { streak: {} };
    for (let i = 0; i < 60; i++) applyGrade(srs, 'w', 2, 'type', NOW, session);
    assert.equal(srs.w.hist.length, 50);
  });
});

describe('buildQueue', () => {
  const deck = { words: [] }, srs = {};
  for (let i = 0; i < 20; i++) { deck.words.push({ id: 'd' + i }); srs['d' + i] = Object.assign(blankRec(), { state: 'review', due: NOW - i * D }); }
  for (let i = 0; i < 6; i++) deck.words.push({ id: 'n' + i });
  it('quá hạn lâu nhất trước, cắt maxSession', () => {
    const q = buildQueue(deck, srs, { maxSession: 5, newPerDay: 0 }, NOW);
    assert.deepEqual(q, ['d19', 'd18', 'd17', 'd16', 'd15']);
  });
  it('new xen mỗi 3 thẻ', () => {
    const q = buildQueue(deck, srs, { maxSession: 9, newPerDay: 3 }, NOW);
    assert.equal(q.length, 12);
    assert.ok(/^n/.test(q[3]) && /^n/.test(q[7]) && /^n/.test(q[11]), JSON.stringify(q));
  });
  it('không due tương lai', () => {
    const q = buildQueue({ words: [{ id: 'f' }] }, { f: Object.assign(blankRec(), { state: 'review', due: NOW + D }) }, { maxSession: 5, newPerDay: 5 }, NOW);
    assert.deepEqual(q, []);
  });
  it('dựng lại sau khi lô đầu tốt nghiệp → lấy lô từ mới kế tiếp, không lặp lô cũ', () => {
    const dk = { words: [] }, s = {}, cfg = { maxSession: 40, newPerDay: 5 };
    for (let i = 0; i < 12; i++) dk.words.push({ id: 'w' + i });
    const first = buildQueue(dk, s, cfg, NOW);
    assert.deepEqual(first, ['w0', 'w1', 'w2', 'w3', 'w4']);
    const ses = { streak: {} };
    first.forEach(id => { applyGrade(s, id, 2, 'type', NOW, ses); applyGrade(s, id, 2, 'type', NOW, ses); });
    assert.deepEqual(buildQueue(dk, s, cfg, NOW), ['w5', 'w6', 'w7', 'w8', 'w9']);
  });
});

describe('pruneSrs', () => {
  it('xoá tiến độ của id không còn trong bộ, giữ id còn lại', () => {
    const s = { a: blankRec(), x: blankRec(), y: blankRec() };
    assert.equal(pruneSrs({ words: [{ id: 'a' }, { id: 'b' }] }, s), 2);
    assert.deepEqual(Object.keys(s), ['a']);
  });
  it('bộ từ rỗng (tải words.json lỗi) → không đụng tiến độ', () => {
    const s = { a: blankRec() };
    assert.equal(pruneSrs({ words: [] }, s), 0);
    assert.equal(pruneSrs(null, s), 0);
    assert.deepEqual(Object.keys(s), ['a']);
  });
});

describe('fuzzyMatch', () => {
  it('exact', () => assert.equal(fuzzyMatch('reckon', 'reckon').ok, true));
  it('near (1 edit, len≥5)', () => { const r = fuzzyMatch('recon', 'reckon'); assert.equal(r.ok, true); assert.equal(r.near, true); });
  it('punctuation/case/space ignored', () => { assert.equal(fuzzyMatch('Give  up.', 'give up').ok, true); assert.equal(fuzzyMatch('Give  up.', 'give up').near, false); });
  it('short word strict', () => assert.equal(fuzzyMatch('cot', 'cat').ok, false));
  it('wrong', () => assert.equal(fuzzyMatch('banana', 'reckon').ok, false));
  it('phrase token-wise near', () => { const r = fuzzyMatch('give up on', 'give up'); assert.equal(r.ok, false); });
});

describe('summary + dueLabel', () => {
  it('counts', () => {
    const deck = { words: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] };
    const srs = { a: Object.assign(blankRec(), { state: 'review', due: NOW - 1, ivl: 30 }), b: Object.assign(blankRec(), { state: 'review', due: NOW + D, ivl: 3 }) };
    assert.deepEqual(deckSummary(deck, srs, NOW), { due: 1, fresh: 1, learn: 1, mature: 1 });
  });
  it('dueLabel', () => { assert.equal(dueLabel({ reps: 0, ivl: 0, ef: 2.5, state: 'new' }, 0), 'gặp lại ngay'); assert.equal(dueLabel({ reps: 5, ivl: 30, ef: 2.5, state: 'review' }, 2), '3 tháng'); });
});

describe('buildQueue — từ sai trong game', () => {
  const deck = { words: [] };
  for (let i = 0; i < 6; i++) deck.words.push({ id: 'w' + i, word: 'w' + i, meaning: 'm' + i });
  const now = Date.now();
  const srs = {
    w0: Object.assign(blankRec(), { state: 'review', due: now - DAY }),   // đến hạn
    w1: Object.assign(blankRec(), { state: 'review', due: now + DAY }),   // chưa đến hạn
    w2: Object.assign(blankRec(), { state: 'review', due: now + DAY })
  };
  const cfg = { newPerDay: 2, maxSession: 40 };

  it('4 tham số cho kết quả y hệt trước khi thêm miss', () => {
    assert.deepEqual(buildQueue(deck, srs, cfg, now), buildQueue(deck, srs, cfg, now, []));
  });
  it('từ sai lên đầu hàng đợi', () => {
    assert.equal(buildQueue(deck, srs, cfg, now, ['w2'])[0], 'w2');
  });
  it('không nhân đôi từ đã có trong hàng đợi', () => {
    const q = buildQueue(deck, srs, cfg, now, ['w0']);
    assert.equal(q.filter(id => id === 'w0').length, 1);
    assert.equal(q[0], 'w0');
  });
  it('bỏ từ chưa học và từ không còn trong bộ', () => {
    const q = buildQueue(deck, srs, cfg, now, ['w5', 'không-tồn-tại', 'w2']);
    assert.equal(q[0], 'w2');
    assert.ok(q.indexOf('không-tồn-tại') < 0);
  });
});
