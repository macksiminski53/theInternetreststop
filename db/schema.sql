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

-- Admin flag: only admins can add/edit cards on the homepage. Ray's account
-- gets this set manually (see routes/cards.js comments / README note).
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS saved_links (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_id VARCHAR(50) NOT NULL,
  title VAR