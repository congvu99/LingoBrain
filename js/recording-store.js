/* Lưu bản ghi âm shadowing vào IndexedDB (giữ tối đa RECORDINGS_KEEP bản mỗi việc).
   Không nằm trong backup JSON. Trình duyệt chặn IndexedDB → các hàm reject, UI rơi về nghe tạm. */
const RECORDINGS_KEEP = 10;
let recDbPromise = null;

function openRecordingDb(name) {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('no-indexeddb'));
  if (recDbPromise && !name) return recDbPromise;
  const p = new Promise((res, rej) => {
    const req = indexedDB.open(name || 'lingobrain', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('recordings')) {
        db.createObjectStore('recordings', { keyPath: 'id' }).createIndex('taskId', 'taskId');
      }
    };
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
    req.onblocked = () => rej(new Error('blocked'));
  });
  if (!name) recDbPromise = p;
  return p;
}
function recTx(db, mode, fn) {
  return new Promise((res, rej) => {
    const tx = db.transaction('recordings', mode), st = tx.objectStore('recordings');
    let out; try { out = fn(st); } catch (e) { rej(e); return; }
    tx.oncomplete = () => res(out && 'result' in out ? out.result : out);
    tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error);
  });
}
function listRecordings(taskId, db) {
  return (db ? Promise.resolve(db) : openRecordingDb()).then(d => new Promise((res, rej) => {
    const req = d.transaction('recordings').objectStore('recordings').index('taskId').getAll(taskId);
    req.onsuccess = () => res(req.result.sort((a, b) => b.id - a.id));
    req.onerror = () => rej(req.error);
  }));
}
function deleteRecording(id, db) {
  return (db ? Promise.resolve(db) : openRecordingDb()).then(d => recTx(d, 'readwrite', st => st.delete(id)));
}
function pruneRecordings(taskId, keep, db) {
  return listRecordings(taskId, db).then(list => Promise.all(list.slice(keep).map(r => deleteRecording(r.id, db))));
}
function addRecording(rec, db) {
  const row = { id: Date.now(), date: dkey(), taskId: rec.taskId, caption: rec.caption || '', blob: rec.blob, type: rec.blob && rec.blob.type || '' };
  return (db ? Promise.resolve(db) : openRecordingDb())
    .then(d => recTx(d, 'readwrite', st => st.put(row)).then(() => pruneRecordings(rec.taskId, RECORDINGS_KEEP, d)))
    .then(() => row);
}
