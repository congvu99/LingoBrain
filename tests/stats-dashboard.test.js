const DD = 86400000;
const T0 = new Date(2026, 8, 15, 12).getTime();
const deckS = { words: [{ id: 'a', word: 'a' }, { id: 'b', word: 'b' }, { id: 'c', word: 'c' }, { id: 'd', word: 'd' }] };
const srsS = {
  a: { state: 'review', due: T0 - DD, ivl: 3, ef: 2.3, lapses: 3, hist: [{ t: T0 - 2 * DD, g: 0 }, { t: T0 - DD, g: 2 }] },
  b: { state: 'review', due: T0 + 2 * DD, ivl: 10, ef: 2.5, lapses: 0, hist: [{ t: T0 - DD, g: 3 }] },
  c: { state: 'review', due: T0, ivl: 1, ef: 2.1, lapses: 1, hist: [{ t: T0 - 10 * DD, g: 2 }, { t: T0 - 40 * DD, g: 0 }] }
};

describe('computeStats', () => {
  const s = computeStats(deckS, srsS, T0);
  it('retention 7d', () => { assert.equal(s.retention7.pass, 2); assert.equal(s.retention7.fail, 1); assert.near(s.retention7.rate, 2 / 3); });
  it('retention 30d ignores 40d ago', () => { assert.equal(s.retention30.pass, 3); assert.equal(s.retention30.fail, 1); });
  it('forecast today includes overdue', () => { assert.equal(s.forecast.length, 7); assert.equal(s.forecast[0], 2); assert.equal(s.forecast[2], 1); });
  it('hardest sorted, excludes unlearned', () => { assert.equal(s.hardest[0].id, 'a'); assert.equal(s.hardest.length, 3); assert.ok(!s.hardest.some(x => x.id === 'd')); });
  it('heatmap 30 days, yesterday = 2', () => { assert.equal(s.heatmap.length, 30); assert.equal(s.heatmap[28].count, 2); assert.equal(s.heatmap[29].count, 0); });
  it('empty data', () => { const e = computeStats({ words: [] }, {}, T0); assert.equal(e.retention7.rate, null); assert.equal(e.total, 0); });
});
