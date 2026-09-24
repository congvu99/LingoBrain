/* Game Pháp Sư Lexoria — DỮ LIỆU hiệu ứng phép (không có hàm). Mỗi preset:
     cast: [opts burst] tại đầu trượng lúc niệm xong
     projectile: {color, glow, size, speed (px/s), trail: opts burst mỗi khung} — quả cầu bay tới quái
     impact: [opts burst] tại quái lúc va chạm (event 'impact'), ring: màu sóng xung kích
     shake: rung màn (px), flash: loé (0..1), flashColor
   opts burst giữ đúng dạng js/game-particles.js: {kind, a, spread, speed, life, size, colors, drag, g}.
   kind: 'spark' (vệt sáng, cộng màu), 'orb' (chấm tròn phát sáng), 'shard' (mảnh xoay), 'smoke' (khói mờ).
   Bậc thiếu preset → BOSS_SPELL_FALLBACK: dùng preset bậc base phóng to scale (bản cắt khẩn cấp vẫn chạy đủ bậc). */

const BOSS_ELEMENT_COLOR = { fire: '#ff7a2f', ice: '#7fe3ff', storm: '#ffe45c', earth: '#9bd46a', wind: '#bff7df' };

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
      ring: '#ffb347', shake: 5, flash: 0.14, flashColor: '#ffcf8a'
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
      ring: '#bff4ff', shake: 4, flash: 0.12, flashColor: '#dff8ff'
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
      ring: '#fff7b0', shake: 6, flash: 0.22, flashColor: '#fffbe0'
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
      ring: '#c9a36b', shake: 8, flash: 0.1, flashColor: '#e8d6b0'
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
      ring: '#bff7df', shake: 4, flash: 0.1, flashColor: '#eafff6'
    }
  }
};

/* Hiệu ứng chung không theo hệ */
const BOSS_FX_COMMON = {
  rune: { kind: 'orb', speed: 50, life: 0.5, size: 3, colors: ['#ffe9a8'], drag: 3, n: 5 },          // mỗi chữ đúng
  typo: { kind: 'spark', speed: 140, life: 0.25, size: 1.8, colors: ['#ff5a5a', '#ffb0b0'], n: 8 },   // chữ sai
  fizzle: { kind: 'smoke', speed: 60, life: 0.8, size: 12, colors: ['#6a6380'], drag: 1.5, g: -40, n: 10 },
  bossHit: { kind: 'spark', speed: 300, life: 0.45, size: 2.2, colors: ['#ff4d6d', '#ffb3c1'], n: 22 }, // trùm đánh pháp sư
  shield: { kind: 'shard', speed: 220, life: 0.6, size: 6, colors: ['#c9a36b', '#9bd46a'], drag: 1.2, n: 14 }
};
