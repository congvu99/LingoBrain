/* Game Pháp Sư Lexoria — diễn viên sprite góc Pokémon: pháp sư quay lưng (dưới-trái), quái quay mặt (trên-phải).
   Sprite ít khung nên chuyển động bù bằng code: nhún, lao, giật lùi, nháy trắng, tan thành ô pixel.
   Trạng thái nằm ở fx.actor (createBossActors), cập nhật theo event trận qua bossActorEvent (gọi cuối bossFxEvent)
   — chỉ đọc event, không đổi state trận. VFX sprite một lượt (nổ/lửa/khói) nằm ở fx.sprites.
   Mọi vùng/quái đều dùng sprite (từ phase 3). Cần boss-game-sprite-atlas.js + boss-game-dragon-composite.js. */

const BOSS_LUNGE_S = 0.42, BOSS_RECOIL_S = 0.22, BOSS_FLASH_S = 0.18, BOSS_CAST_S = 0.32;

function createBossActors() {
  // hitAnimT lớn (đã "xong") ngay từ đầu để bossMonSpriteVariant không lầm tưởng đang trúng đòn
  return { mon: { lunge: 0, recoil: 0, flash: 0, dead: false, pieces: [], hitAnimT: 999 }, mage: { recoil: 0, flash: 0, cast: 0 } };
}

const bossMageSprite = gender => (gender === 'm' ? 'mageM' : 'mageF');

/* Điểm phép phóng ra: phía trên vai phải pháp sư (quay lưng, nhìn về quái) */
function bossMageCastPoint(m) { return { x: m.x + m.s * 0.18, y: m.y - m.s * 0.78 }; }

/* VFX sprite một lượt tại tâm (x, y); scale nguyên */
function bossSpawnSprite(fx, name, x, y, scale, delay) {
  fx.sprites.push({ name, x, y, scale: Math.max(1, Math.round(scale)), t: -(delay || 0) });
}

function bossActorEvent(fx, e, st) {
  const A = fx.actor, L = fx.layout, q = L.mon;
  const el = e.element || st.mods.element, mul = e.tier === 3 ? 2 : e.tier === 2 ? 1.5 : 1;
  if (e.type === 'cast') {
    A.mage.cast = BOSS_CAST_S;
    if (el === 'fire') fx.shots.forEach(s => { if (s.id === fx.castN) s.sprite = 'fireball'; });
  } else if (e.type === 'impact') {
    A.mon.hitAnimT = 0;   // mốc bắt đầu hoạt ảnh Hit riêng (nếu quái có spriteHit) — xem drawBossMonsterSprite
    A.mon.flash = BOSS_FLASH_S; A.mon.recoil = BOSS_RECOIL_S;
    if (el === 'fire') {
      const cy = q.y - q.s * 0.45;
      bossSpawnSprite(fx, 'explosion', q.x, cy, pixelScale(q.s * 0.8, 40) * mul);
      bossSpawnSprite(fx, 'flam', q.x, q.y - q.s * 0.3, pixelScale(q.s * 0.55, 30) * mul, 0.08);
    }
  } else if (e.type === 'hurt') {
    A.mon.lunge = BOSS_LUNGE_S;
    A.mage.flash = 0.35; A.mage.recoil = 0.3;
  }
  // đòn hạ gục (hp về 0 ngay tại impact) tan luôn, không đứng chờ endDelayMs; 'won' bắt các đường khác (cháy)
  if ((e.type === 'impact' && e.hp <= 0) || e.type === 'won') bossMonsterDissolve(fx);
}

/* Mảnh pixel của MỘT sprite (name) tại tâm (cx, cy, đã có k) — step = số px gộp (mảnh to đỡ rời rạc, xem #5).
   vx/vy toả ra hai bên theo vị trí ngang trong khung, bay lên như tro. */
function bossDissolvePiecesOf(name, cx, cy, k) {
  const def = BOSS_SPRITES[name];
  if (!def) return [];
  const step = Math.max(1, Math.round(def.fw / 16)), left = cx - def.fw * k / 2, top = cy - def.fh * k / 2;
  return bossSpritePixels(name, 'idle', 0, step).map(p => ({
    x: left + p.x * k, y: top + p.y * k, step, vx: (p.x - def.fw / 2) * 9 + (Math.random() - 0.5) * 40,
    vy: -30 - Math.random() * 70, life: 0.7 + Math.random() * 0.7, max: 1.4, color: p.color
  }));
}

/* Quái tan thành ô pixel (màu lấy từ khung sprite) bay lên như tro + khói; chỉ một lần.
   Oblivion (ghép mảnh) tan cả 5 mảnh đúng vị trí thật trên khung hình — dùng lại layout của
   drawBossDragonComposite (bossOblivionLayout, boss-game-dragon-composite.js) chứ không chỉ mỗi đầu. */
function bossMonsterDissolve(fx) {
  const A = fx.actor.mon, q = fx.layout.mon;
  if (A.dead) return;
  A.dead = true;
  if (q.sprite === 'oblivion' && typeof bossOblivionLayout === 'function') {
    const L = bossOblivionLayout(q.x, q.y, q.k, 0);
    A.pieces = ['oblivionBodyEnd', 'oblivionBody2', 'oblivionBody1', 'oblivionHead'].map((name, i) =>
      bossDissolvePiecesOf(name, [L.tail, L.body2, L.body1, L.head][i].x, [L.tail, L.body2, L.body1, L.head][i].y, q.k))
      .concat([bossDissolvePiecesOf('oblivionWing', L.wingL.x, L.wingL.y, q.k), bossDissolvePiecesOf('oblivionWing', L.wingR.x, L.wingR.y, q.k)])
      .flat();
  } else {
    A.pieces = q.sprite ? bossDissolvePiecesOf(q.sprite, q.x, q.y - ((BOSS_SPRITES[q.sprite] && BOSS_SPRITES[q.sprite].fh) || 16) * q.k / 2, q.k) : [];
  }
  bossSpawnSprite(fx, 'smoke', q.x, q.y - q.s * 0.35, pixelScale(q.s * 0.9, 32));
}

function stepBossActors(fx, dtReal) {
  const A = fx.actor;
  ['lunge', 'recoil', 'flash'].forEach(k => { A.mon[k] = Math.max(0, A.mon[k] - dtReal); });
  A.mon.hitAnimT += dtReal;   // đếm lên từ mốc trúng đòn (impact) — dùng làm t riêng cho spriteHit
  ['recoil', 'flash', 'cast'].forEach(k => { A.mage[k] = Math.max(0, A.mage[k] - dtReal); });
  A.mon.pieces = A.mon.pieces.filter(p => {
    p.life -= dtReal; p.x += p.vx * dtReal; p.y += p.vy * dtReal; p.vy -= 40 * dtReal;   // bay lên như tro
    return p.life > 0;
  });
  fx.sprites = fx.sprites.filter(s => { s.t += dtReal; return !spriteAnimDone(BOSS_SPRITES[s.name], 'idle', s.t); });
}

/* Bóng elip bằng ô pixel (unit px/ô) — cùng độ thô với sprite, không nhoè như ellipse() */
function bossPixelShadow(ctx, cx, cy, rw, unit) {
  ctx.fillStyle = 'rgba(20,12,30,.35)';
  const rows = 2;
  for (let j = -rows; j <= rows; j++) {
    const half = Math.round(rw * Math.sqrt(1 - (j / (rows + 0.5)) ** 2) / unit) * unit;
    ctx.fillRect(Math.round(cx - half), Math.round(cy + j * unit - unit / 2), half * 2, unit);
  }
}

/* Trùm có sheet Hit thật (Idle luôn có) → còn đang chạy hoạt ảnh Hit (loop:false, tính từ A.hitAnimT, mốc 0 đặt
   lúc impact) thì đổi sang sheet đó; Attack tương tự nhưng theo trạng thái "sắp ra đòn"/lao. Không có (quái 16px
   thường) → q.sprite mặc định. */
function bossMonSpriteVariant(q, A, angry) {
  if (q.spriteHit && bossSpriteReady(q.spriteHit) && !spriteAnimDone(BOSS_SPRITES[q.spriteHit], 'idle', A.hitAnimT)) return q.spriteHit;
  if ((angry || A.lunge > 0) && q.spriteAttack && bossSpriteReady(q.spriteAttack)) return q.spriteAttack;
  return q.sprite;
}

/* Quái: nhún theo anim sprite, giật lùi khi trúng, lao về phía pháp sư khi ra đòn, phủ băng khi đóng băng.
   Oblivion (rồng ghép mảnh) đi qua drawBossDragonComposite thay vì drawSprite thường.
   Ảnh chưa nạp xong (mạng lỗi/offline lần đầu — hiếm vì mọi ảnh đã precache trong sw.js) → trả false, bỏ qua vẽ
   lượt đó; trận vẫn chơi được qua HP/đồng hồ, không có phương án vẽ tay thay thế (đã xoá ở phase 3, cố ý). */
function drawBossMonsterSprite(ctx, fx, st, t) {
  const q = fx.layout.mon, m = fx.layout.mage, A = fx.actor.mon;
  if (A.dead) {
    for (const p of A.pieces) {
      ctx.globalAlpha = Math.min(1, p.life / p.max * 2); ctx.fillStyle = p.color;
      const s = q.k * (p.step || 1);
      ctx.fillRect(Math.round(p.x), Math.round(p.y), s, s);
    }
    ctx.globalAlpha = 1;
    return true;
  }
  if (!q.sprite || !bossSpriteReady(q.sprite)) return false;
  let x = q.x, y = q.y;
  const calm = fx.reduced;   // giảm chuyển động: bỏ lao/giật/rung, vẫn giữ nháy màu
  if (A.lunge > 0 && !calm) { const k = Math.sin((1 - A.lunge / BOSS_LUNGE_S) * Math.PI) * 0.35; x += (m.x - q.x) * k; y += (m.y - q.y) * k; }
  if (A.recoil > 0 && !calm) { const k = Math.ceil(A.recoil / BOSS_RECOIL_S * 3) * q.k; x += k; y -= k / 2; }
  const angry = !st.frozen && st.clock / st.clockMax < 0.12;   // đòn sắp tới: rung nhẹ + nhún nhanh
  if (angry && !calm) x += (Math.floor(t * 20) % 2 ? 1 : -1) * q.k;
  bossPixelShadow(ctx, x, q.y, q.s * 0.36, q.k);
  const variant = bossMonSpriteVariant(q, A, angry), usingHit = variant === q.spriteHit;
  // sheet Hit có t riêng (từ mốc trúng đòn, không lệ thuộc đồng hồ trận) để chạy đủ khung dù ngắn/dài hơn 1 lượt vẽ
  const frameT = usingHit ? A.hitAnimT : st.frozen ? 0 : angry ? t * 2 : t;
  const opt = usingHit ? { flash: 0.4 } : A.flash > 0 ? { flash: 0.9 } : st.frozen ? { flash: 0.45, tint: '#bdf3ff' } : {};
  if (q.sprite === 'oblivion' && typeof drawBossDragonComposite === 'function') {
    drawBossDragonComposite(ctx, x, y, q.k, st.frozen ? 0 : t, Object.assign({ reduced: fx.reduced }, opt));
  } else drawSprite(ctx, variant, 'idle', frameT, x, y, q.k, opt);
  return true;
}

/* Pháp sư quay lưng: đứng nhún 1px, niệm = nhún nhanh hơn, ra đòn = khung Attack + nhích về phía quái, trúng đòn = nháy đỏ + lùi */
function drawBossMageSprite(ctx, fx, st, gender, t) {
  const m = fx.layout.mage, A = fx.actor.mage, name = bossMageSprite(gender);
  if (!bossSpriteReady(name)) return false;
  const chant = st.typed.length > 0, bob = fx.reduced ? 0 : Math.floor(t * (chant ? 6 : 2)) % 2 * m.k;
  let x = m.x, y = m.y - bob;
  if (A.cast > 0 && !fx.reduced) { const k = Math.sin((1 - A.cast / BOSS_CAST_S) * Math.PI) * 3 * m.k; x += k; y -= k; }
  if (A.recoil > 0 && !fx.reduced) { const k = Math.ceil(A.recoil / 0.3 * 3) * m.k; x -= k; y += k / 2; }
  bossPixelShadow(ctx, m.x, m.y, m.s * 0.34, m.k);
  drawSprite(ctx, name, A.cast > 0 ? 'attack' : 'idle', t, x, y, m.k, A.flash > 0 ? { flash: 0.7, tint: '#ff5a6a' } : null);
  return true;
}

/* Đạn sprite (Fireball) dọc đường cong của shot; đầu đạn quay theo hướng bay (sprite gốc hướng lên) */
function drawBossShotSprite(ctx, s, x, y, k) {
  const dx = s.x1 - s.x0, dy = (s.y1 - s.y0) - Math.cos(k * Math.PI) * Math.PI * 30;
  const scale = Math.max(1, Math.round(pixelScale(s.p.projectile.size * 4, 16) * s.scale));   // bậc 1/2/3 ≈ 32/48/64px
  return drawSprite(ctx, s.sprite, 'idle', s.t, x, y, scale, { center: true, rot: Math.atan2(dy, dx) + Math.PI / 2 });
}

function drawBossSpriteFx(ctx, fx) {
  for (const s of fx.sprites) if (s.t >= 0) drawSprite(ctx, s.name, 'idle', s.t, s.x, s.y, s.scale, { center: true });
}
