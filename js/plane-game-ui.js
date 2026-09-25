/* Game Bắn máy bay — khung DOM + vòng lặp. Nạp sau plane-game-logic/effects/render, trước word-game-ui.js.
   Dùng chung object `game`, gameHeadHtml/bindGameQuit/endGame của khung game. Không ghi srs.
   Mỗi ký tự gõ vào ô ẩn = 1 phát bắn (typeChar); ô gõ được xoá ngay sau mỗi ký tự.
   iPhone: khung bám visualViewport để bàn phím ảo không che; focus() chỉ gọi trong lần chạm của người dùng
   (iOS chỉ bật bàn phím khi đó). Dọn dẹp qua game.stop ← stopGameTimer(). */

const PLANE_END_DELAY = 1100;   // hết mạng: để vụ nổ cuối chạy xong rồi mới sang màn kết thúc
const PLANE_MAX_DPR = 2;        // canvas 3x trên iPhone Pro tốn gấp đôi điểm ảnh mà mắt không thấy khác

let planeUi = null;  // null | { seq, raf, countdown, last, time, started, paused, ending, canvas, ctx, fx, input, field, off[] }

function startPlaneGame() {
  game.stop = stopPlaneLoop;
  $('#app').innerHTML = '<div class="plane-game" id="planeGame">' +
    gameHeadHtml('', '<button class="btn-sm btn-ghost" id="planePause" aria-label="tạm dừng">⏸</button>') +
    '<div class="plane-field" id="planeField"><canvas id="planeCanvas" aria-label="màn chơi bắn máy bay"></canvas>' +
      // ô gõ tàng hình: chỉ làm mồi bàn phím ảo; chữ đang gõ đã vẽ trên canvas
      '<input id="planeInput" class="game-type-sink" type="text" autocapitalize="off" autocorrect="off" autocomplete="off" ' +
      'spellcheck="false" enterkeyhint="next" aria-label="gõ từ tiếng Anh">' +
      '<div class="plane-overlay" id="planeOverlay"><p id="planeMsg">Mục tiêu mang <b>nghĩa tiếng Việt</b>. Gõ từ tiếng Anh: ' +
      'muốn hạ mục tiêu nào thì gõ từ của nó, mỗi chữ đúng là 1 phát đạn.<br>Enter xoá chữ đang gõ. Để mục tiêu chạm tàu là mất 1 ❤️.<br>' +
      '<small>Tắt bộ gõ tiếng Việt (Unikey/Telex) trước khi chơi.</small></p>' +
      '<div class="plane-diff" id="planeDiff" role="radiogroup" aria-label="cấp độ"></div>' +
      '<button class="btn-primary" id="planeGo">Bắt đầu</button></div></div></div>';
  bindGameQuit();
  const canvas = $('#planeCanvas');
  const ui = planeUi = { seq: game.seq, raf: 0, countdown: 0, last: 0, time: 0, started: false, paused: false, ending: false,
    canvas, ctx: canvas.getContext('2d'), fx: createSpaceFx(), input: $('#planeInput'), field: $('#planeField'), off: [] };
  document.documentElement.classList.add('game-lock');
  if (window.visualViewport) { listen(visualViewport, 'resize', fitPlaneGame); listen(visualViewport, 'scroll', fitPlaneGame); }
  listen(window, 'resize', fitPlaneGame);
  listen(document, 'visibilitychange', () => { if (document.hidden) pausePlanes(); });
  bindPlaneControls(ui);
  fitPlaneGame();
  choosePlaneDifficulty(cfg.planeLevel);
  syncPlaneGame();
  drawPlaneScene(ui.ctx, game.plane, ui.fx, 0);
}

function listen(target, type, fn) { target.addEventListener(type, fn); planeUi.off.push(() => target.removeEventListener(type, fn)); }

function bindPlaneControls(ui) {
  const input = ui.input;
  // nút bấm không được cướp focus của ô gõ (desktop), nếu không blur → tự tạm dừng
  ['#planePause', '#gQuit'].forEach(s => { $(s).onmousedown = e => e.preventDefault(); });
  $('#planePause').onclick = () => pausePlanes();     // chỉ dừng; chơi tiếp bằng nút trên lớp phủ (tránh blur + click đảo 2 lần)
  $('#planeGo').onclick = () => {
    input.focus();                                     // phải đồng bộ trong lần chạm, iOS mới bật bàn phím
    if (ui.started) return resumePlanes();
    if (ui.countdown) return;
    $('#planeDiff').hidden = true;             // đang chơi không đổi cấp
    $('#planeGo').hidden = true;
    // chưa started trong lúc đếm: gõ chưa bắn, blur/Esc chưa tạm dừng (Esc = thoát như trước khi bắt đầu)
    ui.countdown = readyCountdown(n => { $('#planeMsg').innerHTML = readyNumHtml(n); }, () => {
      if (planeUi !== ui) return;
      ui.countdown = 0; ui.started = true;
      $('#planeGo').hidden = false;
      $('#planeOverlay').hidden = true;
      ui.raf = requestAnimationFrame(planeFrame);
      input.focus();
      if (document.activeElement !== input) pausePlanes();   // lỡ bấm ra ngoài lúc đếm: dừng chờ, đừng để máy bay lao tới
    });
  };
  ui.field.onmousedown = e => { if (!e.target.closest('button')) e.preventDefault(); };
  ui.field.onclick = e => { if (!e.target.closest('button') && ui.started && !ui.paused) input.focus(); };
  input.onblur = () => pausePlanes();
  // bộ gõ tiếng Việt (Telex/IME) đang soạn dở: chưa bắn, và không xoá ô gõ giữa chừng (làm hỏng trạng thái IME)
  input.oninput = e => { if (!e.isComposing) flushTyped(ui); };
  input.addEventListener('compositionend', () => flushTyped(ui));
  input.onkeydown = e => {
    if (e.key === 'Escape') { e.preventDefault(); return togglePlanePause(); }   // phím toàn cục bỏ qua ô input
    // chỉ Enter nhả khoá: Unikey/EVKey (Telex) gửi Backspace để thay dấu, bắt Backspace sẽ nhả khoá giữa chừng
    if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); pressEnter(game.plane, Math.random, []).forEach(e => spaceFxEvent(planeUi.fx, e)); }
  };
}

/* Chọn cấp trước ván: dựng lại state (chưa có mục tiêu nào), ghi nhớ cho lần sau, đổi khoá kỷ lục */
function choosePlaneDifficulty(id) {
  const d = planeDifficulty(id), ui = planeUi;
  cfg.planeLevel = d.id; save(K_CFG, cfg);
  game.plane = createPlaneState(game.words, ui.w, ui.h, d.id);
  game.scoreKey = planeScoreKey(d.id); game.levelLabel = d.label;
  $('#planeDiff').innerHTML = PLANE_DIFFICULTY_IDS.map(k => {
    const x = PLANE_DIFFICULTIES[k], best = (gameScore[planeScoreKey(k)] || {}).best;
    return '<button role="radio" data-diff="' + k + '" aria-checked="' + (k === d.id) + '">' + x.label +
      (best ? '<b class="mono">★ ' + best + '</b>' : '') + '</button>';
  }).join('');
  $('#planeDiff').querySelectorAll('button').forEach(b => { b.onclick = () => { choosePlaneDifficulty(b.dataset.diff); drawPlaneScene(ui.ctx, game.plane, ui.fx, 0); }; });
}

/* Mỗi ký tự trong ô gõ = 1 phát bắn; sự kiện bắn đưa sang hiệu ứng ngay để tia lửa nòng súng khớp lúc gõ */
function flushTyped(ui) {
  const v = ui.input.value;
  ui.input.value = '';
  if (!ui.started || ui.paused || !game || !game.plane) return;   // đang dừng: gõ không được bắn
  const ev = [];
  for (const ch of v) typeChar(game.plane, ch, Math.random, ev);
  ev.forEach(e => spaceFxEvent(ui.fx, e));
}

/* Khung cao bằng phần nhìn thấy (trừ bàn phím ảo). Gọi lại mỗi lần bàn phím / thanh QuickType đổi chiều cao. */
function fitPlaneGame() {
  const el = $('#planeGame'), ui = planeUi;
  if (!el || !ui) return;
  fitGameToViewport(el, ui, PLANE_MAX_DPR, (w, h, dpr) => {
    resizeSpaceFx(ui.fx, w, h, dpr);
    if (game && game.plane) { resizePlaneState(game.plane, w, h); drawPlaneScene(ui.ctx, game.plane, ui.fx, ui.time); }
  });
}

function planeFrame(t) {
  const ui = planeUi;
  if (!ui || !game || game.seq !== ui.seq || game.over) return;   // ván cũ / đã kết thúc → dừng hẳn
  ui.raf = requestAnimationFrame(planeFrame);
  const dt = ui.last ? Math.min(0.05, (t - ui.last) / 1000) : 0;
  ui.last = t; ui.time += dt;
  const st = game.plane;
  const ev = stepPlanes(st, dt, Math.random);
  ev.forEach(e => spaceFxEvent(ui.fx, e));
  if (ev.some(e => e.type === 'explode' || e.type === 'shield')) syncPlaneGame();
  stepSpaceFx(ui.fx, dt);
  drawPlaneScene(ui.ctx, st, ui.fx, ui.time);
  if (st.over && !ui.ending) {       // hiệu ứng vẫn chạy tiếp tới lúc sang màn kết thúc
    ui.ending = true;
    setTimeout(() => { if (game && game.seq === ui.seq) endGame(); }, PLANE_END_DELAY);
  }
}

/* Chép số liệu sang `game` để endGame()/flushMiss() dùng chung đọc đúng; vẽ lại HUD */
function syncPlaneGame() {
  const st = game.plane;
  Object.assign(game, { score: st.score, right: st.right, wrong: st.wrong, streak: st.streak, bestStreak: st.bestStreak, miss: st.miss.slice() });
  const hud = $('#planeGame .game-head .mono');
  if (hud) hud.textContent = '❤️'.repeat(st.lives) + '🖤'.repeat(PLANE_LIVES - st.lives) + ' · ' + Math.floor(st.score) +
    (st.streak >= 5 ? ' · ×' + comboMult(st.streak) : '');
}

function pausePlanes() {
  const ui = planeUi;
  if (!ui || !ui.started || ui.paused || ui.ending || !game || game.over) return;
  ui.paused = true;
  cancelAnimationFrame(ui.raf);     // dừng hẳn vòng lặp cho đỡ pin; resumePlanes chạy lại
  $('#planeMsg').textContent = 'Đang tạm dừng';
  $('#planeGo').textContent = 'Chơi tiếp';
  $('#planeOverlay').hidden = false;
}

function resumePlanes() {
  const ui = planeUi;
  if (!ui || !ui.paused) return;
  ui.paused = false;
  ui.last = 0;                      // khung đầu sau khi tiếp: dt = 0, không nhảy cóc
  $('#planeOverlay').hidden = true;
  ui.input.focus();
  ui.raf = requestAnimationFrame(planeFrame);
}

function togglePlanePause() { if (planeUi && planeUi.paused) resumePlanes(); else pausePlanes(); }

/* Gọi qua game.stop từ stopGameTimer(): thoát, đổi tab, kết thúc ván đều đi qua đây */
function stopPlaneLoop() {
  const ui = planeUi;
  if (!ui) return;
  if (game && game.plane) syncPlaneGame();   // từ sai 3 chữ nằm ở st.miss: phải chép sang game trước khi flushMiss
  cancelAnimationFrame(ui.raf);
  clearInterval(ui.countdown);
  ui.input.onblur = null;          // #app sắp bị vẽ lại: blur lúc đó không được bật lớp tạm dừng
  ui.off.forEach(f => f());
  document.documentElement.classList.remove('game-lock');
  planeUi = null;
}
