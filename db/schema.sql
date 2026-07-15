-- The Internet Rest Stop -- database schema

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  avatar VARCHAR(20) NOT NULL DEFAULT 'traveler',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar VARCHAR(20) NOT NULL DEFAULT 'traveler';

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

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

CREATE TABLE IF NOT EXISTS cards (
  id SERIAL PRIMARY KEY,
  card_id VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(200) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'Browse',
  description TEXT,
  image_url TEXT,
  link_url TEXT,
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  big_row BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  visit_count INTEGER NOT NULL DEFAULT 0,
  added_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cards_sort ON cards(sort_order);

INSERT INTO cards (card_id, title, category, description, image_url, link_url, featured, big_row, sort_order)
VALUES
  ('mk', 'MK', 'Browse', 'Online chatting better than discord???', '/mk-logo.png', 'https://mk-app-1.onrender.com', TRUE, TRUE, 10),
  ('whenwhere', 'the when & where', 'Browse', 'Live events in the Triangle -- Raleigh, Durham, and Chapel Hill.', '/whenwhere-screenshot-home.png', 'https://thewhenandwhere.com', TRUE, TRUE, 20),
  ('mtd', 'MusicToDiscord', 'Browse', 'Show what you''re playing in Apple Music / iTunes as your Discord status.', '/mtd-logo.svg', 'https://github.com/macksiminski53/iTunes2Discord/releases/latest', TRUE, TRUE, 30),
  ('markus', 'Markus the Music Pet', 'Browse', 'A little bear who eats music instead of food. From MusicToDiscord.', '/markus-party.svg', '/markus.html', TRUE, TRUE, 40),
  ('baby-markus', 'Baby Markus''s Field', 'Browse', 'A younger, separate version of Markus -- from before he grew up into the MusicToDiscord pet. Raise him in his own free-roam field.', '/baby-markus-ad.svg', '/baby-markus.html', FALSE, TRUE, 50),
  ('site-c', 'Placeholder Site C', 'Browse', 'Add a quirky corner of the web here.', null, null, FALSE, FALSE, 100),
  ('tool-b', 'Placeholder Tool B', 'Browse', 'Another useful utility goes here.', null, null, FALSE, FALSE, 110),
  ('tool-c', 'Placeholder Tool C', 'Browse', 'Save a slot for a handy site you use often.', null, null, FALSE, FALSE, 120),
  ('pick-a', 'Placeholder Pick A', 'Browse', 'Your own project, social, or favorite link goes here.', null, null, FALSE, FALSE, 130),
  ('pick-b', 'Placeholder Pick B', 'Browse', 'Another personal favorite slot.', null, null, FALSE, FALSE, 140)
ON CONFLICT (card_id) DO NOTHING;

UPDATE cards SET image_url = '/baby-markus-ad.svg'
WHERE card_id = 'baby-markus' AND image_url IS NULL;

-- Grant admin to Mak's account. Guarded with is_admin = FALSE so this is a
-- one-time grant on deploy -- it won't re-run or fight anyone who later
-- revokes admin from this account on purpose.
UPDATE users SET is_admin = TRUE
WHERE username = 'Mak' AND is_admin = FALSE;

-- Simple key/value settings table for small editable bits of site copy that
-- don't need their own dedicated table (the MK hero banner text and the
-- scrolling marquee message). Admin-editable via /api/settings.
CREATE TABLE IF NOT EXISTS site_settings (
  key VARCHAR(50) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO site_settings (key, value) VALUES
  ('mk_banner_text', 'online chatting<br>better than<br>discord???'),
  ('mk_marquee_text', 'ITS RIGHT HERE ON THE INTERNET RESTSTOP!!!!'),
  ('mk_logo_url', '/mk-logo.png'),
  ('maintenance_mode', 'false'),
  ('site_theme', 'classic')
ON CONFLICT (key) DO NOTHING;

-- Small ad slots for actual indie/local businesses, kept separate from the
-- main cards table since these are meant to look and feel different from
-- the corporate rotation (MK, when&where, MusicToDiscord) -- a homemade
-- "shoutout" spot rather than another Browse card. Admin-editable via
-- /api/local-biz, shown in both the rotating ad carousel and a small
-- footer strip.
CREATE TABLE IF NOT EXISTS local_biz_ads (
  id SERIAL PRIMARY KEY,
  biz_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  tagline TEXT,
  image_url TEXT,
  link_url TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  added_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_local_biz_ads_sort ON local_biz_ads(sort_order);
