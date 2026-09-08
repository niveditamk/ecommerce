-- =============================================================
-- AURELIS — ADMIN SCHEMA
-- Roles, permissions, staff, sessions and the audit trail, plus
-- the commerce tables the admin panel writes to.
-- =============================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ---------- access control ----------
CREATE TABLE IF NOT EXISTS roles (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  key         TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  rank        INTEGER NOT NULL,           -- lower = more senior
  description TEXT
);

CREATE TABLE IF NOT EXISTS permissions (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  key    TEXT NOT NULL UNIQUE,            -- e.g. products.edit
  module TEXT NOT NULL,
  label  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id       INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS staff (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  salt          TEXT NOT NULL,
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  role_id       INTEGER NOT NULL REFERENCES roles(id),
  status        TEXT NOT NULL DEFAULT 'active',   -- active | suspended
  must_reset    INTEGER NOT NULL DEFAULT 0,
  last_login_at TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS staff_sessions (
  token      TEXT PRIMARY KEY,
  staff_id   INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  ip         TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_staff ON staff_sessions(staff_id);

CREATE TABLE IF NOT EXISTS login_attempts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email      TEXT NOT NULL,
  ip         TEXT,
  ok         INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_attempts_email ON login_attempts(email, created_at);

-- ---------- audit ----------
CREATE TABLE IF NOT EXISTS audit_logs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_id   INTEGER REFERENCES staff(id),
  actor      TEXT NOT NULL,               -- denormalised so history survives deletion
  action     TEXT NOT NULL,               -- created | updated | deleted | login | ...
  entity     TEXT NOT NULL,               -- product | order | staff | ...
  entity_id  TEXT,
  summary    TEXT,
  before_val TEXT,
  after_val  TEXT,
  ip         TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity, entity_id);

-- ---------- catalogue ----------
CREATE TABLE IF NOT EXISTS categories (
  slug   TEXT PRIMARY KEY,
  name   TEXT NOT NULL,
  tag    TEXT,
  blurb  TEXT,
  shape  TEXT,
  palette TEXT,
  sub    TEXT,                            -- JSON array
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS products (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  cat        TEXT NOT NULL REFERENCES categories(slug),
  sub        TEXT,
  price      INTEGER NOT NULL,            -- paise-free: whole rupees
  was        INTEGER,
  shape      TEXT,
  palette    TEXT,
  year       INTEGER,
  edition    TEXT,
  materials  TEXT,
  blurb      TEXT,
  story      TEXT,
  care       TEXT,
  details    TEXT,                        -- JSON
  sizes      TEXT,                        -- JSON
  colors     TEXT,                        -- JSON
  badges     TEXT,                        -- JSON
  tags       TEXT,                        -- JSON
  rating     REAL NOT NULL DEFAULT 4.7,
  reviews    INTEGER NOT NULL DEFAULT 0,
  stock      INTEGER NOT NULL DEFAULT 0,
  low_stock_at INTEGER NOT NULL DEFAULT 5,
  status     TEXT NOT NULL DEFAULT 'active',  -- active | draft | archived
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_products_cat ON products(cat);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);

CREATE TABLE IF NOT EXISTS stock_movements (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  delta      INTEGER NOT NULL,
  reason     TEXT NOT NULL,               -- sale | adjustment | return | received
  note       TEXT,
  staff_id   INTEGER REFERENCES staff(id),
  balance    INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_moves_product ON stock_movements(product_id, created_at DESC);

-- ---------- customers & orders ----------
CREATE TABLE IF NOT EXISTS customers (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email      TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name  TEXT,
  tier       TEXT DEFAULT 'Cercle',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id          TEXT PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  email       TEXT,
  status      TEXT NOT NULL DEFAULT 'Confirmed',
  stage       INTEGER NOT NULL DEFAULT 1,
  method      TEXT,
  payment     TEXT,
  tracking    TEXT,
  address     TEXT,                        -- JSON
  subtotal    INTEGER NOT NULL DEFAULT 0,
  discount    INTEGER NOT NULL DEFAULT 0,
  shipping    INTEGER NOT NULL DEFAULT 0,
  tax         INTEGER NOT NULL DEFAULT 0,
  total       INTEGER NOT NULL DEFAULT 0,
  placed_at   TEXT NOT NULL DEFAULT (datetime('now')),
  notes       TEXT
);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_placed ON orders(placed_at DESC);

CREATE TABLE IF NOT EXISTS order_items (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id   TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT,
  name       TEXT,
  variant    TEXT,
  size       TEXT,
  qty        INTEGER NOT NULL DEFAULT 1,
  unit_price INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_items_order ON order_items(order_id);
