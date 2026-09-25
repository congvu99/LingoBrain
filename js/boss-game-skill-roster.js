/* Game Pháp Sư Lexoria — DỮ LIỆU 35 chiêu tự phát (5 hệ × 7 slot), thuần, KHÔNG có hàm (được phép vượt 200 dòng —
   xem plan.md "Ràng buộc chung"). Nguồn: reports/skill-roster-proposal.md (đã duyệt nguyên bảng — plan.md Session 2).
   Cần nạp TRƯỚC js/boss-game-skill-pick.js (dùng BOSS_SKILLS/BOSS_SKILL_SLOTS/BOSS_SKILL_UNLOCK_LEVEL).

   Slot → điều kiện (xem bossSkillSlotMatches, boss-game-skill-pick.js) → cấp mở:
     basic(1, mọi từ) · combo3(2, combo vừa chạm bội số 3) · long(3, từ ≥8 chữ) · fast(4, speed≥2) ·
     combo6(6, combo vừa chạm bội số 6) · execute(8, HP quái <30% lúc niệm) · counter(10, cast đầu sau khi bị đánh TRÚNG).
   Ưu tiên khi nhiều slot cùng khớp (tất định, BOSS_SKILL_PRIORITY): execute > counter > combo6 > long > fast > combo3 > basic.
   Mỗi từ tối đa 1 chiêu đặc biệt (bossPickSkill trả về đúng 1 skill theo thứ tự ưu tiên).

   effect = tổ hợp primitive (đều tuỳ chọn, {} = không đổi gì — dùng cho basic, giữ dmg y hệt hiện tại ở cấp 1):
     dmgMul k        → D × k (D = sát thương phép hiện tại, bậc×speed×khắc hệ×nội tại×combo)
     extraHits n     → n đòn phụ, mỗi đòn 50% D (tính TRƯỚC crit, không crit riêng) — cộng gộp vào 1 pendingImpact
     crit            → ép chí mạng ×BOSS_TUNING.critMul; đã crit sẵn (Sét nội tại fastCrit) thì KHÔNG cộng dồn
     burn {dps,sec}  → như nội tại Lửa bậc 2; áp lúc phép CHẠM (impact), so với burn nội tại đang cháy — MẠNH HƠN
                       (dps×sec lớn hơn) thắng, không cộng dồn (quyết định người dùng, xem plan.md Session 2)
     freeze {sec}    → frozenUntil = max(hiện tại, lúc chạm + sec×1000), CHẮC CHẮN xảy ra (không qua freezeChance)
     threatDrainMul k → nhân hệ số vào lượng giảm thanh tấn công lúc niệm (BOSS_TUNING.threatDrain × speed × k)
     shield +n       → cộng khiên NGAY lúc niệm, kẹp BOSS_TUNING.shieldCap (mọi nguồn cộng khiên đều kẹp trần này)
     heal +n         → cộng tim NGAY lúc niệm, kẹp heartsMax
     ultAdd +n       → cộng thanh tuyệt kỹ NGAY lúc niệm, kẹp BOSS_TUNING.ultMax
   icon: ảnh 24×24 (Ui/Skill Icon/…, chép bằng tools/copy-boss-sprites.js) — basic dùng lại icon hệ đã có sẵn.
   fx: khoá tra BOSS_SKILL_FX (dưới) — null ở basic (dùng nguyên preset hệ×bậc hiện có, không thêm gì). */

const BOSS_SKILL_UNLOCK_LEVEL = { basic: 1, combo3: 2, long: 3, fast: 4, combo6: 6, execute: 8, counter: 10 };
const BOSS_SKILL_PRIORITY = ['execute', 'counter', 'combo6', 'long', 'fast', 'combo3', 'basic'];
const BOSS_SKILL_SLOTS = ['basic', 'combo3', 'long', 'fast', 'combo6', 'execute', 'counter'];

const BOSS_SKILLS = {
  fire: {
    basic: { id: 'fire-basic', name: 'Hoả cầu', icon: 'img/boss/fx/icon-fire.png', fx: null, effect: {} },
    combo3: { id: 'fire-combo3', name: 'Song hoả', icon: 'img/boss/fx/skill-fire-combo3.png', fx: 'fire-combo3', effect: { extraHits: 1 } },
    long: { id: 'fire-long', name: 'Hoả trụ', icon: 'img/boss/fx/skill-fire-long.png', fx: 'fire-long', effect: { dmgMul: 1.8 } },
    fast: { id: 'fire-fast', name: 'Tia lửa', icon: 'img/boss/fx/skill-fire-fast.png', fx: 'fire-fast', effect: { crit: true } },
    combo6: { id: 'fire-combo6', name: 'Vòng lửa', icon: 'img/boss/fx/skill-fire-combo6.png', fx: 'fire-combo6', effect: { burn: { dps: 10, sec: 3 } } },
    execute: { id: 'fire-execute', name: 'Thiêu rụi', icon: 'img/boss/fx/skill-fire-execute.png', fx: 'fire-execute', effect: { dmgMul: 1.5 } },
    counter: { id: 'fire-counter', name: 'Phản hoả', icon: 'img/boss/fx/skill-fire-counter.png', fx: 'fire-counter', effect: { threatDrainMul: 2, dmgMul: 1.1 } }
  },
  ice: {
    basic: { id: 'ice-basic', name: 'Băng tiễn', icon: 'img/boss/fx/icon-ice.png', fx: null, effect: {} },
    combo3: { id: 'ice-combo3', name: 'Sương giá', icon: 'img/boss/fx/skill-ice-combo3.png', fx: 'ice-combo3', effect: { freeze: { sec: 1.5 }, dmgMul: 1.2 } },
    long: { id: 'ice-long', name: 'Cột băng', icon: 'img/boss/fx/skill-ice-long.png', fx: 'ice-long', effect: { dmgMul: 1.4, freeze: { sec: 2 } } },
    fast: { id: 'ice-fast', name: 'Mũi băng', icon: 'img/boss/fx/skill-ice-fast.png', fx: 'ice-fast', effect: { dmgMul: 1.2, freeze: { sec: 2 } } },
    combo6: { id: 'ice-combo6', name: 'Giáp băng', icon: 'img/boss/fx/skill-ice-combo6.png', fx: 'ice-combo6', effect: { shield: 1 } },
    execute: { id: 'ice-execute', name: 'Băng phong', icon: 'img/boss/fx/skill-ice-execute.png', fx: 'ice-execute', effect: { dmgMul: 1.3, freeze: { sec: 1 } } },
    counter: { id: 'ice-counter', name: 'Hàn triều', icon: 'img/boss/fx/skill-ice-counter.png', fx: 'ice-counter', effect: { freeze: { sec: 3 }, dmgMul: 1.4 } }
  },
  storm: {
    basic: { id: 'storm-basic', name: 'Tia sét', icon: 'img/boss/fx/icon-storm.png', fx: null, effect: {} },
    combo3: { id: 'storm-combo3', name: 'Tia chớp', icon: 'img/boss/fx/skill-storm-combo3.png', fx: 'storm-combo3', effect: { crit: true } },
    long: { id: 'storm-long', name: 'Lôi trụ', icon: 'img/boss/fx/skill-storm-long.png', fx: 'storm-long', effect: { crit: true, dmgMul: 1.2 } },
    fast: { id: 'storm-fast', name: 'Lôi bộ', icon: 'img/boss/fx/skill-storm-fast.png', fx: 'storm-fast', effect: { extraHits: 1, dmgMul: 1.1 } },
    combo6: { id: 'storm-combo6', name: 'Xích lôi', icon: 'img/boss/fx/skill-storm-combo6.png', fx: 'storm-combo6', effect: { extraHits: 2 } },
    execute: { id: 'storm-execute', name: 'Lôi phạt', icon: 'img/boss/fx/skill-storm-execute.png', fx: 'storm-execute', effect: { crit: true } },
    counter: { id: 'storm-counter', name: 'Phản lôi', icon: 'img/boss/fx/skill-storm-counter.png', fx: 'storm-counter', effect: { crit: true, extraHits: 1 } }
  },
  earth: {
    basic: { id: 'earth-basic', name: 'Đá lăn', icon: 'img/boss/fx/icon-earth.png', fx: null, effect: {} },
    combo3: { id: 'earth-combo3', name: 'Đá vụn', icon: 'img/boss/fx/skill-earth-combo3.png', fx: 'earth-combo3', effect: { dmgMul: 1.5 } },
    long: { id: 'earth-long', name: 'Gai đá', icon: 'img/boss/fx/skill-earth-long.png', fx: 'earth-long', effect: { dmgMul: 1.8 } },
    fast: { id: 'earth-fast', name: 'Quyền đá', icon: 'img/boss/fx/skill-earth-fast.png', fx: 'earth-fast', effect: { dmgMul: 1.6 } },
    combo6: { id: 'earth-combo6', name: 'Mạch sống', icon: 'img/boss/fx/skill-earth-combo6.png', fx: 'earth-combo6', effect: { heal: 1, dmgMul: 1.3 } },
    execute: { id: 'earth-execute', name: 'Địa chấn', icon: 'img/boss/fx/skill-earth-execute.png', fx: 'earth-execute', effect: { dmgMul: 1.5 } },
    counter: { id: 'earth-counter', name: 'Giáp đá', icon: 'img/boss/fx/skill-earth-counter.png', fx: 'earth-counter', effect: { shield: 1 } }
  },
  wind: {
    basic: { id: 'wind-basic', name: 'Phong nhận', icon: 'img/boss/fx/icon-wind.png', fx: null, effect: {} },
    combo3: { id: 'wind-combo3', name: 'Gió lùa', icon: 'img/boss/fx/skill-wind-combo3.png', fx: 'wind-combo3', effect: { ultAdd: 1, threatDrainMul: 1.3 } },
    long: { id: 'wind-long', name: 'Lốc cuốn', icon: 'img/boss/fx/skill-wind-long.png', fx: 'wind-long', effect: { dmgMul: 1.4, threatDrainMul: 1.5 } },
    fast: { id: 'wind-fast', name: 'Phong tốc', icon: 'img/boss/fx/skill-wind-fast.png', fx: 'wind-fast', effect: { threatDrainMul: 1.4 } },
    combo6: { id: 'wind-combo6', name: 'Cuồng phong', icon: 'img/boss/fx/skill-wind-combo6.png', fx: 'wind-combo6', effect: { ultAdd: 2, dmgMul: 1.4 } },
    execute: { id: 'wind-execute', name: 'Phong trảm', icon: 'img/boss/fx/skill-wind-execute.png', fx: 'wind-execute', effect: { dmgMul: 1.2, ultAdd: 1 } },
    counter: { id: 'wind-counter', name: 'Phản phong', icon: 'img/boss/fx/skill-wind-counter.png', fx: 'wind-counter', effect: { threatDrainMul: 1.8, ultAdd: 1 } }
  }
};

/* FX theo skill.fx (đọc ở js/boss-game-skill-fx.js, gọi từ boss-game-result-ui.js/bossUiEvents):
     text: tên chiêu nổi lên cạnh pháp sư lúc 'cast'; color: màu chữ nổi + tia loé nhẹ lúc niệm
     castBurst: {kind,speed,life,size,colors,n} burst tại đầu trượng lúc niệm (dùng lại js/game-particles.js)
     impactSprite: {name, solid?} — 1 VFX sprite phụ lúc 'impact' (khoá BOSS_SPRITES/BOSS_SKILL_SPRITES), chồng
       lên VFX hệ×bậc bình thường (đã vẽ bởi bossActorEvent) để tạo nét riêng cho chiêu mà không cần code hiệu ứng
       riêng từng chiêu — solid = tô một màu (opt.solid, giữ khung hình nhưng đổi màu, tái dùng sprite có sẵn) */
const BOSS_SKILL_FX = {
  'fire-combo3': { text: 'Song hoả', color: '#ff9a3c', castBurst: { kind: 'spark', speed: 260, life: 0.3, size: 2, colors: ['#ffd27a', '#ff5a1f'], n: 16 }, impactSprite: { name: 'fireball' } },
  'fire-long': { text: 'Hoả trụ', color: '#ff5a1f', castBurst: { kind: 'spark', speed: 300, life: 0.35, size: 2.4, colors: ['#ff2d2d', '#ffb347'], n: 20 }, impactSprite: { name: 'explosion' } },
  'fire-fast': { text: 'Tia lửa', color: '#ffcf6a', castBurst: { kind: 'spark', speed: 320, life: 0.22, size: 1.8, colors: ['#ffffff', '#ff9a3c'], n: 14 }, impactSprite: { name: 'sparkMagic', solid: '#ff9a3c' } },
  'fire-combo6': { text: 'Vòng lửa', color: '#ff5a1f', castBurst: { kind: 'orb', speed: 90, life: 0.5, size: 4, colors: ['#ff5a1f', '#ffcf6a'], n: 10 }, impactSprite: { name: 'magicCircle', solid: '#ff5a1f' } },
  'fire-execute': { text: 'Thiêu rụi', color: '#ff2d2d', castBurst: { kind: 'smoke', speed: 60, life: 0.7, size: 14, colors: ['#3a1810'], n: 8 }, impactSprite: { name: 'explosion' } },
  'fire-counter': { text: 'Phản hoả', color: '#ff7a2f', castBurst: { kind: 'spark', speed: 200, life: 0.4, size: 2, colors: ['#ff7a2f'], n: 12 }, impactSprite: { name: 'auraSprite', solid: '#ff7a2f' } },
  'ice-combo3': { text: 'Sương giá', color: '#bff4ff', castBurst: { kind: 'shard', speed: 140, life: 0.4, size: 5, colors: ['#e6fbff'], n: 12 }, impactSprite: { name: 'smokeCircular', solid: '#bff4ff' } },
  'ice-long': { text: 'Cột băng', color: '#7fe3ff', castBurst: { kind: 'shard', speed: 160, life: 0.5, size: 6, colors: ['#7fe3ff'], n: 16 }, impactSprite: { name: 'icePillar' } },
  'ice-fast': { text: 'Mũi băng', color: '#7fe3ff', castBurst: { kind: 'spark', speed: 300, life: 0.2, size: 1.8, colors: ['#ffffff', '#7fe3ff'], n: 12 }, impactSprite: { name: 'cutX', solid: '#7fe3ff' } },
  'ice-combo6': { text: 'Giáp băng', color: '#bff4ff', castBurst: { kind: 'shard', speed: 100, life: 0.6, size: 5, colors: ['#e6fbff', '#bff4ff'], n: 10 }, impactSprite: { name: 'shieldSprite' } },
  'ice-execute': { text: 'Băng phong', color: '#4fd3ff', castBurst: { kind: 'shard', speed: 180, life: 0.5, size: 6, colors: ['#4fd3ff'], n: 14 }, impactSprite: { name: 'waterPillar', solid: '#bff4ff' } },
  'ice-counter': { text: 'Hàn triều', color: '#7fe3ff', castBurst: { kind: 'shard', speed: 160, life: 0.5, size: 6, colors: ['#7fe3ff'], n: 14 }, impactSprite: { name: 'water', solid: null } },
  'storm-combo3': { text: 'Tia chớp', color: '#fff7b0', castBurst: { kind: 'spark', speed: 340, life: 0.2, size: 1.8, colors: ['#ffffff', '#fff7b0'], n: 18 }, impactSprite: { name: 'sparkMagic', solid: '#fff7b0' } },
  'storm-long': { text: 'Lôi trụ', color: '#fff7b0', castBurst: { kind: 'spark', speed: 360, life: 0.24, size: 2, colors: ['#ffffff'], n: 22 }, impactSprite: { name: 'circleSpark' } },
  'storm-fast': { text: 'Lôi bộ', color: '#ffe45c', castBurst: { kind: 'spark', speed: 300, life: 0.2, size: 1.6, colors: ['#ffe45c'], n: 14 }, impactSprite: { name: 'cutX', solid: '#ffe45c' } },
  'storm-combo6': { text: 'Xích lôi', color: '#e0c2ff', castBurst: { kind: 'orb', speed: 100, life: 0.5, size: 5, colors: ['#e0c2ff'], n: 10 }, impactSprite: { name: 'bigEnergyBall' } },
  'storm-execute': { text: 'Lôi phạt', color: '#fff7b0', castBurst: { kind: 'spark', speed: 380, life: 0.24, size: 2, colors: ['#ffffff', '#fff7b0'], n: 24 }, impactSprite: { name: 'slashCurved', solid: '#fff7b0' } },
  'storm-counter': { text: 'Phản lôi', color: '#e0c2ff', castBurst: { kind: 'spark', speed: 240, life: 0.3, size: 2, colors: ['#e0c2ff'], n: 14 }, impactSprite: { name: 'auraSprite', solid: '#e0c2ff' } },
  'earth-combo3': { text: 'Đá vụn', color: '#c9a36b', castBurst: { kind: 'shard', speed: 120, life: 0.5, size: 6, colors: ['#8a6a48'], n: 12 }, impactSprite: { name: 'rockB', solid: null } },
  'earth-long': { text: 'Gai đá', color: '#8a5a2a', castBurst: { kind: 'shard', speed: 130, life: 0.55, size: 6, colors: ['#8a5a2a'], n: 14 }, impactSprite: { name: 'rockSpike' } },
  'earth-fast': { text: 'Quyền đá', color: '#c9a36b', castBurst: { kind: 'shard', speed: 200, life: 0.3, size: 5, colors: ['#c9a36b'], n: 10 }, impactSprite: { name: 'claw', solid: '#c9a36b' } },
  'earth-combo6': { text: 'Mạch sống', color: '#9bd46a', castBurst: { kind: 'orb', speed: 80, life: 0.6, size: 4, colors: ['#9bd46a', '#fff4c2'], n: 12 }, impactSprite: { name: 'plant', solid: null } },
  'earth-execute': { text: 'Địa chấn', color: '#8a5a2a', castBurst: { kind: 'smoke', speed: 70, life: 0.8, size: 16, colors: ['#4a3a2a'], n: 10 }, impactSprite: { name: 'rockSpike' } },
  'earth-counter': { text: 'Giáp đá', color: '#c9a36b', castBurst: { kind: 'shard', speed: 100, life: 0.5, size: 5, colors: ['#c9a36b'], n: 10 }, impactSprite: { name: 'shieldYellow', solid: null } },
  'wind-combo3': { text: 'Gió lùa', color: '#bff7df', castBurst: { kind: 'orb', speed: 120, life: 0.5, size: 3.5, colors: ['#bff7df'], n: 12 }, impactSprite: { name: 'windLeaf' } },
  'wind-long': { text: 'Lốc cuốn', color: '#bff7df', castBurst: { kind: 'orb', speed: 140, life: 0.55, size: 4, colors: ['#ffffff', '#bff7df'], n: 16 }, impactSprite: { name: 'slashCircular', solid: '#bff7df' } },
  'wind-fast': { text: 'Phong tốc', color: '#effff7', castBurst: { kind: 'orb', speed: 160, life: 0.4, size: 3, colors: ['#effff7'], n: 12 }, impactSprite: { name: 'spiritDouble' } },
  'wind-combo6': { text: 'Cuồng phong', color: '#3fe8b0', castBurst: { kind: 'orb', speed: 130, life: 0.55, size: 4, colors: ['#3fe8b0'], n: 14 }, impactSprite: { name: 'slashCircular', solid: null } },
  'wind-execute': { text: 'Phong trảm', color: '#7fe8bd', castBurst: { kind: 'spark', speed: 260, life: 0.3, size: 2, colors: ['#7fe8bd'], n: 12 }, impactSprite: { name: 'slashCurved', solid: '#7fe8bd' } },
  'wind-counter': { text: 'Phản phong', color: '#7fe8bd', castBurst: { kind: 'orb', speed: 100, life: 0.5, size: 3.5, colors: ['#7fe8bd'], n: 10 }, impactSprite: { name: 'spiritDouble' } }
};

if (typeof module !== 'undefined') module.exports = { BOSS_SKILL_UNLOCK_LEVEL, BOSS_SKILL_PRIORITY, BOSS_SKILL_SLOTS, BOSS_SKILLS, BOSS_SKILL_FX };
