/* Test harness tối giản: chạy trong Node (node tests/run-tests.js) và trình duyệt (tests/run-tests.html).
   Không phụ thuộc npm. */
(function (root) {
  const results = [];
  let current = '';
  function describe(name, fn) { current = name; fn(); }
  function it(name, fn) {
    try { fn(); results.push({ name: current + ' › ' + name, ok: true }); }
    catch (e) { results.push({ name: current + ' › ' + name, ok: false, err: e && e.message || String(e) }); }
  }
  function fail(msg) { throw new Error(msg); }
  const assert = {
    ok(v, m) { if (!v) fail(m || 'expected truthy, got ' + JSON.stringify(v)); },
    equal(a, b, m) { if (a !== b) fail((m ? m + ': ' : '') + 'expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a)); },
    deepEqual(a, b, m) { const x = JSON.stringify(a), y = JSON.stringify(b); if (x !== y) fail((m ? m + ': ' : '') + 'expected ' + y + ', got ' + x); },
    near(a, b, eps, m) { if (Math.abs(a - b) > (eps || 1e-6)) fail((m ? m + ': ' : '') + 'expected ~' + b + ', got ' + a); },
    includes(arr, v, m) { if (arr.indexOf(v) < 0) fail((m ? m + ': ' : '') + JSON.stringify(arr) + ' does not include ' + JSON.stringify(v)); }
  };
  function report(print) {
    const failed = results.filter(r => !r.ok);
    results.forEach(r => print((r.ok ? 'PASS ' : 'FAIL ') + r.name + (r.ok ? '' : '\n      ' + r.err)));
    print('\n' + (results.length - failed.length) + ' passed, ' + failed.length + ' failed');
    return failed.length === 0;
  }
  root.describe = describe; root.it = it; root.assert = assert; root.__reportTests = report;
})(typeof globalThis !== 'undefined' ? globalThis : this);
