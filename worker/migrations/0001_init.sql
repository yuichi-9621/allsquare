-- Allsquare schema (design spec §8). Money is integer minor units.
-- The only float is fx_rate_to_base (an exchange rate, not a monetary amount).

CREATE TABLE groups (
  id            TEXT    PRIMARY KEY,
  slug          TEXT    NOT NULL UNIQUE,
  title         TEXT    NOT NULL,
  base_currency TEXT    NOT NULL,
  rounding      INTEGER NOT NULL,        -- 1 | 10 | 100 | 1000
  created_at    TEXT    NOT NULL
);

CREATE TABLE members (
  id         TEXT    PRIMARY KEY,
  group_id   TEXT    NOT NULL REFERENCES groups(id),
  name       TEXT    NOT NULL,
  sort_order INTEGER NOT NULL
);

CREATE TABLE expenses (
  id              TEXT    PRIMARY KEY,
  group_id        TEXT    NOT NULL REFERENCES groups(id),
  payer_member_id TEXT    NOT NULL REFERENCES members(id),
  amount_minor    INTEGER NOT NULL,      -- in `currency`, as entered
  currency        TEXT    NOT NULL,
  fx_rate_to_base REAL    NOT NULL,      -- FROZEN at entry; base-per-currency
  fx_rate_date    TEXT    NOT NULL,      -- YYYY-MM-DD (may be carried forward)
  description     TEXT    NOT NULL,
  split_type      TEXT    NOT NULL,      -- 'equal' | 'exact'
  created_at      TEXT    NOT NULL,
  deleted_at      TEXT                   -- soft delete; NULL = live
);

-- For 'exact' splits: one row per member with their exact share (base minor units).
-- For 'equal' splits: rows identify the participant subset; share_amount_minor is 0
-- (amounts are derived at compute time by @allsquare/core).
CREATE TABLE expense_shares (
  expense_id         TEXT    NOT NULL REFERENCES expenses(id),
  member_id          TEXT    NOT NULL REFERENCES members(id),
  share_amount_minor INTEGER NOT NULL
);

-- Frankfurter lookup cache. base = group base currency (convert TO),
-- quote = expense currency (convert FROM), rate = base-per-quote (= fxRateToBase),
-- date = the effective published date of the rate (design §8: keyed by quote+date).
CREATE TABLE fx_rates (
  base  TEXT NOT NULL,
  quote TEXT NOT NULL,
  date  TEXT NOT NULL,
  rate  REAL NOT NULL,
  PRIMARY KEY (base, quote, date)
);

CREATE INDEX idx_members_group ON members(group_id);
CREATE INDEX idx_expenses_group ON expenses(group_id);
CREATE INDEX idx_expense_shares_expense ON expense_shares(expense_id);
