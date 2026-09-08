/* =============================================================
   ML OPERATIONS API
   Mounted under /api/admin/ml. Every route is behind the same
   staff session and permission guard as the rest of the admin.

     ai.view      read models, versions, runs and recommendations
     ai.feedback  accept, change or reject a recommendation
     ai.manage    train, activate and roll back versions
     ai.data      generate or remove synthetic training data

   Training and activation are recorded in the audit log, because
   changing which model is serving is a change to the business.
   ============================================================= */
import express, { Router } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { db } from '../db/index.js';
import { attachStaff, requireStaff, require_, audit } from '../auth/rbac.js';
import {
  listModels, getModel, listVersions, activeVersion, listRuns,
  activateVersion, recordFeedback, listFeedback,
  registerVersion, startRun, finishRun, failRun
} from '../ml/registry.js';
import { trainDemandForecast, predict, dataReadiness, snapshotPredictions } from '../ml/trainer.js';
import { ALGORITHMS, demandSeries } from '../ml/forecast.js';
import {
  riskBoard, reorderPlan, overstockBoard, anomalies, rfmSegments,
  skuIntelligence, DEFAULT_LEAD_TIME_DAYS
} from '../ml/insights.js';
import { generateSyntheticHistory, purgeSynthetic, syntheticStats } from '../ml/synthetic.js';

const router = Router();
const ipOf = (req) => req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null;
const parse = (v, fallback) => { try { return v ? JSON.parse(v) : fallback; } catch { return fallback; } };

/* =========================================================
   SERVICE INGEST  —  above the staff guard on purpose
   The Python ML service has no staff session; it is a process, not
   a person. It presents a shared secret instead, and everything it
   registers is attributed to the service in the audit log rather
   than to whoever happens to be signed in.

   Node stays the single writer to SQLite. Python reads the database
   read-only and hands finished versions here, which is what keeps
   two processes off one write lock.
   ========================================================= */
const SERVICE_TOKEN = process.env.ML_SERVICE_TOKEN || '';
const MAX_ARTIFACT_BYTES = 8 * 1024 * 1024;

/** Constant-time compare that cannot throw on a length mismatch —
    timingSafeEqual requires equal lengths, so the guard comes first
    and the lengths themselves are compared normally. */
function tokenMatches(presented) {
  if (!SERVICE_TOKEN || !presented) return false;
  const a = Buffer.from(String(presented));
  const b = Buffer.from(SERVICE_TOKEN);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function requireService(req, res, next) {
  /* Never fall open. An unset secret means the ingest door is shut,
     not that anyone may walk through it. */
  if (!SERVICE_TOKEN) {
    return res.status(503).json({
      error: 'ML_SERVICE_TOKEN is not set on the server, so no service may register models.',
      code: 'INGEST_DISABLED'
    });
  }
  if (!tokenMatches(req.get('x-ml-service-token'))) {
    return res.status(401).json({ error: 'Not a recognised service token.' });
  }
  return next();
}

const finiteOrNull = (v) => (v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v));

/* Its own parser, at its own limit: index.js deliberately skips the
   global 256kb one for this path so a model artifact is not measured
   against a ceiling meant for form submissions. The 8 MB check below
   is then what actually refuses, with a message that says so. */
router.post('/register', express.json({ limit: '12mb' }), requireService, (req, res) => {
  const body = req.body || {};
  const key = String(body.modelKey || '');
  const model = getModel(key);
  if (!model) return res.status(404).json({ error: `No model named ${key}.` });

  if (!body.artifact || typeof body.artifact !== 'object') {
    return res.status(400).json({ error: 'An artifact object is required.' });
  }
  const artifactJson = JSON.stringify(body.artifact);
  if (artifactJson.length > MAX_ARTIFACT_BYTES) {
    return res.status(413).json({
      error: `Artifact is ${(artifactJson.length / 1048576).toFixed(1)} MB; the limit is 8 MB.`,
      code: 'ARTIFACT_TOO_LARGE'
    });
  }
  if (!body.algorithm) return res.status(400).json({ error: 'An algorithm name is required.' });

  const runtime = body.runtime === 'python' ? 'python' : 'node';

  /* Registering is safe; ACTIVATING is not. Everything that reads a
     forecast — the risk board, the reorder proposals, the storefront
     intelligence — is served by this runtime, and it can only serve the
     algorithms it implements. Promoting a Croston or TSB version here
     would leave all 21 SKUs reading UNKNOWN and every reorder proposal
     gone, which is a worse outcome than an out-of-date forecast.

     So a foreign version arrives on the leaderboard, where it can be
     compared honestly, and a human promotes it only once this runtime
     can serve it. */
  const servable = Object.prototype.hasOwnProperty.call(ALGORITHMS, String(body.algorithm));
  if (body.activate === true && !servable) {
    return res.status(409).json({
      error: `This runtime cannot serve "${body.algorithm}", so activating it would blank every forecast. `
        + 'The version can be registered for comparison, but not promoted.',
      code: 'NOT_SERVABLE',
      servableAlgorithms: Object.keys(ALGORITHMS)
    });
  }
  const m = body.metrics || {};
  const t0 = Date.now();
  const runId = startRun(key, { trigger: runtime, staffId: null });

  try {
    const { versionId, version } = registerVersion(key, {
      algorithm: String(body.algorithm),
      hyperparams: body.hyperparams || {},
      features: body.features || [],
      artifact: body.artifact,
      trainRows: finiteOrNull(body.trainRows),
      trainFrom: body.trainFrom || null,
      trainTo: body.trainTo || null,
      metrics: {
        mae: finiteOrNull(m.mae), rmse: finiteOrNull(m.rmse), mape: finiteOrNull(m.mape),
        smape: finiteOrNull(m.smape), wape: finiteOrNull(m.wape),
        cumulativeError: finiteOrNull(m.cumulativeError),
        cumulativeBias: finiteOrNull(m.cumulativeBias)
      },
      notes: body.notes ? String(body.notes).slice(0, 2000) : null,
      staffId: null,
      /* Opt IN, not opt out: a registration must never silently
         change what the shop is served. */
      activate: body.activate === true && servable
    });

    /* runtime describes what is SERVING, not what last trained.
       Flipping it on a mere registration would have the console claim
       Python is in charge while a JavaScript version answers every
       request. */
    if (body.activate === true && servable) {
      db.prepare('UPDATE ml_models SET runtime = ? WHERE key = ?').run(runtime, key);
    }

    finishRun(runId, {
      candidates: body.leaderboard || [],
      winner: String(body.algorithm),
      versionId,
      rowsUsed: finiteOrNull(body.trainRows),
      skus: Object.keys(body.artifact?.perSku || {}).length,
      message: `Version ${version} registered by the ${runtime} service`,
      durationMs: Date.now() - t0
    });

    audit({
      staff: { id: null, firstName: 'ML', lastName: 'service', roleName: runtime },
      action: 'ml.register',
      entity: 'ml_model',
      entityId: key,
      summary: `${runtime} service registered ${model.name} version ${version} (${body.algorithm})`,
      ip: ipOf(req)
    });

    return res.status(201).json({
      ok: true, versionId, version, runtime,
      activated: body.activate === true && servable,
      servable,
      note: servable ? undefined
        : 'Registered for comparison. This runtime cannot serve ' + body.algorithm + ', so it was not promoted.'
    });
  } catch (err) {
    failRun(runId, err.message, Date.now() - t0);
    return res.status(500).json({ error: err.message });
  }
});

/* Everything below this line is for people, not processes. */
router.use(attachStaff, requireStaff);

/* Which models the platform can actually train today. The rest
   are declared in the registry so the console shows the roadmap
   rather than pretending it does not exist. */
const TRAINABLE = {
  demand_forecast: trainDemandForecast
};

/* =========================================================
   OVERVIEW
   ========================================================= */
router.get('/overview', require_('ai.view'), (_req, res) => {
  const readiness = dataReadiness();
  const data = syntheticStats();
  const models = listModels();
  const trained = models.filter((m) => m.active_version_id);

  let risk = { counts: {}, rows: [] };
  let reorder = { rows: [], units: 0, retailValue: 0 };
  if (trained.some((m) => m.key === 'demand_forecast')) {
    risk = riskBoard();
    reorder = reorderPlan();
  }

  const active = activeVersion('demand_forecast');

  res.json({
    readiness,
    data,
    models: models.map((m) => ({ ...m, trainable: !!TRAINABLE[m.key] })),
    runs: listRuns(null, 6),
    activeForecast: active
      ? {
        version: active.version,
        algorithm: active.algorithm,
        trainedAt: active.created_at,
        rows: active.train_rows,
        from: active.train_from,
        to: active.train_to,
        metrics: {
          mae: active.mae, rmse: active.rmse, smape: active.smape, wape: active.wape,
          cumulativeError: active.cumulative_error, cumulativeBias: active.cumulative_bias
        },
        notes: active.notes,
        mix: parse(active.artifact, {}).mix || {}
      }
      : null,
    risk: { counts: risk.counts, leadTime: risk.leadTime ?? DEFAULT_LEAD_TIME_DAYS, top: risk.rows.slice(0, 5) },
    reorder: { count: reorder.rows.length, units: reorder.units, retailValue: reorder.retailValue },
    feedback: listFeedback(5)
  });
});

/* =========================================================
   REGISTRY
   ========================================================= */
router.get('/models', require_('ai.view'), (_req, res) => {
  res.json({ models: listModels().map((m) => ({ ...m, trainable: !!TRAINABLE[m.key] })) });
});

router.get('/models/:key', require_('ai.view'), (req, res) => {
  const model = getModel(req.params.key);
  if (!model) return res.status(404).json({ error: 'No such model.' });

  const versions = listVersions(req.params.key).map((v) => ({
    ...v,
    hyperparams: parse(v.hyperparams, {}),
    features: parse(v.features, []),
    /* the artifact can be large; the console never needs it whole */
    artifact: undefined,
    skus: Object.keys(parse(v.artifact, {}).perSku || {}).length,
    mix: parse(v.artifact, {}).mix || {}
  }));

  res.json({
    model: { ...model, trainable: !!TRAINABLE[model.key] },
    versions,
    runs: listRuns(req.params.key, 20),
    algorithms: Object.entries(ALGORITHMS).map(([key, a]) => ({
      key,
      label: a.label,
      minDays: a.minDays,
      settings: a.grid?.length || 1,
      searched: a.grid ? Object.keys(a.grid[0]).join(', ') : null
    }))
  });
});

router.post('/models/:key/train', require_('ai.manage'), (req, res) => {
  const key = req.params.key;
  const model = getModel(key);
  if (!model) return res.status(404).json({ error: 'No such model.' });

  const run = TRAINABLE[key];
  if (!run) {
    return res.status(400).json({
      error: `${model.name} has no trainer yet. It is registered so the roadmap is visible, not because it is ready.`,
      code: 'NOT_TRAINABLE'
    });
  }

  const out = run({ staffId: req.staff.id, trigger: 'manual' });

  audit({
    staff: req.staff,
    action: out.ok ? 'ml.train' : 'ml.train.skipped',
    entity: 'ml_model',
    entityId: key,
    summary: out.ok
      ? `Trained ${model.name} — version ${out.version} active (${out.trained} SKUs)`
      : `Training skipped for ${model.name} — insufficient data`,
    ip: ipOf(req)
  });

  res.status(out.ok ? 200 : 409).json(out);
});

router.post('/models/:key/versions/:id/activate', require_('ai.manage'), (req, res) => {
  const key = req.params.key;
  const id = Number(req.params.id);
  const target = db.prepare('SELECT * FROM ml_versions WHERE id = ? AND model_key = ?').get(id, key);
  if (!target) return res.status(404).json({ error: 'No such version.' });
  if (target.is_active) return res.status(400).json({ error: 'That version is already serving.' });

  const previous = activeVersion(key);
  const now = activateVersion(key, id);

  /* Keep ml_models.runtime describing what is actually SERVING. It is
     derived from the activated version, never left over from whichever
     service happened to train last — otherwise the console reports the
     wrong engine in charge. */
  const servingRuntime = Object.prototype.hasOwnProperty.call(ALGORITHMS, target.algorithm)
    ? 'node'
    : 'python';
  db.prepare('UPDATE ml_models SET runtime = ? WHERE key = ?').run(servingRuntime, key);

  audit({
    staff: req.staff,
    action: 'ml.activate',
    entity: 'ml_model',
    entityId: key,
    summary: previous
      ? `Rolled ${key} from version ${previous.version} to version ${target.version}`
      : `Activated ${key} version ${target.version}`,
    before: previous ? { version: previous.version, wape: previous.wape } : null,
    after: { version: target.version, wape: target.wape },
    ip: ipOf(req)
  });

  res.json({ ok: true, active: { id: now.id, version: now.version, algorithm: now.algorithm } });
});

router.get('/runs', require_('ai.view'), (req, res) => {
  res.json({
    runs: listRuns(req.query.model || null, Number(req.query.limit) || 30)
      .map((r) => ({ ...r, candidates: parse(r.candidates, []) }))
  });
});

/* =========================================================
   FORECASTING
   ========================================================= */
router.get('/forecast/:sku', require_('ai.view'), (req, res) => {
  const horizons = String(req.query.horizons || '7,14,30,60,90')
    .split(',').map(Number).filter((n) => n > 0 && n <= 365);

  const forecast = predict(req.params.sku, horizons.length ? horizons : [7, 14, 30, 60, 90]);
  const series = demandSeries(req.params.sku);

  res.json({
    forecast,
    intelligence: skuIntelligence(req.params.sku),
    /* the last quarter, for the chart */
    history: series.points.slice(-90)
  });
});

router.post('/snapshot', require_('ai.manage'), (req, res) => {
  const out = snapshotPredictions({ horizon: Number(req.body?.horizon) || 30 });
  if (!out.ok) return res.status(409).json(out);
  audit({
    staff: req.staff, action: 'ml.snapshot', entity: 'ml_model', entityId: 'demand_forecast',
    summary: `Stored ${out.saved} predictions from version ${out.version} for later scoring`, ip: ipOf(req)
  });
  res.json(out);
});

/* =========================================================
   RECOMMENDATION BOARDS
   ========================================================= */
const leadOf = (req) => Number(req.query.leadTime) || DEFAULT_LEAD_TIME_DAYS;

router.get('/risk', require_('ai.view'), (req, res) => res.json(riskBoard({ leadTime: leadOf(req) })));
router.get('/reorder', require_('ai.view'), (req, res) => res.json(reorderPlan({ leadTime: leadOf(req) })));
router.get('/overstock', require_('ai.view'), (_req, res) => res.json(overstockBoard()));
router.get('/segments', require_('ai.view'), (_req, res) => res.json(rfmSegments()));

router.get('/anomalies', require_('ai.view'), (req, res) => {
  const rows = anomalies({
    window: Number(req.query.window) || 7,
    baseline: Number(req.query.baseline) || 56,
    threshold: Number(req.query.threshold) || 2.5
  });
  res.json({ rows, threshold: Number(req.query.threshold) || 2.5 });
});

/* =========================================================
   FEEDBACK LOOP
   Recommendations are proposals. This is where a human agrees,
   changes the number or throws it out — and that record is what
   the next model generation learns from.
   ========================================================= */
router.get('/feedback', require_('ai.view'), (req, res) => {
  const rows = listFeedback(Number(req.query.limit) || 50);
  const counts = rows.reduce((acc, r) => { acc[r.decision] = (acc[r.decision] || 0) + 1; return acc; }, {});
  const n = rows.length;
  res.json({
    rows,
    counts,
    /* An acceptance rate is only meaningful once there is enough
       of it to mean anything. */
    acceptanceRate: n >= 10 ? Math.round(((counts.approved || 0) / n) * 100) : null,
    note: n < 10 ? `${n} decision(s) recorded — too few to read an acceptance rate from.` : null
  });
});

router.post('/feedback', require_('ai.feedback'), (req, res) => {
  const { modelKey, subject, recommended, decision, adjustedTo, note } = req.body || {};

  if (!['approved', 'modified', 'rejected'].includes(decision)) {
    return res.status(400).json({ error: 'Decision must be approved, modified or rejected.' });
  }
  if (!modelKey || !subject) return res.status(400).json({ error: 'A model and a subject are required.' });
  if (decision === 'modified' && (adjustedTo == null || Number.isNaN(Number(adjustedTo)))) {
    return res.status(400).json({ error: 'Give the number you changed it to.' });
  }
  if (decision === 'rejected' && !String(note || '').trim()) {
    return res.status(400).json({ error: 'Say why it was rejected — that is the part the next model learns from.' });
  }

  const id = recordFeedback({
    modelKey,
    subject: String(subject),
    recommended: recommended == null ? null : Number(recommended),
    decision,
    adjustedTo: adjustedTo == null ? null : Number(adjustedTo),
    note: note ? String(note).slice(0, 500) : null,
    staffId: req.staff.id
  });

  audit({
    staff: req.staff, action: 'ml.feedback', entity: 'ml_model', entityId: modelKey,
    summary: `${decision} recommendation for ${subject}${decision === 'modified' ? ` (${recommended} → ${adjustedTo})` : ''}`,
    ip: ipOf(req)
  });

  res.status(201).json({ ok: true, id });
});

/* =========================================================
   TRAINING DATA
   Synthetic history is a development tool. It is labelled
   everywhere it appears and removable in one call.
   ========================================================= */
router.get('/data', require_('ai.view'), (_req, res) => {
  res.json({ ...syntheticStats(), readiness: dataReadiness() });
});

router.post('/data/synthetic', require_('ai.data'), (req, res) => {
  const days = Math.min(1095, Math.max(60, Number(req.body?.days) || 540));
  const seed = Number(req.body?.seed) || 20260824;

  const existing = syntheticStats();
  if (existing.present && !req.body?.replace) {
    return res.status(409).json({
      error: `${existing.synthetic.orders} synthetic orders already exist (${existing.synthetic.from} to ${existing.synthetic.to}). Remove them first, or pass replace.`,
      code: 'ALREADY_PRESENT'
    });
  }
  if (existing.present) purgeSynthetic();

  const out = generateSyntheticHistory({ days, seed });
  if (!out.ok) return res.status(400).json(out);

  audit({
    staff: req.staff, action: 'ml.data.generate', entity: 'training_data', entityId: 'synthetic',
    summary: `Generated ${out.orders} synthetic orders across ${days} days (seed ${seed})`, ip: ipOf(req)
  });

  res.status(201).json(out);
});

router.delete('/data/synthetic', require_('ai.data'), (req, res) => {
  const out = purgeSynthetic();
  audit({
    staff: req.staff, action: 'ml.data.purge', entity: 'training_data', entityId: 'synthetic',
    summary: `Removed ${out.orders} synthetic orders and ${out.ledger} ledger rows`, ip: ipOf(req)
  });
  res.json(out);
});

export default router;
