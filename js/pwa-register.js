/* Đăng ký service worker (chỉ trên https/localhost); báo khi có bản mới. */
(function () {
  if (!('serviceWorker' in navigator)) return;
  const secure = location.protocol === 'https:' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  if (!secure) return;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (reloading) return; reloading = true; location.reload(); });
  navigator.serviceWorker.register('sw.js').then(reg => {
    function offer(sw) {
      toast('Có bản mới', { label: 'Tải lại', fn: () => sw.postMessage('SKIP_WAITING') });
    }
    if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const sw = reg.installing; if (!sw) return;
      sw.addEventListener('statechange', () => { if (sw.state === 'installed' && navigator.serviceWorker.controller) offer(sw); });
    });
  }).catch(() => {});
})();
