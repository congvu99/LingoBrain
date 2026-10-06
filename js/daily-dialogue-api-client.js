/* Hội thoại nhập vai — phần mạng + bộ nhớ trên máy:
   - hỏi server bật/tắt (GET /api/dialogue, nhớ 10 phút; lỗi / 404 / 405 / 501 → coi như tắt)
   - tạo hội thoại (POST /api/dialogue, Bearer token, tự huỷ sau 35s — trên ngân sách 25s của server)
   - lưu bản hôm nay ở eng.dialogue.v1: KHÔNG đồng bộ, gắn username (máy dùng chung không lộ bài người khác).
   Contract: plans/261006-1015-gemini-daily-roleplay-dialogue/phase-01-*.md */

const K_DIALOGUE = 'eng.dialogue.v1';
const DIALOGUE_TIMEOUT_MS = 35000, DIALOGUE_PROBE_TTL_MS = 10 * 60 * 1000;
let dialogueProbe = { at: 0, on: false, pending: null };

// đọc đồng bộ cho lúc vẽ nút (kết quả lần hỏi gần nhất)
function dialogueEnabledCached() { return dialogueProbe.on; }
function markDialogueOff() { dialogueProbe = { at: Date.now(), on: false, pending: null }; }

// hỏi server khi kết quả cũ hết hạn; đổi trạng thái thì vẽ lại tab để hiện/ẩn nút
function probeDialogue() {
  if (dialogueProbe.pending) return dialogueProbe.pending;
  if (dialogueProbe.at && Date.now() - dialogueProbe.at < DIALOGUE_PROBE_TTL_MS) return Promise.resolve(dialogueProbe.on);
  const before = dialogueProbe.on;
  const p = fetch('/api/dialogue', { cache: 'no-store' })
    .then(r => (r.ok ? r.json() : null))
    .then(b => !!(b && b.enabled === true), () => false)
    .then(on => {
      dialogueProbe = { at: Date.now(), on, pending: null };
      if (on !== before && typeof refreshTab === 'function') refreshTab();
      return on;
    });
  dialogueProbe.pending = p;
  return p;
}

function dialogueUser() { const a = typeof authInfo === 'function' ? authInfo() : null; return a ? a.username : null; }

// bản lưu còn dùng được: đúng user, cấu trúc hợp lệ; đã xong + khác ngày → bỏ (đang dở thì giữ qua nửa đêm)
function dialogueCache() {
  const c = load(K_DIALOGUE, null);
  if (!c || typeof c !== 'object' || !c.dialogue || !Array.isArray(c.dialogue.turns) || !c.dialogue.turns.length) return null;
  if (!c.user || c.user !== dialogueUser()) return null;
  if (c.done && c.day !== dkey()) return null;
  return c;
}
function saveDialogueCache(c) { save(K_DIALOGUE, c, { stamp: false }); }

// → { ok: true, body } | { ok: false, status, error, off }
//   status 0 = mạng lỗi / quá hạn / bị huỷ (aborted: true khi người dùng đóng màn)
function requestDialogue({ ids, regenerate, signal }) {
  const a = typeof authInfo === 'function' ? authInfo() : null;
  if (!a) return Promise.resolve({ ok: false, status: 401, error: 'Đăng nhập ở tab Tôi để dùng hội thoại AI' });
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), DIALOGUE_TIMEOUT_MS);
  if (signal) signal.addEventListener('abort', () => ac.abort());
  return fetch('/api/dialogue', {
    method: 'POST', signal: ac.signal, cache: 'no-store',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + a.token },
    body: JSON.stringify({ day: dkey(), ids, regenerate: !!regenerate })
  }).then(r => r.json().catch(() => ({})).then(body => {
    if (r.ok && body && body.dialogue && Array.isArray(body.dialogue.turns)) return { ok: true, body };
    const off = r.status === 404 || r.status === 405 || r.status === 501;
    if (off) markDialogueOff();
    const error = off ? 'Hội thoại AI đang tắt'
      : r.status === 401 ? 'Phiên đăng nhập hết hạn — đăng nhập lại ở tab Tôi'
      : (body && typeof body.error === 'string' && body.error) || 'Không tạo được hội thoại, thử lại sau';
    return { ok: false, status: r.status, error, off };
  }), () => ({ ok: false, status: 0, aborted: !!(signal && signal.aborted),
    error: ac.signal.aborted ? 'Máy chủ phản hồi quá lâu, thử lại sau' : 'Không kết nối được máy chủ, thử lại sau' }))
    .finally(() => clearTimeout(timer));
}
