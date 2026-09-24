/* Game Pháp Sư Lexoria — sảnh (hub) tối giản: cấp, thanh XP, trận hôm nay, cấp độ, nút Bắt đầu.
   Sảnh dùng `game` riêng (stop = stopBossHub); mỗi trận tạo `game` mới ở startBossBattle.
   Quái ở đây là bản tạm theo beat (phase sau thay bằng dữ liệu 12 quái + truyện). */

const BOSS_DIFFS = [{ id: 'easy', label: 'Dễ' }, { id: 'normal', label: 'Vừa' }, { id: 'hard', label: 'Khó' }];
const BOSS_BEATS_PER_CHAPTER = 7;

const bossDifficulty = id => BOSS_DIFFS.some(d => d.id === id) ? id : 'normal';

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

/* Quái tạm: trận cuối mỗi chương là trùm (HP gấp đôi); luyện phép / vô tận dùng quái thường */
function bossTempMonster(beat) {
  const chief = beat >= 0 && beat < BOSS_BEATS && beat % BOSS_BEATS_PER_CHAPTER === BOSS_BEATS_PER_CHAPTER - 1;
  return chief ? { id: 'beast-chief', name: 'Chúa Sói Bóng Đêm', hp: BOSS_TUNING.hp.boss, weak: 'fire' }
    : { id: 'beast', name: 'Sói Bóng Đêm', hp: BOSS_TUNING.hp.minion, weak: 'fire' };
}

function openBossHub() {
  game = { id: 'boss', seq: ++gameSeq, miss: [], over: false, stop: stopBossHub };
  syncGameChrome();
  startBossHub();
}

function startBossHub() {
  const xp = bossProg.xp, lv = levelFromXp(xp), from = xpForLevel(lv), to = xpForLevel(lv + 1);
  const diff = bossDifficulty(cfg.bossLevel), o = bossTodayOpts(diff), mon = bossTempMonster(o.beat);
  const streak = huntStreak(bossProg.wins, o.date);
  $('#app').innerHTML = '<div class="card page boss-hub">' + gameHeadHtml('Lv ' + lv) +
    '<div class="boss-hub-level"><b class="serif">Pháp Sư Lexoria · Cấp ' + lv + '</b>' +
      '<div class="bar-track" aria-label="kinh nghiệm"><div class="bar" style="width:' + Math.round((xp - from) / (to - from) * 100) + '%"></div></div>' +
      '<span class="mono small muted">' + Math.floor(xp - from) + ' / ' + (to - from) + ' XP' + (streak ? ' · 🔥 ' + streak + ' ngày' : '') + '</span></div>' +
    '<div class="boss-hub-today"><span class="step-label">Hôm nay</span><b class="serif">' + esc(bossBattleTitle(o)) + '</b>' +
      '<span class="small">' + esc(mon.name) + ' · ' + mon.hp + ' HP' +
      (o.carryDmg ? ' · <b class="ok">còn ' + Math.max(1, Math.ceil(mon.hp - o.carryDmg)) + ' HP</b> (vết thương giữ trong ngày)' : '') + '</span></div>' +
    '<div class="plane-diff boss-diff" id="bossDiff" role="radiogroup" aria-label="cấp độ">' +
      BOSS_DIFFS.map(d => '<button role="radio" data-diff="' + d.id + '" aria-checked="' + (d.id === diff) + '">' + d.label +
        '<b class="mono">' + BOSS_TUNING.clock[d.id] + 's</b></button>').join('') + '</div>' +
    '<p class="small muted">Đề là <b>nghĩa tiếng Việt</b>. Gõ đúng từ tiếng Anh = niệm chú; từ càng khó chiêu càng lớn, gõ càng nhanh càng đau. ' +
      'Đang gõ thì thời gian chậm lại. Trùm đánh theo vòng đồng hồ. Enter khi chưa gõ = Bỏ, Esc = tạm dừng. ' +
      '<small>Tắt bộ gõ tiếng Việt trước khi chơi.</small></p>' +
    '<div class="row"><button class="btn-primary" id="bossStart">Bắt đầu</button></div></div>';
  bindGameQuit();
  $('#bossDiff').querySelectorAll('button').forEach(b => {
    b.onclick = () => { cfg.bossLevel = bossDifficulty(b.dataset.diff); save(K_CFG, cfg); startBossHub(); };
  });
  $('#bossStart').onclick = () => startBossBattle(bossTodayOpts(cfg.bossLevel));   // cử chỉ thật → focus ô gõ được trên iOS
}

function stopBossHub() {}   // sảnh không có vòng lặp / listener cần dọn
