/* =============================================================
   MODEL REGISTRY
   Models are never overwritten in place. Training produces a new
   version; a version is promoted to active only after its metrics
   are recorded, and any earlier version can be rolled back to.

   This registry is deliberately runtime-agnostic. The baseline
   forecasters that ship today are JavaScript, but a Python/Flask
   trainer can register a version through the same tables without
   the console or the API changing.
   ============================================================= */
import { db } from '../db/index.js';

export function migrateMl() {
  const done = [];
  const has = (n) => !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(n);

  if (!has('ml_models')) {
    db.exec(`
      CREATE TABLE ml_models (
        key         TEXT PRIMARY KEY,        -- demand_forecast, stockout_risk, ...
        name        TEXT NOT NULL,
        task        TEXT NOT NULL,           -- forecast | classification | detection
        target      TEXT,                    -- what it predicts, in words
        runtime     TEXT NOT NULL DEFAULT 'node',   -- node | python
        status      TEXT NOT NULL DEFAULT 'untrained',
        created_at  TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
    done.push('ml_models');
  }

  if (!has('ml_versions')) {
    db.exec(`
      CREATE TABLE ml_versions (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        model_key      TEXT NOT NULL REFERENCES ml_models(key),
        version        INTEGER NOT NULL,
        algorithm      TEXT NOT NULL,        -- naive | moving_average | holt | ...
        hyperparams    TEXT,                 -- JSON
        features       TEXT,                 -- JSON
        artifact       TEXT,                 -- JSON: the fitted parameters
        train_rows     INTEGER,
        train_from     TEXT,
        train_to       TEXT,
        mae REAL, rmse REAL, mape REAL, smape REAL, wape REAL,
        is_active      INTEGER NOT NULL DEFAULT 0,
        notes          TEXT,
        trained_by     INTEGER REFERENCES staff(id),
        created_at     TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(model_key, version)
      );
      CREATE INDEX idx_ver_model ON ml_versions(model_key, version DESC);
      CREATE INDEX idx_ver_active ON ml_versions(model_key, is_active);
    `);
    done.push('ml_versions');
  }

  if (!has('ml_runs')) {
    db.exec(`
      CREATE TABLE ml_runs (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        model_key    TEXT NOT NULL,
        status       TEXT NOT NULL DEFAULT 'running',  -- running | succeeded | failed | skipped
        trigger      TEXT NOT NULL DEFAULT 'manual',   -- manual | scheduled
        candidates   TEXT,                             -- JSON: every algorithm scored
        winner       TEXT,
        version_id   INTEGER REFERENCES ml_versions(id),
        rows_used    INTEGER,
        skus         INTEGER,
        message      TEXT,
        duration_ms  INTEGER,
        started_by   INTEGER REFERENCES staff(id),
        started_at   TEXT NOT NULL DEFAULT (datetime('now')),
        finished_at  TEXT
      );
      CREATE INDEX idx_run_model ON ml_runs(model_key, id DESC);
    `);
    done.push('ml_runs');
  }

  if (!has('ml_predictions')) {
    db.exec(`
      CREATE TABLE ml_predictions (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        model_key   TEXT NOT NULL,
        version_id  INTEGER REFERENCES ml_versions(id),
        subject     TEXT NOT NULL,          -- usually a SKU
        horizon     INTEGER NOT NULL,       -- days ahead
        value       REAL NOT NULL,
        lower       REAL,
        upper       REAL,
        confidence  TEXT,                   -- HIGH | MEDIUM | LOW | INSUFFICIENT
        explanation TEXT,                   -- JSON array of reasons
        actual      REAL,                   -- filled in later for scoring
        created_at  TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX idx_pred_subject ON ml_predictions(model_key, subject, created_at DESC);
    `);
    done.push('ml_predictions');
  }

  /* The feedback loop: what the model said, what the human did,
     and eventually what actually happened. */
  if (!has('ml_feedback')) {
    db.exec(`
      CREATE TABLE ml_feedback (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        model_key      TEXT NOT NULL,
        subject        TEXT NOT NULL,
        recommended    REAL,
        decision       TEXT NOT NULL,       -- approved | modified | rejected
        adjusted_to    REAL,
        actual_outcome REAL,
        note           TEXT,
        staff_id       INTEGER REFERENCES staff(id),
        created_at     TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX idx_fb_model ON ml_feedback(model_key, created_at DESC);
    `);
    done.push('ml_feedback');
  }

  /* The error that actually governs a purchase decision — the
     total over the window — was added after the first schema.
     MAE and WAPE alone made a usable model look broken. */
  const versionCols = db.prepare('PRAGMA table_info(ml_versions)').all().map((c) => c.name);
  if (!versionCols.includes('cumulative_error')) {
    db.exec('ALTER TABLE ml_versions ADD COLUMN cumulative_error REAL');
    done.push('ml_versions.cumulative_error');
  }
  if (!versionCols.includes('cumulative_bias')) {
    db.exec('ALTER TABLE ml_versions ADD COLUMN cumulative_bias REAL');
    done.push('ml_versions.cumulative_bias');
  }

  seedModels();
  if (done.length) console.log(`[ml] migrated: ${done.join(', ')}`);
}

/* The catalogue of models the platform intends to have. Registering
   them up front means the console can show what exists, what is
   trained, and what is still waiting for data — rather than hiding
   the roadmap. */
const CATALOGUE = [
  ['demand_forecast', 'Demand Forecast', 'forecast', 'Units sold per SKU per day', 'node'],
  ['stockout_risk', 'Stock-out Risk', 'classification', 'Probability a SKU runs out within the horizon', 'node'],
  ['reorder_engine', 'Reorder Recommendation', 'optimisation', 'Units to purchase, with reasoning', 'node'],
  ['overstock_risk', 'Overstock Detection', 'detection', 'SKUs carrying more cover than demand justifies', 'node'],
  ['anomaly_sales', 'Sales Anomaly Detection', 'detection', 'Unusual spikes and drops in demand', 'node'],
  ['customer_rfm', 'Customer Segmentation', 'clustering', 'RFM segment per customer', 'node']
];

function seedModels() {
  const ins = db.prepare(
    'INSERT OR IGNORE INTO ml_models (key, name, task, target, runtime) VALUES (?,?,?,?,?)'
  );
  CATALOGUE.forEach((m) => ins.run(...m));
}

/* ---------- reads ---------- */
export function listModels() {
  return db.prepare(`
    SELECT m.*,
           (SELECT COUNT(*) FROM ml_versions v WHERE v.model_key = m.key) AS versions,
           (SELECT v.id   FROM ml_versions v WHERE v.model_key = m.key AND v.is_active = 1) AS active_version_id,
           (SELECT v.version FROM ml_versions v WHERE v.model_key = m.key AND v.is_active = 1) AS active_version,
           (SELECT v.algorithm FROM ml_versions v WHERE v.model_key = m.key AND v.is_active = 1) AS active_algorithm,
           (SELECT v.mae  FROM ml_versions v WHERE v.model_key = m.key AND v.is_active = 1) AS active_mae,
           (SELECT v.mape FROM ml_versions v WHERE v.model_key = m.key AND v.is_active = 1) AS active_mape,
           (SELECT MAX(r.started_at) FROM ml_runs r WHERE r.model_key = m.key) AS last_run_at
      FROM ml_models m ORDER BY m.key
  `).all();
}

export const getModel = (key) => db.prepare('SELECT * FROM ml_models WHERE key = ?').get(key);

export const listVersions = (key) =>
  db.prepare(`
    SELECT v.*, s.first_name || ' ' || s.last_name AS trained_by_name
      FROM ml_versions v LEFT JOIN staff s ON s.id = v.trained_by
     WHERE v.model_key = ? ORDER BY v.version DESC
  `).all(key);

export const activeVersion = (key) =>
  db.prepare('SELECT * FROM ml_versions WHERE model_key = ? AND is_active = 1').get(key);

export const listRuns = (key, limit = 20) =>
  key
    ? db.prepare(`SELECT r.*, s.first_name || ' ' || s.last_name AS by_name
                    FROM ml_runs r LEFT JOIN staff s ON s.id = r.started_by
                   WHERE r.model_key = ? ORDER BY r.id DESC LIMIT ?`).all(key, limit)
    : db.prepare(`SELECT r.*, s.first_name || ' ' || s.last_name AS by_name
                    FROM ml_runs r LEFT JOIN staff s ON s.id = r.started_by
                   ORDER BY r.id DESC LIMIT ?`).all(limit);

/* ---------- writes ---------- */
export function startRun(modelKey, { trigger = 'manual', staffId = null } = {}) {
  const r = db.prepare(
    "INSERT INTO ml_runs (model_key, status, trigger, started_by) VALUES (?, 'running', ?, ?)"
  ).run(modelKey, trigger, staffId);
  return Number(r.lastInsertRowid);
}

export function failRun(runId, message, durationMs) {
  db.prepare(
    "UPDATE ml_runs SET status='failed', message=?, duration_ms=?, finished_at=datetime('now') WHERE id=?"
  ).run(message, durationMs ?? null, runId);
}

export function skipRun(runId, message, durationMs) {
  db.prepare(
    "UPDATE ml_runs SET status='skipped', message=?, duration_ms=?, finished_at=datetime('now') WHERE id=?"
  ).run(message, durationMs ?? null, runId);
}

/** Record a trained version. Never overwrites — always a new number. */
export function registerVersion(modelKey, {
  algorithm, hyperparams, features, artifact, trainRows, trainFrom, trainTo,
  metrics = {}, notes, staffId = null, activate = true
}) {
  const next = (db.prepare('SELECT MAX(version) AS v FROM ml_versions WHERE model_key = ?').get(modelKey)?.v || 0) + 1;

  const row = db.prepare(`
    INSERT INTO ml_versions
      (model_key, version, algorithm, hyperparams, features, artifact,
       train_rows, train_from, train_to, mae, rmse, mape, smape, wape,
       cumulative_error, cumulative_bias, notes, trained_by, is_active)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0)
  `).run(
    modelKey, next, algorithm,
    JSON.stringify(hyperparams || {}), JSON.stringify(features || []), JSON.stringify(artifact || {}),
    trainRows ?? null, trainFrom ?? null, trainTo ?? null,
    metrics.mae ?? null, metrics.rmse ?? null, metrics.mape ?? null,
    metrics.smape ?? null, metrics.wape ?? null,
    metrics.cumulativeError ?? null, metrics.cumulativeBias ?? null,
    notes ?? null, staffId
  );

  const versionId = Number(row.lastInsertRowid);
  if (activate) activateVersion(modelKey, versionId);
  return { versionId, version: next };
}

export function activateVersion(modelKey, versionId) {
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('UPDATE ml_versions SET is_active = 0 WHERE model_key = ?').run(modelKey);
    db.prepare('UPDATE ml_versions SET is_active = 1 WHERE id = ? AND model_key = ?').run(versionId, modelKey);
    db.prepare("UPDATE ml_models SET status = 'trained' WHERE key = ?").run(modelKey);
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  return activeVersion(modelKey);
}

export function finishRun(runId, { candidates, winner, versionId, rowsUsed, skus, message, durationMs }) {
  db.prepare(`
    UPDATE ml_runs
       SET status='succeeded', candidates=?, winner=?, version_id=?, rows_used=?, skus=?,
           message=?, duration_ms=?, finished_at=datetime('now')
     WHERE id=?
  `).run(JSON.stringify(candidates || []), winner ?? null, versionId ?? null,
    rowsUsed ?? null, skus ?? null, message ?? null, durationMs ?? null, runId);
}

export function savePredictions(modelKey, versionId, rows) {
  const ins = db.prepare(`
    INSERT INTO ml_predictions (model_key, version_id, subject, horizon, value, lower, upper, confidence, explanation)
    VALUES (?,?,?,?,?,?,?,?,?)
  `);
  db.exec('BEGIN IMMEDIATE');
  try {
    rows.forEach((r) => ins.run(
      modelKey, versionId, r.subject, r.horizon, r.value,
      r.lower ?? null, r.upper ?? null, r.confidence ?? null,
      JSON.stringify(r.explanation || [])
    ));
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  return rows.length;
}

export function recordFeedback({ modelKey, subject, recommended, decision, adjustedTo, note, staffId }) {
  const r = db.prepare(`
    INSERT INTO ml_feedback (model_key, subject, recommended, decision, adjusted_to, note, staff_id)
    VALUES (?,?,?,?,?,?,?)
  `).run(modelKey, subject, recommended ?? null, decision, adjustedTo ?? null, note ?? null, staffId ?? null);
  return Number(r.lastInsertRowid);
}

export const listFeedback = (limit = 50) =>
  db.prepare(`
    SELECT f.*, s.first_name || ' ' || s.last_name AS staff_name
      FROM ml_feedback f LEFT JOIN staff s ON s.id = f.staff_id
     ORDER BY f.id DESC LIMIT ?
  `).all(limit);
