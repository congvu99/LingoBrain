/* Nạp / xuất bộ từ. parseImport() thuần (JSON hoặc text nhiều dòng); phần còn lại đụng DOM/localStorage. */

/* Text: mỗi dòng `word | nghĩa | câu | nguồn`. Dấu tách ưu tiên: `|` → tab → ` - `. Bỏ dòng trống và dòng bắt đầu `#`. */
function splitLine(line) {
  if (line.indexOf('|') >= 0) return line.split('|');
  if (line.indexOf('\t') >= 0) return line.split('\t');
  return line.split(/\s+-\s+/);
}
function parseImport(raw) {
  const out = { words: [], errors: [], deck: null };
  const s = String(raw || '').trim();
  if (!s) return out;
  if (s[0] === '[' || s[0] === '{') {
    let data;
    try { data = JSON.parse(s); } catch (e) { out.errors.push({ line: 0, reason: 'JSON sai cú pháp' }); return out; }
    const arr = Array.isArray(data) ? data : (data.words || []);
    if (data && data.deck) out.deck = data.deck;
    arr.forEach((item, i) => { const w = normWord(item || {}); if (w) out.words.push(w); else out.errors.push({ line: i + 1, reason: 'thiếu word' }); });
    return out;
  }
  s.split(/\r?\n/).forEach((line, i) => {
    const t = line.trim();
    if (!t || t[0] === '#') return;
    const cols = splitLine(t).map(x => x.trim());
    if (cols.length < 2 || !cols[0] || !cols[1]) { out.errors.push({ line: i + 1, reason: 'cần ít nhất `từ | nghĩa`' }); return; }
    out.words.push(normWord({ word: cols[0], meaning: cols[1], context: cols[2] || '', source: cols[3] || '' }));
  });
  return out;
}

/* ---- phần dưới chỉ chạy trong trình duyệt ---- */
function importWords(raw) {
  const p = parseImport(raw);
  if (!p.words.length) return toast('❌ ' + (p.errors[0] ? p.errors[0].reason : 'Không tìm thấy từ nào'));
  if (p.deck) deck.deck = p.deck;
  let add = 0, upd = 0;
  for (const w of p.words) {
    const i = deck.words.findIndex(x => x.id === w.id);
    if (i < 0) { deck.words.push(w); add++; } else { deck.words[i] = w; upd++; }
  }
  save(K_DECK, deck);
  restartSession(); renderList();
  toast('✅ Thêm ' + add + ' từ mới, cập nhật ' + upd + (p.errors.length ? ', bỏ ' + p.errors.length + ' dòng lỗi' : ''));
}
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
      '<span class="small">' + st + '</span>' +
      '<button class="btn-ghost btn-sm" data-del="' + esc(w.id) + '" aria-label="xoá ' + esc(w.word) + '">✕</button></div>';
  }).join('') || '<p class="muted small">Chưa có từ nào.</p>';
  $('#wordList').querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
    const id = b.dataset.del;
    if (!confirm('Xoá từ này khỏi bộ từ?')) return;
    deck.words = deck.words.filter(w => w.id !== id); delete srs[id];
    save(K_DECK, deck); save(K_SRS, srs);
    restartSession(); renderList();
  });
}
// khôi phục backup: chấp nhận cả srs v1 (box) lẫn v2 (ef)
function restoreBackup(j) {
  deck = j.deck; srs = migrateV1(j.srs || {}); Object.assign(cfg, j.cfg || {});
  if (j.plan) plan = j.plan;
  if (j.day) day = j.day;
  save(K_DECK, deck); save(K_SRS, srs); save(K_CFG, cfg); save(K_PLAN, plan); save(K_DAY, day);
  restartSession(); renderList(); renderPlanEdit(); toast('✅ Đã khôi phục');
}

if (typeof module !== 'undefined') module.exports = { parseImport };
