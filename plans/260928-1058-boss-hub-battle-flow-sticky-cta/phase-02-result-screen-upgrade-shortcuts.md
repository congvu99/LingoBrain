---
phase: 2
title: Result screen upgrade shortcuts
status: completed
priority: P2
dependencies:
  - 1
---

# Phase 2: Result screen upgrade shortcuts

## Overview
Màn kết trận: khi có nâng cấp chờ, CTA chính là `🧬 Tiến hoá ngay` / `🌳 Cộng điểm`; các nút cũ lùi thành ghost.

## Requirements
- Qua mốc tiến hoá (`bossEvoMilestoneReached(lv0, lv1)`) → `🧬 Tiến hoá ngay` = primary.
- `pointsLeft(lv1, bossProg.alloc) > 0` → `🌳 Cộng điểm`; primary nếu không có tiến hoá, ghost nếu có.
- Có nâng cấp chờ → `Luyện phép/Đánh lại` + `Về sảnh` thành `btn-ghost`. Không có → giữ nguyên như hiện tại.
- Bỏ `<p class="ok boss-evo-badge-result">…Vào sảnh → Tiến hoá…</p>`; giữ dòng "LÊN CẤP n!" nhưng bỏ phần chỉ đường nếu đã có nút.
- Chạm nâng cấp → `bossOpenHubScreen(renderBossEvolution)` / `bossOpenHubScreen(renderSkillTree)` (phase 1) → màn đó có thanh Chiến đấu.

## Architecture
Tính trước trong `showBossResult`:
```js
const canEvo = leveledUp && bossEvoMilestoneReached(lv0, lv1);
const pts = pointsLeft(lv1, bossProg.alloc);
const upgrades = (canEvo ? [['bossGoEvo', '🧬 Tiến hoá ngay']] : []).concat(pts ? [['bossGoTree', '🌳 Cộng điểm (' + pts + ')']] : []);
```
Nút đầu tiên của `upgrades` = `btn-primary`, còn lại ghost; `#bossAgain` primary chỉ khi `upgrades` rỗng.
Lưu ý: `pointsLeft` > 0 có thể do điểm tồn từ trước (không lên cấp trận này) — vẫn hiện nút là đúng ý (điểm chưa dùng).

## Related Code Files
- Modify: `js/boss-game-result-ui.js` (`showBossResult`, dòng ~153-164)
- Modify: `css/paper-theme.css` nếu `.game-end .row` cần `flex-wrap` cho 3-4 nút

## Implementation Steps
1. Tính `canEvo`, `pts`, `upgrades` như trên.
2. Dòng lên cấp: `'<p class="ok"><b>LÊN CẤP ' + lv1 + '!</b></p>'` (bỏ câu chỉ đường); xoá dòng `boss-evo-badge-result`.
3. Hàng nút: render `upgrades` + `#bossAgain` + `#bossToHub` với class theo quy tắc trên.
4. Bind: `#bossGoEvo` → `bossOpenHubScreen(renderBossEvolution)`; `#bossGoTree` → `bossOpenHubScreen(renderSkillTree)`; giữ bind cũ.
5. CSS: `.game-end .row{flex-wrap:wrap}` nếu chưa có; nút ≥44px.
6. Xoá rule `.boss-evo-badge-result` trong CSS nếu không còn dùng.

## Success Criteria
- [ ] Thắng + mốc 8/16 → nút chính "Tiến hoá ngay" mở màn Tiến hoá có thanh Chiến đấu.
- [ ] Lên cấp không mốc → nút chính "Cộng điểm (n)".
- [ ] Không nâng cấp chờ → giống hệt hiện tại.
- [ ] Thua cũng áp quy tắc (có điểm chưa dùng → Cộng điểm chính, "Đánh lại" ghost).

## Risk Assessment
- Thua mà "Đánh lại" bị đẩy xuống ghost có thể làm chậm người muốn đánh lại ngay → vẫn cùng hàng, 1 chạm; chấp nhận theo quyết định user "nâng cấp là nút chính".
- `bossEvoMilestoneReached` chỉ đúng trận vượt mốc; người bỏ qua lần đó vẫn có badge ở sảnh (không đổi).
