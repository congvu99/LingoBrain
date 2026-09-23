/* Service worker: cache-first cho toàn bộ file tĩnh. Đổi CACHE mỗi lần deploy để người dùng nhận bản mới.
   MP3 trong audio/ nằm ở cache riêng AUDIO_CACHE, cache dần khi phát, không xoá khi lên version. */
const CACHE = 'lingobrain-v2.8.2';
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
  './js/plane-game-text.js',
  './js/plane-game-logic.js',
  './js/plane-game-typing.js',
  './js/plane-game-effects.js',
  './js/plane-game-render.js',
  './js/plane-game-ui.js',
  './js/word-game-rounds.js',
  './js/word-game-ui.js',
  './js/app-shell.js',
  './js/pwa-register.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== AUDIO_CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', e => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
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
