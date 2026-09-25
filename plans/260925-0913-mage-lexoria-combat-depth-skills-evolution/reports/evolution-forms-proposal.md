# Đề xuất cổng Phase 5 — 30 dạng tiến hoá (chờ user duyệt)

Ngày: 2026-09-25. Nguồn: [phase-05](../phase-05-evolution-forms-and-evo-sync-schema.md), [phase-04](../phase-04-skill-roster-35-auto-trigger-skills.md), [brainstorm](../../reports/brainstorm-260925-0913-mage-lexoria-combat-depth-skills-evolution-report.md), `js/boss-game-elements.js`, `js/boss-game-sprite-atlas.js`, `tools/copy-boss-sprites.js`, `js/boss-game-logic.js`.

## 1. Quy ước id (hợp đồng sync chỉ-tiến)

- `formId` = `<hệ>-<nhánh>`: `fire-a`, `fire-b` (cấp 8); `fire-a1`, `fire-a2`, `fire-b1`, `fire-b2` (cấp 16). Hệ đúng như `BOSS_ELEMENTS`: `fire | ice | storm | earth | wind`. `''` = dạng gốc.
- Regex kiểm: `^(fire|ice|storm|earth|wind)-(a|b)[12]?$` **và** tiền tố phải trùng hệ chứa nó (`evo.fire.v` chỉ nhận `fire-*`). `cleanBoss` vẫn so với danh sách `BOSS_EVO_FORMS[el]` (không chỉ regex).
- Cha suy từ id: `fire-a1` → `fire-a`; cấp suy từ độ dài (có số → 16). Nhờ vậy `BOSS_EVO_FORMS` chỉ cần mảng id.
- Id đã phát hành **không đổi tên, không xoá**; muốn thêm dạng thì thêm id mới (vd `fire-a3`), regex phải nới cùng lúc.
- Key sprite (`BOSS_SPRITES`, trong file mới `js/boss-game-evolution-sprites.js`): `evoFireA1` / `evoFireA1Face`. File đích: `img/boss/actor/evo-fire-a1.png`, `img/boss/actor/evo-fire-a1-face.png`. Key sprite là chi tiết nội bộ, đổi được; formId thì không.

## 2. Modifier có thật (từ `modifiersFor` trong `js/boss-game-elements.js`)

| Key | Kiểu / luật cộng hiện tại | Nơi đọc | Dùng cho dạng? |
|---|---|---|---|
| `dmgMul` | số, cộng (gốc 1; Lửa bậc 1 +0.15) | `spellDamage` | **Có**: +0.08 (cấp 8), +0.12 (cấp 16) |
| `clockAdd` | số, cộng giây (Băng bậc 1 +1.5; `clock` 12/10/8) | `createBattle` → phase 1 `threatSec` | **Có**: +0.75 / +1.25 |
| `speedLoosen` | số, cộng (Sét bậc 1 +0.2) | `speedMult` nới mốc tốc độ | **Có**: +0.1 / +0.15–0.2 |
| `maxHeartsAdd` | số nguyên, cộng (Đất bậc 1 +1) | `boss-game-ui.js:50` | **Có**, chỉ cấp 16: +1 |
| `shield` | số nguyên, cộng (Đất bậc 2 +1) | `createBattle` `st.shield` | **Có**, chỉ cấp 16: +1 |
| `freezeChance` | số, cộng | `bossApplyImpacts` | Không: không kèm `freezeSec` (chỉ Băng bậc 2 đặt) → đóng băng 0 giây, vô tác dụng |
| `freezeSec` | số, **gán** (không cộng) | như trên | Không |
| `burn` | object `{dps,sec}`, **gán đè** | `bossApplyImpacts` | Không: đè burn Lửa bậc 2 |
| `fastCrit` | boolean, gán | `spellDamage` | Không: vô tác dụng nếu đã có Sét bậc 2 |
| `hintFirst` | boolean, gán | `bossStartWord` | Không: tương tự (Gió bậc 1) |
| `typoForgive` | số, cộng nhưng logic chỉ tha **1 lần/trận** (`!st.forgiven`) | `typeKey` | Không: +1 vô tác dụng nếu đã có Gió bậc 2 |
| `element`, `ultimate` | nội bộ | — | Không |

`bossEvoMods(form)` phải gộp đúng luật trên (số → cộng). Mỗi dạng đúng **1** modifier. Dạng **không cộng dồn** chỉ số của cha (đổi tự do, không cần đã chọn cha) → số cấp 16 đã tính luôn phần cấp 8.

Chiêu: primitive phase 4 — `dmgMul`, `extraHits`, `crit`, `burn {dps,sec}`, `freeze {sec}`, `threatDrainMul`, `shield +n`, `heal +n`, `ultAdd`. Ghi đè = thay **toàn bộ** `effect` của slot (không cộng vào gốc). Chỉ ghi đè slot đã mở ở cấp mốc: cấp 8 chọn trong `basic…execute` (trừ `basic`, quá mạnh vì mỗi từ); cấp 16 được dùng thêm `counter` (mở cấp 10). Tên chiêu gốc Lửa theo ví dụ phase 4; các hệ khác chưa có bảng → ghi "(gốc)" + tên nâng tạm.

## 3. Chủ đề nhánh

- **Nhánh a = Công**: sát thương, tốc độ, nhiều đòn. Modifier: `dmgMul` / `speedLoosen`.
- **Nhánh b = Thủ / khống chế**: chậm thanh quái, khiên, tim, hút thanh quái, nộ. Modifier: `clockAdd` / `shield` / `maxHeartsAdd`.

Sprite: tất cả ở `assets/ninja-adventure/Actor/Character/<Tên>/` (đã kiểm tồn tại; SpriteSheet 64×112 đo IHDR, Faceset 38×38). Không trùng `SorcererBlack`, `NinjaMageOrange` (pháp sư gốc). Quái/trùm đều từ `Actor/Monster`, `Actor/Boss` → không trùng. Cột "sprite" dưới đây là tên thư mục; đường dẫn đầy đủ = `Actor/Character/<Tên>/SpriteSheet.png`, faceset = `Actor/Character/<Tên>/Faceset.png` (ngoại lệ ghi rõ).

## 4. Bảng 30 dạng

### 🔥 Lửa (`fire`)

| formId | Tên VN | Cha | Cấp | Sprite | Faceset | Chỉ số | Chiêu nâng cấp 1 | Chiêu nâng cấp 2 | ultBonus |
|---|---|---|---|---|---|---|---|---|---|
| `fire-a` | Hoả Nhẫn | gốc | 8 | `NinjaFire/SpriteSheet.png` | `NinjaFire/Faceset.png` | `dmgMul +0.08` | long — Hoả trụ → "Đại hoả trụ": dmgMul 1.8 → **2.0** | combo3 — Song hoả → "Tam hoả": extraHits 1 → **extraHits 2** | 0 |
| `fire-a1` | Quỷ Hoả | `fire-a` | 16 | `DemonRed/SpriteSheet.png` | `DemonRed/Faceset.png` | `dmgMul +0.12` | execute — Thiêu rụi → "Luyện ngục": dmgMul 1.5 → **1.9** | combo6 — Vòng lửa → "Biển lửa": burn → **burn {dps 8, sec 4}** | +0.25 |
| `fire-a2` | Quyền Hoả | `fire-a` | 16 | `FighterRed/SpriteSheet.png` | `FighterRed/Faceset.png` | `speedLoosen +0.15` | fast — Tia lửa → "Hoả quyền": crit → **crit + extraHits 1** | combo3 — Song hoả → "Liên hoả quyền": **extraHits 2** | +0.25 |
| `fire-b` | Hồng Liên Kiếm Sĩ | gốc | 8 | `SamuraiRed/redsamurai.png` ⚠️ | `SamuraiRed/Faceset.png` | `clockAdd +0.75` | combo6 — Vòng lửa → "Hoả thuẫn": **burn + shield 1** | execute — Thiêu rụi → "Trảm hoả": **dmgMul 1.5 + threatDrainMul 1.5** | 0 |
| `fire-b1` | Đấu Sĩ Hoả Khiên | `fire-b` | 16 | `RedGladiator/SpriteSheet.png` | `RedGladiator/Faceset.png` | `shield +1` | counter — Phản hoả → "Khiên phản hoả": threatDrainMul 2 → **threatDrainMul 2 + shield 1** | combo6 — Vòng lửa → "Hoả thuẫn": **burn + shield 1** | +0.25 |
| `fire-b2` | Hoả Tăng | `fire-b` | 16 | `Monk2/SpriteSheet.png` | `Monk2/Faceset.png` | `maxHeartsAdd +1` | combo6 — Vòng lửa → "Niết bàn": **burn + heal 1** | long — Hoả trụ → "Hoả trụ trấn": **dmgMul 1.8 + threatDrainMul 1.5** | +0.25 |

### ❄️ Băng (`ice`)

| formId | Tên VN | Cha | Cấp | Sprite | Faceset | Chỉ số | Chiêu nâng cấp 1 | Chiêu nâng cấp 2 | ultBonus |
|---|---|---|---|---|---|---|---|---|---|
| `ice-a` | Thuỷ Nhẫn | gốc | 8 | `NinjaWater/SpriteSheet.png` | `NinjaWater/Faceset.png` | `speedLoosen +0.1` | fast — (gốc) → "Băng tiễn nhanh": **crit + extraHits 1** | long — (gốc) → "Băng thương": **dmgMul 2.0** | 0 |
| `ice-a1` | Ảnh Băng | `ice-a` | 16 | `NinjaBlue2/SpriteSheet.png` | `NinjaBlue2/Faceset.png` | `dmgMul +0.12` | combo3 — (gốc) → "Băng ảnh phân thân": **extraHits 2** | execute — (gốc) → "Băng phong tuyệt sát": **dmgMul 1.9** | +0.25 |
| `ice-a2` | Kiếm Sương | `ice-a` | 16 | `SamuraiBlue/SpriteSheet.png` | `SamuraiBlue/Faceset.png` | `speedLoosen +0.15` | fast — (gốc) → "Sương kiếm": **crit + freeze {sec 1}** | long — (gốc) → "Hàn băng trảm": **dmgMul 2.0 + freeze {sec 1.5}** | +0.25 |
| `ice-b` | Người Tuyết | gốc | 8 | `Eskimo/SpriteSheet.png` | `Eskimo/Faceset.png` | `clockAdd +0.75` | combo3 — (gốc) → "Gió tuyết": **freeze {sec 1.5}** | combo6 — (gốc) → "Bão tuyết": **freeze {sec 2.5} + threatDrainMul 1.5** | 0 |
| `ice-b1` | Nhẫn Giả Tuyết | `ice-b` | 16 | `NinjaEskimo/SpriteSheet.png` | `NinjaEskimo/Faceset.png` | `clockAdd +1.25` | counter — (gốc) → "Phản băng": **freeze {sec 2}** | combo6 — (gốc) → "Vĩnh đông": **freeze {sec 3}** | +0.25 |
| `ice-b2` | Hộ Vệ Băng | `ice-b` | 16 | `GladiatorBlue/SpriteSheet.png` | `GladiatorBlue/Faceset.png` | `shield +1` | counter — (gốc) → "Băng giáp": **shield 1** | combo6 — (gốc) → "Thành băng": **shield 1 + freeze {sec 2}** | +0.25 |

### ⚡ Sét (`storm`)

| formId | Tên VN | Cha | Cấp | Sprite | Faceset | Chỉ số | Chiêu nâng cấp 1 | Chiêu nâng cấp 2 | ultBonus |
|---|---|---|---|---|---|---|---|---|---|
| `storm-a` | Lôi Nhẫn | gốc | 8 | `NinjaThunder/SpriteSheet.png` | `NinjaThunder/Faceset.png` | `speedLoosen +0.1` | fast — (gốc) → "Lôi ảnh": **crit + extraHits 1** | combo3 — (gốc) → "Song lôi": **extraHits 1 + crit** | 0 |
| `storm-a1` | Tia Chớp Vàng | `storm-a` | 16 | `NinjaYellow/SpriteSheet.png` | `NinjaYellow/Faceset.png` | `speedLoosen +0.2` | fast — (gốc) → "Thiểm điện": **crit + extraHits 2** | execute — (gốc) → "Lôi phạt": **dmgMul 1.5 + crit** | +0.25 |
| `storm-a2` | Lôi Sư | `storm-a` | 16 | `LionYellow/SpriteSheet.png` | `LionYellow/Faceset.png` | `dmgMul +0.12` | long — (gốc) → "Sư hống lôi": **dmgMul 2.0 + crit** | combo6 — (gốc) → "Xích lôi": **extraHits 3** | +0.25 |
| `storm-b` | Người Máy Tích Điện | gốc | 8 | `RobotGrey/SpriteSheet.png` | `RobotGrey/Faceset.png` | `clockAdd +0.75` | combo6 — (gốc) → "Tụ điện": **shield 1 + ultAdd 1** | long — (gốc) → "Xả điện": **dmgMul 1.8 + threatDrainMul 1.5** | 0 |
| `storm-b1` | Hiệp Sĩ Sấm | `storm-b` | 16 | `KnightGold/SpriteSheet.png` | `KnightGold/Faceset.png` | `shield +1` | counter — (gốc) → "Lôi phản": **crit + shield 1** | combo6 — (gốc) → "Tụ điện": **shield 1 + ultAdd 1** | +0.25 |
| `storm-b2` | Tượng Lôi Thần | `storm-b` | 16 | `GoldStatue/SpriteSheet.png` | `GoldStatue/Faceset.png` | `maxHeartsAdd +1` | counter — (gốc) → "Thần lôi trấn": **threatDrainMul 2.5** | combo3 — (gốc) → "Nạp lôi": **ultAdd 1** | +0.25 |

### 🌿 Đất (`earth`)

| formId | Tên VN | Cha | Cấp | Sprite | Faceset | Chỉ số | Chiêu nâng cấp 1 | Chiêu nâng cấp 2 | ultBonus |
|---|---|---|---|---|---|---|---|---|---|
| `earth-a` | Mộc Nhẫn | gốc | 8 | `NinjaLeaf/SpriteSheet.png` | `NinjaLeaf/Faceset.png` | `dmgMul +0.08` | long — (gốc) → "Thạch trụ": **dmgMul 2.0** | execute — (gốc) → "Địa chấn": **dmgMul 1.8** | 0 |
| `earth-a1` | Sư Tử Hang | `earth-a` | 16 | `CaveLion/SpriteSheet.png` | `CaveLion/Faceset.png` | `dmgMul +0.12` | long — (gốc) → "Sơn băng": **dmgMul 2.2** | combo6 — (gốc) → "Loạn thạch": **extraHits 2** | +0.25 |
| `earth-a2` | Quỷ Rừng | `earth-a` | 16 | `DemonGreen/SpriteSheet.png` | `DemonGreen/Faceset.png` | `speedLoosen +0.15` | execute — (gốc) → "Rễ nuốt": **dmgMul 2.0** | combo3 — (gốc) → "Gai rừng": **extraHits 1 + dmgMul 1.2** | +0.25 |
| `earth-b` | Thầy Cúng | gốc | 8 | `Shaman/SpriteSheet.png` | `Shaman/Faceset.png` | `clockAdd +0.75` | combo6 — (gốc) → "Bùa đá": **shield 1** | combo3 — (gốc) → "Rễ trói": **threatDrainMul 1.5** | 0 |
| `earth-b1` | Sư Đá | `earth-b` | 16 | `Monk/SpriteSheet.png` | `Monk/Faceset.png` | `maxHeartsAdd +1` | combo6 — (gốc) → "Hồi xuân": **heal 1** | counter — (gốc) → "Kim cang": **shield 1** | +0.25 |
| `earth-b2` | Tượng Đá | `earth-b` | 16 | `Statue/SpriteSheet.png` | `Statue/Faceset.png` | `shield +1` | counter — (gốc) → "Thạch phản": **threatDrainMul 2.5 + shield 1** | long — (gốc) → "Bàn thạch": **dmgMul 1.8 + threatDrainMul 1.5** | +0.25 |

### 🌪️ Gió (`wind`)

| formId | Tên VN | Cha | Cấp | Sprite | Faceset | Chỉ số | Chiêu nâng cấp 1 | Chiêu nâng cấp 2 | ultBonus |
|---|---|---|---|---|---|---|---|---|---|
| `wind-a` | Phong Nhẫn | gốc | 8 | `NinjaGray/SpriteSheet.png` | `NinjaGray/Faceset.png` | `speedLoosen +0.1` | combo3 — (gốc) → "Phong nhận": **extraHits 2** | fast — (gốc) → "Tật phong": **extraHits 2** | 0 |
| `wind-a1` | Thiên Cẩu | `wind-a` | 16 | `Tengu2/SpriteSheet.png` | `Tengu2/Faceset.png` | `dmgMul +0.12` | combo6 — (gốc) → "Thiên cẩu vũ": **extraHits 4** | fast — (gốc) → "Cuồng phong": **extraHits 2 + crit** | +0.25 |
| `wind-a2` | Ếch Phong | `wind-a` | 16 | `MaskFrog/SpriteSheet.png` | `MaskFrog/Faceset.png` | `speedLoosen +0.2` | combo3 — (gốc) → "Nhảy gió": **extraHits 2 + ultAdd 1** | long — (gốc) → "Lốc xoáy dài": **extraHits 2 + dmgMul 1.3** | +0.25 |
| `wind-b` | Phong Sư | gốc | 8 | `SorcererOrange/SpriteSheet.png` | `SorcererOrange/Faceset.png` | `clockAdd +0.75` | combo3 — (gốc) → "Gió lặng": **threatDrainMul 1.5** | combo6 — (gốc) → "Thổi tan": **threatDrainMul 2 + ultAdd 1** | 0 |
| `wind-b1` | Lão Sư Gió | `wind-b` | 16 | `Master/SpriteSheet.png` | `Master/Faceset.png` | `clockAdd +1.25` | counter — (gốc) → "Hoá giải": **threatDrainMul 3** | combo6 — (gốc) → "Tụ khí": **ultAdd 2** | +0.25 |
| `wind-b2` | Phù Thuỷ Mây Mù | `wind-b` | 16 | `NinjaMageBlack/SpriteSheet.png` ⚠️ | `NinjaMageBlack/Faceset.png` | `shield +1` | combo6 — (gốc) → "Màn mây": **shield 1 + threatDrainMul 2** | counter — (gốc) → "Mây phản": **ultAdd 1 + threatDrainMul 2** | +0.25 |

⚠️ `SamuraiRed`: sheet tên `redsamurai.png` (không phải `SpriteSheet.png`) nhưng đúng 64×112 → ghi nguồn đúng tên trong `tools/copy-boss-sprites.js`. ⚠️ `NinjaMageBlack`: cùng khuôn với `NinjaMageOrange` (pháp sư gốc nam), chỉ khác màu → có thể trông giống dạng gốc.

Dự phòng (đã kiểm tồn tại, chưa dùng): `Tengu` (đỏ), `NinjaRed2`, `RedNinja3`, `CamouflageRed`, `MonkeyBoxerRed`, `LionOrange` (Lửa); `NinjaBlue`, `MonkeyBoxerBlue` (Băng); `RobotCamouflage`, `MaskGoldRacoon` (Sét); `CaveLion2`, `NinjaGreen`, `ShamanLion`, `RobotGreen` (Đất); `OldMan3`, `NinjaMasked` (Gió). Loại: `Child`, `OldWoman` (sheet 64×32, thiếu hàng tấn công/đặc biệt), `ManGreen` (faceset tên `Faceset1.png`).

## 5. Ảnh: số lượng / dung lượng

- 30 SpriteSheet + 30 Faceset = **60 file**. Đo thật từ gói: **231 368 B ≈ 226 KB** (sheet 3.5–7.6 KB, face 0.6–3.5 KB). Dưới ngưỡng ước < 300 KB của phase 5.
- Chép bằng `tools/copy-boss-sprites.js` (thêm 60 dòng vào `FILES`, hoặc sinh từ bảng formId → tên thư mục). Không phình `boss-game-sprite-atlas.js`: 60 key ở `js/boss-game-evolution-sprites.js`, sheet dùng chung `BOSS_CHAR_ANIMS`, face `{fw:38, fh:38, anims:{idle:{frames:1}}}` như `mageFFace`.
- Precache `sw.js`: +226 KB lần cài. Cân nhắc chỉ nạp (`loadBossSprites([...])`) sprite của dạng đang chọn khi vào trận; sảnh "Tiến hoá" nạp faceset 6 dạng của hệ đang xem.

## 6. Ghi chú cân bằng

- Quy mô chỉ số: cấp 8 ≈ ½ bậc nguyên tố (bậc 1: dmgMul 0.15, clockAdd 1.5, speedLoosen 0.2); cấp 16 ≈ ¾–1 bậc. Số nguyên (`shield`, `maxHeartsAdd` +1 = trọn 1 bậc) chỉ cho cấp 16.
- Nhánh a (công) không có sinh tồn; nhánh b sát thương thấp hơn nhưng thanh quái chậm/khiên/tim. Mỗi hệ có 1 dạng b "cứu người mới" (`*-b` + `clockAdd`).
- **Khiên chồng**: `shield 1` ở combo6/counter lặp lại được → cần trần (đề xuất `st.shield` tối đa 2 từ chiêu; khiên khởi đầu từ mods không tính). `heal 1` kẹp ở tim tối đa (đã tính `maxHeartsAdd`).
- **counter + heal** bị loại cố ý: mỗi lần trúng đòn đều hồi lại = gần bất tử. `heal` chỉ ở combo6 (combo gãy khi gõ sai).
- `extraHits 4` (`wind-a1` combo6) và `burn {8,4}` (`fire-a1`) là trần cao nhất; kiểm bằng mô phỏng thời gian hạ quái cuối phase (như phase 3/4), mục tiêu dạng cấp 16 nhanh hơn gốc ≤ 15%.
- **ultBonus k +0.25** (cộng vào hệ số chuỗi niệm sau `bossChainFactor`, chỉ dạng cấp 16): với meteor/chain `round(3×k)`: k 0.5→0.75 vẫn 2; 1→1.25 thành 4 (+1); 1.5→1.75 vẫn 5 (round(4.5)=5 trong JS). Nghĩa là thưởng chỉ có tác dụng ở k=1. iceAge (tuyến tính) luôn có lợi; revive/tornado: nếu điều kiện thưởng khiên là `k >= 1.5` thì 1.25 không đạt, 1.75 = 1.5. → Cần quyết (câu hỏi 3).
- Tham số chiêu ghi đè giả định bảng gốc phase 4 như ví dụ Lửa; khi bảng 35 chiêu duyệt xong phải chỉnh lại để ghi đè luôn ≥ gốc ~10–30%, không bao giờ yếu hơn gốc.
- Số cân bằng dạng nằm trong file dữ liệu dạng (`boss-game-evolution-forms.js`), không phải `BOSS_TUNING` — lệch ràng buộc "số cân bằng chỉ trong `BOSS_TUNING`"; đề xuất chấp nhận như `ELEMENT_RANKS` (cũng là dữ liệu ngoài `BOSS_TUNING`).

## 7. Câu hỏi chưa giải

1. Dùng `SamuraiRed` (file `redsamurai.png`) cho `fire-b`, hay đổi sang `RedNinja3`/`CamouflageRed` cho đồng nhất tên file?
2. `NinjaMageBlack` (`wind-b2`) giống khuôn pháp sư gốc nam — giữ hay đổi (`OldMan3`, `NinjaMasked`, `Tengu`)?
3. ultBonus: giữ `k + 0.25` (chỉ có tác dụng một phần), hay đổi meteor/chain sang `ceil(3×k)`, hay thưởng riêng theo tuyệt kỹ (vd +1 phép cường hoá)?
4. Dạng cấp 16 có cộng dồn modifier của cha không? Đề xuất: **không** (đã tính sẵn trong số cấp 16).
5. Trần khiên từ chiêu = 2 có ổn? Có cần primitive `shield` kẹp trong `bossApplySkillEffect` (phase 4) không?
6. Tên chiêu nâng cấp phụ thuộc bảng 35 chiêu phase 4 đang soạn song song — sau khi duyệt bảng chiêu sẽ đồng bộ tên/tham số; chấp nhận để duyệt bảng này trước theo slot + primitive?
7. Tên VN 30 dạng (vd "Hồng Liên Kiếm Sĩ", "Phù Thuỷ Mây Mù") — user duyệt/đổi thoải mái trước khi phát hành (tên không phải hợp đồng, chỉ formId là).
