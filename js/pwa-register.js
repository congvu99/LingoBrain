/* Đăng ký service worker (chỉ trên https/localhost) + tự cập nhật: deploy xong, máy người dùng tự lên bản mới,
   không cần F5 (điện thoại / PWA không có nút tải lại). sw.js mới tự skipWaiting → controllerchange → tải lại trang.
   Đang bận (chơi dở, đang gõ chữ) thì hoãn tới lúc rảnh để không mất bài đang làm. */
(function () {
  if (!('serviceWorker' in navigator)) return;
  const secure = location.protocol === 'https:' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  if (!secure) return;
  const UPDATE_CHECK_MS = 30 * 60 * 1000;   // app mở lâu (PWA trên iPhone ít khi bị đóng hẳn) → vẫn kiểm tra định kỳ
  const BUSY_RETRY_MS = 2000;
  const hadController = !!navigator.serviceWorker.controller;   // lần cài đầu tiên: SW nhận trang nhưng không cần tải lại
  let reloading = false;

  // đang chơi game hoặc con trỏ nằm trong ô gõ → tải lại lúc này là mất ván / mất chữ đang gõ
  const busy = () => (typeof game !== 'undefined' && game && !game.over) ||
    (document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName) && !!document.activeElement.value);

  function reloadWhenIdle() {
    if (reloading) return;
    if (!document.hidden && busy()) return void setTimeout(reloadWhenIdle, BUSY_RETRY_MS);
    reloading = true;
    location.reload();
  }
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController) reloadWhenIdle(); });

  navigator.serviceWorker.register('sw.js').then(reg => {
    // bản mới đã tải xong nhưng còn chờ (SW cũ trước khi có tự skipWaiting) → kích hoạt luôn
    if (reg.waiting && hadController) reg.waiting.postMessage('SKIP_WAITING');
    const check = () => reg.update().catch(() => {});
    // mở lại app từ nền: iOS thường chỉ đánh thức trang cũ chứ không tải lại → phải tự hỏi máy chủ có bản mới chưa
    document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
    setInterval(check, UPDATE_CHECK_MS);
  }).catch(() => {});
})();
