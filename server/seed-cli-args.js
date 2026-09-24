/* Đọc cờ + env cho tools/seed-database.js. Thuần, ném Error với thông điệp tiếng Việt để in thẳng ra terminal.
   Test: tests/seed-database-cli.test.js */
const { validateUsername, validatePassword } = require('./password-hashing-and-session-tokens.js');

const FLAGS = {
  '--reset': 'reset', '--yes': 'yes', '--drop-users': 'dropUsers', '--allow-shrink': 'allowShrink',
  '--reset-owner-password': 'resetOwnerPassword', '--skip-deck': 'skipDeck'
};
const USAGE = 'Dùng: node tools/seed-database.js [--reset --yes [--drop-users]] [--allow-shrink] [--reset-owner-password] [--skip-deck]\n' +
  'Env: DATABASE_URL (bắt buộc), PGSSL, PGSSLROOTCERT, ADMIN_USERNAME + ADMIN_PASSWORD (tuỳ chọn, tạo tài khoản chủ)';

function parseArgs(argv, env) {
  const o = { reset: false, yes: false, dropUsers: false, allowShrink: false, resetOwnerPassword: false, skipDeck: false, admin: null };
  argv.forEach(a => {
    if (!FLAGS[a]) throw new Error('Cờ không hợp lệ: ' + a + '\n' + USAGE);
    o[FLAGS[a]] = true;
  });
  if (o.reset && !o.yes) throw new Error('--reset xoá toàn bộ bảng rồi tạo lại. Thêm --yes để xác nhận.');
  if (o.dropUsers && !o.reset) throw new Error('--drop-users chỉ dùng kèm --reset --yes.');
  const u = env.ADMIN_USERNAME, p = env.ADMIN_PASSWORD;
  if (u || p) {
    if (!u || !p) throw new Error('Cần đặt cả ADMIN_USERNAME và ADMIN_PASSWORD (hoặc bỏ cả hai).');
    const username = validateUsername(u);
    if (!username) throw new Error('Tên tài khoản 3–20 ký tự (a-z, 0-9, _).');
    if (!validatePassword(p)) throw new Error('Mật khẩu 6–128 ký tự.');
    o.admin = { username, password: p };
  }
  if (o.resetOwnerPassword && !o.admin) throw new Error('--reset-owner-password cần ADMIN_USERNAME + ADMIN_PASSWORD.');
  return o;
}

module.exports = { parseArgs, USAGE };
