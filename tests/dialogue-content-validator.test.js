/* Test server/dialogue-content-validator.js + dialogue-prompt-builder.js + gemini-dialogue-provider.js (fetch giả). Chỉ chạy trong Node. */
describe('dialogue validator + provider (Node)', () => {
  if (typeof require === 'undefined') { it('bỏ qua ngoài Node', () => assert.ok(true)); return; }
  const V = require(path.join(ROOT, 'server', 'dialogue-content-validator.js'));
  const P = require(path.join(ROOT, 'server', 'dialogue-prompt-builder.js'));
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

  it('pickScenarios: 3 thẻ khác nhau, ổn định theo ngày; lần tạo kế sang nhóm khác', () => {
    const a = P.pickScenarios('2026-10-06', 0), b = P.pickScenarios('2026-10-06', 1);
    assert.equal(a.length, 3); assert.equal(new Set(a.map(s => s.title)).size, 3);
    assert.deepEqual(a, P.pickScenarios('2026-10-06', 0));
    assert.ok(a.every(s => b.indexOf(s) < 0));
  });
  it('pickScenarios: ngày liền kề không trùng thẻ nào (cả 3 lần tạo/ngày)', () => {
    const titles = (day, ns) => ns.flatMap(n => P.pickScenarios(day, n).map(s => s.title));
    const d1 = titles('2026-10-06', [0, 1, 2]), d2 = titles('2026-10-07', [0, 1, 2]);
    assert.equal(new Set(d1).size, 9);
    assert.ok(d2.every(t => d1.indexOf(t) < 0));
  });
  it('mọi thẻ tình huống đủ trường; có trục trặc để người học phải xử lý', () => {
    assert.ok(P.SCENARIOS.length >= 12);
    assert.ok(P.SCENARIOS.every(s => s.title && s.vi && s.you && s.them && s.goal && s.twist));
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
  it('buildPrompt: 3 thẻ + từng mục; bối cảnh người học chỉ có khi được cấu hình', () => {
    const sc = P.pickScenarios('2026-10-06', 0);
    const p = P.buildPrompt(sc, WORDS, '');
    assert.ok(sc.every(s => p.indexOf(s.title) >= 0) && p.indexOf('figure out') >= 0 && p.indexOf('hintVi') >= 0);
    assert.equal(p.indexOf('Learner profile'), -1);
    assert.ok(P.buildPrompt(sc, WORDS, 'barista in Da Nang').indexOf('Learner profile: barista in Da Nang') >= 0);
  });
  it('system instruction đặt tính ứng dụng lên đầu', () => {
    assert.ok(/REUSE IN REAL LIFE/.test(P.SYSTEM_INSTRUCTION) && /twist/.test(P.SYSTEM_INSTRUCTION) && /clarification/.test(P.SYSTEM_INSTRUCTION));
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
      const p = createGeminiDialogueProvider({ apiKey: 'k1', model: 'gemini-3.6-flash', learner: 'waiter <b>in Hoi An', fetchImpl: fetchStub(st) });
      assert.deepEqual(await p.generate({ scenarios: P.pickScenarios('2026-10-06', 0), words: WORDS }), { ok: 1 });
      assert.equal(st.body.systemInstruction.parts[0].text, P.SYSTEM_INSTRUCTION);
      assert.equal(st.body.contents[0].parts[0].text.indexOf('Learner profile'), -1, 'bối cảnh có < > bị cleanText loại');
      assert.ok(/models\/gemini-3\.6-flash:generateContent$/.test(st.url));
      assert.equal(st.opt.headers['x-goog-api-key'], 'k1');
      assert.equal(st.url.indexOf('k1'), -1, 'key không nằm trong URL');
      const g = st.body.generationConfig;
      assert.equal(g.responseMimeType, 'application/json');
      assert.ok(g.responseSchema && g.maxOutputTokens > 0 && g.thinkingConfig.thinkingLevel);
    } },
    { name: 'provider: HTTP lỗi → UPSTREAM, JSON hỏng → INVALID, abort → BUSY', fn: async () => {
      const mk = st => createGeminiDialogueProvider({ apiKey: 'k', model: 'm', fetchImpl: fetchStub(st) });
      const code = async (st, signal) => { try { await mk(st).generate({ scenarios: P.pickScenarios('2026-10-06', 0), words: WORDS, signal }); return 'none'; } catch (e) { return e.code; } };
      assert.equal(await code({ status: 500, json: {} }), 'UPSTREAM');
      assert.equal(await code({ status: 429, json: {} }), 'QUOTA');
      assert.equal(await code({ json: reply('{not json') }), 'INVALID');
      assert.equal(await code({ json: { candidates: [] } }), 'UPSTREAM');
      const ac = new AbortController(); ac.abort();
      assert.equal(await code({ throwErr: new Error('aborted') }, ac.signal), 'BUSY');
      assert.equal(await code({ throwErr: new Error('ECONNRESET') }), 'UPSTREAM');
    } },
    { name: 'provider: 429 → chuyển model dự phòng; model hết lượt bị bỏ qua 10 phút rồi thử lại', fn: async () => {
      let t = 0; const urls = [];
      const fetchImpl = async url => { urls.push(url); const quota = url.indexOf('/main:') >= 0;
        return { ok: !quota, status: quota ? 429 : 200, json: async () => reply(JSON.stringify({ ok: 1 })) }; };
      const p = createGeminiDialogueProvider({ apiKey: 'k', model: 'main', fallbackModel: 'backup', fetchImpl, now: () => t });
      const args = { scenarios: P.pickScenarios('2026-10-06', 0), words: WORDS };
      assert.deepEqual(await p.generate(args), { ok: 1 });
      assert.equal(urls.length, 2);
      await p.generate(args);
      assert.equal(urls.length, 3, 'main đang bị bỏ qua → gọi thẳng backup');
      assert.ok(urls[2].indexOf('/backup:') >= 0);
      t = 10 * 60 * 1000 + 1; await p.generate(args);
      assert.ok(urls[3].indexOf('/main:') >= 0, 'hết hạn bỏ qua → thử lại main');
    } },
    { name: 'provider: thời gian bỏ qua theo retryDelay của Google (kẹp 30s–10 phút); quotaWaitMs', fn: async () => {
      const mk = delay => createGeminiDialogueProvider({ apiKey: 'k', model: 'main', now: () => 0,
        fetchImpl: async () => ({ ok: false, status: 429, json: async () => (delay ? { error: { details: [{ retryDelay: delay }] } } : {}) }) });
      const args = { scenarios: P.pickScenarios('2026-10-06', 0), words: WORDS };
      for (const [delay, want] of [['45s', 45000], ['2s', 30000], ['86400s', 600000], [null, 600000]]) {
        const p = mk(delay);
        assert.equal(p.quotaWaitMs(), 0);
        try { await p.generate(args); } catch (e) { assert.equal(e.code, 'QUOTA'); }
        assert.equal(p.quotaWaitMs(), want, 'retryDelay ' + delay);
      }
    } },
    { name: 'provider: không dự phòng + hết lượt → QUOTA ngay, không gọi mạng', fn: async () => {
      let calls = 0;
      const p = createGeminiDialogueProvider({ apiKey: 'k', model: 'main', now: () => 0,
        fetchImpl: async () => { calls++; return { ok: false, status: 429, json: async () => ({}) }; } });
      const args = { scenarios: P.pickScenarios('2026-10-06', 0), words: WORDS };
      let c1, c2;
      try { await p.generate(args); } catch (e) { c1 = e.code; }
      try { await p.generate(args); } catch (e) { c2 = e.code; }
      assert.equal(c1, 'QUOTA'); assert.equal(c2, 'QUOTA'); assert.equal(calls, 1);
    } },
    { name: 'provider: lỗi HTTP ghi lý do Google (API_KEY_INVALID…) vào message để log chẩn đoán', fn: async () => {
      const body = { error: { code: 400, status: 'INVALID_ARGUMENT', message: 'API key not valid. Please pass a valid API key.', details: [{ reason: 'API_KEY_INVALID' }] } };
      const p = createGeminiDialogueProvider({ apiKey: 'k', model: 'gemini-3.6-flash', fetchImpl: async () => ({ ok: false, status: 400, json: async () => body }) });
      let err;
      try { await p.generate({ scenarios: P.pickScenarios('2026-10-06', 0), words: WORDS }); } catch (e) { err = e; }
      assert.equal(err.code, 'UPSTREAM');
      assert.ok(/http 400 model=gemini-3.6-flash API_KEY_INVALID: API key not valid/.test(err.message), err.message);
    } },
    { name: 'provider: thiếu key / model lạ → ném khi tạo', fn: async () => {
      let n = 0;
      try { createGeminiDialogueProvider({ apiKey: '', model: 'm' }); } catch (e) { n++; }
      try { createGeminiDialogueProvider({ apiKey: 'k', model: '../x?y' }); } catch (e) { n++; }
      try { createGeminiDialogueProvider({ apiKey: 'k', model: 'm', fallbackModel: 'a/b' }); } catch (e) { n++; }
      assert.equal(n, 3);
    } }
  ]);
});
