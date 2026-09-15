/* Phát âm bằng giọng hệ thống (Web Speech API). */
let voice = null;
function pickVoice() {
  const vs = speechSynthesis.getVoices();
  voice = vs.find(v => /en-US/i.test(v.lang)) || vs.find(v => /^en/i.test(v.lang)) || null;
}
if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
function hasVoice() { return 'speechSynthesis' in window && (!!voice || speechSynthesis.getVoices().length === 0); }
function speak(text, rate) {
  if (!('speechSynthesis' in window) || !text) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US'; u.rate = rate || .92; if (voice) u.voice = voice;
  speechSynthesis.speak(u);
}
