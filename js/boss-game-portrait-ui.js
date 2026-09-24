/* Game Pháp Sư Lexoria — chân dung pháp sư nhỏ (sảnh boss-game-hub-ui.js + màn chọn lần đầu
   boss-game-first-run-ui.js): vòng lặp idle hướng xuống trên canvas nhỏ, phóng số nguyên, imageSmoothing tắt
   (drawSprite lo sẵn). Chỉ 1 chân dung chạy tại một thời điểm (sảnh và màn chọn không hiện cùng lúc) — gọi lại
   bossPortraitLoop tự dừng vòng cũ trước khi bật vòng mới. Ảnh chưa nạp xong (loadBossSprites) → chờ, không vẽ,
   không ném lỗi. Cần boss-game-sprite-atlas.js (BOSS_SPRITES, drawSprite, loadBossSprites, pixelScale). */

let bossPortraitStop = null;

/* canvas = phần tử <canvas>, name = 'mageF'|'mageM' (xem bossMageSprite, boss-game-sprite-actors.js).
   Dừng hẳn khi rời sảnh: gọi bossPortraitStop() rồi gán lại null (xem stopBossHub, boss-game-hub-ui.js). */
function bossPortraitLoop(canvas, name) {
  if (bossPortraitStop) bossPortraitStop();
  bossPortraitStop = null;
  if (!canvas) return;
  let raf = 0, stopped = false, lastKey = '';
  const ctx = canvas.getContext('2d'), def = BOSS_SPRITES[name];
  const scale = Math.min(pixelScale(canvas.height * 0.86, def.fh), Math.floor(canvas.width / def.fw));   // không cắt mép
  const tick = () => {
    if (stopped) return;
    if (!canvas.isConnected) { stopped = true; return; }   // #app đã vẽ lại (cây kỹ năng, trận…) → tự dừng
    raf = requestAnimationFrame(tick);
    if (document.hidden) return;   // ẩn tab: không vẽ (rAF của trình duyệt cũng tự thưa lại khi ẩn)
    const t = performance.now() / 1000, f = spriteFrame(def, 'idleDown', t), key = f.sx + ',' + f.sy;
    if (key === lastKey) return;   // anim chỉ vài khung/giây: chỉ vẽ lại khi đổi khung
    lastKey = key;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawSprite(ctx, name, 'idleDown', t, canvas.width / 2, canvas.height - 4, scale);
  };
  loadBossSprites([name]).then(() => { if (!stopped) tick(); });
  bossPortraitStop = () => { stopped = true; cancelAnimationFrame(raf); };
}
