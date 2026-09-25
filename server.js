/* LingoBrain server: phục vụ web tĩnh + API tài khoản/đồng bộ trên cùng domain.
   Env: PORT (3000), DATABASE_URL (thiếu → chỉ web tĩnh, API 503), PGSSL=true|false, PGSSLROOTCERT (file CA, tuỳ chọn),
   TRUST_PROXY_HOPS (0 = không tin X-Forwarded-For; sau reverse proxy của nền tảng đặt 1),
   AUTO_SEED (mặc định bật; false = không tự nạp words.json + audio/index.json vào DB khi nội dung đổi),
   TTS_ENABLED (mặc định bật), TTS_VOICE (mặc định en-US-AndrewMultilingualNeural),
   TTS_CACHE_MAX (mặc định 2000 dòng cache), TTS_DAILY_MAX (mặc định 1000 lượt tạo mới/ngày toàn server).
   Web tĩnh không phụ thuộc DB: DB sập/sai thì trang vẫn mở, chỉ API trả 503. */
const http = require('http');
const { serveStatic, securityHeaders } = require('./server/static-file-server.js');

const PORT = +process.env.PORT || 3000;
// mặc định 0: chưa khai báo proxy thì không tin X-Forwarded-For (client tự ghi được → lách rate limit)
const TRUST_PROXY_HOPS = Math.max(0, +process.env.TRUST_PROXY_HOPS || 0);
const log = m => console.log(new Date().toISOString() + ' ' + m);

const TTS_ENABLED = process.env.TTS_ENABLED !== 'false';
const TTS_VOICE = process.env.TTS_VOICE || 'en-US-AndrewMultilingualNeural';
const TTS_CACHE_MAX = +process.env.TTS_CACHE_MAX || 2000;
const TTS_DAILY_MAX = +process.env.TTS_DAILY_MAX || 1000;

let api = null;
if (process.env.DATABASE_URL) {
  const { createDatabase } = require('./server/database.js');
  const { createApi } = require('./server/auth-and-sync-routes.js');
  const { createTtsRoutes } = require('./server/tts-routes.js');
  const { seedIfChanged, loadDeckFiles } = require('./server/deck-seeder.js');
  const db = createDatabase(process.env.DATABASE_URL, { ssl: process.env.PGSSL === 'true', caFile: process.env.PGSSLROOTCERT, log });
  // nạp lười thư viện Edge TTS: lỗi require (thiếu gói, thư viện hỏng) chỉ log 1 lần + trả null (→ 501),
  // không nạp ở top-level để không làm sập cả web tĩnh nếu thư viện có vấn đề
  let ttsProvider, ttsLoadFailed = false;
  function getTtsProvider() {
    if (ttsProvider) return ttsProvider;
    if (ttsLoadFailed) return null;
    try {
      const { createEdgeTtsProvider } = require('./server/tts-edge-provider.js');
      ttsProvider = createEdgeTtsProvider({ voice: TTS_VOICE });
      return ttsProvider;
    } catch (e) { ttsLoadFailed = true; log('tts provider nạp lỗi: ' + e.message); return null; }
  }
  const tts = createTtsRoutes({ pool: db.pool, getProvider: getTtsProvider, enabled: TTS_ENABLED, cacheMax: TTS_CACHE_MAX, dailyMax: TTS_DAILY_MAX, log });
  api = createApi({ pool: db.pool, isReady: () => db.ready, trustHops: TRUST_PROXY_HOPS, log, tts });
  const autoSeed = process.env.AUTO_SEED !== 'false';
  // chạy nền, không chặn listen; seed xong xoá cache bộ từ trong RAM
  db.start({ onReady: async () => {
    if (autoSeed) await seedIfChanged(db.pool, () => loadDeckFiles(__dirname), log);
    api.invalidateDeck();
  } });
} else {
  log('DATABASE_URL chưa đặt → chỉ phục vụ web tĩnh, API trả 503');
}

function fail(res, https, status, body) {
  if (res.headersSent) { res.destroy(); return; }
  res.writeHead(status, Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, securityHeaders(https)));
  res.end(JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  const https = req.headers['x-forwarded-proto'] === 'https';
  try {
    if (req.url.startsWith('/api/')) {
      if (!api) return fail(res, https, 503, { error: 'Máy chủ chưa bật đồng bộ' });
      api(req, res, https).catch(e => { log('api crash: ' + (e && e.message)); fail(res, https, 500, { error: 'Lỗi máy chủ' }); });
      return;
    }
    serveStatic(req, res, __dirname, https);
  } catch (e) {
    log('request crash: ' + (e && e.message));
    fail(res, https, 500, { error: 'Lỗi máy chủ' });
  }
});
server.on('clientError', (e, socket) => { if (socket.writable) socket.end('HTTP/1.1 400 Bad Request\r\n\r\n'); });
process.on('unhandledRejection', e => log('unhandledRejection: ' + (e && e.message)));   // log, không thoát

server.listen(PORT, () => log('listening on :' + PORT));
