---
status: completed
created: 2026-09-23
---

# Giọng Neural (edge-tts ChristopherNeural) cho LingoBrain

Tạo sẵn MP3 cho mọi `word` + `context` trong `words.json` bằng edge-tts; `speak()` phát MP3 nếu có, không có thì Web Speech (ưu tiên giọng nam tự nhiên).

## Quyết định (user đã chốt)
- Giọng `en-US-ChristopherNeural` · cả từ + câu (~5009 text, ~60MB) · `audio/` commit vào repo · cache khi phát lần đầu (cache riêng, không xoá khi lên version).

## Phases
| # | Phase | File |
|---|---|---|
| 1 ✅ | Script tạo audio + manifest | [phase-01](phase-01-generate-audio-script.md) |
| 2 ✅ | Runtime `speak()` + service worker | [phase-02](phase-02-runtime-playback-and-sw-cache.md) |
| 3 ✅ | Test, version bump, docs | [phase-03](phase-03-tests-version-docs.md) |

Phụ thuộc: 1 → 2 → 3 (2 cần `audio/index.json` để thử thật).

## Acceptance criteria
1. `python tools/generate_edge_tts_audio.py` tạo `audio/<hash>.mp3` + `audio/index.json` cho 100% word/context; chạy lại chỉ tạo text mới, xoá file mồ côi.
2. Mọi lời gọi `speak(text, rate)` hiện có không đổi chữ ký; text có trong manifest → phát MP3 giọng Christopher; `rate .6` → phát chậm (playbackRate).
3. Text không có (từ người dùng nạp, chữ gõ tay, file:// fetch lỗi, play() bị chặn) → Web Speech, ưu tiên giọng nam Natural/Online.
4. Bấm nhanh liên tiếp: chỉ âm cuối phát, không chồng tiếng.
5. MP3 đã nghe → phát được offline; lên version không xoá cache audio.
6. `node tests/run-tests.js` pass 100%, gồm test mới: manifest phủ đủ words.json + mọi file tồn tại.

## Ngoài phạm vi
Tạo audio cho từ người dùng import lúc runtime; UI chọn giọng; precache toàn bộ audio; Git LFS.

## Kết quả (2026-09-23)
- 5009/5009 MP3 (89MB), chạy lại → 0 file mới. Test 104/104 pass.
- Sửa theo review: unlock iOS qua touchend/click/keydown + trong speak(); `hasVoice(text)`; ghi manifest nguyên tử; SW chỉ cache 200.
- Version do phiên song song (iphone-redesign) nâng lên 2.5.0 — đã gồm thay đổi này.
- Chưa kiểm: phát thật trên iPhone / trình duyệt (tester không có headless browser).
