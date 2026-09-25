---
phase: 5
title: "Evolution forms and evo sync schema"
status: completed
priority: P2
dependencies: [4]
---

# Phase 5: Evolution forms and evo sync schema

## Overview
Tiến hoá theo từng hệ: cấp 8 mở 2 dạng, cấp 16 mở 2 dạng con của mỗi dạng cấp 8 → 6 dạng/hệ, 30 dạng. Đổi tự do ở sảnh giữa các dạng đã mở. Lưu lựa chọn trong `eng.boss.v1.evo`, gộp LWW.

## Requirements
- Cây mỗi hệ: `base` → `a | b` (cấp 8) → `a1 | a2` (con a), `b1 | b2` (con b) (cấp 16). Chọn được dạng cấp 16 chỉ khi đạt cấp 16 (không bắt buộc đã chọn cha trước — đổi tự do).
- Mỗi dạng: sprite nhân vật 16×16 (4 hướng) + faceset từ gói, 1 chỉ số nhỏ (primitive modifiers có sẵn: `dmgMul`, `clockAdd`, `speedLoosen`, `shield`, `maxHeartsAdd`…), nâng cấp 2 chiêu (ghi đè `effect`/`fx` của slot trong `BOSS_SKILLS`); dạng cấp 16 nâng thêm tuyệt kỹ (hệ số k +0.25).
- Dạng gốc theo giới tính (m/f) như hiện tại; dạng tiến hoá dùng sprite cố định.
- Schema: `evo: { fire: {v: '<formId>' | '', ts}, ... }` (5 hệ). `cleanBoss`: formId phải thuộc `BOSS_EVO_FORMS[el]` (danh sách id đặt **trong** `boss-progress-sync-merge.js` vì server dùng chung — chỉ id, không dữ liệu hiển thị). `mergeBoss`: `mergePick` theo `ts` từng hệ. Thiếu `evo` → `''` (dạng gốc).
- Chọn dạng chưa đủ cấp (dữ liệu từ máy khác khi XP gộp max vẫn đủ) → UI hiện dạng gốc nếu `level < mốc`; không xoá dữ liệu.
- **Cổng đầu phase**: đề xuất bảng 30 dạng (tên VN, sprite gói, chỉ số, 2 chiêu nâng cấp) để user duyệt. Ứng viên sprite: Lửa NinjaFire/DemonRed/SamuraiRed/FighterRed…, Băng NinjaWater/Eskimo/NinjaEskimo…, Sét NinjaThunder/NinjaYellow/RobotGrey…, Đất NinjaLeaf/Shaman/CaveLion/Monk…, Gió NinjaGray/Master/MaskFrog/SorcererOrange…
- Sảnh: màn "Tiến hoá" dạng cây 1→2→4 cho hệ đang chọn, khoá/mở theo cấp, chạm chọn → lưu `{v, ts: Date.now()}`; báo "Có thể tiến hoá!" trên sảnh khi vừa đạt cấp 8/16 lần đầu và màn kết trận khi lên mốc.

## Architecture
- `js/boss-progress-sync-merge.js`: `BOSS_EVO_FORMS`, `emptyBoss().evo`, clean + merge `evo`. File hiện ~105 dòng → còn chỗ.
- `js/boss-game-evolution-forms.js` (dữ liệu thuần): `BOSS_EVO[el][formId] = {name, parent, level, sprite, face, mods, skillOverrides, ultBonus}`.
- `js/boss-game-evolution.js` (thuần): `bossEvoUnlocked(el, formId, level)`, `bossActiveForm(prog, el, level)`, `bossEvoMods(form)` (gộp vào `modifiersFor` ở caller), `bossSkillsFor(el, form)` (ghi đè slot).
- Sprite: `bossMageSprite(gender)` → `bossMageSprite(gender, form)` (`boss-game-sprite-actors.js`, sửa 1 dòng — file 199 dòng, không thêm logic). 30 sheet + 30 faceset ở file dữ liệu **mới** `js/boss-game-evolution-sprites.js` gắn thêm vào `BOSS_SPRITES` (`BOSS_CHAR_ANIMS` dùng chung, cùng khuôn 64×112); atlas không phình. <!-- Updated: Validation Session 1 - tách sprite dạng -->
- UI: `js/boss-game-evolution-ui.js` (DOM), nút ở `boss-game-hub-ui.js`; `boss-game-result-ui.js` báo mốc; `boss-game-portrait-ui.js` faceset theo dạng.

## Related Code Files
- Create: `js/boss-game-evolution-forms.js`, `js/boss-game-evolution.js`, `js/boss-game-evolution-ui.js`, `js/boss-game-evolution-sprites.js`, `tests/boss-game-evolution.test.js`, `img/boss/actor/evo-*.png` (30 sheet + 30 face)
- Modify: `js/boss-progress-sync-merge.js`, `tests/boss-progress-sync-merge.test.js`, `js/boss-game-elements.js` (hoặc caller `boss-game-ui.js`) gộp mods dạng, `js/boss-game-skill-pick.js`, `js/boss-game-sprite-atlas.js`, `js/boss-game-sprite-actors.js`, `js/boss-game-hub-ui.js`, `js/boss-game-result-ui.js`, `js/boss-game-portrait-ui.js`, `js/boss-game-ui.js`, `tools/copy-boss-sprites.js`, `tests/boss-game-sprite-atlas.test.js`, `tests/run-tests.js`, `tests/run-tests.html`, `index.html`, `sw.js`, `js/app-storage.js`, `README.md`, `docs/system-architecture.md`
- Server: không sửa file riêng — `server/auth-and-sync-routes.js` dùng `js/sync-merge.js`, file này `require('./boss-progress-sync-merge.js')` cho `cleanBoss/mergeBoss` (đã xác minh 2026-09-25). Chạy thêm `tests/sync-merge.test.js` + test routes.

## Implementation Steps
1. Cổng: bảng 30 dạng vào `reports/evolution-forms-proposal.md` của plan, user duyệt.
2. **Tests Before**: `boss-progress-sync-merge.test.js` hiện có phải xanh không đổi; thêm test "payload cũ không `evo` → clean ra `evo` rỗng, merge với payload có `evo` giữ `evo`".
3. **Tests After (đỏ)**: clean loại formId lạ / `__proto__` / ts tương lai kẹp; merge giao hoán, kết hợp, idempotent, `merge(x, empty) ≡ x`; LWW theo ts từng hệ; `bossEvoUnlocked` theo mốc; `bossActiveForm` rơi về gốc khi thiếu cấp; mods dạng cộng đúng; skill override thay đúng slot; atlas có đủ 30 sprite/face (test dữ liệu).
4. Sửa schema sync; chạy test server liên quan (`sync-merge.test.js`, `cloud-sync-engine.test.js`).
5. Dữ liệu dạng + logic thuần; nối mods/skills vào tạo trận.
6. Chép sprite, atlas, sprite trận + sảnh + faceset.
7. UI tiến hoá, thông báo mốc.
8. Docs: README mục game Pháp sư (thanh quái, combo, chuỗi niệm, chiêu, tiến hoá); `docs/system-architecture.md` thêm module mới + field `evo`.
9. Bump version; **Regression gate**; kiểm dung lượng ảnh mới (~60 file nhỏ, ước < 300KB).

## Success Criteria
- [ ] Cấp 8/16 mở dạng; đổi tự do; sprite trận/sảnh/faceset đổi đúng.
- [ ] Sync 2 máy: dạng chọn sau (ts lớn hơn) thắng; payload cũ vẫn chạy.
- [ ] Mọi test xanh; docs cập nhật.

## Risk Assessment
- Hợp đồng chỉ-tiến: `evo` thêm rồi không được gỡ; id dạng đã phát hành không được đổi tên (chỉ thêm) — ghi chú ngay trong `BOSS_EVO_FORMS`.
- 30 dạng × cân bằng: chỉ số dạng nhỏ, tái dùng primitive; mô phỏng cuối phase.
- Rollback: revert client an toàn — dữ liệu `evo` trên server bị `cleanBoss` bản cũ bỏ qua? **Không** — bản cũ bỏ field lạ khi clean → mất `evo` nếu lùi bản rồi sync. Chấp nhận (chỉ là lựa chọn giao diện, đổi lại được).
