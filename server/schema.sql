-- Schema LingoBrain — nguồn duy nhất. server/database.js chạy file này mỗi lần khởi động; tools/seed-database.js cũng dùng.
-- Mọi câu đều IF NOT EXISTS → chạy lại bao nhiêu lần cũng được.

-- Tài khoản + phiên + tiến độ đồng bộ
CREATE TABLE IF NOT EXISTS users (
  id serial PRIMARY KEY, username text UNIQUE NOT NULL, pass_hash text NOT NULL, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS sessions (
  token_hash text PRIMARY KEY, user_id int NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(), last_used_at timestamptz DEFAULT now());
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
CREATE TABLE IF NOT EXISTS progress (
  user_id int PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, data jsonb NOT NULL, updated_at timestamptz DEFAULT now());

-- Bộ từ (seed từ words.json, thứ tự giữ bằng sort_order)
CREATE TABLE IF NOT EXISTS words (
  id text PRIMARY KEY, word text NOT NULL, ipa text NOT NULL DEFAULT '', pos text NOT NULL DEFAULT '',
  meaning text NOT NULL DEFAULT '', context text NOT NULL DEFAULT '', context_vi text NOT NULL DEFAULT '',
  source text NOT NULL DEFAULT '', emoji text NOT NULL DEFAULT '', image text NOT NULL DEFAULT '',
  mnemonic text NOT NULL DEFAULT '', output_prompt text NOT NULL DEFAULT '',
  sort_order int NOT NULL, updated_at timestamptz DEFAULT now());

-- Audio index (seed từ audio/index.json): text đã chuẩn hoá → tên MP3 trong audio/. CHECK chặn đường dẫn lạ kể cả khi sửa tay.
CREATE TABLE IF NOT EXISTS audio_clips (
  text text PRIMARY KEY, file text NOT NULL CHECK (file ~ '^[0-9a-f]{12}\.mp3$'));

-- 1 dòng duy nhất: tên bộ, giọng đọc, hash nội dung 2 file nguồn (đổi hash → seed lại, API đổi ETag)
CREATE TABLE IF NOT EXISTS deck_meta (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1), deck text NOT NULL, updated text NOT NULL DEFAULT '',
  voice text NOT NULL DEFAULT '', content_hash text NOT NULL, seeded_at timestamptz DEFAULT now());
