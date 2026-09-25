/* Game Pháp Sư Lexoria — logic tiến hoá, THUẦN (không DOM). Cần BOSS_EVO (dữ liệu 30 dạng,
   js/boss-game-evolution-forms.js) nạp trước. Không phụ thuộc global bảng chiêu tự phát — bossSkillsFor nhận
   baseSkills làm tham số (bảng slot→chiêu gốc của hệ, gọi ở caller). Không bao giờ xoá dữ liệu `evo` đã lưu:
   dạng chưa đủ cấp chỉ hiển thị/tính như dạng gốc, id vẫn giữ nguyên trong tiến trình. */

/* Dạng formId đã mở ở cấp hiện tại? '' (dạng gốc) luôn mở. Id lạ/không thuộc hệ el → false. */
function bossEvoUnlocked(el, formId, level) {
  if (formId === '') return true;
  const form = BOSS_EVO[el] && BOSS_EVO[el][formId];
  return !!form && (level | 0) >= form.level;
}

/* Dạng đang hiển thị/áp dụng: id đã lưu nếu đủ cấp, ngược lại rơi về gốc (không xoá prog). */
function bossActiveForm(prog, el, level) {
  const v = (prog && prog[el] && prog[el].v) || '';
  return bossEvoUnlocked(el, v, level) ? v : '';
}

/* Modifier cộng thêm của dạng (form = BOSS_EVO[el][formId], có thể null/undefined ứng dạng gốc → {}). */
function bossEvoMods(form) {
  return (form && form.mods) || {};
}

/* Bảng slot→chiêu sau khi ghi đè theo dạng. baseSkills: {slot: {..., effect}} của hệ (7 chiêu tự phát/hệ).
   Trả object MỚI (không sửa baseSkills); slot không bị ghi đè giữ nguyên tham chiếu chiêu gốc. */
function bossSkillsFor(el, form, baseSkills) {
  const base = baseSkills || {};
  const out = {};
  Object.keys(base).forEach(slot => { out[slot] = base[slot]; });
  const overrides = (form && form.skillOverrides) || {};
  Object.keys(overrides).forEach(slot => { out[slot] = Object.assign({}, base[slot] || {}, overrides[slot]); });
  return out;
}

/* Hệ số cộng thêm vào chuỗi niệm (bossChainFactor), chỉ dạng cấp 16 mới có (0.25), còn lại 0. */
function bossEvoUltBonus(form) {
  return (form && typeof form.ultBonus === 'number') ? form.ultBonus : 0;
}

/* Gộp modifier dạng tiến hoá vào mods đã tính từ cây nguyên tố (modifiersFor, js/boss-game-elements.js) — mỗi
   khoá của dạng là SỐ, cộng thêm vào mods (form rỗng/chưa đủ cấp → bossEvoMods trả {} → không đổi gì). Gọi ở
   caller tạo trận (js/boss-game-ui.js) SAU modifiersFor, TRƯỚC createBattle. */
function bossFoldEvoMods(mods, form) {
  const add = bossEvoMods(form), out = Object.assign({}, mods);
  Object.keys(add).forEach(k => { out[k] = (out[k] || 0) + add[k]; });
  return out;
}

/* Khoá sprite nhân vật (BOSS_EVO_SPRITES) / faceset của formId đang dùng — '' khi formId rỗng hoặc không thuộc
   hệ el (bossMageSprite, js/boss-game-sprite-actors.js, rơi về sprite giới tính khi nhận chuỗi rỗng). */
function bossFormSprite(el, formId) { const f = BOSS_EVO[el] && BOSS_EVO[el][formId]; return f ? f.sprite : ''; }
function bossFormFace(el, formId) { const f = BOSS_EVO[el] && BOSS_EVO[el][formId]; return f ? f.face : ''; }

/* Có dạng ở mốc cấp cao hơn đang mở nhưng dạng hiện tại (formId, '' = gốc) chưa đạt mốc đó — badge "Có thể tiến
   hoá!" ở sảnh (hệ đang chọn). Kết trận dùng bossEvoMilestoneReached (chính xác "vừa lên mốc") thay vì hàm này. */
function bossEvoHasUpgrade(el, level, formId) {
  const cur = (formId && BOSS_EVO[el] && BOSS_EVO[el][formId]) ? BOSS_EVO[el][formId].level : 0;
  return (level >= 8 && cur < 8) || (level >= 16 && cur < 16);
}

/* Cấp vừa vượt qua mốc 8 hoặc 16 giữa lv0 (trước trận) và lv1 (sau trận) — badge "Có thể tiến hoá!" ở màn kết trận. */
function bossEvoMilestoneReached(lv0, lv1) { return (lv0 < 8 && lv1 >= 8) || (lv0 < 16 && lv1 >= 16); }

/* Mốc tiến hoá cao nhất đã đạt theo cấp hiện tại (0 = chưa tới cấp 8) — dùng ở js/app-storage.js
   (bossEvoNoticeSeen/bossMarkEvoNoticeSeen) để tắt huy hiệu "Có thể tiến hoá!" sau khi đã mở màn Tiến hoá 1
   lần/mốc, và ở js/boss-game-hub-ui.js để so sánh với mốc đã xem. */
function bossEvoMilestoneTier(level) { return level >= 16 ? 16 : level >= 8 ? 8 : 0; }

/* Gộp cây nguyên tố (modifiersFor, js/boss-game-elements.js) + dạng tiến hoá thành 1 bước, tiện cho caller tạo
   trận (js/boss-game-ui.js) — trả kèm form/formData để gọi bossSkillsFor/bossEvoUltBonus/bossFormSprite không
   phải tra lại. evoProg = bossProg.evo (map cả 5 hệ, xem js/boss-progress-sync-merge.js). THUẦN: chỉ gọi hàm đã
   nạp trước (modifiersFor), không đọc global bossProg trực tiếp. */
function bossBattleMods(alloc, activeEl, evoProg, level) {
  const base = modifiersFor(alloc, activeEl);
  const form = bossActiveForm(evoProg, base.element, level);
  const formData = BOSS_EVO[base.element] && BOSS_EVO[base.element][form];
  return { mods: bossFoldEvoMods(base, formData), form, formData };
}

if (typeof module !== 'undefined') module.exports = {
  bossEvoUnlocked, bossActiveForm, bossEvoMods, bossSkillsFor, bossEvoUltBonus, bossFoldEvoMods,
  bossFormSprite, bossFormFace, bossEvoHasUpgrade, bossEvoMilestoneReached, bossEvoMilestoneTier, bossBattleMods
};
