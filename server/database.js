/* Kết nối PostgreSQL + tạo bảng. Không bao giờ làm chết process: lỗi pool/client chỉ log,
   tạo schema thử lại nền (2s → 30s) — trong lúc chưa xong API trả 503, web tĩnh vẫn chạy. */
const fs = require('fs');
const { Pool } = require('pg');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id serial PRIMARY KEY, username text UNIQUE NOT NULL, pass_hash text NOT NULL, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS sessions (
  token_hash text PRIMARY KEY, user_id int NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(), last_used_at timestamptz DEFAULT now());
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
CREATE TABLE IF NOT EXISTS progress (
  user_id int PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, data jsonb NOT NULL, updated_at timestamptz DEFAULT now());
`;

// TLS tới DB: PGSSL=true bật mã hoá; có PGSSLROOTCERT (file CA) thì xác thực chứng chỉ, không thì chỉ mã hoá
function sslOption(ssl, caFile) {
  if (!ssl) return false;
  return caFile ? { ca: fs.readFileSync(caFile, 'utf8'), rejectUnauthorized: true } : { rejectUnauthorized: false };
}

function createDatabase(url, { ssl, caFile, log }) {
  const pool = new Pool({ connectionString: url, ssl: sslOption(ssl, caFile), max: 5, connectionTimeoutMillis: 10000 });
  // client rảnh bị ngắt (DB khởi động lại/bảo trì) → pg phát 'error'; không bắt thì Node thoát
  pool.on('error', e => log('pg pool error: ' + e.message));
  const db = { pool, ready: false };
  db.start = async function start() {
    let wait = 2000;
    for (;;) {
      try { await pool.query(SCHEMA); db.ready = true; log('schema ready'); return; }
      catch (e) { log('schema chưa tạo được (' + e.message + '), thử lại sau ' + wait / 1000 + 's'); }
      await new Promise(r => setTimeout(r, wait));
      wait = Math.min(wait * 2, 30000);
    }
  };
  return db;
}

// chạy fn(client) trong 1 transaction; lỗi → ROLLBACK rồi ném tiếp.
// Client đang mượn không còn listener 'error' của pool → tự gắn, nếu không DB rớt giữa transaction sẽ làm chết process.
async function withTransaction(pool, fn) {
  const client = await pool.connect();
  let broken = null;
  const onError = e => { broken = e; };
  client.on('error', onError);
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch (re) { broken = broken || re; }
    throw e;
  } finally {
    client.removeListener('error', onError);
    client.release(broken || undefined);   // kết nối hỏng → huỷ, không trả lại pool
  }
}

// lỗi do DB không dùng được (mất kết nối, đang khởi động lại, timeout) → API trả 503 thay vì 500
const DOWN_CODES = ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EHOSTUNREACH', 'EPIPE', '57P01', '57P02', '57P03', '53300'];
function isDbUnavailable(e) {
  if (!e) return false;
  const code = String(e.code || '');
  return DOWN_CODES.indexOf(code) >= 0 || code.startsWith('08') ||
    /timeout exceeded when trying to connect|Connection terminated/i.test(e.message || '');
}

module.exports = { createDatabase, withTransaction, isDbUnavailable };
