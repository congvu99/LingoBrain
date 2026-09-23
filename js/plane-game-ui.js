/* Game Bắn máy bay — phần giao diện. Nạp sau js/plane-game-logic.js, trước js/word-game-ui.js.
   Dùng chung object `game`, gameHeadHtml/bindGameQuit/endGame của khung game. Không ghi srs.
   iPhone: khung bám visualViewport để bàn phím ảo không che máy bay; focus() chỉ gọi trong lần chạm
   của người dùng (iOS chỉ bật bàn phím khi đó). Dọn dẹp qua game.stop ← stopGameTimer(). */

const PLANE_BOOM_MS = 450;     // thời gian hiệu ứng nổ trước khi xoá node
const PLANE_REVEAL_MS = 1200;  // máy bay lọt: giữ đáp án đúng trên màn để kịp đọc
const PLANE_END_DELAY = 900;   // hết mạng: để thấy chiếc cuối rơi rồi mới sang màn kết thúc

let planeUi = null;  // null | { seq, raf, last, started, paused, w, h, nodes: Map<uid,{el,hw,h,px,py}>, input, field, off[] }

function startPlaneGame() {
  game.plane = createPlaneState(game.words);
  game.stop = stopPlaneLoop;
  $('#app').innerHTML = '<div class="plane-game" id="planeGame">' + gameHeadHtml('') +
    '<div class="plane-field" id="planeField">' +
      '<div class="plane-overlay" id="planeOverlay"><p id="planeMsg">Gõ <b>từ tiếng Anh</b> có nghĩa ghi trên máy bay để bắn rụng.<br>' +
      'Để máy bay chạm đất là mất 1 ❤️ — hết 3 ❤️ thì thua.</p>' +
      '<button class="btn-primary" id="planeGo">Bắt đầu</button></div></div>' +
    '<div class="plane-input-row">' +
      '<input id="planeInput" type="text" autocapitalize="off" autocorrect="off" autocomplete="off" spellcheck="false" ' +
      'enterkeyhint="done" aria-label="gõ từ tiếng Anh" placeholder="gõ từ tiếng Anh…">' +
      '<button class="btn-sm" id="planeClear" aria-label="xoá chữ đã gõ">✕</button>' +
      '<button class="btn-sm" id="planePause" aria-label="tạm dừng">⏸</button></div></div>';
  bindGameQuit();
  const ui = planeUi = { seq: game.seq, raf: 0, last: 0, started: false, paused: false, w: 0, h: 0,
    nodes: new Map(), input: $('#planeInput'), field: $('#planeField'), off: [] };
  document.documentElement.classList.add('game-lock');
  if (window.visualViewport) { listen(visualViewport, 'resize', fitPlaneGame); listen(visualViewport, 'scroll', fitPlaneGame); }
  listen(window, 'resize', fitPlaneGame);
  listen(document, 'visibilitychange', () => { if (document.hidden) pausePlanes(); });
  bindPlaneControls(ui);
  fitPlaneGame();
  syncPlaneGame();
}

function listen(target, type, fn) { target.addEventListener(type, fn); planeUi.off.push(() => target.removeEventListener(type, fn)); }

function bindPlaneControls(ui) {
  const input = ui.input;
  // nút bấm không được cướp focus của ô gõ (desktop), nếu không blur → tự tạm dừng
  ['#planeClear', '#planePause', '#gQuit'].forEach(s => { $(s).onmousedown = e => e.preventDefault(); });
  $('#planeClear').onclick = () => { input.value = ''; if (ui.started && !ui.paused) input.focus(); };
  $('#planePause').onclick = () => pausePlanes();     // chỉ dừng; chơi tiếp bằng nút trên lớp phủ (tránh blur + click đảo 2 lần)
  $('#planeGo').onclick = () => {
    input.focus();                                     // phải đồng bộ trong lần chạm, iOS mới bật bàn phím
    if (ui.started) return resumePlanes();
    ui.started = true;
    $('#planeOverlay').hidden = true;
    ui.raf = requestAnimationFrame(planeFrame);
  };
  ui.field.onmousedown = e => { if (!e.target.closest('button')) e.preventDefault(); };
  ui.field.onclick = e => { if (!e.target.closest('button') && ui.started && !ui.paused) input.focus(); };
  input.onblur = () => pausePlanes();
  // bộ gõ tiếng Việt (Telex/IME) đang soạn dở: chưa so, và không xoá ô gõ giữa chừng (làm hỏng trạng thái IME)
  input.oninput = e => { if (!e.isComposing) shoot(ui, false); };
  input.addEventListener('compositionend', () => shoot(ui, false));
  input.onkeydown = e => {
    if (e.key === 'Escape') { e.preventDefault(); return togglePlanePause(); }   // phím toàn cục bỏ qua ô input
    if (e.key !== 'Enter' || e.isComposing) return;
    e.preventDefault();
    if (shoot(ui, true) || !input.value.trim()) return;
    input.classList.remove('plane-miss'); void input.offsetWidth; input.classList.add('plane-miss');
    input.value = '';
  };
}

/* Bắn theo chữ đang gõ. force = Enter: bắn cả khi chữ còn là tiền tố của từ khác đang bay. */
function shoot(ui, force) {
  if (!ui.started || ui.paused) return false;        // đang dừng: gõ không được bắn (lộ nhãn sau lớp phủ)
  const hit = tryShoot(game.plane, ui.input.value, force);
  if (!hit) return false;
  ui.input.value = '';
  shootFx(hit);
  syncPlaneGame();
  return true;
}

/* Khung cao bằng phần nhìn thấy (trừ bàn phím ảo). Gọi lại mỗi lần bàn phím / thanh QuickType đổi chiều cao. */
function fitPlaneGame() {
  const el = $('#planeGame');
  if (!el || !planeUi) return;
  const vv = window.visualViewport;
  el.style.top = (vv ? vv.offsetTop : 0) + 'px';
  el.style.height = (vv ? vv.height : window.innerHeight) + 'px';
  planeUi.field.classList.toggle('compact', planeUi.field.clientHeight < 360);   // bàn phím bật: máy bay nhỏ lại cho đỡ chồng
  planeUi.w = planeUi.field.clientWidth;
  planeUi.h = planeUi.field.clientHeight;
  planeUi.nodes.forEach(n => { n.hw = n.el.offsetWidth / 2; n.h = n.el.offsetHeight; });   // cỡ đổi theo compact
}

function planeFrame(t) {
  const ui = planeUi;
  if (!ui || !game || game.seq !== ui.seq || game.over) return;   // ván cũ / đã kết thúc → dừng hẳn
  ui.raf = requestAnimationFrame(planeFrame);
  const dt = ui.last ? (t - ui.last) / 1000 : 0;
  ui.last = t;
  const st = game.plane;
  if (ui.paused || st.over) return;
  const ev = stepPlanes(st, dt, Math.random);
  ev.landed.forEach(landFx);
  if (ev.landed.length) syncPlaneGame();
  drawPlanes();
  if (st.over) setTimeout(() => { if (game && game.seq === ui.seq) endGame(); }, PLANE_END_DELAY);
}

function addPlaneNode(p) {
  const el = document.createElement('div');
  el.className = 'plane';
  el.innerHTML = '<span class="plane-icon" aria-hidden="true">✈️</span><span class="plane-label">' + esc(p.label) + '</span>';
  planeUi.field.appendChild(el);
  const n = { el, hw: el.offsetWidth / 2, h: el.offsetHeight, px: 0, py: 0 };
  planeUi.nodes.set(p.uid, n);
  return n;
}

function drawPlanes() {
  const ui = planeUi;
  for (const p of game.plane.planes) {
    const n = ui.nodes.get(p.uid) || addPlaneNode(p);
    n.px = Math.min(Math.max(p.x * ui.w, n.hw), ui.w - n.hw);   // nhãn không tràn mép trái/phải
    n.py = p.y * Math.max(0, ui.h - n.h);                        // y=1 là đáy máy bay chạm mặt đất
    n.el.style.transform = 'translate3d(' + (n.px - n.hw) + 'px,' + n.py + 'px,0)';
  }
}

/* Máy bay rời màn (bị hạ / chạm đất): đổi nhãn thành từ tiếng Anh để người chơi đọc lại, rồi xoá node */
function retirePlane(p, cls, ms) {
  const n = planeUi.nodes.get(p.uid);
  if (!n) return null;
  planeUi.nodes.delete(p.uid);
  n.el.classList.add(cls);
  n.el.querySelector('.plane-label').textContent = p.word.word;
  setTimeout(() => n.el.remove(), ms);
  return n;
}

function shootFx(p) {
  const n = retirePlane(p, 'boom', PLANE_BOOM_MS);
  if (!n) return;
  n.el.querySelector('.plane-icon').textContent = '💥';
  // tia từ giữa mặt đất bắn lên tâm máy bay
  const ui = planeUi, tx = n.px - ui.w / 2, ty = ui.h - (n.py + n.h / 2);
  const laser = document.createElement('div');
  laser.className = 'laser';
  laser.style.height = Math.hypot(tx, ty) + 'px';
  laser.style.transform = 'rotate(' + Math.atan2(tx, ty) + 'rad)';
  ui.field.appendChild(laser);
  setTimeout(() => laser.remove(), 160);
}

function landFx(p) {
  if (!retirePlane(p, 'landed', PLANE_REVEAL_MS)) return;
  if (navigator.vibrate) navigator.vibrate(60);   // Android; iOS Safari không hỗ trợ, bỏ qua êm
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
  if (!ui || !ui.started || ui.paused || !game || game.over || game.plane.over) return;
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
  ui.last = 0;                      // khung đầu sau khi tiếp: dt = 0, máy bay không nhảy
  $('#planeOverlay').hidden = true;
  ui.input.focus();
  ui.raf = requestAnimationFrame(planeFrame);
}

function togglePlanePause() { if (planeUi && planeUi.paused) resumePlanes(); else pausePlanes(); }

/* Gọi qua game.stop từ stopGameTimer(): thoát, đổi tab, kết thúc ván đều đi qua đây */
function stopPlaneLoop() {
  const ui = planeUi;
  if (!ui) return;
  cancelAnimationFrame(ui.raf);
  ui.input.onblur = null;          // #app sắp bị vẽ lại: blur lúc đó không được bật lớp tạm dừng
  ui.off.forEach(f => f());
  document.documentElement.classList.remove('game-lock');
  planeUi = null;
}
