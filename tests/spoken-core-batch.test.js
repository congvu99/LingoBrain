/* Test tools/spoken-core-batch.js: kiểm tra mục batch Spoken core và sắp xen kẽ Oxford/Spoken. Chỉ chạy trong Node. */
describe('spoken core batch (Node)', () => {
  if (typeof require === 'undefined') { it('bỏ qua ngoài Node', () => assert.ok(true)); return; }
  const sc = require(path.join(ROOT, 'tools', 'spoken-core-batch.js'));
  const entry = over => Object.assign({
    id: 'figure-out', word: 'figure out', ipa: '/ˈfɪɡjər aʊt/', pos: 'phrasal verb',
    meaning: 'hiểu ra, tìm ra cách', context: "I can't figure out this app.", contextVi: 'Tôi không hiểu nổi cái app này.',
    source: 'Spoken core · phrasal verb', emoji: '🧩', image: '', mnemonic: '',
    outputPrompt: "Dùng 'figure out' để kể một thứ bạn đang cố hiểu ở chỗ làm."
  }, over);
  const msgs = (deck, batch) => sc.validateEntries(deck, batch).errors.map(e => e.msg).join(' | ');

  it('id phải bằng slug(word) của app: nháy thành gạch, dạng rút gọn không trùng từ Oxford', () => {
    assert.ok(/id phải là "i-ll"/.test(msgs([], [entry({ id: 'ill', word: "I'll", context: "I'll call you.", outputPrompt: "Dùng I'll" })])));
    assert.equal(msgs([{ id: 'ill', word: 'ill' }], [entry({ id: 'i-ll', word: "I'll", context: "I'll call you.", outputPrompt: "Dùng I'll" })]), '');
    assert.equal(msgs([], [entry({ id: 'no-one-knows', word: 'no one knows', context: 'No one knows why.', outputPrompt: 'Dùng no one knows' })]), '');
  });
  it('mục hợp lệ: không lỗi', () => {
    assert.equal(sc.validateEntries([], [entry()]).errors.length, 0);
  });
  it('trùng id / word với bộ hiện có và trong batch', () => {
    assert.ok(/trùng id/.test(msgs([{ id: 'figure-out', word: 'x' }], [entry()])));
    assert.ok(/trùng word/.test(msgs([{ id: 'x', word: 'Figure Out' }], [entry()])));
    assert.ok(/trùng id/.test(msgs([], [entry(), entry()])));
  });
  it('context phải chứa cụm liền mạch (đuôi chia chỉ ở cuối cụm)', () => {
    assert.ok(/liền mạch/.test(msgs([], [entry({ context: 'I figured out the app.' })])));
    assert.ok(/liền mạch/.test(msgs([], [entry({ context: "Let's figure it out." })])));
  });
  it('chặn nháy cong, IPA sai, emoji 📘, prompt chung, source lạ, trường thừa/thiếu', () => {
    assert.ok(/word dùng nháy cong/.test(msgs([], [entry({ id: 'i-m-down', word: 'I’m down', context: 'I’m down.', outputPrompt: 'Dùng I’m down' })])));
    assert.ok(/context dùng nháy cong/.test(msgs([], [entry({ id: 'i-m-down', word: "I'm down", context: 'Sure, I’m down.', outputPrompt: "Dùng I'm down" })])));
    assert.ok(/ipa/.test(msgs([], [entry({ ipa: 'fɪɡjər' })])));
    assert.ok(/emoji/.test(msgs([], [entry({ emoji: '📘' })])));
    assert.ok(/câu chung/.test(msgs([], [entry({ outputPrompt: "Đặt một câu của riêng bạn có dùng 'figure out'." })])));
    assert.ok(/source/.test(msgs([], [entry({ source: 'Oxford 3000/5000 · B2' })])));
    assert.ok(/trường thừa/.test(msgs([], [entry({ extra: '' })])));
    const e = entry(); delete e.contextVi;
    assert.ok(/thiếu/.test(msgs([], [e])));
  });
  it('vế nghĩa đầu dài quá nhãn máy bay', () => {
    assert.ok(/vế nghĩa đầu/.test(msgs([], [entry({ meaning: 'x'.repeat(50) + '; ngắn' })])));
    assert.equal(msgs([], [entry({ meaning: 'ngắn; ' + 'x'.repeat(60) })]), '');
  });
  it('context dài chỉ cảnh báo, không chặn', () => {
    const r = sc.validateEntries([], [entry({ context: "I can't figure out this app. " + 'x '.repeat(60) })]);
    assert.equal(r.errors.length, 0);
    assert.equal(r.warnings.length, 1);
  });
  it('interleave: phim giữ đầu, lặp O,O,S, phần dư nối cuối, idempotent', () => {
    const mk = (id, source) => ({ id, source });
    const words = [mk('f1', 'Friends'), mk('o1', 'Oxford'), mk('s1', 'Spoken core · chunk'), mk('o2', 'Oxford'),
      mk('f2', 'Peaky Blinders'), mk('o3', 'Oxford'), mk('s2', 'Spoken core · word'), mk('s3', 'Spoken core · word'), mk('s4', 'Spoken core · word')];
    const out = sc.interleave(words).map(w => w.id);
    assert.deepEqual(out, ['f1', 'f2', 'o1', 'o2', 's1', 'o3', 's2', 's3', 's4']);
    assert.deepEqual(sc.interleave(sc.interleave(words)).map(w => w.id), out);
    const oxfordLeft = ['o1', 'o2', 'o3', 'o4', 'o5', 'o6', 'o7'].map(id => mk(id, 'Oxford')).concat([mk('s1', 'Spoken core · word')]);
    assert.deepEqual(sc.interleave(oxfordLeft).map(w => w.id), ['o1', 'o2', 's1', 'o3', 'o4', 'o5', 'o6', 'o7']);
  });
  it('words.json hiện tại đã đúng thứ tự xen kẽ và mục Spoken đều hợp lệ', () => {
    const words = JSON.parse(fs.readFileSync(path.join(ROOT, 'words.json'), 'utf8')).words;
    assert.deepEqual(sc.interleave(words).map(w => w.id), words.map(w => w.id));
    const spoken = words.filter(w => sc.groupOf(w) === 'S'), rest = words.filter(w => sc.groupOf(w) !== 'S');
    assert.equal(msgs(rest, spoken), '');
  });
});
