/* Game Pháp Sư Lexoria — 5 dáng quái tham số bằng canvas path (không ảnh), nhìn nghiêng sang trái (về phía pháp sư).
   Mỗi hàm draw<Dáng>(ctx, s, m, t, pose, frozen): (0,0) = điểm chân (đã translate bởi drawMonster), s = chiều cao (px).
   m = quái (BOSS_MONSTERS), t = thời gian game (giây, đã nhân timeScale), pose 'idle'|'attack'|'hurt'.
   frozen → màu ngả xanh băng (đóng băng đồng hồ trùm). Cần boss-game-story.js (chỉ dùng field m.palette/m.features). */

/* Màu hiệu lực: đóng băng phủ tông xanh nhạt lên mọi quái, không đọc palette gốc */
function bossMonColors(p, frozen) {
  return frozen ? { body: '#8fd0ea', dark: '#4f92ab', accent: '#cfeffb', eye: '#e6fbff', skin: '#bfe3ee' } : p;
}
const bossEyeGlow = (ctx, x, y, r, color) => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill(); };

/* Người/xác sống/hiệp sĩ: goblin, vua goblin, xương, lich, hiệp sĩ đen, troll — thân đứng, đầu quay về pháp sư (trái) */
function shapeHumanoid(ctx, s, m, t, pose, frozen) {
  const c = bossMonColors(m.palette, frozen), f = m.features || {}, bob = Math.sin(t * 2.2) * s * 0.02;
  const lean = pose === 'attack' ? -0.16 : 0;
  ctx.save(); ctx.rotate(lean);
  ctx.fillStyle = c.dark;
  [-0.14, 0.06].forEach(lx => ctx.fillRect(lx * s - s * 0.05, -s * 0.22 + bob, s * 0.1, s * 0.22));   // chân
  ctx.fillStyle = c.body;
  if (f.bones) {   // lồng ngực xương + xương sườn kẻ ngang
    ctx.beginPath(); ctx.moveTo(-s * 0.14, -s * 0.22 + bob); ctx.lineTo(s * 0.12, -s * 0.22 + bob);
    ctx.lineTo(s * 0.1, -s * 0.5 + bob); ctx.lineTo(-s * 0.12, -s * 0.5 + bob); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = c.dark; ctx.lineWidth = Math.max(1, s * 0.012);
    for (let i = 0; i < 4; i++) { const ry = -s * 0.26 - i * s * 0.055 + bob; ctx.beginPath(); ctx.moveTo(-s * 0.11, ry); ctx.lineTo(s * 0.09, ry); ctx.stroke(); }
  } else {
    ctx.beginPath(); ctx.ellipse(-s * 0.02, -s * 0.36 + bob, s * 0.17, s * 0.2, 0, 0, 6.283); ctx.fill();
  }
  if (f.armor) {   // giáp bản trước ngực + vai nhọn
    ctx.fillStyle = c.accent; ctx.fillRect(-s * 0.14, -s * 0.46 + bob, s * 0.24, s * 0.14);
    ctx.beginPath(); ctx.moveTo(-s * 0.18, -s * 0.5 + bob); ctx.lineTo(-s * 0.06, -s * 0.56 + bob); ctx.lineTo(-s * 0.06, -s * 0.42 + bob); ctx.closePath(); ctx.fill();
  }
  if (f.club) { ctx.strokeStyle = c.dark; ctx.lineWidth = s * 0.06; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(s * 0.14, -s * 0.3 + bob); ctx.lineTo(s * 0.3, -s * 0.02 + bob); ctx.stroke();
    ctx.fillStyle = c.dark; ctx.beginPath(); ctx.arc(s * 0.3, -s * 0.02 + bob, s * 0.08, 0, 6.283); ctx.fill(); }
  if (f.cloak) { ctx.globalAlpha = 0.9; ctx.fillStyle = c.dark;
    ctx.beginPath(); ctx.moveTo(s * 0.06, -s * 0.5 + bob); ctx.quadraticCurveTo(s * 0.22, -s * 0.2 + bob, s * 0.1, bob);
    ctx.lineTo(-s * 0.02, -s * 0.15 + bob); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; }
  const hx = -s * 0.28, hy = -s * 0.56 + bob;
  ctx.fillStyle = c.skin; ctx.beginPath(); ctx.arc(hx, hy, s * 0.13, 0, 6.283); ctx.fill();
  if (f.horns) { ctx.fillStyle = c.accent;
    [[-0.06, -0.05], [0.02, -0.03]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.moveTo(hx + dx * s, hy + dy * s);
      ctx.lineTo(hx + dx * s - s * 0.04, hy + dy * s - s * 0.09); ctx.lineTo(hx + dx * s + s * 0.02, hy + dy * s - s * 0.02); ctx.closePath(); ctx.fill(); }); }
  if (f.hood) { ctx.fillStyle = c.dark; ctx.beginPath(); ctx.arc(hx, hy - s * 0.01, s * 0.16, Math.PI * 0.55, Math.PI * 2.05); ctx.fill(); }
  if (f.crown) { ctx.fillStyle = '#f5d76a'; ctx.fillRect(hx - s * 0.1, hy - s * 0.16, s * 0.2, s * 0.05);
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(hx - s * 0.08 + i * s * 0.08, hy - s * 0.16);
      ctx.lineTo(hx - s * 0.04 + i * s * 0.08, hy - s * 0.26); ctx.lineTo(hx + i * s * 0.08, hy - s * 0.16); ctx.fill(); } }
  bossEyeGlow(ctx, hx - s * 0.04, hy - s * 0.01, s * 0.022, c.eye);
  ctx.restore();
}

/* Thú bốn chân: sói — thân nằm ngang, đầu chúc về trái, đuôi vẫy */
function shapeBeast(ctx, s, m, t, pose, frozen) {
  const c = bossMonColors(m.palette, frozen), bob = Math.sin(t * 2.6) * s * 0.015, lean = pose === 'attack' ? -0.14 : 0;
  ctx.save(); ctx.rotate(lean);
  ctx.fillStyle = c.dark;
  [-0.16, 0, 0.12, 0.22].forEach(lx => ctx.fillRect(lx * s - s * 0.03, -s * 0.16 + bob, s * 0.06, s * 0.16));   // 4 chân
  ctx.fillStyle = c.body;
  ctx.beginPath(); ctx.ellipse(0, -s * 0.28 + bob, s * 0.28, s * 0.14, 0, 0, 6.283); ctx.fill();   // thân
  ctx.beginPath(); ctx.ellipse(-s * 0.28, -s * 0.34 + bob, s * 0.13, s * 0.11, -0.25, 0, 6.283); ctx.fill();   // đầu (mõm hướng trái)
  ctx.fillStyle = c.accent;
  ctx.beginPath(); ctx.moveTo(-s * 0.4, -s * 0.32 + bob); ctx.lineTo(-s * 0.5, -s * 0.28 + bob); ctx.lineTo(-s * 0.36, -s * 0.24 + bob); ctx.fill();   // mõm
  const tailWag = Math.sin(t * 5) * 0.15;
  ctx.strokeStyle = c.dark; ctx.lineWidth = s * 0.04; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(s * 0.24, -s * 0.3 + bob); ctx.quadraticCurveTo(s * 0.4, -s * 0.4 + bob + tailWag * s, s * 0.44, -s * 0.5 + bob); ctx.stroke();
  ctx.fillStyle = c.dark;   // tai vểnh
  [[-0.32, -0.44, -0.28, -0.5], [-0.22, -0.44, -0.2, -0.5]].forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath(); ctx.moveTo(x1 * s, y1 * s + bob); ctx.lineTo(x2 * s, y2 * s + bob); ctx.lineTo((x1 + 0.04) * s, y1 * s + bob); ctx.fill(); });
  bossEyeGlow(ctx, -s * 0.34, -s * 0.36 + bob, s * 0.018, c.eye);
  ctx.restore();
}

/* Bóng ma: vạt áo rách lơ lửng, nửa trong suốt, không chân — trôi nhẹ theo t */
function shapeWraith(ctx, s, m, t, pose, frozen) {
  const c = bossMonColors(m.palette, frozen), float = Math.sin(t * 1.6) * s * 0.05;
  ctx.save(); ctx.globalAlpha = 0.78;
  ctx.fillStyle = c.body;
  ctx.beginPath(); ctx.moveTo(-s * 0.22, -s * 0.55 + float); ctx.quadraticCurveTo(-s * 0.32, -s * 0.2 + float, -s * 0.26, -s * 0.02 + float);
  ctx.lineTo(-s * 0.14, -s * 0.14 + float); ctx.lineTo(-s * 0.02, -s * 0.02 + float); ctx.lineTo(s * 0.1, -s * 0.16 + float);
  ctx.lineTo(s * 0.2, -s * 0.02 + float); ctx.quadraticCurveTo(s * 0.28, -s * 0.24 + float, s * 0.18, -s * 0.56 + float);
  ctx.quadraticCurveTo(-s * 0.02, -s * 0.64 + float, -s * 0.22, -s * 0.55 + float); ctx.closePath(); ctx.fill();
  ctx.fillStyle = c.accent; ctx.globalAlpha = 0.35;
  ctx.beginPath(); ctx.ellipse(-s * 0.04, -s * 0.42 + float, s * 0.16, s * 0.12, 0, 0, 6.283); ctx.fill();
  ctx.globalAlpha = 1;
  bossEyeGlow(ctx, -s * 0.1, -s * 0.44 + float, s * 0.02, c.eye);
  bossEyeGlow(ctx, s * 0.02, -s * 0.44 + float, s * 0.02, c.eye);
  ctx.restore();
}

/* Bay: harpy (chim-người, mỏ+lông vũ), wyvern (vảy, đuôi dài) — cánh vỗ theo t, lượn lên xuống */
function shapeFlyer(ctx, s, m, t, pose, frozen) {
  const c = bossMonColors(m.palette, frozen), f = m.features || {};
  const flap = Math.sin(t * (pose === 'attack' ? 10 : 5)), hover = Math.sin(t * 1.4) * s * 0.06;
  ctx.save(); ctx.translate(0, hover);
  ctx.fillStyle = c.dark;   // cánh sau (khép/mở theo flap)
  ctx.beginPath(); ctx.moveTo(s * 0.02, -s * 0.42); ctx.quadraticCurveTo(s * 0.3, -s * 0.5 - flap * s * 0.16, s * 0.4, -s * 0.2 - flap * s * 0.1);
  ctx.quadraticCurveTo(s * 0.2, -s * 0.28, s * 0.02, -s * 0.32); ctx.closePath(); ctx.fill();
  ctx.fillStyle = c.body;   // thân
  ctx.beginPath(); ctx.ellipse(-s * 0.02, -s * 0.36, s * 0.18, s * 0.16, 0, 0, 6.283); ctx.fill();
  ctx.fillStyle = c.accent;   // cánh trước (nổi bật hơn)
  ctx.beginPath(); ctx.moveTo(-s * 0.02, -s * 0.42); ctx.quadraticCurveTo(-s * 0.3, -s * 0.52 - flap * s * 0.18, -s * 0.44, -s * 0.22 - flap * s * 0.12);
  ctx.quadraticCurveTo(-s * 0.22, -s * 0.3, -s * 0.02, -s * 0.32); ctx.closePath(); ctx.fill();
  if (f.tail) { ctx.strokeStyle = c.body; ctx.lineWidth = s * 0.05; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(s * 0.14, -s * 0.32); ctx.quadraticCurveTo(s * 0.34, -s * 0.2, s * 0.32, s * 0.02); ctx.stroke(); }
  const hx = -s * 0.24, hy = -s * 0.46;
  ctx.fillStyle = f.scales ? c.body : c.skin; ctx.beginPath(); ctx.arc(hx, hy, s * 0.1, 0, 6.283); ctx.fill();
  ctx.fillStyle = c.accent;   // mỏ hoặc mõm
  ctx.beginPath(); ctx.moveTo(hx - s * 0.09, hy); ctx.lineTo(hx - s * 0.18, hy + (f.beak ? -s * 0.01 : s * 0.03)); ctx.lineTo(hx - s * 0.08, hy + s * 0.05); ctx.fill();
  bossEyeGlow(ctx, hx - s * 0.02, hy - s * 0.02, s * 0.018, c.eye);
  ctx.restore();
}

/* Rồng: rồng con, Oblivion — thân dài 4 chân, cánh lớn, đầu sừng, hơi thở phát sáng nơi mõm; Oblivion thêm gai vương miện + mắt rune */
function shapeDragon(ctx, s, m, t, pose, frozen) {
  const c = bossMonColors(m.palette, frozen), f = m.features || {}, bob = Math.sin(t * 1.8) * s * 0.02;
  const flap = Math.sin(t * (pose === 'attack' ? 8 : 3.4));
  ctx.save();
  ctx.fillStyle = c.dark;
  [-0.14, 0.08, 0.2].forEach(lx => ctx.fillRect(lx * s - s * 0.04, -s * 0.2 + bob, s * 0.08, s * 0.2));   // chân
  if (f.wings) { ctx.fillStyle = c.dark; ctx.globalAlpha = 0.92;
    ctx.beginPath(); ctx.moveTo(s * 0.02, -s * 0.5 + bob); ctx.quadraticCurveTo(s * 0.34, -s * 0.62 - flap * s * 0.14, s * 0.46, -s * 0.28 - flap * s * 0.08);
    ctx.quadraticCurveTo(s * 0.22, -s * 0.34, s * 0.02, -s * 0.38 + bob); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; }
  ctx.fillStyle = c.body;   // thân dài
  ctx.beginPath(); ctx.ellipse(0, -s * 0.32 + bob, s * 0.3, s * 0.19, 0, 0, 6.283); ctx.fill();
  ctx.strokeStyle = c.body; ctx.lineWidth = s * 0.07; ctx.lineCap = 'round';   // đuôi
  ctx.beginPath(); ctx.moveTo(s * 0.24, -s * 0.3 + bob); ctx.quadraticCurveTo(s * 0.5, -s * 0.2 + bob, s * 0.52, s * 0.02 + bob); ctx.stroke();
  if (f.wings) { ctx.fillStyle = c.accent;   // cánh trước, hắt sáng
    ctx.beginPath(); ctx.moveTo(-s * 0.04, -s * 0.48 + bob); ctx.quadraticCurveTo(-s * 0.32, -s * 0.6 - flap * s * 0.16, -s * 0.46, -s * 0.26 - flap * s * 0.1);
    ctx.quadraticCurveTo(-s * 0.2, -s * 0.32, -s * 0.04, -s * 0.36 + bob); ctx.closePath(); ctx.fill(); }
  const hx = -s * 0.32, hy = -s * 0.44 + bob;
  ctx.fillStyle = c.skin; ctx.beginPath(); ctx.ellipse(hx, hy, s * 0.13, s * 0.1, 0, 0, 6.283); ctx.fill();
  ctx.fillStyle = c.accent;   // sừng
  [[-0.05, -0.08], [0.03, -0.06]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.moveTo(hx + dx * s, hy + dy * s);
    ctx.lineTo(hx + dx * s - s * 0.03, hy + dy * s - s * 0.1); ctx.lineTo(hx + dx * s + s * 0.02, hy + dy * s - s * 0.02); ctx.closePath(); ctx.fill(); });
  if (f.crownSpikes) { ctx.fillStyle = c.accent;   // Oblivion: vòng gai quanh đầu
    for (let i = 0; i < 5; i++) { const a = -Math.PI * 0.9 + i * 0.32;
      ctx.beginPath(); ctx.moveTo(hx + Math.cos(a) * s * 0.12, hy + Math.sin(a) * s * 0.12);
      ctx.lineTo(hx + Math.cos(a) * s * 0.24, hy + Math.sin(a) * s * 0.24); ctx.lineTo(hx + Math.cos(a + 0.14) * s * 0.12, hy + Math.sin(a + 0.14) * s * 0.12); ctx.fill(); } }
  const glow = pose === 'attack' ? 1.6 : 1;   // hơi thở phát sáng nơi mõm
  ctx.globalCompositeOperation = 'lighter';
  const og = ctx.createRadialGradient(hx - s * 0.16, hy + s * 0.02, 0, hx - s * 0.16, hy + s * 0.02, s * 0.1 * glow);
  og.addColorStop(0, '#ffffff'); og.addColorStop(0.4, c.eye); og.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = og; ctx.beginPath(); ctx.arc(hx - s * 0.16, hy + s * 0.02, s * 0.1 * glow, 0, 6.283); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  bossEyeGlow(ctx, hx - s * 0.03, hy - s * 0.02, s * 0.02, c.eye);
  if (f.runes) bossEyeGlow(ctx, hx + s * 0.02, hy - s * 0.06, s * 0.012, c.eye);   // Oblivion: thêm mắt rune nhỏ
  ctx.restore();
}
