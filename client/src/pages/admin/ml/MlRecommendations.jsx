/* =============================================================
   ML OPERATIONS — RECOMMENDATIONS
   Risk, reorders, overstock and anomalies. Each row is a
   proposal with its reasoning attached and a decision to take.
   Nothing on this page changes stock or raises an order on its
   own — the decision is recorded, and a human acts on it.
   ============================================================= */
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAsync } from '../../../lib/useAsync';
import adminApi from '../../../lib/adminApi';
import { useAdmin } from '../../../context/AdminContext';
import { money, dx } from '../../../lib/format';
import { Head, Loading, Risk, Evidence, Confidence, Decision, Empty } from './shared';

const TABS = [
  { key: 'reorder', label: 'Reorder' },
  { key: 'risk', label: 'Stock-out risk' },
  { key: 'overstock', label: 'Overstock' },
  { key: 'anomalies', label: 'Anomalies' },
  { key: 'segments', label: 'Customers' },
  { key: 'decisions', label: 'Decisions' }
];

export default function MlRecommendations() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.key === params.get('view')) ? params.get('view') : 'reorder';

  const setTab = (key) => {
    const next = new URLSearchParams(params);
    next.set('view', key);
    setParams(next);
  };

  return (
    <>
      <Head
        label="Intelligence"
        title="Recommendations"
        note="Proposals, not instructions. Every one carries its reasoning, and your decision is recorded against the model that made it."
      />

      <nav className="ml-tabs" aria-label="Recommendation boards">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`ml-tabs__btn${t.key === tab ? ' is-on' : ''}`}
            aria-current={t.key === tab ? 'page' : undefined}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'reorder' && <Reorder />}
      {tab === 'risk' && <RiskBoard />}
      {tab === 'overstock' && <Overstock />}
      {tab === 'anomalies' && <Anomalies />}
      {tab === 'segments' && <Segments />}
      {tab === 'decisions' && <Decisions />}
    </>
  );
}

/* ---------- reorder ---------- */
function Reorder() {
  const { can } = useAdmin();
  const [leadTime, setLeadTime] = useState(14);
  const { data, loading, error } = useAsync(() => adminApi.ml.reorder({ leadTime }), [leadTime]);

  if (loading) return <Loading />;
  if (error) return <div className="notice notice--error">{error}</div>;
  if (!data.rows.length) return <Empty>Nothing is at its reorder point. Either cover is healthy, or nothing has enough history to judge — check the stock-out board.</Empty>;

  return (
    <>
      <div className="ml-boardhead">
        <p className="tiny">
          <strong>{data.rows.length}</strong> SKU{data.rows.length === 1 ? '' : 's'} ·{' '}
          <strong>{data.units}</strong> units · {money(data.retailValue)} at retail.
          Cost price is not held in the catalogue, so this is retail value, not spend.
        </p>
        <label className="field ml-lead">
          <span className="field__label">Lead time</span>
          <select className="input" value={leadTime} onChange={(e) => setLeadTime(Number(e.target.value))}>
            {[7, 14, 21, 30, 45, 60].map((d) => <option key={d} value={d}>{d} days</option>)}
          </select>
          <span className="field__hint">Suppliers are not modelled yet, so this is an assumption you set.</span>
        </label>
      </div>

      <div className="ml-proposals">
        {data.rows.map((r) => (
          <article className="ml-proposal" key={r.sku}>
            <header className="ml-proposal__head">
              <div>
                <h3 className="h4">{dx(r.name)}</h3>
                <span className="mono tiny">{r.sku}</span>
              </div>
              <div className="ml-proposal__qty">
                <span className="field__label">Order</span>
                <p className="mono">{r.reorder.qty}</p>
              </div>
            </header>

            <div className="ml-proposal__facts">
              <span><Risk value={r.risk} /></span>
              <span className="tiny">{r.available} available</span>
              <span className="tiny">{r.coverDays}d cover</span>
              <span className="tiny">reorder point {r.reorderPoint}</span>
              <Confidence value={r.confidence} />
            </div>

            <Evidence lines={r.reorder.reasoning} />

            <Decision
              modelKey="reorder_engine"
              subject={r.sku}
              recommended={r.reorder.qty}
              disabled={!can('ai.feedback')}
              onDone={(body) => adminApi.ml.decide(body)}
            />
          </article>
        ))}
      </div>
    </>
  );
}

/* ---------- risk ---------- */
function RiskBoard() {
  const [leadTime, setLeadTime] = useState(14);
  const { data, loading, error } = useAsync(() => adminApi.ml.risk({ leadTime }), [leadTime]);

  if (loading) return <Loading />;
  if (error) return <div className="notice notice--error">{error}</div>;

  return (
    <>
      <div className="ml-boardhead">
        <ul className="ml-tally ml-tally--wide">
          {['OUT', 'HIGH', 'MEDIUM', 'UNKNOWN', 'LOW'].filter((k) => data.counts[k]).map((k) => (
            <li key={k}><Risk value={k} /><span className="mono">{data.counts[k]}</span></li>
          ))}
        </ul>
        <label className="field ml-lead">
          <span className="field__label">Lead time</span>
          <select className="input" value={leadTime} onChange={(e) => setLeadTime(Number(e.target.value))}>
            {[7, 14, 21, 30, 45, 60].map((d) => <option key={d} value={d}>{d} days</option>)}
          </select>
        </label>
      </div>

      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Risk</th><th>Product</th><th>Available</th><th>Cover</th><th>Per day</th><th>Confidence</th><th>Reading</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.sku}>
                <td><Risk value={r.risk} /></td>
                <td>
                  <Link className="link" to={`/admin/ml/forecast?sku=${r.sku}`}>{dx(r.name)}</Link>
                  <span className="mono tiny ml-sku">{r.sku}</span>
                </td>
                <td className="mono">{r.available}</td>
                <td className="mono tiny">{r.coverDays != null ? `${r.coverDays}d` : '—'}</td>
                <td className="mono tiny">{r.dailyRate ?? '—'}</td>
                <td><Confidence value={r.confidence} /></td>
                <td className="tiny ml-reason">{r.riskReason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ---------- overstock ---------- */
function Overstock() {
  const { can } = useAdmin();
  const { data, loading, error } = useAsync(() => adminApi.ml.overstock(), []);

  if (loading) return <Loading />;
  if (error) return <div className="notice notice--error">{error}</div>;
  if (!data.rows.length) return <Empty>Nothing is carrying more than six months of cover.</Empty>;

  return (
    <>
      <p className="tiny ml-boardhead">
        {money(data.tiedUpRetail)} of retail value sitting beyond a six-month horizon.
      </p>
      <div className="ml-proposals">
        {data.rows.map((r) => (
          <article className="ml-proposal" key={r.sku}>
            <header className="ml-proposal__head">
              <div>
                <h3 className="h4">{dx(r.name)}</h3>
                <span className="mono tiny">{r.sku}</span>
              </div>
              <div className="ml-proposal__qty">
                <span className="field__label">Excess</span>
                <p className="mono">{r.overstock.excess}</p>
              </div>
            </header>
            <div className="ml-proposal__facts">
              <span className="tiny">{r.onHand} on hand</span>
              <span className="tiny">{Math.round(r.overstock.coverDays)}d cover</span>
              <span className="tiny">{money(r.overstock.tiedUpRetail)} tied up</span>
              <Confidence value={r.confidence} />
            </div>
            <Evidence lines={r.overstock.reasoning} />
            <Decision
              modelKey="overstock_risk"
              subject={r.sku}
              recommended={r.overstock.excess}
              disabled={!can('ai.feedback')}
              onDone={(body) => adminApi.ml.decide(body)}
            />
          </article>
        ))}
      </div>
    </>
  );
}

/* ---------- anomalies ---------- */
function Anomalies() {
  const [threshold, setThreshold] = useState(2.5);
  const { data, loading, error } = useAsync(() => adminApi.ml.anomalies({ threshold }), [threshold]);

  if (loading) return <Loading />;
  if (error) return <div className="notice notice--error">{error}</div>;

  return (
    <>
      <div className="ml-boardhead">
        <p className="tiny">
          A z-score against each SKU's own 56-day baseline — no model involved, and none claimed.
          Out-of-stock days are excluded so an empty shelf is not read as a collapse in demand.
        </p>
        <label className="field ml-lead">
          <span className="field__label">Sensitivity</span>
          <select className="input" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))}>
            <option value={3}>3σ — only the stark ones</option>
            <option value={2.5}>2.5σ — default</option>
            <option value={2}>2σ</option>
            <option value={1.5}>1.5σ — noisy</option>
          </select>
        </label>
      </div>

      {data.rows.length ? (
        <div className="ml-proposals">
          {data.rows.map((r) => (
            <article className="ml-proposal" key={r.sku}>
              <header className="ml-proposal__head">
                <div>
                  <h3 className="h4">{dx(r.name)}</h3>
                  <span className="mono tiny">{r.sku}</span>
                </div>
                <div className="ml-proposal__qty">
                  <span className="field__label">{r.direction}</span>
                  <p className="mono">{r.changePct > 0 ? '+' : ''}{r.changePct}%</p>
                </div>
              </header>
              <Evidence lines={r.reasoning} />
            </article>
          ))}
        </div>
      ) : (
        <Empty>Nothing crosses {threshold}σ. The recent weeks look like the weeks before them.</Empty>
      )}
    </>
  );
}

/* ---------- customers ---------- */
function Segments() {
  const { data, loading, error } = useAsync(() => adminApi.ml.segments(), []);

  if (loading) return <Loading />;
  if (error) return <div className="notice notice--error">{error}</div>;

  return (
    <>
      {data.note && <div className="notice notice--warning">{data.note}</div>}
      {data.rows.length ? (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr><th>Customer</th><th>Segment</th><th>Orders</th><th>Lifetime</th><th>Last order</th></tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.id}>
                  <td>{dx(r.name)}<span className="mono tiny ml-sku">{r.email}</span></td>
                  <td><span className={`ml-seg ml-seg--${r.segment.toLowerCase()}`}>{r.segment}</span></td>
                  <td className="mono">{r.frequency}</td>
                  <td className="mono tiny">{money(r.monetary)}</td>
                  <td className="tiny">{r.recency_days} days ago</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <Empty>No customer has placed a real order yet.</Empty>}
    </>
  );
}

/* ---------- the record ---------- */
function Decisions() {
  const { data, loading, error } = useAsync(() => adminApi.ml.feedback({ limit: 100 }), []);

  if (loading) return <Loading />;
  if (error) return <div className="notice notice--error">{error}</div>;
  if (!data.rows.length) return <Empty>No recommendation has been accepted, changed or rejected yet.</Empty>;

  return (
    <>
      <div className="ml-boardhead">
        <p className="tiny">
          {data.acceptanceRate != null
            ? <>Recommendations accepted as given: <strong>{data.acceptanceRate}%</strong>. A rate far below half usually means the model is wrong about something structural, not that the buyers are being cautious.</>
            : data.note}
        </p>
      </div>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr><th>Decision</th><th>Model</th><th>Subject</th><th>Recommended</th><th>Changed to</th><th>Note</th><th>By</th></tr>
          </thead>
          <tbody>
            {data.rows.map((f) => (
              <tr key={f.id}>
                <td><span className={`ml-dec ml-dec--${f.decision}`}>{f.decision}</span></td>
                <td className="tiny">{f.model_key?.replace(/_/g, ' ')}</td>
                <td className="mono tiny">{f.subject}</td>
                <td className="mono tiny">{f.recommended ?? '—'}</td>
                <td className="mono tiny">{f.adjusted_to ?? '—'}</td>
                <td className="tiny ml-reason">{f.note || '—'}</td>
                <td className="tiny">{f.staff_name || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
