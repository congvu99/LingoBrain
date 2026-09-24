/* Game từ vựng — logic thuần. Chạy trong Node và trình duyệt. */

const seq = arr => { let i = 0; return () => arr[i++ % arr.length]; };

function mkDeck(n, opt) {
  opt = opt || {};
  const words = [];
  for (let i = 0; i < n; i++) words.push({
    id: 'w' + i, word: 'word' + i, meaning: 'nghĩa ' + i, pos: i % 2 ? 'verb' : 'noun',
    context: opt.noContext ? '' : 'They word' + i + ' every day.'
  });
  return { words };
}
function mkSrs(deck, over) {
  const s = {};
  deck.words.forEach(w => s[w.id] = Object.assign({ state: 'review', lapses: 0 }, over && over[w.id]));
  return s;
}

describe('gamePool', () => {
  const deck = mkDeck(10);
  it('bỏ từ chưa học', () => {
    const srs = mkSrs(deck); srs.w0.state = 'new'; delete srs.w1;
    assert.equal(gamePool(deck, srs, 'sprint').length, 8);
  });
  it('scramble bỏ từ <= 2 chữ cái', () => {
    const d = { words: [{ id: 'a', word: 'go', meaning: 'đi' }, { id: 'b', word: 'reckon', meaning: 'nghĩ' }] };
    const got = gamePool(d, mkSrs(d), 'scramble');
    assert.equal(got.length, 1); assert.equal(got[0].word, 'reckon');
  });
  it('scramble bỏ từ không có nghĩa (nghĩa là gợi ý duy nhất)', () => {
    const d = { words: [{ id: 'a', word: 'reckon', meaning: '' }, { id: 'b', word: 'linger', meaning: 'nán lại' }] };
    const got = gamePool(d, mkSrs(d), 'scramble');
    assert.equal(got.length, 1); assert.equal(got[0].word, 'linger');
  });
  it('cloze cần context chứa chính từ đó', () => {
    const d = {
      words: [
        { id: 'a', word: 'reckon', meaning: 'nghĩ', context: 'I reckon so.' },
        { id: 'b', word: 'stubborn', meaning: 'bướng', context: 'No match here.' },
        { id: 'c', word: 'linger', meaning: 'nán', context: '' }
      ]
    };
    const got = gamePool(d, mkSrs(d), 'cloze');
    assert.equal(got.length, 1); assert.equal(got[0].word, 'reckon');
  });
  it('cloze bỏ câu quá dài', () => {
    const long = 'reckon ' + 'x'.repeat(130);
    const d = { words: [{ id: 'a', word: 'reckon', meaning: 'nghĩ', context: long }] };
    assert.equal(gamePool(d, mkSrs(d), 'cloze').length, 0);
  });
});

describe('gameAvailability', () => {
  it('đủ 8 từ đã học → mở', () => {
    const deck = mkDeck(8), a = gameAvailability(deck, mkSrs(deck));
    assert.ok(a.scramble.ok); assert.ok(a.sprint.ok); assert.ok(a.cloze.ok);
    assert.equal(a.sprint.need, 0);
  });
  it('thiếu từ → báo còn thiếu bao nhiêu', () => {
    const deck = mkDeck(5), a = gameAvailability(deck, mkSrs(deck));
    assert.equal(a.sprint.ok, false); assert.equal(a.sprint.have, 5); assert.equal(a.sprint.need, 3);
  });
  it('Chém chữ: mở khi đủ 8 từ, bỏ từ > 16 ký tự và từ không có nghĩa', () => {
    const deck = mkDeck(8);
    assert.ok(gameAvailability(deck, mkSrs(deck)).fruit.ok);
    deck.words[0].word = 'counterintuitively'; deck.words[1].meaning = '';
    const a = gameAvailability(deck, mkSrs(deck));
    assert.equal(a.fruit.ok, false); assert.equal(a.fruit.have, 6); assert.equal(a.fruit.need, 2);
  });
  it('không có câu ví dụ → chỉ cloze bị khoá', () => {
    const deck = mkDeck(10, { noContext: true }), a = gameAvailability(deck, mkSrs(deck));
    assert.ok(a.scramble.ok); assert.ok(a.sprint.ok); assert.equal(a.cloze.ok, false);
  });
});

describe('pickGameWords', () => {
  const deck = mkDeck(10);
  it('không trả trùng id', () => {
    const got = pickGameWords(deck.words, mkSrs(deck), 10, Math.random);
    assert.equal(got.length, 10);
    assert.equal(new Set(got.map(w => w.id)).size, 10);
  });
  it('n lớn hơn pool → trả hết pool', () => {
    assert.equal(pickGameWords(deck.words, mkSrs(deck), 99, Math.random).length, 10);
  });
  it('pool rỗng → mảng rỗng', () => {
    assert.equal(pickGameWords([], {}, 5, Math.random).length, 0);
  });
  it('từ hay quên được bốc nhiều hơn rõ rệt', () => {
    const srs = mkSrs(deck, { w3: { state: 'review', lapses: 3 } });   // trọng số 7 vs 1
    let hot = 0;
    for (let i = 0; i < 2000; i++) if (pickGameWords(deck.words, srs, 1, Math.random)[0].id === 'w3') hot++;
    assert.ok(hot > 500, 'w3 bốc được ' + hot + '/2000, kỳ vọng ~875');
    assert.ok(hot < 1400, 'w3 bốc được ' + hot + '/2000, quá nhiều');
  });
});

describe('scrambleTiles', () => {
  it('khác từ gốc', () => {
    for (let i = 0; i < 50; i++) {
      assert.ok(scrambleTiles('stubborn', Math.random).map(t => t.ch).join('') !== 'stubborn');
    }
  });
  it('giữ đúng bộ chữ cái', () => {
    const got = scrambleTiles('reckon', Math.random).map(t => t.ch).sort().join('');
    assert.equal(got, 'reckon'.split('').sort().join(''));
  });
  it('dấu cách giữ nguyên vị trí và được đánh fixed', () => {
    const t = scrambleTiles('take off', Math.random);
    assert.equal(t.length, 8);
    assert.equal(t[4].ch, ' '); assert.equal(t[4].fixed, true);
    assert.equal(t.filter(x => x.fixed).length, 1);
  });
  it('gạch nối giữ nguyên vị trí', () => {
    const t = scrambleTiles('well-known', Math.random);
    assert.equal(t[4].ch, '-'); assert.equal(t[4].fixed, true);
  });
  it('nháy đơn được ghim, chữ số thì không', () => {
    const t = scrambleTiles("can't", Math.random);
    assert.equal(t[3].ch, "'"); assert.equal(t[3].fixed, true);
    const d = scrambleTiles('covid19', Math.random);
    assert.equal(d.filter(x => x.fixed).length, 0, 'chữ số phải được xáo như chữ cái');
  });
  it('từ toàn chữ giống nhau không loop vô hạn', () => {
    const t = scrambleTiles('aaa', Math.random);
    assert.equal(t.map(x => x.ch).join(''), 'aaa');
  });
});

describe('buildWordOptions', () => {
  const deck = mkDeck(10);
  it('4 lựa chọn, 1 đúng, không trùng', () => {
    const o = buildWordOptions(deck.words[1], deck, Math.random);
    assert.equal(o.length, 4);
    assert.equal(o.filter(x => x.correct).length, 1);
    assert.equal(new Set(o.map(x => x.word)).size, 4);
    assert.ok(o.some(x => x.correct && x.word === 'word1'));
  });
  it('ưu tiên cùng loại từ', () => {
    const o = buildWordOptions(deck.words[1], deck, () => 0);
    assert.ok(o.filter(x => !x.correct).every(x => deck.words.find(w => w.word === x.word).pos === 'verb'), JSON.stringify(o));
  });
  it('ưu tiên độ dài gần', () => {
    const d = {
      words: [
        { id: 'a', word: 'stubborn', meaning: 'bướng', pos: 'adj' },
        { id: 'b', word: 'struggle', meaning: 'vật lộn', pos: 'adj' },
        { id: 'c', word: 'stumbled', meaning: 'vấp', pos: 'adj' },
        { id: 'd', word: 'generous', meaning: 'hào phóng', pos: 'adj' },
        { id: 'e', word: 'up', meaning: 'lên', pos: 'adj' }
      ]
    };
    const o = buildWordOptions(d.words[0], d, () => 0);
    assert.ok(!o.some(x => x.word === 'up'), 'từ quá ngắn không nên được ưu tiên: ' + JSON.stringify(o));
  });
  it('thiếu ứng viên → mảng ngắn hơn 4', () => {
    const d = { words: [{ id: 'a', word: 'reckon', meaning: 'nghĩ' }, { id: 'b', word: 'linger', meaning: 'nán' }] };
    assert.equal(buildWordOptions(d.words[0], d, Math.random).length, 2);
  });
});

describe('comboMult', () => {
  it('chuỗi ngắn → ×1', () => { assert.equal(comboMult(0), 1); assert.equal(comboMult(4), 1); });
  it('chuỗi 5 → ×1.5', () => { assert.equal(comboMult(5), 1.5); assert.equal(comboMult(9), 1.5); });
  it('chuỗi 10 → ×2', () => { assert.equal(comboMult(10), 2); assert.equal(comboMult(30), 2); });
});

describe('addMiss', () => {
  it('thêm vào cuối', () => assert.deepEqual(addMiss(['a'], 'b'), ['a', 'b']));
  it('khử trùng, đẩy xuống cuối', () => assert.deepEqual(addMiss(['a', 'b'], 'a'), ['b', 'a']));
  it('không vượt 10, bỏ cái cũ nhất', () => {
    let l = [];
    for (let i = 0; i < 15; i++) l = addMiss(l, 'w' + i);
    assert.equal(l.length, 10); assert.equal(l[0], 'w5'); assert.equal(l[9], 'w14');
  });
  it('danh sách null vẫn chạy', () => assert.deepEqual(addMiss(null, 'a'), ['a']));
});

describe('wordRx — khớp từ trong câu', () => {
  const hit = (w, s) => wordRx(w).test(s);
  it('không khớp vào giữa từ khác', () => {
    assert.equal(hit('art', 'He is a smart man.'), false);
    assert.equal(hit('the', 'They went there.'), false);
    assert.equal(hit('on', 'I phoned her.'), false);
  });
  it('khớp khi đứng riêng', () => {
    assert.ok(hit('art', 'We saw an art show.'));
    assert.ok(hit('the', 'Give me the book.'));
  });
  it('khớp dạng chia đuôi thường gặp', () => {
    assert.ok(hit('reckon', 'I reckoned so.'));
    assert.ok(hit('stubborn', 'He acted stubbornly.'));
    assert.ok(hit('reach', 'She reaches out.'));
  });
  it('khớp cụm nhiều từ', () => assert.ok(hit('take off', 'I will take off now.')));
  it('khớp từ có ký tự đặc biệt', () => {
    assert.ok(hit('AT&T', 'The AT&T store.'));
    assert.ok(hit("can't", "I can't do it."));
  });
  it('cờ g thay mọi lần xuất hiện — câu lặp từ không được lộ đáp án', () => {
    const out = 'I reckon you reckon too.'.replace(wordRx('reckon', 'gi'), (m, pre) => pre + '_');
    assert.equal(out, 'I _ you _ too.');
  });
});
