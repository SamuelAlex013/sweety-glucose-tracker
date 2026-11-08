CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,
  name varchar(80) NOT NULL,
  email varchar(254) NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash char(64) PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS readings (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL CHECK (date >= DATE '1900-01-01'),
  slot text NOT NULL CHECK (slot IN ('morning', 'breakfast', 'lunch', 'dinner')),
  value smallint NOT NULL CHECK (value BETWEEN 40 AND 600),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT readings_user_date_slot_key UNIQUE (user_id, date, slot)
);
-- Four valid slots plus uniqueness also enforce the four-per-day limit under concurrency.
CREATE INDEX IF NOT EXISTS readings_user_date_idx ON readings(user_id, date DESC);
