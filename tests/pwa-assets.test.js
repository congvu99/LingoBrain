/* Danh sách cache trong sw.js phải khớp file thật và mọi script/css mà index.html nạp. Chạy trong Node. */
describe('sw.js ASSETS', () => {
  if (typeof fs === 'undefined') return;
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const m = /ASSETS\s*=\s*\[([\s\S]*?)\]/.exec(sw);
  const assets = m ? m[1].match(/'([^']+)'/g).map(s => s.slice(1, -1)) : [];
  it('parsed', () => assert.ok(assets.length > 5));
  it('every asset exists on disk', () => {
    assets.filter(a => a !== './').forEach(a => assert.ok(fs.existsSync(path.join(ROOT, a)), 'missing ' + a));
  });
  it('every <script src> and stylesheet in index.html is cached', () => {
    const refs = [];
    html.replace(/<script src="([^"]+)"/g, (_, s) => refs.push(s));
    html.replace(/<link rel="stylesheet" href="([^"]+)"/g, (_, s) => refs.push(s));
    refs.forEach(r => assert.includes(assets, './' + r, r));
  });
  // addAll(ASSETS) thẳng sẽ lấy css/js từ HTTP cache (max-age) → bản cài mới trộn HTML mới với css/js cũ
  it('install bypasses the browser HTTP cache', () => {
    assert.ok(/addAll\(ASSETS\.map\([^;]*cache:\s*'reload'/.test(sw), "install phải tải lại với cache: 'reload'");
  });
  it('CACHE version matches APP_VERSION', () => {
    const v = /CACHE\s*=\s*'lingobrain-v([^']+)'/.exec(sw)[1];
    const app = /APP_VERSION\s*=\s*'([^']+)'/.exec(fs.readFileSync(path.join(ROOT, 'js/app-storage.js'), 'utf8'))[1];
    assert.equal(v, app);
  });
});
