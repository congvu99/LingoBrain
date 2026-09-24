/* Game Pháp Sư Lexoria — khung trận: DOM, ô gõ ẩn + phím, vòng rAF, tạm dừng. Nạp sau các file boss-game-* khác,
   trước word-game-ui.js. MỖI TRẬN MỘT `game` mới (seq riêng): callback/timeout của trận cũ tự nhận ra đã lỗi thời.
   Không gọi endGame (Pháp sư không có gameScore); kết trận ở boss-game-result-ui.js. Không ghi srs.
   Thời gian: logic nhận mốc performance.now() (rAF và phím cùng một đồng hồ). */

const BOSS_MAX_DPR = 2, BOSS_FPS_LOW = 45, BOSS_FPS_OK = 57, BOSS_PICK_MAX = 120, BOSS_END_DELAY = 700;
const BOSS_SHOW_FPS = typeof location !== 'undefined' && /[?&]fps\b/.test(location.search);

let bossUi = null;   // null | { seq, opts, st, xpAtStart, raf, last, time, started, paused, ending, countdown, canvas, ctx, fx, input, field, off[], ... }

/* Đề trận: nhóm theo đề trên TOÀN pool (từ đồng nghĩa ngoài phần bốc vẫn tính đúng), thứ tự theo trọng số bossWordWeight */
function bossBattleGroups() {
  const pool = gamePool(deck, srs, 'boss'), byId = new Map(), order = [];
  buildBossPool(pool).forEach(g => g.ids.forEach(id => byId.set(id, g)));
  pickGameWords(pool, srs, Math.min(pool.length, BOSS_PICK_MAX), Math.random, bossWordWeight).forEach(w => {
    const g = byId.get(w.id);
    if (g && order.indexOf(g) < 0) order.push(g);
  });
  return { groups: order, tiers: assignTiers(pool, srs) };
}

/* opts = {date, kind: 'story'|'endless'|'practice', beat, carryDmg, difficulty} (bossTodayOpts ở hub) */
function startBossBattle(opts) {
  if (game && game.stop) { const s = game.stop; game.stop = null; s(); }
  const { groups, tiers } = bossBattleGroups();
  if (!groups.length) return toast('❌ Chưa đủ từ đã học');
  game = { id: 'boss', seq: ++gameSeq, miss: [], over: false, stop: stopBossBattle };
  const mods = modifiersFor(bossProg.alloc, bossProg.element.v), mon = bossTempMonster(opts.beat);
  // buff Ôn từ: chốt cả ngày ngay khi bắt đầu trận (đánh lại/luyện phép không qua hub vẫn chốt được)
  const buff = reviewBuff(bossProg, srs, Date.now(), opts.date);
  if (buff && bossProg.buffDate !== opts.date) { bossProg.buffDate = opts.date; saveBoss(); }
  $('#app').innerHTML = '<div class="boss-game" id="bossGame">' + gameHeadHtml('') +
    '<div class="boss-prompt" id="bossPrompt" data-tier="1" aria-live="polite"><span class="boss-tier" id="bossTier"></span>' +
      '<span class="boss-prompt-text serif" id="bossPromptText"></span><span class="boss-letters mono" id="bossLetters"></span></div>' +
    '<div class="plane-field boss-field" id="bossField"><canvas id="bossCanvas" aria-label="trận đấu pháp sư"></canvas>' +
      '<div class="plane-overlay boss-overlay" id="bossOverlay"><p id="bossMsg"></p>' +
      '<button class="btn-primary" id="bossGo" hidden>Chơi tiếp</button></div></div>' +
    '<div class="plane-input-row">' +
      '<input id="bossInput" type="text" autocapitalize="off" autocorrect="off" autocomplete="off" spellcheck="false" ' +
      'enterkeyhint="go" aria-label="gõ từ tiếng Anh để niệm chú" placeholder="gõ từ tiếng Anh để niệm chú…">' +
      '<button class="btn-sm" id="bossSkip" aria-label="bỏ từ này">Bỏ</button>' +
      '<button class="btn-sm" id="bossPause" aria-label="tạm dừng">⏸</button></div></div>';
  bindGameQuit();
  const canvas = $('#bossCanvas'), now = performance.now();
  const ui = bossUi = { seq: game.seq, opts, xpAtStart: bossProg.xp, buff, raf: 0, last: 0, time: 0, started: false, paused: false,
    ending: false, countdown: 0, canvas, ctx: canvas.getContext('2d'), fx: createBossFx(), input: $('#bossInput'), field: $('#bossField'),
    off: [], monsterName: mon.name, gender: bossProg.gender.v, fps: 60, frames: 0, fpsAt: now, quality: 1, showFps: BOSS_SHOW_FPS,
    st: createBattle({ monster: mon, groups, tiers, mods, hearts: 3 + mods.maxHeartsAdd + (buff ? 1 : 0), difficulty: opts.difficulty, carryDmg: opts.carryDmg, now }) };
  pauseBattle(ui.st, now);                           // đồng hồ trùm chỉ chạy sau đếm ngược
  document.documentElement.classList.add('game-lock');
  if (window.visualViewport) { bossListen(visualViewport, 'resize', fitBossGame); bossListen(visualViewport, 'scroll', fitBossGame); }
  bossListen(window, 'resize', fitBossGame);
  bossListen(document, 'visibilitychange', () => { if (document.hidden) { pauseBoss(); persistBattle(ui); } });
  bossListen(window, 'pagehide', () => persistBattle(ui));
  bindBossControls(ui);
  fitBossGame();
  bossUiEvents(ui);                                  // đề đầu tiên (event 'next' đã có sẵn)
  ui.input.focus();                                  // đồng bộ trong lần chạm "Bắt đầu" → iOS bật bàn phím
  ui.countdown = readyCountdown(n => { $('#bossMsg').innerHTML = readyNumHtml(n); }, () => {
    if (bossUi !== ui) return;
    ui.countdown = 0; ui.started = true;
    $('#bossOverlay').hidden = true;
    resumeBattle(ui.st, performance.now());
    ui.raf = requestAnimationFrame(bossFrame);
    if (document.hidden || document.activeElement !== ui.input) pauseBoss();
  });
}

function bossListen(target, type, fn) { target.addEventListener(type, fn); bossUi.off.push(() => target.removeEventListener(type, fn)); }

function bindBossControls(ui) {
  const input = ui.input;
  // nút trong trận không được cướp focus ô gõ (desktop + iPhone), nếu không bàn phím đóng → tự tạm dừng
  ['#bossPause', '#bossSkip', '#gQuit'].forEach(s => { const b = $(s); b.onmousedown = e => e.preventDefault(); b.addEventListener('touchstart', e => e.preventDefault(), { passive: false }); });
  $('#bossPause').onclick = () => pauseBoss();
  $('#bossPause').addEventListener('touchend', () => pauseBoss());
  $('#bossSkip').onclick = () => { if (ui.started && !ui.paused) giveUp(ui.st, performance.now()); };
  $('#bossSkip').addEventListener('touchend', e => { e.preventDefault(); $('#bossSkip').onclick(); });
  $('#gQuit').addEventListener('touchend', e => { e.preventDefault(); quitGame(); });
  $('#bossGo').onclick = () => { input.focus(); resumeBoss(); };
  ui.field.onmousedown = e => { if (!e.target.closest('button')) e.preventDefault(); };
  ui.field.onclick = e => { if (!e.target.closest('button') && ui.started && !ui.paused) input.focus(); };
  input.onblur = () => pauseBoss();
  // bộ gõ tiếng Việt đang soạn dở: chưa niệm, không xoá ô giữa chừng
  input.oninput = e => { if (!e.isComposing) flushBossTyped(ui); };
  input.addEventListener('compositionend', () => flushBossTyped(ui));
  input.onkeydown = e => {   // phím toàn cục (app-shell) bỏ qua INPUT → xử lý tại đây
    if (e.key === 'Escape') { e.preventDefault(); return toggleBossPause(); }
    if (e.key === 'Enter' && !e.isComposing) {
      e.preventDefault();
      if (!ui.started || ui.paused) return;
      if (e.shiftKey) useUltimate(ui.st, performance.now()); else submitTyped(ui.st, performance.now());
    }
  };
}

/* Chỉ chữ cái đi vào logic (số, dấu, khoảng trắng bị lọc); ô gõ xoá ngay sau mỗi lần */
function flushBossTyped(ui) {
  const v = ui.input.value;
  ui.input.value = '';
  if (!ui.started || ui.paused || !game || game.seq !== ui.seq) return;
  for (const ch of v) if (/[a-z]/i.test(ch)) typeKey(ui.st, ch, performance.now());
}

function fitBossGame() {
  const el = $('#bossGame'), ui = bossUi;
  if (!el || !ui) return;
  fitGameToViewport(el, ui, BOSS_MAX_DPR, (w, h) => { layoutBoss(ui.fx, w, h); drawBossScene(ui.ctx, ui.st, ui, performance.now()); });
}

function bossFrame(t) {
  const ui = bossUi;
  if (!ui || !game || game.seq !== ui.seq || game.over) return;   // trận cũ / đã kết → dừng hẳn
  ui.raf = requestAnimationFrame(bossFrame);
  const dtMs = ui.last ? Math.min(100, t - ui.last) : 0, st = ui.st;
  ui.last = t;
  stepBattle(st, dtMs, t);
  bossUiEvents(ui);
  const dtGame = dtMs / 1000 * st.timeScale;
  ui.time += dtGame;
  stepBossFx(ui.fx, dtGame, dtMs / 1000);
  bossMeasureFps(ui, t);
  drawBossScene(ui.ctx, st, ui, t);
  if (st.phase !== 'play' && !ui.ending) {
    ui.ending = true;
    setTimeout(() => { if (game && game.seq === ui.seq && bossUi === ui) showBossResult(ui); }, BOSS_END_DELAY);
  }
}

/* FPS trượt 1s: < 45 → nửa số hạt + bỏ quầng sáng; hồi lại khi ≥ 57 */
function bossMeasureFps(ui, t) {
  ui.frames++;
  if (t - ui.fpsAt < 1000) return;
  ui.fps = ui.frames * 1000 / (t - ui.fpsAt); ui.frames = 0; ui.fpsAt = t;
  ui.quality = ui.fps < BOSS_FPS_LOW ? 0.5 : ui.fps >= BOSS_FPS_OK ? 1 : ui.quality;
  ui.fx.ps.quality = ui.quality;
}

function pauseBoss() {
  const ui = bossUi;
  if (!ui || !ui.started || ui.paused || ui.ending || !game || game.over) return;
  ui.paused = true;
  pauseBattle(ui.st, performance.now());
  cancelAnimationFrame(ui.raf);
  $('#bossMsg').textContent = 'Đang tạm dừng';
  $('#bossGo').hidden = false;
  $('#bossOverlay').hidden = false;
}

function resumeBoss() {
  const ui = bossUi;
  if (!ui || !ui.paused) return;
  ui.paused = false; ui.last = 0;
  resumeBattle(ui.st, performance.now());
  $('#bossOverlay').hidden = true;
  ui.input.focus();
  ui.raf = requestAnimationFrame(bossFrame);
}

function toggleBossPause() { if (bossUi && bossUi.paused) resumeBoss(); else pauseBoss(); }

/* Dọn vòng lặp + listener (dùng chung cho thoát giữa trận và kết trận) */
function teardownBossLoop(ui) {
  cancelAnimationFrame(ui.raf);
  clearInterval(ui.countdown);
  ui.input.onblur = null;           // #app sắp vẽ lại: blur lúc đó không được bật lớp tạm dừng
  ui.off.forEach(f => f());
  document.documentElement.classList.remove('game-lock');
  if (bossUi === ui) bossUi = null;
}

/* game.stop (← thoát, đổi tab, trận mới): chép từ sai sang game để closeGame flushMiss, lưu tiến trình, dọn */
function stopBossBattle() {
  const ui = bossUi;
  if (!ui) return;
  if (game && game.seq === ui.seq) game.miss = ui.st.miss.slice();
  persistBattle(ui);
  teardownBossLoop(ui);
}
