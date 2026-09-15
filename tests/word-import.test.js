describe('parseImport — text', () => {
  it('3 separators', () => {
    const r = parseImport('a | b\nc - d\ne\tf');
    assert.equal(r.words.length, 3); assert.equal(r.errors.length, 0);
    assert.equal(r.words[0].word, 'a'); assert.equal(r.words[0].meaning, 'b');
    assert.equal(r.words[1].word, 'c'); assert.equal(r.words[2].meaning, 'f');
  });
  it('skips blank and # lines', () => { const r = parseImport('# ghi chú\n\nx | y\n'); assert.equal(r.words.length, 1); });
  it('missing meaning → error', () => { const r = parseImport('x'); assert.equal(r.words.length, 0); assert.equal(r.errors.length, 1); assert.equal(r.errors[0].line, 1); });
  it('4 columns → context + source', () => {
    const w = parseImport("give up - bỏ cuộc - Don't give up! - Movie").words[0];
    assert.equal(w.word, 'give up'); assert.equal(w.meaning, 'bỏ cuộc'); assert.equal(w.context, "Don't give up!"); assert.equal(w.source, 'Movie');
  });
  it('| wins over - inside meaning', () => {
    const w = parseImport('mind-set | tư duy - lối nghĩ').words[0];
    assert.equal(w.word, 'mind-set'); assert.equal(w.meaning, 'tư duy - lối nghĩ');
  });
});

describe('parseImport — json', () => {
  it('array', () => { const r = parseImport('[{"word":"reckon","meaning":"nghĩ"}]'); assert.equal(r.words.length, 1); assert.equal(r.words[0].id, 'reckon'); });
  it('object with deck', () => { const r = parseImport('{"deck":"X","words":[{"word":"a","meaning":"b"}]}'); assert.equal(r.deck, 'X'); assert.equal(r.words.length, 1); });
  it('bad json → error', () => { const r = parseImport('[oops'); assert.equal(r.words.length, 0); assert.equal(r.errors.length, 1); });
  it('empty → nothing', () => { const r = parseImport('   '); assert.equal(r.words.length, 0); });
});
