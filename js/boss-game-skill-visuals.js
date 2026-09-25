/* Game Pháp Sư Lexoria — DỮ LIỆU hình riêng 30 chiêu đặc biệt (5 hệ × 6 slot, không gồm basic — basic giữ
   nguyên preset hệ×bậc, xem js/boss-game-spell-presets.js). Thuần, KHÔNG có hàm (được phép vượt 200 dòng —
   plan.md "Ràng buộc chung"). Nguồn: plans/260925-1445-…/phase-02-…, bảng đề xuất đã điều chỉnh theo sprite đo
   thật ở js/boss-game-extra-sprites.js + js/boss-game-sprite-atlas.js (giữ luật: không trùng (proj, motion,
   impact[0]) trong cùng hệ; mỗi khoá sprite ≤2 lần/hệ; bỏ hẳn kiểu 'solid' tô một màu).

   BOSS_SKILL_VISUALS[skillId] = {
     proj: khoá BOSS_SPRITES cho đạn bay (null = không có đạn riêng, rơi về quả cầu màu mặc định theo preset hệ),
     motion: 1 trong BOSS_MOTIONS (js/boss-game-skill-motion.js),
     shots: SỐ quả trang trí khi bay (tuỳ chọn — mặc định = e.hits thật; dùng khi muốn nhìn nhiều quả dù cơ chế
       chỉ 1 đòn, ví dụ fan 3 quả cho chiêu không có extraHits; KHÔNG đổi sát thương, chỉ đổi số vẽ),
     cast: [khoá sprite] hiện lúc niệm cạnh pháp sư (ngoài castBurst hạt ở BOSS_SKILL_FX) — thường rỗng, chỉ
       dùng cho chiêu motion 'ground' (không có vật bay ra khỏi tay, cần dấu hiệu đang niệm),
     impact: [khoá sprite] thay preset hệ×bậc lúc phép CHẠM quái (bossActorEvent 'impact', boss-game-sprite-actors.js);
       nhiều khoá = nhiều lớp vẽ lệch nhẹ vị trí/độ trễ (xem bossActorEvent),
     scale: hệ số nhân thêm vào cỡ VFX va chạm (1 = như preset gốc)
   }
   BOSS_EVO_SKILL_VISUALS[skillId] (phase 3) — 1 bản nâng cấp mỗi chiêu (không theo từng dạng tiến hoá riêng,
   xem plan.md Session 1 "Quyết định"): chỉ khai cho skillId có slot bị GHI ĐÈ trong ≥1 dạng của BOSS_EVO
   (js/boss-game-evolution-forms.js) — vd fire-a override slot combo3 → cần mục 'fire-combo3'.
     { extends: true, scale, addImpact: [khoá sprite] } = kế thừa proj/motion/cast/impact CỦA BẢN GỐC, nhân
       thêm `scale` và nối `addImpact` vào cuối mảng impact (bossSkillVisualFor, js/boss-game-skill-motion.js).
     Hoặc schema ĐẦY ĐỦ như BOSS_SKILL_VISUALS (không có extends) = thay HẲN bản gốc. */

const BOSS_SKILL_VISUALS = {
  // ---- Lửa ----
  'fire-combo3': { proj: 'fireball', motion: 'fan', cast: [], impact: ['flam'], scale: 1 },
  'fire-long': { proj: null, motion: 'ground', cast: ['magicCircle'], impact: ['flam', 'explosion'], scale: 1.3 },
  'fire-fast': { proj: 'shurikenMagic', motion: 'straight', cast: [], impact: ['sparkMagic'], scale: 0.9 },
  'fire-combo6': { proj: null, motion: 'ground', cast: [], impact: ['magicCircle', 'particleFire'], scale: 1.1 },
  'fire-execute': { proj: 'fireball', motion: 'sky', cast: [], impact: ['explosion', 'smoke'], scale: 1.4 },
  'fire-counter': { proj: 'shurikenMagic', motion: 'spin', cast: [], impact: ['slashDoubleCurved'], scale: 1 },
  // ---- Băng ----
  'ice-combo3': { proj: 'iceSpikeProj', motion: 'fan', shots: 3, cast: [], impact: ['iceFlakeB'], scale: 1 },
  'ice-long': { proj: null, motion: 'ground', cast: ['magicCircle'], impact: ['icePillar'], scale: 1.3 },
  'ice-fast': { proj: null, motion: 'straight', cast: [], impact: ['cutX'], scale: 0.9 },
  'ice-combo6': { proj: null, motion: 'ground', cast: [], impact: ['shieldSprite', 'iceFlake'], scale: 1 },
  'ice-execute': { proj: 'iceSpikeProj', motion: 'sky', cast: [], impact: ['waterPillar', 'iceFlakeB'], scale: 1.3 },
  'ice-counter': { proj: null, motion: 'straight', cast: [], impact: ['water'], scale: 1 },
  // ---- Sét ----
  'storm-combo3': { proj: 'energyBallProj', motion: 'straight', cast: [], impact: ['sparkMagic'], scale: 0.9 },
  'storm-long': { proj: null, motion: 'sky', cast: [], impact: ['thunder', 'circleSpark'], scale: 1.3 },
  'storm-fast': { proj: 'kunai', motion: 'straight', cast: [], impact: ['cut'], scale: 1 },
  'storm-combo6': { proj: 'energyBallProj', motion: 'fan', cast: [], impact: ['circleSpark2'], scale: 1 },
  'storm-execute': { proj: null, motion: 'sky', cast: [], impact: ['bigEnergyBall', 'thunder'], scale: 1.4 },
  'storm-counter': { proj: 'bigEnergyBall', motion: 'straight', cast: [], impact: ['circleSpark2'], scale: 1.1 },
  // ---- Đất ----
  'earth-combo3': { proj: 'rockProj', motion: 'fan', shots: 3, cast: [], impact: ['rockB'], scale: 1 },
  'earth-long': { proj: null, motion: 'ground', cast: [], impact: ['rockSpike'], scale: 1.3 },
  'earth-fast': { proj: 'rockProj', motion: 'straight', cast: [], impact: ['claw'], scale: 1 },
  'earth-combo6': { proj: null, motion: 'ground', cast: [], impact: ['plant', 'plantB'], scale: 1 },
  'earth-execute': { proj: null, motion: 'sky', cast: [], impact: ['rockImpact', 'rockSpike'], scale: 1.4 },
  'earth-counter': { proj: null, motion: 'straight', cast: [], impact: ['shieldYellow'], scale: 1 },
  // ---- Gió ----
  'wind-combo3': { proj: 'spiritProj', motion: 'spin', cast: [], impact: ['windLeaf'], scale: 0.9 },
  'wind-long': { proj: 'bigShuriken', motion: 'spin', cast: [], impact: ['slashCircular'], scale: 1.2 },
  'wind-fast': { proj: null, motion: 'straight', cast: [], impact: ['slash01'], scale: 1 },
  'wind-combo6': { proj: 'spiritBlue', motion: 'fan', shots: 3, cast: [], impact: ['slashMulti'], scale: 1.1 },
  'wind-execute': { proj: null, motion: 'straight', cast: [], impact: ['slashArc', 'slash03'], scale: 1.3 },
  'wind-counter': { proj: 'spiritProj', motion: 'spin', cast: [], impact: ['spiritDouble', 'smokeCircular'], scale: 1 }
};

/* skillId nào cần mục ở đây = suy từ BOSS_EVO_FORMS thật sự (tests/boss-game-skill-visuals.test.js kiểm đủ) —
   danh sách slot bị ghi đè theo hệ (grep BOSS_EVO, js/boss-game-evolution-forms.js):
     fire: long,combo3,execute,combo6,fast,counter (đủ 6) · ice: fast,long,combo3,execute,combo6,counter (đủ 6)
     storm: fast,combo3,execute,long,combo6,counter (đủ 6) · earth: long,execute,combo6,combo3,counter (5, KHÔNG fast)
     wind: combo3,fast,combo6,long,counter (5, KHÔNG execute) */
// review H2: chỉ 1 particle nhỏ (vfx 0.12–0.2, ×scale 1.15 thường không đổi số nguyên sau Math.round ở bossVfxScale)
// gần như vô hình, đặc biệt trước khi có fix C1 (trước đó "nổi bật" chỉ vì nó KHÔNG BAO GIỜ bị gỡ). Giờ thêm hẳn
// một LỚP MỚI 'circleWhite' (32×32, vfx .5 — không có ở bản gốc) bên cạnh particle hệ, để dạng tiến hoá luôn có
// thêm một vòng sáng rõ rệt dưới chân quái, không phụ thuộc làm tròn scale.
const BOSS_EVO_SKILL_VISUALS = {
  'fire-combo3': { extends: true, scale: 1.15, addImpact: ['particleFire', 'circleWhite'] },
  'fire-long': { extends: true, scale: 1.3, addImpact: ['particleFire', 'circleWhite'] },
  'fire-fast': { extends: true, scale: 1.15, addImpact: ['particleFire', 'circleWhite'] },
  'fire-combo6': { extends: true, scale: 1.2, addImpact: ['particleFire', 'circleWhite'] },
  'fire-execute': { extends: true, scale: 1.35, addImpact: ['particleFire', 'circleWhite'] },
  'fire-counter': { extends: true, scale: 1.15, addImpact: ['particleFire', 'circleWhite'] },
  'ice-combo3': { extends: true, scale: 1.15, addImpact: ['particleSnow', 'circleWhite'] },
  'ice-long': { extends: true, scale: 1.3, addImpact: ['particleSnow', 'circleWhite'] },
  'ice-fast': { extends: true, scale: 1.15, addImpact: ['particleSnow', 'circleWhite'] },
  'ice-combo6': { extends: true, scale: 1.2, addImpact: ['particleSnow', 'circleWhite'] },
  'ice-execute': { extends: true, scale: 1.35, addImpact: ['particleSnow', 'circleWhite'] },
  'ice-counter': { extends: true, scale: 1.15, addImpact: ['particleSnow', 'circleWhite'] },
  'storm-combo3': { extends: true, scale: 1.15, addImpact: ['circleSpark2', 'circleWhite'] },
  'storm-long': { extends: true, scale: 1.3, addImpact: ['circleSpark2', 'circleWhite'] },
  'storm-fast': { extends: true, scale: 1.15, addImpact: ['circleSpark2', 'circleWhite'] },
  'storm-combo6': { extends: true, scale: 1.2, addImpact: ['circleSpark2', 'circleWhite'] },
  'storm-execute': { extends: true, scale: 1.35, addImpact: ['circleSpark2', 'circleWhite'] },
  'storm-counter': { extends: true, scale: 1.15, addImpact: ['circleSpark2', 'circleWhite'] },
  'earth-combo3': { extends: true, scale: 1.15, addImpact: ['particleRockGray', 'circleWhite'] },
  'earth-long': { extends: true, scale: 1.3, addImpact: ['particleRockGray', 'circleWhite'] },
  'earth-combo6': { extends: true, scale: 1.2, addImpact: ['particleRockGray', 'circleWhite'] },
  'earth-execute': { extends: true, scale: 1.35, addImpact: ['particleRockGray', 'circleWhite'] },
  'earth-counter': { extends: true, scale: 1.15, addImpact: ['particleRockGray', 'circleWhite'] },
  'wind-combo3': { extends: true, scale: 1.15, addImpact: ['particleLeafPink', 'circleWhite'] },
  'wind-long': { extends: true, scale: 1.3, addImpact: ['particleLeafPink', 'circleWhite'] },
  'wind-fast': { extends: true, scale: 1.15, addImpact: ['particleLeafPink', 'circleWhite'] },
  'wind-combo6': { extends: true, scale: 1.2, addImpact: ['particleLeafPink', 'circleWhite'] },
  'wind-counter': { extends: true, scale: 1.15, addImpact: ['particleLeafPink', 'circleWhite'] }
};

if (typeof module !== 'undefined') module.exports = { BOSS_SKILL_VISUALS, BOSS_EVO_SKILL_VISUALS };
