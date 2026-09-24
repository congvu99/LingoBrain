/* Khoá localStorage, helper chung, trạng thái toàn cục của app.
   Nạp sau js/srs-scheduler.js (cần migrateV1) và js/boss-progress-sync-merge.js (cần cleanBoss). */

const APP_VERSION = '2.14.0';
const K_DECK = 'eng.deck.v1', K_SRS = 'eng.srs.v2', K_SRS_V1 = 'eng.srs.v1',
      K_CFG = 'eng.cfg.v1', K_PLAN = 'eng.plan.v1', K_DAY = 'eng.day.v1',
      K_GAMEMISS = 'eng.gamemiss.v1', K_GAMESCORE = 'eng.gamescore.v1', K_BOSS = 'eng.boss.v1';

function load(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
// opts.stamp === false: lưu kỹ thuật, không đóng dấu sửa cho đồng bộ (xem js/cloud-sync-engine.js onLocalSave)
function save(k, v, opts) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { toast('⚠️ Không lưu được (bộ nhớ đầy?)'); return; }
  if (typeof onLocalSave === 'function') onLocalSave(k, opts);
}
function today() { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); }
function dkey(t) { const d = new Date(t == null ? Date.now() : t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const $ = s => document.querySelector(s);
const rx = s => new RegExp(String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

let toastT;
function toast(m, action) {
  clearTimeout(toastT);
  let el = document.querySelector('.toast');
  if (!el) { el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); document.body.appendChild(el); }
  el.textContent = m;
  if (action) { const b = document.createElement('button'); b.textContent = action.label; b.onclick = action.fn; el.appendChild(b); }
  toastT = setTimeout(() => el.remove(), action ? 8000 : 2200);
}

/* ---- trạng thái toàn cục ---- */
const cfg = load(K_CFG, { newPerDay: 5, maxSession: 40 });
// bộ từ chỉ lấy từ words.json (app-shell init tải mỗi lần mở), không lưu localStorage.
// K_DECK chỉ còn để xoá bản cache cũ của các phiên bản trước.
let deck = { deck: 'Bộ từ của tôi', words: [] };
let plan = null, day = null;                 // daily-plan.js khởi tạo
let gameMiss = load(K_GAMEMISS, []);      // id từ trả lời sai trong game → lên đầu phiên ôn kế
let gameScore = load(K_GAMESCORE, {});    // kỷ lục mỗi game
// tiến trình Pháp sư. Đồng bộ có thể THAY object → mọi chỗ ghi phải đọc global bossProg ngay lúc ghi, không giữ tham chiếu
let bossProg = cleanBoss(load(K_BOSS, null), Date.now());
function saveBoss() { save(K_BOSS, bossProg); }
// từ sai đã vào hàng đợi phiên này rồi thì không cần giữ trong localStorage nữa
function consumeGameMiss() { if (gameMiss.length) { gameMiss = []; save(K_GAMEMISS, gameMiss); } }
let queue = [], cur = null, step = 1, mode = 'type', revealed = false, tab = 'plan';
let session = { streak: {} };                 // learning steps trong phiên (không lưu)

// tiến độ học: v2; nếu chưa có thì chuyển từ v1 (giữ nguyên v1 làm dự phòng)
let srs = load(K_SRS, null);
if (!srs) { srs = migrateV1(load(K_SRS_V1, {})); save(K_SRS, srs); }
function rec(id) { return srs[id] || blankRec(); }   // chỉ đọc
