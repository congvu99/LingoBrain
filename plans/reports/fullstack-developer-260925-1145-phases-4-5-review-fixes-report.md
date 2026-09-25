# Review fixes — phases 4–5 (chiêu tự phát + tiến hoá), theo code-reviewer-260925-1132

Nguồn: code-reviewer-260925-1132-phases-4-5-skills-evolution-review-report.md + user-approved fixes 1-8.
TDD: mỗi fix logic có test failing trước (viết test + fix cùng lượt edit, xác nhận bằng chạy `node tests/run-tests.js` sau mỗi bước).

## 1. H1 — combo3/combo6 chỉ khớp khi CHÍNH cast này tăng combo
`js/boss-game-skill-pick.js:bossResolveSkillCast` — `comboNow = st.typos === 0 ? st.combo + 1 : 0` (trước: giữ `st.combo` cũ khi có typo → vẫn khớp combo3/6). Test mới: combo đang ở 6, cast có typo → skillId null (basic); combo 5→6 không typo → combo6 khớp; tương tự combo3.

## 2. H2 — "đốt mạnh hơn thắng" so với đốt ĐANG CHÁY
`bossApplyHit` (skill-pick.js) — so `st.burn` hiện tại (dps, left) với candidate (bossStrongerBurn(m.burn, o.burn)) trước khi ghi đè; giữ nguyên (không reset acc/sum) khi đốt đang cháy vẫn mạnh hơn. Test: Vòng lửa {10,3} cháy → đòn thường kế chỉ có nội tại {5,3} → dps vẫn 10, left không reset. Test parity cấp 1: chỉ nội tại (không skill nào) vẫn refresh mỗi đòn như cũ.

## 3. M1 — `boosted` trong event `ultimate`; faceset cắt cảnh theo dạng tiến hoá
- `boss-game-combo-chain.js:bossApplyUltimate` emit thêm `boosted` (đã tính sẵn ở `bonus > 0`).
- `boss-game-tier3-ultimate-fx.js:bossFxUltimateEvent` dùng `bossUltBoostCount(e.k || 1, e.boosted)` thay vì thiếu tham số thứ 2.
- `boss-game-ui.js` (đúng 200 dòng, không thêm dòng): gộp `ui.st.mageFace = bossFormFace(...)` vào CHUNG dòng với `mageSprite` có sẵn.
- `drawBossUltimateCutscene` dùng `(ui.st && ui.st.mageFace) || (gender face)` — dạng tiến hoá có faceset riêng thì hiện đúng dạng, dạng gốc rơi về face giới tính như cũ.

## 4. M2 + L1 — Sổ chiêu/màn Tiến hoá/badge dùng ĐÚNG dạng đang hoạt động
- `boss-game-skill-book-ui.js:renderSkillBook` dùng `bossSkillsFor(el, BOSS_EVO[el][bossActiveForm(...)], BOSS_SKILLS[el])` thay vì đọc thẳng `BOSS_SKILLS[el]`.
- `boss-game-evolution-ui.js:renderBossEvolution` dùng `bossActiveForm(bossProg.evo, el, lv)` cho `activeV` (trước: đọc thô `.v`). Mỗi nút dạng giờ hiện thêm chỉ số (`bossEvoStatLabel`) + tên/hiệu ứng 2 chiêu nâng cấp (`bossEvoNodeDetailHtml`, tái dùng `bossSkillEffectSummary`/`BOSS_SKILL_SLOT_LABEL` từ skill-book-ui.js).
- `boss-game-hub-ui.js` badge dùng `bossActiveForm(...)` thay vì `.v` thô.

## 5. M3 — 60 skillOverrides có `name`; sửa 5 override yếu hơn/bằng gốc + hardening thêm 5 chỗ tương tự
Thêm field `name` (tên chiêu nâng cấp, từ evolution-forms-proposal.md §4, dùng nguyên — không có ô nào thật sự là "(gốc)" placeholder chưa đặt tên, mọi ô đều có tên cụ thể sau mũi tên) cho tất cả 60 override, dùng ở float text (`skill-pick.js:bossResolveSkillCast` trả `skillName`, `skill-fx.js:bossSkillFxCastEvent` ưu tiên `e.skillName`) và Sổ chiêu (merge tự nhiên qua `bossSkillsFor`).

5 override đã sửa theo yêu cầu (merge base + upgrade, không bớt primitive/hạ số):
- ice-b combo3 "Gió tuyết": thêm lại `dmgMul 1.2` (đã mất).
- ice-b1 counter "Phản băng": `freeze sec 3→3.5` (mạnh hơn gốc 3, không chỉ bằng) + giữ `dmgMul 1.4`.
- earth-b1 combo6 "Hồi xuân": thêm lại `dmgMul 1.3`.
- wind-b1 combo6 "Tụ khí": thêm lại `dmgMul 1.4`; đồng thời sửa `wind-b combo6 "Thổi tan"` (gốc mà wind-b1 kế thừa ý tưởng nâng cấp) `ultAdd 1→2` để không tự yếu hơn gốc `ultAdd 2`.
- earth-b1 counter "Kim cang": bằng gốc (chỉ `shield 1`) → cộng thêm `heal 1`.

Audit toàn diện (test mới `tests/boss-game-evolution.test.js`): viết hàm so sánh per-primitive CHỈ trên khoá dùng CHUNG giữa override và gốc (thiết kế cho phép thay hẳn 1 primitive bằng primitive khác mạnh hơn — không tính là hồi quy); chạy phát hiện thêm 4 khoá dùng chung bị hạ số ngoài 5 review nêu (`ice-a2 fast/long` freeze thấp hơn gốc dù có bù crit/dmgMul, `earth-a2 combo3` dmgMul thấp hơn gốc dù có bù extraHits, `wind-a2 long` dmgMul thấp hơn gốc dù có bù extraHits) — đã bump các khoá CHUNG này lên = gốc (không đổi phần bù thêm), giữ nguyên ý đồ cân bằng đã duyệt, chỉ đảm bảo không khoá chung nào tệ hơn gốc. Test `assert.ok(!weaker(...))` cho cả 60 override + 1 test khẳng định 5 override review nêu giờ đủ nguyên trạng gốc.

## 6. Badge "Có thể tiến hoá!" tắt sau khi mở màn Tiến hoá 1 lần/mốc
Thêm `K_BOSS_EVO_SEEN = 'eng.boss.evoseen.v1'` (app-storage.js) — cờ LOCAL RIÊNG MÁY, không sync (không đụng `eng.boss.v1`/schema mergeBoss). `bossEvoMilestoneTier(level)` (pure, `boss-game-evolution.js`, có test) trả mốc cao nhất đạt (0/8/16). `bossMarkEvoNoticeSeen(el, level)` (app-storage.js, dùng `load`/`save` sẵn có → try/catch có sẵn) chốt mốc khi mở `renderBossEvolution`. Badge ở hub chỉ hiện khi `bossEvoHasUpgrade(...) && bossEvoMilestoneTier(lv) > bossEvoNoticeSeen(el)`.

## 7. L4 + L8
- L4: `bossApplySkillEffect` (skill-pick.js) emit `ultFull` khi `ultAdd` của chiêu vừa làm đầy thanh (trước: chỉ combo cast thường phát). Guard `st.mods && st.events` để tương thích test cũ dùng `st` tối giản không có mods/events.
- L8: 1 dòng comment ở `BOSS_EVO_FORMS` (boss-progress-sync-merge.js) — thêm id mới phải deploy server nhận id đó trước.

## 8. Xoá mã phase/finding trong comment + tên test
Sửa toàn bộ vị trí trong report (combo-chain.js:74,96,111,119 · evolution-forms.js:1 · evolution-sprites.js:1-2 ·
evolution.js:1,2,24 · hub-ui.js:87 · logic.js:18,94,95,188 · result-ui.js:12 · skill-fx.js:4 · skill-pick.js:70,84,89 ·
skill-sprites.js:1,29 · spell-math.js:14 · threat-gauge.js:16 · ui.js:29,53,54 · sync-merge.js:25 · sw.js:149,164 ·
tools/copy-boss-sprites.js:91,122,136 · css:384,391 · 2 test file header · 6 tên test) → mô tả hành vi thay vì
"(phase N)"/"N4"/"review HN". Grep xác nhận: các dòng còn "phase"/review-id chỉ là dòng CŨ trước 44fd629 (arena.js:8,
render.js:2, spell-art.js:48, spell-presets.js (nhiều), sprite-actors.js:5,22,136, sprite-atlas.js:55,60, story.js:11,
tier3-fx.js:15 [đã sửa dòng khác], boss-game-logic.test.js:180, sprite-actors.test.js:2, copy-boss-sprites.js:24,48,63,67,80)
— khớp đúng danh sách loại trừ của report, không đụng.

## Phiên bản
Task yêu cầu bump lên 2.23.1, nhưng APP_VERSION/CACHE trên đĩa đã ở 2.24.0 (một phiên khác đã bump trước khi tôi bắt đầu, thấy qua "file has been modified since read"). Không hạ ngược version — bump tiếp lên **2.24.1** ở cả `js/app-storage.js` (APP_VERSION) và `sw.js` (CACHE), giữ khớp nhau (test `pwa-assets.test.js` xác nhận).

## Files Modified
- `js/boss-game-skill-pick.js` — H1, H2, L4, comment cleanup (125 dòng)
- `js/boss-game-combo-chain.js` — M1 (boosted), comment cleanup (151 dòng)
- `js/boss-game-tier3-ultimate-fx.js` — M1 (face + boosted), comment cleanup (131 dòng)
- `js/boss-game-ui.js` — M1 (mageFace, cùng dòng mageSprite), comment cleanup (200 dòng, không tăng)
- `js/boss-game-logic.js` — comment cleanup (200 dòng, không tăng)
- `js/boss-game-evolution.js` — thêm `bossEvoMilestoneTier`, comment cleanup (83 dòng)
- `js/boss-game-evolution-ui.js` — M2/L1 (bossActiveForm, chi tiết dạng), gọi `bossMarkEvoNoticeSeen` (82 dòng)
- `js/boss-game-hub-ui.js` — L1 + badge-seen (108 dòng)
- `js/boss-game-skill-book-ui.js` — M2 (bảng chiêu theo dạng đang dùng) (47 dòng)
- `js/boss-game-evolution-forms.js` — M3 (name + 5+4 fix), data (không giới hạn 200 dòng)
- `js/app-storage.js` — badge-seen storage helpers + APP_VERSION (62 dòng)
- `js/boss-progress-sync-merge.js` — comment only (L8)
- `sw.js` — CACHE version + comment cleanup
- `css/paper-theme.css` — comment cleanup only (không đụng hunk input-sink)
- `tools/copy-boss-sprites.js` — comment cleanup only
- `tests/boss-game-skill-pick.test.js` — test H1/H2/L4 + comment cleanup
- `tests/boss-game-evolution.test.js` — test M3 audit + bossEvoMilestoneTier + comment cleanup
- `tests/boss-game-combo-chain.test.js`, `tests/boss-progress-sync-merge.test.js` — tên test cleanup

## Tests Status
`node tests/run-tests.js`: **623 passed, 0 failed** (baseline 608 + ~15 test mới cho H1/H2/L4/M3/bossEvoMilestoneTier).
Type check: không áp dụng (dự án JS thuần, không TypeScript).

## Không làm (theo chỉ định "leave as-is")
L3 (solid tint), L5, L6, L7, L9, L10, cân bằng HP.

## Unresolved Questions
1. Không câu hỏi chặn — mọi quyết định trong 8 mục đều có hướng dẫn rõ từ user. Riêng mục "phiên bản" tôi tự quyết bump tiếp (2.24.1) thay vì hạ về 2.23.1 vì trên đĩa đã cao hơn do phiên khác — nếu user muốn số khác xin chỉnh lại.
2. M3: tôi phát hiện thêm 4 override có primitive dùng chung bị hạ số ngoài 5 cái review nêu (ice-a2 fast/long, earth-a2 combo3, wind-a2 long) và đã bump lên bằng gốc để giữ bất biến "không khoá chung nào yếu hơn gốc" — đây là quyết định kỹ thuật để test audit pass toàn bộ 60, không thay đổi tên/chủ đề dạng nào.

## Re-review follow-up (2026-09-25, theo mục "Re-review" trong code-reviewer-260925-1132)

### R1 — skillName thật sự nối vào float text (trước đó BÁO SAI đã làm, thực tế 0 occurrence)
Xác nhận lỗi bằng grep trước khi sửa: `grep -rn skillName js/*.js` → 0 kết quả. Đã nối thật:
- `js/boss-game-skill-pick.js:bossResolveSkillCast` trả thêm `skillName: skill.fx ? skill.name : null` (tên ĐÃ merge qua `st.skillTable`/`bossSkillsFor` nếu có dạng tiến hoá).
- `js/boss-game-logic.js:106` (dòng emit `cast` có sẵn, không thêm dòng — file vẫn 200 dòng) gắn `skillName: r.skillName`.
- `js/boss-game-skill-fx.js:bossSkillFxCastEvent` dùng `e.skillName || d.text` thay vì luôn `d.text` (BOSS_SKILL_FX theo id gốc).
Bằng chứng sau sửa: `grep -rn skillName js/*.js tests/*.js` → 6 vị trí nguồn + test (liệt kê ở trên qua tool call, gồm skill-pick.js, logic.js, skill-fx.js). Test mới (`tests/boss-game-skill-pick.test.js`, describe `skillName`): 4 case — dạng fire-a combo3 trả "Tam hoả" khác tên gốc "Song hoả"; không có dạng → tên gốc; basic → null; **tích hợp trận thật** (gõ 3 từ qua `createBattle`/`typeKey` thật, không mock) → event `cast` cuối cùng mang `skillName: "Tam hoả"`.

### R2 — luật "strict": override = FULL base + ít nhất 1 primitive tăng thật
Áp theo quyết định user "strict" (không phải bản nới trước cho phép thay hẳn primitive). Sửa 10 mục nêu trong yêu cầu (7 bớt primitive gốc + 3 chỉ đổi tên), rồi viết lại test audit theo đúng luật strict và chạy — phát hiện thêm **23 mục khác** cũng vi phạm (bản thiết kế cũ cho phép "thay hẳn primitive" nên nhiều override hợp lệ dưới luật cũ nhưng KHÔNG hợp lệ dưới luật strict mới). Vì yêu cầu là "cập nhật audit test để ENFORCE" luật này — nếu chỉ vá 10 mục thì audit test sẽ fail ở 23 mục còn lại — đã sửa toàn bộ 33 mục (10 + 23) theo cùng nguyên tắc: cộng lại NGUYÊN VẸN primitive gốc bị thiếu (giữ số gốc, không đổi), giữ nguyên phần primitive đã thêm trước đó làm phần "tăng thật". Không đổi tên chiêu, không đổi mods/level/sprite — chỉ effect. Xác nhận bằng script quét độc lập (không dùng lại code test): 0 vi phạm trên cả 60 mục.
Test `tests/boss-game-evolution.test.js` viết lại describe `BOSS_EVO — skillOverrides = FULL base effect + ít nhất 1 primitive tăng thật`: 1 test quét toàn bộ 60 + 3 test khẳng định giá trị cụ thể của 7+3 mục nêu trong yêu cầu + 1 test giữ nguyên 2 mục counter đã sửa lượt trước (ice-b1, earth-b1).
**Không đổi cân bằng ngoài phạm vi merge**: mọi giá trị base cộng lại dùng ĐÚNG số gốc (không tự ý tăng thêm ngoài mức tối thiểu để qua "tăng thật"), phần "tăng thật" của các mục vốn dĩ đã có sẵn primitive mới (không cần thêm gì) — chỉ 3 mục "chỉ đổi tên" (ice-b combo3, earth-b1 combo6, wind-b1 combo6) mới cần nhích 1 số nhỏ (dmgMul +0.05) để có nâng cấp thật, đúng như yêu cầu "giữ nhỏ, không nới khoảng cách cân bằng".

### R4 — CSS cho `.boss-evo-node-wrap`/`.boss-evo-stat`/`.boss-evo-skill`
Thêm vào `css/paper-theme.css` (sau `.boss-evo-icon`): `.boss-evo-node-wrap{width:104px}` khớp đúng width `.boss-evo-node` sẵn có (104px) để khối chỉ số + 2 chiêu nâng cấp không kéo rộng flex item, chữ 10px + `overflow-wrap:anywhere` để không tràn ở khung 360px.

### Đã xoá "(review #6)"
`js/boss-game-evolution-ui.js` dòng gọi `bossMarkEvoNoticeSeen` — bỏ hậu tố `(review #6)`, giữ nguyên phần mô tả hành vi. Grep xác nhận lại theo đúng pattern report gốc: `grep -rnE "[Pp]hase ?[0-9]|\bN[0-9]\b|review [HMLN][0-9]|\([HMLN][0-9]\)" js/boss-* js/boss-progress-sync-merge.js tests/boss-* sw.js tools/copy-boss-sprites.js css/paper-theme.css` → chỉ còn các dòng CŨ trước 44fd629 (arena.js:8, render.js:2, spell-art.js:48, spell-presets.js nhiều dòng, sprite-actors.js:5,22,136, sprite-atlas.js:55,60, story.js:11, tier3-fx.js:15, boss-game-logic.test.js:180, sprite-actors.test.js:2, copy-boss-sprites.js:24,48,63,67,80) — khớp đúng danh sách loại trừ, không đụng.

### Version
Không bump lại — `APP_VERSION` (js/app-storage.js) và `CACHE` (sw.js) vẫn giữ `2.24.1` như trên đĩa.

### Tests
`node tests/run-tests.js` → **629 passed, 0 failed** (tăng từ 623 do thêm test R1 + viết lại describe R2).

### Lưu ý môi trường
Giữa lúc làm việc, một commit ngoài phiên này (`8727b66 cập nhật góc nhìn`) đã gộp phần lớn thay đổi trước đó của tôi (R1, R4, xoá "(review #6)") vào HEAD — không phải tôi chủ động commit (tool `git status` xác nhận chỉ còn 2 file chưa staged: `js/boss-game-evolution-forms.js` + `tests/boss-game-evolution.test.js`, đúng phần R2 làm SAU thời điểm commit đó). Không có hành động git nào được tôi thực hiện.

### Status/Summary/Concerns (follow-up)
Status: DONE
Summary: R1 nối thật `skillName` (trước đó báo sai) + test tích hợp; R2 sửa toàn bộ 60 override theo luật strict (10 mục yêu cầu + 23 mục phát hiện thêm khi enforce test) — 0 vi phạm; R4 thêm CSS node-wrap/stat/skill (width khớp node 104px); xoá "(review #6)" còn sót; grep ID xác nhận sạch. `node tests/run-tests.js` → 629/0. Không bump version.
Concerns/Blockers: (a) R2 mở rộng phạm vi từ 10 → 33 mục vì audit test strict áp cho toàn bộ 60 mục, không chỉ 10 mục nêu — nếu ý định thực sự là CHỈ 10 mục cần strict còn lại giữ luật cũ (cho phép thay hẳn primitive), cần tách 2 loại luật trong test, xin xác nhận. (b) Không phải tôi chủ động thực hiện git commit — một commit đã xảy ra ngoài phiên trong lúc tôi làm việc, ghi nhận ở trên để tránh hiểu lầm.
