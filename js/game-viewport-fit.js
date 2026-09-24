/* Co khung game toàn màn theo phần nhìn thấy (trừ bàn phím ảo iPhone) — DÙNG CHUNG (Bắn máy bay, Pháp sư).
   el = khung fixed; ui = {field, canvas, ctx, w, h, dpr}. Canvas đổi cỡ theo field, DPR kẹp maxDpr.
   onResize(w, h, dpr) chỉ gọi khi cỡ hoặc dpr đổi (kéo cửa sổ sang màn khác cũng tính). Trả true nếu đã đổi. */
function fitGameToViewport(el, ui, maxDpr, onResize) {
  const vv = window.visualViewport;
  el.style.top = (vv ? vv.offsetTop : 0) + 'px';
  el.style.height = (vv ? vv.height : window.innerHeight) + 'px';
  const w = ui.field.clientWidth, h = ui.field.clientHeight, dpr = Math.min(maxDpr, window.devicePixelRatio || 1);
  if (!w || !h || (w === ui.w && h === ui.h && dpr === ui.dpr)) return false;
  ui.w = w; ui.h = h; ui.dpr = dpr;
  ui.canvas.width = Math.round(w * dpr); ui.canvas.height = Math.round(h * dpr);
  ui.canvas.style.width = w + 'px'; ui.canvas.style.height = h + 'px';
  ui.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (onResize) onResize(w, h, dpr);
  return true;
}
