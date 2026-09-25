---
type: brainstorm
date: 2026-09-25
topic: Mage Lexoria — chiều sâu chiến đấu, nhiều chiêu, tiến hoá, combo tuyệt kỹ, thanh tấn công quái
status: agreed
modes: []
---

# Brainstorm: Mage Lexoria — chiều sâu chiến đấu

## 1. Vấn đề (người chơi nêu)
- Mỗi hệ chỉ "3 chiêu" (thực tế: 2 nội tại + 1 tuyệt kỹ; chỉ **1 phép chủ động** đổi hình theo bậc từ) → nhàm.
- Lên cấp không có cảm giác nhân vật lớn lên (chỉ cộng điểm cây).
- Khó dùng: từ mới hiện đè lên hoạt ảnh phép (khoá chỉ 250–800ms `impactMs`).
- Đòn quái = đồng hồ đếm ngược 10s, gõ xong từ **không** đẩy lùi → vô lý, không thưởng tốc độ.
- Tuyệt kỹ = nộ 8 từ + bấm nút, thiếu kịch tính kiểu combo.

## 2. Hiện trạng codebase (scout)
- 21 file `js/boss-game-*.js`, logic thuần `boss-game-logic.js` (máy trạng thái, event-driven), số cân bằng trong `BOSS_TUNING` (`boss-game-spell-math.js`).
- Cây 5 hệ × 3 bậc: `boss-game-elements.js`, UI `boss-game-skill-tree-ui.js`.
- VFX preset dữ liệu: `boss-game-spell-presets.js`; sprite atlas `boss-game-sprite-atlas.js`; chép sheet bằng `tools/copy-boss-sprites.js` → `img/boss/`.
- Sync `eng.boss.v1` hợp đồng chỉ-tiến, `cleanBoss/mergeBoss` dùng chung client+server (`boss-progress-sync-merge.js`); `alloc` kẹp 0..3.
- Gói Ninja Adventure (CC0) còn nhiều chưa dùng: 36 icon Spell, 8 FX Attack, Water/WaterPillar/Plant/Rock, Aura/Spirit/Shield/Circle, ~80 nhân vật (NinjaFire/Water/Thunder/Leaf, Shaman, Master, DemonRed, SorcererOrange…).
- XP: cấp n cần `50·n·(n−1)`; ~200 XP/trận truyện → cấp 8 ≈ 14 trận, cấp 16 ≈ 60 trận, cấp 20 ≈ 95 trận.

## 3. Quyết định đã chốt (user)
| Chủ đề | Chốt |
|---|---|
| Thanh tấn công quái | Đầy theo giờ, gõ xong từ giảm (nhanh giảm nhiều), gõ sai tăng; đầy → quái đánh |
| Kích hoạt chiêu | Tự phát theo điều kiện, không thêm thao tác |
| Tuyệt kỹ | Combo đầy thanh + "chuỗi niệm" 3 từ |
| Tiến hoá | 2 mốc (cấp 8, 16), cây 2→4 theo nhánh mốc 1 → 6 dạng/hệ, 30 dạng tổng |
| Đổi dạng | Đổi tự do ở sảnh (dạng đã mở khoá theo cấp) |
| Giao hàng | 1 plan, phase A→B→C→D→E, cổng duyệt cảm giác sau phase B |

## 4. Phương án đã cân nhắc
- **Thanh quái**: (a) đầy theo giờ + giảm khi gõ xong ✅ — thưởng tốc độ, đúng ý; (b) chỉ đầy khi idle — người gõ chậm-đều gần như không bị đánh ❌.
- **Kích chiêu**: (a) tự phát theo điều kiện ✅ — game gõ chữ không có tay rảnh; (b) loadout 4 chiêu + phím lệnh ❌ — rối, khó trên mobile.
- **Tuyệt kỹ**: (a) combo + chuỗi niệm ✅ — kịch tính và vẫn luyện từ; (b) giữ nộ + hệ số combo ❌ — ít thay đổi.
- **Tiến hoá**: (a) cây 2→4 ✅ (user chọn dù nhiều nội dung nhất); (b) mốc 2 chung — gọn ~1/3; (c) 1 lần tiến hoá — quá mỏng.

## 5. Thiết kế cuối

### A. Thanh tấn công (thay `st.clock`)
- `st.threat` 0..1, vẽ dưới sprite quái; >75% đỏ, >90% rung.
- Tốc độ đầy = `1 / clock[độ khó]`/giây (thời gian game, vẫn chịu slow-mo khi đang gõ đúng); Băng rank 1 `clockAdd` giữ nghĩa (đầy chậm hơn).
- Gõ xong từ: `−threatDrain × speed(1..2)` (đề xuất 0.35 → nhanh tới 0.7). Gõ sai `+0.1`. Bỏ/hỏng phép `+0.25`.
- Đầy → `bossAttack` (khiên chặn hoặc −❤️), threat = 0.
- Đóng băng: dừng thanh. Lốc xoáy (Gió ult): threat = 0.
- Số mới nằm trong `BOSS_TUNING`.

### B. Nhịp niệm
- Khoá sau niệm = `impactMs[bậc] + afterImpactMs[bậc]` (~0.6/0.9/1.4s; chốt ở validate plan); thanh quái dừng khi khoá → không phạt.
- Cái giá: trận +20–25s; chỉnh bằng 1 số.

### C. Combo + tuyệt kỹ chuỗi niệm
- `st.combo` +1 mỗi từ đúng; từ có lỗi gõ giữ combo, không cộng; bị đánh trúng (khiên chặn thì giữ) / bỏ / hỏng phép → 0.
- Nhân sát thương `1 + 0.05·combo`, trần ×1.5 (combo 10). HUD hiện "COMBO ×n".
- Thanh tuyệt kỹ thay `rage`: +1 mỗi từ đúng, +1 nếu không lỗi và speed ≥ 1.5; đầy 10.
- Kích hoạt (nút/phím như hiện tại) → **chuỗi niệm**: 3 từ liên tiếp từ pool, tổng ~9s, thanh quái đứng. Mỗi từ trọn = 1 đòn. Hiệu lực ult: 0–1 từ 50%, 2 từ 100%, 3 từ ×1.5 "HOÀN HẢO".
- Hiệu ứng ult 5 hệ giữ (meteor/iceAge/chain/revive/tornado), nhân theo kết quả chuỗi.

### D. Bộ chiêu: 7 chủ động tự phát + 2 nội tại + tuyệt kỹ / hệ
Khung điều kiện chung (dữ liệu), mỗi hệ có tên/FX/hiệu ứng riêng:

| Slot | Điều kiện kích | Mở ở cấp (đề xuất) |
|---|---|---|
| 1 | Mọi từ (phép cơ bản ✦–✦✦✦) | 1 |
| 2 | Combo 3 | 2 |
| 3 | Từ ≥ 8 chữ | 3 |
| 4 | Gõ siêu nhanh (speed 2) | 4 |
| 5 | Combo 6 | 6 |
| 6 | Quái < 30% máu (kết liễu) | 8 |
| 7 | Đòn kế ngay sau khi bị đánh (phản đòn) | 10 |

Ví dụ Lửa: Hoả cầu · Song hoả (đòn phụ) · Hoả trụ (×1.8, Explosion×3) · Tia lửa (chí mạng, Spark) · Vòng lửa (đốt DoT, Circle Orange+Flam) · Thiêu rụi (+50%) · Phản hoả (drain ×2, Aura).
- Chiêu mở theo **cấp**, không thêm dữ liệu lưu; **cây nguyên tố giữ nguyên** (không đụng schema `alloc`).
- Nhiều điều kiện trùng 1 từ → ưu tiên cố định (kết liễu > phản đòn > combo 6 > từ dài > nhanh > combo 3 > cơ bản), chỉ 1 chiêu đặc biệt / từ để VFX không chồng.
- 35 icon: dùng 36 icon Spell; thiếu thì tô màu lại.
- Bảng đủ 35 chiêu (tên VN, hiệu ứng, FX) chốt ở phase D.

### E. Tiến hoá
- Theo **từng hệ**; cấp 8: chọn 1/2 dạng; cấp 16: chọn 1/2 dạng con của nhánh cấp 8 → 6 dạng/hệ (2 + 4), 30 dạng.
- Mỗi dạng: sprite nhân vật gói Ninja Adventure + faceset, 1 chỉ số nhỏ, nâng cấp 2 chiêu (đổi FX + hiệu ứng mạnh hơn). Dạng cấp 16 nâng thêm ult.
- Đổi tự do ở sảnh giữa các dạng đã mở (theo cấp). Đổi trường phái → hiện dạng đang chọn của hệ đó.
- Schema: thêm `evo: { fire: { v: '<formId>|""', ts }, … }` vào `eng.boss.v1`; gộp LWW theo `ts` (giống `element`). Thiếu `evo` = chưa tiến hoá. Chỉ sửa `boss-progress-sync-merge.js` (server dùng chung) + test.
- Giới tính (m/f) chỉ áp cho dạng gốc; dạng tiến hoá dùng sprite cố định của gói.

## 6. Touchpoints
- Logic: `boss-game-logic.js` (threat, lock, combo, chain ult), `boss-game-spell-math.js` (`BOSS_TUNING`), `boss-game-elements.js` (ult scale).
- Mới (dự kiến): `boss-game-skill-roster.js` (dữ liệu 35 chiêu + chọn chiêu theo điều kiện, thuần), `boss-game-evolution-forms.js` (dữ liệu 30 dạng), `boss-game-evolution-ui.js`.
- Render/UI: `boss-game-render.js`, `boss-game-sprite-actors.js`, `boss-game-sprite-atlas.js`, `boss-game-spell-presets.js`, `boss-game-ui.js`, `boss-game-hub-ui.js`, `boss-game-portrait-ui.js`.
- Sync: `boss-progress-sync-merge.js`; PWA: `sw.js` ASSETS + `APP_VERSION`/`CACHE`; `tools/copy-boss-sprites.js`.
- Tests: `tests/` (logic thuần + merge evo).

## 7. Tiêu chí chấp nhận
- A: thanh hiện dưới quái; gõ nhanh liên tục thì quái hiếm đánh; đứng yên 10s (Vừa) thì bị đánh; test thuần cho fill/drain/typo/giveup/freeze/pause.
- B: không có đề mới nào hiện trước khi phép chạm + vụ nổ qua đỉnh; thanh không tăng trong khoá.
- C: combo hiện HUD, reset đúng luật; chuỗi niệm 3 từ chạy được, 3 mức hiệu lực đúng; test thuần.
- D: mỗi hệ 7 chiêu có icon + FX riêng, mở theo cấp, ưu tiên tất định; test chọn chiêu.
- E: mở dạng ở cấp 8/16, đổi tự do ở sảnh, sprite trận/sảnh/faceset đổi đúng; merge `evo` giao hoán/idempotent; dữ liệu cũ không `evo` vẫn chạy.
- Chung: `node tests/run-tests.js` xanh; `pwa-assets` xanh; file code ≤ 200 dòng (trừ dữ liệu); FPS ≥ 50 desktop (`?fps`).

## 8. Ngoài phạm vi
- Chọn chiêu thủ công / loadout; reset cây nguyên tố; nhân vật mới ngoài gói Ninja Adventure; đổi hệ số XP/cấp; PvP; âm thanh mới ngoài gói.

## 9. Rủi ro
- **Khối lượng nội dung** (35 chiêu + 30 dạng + VFX) — rủi ro lớn nhất; giảm bằng khung dữ liệu chung + tái dùng FX tô màu.
- Cân bằng: combo ×1.5 + boost ult + chiêu đặc biệt có thể phá HP quái → cần mô phỏng/test số trong phase C–D, có thể nâng `hp`.
- Thay `clock` bằng `threat` đổi hành vi cũ: slow-mo, `clockAdd`, tornado, test cũ phải cập nhật.
- Schema `evo` — hợp đồng chỉ-tiến: thêm field an toàn, không được gỡ sau khi phát hành.
- Kích thước PWA: ~30 sheet nhân vật + FX mới; ước < 1MB, kiểm trong phase E.
- Mobile: chuỗi niệm 9s có thể gắt trên bàn phím iPhone → số trong `BOSS_TUNING`, duyệt ở cổng.

## 10. Kế hoạch phase
1. **A** Thanh tấn công quái (logic + render + test)
2. **B** Nhịp niệm (khoá theo hoạt ảnh) — **cổng duyệt cảm giác trên máy thật**
3. **C** Combo + chuỗi niệm tuyệt kỹ
4. **D** Khung chiêu + 35 chiêu + VFX/icon
5. **E** Tiến hoá 30 dạng + schema `evo` + UI sảnh + docs/PWA

## Câu hỏi chưa giải
1. Tên và hiệu ứng từng chiêu (35) và tên 30 dạng tiến hoá — đề xuất bảng ở đầu phase D/E để user duyệt.
2. Có tăng `hp` quái để bù sát thương combo/chiêu mới không — quyết sau mô phỏng phase C.
3. Phím kích hoạt chuỗi niệm trên mobile giữ nút hiện tại hay thêm cử chỉ — mặc định giữ nút.
