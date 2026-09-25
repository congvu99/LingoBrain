/* Service worker: cache-first cho toàn bộ file tĩnh. Đổi CACHE mỗi lần deploy để người dùng nhận bản mới.
   MP3 trong audio/ nằm ở cache riêng AUDIO_CACHE, cache dần khi phát, không xoá khi lên version. */
const CACHE = 'lingobrain-v2.24.1';
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
  './js/boss-game-evolution-forms.js',
  './js/boss-game-evolution-sprites.js',
  './js/boss-game-evolution.js',
  './js/boss-game-skill-roster.js',
  './js/boss-game-skill-pick.js',
  './js/boss-game-threat-gauge.js',
  './js/boss-game-combo-chain.js',
  './js/boss-game-logic.js',
  './js/boss-game-progress.js',
  './js/boss-game-story.js',
  './js/boss-game-spell-presets.js',
  './js/boss-game-spell-art.js',
  './js/boss-game-tier3-ultimate-fx.js',
  './js/boss-game-sprite-atlas.js',
  './js/boss-game-skill-sprites.js',
  './js/boss-game-dragon-composite.js',
  './js/boss-game-arena.js',
  './js/boss-game-sprite-actors.js',
  './js/boss-game-skill-fx.js',
  './js/boss-game-portrait-ui.js',
  './js/boss-game-render.js',
  './js/boss-game-result-ui.js',
  './js/boss-game-story-journal-ui.js',
  './js/boss-game-hub-ui.js',
  './js/boss-game-skill-book-ui.js',
  './js/boss-game-first-run-ui.js',
  './js/boss-game-skill-tree-ui.js',
  './js/boss-game-evolution-ui.js',
  './js/boss-game-ui.js',
  './js/word-game-rounds.js',
  './js/word-game-ui.js',
  './js/app-shell.js',
  './js/pwa-register.js',
  './img/boss/actor/mage-f.png',
  './img/boss/actor/mage-m.png',
  './img/boss/actor/slime.png',
  './img/boss/fx/fireball.png',
  './img/boss/fx/flam.png',
  './img/boss/fx/explosion.png',
  './img/boss/fx/smoke.png',
  './img/boss/tile/floor.png',
  './img/boss/tile/nature.png',
  './img/boss/tile/house.png',
  './img/boss/actor/racoon.png',
  './img/boss/actor/skull.png',
  './img/boss/actor/spirit.png',
  './img/boss/actor/mole.png',
  './img/boss/actor/owl.png',
  './img/boss/actor/flam-monster.png',
  './img/boss/actor/young-dragon.png',
  './img/boss/actor/giant-racoon-idle.png',
  './img/boss/actor/giant-racoon-attack.png',
  './img/boss/actor/giant-spirit-idle.png',
  './img/boss/actor/giant-spirit-hit.png',
  './img/boss/actor/tengu-blue-idle.png',
  './img/boss/actor/tengu-blue-hit.png',
  './img/boss/actor/tengu-blue-attack.png',
  './img/boss/actor/dragon-blue-head.png',
  './img/boss/actor/dragon-blue-wing.png',
  './img/boss/actor/dragon-blue-body1.png',
  './img/boss/actor/dragon-blue-body2.png',
  './img/boss/actor/dragon-blue-body-end.png',
  './img/boss/tile/village.png',
  './img/boss/fx/ice-spike.png',
  './img/boss/fx/energy-ball.png',
  './img/boss/fx/rock-proj.png',
  './img/boss/fx/spirit-wind.png',
  './img/boss/fx/ice-flake.png',
  './img/boss/fx/ice-pillar.png',
  './img/boss/fx/thunder.png',
  './img/boss/fx/rock-impact.png',
  './img/boss/fx/rock-spike.png',
  './img/boss/fx/smoke-circular.png',
  './img/boss/fx/leaf.png',
  './img/boss/fx/magic-circle.png',
  './img/boss/fx/shield.png',
  './img/boss/fx/boost.png',
  './img/boss/fx/aura.png',
  './img/boss/actor/mage-f-face.png',
  './img/boss/actor/mage-m-face.png',
  './img/boss/actor/slime-face.png',
  './img/boss/actor/racoon-face.png',
  './img/boss/actor/giant-racoon-face.png',
  './img/boss/actor/skull-face.png',
  './img/boss/actor/spirit-face.png',
  './img/boss/actor/giant-spirit-face.png',
  './img/boss/actor/mole-face.png',
  './img/boss/actor/owl-face.png',
  './img/boss/actor/tengu-blue-face.png',
  './img/boss/actor/flam-monster-face.png',
  './img/boss/actor/young-dragon-face.png',
  './img/boss/actor/oblivion-face.png',
  './img/boss/fx/icon-fire.png',
  './img/boss/fx/icon-fire-disabled.png',
  './img/boss/fx/icon-ice.png',
  './img/boss/fx/icon-ice-disabled.png',
  './img/boss/fx/icon-storm.png',
  './img/boss/fx/icon-storm-disabled.png',
  './img/boss/fx/icon-earth.png',
  './img/boss/fx/icon-earth-disabled.png',
  './img/boss/fx/icon-wind.png',
  './img/boss/fx/icon-wind-disabled.png',
  // 35 chiêu tự phát — icon 24×24 + sheet FX mới
  './img/boss/fx/skill-fire-combo3.png', './img/boss/fx/skill-fire-long.png', './img/boss/fx/skill-fire-fast.png',
  './img/boss/fx/skill-fire-combo6.png', './img/boss/fx/skill-fire-execute.png', './img/boss/fx/skill-fire-counter.png',
  './img/boss/fx/skill-ice-combo3.png', './img/boss/fx/skill-ice-long.png', './img/boss/fx/skill-ice-fast.png',
  './img/boss/fx/skill-ice-combo6.png', './img/boss/fx/skill-ice-execute.png', './img/boss/fx/skill-ice-counter.png',
  './img/boss/fx/skill-storm-combo3.png', './img/boss/fx/skill-storm-long.png', './img/boss/fx/skill-storm-fast.png',
  './img/boss/fx/skill-storm-combo6.png', './img/boss/fx/skill-storm-execute.png', './img/boss/fx/skill-storm-counter.png',
  './img/boss/fx/skill-earth-combo3.png', './img/boss/fx/skill-earth-long.png', './img/boss/fx/skill-earth-fast.png',
  './img/boss/fx/skill-earth-combo6.png', './img/boss/fx/skill-earth-execute.png', './img/boss/fx/skill-earth-counter.png',
  './img/boss/fx/skill-wind-combo3.png', './img/boss/fx/skill-wind-long.png', './img/boss/fx/skill-wind-fast.png',
  './img/boss/fx/skill-wind-combo6.png', './img/boss/fx/skill-wind-execute.png', './img/boss/fx/skill-wind-counter.png',
  './img/boss/fx/spark-magic.png', './img/boss/fx/cut-x.png', './img/boss/fx/slash-curved.png', './img/boss/fx/claw.png',
  './img/boss/fx/water.png', './img/boss/fx/water-pillar.png', './img/boss/fx/plant.png', './img/boss/fx/rock-b.png',
  './img/boss/fx/spirit-double.png', './img/boss/fx/shield-yellow.png', './img/boss/fx/circle-spark.png',
  './img/boss/fx/slash-circular.png', './img/boss/fx/big-energy-ball.png',
  // 30 dạng tiến hoá — 30 sheet nhân vật + 30 faceset, xem js/boss-game-evolution-sprites.js
  './img/boss/actor/evo-fire-a.png', './img/boss/actor/evo-fire-a-face.png',
  './img/boss/actor/evo-fire-a1.png', './img/boss/actor/evo-fire-a1-face.png',
  './img/boss/actor/evo-fire-a2.png', './img/boss/actor/evo-fire-a2-face.png',
  './img/boss/actor/evo-fire-b.png', './img/boss/actor/evo-fire-b-face.png',
  './img/boss/actor/evo-fire-b1.png', './img/boss/actor/evo-fire-b1-face.png',
  './img/boss/actor/evo-fire-b2.png', './img/boss/actor/evo-fire-b2-face.png',
  './img/boss/actor/evo-ice-a.png', './img/boss/actor/evo-ice-a-face.png',
  './img/boss/actor/evo-ice-a1.png', './img/boss/actor/evo-ice-a1-face.png',
  './img/boss/actor/evo-ice-a2.png', './img/boss/actor/evo-ice-a2-face.png',
  './img/boss/actor/evo-ice-b.png', './img/boss/actor/evo-ice-b-face.png',
  './img/boss/actor/evo-ice-b1.png', './img/boss/actor/evo-ice-b1-face.png',
  './img/boss/actor/evo-ice-b2.png', './img/boss/actor/evo-ice-b2-face.png',
  './img/boss/actor/evo-storm-a.png', './img/boss/actor/evo-storm-a-face.png',
  './img/boss/actor/evo-storm-a1.png', './img/boss/actor/evo-storm-a1-face.png',
  './img/boss/actor/evo-storm-a2.png', './img/boss/actor/evo-storm-a2-face.png',
  './img/boss/actor/evo-storm-b.png', './img/boss/actor/evo-storm-b-face.png',
  './img/boss/actor/evo-storm-b1.png', './img/boss/actor/evo-storm-b1-face.png',
  './img/boss/actor/evo-storm-b2.png', './img/boss/actor/evo-storm-b2-face.png',
  './img/boss/actor/evo-earth-a.png', './img/boss/actor/evo-earth-a-face.png',
  './img/boss/actor/evo-earth-a1.png', './img/boss/actor/evo-earth-a1-face.png',
  './img/boss/actor/evo-earth-a2.png', './img/boss/actor/evo-earth-a2-face.png',
  './img/boss/actor/evo-earth-b.png', './img/boss/actor/evo-earth-b-face.png',
  './img/boss/actor/evo-earth-b1.png', './img/boss/actor/evo-earth-b1-face.png',
  './img/boss/actor/evo-earth-b2.png', './img/boss/actor/evo-earth-b2-face.png',
  './img/boss/actor/evo-wind-a.png', './img/boss/actor/evo-wind-a-face.png',
  './img/boss/actor/evo-wind-a1.png', './img/boss/actor/evo-wind-a1-face.png',
  './img/boss/actor/evo-wind-a2.png', './img/boss/actor/evo-wind-a2-face.png',
  './img/boss/actor/evo-wind-b.png', './img/boss/actor/evo-wind-b-face.png',
  './img/boss/actor/evo-wind-b1.png', './img/boss/actor/evo-wind-b1-face.png',
  './img/boss/actor/evo-wind-b2.png', './img/boss/actor/evo-wind-b2-face.png'
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
