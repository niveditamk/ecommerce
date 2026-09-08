/* =============================================================
   DEMAND FORECASTING — baselines, honestly scored
   Naive, seasonal naive, moving average, simple exponential
   smoothing and Holt's linear trend. Candidates are backtested
   on held-out days and the winner is chosen on actual error,
   not on preference.

   Two things this deliberately does NOT do:
     • invent a number when there is too little history — it
       returns INSUFFICIENT and says so
     • treat a zero-sales day as zero demand when the product was
       out of stock — those days are censored and excluded
   ============================================================= */
import { db } from '../db/index.js';

export const MIN_DAYS_FOR_TRAINING = 28;   // below this we refuse to score
export const MIN_DAYS_FOR_TREND = 56;      // Holt needs more than a fortnight

/* ---------- series construction ---------- */
const dayKey = (d) => d.toISOString().slice(0, 10);

function eachDay(fromISO, toISO) {
  const out = [];
  const d = new Date(`${fromISO}T00:00:00Z`);
  const end = new Date(`${toISO}T00:00:00Z`);
  while (d <= end) { out.push(dayKey(d)); d.setUTCDate(d.getUTCDate() + 1); }
  return out;
}

/* The ledger stores two different quantities in new_qty: movements
   that change on-hand write the on-hand balance, while reservation
   movements write the RESERVED count. Reading the column blind
   conflates them — an expiring reservation drops reserved to 0 and
   looks exactly like an empty shelf. Only these types speak about
   on-hand. */
const ON_HAND_TYPES = ['ORDER_CONFIRMED', 'ORDER_CANCELLED', 'STOCK_ADJUSTED', 'GOODS_RECEIVED', 'RETURN_RESTORED'];

/** Days on which a SKU was unavailable — zero sales there means
    "could not sell", not "nobody wanted it".

    Stock is a STATE, not an event. A piece that runs out on Monday
    and is restocked on Friday writes no ledger row on Tuesday,
    Wednesday or Thursday, so an event-based reading would miss
    exactly the days that matter most. The balance is therefore
    carried forward across quiet days. */
function censoredDays(sku, days) {
  const rows = db.prepare(`
    SELECT substr(created_at,1,10) AS day, MIN(new_qty) AS low, MAX(new_qty) AS high
      FROM inventory_transactions
     WHERE product_id = ? AND new_qty IS NOT NULL
       AND type IN (${ON_HAND_TYPES.map(() => '?').join(',')})
     GROUP BY day ORDER BY day ASC
  `).all(sku, ...ON_HAND_TYPES);

  const byDay = new Map(rows.map((r) => [r.day, r]));
  const out = new Set();

  /* Unknown until the ledger first says something; days before that
     are left uncensored rather than guessed at. */
  let carried = null;

  for (const day of days) {
    const today = byDay.get(day);
    if (today) {
      /* Out for part of the day still means demand was suppressed. */
      if (today.low <= 0) out.add(day);
      carried = today.high;
      continue;
    }
    if (carried !== null && carried <= 0) out.add(day);
  }

  return out;
}

/** Daily units sold for one SKU, gap-filled with zeros. */
export function demandSeries(sku, { from, to } = {}) {
  const bounds = db.prepare(`
    SELECT MIN(substr(o.placed_at,1,10)) AS a, MAX(substr(o.placed_at,1,10)) AS b
      FROM order_items i JOIN orders o ON o.id = i.order_id
     WHERE i.product_id = ? AND o.status != 'Cancelled'
  `).get(sku);

  const start = from || bounds?.a;
  const end = to || bounds?.b;
  if (!start || !end) return { sku, points: [], censored: 0 };

  const sold = new Map(
    db.prepare(`
      SELECT substr(o.placed_at,1,10) AS day, SUM(i.qty) AS units
        FROM order_items i JOIN orders o ON o.id = i.order_id
       WHERE i.product_id = ? AND o.status != 'Cancelled'
         AND substr(o.placed_at,1,10) BETWEEN ? AND ?
       GROUP BY day
    `).all(sku, start, end).map((r) => [r.day, r.units])
  );

  const calendar = eachDay(start, end);
  const blocked = censoredDays(sku, calendar);
  const points = calendar.map((day) => ({
    day,
    units: sold.get(day) || 0,
    censored: blocked.has(day) && !sold.get(day)
  }));

  return { sku, points, censored: points.filter((p) => p.censored).length };
}

/* ---------- metrics ---------- */
export function score(actual, predicted) {
  const pairs = actual.map((a, i) => [a, predicted[i]]).filter(([a, p]) => Number.isFinite(a) && Number.isFinite(p));
  const n = pairs.length;
  if (!n) return { mae: null, rmse: null, mape: null, smape: null, wape: null, n: 0 };

  let ae = 0, se = 0, ape = 0, sape = 0, absAct = 0;
  let apeN = 0;
  for (const [a, p] of pairs) {
    const e = Math.abs(a - p);
    ae += e;
    se += (a - p) ** 2;
    absAct += Math.abs(a);
    if (a !== 0) { ape += e / Math.abs(a); apeN += 1; }
    const denom = (Math.abs(a) + Math.abs(p)) / 2;
    if (denom > 0) sape += e / denom;
  }
  return {
    n,
    /* raw sums are kept so many SKUs can be pooled into one
       portfolio-level figure without averaging averages */
    sumAbsError: ae,
    sumSqError: se,
    sumAbsActual: absAct,
    mae: +(ae / n).toFixed(4),
    rmse: +Math.sqrt(se / n).toFixed(4),
    /* MAPE is undefined on zero-demand days; reported only when meaningful */
    mape: apeN ? +((ape / apeN) * 100).toFixed(2) : null,
    smape: +((sape / n) * 100).toFixed(2),
    /* WAPE behaves on intermittent demand where MAPE does not */
    wape: absAct > 0 ? +((ae / absAct) * 100).toFixed(2) : null
  };
}

/* ---------- algorithms ----------
   Each returns { fit(series) -> params, predict(params, h) -> number } */
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);

export const ALGORITHMS = {
  naive: {
    label: 'Naive (last observation)',
    minDays: 2,
    hyper: {},
    fit: (y) => ({ last: y.at(-1) ?? 0 }),
    predict: (p) => Math.max(0, p.last)
  },

  seasonal_naive: {
    label: 'Seasonal naive (same weekday)',
    minDays: 14,
    hyper: {},
    fit: (y) => ({ tail: y.slice(-7) }),
    predict: (p, h) => Math.max(0, p.tail[(p.tail.length - 7 + ((h - 1) % 7) + 7) % p.tail.length] ?? 0)
  },

  moving_average: {
    label: 'Moving average',
    minDays: 7,
    hyper: { window: 28 },
    /* A short window looks responsive and is a trap on intermittent
       demand: a piece that sells twice a fortnight will show seven
       consecutive zeros often, and a 7-day mean then forecasts
       nothing at all. The window is searched, not assumed. */
    grid: [7, 14, 28, 56, 90].map((window) => ({ window })),
    fit: (y, hp) => { const window = hp?.window ?? 28; return { avg: mean(y.slice(-window)), window }; },
    predict: (p) => Math.max(0, p.avg)
  },

  ses: {
    label: 'Simple exponential smoothing',
    minDays: 14,
    hyper: { alpha: 0.2 },
    grid: [0.05, 0.1, 0.2, 0.3, 0.5].map((alpha) => ({ alpha })),
    fit: (y, hp) => {
      const alpha = hp?.alpha ?? 0.2;
      let level = y[0] ?? 0;
      for (let i = 1; i < y.length; i += 1) level = alpha * y[i] + (1 - alpha) * level;
      return { level, alpha };
    },
    predict: (p) => Math.max(0, p.level)
  },

  holt: {
    label: "Holt's linear trend",
    minDays: MIN_DAYS_FOR_TREND,
    hyper: { alpha: 0.3, beta: 0.1 },
    grid: [
      { alpha: 0.1, beta: 0.02 }, { alpha: 0.2, beta: 0.05 },
      { alpha: 0.3, beta: 0.1 }, { alpha: 0.5, beta: 0.15 }
    ],
    fit: (y, hp) => {
      const { alpha = 0.3, beta = 0.1 } = hp || {};
      let level = y[0] ?? 0;
      let trend = (y[1] ?? 0) - (y[0] ?? 0);
      for (let i = 1; i < y.length; i += 1) {
        const prev = level;
        level = alpha * y[i] + (1 - alpha) * (level + trend);
        trend = beta * (level - prev) + (1 - beta) * trend;
      }
      return { level, trend, alpha, beta };
    },
    /* trend is damped so a short upswing doesn't extrapolate to absurdity */
    predict: (p, h) => Math.max(0, p.level + p.trend * Math.min(h, 14) * 0.5)
  }
};

/* ---------- backtest ----------
   Walk-forward: fit on everything before the holdout, predict the
   holdout, score. Censored days are excluded from scoring. */
export function backtest(points, algoKey, hyper) {
  const algo = ALGORITHMS[algoKey];
  if (!algo) throw new Error(`Unknown algorithm ${algoKey}`);

  const usable = points.filter((p) => !p.censored);
  if (usable.length < Math.max(algo.minDays, MIN_DAYS_FOR_TRAINING)) {
    return { ok: false, reason: `needs ${Math.max(algo.minDays, MIN_DAYS_FOR_TRAINING)} clean days, has ${usable.length}` };
  }

  const holdout = Math.max(7, Math.floor(usable.length * 0.2));
  const trainPts = usable.slice(0, -holdout);
  const testPts = usable.slice(-holdout);
  const y = trainPts.map((p) => p.units);

  const params = algo.fit(y, hyper || algo.hyper);
  const predicted = testPts.map((_, i) => algo.predict(params, i + 1));
  const actual = testPts.map((p) => p.units);

  const metrics = score(actual, predicted);

  /* Day-level error on intermittent demand is always dreadful —
     you cannot predict which Tuesday the one sale lands on. The
     figure that decides a purchase order is the total over the
     window, so it is measured separately rather than left out. */
  const sumP = predicted.reduce((s, x) => s + x, 0);
  const sumA = actual.reduce((s, x) => s + x, 0);
  metrics.cumulativeError = sumA > 0 ? +((Math.abs(sumP - sumA) / sumA) * 100).toFixed(2) : null;
  metrics.cumulativePredicted = +sumP.toFixed(2);
  metrics.cumulativeActual = sumA;
  metrics.window = holdout;

  return { ok: true, metrics, params, holdout, trainRows: trainPts.length };
}

/* ---------- confidence ----------
   Stated from evidence, never assumed. */
export function confidenceOf({ days, wape, cumulativeError }) {
  if (days < MIN_DAYS_FOR_TRAINING) return 'INSUFFICIENT';
  /* Judged on the error that matters for a purchase decision —
     how far the total over the window was out — falling back to
     day-level WAPE only when the cumulative figure is unavailable. */
  const err = cumulativeError ?? wape;
  if (err == null) return 'LOW';
  if (days >= 180 && err <= 15) return 'HIGH';
  if (days >= 90 && err <= 30) return 'MEDIUM';
  return 'LOW';
}

/* ---------- forecast ---------- */
export function forecast(sku, { horizons = [7, 14, 30, 60, 90], algorithm, params } = {}) {
  const series = demandSeries(sku);
  const usable = series.points.filter((p) => !p.censored);

  if (usable.length < MIN_DAYS_FOR_TRAINING) {
    return {
      sku,
      confidence: 'INSUFFICIENT',
      days: usable.length,
      horizons: {},
      explanation: [
        `Only ${usable.length} day${usable.length === 1 ? '' : 's'} of clean sales history.`,
        `At least ${MIN_DAYS_FOR_TRAINING} are needed before a forecast means anything.`,
        series.censored ? `${series.censored} day(s) excluded — the piece was out of stock.` : null
      ].filter(Boolean)
    };
  }

  const algoKey = algorithm || 'moving_average';
  const algo = ALGORITHMS[algoKey];
  const y = usable.map((p) => p.units);
  const fitted = params || algo.fit(y, algo.hyper);

  const bt = backtest(series.points, algoKey);
  const wape = bt.ok ? bt.metrics.wape : null;
  const cumErr = bt.ok ? bt.metrics.cumulativeError : null;
  const daily = algo.predict(fitted, 1);

  const out = {};
  horizons.forEach((h) => {
    const total = Array.from({ length: h }, (_, i) => algo.predict(fitted, i + 1)).reduce((s, x) => s + x, 0);
    /* interval widens with the horizon and with observed error */
    const spread = (wape ?? 50) / 100;
    out[h] = {
      units: Math.round(total),
      lower: Math.max(0, Math.round(total * (1 - spread))),
      upper: Math.round(total * (1 + spread))
    };
  });

  const recent = mean(y.slice(-14));
  const prior = mean(y.slice(-28, -14));
  const change = prior > 0 ? ((recent - prior) / prior) * 100 : null;

  return {
    sku,
    algorithm: algoKey,
    confidence: confidenceOf({ days: usable.length, wape, cumulativeError: cumErr }),
    days: usable.length,
    dailyRate: +daily.toFixed(2),
    metrics: bt.ok ? bt.metrics : null,
    horizons: out,
    explanation: [
      `${usable.length} days of clean history; ${algo.label} scored best on held-out days.`,
      change != null
        ? `Demand ${change >= 0 ? 'up' : 'down'} ${Math.abs(change).toFixed(0)}% over the last fortnight versus the one before.`
        : 'Not enough recent history to compare fortnights.',
      wape != null ? `Backtest error (WAPE) ${wape}%.` : 'Backtest error could not be computed.',
      series.censored ? `${series.censored} out-of-stock day(s) excluded so they are not read as zero demand.` : null
    ].filter(Boolean)
  };
}
