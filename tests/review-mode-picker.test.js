const rnd0 = () => 0;
function times(n, fn) { const s = new Set(); for (let i = 0; i < n; i++) s.add(fn(i)); return [...s]; }

describe('pickMode', () => {
  it('new → type', () => assert.equal(pickMode({ state: 'new', ivl: 0 }, { deckSize: 100, hasSentences: true, hasVoice: true, rand: Math.random }), 'type'));
  it('relearn → type', () => assert.equal(pickMode({ state: 'relearn', ivl: 1 }, { deckSize: 100, hasSentences: true, hasVoice: true, rand: Math.random }), 'type'));
  it('review ivl 3, no voice → type', () => assert.equal(pickMode({ state: 'review', ivl: 3 }, { deckSize: 100, hasSentences: true, hasVoice: false, rand: Math.random }), 'type'));
  it('review ivl 3, voice, lastMode type → dictation', () => assert.equal(pickMode({ state: 'review', ivl: 3, lastMode: 'type' }, { deckSize: 3, hasSentences: false, hasVoice: true, rand: Math.random }), 'dictation'));
  it('review ivl 10, deck 5, no sentences → dictation', () => assert.equal(pickMode({ state: 'review', ivl: 10 }, { deckSize: 5, hasSentences: false, hasVoice: true, rand: Math.random }), 'dictation'));
  it('review ivl 10 lastMode mcq → never mcq', () => {
    const got = times(200, () => pickMode({ state: 'review', ivl: 10, lastMode: 'mcq' }, { deckSize: 20, hasSentences: true, hasVoice: true, rand: Math.random }));
    assert.ok(got.indexOf('mcq') < 0, JSON.stringify(got)); assert.ok(got.length >= 2, 'xoay nhiều dạng');
  });
  it('review ivl 40 no sentences → speak', () => assert.equal(pickMode({ state: 'review', ivl: 40 }, { deckSize: 20, hasSentences: false, hasVoice: true, rand: Math.random }), 'speak'));
  it('nothing available → type', () => assert.equal(pickMode({ state: 'review', ivl: 10 }, { deckSize: 2, hasSentences: false, hasVoice: false, rand: Math.random }), 'type'));
});

describe('buildMcqOptions', () => {
  const deck = { words: [] };
  for (let i = 0; i < 8; i++) deck.words.push({ id: 'w' + i, word: 'w' + i, meaning: 'm' + i, pos: i % 2 ? 'verb' : 'noun' });
  it('4 options, 1 correct, unique', () => {
    const o = buildMcqOptions(deck.words[1], deck, Math.random);
    assert.equal(o.length, 4); assert.equal(o.filter(x => x.correct).length, 1);
    assert.equal(new Set(o.map(x => x.meaning)).size, 4);
    assert.ok(o.some(x => x.correct && x.meaning === 'm1'));
  });
  it('prefers same pos', () => {
    const o = buildMcqOptions(deck.words[1], deck, rnd0);
    assert.ok(o.filter(x => !x.correct).every(x => x.pos === 'verb'), JSON.stringify(o));
  });
});
