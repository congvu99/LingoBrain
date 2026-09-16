# Design Guidelines — LingoBrain

Chốt lại 2026-09-16 qua `/ui-ux-pro-max`: style **E-Ink / Paper × Nature Distilled** — giấy ngả màu, mực nâu dịu, nhấn gạch đỏ phai. Thay bản 2026-09-15 (mực đen tuyền, viền cứng, không bóng) vì đọc lâu bị chói. Mobile-first ~390px, static CSS, không font ngoài.

## Nguyên tắc
- Trang giấy để lâu đã ngả vàng, chữ viết bằng bút mực nâu. Màu chỉ báo trạng thái, không trang trí.
- Không gradient trên bề mặt nội dung. Độ sâu = nền thẻ sáng hơn nền trang + bóng ấm rất nhẹ + hairline.
- Nội dung học (từ, câu, nghĩa) dùng **serif**; UI phụ (nhãn, nút, tab) dùng **sans hệ thống**; IPA và nhãn bước dùng **mono**.
- Chuyển cảnh mềm: 200ms, `cubic-bezier(.2,.7,.3,1)`; tôn trọng `prefers-reduced-motion`.
- Phản hồi chạm = đổi nền + `scale(.985)`, **không** đảo đen/trắng đột ngột.
- Tap target ≥44px, nav dưới 58px + safe-area.

## Token

| Token | Light | Dark | Dùng cho |
|---|---|---|---|
| `--paper` | `#F6EFE0` | `#1F1C17` | nền trang (ngả vàng) |
| `--paper-2` | `#EDE4D2` | `#282419` | ô lõm: input, nền pressed |
| `--card` | `#FCF8F0` | `#262219` | mặt thẻ / nav / nút — sáng hơn nền trang |
| `--ink` | `#3A332B` | `#DED4C0` | chữ chính (nâu-đen, không đen tuyền) |
| `--ink-muted` | `#6E6454` | `#9C9280` | chữ phụ |
| `--rule` | `#DDD2BD` | `#3B362D` | viền nút, input |
| `--rule-soft` | `#E9E0CE` | `#332E27` | kẻ chia, viền thẻ |
| `--accent` | `#96513C` | `#D89478` | nhấn, badge, tab active, thanh tiến độ |
| `--accent-wash` | `#EFE0D6` | `#332822` | nền badge, mẹo nhớ, vòng focus |
| `--ok` | `#4F6B4A` | `#8FBE93` | đúng / đã xong |
| `--bad` | `#9C4A40` | `#DE8C82` | sai |

Bóng (chỉ light, dark = `none`):
`--sh-1` hairline nút/chip · `--sh-2` thẻ · `--sh-3` viền trên nav.

Tương phản đã đo (thấp nhất trên mọi nền): light ink 9.85:1, muted/accent/ok/bad ≥4.60:1; dark ink 10.53:1, phần còn lại ≥5.04:1. Trạng thái đảo màu (chữ `--paper` trên `--ink`/`--ok`/`--accent`) ≥5.18:1.

## Chữ
```css
--font-read: "Iowan Old Style","Palatino Linotype",Palatino,Georgia,"Times New Roman",serif;
--font-ui: -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,system-ui,sans-serif;
--font-mono: ui-monospace,"SF Mono",Menlo,Consolas,"Liberation Mono",monospace;
```
Thang: 12 (nhãn mono, in hoa, tracking .05em) · 14 (phụ) · 16 (body, line-height **1.7**) · 22 (câu ngữ cảnh, line-height 1.65) · 30 (từ) · 32 (từ lớn). Body ≥16px để iOS không zoom. Tracking mono giảm từ .08em → .05em cho dịu mắt.

## Khoảng cách & bo góc
Lưới 4px: 4 / 8 / 10 / 14 / 18 / 22 / 26. Lề ngang trang 16px (≥600px: 24px); thẻ padding 22px.
`--r:10px` (thẻ, toast, task đang tới giờ) · `--r-sm:8px` (nút, input, tile) · `999px` (chip, badge, thanh tiến độ, heatmap-free).

## Thành phần
- **Thẻ:** nền `--card`, viền 1px `--rule-soft`, radius 10px, `--sh-2`.
- **Nút thường:** cao 48px, nền `--card`, viền 1px `--rule`, `--sh-1`; pressed = nền `--paper-2` + viền `--ink-muted` + `scale(.985)`, mất bóng.
- **Nút chính:** nền `--ink`, chữ `--paper`; pressed đổi sang `--accent`. Mỗi màn 1 nút chính.
- **Nút mờ (ghost):** không viền/nền, chữ `--ink-muted`, gạch chân 1px màu `--rule`, offset 4px.
- **Nút chấm điểm (😵😓🙂😎):** 4 cột, cao 74px, style nút thường; giữ emoji vì là ký hiệu chấm điểm cố định trong README.
- **Input/textarea:** nền `--paper-2`, viền 1px `--rule`; focus = viền `--ink-muted` + ring 3px `--accent-wash` + nền sáng lên `--card`.
- **Việc đang tới giờ (`.task.now`):** thành tờ giấy nổi — nền `--card`, radius 10px, `--sh-1`, vạch bút 3px bo tròn màu `--accent` ở lề trái. Badge "bây giờ" = viên thuốc nền `--accent-wash` chữ `--accent`.
- **Checkbox việc (`.chk`):** 44×44, radius 8px; xong = nền `--ok` chữ `--paper` (trước đây là mực đen).
- **Nav dưới:** nền `--card`, `--sh-3`, 3 tab icon SVG stroke 1.5 + nhãn mono 11px; active = `--accent` + vạch trên 3px bo đáy. Badge số = viên tròn `--accent`.
- **Thanh tiến độ giáo án:** cao 6px, bo 999px, track `--rule-soft`, fill `--accent`, transition 420ms.
- **Stats/heatmap:** 4 mức paper-2 → rule → ink-muted → **accent** (mức cao nhất đổi từ mực sang nhấn để nhìn ra tiến bộ).
- **Chip game (`.game-chip`):** viên thuốc cao 38px, nền `--card`, `--sh-1`; pressed `scale(.97)`. Khoá = `aria-disabled="true"` → viền nét đứt, nền trong suốt (**không** dùng `disabled`: nút disabled không phát `click` nên chạm vào sẽ không hiện được lý do khoá).
- **Ô chữ cái (`.tile`):** 46×46, nền `--card`, radius 8px; pressed `scale(.94)`; đã dùng = opacity .22 nền trong suốt. Ô đích (`.slot`) chỉ gạch chân 2px: `--rule` trống, `--ink-muted` đã điền, `--ok`/`--bad` khi chấm.
- **Đồng hồ game:** cao 4px bo 999px, fill `--ink-muted`; 10 giây cuối đổi `--accent`.
- **MCQ:** đúng = nền `--ok` chữ `--paper`; sai = viền + chữ `--bad`, gạch ngang.
- **Toast:** nền `--ink`, chữ `--paper`, radius 10px, vào bằng `translateY(8px)` + fade 260ms.
- **Giấy ngả màu:** `body::before` SVG feTurbulence noise opacity .05 + `body::after` hai radial-gradient nâu rất nhạt (.10/.09) tạo vệt ố không đều. Cả hai `pointer-events:none`, `z-index:0`; dark chỉ giữ một vệt opacity .05.

## Icon
Nav dùng inline SVG (Lucide-style, stroke 1.5). Nút chức năng giữ emoji 🔊 ⏺ 🐢 (ký hiệu quen thuộc với người dùng), kích thước 16px, không emoji trang trí trong tiêu đề.

## Không làm
Gradient trên thẻ/nút, bóng đậm hoặc lan rộng, bo góc >14px, màu nền rực, chữ <12px, hover-only, animation >420ms, font tải từ mạng, đảo đen/trắng đột ngột khi chạm.
