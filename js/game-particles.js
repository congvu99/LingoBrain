/* Bộ máy hạt DÙNG CHUNG cho game canvas (Bắn máy bay, Pháp sư) — thuần, chạy được trong Node để test.
   Pool cố định: hạt chết được đổi chỗ xuống cuối và tái dùng object → không cấp phát / filter mỗi khung.
   Thứ tự vẽ trong cùng loại có thể đổi khi hạt chết (không thấy bằng mắt). */

/* max = trần số hạt sống; reduced = "giảm chuyển động" (bớt 60% hạt); rand tiêm được để test tất định.
   quality (0..1) do vòng lặp chỉnh khi FPS thấp: nhân thêm vào số hạt mỗi lần nổ. */
function createParticles(max, reduced, rand) {
  return { items: [], n: 0, max, reduced: !!reduced, quality: 1, rand: rand || Math.random };
}

/* Nổ n hạt tại (x, y). opt = {kind, a, spread, speed, life, size, colors, drag, g} (a có → nón quanh góc a) */
function burst(ps, x, y, n, opt) {
  const r = ps.rand;
  n = Math.round(n * (ps.reduced ? 0.4 : 1) * ps.quality);
  for (let i = 0; i < n && ps.n < ps.max; i++) {
    const a = opt.a != null ? opt.a + (r() - 0.5) * (opt.spread || Math.PI * 2) : r() * Math.PI * 2;
    const s = opt.speed * (0.35 + r() * 0.9), life = opt.life * (0.6 + r() * 0.6);
    let p = ps.items[ps.n];
    if (!p) { p = {}; ps.items.push(p); }
    ps.n++;
    p.kind = opt.kind; p.x = x; p.y = y; p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s; p.life = life; p.max = life;
    p.size = opt.size * (0.6 + r() * 0.8); p.color = opt.colors[i % opt.colors.length];
    p.rot = r() * 6.283; p.vr = (r() - 0.5) * 10; p.drag = opt.drag || 2.2; p.g = opt.g || 0;
  }
}

/* Bước vật lý dt giây: lực cản, trọng lực, xoay; hạt hết đời đổi chỗ với hạt sống cuối cùng */
function stepParticles(ps, dt) {
  const it = ps.items;
  for (let i = 0; i < ps.n;) {
    const p = it[i];
    p.life -= dt;
    if (p.life <= 0) { it[i] = it[ps.n - 1]; it[ps.n - 1] = p; ps.n--; continue; }
    const k = Math.max(0, 1 - p.drag * dt);
    p.vx *= k; p.vy = p.vy * k + p.g * dt;
    p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
    i++;
  }
}

/* Gọi drawKind(ctx, p, alpha) cho từng hạt sống — mỗi game tự quyết vẽ loại nào, lớp nào */
function drawParticles(ctx, ps, drawKind) {
  for (let i = 0; i < ps.n; i++) { const p = ps.items[i]; drawKind(ctx, p, Math.max(0, p.life / p.max)); }
}

function clearParticles(ps) { ps.n = 0; }

if (typeof module !== 'undefined') module.exports = { createParticles, burst, stepParticles, drawParticles, clearParticles };
