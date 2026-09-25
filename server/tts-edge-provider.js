/* Provider Edge TTS (thư viện msedge-tts, không chính thức) — tách riêng để đổi Azure/Google sau.
   createEdgeTtsProvider({ voice, timeoutMs, MsEdgeTTS, OUTPUT_FORMAT }) → { voice, synth(text) → Promise<Buffer> }.
   MsEdgeTTS/OUTPUT_FORMAT tuỳ chọn (test tiêm stub); mặc định require('msedge-tts') thật. */
// msedge-tts 2.0.8 dùng crypto.subtle/getRandomValues toàn cục, Node 18 không có sẵn → polyfill 1 lần
if (!globalThis.crypto) globalThis.crypto = require('crypto').webcrypto;

// thư viện chèn thô text vào SSML (_SSMLTemplate) → phải tự escape, không thì `&`/`<` vỡ XML hoặc chèn được thẻ
function escapeXml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
}

function createEdgeTtsProvider(opts) {
  opts = opts || {};
  const voice = opts.voice;
  const timeoutMs = opts.timeoutMs || 5000;
  let Ctor = opts.MsEdgeTTS;
  let outputFormat = opts.OUTPUT_FORMAT;
  if (!Ctor || !outputFormat) {
    const lib = require('msedge-tts');
    if (!Ctor) Ctor = lib.MsEdgeTTS;
    if (!outputFormat) outputFormat = lib.OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3;
  }
  function synth(text) {
    const tts = new Ctor();
    let timer;
    // 1 timeout bao cả setMetadata + toStream (không riêng từng bước)
    const work = (async () => {
      await tts.setMetadata(voice, outputFormat);
      const { audioStream } = tts.toStream(escapeXml(text));
      return new Promise((resolve, reject) => {
        const chunks = [];
        audioStream.on('data', c => chunks.push(c));
        audioStream.on('end', () => resolve(Buffer.concat(chunks)));
        audioStream.on('error', reject);
      });
    })();
    const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('tts timeout')), timeoutMs); });
    // close() luôn chạy dù thành công/lỗi/timeout — thư viện rò WebSocket nếu không đóng
    return Promise.race([work, timeout]).finally(() => {
      clearTimeout(timer);
      try { tts.close(); } catch (e) { /* đã đóng hoặc chưa từng mở */ }
    });
  }
  return { voice, synth };
}

module.exports = { createEdgeTtsProvider, escapeXml };
