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

// vẽ vào #statsBox; onPick(id) → ôn ngay từ đó
function renderStats(deck, srs, now, onPick) {
  const box = document.getElementById('statsBox');
  if (!box) return;
  const s = computeStats(deck, srs, now);
  if (!s.total) { box.innerHTML = '<p class="muted small">Ôn vài phiên là có thống kê.</p>'; return; }
  const pct = r => r.rate == null ? '—' : Math.round(r.rate * 100) + '%';
  const fmax = Math.max(1, ...s.forecast);
  const hmax = Math.max(1, ...s.heatmap.map(h => h.count));
  const lvl = (c, max) => c === 0 ? 0 : c <= max / 3 ? 1 : c <= (2 * max) / 3 ? 2 : 3;
  const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  box.innerHTML =
    '<div class="stat-row">' +
      '<div><b>' + pct(s.retention7) + '</b><span>nhớ 7 ngày</span></div>' +
      '<div><b>' + pct(s.retention30) + '</b><span>nhớ 30 ngày</span></div>' +
      '<div><b>' + s.total + '</b><span>từ đã học</span></div></div>' +
    '<div class="stat-label">Lịch ôn 7 ngày tới</div>' +
    '<div class="forecast">' + s.forecast.map((n, i) => {
      const d = new Date(now + i * STATS_DAY);
      return '<div><i style="height:' + Math.round(n / fmax * 40) + 'px"></i><b>' + n + '</b><span>' + (i === 0 ? 'nay' : dayNames[d.getDay()]) + '</span></div>';
    }).join('') + '</div>' +
    '<div class="stat-label">30 ngày qua</div>' +
    '<div class="heatmap">' + s.heatmap.map(h => '<i class="l' + lvl(h.count, hmax) + '" title="' + new Date(h.day).toLocaleDateString('vi-VN') + ': ' + h.count + ' lượt"></i>').join('') + '</div>' +
    (s.hardest.some(h => h.lapses > 0)
      ? '<div class="stat-label">Hay quên nhất</div><div class="hardest">' +
        s.hardest.filter(h => h.lapses > 0).map(h => '<button class="btn-ghost btn-sm" data-pick="' + h.id + '">' + esc(h.word) + ' <small>×' + h.lapses + '</small></button>').join('') + '</div>'
      : '');
  box.querySelectorAll('[data-pick]').forEach(b => { b.onclick = () => onPick(b.dataset.pick); });
}

if (typeof module !== 'undefined') module.exports = { computeStats };
