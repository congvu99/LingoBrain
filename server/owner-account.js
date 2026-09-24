/* Tạo tài khoản chủ từ CLI. Không bao giờ âm thầm chiếm tài khoản trùng tên: tên đã tồn tại → dừng,
   trừ khi có --reset-owner-password (khi đó đổi mật khẩu + thu hồi mọi phiên cũ, giữ tiến độ).
   passHash đã băm sẵn ngoài transaction (scrypt tốn CPU, không giữ khoá DB). Test: tests/seed-database-cli.test.js */
async function upsertOwner(client, { username, passHash, resetPassword }) {
  const ins = await client.query(
    'INSERT INTO users (username, pass_hash) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING RETURNING id', [username, passHash]);
  if (ins.rows.length) {
    await client.query(`INSERT INTO progress (user_id, data) VALUES ($1, '{"v":1}') ON CONFLICT (user_id) DO NOTHING`, [ins.rows[0].id]);
    return { status: 'created' };
  }
  const ex = (await client.query('SELECT id, created_at FROM users WHERE username = $1', [username])).rows[0];
  if (!resetPassword) {
    throw new Error('Tên ' + username + ' đã tồn tại (tạo lúc ' + ex.created_at + ') — thêm --reset-owner-password nếu đó là tài khoản của bạn.');
  }
  await client.query('UPDATE users SET pass_hash = $2 WHERE id = $1', [ex.id, passHash]);
  const del = await client.query('DELETE FROM sessions WHERE user_id = $1', [ex.id]);
  await client.query(`INSERT INTO progress (user_id, data) VALUES ($1, '{"v":1}') ON CONFLICT (user_id) DO NOTHING`, [ex.id]);
  return { status: 'password reset', revoked: del.rowCount || 0 };
}

module.exports = { upsertOwner };
