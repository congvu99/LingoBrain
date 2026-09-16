# Design Guidelines — LingoBrain

Chốt 2026-09-15 qua `/ck:ui-ux-pro-max` (style "E-Ink / Paper", palette Notes & Writing điều chỉnh ấm hơn). Mobile-first ~390px, static CSS, không font ngoài.

## Nguyên tắc
- Trang giấy, mực đen. Màu chỉ để báo trạng thái, không trang trí.
- Không gradient, không shadow, không bo góc lớn (≤4px). Độ sâu = viền hairline + đảo màu.
- Nội dung học (từ, câu, nghĩa) dùng **serif**; UI phụ (nhãn, nút, tab) dùng **sans hệ thống**; IPA và nhãn bước dùng **mono**.
- Chuyển cảnh "lật trang": tức thì hoặc ≤120ms, tôn trọng `prefers-reduced-motion`.
- Tap target ≥44px, nav dưới 56px + safe-area.

## Token

| Token | Light | Dark |
|---|---|---|
| `--paper` | `#FBF7EF` | `#1B1A17` |
| `--paper-2` (ô, input, thanh) | `#F1EBDF` | `#24221E` |
| `--ink` | `#1A1714` | `#E8E2D6` |
| `--ink-muted` | `#5C554B` | `#A39B8D` |
| `--rule` (viền, kẻ) | `#D9D2C3` | `#3A362F` |
| `--accent` (nhấn, badge, active) | `#9A3B2E` | `#E08A6E` |
| `--ok` | `#2F6B3A` | `#8FC79A` |
| `--bad` | `#A32D2D` | `#E27F7F` |

Tương phản light: ink/paper ≈ 15:1, ink-muted/paper ≈ 7:1, accent/paper ≈ 7:1. Dark kiểm tra riêng, ink/paper ≈ 13:1.

## Chữ
```css
--font-read: "Iowan Old Style","Palatino Linotype",Palatino,Georgia,"Times New Roman",serif;
--font-ui: -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,system-ui,sans-serif;
--font-mono: ui-monospace,"SF Mono",Menlo,Consolas,"Liberation Mono",monospace;
```
Thang: 12 (nhãn mono, in hoa, tracking .08em) · 14 (phụ) · 16 (body, line-height 1.6) · 20 (câu ngữ cảnh) · 28 (từ) · 32 (từ lớn). Body ≥16px để iOS không zoom.

## Khoảng cách
4px lưới: 4 / 8 / 12 / 16 / 24 / 32. Lề ngang trang 16px; thẻ padding 20px; giữa khối 24px.

## Thành phần
- **Thẻ (trang sách):** nền `--paper`, viền 1px `--rule`, radius 4px, không shadow. Nhãn bước mono in hoa `--ink-muted` phía trên.
- **Nút thường:** cao 48px, viền 1px `--ink`, nền trong suốt, chữ `--ink` 16px sans 500; pressed = đảo màu (nền ink, chữ paper), không transition.
- **Nút chính:** nền `--ink`, chữ `--paper`. Mỗi màn 1 nút chính.
- **Nút mờ (ghost):** không viền, chữ `--ink-muted`, gạch chân khi hover/focus.
- **Nút chấm điểm (😵😓🙂😎):** 4 cột, cao 64px, viền `--rule`; giữ emoji vì là ký hiệu chấm điểm cố định trong README; chú thích ngày mono 12px.
- **Input/textarea:** nền `--paper-2`, viền 1px `--rule`, focus = viền `--ink` 2px, không glow. Font serif cho ô gõ từ/câu.
- **Nav dưới:** nền `--paper`, viền trên 1px `--rule`, 3 tab icon SVG stroke 1.5 + nhãn 12px; active = `--accent` + gạch trên 2px. Badge số = nền `--accent` chữ paper.
- **Thanh tiến độ:** track `--rule`, fill `--ink`, cao 4px, radius 0.
- **Heatmap/forecast (stats):** 4 mức xám mực (paper-2 → rule → ink-muted → ink); không dùng màu.
- **Chip game (`.game-chip`):** viên thuốc cao 36px, viền 1px `--rule`, nền `--paper`, chữ 14px sans 500; hàng cuộn ngang, không xuống dòng. Khoá = `aria-disabled="true"` → chữ `--ink-muted`, viền nét đứt (**không** dùng thuộc tính `disabled`: nút disabled không phát `click` nên trên điện thoại chạm vào sẽ không hiện được lý do khoá). Kỷ lục hiện mono 11px `--ink-muted`.
- **Ô chữ cái (`.tile`):** tối thiểu 44×44, nền `--paper-2`, viền `--rule`, chữ serif 20px 600; pressed = đảo màu; đã dùng = opacity .25. Ô đích (`.slot`) chỉ có gạch chân 2px: `--rule` khi trống, `--ink` khi đã điền, `--ok`/`--bad` khi chấm.
- **Đồng hồ game (`.bar-track`/`.bar`):** cao 3px, track `--rule`, fill `--ink`; 10 giây cuối đổi sang `--accent`. Combo hiện mono 12px `--accent`.
- **Toast:** nền `--ink`, chữ `--paper`, không bo, đáy + safe-area.
- **Hạt giấy:** `body::before` SVG feTurbulence noise, opacity .04, `pointer-events:none`, tắt ở dark nếu nhiễu.

## Icon
Nav dùng inline SVG (Lucide-style, stroke 1.5). Nút chức năng giữ emoji 🔊 ⏺ 🐢 (ký hiệu quen thuộc với người dùng), kích thước 16px, không emoji trang trí trong tiêu đề.

## Không làm
Gradient, box-shadow, bo góc >4px, màu nền rực, chữ <12px, hover-only, animation >300ms, font tải từ mạng.
