# Brainstorm — Mage Lexoria: đa dạng hình chiêu + khung cảnh sân đấu

Ngày: 2026-09-25 · Chế độ: markdown (không --html/--wiki) · Trạng thái: DUYỆT

## Vấn đề
- Chiêu cùng hệ trông y hệt: đạn + va chạm chỉ theo hệ×bậc (`js/boss-game-spell-presets.js`, vd mọi chiêu Lửa = `fireball` → `flam+explosion`). Mỗi chiêu chỉ thêm 1 sprite phụ nhỏ (vfx 0.4–0.5) + tên nổi (`BOSS_SKILL_FX`, `js/boss-game-skill-roster.js`); nhiều chiêu trùng sprite phụ (explosion×2, rockSpike×2, slashCircular×2, spiritDouble×2, auraSprite×2); `solid` tô 1 màu → bóng đặc, khó nhận.
- Quỹ đạo 1 kiểu duy nhất: đường cong sin (`js/boss-game-spell-art.js` stepBossFx/drawBossFx).
- Quái đánh chỉ lunge, không VFX.
- Sân: 4 sân/vùng (`BOSS_ARENAS`, `js/boss-game-arena.js`), 3 quái chung 1 sân; vẽ offscreen 1 lần, hoàn toàn tĩnh.
- Bộ `assets/ninja-adventure` còn nhiều thứ chưa dùng: Projectile (PlantSpike, ShurikenMagic, Kunai, BigShuriken), Slash01-03/Arc/Multi, ClawDouble, CutDouble, SlashDoubleCurved, Circle White/Spark/Spark2, Spirit Blue, Magic/Spark, Ice Flake, Plant B, Rock B, Particle (Fire/Rain/Snow/LeafPink/RockGray/Clouds), Environment (Fog/Raylight), Backgrounds/Animated (Flower, Plant, Water Ripples, Waterfall, Flag, MillPropeller), tileset Field/Dungeon/Relief/Desert/Towers/Water/FloorB/FloorDetail.

## Yêu cầu chốt
- Output: mỗi chiêu (35 + dạng tiến hoá + 5 tuyệt kỹ) nhìn phân biệt được; đòn quái có VFX riêng từng quái; 12 sân riêng theo quái + lớp môi trường động.
- Nguồn hình: CHỈ bộ Ninja Adventure của người dùng.
- Acceptance: không 2 chiêu cùng hệ trùng tổ hợp (đạn, quỹ đạo, va chạm); mỗi quái có sân + ambient riêng; đạn vẫn chạm đúng `BOSS_TUNING.impactMs`; test toàn vẹn dữ liệu pass; soát hình trình duyệt.
- Ngoài phạm vi: số sát thương/logic trận, âm thanh, UI Sổ chiêu/hub.
- Ràng buộc: file logic ≤200 dòng (file dữ liệu thuần được vượt); sprite chép qua `tools/copy-boss-sprites.js`; tăng `APP_VERSION` + `CACHE` sw.js; hiệu năng: người dùng "không lo lắm" → vẫn giữ trần hạt + tắt ambient khi reduced-motion.

## Phương án đã cân
| Mảng | Phương án | Kết luận |
|---|---|---|
| Chiêu | A chỉ đổi hình / **B hình + quỹ đạo** / C code riêng 35 chiêu | **B** — quỹ đạo khác mới là thứ mắt phân biệt; C vi phạm YAGNI, khó bảo trì |
| Sân | A lớp động theo vùng / B 12 sân tĩnh / **C cả hai** | **C** — khác bố cục + có chuyển động |

## Giải pháp chốt
1. **`js/boss-game-skill-motion.js`** (~120 dòng): `bossShotPos(s,k)` thay công thức inline; kiểu `arc` (mặc định), `straight`, `sky`, `ground`, `fan`, `spin`. Bất biến: k=1 → đúng toạ độ quái.
2. **`js/boss-game-skill-visuals.js`** (dữ liệu): mỗi skill id → `{ proj, motion, cast[], impact[], scale }`; basic fallback preset hệ×bậc; bỏ `solid`, dùng sheet màu gốc; mỗi sprite ≤2 lần/hệ. Ví dụ Lửa: Song hoả fan 2×fireball; Hoả trụ ground Flam+Explosion; Tia lửa straight ShurikenMagic→Spark; Vòng lửa ground Circle+Particle Fire; Thiêu rụi sky BigEnergyBall→Explosion×2+Smoke; Phản hoả straight→SlashDoubleCurved.
3. **Tiến hoá**: `BOSS_EVO_SKILL_VISUALS[formId][slot]` cho slot có `skillOverrides` — to hơn + 1 lớp thêm (Slash03, ClawDouble, Circle Spark2…).
4. **Tuyệt kỹ** (`js/boss-game-tier3-ultimate-fx.js`): Mưa sao băng sky nhiều viên; Kỷ băng hà Fog+Snow phủ màn; Xích sét Thunder chuỗi; Hồi sinh Raylight; Lốc xoáy Leaf+Spirit xoay.
5. **Đòn quái**: `BOSS_MONSTER_ATTACK_FX[monsterId]` (Slime Water, Gấu mèo Claw, Đầu lâu/Hồn ma Spirit Blue, Cú Cut, Chuột chũi RockSpike dưới pháp sư, Rồng Fireball ngược…), bắt event `hurt`, VFX nổ tại pháp sư (không đạn bay dài — tránh trễ so với lúc trừ máu).
6. **Sân**: `js/boss-game-arena-layouts.js` (dữ liệu) 12 sân khoá theo id quái, fallback sân vùng; `js/boss-game-arena-ambient.js` lớp động mỗi khung (tile động + thời tiết: Ashford lá, Catacombs Fog, Cliffs Snow, Dragonlair tàn lửa, trùm thêm Raylight/Clouds). Cache nền trong `boss-game-render.js` đổi khoá theo id quái.

## Phase dự kiến
1. Chép sprite + atlas (đo khung ~30 sheet)
2. Motion module + visuals 35 chiêu
3. Visuals tiến hoá + tuyệt kỹ
4. VFX đòn quái
5. 12 sân + ambient
6. Test toàn vẹn (khoá sprite tồn tại, đủ chiêu/quái, bất biến quỹ đạo) + visual QA + bump version + docs (`docs/system-architecture.md`)

## Rủi ro
- Tăng tải PWA ~0.5–1MB ảnh.
- Đo khung sai → hình giật: bắt ở visual QA.
- `hurt` = lúc trừ máu → VFX đòn quái tức thời tại pháp sư.
- Refactor công thức đạn có thể lệch mốc impact → test bất biến k=1.

## Câu hỏi còn mở
- Đòn quái có muốn bước "gồng/telegraph" hiển thị trước `hurt` không (cần xem logic threat gauge có event báo trước)?
- Bảng hình chi tiết 35 chiêu × kiểu quỹ đạo: duyệt nguyên bảng ở phase 2 hay giao planner tự chọn theo nguyên tắc trên?
