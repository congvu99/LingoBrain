/* Kiểm tra định dạng tài khoản, băm mật khẩu (scrypt), sinh + băm token phiên.
   Thuần (chỉ dùng node:crypto), test: tests/password-hashing-and-session-tokens.test.js */
const crypto = require('crypto');

const USERNAME_RX = /^[a-z0-9_]{3,20}$/;
const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEYLEN = 64;

// trả username đã chuẩn hoá (trim + chữ thường) hoặc null nếu sai định dạng
function validateUsername(u) {
  if (typeof u !== 'string') return null;
  const v = u.trim().toLowerCase();
  return USERNAME_RX.test(v) ? v : null;
}
function validatePassword(p) { return typeof p === 'string' && p.length >= 6 && p.length <= 128; }

// chuẩn hoá NFC: mật khẩu có dấu gõ trên máy khác nhau có thể ra NFC hoặc NFD (ký tự tổ hợp)
function scrypt(pw, salt) {
  return new Promise((resolve, reject) => crypto.scrypt(pw.normalize('NFC'), salt, KEYLEN, SCRYPT, (err, key) => err ? reject(err) : resolve(key)));
}
// định dạng lưu: scrypt$<salt 16 byte hex>$<key 64 byte hex>
async function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  return 'scrypt$' + salt.toString('hex') + '$' + (await scrypt(pw, salt)).toString('hex');
}
async function verifyPassword(pw, stored) {
  const m = /^scrypt\$([0-9a-f]{32})\$([0-9a-f]{128})$/.exec(typeof stored === 'string' ? stored : '');
  if (!m || typeof pw !== 'string') return false;
  const key = await scrypt(pw, Buffer.from(m[1], 'hex'));
  return crypto.timingSafeEqual(key, Buffer.from(m[2], 'hex'));
}
// user không tồn tại vẫn tốn 1 lần scrypt → thời gian phản hồi không lộ username nào có thật
const DUMMY_HASH = 'scrypt$' + '0'.repeat(32) + '$' + '0'.repeat(128);
async function dummyVerify(pw) { await verifyPassword(String(pw), DUMMY_HASH); return false; }

function newToken() { return crypto.randomBytes(32).toString('base64url'); }
function hashToken(t) { return crypto.createHash('sha256').update(String(t)).digest('hex'); }

module.exports = { validateUsername, validatePassword, hashPassword, verifyPassword, dummyVerify, newToken, hashToken };
