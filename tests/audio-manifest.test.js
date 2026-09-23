/* audio/index.json (tools/generate_edge_tts_audio.py) phải phủ mọi word + context trong words.json và mọi file phải có thật. Chạy trong Node. */
describe('audio manifest', () => {
  if (typeof fs === 'undefined') return;
  const manifestPath = path.join(ROOT, 'audio', 'index.json');
  if (!fs.existsSync(manifestPath)) return;
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const items = manifest.items || {};
  const files = Object.values(items);
  // Cùng quy tắc với audioKey() trong js/speech-synthesis.js
  const key = t => String(t || '').replace(/\s+/g, ' ').trim();
  it('has voice and items', () => { assert.ok(manifest.voice); assert.ok(files.length > 0); });
  it('covers every word and context in words.json', () => {
    const words = JSON.parse(fs.readFileSync(path.join(ROOT, 'words.json'), 'utf8')).words;
    const missing = [];
    words.forEach(w => [w.word, w.context].forEach(t => { if (key(t) && !items[key(t)]) missing.push(key(t)); }));
    assert.equal(missing.length, 0, 'missing audio: ' + missing.slice(0, 5).join(' | '));
  });
  it('every listed file exists', () => {
    const absent = files.filter(f => !fs.existsSync(path.join(ROOT, 'audio', f)));
    assert.equal(absent.length, 0, 'absent: ' + absent.slice(0, 5).join(', '));
  });
  it('no orphan mp3', () => {
    const listed = new Set(files);
    const orphans = fs.readdirSync(path.join(ROOT, 'audio')).filter(f => /\.mp3$/.test(f) && !listed.has(f));
    assert.equal(orphans.length, 0, 'orphans: ' + orphans.slice(0, 5).join(', '));
  });
});
