/* Game Chém chữ — khung DOM + vuốt chém + vòng lặp. Nạp sau fruit-game-logic/render và plane-game-text.js
   (planeLabel cho đề), trước word-game-ui.js. Dùng chung object `game`, gameHeadHtml/bindGameQuit/endGame
   của khung game. Không ghi srs. Vuốt = pointer events trên canvas (ngón tay lẫn chuột); mỗi đoạn ≥ 8px
   gọi sliceSegment, nhả tay gọi endStroke. Dọn dẹp qua game.stop ← stopGameTimer(). */

const FRUIT_END_DELAY = 1100;   // hết tim: để quả vỡ / chớp đỏ cuối chạy xong rồi mới sang màn kết thúc
const FRUIT_MAX_DPR = 2;        // canvas 3x trên iPhone Pro tốn gấp đôi điểm ảnh mà mắt không thấy khác

let fruitUi = null;  // null | { seq, raf, countdown, last, time, started, paused, ending, canvas, ctx, fx, field, pool, ptr, shown, off[] }

function startFruitGame() {
  game.stop = stopFruitLoop;
  $('#app').innerHTML = '<div class="fruit-game" id="fruitGame">' + gameHeadHtml('') +
    '<div class="fruit-prompt serif" id="fruitPrompt" aria-live="polite">Chọn cấp rồi bấm Bắt đầu</div>' +
    '<div class="fruit-field" id="fruitField"><canvas id="fruitCanvas" aria-label="màn chơi chém chữ"></canvas>' +
      '<button class="btn-sm fruit-pause" id="fruitPause" aria-label="tạm dừng">⏸</button>' +
      '<div class="plane-overlay fruit-overlay" id="fruitOverlay"><p id="fruitMsg">Đề là <b>nghĩa tiếng Việt</b> ở trên. ' +
      'Vuốt chém quả mang <b>từ tiếng Anh đúng</b>, quả khác là bom.<br>Chém nhầm (kể cả 1 nhát trúng cả bom) hoặc để quả đúng rơi là mất 1 ❤️.</p>' +
      '<div class="plane-diff" id="fruitDiff" role="radiogroup" aria-label="cấp độ"></div>' +
      '<button class="btn-primary" id="fruitGo">Bắt đầu</button></div></div></div>';
  bindGameQuit();
  const canvas = $('#fruitCanvas');
  const ui = fruitUi = { seq: game.seq, raf: 0, countdown: 0, last: 0, time: 0, started: false, paused: false, ending: false,
    canvas, ctx: canvas.getContext('2d'), fx: createFruitFx(), field: $('#fruitField'), pool: gamePool(deck, srs, 'fruit'),
    ptr: null, shown: null, off: [] };
  document.documentElement.classList.add('game-lock');
  fruitListen(window, 'resize', fitFruitGame);
  // đề đổi 1 ↔ 2 dòng làm khung chơi đổi cao mà window không resize → theo dõi chính khung
  if (window.ResizeObserver) { const ro = new ResizeObserver(fitFruitGame); ro.observe(ui.field); ui.off.push(() => ro.disconnect()); }
  fruitListen(document, 'visibilitychange', () => { if (document.hidden) pauseFruits(); });
  bindFruitControls(ui);
  fitFruitGame();
  chooseFruitDifficulty(cfg.fruitLevel);
  syncFruitGame();
  drawFruitScene(ui.ctx, game.fruit, ui.fx, 0);
}

function fruitListen(target, type, fn, opt) { target.addEventListener(type, fn, opt); fruitUi.off.push(() => target.removeEventListener(type, fn, opt)); }

function bindFruitControls(ui) {
  $('#fruitPause').onclick = () => pauseFruits();     // chỉ dừng; chơi tiếp bằng nút trên lớp phủ
  $('#fruitGo').onclick = () => {
    if (ui.started) return resumeFruits();
    if (ui.countdown) return;
    $('#fruitDiff').hidden = true;             // đang chơi không đổi cấp
    $('#fruitGo').hidden = true;
    ui.countdown = readyCountdown(n => { $('#fruitMsg').innerHTML = readyNumHtml(n); }, () => {
      if (fruitUi !== ui) return;
      ui.countdown = 0; ui.started = true;
      $('#fruitGo').hidden = false;
      $('#fruitOverlay').hidden = true;
      ui.raf = requestAnimationFrame(fruitFrame);
      if (document.hidden) pauseFruits();              // đếm xong lúc app đang ẩn: dừng chờ
    });
  };
  const c = ui.canvas;
  // cuộn / kéo-để-tải-lại do touch-action:none + html.game-lock chặn; preventDefault chỉ để không chọn chữ / kéo ảnh
  fruitListen(c, 'pointerdown', e => {
    if (!ui.started || ui.paused || ui.ptr) return;
    e.preventDefault();
    try { c.setPointerCapture(e.pointerId); } catch (err) {}   // ngón tay ra khỏi canvas vẫn nhận move/up
    ui.rect = c.getBoundingClientRect();
    const p = fruitPos(ui, e);
    ui.ptr = { id: e.pointerId, x: p.x, y: p.y };
    fruitBladePoint(ui.fx, p.x, p.y);
  }, { passive: false });
  fruitListen(c, 'pointermove', e => {
    const ptr = ui.ptr;
    if (!ptr || e.pointerId !== ptr.id || ui.paused || !game || !game.fruit) return;
    e.preventDefault();
    // vuốt nhanh: trình duyệt gộp nhiều điểm vào 1 sự kiện → lấy đủ để nhát không "nhảy qua" quả
    const list = (e.getCoalescedEvents && e.getCoalescedEvents()) || [];
    for (const ev of list.length ? list : [e]) {
      const p = fruitPos(ui, ev);
      fruitBladePoint(ui.fx, p.x, p.y);
      if (Math.hypot(p.x - ptr.x, p.y - ptr.y) < FRUIT_MIN_SEG) continue;   // giữ điểm cũ tới khi đủ 8px
      handleFruitEvents(ui, sliceSegment(game.fruit, ptr.x, ptr.y, p.x, p.y));
      ptr.x = p.x; ptr.y = p.y;
    }
  }, { passive: false });
  const release = e => {
    if (!ui.ptr || e.pointerId !== ui.ptr.id) return;
    ui.ptr = null;
    if (game && game.fruit) handleFruitEvents(ui, endStroke(game.fruit));   // trong cử chỉ thật → speak() phát được trên iOS
  };
  fruitListen(c, 'pointerup', release);
  fruitListen(c, 'pointercancel', release);
  fruitListen(c, 'lostpointercapture', release);     // mất capture mà không có up → không kẹt ui.ptr
}

function fruitPos(ui, e) { const r = ui.rect || ui.canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }

/* Sự kiện logic → hiệu ứng + giọng đọc. Sai / rơi: đọc từ đúng để dạy lại ngay */
function handleFruitEvents(ui, evs) {
  let changed = false;
  for (const e of evs) {
    fruitFxEvent(ui.fx, e);
    if (e.type === 'split') continue;
    changed = true;
    speak(e.word.word);
    if (e.type !== 'right' && !ui.fx.reduced && navigator.vibrate) navigator.vibrate(40);
  }
  if (changed) syncFruitGame();
}

/* Chọn cấp trước ván: dựng lại state (chưa có đợt nào), ghi nhớ cho lần sau, đổi khoá kỷ lục */
function chooseFruitDifficulty(id) {
  const d = fruitDifficulty(id), ui = fruitUi;
  cfg.fruitLevel = d.id; save(K_CFG, cfg);
  game.fruit = createFruitState(game.words, ui.pool, srs, ui.w, ui.h, d.id);
  game.scoreKey = fruitScoreKey(d.id); game.levelLabel = d.label;
  $('#fruitDiff').innerHTML = FRUIT_DIFFICULTY_IDS.map(k => {
    const x = FRUIT_DIFFICULTIES[k], best = (gameScore[fruitScoreKey(k)] || {}).best;
    return '<button role="radio" data-diff="' + k + '" aria-checked="' + (k === d.id) + '">' + x.label +
      (best ? '<b class="mono">★ ' + best + '</b>' : '') + '</button>';
  }).join('');
  $('#fruitDiff').querySelectorAll('button').forEach(b => { b.onclick = () => chooseFruitDifficulty(b.dataset.diff); });
}

function fitFruitGame() {
  const ui = fruitUi;
  if (!ui) return;
  const w = ui.field.clientWidth, h = ui.field.clientHeight, dpr = Math.min(FRUIT_MAX_DPR, window.devicePixelRatio || 1);
  if (!w || !h || (w === ui.w && h === ui.h && dpr === ui.dpr)) return;
  ui.w = w; ui.h = h; ui.dpr = dpr; ui.rect = null;
  ui.canvas.width = Math.round(w * dpr); ui.canvas.height = Math.round(h * dpr);
  ui.canvas.style.width = w + 'px'; ui.canvas.style.height = h + 'px';
  ui.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  resizeFruitFx(ui.fx, w, h, dpr);
  if (game && game.fruit) { resizeFruitState(game.fruit, w, h); drawFruitScene(ui.ctx, game.fruit, ui.fx, ui.time); }
}

function fruitFrame(t) {
  const ui = fruitUi;
  if (!ui || !game || game.seq !== ui.seq || game.over) return;   // ván cũ / đã kết thúc → dừng hẳn
  ui.raf = requestAnimationFrame(fruitFrame);
  const dt = ui.last ? Math.min(0.05, (t - ui.last) / 1000) : 0;
  ui.last = t; ui.time += dt;
  const st = game.fruit;
  handleFruitEvents(ui, stepFruits(st, dt, Math.random));
  stepFruitFx(ui.fx, dt);
  if (st.wave && st.wave.target !== ui.shown) {        // đợt mới → đổi đề
    ui.shown = st.wave.target;
    $('#fruitPrompt').textContent = planeLabel(ui.shown);
  }
  drawFruitScene(ui.ctx, st, ui.fx, ui.time);
  if (st.over && !ui.ending) {
    ui.ending = true;
    setTimeout(() => { if (game && game.seq === ui.seq) endGame(); }, FRUIT_END_DELAY);
  }
}

/* Chép số liệu sang `game` để endGame()/flushMiss() dùng chung đọc đúng; vẽ lại HUD */
function syncFruitGame() {
  const st = game.fruit;
  Object.assign(game, { score: st.score, right: st.right, wrong: st.wrong, streak: st.streak, bestStreak: st.bestStreak,
    miss: st.miss.slice(), confusions: Object.assign({}, st.confusions) });
  const hud = $('#fruitGame .game-head .mono');
  if (hud) hud.textContent = '❤️'.repeat(Math.max(0, st.lives)) + '🖤'.repeat(FRUIT_LIVES - Math.max(0, st.lives)) + ' · ' + Math.floor(st.score) +
    (st.streak >= 5 ? ' · ×' + comboMult(st.streak) : '');
}

function pauseFruits() {
  const ui = fruitUi;
  if (!ui || !ui.started || ui.paused || ui.ending || !game || game.over) return;
  ui.paused = true;
  cancelAnimationFrame(ui.raf);     // dừng hẳn vòng lặp cho đỡ pin; resumeFruits chạy lại
  if (ui.ptr) { ui.ptr = null; handleFruitEvents(ui, endStroke(game.fruit)); }   // nhát đang dở: chấm luôn, không treo qua lúc dừng
  $('#fruitMsg').textContent = 'Đang tạm dừng';
  $('#fruitGo').textContent = 'Chơi tiếp';
  $('#fruitOverlay').hidden = false;
}

function resumeFruits() {
  const ui = fruitUi;
  if (!ui || !ui.paused) return;
  ui.paused = false;
  ui.last = 0;                      // khung đầu sau khi tiếp: dt = 0, không nhảy cóc
  $('#fruitOverlay').hidden = true;
  ui.raf = requestAnimationFrame(fruitFrame);
}

function toggleFruitPause() { if (fruitUi && fruitUi.paused) resumeFruits(); else pauseFruits(); }

/* Gọi qua game.stop từ stopGameTimer(): thoát, đổi tab, kết thúc ván đều đi qua đây */
function stopFruitLoop() {
  const ui = fruitUi;
  if (!ui) return;
  if (game && game.fruit) syncFruitGame();   // từ sai nằm ở st.miss: phải chép sang game trước khi flushMiss
  cancelAnimationFrame(ui.raf);
  clearInterval(ui.countdown);
  ui.off.forEach(f => f());
  document.documentElement.classList.remove('game-lock');
  fruitUi = null;
}
