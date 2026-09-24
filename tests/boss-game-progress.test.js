/* Test tiến trình Pháp sư: cấp/XP, trận hôm nay, ghi idempotent, chuỗi ngày, buff Ôn từ, đoạn truyện. */
(function () {
  const allWins = n => { const w = {}; for (let i = 0; i < n; i++) w[bossShiftDate('2026-01-01', i)] = i; return w; };

  describe('boss progress — cấp', () => {
    it('cấp tại 0/99/100/300/2800 XP', () => {
      assert.deepEqual([0, 99, 100, 300, 2800].map(levelFromXp), [1, 1, 2, 3, 8]);
      assert.equal(xpForLevel(1), 0); assert.equal(xpForLevel(4), 600);
    });
  });

  describe('boss progress — trận hôm nay', () => {
    it('chưa thắng → story beat kế, mang vết thương cùng ngày + beat', () => {
      const b = Object.assign(emptyBoss(), { wins: { '2026-09-20': 0 }, day: { date: '2026-09-24', beat: 1, dmg: 120 } });
      assert.deepEqual(todayBattle(b, '2026-09-24'), { kind: 'story', beat: 1, carryDmg: 120 });
      assert.equal(todayBattle(b, '2026-09-25').carryDmg, 0, 'khác ngày → không mang');
    });
    it('đã thắng hôm nay → Luyện phép', () => assert.equal(todayBattle({ wins: { '2026-09-24': 3 } }, '2026-09-24').kind, 'practice'));
    it('thắng đủ 28 → vô tận', () => assert.deepEqual(todayBattle({ wins: allWins(28) }, '2026-09-24'), { kind: 'endless', beat: 28, carryDmg: 0 }));
    it('bỏ qua wins ngày tương lai (lệch đồng hồ +1 ngày)', () => {
      const b = { wins: { '2026-09-20': 0, '2026-09-25': 1 } };
      assert.deepEqual(todayBattle(b, '2026-09-24'), { kind: 'story', beat: 1, carryDmg: 0 });
    });
  });

  describe('boss progress — ghi kết quả', () => {
    const r = { date: '2026-09-24', beat: 2, carryDmg: 100, dealt: 80, xpAtStart: 500, earned: 40, won: false, story: true };
    it('gọi 2 lần = 1 lần (idempotent)', () => {
      const a = emptyBoss(), b = emptyBoss();
      recordProgress(a, r); recordProgress(b, r); recordProgress(b, r);
      assert.deepEqual(a, b); assert.equal(a.xp, 540); assert.deepEqual(a.day, { date: '2026-09-24', beat: 2, dmg: 180 });
    });
    it('ghi giữa trận rồi kết trận thắng → dmg/xp tăng, wins[date] = beat', () => {
      const b = emptyBoss();
      recordProgress(b, r);
      recordProgress(b, Object.assign({}, r, { dealt: 150, earned: 175, won: true }));
      assert.equal(b.xp, 675); assert.equal(b.day.dmg, 250); assert.deepEqual(b.wins, { '2026-09-24': 2 });
    });
    it('Luyện phép chỉ cộng XP, không đụng day/wins', () => {
      const b = emptyBoss();
      recordProgress(b, { xpAtStart: 10, earned: 20, story: false, won: true, date: '2026-09-24', beat: -1 });
      assert.equal(b.xp, 30); assert.equal(b.day, null); assert.deepEqual(b.wins, {});
    });
    it('xp không giảm khi xpAtStart cũ hơn (máy khác đã sync XP cao hơn)', () => {
      const b = Object.assign(emptyBoss(), { xp: 1000 });
      recordProgress(b, { xpAtStart: 100, earned: 50, story: false });
      assert.equal(b.xp, 1000);
    });
  });

  describe('boss progress — chuỗi ngày', () => {
    it('kết thúc hôm nay hoặc hôm qua; ngày trống cắt chuỗi', () => {
      const w = { '2026-09-20': 0, '2026-09-22': 1, '2026-09-23': 2 };
      assert.equal(huntStreak(w, '2026-09-24'), 2);
      assert.equal(huntStreak(Object.assign({ '2026-09-24': 3 }, w), '2026-09-24'), 3);
      assert.equal(huntStreak(w, '2026-09-26'), 0);
    });
    it('bỏ ngày tương lai', () => assert.equal(huntStreak({ '2026-09-25': 1, '2026-09-26': 2 }, '2026-09-24'), 0));
  });

  describe('boss progress — buff Ôn từ', () => {
    const day = new Date(2026, 8, 24, 9, 0).getTime(), h20 = new Date(2026, 8, 24, 20, 0).getTime(), date = bossLocalDate(day);
    const srs = () => ({
      a: { state: 'review', due: h20, hist: [{ t: day - 3600000, g: 2 }] },
      b: { state: 'learning', due: 0, hist: [] },       // thẻ đang học còn lại không chặn buff
      c: { state: 'new' }
    });
    it('đã ôn hôm nay, còn thẻ learning → vẫn true', () => assert.equal(reviewDoneToday(srs(), day, date), true));
    it('thẻ review đến hạn 20h → trước 20h true, từ 20h false', () => {
      assert.equal(reviewDoneToday(srs(), h20 - 1, date), true);
      assert.equal(reviewDoneToday(srs(), h20, date), false);
    });
    it('chưa ôn lượt nào hôm nay → false', () => {
      const s = srs(); s.a.hist = [{ t: day - 86400000 * 2, g: 2 }];
      assert.equal(reviewDoneToday(s, day, date), false);
    });
    it('buffDate đã chốt hôm nay → giữ cả ngày dù có thẻ mới đến hạn', () => {
      assert.equal(reviewBuff({ buffDate: date }, srs(), h20 + 1, date), true);
      assert.equal(reviewBuff({ buffDate: '' }, srs(), h20 + 1, date), false);
    });
  });

  describe('boss progress — đoạn truyện', () => {
    const deck = { words: [{ id: 'dragon', word: 'dragon' }, { id: 'sword', word: 'sword' }] };
    it('{id} → từ trong bộ, đánh dấu đã học', () => {
      const s = storySegments('Con {dragon} và {sword}.', deck, { dragon: { state: 'review' }, sword: { state: 'new' } });
      assert.deepEqual(s, [
        { t: 'text', text: 'Con ' }, { t: 'word', id: 'dragon', word: 'dragon', learned: true },
        { t: 'text', text: ' và ' }, { t: 'word', id: 'sword', word: 'sword', learned: false }, { t: 'text', text: '.' }
      ]);
    });
    it('id không có trong bộ → chữ thường', () => assert.deepEqual(storySegments('{ghost}!', deck, {}), [{ t: 'text', text: 'ghost' }, { t: 'text', text: '!' }]));
  });
})();
