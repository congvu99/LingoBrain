/* Bảo vệ request: IP thật sau proxy, rate limit trong RAM, semaphore giới hạn scrypt, đọc body JSON có giới hạn.
   Thuần, test: tests/request-guards.test.js */

// IP client: phần tử x-forwarded-for do proxy tin cậy thêm vào, đếm `hops` từ PHẢI
// (phần tử trái nhất do client tự ghi được nên không tin). hops = 0 hoặc không có header → socket.
function clientIp(headers, socketAddr, hops) {
  const xff = headers && headers['x-forwarded-for'];
  if (!hops || !xff) return socketAddr || '';
  const list = String(xff).split(',').map(s => s.trim()).filter(Boolean);
  if (!list.length) return socketAddr || '';
  return list[Math.max(0, list.length - hops)];
}

// chỉ nhận body JSON: form HTML chéo site (text/plain, urlencoded) không gửi được JSON nếu không qua preflight CORS
function isJsonRequest(headers) {
  return /^application\/json(\s*;|$)/i.test(String((headers && headers['content-type']) || ''));
}

// cửa sổ cố định theo key; tối đa maxKeys key (vượt thì bỏ key cũ nhất) → key giả không làm phình RAM
function createRateLimiter({ limit, windowMs, maxKeys }) {
  const m = new Map();
  function entry(key, now) {
    let e = m.get(key);
    if (e && now - e.start >= windowMs) { m.delete(key); e = null; }
    return e;
  }
  return {
    // còn trong hạn mức (không tăng đếm)
    check(key, now) { const e = entry(key, now); return !e || e.count < limit; },
    // tăng đếm, trả true nếu vẫn trong hạn mức
    hit(key, now) {
      let e = entry(key, now);
      if (!e) {
        while (m.size >= maxKeys) m.delete(m.keys().next().value);
        e = { start: now, count: 0 }; m.set(key, e);
      }
      e.count++;
      return e.count <= limit;
    },
    sweep(now) { for (const [k, e] of m) if (now - e.start >= windowMs) m.delete(k); },
    size() { return m.size; }
  };
}

// tối đa n việc chạy cùng lúc; hàng chờ > maxQueue → lỗi code BUSY (server trả 503)
function createSemaphore(n, maxQueue) {
  let active = 0;
  const queue = [];
  function next() { if (active < n && queue.length) { active++; queue.shift()(); } }
  return {
    run(fn) {
      if (active >= n && queue.length >= maxQueue) { const e = new Error('busy'); e.code = 'BUSY'; return Promise.reject(e); }
      return new Promise((resolve, reject) => {
        queue.push(() => Promise.resolve().then(fn).then(resolve, reject).finally(() => { active--; next(); }));
        next();
      });
    }
  };
}

// đọc body JSON object; quá maxBytes → {status:413}; hỏng/rỗng/không phải object/stream lỗi → {status:400}
// Quá cỡ: vẫn đọc tiếp (bỏ dữ liệu) tới hết rồi mới báo 413 — cắt kết nối giữa chừng làm client nhận
// ECONNRESET thay vì 413. Chỉ cắt khi vượt trần cứng 2×maxBytes để không đọc vô hạn.
function readJsonBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0, done = false;
    const fail = status => { if (done) return; done = true; const e = new Error('body ' + status); e.status = status; reject(e); };
    req.on('data', c => {
      if (done) return;
      size += c.length;
      if (size > maxBytes * 2) { fail(413); if (req.destroy) req.destroy(); return; }
      if (size <= maxBytes) chunks.push(c);
    });
    req.on('end', () => {
      if (done) return;
      if (size > maxBytes) return fail(413);
      try {
        const v = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (!v || typeof v !== 'object' || Array.isArray(v)) return fail(400);
        done = true; resolve(v);
      } catch (e) { fail(400); }
    });
    req.on('error', () => fail(400));
    req.on('aborted', () => fail(400));
  });
}

module.exports = { clientIp, isJsonRequest, createRateLimiter, createSemaphore, readJsonBody };
