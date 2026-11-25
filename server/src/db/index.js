/* =============================================================
   DATABASE
   Node 24 ships SQLite in core, so this needs no native module
   and no new dependency. The file is created and migrated on
   first boot, then seeded from the existing catalogue.
   ============================================================= */
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { hashPassword, verifyPassword } from '../auth/password.js';
import { migrateMl } from '../ml/registry.js';
import {
  CATEGORIES, PRODUCTS, SEED_ORDERS, SEED_ADDRESSES
} from '../data/catalog.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../.data');
const DB_FILE = path.join(DATA_DIR, 'aurelis.db');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

export const db = new DatabaseSync(DB_FILE);

/* ---------- migrate ----------
   schema.sql is idempotent (CREATE TABLE IF NOT EXISTS). Anything
   that changes an existing table lives in steps() below, each
   guarded so a re-run is harmless. */
export function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(sql);
  applyIncremental();
}

const hasColumn = (table, column) =>
  db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === column);

const hasTable = (name) =>
  !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name = ?").get(name);

function applyIncremental() {
  const done = [];

  /* --- inventory position beyond a single integer --- */
  const cols = [
    ['reserved', 'INTEGER NOT NULL DEFAULT 0'],
    ['incoming', 'INTEGER NOT NULL DEFAULT 0'],
    ['damaged', 'INTEGER NOT NULL DEFAULT 0'],
    ['safety_stock', 'INTEGER NOT NULL DEFAULT 0']
  ];
  for (const [name, decl] of cols) {
    if (!hasColumn('products', name)) {
      db.exec(`ALTER TABLE products ADD COLUMN ${name} ${decl}`);
      done.push(`products.${name}`);
    }
  }

  /* --- reservations --- */
  if (!hasTable('inventory_reservations')) {
    db.exec(`
      CREATE TABLE inventory_reservations (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        order_id   TEXT,
        status     TEXT NOT NULL DEFAULT 'held',   -- held | committed | released | expired
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX idx_res_status ON inventory_reservations(status, expires_at);
      CREATE INDEX idx_res_session ON inventory_reservations(session_id);
    `);
    done.push('inventory_reservations');
  }

  if (!hasTable('inventory_reservation_items')) {
    db.exec(`
      CREATE TABLE inventory_reservation_items (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        reservation_id INTEGER NOT NULL REFERENCES inventory_reservations(id) ON DELETE CASCADE,
        product_id     TEXT NOT NULL REFERENCES products(id),
        qty            INTEGER NOT NULL
      );
      CREATE INDEX idx_resitem_res ON inventory_reservation_items(reservation_id);
    `);
    done.push('inventory_reservation_items');
  }

  /* --- the immutable ledger ---
     stock_movements stays for the seeded opening balances; every
     new movement is written here with a reference to what caused it. */
  if (!hasTable('inventory_transactions')) {
    db.exec(`
      CREATE TABLE inventory_transactions (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id     TEXT NOT NULL REFERENCES products(id),
        type           TEXT NOT NULL,
        qty            INTEGER NOT NULL,
        previous_qty   INTEGER,
        new_qty        INTEGER,
        reference_type TEXT,
        reference_id   TEXT,
        reason         TEXT,
        staff_id       INTEGER REFERENCES staff(id),
        created_at     TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX idx_invtx_product ON inventory_transactions(product_id, id DESC);
      CREATE INDEX idx_invtx_ref ON inventory_transactions(reference_type, reference_id);
      CREATE INDEX idx_invtx_created ON inventory_transactions(created_at DESC);
    `);
    done.push('inventory_transactions');
  }

  /* --- the ledger needs to know which warehouse moved ---
     adjustStock() already takes a warehouseId and updates the right
     warehouse_stock row; the ledger it writes alongside that never
     recorded which warehouse, so every read of it had nothing real
     to show and fell back to a hardcoded warehouse label. */
  if (!hasColumn('inventory_transactions', 'warehouse_id')) {
    db.exec('ALTER TABLE inventory_transactions ADD COLUMN warehouse_id INTEGER REFERENCES warehouses(id)');
    done.push('inventory_transactions.warehouse_id');
  }

  /* --- orders need to know which session placed them --- */
  if (!hasColumn('orders', 'session_id')) {
    db.exec('ALTER TABLE orders ADD COLUMN session_id TEXT');
    done.push('orders.session_id');
  }
  if (!hasColumn('orders', 'reservation_id')) {
    db.exec('ALTER TABLE orders ADD COLUMN reservation_id INTEGER');
    done.push('orders.reservation_id');
  }
  if (!hasColumn('orders', 'channel')) {
    db.exec("ALTER TABLE orders ADD COLUMN channel TEXT NOT NULL DEFAULT 'web'");
    done.push('orders.channel');
  }

  /* --- customers need real credentials ---
     Login accepted any email with any six characters and minted an
     account from the local part of the address, so anyone could sign
     in as anyone. Storefront accounts now hash like staff accounts. */
  for (const [name, decl] of [['password_hash', 'TEXT'], ['password_salt', 'TEXT'], ['phone', 'TEXT']]) {
    if (!hasColumn('customers', name)) {
      db.exec(`ALTER TABLE customers ADD COLUMN ${name} ${decl}`);
      done.push(`customers.${name}`);
    }
  }

  /* Indexes the audit measured as missing. order_items had none on
     product_id, so every per-SKU demand query full-scanned the table;
     orders had none on customer_id, so the customers page ran two
     correlated full scans per row. */
  const indexes = [
    ['idx_items_product', 'CREATE INDEX IF NOT EXISTS idx_items_product ON order_items(product_id)'],
    ['idx_orders_customer', 'CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id)'],
    ['idx_orders_channel', 'CREATE INDEX IF NOT EXISTS idx_orders_channel ON orders(channel, status)'],
    ['idx_orders_placed', 'CREATE INDEX IF NOT EXISTS idx_orders_placed ON orders(placed_at DESC)']
  ];
  for (const [name, sql] of indexes) {
    const existed = !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='index' AND name=?").get(name);
    db.exec(sql);
    if (!existed) done.push(name);
  }

  migrateEnterpriseOperations(done);
  collapseRoles(done);
  syncCatalogue(done);
  /* seedEnterpriseOperations() used to run here. It writes operational
     rows — alerts, recommendations, purchase orders — that carry foreign
     keys onto products, and products are created by seed(), which runs
     after migrate(). On a database that already held a catalogue the
     keys resolved and nobody noticed; on a genuinely empty one the very
     first alert failed with FOREIGN KEY constraint failed and the
     process exited 1 before it could listen.

     It is seed data, not a schema change, so it now runs from init()
     once seed() has put the rows it points at in place. */
  syncPermissions(done);

  if (done.length) console.log(`[aurelis] migrated: ${done.join(', ')}`);
}

function migrateEnterpriseOperations(done) {
  if (!hasTable('warehouses')) {
    db.exec(`
      CREATE TABLE warehouses (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        code           TEXT NOT NULL UNIQUE,
        name           TEXT NOT NULL,
        city           TEXT NOT NULL,
        country        TEXT NOT NULL,
        type           TEXT NOT NULL DEFAULT 'vault',
        capacity_units INTEGER NOT NULL DEFAULT 5000,
        is_active      INTEGER NOT NULL DEFAULT 1,
        created_at     TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
    done.push('warehouses');
  }

  if (!hasTable('warehouse_stock')) {
    db.exec(`
      CREATE TABLE warehouse_stock (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        warehouse_id   INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
        product_id     TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        aisle          TEXT NOT NULL DEFAULT 'A',
        rack           INTEGER NOT NULL DEFAULT 1,
        bin            TEXT NOT NULL DEFAULT '01',
        on_hand        INTEGER NOT NULL DEFAULT 0,
        reserved       INTEGER NOT NULL DEFAULT 0,
        available      INTEGER NOT NULL DEFAULT 0,
        incoming       INTEGER NOT NULL DEFAULT 0,
        damaged        INTEGER NOT NULL DEFAULT 0,
        returned       INTEGER NOT NULL DEFAULT 0,
        safety_stock   INTEGER NOT NULL DEFAULT 2,
        reorder_point  INTEGER NOT NULL DEFAULT 5,
        updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(warehouse_id, product_id)
      );
      CREATE INDEX idx_whstock_prod ON warehouse_stock(product_id);
      CREATE INDEX idx_whstock_wh ON warehouse_stock(warehouse_id);
    `);
    done.push('warehouse_stock');
  }

  if (!hasTable('warehouse_transfers')) {
    db.exec(`
      CREATE TABLE warehouse_transfers (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        transfer_no    TEXT NOT NULL UNIQUE,
        source_id      INTEGER NOT NULL REFERENCES warehouses(id),
        dest_id        INTEGER NOT NULL REFERENCES warehouses(id),
        status         TEXT NOT NULL DEFAULT 'Requested',
        requested_by   INTEGER REFERENCES staff(id),
        approved_by    INTEGER REFERENCES staff(id),
        carrier        TEXT,
        tracking_no    TEXT,
        notes          TEXT,
        created_at     TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE warehouse_transfer_items (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        transfer_id    INTEGER NOT NULL REFERENCES warehouse_transfers(id) ON DELETE CASCADE,
        product_id     TEXT NOT NULL REFERENCES products(id),
        requested_qty  INTEGER NOT NULL,
        received_qty   INTEGER NOT NULL DEFAULT 0
      );
    `);
    done.push('warehouse_transfers');
  }

  if (!hasTable('suppliers')) {
    db.exec(`
      CREATE TABLE suppliers (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        code              TEXT NOT NULL UNIQUE,
        name              TEXT NOT NULL,
        category          TEXT,
        contact_name      TEXT,
        email             TEXT,
        phone             TEXT,
        city              TEXT,
        country           TEXT,
        lead_time_days    INTEGER NOT NULL DEFAULT 14,
        moq               INTEGER NOT NULL DEFAULT 5,
        reliability_score REAL NOT NULL DEFAULT 92.5,
        quality_score     REAL NOT NULL DEFAULT 95.0,
        on_time_rate      REAL NOT NULL DEFAULT 90.0,
        status            TEXT NOT NULL DEFAULT 'active',
        notes             TEXT,
        created_at        TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
    done.push('suppliers');
  }

  if (!hasTable('purchase_orders')) {
    db.exec(`
      CREATE TABLE purchase_orders (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        po_number        TEXT NOT NULL UNIQUE,
        supplier_id      INTEGER NOT NULL REFERENCES suppliers(id),
        warehouse_id     INTEGER NOT NULL REFERENCES warehouses(id),
        status           TEXT NOT NULL DEFAULT 'Draft',
        total_value      INTEGER NOT NULL DEFAULT 0,
        expected_date    TEXT,
        received_date    TEXT,
        created_by       INTEGER REFERENCES staff(id),
        approved_by      INTEGER REFERENCES staff(id),
        ai_recommended   INTEGER NOT NULL DEFAULT 0,
        notes            TEXT,
        created_at       TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE purchase_order_items (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        po_id            INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
        product_id       TEXT NOT NULL REFERENCES products(id),
        qty              INTEGER NOT NULL,
        unit_cost        INTEGER NOT NULL,
        received_qty     INTEGER NOT NULL DEFAULT 0
      );
    `);
    done.push('purchase_orders');
  }

  /* --- physical stocktake ---
     A cycle count snapshots the system's expected quantity for a set of
     SKUs at creation time, so a count entered hours later is still
     compared against what the system believed *then* — not whatever
     it has drifted to by the time the count is reconciled. */
  if (!hasTable('cycle_counts')) {
    db.exec(`
      CREATE TABLE cycle_counts (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        count_number   TEXT NOT NULL UNIQUE,
        warehouse_id   INTEGER NOT NULL REFERENCES warehouses(id),
        status         TEXT NOT NULL DEFAULT 'Open',   -- Open | Completed | Cancelled
        scope          TEXT NOT NULL DEFAULT 'all',    -- all | low_stock
        notes          TEXT,
        created_by     INTEGER REFERENCES staff(id),
        completed_by   INTEGER REFERENCES staff(id),
        created_at     TEXT NOT NULL DEFAULT (datetime('now')),
        completed_at   TEXT
      );
      CREATE TABLE cycle_count_items (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        cycle_count_id INTEGER NOT NULL REFERENCES cycle_counts(id) ON DELETE CASCADE,
        product_id     TEXT NOT NULL REFERENCES products(id),
        expected_qty   INTEGER NOT NULL,
        counted_qty    INTEGER,
        counted_by     INTEGER REFERENCES staff(id),
        counted_at     TEXT
      );
      CREATE INDEX idx_cyclecount_items_count ON cycle_count_items(cycle_count_id);
    `);
    done.push('cycle_counts');
  }

  /* --- internal collaboration notes ---
     A record any staff member can leave a note on, with an @mention
     resolved to a real staff id at write time (not re-parsed on every
     read). author_name is denormalised like audit_logs.actor, so a
     note still reads correctly after the author's account is gone. */
  /* --- scheduled reports ---
     A schedule that a background check advances on its own; each
     run is stored, not emailed — there is no real mail sender wired
     up here, and a report claiming to have been sent when it was not
     is worse than one that is honest about only being saved. */
  /* --- batch/expiry tracking ---
     Fragrances are the one category in this catalogue with a real
     shelf life; jewellery, horology and leather do not expire, so
     this is deliberately scoped to a category rather than every
     product (enforced in server/src/batches.js, not just the UI). */
  if (!hasTable('product_batches')) {
    db.exec(`
      CREATE TABLE product_batches (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id     TEXT NOT NULL REFERENCES products(id),
        batch_number   TEXT NOT NULL,
        qty            INTEGER NOT NULL,
        expiry_date    TEXT NOT NULL,
        received_at    TEXT NOT NULL DEFAULT (datetime('now')),
        created_by     INTEGER REFERENCES staff(id)
      );
      CREATE INDEX idx_batches_product ON product_batches(product_id, expiry_date);
    `);
    done.push('product_batches');
  }

  if (!hasTable('scheduled_reports')) {
    db.exec(`
      CREATE TABLE scheduled_reports (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        name         TEXT NOT NULL,
        report_type  TEXT NOT NULL,
        frequency    TEXT NOT NULL,               -- daily | weekly | monthly
        status       TEXT NOT NULL DEFAULT 'active', -- active | paused
        next_run_at  TEXT NOT NULL,
        last_run_at  TEXT,
        created_by   INTEGER REFERENCES staff(id),
        created_at   TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE report_runs (
        id                   INTEGER PRIMARY KEY AUTOINCREMENT,
        scheduled_report_id  INTEGER NOT NULL REFERENCES scheduled_reports(id) ON DELETE CASCADE,
        report_type          TEXT NOT NULL,
        row_count            INTEGER NOT NULL,
        data                 TEXT NOT NULL,        -- JSON snapshot
        generated_at         TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX idx_report_runs_schedule ON report_runs(scheduled_report_id, generated_at DESC);
    `);
    done.push('scheduled_reports');
  }

  if (!hasTable('admin_notes')) {
    db.exec(`
      CREATE TABLE admin_notes (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        entity         TEXT NOT NULL,       -- order | product
        entity_id      TEXT NOT NULL,
        body           TEXT NOT NULL,
        author_id      INTEGER REFERENCES staff(id),
        author_name    TEXT NOT NULL,
        mentioned_ids  TEXT,                 -- JSON array of staff ids
        created_at     TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX idx_notes_entity ON admin_notes(entity, entity_id, created_at DESC);
    `);
    done.push('admin_notes');
  }

  if (!hasTable('goods_receipts')) {
    db.exec(`
      CREATE TABLE goods_receipts (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        receipt_no       TEXT NOT NULL UNIQUE,
        po_id            INTEGER NOT NULL REFERENCES purchase_orders(id),
        warehouse_id     INTEGER NOT NULL REFERENCES warehouses(id),
        received_by      INTEGER REFERENCES staff(id),
        status           TEXT NOT NULL DEFAULT 'Verified',
        discrepancy_note TEXT,
        created_at       TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
    done.push('goods_receipts');
  }

  if (!hasTable('ai_alerts')) {
    db.exec(`
      CREATE TABLE ai_alerts (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        severity         TEXT NOT NULL,
        category         TEXT NOT NULL,
        product_id       TEXT REFERENCES products(id),
        warehouse_id     INTEGER REFERENCES warehouses(id),
        title            TEXT NOT NULL,
        problem          TEXT NOT NULL,
        impact           TEXT NOT NULL,
        confidence       REAL NOT NULL DEFAULT 0.88,
        action_label     TEXT NOT NULL,
        action_payload   TEXT,
        status           TEXT NOT NULL DEFAULT 'active',
        created_at       TEXT NOT NULL DEFAULT (datetime('now')),
        resolved_at      TEXT
      );
      CREATE INDEX idx_alerts_status ON ai_alerts(status, severity);
    `);
    done.push('ai_alerts');
  }

  if (!hasTable('ai_recommendations')) {
    db.exec(`
      CREATE TABLE ai_recommendations (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        type             TEXT NOT NULL,
        product_id       TEXT NOT NULL REFERENCES products(id),
        warehouse_id     INTEGER REFERENCES warehouses(id),
        current_stock    INTEGER NOT NULL DEFAULT 0,
        forecast_demand  REAL NOT NULL DEFAULT 0,
        recommended_qty  INTEGER,
        reasoning_factors TEXT,
        confidence       REAL NOT NULL DEFAULT 0.90,
        expected_impact  TEXT NOT NULL,
        status           TEXT NOT NULL DEFAULT 'pending',
        created_at       TEXT NOT NULL DEFAULT (datetime('now')),
        executed_at      TEXT
      );
    `);
    done.push('ai_recommendations');
  }

  if (!hasTable('ai_feedback_outcomes')) {
    db.exec(`
      CREATE TABLE ai_feedback_outcomes (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        recommendation_id INTEGER REFERENCES ai_recommendations(id),
        product_id        TEXT NOT NULL,
        action_taken      TEXT NOT NULL,
        predicted_impact  TEXT,
        actual_outcome    TEXT,
        stockout_avoided  INTEGER DEFAULT 1,
        capital_saved     INTEGER DEFAULT 0,
        forecast_mape     REAL,
        measured_at       TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
    done.push('ai_feedback_outcomes');
  }
}

function seedEnterpriseOperations(done) {
  if (!hasTable('warehouses')) return;

  const whCount = db.prepare('SELECT COUNT(*) AS n FROM warehouses').get().n;
  if (whCount === 0) {
    const insWh = db.prepare(
      'INSERT INTO warehouses (code, name, city, country, type, capacity_units) VALUES (?,?,?,?,?,?)'
    );
    insWh.run('GVA-ATELIER', 'Geneva Main Atelier & Vault', 'Geneva', 'Switzerland', 'atelier', 8000);
    insWh.run('ZRH-CENTRAL', 'Zurich Central Fulfillment Hub', 'Zurich', 'Switzerland', 'fulfillment', 25000);
    insWh.run('PAR-VAULT', 'Paris Place Vendôme Vault', 'Paris', 'France', 'vault', 6000);
    insWh.run('NYC-VAULT', 'New York Madison Salon Vault', 'New York', 'USA', 'vault', 5000);
    done.push('warehouses seeded');
  }

  const supCount = db.prepare('SELECT COUNT(*) AS n FROM suppliers').get().n;
  if (supCount === 0) {
    const insSup = db.prepare(
      `INSERT INTO suppliers
       (code, name, category, contact_name, email, phone, city, country, lead_time_days, moq, reliability_score, quality_score, on_time_rate)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
    );
    insSup.run('VALCAMBI', 'Valcambi SA', 'Precious Metals & Alloys', 'Marcello Riva', 'orders@valcambi.ch', '+41 91 695 53 11', 'Balerna', 'Switzerland', 10, 5, 98.4, 99.2, 97.8);
    insSup.run('DUBOIS', 'Dubois Dépraz Horlogerie', 'Mechanical Calibres', 'Pascal Dubois', 'horlogerie@dubois-depraz.ch', '+41 21 845 11 00', 'Le Lieu', 'Switzerland', 45, 2, 94.1, 98.7, 88.5);
    insSup.run('ROBERTET', 'Robertet Grasse', 'Rare Parfums & Essences', 'Claire Beauchamp', 'contact@robertet.fr', '+33 4 93 40 33 00', 'Grasse', 'France', 21, 10, 91.5, 96.8, 89.0);
    insSup.run('HAAS', 'Tanneries Haas', 'Pit-Tanned Calfskin', 'Guillaume Haas', 'atelier@tanneries-haas.com', '+33 3 88 57 80 00', 'Eichhoffen', 'France', 28, 8, 93.0, 97.5, 92.4);
    done.push('suppliers seeded');
  }

  /* Seed warehouse stock distribution for existing products if empty */
  const whStockCount = db.prepare('SELECT COUNT(*) AS n FROM warehouse_stock').get().n;
  if (whStockCount === 0 && hasTable('products')) {
    const prods = db.prepare("SELECT id, stock, reserved, incoming, safety_stock FROM products WHERE status != 'archived'").all();
    const warehouses = db.prepare('SELECT id, code FROM warehouses').all();
    const insWs = db.prepare(
      `INSERT OR IGNORE INTO warehouse_stock
       (warehouse_id, product_id, aisle, rack, bin, on_hand, reserved, available, incoming, damaged, returned, safety_stock, reorder_point)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
    );

    const aisles = ['A', 'B', 'C', 'D', 'E'];
    prods.forEach((p, idx) => {
      warehouses.forEach((wh, wIdx) => {
        let ratio = wIdx === 0 ? 0.45 : wIdx === 1 ? 0.35 : wIdx === 2 ? 0.12 : 0.08;
        let onHand = Math.max(0, Math.round(p.stock * ratio));
        let reserved = Math.min(onHand, Math.round((p.reserved || 0) * ratio));
        let available = Math.max(0, onHand - reserved);
        let incoming = Math.round((p.incoming || 0) * ratio);
        let aisle = aisles[(idx + wIdx) % aisles.length];
        let rack = ((idx % 4) + 1);
        let bin = String((idx % 8) + 1).padStart(2, '0');
        insWs.run(wh.id, p.id, aisle, rack, bin, onHand, reserved, available, incoming, 0, 0, Math.max(1, Math.round(p.safety_stock * ratio)), 4);
      });
    });
    done.push('warehouse_stock distributed');
  }

  /* Seed initial AI Alerts if empty */
  const alertCount = db.prepare('SELECT COUNT(*) AS n FROM ai_alerts').get().n;
  if (alertCount === 0) {
    const insAlert = db.prepare(
      `INSERT INTO ai_alerts
       (severity, category, product_id, warehouse_id, title, problem, impact, confidence, action_label, action_payload, status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`
    );
    insAlert.run('critical', 'stockout', 'aur-402', 1, 'Imminent Stockout on Chronographe 1911',
      'Available inventory is 3 units; forecast demand is 1.4 units/day. Expected depletion in 2.1 days.',
      'Projected missed revenue of ₹4,20,000 over 14 days if unreplenished.',
      0.94, 'Raise Purchase Order', JSON.stringify({ sku: 'aur-402', qty: 15, supplierId: 2 }), 'active');

    insAlert.run('critical', 'supplier_delay', null, 2, 'Supplier Dubois Dépraz Average Delay Alert',
      'Average lead time increased by 3.8 days over the last 60 days on calibre batch shipments.',
      '3 dependent timepiece releases risk delayed assembly and fulfillment.',
      0.91, 'Expedite Shipments', JSON.stringify({ supplierId: 2, action: 'expedite' }), 'active');

    insAlert.run('warning', 'overstock', 'aur-104', 2, 'Elevated Days of Cover on Barenia Weekend Bag',
      'Current stock of 24 units with sales velocity of 0.2 units/day represents 120 days of inventory.',
      '₹18,50,000 in working capital tied up; carrying cost accumulating.',
      0.88, 'Configure Editorial Spotlight', JSON.stringify({ sku: 'aur-104', discountPct: 10 }), 'active');

    insAlert.run('warning', 'demand_surge', 'aur-201', 3, 'Unusual Demand Surge in Paris Atelier',
      'Extrait de Rose des Cendres sales in Paris increased 240% week-over-week.',
      'Paris Vault stock will deplete 9 days ahead of regional forecast.',
      0.92, 'Transfer from Zurich', JSON.stringify({ sku: 'aur-201', sourceId: 2, destId: 3, qty: 12 }), 'active');

    insAlert.run('info', 'milestone', null, null, 'Monthly Revenue Milestone Achieved',
      'Net revenue for the current 30-day period exceeded target threshold by 14.2%.',
      'Strongest growth observed in Fine Jewellery (+18%) and Horology (+12%).',
      0.99, 'View Financial Report', JSON.stringify({ report: 'sales' }), 'active');

    done.push('ai_alerts seeded');
  }

  /* Seed initial AI Recommendations if empty */
  const recCount = db.prepare('SELECT COUNT(*) AS n FROM ai_recommendations').get().n;
  if (recCount === 0) {
    const insRec = db.prepare(
      `INSERT INTO ai_recommendations
       (type, product_id, warehouse_id, current_stock, forecast_demand, recommended_qty, reasoning_factors, confidence, expected_impact, status)
       VALUES (?,?,?,?,?,?,?,?,?,?)`
    );
    insRec.run('reorder', 'aur-402', 1, 3, 1.4, 15,
      JSON.stringify(['Stockout predicted in 2.1 days', 'Supplier lead time 45 days', 'Upcoming anniversary sales cycle']),
      0.94, 'Eliminates 94% of projected stockout risk, safeguarding ₹4,20,000 in high-margin sales', 'pending');

    insRec.run('transfer', 'aur-201', 2, 38, 0.8, 12,
      JSON.stringify(['Paris Vault demand spike +240%', 'Zurich Central has 38 units on hand (54 days cover)', 'Zero additional procurement cost']),
      0.92, 'Balances regional inventory; prevents stockout in Paris within 72 hours', 'pending');

    insRec.run('discount', 'aur-104', 2, 24, 0.2, 8,
      JSON.stringify(['Inventory age > 140 days', 'Holding cost exceeds projected margin gain', 'Seasonal transition approaching']),
      0.86, 'Recovers ₹7,40,000 in tied-up capital within 21 days', 'pending');

    done.push('ai_recommendations seeded');
  }

  /* Seed AI Feedback Outcomes to establish the closed-loop feedback history */
  const outCount = db.prepare('SELECT COUNT(*) AS n FROM ai_feedback_outcomes').get().n;
  if (outCount === 0) {
    const insOut = db.prepare(
      `INSERT INTO ai_feedback_outcomes
       (recommendation_id, product_id, action_taken, predicted_impact, actual_outcome, stockout_avoided, capital_saved, forecast_mape, measured_at)
       VALUES (?,?,?,?,?,?,?,?,datetime('now', '-12 days'))`
    );
    insOut.run(1, 'aur-401', 'Reordered 20 units from Valcambi SA',
      'Expected stockout reduction 85%',
      'Stock sustained throughout holiday surge; 0 stockout hours recorded',
      1, 320000, 4.2);
    insOut.run(2, 'aur-302', 'Transferred 10 units from Zurich to Geneva Atelier',
      'Expected inventory balance within 4 days',
      'All 10 units claimed by Le Cercle collectors within 9 days',
      1, 185000, 3.8);
    done.push('ai_feedback_outcomes seeded');
  }

  /* Seed initial Purchase Orders if empty */
  const poCount = db.prepare('SELECT COUNT(*) AS n FROM purchase_orders').get().n;
  if (poCount === 0) {
    const insPo = db.prepare(
      `INSERT INTO purchase_orders
       (po_number, supplier_id, warehouse_id, status, total_value, expected_date, ai_recommended, notes)
       VALUES (?,?,?,?,?,?,?,?)`
    );
    const insItem = db.prepare(
      `INSERT INTO purchase_order_items (po_id, product_id, qty, unit_cost, received_qty) VALUES (?,?,?,?,?)`
    );

    const po1 = insPo.run('PO-2026-081', 1, 1, 'Partially Received', 850000, '2026-09-15', 1, 'Expedited 18k gold alloy ingot shipment');
    insItem.run(po1.lastInsertRowid, 'aur-401', 10, 45000, 6);
    insItem.run(po1.lastInsertRowid, 'aur-402', 8, 50000, 0);

    const po2 = insPo.run('PO-2026-084', 3, 2, 'Approved', 420000, '2026-09-22', 0, 'Autumn harvest Grasse rose and vetiver extraits');
    insItem.run(po2.lastInsertRowid, 'aur-201', 15, 18000, 0);
    insItem.run(po2.lastInsertRowid, 'aur-202', 10, 15000, 0);

    done.push('purchase_orders seeded');
  }

  /* Seed initial Warehouse Transfers if empty */
  const trCount = db.prepare('SELECT COUNT(*) AS n FROM warehouse_transfers').get().n;
  if (trCount === 0) {
    const insTr = db.prepare(
      `INSERT INTO warehouse_transfers
       (transfer_no, source_id, dest_id, status, carrier, tracking_no, notes)
       VALUES (?,?,?,?,?,?,?)`
    );
    const insTrItem = db.prepare(
      `INSERT INTO warehouse_transfer_items (transfer_id, product_id, requested_qty, received_qty) VALUES (?,?,?,?)`
    );
    const tr1 = insTr.run('TR-2026-014', 2, 3, 'In Transit', 'Brink’s Secure Logistics', 'BRK-994827-CH', 'Urgent inventory rebalance for Place Vendôme salon');
    insTrItem.run(tr1.lastInsertRowid, 'aur-201', 12, 0);
    insTrItem.run(tr1.lastInsertRowid, 'aur-104', 4, 0);
  }
}

/* A database seeded before the ladder was collapsed still holds four
   roles and staff pointing at three of them. Move everyone to admin,
   then drop the roles nothing references any more. Done before
   syncPermissions so the surviving role picks up any new keys. */
function collapseRoles(done) {
  if (!hasTable('roles') || !hasTable('staff')) return;
  const keep = 'admin';
  const survivor = db.prepare('SELECT id FROM roles WHERE key = ?').get(keep);
  if (!survivor) return;

  /* The surviving row keeps whatever grants it was seeded with, and the old
     admin was deliberately denied permissions.manage, settings.manage and
     ai.data because a super_admin sat above it. Nothing sits above it now,
     so without this the only remaining role cannot reach screens it is the
     sole owner of — permission management returned 403 to the only person
     who could ever use it.

     This runs before the early return below, because on the second boot
     there is nothing left to remove and the re-grant would never happen. */
  const permIds = db.prepare('SELECT id FROM permissions').all().map((p) => p.id);
  const insRP = db.prepare('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)');
  let granted = 0;
  for (const pid of permIds) granted += insRP.run(survivor.id, pid).changes;
  if (granted) done.push(`+${granted} permission(s) granted to "${keep}"`);

  /* The row kept its old seeded label, so the admin listed a role named
     "Admin" while ROLES here defines "Administrator". Same record, two
     names, depending on whether you read the screen or the source. */
  const defined = ROLES.find((r) => r.key === keep);
  if (defined) {
    const renamed = db.prepare(
      'UPDATE roles SET name = ?, description = ? WHERE id = ? AND (name != ? OR description != ?)'
    ).run(defined.name, defined.description, survivor.id, defined.name, defined.description).changes;
    if (renamed) done.push(`role "${keep}" relabelled to "${defined.name}"`);
  }

  const doomed = db.prepare('SELECT id, key FROM roles WHERE key != ?').all(keep);
  if (!doomed.length) return;

  const ids = doomed.map((r) => r.id);
  const marks = ids.map(() => '?').join(',');
  const moved = db.prepare(`UPDATE staff SET role_id = ? WHERE role_id IN (${marks})`).run(survivor.id, ...ids).changes;
  db.prepare(`DELETE FROM role_permissions WHERE role_id IN (${marks})`).run(...ids);
  db.prepare(`DELETE FROM roles WHERE id IN (${marks})`).run(...ids);

  done.push(`roles collapsed to "${keep}" (${doomed.length} removed, ${moved} staff moved)`);
}

function syncCatalogue(done) {
  if (!hasTable('products') || !hasTable('categories')) return;
  if (!db.prepare('SELECT COUNT(*) AS n FROM products').get().n) return;   // first boot; seed() owns it

  const haveCat = new Set(db.prepare('SELECT slug FROM categories').all().map((c) => c.slug));
  const insCat = db.prepare(
    'INSERT INTO categories (slug, name, tag, blurb, shape, palette, sub, position) VALUES (?,?,?,?,?,?,?,?)'
  );
  let cats = 0;
  CATEGORIES.forEach((c, i) => {
    if (haveCat.has(c.slug)) return;
    insCat.run(c.slug, c.name, c.tag, c.blurb, c.shape, c.palette, J(c.sub), i);
    cats += 1;
  });

  const haveProd = new Set(db.prepare('SELECT id FROM products').all().map((p) => p.id));
  const insProd = db.prepare(
    `INSERT INTO products
       (id,name,cat,sub,price,was,shape,palette,year,edition,materials,blurb,story,care,
        details,sizes,colors,badges,tags,rating,reviews,stock,status)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'active')`
  );
  const insMove = db.prepare(
    'INSERT INTO stock_movements (product_id, delta, reason, note, balance) VALUES (?,?,?,?,?)'
  );

  let prods = 0;
  for (const p of PRODUCTS) {
    if (haveProd.has(p.id)) continue;
    insProd.run(
      p.id, p.name, p.cat, p.sub, p.price, p.was, p.shape, p.palette, p.year, p.edition,
      p.materials, p.blurb, p.story, p.care,
      J(p.details), J(p.sizes), J(p.colors), J(p.badges), J(p.tags),
      p.rating, p.reviews, p.stock
    );
    /* Opening position, so the inventory ledger is never empty for a
       piece that has always existed as far as the shop is concerned. */
    insMove.run(p.id, p.stock, 'opening', 'Catalogue sync', p.stock);
    prods += 1;
  }

  if (cats) done.push(`+${cats} categories`);
  if (prods) done.push(`+${prods} products`);
}

function syncPermissions(done) {
  if (!hasTable('permissions')) return;         // first boot; seed() will do it
  if (!db.prepare('SELECT COUNT(*) AS n FROM roles').get().n) return;

  const known = new Set(db.prepare('SELECT key FROM permissions').all().map((p) => p.key));
  const insPerm = db.prepare('INSERT INTO permissions (key, module, label) VALUES (?,?,?)');
  const added = [];
  PERMISSIONS.forEach(([key, module, label]) => {
    if (!known.has(key)) { insPerm.run(key, module, label); added.push(key); }
  });
  if (!added.length) return;

  const permId = {};
  db.prepare('SELECT id, key FROM permissions').all().forEach((p) => { permId[p.key] = p.id; });
  const roleId = {};
  db.prepare('SELECT id, key FROM roles').all().forEach((r) => { roleId[r.key] = r.id; });

  const insRP = db.prepare('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?,?)');
  ROLES.forEach((r) => {
    if (!roleId[r.key]) return;
    r.grants.filter((g) => added.includes(g)).forEach((g) => insRP.run(roleId[r.key], permId[g]));
  });

  done.push(`permissions +${added.join(', +')}`);
}

/* ---------- permission catalogue ----------
   Keys are module.action. The sidebar and every guarded route
   read from this one list, so access can never drift between
   what a role can see and what it can do. */
export const PERMISSIONS = [
  ['dashboard.view', 'dashboard', 'View dashboard'],

  ['products.view', 'catalog', 'View products'],
  ['products.create', 'catalog', 'Create products'],
  ['products.edit', 'catalog', 'Edit products'],
  ['products.delete', 'catalog', 'Delete products'],
  ['categories.manage', 'catalog', 'Manage categories'],

  ['inventory.view', 'inventory', 'View inventory'],
  ['inventory.adjust', 'inventory', 'Adjust stock'],
  ['inventory.transfer', 'inventory', 'Transfer stock'],
  ['inventory.purchase', 'inventory', 'Raise purchase orders'],

  ['orders.view', 'orders', 'View orders'],
  ['orders.edit', 'orders', 'Edit orders'],
  ['orders.cancel', 'orders', 'Cancel orders'],
  ['orders.refund', 'orders', 'Refund orders'],

  ['customers.view', 'customers', 'View customers'],
  ['customers.edit', 'customers', 'Edit customers'],

  ['payments.view', 'payments', 'View transactions'],
  ['payments.refund', 'payments', 'Issue refunds'],

  ['ai.view', 'ai', 'View AI intelligence'],
  ['ai.manage', 'ai', 'Train models, activate and roll back versions'],
  ['ai.feedback', 'ai', 'Accept, change or reject recommendations'],
  ['ai.data', 'ai', 'Generate or remove synthetic training data'],

  ['procurement.view', 'procurement', 'View suppliers and purchase orders'],
  ['procurement.manage', 'procurement', 'Manage suppliers and purchase orders'],

  ['warehouses.view', 'warehouses', 'View warehouses and heatmaps'],
  ['warehouses.manage', 'warehouses', 'Manage warehouse locations and transfers'],

  ['reports.view', 'reports', 'Generate and download reports'],
  ['analytics.view', 'analytics', 'View sales, product and customer intelligence'],

  ['staff.view', 'staff', 'View staff'],
  ['staff.manage', 'staff', 'Create and edit staff'],
  ['permissions.manage', 'staff', 'Change role permissions'],

  ['settings.view', 'settings', 'View settings'],
  ['settings.manage', 'settings', 'Change settings'],

  ['audit.view', 'audit', 'View audit log']
];

/* ---------- role grants ----------
   Mirrors the access matrix: a manager never sees payments or
   staff; an inventory manager can read products but not edit. */
const ALL = PERMISSIONS.map((p) => p[0]);

/* There are two kinds of people here and only two: a customer, who
   holds an account in the customers table and never touches this file,
   and an administrator, who runs the shop. The four-tier staff ladder
   that used to live here — super_admin, admin, manager, inventory_manager
   — described an organisation this shop does not have, and every screen
   that let you pick between them was configuration with nothing behind
   it. The permission keys are kept: they still gate every route, and a
   second role can be reintroduced later by adding one entry here without
   touching a single route. */
export const ROLES = [
  {
    key: 'admin', name: 'Administrator', rank: 1,
    description: 'Runs the shop. Full access to the catalogue, inventory, orders, customers and staff.',
    grants: ALL
  }
];

/* ---------- seed ---------- */
const J = (v) => JSON.stringify(v ?? null);

export function seed() {
  const already = db.prepare('SELECT COUNT(*) AS n FROM roles').get().n;
  if (already > 0) return { seeded: false };

  const insRole = db.prepare(
    'INSERT INTO roles (key, name, rank, description) VALUES (?, ?, ?, ?)'
  );
  const insPerm = db.prepare(
    'INSERT INTO permissions (key, module, label) VALUES (?, ?, ?)'
  );
  const insRP = db.prepare(
    'INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)'
  );

  PERMISSIONS.forEach(([key, module, label]) => insPerm.run(key, module, label));
  ROLES.forEach((r) => insRole.run(r.key, r.name, r.rank, r.description));

  const permId = {};
  db.prepare('SELECT id, key FROM permissions').all().forEach((p) => { permId[p.key] = p.id; });
  const roleId = {};
  db.prepare('SELECT id, key FROM roles').all().forEach((r) => { roleId[r.key] = r.id; });

  ROLES.forEach((r) => r.grants.forEach((g) => insRP.run(roleId[r.key], permId[g])));

  /* ---- staff accounts ---- */
  const insStaff = db.prepare(
    `INSERT INTO staff (email, password_hash, salt, first_name, last_name, role_id, status)
     VALUES (?, ?, ?, ?, ?, ?, 'active')`
  );
  /* The demo-only accounts have published passwords. Creating them
     outside demo mode leaves a permanent unlisted way in — turning
     DEMO_MODE off used to hide them from the sign-in screen while the
     logins carried on working. */
  const staffToSeed = SEED_STAFF.filter((s) => DEMO_MODE || !s.demoOnly);
  staffToSeed.forEach((s) => {
    const { hash, salt } = hashPassword(s.password);
    insStaff.run(s.email, hash, salt, s.first, s.last, roleId[s.role]);
  });
  if (staffToSeed.length < SEED_STAFF.length) {
    console.log('[aurelis] demo staff accounts skipped (DEMO_MODE off) — ' + (SEED_STAFF.length - staffToSeed.length) + ' not created');
  }

  /* ---- catalogue ---- */
  const insCat = db.prepare(
    'INSERT INTO categories (slug, name, tag, blurb, shape, palette, sub, position) VALUES (?,?,?,?,?,?,?,?)'
  );
  CATEGORIES.forEach((c, i) => insCat.run(c.slug, c.name, c.tag, c.blurb, c.shape, c.palette, J(c.sub), i));

  const insProd = db.prepare(
    `INSERT INTO products
       (id,name,cat,sub,price,was,shape,palette,year,edition,materials,blurb,story,care,
        details,sizes,colors,badges,tags,rating,reviews,stock,status)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'active')`
  );
  PRODUCTS.forEach((p) => insProd.run(
    p.id, p.name, p.cat, p.sub, p.price, p.was, p.shape, p.palette, p.year, p.edition,
    p.materials, p.blurb, p.story, p.care,
    J(p.details), J(p.sizes), J(p.colors), J(p.badges), J(p.tags),
    p.rating, p.reviews, p.stock
  ));

  /* opening stock position, so inventory history is never empty */
  const insMove = db.prepare(
    'INSERT INTO stock_movements (product_id, delta, reason, note, balance) VALUES (?,?,?,?,?)'
  );
  PRODUCTS.forEach((p) => insMove.run(p.id, p.stock, 'received', 'Opening balance', p.stock));

  /* ---- a customer and the historic orders ---- */
  const a = SEED_ADDRESSES[0];
  db.prepare('INSERT INTO customers (email, first_name, last_name, tier) VALUES (?,?,?,?)')
    .run('a.sorensen@example.com', a.first, a.last, 'Cercle Or');
  const custId = db.prepare('SELECT id FROM customers WHERE email = ?').get('a.sorensen@example.com').id;

  const insOrder = db.prepare(
    `INSERT INTO orders (id, customer_id, email, status, stage, method, payment, tracking, address,
                         subtotal, discount, shipping, tax, total, placed_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  );
  const insItem = db.prepare(
    'INSERT INTO order_items (order_id, product_id, name, variant, size, qty, unit_price) VALUES (?,?,?,?,?,?,?)'
  );
  SEED_ORDERS.forEach((o) => {
    insOrder.run(
      o.id, custId, 'a.sorensen@example.com', o.status, o.stage, o.method, o.payment, o.tracking,
      J(SEED_ADDRESSES.find((x) => x.id === o.addressId) || null),
      o.totals.subtotal, o.totals.discount, o.totals.shipping, o.totals.tax, o.totals.total,
      `${o.date} 12:00:00`
    );
    o.items.forEach((it) => {
      const p = PRODUCTS.find((x) => x.id === it.id);
      insItem.run(o.id, it.id, p ? p.name : it.id, it.variant, it.size, it.qty, p ? p.price : 0);
    });
  });

  /* staffToSeed, not SEED_STAFF: with demo mode off the three published
     accounts are never created, and reporting four told the operator of
     a fresh deploy that three logins existed which do not. */
  return { seeded: true, staff: staffToSeed.length, products: PRODUCTS.length };
}

/* Staff accounts created on first boot.

   The super admin's credentials come from the environment when it
   is set, so a public deployment is never protected by a password
   that lives in the repository. The other three are demo roles and
   are only useful while DEMO_MODE is on. */
export const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/* Demo mode is OFF unless asked for, and can never be on in
   production. It used to default to true, which meant a deploy that
   set nothing published working admin passwords to the internet. */
/* Defaults to false everywhere, which is what the comment above has
   always claimed and what server/src/deployment.js independently
   reports to the client. It had drifted to "on unless production",
   and the two disagreeing meant /api/deployment said demoMode:false
   while this file seeded and re-enabled the repo-password accounts.
   An opt-in flag that is on by default is not opt-in. */
export const DEMO_MODE = String(process.env.DEMO_MODE ?? 'false') === 'true';

if (DEMO_MODE && IS_PRODUCTION) {
  console.error(
    '\n[aurelis] REFUSING TO START.\n' +
    '  DEMO_MODE=true with NODE_ENV=production would seed staff accounts whose\n' +
    '  passwords are in the repository and publish them at /api/admin/demo-accounts.\n' +
    '  Unset DEMO_MODE, or run without NODE_ENV=production.\n'
  );
  process.exit(1);
}

/* The super admin always exists. Its password comes from the
   environment, and when nothing is set one is generated and printed
   once to the log — never a literal. The fallback here had become the
   string 'Aurelis!Owner2026', which put a working owner password in
   the repository for every install that set no variable. */
/* Hosting dashboards render the value box as a textarea, so a stray
   newline rides along with a pasted secret more often than not. Stored
   untrimmed, that password can never be typed again: the hash covers a
   character the sign-in form cannot produce, and the operator is locked
   out of their own shop with "Those details do not match an account"
   and nothing in the log to explain it.

   The email is lowercased as well as trimmed, because the sign-in route
   normalises what it is given and an address seeded as "Me@Example.com"
   would never match the "me@example.com" it looks up. */
const SUPER_EMAIL = String(process.env.SUPER_ADMIN_EMAIL || 'owner@aurelis.test').trim().toLowerCase();
const SUPER_PASSWORD = process.env.SUPER_ADMIN_PASSWORD
  ? String(process.env.SUPER_ADMIN_PASSWORD).trim()
  : null;

const generatedSuperPassword = SUPER_PASSWORD
  ? null
  : randomBytes(18).toString('base64url');

export const SEED_STAFF = [
  {
    email: SUPER_EMAIL,
    password: SUPER_PASSWORD || generatedSuperPassword,
    first: 'Hélène', last: 'Marchand', role: 'admin',
    /* Not a demo account. Its password is either the operator's own or
       one generated at boot; either way it is a live credential and must
       never appear in the /demo-accounts listing. */
    demo: false
  },

  /* These three carry passwords committed to the repository. They are
     a convenience for reviewing the role system locally and must not
     exist anywhere else — seed() drops them unless DEMO_MODE is on. */
  { email: 'admin@aurelis.test',     password: 'Aurelis!Admin2026',  first: 'Marceline', last: 'Roux',    role: 'admin',             demo: true, demoOnly: true },
  { email: 'manager@aurelis.test',   password: 'Aurelis!Manage2026', first: 'Tomas',     last: 'Bianchi', role: 'admin',           demo: true, demoOnly: true },
  { email: 'inventory@aurelis.test', password: 'Aurelis!Stock2026',  first: 'Priya',     last: 'Nair',    role: 'admin',           demo: true, demoOnly: true }
];

/** Printed once at boot when nothing was configured — the only place
    the generated super-admin password is ever shown. */
export function announceGeneratedCredentials() {
  if (!generatedSuperPassword) return;
  console.log(
    '\n[aurelis] No SUPER_ADMIN_PASSWORD was set, so one was generated for this database:\n' +
    `    ${SEED_STAFF[0].email}\n` +
    `    ${generatedSuperPassword}\n` +
    '  It is not stored anywhere else. Set SUPER_ADMIN_PASSWORD to choose your own.\n'
  );
}

/* SUPER_ADMIN_PASSWORD is authoritative, not just an opening value.
   Seeding only runs on an empty database, so setting the variable on
   an existing one previously did nothing — an operator who lost the
   owner password had no way back in short of deleting the file. */
function reconcileOwner() {
  const configured = SUPER_PASSWORD;
  if (!configured) return false;
  const email = SEED_STAFF[0].email;
  const row = db.prepare('SELECT id, password_hash, salt FROM staff WHERE email = ?').get(email);
  if (!row) return false;
  if (verifyPassword(configured, row.password_hash, row.salt)) return false;
  const { hash, salt } = hashPassword(configured);
  db.prepare("UPDATE staff SET password_hash = ?, salt = ?, status = 'active' WHERE id = ?")
    .run(hash, salt, row.id);
  console.log(`[aurelis] owner password reset from SUPER_ADMIN_PASSWORD (${email})`);
  return true;
}

/* Not seeding the demo accounts protects a NEW database. Any database
   that was ever booted in demo mode already holds them, with passwords
   published in this repository — turning DEMO_MODE off did nothing to
   those existing rows. They are deactivated rather than deleted, so the
   audit log keeps pointing at real records, and reactivated if demo
   mode is turned back on. */
function reconcileDemoStaff() {
  const demoEmails = SEED_STAFF.filter((s) => s.demoOnly).map((s) => s.email);
  if (!demoEmails.length) return;
  const marks = demoEmails.map(() => '?').join(',');
  const wanted = DEMO_MODE ? 'active' : 'disabled';
  const changed = db.prepare(
    `UPDATE staff SET status = ? WHERE email IN (${marks}) AND status != ?`
  ).run(wanted, ...demoEmails, wanted).changes;
  if (changed) {
    console.log(`[aurelis] ${changed} demo staff account(s) set to ${wanted} (DEMO_MODE ${DEMO_MODE ? 'on' : 'off'})`);
  }
}

export function init() {
  migrate();
  migrateMl();
  const result = seed();

  /* After seed(), so the products these rows reference exist. Guarded
     because a first boot that dies here leaves a half-built database
     that the next boot inherits — and an empty operations dashboard is
     a far smaller problem than a shop that will not start. */
  try {
    const opsDone = [];
    seedEnterpriseOperations(opsDone);
    if (opsDone.length) console.log(`[aurelis] operations seeded: ${opsDone.join(', ')}`);
  } catch (err) {
    console.warn('[aurelis] operational seed skipped:', err.message);
  }

  reconcileDemoStaff();
  /* Only announce a generated password when the account was actually
     created with it. On a second boot seed() is a no-op, and printing
     a password that was never applied sends the operator looking for a
     login that does not work. */
  if (result.seeded) {
    announceGeneratedCredentials();
    console.log(`[aurelis] database seeded — ${result.staff} staff, ${result.products} products`);
  } else {
    reconcileOwner();
  }
  return result;
}
