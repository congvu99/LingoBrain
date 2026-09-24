/* Test tools/seed-database.js: đọc cờ, tài khoản chủ, reset có rào chắn — client giả, không cần DB. Chỉ chạy trong Node. */
describe('seed database CLI (Node)', () => {
  if (typeof require === 'undefined') { it('bỏ qua ngoài Node', () => assert.ok(true)); return; }
  const { parseArgs } = require(path.join(ROOT, 'server', 'seed-cli-args.js'));
  const { upsertOwner } = require(path.join(ROOT, 'server', 'owner-account.js'));
  const { runSeedSteps } = require(path.join(ROOT, 'tools', 'seed-database.js'));
  const cred = require(path.join(ROOT, 'server', 'password-hashing-and-session-tokens.js'));
  const throws = (fn, rx) => { let e = null; try { fn(); } catch (x) { e = x; } assert.ok(e && rx.test(e.message), 'lỗi mong đợi ' + rx + ', nhận ' + (e && e.message)); };
  const ADMIN = { ADMIN_USERNAME: 'Owner_1', ADMIN_PASSWORD: 'secret123' };

  it('parseArgs: mặc định, reset cần --yes, --drop-users cần --reset, cờ lạ', () => {
    const d = parseArgs([], {});
    assert.equal(d.reset, false); assert.equal(d.admin, null);
    throws(() => parseArgs(['--reset'], {}), /--yes/);
    assert.equal(parseArgs(['--reset', '--yes'], {}).reset, true);
    throws(() => parseArgs(['--drop-users'], {}), /--reset/);
    assert.equal(parseArgs(['--reset', '--yes', '--drop-users'], {}).dropUsers, true);
    throws(() => parseArgs(['--foo'], {}), /--foo/);
  });
  it('parseArgs: admin phải đủ 2 biến, username chuẩn hoá, mật khẩu ≥ 6', () => {
    throws(() => parseArgs([], { ADMIN_USERNAME: 'a_b_c' }), /ADMIN_PASSWORD/);
    assert.equal(parseArgs([], ADMIN).admin.username, 'owner_1');
    throws(() => parseArgs([], { ADMIN_USERNAME: 'owner', ADMIN_PASSWORD: '12345' }), /Mật khẩu/);
    throws(() => parseArgs([], { ADMIN_USERNAME: 'x', ADMIN_PASSWORD: '123456' }), /Tên/);
    throws(() => parseArgs(['--reset-owner-password'], {}), /ADMIN_USERNAME/);
  });

  // client giả: users hiện có (theo username), số user để kiểm reset
  function fakeClient({ existing = null, userCount = 0 } = {}) {
    const log = [];
    return {
      log,
      async query(sql, params) {
        log.push({ sql, params });
        if (/INSERT INTO users/.test(sql)) return { rows: existing ? [] : [{ id: 7 }] };
        if (/SELECT id, created_at FROM users/.test(sql)) return { rows: existing ? [{ id: 3, created_at: '2026-09-01' }] : [] };
        if (/DELETE FROM sessions/.test(sql)) return { rowCount: 2 };
        if (/to_regclass/.test(sql)) return { rows: [{ t: 'users' }] };
        if (/count\(\*\)::int AS n FROM users/.test(sql)) return { rows: [{ n: userCount }] };
        if (/count\(\*\)/.test(sql)) return { rows: [{ n: 0 }] };
        if (/^\s*INSERT INTO words/i.test(sql)) return { rows: [] };
        return { rows: [], rowCount: 0 };
      }
    };
  }
  const has = (c, rx) => c.log.some(q => rx.test(q.sql));

  globalThis.__asyncTests = (globalThis.__asyncTests || []).concat([
    { name: 'upsertOwner: user mới → users + progress, không đụng sessions; hash scrypt dùng được', fn: async () => {
      const passHash = await cred.hashPassword('secret123');
      const c = fakeClient();
      const r = await upsertOwner(c, { username: 'owner_1', passHash });
      assert.equal(r.status, 'created');
      assert.ok(/ON CONFLICT \(username\) DO NOTHING/.test(c.log[0].sql));
      assert.ok(has(c, /INSERT INTO progress/)); assert.ok(!has(c, /sessions/));
      assert.ok(passHash.startsWith('scrypt$') && await cred.verifyPassword('secret123', passHash));
    } },
    { name: 'upsertOwner: tên đã có, thiếu cờ → ném, không UPDATE; có cờ → UPDATE + xoá session, giữ progress', fn: async () => {
      const c = fakeClient({ existing: true });
      let err = null;
      try { await upsertOwner(c, { username: 'owner_1', passHash: 'h' }); } catch (e) { err = e; }
      assert.ok(err && /--reset-owner-password/.test(err.message) && /2026-09-01/.test(err.message));
      assert.ok(!has(c, /UPDATE users/));
      const c2 = fakeClient({ existing: true });
      const r = await upsertOwner(c2, { username: 'owner_1', passHash: 'h', resetPassword: true });
      assert.equal(r.revoked, 2);
      assert.ok(has(c2, /UPDATE users SET pass_hash/) && has(c2, /DELETE FROM sessions WHERE user_id/));
      assert.ok(!has(c2, /DELETE FROM progress|UPDATE progress/));
    } },
    { name: 'runSeedSteps: reset khi đã có user mà thiếu --drop-users → ném, không DROP; khoá là câu đầu', fn: async () => {
      const c = fakeClient({ userCount: 3 });
      let err = null;
      try { await runSeedSteps(c, { args: parseArgs(['--reset', '--yes', '--skip-deck'], {}), schemaSql: 'SCHEMA' }); } catch (e) { err = e; }
      assert.ok(err && /--drop-users/.test(err.message) && /3/.test(err.message));
      assert.ok(/pg_advisory_xact_lock/.test(c.log[0].sql));
      assert.ok(!has(c, /DROP TABLE/));
    } },
    { name: 'runSeedSteps: có --drop-users → DROP rồi schema; không reset → không DROP', fn: async () => {
      const c = fakeClient({ userCount: 3 });
      await runSeedSteps(c, { args: parseArgs(['--reset', '--yes', '--drop-users', '--skip-deck'], {}), schemaSql: 'SCHEMA' });
      const iDrop = c.log.findIndex(q => /DROP TABLE/.test(q.sql)), iSchema = c.log.findIndex(q => q.sql === 'SCHEMA');
      assert.ok(iDrop > 0 && iSchema > iDrop);
      const c2 = fakeClient();
      const lines = await runSeedSteps(c2, { args: parseArgs([], {}), schemaSql: 'SCHEMA',
        files: { wordsJson: { words: [{ id: 'a', word: 'a' }] }, audioJson: { items: { a: 'abcdef012345.mp3' } }, hash: 'h' } });
      assert.ok(!has(c2, /DROP TABLE/)); assert.ok(has(c2, /INSERT INTO deck_meta/));
      assert.ok(lines.some(l => /words 1/.test(l)));
    } }
  ]);
});
