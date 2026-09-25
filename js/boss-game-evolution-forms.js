/* Game Pháp Sư Lexoria — dữ liệu 30 dạng tiến hoá, dữ liệu THUẦN, không hàm.
   Nguồn duyệt: plans/260925-0913-mage-lexoria-combat-depth-skills-evolution/reports/evolution-forms-proposal.md
   (đã APPROVED). formId khớp BOSS_EVO_FORMS[el] ở js/boss-progress-sync-merge.js (hợp đồng chỉ tiến — sửa id
   thì phải sửa CẢ HAI file, không bao giờ đổi tên/xoá id đã phát hành).
   Mỗi dạng: name (tên VN, đổi tự do), parent (formId cấp 8 hoặc '' nếu là dạng cấp 8), level (8|16),
   sprite/face (key BOSS_EVO_SPRITES ở js/boss-game-evolution-sprites.js), mods (1 modifier cộng thêm —
   dạng cấp 16 KHÔNG cộng dồn số của cha, số đã tính sẵn phần cấp 8), skillOverrides (slot → {name, effect} ghi
   đè TOÀN BỘ effect gốc của slot đó trong BOSS_SKILLS[el][slot] — slot hợp lệ: basic/combo3/long/fast/combo6/
   execute/counter, dạng cấp 8 không dùng counter vì slot đó mở ở cấp 10; name = tên chiêu SAU khi nâng cấp,
   dùng cho float text lúc niệm (js/boss-game-skill-fx.js) và Sổ chiêu (js/boss-game-skill-book-ui.js) — mỗi
   effect ghi đè PHẢI ≥ effect gốc theo từng primitive dùng chung (không bao giờ yếu hơn gốc, xem tests/
   boss-game-evolution.test.js), ultBonus (cộng vào hệ số chuỗi niệm sau bossChainFactor, chỉ dạng cấp 16 mới
   có, giá trị 0.25).
   Đổi sprite so với đề xuất gốc (đã kiểm tồn tại SpriteSheet.png + Faceset.png, kích thước khớp 64×112 / 38×38):
   - fire-b: RedNinja3 thay SamuraiRed (SamuraiRed dùng tên file lạ `redsamurai.png`, không đồng nhất).
   - wind-b2: OldMan3 thay NinjaMageBlack (NinjaMageBlack trùng khuôn pháp sư gốc nam, dễ nhầm là chưa tiến hoá). */

const BOSS_EVO = {
  fire: {
    'fire-a': {
      name: 'Hoả Nhẫn', parent: '', level: 8, sprite: 'evoFireA', face: 'evoFireAFace',
      mods: { dmgMul: 0.08 },
      skillOverrides: {
        long: { name: 'Đại hoả trụ', effect: { dmgMul: 2.0 } },
        combo3: { name: 'Tam hoả', effect: { extraHits: 2 } }
      },
      ultBonus: 0
    },
    'fire-a1': {
      name: 'Quỷ Hoả', parent: 'fire-a', level: 16, sprite: 'evoFireA1', face: 'evoFireA1Face',
      mods: { dmgMul: 0.12 },
      skillOverrides: {
        execute: { name: 'Luyện ngục', effect: { dmgMul: 1.9 } },
        combo6: { name: 'Biển lửa', effect: { burn: { dps: 8, sec: 4 } } }
      },
      ultBonus: 0.25
    },
    'fire-a2': {
      name: 'Quyền Hoả', parent: 'fire-a', level: 16, sprite: 'evoFireA2', face: 'evoFireA2Face',
      mods: { speedLoosen: 0.15 },
      skillOverrides: {
        fast: { name: 'Hoả quyền', effect: { crit: true, extraHits: 1 } },
        combo3: { name: 'Liên hoả quyền', effect: { extraHits: 2 } }
      },
      ultBonus: 0.25
    },
    'fire-b': {
      name: 'Hồng Liên Kiếm Sĩ', parent: '', level: 8, sprite: 'evoFireB', face: 'evoFireBFace',
      mods: { clockAdd: 0.75 },
      skillOverrides: {
        combo6: { name: 'Hoả thuẫn', effect: { burn: { dps: 10, sec: 3 }, shield: 1 } },
        execute: { name: 'Trảm hoả', effect: { dmgMul: 1.5, threatDrainMul: 1.5 } }
      },
      ultBonus: 0
    },
    'fire-b1': {
      name: 'Đấu Sĩ Hoả Khiên', parent: 'fire-b', level: 16, sprite: 'evoFireB1', face: 'evoFireB1Face',
      mods: { shield: 1 },
      skillOverrides: {
        counter: { name: 'Khiên phản hoả', effect: { threatDrainMul: 2, shield: 1 } },
        combo6: { name: 'Hoả thuẫn', effect: { burn: { dps: 10, sec: 3 }, shield: 1 } }
      },
      ultBonus: 0.25
    },
    'fire-b2': {
      name: 'Hoả Tăng', parent: 'fire-b', level: 16, sprite: 'evoFireB2', face: 'evoFireB2Face',
      mods: { maxHeartsAdd: 1 },
      skillOverrides: {
        combo6: { name: 'Niết bàn', effect: { burn: { dps: 10, sec: 3 }, heal: 1 } },
        long: { name: 'Hoả trụ trấn', effect: { dmgMul: 1.8, threatDrainMul: 1.5 } }
      },
      ultBonus: 0.25
    }
  },
  ice: {
    'ice-a': {
      name: 'Thuỷ Nhẫn', parent: '', level: 8, sprite: 'evoIceA', face: 'evoIceAFace',
      mods: { speedLoosen: 0.1 },
      skillOverrides: {
        fast: { name: 'Băng tiễn nhanh', effect: { crit: true, extraHits: 1 } },
        long: { name: 'Băng thương', effect: { dmgMul: 2.0 } }
      },
      ultBonus: 0
    },
    'ice-a1': {
      name: 'Ảnh Băng', parent: 'ice-a', level: 16, sprite: 'evoIceA1', face: 'evoIceA1Face',
      mods: { dmgMul: 0.12 },
      skillOverrides: {
        combo3: { name: 'Băng ảnh phân thân', effect: { extraHits: 2 } },
        execute: { name: 'Băng phong tuyệt sát', effect: { dmgMul: 1.9 } }
      },
      ultBonus: 0.25
    },
    'ice-a2': {
      name: 'Kiếm Sương', parent: 'ice-a', level: 16, sprite: 'evoIceA2', face: 'evoIceA2Face',
      mods: { speedLoosen: 0.15 },
      skillOverrides: {
        // freeze giữ ≥ gốc (sec 2) — thêm crit làm sát thương tăng thay cho dmgMul gốc (đổi primitive, không bớt freeze).
        fast: { name: 'Sương kiếm', effect: { crit: true, freeze: { sec: 2 } } },
        long: { name: 'Hàn băng trảm', effect: { dmgMul: 2.0, freeze: { sec: 2 } } }
      },
      ultBonus: 0.25
    },
    'ice-b': {
      name: 'Người Tuyết', parent: '', level: 8, sprite: 'evoIceB', face: 'evoIceBFace',
      mods: { clockAdd: 0.75 },
      skillOverrides: {
        // Gió tuyết: gốc combo3 = {freeze sec1.5, dmgMul1.2}; giữ NGUYÊN freeze gốc, nhích dmgMul lên chút để có
        // nâng cấp thật (không chỉ đổi tên) — không được bớt/hạ primitive nào của gốc.
        combo3: { name: 'Gió tuyết', effect: { freeze: { sec: 1.5 }, dmgMul: 1.25 } },
        // Bão tuyết: gốc combo6 = {shield 1} — giữ nguyên shield gốc, cộng thêm freeze+threatDrainMul (đổi chủ
        // đề từ "khiên" sang "khống chế" nhưng KHÔNG bớt shield của gốc).
        combo6: { name: 'Bão tuyết', effect: { shield: 1, freeze: { sec: 2.5 }, threatDrainMul: 1.5 } }
      },
      ultBonus: 0
    },
    'ice-b1': {
      name: 'Nhẫn Giả Tuyết', parent: 'ice-b', level: 16, sprite: 'evoIceB1', face: 'evoIceB1Face',
      mods: { clockAdd: 1.25 },
      skillOverrides: {
        // Phản băng: gốc counter = {freeze sec3, dmgMul1.4}; bản nâng cấp phải dài hơn 3s (nâng cấp thật ở dạng
        // cấp 16) và giữ nguyên dmgMul gốc, không được thấp hơn/thiếu primitive nào của gốc.
        counter: { name: 'Phản băng', effect: { freeze: { sec: 3.5 }, dmgMul: 1.4 } },
        // Vĩnh đông: gốc combo6 = {shield 1} — giữ nguyên shield gốc, cộng thêm freeze (không bớt shield của gốc).
        combo6: { name: 'Vĩnh đông', effect: { shield: 1, freeze: { sec: 3 } } }
      },
      ultBonus: 0.25
    },
    'ice-b2': {
      name: 'Hộ Vệ Băng', parent: 'ice-b', level: 16, sprite: 'evoIceB2', face: 'evoIceB2Face',
      mods: { shield: 1 },
      skillOverrides: {
        counter: { name: 'Băng giáp', effect: { shield: 1 } },
        combo6: { name: 'Thành băng', effect: { shield: 1, freeze: { sec: 2 } } }
      },
      ultBonus: 0.25
    }
  },
  storm: {
    'storm-a': {
      name: 'Lôi Nhẫn', parent: '', level: 8, sprite: 'evoStormA', face: 'evoStormAFace',
      mods: { speedLoosen: 0.1 },
      skillOverrides: {
        fast: { name: 'Lôi ảnh', effect: { crit: true, extraHits: 1 } },
        combo3: { name: 'Song lôi', effect: { extraHits: 1, crit: true } }
      },
      ultBonus: 0
    },
    'storm-a1': {
      name: 'Tia Chớp Vàng', parent: 'storm-a', level: 16, sprite: 'evoStormA1', face: 'evoStormA1Face',
      mods: { speedLoosen: 0.2 },
      skillOverrides: {
        fast: { name: 'Thiểm điện', effect: { crit: true, extraHits: 2 } },
        execute: { name: 'Lôi phạt', effect: { dmgMul: 1.5, crit: true } }
      },
      ultBonus: 0.25
    },
    'storm-a2': {
      name: 'Lôi Sư', parent: 'storm-a', level: 16, sprite: 'evoStormA2', face: 'evoStormA2Face',
      mods: { dmgMul: 0.12 },
      skillOverrides: {
        long: { name: 'Sư hống lôi', effect: { dmgMul: 2.0, crit: true } },
        combo6: { name: 'Xích lôi', effect: { extraHits: 3 } }
      },
      ultBonus: 0.25
    },
    'storm-b': {
      name: 'Người Máy Tích Điện', parent: '', level: 8, sprite: 'evoStormB', face: 'evoStormBFace',
      mods: { clockAdd: 0.75 },
      skillOverrides: {
        combo6: { name: 'Tụ điện', effect: { shield: 1, ultAdd: 1 } },
        long: { name: 'Xả điện', effect: { dmgMul: 1.8, threatDrainMul: 1.5 } }
      },
      ultBonus: 0
    },
    'storm-b1': {
      name: 'Hiệp Sĩ Sấm', parent: 'storm-b', level: 16, sprite: 'evoStormB1', face: 'evoStormB1Face',
      mods: { shield: 1 },
      skillOverrides: {
        counter: { name: 'Lôi phản', effect: { crit: true, shield: 1 } },
        combo6: { name: 'Tụ điện', effect: { shield: 1, ultAdd: 1 } }
      },
      ultBonus: 0.25
    },
    'storm-b2': {
      name: 'Tượng Lôi Thần', parent: 'storm-b', level: 16, sprite: 'evoStormB2', face: 'evoStormB2Face',
      mods: { maxHeartsAdd: 1 },
      skillOverrides: {
        counter: { name: 'Thần lôi trấn', effect: { threatDrainMul: 2.5 } },
        combo3: { name: 'Nạp lôi', effect: { ultAdd: 1 } }
      },
      ultBonus: 0.25
    }
  },
  earth: {
    'earth-a': {
      name: 'Mộc Nhẫn', parent: '', level: 8, sprite: 'evoEarthA', face: 'evoEarthAFace',
      mods: { dmgMul: 0.08 },
      skillOverrides: {
        long: { name: 'Thạch trụ', effect: { dmgMul: 2.0 } },
        execute: { name: 'Địa chấn', effect: { dmgMul: 1.8 } }
      },
      ultBonus: 0
    },
    'earth-a1': {
      name: 'Sư Tử Hang', parent: 'earth-a', level: 16, sprite: 'evoEarthA1', face: 'evoEarthA1Face',
      mods: { dmgMul: 0.12 },
      skillOverrides: {
        long: { name: 'Sơn băng', effect: { dmgMul: 2.2 } },
        combo6: { name: 'Loạn thạch', effect: { extraHits: 2 } }
      },
      ultBonus: 0.25
    },
    'earth-a2': {
      name: 'Quỷ Rừng', parent: 'earth-a', level: 16, sprite: 'evoEarthA2', face: 'evoEarthA2Face',
      mods: { speedLoosen: 0.15 },
      skillOverrides: {
        execute: { name: 'Rễ nuốt', effect: { dmgMul: 2.0 } },
        combo3: { name: 'Gai rừng', effect: { extraHits: 1, dmgMul: 1.5 } }
      },
      ultBonus: 0.25
    },
    'earth-b': {
      name: 'Thầy Cúng', parent: '', level: 8, sprite: 'evoEarthB', face: 'evoEarthBFace',
      mods: { clockAdd: 0.75 },
      skillOverrides: {
        combo6: { name: 'Bùa đá', effect: { shield: 1 } },
        combo3: { name: 'Rễ trói', effect: { threatDrainMul: 1.5 } }
      },
      ultBonus: 0
    },
    'earth-b1': {
      name: 'Sư Đá', parent: 'earth-b', level: 16, sprite: 'evoEarthB1', face: 'evoEarthB1Face',
      mods: { maxHeartsAdd: 1 },
      skillOverrides: {
        // Hồi xuân: gốc combo6 = {heal1, dmgMul1.3} — phải giữ cả hai, không bớt dmgMul của gốc.
        combo6: { name: 'Hồi xuân', effect: { heal: 1, dmgMul: 1.3 } },
        // Kim cang: gốc counter = {shield1}; cộng thêm heal 1 để thật sự mạnh hơn gốc (không chỉ hoà) — đúng
        // chủ đề Sư Đá: đã có combo6 heal, counter Kim cang thêm giáp+hồi.
        counter: { name: 'Kim cang', effect: { shield: 1, heal: 1 } }
      },
      ultBonus: 0.25
    },
    'earth-b2': {
      name: 'Tượng Đá', parent: 'earth-b', level: 16, sprite: 'evoEarthB2', face: 'evoEarthB2Face',
      mods: { shield: 1 },
      skillOverrides: {
        counter: { name: 'Thạch phản', effect: { threatDrainMul: 2.5, shield: 1 } },
        long: { name: 'Bàn thạch', effect: { dmgMul: 1.8, threatDrainMul: 1.5 } }
      },
      ultBonus: 0.25
    }
  },
  wind: {
    'wind-a': {
      name: 'Phong Nhẫn', parent: '', level: 8, sprite: 'evoWindA', face: 'evoWindAFace',
      mods: { speedLoosen: 0.1 },
      skillOverrides: {
        combo3: { name: 'Phong nhận', effect: { extraHits: 2 } },
        fast: { name: 'Tật phong', effect: { extraHits: 2 } }
      },
      ultBonus: 0
    },
    'wind-a1': {
      name: 'Thiên Cẩu', parent: 'wind-a', level: 16, sprite: 'evoWindA1', face: 'evoWindA1Face',
      mods: { dmgMul: 0.12 },
      skillOverrides: {
        combo6: { name: 'Thiên cẩu vũ', effect: { extraHits: 4 } },
        fast: { name: 'Cuồng phong', effect: { extraHits: 2, crit: true } }
      },
      ultBonus: 0.25
    },
    'wind-a2': {
      name: 'Ếch Phong', parent: 'wind-a', level: 16, sprite: 'evoWindA2', face: 'evoWindA2Face',
      mods: { speedLoosen: 0.2 },
      skillOverrides: {
        combo3: { name: 'Nhảy gió', effect: { extraHits: 2, ultAdd: 1 } },
        long: { name: 'Lốc xoáy dài', effect: { extraHits: 2, dmgMul: 1.4 } }
      },
      ultBonus: 0.25
    },
    'wind-b': {
      name: 'Phong Sư', parent: '', level: 8, sprite: 'evoWindB', face: 'evoWindBFace',
      mods: { clockAdd: 0.75 },
      skillOverrides: {
        combo3: { name: 'Gió lặng', effect: { threatDrainMul: 1.5 } },
        combo6: { name: 'Thổi tan', effect: { threatDrainMul: 2, ultAdd: 2 } }
      },
      ultBonus: 0
    },
    'wind-b1': {
      name: 'Lão Sư Gió', parent: 'wind-b', level: 16, sprite: 'evoWindB1', face: 'evoWindB1Face',
      mods: { clockAdd: 1.25 },
      skillOverrides: {
        counter: { name: 'Hoá giải', effect: { threatDrainMul: 3 } },
        // Tụ khí: gốc combo6 = {ultAdd2, dmgMul1.4} — phải giữ cả hai, không bớt dmgMul của gốc.
        combo6: { name: 'Tụ khí', effect: { ultAdd: 2, dmgMul: 1.4 } }
      },
      ultBonus: 0.25
    },
    'wind-b2': {
      name: 'Phù Thuỷ Mây Mù', parent: 'wind-b', level: 16, sprite: 'evoWindB2', face: 'evoWindB2Face',
      mods: { shield: 1 },
      skillOverrides: {
        combo6: { name: 'Màn mây', effect: { shield: 1, threatDrainMul: 2 } },
        counter: { name: 'Mây phản', effect: { ultAdd: 1, threatDrainMul: 2 } }
      },
      ultBonus: 0.25
    }
  }
};

if (typeof module !== 'undefined') module.exports = { BOSS_EVO };
