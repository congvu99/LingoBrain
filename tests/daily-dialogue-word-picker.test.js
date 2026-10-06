/* Test js/daily-dialogue-word-picker.js: chọn ≤8 từ đã chấm trong ngày cho hội thoại nhập vai. */
describe('daily dialogue word picker', () => {
  const FROM = Date.parse('2026-10-06T00:00:00'), TO = FROM + 86400000;
  const deckWords = ['a', 'b', 'c', 'd', 'e'].map(id => ({ id }));
  const at = h => FROM + h * 3600000;

  it('không có lượt chấm trong ngày → []', () => {
    assert.deepEqual(pickTodayWords(deckWords, { a: { hist: [{ t: FROM - 1, g: 3 }] } }, FROM, TO), []);
    assert.deepEqual(pickTodayWords(deckWords, {}, FROM, TO), []);
  });
  it('ranh giới: lượt đúng lúc `to` không tính, đúng lúc `from` thì tính', () => {
    assert.deepEqual(pickTodayWords(deckWords, { a: { hist: [{ t: TO, g: 3 }] }, b: { hist: [{ t: FROM, g: 3 }] } }, FROM, TO), ['b']);
  });
  it('ưu tiên: chấm sai > mới học hôm nay > ôn lại; cùng nhóm thì gần nhất trước', () => {
    const srs = {
      a: { hist: [{ t: FROM - 86400000 * 3, g: 3 }, { t: at(9), g: 2 }] },   // ôn lại
      b: { hist: [{ t: at(8), g: 2 }] },                                     // mới học
      c: { hist: [{ t: FROM - 86400000, g: 3 }, { t: at(7), g: 0 }] },       // sai
      d: { hist: [{ t: at(10), g: 3 }] },                                    // mới học, gần hơn b
      e: { hist: [{ t: FROM - 86400000, g: 3 }, { t: at(11), g: 3 }] }       // ôn lại, gần hơn a
    };
    assert.deepEqual(pickTodayWords(deckWords, srs, FROM, TO), ['c', 'd', 'b', 'e', 'a']);
  });
  it('cắt theo max, bỏ id không còn trong bộ từ, hist rỗng/thiếu không lỗi', () => {
    const srs = { a: { hist: [{ t: at(1), g: 3 }] }, b: { hist: [{ t: at(2), g: 3 }] }, ghost: { hist: [{ t: at(3), g: 0 }] }, c: {}, d: { hist: [] } };
    assert.deepEqual(pickTodayWords(deckWords, srs, FROM, TO, 1), ['b']);
    assert.deepEqual(pickTodayWords(deckWords, srs, FROM, TO), ['b', 'a']);
  });
});
