#!/usr/bin/env node
/* Tạo bảng + nạp bộ từ (words.json, audio/index.json) + tạo tài khoản chủ.
   Dùng:  ADMIN_USERNAME=... ADMIN_PASSWORD=... node tools/seed-database.js [cờ]   (xem USAGE trong server/seed-cli-args.js)
   Server đã tự seed bộ từ khi nội dung đổi → script chủ yếu để tạo tài khoản chủ.
   --reset xoá toàn bộ bảng; khi đã có tài khoản còn phải thêm --drop-users. Dừng app + pg_dump trước khi reset. */
const path = require('path');
const { Pool } = require('pg');
const { withTransaction, readSchema, sslOption } = require('../server/database.js');
const { seedDeck, loadDeckFiles, SEED_LOCK_ID } = require('../server/deck-seeder.js');
const { upsertOwner } = require('../server/owner-account.js');
const { parseArgs } = require('../server/seed-cli-args.js');
const { hashPassword } = require('../server/password-hashing-and-session-tokens.js');

// toàn bộ bước trong 1 transaction (client đã BEGIN). Trả các dòng tóm tắt để in.
async function runSeedSteps(client, { args, schemaSql, files, passHash }) {
  const out = [];
  await client.query('SELECT pg_advisory_xact_lock($1)', [SEED_LOCK_ID]);   // trước mọi DROP/ghi → không deadlock với server
  if (args.reset) {
    const count = async table => (await client.query("SELECT to_regclass('public." + table + "') AS t")).rows[0].t
      ? +(await client.query('SELECT count(*)::int AS n FROM ' + table)).rows[0].n : 0;
    const users = await count('users');
    if (users > 0 && !args.dropUsers) {
      throw new Error('Đã có ' + users + ' tài khoản — dừng reset. Thêm --drop-users nếu thật sự muốn xoá (hãy pg_dump trước).');
    }
    const lost = users + ' tài khoản, ' + await count('progress') + ' tiến độ, ' + await count('words') + ' từ';
    await client.query('DROP TABLE IF EXISTS sessions, progress, users, words, audio_clips, deck_meta CASCADE');
    out.push('reset: đã xoá mọi bảng (' + lost + ')');
  }
  await client.query(schemaSql);
  out.push('schema ok');
  if (!args.skipDeck) {
    const s = await seedDeck(client, Object.assign({ allowShrink: args.allowShrink }, files));
    out.push('words ' + s.words + ' · audio ' + s.audio + ' (+' + s.added + ' ~' + s.updated + ' -' + s.deleted + ')');
  }
  if (args.admin) {
    const r = await upsertOwner(client, { username: args.admin.username, passHash, resetPassword: args.resetOwnerPassword });
    out.push('owner ' + args.admin.username + ' ' + r.status + (r.revoked != null ? ', thu hồi ' + r.revoked + ' phiên' : ''));
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2), process.env);
  if (!process.env.DATABASE_URL) throw new Error('Chưa đặt DATABASE_URL.');
  const ssl = process.env.PGSSL === 'true';
  if (ssl && !process.env.PGSSLROOTCERT) console.warn('Cảnh báo: PGSSL=true nhưng thiếu PGSSLROOTCERT → TLS không xác thực chứng chỉ.');
  const passHash = args.admin ? await hashPassword(args.admin.password) : null;   // băm trước BEGIN
  const files = args.skipDeck ? null : loadDeckFiles(path.join(__dirname, '..'));
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: sslOption(ssl, process.env.PGSSLROOTCERT), max: 1 });
  try {
    const lines = await withTransaction(pool, c => runSeedSteps(c, { args, schemaSql: readSchema(), files, passHash }));
    lines.forEach(l => console.log(l));
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main().catch(e => { console.error('Lỗi: ' + e.message); process.exit(1); });   // không in URL / mật khẩu
}

module.exports = { runSeedSteps };
