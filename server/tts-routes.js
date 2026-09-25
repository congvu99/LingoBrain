/* GET /api/tts?text=… — MP3 Neural cache Postgres (tts_clips). Contract cố định (phase 2 client dựa vào):
   xem plans/260925-0957-neural-tts-api-for-typed-sentences/phase-01-*.md. Không log / lưu nguyên văn câu.
   createTtsRoutes({ pool, getProvider, enabled, cacheMax, dailyMax, now, log }) → { tts(req, ip), limiters }. */
const crypto = require('crypto');
const { createRateLimiter, createSemaphore } = require('./request-guards.js');
const { etagMatches } = require('./deck-routes.js');

const QUEUE_BUDGET_MS = 5000;   // hạn chờ hàng đợi + tạo, dưới timeout 6s của client
const MP3_MIN = 1024, MP3_MAX = 300 * 1024;
const PRUNE_EVERY = 50;

// text 1–200 ký tự sau chuẩn hoá, không ký tự điều khiển / < >; lỗi decode → null
function normalizeTtsText(raw) {
  let text;
  try { text = decodeURIComponent(raw); } catch (e) { return null; }
  text = text.replace(/\s+/g, ' ').trim();
  if (!text || text.length > 200 || /[\u0000-\u001f\u007f<>]/.test(text)) return null;
  return text;
}

function extractRawText(url) {
  const q = url.indexOf('?');
  if (q < 0) return null;
  for (const part of url.slice(q + 1).split('&')) {
    const eq = part.indexOf('=');
    const k = eq < 0 ? part : part.slice(0, eq);
    if (k === 'text') return eq < 0 ? '' : part.slice(eq + 1);
  }
  return null;
}

// ID3 header hoặc MPEG frame sync; kích cỡ khớp CHECK trong schema
function looksLikeMp3(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < MP3_MIN || buf.length > MP3_MAX) return false;
  if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) return true;   // "ID3"
  return buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0;
}

function errRes(status, error, extra) { return [status, { error }, Object.assign({ 'Cache-Control': 'no-store' }, extra)]; }

function createTtsRoutes({ pool, getProvider, enabled, cacheMax, dailyMax, now = Date.now, log = console.log }) {
  const minute = createRateLimiter({ limit: 20, windowMs: 60000, maxKeys: 10000 });      // tạo mới / IP / phút
  const day = createRateLimiter({ limit: 200, windowMs: 86400000, maxKeys: 10000 });      // tạo mới / IP / ngày
  const serverDay = createRateLimiter({ limit: dailyMax, windowMs: 86400000, maxKeys: 1 }); // trần toàn server / ngày
  const sem = createSemaphore(2, 10);   // tối đa 2 lần tạo đồng thời, hàng đợi 10
  const inflight = new Map();           // key → Promise<Buffer> (single-flight)
  let insertCount = 0;

  function withDeadline(p, ms) {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => { const e = new Error('queue timeout'); e.code = 'BUSY'; reject(e); }, ms);
      p.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
    });
  }

  function sendAudio(req, buf, etag) {
    // private + Vary: cache dùng chung (proxy) không được trả MP3 cho request thiếu X-LB-TTS
    const headers = { 'Cache-Control': 'private, max-age=86400', Vary: 'X-LB-TTS', ETag: etag,
      'Cross-Origin-Resource-Policy': 'same-origin', 'X-Content-Type-Options': 'nosniff' };
    if (etagMatches(req.headers['if-none-match'], etag)) return [304, null, headers];
    return [200, buf, Object.assign({ 'Content-Type': 'audio/mpeg' }, headers)];
  }

  // Lưu cache chạy nền: phản hồi không chờ INSERT/prune (pool DB nhỏ, dùng chung với sync)
  function saveClip(key, voice, buf) {
    pool.query('INSERT INTO tts_clips (key, voice, mp3) VALUES ($1, $2, $3) ON CONFLICT (key) DO NOTHING', [key, voice, buf])
      .then(() => {
        if (++insertCount % PRUNE_EVERY) return;
        return pool.query(
          `DELETE FROM tts_clips WHERE key IN (SELECT key FROM tts_clips ORDER BY created_at ASC
           LIMIT GREATEST((SELECT count(*) FROM tts_clips) - $1, 0))`, [cacheMax]);
      })
      .catch(e => log('tts cache lỗi: ' + e.message));
  }

  async function tts(req, ip) {
    const t = now();   // hạn 5s tính từ lúc nhận request, gồm cả SELECT cache
    if (enabled === false) return errRes(501, 'TTS đang tắt');
    let provider = null;
    try { provider = getProvider ? getProvider() : null; } catch (e) { provider = null; }
    if (!provider) return errRes(501, 'TTS đang tắt');
    if (req.headers['x-lb-tts'] !== '1') return errRes(403, 'Thiếu tiêu đề xác thực');
    const raw = extractRawText(req.url);
    const text = raw == null ? null : normalizeTtsText(raw);
    if (!text) return errRes(400, 'Câu không hợp lệ (rỗng, quá 200 ký tự, hoặc chứa ký tự cấm)');

    const key = crypto.createHash('sha256').update(provider.voice + '\n' + text).digest('hex');
    const etag = '"' + key + '"';
    const cached = await pool.query('SELECT mp3 FROM tts_clips WHERE key = $1', [key]);
    if (cached.rows.length) return sendAudio(req, cached.rows[0].mp3, etag);

    // Chỉ request mở lượt tạo mới bị tính giới hạn (request nhập chung lượt đang chạy của cùng câu thì miễn).
    // check đủ 3 trước rồi mới hit: request bị từ chối không được ăn vào trần toàn server — nếu không 1 IP spam
    // dù bị chặn theo phút vẫn đốt hết trần ngày của mọi người.
    let p = inflight.get(key);
    if (!p) {
      if (!minute.check(ip, t)) return errRes(429, 'Tạo giọng đọc quá nhanh, đợi 1 phút', { 'Retry-After': '60' });
      if (!day.check(ip, t) || !serverDay.check('all', t)) return errRes(429, 'Đã đạt giới hạn tạo giọng đọc trong ngày', { 'Retry-After': '3600' });
      minute.hit(ip, t); day.hit(ip, t); serverDay.hit('all', t);
      const budget = Math.max(0, QUEUE_BUDGET_MS - (now() - t));
      p = withDeadline(sem.run(() => {
        // tới lượt mà đã quá hạn (client đã/ sắp bỏ) hoặc client ngắt → không gọi provider cho kết quả sẽ vứt đi
        if (now() - t >= QUEUE_BUDGET_MS) { const e = new Error('queue timeout'); e.code = 'BUSY'; throw e; }
        if (req.destroyed || (req.socket && req.socket.destroyed)) throw new Error('client đã ngắt trước khi tới lượt');
        return provider.synth(text).then(buf => {
          if (!looksLikeMp3(buf)) throw new Error('mp3 không hợp lệ');
          saveClip(key, provider.voice, buf);   // chỉ lượt mở mới ghi cache, 1 INSERT cho mọi request cùng câu
          return buf;
        });
      }), budget).finally(() => inflight.delete(key));
      inflight.set(key, p);
    }
    let buf;
    try { buf = await p; }
    catch (e) {
      if (e.code === 'BUSY') return errRes(429, 'Máy chủ đang bận, thử lại sau', { 'Retry-After': '5' });
      log('tts synth failed: ' + e.message);   // không log câu
      return errRes(502, 'Không tạo được giọng đọc');
    }
    return sendAudio(req, buf, etag);
  }

  return { tts, limiters: [minute, day, serverDay] };
}

module.exports = { createTtsRoutes, normalizeTtsText, looksLikeMp3 };
