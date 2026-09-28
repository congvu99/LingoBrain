# Brainstorm — Luồng kết trận → chọn hệ → tiến hoá → bắt đầu (Pháp Sư Lexoria)

Ngày: 2026-09-28 · Modes: none · Trạng thái: đã duyệt hướng A

## Vấn đề
Chọn hệ / tiến hoá xong không bắt đầu trận ngay được — phải `←` về sảnh, cuộn xuống đáy mới bấm "Bắt đầu". Màn kết trận chỉ hướng dẫn bằng chữ ("Vào sảnh → Tiến hoá").

## Bằng chứng (code)
- `js/boss-game-result-ui.js:147-164` — lên cấp/mốc tiến hoá chỉ là `<p>` chữ; 2 nút: Luyện phép/Đánh lại + Về sảnh.
- `js/boss-game-hub-ui.js:206-231` — CTA `#bossStart` ở đáy sau: chân dung, buff, trận hôm nay, thẻ truyện, độ khó, đoạn hướng dẫn dài, nhật ký, 4 nút phụ.
- `js/boss-game-skill-tree-ui.js`, `js/boss-game-evolution-ui.js`, `js/boss-game-skill-book-ui.js`, nhật ký — chỉ có `←` → `startBossHub()` (vẽ lại, mất vị trí cuộn).
- Tiến hoá lưu theo từng hệ (`bossProg.evo[el]`) → đổi hệ thường kéo theo 1 lần vào Tiến hoá nữa.
- Ràng buộc iOS: `startBossBattle` phải gọi trong cú chạm thật (focus ô gõ).
- Tab bar hiện ở sảnh, ẩn trong trận (`html.game-lock .tabbar`).

## Vi phạm UX (ui-ux-pro-max)
primary-action, persistent-nav (màn phụ = ngõ cụt), state-preservation (mất cuộn), content-priority / progressive-disclosure (hướng dẫn luôn bung).

## Các hướng đã cân nhắc
| Hướng | Ưu | Nhược |
|---|---|---|
| **A. Thanh CTA dính đáy + nút tắt ở kết trận** ✅ | Ít sửa, không đụng logic/sync, giải ~80% | Vẫn là màn rời |
| B. A + dẫn đường "Tiếp →" nhiều bước | Luồng liền mạch | Thêm state luồng, edge case sync/đổi hệ |
| C. Sảnh dạng tab | Cấu trúc sạch nhất | Gần viết lại, YAGNI |

## Giải pháp chốt (A)
1. **Thanh CTA dùng chung** `bossBattleBarHtml()` + `bossBindBattleBar()` (đặt ở `boss-game-hub-ui.js`): chip độ khó hiện tại + nút `⚔ Chiến đấu`/`Bắt đầu`/`Luyện phép` theo `o.kind`. Gắn vào 5 màn: sảnh, Cây nguyên tố, Tiến hoá, Sổ chiêu, Nhật ký. Bỏ `#bossStart` cũ.
   - CSS: `position:sticky;bottom:0`, nền `var(--card)`, viền trên, `--sh-3`, nút ≥44px. Sticky trong vùng cuộn → tự nằm trên tab bar.
   - onclick gọi thẳng `startBossBattle(bossTodayOpts(cfg.bossLevel))` (giữ cử chỉ thật cho iOS).
2. **Kết trận**: có nâng cấp chờ → CTA chính theo ngữ cảnh:
   - Qua mốc tiến hoá → `🧬 Tiến hoá ngay` (`renderBossEvolution()`), chính.
   - `pointsLeft > 0` → `🌳 Cộng điểm` (`renderSkillTree()`); chính nếu không có tiến hoá, phụ nếu có.
   - `Luyện phép/Đánh lại` + `Về sảnh` → ghost. Không nâng cấp chờ → giữ nguyên.
   - Bỏ dòng chữ "Vào sảnh → Tiến hoá…".
3. **Sảnh gọn**: đoạn hướng dẫn → `<details><summary>Cách chơi</summary>`.

## Ngoài phạm vi
`confirm()` khi cộng điểm (giữ nguyên — user chốt), sảnh dạng tab, dẫn đường nhiều bước.

## Tiêu chí nghiệm thu
- 375px: từ Tiến hoá/Cây → 1 chạm vào trận, iOS bật bàn phím.
- Thắng + mốc tiến hoá: Tiến hoá ngay → chọn dạng → Chiến đấu (3 chạm, không về sảnh).
- CTA không che nội dung cuối, không đè tab bar; sáng/tối đủ tương phản.
- `node tests/run-tests.js` qua; tăng `APP_VERSION` (`js/app-storage.js`) + `CACHE` (`sw.js`) khớp nhau.

## File chạm
`js/boss-game-hub-ui.js`, `js/boss-game-result-ui.js`, `js/boss-game-evolution-ui.js`, `js/boss-game-skill-tree-ui.js`, `js/boss-game-skill-book-ui.js`, `js/boss-game-story-journal-ui.js`, `css/paper-theme.css`, `js/app-storage.js`, `sw.js`.

## Rủi ro
- Working tree đang dirty ở `app-storage.js`, `sw.js` → cẩn thận khi bump version.
- Vào trận từ màn phụ: kiểm `stopBossHub` (dọn `bossPortraitStop`, `bossFirstRunWait`) vẫn chạy khi `startBossBattle` thay `game`.
- Màn kết trận cần hàm tính `pointsLeft(lv, alloc)` — đã có, chỉ gọi lại.

## Câu hỏi chưa giải quyết
- Chip độ khó trên thanh CTA: chỉ hiển thị hay cho đổi ngay tại chỗ? (mặc định đề xuất: chỉ hiển thị, đổi ở sảnh)
