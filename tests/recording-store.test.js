/* Chỉ chạy trong trình duyệt (cần IndexedDB). Node bỏ qua. */
describe('recording-store (browser)', () => {
  if (typeof indexedDB === 'undefined' || typeof openRecordingDb === 'undefined') { it('skipped in Node', () => assert.ok(true)); return; }
  const NAME = 'lingobrain-test';
  it('async suite scheduled', () => assert.ok(true));
  window.__asyncTests = (window.__asyncTests || []).concat(async function () {
    await new Promise(r => { const d = indexedDB.deleteDatabase(NAME); d.onsuccess = d.onerror = d.onblocked = r; });
    const db = await openRecordingDb(NAME);
    const blob = new Blob(['x'], { type: 'audio/webm' });
    for (let i = 0; i < 11; i++) { await addRecording({ taskId: 't3', caption: 'c' + i, blob }, db); await new Promise(r => setTimeout(r, 2)); }
    await addRecording({ taskId: 't5', caption: 'other', blob }, db);
    const l3 = await listRecordings('t3', db);
    assert.equal(l3.length, 10, 'giữ 10 bản');
    assert.equal(l3[0].caption, 'c10', 'mới nhất trước');
    assert.ok(!l3.some(r => r.caption === 'c0'), 'bản đầu bị xoá');
    assert.equal((await listRecordings('t5', db)).length, 1);
    await deleteRecording(l3[0].id, db);
    assert.equal((await listRecordings('t3', db)).length, 9);
    db.close();
  });
});
