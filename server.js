/* LingoBrain server: phục vụ web tĩnh + API tài khoản/đồng bộ trên cùng domain.
   Env: PORT (3000), DATABASE_URL (thiếu → chỉ web tĩnh, API 503), PGSSL=true|false, PGSSLROOTCERT (file CA, tuỳ chọn),
   TRUST_PROXY_HOPS (0 = không tin X-Forwarded-For; sau reverse proxy của nền tảng đặt 1).
   Web tĩnh không phụ thuộc DB: DB sập/sai thì trang vẫn mở, chỉ API trả 503. */
const http = require('http');
const { serveStatic, securityHeaders } = require('./server/static-file-server.js');

const PORT = +process.env.PORT || 3000;
// mặc định 0: chưa khai báo proxy thì không tin X-Forwarded-For (client tự ghi được → lách rate limit)
const TRUST_PROXY_HOPS = Math.max(0, +process.env.TRUST_PROXY_HOPS || 0);
const log = m => console.log(new Date().toISOString() + ' ' + m);

let api = null;
if (process.env.DATABASE_URL) {
  const { createDatabase } = require('./server/database.js');
  const { createApi } = require('./server/auth-and-sync-routes.js');
  const db = createDatabase(process.env.DATABASE_URL, { ssl: process.env.PGSSL === 'true', caFile: process.env.PGSSLROOTCERT, log });
  api = createApi({ pool: db.pool, isReady: () => db.ready, trustHops: TRUST_PROXY_HOPS, log });
  db.start();   // chạy nền, không chặn listen
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
