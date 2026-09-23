/* Phục vụ file web tĩnh: chỉ đúng danh sách được phép, chặn mọi đường vòng, gắn header bảo mật.
   resolveStaticPath/mimeFor/cacheControlFor/securityHeaders thuần — test: tests/static-file-server.test.js */
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream');

// file ở gốc: liệt kê từng tên (ảnh chụp màn hình vô tình để ở gốc không bị lộ)
const ROOT_FILES = ['index.html', 'manifest.json', 'sw.js', 'words.json', 'icon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
const DIRS = ['css', 'js', 'audio'];                  // chỉ 1 cấp
const NAME_RX = /^[A-Za-z0-9_-][A-Za-z0-9._-]*$/;
const NO_CACHE = ['index.html', 'sw.js', 'words.json', 'audio/index.json'];
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.mp3': 'audio/mpeg'
};
// index.html không có inline script, không tài nguyên ngoài; style inline có dùng (attribute + JS set style)
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; " +
  "media-src 'self' data: blob:; connect-src 'self'; manifest-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'";

// → {status:200, file:'js/x.js'} | {status:404} | {status:400}
function resolveStaticPath(url) {
  const raw = String(url || '/').split('?')[0].split('#')[0];
  let p;
  try { p = decodeURIComponent(raw); } catch (e) { return { status: 400 }; }
  // sau khi decode không được còn ký tự lách: backslash, NUL, %, đường dẫn kép
  if (/[\\\0%]/.test(p) || p.indexOf('//') >= 0 || p[0] !== '/') return { status: 404 };
  if (p === '/') return { status: 200, file: 'index.html' };
  const parts = p.slice(1).split('/');
  if (parts.some(s => !NAME_RX.test(s))) return { status: 404 };     // chặn '', '.', '..', file ẩn
  if (parts.length === 1 && ROOT_FILES.indexOf(parts[0]) >= 0) return { status: 200, file: parts[0] };
  if (parts.length === 2 && DIRS.indexOf(parts[0]) >= 0 && MIME[path.posix.extname(parts[1])]) return { status: 200, file: parts.join('/') };
  return { status: 404 };
}
function mimeFor(file) {
  if (file === 'manifest.json') return 'application/manifest+json';
  return MIME[path.posix.extname(file)] || 'application/octet-stream';
}
function cacheControlFor(file) {
  if (NO_CACHE.indexOf(file) >= 0) return 'no-cache';
  return file.startsWith('audio/') ? 'public, max-age=31536000, immutable' : 'public, max-age=3600';
}
function securityHeaders(https) {
  const h = {
    'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'same-origin', 'Content-Security-Policy': CSP
  };
  if (https) h['Strict-Transport-Security'] = 'max-age=15552000';
  return h;
}

// phục vụ 1 request tĩnh; rootDir = thư mục chứa index.html
function serveStatic(req, res, rootDir, https) {
  const sec = securityHeaders(https);
  const send = (status, body) => { res.writeHead(status, Object.assign({ 'Content-Type': 'text/plain; charset=utf-8' }, sec)); res.end(body); };
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.setHeader('Allow', 'GET, HEAD'); return send(405, 'Method Not Allowed'); }
  const r = resolveStaticPath(req.url);
  if (r.status !== 200) return send(r.status, r.status === 400 ? 'Bad Request' : 'Not Found');
  const abs = path.join(rootDir, r.file);
  if (path.relative(rootDir, abs).startsWith('..')) return send(404, 'Not Found');   // phòng hờ lần 2
  fs.stat(abs, (err, st) => {
    if (err || !st.isFile()) return send(404, 'Not Found');
    res.writeHead(200, Object.assign({ 'Content-Type': mimeFor(r.file), 'Content-Length': st.size, 'Cache-Control': cacheControlFor(r.file) }, sec));
    if (req.method === 'HEAD') return res.end();
    // pipeline huỷ stream đọc khi client ngắt giữa chừng (pipe thì giữ fd mở → lâu dần EMFILE)
    pipeline(fs.createReadStream(abs), res, () => {});
  });
}

module.exports = { resolveStaticPath, mimeFor, cacheControlFor, securityHeaders, serveStatic };
