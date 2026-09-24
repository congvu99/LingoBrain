/* Game Pháp Sư Lexoria — quái theo beat + truyện trong sảnh: tra BOSS_MONSTERS/BOSS_REGIONS/BOSS_STORY (boss-game-story.js),
   thẻ truyện (intro) trước trận truyện, Nhật ký hành trình (đoạn đã mở, đọc lại được), từ đã học tô màu + bấm nghe.
   Mọi text động qua esc(); nạp trước boss-game-hub-ui.js (BOSS_BEATS_PER_CHAPTER ở hub chỉ dùng lúc gọi). */

const BOSS_SHAPE_EMOJI = { humanoid: '👹', beast: '🐺', wraith: '👻', flyer: '🦅', dragon: '🐉' };
const bossMonsterHp = m => Math.round((m.hpMul || 1) * BOSS_TUNING.hp.minion);

/* Quái id đã từng gặp (mọi beat ≤ beat cao nhất đã thắng), giữ thứ tự xuất hiện; chưa thắng trận nào → quái đầu chương 1 */
function bossEncounteredMonsterIds(wins) {
  const maxBeat = Object.keys(wins || {}).reduce((mx, k) => Math.max(mx, wins[k]), -1);
  const ids = [];
  for (let b = 0; b <= maxBeat && b < BOSS_STORY.length; b++) if (ids.indexOf(BOSS_STORY[b].monster) < 0) ids.push(BOSS_STORY[b].monster);
  return ids.length ? ids : [BOSS_MONSTERS[0].id];
}

/* Quái + vùng cho 1 beat: trận truyện tra thẳng BOSS_STORY; luyện phép/vô tận → quái ngẫu nhiên đã gặp (đủ đa dạng
   mà không lộ quái chưa từng đánh), vùng theo quái đó */
function bossPickMonster(beat, wins, rand) {
  rand = rand || Math.random;
  const seg = beat >= 0 && beat < BOSS_STORY.length ? BOSS_STORY[beat] : null;
  const ids = seg ? null : bossEncounteredMonsterIds(wins);
  const id = seg ? seg.monster : ids[Math.floor(rand() * ids.length)];
  const monster = BOSS_MONSTERS.find(m => m.id === id) || BOSS_MONSTERS[0];
  const region = BOSS_REGIONS.find(r => r.id === monster.region) || BOSS_REGIONS[0];
  return { monster, region };
}

/* Đoạn truyện → HTML: từ đã học tô màu + bấm nghe (data-word/data-learned, xử lý bằng click uỷ quyền); còn lại esc() thường */
function bossStoryHtml(text) {
  return storySegments(text, deck, srs).map(seg => seg.t === 'word'
    ? '<span class="boss-word' + (seg.learned ? ' learned' : '') + '" data-word="' + esc(seg.word) + '" data-learned="' + (seg.learned ? 1 : 0) + '">' + esc(seg.word) + '</span>'
    : esc(seg.text)).join('');
}

/* Uỷ quyền chạm từ đã học → nghe MP3 (gắn 1 lần trên khung chứa, dùng chung cho thẻ truyện + Nhật ký + màn kết) */
function bossBindWordTap(root) {
  if (!root) return;
  root.addEventListener('click', e => {
    const w = e.target.closest('.boss-word');
    if (w && w.dataset.learned === '1') speak(w.dataset.word);
  });
}

/* Nhật ký hành trình: đoạn đã mở (có trong wins), gộp theo chương, đọc lại intro+outro */
function bossJournalHtml(wins) {
  const openBeats = Array.from(new Set(Object.values(wins || {}))).filter(b => b >= 0 && b < BOSS_STORY.length).sort((a, b) => a - b);
  if (!openBeats.length) return '';
  const chapters = [[], [], [], []];
  openBeats.forEach(b => chapters[Math.floor(b / BOSS_BEATS_PER_CHAPTER)].push(b));
  const body = chapters.map((list, ci) => !list.length ? '' :
    '<div class="boss-journal-chapter"><b class="serif">Chương ' + (ci + 1) + ' · ' + esc(BOSS_REGIONS[ci].name) + '</b>' +
      list.map(b => {
        const seg = BOSS_STORY[b], mon = BOSS_MONSTERS.find(m => m.id === seg.monster) || BOSS_MONSTERS[0];
        return '<div class="boss-journal-entry"><b>' + esc(mon.name) + '</b>' +
          '<p class="small">' + bossStoryHtml(seg.intro) + '</p><p class="small muted">' + bossStoryHtml(seg.outro) + '</p></div>';
      }).join('') + '</div>').join('');
  return '<details class="boss-journal"><summary>Nhật ký hành trình (' + openBeats.length + ')</summary>' + body + '</details>';
}

/* Thẻ truyện trước trận truyện: tên quái + biểu tượng dáng + intro + nút Chiến đấu (thay nút Bắt đầu chung) */
function bossStoryCardHtml(o, mon) {
  if (o.kind !== 'story' || !BOSS_STORY[o.beat]) return '';
  return '<div class="boss-story-card"><span class="boss-story-icon" aria-hidden="true">' + (BOSS_SHAPE_EMOJI[mon.shape] || '👹') + '</span>' +
    '<div><b class="serif">' + esc(mon.name) + '</b><p class="small">' + bossStoryHtml(BOSS_STORY[o.beat].intro) + '</p></div></div>';
}

/* Nút 📖 Nhật ký ở sảnh: mở khối Nhật ký và cuộn tới */
function renderJournal() {
  const d = $('.boss-journal');
  if (!d) return toast('Nhật ký còn trống — thắng trận truyện để mở đoạn đầu tiên');
  d.open = true; d.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
