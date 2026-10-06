/* Hội thoại nhập vai — nội dung gửi Gemini: thẻ tình huống, system instruction (quy tắc "dùng được ngay ngoài đời"
   + 1 đoạn mẫu), prompt theo ngày, JSON schema. Thuần. Test: tests/dialogue-content-validator.test.js
   Tiêu chí số 1 là TÍNH ỨNG DỤNG: câu của người học ("you") phải là câu nói được ngay ngày mai, dùng lại ở nhiều
   tình huống; tình huống phải là cái người Việt thật sự gặp (chủ yếu: người nước ngoài ở Việt Nam hỏi / nhờ mình). */

// you/them: vai; goal: việc người học phải làm xong; twist: trục trặc thật buộc phải xử lý bằng lời
const SCENARIOS = [
  { title: 'Giving directions to a lost tourist', vi: 'Chỉ đường cho khách du lịch bị lạc', you: 'local', them: 'tourist', goal: 'explain how to get to a nearby place', twist: 'it is too far to walk, so you suggest Grab' },
  { title: 'Recommending something to a foreign customer', vi: 'Gợi ý món cho khách nước ngoài', you: 'staff', them: 'customer', goal: 'help the customer choose', twist: 'what they want is sold out, so you offer an alternative' },
  { title: 'Fixing a wrong order', vi: 'Xử lý khi khách báo nhầm đơn', you: 'staff', them: 'customer', goal: 'apologize, check and fix the order', twist: 'the customer is a bit annoyed and in a hurry' },
  { title: 'Taking payment', vi: 'Tính tiền cho khách nước ngoài', you: 'cashier', them: 'customer', goal: 'tell the price and take payment', twist: 'the card machine is not working, so you offer cash or a QR bank transfer' },
  { title: 'When you cannot understand the customer', vi: 'Khi nghe không kịp / không hiểu khách', you: 'staff', them: 'customer', goal: 'find out what they need', twist: 'they speak fast with a strong accent; you ask them to repeat and slow down, then confirm' },
  { title: 'Small talk with a regular customer', vi: 'Nói chuyện phiếm với khách quen', you: 'staff', them: 'regular customer', goal: 'chat naturally for a minute while working', twist: 'you get busy and need to end the chat politely' },
  { title: 'Recommending local food', vi: 'Giới thiệu món ăn địa phương', you: 'local', them: 'tourist', goal: 'recommend a local dish and where to eat it', twist: 'they cannot eat spicy food or have an allergy' },
  { title: 'Taking a booking by phone', vi: 'Nhận đặt chỗ qua điện thoại', you: 'staff', them: 'caller', goal: 'take name, time and number of people', twist: 'that time is fully booked, so you suggest another time' },
  { title: 'Answering quick customer questions', vi: 'Trả lời câu hỏi nhanh của khách', you: 'staff', them: 'customer', goal: 'answer about wifi, restroom, opening hours', twist: 'you are about to close soon' },
  { title: 'Handling a refund request', vi: 'Khách muốn trả hàng / hoàn tiền', you: 'staff', them: 'customer', goal: 'explain the policy politely', twist: 'no refunds, only exchange within 3 days' },
  { title: 'Helping a foreigner who feels sick', vi: 'Giúp người nước ngoài bị mệt', you: 'local', them: 'tourist', goal: 'ask what is wrong and point them to a pharmacy or clinic', twist: 'they do not know how to explain the symptoms to the pharmacist' },
  { title: 'Explaining market prices', vi: 'Giải thích giá cả ở chợ', you: 'local', them: 'tourist', goal: 'explain prices and how bargaining works', twist: 'they think they were overcharged' },
  { title: 'Taking a photo for tourists', vi: 'Chụp ảnh giúp khách du lịch', you: 'local', them: 'tourist', goal: 'help and make small talk about where they are from', twist: 'they ask for a good place to visit tonight' },
  { title: 'Clarifying a task from a foreign manager', vi: 'Hỏi lại việc sếp nước ngoài giao', you: 'employee', them: 'manager', goal: 'understand the task and the deadline', twist: 'the deadline is tight, so you ask for help or more time' },
  { title: 'Saying goodbye and inviting customers back', vi: 'Chào khách về và mời quay lại', you: 'staff', them: 'customer', goal: 'thank them, ask about their experience', twist: 'they had one complaint, so you apologize and promise to improve' },
  { title: 'Helping a foreign friend book a Grab', vi: 'Giúp bạn nước ngoài đặt Grab', you: 'friend', them: 'foreign friend', goal: 'explain the app and pickup point', twist: 'the driver goes to the wrong place and calls' },
  { title: 'Introducing yourself to a new foreign coworker', vi: 'Làm quen đồng nghiệp nước ngoài mới', you: 'coworker', them: 'new coworker', goal: 'introduce yourself and offer help', twist: 'they ask where to eat lunch nearby' },
  { title: 'Ordering food when travelling abroad', vi: 'Gọi món khi đi du lịch nước ngoài', you: 'customer', them: 'waiter', goal: 'order and ask questions about the menu', twist: 'something you ordered is not available' },
  { title: 'Checking in at a hotel abroad', vi: 'Nhận phòng khách sạn ở nước ngoài', you: 'guest', them: 'receptionist', goal: 'check in and ask about breakfast and wifi', twist: 'the room is not ready yet' },
  { title: 'Checking in at the airport', vi: 'Làm thủ tục ở sân bay', you: 'passenger', them: 'check-in agent', goal: 'check in and get a seat', twist: 'the bag is overweight' }
];

const SYSTEM_INSTRUCTION = [
  'You write short spoken English dialogues that a Vietnamese learner (A2–B1) will REUSE IN REAL LIFE tomorrow.',
  'Speakers: "you" = the Vietnamese learner (usually living and working in Vietnam), "them" = a native or fluent English speaker.',
  '',
  'Usefulness rules (most important):',
  '- Every "you" line must be a high-frequency, reusable phrase that works in many situations (e.g. "Sorry, could you say that again?", "We just ran out, but I can recommend...", "Give me a sec, I\'ll check."). Max 14 words, simple grammar, natural spoken English.',
  '- The dialogue must contain the situation\'s twist and the learner must handle it with words: apologize, explain, offer an alternative, confirm.',
  '- Include at least one clarification move by the learner (asking to repeat, checking understanding, or confirming details).',
  '- Use realistic concrete details: prices in dong (e.g. "45,000 dong"), real places in Vietnam, Grab, QR bank transfer, motorbikes, opening hours.',
  '- "them" talks like a real person: contractions, short reactions (Oh, Sure, Got it, No worries), sometimes a filler (um, well). No textbook lines like "I am fine, thank you, and you?". No names, no narration, no stage directions.',
  '- Target vocabulary: use each item with the given meaning where it fits naturally, preferably in "you" lines. If an item does not fit, skip it — never force it.',
  '- "hintVi": what the learner would THINK in Vietnamese in that moment (intent, not a translation), so they must build the English sentence themselves.',
  '- "vi": natural Vietnamese translation of the line.',
  '',
  'Example of the style (shorter than required; real output needs the requested number of turns):',
  'them: "Hi! Um, do you guys have oat milk?"',
  'you: "Sorry, we just ran out." (hintVi: "Xin lỗi, hết sữa yến mạch rồi")',
  'them: "Oh no. What else do you have?"',
  'you: "I\'d recommend coconut milk. It\'s really popular." (hintVi: "Gợi ý sữa dừa, nhiều người thích")',
  'them: "Is it sweet?"',
  'you: "A little. I can make it less sweet if you like." (hintVi: "Hơi ngọt, có thể làm ít ngọt cho khách")',
  'them: "Perfect, let\'s do that. How much is it?"',
  'you: "Forty-five thousand dong. Cash or QR transfer?" (hintVi: "Báo giá 45 nghìn, hỏi trả tiền mặt hay quét QR")'
].join('\n');

const TURNS_MIN = 10, TURNS_MAX = 14, CANDIDATES = 3;

const DAY_STRIDE = CANDIDATES * 3;   // 9: đủ 3 lần tạo/ngày × 3 thẻ; nguyên tố cùng nhau với 20 thẻ → ngày liền kề không trùng thẻ

// 3 thẻ tình huống liên tiếp, ổn định theo ngày; lần tạo thứ n trong ngày → nhóm kế tiếp (không lặp nhóm trước)
function pickScenarios(day, n) {
  const dayIndex = Math.floor((Date.parse(day + 'T00:00:00Z') || 0) / 86400000);
  const start = dayIndex * DAY_STRIDE + (n || 0) * CANDIDATES;
  return Array.from({ length: CANDIDATES }, (_, i) => SCENARIOS[(start + i) % SCENARIOS.length]);
}

// words: [{id, word, pos, meaning}] lấy từ DB; learner: bối cảnh người học (env, tuỳ chọn, đã làm sạch)
function buildPrompt(scenarios, words, learner) {
  const cards = scenarios.map((s, i) => (i + 1) + '. ' + s.title + ' — you: ' + s.you + ', them: ' + s.them + '; goal: ' + s.goal + '; twist: ' + s.twist + '.').join('\n');
  const list = words.map(w => '- id "' + w.id + '": "' + w.word + '"' + (w.pos ? ' (' + w.pos + ')' : '') + ' — nghĩa: ' + w.meaning).join('\n');
  return [
    learner ? 'Learner profile: ' + learner + '\nAdapt roles, places and details to this learner\'s real life when it fits.' : '',
    'Candidate situations (choose the ONE where the target items fit most naturally' + (learner ? ' and that is closest to the learner\'s real life' : '') + '):',
    cards,
    '',
    'Target items:',
    list,
    '',
    'Write ' + TURNS_MIN + ' to ' + TURNS_MAX + ' turns, alternating naturally. Each "en" line at most 160 characters.',
    'Return: "scenario" (short English title of the chosen situation), "scenarioVi", "roles" {"you", "them"} (1–3 words each, English),',
    'and "turns": [{"who", "en", "vi", "ids" (target ids used in that line), "hintVi" (only for "you" turns)}].'
  ].filter(Boolean).join('\n');
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

module.exports = { SCENARIOS, SYSTEM_INSTRUCTION, RESPONSE_SCHEMA, TURNS_MIN, TURNS_MAX, pickScenarios, buildPrompt };
