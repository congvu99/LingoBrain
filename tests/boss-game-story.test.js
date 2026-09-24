/* Dữ liệu thế giới Lexoria: BOSS_REGIONS, BOSS_MONSTERS, BOSS_STORY (boss-game-story.js).
   Kiểm mọi {id} trong truyện có thật trong words.json bằng fs/ROOT (giống tests/pwa-assets.test.js) — chỉ chạy trong Node. */
describe('boss-game-story.js', () => {
  it('BOSS_REGIONS có 4 vùng, id duy nhất', () => {
    assert.equal(BOSS_REGIONS.length, 4);
    assert.equal(new Set(BOSS_REGIONS.map(r => r.id)).size, 4);
  });

  it('BOSS_MONSTERS có 12 quái, id duy nhất, dáng ∈ 5 loại (chỉ để suy emoji dự phòng), weak ∈ BOSS_ELEMENTS, region hợp lệ, sprite tồn tại trong BOSS_SPRITES', () => {
    assert.equal(BOSS_MONSTERS.length, 12);
    assert.equal(new Set(BOSS_MONSTERS.map(m => m.id)).size, 12);
    const shapes = ['humanoid', 'beast', 'wraith', 'flyer', 'dragon'], regionIds = BOSS_REGIONS.map(r => r.id);
    BOSS_MONSTERS.forEach(m => {
      assert.includes(shapes, m.shape, m.id + ' shape');
      assert.includes(BOSS_ELEMENTS, m.weak, m.id + ' weak');
      assert.includes(regionIds, m.region, m.id + ' region');
      assert.ok(BOSS_SPRITES[m.sprite], m.id + ' sprite ' + m.sprite + ' phải có trong BOSS_SPRITES');
      if (m.spriteHit) assert.ok(BOSS_SPRITES[m.spriteHit], m.id + ' spriteHit ' + m.spriteHit);
      if (m.spriteAttack) assert.ok(BOSS_SPRITES[m.spriteAttack], m.id + ' spriteAttack ' + m.spriteAttack);
    });
  });

  it('BOSS_ARENAS có sân cho đủ 4 vùng, tile hợp lệ và (ở Node) nằm trong ảnh PNG thật', () => {
    const regionIds = BOSS_REGIONS.map(r => r.id);
    regionIds.forEach(id => assert.ok(BOSS_ARENAS[id], 'vùng ' + id + ' thiếu BOSS_ARENAS'));
    if (typeof fs === 'undefined') return;
    const dims = {};   // cache IHDR để không đọc lại file nhiều lần
    function pngDim(src) {
      if (!dims[src]) { const b = fs.readFileSync(path.join(ROOT, src)); dims[src] = [b.readUInt32BE(16), b.readUInt32BE(20)]; }
      return dims[src];
    }
    regionIds.forEach(id => {
      const A = BOSS_ARENAS[id], tiles = [A.grass, ...A.details, ...A.far];
      assert.ok(A.patchColor && /^#[0-9a-f]{6}$/i.test(A.patchColor), id + ' patchColor phải là mã hex hợp lệ');
      tiles.forEach(t => {
        const [name, sx, sy, sw, sh] = t, [W, H] = pngDim(BOSS_SPRITES[name].src);
        assert.ok(sx + sw <= W && sy + sh <= H, id + ' tile ' + name + ' ' + JSON.stringify(t) + ' ra ngoài ảnh ' + W + '×' + H);
      });
    });
  });

  it('mỗi chương (7 trận) có đúng 1 trùm (hpMul 2), trùm khớp bảng khắc hệ ch1..4 = fire/earth/ice/storm', () => {
    const bossWeak = ['fire', 'earth', 'ice', 'storm'];
    for (let ch = 0; ch < 4; ch++) {
      const bossId = BOSS_STORY[ch * 7 + 6].monster, boss = BOSS_MONSTERS.find(m => m.id === bossId);
      assert.ok(boss, 'chương ' + (ch + 1) + ' thiếu quái trùm');
      assert.equal(boss.hpMul, 2, 'trùm chương ' + (ch + 1) + ' phải hpMul 2');
      assert.equal(boss.weak, bossWeak[ch], 'trùm chương ' + (ch + 1) + ' phải yếu ' + bossWeak[ch]);
    }
  });

  it('BOSS_STORY đủ 28 đoạn, mỗi đoạn có intro + outro, monster tồn tại trong BOSS_MONSTERS', () => {
    assert.equal(BOSS_STORY.length, 28);
    const ids = BOSS_MONSTERS.map(m => m.id);
    BOSS_STORY.forEach((seg, i) => {
      assert.ok(seg.intro && seg.intro.length > 0, 'beat ' + i + ' thiếu intro');
      assert.ok(seg.outro && seg.outro.length > 0, 'beat ' + i + ' thiếu outro');
      assert.includes(ids, seg.monster, 'beat ' + i + ' monster không hợp lệ');
    });
  });

  if (typeof fs !== 'undefined') {
    const words = JSON.parse(fs.readFileSync(path.join(ROOT, 'words.json'), 'utf8')).words;
    const wordIds = new Set(words.map(w => w.id));
    it('mọi {id} trong intro/outro tồn tại trong words.json', () => {
      const missing = [];
      BOSS_STORY.forEach((seg, i) => {
        ['intro', 'outro'].forEach(k => {
          const m = String(seg[k]).match(/\{([a-z0-9_-]{1,64})\}/g) || [];
          m.forEach(tag => { const id = tag.slice(1, -1); if (!wordIds.has(id)) missing.push('beat ' + i + ' ' + k + ': ' + id); });
        });
      });
      assert.deepEqual(missing, []);
    });

    it('storySegments trên dữ liệu thật: từ chưa học không lộ nghĩa, chỉ hiện từ tiếng Anh', () => {
      const deckReal = { words }, srsEmpty = {};   // srs rỗng → mọi từ coi như chưa học (learned=false)
      const segs = storySegments(BOSS_STORY[0].intro, deckReal, srsEmpty);
      const wordSegs = segs.filter(s => s.t === 'word');
      assert.ok(wordSegs.length > 0, 'beat 0 phải có ít nhất 1 từ cài vào truyện');
      wordSegs.forEach(s => {
        assert.equal(s.learned, false);
        const w = words.find(x => x.id === s.id);
        assert.equal(s.word, w.word);   // chỉ có chữ tiếng Anh, không có s.meaning nào được trả về
        assert.ok(!Object.prototype.hasOwnProperty.call(s, 'meaning'));
      });
    });
  }
});
