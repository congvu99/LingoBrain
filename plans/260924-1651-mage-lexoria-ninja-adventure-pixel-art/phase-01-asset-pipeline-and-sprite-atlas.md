---
phase: 1
title: "Asset pipeline and sprite atlas"
status: pending
priority: P1
dependencies: []
---

# Phase 1: Asset pipeline and sprite atlas

## Overview
Đưa sheet cần cho bản thử vào repo và viết module nạp/cắt/vẽ sprite chuẩn pixel, dùng chung cho mọi phase sau.

## Requirements
- Chỉ copy file dùng thật từ `D:\project\eng\assets\ninja-adventure\` vào `img/boss/` (thư mục phẳng theo nhóm: `img/boss/actor/`, `img/boss/fx/`, `img/boss/tile/`).
- Gói gốc không vào git: thêm `assets/ninja-adventure/` vào `.gitignore` ở repo chính.
- Nạp ảnh không chặn trận: ảnh chưa xong thì bỏ qua lượt vẽ đó (không ném lỗi). Offline được nhờ nằm trong ASSETS.
- Hiển thị chuẩn pixel: `ctx.imageSmoothingEnabled = false`, phóng số nguyên, toạ độ `Math.round`.

## Architecture
`js/boss-game-sprite-atlas.js` (< 200 dòng) gồm hai phần:
- **Phần thuần** (test được trong vm, không đụng DOM):
  - `BOSS_SPRITES`: bảng mô tả `{ src, fw, fh, anims: { idle: {row|col, frames, fps, dir}, attack, hurt, ... } }`. Mô tả hai kiểu sheet:
    - nhân vật/quái 4 hướng: cột = hướng (`down 0, up 1, left 2, right 3`), hàng = khung.
    - trùm/VFX: một dải ngang, khung = `width / fh` (sheet vuông khung).
  - `spriteFrame(def, anim, tSec)` → `{sx, sy, sw, sh}` (vòng lặp hoặc giữ khung cuối nếu `loop:false`).
  - `pixelScale(targetPx, frameH)` → số nguyên ≥ 1.
- **Phần DOM**: `loadBossSprites(names)` (Promise, cache `Image` theo src), `bossSpriteReady(name)`, `drawSprite(ctx, name, anim, tSec, x, y, scale, opt)` với `opt = { flash, alpha, flipX }`. Điểm neo = giữa-chân. `flash` vẽ bản trắng qua canvas tạm cache theo khung (tránh tô lên nền).

## Related Code Files
- Create: `js/boss-game-sprite-atlas.js`, `tests/boss-game-sprite-atlas.test.js`, `img/boss/**.png` (bản thử: SorcererBlack + mage nam đã chọn, Slime, Fireball, Flam, Explosion, Smoke, tile cỏ/cây/nhà Ashford)
- Modify: `index.html` (script trước `boss-game-render.js`), `sw.js` (ASSETS gồm js + từng png, CACHE bump), `js/app-storage.js` (APP_VERSION bằng CACHE), `tests/run-tests.js` + `tests/run-tests.html` (PURE_MODULES), `.gitignore` (repo chính)

## Implementation Steps
1. Viết script copy một lần (`tools/copy-boss-sprites.js`: danh sách nguồn → đích, chạy tay; không cần build). Copy bộ bản thử.
2. Viết `BOSS_SPRITES` + `spriteFrame` + `pixelScale`; test: đúng khung theo thời gian, loop/giữ khung cuối, hướng → cột, sheet dải ngang, scale ≥ 1 và nguyên.
3. Viết phần DOM (load/cache/draw/flash), guard `typeof Image`.
4. Thêm script vào index.html và sw.js; thêm từng png vào ASSETS; bump CACHE/APP_VERSION.
5. Chạy `node tests/run-tests.js` và `node --check js/boss-game-sprite-atlas.js`.

## Success Criteria
- [ ] Test atlas xanh; toàn bộ test xanh; `pwa-assets` xanh.
- [ ] `git status` repo chính không còn `assets/` untracked.
- [ ] Tổng dung lượng `img/boss/` < 300KB.

## Risk Assessment
- Quên thêm png vào ASSETS thì offline mất hình. Giảm rủi ro: test pwa-assets kiểm thêm mọi `img/boss/*.png` được `BOSS_SPRITES` tham chiếu đều có trong ASSETS.
- Tên file có dấu cách (`Skill Icon`) → đổi tên kebab-case khi copy.
