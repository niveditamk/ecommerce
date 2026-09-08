/* =============================================================
   ML OPERATIONS — DASHBOARD
   Opens with whether the models can be trusted at all, because
   that is the question that governs every other figure on the
   page. Readiness first, then what is serving, then what it is
   asking you to do about it.
   ============================================================= */
import { Link } from 'react-router-dom';
import { useAsync } from '../../../lib/useAsync';
import adminApi from '../../../lib/adminApi';
import { useAdmin } from '../../../context/AdminContext';
import { money, formatShortDate } from '../../../lib/format';
import { Head, Loading, Risk, Metrics, SyntheticBanner } from './shared';

export default function MlDashboard() {
  const { can } = useAdmin();
  const { data, loading, error, reload } = useAsync(() => adminApi.ml.overview(), []);

  if (loading) return <Loading />;
  if (error) return <div className="notice notice--error">{error}</div>;

  const { readiness, data: training, models, runs, activeForecast, risk, reorder, feedback } = data;
  const ready = readiness.ready > 0;

  return (
    <>
      <Head
        label="Overview"
        title="Where the models stand"
        note="Six models, one registry. Nothing here is trained until the data supports it."
      >
        <button type="button" className="btn btn--outline btn--sm" onClick={reload}>Refresh</button>
      </Head>

      <SyntheticBanner data={training} />

      {/* ---- readiness: the gate on everything else ---- */}
      <section className="ml-gate">
        <div className="ml-gate__figure">
          <span className="ml-gate__count">{readiness.ready}</span>
          <span className="ml-gate__of">of {readiness.skus} SKUs</span>
        </div>
        <div className="ml-gate__body">
          <h2 className="h4">
            {ready
              ? 'Have enough history to forecast'
              : 'Nothing has enough history to forecast yet'}
          </h2>
          <p className="tiny ml-gate__note">
            A SKU needs {readiness.minDays} days of clean sales before it is modelled. The longest
            history in the catalogue is {readiness.longestHistory} day{readiness.longestHistory === 1 ? '' : 's'};{' '}
            {readiness.censoredDays} day{readiness.censoredDays === 1 ? ' is' : 's are'} excluded because the
            piece was out of stock — a zero there means nobody could buy it, not that nobody wanted it.
          </p>
          {!ready && (
            <p className="tiny">
              <Link className="link" to="/admin/ml/data">Open training data</Link> to see what each SKU is short of.
            </p>
          )}
        </div>
      </section>

      {/* ---- what is serving ---- */}
      <section className="ml-panel">
        <div className="ml-panel__head">
          <h2 className="h4">Demand forecast</h2>
          {activeForecast
            ? <span className="tiny mono">version {activeForecast.version} · trained {formatShortDate(activeForecast.trainedAt)}</span>
            : <span className="tiny">not trained</span>}
        </div>

        {activeForecast ? (
          <div className="ml-panel__split">
            <div>
              <Metrics m={activeForecast.metrics} compact />
              <p className="tiny ml-panel__note">
                Fitted on {activeForecast.rows?.toLocaleString('en-IN')} SKU-days,
                {' '}{activeForecast.from} to {activeForecast.to}.
              </p>
            </div>
            <div>
              <span className="field__label">Algorithm per SKU</span>
              <ul className="ml-mix">
                {Object.entries(activeForecast.mix || {}).map(([k, v]) => (
                  <li key={k}><span className="mono">{v}</span> {k.replace(/_/g, ' ')}</li>
                ))}
              </ul>
              <p className="tiny ml-panel__note">
                Each SKU keeps whichever candidate scored best on its own held-out days.
                One catalogue rarely has one best algorithm.
              </p>
            </div>
          </div>
        ) : (
          <p className="tiny">
            No version is serving. {can('ai.manage')
              ? <>Train it from the <Link className="link" to="/admin/ml/models/demand_forecast">model registry</Link>.</>
              : 'Ask an administrator to train it.'}
          </p>
        )}
      </section>

      {/* ---- what it is telling you to do ---- */}
      <div className="ml-cards">
        <article className="ml-card">
          <h3 className="field__label">Stock-out risk</h3>
          {Object.keys(risk.counts).length ? (
            <>
              <ul className="ml-tally">
                {['OUT', 'HIGH', 'MEDIUM', 'UNKNOWN', 'LOW'].filter((k) => risk.counts[k]).map((k) => (
                  <li key={k}><Risk value={k} /><span className="mono">{risk.counts[k]}</span></li>
                ))}
              </ul>
              <p className="tiny ml-card__note">Against a {risk.leadTime}-day lead time.</p>
              <Link className="link tiny" to="/admin/ml/recommendations">Open the board →</Link>
            </>
          ) : <p className="tiny">Needs a trained forecast.</p>}
        </article>

        <article className="ml-card">
          <h3 className="field__label">Proposed reorders</h3>
          {reorder.count ? (
            <>
              <p className="ml-card__figure mono">{reorder.units}</p>
              <p className="tiny ml-card__note">
                units across {reorder.count} SKU{reorder.count === 1 ? '' : 's'} · {money(reorder.retailValue)} at retail.
                Cost price is not held in the catalogue yet, so this is the retail value, not the spend.
              </p>
              <Link className="link tiny" to="/admin/ml/recommendations">Review each one →</Link>
            </>
          ) : <p className="tiny">Nothing is at its reorder point.</p>}
        </article>

        <article className="ml-card">
          <h3 className="field__label">Decisions recorded</h3>
          {feedback.length ? (
            <ul className="ml-feed">
              {feedback.map((f) => (
                <li key={f.id}>
                  <span className={`ml-dec ml-dec--${f.decision}`}>{f.decision}</span>
                  <span className="mono tiny">{f.subject}</span>
                  {f.decision === 'modified' && <span className="tiny">{f.recommended} → {f.adjusted_to}</span>}
                </li>
              ))}
            </ul>
          ) : <p className="tiny">No recommendation has been accepted or rejected yet.</p>}
        </article>
      </div>

      {/* ---- the model catalogue ---- */}
      <section className="ml-panel">
        <div className="ml-panel__head">
          <h2 className="h4">Model registry</h2>
          <Link className="link tiny" to="/admin/ml/models">All models →</Link>
        </div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Model</th><th>Task</th><th>Status</th><th>Versions</th><th>Serving</th><th>Last run</th>
              </tr>
            </thead>
            <tbody>
              {models.map((m) => (
                <tr key={m.key}>
                  <td><Link className="link" to={`/admin/ml/models/${m.key}`}>{m.name}</Link></td>
                  <td className="tiny">{m.task}</td>
                  <td className="tiny">
                    {m.status === 'trained'
                      ? <span className="ml-ready">serving</span>
                      : m.trainable ? 'ready to train' : 'awaiting a trainer'}
                  </td>
                  <td className="mono tiny">{m.versions}</td>
                  <td className="mono tiny">{m.active_version ? `v${m.active_version} · ${m.active_algorithm}` : '—'}</td>
                  <td className="tiny">{m.last_run_at ? formatShortDate(m.last_run_at) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="tiny ml-panel__note">
          Models with no trainer are listed rather than hidden: the platform declares what it intends to
          build, and the console says plainly which of it exists today.
        </p>
      </section>

      {/* ---- recent runs ---- */}
      {runs.length > 0 && (
        <section className="ml-panel">
          <h2 className="h4">Recent training runs</h2>
          <ul className="ml-runs">
            {runs.map((r) => (
              <li key={r.id}>
                <span className={`ml-run ml-run--${r.status}`}>{r.status}</span>
                <span className="mono tiny">{r.model_key}</span>
                <span className="tiny">{r.message}</span>
                <span className="tiny ml-runs__when">{formatShortDate(r.started_at)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
