/* Nguồn bộ từ + audio index: API (bản trong DB, SW cache lại để offline) trước, lỗi (rollback 404, 503, mất mạng)
   → file tĩnh words.json / audio/index.json. Chỉ dọn tiến độ (pruneSrs) khi bộ từ đến từ API — bản fallback có thể
   lệch DB nên không bao giờ được xoá tiến độ. Thuần, test: tests/deck-source.test.js */
const AUDIO_FILE_RX = /^[0-9a-f]{12}\.mp3$/;

function deckSources(now) {
  return [{ url: 'api/words', tag: 'api' }, { url: 'words.json?_=' + now, tag: 'file' }];
}
function audioSources() {
  return [{ url: 'api/audio-index', tag: 'api' }, { url: 'audio/index.json', tag: 'file' }];
}
function isDeckJson(j) {
  const words = Array.isArray(j) ? j : j && j.words;
  return Array.isArray(words) && words.length > 0;
}
function isAudioIndexJson(j) {
  return !!(j && j.items && typeof j.items === 'object' && !Array.isArray(j.items));
}
// tên file phải đúng dạng hash (chặn đường dẫn lạ nếu DB bị sửa tay); map không prototype → gõ "constructor" không ra audio giả
function cleanAudioItems(items) {
  const out = Object.create(null);
  Object.keys(items || {}).forEach(t => { if (typeof items[t] === 'string' && AUDIO_FILE_RX.test(items[t])) out[t] = items[t]; });
  return out;
}
function shouldPruneDeck(tag) { return tag === 'api'; }

// → {data, tag} của nguồn đầu tiên trả ok + JSON hợp lệ theo isValid, hoặc null
async function fetchFirstOk(sources, fetchFn, isValid) {
  for (const s of sources) {
    try {
      const r = await fetchFn(s.url);
      if (!r || !r.ok) continue;
      const data = await r.json();
      if (isValid(data)) return { data, tag: s.tag };
    } catch (e) { /* thử nguồn kế */ }
  }
  return null;
}

if (typeof module !== 'undefined') module.exports = { deckSources, audioSources, isDeckJson, isAudioIndexJson, cleanAudioItems, shouldPruneDeck, fetchFirstOk };
