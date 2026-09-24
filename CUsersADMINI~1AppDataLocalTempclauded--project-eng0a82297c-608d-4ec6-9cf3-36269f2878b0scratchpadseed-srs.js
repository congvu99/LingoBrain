const fs = require('fs');
const path = require('path');

// Đọc words.json
const wordsPath = path.join('D:\project\eng', 'words.json');
const data = JSON.parse(fs.readFileSync(wordsPath, 'utf8'));
const words = data.words.slice(0, 20); // Lấy 20 từ đầu

// Tạo object SRS
const srs = {};
const now = Date.now();
const tomorrow = now + 86400000; // +1 ngày

words.forEach((w, i) => {
  srs[w.id] = {
    state: 'review',
    lapses: i < 15 ? 0 : 2, // 5 từ cuối có lapses:2 (vàng)
    ef: 2.5,
    ivl: 3,
    due: tomorrow,
    reps: 2,
    hist: []
  };
});

console.log(JSON.stringify(srs, null, 2));
