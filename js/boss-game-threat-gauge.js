/* Game Pháp Sư Lexoria — thanh tấn công (threat) của trùm, thuần: đầy theo giờ, gõ xong từ giảm, gõ sai/bỏ tăng,
   đầy → quái đánh. Thay đồng hồ đếm ngược cũ (st.clock/clockMax) — xem boss-game-logic.js:stepBattle.
   Nạp TRƯỚC boss-game-logic.js (dùng trong createBattle/typeKey/giveUp/useUltimate/stepBattle).
   Cần js/boss-game-spell-math.js (BOSS_TUNING) nạp trước. */

/* Tốc độ đầy/giây ở timeScale = 1 (giây/đầy = threatSec, đặt lúc tạo trận = clock[độ khó] + mods.clockAdd) */
function bossThreatRate(st) { return 1 / st.threatSec; }

/* dt (giây) đã nhân timeScale sẵn (giống cách stepBattle từng trừ st.clock) → thanh đầy chậm khi chậm thời gian */
function bossThreatFill(st, dt) { st.threat += dt * bossThreatRate(st); }

/* Cộng dồn khi gõ sai / bỏ / hỏng phép; không kẹp trần ở đây — đầy ≥ 1 do stepBattle phát hiện ở bước kế */
function bossThreatAdd(st, amt) { st.threat = Math.max(0, st.threat + amt); }

/* Niệm đúng: giảm theo tốc độ gõ (speed 1..2), kẹp ≥ 0. Áp lúc niệm xong (castComplete), không đợi phép chạm. */
function bossThreatDrainOnCast(st, speed) { st.threat = Math.max(0, st.threat - BOSS_TUNING.threatDrain * speed); }

/* Đầy → quái đánh: reset thanh, khiên chặn (ưu tiên) hoặc mất tim; trả về 'lost' khi hết tim, '' khi còn sống.
   Không tự emit event (bossEmit định nghĩa ở boss-game-logic.js, nạp SAU module này) — caller lo phần đó. */
function bossThreatAttack(st) {
  st.threat = 0;
  if (st.shield > 0) { st.shield--; return ''; }
  st.hearts--;
  return st.hearts <= 0 ? 'lost' : '';
}

if (typeof module !== 'undefined') module.exports = {
  bossThreatRate, bossThreatFill, bossThreatAdd, bossThreatDrainOnCast, bossThreatAttack
};
