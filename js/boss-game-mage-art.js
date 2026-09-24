/* Game Pháp Sư Lexoria — vẽ pháp sư bằng canvas path (không ảnh). Nhìn nghiêng sang phải (về phía quái).
   drawMage(ctx, x, y, s, {gender, pose, t, element}) — (x, y) = điểm chân, s = chiều cao nhân vật (px).
   gender 'm': mũ nhọn vành rộng + râu ngắn; 'f': mũ trùm + tóc dài. Trượng gắn ngọc màu hệ.
   pose: 'idle' (thở nhẹ) · 'chant' (giơ trượng, ngọc rực) · 'cast' (đẩy trượng về phía trước) · 'hurt' (ngả ra sau, ửng đỏ).
   t = thời gian game (giây) — đã nhân timeScale nên chậm thời gian thì pháp sư cũng chậm. Cần boss-game-spell-presets.js. */

const MAGE_ROBE = { m: ['#3b2f7a', '#5a48b0'], f: ['#6a2f6e', '#a24aa6'] };
const MAGE_SKIN = '#f2c9a0';

function drawMage(ctx, x, y, s, o) {
  const g = o.gender === 'm' ? 'm' : 'f', pose = o.pose || 'idle', t = o.t || 0;
  const orb = BOSS_ELEMENT_COLOR[o.element] || BOSS_ELEMENT_COLOR.fire;
  const breathe = Math.sin(t * 2.2) * s * 0.012;
  const lean = pose === 'hurt' ? -0.18 : pose === 'cast' ? 0.1 : 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(lean);
  // bóng dưới chân
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath(); ctx.ellipse(0, 0, s * 0.26, s * 0.05, 0, 0, 6.283); ctx.fill();

  const top = -s * 0.62 + breathe;   // vai
  // tóc dài (nữ) nằm sau áo
  if (g === 'f') {
    ctx.fillStyle = '#4a2a1a';
    ctx.beginPath(); ctx.moveTo(-s * 0.1, top - s * 0.12); ctx.quadraticCurveTo(-s * 0.2, top + s * 0.2, -s * 0.12, top + s * 0.32);
    ctx.lineTo(s * 0.02, top + s * 0.1); ctx.closePath(); ctx.fill();
  }
  // áo choàng: hình chuông, vạt lay theo gió
  const sway = Math.sin(t * 1.6) * s * 0.02;
  const grad = ctx.createLinearGradient(0, top, 0, 0);
  grad.addColorStop(0, MAGE_ROBE[g][1]); grad.addColorStop(1, MAGE_ROBE[g][0]);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(-s * 0.08, top);
  ctx.quadraticCurveTo(-s * 0.2, -s * 0.25, -s * 0.24 + sway, -s * 0.01);
  ctx.lineTo(s * 0.22 + sway, -s * 0.01);
  ctx.quadraticCurveTo(s * 0.17, -s * 0.28, s * 0.08, top);
  ctx.closePath(); ctx.fill();
  // viền vàng vạt áo + thắt lưng
  ctx.strokeStyle = '#e8c46a'; ctx.lineWidth = Math.max(1, s * 0.012);
  ctx.beginPath(); ctx.moveTo(-s * 0.24 + sway, -s * 0.01); ctx.lineTo(s * 0.22 + sway, -s * 0.01); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-s * 0.12, top + s * 0.2); ctx.lineTo(s * 0.12, top + s * 0.2); ctx.stroke();

  // đầu
  const hx = s * 0.01, hy = top - s * 0.08;
  ctx.fillStyle = MAGE_SKIN;
  ctx.beginPath(); ctx.arc(hx, hy, s * 0.075, 0, 6.283); ctx.fill();
  ctx.fillStyle = '#2a1a10';
  ctx.beginPath(); ctx.arc(hx + s * 0.035, hy - s * 0.005, s * 0.01, 0, 6.283); ctx.fill();   // mắt
  if (g === 'm') {
    ctx.fillStyle = '#d9d2c5';   // râu ngắn
    ctx.beginPath(); ctx.moveTo(hx - s * 0.03, hy + s * 0.04); ctx.quadraticCurveTo(hx + s * 0.04, hy + s * 0.13, hx + s * 0.07, hy + s * 0.03); ctx.fill();
    // mũ nhọn vành rộng, chóp gập theo nhịp thở
    ctx.fillStyle = MAGE_ROBE.m[0];
    ctx.beginPath(); ctx.ellipse(hx, hy - s * 0.05, s * 0.14, s * 0.03, 0, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.moveTo(hx - s * 0.08, hy - s * 0.06); ctx.lineTo(hx + s * 0.08, hy - s * 0.06);
    ctx.quadraticCurveTo(hx + s * 0.02, hy - s * 0.2, hx - s * 0.09 + breathe * 2, hy - s * 0.27); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e8c46a'; ctx.fillRect(hx - s * 0.075, hy - s * 0.085, s * 0.15, s * 0.02);
  } else {
    // mũ trùm ôm đầu, hở mặt
    ctx.fillStyle = MAGE_ROBE.f[1];
    ctx.beginPath(); ctx.arc(hx - s * 0.01, hy - s * 0.005, s * 0.1, Math.PI * 0.62, Math.PI * 2.1); ctx.quadraticCurveTo(hx + s * 0.02, hy - s * 0.02, hx - s * 0.02, hy + s * 0.1); ctx.fill();
    ctx.fillStyle = '#4a2a1a';
    ctx.beginPath(); ctx.arc(hx + s * 0.01, hy - s * 0.045, s * 0.055, Math.PI, Math.PI * 1.9); ctx.fill();   // tóc mái
  }

  // trượng: vị trí tay + góc theo pose
  const arm = pose === 'chant' ? { x: s * 0.14, y: top - s * 0.02, a: -0.25 } : pose === 'cast' ? { x: s * 0.24, y: top + s * 0.06, a: 0.75 }
    : pose === 'hurt' ? { x: s * 0.1, y: top + s * 0.14, a: -0.5 } : { x: s * 0.16, y: top + s * 0.14, a: 0.08 };
  ctx.strokeStyle = MAGE_ROBE[g][1]; ctx.lineWidth = s * 0.05; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(s * 0.04, top + s * 0.05); ctx.lineTo(arm.x, arm.y); ctx.stroke();   // tay áo
  ctx.save();
  ctx.translate(arm.x, arm.y); ctx.rotate(arm.a);
  ctx.strokeStyle = '#7a5230'; ctx.lineWidth = s * 0.024;
  ctx.beginPath(); ctx.moveTo(0, s * 0.3); ctx.lineTo(0, -s * 0.28); ctx.stroke();
  ctx.strokeStyle = '#e8c46a'; ctx.lineWidth = s * 0.012;   // móc giữ ngọc
  ctx.beginPath(); ctx.arc(0, -s * 0.32, s * 0.045, Math.PI * 0.15, Math.PI * 0.85, true); ctx.stroke();
  const glow = pose === 'chant' ? 1 + Math.sin(t * 12) * 0.25 : pose === 'cast' ? 1.4 : 0.7;
  ctx.globalCompositeOperation = 'lighter';
  const og = ctx.createRadialGradient(0, -s * 0.33, 0, 0, -s * 0.33, s * 0.12 * glow);
  og.addColorStop(0, '#ffffff'); og.addColorStop(0.3, orb); og.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = og; ctx.beginPath(); ctx.arc(0, -s * 0.33, s * 0.12 * glow, 0, 6.283); ctx.fill();
  ctx.restore();
  ctx.fillStyle = MAGE_SKIN;
  ctx.beginPath(); ctx.arc(arm.x, arm.y, s * 0.028, 0, 6.283); ctx.fill();   // bàn tay

  if (pose === 'hurt') {   // ửng đỏ khi trúng đòn (elip mờ phủ thân, không tô ra nền)
    ctx.fillStyle = 'rgba(255,60,80,.28)';
    ctx.beginPath(); ctx.ellipse(0, -s * 0.4, s * 0.22, s * 0.42, 0, 0, 6.283); ctx.fill();
  }
  ctx.restore();
}

/* Đầu trượng (toạ độ canvas) theo pose — nơi phép phóng ra; khớp phép quay trong drawMage */
function mageStaffTip(x, y, s, pose) {
  const top = -s * 0.62;
  const arm = pose === 'chant' ? { x: s * 0.14, y: top - s * 0.02, a: -0.25 } : pose === 'cast' ? { x: s * 0.24, y: top + s * 0.06, a: 0.75 }
    : { x: s * 0.16, y: top + s * 0.14, a: 0.08 };
  const lean = pose === 'cast' ? 0.1 : 0, r = s * 0.33;
  const lx = arm.x + Math.sin(arm.a) * r, ly = arm.y - Math.cos(arm.a) * r;
  return { x: x + lx * Math.cos(lean) - ly * Math.sin(lean), y: y + lx * Math.sin(lean) + ly * Math.cos(lean) };
}
