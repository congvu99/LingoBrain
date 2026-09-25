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
  const { groups, tiers } = bossBattleGroups();
  if (!groups.length) return toast('❌ Chưa đủ từ đã học');   // kiểm trước: sảnh đang mở vẫn giữ nguyên
  if (game && game.stop) { const s = game.stop; game.stop = null; s(); flushMiss(); }   // trận/sảnh cũ: dọn + chốt từ sai trước khi thay game
  game = { id: 'boss', seq: ++gameSeq, miss: [], over: false, stop: stopBossBattle };
  const level = levelFromXp(bossProg.xp);
  const { mods, form, formData } = bossBattleMods(bossProg.alloc, bossProg.element.v, bossProg.evo, level);   // dạng tiến hoá đang dùng
  const picked = bossPickMonster(opts.beat, bossProg.wins);
  const mon = Object.assign({}, picked.monster, { hp: bossMonsterHp(picked.monster) }), region = picked.region;
  // buff Ôn từ: chốt cả ngày ngay khi bắt đầu trận (đánh lại/luyện phép không qua hub vẫn chốt được)
  const buff = reviewBuff(bossProg, srs, Date.now(), opts.date);
  if (buff && bossProg.buffDate !== opts.date) { bossProg.buffDate = opts.date; saveBoss(); }
  $('#app').innerHTML = '<div class="boss-game" id="bossGame">' +
    gameHeadHtml('', '<button class="btn-sm btn-ghost" id="bossPause" aria-label="tạm dừng">⏸</button>') +
    '<div class="boss-prompt" id="bossPrompt" data-tier="1" aria-live="polite"><span class="boss-tier" id="bossTier"></span>' +
      '<span class="boss-prompt-text serif" id="bossPromptText"></span><span class="boss-letters mono" id="bossLetters"></span>' +
      '<button class="btn-sm" id="bossSkip" aria-label="bỏ từ này">Bỏ</button></div>' +
    '<div class="plane-field boss-field" id="bossField"><canvas id="bossCanvas" aria-label="trận đấu pháp sư"></canvas>' +
      // ô gõ tàng hình: chỉ làm mồi bàn phím ảo; chữ đang gõ hiện ở #bossLetters
      '<input id="bossInput" class="game-type-sink" type="text" autocapitalize="off" autocorrect="off" autocomplete="off" ' +
      'spellcheck="false" enterkeyhint="go" aria-label="gõ từ tiếng Anh để niệm chú">' +
      '<button class="btn-sm boss-ult boss-ult-float" id="bossUlt" aria-label="dùng tuyệt kỹ (Shift+Enter)" hidden>✨ Tuyệt kỹ</button>' +
      '<div class="plane-overlay boss-overlay" id="bossOverlay"><p id="bossMsg"></p>' +
      '<button class="btn-primary" id="bossGo" hidden>Chơi tiếp</button></div></div></div>';
  bindGameQuit();
  const canvas = $('#bossCanvas'), now = performance.now();
  const ui = bossUi = { seq: game.seq, opts, xpAtStart: bossProg.xp, buff, raf: 0, last: 0, time: 0, started: false, paused: false,
    ending: false, countdown: 0, canvas, ctx: canvas.getContext('2d'), fx: createBossFx(), input: $('#bossInput'), field: $('#bossField'),
    off: [], monsterName: mon.name, monster: mon, region, gender: bossProg.gender.v, fps: 60, frames: 0, fpsAt: now, quality: 1, showFps: BOSS_SHOW_FPS,
    st: createBattle({ monster: mon, groups, tiers, mods, hearts: 3 + mods.maxHeartsAdd + (buff ? 1 : 0), difficulty: opts.difficulty,
      carryDmg: opts.carryDmg, now, level,   // chiêu tự phát mở dần theo cấp
      skills: { [mods.element]: bossSkillsFor(mods.element, formData, BOSS_SKILLS[mods.element]) } }) };   // chiêu ghi đè theo dạng tiến hoá
  ui.st.evoUltBonus = bossEvoUltBonus(formData);      // dạng cấp 16 (+0.25) cộng vào k chuỗi niệm (boss-game-combo-chain.js)
  ui.st.mageSprite = bossFormSprite(mods.element, form); ui.st.mageFace = bossFormFace(mods.element, form);   // '' → rơi về sprite/faceset giới tính (dạng gốc)
  pauseBattle(ui.st, now);                           // đồng hồ trùm chỉ chạy sau đếm ngược
  loadBossSprites();                                 // đếm ngược 3-2-1 che thời gian nạp; lỗi nạp → bỏ qua vẽ quái/pháp sư lượt đó (ảnh đã precache SW, hiếm khi xảy ra)
  document.documentElement.classList.add('game-lock');
  if (window.visualViewport) { bossListen(visualViewport, 'resize', fitBossGame); bossListen(visualViewport, 'scroll', fitBossGame); }
  bossListen(window, 'resize', fitBossGame);
  // ẩn app: iOS có thể huỷ PWA ở nền, pwa-register có thể tải lại trang → lưu tiến trình + từ sai ngay
  bossListen(document, 'visibilitychange', () => { if (document.hidden) { pauseBoss(); persistBattle(ui); bossSaveMiss(ui); } });
  bossListen(window, 'pagehide', () => { persistBattle(ui); bossSaveMiss(ui); });
  bindBossControls(ui);
  fitBossGame();
  bossUiEvents(ui);                                  // đề đầu tiên (event 'next' đã có sẵn)
  ui.input.focus();                                  // đồng bộ trong lần chạm "Bắt đầu" → iOS bật bàn phím
  ui.countdown = readyCountdown(n => { $('#bossMsg').innerHTML = readyNumHtml(n); }, () => {
    if (bossUi !== ui) return;
    ui.countdown = 0; ui.started = true; ui.frames = 0; ui.fpsAt = performance.now();
    $('#bossOverlay').hidden = true;
    resumeBattle(ui.st, performance.now());
    ui.raf = requestAnimationFrame(bossFrame);
    if (document.hidden || document.activeElement !== ui.input) pauseBoss();
  });
}

/* Từ sai của trận dở vào gameMiss ngay (addMiss khử trùng → gọi nhiều lần vẫn đúng; flushMiss lúc kết cũng vậy) */
function bossSaveMiss(ui) {
  if (!ui.st.miss.length) return;
  ui.st.miss.forEach(id => { gameMiss = addMiss(gameMiss, id); });
  save(K_GAMEMISS, gameMiss);
}

function bossListen(target, type, fn) { target.addEventListener(type, fn); bossUi.off.push(() => target.removeEventListener(type, fn)); }

function bindBossControls(ui) {
  const input = ui.input;
  // nút trong trận không được cướp focus ô gõ (desktop + iPhone), nếu không bàn phím đóng → tự tạm dừng
  ['#bossPause', '#bossSkip', '#bossUlt', '#gQuit'].forEach(s => { const b = $(s); b.onmousedown = e => e.preventDefault(); b.addEventListener('touchstart', e => e.preventDefault(), { passive: false }); });
  $('#bossPause').onclick = () => pauseBoss();
  $('#bossPause').addEventListener('touchend', () => pauseBoss());
  $('#bossSkip').onclick = () => { if (ui.started && !ui.paused) giveUp(ui.st, performance.now()); };
  $('#bossSkip').addEventListener('touchend', e => { e.preventDefault(); $('#bossSkip').onclick(); });
  $('#bossUlt').onclick = () => { if (ui.started && !ui.paused) useUltimate(ui.st, performance.now()); };
  $('#bossUlt').addEventListener('touchend', e => { e.preventDefault(); $('#bossUlt').onclick(); });
  $('#gQuit').addEventListener('touchend', e => { e.preventDefault(); quitGame(); });
  $('#bossGo').onclick = () => { input.focus(); resumeBoss(); };
  ui.field.onmousedown = e => { if (!e.target.closest('button')) e.preventDefault(); };
  ui.field.onclick = e => { if (!e.target.closest('button') && ui.started && !ui.paused) input.focus(); };
  input.onblur = () => pauseBoss();
  // bộ gõ tiếng Việt đang soạn dở: chưa niệm, không xoá ô giữa chừng
  input.oninput = e => { if (!e.isComposing) flushBossTyped(ui); };
  input.addEventListener('compositionend', () => flushBossTyped(ui));
  input.onkeydown = e => {   // phím toàn cục (app-shell) bỏ qua INPUT → xử lý tại đây
    if (e.key === 'Escape') { e.preventDefault(); return ui.started ? toggleBossPause() : quitGame(); }   // đang đếm ngược: Esc = thoát như Bắn máy bay
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
  fitGameToViewport(el, ui, BOSS_MAX_DPR, (w, h) => { layoutBoss(ui.fx, w, h, ui); drawBossScene(ui.ctx, ui.st, ui, performance.now()); });
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
  const ultBtn = $('#bossUlt');   // hiện khi thanh tuyệt kỹ đầy và trường phái có tuyệt kỹ (mọi trường phái có sẵn từ đầu)
  if (ultBtn) ultBtn.hidden = !(st.mods.ultimate && st.ult >= BOSS_TUNING.ultMax);
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
  ui.paused = false; ui.last = 0; ui.frames = 0; ui.fpsAt = performance.now();   // khung dừng không tính vào FPS
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
