/* Gọi Gemini REST generateContent tạo hội thoại nhập vai (JSON theo RESPONSE_SCHEMA). Không SDK, dùng fetch (Node ≥18).
   Không log prompt / nội dung trả về. Lỗi: code 'UPSTREAM' (HTTP / mạng / rỗng) | 'INVALID' (JSON hỏng — được gọi lại)
   | 'BUSY' (bị abort / hết hạn).
   createGeminiDialogueProvider({ apiKey, model, fetchImpl }) → { model, generate({ scenario, words, signal }) → Promise<object> } */
const { buildPrompt, RESPONSE_SCHEMA } = require('./dialogue-content-validator.js');

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/';

function providerError(code, message) { const e = new Error(message); e.code = code; return e; }

function createGeminiDialogueProvider({ apiKey, model, fetchImpl = fetch }) {
  if (!apiKey) throw new Error('thiếu GEMINI_API_KEY');
  if (!/^[a-z0-9.-]+$/i.test(model || '')) throw new Error('GEMINI_MODEL không hợp lệ');

  async function generate({ scenario, words, signal }) {
    const body = {
      contents: [{ role: 'user', parts: [{ text: buildPrompt(scenario, words) }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.9,
        maxOutputTokens: 8192,   // trần chung cho cả token thinking + JSON (~1.5k token cho 14 lượt có tiếng Việt)
        thinkingConfig: { thinkingLevel: 'low' }   // 'low' có ở mọi Flash 3.x; hội thoại ngắn không cần suy luận sâu
      }
    };
    let res;
    try {
      res = await fetchImpl(ENDPOINT + model + ':generateContent', {
        method: 'POST', signal,
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(body)
      });
    } catch (e) {
      if (signal && signal.aborted) throw providerError('BUSY', 'gemini aborted');
      throw providerError('UPSTREAM', 'gemini network: ' + (e && e.message));
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

  return { model, generate };
}

module.exports = { createGeminiDialogueProvider };
