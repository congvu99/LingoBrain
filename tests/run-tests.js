/* Node runner: nạp các module thuần + test vào cùng một scope toàn cục (giống trình duyệt).
   Dùng: node tests/run-tests.js */
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const PURE_MODULES = [
  'js/boss-progress-sync-merge.js',   // sync-merge.js (trình duyệt/vm) và app-storage.js dùng global của nó → nạp đầu tiên
  'js/srs-scheduler.js',
  'js/sync-merge.js',
  'js/deck-source.js',
  'js/cloud-sync-engine.js',   // không phải thuần hẳn nhưng không đụng DOM ở top-level → test bằng stub
  'js/review-mode-picker.js',
  'js/stats-dashboard.js',
  'js/word-games.js',
  'js/fruit-game-logic.js',
  'js/plane-game-text.js',
  'js/plane-game-logic.js',
  'js/plane-game-typing.js',
  'js/game-particles.js',
  'js/boss-game-spell-presets.js',    // dữ liệu preset — cần cho test trần hạt bằng preset thật
  'js/boss-game-spell-math.js',       // cần plane-game-text.js + word-games.js
  'js/boss-game-elements.js',
  'js/boss-game-evolution-forms.js',   // dữ liệu 30 dạng tiến hoá — cần trước boss-game-evolution.js/test
  'js/boss-game-evolution-sprites.js', // 30 sheet + 30 face dạng tiến hoá (dữ liệu thuần)
  'js/boss-game-evolution.js',
  'js/boss-game-skill-roster.js',     // dữ liệu 35 chiêu tự phát (thuần, không hàm) — nạp trước skill-pick.js
  'js/boss-game-skill-pick.js',       // chọn/áp chiêu + bossApplyHit (thuần) — nạp trước boss-game-logic.js
  'js/boss-game-threat-gauge.js',     // thanh tấn công trùm (thuần) — nạp trước boss-game-logic.js
  'js/boss-game-combo-chain.js',      // combo + thanh tuyệt kỹ + chuỗi niệm (thuần) — nạp trước boss-game-logic.js
  'js/boss-game-logic.js',
  'js/boss-game-progress.js',
  'js/boss-game-story.js',        // dữ liệu thuần: BOSS_REGIONS, BOSS_MONSTERS, BOSS_STORY
  'js/boss-game-sprite-atlas.js', // phần thuần: BOSS_SPRITES, spriteFrame, pixelScale (phần DOM chỉ định nghĩa hàm)
  'js/boss-game-skill-sprites.js',   // gắn BOSS_SKILL_SPRITES vào BOSS_SPRITES (dữ liệu thuần) — nạp sau sprite-atlas.js
  'js/boss-game-extra-sprites.js',   // gắn BOSS_EXTRA_SPRITES (fx/tile chưa dùng, plan 260925-1445 phase 1) — nạp sau skill-sprites.js
  'js/boss-game-dragon-composite.js',   // chỉ định nghĩa hàm/hằng số ở top-level, không đụng DOM khi nạp
  'js/boss-game-arena.js',        // BOSS_ARENAS (dữ liệu) + buildBossArena tự trả null khi không có document
  'js/boss-game-arena-layouts.js',   // BOSS_MONSTER_ARENAS (dữ liệu, plan 260925-1445 phase 5) — sân riêng 12 quái
  'js/boss-game-arena-ambient.js',   // createBossAmbient/stepBossAmbient (thuần) + drawBossAmbient (đụng ctx, chỉ chạy khi gọi)
  'js/boss-game-sprite-actors.js',  // chỉ định nghĩa hàm ở top-level; hàm đụng DOM (ctx canvas) chỉ chạy khi gọi,
  // test bossSpawnSprite/stepBossActors (thuần, không cần ctx) — xem tests/boss-game-sprite-actors.test.js
  'js/boss-game-skill-motion.js',   // bossShotPos/bossShotDir (thuần) + drawBossShotSprite (đụng DOM, chỉ chạy khi gọi)
  'js/boss-game-skill-visuals.js',   // BOSS_SKILL_VISUALS (dữ liệu thuần, 30 chiêu) — nạp sau skill-motion.js (dùng bởi bossSkillVisualFor)
  'js/boss-game-ultimate-overlay-fx.js',   // lớp phủ tuyệt kỹ thêm (thuần: alpha/vị trí hạt) — cần BOSS_ULTIMATE_PRESETS/BOSS_SPRITES ở trên
  'js/boss-game-monster-attack-fx.js',   // BOSS_MONSTER_ATTACK_FX + bossMonsterAttackFxEvent (thuần) — cần bossSpawnSprite/bossVfxScale ở trên
  'js/boss-game-spell-art.js'   // createBossFx/bossFxEvent/stepBossFx (thuần, không đụng ctx) — nạp SAU sprite-actors.js
  // (khác index.html, ở đó nạp trước nhưng chỉ gọi hàm bossSpawnSprite lúc runtime nên thứ tự không quan trọng)
  // để test wiring vis.cast (review M1) dùng được bossSpawnSprite/bossVfxScale thật, xem tests/boss-game-spell-art.test.js
];
// require/Buffer/process chỉ cho test Node-only (server/*); test dùng chung trình duyệt không được phụ thuộc chúng
const ctx = vm.createContext({ console, Math, Date, JSON, Array, Object, String, Number, RegExp, Error, Promise, fs, path, ROOT: root, require, Buffer, process, setTimeout, clearTimeout, AbortController });
ctx.globalThis = ctx;
function run(file) { vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), ctx, { filename: file }); }
run('tests/test-harness.js');
PURE_MODULES.forEach(run);
fs.readdirSync(__dirname).filter(f => /\.test\.js$/.test(f)).sort().forEach(f => run('tests/' + f));
// test async (Node): mỗi mục {name, fn} hoặc hàm; timeout 10s để promise treo không làm treo runner
(async () => {
  const withTimeout = p => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout 10s')), 10000).unref())]);
  for (const t of (ctx.__asyncTests || [])) {
    const name = t.name || 'async', fn = t.fn || t;
    let err = null;
    try { await withTimeout(Promise.resolve().then(fn)); } catch (e) { err = e; }
    ctx.describe('async', () => ctx.it(name, () => { if (err) throw err; }));
  }
  const ok = ctx.__reportTests(s => console.log(s));
  process.exit(ok ? 0 : 1);
})();
