/* Game Pháp Sư Lexoria — màn lần đầu. Lần đầu = bossProg.gender.ts === 0 (cleanBoss trả ts=0 khi chưa từng chọn).
   Đang đăng nhập mà phiên này CHƯA có lần sync thành công/thất bại → chờ (tránh đè cây kỹ năng đã có ở máy khác);
   ngoại tuyến thì không chờ được — cho qua thẳng màn chọn. Chọn xong → xem trước chân dung → đoạn mở đầu truyện
   (Phase 4, chỉ để chỗ gọi showStoryCard) → hub. Cần js/boss-game-mage-art.js (drawMage), boss-game-hub-ui.js
   (startBossHub) nạp trước. */

let bossFirstRunWait = 0;   // interval id của màn "Đang đồng bộ…"; dọn ở stopBossHub()

function bossWaitingSync() {
  if (typeof authInfo !== 'function' || !authInfo()) return false;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
  const s = typeof syncRunState === 'function' ? syncRunState().status : 'idle';
  return s === 'idle' || s === 'syncing';
}

/* Gọi từ startBossHub() khi lần đầu; luôn trả true (đã tự vẽ màn hình) để startBossHub dừng tại đó */
function bossShowFirstRun() {
  clearInterval(bossFirstRunWait);
  if (bossWaitingSync()) {
    renderBossSyncWait();
    bossFirstRunWait = setInterval(bossFirstRunPoll, 500);
  } else {
    renderBossGenderPick('f');
  }
  return true;
}

function bossFirstRunPoll() {
  if (bossWaitingSync()) return;
  clearInterval(bossFirstRunWait);
  // sync vừa về có thể đã mang sẵn lựa chọn từ máy khác → khỏi hỏi lại, thẳng vào hub
  if (bossProg.gender.ts === 0) bossShowFirstRun(); else startBossHub();
}

function renderBossSyncWait() {
  $('#app').innerHTML = '<div class="card page boss-hub"><div class="step-label">Pháp Sư Lexoria</div>' +
    '<p class="serif">Đang đồng bộ tiến trình…</p>' +
    '<p class="small muted">Đợi máy chủ trả lại lựa chọn cũ, phòng khi bạn đã chơi ở máy khác.</p></div>';
}

function renderBossGenderPick(g) {
  $('#app').innerHTML = '<div class="card page boss-hub"><div class="step-label">Pháp Sư Lexoria</div>' +
    '<p class="serif">Chọn pháp sư của bạn</p>' +
    '<div class="boss-hub-portrait"><canvas id="bossPreview" width="140" height="170" aria-label="xem trước pháp sư"></canvas></div>' +
    '<div class="row boss-gender-pick"><button class="btn-sm" data-g="f" aria-pressed="' + (g === 'f') + '">Nữ</button>' +
    '<button class="btn-sm" data-g="m" aria-pressed="' + (g === 'm') + '">Nam</button></div>' +
    '<div class="row"><button class="btn-primary" id="bossGenderGo">Bắt đầu hành trình</button></div></div>';
  bossDrawPreview(g);
  $('.boss-gender-pick').querySelectorAll('button').forEach(b => { b.onclick = () => renderBossGenderPick(b.dataset.g); });
  $('#bossGenderGo').onclick = () => bossConfirmGender(g);
}

function bossDrawPreview(g) {
  const c = $('#bossPreview');
  if (!c) return;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);
  drawMage(ctx, c.width / 2, c.height - 10, 150, { gender: g, pose: 'idle', t: 0, element: bossProg.element.v });
}

function bossConfirmGender(g) {
  bossProg.gender = { v: g === 'm' ? 'm' : 'f', ts: Date.now() };
  saveBoss();
  // đoạn mở đầu truyện (Phase 4); chưa có thì thẳng vào hub
  if (typeof showStoryCard === 'function') showStoryCard(-1, 'intro', () => startBossHub());
  else startBossHub();
}
