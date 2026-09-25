---
phase: 4
title: "Skill roster 35 auto-trigger skills"
status: pending
priority: P2
dependencies: [3]
---

# Phase 4: Skill roster 35 auto-trigger skills

## Overview
Mỗi hệ có 7 chiêu chủ động tự phát theo điều kiện, mở dần theo cấp; mỗi chiêu có icon + FX riêng từ gói Ninja Adventure. Không thêm thao tác, không đổi schema lưu.

## Requirements
- Khung điều kiện chung (slot → điều kiện → cấp mở):

| Slot | Điều kiện | Cấp |
|---|---|---|
| basic | mọi từ (bậc ✦–✦✦✦ hiện có) | 1 |
| combo3 | `combo` vừa chạm bội số 3 | 2 |
| long | từ ≥ 8 chữ | 3 |
| fast | `speed >= 2` | 4 |
| combo6 | `combo` vừa chạm bội số 6 | 6 |
| execute | quái < 30% HP lúc niệm | 8 |
| counter | cast đầu tiên sau khi bị đánh | 10 |

<!-- Updated: Validation Session 1 - nén mở chiêu: đủ 7 ở cấp 10 (~22 trận) -->

- Ưu tiên khi trùng (tất định): execute > counter > combo6 > long > fast > combo3 > basic. Mỗi từ tối đa 1 chiêu đặc biệt.
- Hiệu ứng là **dữ liệu** (không code riêng từng chiêu), tổ hợp từ các primitive: `dmgMul`, `extraHits`, `crit`, `burn {dps,sec}`, `freeze {sec}`, `threatDrainMul`, `shield +n`, `heal +n`, `ultAdd`. Primitive mới chỉ thêm khi bảng chiêu cần.
- Nội tại rank 1–2 và cây nguyên tố **giữ nguyên**.
- Event `cast` thêm `skill: <id>`; render hiện tên chiêu nổi lên (float text) + FX preset theo skill.
- **Cổng đầu phase**: đề xuất bảng 35 chiêu (tên VN, điều kiện, hiệu ứng, icon, FX) để user duyệt trước khi code dữ liệu. Ví dụ Lửa: Hoả cầu · Song hoả (extraHits 1) · Hoả trụ (dmgMul 1.8) · Tia lửa (crit) · Vòng lửa (burn) · Thiêu rụi (dmgMul 1.5) · Phản hoả (threatDrainMul 2).
- Tách file (validation): chữ tên chiêu nổi + vẽ FX chiêu ở `js/boss-game-skill-fx.js` (mới), **không** thêm vào `boss-game-sprite-actors.js` (199 dòng). Key sprite FX mới ở file dữ liệu `js/boss-game-skill-sprites.js` gắn thêm vào `BOSS_SPRITES` (atlas 193 dòng).
- Sảnh: màn "Sổ chiêu" liệt kê 7 chiêu hệ đang chọn (icon, điều kiện, khoá/mở theo cấp).

## Architecture
- `js/boss-game-skill-roster.js` (dữ liệu thuần, không hàm): `BOSS_SKILL_SLOTS`, `BOSS_SKILLS[el][slot] = {id, name, icon, fx, effect}`.
- `js/boss-game-skill-pick.js` (thuần): `bossPickSkill(ctx, el, level)` → skill|null với ctx `{combo, letters, speed, hpRatio, afterHit}`; `bossApplySkillEffect(st, skill, dmg)` → dmg/hits sau hiệu ứng.
- `createBattle` nhận `level` (từ `levelFromXp` ở `boss-game-ui.js:50`); `st.afterHit` đặt true ở bossAttack trúng.
- `castComplete` gọi pick + apply trước khi đẩy `pendingImpacts`.
- FX: preset trong `boss-game-spell-presets.js` theo `skill.fx` (tái dùng key sprite có sẵn + key mới); sprite mới qua `tools/copy-boss-sprites.js`: Attack/CutX, SlashCurved, Claw; Elemental/Water, WaterPillar, Plant, Rock; Magic/Spirit, Shield blue/yellow, Circle white/spark; icon Spell (Book*/Orb*/…) → `img/boss/fx/skill-*.png`.
- UI sổ chiêu: `js/boss-game-skill-book-ui.js` (DOM), nút ở sảnh.

## Related Code Files
- Create: `js/boss-game-skill-roster.js`, `js/boss-game-skill-pick.js`, `js/boss-game-skill-book-ui.js`, `js/boss-game-skill-fx.js`, `js/boss-game-skill-sprites.js`, `tests/boss-game-skill-pick.test.js`, `img/boss/fx/skill-*.png` + sheet FX mới
- Modify: `js/boss-game-logic.js`, `js/boss-game-spell-presets.js`, `js/boss-game-sprite-atlas.js`, `js/boss-game-sprite-actors.js`, `js/boss-game-render.js`, `js/boss-game-ui.js`, `js/boss-game-hub-ui.js`, `tools/copy-boss-sprites.js`, `tests/boss-game-sprite-atlas.test.js`, `tests/run-tests.js`, `tests/run-tests.html`, `index.html`, `sw.js`, `js/app-storage.js`, `css/paper-theme.css`

## Implementation Steps
1. Cổng: viết bảng 35 chiêu vào `reports/skill-roster-proposal.md` của plan, user duyệt.
2. **Tests Before**: sát thương phép basic (không chiêu đặc biệt) phải bằng hiện tại ở cấp 1.
3. **Tests After (đỏ)**: mỗi slot kích đúng điều kiện; khoá theo cấp; ưu tiên tất định khi trùng; mọi `BOSS_SKILLS[el][slot]` tồn tại, icon/fx key có trong atlas (test dữ liệu); mỗi primitive áp đúng; counter chỉ 1 lần sau mỗi đòn trúng; execute dùng HP **lúc niệm**.
4. Tạo dữ liệu + pick; nối vào `castComplete`.
5. Chép sprite/icon, preset FX, float text tên chiêu.
6. Sổ chiêu ở sảnh.
7. Mô phỏng lại thời gian hạ quái (như phase 3) → đề xuất `hp` nếu cần.
8. Bump version; **Regression gate**; kiểm dung lượng `img/boss/` tăng < 500KB.

## Success Criteria
- [ ] 35 chiêu có dữ liệu, icon, FX; test dữ liệu xanh.
- [ ] Chơi cấp 10+: thấy đủ 7 loại chiêu xuất hiện; cấp 1 chỉ basic.
- [ ] `wc -l` mọi file code boss ≤ 200.
- [ ] FPS ≥ 50 desktop khi chiêu + combo dồn.

## Risk Assessment
- Khối lượng nội dung lớn nhất plan: dùng primitive dữ liệu + tái dùng FX tô màu (`opt.solid` atlas).
- VFX chồng: tối đa 1 chiêu đặc biệt/từ.
- Icon thiếu cho 35 chiêu: tô màu lại icon cùng họ.
