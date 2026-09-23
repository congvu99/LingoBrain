/* Game Bắn máy bay — xử lý chữ, thuần: chuẩn hoá chữ gõ, nhãn nghĩa, loại mục tiêu theo độ dài từ.
   Chạy trong Node và trình duyệt. Nạp trước plane-game-logic.js. */

const PLANE_LABEL_MAX = 50;        // nhãn tự xuống dòng khi vẽ; nghĩa dài nhất trong words.json là 49 ký tự

const isFixedTyped = ch => ch === ' ' || ch === '-' || ch === "'" || ch === '.';
const letterCount = text => text.split('').filter(c => !isFixedTyped(c)).length;
/* Thời gian rơi nhân theo số chữ cái: gõ càng nhiều chữ càng được nhiều thời gian (1 chữ ×0.73 … 14 chữ ×1.7) */
const lengthSlowdown = text => 0.65 + 0.075 * letterCount(text);
const targetKind = text => { const n = letterCount(text); return n <= 4 ? 'rock' : n >= 9 ? 'mother' : 'ship'; };

/* Hoa thường, khoảng trắng thừa, nháy cong (bàn phím iOS tự đổi) → nháy thẳng */
function normalizeTyped(s) {
  return String(s || '').toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();
}

/* Nhãn: emoji + vế nghĩa đầu tiên (trước ';'), giữ nguyên phần ghi chú trong ngoặc — "một (mạo từ
   không xác định)" mất ngoặc là mất nghĩa. Quá PLANE_LABEL_MAX thì cắt ở ranh giới từ. */
function planeLabel(w) {
  let m = String(w.meaning || '').split(';')[0].trim();
  if (m.length > PLANE_LABEL_MAX) {
    const cut = m.slice(0, PLANE_LABEL_MAX - 1), sp = cut.lastIndexOf(' ');
    m = (sp > PLANE_LABEL_MAX / 2 ? cut.slice(0, sp) : cut).replace(/[\s,:(]+$/, '') + '…';
  }
  return (w.emoji ? w.emoji + ' ' : '') + m;
}

/* Chỉ phần chữ cái của từ (bỏ dấu cách / gạch nối / nháy): đây là thứ người chơi gõ */
const typedLetters = text => text.split('').filter(c => !isFixedTyped(c)).join('');

/* Vị trí trong text sau khi đã gõ n chữ cái (nhảy qua dấu cách/gạch nối) — để tô tiến độ trên nhãn */
function progressFor(text, n) {
  let i = skipFixed(text, 0);
  for (let k = 0; k < n && i < text.length; k++) i = skipFixed(text, i + 1);
  return i;
}

/* Bỏ qua dấu cách / gạch nối / nháy: người chơi chỉ gõ chữ cái */
function skipFixed(text, i) { while (i < text.length && isFixedTyped(text[i])) i++; return i; }

if (typeof module !== 'undefined') module.exports = {
  PLANE_LABEL_MAX, isFixedTyped, letterCount, lengthSlowdown, targetKind, normalizeTyped, planeLabel, skipFixed,
  typedLetters, progressFor
};
