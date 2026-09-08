/* =============================================================
   ML OPERATIONS — MODEL REGISTRY
   Versions are never overwritten. Training adds one; activating
   promotes it; the previous version stays where it is so a bad
   release can be rolled back in one click.
   ============================================================= */
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAsync } from '../../../lib/useAsync';
import adminApi from '../../../lib/adminApi';
import { useAdmin } from '../../../context/AdminContext';
import { formatShortDate } from '../../../lib/format';
import { Head, Loading, Metrics } from './shared';

/* ---------- list ---------- */
export function MlModels() {
  const { data, loading, error } = useAsync(() => adminApi.ml.models(), []);
  if (loading) return <Loading />;
  if (error) return <div className="notice notice--error">{error}</div>;

  return (
    <>
      <Head
        label="Registry"
        title="Models"
        note="Six models are declared. Two states matter: what is serving, and what is still waiting for a trainer or for data."
      />
      <div className="ml-models">
        {data.models.map((m) => (
          <article className="ml-model" key={m.key}>
            <div className="ml-model__head">
              <h2 className="h4"><Link className="link" to={`/admin/ml/models/${m.key}`}>{m.name}</Link></h2>
              <span className="mono tiny">{m.key}</span>
            </div>
            <p className="tiny ml-model__target">{m.target}</p>
            <dl className="ml-model__facts">
              <div><dt>Task</dt><dd>{m.task}</dd></div>
              <div><dt>Runtime</dt><dd>{m.runtime}</dd></div>
              <div><dt>Versions</dt><dd className="mono">{m.versions}</dd></div>
              <div>
                <dt>Serving</dt>
                <dd className="mono">{m.active_version ? `v${m.active_version}` : '—'}</dd>
              </div>
            </dl>
            <p className="tiny ml-model__state">
              {m.active_version_id
                ? `Version ${m.active_version} is serving, fitted with ${m.active_algorithm?.replace(/_/g, ' ')}.`
                : m.trainable
                  ? 'Trainable now. No version has been registered yet.'
                  : 'Declared but not yet built. It appears here so the roadmap is visible rather than implied.'}
            </p>
          </article>
        ))}
      </div>
    </>
  );
}

/* ---------- detail ---------- */
export function MlModelDetail() {
  const { key } = useParams();
  const { can } = useAdmin();
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(null);

  const { data, loading, error, reload } = useAsync(() => adminApi.ml.model(key), [key]);

  const say = (msg, tone = 'ok') => { setFlash({ msg, tone }); setTimeout(() => setFlash(null), 6000); };

  const train = async () => {
    setBusy(true);
    try {
      const out = await adminApi.ml.train(key);
      say(`Version ${out.version} is now serving — trained on ${out.trained} SKUs, `
        + `${out.metrics.cumulativeError}% error on the window total.`);
      reload();
    } catch (err) {
      say(err.payload?.reason || err.message, 'warn');
    } finally {
      setBusy(false);
    }
  };

  const activate = async (versionId, version) => {
    setBusy(true);
    try {
      await adminApi.ml.activate(key, versionId);
      say(`Version ${version} is now serving.`);
      reload();
    } catch (err) {
      say(err.message, 'warn');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loading />;
  if (error) return <div className="notice notice--error">{error}</div>;

  const { model, versions, runs, algorithms } = data;
  const active = versions.find((v) => v.is_active);

  return (
    <>
      <Head label="Registry" title={model.name} note={model.target}>
        {can('ai.manage') && model.trainable && (
          <button type="button" className="btn btn--gold btn--sm" onClick={train} disabled={busy}>
            {busy ? 'Training…' : 'Train a new version'}
          </button>
        )}
      </Head>

      {flash && (
        <div className={`notice ${flash.tone === 'warn' ? 'notice--warning' : ''}`}>{flash.msg}</div>
      )}

      {!model.trainable && (
        <div className="notice">
          {model.name} is registered so the platform's intent is visible, but it has no trainer yet.
          Training it would mean inventing a result.
        </div>
      )}

      {active && (
        <section className="ml-panel">
          <div className="ml-panel__head">
            <h2 className="h4">Serving now — version {active.version}</h2>
            <span className="mono tiny">{active.algorithm}</span>
          </div>
          <div className="ml-panel__split">
            <Metrics m={{
              mae: active.mae, rmse: active.rmse, wape: active.wape, smape: active.smape,
              cumulativeError: active.cumulative_error
            }} />
            <div>
              <dl className="ml-model__facts ml-model__facts--stack">
                <div><dt>Trained</dt><dd>{formatShortDate(active.created_at)}</dd></div>
                <div><dt>By</dt><dd>{active.trained_by_name || 'system'}</dd></div>
                <div><dt>Rows</dt><dd className="mono">{active.train_rows?.toLocaleString('en-IN')}</dd></div>
                <div><dt>Window</dt><dd className="mono tiny">{active.train_from} → {active.train_to}</dd></div>
                <div><dt>SKUs</dt><dd className="mono">{active.skus}</dd></div>
              </dl>
              {active.notes && <p className="tiny ml-panel__note">{active.notes}</p>}
            </div>
          </div>
        </section>
      )}

      <section className="ml-panel">
        <h2 className="h4">Version history</h2>
        {versions.length ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Version</th><th>Algorithm</th><th>Rows</th><th>SKUs</th>
                  <th>Window error</th><th>WAPE</th><th>MAE</th><th>Trained</th><th />
                </tr>
              </thead>
              <tbody>
                {versions.map((v) => (
                  <tr key={v.id} className={v.is_active ? 'is-active' : undefined}>
                    {/* is_active arrives as SQLite's 0/1, and `0 && …`
                        renders a literal 0 — hence the explicit cast. */}
                    <td className="mono">
                      v{v.version}
                      {v.is_active ? <span className="ml-serving">serving</span> : null}
                    </td>
                    <td className="tiny">{v.algorithm?.replace(/_/g, ' ')}</td>
                    <td className="mono tiny">{v.train_rows?.toLocaleString('en-IN')}</td>
                    <td className="mono tiny">{v.skus}</td>
                    <td className="mono tiny">{v.cumulative_error != null ? `${v.cumulative_error}%` : '—'}</td>
                    <td className="mono tiny">{v.wape != null ? `${v.wape}%` : '—'}</td>
                    <td className="mono tiny">{v.mae ?? '—'}</td>
                    <td className="tiny">{formatShortDate(v.created_at)}</td>
                    <td>
                      {can('ai.manage') && !v.is_active && (
                        <button type="button" className="btn btn--outline btn--sm" disabled={busy}
                          onClick={() => activate(v.id, v.version)}>
                          Roll back to this
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="tiny">No version has been registered. Training produces the first one.</p>
        )}
        <p className="tiny ml-panel__note">
          Versions are never overwritten. Each training run adds one and promotes it only after its
          metrics are recorded, so any earlier version can be put back.
        </p>
      </section>

      <section className="ml-panel">
        <h2 className="h4">Training runs</h2>
        {runs.length ? (
          <ul className="ml-runs">
            {runs.map((r) => (
              <li key={r.id}>
                <span className={`ml-run ml-run--${r.status}`}>{r.status}</span>
                <span className="tiny">{r.message}</span>
                <span className="tiny ml-runs__when">
                  {formatShortDate(r.started_at)}{r.duration_ms != null && ` · ${r.duration_ms}ms`}
                </span>
              </li>
            ))}
          </ul>
        ) : <p className="tiny">Nothing has been run yet.</p>}
      </section>

      {algorithms?.length > 0 && model.trainable && (
        <section className="ml-panel">
          <h2 className="h4">Candidates</h2>
          <p className="tiny ml-panel__note">
            Every one of these is fitted and scored on held-out days for every SKU, at each of its
            settings. The winner is whichever measures best — per SKU, not per catalogue. Searching
            the settings rather than assuming them matters: a seven-day mean forecasts nothing at all
            for a piece that sells twice a fortnight.
          </p>
          <ul className="ml-algos">
            {algorithms.map((a) => (
              <li key={a.key}>
                <span>{a.label}</span>
                <span className="tiny mono">
                  {a.settings > 1 ? `${a.settings} ${a.searched} settings · ` : ''}needs {a.minDays} days
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
