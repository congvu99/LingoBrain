/* GET /api/dialogue (không auth) → {enabled}. POST /api/dialogue (auth) → hội thoại nhập vai Gemini của user cho 1 ngày.
   Contract: plans/261006-1015-gemini-daily-roleplay-dialogue/phase-01-*.md. Không log nội dung / prompt.
   Hạn mức: perUserMax lần tạo THÀNH CÔNG / user / 24h trượt qua mọi `day` (tính từ DB, bền qua restart) + lần thử
   (thành công hay lỗi) giới hạn trong RAM theo user/IP + trần toàn server dailyMax (DB). Giả định 1 process.
   createDialogueRoutes({ pool, getProvider, perUserMax, dailyMax, budgetMs, now, log })
     → { enabled(), status(), create(req, userId, ip), limiters } */
const { createRateLimiter, createSemaphore, withDeadline, readJsonBody } = require('./request-guards.js');
const { pickScenario, validateDialogue } = require('./dialogue-content-validator.js');

const BODY_MAX = 4096, IDS_IN_MAX = 50, WORDS_MAX = 8;
const RETRY_MIN_MS = 8000;   // còn ít hơn thì không gọi lại khi JSON hỏng
const DAY_MS = 86400000;

function errRes(status, error, extra) { return [status, { error }, Object.assign({ 'Cache-Control': 'no-store' }, extra)]; }
function codeError(code, message) { const e = new Error(message || code); e.code = code; return e; }

// 'YYYY-MM-DD' hợp lệ và cách ngày UTC hiện tại của server ≤ 1 ngày (người dùng ở múi giờ khác)
function dayOk(day, nowMs) {
  if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const d = Date.parse(day + 'T00:00:00Z');
  if (!Number.isFinite(d) || new Date(d).toISOString().slice(0, 10) !== day) return false;
  const today = Date.parse(new Date(nowMs).toISOString().slice(0, 10) + 'T00:00:00Z');
  return Math.abs(d - today) <= DAY_MS;
}

function cleanIds(ids) {
  if (!Array.isArray(ids) || ids.length > IDS_IN_MAX) return null;
  return [...new Set(ids.filter(id => typeof id === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(id)))];
}

function createDialogueRoutes({ pool, getProvider, perUserMax = 3, dailyMax = 50, budgetMs = 25000, now = Date.now, log = console.log }) {
  const attempts = createRateLimiter({ limit: perUserMax * 2, windowMs: DAY_MS, maxKeys: 10000 });   // lần thử / user / 24h
  const ipMinute = createRateLimiter({ limit: 5, windowMs: 60000, maxKeys: 10000 });
  const ipDay = createRateLimiter({ limit: 30, windowMs: DAY_MS, maxKeys: 10000 });
  const sem = createSemaphore(2, 10);
  // userId → { day, p: Promise<{data, genCount}> } — cả pipeline, 1 lần ghi DB. Khoá theo USER (không theo ngày):
  // request song song cho hôm qua/hôm nay/ngày mai không được cùng lọt qua bước kiểm tra hạn mức 24h
  const inflight = new Map();

  function provider() { try { return getProvider ? getProvider() : null; } catch (e) { return null; } }
  const enabled = () => !!provider();
  const status = () => [200, { enabled: enabled() }];
  const ok = (day, data, genCount) => [200, { day, genCount, genMax: perUserMax, dialogue: data }];

  async function loadWords(ids) {
    const r = await pool.query('SELECT id, word, pos, meaning FROM words WHERE id = ANY($1::text[])', [ids]);
    const byId = new Map(r.rows.map(w => [w.id, w]));
    return ids.map(id => byId.get(id)).filter(Boolean).slice(0, WORDS_MAX);
  }

  // toàn bộ việc tạo chạy 1 lần cho mọi request cùng userId|day; kết quả vẫn ghi DB khi client đã bỏ đi
  // (lần mở sau = cache hit) — cố ý
  async function generate({ req, userId, day, ids, prevCount, t0, gen }) {
    const deadline = t0 + budgetMs;
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), Math.max(0, deadline - now()));
    try {
      const words = await loadWords(ids);
      if (!words.length) throw codeError('NOWORDS');
      const scenario = pickScenario(day, prevCount);
      const job = sem.run(async () => {
        // tới lượt mà đã quá hạn hoặc client đã ngắt → không gọi Gemini cho kết quả sẽ vứt đi
        if (now() >= deadline) throw codeError('BUSY', 'queue timeout');
        // chỉ xét socket: req (POST) đã đọc hết body thì stream tự destroyed dù client vẫn đang chờ
        if (req.socket && req.socket.destroyed) throw codeError('BUSY', 'client đã ngắt trước khi tới lượt');
        let calls = 0, v = null;
        for (let attempt = 0; attempt < 2; attempt++) {
          if (attempt && deadline - now() < RETRY_MIN_MS) break;
          calls++;
          try { v = validateDialogue(await gen.generate({ scenario, words, signal: ac.signal }), words); }
          catch (e) { if (e.code !== 'INVALID') throw e; v = { ok: false, reason: 'json' }; }
          if (v.ok) break;
        }
        if (!v || !v.ok) throw codeError('INVALID', 'dialogue không hợp lệ: ' + (v && v.reason));
        return { v, calls };
      });
      const { v, calls } = await withDeadline(job, Math.max(0, deadline - now()));
      const r = await pool.query(
        `INSERT INTO dialogues (user_id, day, data, gen_count) VALUES ($1, $2::date, $3, 1)
         ON CONFLICT (user_id, day) DO UPDATE SET data = EXCLUDED.data, gen_count = dialogues.gen_count + 1, updated_at = now()
           WHERE dialogues.gen_count < $4
         RETURNING gen_count`, [userId, day, v.dialogue, perUserMax]);
      if (!r.rows.length) throw codeError('LIMIT');
      pool.query(`DELETE FROM dialogues WHERE user_id = $1 AND day < current_date - 30`, [userId])
        .catch(e => log('dialogue dọn lỗi: ' + e.message));
      log('dialogue ok user=' + userId + ' ms=' + (now() - t0) + ' coverage=' + v.coverage.toFixed(2) + ' gen=' + r.rows[0].gen_count + ' calls=' + calls);
      return { data: v.dialogue, genCount: r.rows[0].gen_count };
    } finally {
      clearTimeout(timer);
      ac.abort();   // hết việc hoặc quá hạn → huỷ lời gọi Gemini còn treo (no-op nếu đã xong)
    }
  }

  async function create(req, userId, ip) {
    const t0 = now();
    const gen = provider();
    if (!gen) return errRes(501, 'Hội thoại AI đang tắt');
    const body = await readJsonBody(req, BODY_MAX);
    if (!dayOk(body.day, t0)) return errRes(400, 'Ngày không hợp lệ');
    const ids = cleanIds(body.ids);
    if (!ids || !ids.length) return errRes(400, 'Chưa có từ nào hôm nay');
    if (body.regenerate !== undefined && typeof body.regenerate !== 'boolean') return errRes(400, 'Yêu cầu không hợp lệ');
    const day = body.day;

    const cur = await pool.query('SELECT data, gen_count FROM dialogues WHERE user_id = $1 AND day = $2::date', [userId, day]);
    const row = cur.rows[0];
    if (row && !body.regenerate) return ok(day, row.data, row.gen_count);
    const busy = inflight.get(userId);
    if (busy && busy.day !== day) return errRes(429, 'Đang tạo một hội thoại khác, đợi chút rồi thử lại', { 'Retry-After': '30' });
    // dòng ngày này đã chạm trần (cập nhật >24h trước nên không còn trong tổng 24h) → khỏi gọi Gemini rồi mới bị UPSERT chặn
    if (!busy && row && row.gen_count >= perUserMax) return errRes(429, 'Đã dùng hết ' + perUserMax + ' lần tạo hội thoại trong ngày này', { 'Retry-After': '3600' });

    // chỉ request mở lượt tạo mới bị tính giới hạn; kiểm tra hết rồi mới hit (request bị từ chối không ăn hạn mức).
    // inflight phải set NGAY (trước mọi await) — nếu không request thứ 2 lọt qua lúc request 1 đang chờ query hạn mức
    let p = busy && busy.p;
    if (!p) {
      if (!attempts.check(String(userId), t0) || !ipMinute.check(ip, t0) || !ipDay.check(ip, t0)) {
        return errRes(429, 'Thử tạo quá nhiều lần, đợi một lúc rồi thử lại', { 'Retry-After': '60' });
      }
      attempts.hit(String(userId), t0); ipMinute.hit(ip, t0); ipDay.hit(ip, t0);
      p = (async () => {
        const u = await pool.query(
          `SELECT (SELECT coalesce(sum(gen_count), 0) FROM dialogues WHERE user_id = $1 AND updated_at > now() - interval '24 hours')::int AS mine,
                  (SELECT coalesce(sum(gen_count), 0) FROM dialogues WHERE updated_at > now() - interval '24 hours')::int AS total`, [userId]);
        if (u.rows[0].mine >= perUserMax) throw codeError('LIMIT');
        if (u.rows[0].total >= dailyMax) throw codeError('SERVER_LIMIT');
        return generate({ req, userId, day, ids, prevCount: row ? row.gen_count : 0, t0, gen });
      })().finally(() => inflight.delete(userId));
      inflight.set(userId, { day, p });
    }
    try {
      const r = await p;
      return ok(day, r.data, r.genCount);
    } catch (e) {
      if (e.code === 'SERVER_LIMIT') return errRes(429, 'Máy chủ đã đạt giới hạn hội thoại hôm nay, thử lại sau', { 'Retry-After': '3600' });
      if (e.code === 'NOWORDS') return errRes(400, 'Chưa có từ nào hôm nay');
      if (e.code === 'LIMIT') return errRes(429, 'Đã dùng hết ' + perUserMax + ' lần tạo hội thoại trong 24 giờ', { 'Retry-After': '3600' });
      if (e.code === 'BUSY') { log('dialogue fail code=BUSY ms=' + (now() - t0)); return errRes(503, 'Máy chủ đang bận, thử lại sau', { 'Retry-After': '10' }); }
      if (e.code === 'UPSTREAM' || e.code === 'INVALID') { log('dialogue fail code=' + e.code + ' ms=' + (now() - t0) + ' ' + e.message); return errRes(503, 'Không tạo được hội thoại, thử lại sau'); }
      throw e;   // lỗi DB → handleApi (503 khi mất kết nối)
    }
  }

  return { enabled, status, create, limiters: [attempts, ipMinute, ipDay] };
}

module.exports = { createDialogueRoutes, dayOk, cleanIds };
