/* Hội thoại nhập vai: làm sạch + kiểm tra JSON Gemini trả về (prompt/tình huống: server/dialogue-prompt-builder.js).
   Thuần. Chuỗi từ LLM là dữ liệu không tin cậy: mọi trường qua cleanText (độ dài, ký tự điều khiển, < >).
   Độ phủ từ chỉ để báo (missing), không quyết định hợp lệ. Test: tests/dialogue-content-validator.test.js */
const path = require('path');
const { isCovered } = require(path.join(__dirname, '..', 'js', 'dialogue-word-match.js'));
const { TURNS_MIN, TURNS_MAX } = require('./dialogue-prompt-builder.js');

const LIMITS = { scenario: 80, roles: 40, en: 200, vi: 300, data: 16384 };

// chuỗi hợp lệ hoặc '' : gom khoảng trắng, cắt độ dài, loại chuỗi có ký tự điều khiển hoặc < >
function cleanText(s, max) {
  if (typeof s !== 'string') return '';
  const t = s.replace(/\s+/g, ' ').trim();
  if (!t || /[\u0000-\u001f\u007f<>]/.test(t)) return '';
  return t.length > max ? t.slice(0, max).trim() : t;
}

// raw (JSON đã parse) → { ok, dialogue? , reason? }. dialogue chỉ chứa trường đã làm sạch.
function validateDialogue(raw, words) {
  const fail = reason => ({ ok: false, reason });
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.turns)) return fail('shape');
  if (raw.turns.length < TURNS_MIN || raw.turns.length > TURNS_MAX) return fail('turns');
  const ids = new Set(words.map(w => w.id));
  const roles = raw.roles || {};
  const d = {
    scenario: cleanText(raw.scenario, LIMITS.scenario), scenarioVi: cleanText(raw.scenarioVi, LIMITS.scenario),
    roles: { you: cleanText(roles.you, LIMITS.roles), them: cleanText(roles.them, LIMITS.roles) },
    turns: []
  };
  if (!d.scenario || !d.scenarioVi || !d.roles.you || !d.roles.them) return fail('header');
  for (const t of raw.turns) {
    if (!t || (t.who !== 'you' && t.who !== 'them')) return fail('who');
    const en = cleanText(t.en, LIMITS.en + 1), vi = cleanText(t.vi, LIMITS.vi);
    if (!en || en.length > LIMITS.en || !vi) return fail('line');
    const turn = { who: t.who, en, vi, ids: (Array.isArray(t.ids) ? t.ids : []).filter(id => typeof id === 'string' && ids.has(id)) };
    turn.ids = [...new Set(turn.ids)];
    if (t.who === 'you') { turn.hintVi = cleanText(t.hintVi, LIMITS.vi); if (!turn.hintVi) return fail('hint'); }
    d.turns.push(turn);
  }
  const sentences = d.turns.map(t => t.en);
  d.targetIds = words.map(w => w.id);
  // Gemini tự khai id ở lượt nào thì tin (bù dạng bất quy tắc: went/bought); không khai + không khớp → missing
  const declared = new Set(d.turns.flatMap(t => t.ids));
  d.missing = words.filter(w => !declared.has(w.id) && !isCovered(sentences, w.word)).map(w => w.id);
  if (JSON.stringify(d).length > LIMITS.data) return fail('size');
  return { ok: true, dialogue: d, coverage: words.length ? 1 - d.missing.length / words.length : 1 };
}

module.exports = { cleanText, validateDialogue };
