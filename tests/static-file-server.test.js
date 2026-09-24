/* Test server/static-file-server.js — chỉ phục vụ đúng file web, chặn mọi đường vòng. Chỉ chạy trong Node. */
describe('static-file-server (Node)', () => {
  if (typeof require === 'undefined') { it('bỏ qua ngoài Node', () => assert.ok(true)); return; }
  const s = require(path.join(ROOT, 'server', 'static-file-server.js'));
  const r = u => s.resolveStaticPath(u);

  it('/ → index.html', () => assert.deepEqual(r('/'), { status: 200, file: 'index.html' }));
  it('bỏ query string', () => assert.equal(r('/words.json?_=123').file, 'words.json'));
  it('file gốc trong danh sách', () => {
    ['index.html', 'manifest.json', 'sw.js', 'words.json', 'icon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png']
      .forEach(f => assert.equal(r('/' + f).file, f, f));
  });
  it('css/js/audio 1 cấp', () => {
    assert.equal(r('/js/app-shell.js').file, 'js/app-shell.js');
    assert.equal(r('/css/paper-theme.css').file, 'css/paper-theme.css');
    assert.equal(r('/audio/index.json').file, 'audio/index.json');
    assert.equal(r('/audio/000e47a23f0c.mp3').file, 'audio/000e47a23f0c.mp3');
  });
  it('ảnh sprite Pháp sư: đúng thư mục img/boss/<nhóm>/, chỉ .png', () => {
    assert.equal(r('/img/boss/actor/mage-f.png').file, 'img/boss/actor/mage-f.png');
    assert.equal(r('/img/boss/tile/floor.png').file, 'img/boss/tile/floor.png');
    ['/img/boss/actor/x.js', '/img/boss/other/x.png', '/img/boss/x.png', '/img/x.png', '/img/boss/fx/a/b.png', '/img/boss/fx/.x.png', '/img/boss/fx/../../server.js']
      .forEach(u => assert.equal(r(u).status, 404, u));
  });
  it('chặn file ngoài danh sách → 404', () => {
    ['/server.js', '/server/database.js', '/package.json', '/package-lock.json', '/.git/config', '/.git/HEAD', '/plans/x.md',
      '/tests/run-tests.html', '/tools/generate_edge_tts_audio.py', '/docs/system-architecture.md', '/README.md',
      '/screenshot.png', '/.env', '/node_modules/pg/package.json', '/js/sub/x.js', '/JS/app-shell.js']
      .forEach(u => assert.equal(r(u).status, 404, u));
  });
  it('chặn path traversal / mã hoá lách', () => {
    ['/js/../server.js', '/%2e%2e/server.js', '/js/%2e%2e/server.js', '/js/..%5cserver.js', '/js/..\\server.js',
      '/js/%252e%252e/x', '/js/a%00.js', '/JS/../server.js', '/js/./app-shell.js', '//etc/passwd', '/js/']
      .forEach(u => assert.ok(r(u).status !== 200, u));
  });
  it('mã hoá hỏng → 400, không ném', () => { assert.equal(r('/%').status, 400); assert.equal(r('/%E0%A4%A').status, 400); });
  it('MIME đúng', () => {
    assert.equal(s.mimeFor('index.html'), 'text/html; charset=utf-8');
    assert.equal(s.mimeFor('js/a.js'), 'text/javascript; charset=utf-8');
    assert.equal(s.mimeFor('css/a.css'), 'text/css; charset=utf-8');
    assert.equal(s.mimeFor('words.json'), 'application/json; charset=utf-8');
    assert.equal(s.mimeFor('manifest.json'), 'application/manifest+json');
    assert.equal(s.mimeFor('icon.svg'), 'image/svg+xml');
    assert.equal(s.mimeFor('icon-192.png'), 'image/png');
    assert.equal(s.mimeFor('audio/a.mp3'), 'audio/mpeg');
  });
  it('no-cache cho file phải luôn mới', () => {
    ['index.html', 'sw.js', 'words.json', 'audio/index.json'].forEach(f => assert.equal(s.cacheControlFor(f), 'no-cache', f));
    assert.ok(s.cacheControlFor('js/app-shell.js') !== 'no-cache');
  });
  it('header bảo mật', () => {
    const h = s.securityHeaders(false);
    assert.equal(h['X-Content-Type-Options'], 'nosniff'); assert.equal(h['X-Frame-Options'], 'DENY');
    assert.equal(h['Referrer-Policy'], 'same-origin'); assert.ok(/script-src 'self'/.test(h['Content-Security-Policy']));
    assert.equal(h['Strict-Transport-Security'], undefined);
    // js/speech-synthesis.js mở khoá audio iOS bằng WAV data: — CSP chặn thì iPhone không phát được MP3
    assert.ok(/media-src[^;]*\bdata:/.test(h['Content-Security-Policy']), 'media-src cho phép data:');
    assert.ok(s.securityHeaders(true)['Strict-Transport-Security']);
  });
});
