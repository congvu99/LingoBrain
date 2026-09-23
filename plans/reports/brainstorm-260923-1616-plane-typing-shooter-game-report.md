---
type: brainstorm
date: 2026-09-23
topic: Game bắn máy bay gõ từ (iPhone + laptop)
status: approved
modes: []
---

# Brainstorm — Game "Bắn máy bay" gõ từ

## Vấn đề & yêu cầu

User muốn game arcade dùng dữ liệu từ vựng: gõ đúng từ → bắn rụng máy bay. Tối ưu iPhone + laptop.
Vấn đề gốc: 3 game hiện tại (Xếp chữ, Chạy 60s, Điền câu) thiếu cảm giác arcade/áp lực + luyện **nhớ chủ động kèm gõ chính tả** dưới thời gian.

## Bối cảnh codebase

- Web tĩnh, không bundler, script global, file < 200 dòng, PWA offline, `localStorage`.
- `words.json`: 2505 từ, có `word`, `meaning`, `emoji`, `ipa`, audio MP3.
- Hạ tầng game có sẵn: `js/word-games.js` (thuần, có test: `gamePool`, `gameAvailability`, `pickGameWords`, `comboMult`, `addMiss`), `js/word-game-ui.js` (chip, vòng đời ván, màn kết thúc), `js/word-game-rounds.js`.
- Ranh giới cứng: game không ghi SM-2; từ sai → `gameMiss` (≤10, đầu phiên ôn sau); `MIN_LEARNED = 8`; kỷ lục ở `gameScore`.
- Plan trước (`260916-0925-vocabulary-mini-games`) để "hoạt hình" ngoài phạm vi → game này là game animation đầu tiên.

## Quyết định đã chốt

| Vấn đề | Chọn | Lý do |
|---|---|---|
| Hiện gì trên máy bay | Nghĩa Việt + emoji → gõ từ Anh | Nhớ chủ động; hiện từ Anh chỉ là luyện gõ |
| Nguồn từ | Từ đã học (`gamePool`) | Nhất quán, ưu tiên từ hay sai; từ chưa học gõ không nổi |
| Thua/sai | 3 mạng; từ lọt → `gameMiss` | Giữ ranh giới SM-2; gõ vội ≠ độ nhớ thật |
| Hiệu ứng | Vừa đủ: emoji ✈️, tia + 💥 bằng CSS | Không asset, cache PWA nhẹ |
| Nhắm bắn | Tự bắn khi gõ khớp chính xác | Không lộ đáp án, không cần Enter trên iPhone |
| Render | DOM + rAF + `transform` | ≤5 vật thể; giữ emoji/font/dark mode; Canvas thừa |

## Phương án đã cân nhắc

**Nhắm bắn**
- A. Tự bắn khi khớp ✅: nhanh, không lộ đáp án. Nhược: không có phản hồi từng chữ.
- B. Khoá mục tiêu kiểu ZType: vui, nhưng chữ đầu lộ máy bay, từng chữ báo đúng/sai nên đoán mò được. Loại.
- C. Gõ + Enter: thêm thao tác, nhịp chậm trên iPhone. Loại.

**Render**
- DOM ✅ vs Canvas (thừa cho ≤5 vật thể, mất emoji/theme tự nhiên) vs trang `game.html` riêng (nhân đôi khung, lệch PWA).

## Thiết kế cuối

**Vị trí**: chip thứ 4 "Bắn máy bay" trong "Chơi nhanh" (`GAME_IDS` + `'planes'`).

**Luật**
- Máy bay ✈️ + nhãn `🐐 bướng bỉnh` rơi xuống. Khởi đầu tối đa 3 chiếc cùng lúc; mỗi 5 chiếc bị hạ: tốc độ +8%, số chiếc tối đa +1 (trần 5).
- Không spawn 2 máy bay cùng từ trên màn hình.
- Gõ khớp chính xác (lowercase + trim) với bất kỳ máy bay nào → bắn, 💥, điểm = độ dài từ × `comboMult(streak)`, ô gõ tự xoá.
- Chạm đất → −1 ❤️, streak = 0, từ vào `gameMiss`, hiện đáp án khoảng 1s tại chỗ.
- Hết 3 ❤️ → màn kết thúc dùng chung (điểm, kỷ lục, từ bị lọt).
- Enter / ✕ = xoá ô gõ. Không so gần đúng (tránh bắn nhầm).

**iPhone**
- Input: `autocapitalize=off autocorrect=off spellcheck=false autocomplete=off`, font ≥16px (chống zoom), `enterkeyhint="done"`.
- Chiều cao khung = `visualViewport.height`, cập nhật khi visualViewport `resize`; khoá cuộn body khi chơi; mặt đất ngay trên ô gõ.
- `focus()` gọi đồng bộ trong handler chạm "Bắt đầu" (iOS mới bật bàn phím); chạm vùng chơi → focus lại.
- Tự dừng khi `visibilitychange` hoặc input `blur` (bàn phím đóng); nút ⏸ / tiếp tục.
- Nhãn ≤18 ký tự, dài hơn thì cắt `…`. Tốc độ tính theo % chiều cao khung → màn thấp không bất công.
- rAF dùng delta time (kẹp dt ≤ 50ms) để không nhảy cóc sau khi tạm dừng/giật khung.

**Laptop**: khung max-width khoảng 480px ở giữa; Esc = dừng.

**Kiến trúc**
```
js/plane-game-logic.js  MỚI THUẦN  state, spawn, step(dt), tryShoot(text), level/speed, score, lives (có test)
js/plane-game-ui.js     MỚI DOM    khung, rAF loop, visualViewport, focus, pause, vẽ .plane/.laser/.boom
css/paper-theme.css     SỬA        style + keyframes, token màu hiện có
js/word-games.js        SỬA        GAME_IDS/GAME_LABEL
js/word-game-ui.js      SỬA        startGame → nhánh planes; màn kết thúc dùng chung
index.html, sw.js, js/app-storage.js  SỬA  script tag, ASSETS, bump APP_VERSION + CACHE
tests/plane-game-logic.test.js  MỚI
```
Logic thuần nhận `rand` + `dt` làm tham số → test tất định, không DOM.

## Nghiệm thu

- [ ] `node tests/run-tests.js` xanh, có test: khớp từ (hoa thường/trim), không spawn trùng, tăng cấp mỗi 5 kill, chạm đất −1 mạng + ghi miss, hết mạng → over, điểm × combo.
- [ ] Chơi 1 ván → `eng.srs.v2` không đổi byte nào; từ lọt nằm đầu hàng đợi ôn.
- [ ] iPhone Safari + PWA: "Bắt đầu" bật bàn phím ngay; không máy bay nào bị bàn phím che; trang không cuộn; chuyển app → tự dừng.
- [ ] Laptop Chrome: gõ liên tục mượt, Esc dừng.
- [ ] < 8 từ đã học → chip khoá kèm lý do.
- [ ] Kỷ lục `planes` còn sau tải lại + có trong backup; offline PWA chơi được.

## Rủi ro

| Rủi ro | Giảm thiểu |
|---|---|
| iOS không bật bàn phím / bàn phím che game | focus trong user gesture; layout theo visualViewport; test máy thật |
| Nghĩa Việt mơ hồ (nhiều từ Anh hợp) → oan | Nguồn chỉ từ đã học; hiện đáp án khi lọt; tốc độ đầu chậm |
| Giật khung máy yếu | Chỉ `transform`/`opacity`, `will-change`, ≤5 node + hiệu ứng tự xoá |
| `word-game-ui.js` phình quá 200 dòng | Nhánh planes chỉ gọi sang `plane-game-ui.js` |
| Bàn phím iOS đổi chiều cao giữa chừng (gợi ý QuickType) | Nghe visualViewport `resize` liên tục, không chỉ lúc bắt đầu |

## Ngoài phạm vi

Âm thanh, boss, sprite ảnh, nền cuộn, bảng xếp hạng, chế độ nghe audio, ghi vào SM-2, so khớp gần đúng, khoá mục tiêu kiểu ZType.

## Bước tiếp theo

`/ck:plan` với báo cáo này → khoảng 3 pha: (1) logic thuần + test, (2) UI + CSS + tích hợp chip, (3) PWA/backup/docs + test máy thật.

## Câu hỏi chưa chốt

- Tốc độ rơi ban đầu (đề xuất khoảng 9s từ đỉnh xuống đáy) cần tinh chỉnh sau khi chơi thật trên iPhone.
- Nghĩa Việt quá dài (>18 ký tự): cắt `…` hay chỉ lấy vế trước dấu `;`/`,`? Đề xuất: lấy vế đầu trước `;`, vẫn dài thì cắt.
