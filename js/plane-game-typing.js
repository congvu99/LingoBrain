/* Game Bắn máy bay — nhắm bắn theo chữ gõ, thuần. Người chơi tự quyết định bắn từ nào:
   st.typed là chuỗi chữ cái đang gõ; mục tiêu nào có từ bắt đầu bằng chuỗi đó là "ứng viên", tiến độ hiện trên nhãn.
   Mỗi chữ khớp bắn 1 viên vào ứng viên gần tàu nhất; khi chữ kế tiếp loại bớt ứng viên, đạn đang bay đổi hướng
   sang ứng viên còn lại. Chữ không khớp chuỗi đang gõ nhưng khớp đầu từ khác (gõ "ca" rồi "d…") → chuyển mục tiêu.
   Nạp sau plane-game-logic.js. */

/* Mục tiêu còn sống có từ bắt đầu bằng chuỗi chữ cái `typed` */
function typingCandidates(st, typed) {
  return st.targets.filter(t => !t.doomed && t.letters.startsWith(typed));
}

const lowestTarget = list => list.reduce((a, t) => (!a || t.y > a.y ? t : a), null);   // gần tàu mình nhất

function fire(st, target, hit, ev, rand) {
  const tx = target ? target.x : st.shipX + (rand() - 0.5) * st.w * 0.2, ty = target ? target.y : -20;
  let a = Math.atan2(ty - st.shipY, tx - st.shipX);
  if (!hit && target) a += (rand() < 0.5 ? -1 : 1) * (0.18 + rand() * 0.12);   // đạn trượt: lệch hẳn khỏi mục tiêu
  const s = BULLET_SPEED * st.h;
  st.bullets.push({ x: st.shipX, y: st.shipY, vx: Math.cos(a) * s, vy: Math.sin(a) * s, target: hit ? target.uid : null });
  if (hit) target.pending++;
  st.aimTo = a;
  ev.push({ type: 'fire', x: st.shipX, y: st.shipY, a, hit });
}

/* Tô tiến độ: ứng viên hiện số chữ đã gõ, mục tiêu khác về chưa gõ */
function paintProgress(st, cands) {
  for (const t of st.targets) {
    if (!t.doomed) t.progress = cands.indexOf(t) >= 0 ? progressFor(t.text, st.typed.length) : skipFixed(t.text, 0);
  }
}

/* Đạn đang bay vào mục tiêu không còn là ứng viên → đổi hướng sang mục tiêu chính mới */
function retargetBullets(st, cands, main) {
  for (const b of st.bullets) {
    const t = b.target && st.targets.find(x => x.uid === b.target);
    if (!t || t === main || t.doomed || cands.indexOf(t) >= 0) continue;
    t.pending--; main.pending++; b.target = main.uid;
  }
}

/* Gõ trọn từ của mục tiêu: nổ khi viên cuối tới; xoá chuỗi đang gõ */
function doomTarget(st, t) {
  t.doomed = true; t.progress = t.text.length;
  st.typed = ''; st.lock = null;
  paintProgress(st, []);
}

/* Gõ 1 ký tự. Trả { hit, target } */
function typeChar(st, ch, rand, ev) {
  ev = ev || []; rand = rand || Math.random;
  const c = normalizeTyped(ch);
  if (!c || isFixedTyped(c) || st.over) return { hit: false, target: null, ev };
  const buf = st.typed + c;
  let typed = null, cands = [];
  for (let i = 0; i < buf.length && !typed; i++) {      // đuôi dài nhất của chuỗi gõ còn khớp đầu một từ nào đó
    const tail = buf.slice(i), found = typingCandidates(st, tail);
    if (found.length) { typed = tail; cands = found; }
  }
  const cur = st.targets.find(t => t.uid === st.lock);
  if (!typed) {                                          // không khớp gì: đạn trượt, giữ nguyên chuỗi đang gõ
    if (cur && ++cur.wrong === PLANE_WRONG_TO_MISS && st.miss.indexOf(cur.word.id) < 0) st.miss.push(cur.word.id);
    fire(st, cur || null, false, ev, rand);
    return { hit: false, target: cur || null, ev };
  }
  st.typed = typed;
  const exact = cands.filter(t => t.letters === typed);
  // mục tiêu chính: từ vừa gõ trọn > mục tiêu đang bắn (nếu vẫn khớp) > ứng viên gần tàu nhất
  const main = lowestTarget(exact) || (cur && cands.indexOf(cur) >= 0 ? cur : lowestTarget(cands));
  st.lock = main.uid;
  paintProgress(st, cands);
  retargetBullets(st, cands, main);
  fire(st, main, true, ev, rand);
  // gõ trọn từ và không còn từ dài hơn đang chờ ("give" khi có "give up") → nổ
  if (exact.length && !cands.some(t => t.letters.length > typed.length)) doomTarget(st, main);
  return { hit: true, target: main, ev };
}

/* Enter: chuỗi đang gõ trùng trọn một từ → hạ từ đó ("give" khi có "give up"); không thì xoá chuỗi, bỏ khoá */
function pressEnter(st, rand, ev) {
  ev = ev || []; rand = rand || Math.random;
  const exact = st.typed ? typingCandidates(st, st.typed).filter(t => t.letters === st.typed) : [];
  if (exact.length) {
    const t = lowestTarget(exact);
    retargetBullets(st, [t], t);
    if (!t.pending) fire(st, t, true, ev, rand);        // đạn trước đã trúng hết: bắn thêm 1 viên để kích nổ
    doomTarget(st, t);
    return ev;
  }
  st.typed = ''; st.lock = null;
  paintProgress(st, []);
  return ev;
}

if (typeof module !== 'undefined') module.exports = { typingCandidates, typeChar, pressEnter };
