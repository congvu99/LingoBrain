/* Game Pháp Sư Lexoria — ghép quái: chọn dáng (boss-game-monster-shapes.js) theo monster.shape, bóng đổ,
   nháy trắng khi trúng đòn, phủ băng khi đóng băng. drawMonster(ctx, q, monster, {t, hit, frozen, pose}):
   q = {x, y, s} (vị trí chân + chiều cao cơ sở, từ fx.layout.mon); monster = 1 phần tử BOSS_MONSTERS.
   Cần boss-game-story.js (BOSS_MONSTERS) và boss-game-monster-shapes.js. */

const BOSS_MONSTER_SHAPES = { humanoid: shapeHumanoid, beast: shapeBeast, wraith: shapeWraith, flyer: shapeFlyer, dragon: shapeDragon };

/* Dáng ra đòn khi đồng hồ trùm sắp hết (đòn tới gần) hoặc nháy đau khi vừa trúng phép; mặc định 'idle' */
function bossMonsterPose(st, fx) {
  if (fx.monHit > 0) return 'hurt';
  if (!st.frozen && st.clock / st.clockMax < 0.12) return 'attack';
  return 'idle';
}

function drawMonster(ctx, q, monster, o) {
  o = o || {};
  const t = o.t || 0, hit = o.hit || 0, frozen = !!o.frozen, pose = o.pose || 'idle';
  const s = q.s * (monster.size || 1);
  ctx.save();
  ctx.translate(q.x, q.y);
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath(); ctx.ellipse(0, 0, s * 0.32, s * 0.07, 0, 0, 6.283); ctx.fill();   // bóng đổ dưới chân
  const draw = BOSS_MONSTER_SHAPES[monster.shape] || shapeHumanoid;
  draw(ctx, s, monster, t, pose, frozen);
  if (hit > 0) {   // nháy trắng khi vừa trúng phép (không dùng pose 'hurt' đổi hình, chỉ phủ sáng cho rõ)
    ctx.globalAlpha = Math.min(1, hit * 4) * 0.7; ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(-s * 0.05, -s * 0.4, s * 0.42, s * 0.32, 0, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1;
  }
  if (frozen) {   // lớp băng phủ (đóng băng đồng hồ trùm — hiệu ứng Băng bậc 2 / Kỷ băng hà)
    ctx.globalAlpha = 0.25; ctx.fillStyle = '#bdf3ff';
    ctx.beginPath(); ctx.ellipse(-s * 0.05, -s * 0.4, s * 0.4, s * 0.46, 0, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1;
  }
  ctx.restore();
}
