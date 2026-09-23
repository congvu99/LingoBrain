/* Game Bắn máy bay — nhắm bắn theo chữ gõ, thuần. Người chơi tự quyết định bắn từ nào:
   st.typed là chuỗi chữ cái đang gõ; mục tiêu nào có từ bắt đầu bằng chuỗi đó là "ứng viên", tiến độ hiện trên nhãn.
   Còn nhiều ứng viên ("re" → reckon / reach out): game KHÔNG chọn thay — mỗi chữ vẫn bắn 1 viên nhưng đạn
   lơ lửng chờ trên tàu (held). Chữ tiếp theo loại hết còn 1 ứng viên → toàn bộ đạn chờ lao vào nó.
   Chữ không khớp chuỗi đang gõ nhưng khớp đầu từ khác (gõ "ca" rồi "d…") → chuyển sang từ đó.
   Nạp sau plane-game-logic.js. */

/* Mục tiêu còn sống có từ bắt đầu bằng chuỗi chữ cái `typed` */
function typingCandidates(st, typed) {
  return st.targets.filter(t => !t.doomed && t.letters.startsWith(typed));
}

const lowestTarget = list => list.reduce((a, t) => (!a || t.y > a.y ? t : a), null);   // gần tàu mình nhất

/* Bắn 1 viên. target = null + hit: đạn chờ (chưa rõ từ); target + !hit: đạn trượt; target + hit: đạn dẫn */
function fire(st, target, hit, ev, rand) {
  const held = hit && !target;
  const tx = target ? target.x : st.shipX + (rand() - 0.5) * st.w * 0.2, ty = target ? target.y : -20;
  let a = held ? -Math.PI / 2 : Math.atan2(ty - st.shipY, tx - st.shipX);
  if (!hit && target) a += (rand() < 0.5 ? -1 : 1) * (0.18 + rand() * 0.12);   // đạn trượt: lệch hẳn khỏi mục tiêu
  const s = BULLET_SPEED * st.h * (held ? 0.5 : 1);
  st.bullets.push({ x: st.shipX, y: st.shipY, vx: Math.cos(a) * s, vy: Math.sin(a) * s, target: target && hit ? target.uid : null, held });
  if (target && hit) target.pending++;
  st.aimTo = a;
  ev.push({ type: 'fire', x: st.shipX, y: st.shipY, a, hit });
}

/* Tô tiến độ: ứng viên hiện số chữ đã gõ, mục tiêu khác về chưa gõ */
function paintProgress(st, cands) {
  for (const t of st.targets) {
    if (!t.doomed) t.progress = cands.indexOf(t) >= 0 ? progressFor(t.text, st.typed.length) : skipFixed(t.text, 0);
  }
}

/* Đạn đang dẫn vào mục tiêu không còn là ứng viên (người chơi đổi ý) → sang mục tiêu mới, hoặc về chờ nếu chưa rõ */
function redirectBullets(st, cands, main) {
  for (const b of st.bullets) {
    const t = b.target && st.targets.find(x => x.uid === b.target);
    if (!t || t === main || t.doomed || cands.indexOf(t) >= 0) continue;
    t.pending--;
    if (main) { main.pending++; b.target = main.uid; } else { b.target = null; b.held = true; }
  }
}

/* Đã rõ mục tiêu: mọi viên đang chờ lao vào nó */
function releaseHeld(st, t) {
  for (const b of st.bullets) if (b.held) { b.held = false; b.target = t.uid; t.pending++; }
}

/* Bỏ ngang: đạn chờ tan thành tia lửa */
function fizzleHeld(st, ev) {
  st.bullets = st.bullets.filter(b => {
    if (b.held) ev.push({ type: 'hit', x: b.x, y: b.y, a: Math.PI / 2 });
    return !b.held;
  });
}

/* Gọi mỗi bước: ứng viên thay đổi do mục tiêu biến mất (chạm khiên) → còn 1 thì bắn vào nó, hết thì tan */
function settleHeld(st, ev) {
  if (!st.bullets.some(b => b.held)) return;
  const c = st.typed ? typingCandidates(st, st.typed) : [];
  if (!c.length) fizzleHeld(st, ev);
  else if (c.length === 1) { st.lock = c[0].uid; releaseHeld(st, c[0]); }
}

/* Gõ trọn từ của mục tiêu: nổ khi viên cuối tới; xoá chuỗi đang gõ */
function doomTarget(st, t) {
  t.doomed = true; t.progress = t.text.length;
  st.typed = ''; st.lock = null;
  paintProgress(st, []);
}

/* Gõ 1 ký tự. Trả { hit, target } (target = null khi đạn đang chờ vì chưa rõ từ) */
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
  if (!typed) {                                          // không khớp gì: đạn trượt, giữ nguyên chuỗi đang gõ
    const cur = st.targets.find(t => t.uid === st.lock);
    if (cur && ++cur.wrong === PLANE_WRONG_TO_MISS && st.miss.indexOf(cur.word.id) < 0) st.miss.push(cur.word.id);
    fire(st, cur || null, false, ev, rand);
    return { hit: false, target: cur || null, ev };
  }
  st.typed = typed;
  const exact = cands.filter(t => t.letters === typed), longer = cands.some(t => t.letters.length > typed.length);
  const complete = exact.length > 0 && !longer;          // gõ trọn từ, không còn từ dài hơn cùng đầu đang chờ
  const main = complete ? lowestTarget(exact) : cands.length === 1 ? cands[0] : null;   // null = chưa rõ, không chọn thay
  paintProgress(st, cands);
  redirectBullets(st, cands, main);
  st.lock = main ? main.uid : null;
  if (main) releaseHeld(st, main);
  fire(st, main, true, ev, rand);
  if (complete) doomTarget(st, main);
  return { hit: true, target: main, ev };
}

/* Enter: chuỗi đang gõ trùng trọn một từ → hạ từ đó ("give" khi có "give up"); không thì xoá chuỗi, đạn chờ tan */
function pressEnter(st, rand, ev) {
  ev = ev || []; rand = rand || Math.random;
  const exact = st.typed ? typingCandidates(st, st.typed).filter(t => t.letters === st.typed) : [];
  if (exact.length) {
    const t = lowestTarget(exact);
    redirectBullets(st, [t], t);
    releaseHeld(st, t);
    if (!t.pending) fire(st, t, true, ev, rand);        // đạn trước đã trúng hết: bắn thêm 1 viên để kích nổ
    doomTarget(st, t);
    return ev;
  }
  st.typed = ''; st.lock = null;
  paintProgress(st, []);
  fizzleHeld(st, ev);
  return ev;
}

if (typeof module !== 'undefined') module.exports = { typingCandidates, typeChar, pressEnter, settleHeld };
