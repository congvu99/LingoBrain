/* Service worker: cache-first cho toàn bộ file tĩnh. Đổi CACHE mỗi lần deploy để người dùng nhận bản mới.
   MP3 trong audio/ nằm ở cache riêng AUDIO_CACHE, cache dần khi phát, không xoá khi lên version. */
const CACHE = 'lingobrain-v2.13.2';
const AUDIO_CACHE = 'lingobrain-audio';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './words.json',
  './audio/index.json',
  './css/paper-theme.css',
  './js/srs-scheduler.js',
  './js/boss-progress-sync-merge.js',
  './js/sync-merge.js',
  './js/app-storage.js',
  './js/deck-source.js',
  './js/speech-synthesis.js',
  './js/recording-store.js',
  './js/daily-plan.js',
  './js/review-mode-picker.js',
  './js/stats-dashboard.js',
  './js/word-import.js',
  './js/cloud-sync-engine.js',
  './js/cloud-sync-account-ui.js',
  './js/review-steps-learn.js',
  './js/review-tests.js',
  './js/word-games.js',
  './js/plane-game-text.js',
  './js/plane-game-logic.js',
  './js/plane-game-typing.js',
  './js/game-particles.js',
  './js/plane-game-effects.js',
  './js/plane-game-render.js',
  './js/game-viewport-fit.js',
  './js/plane-game-ui.js',
  './js/fruit-game-logic.js',
  './js/fruit-game-fruit-art.js',
  './js/fruit-game-render.js',
  './js/fruit-game-scene-draw.js',
  './js/fruit-game-ui.js',
  './js/boss-game-spell-math.js',
  './js/boss-game-elements.js',
  './js/boss-game-logic.js',
  './js/boss-game-progress.js',
  './js/boss-game-spell-presets.js',
  './js/boss-game-mage-art.js',
  './js/boss-game-spell-art.js',
  './js/boss-game-render.js',
  './js/boss-game-result-ui.js',
  './js/boss-game-hub-ui.js',
  './js/boss-game-ui.js',
  './js/word-game-rounds.js',
  './js/word-game-ui.js',
  './js/app-shell.js',
  './js/pwa-register.js'
];

self.addEventListener('install', e => {
  // cache:'reload' bỏ qua HTTP cache của trình duyệt: css/js có max-age=3600, không bỏ qua thì bản cài mới
  // gộp index.html mới với css/js cũ → giao diện vỡ, JS cũ không khớp HTML mới
  // tải xong bản mới là kích hoạt luôn, không chờ người dùng bấm: pwa-register.js tự tải lại trang khi rảnh
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== AUDIO_CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// SW bản cũ (chưa tự skipWaiting) đang chờ: trang mới nhắn để kích hoạt
self.addEventListener('message', e => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  // bộ từ / audio index từ DB: network-first, lỗi mạng hoặc máy chủ lỗi (≥500) → bản đã cache; chưa có cache → trả lỗi để client dùng file tĩnh
  const deckApi = /^\/api\/(words|audio-index)$/.exec(url.pathname);
  if (deckApi) {
    const key = './api/' + deckApi[1];
    e.respondWith(
      fetch(e.request).then(res => {
        if (res.status === 200) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(key, copy)); return res; }
        if (res.status < 500) return res;
        return caches.match(key).then(hit => hit || res);
      }).catch(() => caches.match(key).then(hit => hit || Response.error()))
    );
    return;
  }
  if (url.pathname.startsWith('/api/')) return;   // API đồng bộ: luôn đi mạng, không cache
  // words.json, audio/index.json: network-first, bỏ qua query chống cache khi lưu/đọc, để bản mới trên máy chủ luôn thắng cache cũ
  const fresh = /\/(words\.json|audio\/index\.json)$/.exec(url.pathname);
  if (fresh) {
    const key = './' + fresh[1];
    e.respondWith(
      fetch(e.request).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(key, copy)); }
        return res;
      }).catch(() => caches.match(key))
    );
    return;
  }
  // MP3: tên file theo hash nội dung nên không bao giờ cũ → cache-first vĩnh viễn
  if (/\/audio\/[^/]+\.mp3$/.test(url.pathname)) {
    e.respondWith(
      caches.open(AUDIO_CACHE).then(c => c.match(e.request).then(hit => hit || fetch(e.request).then(res => {
        if (res.status === 200) c.put(e.request, res.clone()).catch(() => {});
        return res;
      })))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
