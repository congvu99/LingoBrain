---
phase: 4
title: "Quái (5 dáng → 12 con), nền vùng, dữ liệu 28 đoạn truyện, thẻ truyện, Nhật ký"
status: pending
priority: P2
dependencies: [1, 2]
---

# Phase 4: Quái, vùng đất, cốt truyện

## Overview
Thế giới Lexoria: 4 vùng nền, 12 quái vẽ từ 5 dáng tham số, 28 đoạn truyện tiếng Việt cài từ tiếng Anh trong bộ từ. Làm ngay sau phase 2 (thứ tự 1 → 2 → 4 → 5 → 3 → 6); không phụ thuộc phase 3. Soạn nháp truyện sớm để user duyệt song song khi vẽ quái.

## Requirements
- Functional:
  - 12 quái: Goblin, Sói, Vua Goblin (ch.1) · Xương, Ma, Lich (ch.2) · Troll, Harpy, Wyvern (ch.3) · Hiệp sĩ đen, Rồng con, **Oblivion** (ch.4). Mỗi quái: `{id, name, shape, palette, size, weak, hpMul, clockMul, attackFx}`. Trùm chương to hơn, `hpMul 2`.
  - Hoạt ảnh quái: thở/lơ lửng, trúng đòn (nháy trắng + giật lùi), ra đòn (lao tới), chết (tan thành hạt màu palette), đóng băng.
  - 4 nền: Làng Ashford (hoàng hôn, mái nhà), Hầm mộ (đá, nến), Núi đá (vách, mây), Hang rồng (dung nham, vàng). Nền vẽ 1 lần vào canvas offscreen, chỉ vẽ lại khi resize.
  - 28 đoạn: mỗi trận `{monster, intro (2–3 câu), outro (1–2 câu)}`; trận 7 mỗi chương là trùm chương. Truyện có mở đầu (Oblivion thức giấc) và kết (hạ Oblivion, chữ trở về).
  - Markup từ: `{word-id}` trong câu → render thành từ tiếng Anh (qua `storySegments` ở `boss-game-progress.js`); **đã học** → tô màu, chạm → `speak(word)`; chưa học → chữ thường, không lộ nghĩa.
  - **Escape**: mọi đoạn truyện, tên quái, từ/nghĩa render bằng `textContent` hoặc `esc()`; class tô màu cố định (không lấy từ dữ liệu).
  - Thẻ truyện: trước trận (tên quái + hình + intro, nút **Chiến đấu**), sau thắng (outro). **Nhật ký hành trình**: danh sách đoạn đã mở theo chương, đọc lại được.
- Non-functional: truyện viết giọng fantasy nhẹ nhàng, mỗi câu ≤ 25 từ, hợp đọc trên điện thoại; tên riêng giữ tiếng Anh (Ashford, Oblivion…).

## Architecture
- **`js/boss-game-story.js`** (CHỈ DỮ LIỆU, không hàm): `BOSS_REGIONS`, `BOSS_MONSTERS`, `BOSS_STORY[28]` (index = beat). Hàm `storySegments` ở `boss-game-progress.js` (phase 1).
- **`js/boss-game-monster-art.js`**: `drawMonster(ctx, m, x, y, s, {pose, t, hitFlash, frozen})` — pose, palette, nháy trúng đòn, lớp băng; gọi hàm dáng.
- **`js/boss-game-monster-shapes.js`**: 5 hàm dáng `humanoid` (goblin, vua goblin, xương, lich, hiệp sĩ đen, troll), `beast` (sói), `wraith` (ma), `flyer` (harpy, wyvern), `dragon` (rồng con, Oblivion); chi tiết tham số: sừng, vương miện, áo choàng, cánh, mắt phát sáng.
- **`js/boss-game-scene.js`**: `buildRegionBackdrop(region, w, h, dpr)` → canvas offscreen; hậu kỳ chậm thời gian chuyển từ `boss-game-render.js` (phase 2) sang đây.
- Nội dung: Claude soạn nháp 28 đoạn, **user duyệt** trước khi chốt (câu hỏi mở). Chọn từ cài vào truyện từ những từ phổ biến trong `words.json` (id tồn tại).

## Related Code Files
- Create: `js/boss-game-story.js`, `js/boss-game-monster-art.js`, `js/boss-game-monster-shapes.js`, `js/boss-game-scene.js`, `tests/boss-game-story.test.js`
- Modify: `js/boss-game-render.js` (dùng quái/nền thật), `js/boss-game-hub-ui.js` (thẻ truyện + Nhật ký), `tests/run-tests.js`, `tests/run-tests.html`, `index.html`, `sw.js` (ASSETS), `css/paper-theme.css`

## Implementation Steps
1. Định nghĩa `BOSS_MONSTERS` + `BOSS_REGIONS` (khớp bảng khắc hệ: ch.1 sợ Lửa, ch.2 Đất, ch.3 Băng, ch.4 Sét; quái thường trong chương có thể khác hệ để đa dạng — ghi rõ trong dữ liệu).
2. 5 dáng quái + 4 pose + palette → 12 con; xem trên trang nháp.
3. 4 nền offscreen.
4. Soạn 28 đoạn truyện (nháp) → gửi user duyệt → chốt.
5. `tests/boss-game-story.test.js`: `BOSS_STORY` đủ 28 đoạn, mỗi `monster` có trong `BOSS_MONSTERS`, mỗi `weak` ∈ `BOSS_ELEMENTS`, mọi `{id}` có trong `words.json` (đọc file như `audio-manifest.test.js`); `storySegments` trên dữ liệu thật không lộ nghĩa từ chưa học.
6. Thẻ truyện trước/sau trận + Nhật ký (DOM, `textContent`).
7. **Điểm duyệt của user**: ảnh chụp 12 quái + 4 nền.

## Success Criteria
- [ ] User duyệt 12 quái (khác nhau rõ, trùm chương to và uy hơn) — điểm duyệt, không phải cổng tự động.
- [ ] Mọi `{id}` trong truyện tồn tại trong `words.json` (test).
- [ ] Từ đã học trong truyện tô màu, chạm nghe được; từ chưa học không lộ nghĩa.
- [ ] Nhật ký chỉ hiện đoạn đã mở.

## Risk Assessment
- Vẽ quái tham số dễ "xấu đều" → ưu tiên hình khối rõ, bóng + viền sáng mắt; chấp nhận phong cách stylized.
- Nội dung truyện là điểm nghẽn con người → soạn sớm, duyệt song song khi code hình.
- Bộ từ thay đổi (gỡ từ) làm truyện tham chiếu từ không còn → test bắt lỗi, `storySegments` rơi về text thường.
