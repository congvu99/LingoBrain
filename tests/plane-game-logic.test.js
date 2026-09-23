/* Game Bắn máy bay (kiểu ZType) — logic thuần. Chạy trong Node và trình duyệt. */

function mkPlaneWords(list) {
  return list.map((w, i) => ({ id: 'p' + i, word: w, meaning: 'nghĩa ' + i, emoji: '✈' }));
}
const half = () => 0.5;
/* Bước cho tới khi có đủ n mục tiêu trên màn */
function spawnUntil(st, n) { for (let i = 0; i < 2000 && st.targets.length < n; i++) stepPlanes(st, 0.05, Math.random); }
/* Bước cho tới khi hết đạn đang bay, gom sự kiện */
function flyBullets(st) { let ev = []; for (let i = 0; i < 200 && st.bullets.length; i++) ev = ev.concat(stepPlanes(st, 0.01, half)); return ev; }
function typeWord(st, s) { return s.split('').map(ch => typeChar(st, ch, half)); }

describe('normalizeTyped · planeLabel · targetKind', () => {
  it('bỏ hoa thường + khoảng trắng', () => assert.equal(normalizeTyped(' Stubborn '), 'stubborn'));
  it('nháy cong iOS → nháy thẳng', () => assert.equal(normalizeTyped('don’t'), "don't"));
  it('nhãn lấy vế trước ;', () => assert.equal(planeLabel({ emoji: '🤔', meaning: 'nghĩ rằng, cho là; tính toán' }), '🤔 nghĩ rằng, cho là'));
  it('nhãn giữ ghi chú trong ngoặc (mạo từ)', () => assert.equal(planeLabel({ meaning: 'một (mạo từ không xác định)' }), 'một (mạo từ không xác định)'));
  it('nhãn quá dài cắt ở ranh giới từ + …', () => {
    const s = planeLabel({ meaning: 'mạo từ xác định dùng cho người, con vật, đồ vật đã được nhắc tới (đã xác định rõ)' });
    assert.ok(s.length <= PLANE_LABEL_MAX, s); assert.equal(s.slice(-1), '…'); assert.ok(!/ \S{1,2}…$/.test(s), 'không cắt giữa từ: ' + s);
  });
  it('loại mục tiêu theo số chữ cái (bỏ dấu cách)', () => {
    assert.equal(targetKind('go'), 'rock'); assert.equal(targetKind('give up'), 'ship');
    assert.equal(targetKind('stubborn'), 'ship'); assert.equal(targetKind('overwhelmed'), 'mother');
  });
});

describe('spawn', () => {
  it('không bao giờ có 2 mục tiêu cùng từ (pool 8 từ), không vượt trần', () => {
    const st = createPlaneState(mkPlaneWords(['aa', 'bb', 'cc', 'dd', 'ee', 'ff', 'gg', 'hh']), 360, 640);
    st.lives = 1e9;
    for (let i = 0; i < 3000; i++) {
      stepPlanes(st, 0.05, Math.random);
      const ids = st.targets.map(t => t.word.id);
      assert.equal(new Set(ids).size, ids.length, 'trùng ở bước ' + i);
      assert.ok(st.targets.length <= PLANE_CAP);
    }
  });
  it('từ dài rơi chậm hơn từ ngắn (kể cả khi dao động ngẫu nhiên)', () => {
    const st = createPlaneState(mkPlaneWords(['a', 'extraordinary']), 360, 640);
    spawnUntil(st, 2);
    const short = st.targets.find(t => t.text === 'a'), long = st.targets.find(t => t.text === 'extraordinary');
    assert.ok(long.cruise < short.cruise * 0.7, 'long=' + long.cruise + ' short=' + short.cruise);
  });
  it('pool rỗng → không spawn, không crash', () => {
    const st = createPlaneState([], 360, 640);
    stepPlanes(st, 0.05, Math.random);
    assert.equal(st.targets.length, 0);
  });
});

describe('typeChar · khoá & bắn', () => {
  it('chữ đầu khoá mục tiêu gần tàu nhất có chữ khớp, mỗi chữ đúng 1 viên đạn', () => {
    const st = createPlaneState(mkPlaneWords(['cat', 'cow', 'dog']), 360, 640);
    spawnUntil(st, 3);
    const low = st.targets.filter(t => t.text[0] === 'c').sort((a, b) => b.y - a.y)[0];
    const r = typeChar(st, 'C', half);
    assert.ok(r.hit); assert.equal(st.lock, low.uid);
    assert.equal(st.bullets.length, 1); assert.equal(low.progress, 1);
  });
  it('chữ không khớp mục tiêu nào → đạn lạc, không khoá, không đổi điểm', () => {
    const st = createPlaneState(mkPlaneWords(['cat']), 360, 640);
    spawnUntil(st, 1);
    const r = typeChar(st, 'z', half);
    assert.equal(r.hit, false); assert.equal(st.lock, null);
    assert.equal(st.bullets.length, 1); assert.equal(st.bullets[0].target, null); assert.equal(st.score, 0);
  });
  it('đang khoá mà gõ sai → đạn trượt, không tiến, không trừ điểm, không mất combo', () => {
    const st = createPlaneState(mkPlaneWords(['cat']), 360, 640);
    spawnUntil(st, 1); st.streak = 4;
    typeChar(st, 'c', half);
    const t = st.targets[0];
    typeChar(st, 'x', half);
    assert.equal(t.progress, 1); assert.equal(st.streak, 4); assert.equal(st.score, 0);
    assert.equal(st.bullets[1].target, null, 'đạn trượt không dẫn');
  });
  it('sai đủ PLANE_WRONG_TO_MISS chữ trên 1 mục tiêu → từ vào danh sách ôn (1 lần)', () => {
    const st = createPlaneState(mkPlaneWords(['cat']), 360, 640);
    spawnUntil(st, 1);
    typeWord(st, 'cxxxxx');
    assert.deepEqual(st.miss, ['p0']);
  });
  it('gõ đủ chữ → mục tiêu nổ khi viên cuối tới, điểm = số chữ × combo, nhả khoá', () => {
    const st = createPlaneState(mkPlaneWords(['stubborn']), 360, 640);
    spawnUntil(st, 1);
    typeWord(st, 'stubborn');
    assert.equal(st.lock, null); assert.ok(st.targets[0].doomed);
    const ev = flyBullets(st);
    assert.equal(ev.filter(e => e.type === 'hit').length, 8);
    const ex = ev.filter(e => e.type === 'explode');
    assert.equal(ex.length, 1); assert.equal(ex[0].word, 'stubborn');
    assert.equal(st.targets.length, 0); assert.equal(st.kills, 1); assert.equal(st.score, 8 * comboMult(1));
  });
  it('dấu cách / gạch nối tự bỏ qua: gõ "giveup" hạ "give up"', () => {
    const st = createPlaneState(mkPlaneWords(['give up']), 360, 640);
    spawnUntil(st, 1);
    typeWord(st, 'giveup');
    flyBullets(st);
    assert.equal(st.kills, 1);
  });
  it('mục tiêu đã gõ đủ chữ thì không bị khoá lần nữa', () => {
    const st = createPlaneState(mkPlaneWords(['cat', 'cow']), 360, 640);
    spawnUntil(st, 2);
    const first = st.targets.filter(t => t.text[0] === 'c').sort((a, b) => b.y - a.y)[0];
    typeWord(st, first.text + 'c');
    assert.ok(st.lock !== first.uid && st.lock !== null);
  });
  it('releaseLock: nhả khoá, chữ kế tiếp chọn lại mục tiêu', () => {
    const st = createPlaneState(mkPlaneWords(['gift', 'give']), 360, 640);
    spawnUntil(st, 2);
    typeChar(st, 'g', half);
    releaseLock(st);
    assert.equal(st.lock, null);
  });
  it('gõ dồn dập ngay khi vừa xuất hiện: không bị đẩy văng khỏi đỉnh, vẫn nổ đúng lúc (khung thấp)', () => {
    const st = createPlaneState(mkPlaneWords(['extraordinary']), 360, 360);
    spawnUntil(st, 1);
    const t = st.targets[0];
    let minY = t.y, ev = [];
    for (const ch of 'extraordinary') {          // gõ nhanh: mỗi chữ cách nhau 60ms, đạn trước kịp trúng
      typeChar(st, ch, half);
      for (let i = 0; i < 6; i++) { ev = ev.concat(stepPlanes(st, 0.01, half)); minY = Math.min(minY, t.y); }
    }
    for (let i = 0; i < 300 && !ev.some(e => e.type === 'explode'); i++) { ev = ev.concat(stepPlanes(st, 0.01, half)); minY = Math.min(minY, t.y); }
    assert.ok(ev.some(e => e.type === 'explode'), 'phải nổ trong 3 giây');
    assert.ok(minY >= -t.r - 1, 'bị đẩy lên tới y=' + minY);
    assert.equal(st.bullets.length, 0);
  });
  it('đạn còn đang đuổi mục tiêu thì không bị xoá dù bay quá mép', () => {
    const st = createPlaneState(mkPlaneWords(['stubborn']), 360, 640);
    spawnUntil(st, 1);
    const t = st.targets[0];
    typeChar(st, 's', half);
    t.y = -200; st.bullets[0].y = -45;          // mục tiêu bị đẩy lên trên mép, đạn đang đuổi theo
    stepPlanes(st, 0.01, half);
    assert.equal(st.bullets.length === 1 || t.pending === 0, true, 'đạn mất mà pending vẫn treo');
  });
  it('trúng đạn → mục tiêu giật lên (vy nhỏ hơn tốc độ hành trình)', () => {
    const st = createPlaneState(mkPlaneWords(['stubborn']), 360, 640);
    spawnUntil(st, 1);
    const t = st.targets[0];
    typeChar(st, 's', half); flyBullets(st);
    assert.ok(t.vy < t.cruise, 'vy=' + t.vy + ' cruise=' + t.cruise);
  });
});

describe('stepPlanes · khiên & mạng', () => {
  it('mục tiêu chạm khiên → −1 mạng, streak=0, vào miss, nhả khoá; 3 lần → over', () => {
    const st = createPlaneState(mkPlaneWords(['cat', 'dog', 'emu', 'fox']), 360, 640);
    spawnUntil(st, 1); st.streak = 3;
    typeChar(st, st.targets[0].text[0], half);
    let shield = [];
    for (let i = 0; i < 20000 && !shield.length; i++) shield = stepPlanes(st, 0.05, half).filter(e => e.type === 'shield');
    assert.equal(st.lives, PLANE_LIVES - 1); assert.equal(st.streak, 0); assert.equal(st.lock, null);
    assert.includes(st.miss, st.words.find(w => w.word === shield[0].word).id);
    for (let i = 0; i < 20000 && !st.over; i++) stepPlanes(st, 0.05, half);
    assert.ok(st.over); assert.equal(st.lives, 0);
  });
  it('dt lớn bị kẹp → không mục tiêu nào nhảy thẳng tới khiên', () => {
    const st = createPlaneState(mkPlaneWords(['cat']), 360, 640);
    stepPlanes(st, 0.05, half);
    const ev = stepPlanes(st, 30, half);
    assert.equal(ev.filter(e => e.type === 'shield').length, 0);
  });
  it('mỗi 5 lần hạ → lên cấp, rơi nhanh hơn 8%, thêm mục tiêu tối đa', () => {
    const st = createPlaneState(mkPlaneWords(['aa', 'bb', 'cc', 'dd', 'ee', 'ff', 'gg']), 360, 640);
    for (let k = 0; k < 5; k++) { spawnUntil(st, 1); typeWord(st, st.targets[0].text); flyBullets(st); }
    assert.equal(st.kills, 5); assert.equal(st.level, 1);
    assert.near(fallSeconds(1), PLANE_FALL_SECONDS / PLANE_SPEEDUP);
    assert.equal(maxPlanes(1), PLANE_START_MAX + 1); assert.equal(maxPlanes(50), PLANE_CAP);
  });
});

describe('resizePlaneState', () => {
  it('co giãn vị trí theo khung mới, tàu mình ở đáy', () => {
    const st = createPlaneState(mkPlaneWords(['cat']), 400, 800);
    spawnUntil(st, 1);
    const t = st.targets[0], x = t.x, y = t.y;
    resizePlaneState(st, 200, 400);
    assert.near(t.x, x / 2); assert.near(t.y, y / 2);
    assert.ok(st.shipY < 400 && st.shipY > 300); assert.equal(st.shipX, 100);
  });
});
