/* Node runner: nạp các module thuần + test vào cùng một scope toàn cục (giống trình duyệt).
   Dùng: node tests/run-tests.js */
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const PURE_MODULES = [
  'js/srs-scheduler.js',
  'js/review-mode-picker.js',
  'js/stats-dashboard.js',
  'js/word-import.js',
  'js/word-games.js'
];
const ctx = vm.createContext({ console, Math, Date, JSON, Array, Object, String, Number, RegExp, Error, fs, path, ROOT: root });
ctx.globalThis = ctx;
function run(file) { vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), ctx, { filename: file }); }
run('tests/test-harness.js');
PURE_MODULES.forEach(run);
fs.readdirSync(__dirname).filter(f => /\.test\.js$/.test(f)).sort().forEach(f => run('tests/' + f));
const ok = ctx.__reportTests(s => console.log(s));
process.exit(ok ? 0 : 1);
