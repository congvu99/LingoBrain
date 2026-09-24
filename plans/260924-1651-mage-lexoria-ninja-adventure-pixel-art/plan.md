---
title: "Mage Lexoria pixel art overhaul (Ninja Adventure)"
description: "Thay toàn bộ hình vẽ canvas của game Pháp sư bằng sprite Ninja Adventure (CC0), góc nhìn trận kiểu Pokémon; làm bản thử trước."
status: completed
priority: P2
branch: "integration-mage"
tags: [frontend, game, graphics]
blockedBy: []
blocks: []
created: "2026-09-24T09:56:39.803Z"
createdBy: "ck:plan"
source: skill
---

# Mage Lexoria pixel art overhaul (Ninja Adventure)

## Overview
Đổi đồ hoạ game Pháp sư từ canvas path sang sprite pixel **Ninja Adventure** (pixel-boy, CC0). Chỉ đổi lớp vẽ: logic trận, sync `eng.boss.v1`, progress và 419 test giữ nguyên. Nguồn: [brainstorm report](../reports/brainstorm-260924-1634-mage-lexoria-pixel-art-graphics-overhaul-report.md).

Gói gốc nằm ở `D:\project\eng\assets\ninja-adventure\` (109MB, **không commit**). Chỉ copy sheet dùng thật vào `img/boss/` (ước tính < 300KB).

## Kết quả kiểm gói (2026-09-24)
- **Nhân vật** 16×16, sheet 64×112: 4 cột hướng (xuống/lên/trái/phải) × hàng đi (4), tấn công (1), nhảy, đặc biệt; kèm Faceset 38×38. Ứng viên: nữ `SorcererBlack` (tóc đỏ), nam `NinjaMageOrange` (mũ phù thuỷ).
- **Quái** 66 con 16×16 (4 hướng × 4 khung). **Trùm** 20 con 40–96px, có Idle/Hit/(Attack/Charge). Rồng `DragonBlue/Green` là rồng ghép mảnh (Head/Body/Wing).
- **VFX**: Flam, Ice, Thunder, Rock, RockSpike, Plant, Explosion, Water; đạn Fireball/IceSpike/EnergyBall/PlantSpike/Rock; Magic Circle/Boost/Shield/Spark/Spirit; Smoke/SmokeCircular; hạt Leaf/Fire/Snow/Spark. **Không có VFX gió riêng**: gió dùng SmokeCircular + Leaf.
- **Nền**: chỉ có tileset top-down, không có nền ngang, nên phải ghép sân đấu từ tile.

## Quyết định thiết kế
- **Góc nhìn Pokémon**: pháp sư quay lưng (cột "lên") ở dưới-trái, quái quay mặt (cột "xuống") ở trên-phải. Trùm trong gói đều vẽ chính diện nên hợp góc này.
- Phóng số nguyên theo cỡ khung, `imageSmoothingEnabled=false`, toạ độ làm tròn.
- Sprite ít khung (tấn công chỉ 1 khung), nên bổ sung chuyển động bằng code: nhún, lao, nháy trắng, giật lùi, tan pixel.
- Giữ nguyên `id` quái và `BOSS_STORY[].monster` (không đụng dữ liệu đã lưu). Chỉ đổi `name`, tên trong câu truyện, thêm `sprite` và bỏ `shape/palette/features`.

## Phases
| Phase | Name | Status |
|-------|------|--------|
| 1 | [Asset pipeline and sprite atlas](./phase-01-asset-pipeline-and-sprite-atlas.md) | Completed |
| 2 | [Prototype battle scene](./phase-02-prototype-battle-scene.md) | Code done — **user kiểm cảm nhận + FPS trên iPhone thật** (chưa đo được trong phiên) |
| 3 | [Full monster roster and regions](./phase-03-full-monster-roster-and-regions.md) | Completed |
| 4 | [Element VFX and ultimates](./phase-04-element-vfx-and-ultimates.md) | Completed — **FPS ≥ 50 lúc tuyệt kỹ: user kiểm `?fps`** (chưa đo bằng benchmark thật) |
| 5 | [Hub portraits cleanup and docs](./phase-05-hub-portraits-cleanup-and-docs.md) | Completed |

**Cổng duyệt:** hết phase 2, user duyệt cảm nhận trên iPhone thì mới làm phase 3–5 (code đã làm tiếp theo yêu cầu
của user trong phiên; **cổng duyệt iPhone/FPS thật vẫn để user tự kiểm sau** — không có thiết bị thật/benchmark
trong môi trường agent).

## Dependencies
- Chạy trên nhánh `integration-mage` (game Pháp sư P1–P5 đã tích hợp). Không chặn và không bị chặn bởi plan khác.
- Cần `D:\project\eng\assets\ninja-adventure\` tồn tại lúc copy sheet (phase 1, 3, 4).

## Acceptance (toàn plan)
- Trận, sảnh, màn chọn pháp sư và nhật ký đều dùng sprite gói; không còn file vẽ tay (mage-art, monster-shapes, monster-art, tier3-shapes, phần vẽ tay của scene).
- Ảnh sắc nét (không nhoè) ở DPR 1, 2 và 3; FPS desktop ≥ 50 (`?fps`).
- Offline PWA chạy đủ: mọi ảnh nằm trong `sw.js` ASSETS; `pwa-assets` xanh; APP_VERSION bằng CACHE.
- `node tests/run-tests.js` xanh; không file code nào > 200 dòng (trừ file dữ liệu).
- Credit pixel-boy & AAA trong README (CC0, ghi nhận tự nguyện).

## Câu hỏi chưa giải
1. ~~Pháp sư nam~~ → chốt `NinjaMageOrange` (2026-09-24).
2. ~~Duyệt bảng đổi tên 12 quái ở phase 3~~ → chốt như bảng đề xuất (2026-09-24).
3. Có đổi chữ HUD sang `NormalFont.ttf` của gói không? (mặc định: không, YAGNI)
