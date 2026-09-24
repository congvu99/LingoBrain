/* Test server/deck-rows.js: words.json / audio/index.json ↔ dòng DB. Số lượng kỳ vọng tính từ file thật. Chỉ chạy trong Node. */
describe('deck rows (Node)', () => {
  if (typeof require === 'undefined') { it('bỏ qua ngoài Node', () => assert.ok(true)); return; }
  const rows = require(path.join(ROOT, 'server', 'deck-rows.js'));
  const wordsJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'words.json'), 'utf8'));
  const audioJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'audio', 'index.json'), 'utf8'));

  it('wordsToRows: đủ số từ trong words.json, sort_order liên tục, cột snake_case', () => {
    const r = rows.wordsToRows(wordsJson);
    assert.equal(r.length, rows.deckWordsOf(wordsJson).length);
    assert.ok(r.every((x, i) => x.sort_order === i), 'sort_order');
    assert.equal(r[0].context_vi, wordsJson.words[0].contextVi);
    assert.equal(r[0].output_prompt, wordsJson.words[0].outputPrompt);
  });
  it('round-trip rowsToWords(wordsToRows(j)) = j.words (cả thứ tự khoá)', () => {
    assert.deepEqual(rows.rowsToWords(rows.wordsToRows(wordsJson)), wordsJson.words);
  });
  it('mảng trần cũng parse (cùng shape client chấp nhận)', () => {
    assert.equal(rows.wordsToRows([{ id: 'a', word: 'a' }]).length, 1);
    assert.equal(rows.deckWordsOf(null).length, 0);
  });
  it('bỏ mục thiếu id/word, id trùng giữ mục đầu, trường thiếu → chuỗi rỗng', () => {
    const r = rows.wordsToRows({ words: [{ id: 'x', word: 'x', meaning: 'một' }, { id: 'x', word: 'x2' }, { word: 'no-id' }, { id: 'y' }, null] });
    assert.equal(r.length, 1);
    assert.equal(r[0].meaning, 'một');
    assert.equal(r[0].ipa, '');
    assert.equal(r[0].sort_order, 0);
  });
  it('audioToRows: đủ số mục trong audio/index.json, loại tên file lạ', () => {
    assert.equal(rows.audioToRows(audioJson).length, Object.keys(audioJson.items).length);
    const bad = rows.audioToRows({ items: { a: '../x.mp3', b: 'abcdef012345.mp3', c: 'ABCDEF012345.mp3', d: 5 } });
    assert.deepEqual(bad, [{ text: 'b', file: 'abcdef012345.mp3' }]);
    assert.equal(rows.audioToRows(null).length, 0);
  });
  it('contentHash ổn định, đổi khi 1 byte đổi', () => {
    const a = rows.contentHash(Buffer.from('{"words":[]}'), Buffer.from('{}'));
    assert.equal(a, rows.contentHash(Buffer.from('{"words":[]}'), Buffer.from('{}')));
    assert.ok(a !== rows.contentHash(Buffer.from('{"words":[ ]}'), Buffer.from('{}')));
    assert.ok(/^[0-9a-f]{40}$/.test(a));
  });
});
