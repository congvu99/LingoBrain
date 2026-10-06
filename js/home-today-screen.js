/* Tab Hôm nay: lời chào, chuỗi ngày, thẻ "Phiên hôm nay" và gợi ý sau khi xong; tab Tiến bộ.
   Mọi con số "hôm nay" lấy từ hàng đợi thật (liveQueueIds ở js/app-shell.js + queueBreakdown) → badge, nút,
   thanh phiên luôn khớp số thẻ sẽ phát. Thói quen (giáo án) vẽ ở js/daily-plan.js renderPlan. */

let habitsOpen = false;   // danh sách thói quen: gập (chỉ việc tiếp theo) / mở hết

const ICON_FLAME = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z"/></svg>';
const ICON_CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg>';
const ICON_BOLT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>';

function greetingFor(h) { return h < 11 ? 'Chào buổi sáng' : h < 14 ? 'Chào buổi trưa' : h < 18 ? 'Chào buổi chiều' : 'Chào buổi tối'; }

/* Chuỗi ngày: một ngày được tính khi có chấm ít nhất 1 thẻ (suy từ hist, đã đồng bộ đa máy) hoặc tích đủ
   thói quen như trước. Không thêm trường mới vào eng.day.v1 → không đụng schema đồng bộ / backup. */
function dayRange(key) { const [y, m, d] = key.split('-').map(Number); const from = new Date(y, m - 1, d).getTime(); return [from, from + DAY]; }
function studiedOn(key) { const [a, b] = dayRange(key); return gradesBetween(srs, a, b).count > 0; }
function planFullToday() { return plan.length > 0 && plan.every(t => day.done[t.id]); }
// day.streak = số ngày liên tiếp đã đủ tính tới hôm qua (rollDay cộng lúc sang ngày) → hôm nay đủ thì hiện +1 ngay
function streakNow() { return (day.streak || 0) + (studiedOn(day.date) || planFullToday() ? 1 : 0); }

function renderHome() {
  const now = new Date();
  $('#homeTitle').textContent = greetingFor(now.getHours());
  $('#homeDate').textContent = now.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' });
  const st = streakNow(), el = $('#pStreak');
  el.hidden = !st;
  el.innerHTML = ICON_FLAME + '<b>' + st + '</b> ngày';
  el.setAttribute('aria-label', 'Chuỗi ' + st + ' ngày học liên tiếp');
  renderSessionCard();
}

function renderSessionCard() {
  const box = $('#sessionCard'), extra = $('#homeExtra');
  extra.innerHTML = '';
  probeDialogue();   // hỏi server bật/tắt hội thoại AI (nhớ 10 phút); đổi trạng thái thì tự vẽ lại
  if (!deck.words.length) {
    box.innerHTML = '<div class="card empty"><h2>Chưa tải được bộ từ</h2><p class="muted">Kiểm tra kết nối mạng rồi thử lại.</p>' +
      '<button class="btn-primary" id="btnRetryDeck">Thử lại</button></div>';
    $('#btnRetryDeck').onclick = () => location.reload();
    return;
  }
  const b = queueBreakdown(liveQueueIds(), srs);
  if (b.total) {
    const started = session.done > 0, total = session.done + b.total, pct = Math.round(session.done / total * 100);
    box.innerHTML = '<div class="session-card">' +
      '<p class="eyebrow">Phiên hôm nay</p>' +
      '<div class="session-big"><b>' + b.total + '</b> thẻ <span>· ~' + b.minutes + ' phút</span></div>' +
      '<div class="session-split">' +
        (b.reviews ? '<span><i class="sw sw-review"></i>' + b.reviews + ' ôn lại</span>' : '') +
        (b.fresh ? '<span><i class="sw sw-new"></i>' + b.fresh + ' từ mới</span>' : '') + '</div>' +
      (started ? '<div class="session-bar" role="progressbar" aria-label="Tiến độ phiên" aria-valuemin="0" aria-valuemax="' + total + '" aria-valuenow="' + session.done + '"><i style="width:' + pct + '%"></i></div>' : '') +
      '<button class="session-cta" id="btnStart">' + (started ? 'Tiếp tục · ' + session.done + '/' + total : 'Bắt đầu') + '</button></div>';
    $('#btnStart').onclick = startReview;
    renderDialogueSuggest(extra, '');
    return;
  }
  // hết thẻ trong hàng đợi: tổng kết hôm nay + lượt kế + lối học thêm
  const now = Date.now(), t = today(), g = gradesBetween(srs, t, t + DAY);
  const nNew = Math.min(deckSummary(deck, srs, now).fresh, cfg.newPerDay);
  const tomorrow = computeStats(deck, srs, now).forecast[1];
  box.innerHTML = '<div class="session-card done">' +
    '<p class="eyebrow">Phiên hôm nay</p>' +
    '<div class="session-big done-title">' + ICON_CHECK + (g.count ? 'Xong rồi' : 'Không có thẻ đến hạn') + '</div>' +
    '<div class="session-split">' +
      (g.count ? '<span>' + g.count + ' lượt chấm · nhớ ' + Math.round(g.rate * 100) + '%</span>' : '') +
      '<span>Mai: ' + tomorrow + ' thẻ</span></div>' +
    (nNew ? '<button class="session-cta alt" id="btnMoreNew">Học thêm ' + nNew + ' từ mới</button>' : '') + '</div>';
  if (nNew) $('#btnMoreNew').onclick = () => { restartSession(); startReview(); };
  // xong phiên → gợi ý 1 game làm phần thưởng (không bao giờ đứng trước phiên ôn)
  const game = g.count && gameAvailability(deck, srs).sprint.ok
    ? '<button class="card suggest" id="btnSuggestGame"><span class="suggest-ic">' + ICON_BOLT + '</span>' +
      '<span class="suggest-t"><b>Luyện thêm: Chạy 60 giây</b><span>Phản xạ nhìn từ ra nghĩa · không ảnh hưởng lịch ôn</span></span><span aria-hidden="true">›</span></button>'
    : '';
  renderDialogueSuggest(extra, game);   // gán #homeExtra 1 lần, không đè nhau
  if (game) $('#btnSuggestGame').onclick = () => startGame('sprint');
}

// gợi ý hội thoại AI: khi server bật + hôm nay đã chấm ≥1 thẻ (đang ôn dở hay đã xong đều hiện); after = HTML gợi ý khác
function renderDialogueSuggest(extra, after) {
  const t = today(), n = gradesBetween(srs, t, t + DAY).count;
  const on = dialogueEnabledCached() && n > 0;
  extra.innerHTML = (on ? '<button class="card suggest" id="btnDialogue"><span class="suggest-ic" aria-hidden="true">💬</span>' +
    '<span class="suggest-t"><b>Luyện hội thoại hôm nay</b><span>Nhập vai 1 tình huống đời sống với từ vừa ôn</span></span><span aria-hidden="true">›</span></button>' : '') + after;
  if (on) $('#btnDialogue').onclick = () => openDialogue();
}

/* Tab Tiến bộ: số liệu + thư viện từ (thư viện chỉ vẽ khi mở — ~5000 dòng) */
function renderProgress() {
  const s = deckSummary(deck, srs, Date.now());
  $('#progSub').textContent = deck.words.length + ' mục trong bộ từ';
  $('#libCount').textContent = '· ' + (s.learn + s.mature) + ' đã học, ' + s.fresh + ' chưa học';
  renderStats(deck, srs, Date.now(), { streak: streakNow(), learn: s.learn, mature: s.mature, maxSession: cfg.maxSession }, id => {
    // ôn ngay 1 từ: lên đầu phiên, thẻ đang làm dở (nếu có) xếp ngay sau thay vì bị bỏ
    queue = [id].concat(cur && cur.id !== id ? [cur.id] : [], queue.filter(x => x !== id));
    cur = null;
    startReview();
  });
  if ($('#libBox').open) renderList();
}
