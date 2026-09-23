/* Bộ từ chỉ lấy từ words.json (không cho người dùng nạp/sửa/xoá từ).
   File này: tải backup, danh sách từ chỉ xem, khôi phục tiến độ từ backup. Chỉ chạy trong trình duyệt. */

function download(name, obj) {
  const b = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(b); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function renderList() {
  $('#cntWords').textContent = deck.words.length;
  const now = Date.now();
  $('#wordList').innerHTML = deck.words.map(w => {
    const r = srs[w.id];
    const st = !r || r.state === 'new' ? '<span class="muted">chưa học</span>'
      : r.state !== 'review' ? '<span class="ok">đang học</span>'
      : r.due <= now ? '<span class="ok">đến hạn</span>'
      : 'ôn ' + new Date(r.due).toLocaleDateString('vi-VN');
    return '<div class="it"><b>' + esc(w.word) + '</b>' +
      '<span class="muted ellipsis">' + esc(w.meaning) + '</span>' +
      '<span class="small">' + st + '</span></div>';
  }).join('') || '<p class="muted small">Chưa tải được bộ từ.</p>';
}
/* Khôi phục backup: chỉ tiến độ, cài đặt, giáo án, game. Trường `deck` của backup cũ bị bỏ qua.
   Chấp nhận cả srs v1 (box) lẫn v2 (ef). */
function restoreBackup(j) {
  // kiểm trước khi gán: file lạ mà gán dở dang thì RAM lệch localStorage, lần lưu kế tiếp ghi đè tiến độ thật
  if (!j || !j.srs || typeof j.srs !== 'object') return toast('❌ Không phải file backup');
  srs = migrateV1(j.srs); pruneSrs(deck, srs); Object.assign(cfg, j.cfg || {});
  if (j.plan) plan = j.plan;
  if (j.day) day = j.day;
  // backup bản cũ không có 2 trường này → về rỗng
  gameScore = j.gameScore || {};
  gameMiss = (j.gameMiss || []).filter(id => deck.words.some(w => w.id === id));
  save(K_SRS, srs); save(K_CFG, cfg); save(K_PLAN, plan); save(K_DAY, day);
  save(K_GAMESCORE, gameScore); save(K_GAMEMISS, gameMiss);
  $('#setNew').value = cfg.newPerDay; $('#setMax').value = cfg.maxSession;
  restartSession(); renderList(); renderPlanEdit(); toast('✅ Đã khôi phục');
}
