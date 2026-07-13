-- The Internet Rest Stop -- database schema

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  avatar VARCHAR(20) NOT NULL DEFAULT 'traveler',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Safe to re-run: adds the column only if it's missing (covers databases
-- created before avatars existed).
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar VARCHAR(20) NOT NULL DEFAULT 'traveler';

CREATE TABLE IF NOT EXISTS saved_links (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_id VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  category VARCHAR(50) NOT NULL,
  url TEXT,
  description TEXT,
  saved_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, card_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_links_user ON saved_links(user_id);
