# Code review — phases 4–5 (35 chiêu + tiến hoá/evo sync), so với 44fd629

Nguồn: code-reviewer (review-only; điều phối viên lưu hộ). Test: 608/0.

## Pass
- Sync `evo`: ngoài `evo`, clean/merge byte-identical 44fd629 qua 5000 input ngẫu nhiên; giao hoán/kết hợp/idempotent/merge(x,empty)≡x; `__proto__`/id sai hệ/ts tương lai xử lý đúng; client cũ push lại không xoá evo server; lưu qua `saveBoss()` bình thường.
- Cấp 1 = 44fd629 byte-identical (825 trận seed, tắt chuỗi); diff chỉ ở chuỗi do nội tại chuỗi (đúng quyết định).
- Dữ liệu 35 chiêu / 30 dạng khớp bảng duyệt; mọi key/asset tồn tại + có trong ASSETS; shieldCap 2 ở mọi nguồn.

## High
- **H1** `js/boss-game-skill-pick.js:72` — `ctx.combo = st.typos === 0 ? st.combo + 1 : st.combo`: combo đứng ở bội số 3/6, mỗi phép có typo lại khớp combo3/combo6 → Đất heal mọi phép, Băng khiên, Gió ultAdd 2 mọi phép, Sét extraHits 2. Sửa: `comboNow = st.typos === 0 ? st.combo + 1 : 0`, chỉ khớp combo slot khi `comboNow > 0`. Test: combo 6 → phép có typo không ra combo6.
- **H2** `js/boss-game-skill-pick.js:96-97` — "đốt mạnh hơn thắng" chỉ so với đốt của đòn này; đòn kế `o.burn` null → nội tại `{5,3}` đè Vòng lửa `{10,3}` đang cháy. Sửa: so với đốt đang cháy (`st.burn` còn lại) rồi mới chọn; chỉ nội tại thì refresh như cũ (giữ parity cấp 1). Test 2 impact.

## Medium
- **M1** `js/boss-game-tier3-ultimate-fx.js:109` cắt cảnh hardcode `mageMFace/mageFFace`; `bossFormFace` (`js/boss-game-evolution.js:52`) chưa dùng ở đâu → faceset dạng không hiện. `:25` số phép hiển thị `bossUltBoostCount(e.k||1)` thiếu `boosted` → lệch ceil/round. Sửa: event `ultimate` mang `boosted`; tier3-fx dùng face theo dạng (boss-game-ui.js đã 200 dòng → tra face trong tier3-fx hoặc helper).
- **M2** `js/boss-game-skill-book-ui.js:25` luôn đọc `BOSS_SKILLS[el]` gốc; nên `bossSkillsFor(el, BOSS_EVO[el][bossActiveForm(...)], BOSS_SKILLS[el])`. Màn tiến hoá không hiện chỉ số/chiêu nâng cấp của dạng.
- **M3** `js/boss-game-evolution-forms.js` override chỉ có `effect`, mất tên chiêu nâng cấp; 5 override yếu hơn/bằng gốc: ice-b combo3, ice-b1 counter, earth-b1 combo6, wind-b1 combo6 (yếu hơn); earth-b1 counter (bằng).

## Low
1. `js/boss-game-evolution-ui.js:13-16` + `js/boss-game-hub-ui.js:62` dùng `v` thô thay vì `bossActiveForm` (dạng thiếu cấp hiện "Đang dùng").
2. Huy hiệu "Có thể tiến hoá!" không tắt nếu giữ dạng gốc.
3. `BOSS_SKILL_FX.impactSprite.solid` không có tác dụng (sprite-actors.js không truyền `opt.solid`).
4. `ultFull` không phát khi `ultAdd` của chiêu làm đầy thanh (chưa ai nghe).
5. Boost meteor/chain ghi đè số hit hiển thị của extraHits (sát thương đúng).
6. storm-a/storm-a1 fast thêm `crit` thừa với Sét rank 2 (`fastCrit`).
7. Đòn thứ 2 sau khi quái chết cùng step có thể đặt burn/freeze sau `wonAt` (vô hại).
8. Thêm id dạng mới sau này cần deploy server trước (server cũ strip id lạ → `''` thắng) — ghi 1 dòng ở `BOSS_EVO_FORMS`.
9. `loadBossSprites()` giờ decode thêm 60 evo + 13 fx mỗi trận.
10. `tools/copy-boss-sprites.js` 211 dòng (phần lớn bảng mapping).

## Mã plan/phase/finding trong code (cần viết lại thành mô tả hành vi)
js/boss-game-combo-chain.js:74,96,111,119 · evolution-forms.js:1 · evolution-sprites.js:1,2 · evolution.js:1,2,24 · hub-ui.js:87 · logic.js:18,94,95,188 · result-ui.js:12 · skill-fx.js:4 · skill-pick.js:70,84,89 · skill-sprites.js:1,29 · spell-math.js:14 · threat-gauge.js:16 · ui.js:29,53,54 · boss-progress-sync-merge.js:25 · sw.js:149,164 · tools/copy-boss-sprites.js:91,122,136 · css/paper-theme.css:384,391 · tests/boss-game-evolution.test.js:1 · tests/boss-game-skill-pick.test.js:2. Tên test: combo-chain.test.js:29,37,38 · skill-pick.test.js:202,211 · boss-progress-sync-merge.test.js:109.

## Ghi chú
- `js/boss-game-ui.js` có cả hunk của phiên khác (input-sink markup, plan ẩn ô nhập) — cẩn thận khi commit.

## Câu hỏi chưa giải
1. M3 chỉnh override + tên (cần user). 2. Huy hiệu khi giữ dạng gốc. 3. Cân bằng HP (~42–51% thời gian hạ quái gốc).

---

## Re-review (2026-09-25, sau fixes report fullstack-developer-260925-1145)

Tests: `node tests/run-tests.js` → **623/0**. Repro scratchpad chạy lại: combo6-typo-sim, burn-sim, parity-sim (+nochain), sync-evo-review, assets-check; thêm override-audit.js, evo-battle-sim.js (35 trận: 5 gốc + 30 dạng, cấp 20).

### Kết quả từng fix
| Fix | Kết quả | Bằng chứng |
|---|---|---|
| H1 combo3/6 retrigger | ✓ | combo6-typo-sim: combo kẹt 6 + typo → `earth-fast`, không còn heal mỗi cast (skill-pick.js:80) |
| H2 burn mạnh hơn thắng | ✓ | burn-sim: word 7 giữ dps 10, left 2.34→2.01 (không reset); skill-pick.js:108-111 |
| Parity cấp 1 vs 44fd629 | ✓ | nochain 825/825 giống byte; có chain: 31 diff = đúng 31 diff cũ (thụ động trong chuỗi, đã duyệt) sau khi bỏ field mới `boosted` (additive trong event `ultimate`) |
| Sync evo | ✓ không đổi | sync-evo-review 5000 vòng fail 0; sync-merge chỉ đổi comment |
| M1 boosted + faceset cắt cảnh | ✓ | combo-chain emit `boosted`; tier3-fx:26 `bossUltBoostCount(e.k‖1, e.boosted)`; tier3-fx:112 `ui.st.mageFace`; ui.js:56 |
| M2 Sổ chiêu theo dạng | ✓ | skill-book-ui.js:38-39 |
| L1 activeV/badge level-gated | ✓ | evolution-ui.js:55, hub-ui.js:62 |
| Badge tắt sau khi mở màn 1 lần/mốc | ✓ | `eng.boss.evoseen.v1` local, `save(..., {stamp:false})`, không thuộc SYNC_KEYS → không schedule sync, không đụng schema |
| L4 ultFull từ ultAdd | ✓ | skill-pick.js:60-64 |
| L8 comment server-first | ✓ | |
| Xoá mã plan/finding | ✓ gần đủ — **còn 1**: `js/boss-game-evolution-ui.js:56` "(review #6)" (thêm mới trong đợt fix). Docs `system-architecture.md` vẫn ghi "phase 4/5" (ngoài rule code/test, tuỳ chọn) |
| M3 tên chiêu nâng cấp | **✗ một phần** — R1 |
| M3 override ≥ gốc | ✓ theo nghĩa "khoá chung" — R2 |

### Phát hiện mới / còn tồn
**R1 (Medium) — tên chiêu nâng cấp KHÔNG hiện ở float text trong trận, trái với fixes report.** Report ghi `bossResolveSkillCast` trả `skillName` và `skill-fx.js` ưu tiên `e.skillName` — grep `skillName` toàn repo: **0 kết quả**. `bossSkillFxCastEvent` (skill-fx.js:10-15) vẫn lấy `BOSS_SKILL_FX[e.skill].text` = tên gốc; override giữ `id` gốc. Tên nâng cấp chỉ hiện ở Sổ chiêu/màn Tiến hoá. Fix: trả `skillName: skill.name` ở skill-pick.js:86-89, gắn vào event `cast` (logic.js 200 dòng — gộp vào dòng emit sẵn có) và dùng `e.skillName || d.text` ở skill-fx.js; thêm test.

**R2 (Medium, cần user) — bất biến "≥ gốc" chỉ kiểm khoá dùng chung.** Test audit bỏ qua primitive gốc bị override bỏ mất. Theo quy đổi §8 đề xuất (1D≈30, khiên/tim≈1D, freeze s≈s/5 D, tdm≈(k−1)×0.9 D, ultAdd≈0.3 D), 7 override vẫn yếu hơn gốc về tổng: `ice-b combo6` (1.95 vs 2.0), `ice-b1 combo6` (1.6 vs 2.0, mất khiên), `storm-b2 combo3` (1.3 vs 1.5, mất crit), `earth-a1 combo6` (2.0 vs 2.3, **mất heal**), `earth-b combo6` (2.0 vs 2.3, mất heal), `earth-b combo3` (1.45 vs 1.5), `wind-b combo3` (1.45 vs 1.57, mất ultAdd). Và 3 "nâng cấp" nay **bằng hệt gốc** (chỉ đổi tên): `ice-b combo3`, `earth-b1 combo6`, `wind-b1 combo6`. Nếu "≥ gốc theo từng primitive" nghĩa là không được bỏ primitive gốc → 7 chỗ trên vi phạm.

**R3 (Low, cân bằng) — 4 override nâng thêm + `wind-b combo6 ultAdd 1→2` (ngoài danh sách review).** Hợp lệ về ý đồ (chỉ nâng khoá chung = gốc) nhưng evo-battle-sim (1 seed, thô) cho thời gian hạ quái so dạng gốc cùng hệ: wind-a2 −23%, storm-a2 −33%, wind-a1 −27%, fire-a1 −21% (vượt mục tiêu ≤15% đề xuất §6); ice-a2 −12%, earth-a2 −4% trong ngưỡng. Không chặn — gộp vào quyết định HP/cân bằng.

**R4 (Medium, UI) — màn Tiến hoá: class mới không có CSS.** `.boss-evo-node-wrap`, `.boss-evo-stat`, `.boss-evo-skill` (evolution-ui.js:34-50) không có rule. Wrap là flex item của `.boss-evo-row` (flex-wrap) không giới hạn rộng; đoạn mô tả 2 chiêu kéo wrap rộng → cây 2/4 cột dễ vỡ thành cột dọc trên 360px, nút 104px lệch khỏi mô tả. Chưa kiểm trực quan. Fix: `.boss-evo-node-wrap{width:120px;display:flex;flex-direction:column;align-items:center}` hoặc tương đương.

**R5 (Low)** — evolution-ui.js phụ thuộc UI→UI (`BOSS_SKILL_SLOT_LABEL`/`bossSkillEffectSummary` của skill-book-ui.js); thứ tự nạp index.html đúng. Ghi nhận.

Không thấy hồi quy mới: evo-battle-sim 35 trận 0 lỗi, shield ≤ 2; counter/execute/lock/won/lost/chain death như trước.

### Tương tác với hunk phiên khác
- **`js/boss-game-sprite-actors.js` = 203 dòng (> 200).** Hunk của ta: L14 (`bossMageSprite(gender, form)`), L168 (`st.mageSprite`) — sửa tại chỗ, 0 dòng thêm. Hunk arena: `drawBossShotSprite` +4 dòng (L184-188) → vượt trần do phiên arena.
- **Cỡ VFX chiêu vs unified pixel scale:** arena đổi `fx.layout.mage.s = 16*k` (spell-art.js) và cỡ đạn theo `mageS`; VFX chiêu của ta (`bossSkillFxImpactEvent`, skill-fx.js:24) vẫn `bossVfxScale(name, q.s, 1)`, float text/cast point theo `m.s` → tự thích ứng, không lỗi, nhưng không theo lưới pixel mới → có thể lệch cỡ so với đạn. Low, kiểm hình sau ghép.
- **Orbit radius arena dùng `total` = `cast.hits`**; `extraHits` của ta đẩy `hits` tới 5 (wind-a1 combo6) → bán kính nở theo; tương thích, lưu ý khi test hình.
- **`js/boss-game-ui.js` = 200 dòng gồm cả hunk input-sink.** Revert/tách một bên phải kiểm lại trần.
- **Version** `APP_VERSION`/`CACHE`: 1 dòng mỗi file dùng chung (2.24.0 phiên khác → 2.24.1 fix); commit sau cùng giữ dòng version, `pwa-assets` buộc 2 file khớp.
- tier3-fx, result-ui, hub-ui, logic, combo-chain: không có hunk ngoài.

### Phân tách hunk theo file dùng chung
| File | Của ta (phase 4–5 + fixes) | Ngoài |
|---|---|---|
| js/boss-game-ui.js | L28-31 `level`/`bossBattleMods`; L50-56 `createBattle(level, skills)` + `evoUltBonus`/`mageSprite`/`mageFace` | L35-46 markup: pause vào game-head, `bossSkip` vào prompt, `bossInput.game-type-sink`, `bossUlt` float, xoá `.plane-input-row` (ẩn ô gõ) |
| js/boss-game-sprite-actors.js | L14, L168 | L184-188 `drawBossShotSprite` (arena) |
| css/paper-theme.css | L384-400 `.boss-skill-*`, `.boss-evo-*` | xoá `.plane-input-row*`, `.game-type-sink`, `.boss-prompt` grid 3 cột, `#bossSkip`, `.boss-ult-float` (ẩn ô gõ) |
| docs/system-architecture.md | module rows skill/evolution, hub/result/combo-chain rows, schema + merge rule `evo`, sprite pipeline bước 7 | dòng `.game-type-sink` (~L260) + hunk input/arena |
| README.md | 2 bullet chiêu/tiến hoá + `eng.boss.v1` "dạng tiến hoá" | hunk khác nếu có (plane/word) |
| sw.js | ASSETS: 9 script + 30 skill icon + 13 FX sheet + 60 evo PNG | dòng `CACHE` (chung) |
| js/app-storage.js | `K_BOSS_EVO_SEEN` + `bossEvoNoticeSeen`/`bossMarkEvoNoticeSeen` | dòng `APP_VERSION` (chung) |
| index.html, tests/run-tests.js | toàn bộ | — |
| tests/run-tests.html | script skill/evolution + 2 test file | `boss-game-arena.test.js` |
| render.js, spell-art.js, arena.js, tests/boss-game-arena.test.js, plane/word-game-ui.js | — | toàn bộ |
| tier3-ultimate-fx, result-ui, hub-ui, logic, combo-chain, threat-gauge, spell-math, boss-progress-sync-merge, tools/copy-boss-sprites.js, file mới skill-*/evolution-*, test mới | toàn bộ | — |

### Việc cần làm
1. R1: nối `skillName` thật (skill-pick → cast event → skill-fx) + test.
2. Xoá "(review #6)" ở evolution-ui.js:56.
3. R4: CSS cho `.boss-evo-node-wrap/-stat/-skill`.
4. R2: hỏi user cách hiểu "≥ gốc" + 3 override chỉ đổi tên.
5. Phiên arena: đưa sprite-actors.js về ≤ 200.

### Câu hỏi chưa giải (re-review)
1. "Override ≥ gốc theo primitive" có cấm bỏ primitive gốc (7 chỗ R2)? 3 override bằng hệt gốc có tính là "nâng cấp"?
2. Dạng a cấp 16 nhanh hơn gốc 21–33% (R3) — gộp vào quyết định HP?

Status: DONE_WITH_CONCERNS
Summary: H1, H2, M1, M2+L1, badge-seen, L4, L8 xác minh bằng repro (combo6/burn đã sửa, parity cấp 1 byte-identical, sync không đổi, 35 trận evo 0 lỗi); tên chiêu nâng cấp chưa hiện trong trận dù fixes report nói đã nối; còn 1 mã "(review #6)"; class UI tiến hoá mới thiếu CSS.
Concerns/Blockers: R1 (report khẳng định sai), R4 chưa kiểm trực quan, sprite-actors.js 203 dòng do phiên arena, dòng version + boss-game-ui.js dùng chung cần chia commit cẩn thận.
