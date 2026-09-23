/* Game Bắn máy bay — logic thuần, không chạm DOM. Chạy trong Node và trình duyệt.
   Toạ độ chuẩn hoá: y ∈ [0,1] (0 = đỉnh, 1 = mặt đất), x ∈ [0.1,0.9]. Phần vẽ nhân với kích thước khung,
   nên màn thấp (bàn phím iPhone chiếm chỗ) thì máy bay rơi chậm theo — cùng số giây, không bất công.
   Cần comboMult() của js/word-games.js (nạp trước file này). */

const PLANE_LIVES = 3;
const PLANE_FALL_SECONDS = 9;      // thời gian từ đỉnh xuống đất ở cấp 0
const PLANE_START_MAX = 3;         // số máy bay tối đa cùng lúc ở cấp 0
const PLANE_CAP = 5;               // trần số máy bay cùng lúc
const PLANE_KILLS_PER_LEVEL = 5;
const PLANE_SPEEDUP = 1.08;        // mỗi cấp rơi nhanh hơn 8%
const PLANE_SPAWN_GAP = 1.6;       // giây giữa 2 lần xuất hiện ở cấp 0
const PLANE_LABEL_MAX = 18;        // nhãn dài hơn thì tràn thân máy bay trên màn nhỏ
const PLANE_MAX_DT = 0.05;         // kẹp bước thời gian: sau khi tạm dừng / giật khung không nhảy cóc

const fallSeconds = level => PLANE_FALL_SECONDS / Math.pow(PLANE_SPEEDUP, level);
const maxPlanes = level => Math.min(PLANE_CAP, PLANE_START_MAX + level);

/* So khớp: không phân biệt hoa thường, bỏ khoảng trắng thừa, nháy cong (bàn phím iOS tự đổi) → nháy thẳng */
function normalizeTyped(s) {
  return String(s || '').toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();
}

/* Nhãn trên máy bay: emoji + vế nghĩa đầu tiên cho vừa PLANE_LABEL_MAX ký tự */
function planeLabel(w) {
  let m = String(w.meaning || '').split(';')[0].trim();
  if (m.length > PLANE_LABEL_MAX) m = m.split(',')[0].trim();
  if (m.length > PLANE_LABEL_MAX) m = m.slice(0, PLANE_LABEL_MAX - 1).trim() + '…';
  return (w.emoji ? w.emoji + ' ' : '') + m;
}

function createPlaneState(words) {
  return {
    words: words || [], next: 0, planes: [], uid: 0, spawnIn: 0,
    lives: PLANE_LIVES, kills: 0, level: 0, score: 0,
    right: 0, wrong: 0, streak: 0, bestStreak: 0, miss: [], over: false
  };
}

/* Từ kế tiếp chưa có trên màn, quay vòng danh sách. null nếu mọi từ đều đang bay. */
function nextPlaneWord(st) {
  const n = st.words.length;
  for (let k = 0; k < n; k++) {
    const w = st.words[(st.next + k) % n];
    if (!st.planes.some(p => p.word.id === w.id)) { st.next = (st.next + k + 1) % n; return w; }
  }
  return null;
}

/* Cột xuất hiện: tránh cột của máy bay còn ở nửa trên. Màn thấp (bàn phím bật) thì 2 chiếc liền nhau
   chỉ cách nhau vài chục px theo chiều dọc, nên phải tách theo chiều ngang mới không chồng nhãn. */
function pickPlaneX(st, rand) {
  let x = 0.5;
  for (let t = 0; t < 6; t++) {
    x = 0.1 + rand() * 0.8;
    if (!st.planes.some(p => p.y < 0.5 && Math.abs(p.x - x) < 0.3)) break;
  }
  return x;
}

function spawnPlane(st, rand) {
  const w = nextPlaneWord(st);
  if (!w) return null;
  const p = { uid: ++st.uid, word: w, label: planeLabel(w), x: pickPlaneX(st, rand), y: 0 };
  st.planes.push(p);
  return p;
}

/* Tiến 1 bước thời gian. Trả sự kiện để phần vẽ làm hiệu ứng: { landed: [...], spawned: [...] } */
function stepPlanes(st, dt, rand) {
  const ev = { landed: [], spawned: [] };
  if (st.over) return ev;
  dt = Math.min(PLANE_MAX_DT, Math.max(0, dt));
  const dy = dt / fallSeconds(st.level);
  for (const p of st.planes) p.y += dy;

  for (const p of st.planes.filter(q => q.y >= 1)) {
    st.planes.splice(st.planes.indexOf(p), 1);
    ev.landed.push(p);
    st.lives--; st.wrong++; st.streak = 0;
    if (st.miss.indexOf(p.word.id) < 0) st.miss.push(p.word.id);
    if (st.lives <= 0) { st.lives = 0; st.over = true; return ev; }
  }

  st.spawnIn -= dt;
  if (st.spawnIn <= 0 && st.planes.length < maxPlanes(st.level)) {
    const p = spawnPlane(st, rand);
    if (p) { ev.spawned.push(p); st.spawnIn = PLANE_SPAWN_GAP / Math.pow(PLANE_SPEEDUP, st.level); }
  }
  return ev;
}

/* Bắn: chữ gõ khớp đúng từ của máy bay nào thì hạ chiếc thấp nhất trong số đó. Trả máy bay bị hạ | null.
   Tự bắn (force=false) nhường khi chữ gõ còn là tiền tố của từ khác đang bay: gõ "give up" không được
   hạ nhầm "give" giữa chừng. Enter (force=true) thì bắn ngay. */
function tryShoot(st, typed, force) {
  const t = normalizeTyped(typed);
  if (!t || st.over) return null;
  let hit = null;
  for (const p of st.planes) if (normalizeTyped(p.word.word) === t && (!hit || p.y > hit.y)) hit = p;
  if (!hit) return null;
  if (!force && st.planes.some(p => { const w = normalizeTyped(p.word.word); return w.length > t.length && w.startsWith(t); })) return null;
  st.planes.splice(st.planes.indexOf(hit), 1);
  st.kills++; st.right++; st.streak++;
  st.bestStreak = Math.max(st.bestStreak, st.streak);
  st.score += hit.word.word.length * comboMult(st.streak);
  st.level = Math.floor(st.kills / PLANE_KILLS_PER_LEVEL);
  return hit;
}

if (typeof module !== 'undefined') module.exports = {
  PLANE_LIVES, PLANE_FALL_SECONDS, PLANE_START_MAX, PLANE_CAP, PLANE_SPEEDUP, PLANE_LABEL_MAX,
  fallSeconds, maxPlanes, normalizeTyped, planeLabel, createPlaneState, stepPlanes, tryShoot
};
