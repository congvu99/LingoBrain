# Brainstorm — Boss arena: góc nhìn rộng, lưới pixel chung

Date: 2026-09-25 · Mode: markdown only · Status: approved

## Vấn đề
User: góc nhìn cảnh đấu trùm chưa ổn, pixel art cần góc rộng hơn cho cảnh/nhân vật chân thực.

Gốc rễ (scout):
- Tile nền: `bossArenaScale(h) = pixelScale(h/9, 16)` → ~9 hàng tile, phone k≈3 (ô 48px). [js/boss-game-arena.js](../../js/boss-game-arena.js)
- Pháp sư: `km = pixelScale(min(0.3h, 0.3w), 16)` → phone k≈6–7 (~100px). [js/boss-game-render.js:17-35](../../js/boss-game-render.js)
- Quái: 30% cạnh ngắn (trùm 45%).
- → pixel nhân vật ≈ 2× pixel nền: lệch lưới, cảm giác cận cảnh + nhân vật "dán" lên nền. Nền chỉ 1 hàng cây ở chân trời 40%.

## Yêu cầu chốt
- Hướng A: 1 hệ số pixel chung `worldK`.
- Đẹp cả phone dọc lẫn desktop.
- Pháp sư tối thiểu 32px (k=2).
- Đổi cả cỡ đạn phép theo worldK.

## Phương án đã xét
| | Mô tả | Pro | Con |
|---|---|---|---|
| **A (chọn)** | worldK chung tile+mage+quái | pixel đồng nhất, cảnh rộng, ~2–3 file, dễ revert | máy nhỏ nhân vật 32px |
| B | A + nền nhiều lớp, tiền cảnh, hạ chân trời | chân thực nhất | đo tile 4 vùng, công ×2–3 |
| C | chỉ giảm 0.3→0.2 | nhanh | vẫn lệch lưới, vẫn "giả" |

## Giải pháp
1. `layoutBoss`: `worldK = clamp(round(h/14/16), 2, 6)`; lưu `fx.layout.k`.
   - Phone field ~450px → k=2 (ô 32px, mage 32px). Desktop ~800px → k=4. Khung ngang rộng tự thấy nhiều tile hơn.
2. Mage `k=worldK, s=16·worldK`; quái thường `k=worldK`; trùm `k=worldK` với fh gốc, giữ vòng `while` hạ k khi chạm HUD (chấp nhận lệch lưới hiếm gặp).
3. `buildBossArena` dùng `layout.k` thay `bossArenaScale(h)` (xoá hàm).
4. Đạn phép [js/boss-game-sprite-actors.js:184](../../js/boss-game-sprite-actors.js): bỏ `projectile.size*4` px cố định → tính theo worldK (bậc 1/2/3 ≈ 1×/1.25×/1.5× chiều cao mage).
5. Giữ: vị trí mage 22%/86%, quái 70%/52%, chân trời 40%, zoom slow-mo 1.06.

Tự co theo (không sửa): đế đất, threat bar, chữ gõ trên đầu, cast point, impact VFX (theo `layout.s/k`).

## Rủi ro
- Chỗ khác ngầm giả định mage ~100px: `boss-game-tier3-ultimate-fx.js`, `boss-game-skill-fx.js`, evolution sprites → rà cỡ px cứng.
- Zoom slow-mo 1.06 không nguyên → lệch lưới tạm thời (chấp nhận).
- Chữ gõ / threat bar min 46px có thể lấn nhân vật nhỏ → kiểm bằng mắt.
- Test hiện có assert cỡ layout? → chạy `node tests/run-tests.js`, sửa test nếu assert số cũ (không nới lỏng vô cớ).

## Nghiệm thu
- 1 pixel mage = quái thường = tile nền.
- Phone dọc thấy ≥12 hàng tile.
- Trùm (kể cả Oblivion, sheet Attack) không tràn HUD.
- Đạn phép ≤1.5× chiều cao mage.
- Tests pass; kiểm mắt 4 vùng × phone dọc + desktop.

## Ngoài phạm vi
Nền nhiều lớp/tiền cảnh (B), đổi vị trí nhân vật, camera động, game máy bay/game chữ.

## Next
`/ck:plan` với báo cáo này. Bump `APP_VERSION` + `CACHE` sw.js khi deploy.

## Câu hỏi còn mở
- Tỉ lệ bậc đạn phép 1×/1.25×/1.5× — chỉnh sau khi xem thực tế?
