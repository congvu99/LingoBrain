# Brainstorm — Làm lại đồ hoạ game Pháp Sư Lexoria (pixel art)

- Ngày: 2026-09-24 · Trạng thái: **đã duyệt hướng** · Flags: không
- Nhánh: `integration-mage` (game đã xong P1–P5, P6 còn phần máy thật)

## 1. Vấn đề & yêu cầu
- User: "đồ hoạ quá xấu". Gốc: toàn bộ hình vẽ bằng canvas path (programmer art) → không thể đẹp bằng pixel art hoạ sĩ.
- Chốt với user: **chỉ miễn phí** · tông **tươi sáng dễ thương** · **phong cách châu Âu** · **dùng cá nhân/phi lợi nhuận** · phạm vi **chỉ game Pháp sư** · **bản thử trước**.

## 2. Bối cảnh codebase
- Vẽ tay: `boss-game-mage-art.js`, `boss-game-monster-shapes.js`, `boss-game-monster-art.js`, `boss-game-scene.js`, `boss-game-tier3-shapes.js`.
- Tách sạch: `boss-game-logic.js` chỉ phát `events[]`; `boss-game-render.js` / `boss-game-spell-art.js` / `boss-game-tier3-ultimate-fx.js` chỉ tiêu thụ → đổi hình không đụng logic, sync, 419 test.
- Ràng buộc: tĩnh, không bundler; PWA offline → mọi ảnh vào `sw.js` ASSETS (test `pwa-assets`); iPhone, DPR ≤ 2; file code < 200 dòng.

## 3. Các hướng đã xét
| Hướng | Ưu | Nhược | Kết luận |
|---|---|---|---|
| A. Ghép gói miễn phí nhiều nguồn (nhìn ngang) | giữ góc nhìn | lệch nét 3–4 hoạ sĩ, thiếu fx đồng bộ, lùng lâu | loại |
| B. Mua 1–2 gói đồng bộ (~10–25 USD) | đẹp, đủ hoạt ảnh | tốn tiền | loại (user chỉ miễn phí) |
| C. AI (Nano Banana/Imagen) | đúng chủ đề | không làm được sprite hoạt ảnh nhất quán | chỉ phụ trợ nền/tranh truyện nếu cần |
| D. Pixel hoá hình vẽ code | 0 ảnh | vẫn programmer art | loại |
| E. Ninja Adventure trọn bộ (pixel-boy, CC0) + góc nhìn kiểu Pokémon | 1 nhóm vẽ → đồng bộ; 50+ nhân vật, 30+ quái, 9 trùm, 30+ VFX, icon phép, tileset, font, nhạc; CC0 | top-down → phải đổi góc trận; quái hơi hướng ninja → đổi tên vài quái trong truyện; sprite 16px phóng ×4 | loại sau khi user muốn **phong cách châu Âu** |
| F. Chỉ 0x72 DungeonTileset II | 1 nguồn, châu Âu | 4 vùng đều hầm ngục; fx tự vẽ kém | loại |
| MiniFolks (LYASeeK) / Tiny Swords (Pixel Frog) | đẹp, châu Âu | quái/goblin là gói **trả phí**; Tiny Swords không có phù thuỷ | loại |
| **G. 0x72 DungeonTileset II (nhân vật + quái) + Ninja Adventure (VFX + tile ngoài trời)** — cả hai CC0, cùng 16px chibi | châu Âu; có **phù thuỷ nam/nữ**; quái trung cổ đủ 12 slot; fx đồng bộ từ Ninja | 2 nguồn (lệch nhẹ); 0x72 thiếu hoạt ảnh tấn công/chết → bù bằng code (nhún, nháy trắng, tan ô pixel); không có rồng → trùm cuối Oblivion = quỷ lớn 0x72 hoặc rồng trong 9 trùm Ninja | **chọn** |

## 4. Giải pháp chốt
- **Nguồn hình:** nhân vật + quái = 0x72 DungeonTileset II (wizzard_m/f, knight, goblin, imp, skeleton, zombie, orc/orc shaman, ogre, big demon, necromancer…); VFX phép + tile ngoài trời (làng, núi, hang) = Ninja Adventure; tile hầm mộ = 0x72.
- **Hoạt ảnh thiếu (0x72 chỉ idle/run):** tấn công = nhún + lao nhẹ; trúng đòn = nháy trắng + giật lùi; chết = tan thành ô pixel theo bảng màu sprite (code).
- **Góc nhìn trận kiểu Pokémon:** pháp sư dưới-trái, quái giữa-trên-phải (trùm to hơn), sàn tile theo 4 vùng (làng Ashford, hầm mộ, núi đá, hang rồng) ghép từ tileset → offscreen 1 lần/đổi cỡ.
- **Module mới `js/boss-game-sprite-atlas.js`:** nạp ảnh, cắt khung, hoạt ảnh theo tên (idle/attack/hurt/death), hiển thị chuẩn pixel (`imageSmoothingEnabled=false`, phóng số nguyên, làm tròn toạ độ).
- **Gắn event có sẵn:** `cast` → pháp sư ra đòn + VFX theo hệ; `impact` → quái trúng đòn + nổ; `hurt` → pháp sư trúng đòn; `won` → quái chết + tan; bậc 1/2/3 = cùng VFX ×1/×1.5/×2 + vòng pixel; tuyệt kỹ = VFX lớn + cắt cảnh hiện có (thay chân dung vẽ tay bằng sprite).
- **Hạt:** ô vuông pixel theo bảng màu gói (bỏ hình tròn mờ/gradient).
- **Dữ liệu:** `BOSS_MONSTERS.shape` → `sprite`; ánh xạ 12 quái sang sprite 0x72 (tên quái châu Âu gần như giữ nguyên: Goblin, Xương, Troll→Ogre, Hiệp sĩ đen…); trùm cuối Oblivion: quỷ lớn 0x72 hoặc rồng Ninja — chọn khi xem hình; sửa truyện tối thiểu.
- **Bỏ khi làm toàn bộ:** mage-art, monster-shapes, monster-art, phần vẽ tay của scene + tier3-shapes (YAGNI, không giữ fallback song song).
- **Giữ nguyên:** logic, sync, progress, test, UI DOM (hub, cây, kết trận), `game-particles.js` (chỉ đổi cách vẽ hạt ở phía boss).

## 5. Lộ trình
1. **Bản thử:** phù thuỷ 0x72, 1 quái 0x72 (Goblin), VFX Lửa Ninja, 1 nền vùng Ashford (tile ngoài trời Ninja) — kiểm độ lệch 2 nguồn → duyệt trên iPhone (cảm nhận + `?fps`).
2. **Toàn bộ** (nếu duyệt): 12 quái/trùm, VFX 5 hệ × 3 bậc, 5 tuyệt kỹ, 4 vùng, pháp sư nam/nữ, chân dung sảnh; xoá file vẽ tay; cập nhật docs.

## 6. Rủi ro
- **Gói thiếu hình cụ thể** (pháp sư nữ, VFX Đất/Gió) — chưa kiểm được nội dung zip. Giảm: kiểm ngay khi có file; thiếu → phối màu lại (palette swap) VFX gần nhất, hoặc nhân vật gần nghĩa.
- **Lệch chủ đề ninja ↔ Lexoria châu Âu:** đổi tên quái/vùng trong truyện; chấp nhận hơi hướng phương Đông.
- **Dung lượng PWA:** chỉ lấy sheet dùng thật, mục tiêu < 1,5MB; ghi vào ASSETS.
- **Nhoè ảnh:** bắt buộc tắt smoothing + phóng số nguyên; DPR 2 + canvas kích thước lẻ dễ nhoè → làm tròn kích thước logic theo bội số tỉ lệ.
- **iOS hiệu năng:** drawImage sprite rẻ hơn path/gradient hiện tại → dự kiến FPS tốt hơn.

## 7. Tiêu chí xong (bản thử)
- Trận hiện pháp sư + 1 quái + nền Ashford bằng sprite gói, sắc nét (không nhoè) trên iPhone và desktop.
- Niệm → hoạt ảnh ra đòn + VFX Lửa bay/nổ khớp `impact`; quái trúng đòn/chết có hoạt ảnh.
- `node tests/run-tests.js` xanh; `pwa-assets` xanh (ảnh trong ASSETS); FPS ≥ 50 ở `?fps` trên desktop.
- User duyệt cảm nhận → mới làm toàn bộ.

## 8. Việc cần trước khi làm
- **User tải 2 zip:** 0x72 DungeonTileset II https://0x72.itch.io/dungeontileset-ii → `assets/0x72/`; Ninja Adventure https://pixel-boy.itch.io/ninja-adventure-asset-pack → `assets/ninja-adventure/` (chỉ commit sheet dùng thật; ghi credit dù CC0).
- Sau đó: kiểm nội dung gói → lập plan chi tiết (`/ck:plan`).

## Nguồn
- 0x72 DungeonTileset II (CC0): https://0x72.itch.io/dungeontileset-ii
- Đã loại (trả phí phần quái): https://lyaseek.itch.io/minifelves · https://lyaseek.itch.io/minifundead · https://pixelfrog-assets.itch.io/tiny-swords
- Ninja Adventure (CC0): https://pixel-boy.itch.io/ninja-adventure-asset-pack · cập nhật trùm/icon phép: https://pixel-boy.itch.io/ninja-adventure-asset-pack/devlog/763041/update-6-boss-spell-icons-towers
- Tham khảo đã loại: https://free-game-assets.itch.io/free-wizard-sprite-sheets-pixel-art · https://shat-tm.itch.io/monster-sprites · https://nyoki-studio.itch.io/asset-pack-pixel-art-monsters-32-mobs-5-bosses-commercial-use-ok · https://pixellootstore.itch.io/pixel-effect-pack-rpg2d-game-assets-fire-ice-lightning-tornado-magic

## Câu hỏi chưa giải
- Ninja Adventure có đủ VFX Băng/Sét/Đất/Gió không? (kiểm khi có zip; thiếu → phối màu lại VFX gần nhất)
- Trùm cuối Oblivion: quỷ lớn (0x72) hay rồng (Ninja)?
- Có muốn dùng luôn nhạc/âm thanh của gói (37 bản nhạc, 100+ SFX) không? — ngoài phạm vi vòng này.
