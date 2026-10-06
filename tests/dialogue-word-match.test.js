/* Test js/dialogue-word-match.js: tìm từ/cụm từ bộ từ trong câu hội thoại (độ phủ + tô đậm). */
describe('dialogue word match', () => {
  const words = (s, sp) => sp.map(([a, b]) => s.slice(a, b));

  it('từ đơn: khớp nguyên dạng, không phân biệt hoa thường', () => {
    assert.deepEqual(words('I Reckon so.', matchSpans('I Reckon so.', 'reckon')), ['Reckon']);
  });
  it('đuôi -s/-ed/-ing, y→ied, bỏ e + ing, nhân đôi phụ âm', () => {
    assert.ok(isCovered(['She reckons it is fine.'], 'reckon'));
    assert.ok(isCovered(['We studied hard.'], 'study'));
    assert.ok(isCovered(["I'm making tea."], 'make'));
    assert.ok(isCovered(['He stopped by.'], 'stop'));
    assert.ok(isCovered(['Thanks, I reckoned so.'], 'reckon'));
  });
  it('không khớp từ khác chỉ trùng phần đầu', () => {
    assert.ok(!isCovered(['That is a carpet.'], 'car'));
    assert.ok(!isCovered(['Go home.'], 'good'));
  });
  it('cụm từ liền nhau và có tân ngữ chen (≤2 token)', () => {
    assert.ok(isCovered(['Let me reach out to her.'], 'reach out'));
    assert.ok(isCovered(['I finally figured it out!'], 'figure out'));
    assert.deepEqual(words('I finally figured it out!', matchSpans('I finally figured it out!', 'figure out')), ['figured it out']);
    assert.ok(!isCovered(['Figure what the heck this is all about'], 'figure out'));
  });
  it('contraction + nháy cong', () => {
    assert.ok(isCovered(['Hey! How’s it going?'], "how's it going"));
    assert.ok(isCovered(["Hey, how's it going?"], "how's it going"));
  });
  it('dấu phẩy trong mục bộ từ ("sorry, what")', () => {
    assert.ok(isCovered(['Sorry, what did you say?'], 'sorry, what'));
  });
  it('dạng bất quy tắc không bắt (rơi vào missing)', () => {
    assert.ok(!isCovered(['I bought some milk.'], 'buy'));
  });
  it('nhiều lần xuất hiện → nhiều khoảng, không chồng nhau', () => {
    assert.equal(matchSpans('Sure, sure. Sure!', 'sure').length, 3);
  });
  it('đầu vào rỗng / lạ không ném lỗi', () => {
    assert.deepEqual(matchSpans('', 'x'), []);
    assert.deepEqual(matchSpans('abc', ''), []);
    assert.ok(!isCovered(null, 'x'));
  });
});
