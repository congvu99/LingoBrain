/* Game Bắn máy bay — logic thuần. Chạy trong Node và trình duyệt. */

function mkPlaneWords(n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push({ id: 'p' + i, word: 'word' + i, meaning: 'nghĩa ' + i, emoji: '✈' });
  return out;
}
const fixedRand = v => () => v;

describe('normalizeTyped', () => {
  it('bỏ hoa thường + khoảng trắng đầu cuối', () => assert.equal(normalizeTyped(' Stubborn '), 'stubborn'));
  it('đổi nháy cong của iOS thành nháy thẳng', () => assert.equal(normalizeTyped('don’t'), "don't"));
  it('gộp nhiều khoảng trắng', () => assert.equal(normalizeTyped('give  up'), 'give up'));
});

describe('planeLabel', () => {
  it('lấy vế trước dấu ;', () => assert.equal(planeLabel({ emoji: '🤔', meaning: 'nghĩ rằng, cho là; tính toán' }), '🤔 nghĩ rằng, cho là'));
  it('vẫn dài thì lấy vế trước dấu ,', () =>
    assert.equal(planeLabel({ emoji: '🐐', meaning: 'cứng đầu, bướng bỉnh khó bảo' }), '🐐 cứng đầu'));
  it('cắt … khi quá PLANE_LABEL_MAX', () => {
    const s = planeLabel({ meaning: 'abcdefghijklmnopqrstuvwxyz' });
    assert.equal(s.length, PLANE_LABEL_MAX); assert.equal(s.slice(-1), '…');
  });
  it('không có emoji thì không có khoảng trắng đầu', () => assert.equal(planeLabel({ meaning: 'bướng bỉnh' }), 'bướng bỉnh'));
});

describe('stepPlanes · spawn', () => {
  it('spawn ngay bước đầu, tối đa maxPlanes(0) chiếc', () => {
    const st = createPlaneState(mkPlaneWords(10));
    for (let i = 0; i < 400; i++) stepPlanes(st, 0.05, Math.random);
    assert.ok(st.planes.length <= maxPlanes(0), 'không vượt trần');
    assert.ok(st.planes.length >= 1);
  });
  it('không bao giờ có 2 máy bay cùng từ trên màn (pool 8 từ)', () => {
    const st = createPlaneState(mkPlaneWords(8));
    st.lives = 1e9;
    for (let i = 0; i < 2000; i++) {
      stepPlanes(st, 0.05, Math.random);
      const ids = st.planes.map(p => p.word.id);
      assert.equal(new Set(ids).size, ids.length, 'trùng ở bước ' + i);
      if (st.planes.length && i % 7 === 0) tryShoot(st, st.planes[0].word.word);
    }
  });
  it('pool nhỏ hơn số máy bay tối đa → hoãn spawn, không crash', () => {
    const st = createPlaneState(mkPlaneWords(2));
    st.lives = 1e9;
    for (let i = 0; i < 300; i++) stepPlanes(st, 0.05, Math.random);
    assert.ok(st.planes.length <= 2);
  });
  it('danh sách rỗng → không spawn', () => {
    const st = createPlaneState([]);
    stepPlanes(st, 0.05, Math.random);
    assert.equal(st.planes.length, 0);
  });
});

describe('stepPlanes · rơi & mất mạng', () => {
  it('dt lớn bị kẹp → không máy bay nào nhảy thẳng xuống đất', () => {
    const st = createPlaneState(mkPlaneWords(10));
    stepPlanes(st, 0.05, fixedRand(0.5));
    const ev = stepPlanes(st, 30, fixedRand(0.5));
    assert.equal(ev.landed.length, 0);
    assert.equal(st.lives, PLANE_LIVES);
  });
  it('chạm đất → −1 mạng, streak=0, miss ghi 1 lần, over sau 3 lần', () => {
    const st = createPlaneState(mkPlaneWords(10));
    st.streak = 4;
    const steps = Math.ceil(PLANE_FALL_SECONDS / 0.05) + 5;
    let landed = [];
    for (let i = 0; i < steps && !landed.length; i++) landed = stepPlanes(st, 0.05, fixedRand(0.5)).landed;
    assert.equal(landed.length, 1);
    assert.equal(st.lives, PLANE_LIVES - 1);
    assert.equal(st.streak, 0);
    assert.equal(st.wrong, 1);
    assert.deepEqual(st.miss, [landed[0].word.id]);
    for (let i = 0; i < 10000 && !st.over; i++) stepPlanes(st, 0.05, fixedRand(0.5));
    assert.ok(st.over); assert.equal(st.lives, 0);
  });
  it('over rồi thì stepPlanes không đổi gì', () => {
    const st = createPlaneState(mkPlaneWords(10));
    st.over = true;
    const ev = stepPlanes(st, 0.05, Math.random);
    assert.equal(st.planes.length, 0); assert.equal(ev.spawned.length, 0);
  });
});

describe('tryShoot', () => {
  function withPlane() {
    const st = createPlaneState(mkPlaneWords(10));
    stepPlanes(st, 0.05, fixedRand(0.5));
    return st;
  }
  it('khớp đúng (hoa thường, khoảng trắng) → hạ, điểm = độ dài × combo', () => {
    const st = withPlane(); const p = st.planes[0];
    const hit = tryShoot(st, ' ' + p.word.word.toUpperCase() + ' ');
    assert.equal(hit, p);
    assert.equal(st.planes.length, 0);
    assert.equal(st.kills, 1); assert.equal(st.right, 1); assert.equal(st.streak, 1);
    assert.equal(st.score, p.word.word.length * comboMult(1));
  });
  it('khớp một phần / sai → null, không đổi state', () => {
    const st = withPlane(); const p = st.planes[0];
    const before = JSON.stringify(st);
    assert.equal(tryShoot(st, p.word.word.slice(0, -1)), null);
    assert.equal(tryShoot(st, 'zzz'), null);
    assert.equal(tryShoot(st, ''), null);
    assert.equal(JSON.stringify(st), before);
  });
  it('chữ gõ còn là tiền tố của từ khác đang bay → chưa tự bắn; Enter (force) thì bắn', () => {
    const st = createPlaneState([{ id: 'a', word: 'give', meaning: 'cho' }, { id: 'b', word: 'give up', meaning: 'bỏ cuộc' }]);
    for (let i = 0; i < 80 && st.planes.length < 2; i++) stepPlanes(st, 0.05, Math.random);
    assert.equal(st.planes.length, 2);
    assert.equal(tryShoot(st, 'give'), null, 'đang gõ dở "give up"');
    assert.equal(tryShoot(st, 'give', true).word.id, 'a');
    assert.equal(tryShoot(st, 'give up').word.id, 'b');
  });
  it('combo ×1.5 từ chuỗi 5', () => {
    const st = withPlane(); st.streak = 4; const p = st.planes[0];
    tryShoot(st, p.word.word);
    assert.equal(st.score, p.word.word.length * 1.5);
    assert.equal(st.bestStreak, 5);
  });
  it('mỗi 5 lần hạ → lên 1 cấp: rơi nhanh hơn 8%, thêm 1 máy bay tối đa, trần 5', () => {
    const st = createPlaneState(mkPlaneWords(20));
    for (let k = 0; k < 5; k++) {
      while (!st.planes.length) stepPlanes(st, 0.05, Math.random);
      tryShoot(st, st.planes[0].word.word);
    }
    assert.equal(st.level, 1);
    assert.near(fallSeconds(1), PLANE_FALL_SECONDS / PLANE_SPEEDUP);
    assert.equal(maxPlanes(1), PLANE_START_MAX + 1);
    assert.equal(maxPlanes(50), PLANE_CAP);
  });
});
