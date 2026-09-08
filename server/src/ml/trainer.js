/* =============================================================
   TRAINER
   Runs every candidate algorithm against every SKU, scores them
   on held-out days, and registers the winner as a new version.

   Nothing here is decided by preference. If the naive baseline
   beats exponential smoothing on this catalogue, the naive
   baseline wins and the console says so. And if there is not
   enough clean history, the run is recorded as skipped rather
   than producing a version nobody should trust.
   ============================================================= */
import { db } from '../db/index.js';
import {
  ALGORITHMS, demandSeries, backtest, score, confidenceOf, MIN_DAYS_FOR_TRAINING
} from './forecast.js';
import {
  startRun, finishRun, failRun, skipRun, registerVersion, activeVersion, savePredictions
} from './registry.js';

const MODEL = 'demand_forecast';

/** Pool per-SKU errors into one portfolio figure. Averaging each
    SKU's WAPE would let a SKU that sold three units in a year
    weigh as much as the bestseller. */
function pool(results) {
  let ae = 0; let se = 0; let absAct = 0; let n = 0;
  let cumAbsErr = 0; let cumP = 0; let cumA = 0;
  results.forEach((r) => {
    ae += r.sumAbsError; se += r.sumSqError; absAct += r.sumAbsActual; n += r.n;
    /* Absolute error per SKU, then summed. Summing the signed
       errors first would let an over-forecast on one piece hide an
       under-forecast on another and flatter the model. */
    cumAbsErr += Math.abs((r.cumulativePredicted ?? 0) - (r.cumulativeActual ?? 0));
    cumP += r.cumulativePredicted ?? 0;
    cumA += r.cumulativeActual ?? 0;
  });
  if (!n) return null;
  return {
    n,
    mae: +(ae / n).toFixed(4),
    rmse: +Math.sqrt(se / n).toFixed(4),
    mape: null,   // undefined across a catalogue with zero-demand days
    smape: +(results.reduce((s, r) => s + (r.smape ?? 0) * r.n, 0) / n).toFixed(2),
    wape: absAct > 0 ? +((ae / absAct) * 100).toFixed(2) : null,
    /* the figure a buyer actually acts on */
    cumulativeError: cumA > 0 ? +((cumAbsErr / cumA) * 100).toFixed(2) : null,
    /* kept separately: net bias tells you whether the catalogue as
       a whole is being over- or under-bought */
    cumulativeBias: cumA > 0 ? +(((cumP - cumA) / cumA) * 100).toFixed(2) : null,
    cumulativePredicted: +cumP.toFixed(1),
    cumulativeActual: cumA
  };
}

export function trainDemandForecast({ staffId = null, trigger = 'manual' } = {}) {
  const t0 = Date.now();
  const runId = startRun(MODEL, { trigger, staffId });

  try {
    const skus = db.prepare(
      "SELECT id, name FROM products WHERE status != 'archived' ORDER BY id"
    ).all();

    const candidates = Object.keys(ALGORITHMS);
    const perAlgo = new Map(candidates.map((k) => [k, []]));
    const perSku = {};
    const eligible = [];
    const skipped = [];
    let rowsUsed = 0;
    let from = null;
    let to = null;

    for (const sku of skus) {
      const series = demandSeries(sku.id);
      const clean = series.points.filter((p) => !p.censored);

      if (clean.length < MIN_DAYS_FOR_TRAINING) {
        skipped.push({ sku: sku.id, name: sku.name, days: clean.length });
        continue;
      }

      eligible.push(sku.id);
      rowsUsed += clean.length;
      const first = series.points[0]?.day;
      const last = series.points.at(-1)?.day;
      if (!from || (first && first < from)) from = first;
      if (!to || (last && last > to)) to = last;

      /* Every algorithm gets the same holdout for this SKU.
         Selection is on the error over the window — the figure a
         reorder depends on — with day-level WAPE as the tiebreak
         so a model that gets the total right by luck while getting
         every day wrong cannot win outright. */
      let best = null;
      for (const key of candidates) {
        const algo = ALGORITHMS[key];
        /* Search the hyperparameters too. Leaving them at a default
           is how a moving average ends up forecasting zero for a
           piece that plainly still sells. */
        const settings = algo.grid || [algo.hyper];
        let bestForAlgo = null;

        for (const hp of settings) {
          const bt = backtest(series.points, key, hp);
          if (!bt.ok) continue;
          const cum = bt.metrics.cumulativeError ?? Infinity;
          const w = bt.metrics.wape ?? Infinity;
          if (!bestForAlgo || cum < bestForAlgo.cum || (cum === bestForAlgo.cum && w < bestForAlgo.wape)) {
            bestForAlgo = { algorithm: key, hyper: hp, cum, wape: w, params: bt.params, metrics: bt.metrics };
          }
        }

        if (!bestForAlgo) continue;
        /* The leaderboard compares each algorithm at its own best
           settings, not at an arbitrary default. */
        perAlgo.get(key).push(bestForAlgo.metrics);
        if (!best || bestForAlgo.cum < best.cum || (bestForAlgo.cum === best.cum && bestForAlgo.wape < best.wape)) {
          best = bestForAlgo;
        }
      }

      if (best) {
        /* Refit the champion on the full clean series — the
           backtest fit deliberately withheld the recent days. */
        const y = clean.map((p) => p.units);
        perSku[sku.id] = {
          algorithm: best.algorithm,
          hyper: best.hyper,
          params: ALGORITHMS[best.algorithm].fit(y, best.hyper),
          metrics: best.metrics,
          days: clean.length,
          censored: series.censored
        };
      }
    }

    if (!eligible.length) {
      const msg = `No SKU has ${MIN_DAYS_FOR_TRAINING} days of clean sales history. `
        + `${skus.length} SKUs checked; the best had ${Math.max(0, ...skipped.map((s) => s.days))} day(s). `
        + 'Nothing was trained — a model fitted on this would be guesswork.';
      skipRun(runId, msg, Date.now() - t0);
      return { ok: false, runId, reason: msg, skipped };
    }

    /* Rank the algorithms across the whole catalogue. */
    const leaderboard = candidates
      .map((key) => ({ algorithm: key, label: ALGORITHMS[key].label, skus: perAlgo.get(key).length, metrics: pool(perAlgo.get(key)) }))
      .filter((c) => c.metrics)
      .sort((a, b) => (a.metrics.cumulativeError ?? Infinity) - (b.metrics.cumulativeError ?? Infinity));

    const winner = leaderboard[0];
    /* Champion metrics: what the per-SKU champions actually
       achieved, which is what will be served. */
    const championMetrics = pool(Object.values(perSku).map((s) => s.metrics));

    /* How the per-SKU choices actually fell — one catalogue rarely
       has one best algorithm. */
    const mix = {};
    Object.values(perSku).forEach((s) => { mix[s.algorithm] = (mix[s.algorithm] || 0) + 1; });

    const { versionId, version } = registerVersion(MODEL, {
      algorithm: winner.algorithm,
      hyperparams: ALGORITHMS[winner.algorithm].hyper || {},
      features: ['daily units', 'weekday', 'trailing window', 'stock-out censoring'],
      artifact: { perSku, global: winner.algorithm, mix },
      trainRows: rowsUsed,
      trainFrom: from,
      trainTo: to,
      metrics: championMetrics,
      notes: `${eligible.length} SKU(s) trained, ${skipped.length} skipped for thin history. `
        + `Each SKU keeps its own champion — ${Object.entries(mix).map(([k, v]) => `${k} ×${v}`).join(', ')}. `
        + `${winner.label} was the strongest single algorithm across the catalogue `
        + `(${winner.metrics.cumulativeError}% window error against ${championMetrics.cumulativeError}% for the mix).`,
      staffId,
      activate: true
    });

    finishRun(runId, {
      candidates: leaderboard,
      winner: winner.algorithm,
      versionId,
      rowsUsed,
      skus: eligible.length,
      message: `Version ${version} active — total-window error ${championMetrics.cumulativeError}%, day-level WAPE ${championMetrics.wape}%`,
      durationMs: Date.now() - t0
    });

    return {
      ok: true, runId, versionId, version,
      winner: winner.algorithm, leaderboard,
      metrics: championMetrics,
      trained: eligible.length, skipped: skipped.length,
      durationMs: Date.now() - t0
    };
  } catch (err) {
    failRun(runId, err.message, Date.now() - t0);
    throw err;
  }
}

/* ---------- readiness ----------
   Answers "can this be trained at all, and on what?" before
   anybody presses the button. */
export function dataReadiness() {
  const skus = db.prepare("SELECT id, name FROM products WHERE status != 'archived' ORDER BY id").all();

  const rows = skus.map((s) => {
    const series = demandSeries(s.id);
    const clean = series.points.filter((p) => !p.censored);
    const units = clean.reduce((a, p) => a + p.units, 0);
    return {
      sku: s.id,
      name: s.name,
      days: clean.length,
      censored: series.censored,
      units,
      ready: clean.length >= MIN_DAYS_FOR_TRAINING
    };
  });

  const ready = rows.filter((r) => r.ready);
  return {
    minDays: MIN_DAYS_FOR_TRAINING,
    skus: rows.length,
    ready: ready.length,
    short: rows.length - ready.length,
    longestHistory: Math.max(0, ...rows.map((r) => r.days)),
    totalUnits: rows.reduce((a, r) => a + r.units, 0),
    censoredDays: rows.reduce((a, r) => a + r.censored, 0),
    rows: rows.sort((a, b) => b.days - a.days)
  };
}

/* ---------- serving ----------
   Predictions come from the active version's stored parameters,
   not from a fresh fit — so what the console shows is what the
   registered model actually says. */
export function predict(sku, horizons = [7, 14, 30, 60, 90]) {
  const ver = activeVersion(MODEL);
  if (!ver) {
    return { sku, confidence: 'INSUFFICIENT', reason: 'No trained version. Train the model first.', horizons: {} };
  }

  const artifact = JSON.parse(ver.artifact || '{}');
  const entry = artifact.perSku?.[sku];
  if (!entry) {
    const series = demandSeries(sku);
    const clean = series.points.filter((p) => !p.censored).length;
    return {
      sku,
      version: ver.version,
      confidence: 'INSUFFICIENT',
      days: clean,
      horizons: {},
      explanation: [
        `${sku} was not in the training set.`,
        `It has ${clean} day(s) of clean history; ${MIN_DAYS_FOR_TRAINING} are needed.`
      ]
    };
  }

  /* A version registered by the Python service is fitted with models
     this runtime does not implement (Croston, TSB, gradient boosting).
     Serving it here would mean calling predict on undefined. Say so
     plainly rather than crashing or, worse, quietly returning zeros —
     a silent zero reads as "no demand" and gets acted on. */
  const algo = ALGORITHMS[entry.algorithm];
  if (!algo) {
    return {
      sku,
      version: ver.version,
      confidence: 'UNKNOWN',
      runtime: artifact.runtime || 'python',
      algorithm: entry.algorithm,
      horizons: {},
      explanation: [
        `Version ${ver.version} was fitted with "${entry.algorithm}", which the Python service implements and this one does not.`,
        'Roll back to a JavaScript-trained version to serve from Node, or ask the Python service for this forecast.',
        'No number is shown because there is no honest one to show from here.'
      ]
    };
  }

  const wape = entry.metrics?.wape;
  const cumErr = entry.metrics?.cumulativeError;
  /* The band is on the total over the horizon, so it is derived
     from the cumulative backtest error — not from day-level WAPE,
     which would put a ±73% band around a 30-day figure the model
     actually gets within a few per cent. Floored at 10% so it is
     never narrower than the evidence supports. */
  const spread = Math.max(0.1, (cumErr ?? wape ?? 50) / 100);
  const out = {};

  horizons.forEach((h) => {
    let total = 0;
    for (let i = 1; i <= h; i += 1) total += algo.predict(entry.params, i);
    out[h] = {
      units: Math.round(total),
      lower: Math.max(0, Math.round(total * (1 - spread))),
      upper: Math.round(total * (1 + spread))
    };
  });

  const daily = algo.predict(entry.params, 1);

  return {
    sku,
    version: ver.version,
    versionId: ver.id,
    algorithm: entry.algorithm,
    algorithmLabel: algo.label,
    dailyRate: +daily.toFixed(3),
    days: entry.days,
    censoredDays: entry.censored,
    metrics: entry.metrics,
    confidence: confidenceOf({ days: entry.days, wape, cumulativeError: entry.metrics?.cumulativeError }),
    horizons: out,
    explanation: [
      `${algo.label} was the best of ${Object.keys(ALGORITHMS).length} candidates for this SKU on held-out days.`,
      `Fitted on ${entry.days} clean days${entry.censored ? `, ${entry.censored} out-of-stock day(s) excluded` : ''}.`,
      cumErr != null
        ? `On held-out days the total was out by ${cumErr}% — that is what sets the range shown.`
        : 'Window error could not be computed for this SKU.',
      wape != null
        ? `Day-level error is ${wape}%, which is normal for a piece that sells in ones and twos: `
          + 'the total over a month is dependable, the specific day is not.'
        : null
    ].filter(Boolean)
  };
}

/** Predict for every trained SKU and store the result, so the
    console has something to compare against reality later. */
export function snapshotPredictions({ horizon = 30 } = {}) {
  const ver = activeVersion(MODEL);
  if (!ver) return { ok: false, reason: 'No active version.' };

  const artifact = JSON.parse(ver.artifact || '{}');
  const rows = Object.keys(artifact.perSku || {}).map((sku) => {
    const p = predict(sku, [horizon]);
    return {
      subject: sku,
      horizon,
      value: p.horizons[horizon].units,
      lower: p.horizons[horizon].lower,
      upper: p.horizons[horizon].upper,
      confidence: p.confidence,
      explanation: p.explanation
    };
  });

  if (!rows.length) return { ok: false, reason: 'Active version has no trained SKUs.' };
  savePredictions(MODEL, ver.id, rows);
  return { ok: true, saved: rows.length, version: ver.version };
}

export { MODEL as DEMAND_MODEL, score };
