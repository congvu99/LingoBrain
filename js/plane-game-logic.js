/* Game Bắn máy bay (kiểu ZType) — logic thuần, không chạm DOM. Chạy trong Node và trình duyệt.
   Thế giới tính bằng px của khung chơi (st.w × st.h). Mục tiêu mang nghĩa Việt rơi về tàu mình ở đáy;
   mỗi chữ cái gõ đúng bắn 1 viên đạn tự dẫn vào mục tiêu đang khoá, chữ cuối làm nó nổ.
   Trả sự kiện ('fire' | 'hit' | 'explode' | 'shield') để phần hiệu ứng vẽ.
   Cần comboMult() của word-games.js và các hàm chữ của plane-game-text.js (nạp trước file này). */

const PLANE_LIVES = 3;
const PLANE_FALL_SECONDS = 11;     // từ 5 chữ cái ở cấp 0 đi hết chiều cao khung trong ~11s
const PLANE_START_MAX = 3;         // số mục tiêu tối đa cùng lúc ở cấp 0
const PLANE_CAP = 6;
const PLANE_KILLS_PER_LEVEL = 5;
const PLANE_SPEEDUP = 1.08;        // mỗi cấp nhanh hơn 8%
const PLANE_SPAWN_GAP = 1.8;       // giây giữa 2 lần xuất hiện ở cấp 0
const PLANE_MAX_DT = 0.05;         // kẹp bước thời gian: sau tạm dừng / giật khung không nhảy cóc
const PLANE_WRONG_TO_MISS = 3;     // gõ sai ngần ấy chữ trên 1 mục tiêu → từ đó vào danh sách ôn trước (không trừ điểm)
const BULLET_SPEED = 2.4;          // chiều cao khung / giây
const BULLET_KICK = 0.22;          // mỗi viên trúng đẩy mục tiêu giật lên (chiều cao khung / giây)
// tàu mình: lò xo kéo về dưới mục tiêu đang khoá, giảm chấn hơi dưới tới hạn → trượt quá một chút rồi dừng
const SHIP_SPRING = 16, SHIP_DAMP = 6.4, SHIP_IDLE_DAMP = 3, SHIP_MAX_V = 1.4, SHIP_MARGIN = 22, SHIP_MAX_BANK = 0.5;
// bán kính theo bề ngang khung, kẹp min/max px. ≤4 chữ: thiên thạch nảy mép · 5–8: tàu địch lượn · ≥9: tàu mẹ
const TARGET_KINDS = { rock: { r: 0.05, min: 15, max: 26 }, ship: { r: 0.06, min: 18, max: 30 }, mother: { r: 0.09, min: 26, max: 44 } };

const fallSeconds = level => PLANE_FALL_SECONDS / Math.pow(PLANE_SPEEDUP, level);
const maxPlanes = level => Math.min(PLANE_CAP, PLANE_START_MAX + level);

function createPlaneState(words, w, h) {
  const st = { words: words || [], next: 0, targets: [], bullets: [], uid: 0, spawnIn: 0, lock: null, t: 0,
    lives: PLANE_LIVES, kills: 0, level: 0, score: 0, right: 0, wrong: 0, streak: 0, bestStreak: 0,
    miss: [], over: false, w: 0, h: 0, shipX: 0, shipY: 0, shipVx: 0, goalX: null, bank: 0, aim: -Math.PI / 2, aimTo: -Math.PI / 2 };
  resizePlaneState(st, w || 360, h || 640);
  return st;
}

/* Khung đổi cỡ (bàn phím bật/tắt, xoay máy): co giãn mọi vật theo tỉ lệ để không ai nhảy chỗ */
function resizePlaneState(st, w, h) {
  const sx = st.w ? w / st.w : 1, sy = st.h ? h / st.h : 1;
  for (const o of st.targets.concat(st.bullets)) { o.x *= sx; o.y *= sy; o.vx *= sx; o.vy *= sy; if (o.cruise) o.cruise *= sy; }
  st.shipX = st.w ? st.shipX * sx : w / 2; st.shipVx *= sx;
  if (st.goalX != null) st.goalX *= sx;
  st.w = w; st.h = h;
  st.shipY = h - Math.max(26, h * 0.07);
}

function nextPlaneWord(st) {
  const n = st.words.length;
  for (let k = 0; k < n; k++) {
    const w = st.words[(st.next + k) % n];
    if (!st.targets.some(t => t.word.id === w.id)) { st.next = (st.next + k + 1) % n; return w; }
  }
  return null;
}

function spawnTarget(st, rand) {
  const w = nextPlaneWord(st);
  if (!w) return null;
  const text = normalizeTyped(w.word), kind = targetKind(text), k = TARGET_KINDS[kind];
  const r = Math.min(k.max, Math.max(k.min, k.r * st.w));
  let x = st.w / 2;
  for (let i = 0; i < 6; i++) {         // tránh cột của mục tiêu còn ở nửa trên để nhãn không chồng nhau
    x = r + rand() * (st.w - 2 * r);
    if (!st.targets.some(t => t.y < st.h * 0.5 && Math.abs(t.x - x) < st.w * 0.28)) break;
  }
  const cruise = st.h / (fallSeconds(st.level) * lengthSlowdown(text) * (0.9 + rand() * 0.2));   // ±10%: không đều tăm tắp
  const t = { uid: ++st.uid, word: w, text, label: planeLabel(w), kind, r, x, y: -r, cruise,
    vx: kind === 'rock' ? (rand() - 0.5) * cruise * 1.2 : 0, vy: cruise,
    rot: kind === 'rock' ? rand() * 6.283 : 0, vr: kind === 'rock' ? (rand() - 0.5) * 2.4 : 0, phase: rand() * 6.283,
    progress: skipFixed(text, 0), wrong: 0, pending: 0, doomed: false };
  st.targets.push(t);
  return t;
}

function fire(st, target, hit, ev, rand) {
  const tx = target ? target.x : st.shipX + (rand() - 0.5) * st.w * 0.2, ty = target ? target.y : -20;
  let a = Math.atan2(ty - st.shipY, tx - st.shipX);
  if (!hit && target) a += (rand() < 0.5 ? -1 : 1) * (0.18 + rand() * 0.12);   // đạn trượt: lệch hẳn khỏi mục tiêu
  const s = BULLET_SPEED * st.h;
  st.bullets.push({ x: st.shipX, y: st.shipY, vx: Math.cos(a) * s, vy: Math.sin(a) * s, target: hit ? target.uid : null });
  st.aimTo = a;
  ev.push({ type: 'fire', x: st.shipX, y: st.shipY, a, hit });
}

/* Gõ 1 ký tự. Chưa khoá → khoá mục tiêu gần tàu nhất có chữ kế tiếp khớp. Trả { hit, target } */
function typeChar(st, ch, rand, ev) {
  ev = ev || []; rand = rand || Math.random;
  const c = normalizeTyped(ch);
  if (!c || isFixedTyped(c) || st.over) return { hit: false, target: null, ev };
  let t = st.targets.find(x => x.uid === st.lock);
  if (!t) {
    for (const x of st.targets) if (!x.doomed && x.text[x.progress] === c && (!t || x.y > t.y)) t = x;
    if (!t) { fire(st, null, false, ev, rand); return { hit: false, target: null, ev }; }
    st.lock = t.uid;
  }
  if (t.text[t.progress] !== c) {
    if (++t.wrong === PLANE_WRONG_TO_MISS && st.miss.indexOf(t.word.id) < 0) st.miss.push(t.word.id);
    fire(st, t, false, ev, rand);
    return { hit: false, target: t, ev };
  }
  t.progress = skipFixed(t.text, t.progress + 1);
  t.pending++;
  if (t.progress >= t.text.length) { t.doomed = true; st.lock = null; }
  fire(st, t, true, ev, rand);
  return { hit: true, target: t, ev };
}

/* Enter: nhả mục tiêu đang khoá để chọn lại (khoá nhầm "gift" khi muốn "give") */
function releaseLock(st) { st.lock = null; }

function removeTarget(st, t) {
  st.targets.splice(st.targets.indexOf(t), 1);
  if (st.lock === t.uid) st.lock = null;
  for (const b of st.bullets) if (b.target === t.uid) b.target = null;   // đạn đang bay thành đạn lạc
}

function moveTarget(st, t, dt) {
  if (t.kind === 'ship') {           // lượn sóng + kéo dần về phía tàu mình khi xuống thấp
    const want = Math.cos(st.t * 1.5 + t.phase) * st.w * 0.13 + (st.shipX - t.x) * 0.5 * Math.max(0, t.y / st.h);
    t.vx += (want - t.vx) * 2.5 * dt;
    t.rot = -Math.max(-0.6, Math.min(0.6, Math.atan2(t.vx, t.vy)));   // mũi nghiêng theo hướng lượn, không xoay ngang
  } else if (t.kind === 'mother') {
    t.vx += (Math.cos(st.t * 0.7 + t.phase) * st.w * 0.07 - t.vx) * 1.5 * dt;
  }
  t.vy += (t.cruise - t.vy) * 2.2 * dt;   // hồi về tốc độ hành trình sau cú giật của đạn
  if (t.vy < 0 && t.y < t.r) t.vy = 0;    // giật tới mép trên thì dừng: không văng khỏi màn (nhãn mất theo)
  t.x += t.vx * dt; t.y += t.vy * dt; t.rot += t.vr * dt;
  if (t.x < t.r) { t.x = t.r; t.vx = Math.abs(t.vx) * 0.9; }
  if (t.x > st.w - t.r) { t.x = st.w - t.r; t.vx = -Math.abs(t.vx) * 0.9; }
}

/* Tàu mình bay ngang về dưới mục tiêu đang khoá (lò xo + giảm chấn), nghiêng thân theo vận tốc.
   Không có mục tiêu: chỉ còn giảm chấn nhẹ → trôi chậm dần rồi đứng tại chỗ. */
function moveShip(st, dt) {
  const t = st.lock !== null && st.targets.find(x => x.uid === st.lock);
  st.goalX = t ? Math.min(st.w - SHIP_MARGIN, Math.max(SHIP_MARGIN, t.x)) : null;
  const ax = st.goalX == null ? -SHIP_IDLE_DAMP * st.shipVx : SHIP_SPRING * (st.goalX - st.shipX) - SHIP_DAMP * st.shipVx;
  const vmax = SHIP_MAX_V * st.w;
  st.shipVx = Math.max(-vmax, Math.min(vmax, st.shipVx + ax * dt));
  st.shipX += st.shipVx * dt;
  if (st.shipX < SHIP_MARGIN || st.shipX > st.w - SHIP_MARGIN) {
    st.shipX = Math.max(SHIP_MARGIN, Math.min(st.w - SHIP_MARGIN, st.shipX)); st.shipVx = 0;
  }
  st.bank = Math.max(-1, Math.min(1, st.shipVx / (vmax * 0.5))) * SHIP_MAX_BANK;
}

function destroyTarget(st, t, ev) {
  removeTarget(st, t);
  st.kills++; st.right++; st.streak++;
  st.bestStreak = Math.max(st.bestStreak, st.streak);
  st.score += letterCount(t.text) * comboMult(st.streak);
  st.level = Math.floor(st.kills / PLANE_KILLS_PER_LEVEL);
  ev.push({ type: 'explode', x: t.x, y: t.y, kind: t.kind, r: t.r, word: t.word.word });
}

function moveBullets(st, dt, ev, rand) {
  const s = BULLET_SPEED * st.h;
  for (const b of st.bullets.slice()) {
    const t = b.target && st.targets.find(x => x.uid === b.target);
    if (t) {
      const dx = t.x - b.x, dy = t.y - b.y, d = Math.hypot(dx, dy);
      if (d <= Math.max(t.r * 0.7, s * dt)) {
        st.bullets.splice(st.bullets.indexOf(b), 1);
        t.vy = Math.max(t.vy - BULLET_KICK * st.h, -t.cruise); t.vx += b.vx * 0.03;   // giật lên, có trần t.vr += (rand() - 0.5) * 1.5;
        ev.push({ type: 'hit', x: b.x, y: b.y, a: Math.atan2(b.vy, b.vx) });
        if (--t.pending <= 0 && t.doomed) destroyTarget(st, t, ev);
        continue;
      }
      b.vx = dx / d * s; b.vy = dy / d * s;    // tự dẫn: luôn bay thẳng vào mục tiêu đang di chuyển
    }
    b.x += b.vx * dt; b.y += b.vy * dt;
    // chỉ xoá đạn lạc ra khỏi màn; đạn còn đuổi mục tiêu mà xoá thì pending treo, từ gõ xong không bao giờ nổ
    if (!t && (b.y < -40 || b.x < -40 || b.x > st.w + 40 || b.y > st.h + 40)) st.bullets.splice(st.bullets.indexOf(b), 1);
  }
}

/* Tiến 1 bước thời gian. Trả mảng sự kiện cho phần hiệu ứng. */
function stepPlanes(st, dt, rand) {
  const ev = [];
  rand = rand || Math.random;
  if (st.over) return ev;
  dt = Math.min(PLANE_MAX_DT, Math.max(0, dt));
  st.t += dt;
  if (st.lock === null && !st.bullets.length) st.aimTo = -Math.PI / 2;   // hết việc: nòng quay về thẳng lên
  st.aim += (st.aimTo - st.aim) * Math.min(1, dt * 14);
  moveShip(st, dt);
  for (const t of st.targets.slice()) {
    moveTarget(st, t, dt);
    if (t.y + t.r < st.shipY - 8) continue;
    if (t.doomed) { destroyTarget(st, t, ev); continue; }   // đã gõ đủ chữ, đạn chưa kịp tới: vẫn tính cho người chơi
    removeTarget(st, t);                 // chạm khiên tàu mình
    st.lives--; st.wrong++; st.streak = 0;
    if (st.miss.indexOf(t.word.id) < 0) st.miss.push(t.word.id);
    ev.push({ type: 'shield', x: t.x, y: t.y, kind: t.kind, r: t.r, word: t.word.word });
    if (st.lives <= 0) { st.lives = 0; st.over = true; return ev; }
  }
  moveBullets(st, dt, ev, rand);
  st.spawnIn -= dt;
  if (st.spawnIn <= 0 && st.targets.filter(t => !t.doomed).length < maxPlanes(st.level) && spawnTarget(st, rand))
    st.spawnIn = PLANE_SPAWN_GAP / Math.pow(PLANE_SPEEDUP, st.level);
  return ev;
}

if (typeof module !== 'undefined') module.exports = {
  PLANE_LIVES, PLANE_FALL_SECONDS, PLANE_START_MAX, PLANE_CAP, PLANE_SPEEDUP, PLANE_WRONG_TO_MISS,
  fallSeconds, maxPlanes, createPlaneState, resizePlaneState,
  stepPlanes, typeChar, releaseLock
};
