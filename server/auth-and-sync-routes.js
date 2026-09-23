/* API tài khoản + đồng bộ: POST /api/register · /api/login · /api/logout, PUT /api/sync.
   Mọi phản hồi là JSON. Gộp dữ liệu dùng chung js/sync-merge.js với client. */
const path = require('path');
const { mergeSync, sanitizePayload } = require(path.join(__dirname, '..', 'js', 'sync-merge.js'));
const cred = require('./password-hashing-and-session-tokens.js');
const { clientIp, isJsonRequest, createRateLimiter, createSemaphore, readJsonBody } = require('./request-guards.js');
const { securityHeaders } = require('./static-file-server.js');
const { withTransaction, isDbUnavailable } = require('./database.js');

const AUTH_BODY_MAX = 10 * 1024, SYNC_BODY_MAX = 10 * 1024 * 1024;
const STORED_MAX = 8 * 1024 * 1024;   // dữ liệu một tài khoản sau gộp
const SESSION_DAYS = 180;

function httpError(status, error) { const e = new Error(error); e.status = status; e.body = { error }; return e; }

function createApi({ pool, isReady, trustHops, log }) {
  const apiIp = createRateLimiter({ limit: 120, windowMs: 60000, maxKeys: 10000 });         // mọi request /api/* (token rác cũng tốn 1 query)
  const perIp = createRateLimiter({ limit: 20, windowMs: 60000, maxKeys: 10000 });          // mọi request auth
  const registers = createRateLimiter({ limit: 5, windowMs: 3600000, maxKeys: 10000 });     // đăng ký thành công / IP / giờ
  const loginFails = createRateLimiter({ limit: 5, windowMs: 900000, maxKeys: 10000 });     // sai mật khẩu / username / 15 phút
  const syncs = createRateLimiter({ limit: 30, windowMs: 60000, maxKeys: 10000 });          // sync / user / phút
  const scryptSlots = createSemaphore(2, 20);                                               // scrypt tốn CPU + 16MB RAM
  setInterval(() => { const n = Date.now(); [apiIp, perIp, registers, loginFails, syncs].forEach(l => l.sweep(n)); }, 60000).unref();

  async function issueSession(db, userId) {
    const token = cred.newToken();
    await db.query('INSERT INTO sessions (token_hash, user_id) VALUES ($1, $2)', [cred.hashToken(token), userId]);
    return token;
  }
  // Bearer token → user_id; hết hạn trượt 180 ngày, gia hạn tối đa 1 lần/ngày
  async function authUser(req) {
    const m = /^Bearer ([A-Za-z0-9_-]{20,200})$/.exec(req.headers.authorization || '');
    if (!m) throw httpError(401, 'Chưa đăng nhập');
    const th = cred.hashToken(m[1]);
    const r = await pool.query(
      `SELECT user_id, last_used_at < now() - interval '1 day' AS stale FROM sessions
       WHERE token_hash = $1 AND last_used_at > now() - interval '${SESSION_DAYS} days'`, [th]);
    if (!r.rows.length) throw httpError(401, 'Phiên đăng nhập hết hạn');
    if (r.rows[0].stale) await pool.query('UPDATE sessions SET last_used_at = now() WHERE token_hash = $1', [th]);
    return { userId: r.rows[0].user_id, tokenHash: th };
  }
  const ipOf = req => clientIp(req.headers, req.socket.remoteAddress, trustHops);
  function guardAuthRate(req) {
    const ip = ipOf(req);
    if (!perIp.hit(ip, Date.now())) throw httpError(429, 'Thao tác quá nhanh, đợi 1 phút');
    return ip;
  }
  const hashing = fn => scryptSlots.run(fn).catch(e => { throw e.code === 'BUSY' ? httpError(503, 'Máy chủ đang bận, thử lại sau') : e; });

  async function register(req) {
    const ip = guardAuthRate(req);
    if (!registers.check(ip, Date.now())) throw httpError(429, 'Đăng ký quá nhiều, thử lại sau');
    const body = await readJsonBody(req, AUTH_BODY_MAX);
    const username = cred.validateUsername(body.username);
    if (!username || !cred.validatePassword(body.password)) throw httpError(400, 'Tên 3–20 ký tự (a-z, 0-9, _), mật khẩu 6–128 ký tự');
    const passHash = await hashing(() => cred.hashPassword(body.password));
    try {
      const token = await withTransaction(pool, async db => {
        const u = await db.query('INSERT INTO users (username, pass_hash) VALUES ($1, $2) RETURNING id', [username, passHash]);
        // tạo sẵn dòng progress → SELECT … FOR UPDATE ở /sync luôn có dòng để khoá
        await db.query(`INSERT INTO progress (user_id, data) VALUES ($1, '{"v":1}')`, [u.rows[0].id]);
        return issueSession(db, u.rows[0].id);
      });
      registers.hit(ip, Date.now());
      return [201, { token, username }];
    } catch (e) {
      if (e.code === '23505') throw httpError(409, 'Tên đã có người dùng');
      throw e;
    }
  }
  async function login(req) {
    guardAuthRate(req);
    const body = await readJsonBody(req, AUTH_BODY_MAX);
    const username = cred.validateUsername(body.username);
    const bad = httpError(401, 'Sai tài khoản hoặc mật khẩu');
    if (!username || typeof body.password !== 'string') throw bad;
    if (!loginFails.check(username, Date.now())) throw httpError(429, 'Sai quá nhiều lần, đợi 15 phút');
    const r = await pool.query('SELECT id, pass_hash FROM users WHERE username = $1', [username]);
    const user = r.rows[0];
    const ok = await hashing(() => user ? cred.verifyPassword(body.password, user.pass_hash) : cred.dummyVerify(body.password));
    if (!ok) { loginFails.hit(username, Date.now()); throw bad; }
    return [200, { token: await issueSession(pool, user.id), username }];
  }
  async function logout(req) {
    const { tokenHash } = await authUser(req);
    await pool.query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash]);
    return [204, null];
  }
  async function sync(req) {
    const { userId } = await authUser(req);
    if (!syncs.hit(String(userId), Date.now())) throw httpError(429, 'Đồng bộ quá dày, đợi 1 phút');
    const body = await readJsonBody(req, SYNC_BODY_MAX);
    const now = Date.now();
    return withTransaction(pool, async db => {
      await db.query(`INSERT INTO progress (user_id, data) VALUES ($1, '{"v":1}') ON CONFLICT (user_id) DO NOTHING`, [userId]);
      const r = await db.query('SELECT data FROM progress WHERE user_id = $1 FOR UPDATE', [userId]);
      const merged = mergeSync(sanitizePayload(r.rows[0].data, now), sanitizePayload(body.data, now), { histMax: 20 });
      if (JSON.stringify(merged).length > STORED_MAX) throw httpError(413, 'Dữ liệu quá lớn để đồng bộ');
      const u = await db.query('UPDATE progress SET data = $2, updated_at = now() WHERE user_id = $1 RETURNING updated_at', [userId, merged]);
      return [200, { data: merged, updatedAt: u.rows[0].updated_at }];
    });
  }

  const ROUTES = { 'POST /api/register': register, 'POST /api/login': login, 'POST /api/logout': logout, 'PUT /api/sync': sync };
  const PATHS = ['/api/register', '/api/login', '/api/logout', '/api/sync'];

  return async function handleApi(req, res, https) {
    const send = (status, body) => {
      if (res.headersSent) return;
      res.writeHead(status, Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, securityHeaders(https)));
      res.end(body == null ? '' : JSON.stringify(body));
    };
    const p = req.url.split('?')[0];
    try {
      if (!isReady()) return send(503, { error: 'Máy chủ chưa sẵn sàng, thử lại sau' });
      if (!apiIp.hit(ipOf(req), Date.now())) return send(429, { error: 'Quá nhiều yêu cầu, đợi 1 phút' });
      const fn = ROUTES[req.method + ' ' + p];
      if (!fn) return PATHS.indexOf(p) >= 0 ? send(405, { error: 'Sai phương thức' }) : send(404, { error: 'Không có API này' });
      if (p !== '/api/logout' && !isJsonRequest(req.headers)) return send(415, { error: 'Cần Content-Type: application/json' });
      const [status, body] = await fn(req);
      send(status, body);
    } catch (e) {
      if (e.status) return send(e.status, e.body || { error: e.status === 413 ? 'Dữ liệu quá lớn' : 'Yêu cầu không hợp lệ' });
      if (isDbUnavailable(e)) { log('db unavailable ' + p + ': ' + e.message); return send(503, { error: 'Máy chủ tạm thời không kết nối được dữ liệu, thử lại sau' }); }
      log('api error ' + p + ': ' + (e && e.message));   // không log body / mật khẩu / token
      send(500, { error: 'Lỗi máy chủ' });
    }
  };
}

module.exports = { createApi };
