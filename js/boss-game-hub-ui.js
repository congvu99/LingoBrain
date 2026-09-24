/* Game Pháp Sư Lexoria — sảnh (hub): cấp, thanh XP, trận hôm nay, thẻ truyện (intro) trước trận truyện,
   Nhật ký hành trình (đoạn đã mở, đọc lại được), cấp độ, nút Bắt đầu/Chiến đấu.
   Sảnh dùng `game` riêng (stop = stopBossHub); mỗi trận tạo `game` mới ở startBossBattle.
   Quái/vùng tra theo BOSS_MONSTERS/BOSS_REGIONS/BOSS_STORY (boss-game-story.js). Mọi text động qua esc()/textContent. */

const BOSS_DIFFS = [{ id: 'easy', label: 'Dễ' }, { id: 'normal', label: 'Vừa' }, { id: 'hard', label: 'Khó' }];
const BOSS_BEATS_PER_CHAPTER = 7;
const BOSS_SHAPE_EMOJI = { humanoid: '👹', beast: '🐺', wraith: '👻', flyer: '🦅', dragon: '🐉' };

const bossDifficulty = id => BOSS_DIFFS.some(d => d.id === id) ? id : 'normal';
const bossMonsterHp = m => Math.round((m.hpMul || 1) * BOSS_TUNING.hp.minion);

/* Trận hôm nay theo tiến trình hiện tại (đọc global bossProg lúc gọi) */
function bossTodayOpts(difficulty) {
  const date = dkey(), tb = todayBattle(bossProg, date);
  return { date, kind: tb.kind, beat: tb.beat, carryDmg: tb.carryDmg, difficulty: bossDifficulty(difficulty) };
}

function bossBattleTitle(o) {
  if (o.kind === 'practice') return 'Luyện phép (chỉ XP)';
  if (o.kind === 'endless') return 'Vô tận';
  return 'Chương ' + (Math.floor(o.beat / BOSS_BEATS_PER_CHAPTER) + 1) + ' · Trận ' + (o.beat % BOSS_BEATS_PER_CHAPTER + 1);
}

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

function openBossHub() {
  game = { id: 'boss', seq: ++gameSeq, miss: [], over: false, stop: stopBossHub };
  syncGameChrome();
  startBossHub();
}

function startBossHub() {
  const xp = bossProg.xp, lv = levelFromXp(xp), from = xpForLevel(lv), to = xpForLevel(lv + 1);
  const diff = bossDifficulty(cfg.bossLevel), o = bossTodayOpts(diff), picked = bossPickMonster(o.beat, bossProg.wins), mon = picked.monster;
  const hp = bossMonsterHp(mon), streak = huntStreak(bossProg.wins, o.date);
  $('#app').innerHTML = '<div class="card page boss-hub">' + gameHeadHtml('Lv ' + lv) +
    '<div class="boss-hub-level"><b class="serif">Pháp Sư Lexoria · Cấp ' + lv + '</b>' +
      '<div class="bar-track" aria-label="kinh nghiệm"><div class="bar" style="width:' + Math.round((xp - from) / (to - from) * 100) + '%"></div></div>' +
      '<span class="mono small muted">' + Math.floor(xp - from) + ' / ' + (to - from) + ' XP' + (streak ? ' · 🔥 ' + streak + ' ngày' : '') + '</span></div>' +
    '<div class="boss-hub-today"><span class="step-label">Hôm nay</span><b class="serif">' + esc(bossBattleTitle(o)) + '</b>' +
      '<span class="small">' + esc(mon.name) + ' · ' + hp + ' HP' +
      (o.carryDmg ? ' · <b class="ok">còn ' + Math.max(1, Math.ceil(hp - o.carryDmg)) + ' HP</b> (vết thương giữ trong ngày)' : '') + '</span></div>' +
    bossStoryCardHtml(o, mon) +
    '<div class="plane-diff boss-diff" id="bossDiff" role="radiogroup" aria-label="cấp độ">' +
      BOSS_DIFFS.map(d => '<button role="radio" data-diff="' + d.id + '" aria-checked="' + (d.id === diff) + '">' + d.label +
        '<b class="mono">' + BOSS_TUNING.clock[d.id] + 's</b></button>').join('') + '</div>' +
    '<p class="small muted">Đề là <b>nghĩa tiếng Việt</b>. Gõ đúng từ tiếng Anh = niệm chú; từ càng khó chiêu càng lớn, gõ càng nhanh càng đau. ' +
      'Đang gõ thì thời gian chậm lại. Trùm đánh theo vòng đồng hồ. Enter khi chưa gõ = Bỏ, Esc = tạm dừng. ' +
      '<small>Tắt bộ gõ tiếng Việt trước khi chơi.</small></p>' +
    bossJournalHtml(bossProg.wins) +
    '<div class="row"><button class="btn-primary" id="bossStart">' + (o.kind === 'story' ? 'Chiến đấu' : 'Bắt đầu') + '</button></div></div>';
  bindGameQuit();
  bossBindWordTap($('.boss-hub'));
  $('#bossDiff').querySelectorAll('button').forEach(b => {
    b.onclick = () => { cfg.bossLevel = bossDifficulty(b.dataset.diff); save(K_CFG, cfg); startBossHub(); };
  });
  $('#bossStart').onclick = () => startBossBattle(bossTodayOpts(cfg.bossLevel));   // cử chỉ thật → focus ô gõ được trên iOS
}

function stopBossHub() {}   // sảnh không có vòng lặp / listener cần dọn
