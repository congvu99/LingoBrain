/* Phát âm: ưu tiên MP3 giọng Neural tạo sẵn (danh mục từ /api/audio-index, lỗi thì audio/index.json — tạo bằng tools/generate_edge_tts_audio.py);
   text không có sẵn (từ tự nạp, chữ gõ tay) hoặc phát lỗi → giọng hệ thống (Web Speech API). */
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

// text (tuỳ chọn): có MP3 sẵn thì chắc chắn đọc được; không thì chỉ dựa vào Web Speech như trước
function hasVoice(text) {
  if (text && audioMap && audioMap[audioKey(text)]) return true;
  return 'speechSynthesis' in window && (!!voice || speechSynthesis.getVoices().length === 0);
}
function speakSystem(text, rate, done) {
  if (!('speechSynthesis' in window)) { done && done(); return; }
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US'; u.rate = rate || .92; if (voice) u.voice = voice;
  u.onend = u.onerror = () => done && done();
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
    const file = audioMap && audioMap[audioKey(text)];
    if (!file || !player) { speakSystem(text, rate, done); return; }
    unlockAudio();                         // speak() thường chạy ngay trong click → tận dụng cử chỉ trước khi fetch
    // MP3 lỗi (onerror và play() reject có thể cùng bắn) → rơi sang giọng hệ thống đúng 1 lần;
    // gỡ handler của player để mẫu im lặng của unlockAudio không bắn onended báo xong nhầm
    let fell = false;
    const fallback = () => {
      if (fell || token !== playToken) return;
      fell = true; player.onended = player.onerror = null;
      speakSystem(text, rate, done);
    };
    // Tải thành blob (qua service worker cache) thay vì gán thẳng URL: Safari gửi Range request, cache trả 200 đủ file sẽ không phát
    fetch('audio/' + file).then(r => { if (!r.ok) throw new Error(r.status); return r.blob(); }).then(b => {
      if (token !== playToken) return;     // lượt mới đã chạy → done() của nó lo, không gọi lại ở đây
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
