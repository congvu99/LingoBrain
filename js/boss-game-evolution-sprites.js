/* Game Pháp Sư Lexoria — 30 sheet nhân vật + 30 faceset dạng tiến hoá, dữ liệu THUẦN, không hàm.
   Nguồn Ninja Adventure (pixel-boy, CC0), chép bằng script tay (xem docs/system-architecture.md mục sprite) vào img/boss/actor/
   evo-<formId>.png / evo-<formId>-face.png. Không đụng js/boss-game-sprite-atlas.js (atlas) — file này định
   nghĩa lại cùng khuôn BOSS_CHAR_ANIMS (nhân vật 64×112, 4 hướng) và khuôn faceset 38×38 1 khung để tránh phụ
   thuộc chéo; tích hợp sẽ gộp BOSS_EVO_SPRITES vào BOSS_SPRITES sau (BOSS_CHAR_ANIMS dùng chung, không phình).
   Key khớp field `sprite`/`face` của từng dạng ở js/boss-game-evolution-forms.js. */

const BOSS_EVO_CHAR_ANIMS = {
  idle: { row: 0, frames: 1, dir: 'up' }, walk: { row: 0, frames: 4, fps: 6, dir: 'up' },
  attack: { row: 4, frames: 1, dir: 'up' }, jump: { row: 5, frames: 1, dir: 'up' },
  special: { row: 6, col: 1, frames: 1 }, face: { row: 0, frames: 1, dir: 'down' },
  idleDown: { row: 0, frames: 4, fps: 3, dir: 'down' }
};
const BOSS_EVO_FACE_ANIMS = { idle: { frames: 1 } };

const BOSS_EVO_SPRITES = {
  evoFireA: { src: 'img/boss/actor/evo-fire-a.png', fw: 16, fh: 16, anims: BOSS_EVO_CHAR_ANIMS },
  evoFireAFace: { src: 'img/boss/actor/evo-fire-a-face.png', fw: 38, fh: 38, anims: BOSS_EVO_FACE_ANIMS },
  evoFireA1: { src: 'img/boss/actor/evo-fire-a1.png', fw: 16, fh: 16, anims: BOSS_EVO_CHAR_ANIMS },
  evoFireA1Face: { src: 'img/boss/actor/evo-fire-a1-face.png', fw: 38, fh: 38, anims: BOSS_EVO_FACE_ANIMS },
  evoFireA2: { src: 'img/boss/actor/evo-fire-a2.png', fw: 16, fh: 16, anims: BOSS_EVO_CHAR_ANIMS },
  evoFireA2Face: { src: 'img/boss/actor/evo-fire-a2-face.png', fw: 38, fh: 38, anims: BOSS_EVO_FACE_ANIMS },
  evoFireB: { src: 'img/boss/actor/evo-fire-b.png', fw: 16, fh: 16, anims: BOSS_EVO_CHAR_ANIMS },
  evoFireBFace: { src: 'img/boss/actor/evo-fire-b-face.png', fw: 38, fh: 38, anims: BOSS_EVO_FACE_ANIMS },
  evoFireB1: { src: 'img/boss/actor/evo-fire-b1.png', fw: 16, fh: 16, anims: BOSS_EVO_CHAR_ANIMS },
  evoFireB1Face: { src: 'img/boss/actor/evo-fire-b1-face.png', fw: 38, fh: 38, anims: BOSS_EVO_FACE_ANIMS },
  evoFireB2: { src: 'img/boss/actor/evo-fire-b2.png', fw: 16, fh: 16, anims: BOSS_EVO_CHAR_ANIMS },
  evoFireB2Face: { src: 'img/boss/actor/evo-fire-b2-face.png', fw: 38, fh: 38, anims: BOSS_EVO_FACE_ANIMS },
  evoIceA: { src: 'img/boss/actor/evo-ice-a.png', fw: 16, fh: 16, anims: BOSS_EVO_CHAR_ANIMS },
  evoIceAFace: { src: 'img/boss/actor/evo-ice-a-face.png', fw: 38, fh: 38, anims: BOSS_EVO_FACE_ANIMS },
  evoIceA1: { src: 'img/boss/actor/evo-ice-a1.png', fw: 16, fh: 16, anims: BOSS_EVO_CHAR_ANIMS },
  evoIceA1Face: { src: 'img/boss/actor/evo-ice-a1-face.png', fw: 38, fh: 38, anims: BOSS_EVO_FACE_ANIMS },
  evoIceA2: { src: 'img/boss/actor/evo-ice-a2.png', fw: 16, fh: 16, anims: BOSS_EVO_CHAR_ANIMS },
  evoIceA2Face: { src: 'img/boss/actor/evo-ice-a2-face.png', fw: 38, fh: 38, anims: BOSS_EVO_FACE_ANIMS },
  evoIceB: { src: 'img/boss/actor/evo-ice-b.png', fw: 16, fh: 16, anims: BOSS_EVO_CHAR_ANIMS },
  evoIceBFace: { src: 'img/boss/actor/evo-ice-b-face.png', fw: 38, fh: 38, anims: BOSS_EVO_FACE_ANIMS },
  evoIceB1: { src: 'img/boss/actor/evo-ice-b1.png', fw: 16, fh: 16, anims: BOSS_EVO_CHAR_ANIMS },
  evoIceB1Face: { src: 'img/boss/actor/evo-ice-b1-face.png', fw: 38, fh: 38, anims: BOSS_EVO_FACE_ANIMS },
  evoIceB2: { src: 'img/boss/actor/evo-ice-b2.png', fw: 16, fh: 16, anims: BOSS_EVO_CHAR_ANIMS },
  evoIceB2Face: { src: 'img/boss/actor/evo-ice-b2-face.png', fw: 38, fh: 38, anims: BOSS_EVO_FACE_ANIMS },
  evoStormA: { src: 'img/boss/actor/evo-storm-a.png', fw: 16, fh: 16, anims: BOSS_EVO_CHAR_ANIMS },
  evoStormAFace: { src: 'img/boss/actor/evo-storm-a-face.png', fw: 38, fh: 38, anims: BOSS_EVO_FACE_ANIMS },
  evoStormA1: { src: 'img/boss/actor/evo-storm-a1.png', fw: 16, fh: 16, anims: BOSS_EVO_CHAR_ANIMS },
  evoStormA1Face: { src: 'img/boss/actor/evo-storm-a1-face.png', fw: 38, fh: 38, anims: BOSS_EVO_FACE_ANIMS },
  evoStormA2: { src: 'img/boss/actor/evo-storm-a2.png', fw: 16, fh: 16, anims: BOSS_EVO_CHAR_ANIMS },
  evoStormA2Face: { src: 'img/boss/actor/evo-storm-a2-face.png', fw: 38, fh: 38, anims: BOSS_EVO_FACE_ANIMS },
  evoStormB: { src: 'img/boss/actor/evo-storm-b.png', fw: 16, fh: 16, anims: BOSS_EVO_CHAR_ANIMS },
  evoStormBFace: { src: 'img/boss/actor/evo-storm-b-face.png', fw: 38, fh: 38, anims: BOSS_EVO_FACE_ANIMS },
  evoStormB1: { src: 'img/boss/actor/evo-storm-b1.png', fw: 16, fh: 16, anims: BOSS_EVO_CHAR_ANIMS },
  evoStormB1Face: { src: 'img/boss/actor/evo-storm-b1-face.png', fw: 38, fh: 38, anims: BOSS_EVO_FACE_ANIMS },
  evoStormB2: { src: 'img/boss/actor/evo-storm-b2.png', fw: 16, fh: 16, anims: BOSS_EVO_CHAR_ANIMS },
  evoStormB2Face: { src: 'img/boss/actor/evo-storm-b2-face.png', fw: 38, fh: 38, anims: BOSS_EVO_FACE_ANIMS },
  evoEarthA: { src: 'img/boss/actor/evo-earth-a.png', fw: 16, fh: 16, anims: BOSS_EVO_CHAR_ANIMS },
  evoEarthAFace: { src: 'img/boss/actor/evo-earth-a-face.png', fw: 38, fh: 38, anims: BOSS_EVO_FACE_ANIMS },
  evoEarthA1: { src: 'img/boss/actor/evo-earth-a1.png', fw: 16, fh: 16, anims: BOSS_EVO_CHAR_ANIMS },
  evoEarthA1Face: { src: 'img/boss/actor/evo-earth-a1-face.png', fw: 38, fh: 38, anims: BOSS_EVO_FACE_ANIMS },
  evoEarthA2: { src: 'img/boss/actor/evo-earth-a2.png', fw: 16, fh: 16, anims: BOSS_EVO_CHAR_ANIMS },
  evoEarthA2Face: { src: 'img/boss/actor/evo-earth-a2-face.png', fw: 38, fh: 38, anims: BOSS_EVO_FACE_ANIMS },
  evoEarthB: { src: 'img/boss/actor/evo-earth-b.png', fw: 16, fh: 16, anims: BOSS_EVO_CHAR_ANIMS },
  evoEarthBFace: { src: 'img/boss/actor/evo-earth-b-face.png', fw: 38, fh: 38, anims: BOSS_EVO_FACE_ANIMS },
  evoEarthB1: { src: 'img/boss/actor/evo-earth-b1.png', fw: 16, fh: 16, anims: BOSS_EVO_CHAR_ANIMS },
  evoEarthB1Face: { src: 'img/boss/actor/evo-earth-b1-face.png', fw: 38, fh: 38, anims: BOSS_EVO_FACE_ANIMS },
  evoEarthB2: { src: 'img/boss/actor/evo-earth-b2.png', fw: 16, fh: 16, anims: BOSS_EVO_CHAR_ANIMS },
  evoEarthB2Face: { src: 'img/boss/actor/evo-earth-b2-face.png', fw: 38, fh: 38, anims: BOSS_EVO_FACE_ANIMS },
  evoWindA: { src: 'img/boss/actor/evo-wind-a.png', fw: 16, fh: 16, anims: BOSS_EVO_CHAR_ANIMS },
  evoWindAFace: { src: 'img/boss/actor/evo-wind-a-face.png', fw: 38, fh: 38, anims: BOSS_EVO_FACE_ANIMS },
  evoWindA1: { src: 'img/boss/actor/evo-wind-a1.png', fw: 16, fh: 16, anims: BOSS_EVO_CHAR_ANIMS },
  evoWindA1Face: { src: 'img/boss/actor/evo-wind-a1-face.png', fw: 38, fh: 38, anims: BOSS_EVO_FACE_ANIMS },
  evoWindA2: { src: 'img/boss/actor/evo-wind-a2.png', fw: 16, fh: 16, anims: BOSS_EVO_CHAR_ANIMS },
  evoWindA2Face: { src: 'img/boss/actor/evo-wind-a2-face.png', fw: 38, fh: 38, anims: BOSS_EVO_FACE_ANIMS },
  evoWindB: { src: 'img/boss/actor/evo-wind-b.png', fw: 16, fh: 16, anims: BOSS_EVO_CHAR_ANIMS },
  evoWindBFace: { src: 'img/boss/actor/evo-wind-b-face.png', fw: 38, fh: 38, anims: BOSS_EVO_FACE_ANIMS },
  evoWindB1: { src: 'img/boss/actor/evo-wind-b1.png', fw: 16, fh: 16, anims: BOSS_EVO_CHAR_ANIMS },
  evoWindB1Face: { src: 'img/boss/actor/evo-wind-b1-face.png', fw: 38, fh: 38, anims: BOSS_EVO_FACE_ANIMS },
  evoWindB2: { src: 'img/boss/actor/evo-wind-b2.png', fw: 16, fh: 16, anims: BOSS_EVO_CHAR_ANIMS },
  evoWindB2Face: { src: 'img/boss/actor/evo-wind-b2-face.png', fw: 38, fh: 38, anims: BOSS_EVO_FACE_ANIMS }
};

if (typeof module !== 'undefined') module.exports = { BOSS_EVO_SPRITES };
