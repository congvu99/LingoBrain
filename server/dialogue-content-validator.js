/* Hội thoại nhập vai: danh sách tình huống, prompt gửi Gemini, làm sạch + kiểm tra JSON trả về.
   Thuần. Chuỗi từ LLM là dữ liệu không tin cậy: mọi trường qua cleanText (độ dài, ký tự điều khiển, < >).
   Độ phủ từ chỉ để báo (missing), không quyết định hợp lệ. Test: tests/dialogue-content-validator.test.js */
const path = require('path');
const { isCovered } = require(path.join(__dirname, '..', 'js', 'dialogue-word-match.js'));

const SCENARIOS = [
  ['Ordering coffee at a café', 'Gọi đồ ở quán cà phê'],
  ['Asking for directions on the street', 'Hỏi đường trên phố'],
  ['Shopping for groceries at a supermarket', 'Mua đồ ở siêu thị'],
  ['Seeing a doctor about feeling unwell', 'Đi khám vì thấy không khoẻ'],
  ['Ordering food at a restaurant', 'Gọi món ở nhà hàng'],
  ['Checking in at a hotel', 'Nhận phòng khách sạn'],
  ['Small talk with a coworker on a break', 'Nói chuyện phiếm với đồng nghiệp giờ nghỉ'],
  ['Chatting with a foreign customer at work', 'Trò chuyện với khách nước ngoài ở chỗ làm'],
  ['Taking a taxi or ride-share', 'Đi taxi / xe công nghệ'],
  ['Buying medicine at a pharmacy', 'Mua thuốc ở nhà thuốc'],
  ['Returning a faulty item to a shop', 'Đổi trả món đồ bị lỗi'],
  ['Making plans with a friend for the weekend', 'Hẹn bạn đi chơi cuối tuần'],
  ['Calling to book a table or appointment', 'Gọi điện đặt bàn / đặt lịch'],
  ['Getting a haircut', 'Đi cắt tóc'],
  ['Asking a neighbour for a small favour', 'Nhờ hàng xóm một việc nhỏ'],
  ['Opening a bank account or using the bank', 'Ra ngân hàng làm thủ tục'],
  ['Buying a train or bus ticket', 'Mua vé tàu / xe buýt'],
  ['Getting something repaired', 'Mang đồ đi sửa'],
  ['Meeting a new person at a party', 'Làm quen người mới ở buổi tiệc'],
  ['Talking about the weather and weekend with a friend', 'Nói chuyện thời tiết, cuối tuần với bạn']
];

const LIMITS = { scenario: 80, roles: 40, en: 200, vi: 300, data: 16384 };
const TURNS_MIN = 10, TURNS_MAX = 14;

// ngày "YYYY-MM-DD" → số ổn định; lần tạo thứ n trong ngày → tình huống kế tiếp
function pickScenario(day, n) {
  let h = 0;
  for (const c of String(day)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const [en, vi] = SCENARIOS[(h + (n || 0)) % SCENARIOS.length];
  return { en, vi };
}

// chuỗi hợp lệ hoặc '' : gom khoảng trắng, cắt độ dài, loại chuỗi có ký tự điều khiển hoặc < >
function cleanText(s, max) {
  if (typeof s !== 'string') return '';
  const t = s.replace(/\s+/g, ' ').trim();
  if (!t || /[\u0000-\u001f\u007f<>]/.test(t)) return '';
  return t.length > max ? t.slice(0, max).trim() : t;
}

// words: [{id, word, pos, meaning}] lấy từ DB (nội dung bộ từ, không phải chữ client gửi)
function buildPrompt(scenario, words) {
  const list = words.map(w => '- id "' + w.id + '": "' + w.word + '"' + (w.pos ? ' (' + w.pos + ')' : '') + ' — nghĩa: ' + w.meaning).join('\n');
  return [
    'Write a short, realistic spoken English dialogue for a Vietnamese learner (level A2–B1).',
    'Situation: ' + scenario.en + '.',
    'Two speakers: "you" = the Vietnamese learner, "them" = a native English speaker who fits the situation.',
    'Style: natural everyday spoken English — short sentences, contractions, common reactions (Oh, Sure, Got it). No textbook phrasing, no narration.',
    'Length: ' + TURNS_MIN + ' to ' + TURNS_MAX + ' turns, alternating naturally. Each "en" line at most 160 characters.',
    'Use each target item below at least once with the given meaning, preferably in "you" lines. Natural flow matters more than using every item: skip an item rather than force it.',
    'Target items:',
    list,
    'For every turn give: "who", "en", "vi" (natural Vietnamese translation), "ids" (target ids used in that line).',
    'For "you" turns also give "hintVi": the main idea in Vietnamese (not a word-for-word translation) so the learner must phrase it themselves.',
    'Also give "scenario" (short English title), "scenarioVi", and "roles" {"you": role, "them": role} in English, 1–3 words each.'
  ].join('\n');
}

// JSON schema cho Gemini structured output (kiểu OpenAPI subset)
const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    scenario: { type: 'STRING' }, scenarioVi: { type: 'STRING' },
    roles: { type: 'OBJECT', properties: { you: { type: 'STRING' }, them: { type: 'STRING' } }, required: ['you', 'them'] },
    turns: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          who: { type: 'STRING', enum: ['you', 'them'] }, en: { type: 'STRING' }, vi: { type: 'STRING' },
          hintVi: { type: 'STRING' }, ids: { type: 'ARRAY', items: { type: 'STRING' } }
        },
        required: ['who', 'en', 'vi', 'ids']
      }
    }
  },
  required: ['scenario', 'scenarioVi', 'roles', 'turns']
};

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

module.exports = { SCENARIOS, RESPONSE_SCHEMA, TURNS_MIN, TURNS_MAX, pickScenario, cleanText, buildPrompt, validateDialogue };
