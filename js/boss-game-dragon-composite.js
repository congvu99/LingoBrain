/* Game Pháp Sư Lexoria — Oblivion (trùm chương 4): rồng ghép mảnh tĩnh (Head/Wing/Body1/Body2/BodyEnd, ảnh gốc
   DragonBlue của gói Ninja Adventure vốn vẽ tư thế cuộn nghiêng). Ở đây ghép thành tư thế đứng chính diện kiểu
   "đầu lớn + cánh xoè hai bên", KHÔNG xếp thân thành cột tháp: 3 đốt thân/đuôi nằm PHÍA SAU đầu (vẽ trước, đầu
   vẽ sau cùng che gần hết), chỉ hở một chỏm đuôi nhỏ dưới chân — giống dáng rồng cuộn mình chứ không phải totem.
   Cánh vỗ bằng xoay nhẹ theo sin, đầu nhấp nhô theo sin. Gọi từ boss-game-sprite-actors.js khi q.sprite ===
   'oblivion'. (x, y) = điểm chân (chỏm đuôi chạm đất), k = hệ số phóng nguyên. Cần boss-game-sprite-atlas.js. */

/* Độ chồng lấn giữa các đốt (px, k=1) — càng nhỏ càng "giấu" thân sau đầu; xem BOSS_OBLIVION_HEIGHT bên dưới */
const BOSS_OBLIVION_OVERLAP = { tailToBody2: 10, body2ToBody1: 8, body1ToHead: 6 };

/* Tâm từng mảnh (px thật, đã nhân k) theo (x, y) = chỏm đuôi chạm đất. Dùng chung cho vẽ (drawBossDragonComposite)
   và tan pixel lúc chết (bossMonsterDissolve, boss-game-sprite-actors.js) để đế/mảnh luôn khớp nhau. bob = độ
   nhấp nhô của đầu (0 khi đứng yên/đóng băng/giảm chuyển động). */
function bossOblivionLayout(x, y, k, bob) {
  const bodyEnd = BOSS_SPRITES.oblivionBodyEnd, body2 = BOSS_SPRITES.oblivionBody2,
    body1 = BOSS_SPRITES.oblivionBody1, head = BOSS_SPRITES.oblivionHead, wing = BOSS_SPRITES.oblivionWing,
    ov = BOSS_OBLIVION_OVERLAP;
  const tailY = y - bodyEnd.fh * k * 0.5, body2Y = tailY - ov.tailToBody2 * k, body1Y = body2Y - ov.body2ToBody1 * k;
  const headY = body1Y - ov.body1ToHead * k - head.fh * k * 0.5 - bob, wingY = headY + head.fh * 0.1 * k;
  const wingDx = (head.fw * 0.42 + wing.fw * 0.3) * k;
  return { tail: { x, y: tailY }, body2: { x, y: body2Y }, body1: { x, y: body1Y }, head: { x, y: headY },
    wingL: { x: x - wingDx, y: wingY }, wingR: { x: x + wingDx, y: wingY } };
}

function drawBossDragonComposite(ctx, x, y, k, t, opt) {
  const o = opt || {}, still = o.reduced;
  const flap = still ? 0 : Math.sin(t * 2.2) * 0.35, bob = still ? 0 : Math.sin(t * 1.6) * 1.5 * k;
  const L = bossOblivionLayout(x, y, k, bob), fo = { center: true, flash: o.flash, tint: o.tint };
  // vẽ thân trước (bị đầu che gần hết) rồi mới tới cánh + đầu, để không lộ dáng cột tháp
  drawSprite(ctx, 'oblivionBodyEnd', 'idle', t, L.tail.x, L.tail.y, k, fo);
  drawSprite(ctx, 'oblivionBody2', 'idle', t, L.body2.x, L.body2.y, k, fo);
  drawSprite(ctx, 'oblivionBody1', 'idle', t, L.body1.x, L.body1.y, k, fo);
  drawSprite(ctx, 'oblivionWing', 'idle', t, L.wingL.x, L.wingL.y, k, Object.assign({ rot: -0.45 + flap, flipX: true }, fo));
  drawSprite(ctx, 'oblivionWing', 'idle', t, L.wingR.x, L.wingR.y, k, Object.assign({ rot: 0.45 - flap }, fo));
  drawSprite(ctx, 'oblivionHead', 'idle', t, L.head.x, L.head.y, k, fo);   // vẽ sau cùng, che phần lớn thân
}

/* Chiều cao hiển thị thật (px, k=1, chưa tính bob) từ chỏm đuôi (đáy BodyEnd) tới đỉnh đầu (đỉnh Head) — dùng để
   layoutBoss tính scale + chừa chỗ cho HUD (composite cao hơn nhiều so với 1 sprite đơn cùng fh vì có 3 đốt
   thân ẩn phía sau, KHÔNG rút gọn bằng ½ chiều cao đầu/đuôi như tưởng — xem phép cộng dưới, khớp hình thật). */
const BOSS_OBLIVION_HEIGHT = 40 / 2 + BOSS_OBLIVION_OVERLAP.tailToBody2 + BOSS_OBLIVION_OVERLAP.body2ToBody1 +
  BOSS_OBLIVION_OVERLAP.body1ToHead + 46;   // BodyEnd.fh/2 + 3 khoảng chồng lấn + Head.fh (đủ cả đầu, không chia đôi)
