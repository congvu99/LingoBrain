/* Test server/dialogue-content-validator.js + server/gemini-dialogue-provider.js (fetch giả). Chỉ chạy trong Node. */
describe('dialogue validator + provider (Node)', () => {
  if (typeof require === 'undefined') { it('bỏ qua ngoài Node', () => assert.ok(true)); return; }
  const V = require(path.join(ROOT, 'server', 'dialogue-content-validator.js'));
  const { createGeminiDialogueProvider } = require(path.join(ROOT, 'server', 'gemini-dialogue-provider.js'));

  const WORDS = [{ id: 'reckon', word: 'reckon', pos: 'verb', meaning: 'nghĩ rằng' },
    { id: 'figure-out', word: 'figure out', pos: 'phrasal verb', meaning: 'hiểu ra' },
    { id: 'buy', word: 'buy', pos: 'verb', meaning: 'mua' }];
  function sample(n) {
    const turns = [];
    for (let i = 0; i < (n || 10); i++) {
      const you = i % 2 === 1;
      turns.push({ who: you ? 'you' : 'them', en: i === 1 ? 'I reckon we can figure it out.' : 'Line ' + i + '.', vi: 'Câu ' + i, ids: [], hintVi: you ? 'Ý chính ' + i : undefined });
    }
    return { scenario: 'Café', scenarioVi: 'Quán cà phê', roles: { you: 'customer', them: 'barista' }, turns };
  }

  it('pickScenario ổn định theo ngày, lần tạo kế đổi tình huống', () => {
    assert.deepEqual(V.pickScenario('2026-10-06', 0), V.pickScenario('2026-10-06', 0));
    assert.ok(V.pickScenario('2026-10-06', 0).en !== V.pickScenario('2026-10-06', 1).en);
  });
  it('cleanText: gom khoảng trắng, cắt độ dài, loại < > và ký tự điều khiển', () => {
    assert.equal(V.cleanText('  a   b ', 10), 'a b');
    assert.equal(V.cleanText('x'.repeat(50), 10).length, 10);
    assert.equal(V.cleanText('<img onerror=x>', 100), '');
    assert.equal(V.cleanText('a\u0007b', 100), '');
    assert.equal(V.cleanText(42, 100), '');
  });
  it('hợp lệ: làm sạch, đo phủ, missing chỉ chứa từ không xuất hiện', () => {
    const r = V.validateDialogue(sample(), WORDS);
    assert.ok(r.ok);
    assert.equal(r.dialogue.turns.length, 10);
    assert.deepEqual(r.dialogue.targetIds, ['reckon', 'figure-out', 'buy']);
    assert.deepEqual(r.dialogue.missing, ['buy']);
    assert.near(r.coverage, 2 / 3, 1e-9);
  });
  it('id Gemini tự khai được tin (dạng bất quy tắc); id lạ bị lọc', () => {
    const s = sample(); s.turns[3].en = 'I bought it.'; s.turns[3].ids = ['buy', 'evil-id', 'buy'];
    const r = V.validateDialogue(s, WORDS);
    assert.deepEqual(r.dialogue.turns[3].ids, ['buy']);
    assert.deepEqual(r.dialogue.missing, []);
  });
  it('sai cấu trúc → không hợp lệ', () => {
    assert.ok(!V.validateDialogue(null, WORDS).ok);
    assert.ok(!V.validateDialogue(sample(9), WORDS).ok);
    assert.ok(!V.validateDialogue(sample(15), WORDS).ok);
    let s = sample(); s.turns[1].hintVi = ''; assert.equal(V.validateDialogue(s, WORDS).reason, 'hint');
    s = sample(); s.turns[0].who = 'narrator'; assert.ok(!V.validateDialogue(s, WORDS).ok);
    s = sample(); s.turns[0].en = 'x'.repeat(201); assert.ok(!V.validateDialogue(s, WORDS).ok);
    s = sample(); s.turns[0].en = '<script>'; assert.ok(!V.validateDialogue(s, WORDS).ok);
    s = sample(); s.roles = { you: 'a' }; assert.ok(!V.validateDialogue(s, WORDS).ok);
  });
  it('trường dài bị cắt, không lọt trường lạ', () => {
    const s = sample(); s.roles.them = 'x'.repeat(5000); s.extra = 'y'; s.turns[0].html = '<b>';
    const r = V.validateDialogue(s, WORDS);
    assert.equal(r.dialogue.roles.them.length, 40);
    assert.ok(!('extra' in r.dialogue) && !('html' in r.dialogue.turns[0]));
  });
  it('buildPrompt chứa tình huống + từng mục', () => {
    const p = V.buildPrompt(V.pickScenario('2026-10-06', 0), WORDS);
    assert.ok(p.indexOf('figure out') >= 0 && p.indexOf('hintVi') >= 0);
  });

  function fetchStub(state) {
    return async (url, opt) => {
      state.url = url; state.opt = opt; state.body = JSON.parse(opt.body);
      if (state.throwErr) throw state.throwErr;
      return { ok: (state.status || 200) < 300, status: state.status || 200, json: async () => state.json };
    };
  }
  const reply = text => ({ candidates: [{ content: { parts: [{ text: 'thinking...', thought: true }, { text }] } }] });

  globalThis.__asyncTests = (globalThis.__asyncTests || []).concat([
    { name: 'provider: request đúng endpoint/header/cấu hình, bỏ phần thought', fn: async () => {
      const st = { json: reply(JSON.stringify({ ok: 1 })) };
      const p = createGeminiDialogueProvider({ apiKey: 'k1', model: 'gemini-3.6-flash', fetchImpl: fetchStub(st) });
      assert.deepEqual(await p.generate({ scenario: V.pickScenario('2026-10-06', 0), words: WORDS }), { ok: 1 });
      assert.ok(/models\/gemini-3\.6-flash:generateContent$/.test(st.url));
      assert.equal(st.opt.headers['x-goog-api-key'], 'k1');
      assert.equal(st.url.indexOf('k1'), -1, 'key không nằm trong URL');
      const g = st.body.generationConfig;
      assert.equal(g.responseMimeType, 'application/json');
      assert.ok(g.responseSchema && g.maxOutputTokens > 0 && g.thinkingConfig.thinkingLevel);
    } },
    { name: 'provider: HTTP lỗi → UPSTREAM, JSON hỏng → INVALID, abort → BUSY', fn: async () => {
      const mk = st => createGeminiDialogueProvider({ apiKey: 'k', model: 'm', fetchImpl: fetchStub(st) });
      const code = async (st, signal) => { try { await mk(st).generate({ scenario: { en: 'x' }, words: WORDS, signal }); return 'none'; } catch (e) { return e.code; } };
      assert.equal(await code({ status: 429, json: {} }), 'UPSTREAM');
      assert.equal(await code({ json: reply('{not json') }), 'INVALID');
      assert.equal(await code({ json: { candidates: [] } }), 'UPSTREAM');
      const ac = new AbortController(); ac.abort();
      assert.equal(await code({ throwErr: new Error('aborted') }, ac.signal), 'BUSY');
      assert.equal(await code({ throwErr: new Error('ECONNRESET') }), 'UPSTREAM');
    } },
    { name: 'provider: thiếu key / model lạ → ném khi tạo', fn: async () => {
      let n = 0;
      try { createGeminiDialogueProvider({ apiKey: '', model: 'm' }); } catch (e) { n++; }
      try { createGeminiDialogueProvider({ apiKey: 'k', model: '../x?y' }); } catch (e) { n++; }
      assert.equal(n, 2);
    } }
  ]);
});
