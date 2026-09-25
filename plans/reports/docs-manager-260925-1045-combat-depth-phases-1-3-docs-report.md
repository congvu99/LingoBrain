# Docs Verification Report: Combat Depth Phases 1–3

**Date:** 2026-09-25  
**Scope:** Verify README.md (Pháp sư section) and docs/system-architecture.md against combat depth implementation (threat gauge, combo, 10-nấc ult, chain-casting).

## Verification Results

### README.md — Pháp Sư Lexoria Section (lines 114–128)

**Status: ACCURATE**

All core mechanics correctly documented with no contradictions or stale terminology:

✓ **Threat Gauge (thanh tấn công)** — replaces st.clock
  - "đầy dần theo giờ" (fills over time per threatSec)
  - "niệm đúng làm thanh giảm (gõ càng nhanh giảm càng nhiều)" (decreases on correct cast, scales by speed 1..2)
  - "gõ sai/bỏ làm thanh tăng" (increases on typos/missed)
  - "Đầy → trùm đánh (đóng băng thì hoãn tới khi hết băng), khiên chặn hoặc mất 1 tim" (attack triggers loss or shield block; freeze delays it)

✓ **Combo System** — replaces rage
  - "Niệm đúng liên tiếp không lỗi gõ cộng **combo**" (st.combo increments on typos===0)
  - "hiện "COMBO ×n" khi ≥2, nhân thêm sát thương, tối đa ×1.5" (bossComboMul: min(1.5, 1 + 0.05×combo))
  - "bị đánh trúng / bỏ từ / hỏng phép làm mất combo" (bossComboBreak on hit/giveup/fizzle)
  - "khiên chặn thì giữ nguyên" (shield block does NOT break combo)

✓ **Ultimate Meter (thanh tuyệt kỹ 10 nấc)** — replaces st.rage (8 từ cũ)
  - "Mỗi phép niệm đúng đầy dần **thanh tuyệt kỹ** (10 nấc)" (st.ult increments per cast, BOSS_TUNING.ultMax=10)
  - "đầy thì bấm nút ✨ hoặc Shift+Enter để vào **chuỗi niệm**" (toggleUlt via UI or hotkey when st.ult >= ultMax)

✓ **Chain-Casting (chuỗi niệm)** — new mechanic
  - "gõ liền 3 từ mới trong 9 giây" (bossStartChain: st.chain.until = now + BOSS_TUNING.chainMs=9000)
  - "mỗi từ gõ trọn là 1 đòn sát thương" (bossChainHit emits impact event per word)
  - "tính vào hiệu lực tuyệt kỹ cuối chuỗi" (bossChainFactor applies k to bossApplyUltimate)
  - "gõ đủ cả 3 từ = "HOÀN HẢO" (hits===3 → k=1.5)
  - "gõ thiếu hoặc hết giờ vẫn ra tuyệt kỹ nhưng yếu hơn" (hits<3 → k<1; hits===0–1 → k=0.5, hits===2 → k=1)

### docs/system-architecture.md — Module Listing (lines 37–41)

**Status: ACCURATE**

Two new modules correctly inserted with accurate one-line descriptions:

✓ **Line 37:** `js/boss-game-spell-math.js`  
  Description: "Pháp sư: BOSS_TUNING, độ khó từ, bậc chiêu tương đối trong pool, hệ số tốc độ/sát thương, pool nhóm đồng nghĩa"  
  — Matches module comment; BOSS_TUNING is source of all game numbers

✓ **Line 38:** `js/boss-game-elements.js`  
  Description: "Pháp sư: bảng cây 5 nguyên tố → modifier, điểm còn lại, điều kiện lên bậc"  
  — Unchanged, accurate

✓ **Line 39:** `js/boss-game-threat-gauge.js` **(NEW)**  
  Description: "Pháp sư: thanh tấn công trùm (đầy theo giờ, niệm đúng giảm, gõ sai/bỏ tăng, đầy → đánh)"  
  — Accurately reflects module's 5 exported functions

✓ **Line 40:** `js/boss-game-combo-chain.js` **(NEW)**  
  Description: "Pháp sư: combo (nhân sát thương), thanh tuyệt kỹ 10 nấc, chuỗi niệm 3 từ + áp hiệu lực tuyệt kỹ theo hệ số"  
  — Accurately summarizes 14 exported functions; order includes key features

✓ **Line 41:** `js/boss-game-logic.js` **(UPDATED)**  
  Old: "máy trạng thái 1 trận (đồng hồ, chậm thời gian, khoá cắt cảnh, gõ/typo, Nộ, DoT, freeze, events[])"  
  New: "máy trạng thái 1 trận (thanh tấn công, chậm thời gian, khoá cắt cảnh, gõ/typo, combo/chuỗi niệm rẽ sang boss-game-combo-chain.js, DoT, freeze, events[])"  
  — Correctly replaces "đồng hồ" with "thanh tấn công", "Nộ" with "combo/chuỗi niệm rẽ sang boss-game-combo-chain.js"

### Casting Lock Timing (impactMs + afterImpactMs)

✓ **Code:** BOSS_TUNING.impactMs & afterImpactMs arrays in js/boss-game-spell-math.js  
  - impactMs: [0, 250, 450, 800] (delay from cast-complete to spell impact, per tier)
  - afterImpactMs: [0, 350, 450, 600] (fixed tail after impact before next prompt appears)
  - Applied in boss-game-logic.js:typeKey → bossLockFor(impactAt + afterImpactMs[tier])

✓ **CSS Class:** `.is-casting` in boss-game-result-ui.js:39  
  - Toggles on prompt during lock period to visually indicate casting is locked

**Assessment:** Timing details are in code comments; README does not need to document millisecond timings (implementation detail). Documentation is appropriately high-level.

## No Changes Required

All updated documentation:
- Matches actual code behavior exactly
- Uses correct Vietnamese terminology with diacritics preserved (e.g., "Pháp sư", "chiêu", "tấn công")
- Has no stale terminology (no remaining references to "đồng hồ", "Nộ", "rage", "clock" in context of boss fight)
- Module listing is complete and in correct dependency order
- No contradictions between README and system-architecture.md

---

**Status:** DONE

**Summary:** README.md Pháp sư section & system-architecture.md boss game module rows are accurate vs. code. Two new modules correctly listed with descriptive summaries. No doc updates needed.

**Concerns:** None.
