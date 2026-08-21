PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  handle TEXT NOT NULL UNIQUE,
  nickname TEXT NOT NULL,
  avatar TEXT NOT NULL DEFAULT '🙂',
  bio TEXT NOT NULL DEFAULT '',
  discoverable INTEGER NOT NULL DEFAULT 1,
  show_location_age INTEGER NOT NULL DEFAULT 1,
  allow_friend_add INTEGER NOT NULL DEFAULT 1,
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  last_lat REAL,
  last_lon REAL,
  last_location_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS friends (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY(user_id, friend_id),
  CHECK(user_id <> friend_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  from_id TEXT NOT NULL REFERENCES users(id),
  to_id TEXT NOT NULL REFERENCES users(id),
  courier_id TEXT NOT NULL,
  distance_km REAL NOT NULL,
  service_hours REAL NOT NULL,
  created_at INTEGER NOT NULL,
  arrival_at INTEGER NOT NULL,
  failure_at INTEGER,
  body_iv TEXT NOT NULL,
  body_cipher TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_from ON messages(from_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_to ON messages(to_id, created_at DESC);
