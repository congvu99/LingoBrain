/* Test server/database.js: lỗi mất kết nối DB phải thành 503 (không phải 500). Chỉ chạy trong Node. */
describe('database availability (Node)', () => {
  if (typeof require === 'undefined') { it('bỏ qua ngoài Node', () => assert.ok(true)); return; }
  const { isDbUnavailable } = require(path.join(ROOT, 'server', 'database.js'));
  const err = (props, msg) => Object.assign(new Error(msg || 'x'), props);

  it('mất kết nối / DB khởi động lại / timeout → true', () => {
    [err({ code: 'ECONNREFUSED' }), err({ code: 'ECONNRESET' }), err({ code: 'ETIMEDOUT' }), err({ code: 'ENOTFOUND' }),
      err({ code: '57P01' }), err({ code: '57P03' }), err({ code: '08006' }), err({ code: '08001' }),
      err({}, 'timeout exceeded when trying to connect'), err({}, 'Connection terminated unexpectedly')]
      .forEach(e => assert.equal(isDbUnavailable(e), true, e.code || e.message));
  });
  it('lỗi dữ liệu / trùng khoá / lỗi code → false', () => {
    [err({ code: '23505' }), err({ code: '22P02' }), err({}, 'boom'), null, undefined]
      .forEach(e => assert.equal(isDbUnavailable(e), false, String(e && (e.code || e.message))));
  });
});
