---
phase: 3
title: "Combo and chain-cast ultimate"
status: completed
priority: P2
dependencies: [2]
---

# Phase 3: Combo and chain-cast ultimate

## Overview
Thêm combo (nhân sát thương) và thay nộ 8 từ bằng thanh tuyệt kỹ 10 nấc; kích hoạt → chế độ **chuỗi niệm** 3 từ, hiệu lực tuyệt kỹ theo số từ gõ trọn.

## Requirements
- `st.combo`: +1 mỗi cast đúng **không lỗi gõ** trong từ (`st.typos === 0`); từ có lỗi: giữ combo, không cộng. Reset 0 khi: bị quái đánh **trúng** (mất tim), `giveup`, `fizzle`. Khiên chặn → **không** reset. <!-- Updated: Validation Session 1 - khiên giữ combo -->
- Sát thương × `min(comboCap, 1 + comboStep × combo)`; `comboStep: 0.05, comboCap: 1.5`. Nhân trong `spellDamage` qua `o.combo`.
- Thanh tuyệt kỹ thay `rage`: `ultMax: 10`; +1 mỗi cast đúng, +1 nếu `typos === 0 && speed >= 1.5`; giveup −2 (giữ luật cũ). Đổi field `st.rage` → `st.ult` (không lưu, chỉ trong trận), cập nhật render/ui.
- Kích hoạt (nút `#bossUlt` / Shift+Enter như cũ) khi `ult >= ultMax` và có `mods.ultimate`:
  - `st.chain = { words: [3 group], i: 0, hits: 0, until: now + chainMs }`, `chainMs: 9000` (thời gian thật), thanh quái đứng, đồng hồ DoT đứng.
  - Mỗi từ trong chuỗi gõ đúng → event `chainHit` (1 đòn sát thương bậc cao nhất trong chuỗi, không tính tốc độ), sang từ kế. Gõ sai: typo không fizzle, không threat.
  - Hết giờ hoặc xong 3 từ → `chainEnd` với `hits`; hệ số: 0–1 → 0.5, 2 → 1, 3 → 1.5 ("HOÀN HẢO").
  - Áp tuyệt kỹ theo hệ số: meteor/chain: số phép cường hoá `round(3 × k)` (tối thiểu 1); iceAge: `BOSS_ICE_AGE_MS × k`; revive: hồi `ceil(thiếu × k)` tim (k=1.5 → đầy + 1 khiên); tornado: threat 0 + (k=1.5 → khiên +1).
  - Sau chuỗi: cắt cảnh `ultimateMs` như cũ rồi đề mới.
- Từ chuỗi lấy 3 group kế trong `st.groups` (xoay vòng như `bossNextPrompt`), không lặp đề đang hiện.
- HUD: "COMBO ×n" (ẩn khi < 2), 10 ô tuyệt kỹ; chế độ chuỗi: thanh thời gian 9s + 3 chấm tiến độ + chữ "HOÀN HẢO".

## Architecture
- Tách `js/boss-game-combo-chain.js` (thuần): `bossComboOnCast(st, speed)`, `bossComboBreak(st)`, `bossComboMul(st)`, `bossStartChain(st, now)`, `bossChainKey(st, ch, now)`, `bossStepChain(st, now)`, `bossChainFactor(hits)`, `bossApplyUltimate(st, id, k, now)`.
- `boss-game-logic.js`: `typeKey` rẽ sang `bossChainKey` khi `st.chain`; `stepBattle` gọi `bossStepChain` và bỏ fill threat khi chain; `useUltimate` → `bossStartChain`; xoá phần áp tuyệt kỹ cũ (chuyển sang module).
- `boss-game-spell-math.js`: `spellDamage` nhận `combo` mul.
- Render/UI: `boss-game-render.js` (HUD combo + ô ult + chuỗi), `boss-game-ui.js:138` nút ult theo `st.ult`, `boss-game-result-ui.js` xử lý `chainHit/chainEnd`, `boss-game-tier3-ultimate-fx.js` nhận `k` để phóng hiệu ứng.

## Related Code Files
- Create: `js/boss-game-combo-chain.js`, `tests/boss-game-combo-chain.test.js`
- Modify: `js/boss-game-logic.js`, `js/boss-game-spell-math.js`, `js/boss-game-elements.js` (hằng boost/ice age), `js/boss-game-render.js`, `js/boss-game-ui.js`, `js/boss-game-result-ui.js`, `js/boss-game-tier3-ultimate-fx.js`, `tests/boss-game-logic.test.js`, `tests/boss-game-spell-math.test.js`, `tests/run-tests.js`, `tests/run-tests.html`, `index.html`, `sw.js`, `js/app-storage.js`

## Implementation Steps
1. **Tests Before**: khoá hành vi tuyệt kỹ từng hệ hiện tại (meteor ×3 3 phép, chain ×2 hits, iceAge dừng thanh, revive đầy tim, tornado) — sẽ viết lại với k=1 (2 từ trúng) phải cho **đúng hiệu lực cũ**.
2. **Tests After (đỏ)**: combo tăng/giữ/reset đúng luật; mul trần 1.5; ult +1/+2; chuỗi: 3 từ đúng → k 1.5; 1 từ → 0.5; hết 9s → chainEnd; typo trong chuỗi không fizzle; threat/burn đứng trong chuỗi; pause trong chuỗi dời `until`; từ chuỗi không lặp đề hiện tại; giveup trong chuỗi bị bỏ qua.
3. Tạo module, sửa `spellDamage`, sửa logic trận; cập nhật `resumeBattle` dời `st.chain.until`.
4. HUD + UI chuỗi + FX theo k.
5. Mô phỏng số (test hoặc script scratchpad): thời gian hạ quái 1000/2000 HP ở tốc độ giả định với combo → ghi vào report; nếu < 60% cũ → đề xuất nâng `hp` (hỏi user).
6. Bump version; **Regression gate**.

## Success Criteria
- [x] Combo HUD, thanh 10 nấc, chuỗi niệm chạy đúng 3 mức hiệu lực.
- [x] Hiệu lực k=1 bằng tuyệt kỹ cũ (test).
- [x] Mọi test xanh; file ≤ 200 dòng.

## Risk Assessment
- `boss-game-logic.js` phình: toàn bộ luật combo/chuỗi ở module mới, logic chỉ rẽ nhánh.
- Chuỗi 9s gắt trên iPhone: số trong `BOSS_TUNING`, hỏi user sau phase.
- Sát thương combo làm trận quá ngắn: mô phỏng bước 5.
