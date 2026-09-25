---
type: proposal
phase: 4
date: 2026-09-25
topic: Bảng 35 chiêu tự phát (5 hệ × 7 slot) — cổng duyệt đầu phase 4
status: chờ duyệt
---

# Đề xuất bảng 35 chiêu — Mage Lexoria

## 0. Quy ước

- Slot/điều kiện/cấp mở/ưu tiên theo `phase-04-...md`: basic(1) · combo3(2) · long ≥8 chữ(3) · fast `speed>=2`(4) · combo6(6) · execute HP<30% lúc niệm(8) · counter cast đầu sau khi bị đánh **trúng**(10). Ưu tiên: execute > counter > combo6 > long > fast > combo3 > basic.
- `D` = sát thương phép hiện tại (bậc × tốc độ × khắc hệ × nội tại × combo). Slot **basic = `{}`** cho cả 5 hệ → cấp 1 bằng đúng sát thương hiện tại (khớp Tests Before).
- Nghĩa primitive (đề xuất, chốt khi code):
  - `dmgMul k`: D × k.
  - `extraHits n`: n đòn phụ, mỗi đòn **50% D** (tính trước crit, không crit riêng).
  - `crit`: ép chí mạng ×`critMul` 1.5; đã crit sẵn (Sét rank 2 `fastCrit`) thì không cộng dồn.
  - `burn {dps,sec}`: như nội tại Lửa rank 2 (ghi đè burn đang cháy).
  - `freeze {sec}`: `frozenUntil = max(...)` → thanh quái đứng.
  - `threatDrainMul k`: lượng giảm thanh lúc niệm (`threatDrain × speed`) × k.
  - `shield +n` (kẹp trần, xem §6) · `heal +n` (≤ `heartsMax`) · `ultAdd +n` (thanh tuyệt kỹ, ≤ `ultMax` 10).
- Đường dẫn icon/FX nguồn tương đối với `assets/ninja-adventure/` — **đã kiểm tồn tại thật**. Icon basic dùng lại `img/boss/fx/icon-<hệ>.png` (đã chép). "solid #màu" = `opt.solid` của atlas (bóng một màu); "gốc" = màu ảnh gốc.
- Key FX **in nghiêng** = key mới đề xuất (sheet mới, xem §7); còn lại là key có sẵn trong `BOSS_SPRITES`.

## 1. 🔥 Lửa — sát thương + thiêu đốt

| Slot | Tên VN | Điều kiện | Hiệu ứng | Icon | FX |
|---|---|---|---|---|---|
| basic | Hoả cầu | mọi từ | `{}` | `img/boss/fx/icon-fire.png` (có sẵn) | preset `fire` bậc 1–3 hiện có |
| combo3 | Song hoả | combo 3, 9, 15… | `extraHits 1` | `Ui/Skill Icon/Spell/Fireball.png` | `fireball` ×2 lệch nhịp + `flam` ×2 |
| long | Hoả trụ | từ ≥ 8 chữ | `dmgMul 1.8` | `Ui/Skill Icon/Spell/Explosion.png` | `explosion` ×3 |
| fast | Tia lửa | speed ≥ 2 | `crit` | `Ui/Skill Icon/Spell/OrbFire.png` | *`sparkMagic`* solid #ff9a3c + `flam` |
| combo6 | Vòng lửa | combo 6, 12… | `burn {dps 10, sec 3}` | `Ui/Skill Icon/Meteo/Sun.png` | `magicCircle` solid #ff5a1f + `flam` cycle suốt burn |
| execute | Thiêu rụi | quái < 30% HP | `dmgMul 1.5` | `Ui/Skill Icon/Spell/Death.png` | `explosion` + `smoke` |
| counter | Phản hoả | sau khi bị đánh | `threatDrainMul 2`, `dmgMul 1.1` | `Ui/Skill Icon/Spell/Counter.png` | `auraSprite` solid #ff7a2f ở pháp sư + `fireball` |

## 2. ❄️ Băng — đóng băng + khiên

| Slot | Tên VN | Điều kiện | Hiệu ứng | Icon | FX |
|---|---|---|---|---|---|
| basic | Băng tiễn | mọi từ | `{}` | `img/boss/fx/icon-ice.png` (có sẵn) | preset `ice` bậc 1–3 hiện có |
| combo3 | Sương giá | combo 3, 9… | `freeze {sec 1.5}`, `dmgMul 1.2` | `Ui/Skill Icon/Spell/Mist.png` | `iceFlake` cycle + `smokeCircular` solid #bff4ff |
| long | Cột băng | từ ≥ 8 chữ | `dmgMul 1.4`, `freeze {sec 2}` | `Ui/Skill Icon/Meteo/Snow.png` | `icePillar` ×2 + `iceFlake` |
| fast | Mũi băng | speed ≥ 2 | `dmgMul 1.2`, `freeze {sec 2}` | `Ui/Skill Icon/Items & Weapon/Kunai.png` | `iceSpikeProj` ×3 nhanh + *`cutX`* solid #7fe3ff |
| combo6 | Giáp băng | combo 6, 12… | `shield +1` | `Ui/Skill Icon/Spell/DefenseUpgrade.png` | `shieldSprite` (xanh, gốc) ở pháp sư + `iceFlake` |
| execute | Băng phong | quái < 30% HP | `dmgMul 1.3`, `freeze {sec 1}` | `Ui/Skill Icon/Spell/OrbWater.png` | *`waterPillar`* solid #bff4ff + `icePillar` |
| counter | Hàn triều | sau khi bị đánh | `freeze {sec 3}`, `dmgMul 1.4` | `Ui/Skill Icon/Spell/WaterCanon.png` | *`water`* gốc + `iceFlake` cycle |

## 3. ⚡ Sét — chí mạng + đòn phụ

| Slot | Tên VN | Điều kiện | Hiệu ứng | Icon | FX |
|---|---|---|---|---|---|
| basic | Tia sét | mọi từ | `{}` | `img/boss/fx/icon-storm.png` (có sẵn) | preset `storm` bậc 1–3 hiện có |
| combo3 | Tia chớp | combo 3, 9… | `crit` | `Ui/Skill Icon/Spell/OrbLight.png` | `thunder` + *`sparkMagic`* solid #fff7b0 |
| long | Lôi trụ | từ ≥ 8 chữ | `crit`, `dmgMul 1.2` | `Ui/Skill Icon/Spell/BookLight.png` | `thunder` ×3 + *`circleSpark`* gốc |
| fast | Lôi bộ | speed ≥ 2 | `extraHits 1`, `dmgMul 1.1` | `Ui/Skill Icon/Items & Weapon/Boot.png` | `energyBallProj` ×2 + *`cutX`* solid #ffe45c |
| combo6 | Xích lôi | combo 6, 12… | `extraHits 2` | `Ui/Skill Icon/Spell/AttackUpgrade.png` | *`bigEnergyBall`* (đạn) + `thunder` ×3 lệch nhịp |
| execute | Lôi phạt | quái < 30% HP | `crit` | `Ui/Skill Icon/Spell/MagicWeapon.png` | `thunder` + *`slashCurved`* solid #fff7b0 |
| counter | Phản lôi | sau khi bị đánh | `crit`, `extraHits 1` | `Ui/Skill Icon/Meteo/Rain.png` | `auraSprite` solid #e0c2ff + `thunder` ×2 |

Sét `fast` cố ý **không** dùng `crit` (trùng nội tại rank 2 `fastCrit`).

## 4. 🌿 Đất — khiên, hồi máu, sát thương nặng

| Slot | Tên VN | Điều kiện | Hiệu ứng | Icon | FX |
|---|---|---|---|---|---|
| basic | Đá lăn | mọi từ | `{}` | `img/boss/fx/icon-earth.png` (có sẵn) | preset `earth` bậc 1–3 hiện có |
| combo3 | Đá vụn | combo 3, 9… | `dmgMul 1.5` | `Ui/Skill Icon/Job & Action/Mine.png` | `rockProj` ×2 + *`rockB`* gốc |
| long | Gai đá | từ ≥ 8 chữ | `dmgMul 1.8` | `Ui/Skill Icon/Spell/RockSpike.png` | `rockSpike` + `rockImpact` |
| fast | Quyền đá | speed ≥ 2 | `dmgMul 1.6` | `Ui/Skill Icon/Job & Action/Punch.png` | `rockProj` + *`claw`* solid #c9a36b |
| combo6 | Mạch sống | combo 6, 12… | `heal +1`, `dmgMul 1.3` | `Ui/Skill Icon/Spell/Heal.png` | *`plant`* gốc ở pháp sư + `auraSprite` solid #9bd46a |
| execute | Địa chấn | quái < 30% HP | `dmgMul 1.5` | `Ui/Skill Icon/Spell/Downgrade.png` | `rockSpike` ×2 + `smoke` |
| counter | Giáp đá | sau khi bị đánh | `shield +1` | `Ui/Skill Icon/Items & Weapon/Guard.png` | *`shieldYellow`* gốc ở pháp sư + `rockImpact` |

## 5. 🌪️ Gió — giảm thanh quái, tốc độ, nạp tuyệt kỹ

| Slot | Tên VN | Điều kiện | Hiệu ứng | Icon | FX |
|---|---|---|---|---|---|
| basic | Phong nhận | mọi từ | `{}` | `img/boss/fx/icon-wind.png` (có sẵn) | preset `wind` bậc 1–3 hiện có |
| combo3 | Gió lùa | combo 3, 9… | `ultAdd +1`, `threatDrainMul 1.3` | `Ui/Skill Icon/Spell/LuckUpgrade.png` | `spiritProj` + `windLeaf` ×3 |
| long | Lốc cuốn | từ ≥ 8 chữ | `dmgMul 1.4`, `threatDrainMul 1.5` | `Ui/Skill Icon/Spell/OrbPlant.png` | *`slashCircular`* solid #bff7df + `smokeCircular` |
| fast | Phong tốc | speed ≥ 2 | `threatDrainMul 1.4` | `Ui/Skill Icon/Spell/Upgrade.png` | *`spiritDouble`* (đạn) + `windLeaf` |
| combo6 | Cuồng phong | combo 6, 12… | `ultAdd +2`, `dmgMul 1.4` | `Ui/Skill Icon/Meteo/Moon.png` | *`slashCircular`* gốc + `smokeCircular` ×2 |
| execute | Phong trảm | quái < 30% HP | `dmgMul 1.2`, `ultAdd +1` | `Ui/Skill Icon/Spell/Cut.png` | *`slashCurved`* solid #7fe8bd ×2 |
| counter | Phản phong | sau khi bị đánh | `threatDrainMul 1.8`, `ultAdd +1` | `Ui/Skill Icon/Spell/Camouflage.png` | `auraSprite` solid #7fe8bd + *`spiritDouble`* |

## 6. Primitive mới

- **Không cần primitive mới.** Chỉ cần thêm 1 số vào `BOSS_TUNING`: `shieldCap: 2` (trần khiên đang giữ). Lý do: Giáp băng (combo6) cộng khiên liên tục khi combo không đứt (khiên chặn không reset combo) → không có trần thì Băng gần như bất tử.
- `extraHits` cần chốt nghĩa "50% D mỗi đòn" (nếu muốn 100% thì hạ Song hoả/Lôi bộ/Xích lôi/Phản lôi xuống).

## 7. Ảnh mới + dung lượng

- Icon: **30 file** 24×24 (5 basic dùng lại icon hệ) → chép thành `img/boss/fx/skill-<hệ>-<slot>.png`; tổng **13.9KB** (đo thật).
- Sheet FX mới: **13 file**, tổng **20.9KB** (đo thật):

| Key đề xuất | Nguồn | Kích thước |
|---|---|---|
| sparkMagic | `FX/Magic/Spark/SpriteSheet.png` | 270×35 |
| cutX | `FX/Attack/CutX/SpriteSheet.png` | 128×32 (4 khung) |
| slashCurved | `FX/Attack/SlashCurved/SpriteSheet.png` | 128×32 (4 khung) |
| claw | `FX/Attack/Claw/SpriteSheet.png` | 128×32 (4 khung) |
| water | `FX/Elemental/Water/SpriteSheet.png` | 440×33 |
| waterPillar | `FX/Elemental/WaterPillar/SpriteSheet.png` | 270×41 |
| plant | `FX/Elemental/Plant/SpriteSheet.png` | 240×28 |
| rockB | `FX/Elemental/Rock/SpriteSheetB.png` | 420×30 |
| spiritDouble | `FX/Magic/Spirit/SpriteSheetDouble.png` | 160×32 |
| shieldYellow | `FX/Magic/Shield/SpriteSheetYellow.png` | 144×26 |
| circleSpark | `FX/Magic/Circle/SpriteSheetSpark.png` | 192×32 |
| slashCircular | `FX/Slash/SpriteSheetCircular.png` | 378×55 |
| bigEnergyBall | `FX/Projectile/BigEnergyBall.png` | 96×24 |

- Tổng **43 ảnh ≈ 35KB** ≪ ngân sách 500KB. Số khung của sheet không vuông (Water, Plant, RockB, Spark, SlashCircular…) phải đo bằng xem ảnh khi code, không suy từ chiều cao.
- Bỏ khỏi danh sách phase: `Circle/SpriteSheetWhite` (dùng `magicCircle` + `opt.solid` là đủ), `Shield/SpriteSheetBlue` (đã có = `shieldSprite`).

## 8. Ghi chú cân bằng

Quy đổi để so hệ: 1 D ≈ 30 sát thương; phòng thủ 5 giây thanh quái (0.5 threat) ≈ 1 D → `shield/heal +1` ≈ 2 D danh nghĩa (thực nhận ~1 D do trần/đầy tim/người giỏi ít bị đánh), `freeze s` ≈ s/5 D, `threatDrainMul k` ≈ (k−1)×0.9 D (speed 2: ×1.4 D), `ultAdd +1` ≈ 0.3 D, burn = dps×sec/30 D.

Ngân sách thưởng mỗi slot (trên 1.0 D, mọi hệ như nhau ±0.1): basic 0 · combo3 +0.5 · long +0.8 · fast +0.6 · combo6 +1.0 · execute +0.5 (kích nhiều) · counter +1.0 (hiếm).

Hệ số sát thương tức thời theo slot (phần thủ/ult quy đổi trong ngoặc):

| Hệ | basic | combo3 | long | fast | combo6 | execute | counter |
|---|---|---|---|---|---|---|---|
| Lửa | 1.0 | 1.5 | 1.8 | 1.5 | 1.0 (+1.0 burn) | 1.5 | 1.1 (+0.9) |
| Băng | 1.0 | 1.2 (+0.3) | 1.4 (+0.4) | 1.2 (+0.4) | 1.0 (+~1.0 khiên) | 1.3 (+0.2) | 1.4 (+0.6) |
| Sét | 1.0 | 1.5 | 1.8 | 1.6 | 2.0 | 1.5 | 2.0 |
| Đất | 1.0 | 1.5 | 1.8 | 1.6 | 1.3 (+~0.7 hồi) | 1.5 | 1.0 (+~1.0 khiên) |
| Gió | 1.0 | 1.0 (+0.57) | 1.4 (+0.45) | 1.0 (+0.56) | 1.4 (+0.6) | 1.2 (+0.3) | 1.0 (+1.02) |

Tần suất giả định ở cấp 10 (người chơi khá, sau ưu tiên): basic 30% · combo3 10% · long 15% · fast 10% · combo6 8% · execute 22% · counter 5%.

| Hệ | TB sát thương thuần | TB tổng quy đổi |
|---|---|---|
| Lửa | ×1.42 | ×1.46 |
| Sét | ×1.47 | ×1.47 |
| Đất | ×1.36 | ×1.47 |
| Băng | ×1.19 | ×1.47 |
| Gió | ×1.14 | ×1.48 |

- Tổng quy đổi đều ~×1.47 → cân. Lửa/Sét/Đất thiên công, Băng/Gió thiên thủ/nhịp → hạ quái chậm hơn nhưng ít mất tim.
- Cộng combo ×1.5 (phase 3) → ở cấp 10 thời gian hạ quái có thể giảm ~30–40% → bước 7 phase 4 mô phỏng và đề xuất nâng `hp` (dự kiến ×1.3–1.4).
- Execute kích trên mọi phép ở 30% HP cuối → hiệu ứng execute giữ nhỏ; không đặt heal/shield ở execute/combo3 (lặp quá dày).
- Đất counter `shield +1`: mỗi đòn trúng → đòn kế bị chặn → sát thương nhận ~giảm nửa. Mạnh cho người mới, đúng bản sắc "trâu"; theo dõi khi chơi thử.
- Gió counter/fast có thể tràn (drain kẹp ≥ 0) → hiệu quả thực thấp hơn danh nghĩa khi thanh đã thấp.

## Câu hỏi chưa giải

1. `extraHits`: mỗi đòn phụ 50% D (đề xuất) hay 100%? Đòn phụ có hiện số/FX riêng không?
2. Đồng ý thêm `shieldCap: 2` vào `BOSS_TUNING`? (không có thì Giáp băng cộng khiên vô hạn khi giữ combo.)
3. `burn` của chiêu ghi đè burn nội tại (như code hiện tại) hay chỉ đè khi mạnh hơn?
4. Counter kích khi khiên **chặn** đòn không? Đề xuất: không (chỉ khi mất tim, khớp `afterHit` "trúng").
5. Icon chọn theo tên file (không xem được từng ảnh ở độ phân giải đủ) — cần liếc lại trong sổ chiêu; icon lệch nghĩa (vd. Moon cho Cuồng phong, Downgrade cho Địa chấn) có thể đổi sang icon khác trong `Ui/Skill Icon/`.
6. Tên VN có muốn theo phong cách Hán-Việt đồng nhất (Hoả/Băng/Lôi/Thổ/Phong + danh từ) không? Hiện trộn thuần Việt (Đá vụn, Gió lùa) và Hán-Việt.
7. Tần suất slot ở §8 là giả định — cần số thật từ mô phỏng bước 7 (đặc biệt tỉ lệ từ ≥ 8 chữ trong pool và tỉ lệ speed ≥ 2).
