/* =============================================================
   INTELLIGENCE LAYER
   Stock-out risk, reorder proposals, overstock and anomalies.

   Every output here is a recommendation with its reasoning
   attached, for a human to accept, change or reject. Nothing in
   this file writes to stock, raises an order or changes a price.
   Where the forecast is not trustworthy the answer is "unknown"
   with the reason, never a number dressed up as certainty.
   ============================================================= */
import { db } from '../db/index.js';
import { position } from '../inventory/engine.js';
import { demandSeries } from './forecast.js';
import { predict } from './trainer.js';

/* Lead time is not yet modelled per supplier — suppliers arrive
   with the purchasing module. Until then it is one stated
   assumption, surfaced in the UI rather than buried here. */
export const DEFAULT_LEAD_TIME_DAYS = 14;
export const REVIEW_PERIOD_DAYS = 14;
export const SERVICE_LEVEL_Z = 1.65;         // ≈95% service level
export const OVERSTOCK_COVER_DAYS = 180;

const inr = (n) => Math.round(n || 0);

function stdev(values) {
  if (values.length < 2) return 0;
  const m = values.reduce((s, x) => s + x, 0) / values.length;
  return Math.sqrt(values.reduce((s, x) => s + (x - m) ** 2, 0) / (values.length - 1));
}

function activeProducts() {
  return db.prepare(
    "SELECT id, name, price, stock, reserved, incoming, safety_stock, low_stock_at FROM products WHERE status = 'active' ORDER BY name"
  ).all();
}

/* Retail price, read once per pass instead of once per SKU per board.
   The three boards each looped every active product and issued two
   single-row price queries inside that loop — 121 statements compiled
   and run to render one dashboard. */
let priceCache = { stamp: null, map: new Map() };
function priceOf(sku) {
  const now = catalogueStamp();
  if (priceCache.stamp !== now) {
    const map = new Map();
    for (const r of db.prepare('SELECT id, price FROM products').all()) map.set(r.id, r.price);
    priceCache = { stamp: now, map };
  }
  return priceCache.map.get(sku) || 0;
}

/* A cheap fingerprint of catalogue state. Every stock movement stamps
   products.updated_at and appends to the ledger, so if this string is
   unchanged nothing a board reads can have moved. */
function catalogueStamp() {
  const p = db.prepare('SELECT COUNT(*) AS n, MAX(updated_at) AS t FROM products').get();
  const l = db.prepare('SELECT MAX(id) AS t FROM inventory_transactions').get();
  return `${p.n}:${p.t}:${l?.t ?? 0}`;
}

/* ---------- one SKU, fully reasoned ---------- */
export function skuIntelligence(sku, { leadTime = DEFAULT_LEAD_TIME_DAYS } = {}) {
  const pos = position(sku);
  if (!pos) return null;

  const p = predict(sku, [7, 30, leadTime]);
  const known = p.confidence !== 'INSUFFICIENT';
  const rate = known ? p.dailyRate : null;

  /* Demand variability, measured rather than assumed. */
  const series = demandSeries(sku);
  const clean = series.points.filter((x) => !x.censored).map((x) => x.units);
  const sigmaDaily = stdev(clean.slice(-90));
  const sigmaLead = sigmaDaily * Math.sqrt(leadTime);

  const coverDays = rate > 0 ? +(pos.available / rate).toFixed(1) : null;
  const safety = known ? Math.ceil(SERVICE_LEVEL_Z * sigmaLead) : null;
  const reorderPoint = known ? Math.ceil(rate * leadTime + safety) : null;

  /* Units actually sold in the last quarter. A forecast of zero
     means something quite different depending on this. */
  const recentUnits = clean.slice(-90).reduce((a, x) => a + x, 0);

  /* ---- stock-out risk ---- */
  let risk = 'UNKNOWN';
  let stated = p.confidence;   // what the console should show for this row
  let riskReason;
  if (!known) {
    riskReason = `Not enough history to forecast ${sku}. Risk cannot be stated — this is not the same as low risk.`;
  } else if (!rate && recentUnits > 0) {
    /* The model has settled on zero while the piece is still
       selling — a quiet recent window, not a dead line. Reporting
       this as low risk would be the wrong kind of confident, and
       the version's backtest confidence does not apply to a point
       estimate this obviously unusable. */
    stated = 'LOW';
    riskReason = `The forecast reads zero a day, but ${recentUnits} unit(s) sold in the last 90 days. `
      + 'Too quiet recently to project from — treat the cover figure as unknown, not safe.';
  } else if (pos.available <= 0) {
    risk = 'OUT';
    riskReason = 'Already out of stock. Every day from here is lost demand, not low demand.';
  } else if (coverDays != null && coverDays < leadTime) {
    risk = 'HIGH';
    riskReason = `${coverDays} days of cover against a ${leadTime}-day lead time — it runs out before a replacement can land.`;
  } else if (coverDays != null && coverDays < leadTime * 1.75) {
    risk = 'MEDIUM';
    riskReason = `${coverDays} days of cover. It clears the ${leadTime}-day lead time, but with no room for a busy fortnight.`;
  } else {
    risk = 'LOW';
    riskReason = coverDays != null
      ? `${coverDays} days of cover, comfortably beyond the ${leadTime}-day lead time.`
      : `No sales in the last 90 days and none forecast — nothing to run out of. Worth asking whether it should still be listed.`;
  }

  /* ---- reorder proposal ---- */
  let reorder = null;
  if (known && reorderPoint != null) {
    const projected = pos.available + (pos.incoming || 0);
    if (projected <= reorderPoint) {
      /* Cover the lead time plus the next review cycle, less what
         is already on hand or in transit. */
      const target = Math.ceil(rate * (leadTime + REVIEW_PERIOD_DAYS) + safety);
      const qty = Math.max(0, target - projected);
      if (qty > 0) {
        const price = priceOf(sku);
        reorder = {
          qty,
          target,
          reorderPoint,
          safety,
          leadTime,
          /* Cost price is not held in the catalogue yet, so this is
             the retail value of the order, not its cost. */
          retailValue: inr(qty * price),
          reasoning: [
            `Available ${pos.available}${pos.incoming ? ` plus ${pos.incoming} incoming` : ''} = ${projected}, at or below the reorder point of ${reorderPoint}.`,
            `Forecast demand is ${rate.toFixed(2)}/day, so ${leadTime} days of lead time needs ${Math.ceil(rate * leadTime)} units.`,
            `Safety stock of ${safety} covers demand variability (σ ${sigmaDaily.toFixed(2)}/day) at a 95% service level.`,
            `Ordering ${qty} brings cover to ${target} units — the lead time plus a ${REVIEW_PERIOD_DAYS}-day review cycle.`,
            `Forecast confidence is ${p.confidence}. Check the figure before raising the order.`
          ]
        };
      }
    }
  }

  /* ---- overstock ---- */
  let overstock = null;
  if (known && coverDays != null && coverDays > OVERSTOCK_COVER_DAYS && pos.on_hand > 0) {
    const price = priceOf(sku);
    const excess = Math.max(0, pos.on_hand - Math.ceil(rate * OVERSTOCK_COVER_DAYS));
    overstock = {
      coverDays,
      excess,
      tiedUpRetail: inr(excess * price),
      reasoning: [
        `${pos.on_hand} on hand against ${rate.toFixed(2)} units of demand a day — ${Math.round(coverDays)} days of cover.`,
        `${excess} units beyond a ${OVERSTOCK_COVER_DAYS}-day horizon.`,
        'Consider a promotion, a bundle or holding back the next intake.'
      ]
    };
  }

  return {
    sku,
    name: pos.name,
    onHand: pos.on_hand,
    reserved: pos.reserved,
    available: pos.available,
    incoming: pos.incoming || 0,
    confidence: stated,
    modelConfidence: p.confidence,
    version: p.version ?? null,
    dailyRate: rate,
    sigmaDaily: +sigmaDaily.toFixed(3),
    coverDays,
    reorderPoint,
    safety,
    risk,
    riskReason,
    forecast: p.horizons || {},
    reorder,
    overstock,
    explanation: p.explanation || []
  };
}

/* ---------- boards ----------
   The admin overview renders risk, reorder and overstock together.
   Each used to walk the whole catalogue and re-run every forecast,
   so one page load did the same work three times over. They share a
   pass now, keyed on a fingerprint of catalogue state rather than on a
   clock — so a burst of requests from one page load does the work once,
   and the very next stock movement invalidates it. */
let boardCache = { stamp: null, leadTime: null, rows: [] };

function intelligenceRows(leadTime) {
  const stamp = catalogueStamp();
  if (boardCache.stamp === stamp && boardCache.leadTime === leadTime) return boardCache.rows;
  const rows = activeProducts()
    .map((p) => skuIntelligence(p.id, { leadTime }))
    .filter(Boolean);
  boardCache = { stamp, leadTime, rows };
  return rows;
}

export function riskBoard({ leadTime = DEFAULT_LEAD_TIME_DAYS } = {}) {
  const order = { OUT: 0, HIGH: 1, MEDIUM: 2, UNKNOWN: 3, LOW: 4 };
  const rows = intelligenceRows(leadTime)
    .slice()
    .sort((a, b) => (order[a.risk] - order[b.risk]) || ((a.coverDays ?? 1e9) - (b.coverDays ?? 1e9)));

  const counts = rows.reduce((acc, r) => { acc[r.risk] = (acc[r.risk] || 0) + 1; return acc; }, {});
  return { rows, counts, leadTime };
}

export function reorderPlan({ leadTime = DEFAULT_LEAD_TIME_DAYS } = {}) {
  const rows = intelligenceRows(leadTime)
    .filter((r) => r.reorder)
    .sort((a, b) => (a.coverDays ?? 1e9) - (b.coverDays ?? 1e9));

  return {
    rows,
    leadTime,
    units: rows.reduce((s, r) => s + r.reorder.qty, 0),
    retailValue: rows.reduce((s, r) => s + r.reorder.retailValue, 0)
  };
}

export function overstockBoard() {
  const rows = intelligenceRows(DEFAULT_LEAD_TIME_DAYS)
    .filter((r) => r.overstock)
    .sort((a, b) => b.overstock.tiedUpRetail - a.overstock.tiedUpRetail);

  return { rows, tiedUpRetail: rows.reduce((s, r) => s + r.overstock.tiedUpRetail, 0) };
}

/* ---------- anomalies ----------
   A spike or collapse against the SKU's own recent baseline. No
   model needed and none claimed — this is a z-score, and it says
   so. */
export function anomalies({ window = 7, baseline = 56, threshold = 2.5 } = {}) {
  const out = [];

  for (const p of activeProducts()) {
    const series = demandSeries(p.id);
    const clean = series.points.filter((x) => !x.censored);
    if (clean.length < baseline + window) continue;

    const recent = clean.slice(-window).map((x) => x.units);
    const base = clean.slice(-(baseline + window), -window).map((x) => x.units);

    const recentMean = recent.reduce((s, x) => s + x, 0) / window;
    const baseMean = base.reduce((s, x) => s + x, 0) / base.length;
    const baseSd = stdev(base);
    if (baseSd === 0) continue;

    /* The mean of `window` days has standard error σ/√window. */
    const z = (recentMean - baseMean) / (baseSd / Math.sqrt(window));
    if (Math.abs(z) < threshold) continue;

    const direction = z > 0 ? 'spike' : 'drop';
    out.push({
      sku: p.id,
      name: p.name,
      direction,
      z: +z.toFixed(2),
      recentMean: +recentMean.toFixed(2),
      baselineMean: +baseMean.toFixed(2),
      changePct: baseMean > 0 ? Math.round(((recentMean - baseMean) / baseMean) * 100) : null,
      reasoning: [
        `Last ${window} days averaged ${recentMean.toFixed(2)} units a day against a ${baseline}-day baseline of ${baseMean.toFixed(2)}.`,
        `That is ${Math.abs(z).toFixed(1)} standard errors ${z > 0 ? 'above' : 'below'} the baseline.`,
        direction === 'spike'
          ? 'Check stock cover before it becomes a stock-out.'
          : 'Check for a stock-out, a pricing change or a listing problem before treating it as lost interest.'
      ]
    });
  }

  return out.sort((a, b) => Math.abs(b.z) - Math.abs(a.z));
}

/* ---------- customers ----------
   Real orders only. Synthetic history has no customers attached,
   so segmentation is never computed from invented people. */
export function rfmSegments() {
  const rows = db.prepare(`
    SELECT c.id, c.first_name || ' ' || c.last_name AS name, c.email,
           COUNT(o.id) AS frequency,
           COALESCE(SUM(o.total), 0) AS monetary,
           MAX(o.placed_at) AS last_order,
           CAST(julianday('now') - julianday(MAX(o.placed_at)) AS INTEGER) AS recency_days
      FROM customers c
      JOIN orders o ON o.customer_id = c.id
     WHERE o.status != 'Cancelled' AND o.channel != 'synthetic'
     GROUP BY c.id
     ORDER BY monetary DESC
  `).all();

  if (!rows.length) {
    return {
      rows: [],
      note: 'No customer has placed a real order yet. Segmentation needs real purchase history — synthetic orders carry no customer, deliberately.'
    };
  }

  /* With a handful of customers, quintile scoring is theatre.
     Say so rather than printing five tidy segments. */
  const thin = rows.length < 20;

  const segmented = rows.map((r) => {
    let segment = 'Active';
    if (r.recency_days > 180) segment = 'Lapsed';
    else if (r.frequency >= 3 && r.monetary >= 100000) segment = 'Champion';
    else if (r.frequency >= 2) segment = 'Returning';
    else if (r.recency_days <= 30) segment = 'New';
    return { ...r, segment };
  });

  return {
    rows: segmented,
    thin,
    note: thin
      ? `Only ${rows.length} customer(s) with real orders. Segments are rule-based thresholds, not a fitted model — treat them as labels, not insight.`
      : null
  };
}
