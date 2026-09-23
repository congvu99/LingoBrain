# Brainstorm: bộ từ chỉ lấy từ words.json, bỏ nạp từ của người dùng

## Vấn đề
- Người dùng nạp/thêm/xoá từ được (ô dán, file, form, ✕, Khôi phục ghi đè deck).
- App chỉ đọc `words.json` lần đầu, sau đó dùng `eng.deck.v1` trong localStorage → sửa words.json trên hosting không tới người dùng cũ.

## Phương án
- A. Ẩn UI nạp: ít sửa, nhưng bản cập nhật không tới, từ lạ còn, Khôi phục vẫn ghi đè deck. Loại.
- **B. words.json là nguồn duy nhất (chọn)**: tải mỗi lần mở app (SW network-first → offline OK), không lưu deck vào localStorage.
- C. B + ký/khoá deck: không chặn được người sửa code, YAGNI. Loại.

## Quyết định
- Từ lạ trên máy người dùng: bỏ, dọn luôn `srs` của id không còn trong words.json.
- Tab Quản lý: danh sách từ chỉ xem (bỏ ✕); giữ backup/khôi phục (chỉ tiến độ, giáo án, cài đặt; bỏ qua deck), 2 ô cài đặt, Xoá tiến độ, Sửa giáo án. Bỏ Tải words.json, Nạp lại words.json.
- Màn trống: "Chưa tải được bộ từ", không nút nạp. Việc giáo án act `add` → nút vào tab Ôn từ.

## Rủi ro
- Tải words.json lỗi (offline lần đầu) → deck rỗng. **Không được dọn srs khi deck rỗng**, nếu không mất toàn bộ tiến độ.
- Chủ bộ từ xoá 1 từ khỏi words.json → tiến độ từ đó mất vĩnh viễn (chấp nhận).
- `file://` không đọc được words.json → chỉ dùng qua hosting/localhost.
- Không chặn tuyệt đối (localStorage/code sửa được) — chấp nhận cho app cá nhân.

## Tiêu chí xong
- Không còn lối UI thêm/sửa/xoá từ.
- Sửa words.json → lần mở app sau thấy bản mới; offline vẫn ôn được.
- Tiến độ từ còn trong bộ giữ nguyên; test đạt.

## Ngoài phạm vi
- Giới hạn từ mới theo ngày (newPerDay đếm theo ngày).

## Câu hỏi còn mở
- Không.
