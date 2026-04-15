-- DAJO 3.0 — Full database schema

CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  email       TEXT UNIQUE NOT NULL,
  name        TEXT,
  password_hash TEXT NOT NULL,
  is_admin    BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS songs (
  id                  SERIAL PRIMARY KEY,
  user_id             INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  artist              TEXT DEFAULT '',
  key                 TEXT DEFAULT 'C',
  tempo               INTEGER DEFAULT 120,
  time_signature      TEXT DEFAULT '4/4',
  style               TEXT DEFAULT '',
  sections            JSONB DEFAULT '[]',
  notes               TEXT DEFAULT '',
  preferred_format    TEXT DEFAULT 'ireal',   -- 'ireal' | 'songbook' | 'notation'
  is_public           BOOLEAN DEFAULT FALSE,
  original_file_data  TEXT,                   -- base64
  original_file_type  TEXT,                   -- 'pdf' | 'image'
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS setlists (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT DEFAULT '',
  is_public   BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS setlist_songs (
  id          SERIAL PRIMARY KEY,
  setlist_id  INTEGER REFERENCES setlists(id) ON DELETE CASCADE,
  song_id     INTEGER REFERENCES songs(id) ON DELETE CASCADE,
  position    INTEGER NOT NULL,
  UNIQUE (setlist_id, song_id)
);

CREATE TABLE IF NOT EXISTS groups (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  created_by  INTEGER REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS group_members (
  id          SERIAL PRIMARY KEY,
  group_id    INTEGER REFERENCES groups(id) ON DELETE CASCADE,
  user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (group_id, user_id)
);

CREATE TABLE IF NOT EXISTS invitations (
  id          SERIAL PRIMARY KEY,
  group_id    INTEGER REFERENCES groups(id) ON DELETE CASCADE,
  token       TEXT UNIQUE NOT NULL,
  created_by  INTEGER REFERENCES users(id),
  used        BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shares (
  id          SERIAL PRIMARY KEY,
  token       TEXT UNIQUE NOT NULL,
  resource_type TEXT NOT NULL,  -- 'song' | 'setlist'
  resource_id INTEGER NOT NULL,
  created_by  INTEGER REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS song_group_shares (
  song_id     INTEGER REFERENCES songs(id) ON DELETE CASCADE,
  group_id    INTEGER REFERENCES groups(id) ON DELETE CASCADE,
  PRIMARY KEY (song_id, group_id)
);

CREATE TABLE IF NOT EXISTS setlist_group_shares (
  setlist_id  INTEGER REFERENCES setlists(id) ON DELETE CASCADE,
  group_id    INTEGER REFERENCES groups(id) ON DELETE CASCADE,
  PRIMARY KEY (setlist_id, group_id)
);

-- Training data for AI improvement
CREATE TABLE IF NOT EXISTS training_submissions (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER REFERENCES users(id),
  original_ai     JSONB,   -- What the AI produced
  correction      JSONB,   -- What the user corrected it to
  file_type       TEXT,    -- 'pdf' | 'image'
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Pilot signups (landing-page interest list)
CREATE TABLE IF NOT EXISTS pilot_signups (
  id          SERIAL PRIMARY KEY,
  email       TEXT UNIQUE NOT NULL,
  name        TEXT,
  instrument  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Idempotent migrations for existing deployments (safe to run multiple times)
ALTER TABLE songs ADD COLUMN IF NOT EXISTS original_file_data TEXT;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS original_file_type TEXT;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS preferred_format TEXT DEFAULT 'ireal';
ALTER TABLE songs ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;

-- Auto-update updated_at on songs
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS songs_updated_at ON songs;
CREATE TRIGGER songs_updated_at
  BEFORE UPDATE ON songs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
