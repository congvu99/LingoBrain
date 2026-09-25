/* Phát âm: ưu tiên MP3 giọng Neural tạo sẵn (danh mục từ /api/audio-index, lỗi thì audio/index.json — tạo bằng
   tools/generate_edge_tts_audio.py) → không có thì /api/tts (giọng Neural theo yêu cầu, cache server) → lỗi/tắt/offline
   rơi về giọng hệ thống (Web Speech API). */
let voice = null;
// Giọng nam tự nhiên trước (Edge có bản "Online (Natural)"), rồi giọng nam quen của Chrome / Apple
const MALE_VOICE_PREFS = [/(Christopher|Andrew|Guy|Brian|Eric).*(Natural|Online)/i, /Google UK English Male/i, /\b(Daniel|Alex|Fred)\b/];
function pickVoice() {
  const vs = speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang));
  voice = null;
  for (const re of MALE_VOICE_PREFS) if (!voice) voice = vs.find(v => re.test(v.name)) || null;
  voice = voice || vs.find(v => /en-US/i.test(v.lang)) || vs[0] || null;
}
if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }

/* ---- MP3 tạo sẵn ---- */
let audioMap = null;                       // text chuẩn hoá → tên file trong audio/
const player = typeof Audio !== 'undefined' ? new Audio() : null;
let playToken = 0, blobUrl = null;
let pendingDone = null;                    // resolve của lượt speak() trước, chưa xong thì bị lượt mới "đè" gọi luôn
// Phải khớp normalize() trong tools/generate_edge_tts_audio.py
function audioKey(t) { return String(t || '').replace(/\s+/g, ' ').trim(); }
fetchFirstOk(audioSources(), u => fetch(u), isAudioIndexJson).then(src => { audioMap = src ? cleanAudioItems(src.data.items) : null; });
// iOS chỉ cho thẻ Audio phát sau fetch bất đồng bộ nếu nó từng play() trong một cử chỉ thật (touchend/click/phím)
// → phát 1 mẫu im lặng; gọi lại mỗi cử chỉ / mỗi speak() cho tới khi play() thành công
let unlocked = false;
function unlockAudio() {
  if (unlocked || !player || !player.paused) return;
  player.src = 'data:audio/wav;base64,UklGRiUAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQEAAACA';
  player.play().then(() => { unlocked = true; }).catch(() => {});
}
if (player) ['touchend', 'click', 'keydown'].forEach(ev => document.addEventListener(ev, unlockAudio, { capture: true, passive: true }));

/* ---- /api/tts (giọng Neural theo yêu cầu, cache ở server) ---- */
let ttsOffUntil = 0;                       // 501/404/405 (server chưa/không bật tts) → tạm ngừng gọi 10 phút
let curAbort = null;                       // AbortController của fetch (mp3 dựng sẵn hoặc tts) đang chạy
const TTS_MAX = 200;
// trả URL /api/tts nếu đủ điều kiện gọi (online, câu ngắn, không chứa thẻ, chưa bị tắt tạm), không thì null
function ttsUrl(text) {
  const key = audioKey(text);
  if (!key || key.length > TTS_MAX || /[<>]/.test(key)) return null;
  if (navigator.onLine === false) return null;
  if (Date.now() < ttsOffUntil) return null;
  try { return 'api/tts?text=' + encodeURIComponent(key); }
  catch (e) { return null; }               // surrogate lẻ (URIError) → đọc bằng giọng hệ thống, speak() không được reject
}

// text (tuỳ chọn): có MP3 sẵn thì chắc chắn đọc được; không thì chỉ dựa vào Web Speech như trước
function hasVoice(text) {
  if (text && audioMap && audioMap[audioKey(text)]) return true;
  return 'speechSynthesis' in window && (!!voice || speechSynthesis.getVoices().length === 0);
}
// dừng ngay lượt đọc hiện tại (đổi thẻ giữa chừng…): huỷ fetch, huỷ Web Speech, tạm dừng player, coi như đã xong
function stopSpeaking() {
  playToken++;
  if (curAbort) curAbort.abort();
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  if (player) player.pause();
  if (pendingDone) { const d = pendingDone; pendingDone = null; d(); }
}
function speakSystem(text, rate, done) {
  if (!('speechSynthesis' in window)) { done && done(); return; }
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US'; u.rate = rate || .92; if (voice) u.voice = voice;
  let fired = false, watchdog;
  // iOS có lúc chặn Web Speech ngoài cử chỉ thật → onend/onerror không bao giờ bắn; tự coi như xong sau ước lượng
  // thời gian đọc để không treo Promise của speak() mãi mãi.
  const finish = () => { if (fired) return; fired = true; clearTimeout(watchdog); done && done(); };
  watchdog = setTimeout(finish, Math.max(4000, 150 * text.length / (rate || .92)));
  u.onend = u.onerror = finish;
  speechSynthesis.speak(u);
}
// trả Promise resolve khi đọc xong / lỗi / bị lượt mới thay
function speak(text, rate) {
  if (!text) return Promise.resolve();
  return new Promise(resolve => {
    if (pendingDone) pendingDone();        // lượt cũ chưa xong bị thay → resolve luôn, không treo
    pendingDone = resolve;
    const done = () => { if (pendingDone === resolve) pendingDone = null; resolve(); };
    const token = ++playToken;             // lần gọi mới hơn thắng, lần cũ đang tải thì bỏ
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    if (player) player.pause();
    if (curAbort) curAbort.abort();        // huỷ hẳn fetch của lượt trước, không chỉ bỏ qua kết quả
    // Safari < 12.1 không có AbortController → vẫn phát được, chỉ không huỷ được fetch cũ
    const ac = curAbort = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const file = audioMap && audioMap[audioKey(text)];
    const tts = !file && ttsUrl(text);     // không có mp3 dựng sẵn mới cân nhắc gọi /api/tts
    const url = file ? 'audio/' + file : tts;
    if (!url || !player) { speakSystem(text, rate, done); return; }
    unlockAudio();                         // speak() thường chạy ngay trong click → tận dụng cử chỉ trước khi fetch
    // Nguồn lỗi (onerror và play() reject có thể cùng bắn) → rơi sang giọng hệ thống đúng 1 lần;
    // gỡ handler của player để mẫu im lặng của unlockAudio không bắn onended báo xong nhầm
    let fell = false, timer = null;
    const fallback = () => {
      if (fell || token !== playToken) return;   // lượt mới hơn tự lo phần của nó, ở đây không đọc đè
      fell = true; player.onended = player.onerror = null;
      if (timer) clearTimeout(timer);
      speakSystem(text, rate, done);
    };
    const opts = ac ? { signal: ac.signal } : {};
    if (tts) {
      opts.headers = { 'X-LB-TTS': '1' };
      // timeout 6s: token còn khớp → fallback ở catch bên dưới (không có AbortController thì fallback thẳng, fetch chạy nốt)
      timer = setTimeout(() => ac ? ac.abort() : fallback(), 6000);
    }
    // Tải thành blob (qua service worker cache) thay vì gán thẳng URL: Safari gửi Range request, cache trả 200 đủ file sẽ không phát
    fetch(url, opts).then(r => {
      // 501 (tắt hẳn) / 404, 405 (server cũ chưa có route) → coi như tts đang tắt, tạm ngừng gọi 10 phút
      if (tts && (r.status === 501 || r.status === 404 || r.status === 405)) ttsOffUntil = Date.now() + 10 * 60 * 1000;
      if (!r.ok) throw new Error(r.status);
      return r.blob();
    }).then(b => {
      if (timer) clearTimeout(timer);
      if (token !== playToken || fell) return;   // lượt mới đã chạy / đã rơi sang giọng hệ thống → không phát đè
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      blobUrl = URL.createObjectURL(b);
      player.src = blobUrl;
      player.defaultPlaybackRate = player.playbackRate = rate || 1;   // nạp src sẽ reset playbackRate về default
      player.onended = () => { if (token === playToken) done(); };
      player.onerror = fallback;
      return player.play();
    }).catch(fallback);
  });
}
