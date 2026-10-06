/* Gọi Gemini REST generateContent tạo hội thoại nhập vai (JSON theo RESPONSE_SCHEMA). Không SDK, dùng fetch (Node ≥18).
   Không log prompt / nội dung trả về. Lỗi: code 'UPSTREAM' (HTTP / mạng / rỗng) | 'INVALID' (JSON hỏng — được gọi lại)
   | 'QUOTA' (Google trả 429: hết lượt / quá nhanh) | 'BUSY' (bị abort / hết hạn).
   429: model đó bị bỏ qua theo retryDelay Google gửi (kẹp 30s–10 phút; thiếu → 10 phút) — không gọi lời chắc chắn hỏng;
   có fallbackModel thì chuyển sang model đó (hạn mức miễn phí có thể tính riêng theo model — xem AI Studio).
   quotaWaitMs() > 0 = mọi model đang bị bỏ qua → route trả 429 ngay, KHÔNG trừ lượt thử của người dùng.
   createGeminiDialogueProvider({ apiKey, model, fallbackModel, learner, fetchImpl, now })
     → { model, generate({ scenarios, words, signal }) → Promise<object>, quotaWaitMs() }
   learner: bối cảnh người học (env DIALOGUE_LEARNER_CONTEXT) để hội thoại sát đời thật của họ. */
const { buildPrompt, SYSTEM_INSTRUCTION, RESPONSE_SCHEMA } = require('./dialogue-prompt-builder.js');
const { cleanText } = require('./dialogue-content-validator.js');

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/';
const QUOTA_BLOCK_MS = 10 * 60 * 1000, QUOTA_BLOCK_MIN_MS = 30 * 1000;
const MODEL_RE = /^[a-z0-9.-]+$/i;

function providerError(code, message) { const e = new Error(message); e.code = code; return e; }

// body lỗi 429 của Google: error.details[] có RetryInfo.retryDelay dạng "37s" (giới hạn theo phút → vài chục giây;
// hết lượt ngày → lâu hơn). Không đọc được → mặc định 10 phút.
async function retryDelayMs(res) {
  try {
    const b = await res.json();
    const info = ((b && b.error && b.error.details) || []).find(d => d && typeof d.retryDelay === 'string');
    const sec = info && parseFloat(info.retryDelay);
    if (sec > 0) return Math.min(QUOTA_BLOCK_MS, Math.max(QUOTA_BLOCK_MIN_MS, sec * 1000));
  } catch (e) { /* body không phải JSON */ }
  return QUOTA_BLOCK_MS;
}

function createGeminiDialogueProvider({ apiKey, model, fallbackModel, learner, fetchImpl = fetch, now = Date.now }) {
  if (!apiKey) throw new Error('thiếu GEMINI_API_KEY');
  if (!MODEL_RE.test(model || '')) throw new Error('GEMINI_MODEL không hợp lệ');
  if (fallbackModel && !MODEL_RE.test(fallbackModel)) throw new Error('GEMINI_MODEL_FALLBACK không hợp lệ');
  const models = fallbackModel && fallbackModel !== model ? [model, fallbackModel] : [model];
  const blockedUntil = new Map();   // model → mốc hết bị bỏ qua sau 429
  const learnerText = cleanText(learner, 300);

  async function callModel(m, body, signal) {
    let res;
    try {
      res = await fetchImpl(ENDPOINT + m + ':generateContent', {
        method: 'POST', signal,
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(body)
      });
    } catch (e) {
      if (signal && signal.aborted) throw providerError('BUSY', 'gemini aborted');
      throw providerError('UPSTREAM', 'gemini network: ' + (e && e.message));
    }
    if (res.status === 429) {
      const ms = await retryDelayMs(res);
      blockedUntil.set(m, now() + ms);
      throw providerError('QUOTA', 'gemini 429 model=' + m + ' block=' + Math.round(ms / 1000) + 's');
    }
    if (!res.ok) throw providerError('UPSTREAM', 'gemini http ' + res.status);
    let data;
    try { data = await res.json(); } catch (e) { throw providerError(signal && signal.aborted ? 'BUSY' : 'UPSTREAM', 'gemini body không phải JSON'); }
    const cand = data && data.candidates && data.candidates[0];
    const parts = (cand && cand.content && cand.content.parts) || [];
    const text = parts.filter(p => p && typeof p.text === 'string' && !p.thought).map(p => p.text).join('');
    if (!text) throw providerError('UPSTREAM', 'gemini rỗng, finishReason=' + ((cand && cand.finishReason) || 'none'));
    try { return JSON.parse(text); } catch (e) { throw providerError('INVALID', 'gemini JSON hỏng, finishReason=' + ((cand && cand.finishReason) || 'none')); }
  }

  async function generate({ scenarios, words, signal }) {
    const body = {
      systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      contents: [{ role: 'user', parts: [{ text: buildPrompt(scenarios, words, learnerText) }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.75,   // đủ đa dạng (đã có 3 thẻ tình huống xoay vòng), ít câu kỳ quặc
        maxOutputTokens: 8192,   // trần chung cho cả token thinking + JSON (~1.5k token cho 14 lượt có tiếng Việt)
        thinkingConfig: { thinkingLevel: 'low' }   // 'low' có ở mọi Flash 3.x; hội thoại ngắn không cần suy luận sâu
      }
    };
    const usable = models.filter(m => !(blockedUntil.get(m) > now()));
    if (!usable.length) throw providerError('QUOTA', 'mọi model đang tạm bỏ qua sau 429');
    for (let i = 0; i < usable.length; i++) {
      try { return await callModel(usable[i], body, signal); }
      catch (e) { if (e.code !== 'QUOTA' || i === usable.length - 1) throw e; }   // chỉ 429 mới thử model kế
    }
  }

  // > 0: mọi model đang bị bỏ qua sau 429, còn bao lâu nữa (ms)
  function quotaWaitMs() { const t = now(); return Math.max(0, Math.min(...models.map(m => (blockedUntil.get(m) || 0) - t))); }

  return { model, generate, quotaWaitMs };
}

module.exports = { createGeminiDialogueProvider };
