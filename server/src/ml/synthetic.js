/* =============================================================
   SYNTHETIC SALES HISTORY  — development and testing only

   The storefront has days of trading, not years. A per-SKU daily
   forecaster needs months. This generates that history so the
   models can be built and evaluated honestly, under three rules:

     1. Every row is labelled. Orders carry channel='synthetic'
        and a SYN- prefix; ledger rows carry reference_type
        ='synthetic'. Nothing pretends to be a real sale.
     2. Business reporting excludes it — see excludeSynthetic().
     3. It is reversible. purgeSynthetic() removes every trace.

   The generator is seeded, so the same seed gives the same
   history and a training run can be reproduced exactly.
   ============================================================= */
import { db } from '../db/index.js';

export const SYNTHETIC_CHANNEL = 'synthetic';

/* SQL fragment for anything that reports on real trade. */
export const excludeSynthetic = (alias = 'o') => `${alias}.channel != '${SYNTHETIC_CHANNEL}'`;

/* ---------- deterministic randomness ----------
   Math.random() would make every run unreproducible, which is the
   opposite of what a model registry is for. */
function mulberry32(a) {
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Knuth's method — fine at the small rates we deal in. */
function poisson(lambda, rnd) {
  if (lambda <= 0) return 0;
  if (lambda > 30) return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * (rnd() * 2 - 1) * 1.7));
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do { k += 1; p *= rnd(); } while (p > L);
  return k - 1;
}

const iso = (d) => d.toISOString().slice(0, 10);
const bump = (x, centre, width) => Math.exp(-(((x - centre) / width) ** 2) / 2);

/* ---------- demand shape ----------
   Not noise around a constant: real demand has a weekly rhythm, a
   festive season, a drift and the occasional promotion. */
const WEEKDAY = [0.86, 0.82, 0.9, 0.98, 1.18, 1.42, 1.28];  // Sun..Sat

function seasonal(date) {
  const start = Date.UTC(date.getUTCFullYear(), 0, 1);
  const doy = Math.floor((date - start) / 86400000);
  /* Diwali and the wedding season dominate Indian luxury retail,
     with a softer December lift and a flat, hot April–June. */
  return 1
    + 0.85 * bump(doy, 296, 22)   // late October
    + 0.35 * bump(doy, 345, 14)   // December
    - 0.22 * bump(doy, 150, 40);  // early summer trough
}

/** Baseline velocity from price — a ₹6,000 piece moves far more
    often than a ₹90,000 one. */
function baseRate(price, rnd) {
  const p = Math.max(2000, price || 20000);
  const rate = 2.6 * (18000 / p) ** 0.55;
  return Math.min(3.2, Math.max(0.02, rate * (0.7 + rnd() * 0.6)));
}

/* ---------- generation ---------- */
export function generateSyntheticHistory({ days = 540, seed = 20260824, endDate = null } = {}) {
  const started = Date.now();
  const rnd = mulberry32(seed);

  const products = db.prepare(
    "SELECT id, name, price, stock FROM products WHERE status != 'archived' ORDER BY id"
  ).all();
  if (!products.length) return { ok: false, reason: 'No products to generate against.' };

  /* Stop the day before today so synthetic history never overlaps
     real trading and double-counts the current day. */
  const end = endDate ? new Date(`${endDate}T00:00:00Z`) : new Date();
  end.setUTCDate(end.getUTCDate() - 1);
  end.setUTCHours(0, 0, 0, 0);

  /* Per-SKU character, fixed for the whole run. */
  const profile = new Map(products.map((p) => {
    /* some pieces arrive part-way through the history */
    const launchDay = rnd() < 0.18 ? Math.floor(rnd() * days * 0.6) : 0;
    const rate = baseRate(p.price, rnd);
    const restockEvery = 14 + Math.floor(rnd() * 21);
    /* Buy roughly a cycle's demand plus cover. Too little and the
       history is nothing but stock-outs; too much and censoring
       never appears at all. This lands a few per cent of days
       short, which is what a real buyer achieves. */
    const cycleCover = 1.25 + rnd() * 0.35;
    return [p.id, {
      product: p,
      rate,
      drift: (rnd() - 0.5) * 0.0022,        // ±0.11% a day
      launchDay,
      restockEvery,
      restockQty: Math.max(3, Math.ceil(rate * restockEvery * cycleCover)),
      virtualStock: Math.max(4, Math.ceil(rate * restockEvery * cycleCover)),
      lastRestock: 0
    }];
  }));

  const orderRows = [];
  const itemRows = [];
  const stockoutRows = [];
  const receipts = [];
  let unitsTotal = 0;
  let lostTotal = 0;

  for (let d = 0; d < days; d += 1) {
    const date = new Date(end);
    date.setUTCDate(date.getUTCDate() - (days - 1 - d));
    const day = iso(date);
    const season = seasonal(date);
    const weekday = WEEKDAY[date.getUTCDay()];
    const promo = rnd() < 0.022 ? 2.1 + rnd() : 1;   // a sale day now and then

    const sold = [];

    for (const pr of profile.values()) {
      if (d < pr.launchDay) continue;

      if (d - pr.lastRestock >= pr.restockEvery) {
        const before = pr.virtualStock;
        pr.virtualStock += pr.restockQty;
        pr.lastRestock = d;
        /* Ledger the intake as well as the shortage. Recording only
           the stock-outs leaves the balance stuck at zero forever as
           far as any reader is concerned, and the forecaster then
           censors months of perfectly ordinary trading. */
        receipts.push([pr.product.id, day, pr.restockQty, before, pr.virtualStock]);
      }

      const lambda = pr.rate * season * weekday * promo * (1 + pr.drift * d);
      const wanted = poisson(lambda, rnd);
      if (!wanted) continue;

      const got = Math.min(wanted, pr.virtualStock);
      pr.virtualStock -= got;

      if (got < wanted) {
        lostTotal += wanted - got;
        /* The censoring signal: demand existed and could not be
           met. Without this the model learns that an empty shelf
           means nobody wanted the piece. */
        stockoutRows.push([pr.product.id, day, pr.virtualStock]);
      }
      if (got > 0) { sold.push({ p: pr.product, qty: got }); unitsTotal += got; }
    }

    if (!sold.length) continue;

    /* Split the day into a few baskets so order-level figures are
       not one absurd order per day. */
    let n = 0;
    for (let i = 0; i < sold.length;) {
      const take = 1 + Math.floor(rnd() * 3);
      const lines = sold.slice(i, i + take);
      i += take;
      n += 1;

      const subtotal = lines.reduce((s, l) => s + l.p.price * l.qty, 0);
      const shipping = subtotal >= 25000 ? 0 : 450;
      const tax = Math.round(subtotal * 0.18);
      const id = `SYN-${day.replace(/-/g, '')}-${String(n).padStart(2, '0')}`;

      orderRows.push({ id, day, subtotal, shipping, tax, total: subtotal + shipping + tax });
      lines.forEach((l) => itemRows.push([id, l.p.id, l.p.name, l.qty, l.p.price]));
    }
  }

  /* ---------- persist ---------- */
  const insOrder = db.prepare(
    `INSERT OR REPLACE INTO orders
       (id, customer_id, email, status, stage, method, payment, address,
        subtotal, discount, shipping, tax, total, placed_at, notes, channel)
     VALUES (?, NULL, 'synthetic@aurelis.invalid', 'Delivered', 5, 'Standard', 'Simulated', NULL,
             ?, 0, ?, ?, ?, ?, 'Synthetic history — generated for model development', ?)`
  );
  const insItem = db.prepare(
    'INSERT INTO order_items (order_id, product_id, name, qty, unit_price) VALUES (?,?,?,?,?)'
  );
  const insStockout = db.prepare(
    `INSERT INTO inventory_transactions
       (product_id, type, qty, previous_qty, new_qty, reference_type, reference_id, reason, created_at)
     VALUES (?, 'STOCK_ADJUSTED', 0, ?, ?, 'synthetic', ?, 'Synthetic history — out of stock', ?)`
  );
  const insReceipt = db.prepare(
    `INSERT INTO inventory_transactions
       (product_id, type, qty, previous_qty, new_qty, reference_type, reference_id, reason, created_at)
     VALUES (?, 'GOODS_RECEIVED', ?, ?, ?, 'synthetic', ?, 'Synthetic history — intake', ?)`
  );

  db.exec('BEGIN IMMEDIATE');
  try {
    orderRows.forEach((r) => insOrder.run(
      r.id, r.subtotal, r.shipping, r.tax, r.total, `${r.day} 12:00:00`, SYNTHETIC_CHANNEL
    ));
    itemRows.forEach((r) => insItem.run(...r));
    stockoutRows.forEach(([pid, day, left]) => insStockout.run(pid, left, left, day, `${day} 23:00:00`));
    receipts.forEach(([pid, day, qty, before, after]) => insReceipt.run(pid, qty, before, after, day, `${day} 06:00:00`));
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return {
    ok: true,
    seed,
    days,
    from: iso(new Date(end.getTime() - (days - 1) * 86400000)),
    to: iso(end),
    orders: orderRows.length,
    items: itemRows.length,
    units: unitsTotal,
    skus: products.length,
    stockoutDays: stockoutRows.length,
    receipts: receipts.length,
    lostUnits: lostTotal,
    durationMs: Date.now() - started
  };
}

/* ---------- housekeeping ---------- */
export function syntheticStats() {
  const syn = db.prepare(
    `SELECT COUNT(*) AS orders, MIN(substr(placed_at,1,10)) AS a, MAX(substr(placed_at,1,10)) AS b
       FROM orders WHERE channel = 'synthetic'`
  ).get();
  const real = db.prepare(
    `SELECT COUNT(*) AS orders, MIN(substr(placed_at,1,10)) AS a, MAX(substr(placed_at,1,10)) AS b
       FROM orders WHERE channel != 'synthetic'`
  ).get();
  const total = syn.orders + real.orders;
  return {
    synthetic: { orders: syn.orders, from: syn.a, to: syn.b },
    real: { orders: real.orders, from: real.a, to: real.b },
    syntheticShare: total ? Math.round((syn.orders / total) * 100) : 0,
    present: syn.orders > 0
  };
}

export function purgeSynthetic() {
  db.exec('BEGIN IMMEDIATE');
  try {
    const items = db.prepare(
      "DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE channel = 'synthetic')"
    ).run();
    const orders = db.prepare("DELETE FROM orders WHERE channel = 'synthetic'").run();
    const ledger = db.prepare("DELETE FROM inventory_transactions WHERE reference_type = 'synthetic'").run();
    db.exec('COMMIT');
    return {
      ok: true,
      orders: Number(orders.changes),
      items: Number(items.changes),
      ledger: Number(ledger.changes)
    };
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
