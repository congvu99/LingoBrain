# Phase 7 — QA, docs, phát hành

## Kiểm
- `node tests/run-tests.js` + test mới của phase 1.
- Ảnh chụp agent-browser: 375×667, 390×844, 844×390 (ngang); sáng/tối; `prefers-reduced-motion`. Mỗi tab + stage ôn (từ mới 5 bước, ôn lại, chấm, xong phiên) + 6 game.
- iPhone thật (PWA đã cài): bàn phím trong Bắn máy bay / Pháp sư / Gõ từ; swipe-back thoát stage; safe-area.
- Checklist §1–§3 ui-ux-pro-max: vùng chạm ≥44px, focus, aria cho ✕/loa, tương phản.
- Tương thích dữ liệu: khôi phục backup v2.24.8; đồng bộ 2 máy (1 bản cũ + 1 bản mới) — schema không đổi nên phải qua.

## Phát hành
- `APP_VERSION` (`js/app-storage.js`) = `CACHE` (`sw.js`) → 2.25.0 (test `pwa-assets`).
- Docs: README (3 tab → 4 tab; "Tab Giáo án" → "Thói quen"), `docs/design-guidelines.md` (bố cục, tab, stage), `docs/system-architecture.md` (`#stage`, `todayMetrics`).

## Rollback
- Chỉ client tĩnh, không migration → revert commit + tăng version lần nữa; SW tự lên bản.
