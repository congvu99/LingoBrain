---
phase: 1
title: Shared battle bar and hub cleanup
status: completed
priority: P2
dependencies: []
---

# Phase 1: Shared battle bar and hub cleanup

## Overview
Helper thanh CTA dính đáy dùng chung cho sảnh + 3 màn phụ; gom hướng dẫn sảnh vào `<details>`; helper mở màn phụ với `game` sảnh hợp lệ.

## Requirements
- Functional: nút `Chiến đấu` (story) / `Bắt đầu` (endless) / `Luyện phép` (practice) + chip độ khó chỉ-đọc (vd `Vừa · 6s`) ở cuối `.boss-hub`, `.boss-tree`, `.boss-evo`, `.boss-skill-book`.
- Functional: onclick gọi thẳng `startBossBattle(bossTodayOpts(cfg.bossLevel))` — đồng bộ trong cú chạm (iOS focus ô gõ).
- Functional: bỏ nút `#bossStart` cũ; hướng dẫn ("Đề là nghĩa tiếng Việt…") vào `<details class="boss-howto"><summary>Cách chơi</summary>…</details>`.
- Non-functional: nút ≥44px; không che nội dung cuối; sáng/tối dùng token sẵn (`--card`, `--rule-soft`, `--sh-3`).

## Architecture
- Nhật ký KHÔNG phải màn riêng (`renderJournal()` chỉ mở `<details>` trong sảnh) → không cần thanh riêng.
- Thanh là phần tử cuối của `.card.page` với `position:sticky;bottom:0` → dính đáy vùng cuộn, nằm trên `.tabbar` (tab bar lo safe-area).
- Màn phụ được mở từ sảnh (game = sảnh, `stop = stopBossHub`) hoặc từ kết trận (game.stop = null). Thêm `bossOpenHubScreen(render)` = tạo `game` sảnh như `openBossHub` rồi gọi `render()` → quit / startBossBattle luôn dọn `bossPortraitStop` đúng.

```js
// boss-game-hub-ui.js
function bossBattleBarHtml() {
  const diff = bossDifficulty(cfg.bossLevel), o = bossTodayOpts(diff);
  const label = o.kind === 'story' ? '⚔ Chiến đấu' : o.kind === 'practice' ? 'Luyện phép' : 'Bắt đầu';
  const d = BOSS_DIFFS.find(x => x.id === diff);
  return '<div class="boss-battle-bar"><span class="mono small muted">' + esc(d.label) + ' · ' + BOSS_TUNING.clock[diff] + 's</span>' +
    '<button class="btn-primary" id="bossStart">' + label + '</button></div>';
}
function bossBindBattleBar() { $('#bossStart').onclick = () => startBossBattle(bossTodayOpts(cfg.bossLevel)); }
function bossOpenHubScreen(render) {
  game = { id: 'boss', seq: ++gameSeq, miss: [], over: false, stop: stopBossHub };
  syncGameChrome();
  render();
}
```
Giữ id `#bossStart` (một thanh mỗi màn) → không cần đổi chỗ khác.

## Related Code Files
- Modify: `js/boss-game-hub-ui.js` (helper, renderHub dùng thanh + `<details>`; `openBossHub` có thể gọi `bossOpenHubScreen(startBossHub)` cho DRY)
- Modify: `js/boss-game-skill-tree-ui.js` (`renderSkillTree` chèn thanh + bind)
- Modify: `js/boss-game-evolution-ui.js` (`renderBossEvolution` chèn thanh + bind)
- Modify: `js/boss-game-skill-book-ui.js` (`renderSkillBook` chèn thanh + bind)
- Modify: `css/paper-theme.css` (`.boss-battle-bar`, `.boss-howto`)

## Implementation Steps
1. Thêm 3 helper trên vào `boss-game-hub-ui.js`; `openBossHub` → `bossOpenHubScreen(startBossHub)`.
2. `renderBossHub`: thay `<p class="small muted">Đề là…</p>` bằng `<details class="boss-howto">`; thay dòng `#bossStart` cuối bằng `bossBattleBarHtml()`; thay bind cũ bằng `bossBindBattleBar()`.
3. `renderSkillTree`, `renderBossEvolution`, `renderSkillBook`: nối `bossBattleBarHtml()` trước `</div>` đóng `.card.page`; gọi `bossBindBattleBar()` sau khi gắn `innerHTML`. (Cây/Tiến hoá re-render sau mỗi chạm → thanh cập nhật theo.)
4. CSS:
   ```css
   .boss-battle-bar{position:sticky;bottom:0;z-index:5;display:flex;align-items:center;justify-content:space-between;gap:12px;
     margin:4px -16px -16px;padding:10px 16px;background:var(--card);border-top:1px solid var(--rule-soft);box-shadow:var(--sh-3)}
   .boss-battle-bar .btn-primary{min-height:44px;flex:1;max-width:260px}
   .boss-howto summary{cursor:pointer;min-height:44px;display:flex;align-items:center}
   ```
   Chỉnh margin âm theo padding thật của `.card.page` (đọc CSS trước khi viết).
5. Kiểm: `.page` có `overflow` ẩn làm hỏng sticky không — nếu có, đặt sticky trên phần tử con của vùng cuộn thật.

## Success Criteria
- [ ] 4 màn đều có thanh CTA dính đáy; bấm → vào trận.
- [ ] Sảnh không còn đoạn hướng dẫn bung sẵn; "Cách chơi" mở/đóng được.
- [ ] Từ màn phụ bấm thoát → không còn interval/vòng lặp chân dung (không lỗi console).
- [ ] Không vỡ khung 360–375px; tối/sáng đủ tương phản.

## Risk Assessment
- Sticky không chạy nếu tổ tiên có `overflow:hidden` → bước 5.
- Chip độ khó dài + nút → tràn ở 360px: chip `flex:none`, nút `flex:1`, test 360px.
- `bossTodayOpts` gọi thêm 1 lần mỗi render — rẻ, chấp nhận.
