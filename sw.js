/* Service worker: cache-first cho toàn bộ file tĩnh. Đổi CACHE mỗi lần deploy để người dùng nhận bản mới. */
const CACHE = 'lingobrain-v2.2.1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './words.json',
  './css/paper-theme.css',
  './js/srs-scheduler.js',
  './js/app-storage.js',
  './js/speech-synthesis.js',
  './js/recording-store.js',
  './js/daily-plan.js',
  './js/review-mode-picker.js',
  './js/stats-dashboard.js',
  './js/word-import.js',
  './js/review-steps-learn.js',
  './js/review-tests.js',
  './js/word-games.js',
  './js/word-game-rounds.js',
  './js/word-game-ui.js',
  './js/app-shell.js',
  './js/pwa-register.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', e => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  // words.json: network-first, bỏ qua query chống cache khi lưu/đọc, để bộ từ mới trên máy chủ luôn thắng cache cũ
  if (/\/words\.json$/.test(url.pathname)) {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put('./words.json', copy)); }
        return res;
      }).catch(() => caches.match('./words.json'))
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
