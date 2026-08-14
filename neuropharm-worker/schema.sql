-- 药枢 NeuroPharm · D1 schema
-- 用法：wrangler d1 execute neuropharm --local --file=./schema.sql
--       wrangler d1 execute neuropharm --remote --file=./schema.sql

CREATE TABLE IF NOT EXISTS users (
  id         TEXT PRIMARY KEY,
  email      TEXT UNIQUE NOT NULL,
  salt       TEXT NOT NULL,
  pw_hash    TEXT NOT NULL,
  iter       INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS states (
  user_id    TEXT PRIMARY KEY,
  state      TEXT,
  updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS devices (
  user_id    TEXT NOT NULL,
  device_id  TEXT NOT NULL,
  name       TEXT,
  ua         TEXT,
  last_seen  INTEGER,
  PRIMARY KEY (user_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_devices_user ON devices(user_id);
