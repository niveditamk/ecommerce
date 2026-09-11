#!/usr/bin/env node
/* =============================================================
   REALISTIC ORDER HISTORY — local/dev only

   This is deliberately separate from ml/synthetic.js. That pipeline
   writes channel='synthetic' rows so the forecasting models have
   history to train on, and every real-trade query filters them out
   (channel != 'synthetic') — they are built to be invisible to the
   business.

   This script does the opposite on purpose: it writes channel='web'
   rows — the same channel a real checkout uses — so the admin
   dashboard, KPIs and charts have real-looking trading history to
   demo against instead of showing all zeros. Each order is written
   in the same shape persistOrder() in routes/commerce.js writes, and
   each sale decrements product.stock and appends an
   inventory_transactions ledger row exactly as commit() does, so the
   inventory history stays internally consistent.

   This is for a local dev database only. server/.data/ is gitignored
   and never reaches GitHub or a deployment.

     node scripts/seed-real-orders.mjs           write ~40 orders
     node scripts/seed-real-orders.mjs --purge    delete every row this script wrote
   ============================================================= */
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new DatabaseSync(path.join(__dirname, '..', '.data', 'aurelis.db'));

const GST_RATE = 0.18;
const ORDER_PREFIX = 'AUR-DEMO'; // marks every row this script writes, so --purge is exact and reversible

const CUSTOMERS = [
  { email: 'ananya.rao@example.com', first: 'Ananya', last: 'Rao', tier: 'Cercle' },
  { email: 'vikram.sharma@example.com', first: 'Vikram', last: 'Sharma', tier: 'Cercle Or' },
  { email: 'meera.iyer@example.com', first: 'Meera', last: 'Iyer', tier: 'Cercle' },
  { email: 'rohan.kapoor@example.com', first: 'Rohan', last: 'Kapoor', tier: 'Cercle' },
  { email: 'priya.nair@example.com', first: 'Priya', last: 'Nair', tier: 'Cercle Or' },
  { email: 'arjun.mehta@example.com', first: 'Arjun', last: 'Mehta', tier: 'Cercle' },
  { email: 'divya.krishnan@example.com', first: 'Divya', last: 'Krishnan', tier: 'Cercle' },
  { email: 'karan.malhotra@example.com', first: 'Karan', last: 'Malhotra', tier: 'Cercle Or' },
];

const CITIES = [
  ['24, Malabar Hill Road', 'Mumbai', 'Maharashtra', '400006'],
  ['B-14, Vasant Vihar', 'New Delhi', 'Delhi', '110057'],
  ['142, Indiranagar 100ft Road', 'Bengaluru', 'Karnataka', '560038'],
  ['7, Poes Garden', 'Chennai', 'Tamil Nadu', '600086'],
  ['19, Park Street', 'Kolkata', 'West Bengal', '700016'],
  ['5, Koregaon Park Lane', 'Pune', 'Maharashtra', '411001'],
];

const METHODS = [
  { id: 'std', label: 'Signature Delivery', price: 0 },
  { id: 'exp', label: 'Express Courier', price: 2900 },
  { id: 'hand', label: 'Hand Delivery by Concierge', price: 9900 },
];

const PAYMENTS = ['Visa 4242', 'Mastercard 1131', 'American Express 3007', 'Bank Transfer'];

/* Weighted so recent orders skew toward earlier fulfilment stages —
   an order placed yesterday cannot plausibly already be Delivered. */
function statusForAge(daysAgo) {
  if (daysAgo < 2) return pick(['Confirmed', 'Processing'], [0.6, 0.4]);
  if (daysAgo < 5) return pick(['Processing', 'Packed', 'Shipped'], [0.3, 0.3, 0.4]);
  if (daysAgo < 10) return pick(['Shipped', 'Delivered'], [0.3, 0.7]);
  return pick(['Delivered', 'Cancelled'], [0.93, 0.07]);
}

function pick(items, weights) {
  const r = Math.random() * weights.reduce((a, b) => a + b, 0);
  let acc = 0;
  for (let i = 0; i < items.length; i++) { acc += weights[i]; if (r <= acc) return items[i]; }
  return items[items.length - 1];
}
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const isoDaysAgo = (days, hour) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(hour, randInt(0, 59), randInt(0, 59), 0);
  return d.toISOString().replace('T', ' ').slice(0, 19);
};

function purge() {
  const orderIds = db.prepare(`SELECT id FROM orders WHERE id LIKE '${ORDER_PREFIX}%'`).all().map((r) => r.id);
  if (!orderIds.length) { console.log('nothing to purge'); return; }

  db.exec('BEGIN IMMEDIATE');
  try {
    for (const id of orderIds) {
      const items = db.prepare('SELECT product_id, qty FROM order_items WHERE order_id = ?').all(id);
      for (const it of items) {
        if (!it.product_id) continue;
        const before = db.prepare('SELECT stock FROM products WHERE id = ?').get(it.product_id);
        if (!before) continue;
        db.prepare("UPDATE products SET stock = stock + ?, updated_at = datetime('now') WHERE id = ?")
          .run(it.qty, it.product_id);
      }
      db.prepare('DELETE FROM order_items WHERE order_id = ?').run(id);
      db.prepare("DELETE FROM inventory_transactions WHERE reference_type = 'order' AND reference_id = ?").run(id);
      db.prepare('DELETE FROM orders WHERE id = ?').run(id);
    }
    /* Only the customers this script itself created — never touch aur-1911-era seed customers. */
    for (const c of CUSTOMERS) {
      db.prepare('DELETE FROM customers WHERE email = ? AND NOT EXISTS (SELECT 1 FROM orders WHERE customer_id = customers.id)')
        .run(c.email);
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  console.log(`purged ${orderIds.length} demo order(s), restored their stock, removed unreferenced demo customers`);
}

function seed() {
  const already = db.prepare(`SELECT COUNT(*) AS n FROM orders WHERE id LIKE '${ORDER_PREFIX}%'`).get().n;
  if (already > 0) {
    console.log(`${already} demo order(s) already present. Run --purge first if you want to regenerate.`);
    return;
  }

  const products = db.prepare(
    "SELECT id, name, price, stock FROM products WHERE status = 'active' AND stock > 8 ORDER BY RANDOM()"
  ).all();
  if (products.length < 5) throw new Error('not enough in-stock products to seed realistic orders against');

  const remaining = new Map(products.map((p) => [p.id, p.stock]));

  db.exec('BEGIN IMMEDIATE');
  try {
    const custId = {};
    const insCust = db.prepare(
      'INSERT INTO customers (email, first_name, last_name, tier) VALUES (?,?,?,?)'
    );
    for (const c of CUSTOMERS) {
      const existing = db.prepare('SELECT id FROM customers WHERE email = ?').get(c.email);
      custId[c.email] = existing ? existing.id : Number(insCust.run(c.email, c.first, c.last, c.tier).lastInsertRowid);
    }

    const insOrder = db.prepare(`
      INSERT INTO orders
        (id, customer_id, email, status, stage, method, payment, tracking, address,
         subtotal, discount, shipping, tax, total, placed_at, channel)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'web')
    `);
    const insItem = db.prepare(
      'INSERT INTO order_items (order_id, product_id, name, variant, size, qty, unit_price) VALUES (?,?,?,?,?,?,?)'
    );
    const insLedger = db.prepare(`
      INSERT INTO inventory_transactions
        (product_id, type, qty, previous_qty, new_qty, reference_type, reference_id, reason, created_at)
      VALUES (?, 'ORDER_CONFIRMED', ?, ?, ?, 'order', ?, 'Sold', ?)
    `);
    const setStock = db.prepare("UPDATE products SET stock = ?, updated_at = ? WHERE id = ?");

    const STAGE_OF = { Confirmed: 1, Processing: 2, Packed: 3, Shipped: 4, Delivered: 5, Cancelled: 1 };

    let written = 0;
    const totalOrders = 42;
    for (let i = 0; i < totalOrders; i++) {
      const daysAgo = Math.floor((i / totalOrders) ** 1.4 * 44); // denser toward "now", tapering back 44 days
      const hour = randInt(9, 21);
      const placedAt = isoDaysAgo(daysAgo, hour);

      const customer = CUSTOMERS[randInt(0, CUSTOMERS.length - 1)];
      const city = CITIES[randInt(0, CITIES.length - 1)];
      const lineCount = pick([1, 2, 3], [0.6, 0.3, 0.1]);

      const lines = [];
      const chosen = new Set();
      let guard = 0;
      while (lines.length < lineCount && guard < 20) {
        guard += 1;
        const p = products[randInt(0, products.length - 1)];
        if (chosen.has(p.id)) continue;
        const have = remaining.get(p.id);
        if (have < 3) continue; // never sell into a product's last couple of units this way
        const qty = pick([1, 1, 1, 2], [1, 1, 1, 1]);
        if (qty >= have) continue;
        chosen.add(p.id);
        lines.push({ id: p.id, name: p.name, price: p.price, qty });
        remaining.set(p.id, have - qty);
      }
      if (!lines.length) continue;

      const status = statusForAge(daysAgo);
      const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
      const method = METHODS[randInt(0, METHODS.length - 1)];
      const discount = Math.random() < 0.12 ? Math.round(subtotal * 0.1) : 0;
      const taxable = subtotal - discount;
      const tax = Math.round(taxable * GST_RATE);
      const shipping = method.price;
      const total = taxable + tax + shipping;

      const id = `${ORDER_PREFIX}-${String(i + 1).padStart(3, '0')}-${randomUUID().slice(0, 6).toUpperCase()}`;
      const address = JSON.stringify({
        first: customer.first, last: customer.last,
        line1: city[0], city: city[1], region: city[2], postcode: city[3], country: 'India'
      });
      const tracking = status === 'Cancelled' ? null : `AUR-${method.id.toUpperCase()}-${randInt(10000000, 99999999)}`;

      insOrder.run(
        id, custId[customer.email], customer.email, status, STAGE_OF[status] || 1,
        method.id, PAYMENTS[randInt(0, PAYMENTS.length - 1)], tracking, address,
        subtotal, discount, shipping, tax, total, placedAt
      );

      for (const line of lines) {
        insItem.run(id, line.id, line.name, null, null, line.qty, line.price);
        if (status !== 'Cancelled') {
          const before = db.prepare('SELECT stock FROM products WHERE id = ?').get(line.id).stock;
          const after = Math.max(0, before - line.qty);
          insLedger.run(line.id, -line.qty, before, after, id, placedAt);
          setStock.run(after, placedAt, line.id);
        }
      }
      written += 1;
    }
    db.exec('COMMIT');
    console.log(`wrote ${written} realistic order(s), channel='web', dated across the last 44 days`);
    console.log('run `node scripts/seed-real-orders.mjs --purge` to remove them cleanly at any time');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

if (process.argv.includes('--purge')) purge();
else seed();
