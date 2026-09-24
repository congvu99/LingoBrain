/* Game Pháp Sư Lexoria — DỮ LIỆU hiệu ứng phép (không có hàm). Mỗi preset:
     cast: [opts burst] tại đầu trượng lúc niệm xong
     projectile: {color, glow, size, speed (px/s), trail: opts burst mỗi khung} — quả cầu bay tới quái
     impact: [opts burst] tại quái lúc va chạm (event 'impact'), ring: màu sóng xung kích
     shake: rung màn (px), flash: loé (0..1), flashColor
     sprite: {proj (khoá BOSS_SPRITES gắn vào quả phép bay), impact ([khoá] — mỗi khoá spawn 1 VFX sprite một lượt
       tại quái lúc va chạm qua bossActorEvent; bậc 3 có thêm phần tử/lặp khoá để "to hơn" theo đúng bảng phase 4)}
   opts burst giữ đúng dạng js/game-particles.js: {kind, a, spread, speed, life, size, colors, drag, g}.
   kind: 'spark' (vệt sáng, cộng màu), 'orb' (chấm tròn phát sáng), 'shard' (mảnh xoay), 'smoke' (khói mờ).
   Bậc thiếu preset → BOSS_SPELL_FALLBACK: dùng preset bậc base phóng to scale (bản cắt khẩn cấp vẫn chạy đủ bậc). */

const BOSS_ELEMENT_COLOR = { fire: '#ff7a2f', ice: '#7fe3ff', storm: '#ffe45c', earth: '#9bd46a', wind: '#bff7df' };
/* Màu trận đồ bậc 3 theo đúng chữ trong bảng thiết kế (đỏ/xanh/tím/nâu/ngọc — khác màu hệ gốc để nổi bật);
   trận đồ giờ là sprite magicCircle tô màu này (opt.solid, boss-game-sprite-atlas.js), thay hình vẽ tay cũ. */
const BOSS_TIER3_CIRCLE_COLOR = { fire: '#ff2d2d', ice: '#4fd3ff', storm: '#b06bff', earth: '#8a5a2a', wind: '#3fe8b0' };

const BOSS_SPELL_FALLBACK = { 2: { base: 1, scale: 1.4 }, 3: { base: 1, scale: 1.9 } };

const BOSS_SPELL_PRESETS = {
  fire: {
    1: {
      cast: [{ kind: 'spark', speed: 160, life: 0.35, size: 2, colors: ['#ffd27a', '#ff7a2f'], n: 14 }],
      projectile: { color: '#ff9a3c', glow: '#ff5a1f', size: 9, speed: 900,
        trail: { kind: 'orb', speed: 30, life: 0.35, size: 5, colors: ['#ffb347', '#ff5a1f'], drag: 3, g: -60, n: 2 } },
      impact: [
        { kind: 'spark', speed: 360, life: 0.5, size: 2.4, colors: ['#fff1b0', '#ffb347', '#ff5a1f'], n: 30 },
        { kind: 'smoke', speed: 60, life: 0.9, size: 22, colors: ['#5a3a2a'], drag: 1.4, g: -30, n: 6 }
      ],
      ring: '#ffb347', shake: 5, flash: 0.14, flashColor: '#ffcf8a',
      sprite: { proj: 'fireball', impact: ['flam', 'explosion'] }
    },
    2: {   // Cầu lửa xoáy — nổ vòng lửa
      cast: [{ kind: 'spark', a: 0, spread: 6.283, speed: 220, life: 0.4, size: 2.6, colors: ['#ffe08a', '#ff7a2f', '#ff3d1f'], n: 22 }],
      projectile: { color: '#ff6a1f', glow: '#ff3d0f', size: 13, speed: 760,
        trail: { kind: 'orb', speed: 40, life: 0.4, size: 6, colors: ['#ffcf6a', '#ff5a1f'], drag: 2.4, g: -60, n: 3 } },
      impact: [
        { kind: 'spark', speed: 460, life: 0.6, size: 2.8, colors: ['#fff1b0', '#ffb347', '#ff5a1f', '#ff2d0f'], n: 46 },
        { kind: 'smoke', speed: 80, life: 1.1, size: 28, colors: ['#5a3a2a'], drag: 1.3, g: -34, n: 9 }
      ],
      ring: '#ff8a3c', shake: 7, flash: 0.2, flashColor: '#ffcf8a',
      sprite: { proj: 'fireball', impact: ['flam', 'explosion'] }
    },
    3: {   // Trận đồ đỏ dưới chân → thiên thạch rơi, rung màn
      cast: [{ kind: 'spark', a: 0, spread: 6.283, speed: 100, life: 0.6, size: 2.2, colors: ['#ff2d2d', '#ffb347'], n: 16 }],
      projectile: { color: '#ff5a1f', glow: '#ff1f0f', size: 15, speed: 640,
        trail: { kind: 'smoke', speed: 30, life: 0.5, size: 10, colors: ['#ff8a3c'], drag: 1.6, g: -50, n: 2 } },
      impact: [
        { kind: 'spark', speed: 560, life: 0.75, size: 3.2, colors: ['#fff1b0', '#ffb347', '#ff5a1f', '#ff1f0f'], n: 70 },
        { kind: 'shard', speed: 320, life: 1, size: 8, colors: ['#3a2418', '#5a3a2a'], drag: 0.9, g: 380, n: 20 },
        { kind: 'smoke', speed: 90, life: 1.4, size: 36, colors: ['#241610'], drag: 1.1, g: -20, n: 12 }
      ],
      ring: '#ff5a1f', shake: 14, flash: 0.4, flashColor: '#ffcf8a',
      circle: BOSS_TIER3_CIRCLE_COLOR.fire,
      sprite: { proj: 'fireball', impact: ['flam', 'explosion', 'explosion'] }   // ×2 nổ theo bảng phase 4
    }
  },
  ice: {
    1: {
      cast: [{ kind: 'shard', speed: 120, life: 0.4, size: 5, colors: ['#e6fbff', '#7fe3ff'], n: 10 }],
      projectile: { color: '#bff4ff', glow: '#3fc6ff', size: 8, speed: 820,
        trail: { kind: 'orb', speed: 20, life: 0.4, size: 4, colors: ['#e6fbff', '#7fe3ff'], drag: 3, n: 2 } },
      impact: [
        { kind: 'shard', speed: 300, life: 0.8, size: 7, colors: ['#ffffff', '#bff4ff', '#7fe3ff'], drag: 1.2, g: 220, n: 18 },
        { kind: 'spark', speed: 240, life: 0.35, size: 1.8, colors: ['#e6fbff'], n: 14 }
      ],
      ring: '#bff4ff', shake: 4, flash: 0.12, flashColor: '#dff8ff',
      sprite: { proj: 'iceSpikeProj', impact: ['iceFlake'] }
    },
    2: {   // Giáo băng xuyên — sương lan
      cast: [{ kind: 'shard', speed: 180, life: 0.5, size: 7, colors: ['#ffffff', '#e6fbff', '#7fe3ff'], n: 16 }],
      projectile: { color: '#dff8ff', glow: '#3fc6ff', size: 11, speed: 1000,
        trail: { kind: 'orb', speed: 26, life: 0.5, size: 5, colors: ['#e6fbff', '#7fe3ff'], drag: 2.6, n: 3 } },
      impact: [
        { kind: 'shard', speed: 380, life: 1, size: 9, colors: ['#ffffff', '#bff4ff', '#3fc6ff'], drag: 1.1, g: 260, n: 26 },
        { kind: 'smoke', speed: 50, life: 1.1, size: 24, colors: ['#cdeffc'], drag: 1.6, g: -20, n: 8 }
      ],
      ring: '#7fe3ff', shake: 5, flash: 0.16, flashColor: '#dff8ff',
      sprite: { proj: 'iceSpikeProj', impact: ['iceFlake'] }
    },
    3: {   // Trận đồ xanh → cột băng trồi dưới quái, vỡ vụn
      cast: [{ kind: 'shard', speed: 90, life: 0.6, size: 5, colors: ['#4fd3ff', '#e6fbff'], n: 14 }],
      projectile: { color: '#bff4ff', glow: '#4fd3ff', size: 12, speed: 880,
        trail: { kind: 'orb', speed: 18, life: 0.5, size: 4, colors: ['#e6fbff'], drag: 2.8, n: 2 } },
      impact: [
        { kind: 'shard', speed: 460, life: 1.2, size: 11, colors: ['#ffffff', '#bff4ff', '#4fd3ff', '#1f9fdb'], drag: 0.9, g: 300, n: 34 },
        { kind: 'smoke', speed: 60, life: 1.3, size: 30, colors: ['#cdeffc'], drag: 1.4, g: -22, n: 10 }
      ],
      ring: '#4fd3ff', shake: 10, flash: 0.22, flashColor: '#dff8ff',
      circle: BOSS_TIER3_CIRCLE_COLOR.ice,
      sprite: { proj: 'iceSpikeProj', impact: ['iceFlake', 'icePillar'] }   // cột băng theo bảng phase 4
    }
  },
  storm: {
    1: {
      cast: [{ kind: 'spark', speed: 260, life: 0.2, size: 1.6, colors: ['#fff7b0', '#ffe45c'], n: 16 }],
      projectile: { color: '#fffbd6', glow: '#ffe45c', size: 6, speed: 1400,
        trail: { kind: 'spark', speed: 120, life: 0.15, size: 1.4, colors: ['#fff7b0'], n: 2 } },
      impact: [
        { kind: 'spark', speed: 480, life: 0.3, size: 2, colors: ['#ffffff', '#fff7b0', '#ffe45c'], n: 34 },
        { kind: 'orb', speed: 90, life: 0.4, size: 6, colors: ['#fff7b0'], drag: 4, n: 6 }
      ],
      ring: '#fff7b0', shake: 6, flash: 0.22, flashColor: '#fffbe0',
      sprite: { proj: 'energyBallProj', impact: ['thunder'] }
    },
    2: {   // Sét đánh từ trời xuống
      cast: [{ kind: 'spark', speed: 320, life: 0.24, size: 1.8, colors: ['#ffffff', '#fff7b0'], n: 22 }],
      projectile: { color: '#ffffff', glow: '#ffe45c', size: 8, speed: 1700,
        trail: { kind: 'spark', speed: 160, life: 0.16, size: 1.6, colors: ['#fff7b0', '#ffffff'], n: 3 } },
      impact: [
        { kind: 'spark', speed: 560, life: 0.36, size: 2.4, colors: ['#ffffff', '#fff7b0', '#ffe45c'], n: 48 },
        { kind: 'orb', speed: 110, life: 0.5, size: 7, colors: ['#fff7b0'], drag: 3.6, n: 8 }
      ],
      ring: '#ffffff', shake: 9, flash: 0.32, flashColor: '#fffbe0', bolt: true,
      sprite: { proj: 'energyBallProj', impact: ['thunder'] }
    },
    3: {   // Trận đồ tím → bão sét nhiều tia, loé trắng màn
      cast: [{ kind: 'spark', speed: 260, life: 0.3, size: 1.8, colors: ['#e0c2ff', '#b06bff'], n: 18 }],
      projectile: { color: '#ffffff', glow: '#e0c2ff', size: 9, speed: 1800,
        trail: { kind: 'spark', speed: 180, life: 0.16, size: 1.8, colors: ['#ffffff'], n: 3 } },
      impact: [
        { kind: 'spark', speed: 640, life: 0.42, size: 2.8, colors: ['#ffffff', '#e0c2ff', '#b06bff'], n: 64 },
        { kind: 'orb', speed: 140, life: 0.55, size: 8, colors: ['#e0c2ff'], drag: 3.2, n: 10 }
      ],
      ring: '#ffffff', shake: 13, flash: 0.55, flashColor: '#ffffff', bolt: true,
      circle: BOSS_TIER3_CIRCLE_COLOR.storm,
      sprite: { proj: 'energyBallProj', impact: ['thunder', 'thunder', 'thunder'] }   // chuỗi ×3 theo bảng phase 4
    }
  },
  earth: {
    1: {
      cast: [{ kind: 'shard', speed: 100, life: 0.45, size: 5, colors: ['#b58a5a', '#9bd46a'], g: 200, n: 10 }],
      projectile: { color: '#b58a5a', glow: '#6fae3f', size: 11, speed: 700,
        trail: { kind: 'smoke', speed: 20, life: 0.4, size: 7, colors: ['#8a6a48'], drag: 2, n: 1 } },
      impact: [
        { kind: 'shard', speed: 280, life: 0.9, size: 9, colors: ['#8a6a48', '#b58a5a', '#6fae3f'], drag: 0.8, g: 420, n: 16 },
        { kind: 'smoke', speed: 70, life: 1, size: 26, colors: ['#6b5540'], drag: 1.3, n: 6 }
      ],
      ring: '#c9a36b', shake: 8, flash: 0.1, flashColor: '#e8d6b0',
      sprite: { proj: 'rockProj', impact: ['rockImpact'] }
    },
    2: {   // Khối đá bay xoay
      cast: [{ kind: 'shard', speed: 140, life: 0.5, size: 7, colors: ['#8a6a48', '#9bd46a'], g: 220, n: 14 }],
      projectile: { color: '#8a6a48', glow: '#6fae3f', size: 16, speed: 620,
        trail: { kind: 'smoke', speed: 24, life: 0.5, size: 9, colors: ['#6b5540'], drag: 1.8, n: 2 } },
      impact: [
        { kind: 'shard', speed: 360, life: 1.1, size: 12, colors: ['#6b5540', '#8a6a48', '#9bd46a'], drag: 0.7, g: 460, n: 22 },
        { kind: 'smoke', speed: 90, life: 1.2, size: 30, colors: ['#5a4735'], drag: 1.2, n: 8 }
      ],
      ring: '#b58a5a', shake: 11, flash: 0.12, flashColor: '#e8d6b0',
      sprite: { proj: 'rockProj', impact: ['rockImpact'] }
    },
    3: {   // Trận đồ nâu → gai đá mọc quanh quái, bụi mù
      cast: [{ kind: 'shard', speed: 90, life: 0.6, size: 5, colors: ['#8a5a2a', '#c9a36b'], g: 180, n: 12 }],
      projectile: { color: '#8a5a2a', glow: '#c9a36b', size: 18, speed: 560,
        trail: { kind: 'smoke', speed: 20, life: 0.6, size: 12, colors: ['#5a4735'], drag: 1.6, n: 2 } },
      impact: [
        { kind: 'shard', speed: 420, life: 1.3, size: 14, colors: ['#5a4735', '#8a5a2a', '#c9a36b'], drag: 0.6, g: 500, n: 30 },
        { kind: 'smoke', speed: 110, life: 1.5, size: 40, colors: ['#4a3a2a'], drag: 1, n: 14 }
      ],
      ring: '#8a5a2a', shake: 15, flash: 0.14, flashColor: '#e8d6b0',
      circle: BOSS_TIER3_CIRCLE_COLOR.earth,
      sprite: { proj: 'rockProj', impact: ['rockImpact', 'rockSpike'] }   // gai đá theo bảng phase 4
    }
  },
  wind: {
    1: {
      cast: [{ kind: 'orb', speed: 140, life: 0.45, size: 3, colors: ['#ffffff', '#bff7df'], n: 12 }],
      projectile: { color: '#effff7', glow: '#7fe8bd', size: 8, speed: 1000,
        trail: { kind: 'orb', speed: 60, life: 0.5, size: 3, colors: ['#ffffff', '#bff7df'], drag: 2.5, n: 2 } },
      impact: [
        { kind: 'orb', speed: 320, life: 0.7, size: 3.5, colors: ['#ffffff', '#bff7df', '#7fe8bd'], drag: 1.8, n: 26 },
        { kind: 'spark', speed: 220, life: 0.35, size: 1.6, colors: ['#effff7'], n: 12 }
      ],
      ring: '#bff7df', shake: 4, flash: 0.1, flashColor: '#eafff6',
      sprite: { proj: 'spiritProj', impact: ['smokeCircular', 'windLeaf'] }
    },
    2: {   // Vòi rồng nhỏ cuốn quái
      cast: [{ kind: 'orb', speed: 200, life: 0.5, size: 3.4, colors: ['#ffffff', '#bff7df', '#7fe8bd'], n: 18 }],
      projectile: { color: '#effff7', glow: '#7fe8bd', size: 11, speed: 1150,
        trail: { kind: 'orb', speed: 80, life: 0.55, size: 4, colors: ['#ffffff', '#bff7df'], drag: 2.2, n: 3 } },
      impact: [
        { kind: 'orb', speed: 420, life: 0.9, size: 4, colors: ['#ffffff', '#bff7df', '#7fe8bd'], drag: 1.5, n: 36 },
        { kind: 'spark', speed: 280, life: 0.4, size: 1.8, colors: ['#effff7'], n: 16 }
      ],
      ring: '#7fe8bd', shake: 5, flash: 0.12, flashColor: '#eafff6',
      sprite: { proj: 'spiritProj', impact: ['smokeCircular', 'windLeaf'] }
    },
    3: {   // Trận đồ ngọc → lốc lớn nâng quái rồi quật xuống
      cast: [{ kind: 'orb', speed: 160, life: 0.6, size: 3.6, colors: ['#3fe8b0', '#ffffff'], n: 16 }],
      projectile: { color: '#effff7', glow: '#3fe8b0', size: 12, speed: 1100,
        trail: { kind: 'orb', speed: 60, life: 0.6, size: 4.5, colors: ['#ffffff', '#3fe8b0'], drag: 2, n: 3 } },
      impact: [
        { kind: 'orb', speed: 520, life: 1.1, size: 4.5, colors: ['#ffffff', '#bff7df', '#3fe8b0'], drag: 1.2, n: 48 },
        { kind: 'spark', speed: 340, life: 0.5, size: 2, colors: ['#effff7'], n: 20 }
      ],
      ring: '#3fe8b0', shake: 9, flash: 0.16, flashColor: '#eafff6',
      circle: BOSS_TIER3_CIRCLE_COLOR.wind,
      sprite: { proj: 'spiritProj', impact: ['smokeCircular', 'smokeCircular', 'windLeaf', 'windLeaf'] }   // ×2 xoáy theo bảng phase 4
    }
  }
};

/* Hiệu ứng chung không theo hệ */
const BOSS_FX_COMMON = {
  rune: { kind: 'orb', speed: 50, life: 0.5, size: 3, colors: ['#ffe9a8'], drag: 3, n: 5 },          // mỗi chữ đúng
  typo: { kind: 'spark', speed: 140, life: 0.25, size: 1.8, colors: ['#ff5a5a', '#ffb0b0'], n: 8 },   // chữ sai
  fizzle: { kind: 'smoke', speed: 60, life: 0.8, size: 12, colors: ['#6a6380'], drag: 1.5, g: -40, n: 10 },
  bossHit: { kind: 'spark', speed: 300, life: 0.45, size: 2.2, colors: ['#ff4d6d', '#ffb3c1'], n: 22 }, // trùm đánh pháp sư
  shield: { kind: 'shard', speed: 220, life: 0.6, size: 6, colors: ['#c9a36b', '#9bd46a'], drag: 1.2, n: 14 },
  shieldPop: { kind: 'spark', speed: 260, life: 0.3, size: 1.8, colors: ['#e8d6b0', '#c9a36b'], n: 12 },   // khiên vỡ (thêm vào shield)
  fastCrit: { kind: 'spark', speed: 260, life: 0.2, size: 1.6, colors: ['#ffffff', '#ffe45c'], n: 10 },     // đòn chí mạng (Sét)
  hint: { kind: 'shard', speed: 60, life: 0.9, size: 3.5, colors: ['#bff7df', '#eafff6'], g: 40, drag: 1.2, n: 6 },       // gợi ý chữ (Gió) — lá bay
  typoForgiven: { kind: 'orb', speed: 90, life: 0.6, size: 3, colors: ['#eafff6', '#bff7df'], drag: 1.5, n: 10 },        // gió lướt tha lỗi gõ sai
  unfreeze: { kind: 'shard', speed: 260, life: 0.6, size: 6, colors: ['#ffffff', '#bff4ff', '#7fe3ff'], drag: 1.1, g: 200, n: 20 }   // băng vỡ
};

/* Dữ liệu tuyệt kỹ (js/boss-game-tier3-ultimate-fx.js vẽ) — name = tên hiện giữa màn cắt cảnh; sprite = VFX chính
   (khoá BOSS_SPRITES); hits = số quả/đòn rời rạc (0 = chỉ 1 hiệu ứng tĩnh, không phóng nhiều quả) */
const BOSS_ULTIMATE_PRESETS = {
  meteor: { name: 'Mưa Sao Băng', color: '#ff5a1f', shake: 16, flash: 0.5, hits: 4, sprite: 'fireball', bigSprite: 'explosion' },
  iceAge: { name: 'Kỷ Băng Hà', color: '#4fd3ff', shake: 4, flash: 0.3, hits: 0, sprite: 'icePillar' },
  chain: { name: 'Xích Sét', color: '#b06bff', shake: 12, flash: 0.5, hits: 3, sprite: 'thunder' },
  revive: { name: 'Hồi Sinh', color: '#ffe08a', shake: 0, flash: 0.35, hits: 0, sprite: 'boost' },
  tornado: { name: 'Lốc Xoáy', color: '#3fe8b0', shake: 10, flash: 0.2, hits: 0, sprite: 'smokeCircular' }
};
