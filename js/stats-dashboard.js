/* Thống kê tiến bộ: tỉ lệ nhớ, dự báo tải ôn, từ hay quên, heatmap.
   computeStats() thuần (test được); renderStats() chỉ chạy trong trình duyệt. */

const STATS_DAY = 86400000;
function dayStart(t) { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); }

function computeStats(deck, srs, now) {
  const today = dayStart(now);
  const ret = { 7: { pass: 0, fail: 0 }, 30: { pass: 0, fail: 0 } };
  const forecast = [0, 0, 0, 0, 0, 0, 0];
  const heat = Array.from({ length: 30 }, (_, i) => ({ day: today - (29 - i) * STATS_DAY, count: 0 }));
  const hardest = [];
  let total = 0;
  for (const w of deck.words) {
    const r = srs[w.id];
    if (!r || r.state === 'new') continue;
    total++;
    for (const h of (r.hist || [])) {
      const age = now - h.t;
      if (age <= 7 * STATS_DAY) ret[7][h.g === 0 ? 'fail' : 'pass']++;
      if (age <= 30 * STATS_DAY) ret[30][h.g === 0 ? 'fail' : 'pass']++;
      const idx = 29 - Math.floor((today - dayStart(h.t)) / STATS_DAY);
      if (idx >= 0 && idx < 30) heat[idx].count++;
    }
    const dueDay = Math.max(0, Math.floor((dayStart(r.due) - today) / STATS_DAY));
    if (r.state !== 'review') forecast[0]++;
    else if (dueDay < 7) forecast[dueDay]++;
    hardest.push({ id: w.id, word: w.word, lapses: r.lapses || 0, ef: r.ef });
  }
  hardest.sort((a, b) => (b.lapses - a.lapses) || (a.ef - b.ef));
  const rate = o => ({ pass: o.pass, fail: o.fail, rate: (o.pass + o.fail) ? o.pass / (o.pass + o.fail) : null });
  return { total, retention7: rate(ret[7]), retention30: rate(ret[30]), forecast, hardest: hardest.slice(0, 5), heatmap: heat };
}

/* Số lượt chấm trong [from, to) — "hôm nay đã ôn bao nhiêu, nhớ bao nhiêu" và ngày có học (tính chuỗi ngày).
   Suy từ hist (đã đồng bộ đa máy) nên không cần thêm trường mới vào dữ liệu ngày. */
function gradesBetween(srs, from, to) {
  let pass = 0, fail = 0;
  for (const id in srs) for (const h of (srs[id].hist || [])) if (h.t >= from && h.t < to) h.g === 0 ? fail++ : pass++;
  return { count: pass + fail, pass, fail, rate: pass + fail ? pass / (pass + fail) : null };
}

/* Tab Tiến bộ. kpi = { streak, learn, mature, maxSession } do nơi gọi đưa vào; onPick(id) → mở phiên ôn đúng từ đó */
function renderStats(deck, srs, now, kpi, onPick) {
  const box = document.getElementById('statsBox');
  if (!box) return;
  const s = computeStats(deck, srs, now);
  if (!s.total) {
    box.innerHTML = '<div class="card empty"><h2>Chưa có số liệu</h2><p class="muted">Học xong vài từ đầu tiên là có biểu đồ ở đây.</p></div>';
    return;
  }
  const pct = r => r.rate == null ? '—' : Math.round(r.rate * 100) + '%';
  const fmax = Math.max(1, ...s.forecast);
  const hmax = Math.max(1, ...s.heatmap.map(h => h.count));
  const lvl = (c, max) => c === 0 ? 0 : c <= max / 3 ? 1 : c <= (2 * max) / 3 ? 2 : 3;
  const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const share = kpi.learn + kpi.mature ? Math.round(kpi.learn / (kpi.learn + kpi.mature) * 100) : 0;
  const lapsed = s.hardest.filter(h => h.lapses > 0);
  box.innerHTML =
    '<div class="kpis">' +
      '<div class="card kpi"><b>' + s.total + '</b><span>từ đã học</span></div>' +
      '<div class="card kpi"><b>' + pct(s.retention30) + '</b><span>nhớ 30 ngày</span></div>' +
      '<div class="card kpi"><b>' + kpi.streak + '</b><span>ngày liên tiếp</span></div></div>' +
    '<div class="card"><p class="eyebrow">' + s.total + ' từ đã học</p>' +
      '<div class="stack" role="img" aria-label="' + kpi.learn + ' đang nhớ, ' + kpi.mature + ' đã thuộc"><i style="width:' + share + '%"></i><i style="width:' + (100 - share) + '%"></i></div>' +
      '<div class="legend"><span><i class="swatch sw-learn"></i>Đang nhớ ' + kpi.learn + '</span><span><i class="swatch sw-mature"></i>Đã thuộc ' + kpi.mature + '</span></div>' +
      '<p class="small muted">Đã thuộc = khoảng cách ôn từ 21 ngày trở lên. Tỉ lệ nhớ 7 ngày: ' + pct(s.retention7) + '.</p></div>' +
    '<div class="card"><p class="eyebrow">Lịch ôn 7 ngày tới</p><div class="forecast">' + s.forecast.map((n, i) => {
      const d = new Date(now + i * STATS_DAY);
      return '<div' + (i ? '' : ' class="today"') + '><b>' + n + '</b><i style="height:' + Math.max(4, Math.round(n / fmax * 72)) + 'px"></i><span>' + (i === 0 ? 'Nay' : dayNames[d.getDay()]) + '</span></div>';
    }).join('') + '</div>' +
      // "Nay" đếm mọi thẻ đến hạn; phiên chỉ phát tối đa kpi.maxSession → nói rõ để không lệch với số ở Hôm nay
      (kpi.maxSession && s.forecast[0] > kpi.maxSession ? '<p class="small muted">Hôm nay đến hạn ' + s.forecast[0] + ' thẻ; mỗi phiên tối đa ' + kpi.maxSession + ' — phần còn lại vào phiên sau.</p>' : '') +
    '</div>' +
    '<div class="card"><p class="eyebrow">30 ngày qua</p>' +
      '<div class="heatmap">' + s.heatmap.map(h => '<i class="l' + lvl(h.count, hmax) + '" title="' + new Date(h.day).toLocaleDateString('vi-VN') + ': ' + h.count + ' lượt"></i>').join('') + '</div>' +
      '<div class="heat-legend" aria-hidden="true">ít <i></i><i class="l1"></i><i class="l2"></i><i class="l3"></i> nhiều</div></div>' +
    (lapsed.length
      ? '<div class="sec-h"><h2>Hay quên nhất</h2><span class="small muted">bấm để ôn ngay</span></div>' +
        '<div class="card rowlist">' + lapsed.map(h => '<button class="r" data-pick="' + esc(h.id) + '"><b>' + esc(h.word) + '</b><span class="x"><span class="lapse">quên ' + h.lapses + ' lần</span><span aria-hidden="true">›</span></span></button>').join('') + '</div>'
      : '');
  box.querySelectorAll('[data-pick]').forEach(b => { b.onclick = () => onPick(b.dataset.pick); });
}

if (typeof module !== 'undefined') module.exports = { computeStats, gradesBetween };
