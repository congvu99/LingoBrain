# Brainstorm: bổ sung 2500 mục "Spoken core" để giao tiếp với người bản địa

Ngày: 2026-09-24 · Modes: không flag

## Vấn đề & yêu cầu
- Yêu cầu: thêm 2500 từ phổ biến, mục tiêu giao tiếp thoải mái với người bản địa.
- Hiện trạng `words.json`: 2505 mục = 2500 Oxford 3000/5000 (A1 898, A2 792, B1 690, B2 120) + 5 từ phim. Không trùng.
- Thiếu hụt thật: chỉ 11 mục nhiều chữ, 2 phrasal verb; thiếu okay, gonna, awesome, figure out, hang out, by the way, no worries...
- Oxford hiện tại điền theo mẫu: mnemonic rỗng 2500, outputPrompt chung 2500, emoji 📘 1412.
- Nhịp: newPerDay mặc định 5 → 2505 mục ≈ 16 tháng; nối cuối = không gặp mục mới trước ~16 tháng.

## Nhận định
- Giao tiếp không bị chặn bởi số từ đơn: ~3000 họ từ ≈ 95% lời nói (Nation 2006). Chặn bởi phrasal verb, cụm nói sẵn, dạng rút gọn, discourse markers.
- Oxford B2–C1 còn lại nặng từ viết/học thuật → ít giá trị giao tiếp.

## Phương án đã xét
| | Ưu | Nhược | Kết luận |
|---|---|---|---|
| A. Tiếp Oxford 5000 | Danh sách chuẩn, dễ | Học thuật, ít giúp nói | Loại |
| **B. Spoken core** | Đúng mục tiêu, bù đúng lỗ hổng | Soạn câu kỹ hơn, cụm dài khó gõ hơn | **Chọn** |
| C. Trộn 1500 từ + 1000 cụm | Cân bằng | Giải quyết nửa vời | Loại |

## Giải pháp chốt
### Thành phần (±10% sau loại trùng)
| Nhóm | ~Số | `source` | Ví dụ |
|---|---|---|---|
| Phrasal verb | 700 | `Spoken core · phrasal verb` | figure out, run into, put off |
| Cụm nói sẵn / câu phản xạ | 800 | `Spoken core · chunk` | by the way, fair enough, it's up to you |
| Từ nối / rút gọn / cảm thán | 200 | `Spoken core · discourse` | actually, I mean, gonna, kinda |
| Từ đơn khẩu ngữ (SUBTLEX-US) chưa có | 800 | `Spoken core · word` | okay, awesome, weird, grab |

### Mỗi mục (12 trường, shape không đổi)
- `id` kebab-case (quy ước sẵn: `reach out` → `reach-out`), không trùng id/word cũ (so lowercase).
- `ipa` dạng `/…/`, `pos` (phrasal verb / phrase / exclamation / ...), `meaning` VN.
- `context` câu hội thoại tự nhiên + `contextVi`; emoji hợp nghĩa (không 📘); `outputPrompt` theo tình huống cụ thể.
- `mnemonic` = "", `image` = "".

### Thứ tự
- Xen kẽ O-O-S (2 Oxford : 1 Spoken), giữ thứ tự nội bộ mỗi nhóm. 5 mục phim giữ đầu bộ.
- Hợp lệ vì thẻ mới lấy theo thứ tự mảng (`js/srs-scheduler.js:115-120`); SRS theo id → tiến độ cũ không đổi.

### Quy trình
1. 5 đợt × 500 mục; mỗi đợt file nguồn tạm (scratchpad/`tools/`) → script merge + reorder vào `words.json`.
2. Validator mỗi đợt: trùng id/word, đủ 12 trường, IPA regex, `context` chứa từ đích (cho phép biến thể: -s/-ed/-ing, tách phrasal verb), meaning không rỗng, word ≤ 50 ký tự.
3. Spot-check thủ công ngẫu nhiên ~5%/đợt.
4. `python tools/generate_edge_tts_audio.py` (≈ +5000 MP3, cập nhật `audio/index.json`).
5. `node tests/run-tests.js`; tăng `APP_VERSION` (`js/app-storage.js`) + `CACHE` (`sw.js`).

## Touchpoints
- Sửa: `words.json`, `audio/`, `audio/index.json`, `js/app-storage.js`, `sw.js`.
- Có thể thêm: script merge/validate trong `tools/`.
- Không đổi: UI, game, schema DB (auto-seed theo hash; guard chỉ chặn co bộ < 50%).

## Tiêu chí xong
- `words.json` ≈ 5000 mục, 0 trùng, validator pass 100%.
- ≈ 5000 MP3 mới, index cập nhật; tests pass; DB auto-seed bộ mới.
- Mở app: mục Spoken xuất hiện trong nhóm thẻ mới đầu tiên.

## Ngoài phạm vi
- Mnemonic; nâng chất 2500 Oxford cũ; đổi UI/game; đổi newPerDay mặc định.

## Rủi ro & giảm thiểu
- IPA/nghĩa AI soạn sai → validator + spot-check; ưu tiên IPA Mỹ nhất quán.
- Cụm dài khó gõ trong game → `PLANE_LABEL_MAX = 50` đủ; word dài nhất hiện 14 ký tự, cụm có thể 20–30 → kiểm tra thủ công game gõ.
- Repo nặng thêm ~5000 MP3 → chấp nhận (cùng mẫu hiện tại).
- Danh sách tần suất SUBTLEX cần lọc trùng + bỏ tên riêng/từ tục.
- Kiểm "Gõ từ"/"Điền câu" với dạng rút gọn có dấu nháy (I'm down, it's up to you) — xác nhận chuẩn hoá nháy ’ vs '.

## Bước tiếp
- `/ck:plan` với report này (mặc định, không cần --tdd: chủ yếu dữ liệu + script).

## Câu hỏi còn mở
- Chuẩn hoá dấu nháy cong/thẳng trong kiểm tra gõ đã có chưa — kiểm khi plan.
