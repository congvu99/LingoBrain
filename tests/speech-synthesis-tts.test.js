/* Test js/speech-synthesis.js: file đụng DOM (window/document/Audio) ở top-level nên không nạp vào context
   dùng chung của run-tests.js (PURE_MODULES) — nạp vào 1 vm context riêng với stub trình duyệt tối giản.
   Chỉ chạy trong Node. */
describe('speech-synthesis (Node, /api/tts)', () => {
  if (typeof require === 'undefined') { it('bỏ qua ngoài Node', () => assert.ok(true)); return; }
  const vm = require('vm');
  const SRC = fs.readFileSync(path.join(ROOT, 'js', 'speech-synthesis.js'), 'utf8');
  const flush = () => new Promise(r => setTimeout(r, 0));   // xả hàng đợi microtask (fetch/blob/then) trước khi assert

  // Timer giả: setTimeout/clearTimeout không chạy thật — test tự bắn callback theo id, không phải chờ 6s/watchdog thật
  function makeTimers() {
    const list = [];
    return {
      setTimeout(fn, ms) { const id = list.length; list.push({ fn, ms, cleared: false }); return id; },
      clearTimeout(id) { if (list[id]) list[id].cleared = true; },
      fireLast() { for (let i = list.length - 1; i >= 0; i--) if (!list[i].cleared) return list[i].fn(); },
      list
    };
  }

  // dựng context riêng cho 1 test: audioItems giả lập MP3 dựng sẵn (audioMap), online, fetchImpl tự chọn hành vi
  async function makeCtx({ audioItems = {}, online = true, fetchImpl } = {}) {
    const state = { player: null, fetchCalls: [], utterances: [] };
    const timers = makeTimers();
    const timeState = { t: 0 };
    const speechState = { last: null };
    const sandbox = {
      console, Math, JSON, Array, Object, String, Number, RegExp, Error, Promise, AbortController,
      Date: { now: () => timeState.t },
      setTimeout: timers.setTimeout, clearTimeout: timers.clearTimeout,
      navigator: { onLine: online },
      URL: { createObjectURL: () => 'blob:x', revokeObjectURL: () => {} },
      document: { addEventListener: () => {} },
      Audio: function Audio() {
        const a = {
          paused: true, src: '', defaultPlaybackRate: 1, playbackRate: 1, onended: null, onerror: null,
          play() { this.paused = false; return Promise.resolve(); }, pause() { this.paused = true; }
        };
        state.player = a; return a;
      },
      SpeechSynthesisUtterance: function (text) { this.text = text; this.onend = null; this.onerror = null; state.utterances.push(this); },
      speechSynthesis: {
        getVoices() { return []; },
        speak(u) { speechState.last = u; },
        // trình duyệt thật: cancel() một utterance đang đọc bắn sự kiện lỗi 'interrupted' → onerror
        cancel() { const u = speechState.last; if (u && u.onerror) u.onerror(); }
      },
      fetchFirstOk: async () => (Object.keys(audioItems).length ? { data: { items: audioItems } } : null),
      audioSources: () => [],
      isAudioIndexJson: () => true,
      cleanAudioItems: items => items,
      fetch(url, opts) { state.fetchCalls.push({ url, opts }); return fetchImpl ? fetchImpl(url, opts) : Promise.reject(new Error('no fetchImpl')); }
    };
    sandbox.window = sandbox;
    const ctx = vm.createContext(sandbox);
    ctx.globalThis = ctx;
    vm.runInContext(SRC, ctx, { filename: 'speech-synthesis.js' });
    await flush();   // fetchFirstOk (async) gán xong audioMap trước khi test gọi speak()
    return { ctx, state, timers, setNow: t => { timeState.t = t; } };
  }
  const okBlob = () => Promise.resolve({ ok: true, status: 200, blob: () => Promise.resolve({}) });
  const errStatus = s => () => Promise.resolve({ ok: false, status: s, blob: () => Promise.resolve({}) });

  globalThis.__asyncTests = (globalThis.__asyncTests || []).concat([
    { name: 'speak(falsy) → Promise resolve ngay, không fetch/không đọc', fn: async () => {
      const { ctx, state } = await makeCtx({});
      const r = await ctx.speak('');
      assert.equal(r, undefined);
      assert.equal(state.fetchCalls.length, 0);
      assert.equal(state.utterances.length, 0);
    } },

    { name: 'có MP3 dựng sẵn → phát qua audio/, không gọi /api/tts (không header)', fn: async () => {
      const { ctx, state } = await makeCtx({ audioItems: { hello: 'abc123456789.mp3' }, fetchImpl: okBlob });
      const p = ctx.speak('hello');
      await flush();
      assert.equal(state.fetchCalls.length, 1);
      assert.equal(state.fetchCalls[0].url, 'audio/abc123456789.mp3');
      assert.ok(!state.fetchCalls[0].opts.headers, 'mp3 dựng sẵn không gửi header X-LB-TTS');
      state.player.onended();
      await p;
      assert.equal(state.utterances.length, 0, 'không rơi Web Speech vì phát mp3 thành công');
    } },

    { name: 'không có MP3 dựng sẵn, online → gọi /api/tts?text= kèm header X-LB-TTS', fn: async () => {
      const { ctx, state } = await makeCtx({ fetchImpl: okBlob });
      const p = ctx.speak('Good morning');
      await flush();
      assert.equal(state.fetchCalls.length, 1);
      assert.equal(state.fetchCalls[0].url, 'api/tts?text=' + encodeURIComponent('Good morning'));
      assert.equal(state.fetchCalls[0].opts.headers['X-LB-TTS'], '1');
      state.player.onended();
      await p;
    } },

    { name: '501 → rơi Web Speech, tạm ngừng gọi /api/tts 10 phút rồi thử lại', fn: async () => {
      const { ctx, state, setNow } = await makeCtx({ fetchImpl: errStatus(501) });
      ctx.speak('Hi there'); await flush();
      assert.equal(state.fetchCalls.length, 1);
      assert.equal(state.utterances.length, 1, 'lỗi 501 → rơi Web Speech');
      state.utterances[0].onend();
      ctx.speak('Another sentence'); await flush();
      assert.equal(state.fetchCalls.length, 1, 'còn trong 10 phút → không gọi lại /api/tts');
      setNow(10 * 60 * 1000 + 1);
      ctx.speak('Third one'); await flush();
      assert.equal(state.fetchCalls.length, 2, 'hết 10 phút → thử gọi lại');
    } },

    { name: '404 → tắt tạm như 501', fn: async () => {
      const { ctx, state } = await makeCtx({ fetchImpl: errStatus(404) });
      ctx.speak('Hello world'); await flush();
      assert.equal(state.fetchCalls.length, 1);
      if (state.utterances[0]) state.utterances[0].onend();
      ctx.speak('Second'); await flush();
      assert.equal(state.fetchCalls.length, 1, '404 cũng tắt tạm giống 501');
    } },

    { name: '405 → tắt tạm như 501 (route cũ chưa có ở server cũ)', fn: async () => {
      const { ctx, state } = await makeCtx({ fetchImpl: errStatus(405) });
      ctx.speak('Old server'); await flush();
      assert.equal(state.fetchCalls.length, 1);
      if (state.utterances[0]) state.utterances[0].onend();
      ctx.speak('Second call'); await flush();
      assert.equal(state.fetchCalls.length, 1);
    } },

    { name: '503/429/502 → rơi Web Speech nhưng lần sau vẫn gọi lại /api/tts', fn: async () => {
      for (const status of [503, 429, 502]) {
        const { ctx, state } = await makeCtx({ fetchImpl: errStatus(status) });
        ctx.speak('Retry me'); await flush();
        assert.equal(state.fetchCalls.length, 1, 'status ' + status);
        assert.equal(state.utterances.length, 1, 'status ' + status + ' rơi Web Speech');
        state.utterances[0].onend();
        ctx.speak('Retry me again'); await flush();
        assert.equal(state.fetchCalls.length, 2, 'status ' + status + ' vẫn gọi lại lần sau');
      }
    } },

    { name: 'offline / câu quá dài (>200) / chứa < → không gọi /api/tts', fn: async () => {
      const off = await makeCtx({ online: false });
      off.ctx.speak('Offline sentence'); await flush();
      assert.equal(off.state.fetchCalls.length, 0);
      assert.equal(off.state.utterances.length, 1, 'vẫn rơi thẳng Web Speech');

      const long = await makeCtx({});
      long.ctx.speak('a'.repeat(201)); await flush();
      assert.equal(long.state.fetchCalls.length, 0, '>200 ký tự không gọi');

      const boundary = await makeCtx({ fetchImpl: okBlob });
      boundary.ctx.speak('a'.repeat(200)); await flush();
      assert.equal(boundary.state.fetchCalls.length, 1, '=200 ký tự vẫn gọi được');

      const tag = await makeCtx({});
      tag.ctx.speak('bad <b>tag</b>'); await flush();
      assert.equal(tag.state.fetchCalls.length, 0, 'chứa < > không gọi');
    } },

    { name: 'lượt speak mới huỷ fetch cũ (AbortController); timeout 6s → fallback Web Speech', fn: async () => {
      const fetchImpl = (url, opts) => new Promise((resolve, reject) => {
        if (opts.signal) opts.signal.addEventListener('abort', () => reject(new Error('aborted')));
      });
      const { ctx, state, timers } = await makeCtx({ fetchImpl });
      const p1 = ctx.speak('First sentence');
      await flush();
      assert.equal(state.fetchCalls.length, 1);
      const p2 = ctx.speak('Second sentence');   // lượt mới → huỷ fetch cũ ngay (curAbort.abort())
      await flush();
      assert.equal(state.fetchCalls.length, 2);
      await p1;   // pendingDone bị "đè" resolve ngay khi lượt mới bắt đầu, không treo
      assert.equal(state.utterances.length, 0, 'fetch cũ bị huỷ vì lượt mới hơn → không rơi Web Speech đè lượt mới');
      timers.fireLast();   // giả lập timeout 6s của lượt 2 bắn (lượt 1 chưa clear timer nhưng token đã lệch, bị bỏ qua)
      await flush();
      assert.equal(state.utterances.length, 1, 'timeout của lượt còn hiệu lực → fallback Web Speech');
      state.utterances[0].onend();
      await p2;
    } },

    { name: 'stopSpeaking(): resolve Promise đang treo, gọi player.pause() và speechSynthesis.cancel()', fn: async () => {
      const { ctx, state } = await makeCtx({ fetchImpl: () => new Promise(() => {}) });   // fetch treo mãi
      let pauseCalls = 0, cancelCalls = 0;
      const origPause = state.player.pause.bind(state.player);
      state.player.pause = (...a) => { pauseCalls++; return origPause(...a); };
      const origCancel = ctx.speechSynthesis.cancel.bind(ctx.speechSynthesis);
      ctx.speechSynthesis.cancel = (...a) => { cancelCalls++; return origCancel(...a); };
      const p = ctx.speak('Hanging sentence');
      await flush();
      let resolved = false;
      p.then(() => { resolved = true; });
      ctx.stopSpeaking();
      await flush();
      assert.ok(resolved, 'Promise của speak() phải resolve khi stopSpeaking()');
      assert.ok(pauseCalls >= 1, 'player.pause() được gọi');
      assert.ok(cancelCalls >= 1, 'speechSynthesis.cancel() được gọi');
    } },

    { name: 'watchdog speakSystem: utterance im lặng (không onend/onerror) vẫn resolve sau timeout', fn: async () => {
      const { ctx, state, timers } = await makeCtx({ online: false });   // offline → rơi thẳng Web Speech
      const p = ctx.speak('Silent utterance');
      await flush();
      assert.equal(state.utterances.length, 1);
      let resolved = false;
      p.then(() => { resolved = true; });
      await flush();
      assert.ok(!resolved, 'chưa bắn onend/onerror thì chưa xong');
      timers.fireLast();   // giả lập watchdog hết hạn
      await flush();
      assert.ok(resolved, 'watchdog tự done() khi utterance im lặng');
    } },

    { name: 'Promise của speak() luôn resolve, kể cả fetch lỗi mạng bất kỳ', fn: async () => {
      const { ctx, state } = await makeCtx({ fetchImpl: () => Promise.reject(new Error('network down')) });
      const p = ctx.speak('Network issue');
      await flush();
      assert.equal(state.utterances.length, 1, 'lỗi mạng → rơi Web Speech');
      state.utterances[0].onend();
      let err = null;
      await p.catch(e => { err = e; });
      assert.ok(!err, 'speak() không bao giờ reject');
    } }
  ]);
});
