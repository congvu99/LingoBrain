/* Tìm từ/cụm từ của bộ từ trong câu hội thoại AI tạo: dùng chung server (đo độ phủ, tests) và trình duyệt (tô đậm).
   Thuần. Chuẩn hoá theo normAnswer (srs-scheduler.js). Chấp nhận biến thể đuôi đơn giản trên từng token
   (s/es/ed/d/ing, y→ies/ied, bỏ e + ing, nhân đôi phụ âm) và tối đa 2 token chen giữa các token của cụm
   ("figured it out" khớp "figure out"). Dạng bất quy tắc (went, bought) không bắt — rơi vào missing. */

const DWM_MAX_GAP = 2;
const dwmNormAnswer = typeof normAnswer === 'function' ? normAnswer : require('./srs-scheduler.js').normAnswer;

// token gốc trong câu kèm vị trí: chữ/số, giữ nháy trong từ (how's, I'm); nháy cong → nháy thẳng
function dwmTokens(sentence) {
  const s = String(sentence || ''), out = [];
  const re = /[A-Za-z0-9]+(?:['’][A-Za-z]+)*/g;
  let m;
  while ((m = re.exec(s))) out.push({ t: m[0].replace(/’/g, "'").toLowerCase(), start: m.index, end: m.index + m[0].length });
  return out;
}

function dwmPhraseTokens(phrase) {
  return dwmNormAnswer(String(phrase || '').replace(/’/g, "'")).split(' ').filter(Boolean);
}

function dwmTokenMatches(tok, base) {
  if (tok === base) return true;
  if (base.length < 3 || tok.length <= base.length) return false;
  const tail = tok.slice(base.length);
  if (tok.startsWith(base) && ['s', 'es', 'ed', 'd', 'ing', 'er', 'est', "'s"].indexOf(tail) >= 0) return true;
  const last = base[base.length - 1];
  if (tok.startsWith(base) && tail.length > 1 && tail[0] === last && ['ed', 'ing', 'er'].indexOf(tail.slice(1)) >= 0) return true;  // stop → stopped
  const stem = base.slice(0, -1);
  if (last === 'y' && tok.startsWith(stem) && ['ies', 'ied', 'ier', 'iest'].indexOf(tok.slice(stem.length)) >= 0) return true;
  if (last === 'e' && tok.startsWith(stem) && tok.slice(stem.length) === 'ing') return true;                                   // make → making
  return false;
}

// các khoảng [start, end) trên câu gốc nơi cụm xuất hiện (không chồng nhau)
function matchSpans(sentence, phrase) {
  const toks = dwmTokens(sentence), ph = dwmPhraseTokens(phrase), spans = [];
  if (!ph.length) return spans;
  for (let i = 0; i < toks.length; i++) {
    if (!dwmTokenMatches(toks[i].t, ph[0])) continue;
    let j = i, ok = true;
    for (let k = 1; k < ph.length && ok; k++) {
      let found = -1;
      for (let g = j + 1; g <= Math.min(toks.length - 1, j + 1 + DWM_MAX_GAP); g++) if (dwmTokenMatches(toks[g].t, ph[k])) { found = g; break; }
      if (found < 0) ok = false; else j = found;
    }
    if (!ok) continue;
    spans.push([toks[i].start, toks[j].end]);
    i = j;
  }
  return spans;
}

function isCovered(sentences, phrase) {
  return (sentences || []).some(s => matchSpans(s, phrase).length > 0);
}

if (typeof module !== 'undefined') module.exports = { matchSpans, isCovered };
