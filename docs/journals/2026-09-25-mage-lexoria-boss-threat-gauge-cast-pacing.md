# 2026-09-25 — Mage Lexoria: Đe dọa, nhịp điệu phép, tổng hợp chuỗi

## Việc gì
Phase 1–3 của mage-lexoria-combat-depth-skills-evolution hoàn tất: threat gauge, cast pacing 40 lần, combo thực, chain-cast ultimate.
- Wave A song song: phase 1 (code) + 2 gate proposals cùng lúc, sau đó p2→p3 tuần tự (đều sửa boss-game-logic.js, đã ở mục tiêu ~200 dòng).
- Tests 446→531; pacing 40-cast thêm 18.6s phải tính toán.
- Combo time-to-kill: 71% (sạch), 68% (còn sót).

## Va vấp
- Code review bắt UI regression mà unit tests bỏ lỡ: prompt bị dim khóa sau ultimate (DOM tests nằm ngoài Node runner).
- Yêu cầu im lặng biến mất: chain hits không gây damage; agent fix tạo code FX trùng lặp → giải quyết bằng `impact` event thực.
- Agents viết review ID trong comment → dọn sạch.

## Mở
- On-device play-test (N3/N4/N5 device class, L1/L2 skill level).
- Phase 4/5 chờ user duyệt: skill-roster, evolution-forms proposals, quyết định chia sẻ `shieldCap`.
- Chi tiết: xem `plans/reports/code-reviewer-260925-1018-phases-1-3-combat-depth-review-report.md`.

**Status:** DONE_WITH_CONCERNS (blocked on user approval, play-test pending)
**Summary:** Mage boss combat depth framework hoạt động; detection & pacing tuần tự, ultimate chain logic trong phase 2–3; code review found UI edge case, silently dropped damage requirement.

## Phase 4–5 (chiêu tự phát + tiến hoá) — cùng ngày

- Song song: phase 4 ở cây chính ‖ phase 5 phần thuần trong worktree. Worktree tách từ commit cũ → không cherry-pick được, phải `git apply` diff trừ `run-tests.*` rồi ghép tay.
- Review bắt 2 lỗi mà test + tester "xanh hết" bỏ qua: combo3/6 kích lại mỗi phép có typo (combo đứng yên ở bội số) → Đất hồi máu gần như mọi phép; "đốt mạnh hơn thắng" chỉ so trong 1 đòn. Bài học: luật "vừa chạm bội số" phải test với trạng thái đứng yên, không chỉ lúc tăng.
- Agent báo đã nối tên chiêu nâng cấp vào float text nhưng grep 0 kết quả → luôn bắt reviewer kiểm lại bằng grep/repro, không tin báo cáo.
- Luật "chiêu nâng cấp ≥ gốc" hiểu lỏng (chỉ so khoá chung) để lọt 33/60 override bỏ mất hiệu ứng gốc; chốt luật chặt + test audit toàn bộ.
- 3 phiên cùng sửa file boss trong 1 working tree; một commit ngoài phiên (`8727b66`) gộp cả ba. Lần sau: mỗi plan một worktree/nhánh.
- Mở: chơi thử máy thật cho cân bằng HP (mô phỏng ~42–51% thời gian hạ quái gốc ở cấp 10; dạng tấn công cấp 16 nhanh hơn gốc 21–33%).
