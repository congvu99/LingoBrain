---
type: brainstorm
date: 2026-09-23
topic: Chọn cấp độ cho game Bắn máy bay
status: approved
modes: []
related_plan: plans/260923-1616-plane-typing-shooter-game/plan.md
---

# Brainstorm — Cấp độ game Bắn máy bay

## Vấn đề
Độ khó đang cố định (hằng số trong `js/plane-game-logic.js`); chỉ tự tăng trong ván (5 lần hạ → +8%). Người mới thấy nhanh, người quen thấy chậm; không chọn được điểm xuất phát.

## Phương án đã cân nhắc
| Phương án | Kết luận |
|---|---|
| A. Tốc độ + mật độ | ✅ chọn — đơn giản, trúng vấn đề |
| B. Lọc từ theo độ dài | ❌ đã có "từ dài rơi chậm"; lọc làm hẹp pool (cần ≥ 8 từ) |
| C. Mức gợi ý | ✅ một phần: Dễ hiện mờ chữ cái đầu |
| Mức "Luyện gõ" (hiện từ Anh) | ❌ ngoài phạm vi |

## Quyết định
| | Dễ | Vừa | Khó |
|---|---|---|---|
| Rơi (từ 5 chữ, cấp 0) | 15s | 11s | 8s |
| Mục tiêu đầu / tối đa | 2 / 4 | 3 / 6 | 4 / 7 |
| Tăng tốc mỗi 5 lần hạ | ×1.05 | ×1.08 | ×1.10 |
| Khoảng xuất hiện | 2.4s | 1.8s | 1.3s |
| Gợi ý | chữ đầu hiện mờ | — | — |

- Chọn trên màn Bắt đầu (3 nút, mỗi nút hiện kỷ lục riêng), nhớ lần trước trong `cfg.planeLevel` (có trong backup). Không đổi giữa ván. "Chơi lại" giữ cấp.
- Kỷ lục riêng: Vừa giữ khoá cũ `gameScore.planes`; `planes-easy`, `planes-hard`. `endGame()` dùng `game.scoreKey || game.id` → 3 game khác không đổi.
- Gợi ý chỉ để đọc, vẫn phải gõ chữ đầu.

## Chạm tới
`js/plane-game-logic.js` (bảng `PLANE_LEVELS`, cfg theo state), `js/plane-game-render.js` (gợi ý), `js/plane-game-ui.js` + CSS (nút cấp), `js/word-game-ui.js` (`endGame` khoá kỷ lục, nhãn cấp), test, bump 2.9.0.

## Nghiệm thu
- Test: Dễ chậm hơn Vừa chậm hơn Khó; trần mục tiêu theo cấp; mặc định = Vừa.
- Chơi Khó xong → kỷ lục lưu `planes-hard`, `planes` không đổi.
- Tải lại trang → cấp lần trước vẫn được chọn.
- 3 game cũ + phiên ôn không đổi; `eng.srs.v2` không bị ghi.

## Ngoài phạm vi
Mở khoá cấp, đổi cấp giữa ván, lọc từ theo độ dài, mức Luyện gõ.

## Câu hỏi chưa chốt
- Số liệu từng cấp cần chỉnh sau khi chơi thật.
