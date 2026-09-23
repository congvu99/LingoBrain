/* Test server/password-hashing-and-session-tokens.js — chỉ chạy trong Node (không nạp trong run-tests.html). */
describe('password-hashing-and-session-tokens (Node)', () => {
  if (typeof require === 'undefined') { it('bỏ qua ngoài Node', () => assert.ok(true)); return; }
  const c = require(path.join(ROOT, 'server', 'password-hashing-and-session-tokens.js'));
  const N = 'password-hashing-and-session-tokens (Node) › ';

  it('username chuẩn hoá trim + chữ thường', () => assert.equal(c.validateUsername(' Minh_01 '), 'minh_01'));
  it('username sai định dạng → null', () => {
    ['ab', 'a b', 'tên', 'x'.repeat(21), '', null, 5, 'a-b', 'ab!'].forEach(u => assert.equal(c.validateUsername(u), null, String(u)));
  });
  it('username 3 và 20 ký tự hợp lệ', () => { assert.equal(c.validateUsername('abc'), 'abc'); assert.equal(c.validateUsername('a'.repeat(20)), 'a'.repeat(20)); });
  it('mật khẩu 6–128 ký tự', () => {
    assert.equal(c.validatePassword('12345'), false); assert.equal(c.validatePassword('123456'), true);
    assert.equal(c.validatePassword('x'.repeat(128)), true); assert.equal(c.validatePassword('x'.repeat(129)), false);
    assert.equal(c.validatePassword(123456), false);
  });
  it('hashToken tất định, 64 hex', () => {
    assert.equal(c.hashToken('abc'), c.hashToken('abc')); assert.ok(/^[0-9a-f]{64}$/.test(c.hashToken('abc')));
    assert.ok(c.hashToken('abc') !== c.hashToken('abd'));
  });
  it('newToken đủ dài, không trùng', () => {
    const a = c.newToken(), b = c.newToken();
    assert.ok(a.length >= 40); assert.ok(a !== b); assert.ok(/^[A-Za-z0-9_-]+$/.test(a));
  });

  globalThis.__asyncTests = (globalThis.__asyncTests || []).concat([
    { name: N + 'hash → verify đúng/sai', fn: async () => {
      const h = await c.hashPassword('secret1');
      assert.ok(/^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/.test(h), h);
      assert.equal(await c.verifyPassword('secret1', h), true);
      assert.equal(await c.verifyPassword('secret2', h), false);
    } },
    { name: N + 'mật khẩu có dấu: NFC và NFD cùng đăng nhập được (bàn phím khác máy)', fn: async () => {
      const nfc = 'mậtkhẩu'.normalize('NFC'), nfd = 'mậtkhẩu'.normalize('NFD');
      assert.ok(nfc !== nfd);
      assert.equal(await c.verifyPassword(nfd, await c.hashPassword(nfc)), true);
    } },
    { name: N + 'cùng mật khẩu → hash khác (salt)', fn: async () => {
      assert.ok(await c.hashPassword('same12') !== await c.hashPassword('same12'));
    } },
    { name: N + 'hash lưu hỏng → false, không ném', fn: async () => {
      for (const bad of ['', 'x', 'scrypt$zz$zz', 'bcrypt$a$b', null]) assert.equal(await c.verifyPassword('secret1', bad), false);
    } },
    { name: N + 'dummyVerify luôn false (cân thời gian khi user không tồn tại)', fn: async () => {
      assert.equal(await c.dummyVerify('whatever'), false);
    } }
  ]);
});
