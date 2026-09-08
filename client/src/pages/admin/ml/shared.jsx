/* =============================================================
   ML CONSOLE — SHARED PARTS
   One idea runs through this console: no figure appears without
   its evidence next to it. A forecast carries how many days it
   was fitted on and how far it was out last time; a zero carries
   whether the shelf was empty. That is the whole design.
   ============================================================= */
import { useState } from 'react';

/* ---------- confidence ----------
   Four states, and INSUFFICIENT is a first-class one. A model
   with nothing to go on says so instead of printing a number. */
const CONFIDENCE = {
  HIGH: { label: 'High confidence', note: 'Long history, small error on held-out days.' },
  MEDIUM: { label: 'Medium confidence', note: 'Usable, but check it against what you know.' },
  LOW: { label: 'Low confidence', note: 'Directional only. Do not buy off this alone.' },
  INSUFFICIENT: { label: 'Insufficient data', note: 'No forecast. Not the same as a forecast of zero.' },
  UNKNOWN: { label: 'Unknown', note: 'Cannot be stated from what is recorded.' }
};

export function Confidence({ value, showNote = false }) {
  const c = CONFIDENCE[value] || CONFIDENCE.UNKNOWN;
  return (
    <span className={`ml-conf ml-conf--${String(value || 'unknown').toLowerCase()}`}>
      <span className="ml-conf__dot" aria-hidden="true" />
      <span className="ml-conf__label">{c.label}</span>
      {showNote && <span className="ml-conf__note">{c.note}</span>}
    </span>
  );
}

/* ---------- reasoning ----------
   Section 45 of the brief: decision support, not autonomous
   control. A recommendation without its reasoning is an order. */
export function Evidence({ lines, title = 'Why' }) {
  if (!lines?.length) return null;
  return (
    <div className="ml-evidence">
      <span className="field__label">{title}</span>
      <ul>{lines.map((l, i) => <li key={i}>{l}</li>)}</ul>
    </div>
  );
}

/* ---------- risk ---------- */
export const RISK_ORDER = ['OUT', 'HIGH', 'MEDIUM', 'UNKNOWN', 'LOW'];

export function Risk({ value }) {
  return <span className={`ml-risk ml-risk--${String(value || 'unknown').toLowerCase()}`}>{value}</span>;
}

/* ---------- daily demand, with the censored days shown ----------
   The censored marks are the point of this chart. A gap in sales
   because the shelf was empty looks identical to a gap because
   nobody wanted it — unless you draw the difference. */
export function Series({ points, height = 56 }) {
  if (!points?.length) return <p className="tiny">No sales history recorded.</p>;

  const w = 100;
  const max = Math.max(1, ...points.map((p) => p.units));
  const step = w / Math.max(1, points.length - 1);
  const y = (u) => height - 8 - (u / max) * (height - 16);

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(2)},${y(p.units).toFixed(2)}`).join(' ');
  const censored = points.map((p, i) => (p.censored ? i : -1)).filter((i) => i >= 0);

  return (
    <figure className="ml-series">
      {/* preserveAspectRatio="none" stretches the viewBox to the
          container, so the height must be pinned explicitly or the
          chart grows to the full width's aspect ratio. */}
      <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" role="img"
        style={{ height: `${height}px` }}
        aria-label={`Daily units over ${points.length} days, peak ${max}`}>
        <line x1="0" y1={height - 8} x2={w} y2={height - 8} className="ml-series__axis" />
        <path d={path} className="ml-series__line" vectorEffect="non-scaling-stroke" />
        {censored.map((i) => (
          <line key={i} x1={(i * step).toFixed(2)} y1={height - 8} x2={(i * step).toFixed(2)} y2={height - 2}
            className="ml-series__censored" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <figcaption className="tiny">
        {points.length} days · peak {max}/day
        {censored.length > 0 && <> · <span className="ml-series__key" /> {censored.length} out-of-stock day(s), excluded</>}
      </figcaption>
    </figure>
  );
}

/* ---------- metrics ----------
   Both error figures, always, with the difference spelled out.
   Showing only day-level WAPE would make a usable model look
   broken; showing only the window error would flatter it. */
export function Metrics({ m, compact = false }) {
  if (!m) return <p className="tiny">Not scored.</p>;
  const rows = [
    ['Error on the window total', m.cumulativeError != null ? `${m.cumulativeError}%` : '—', 'What a purchase order depends on.'],
    ['Day-level error (WAPE)', m.wape != null ? `${m.wape}%` : '—', 'High is normal when a piece sells in ones and twos.'],
    ['MAE', m.mae ?? '—', 'Average units out, per day.'],
    ['RMSE', m.rmse ?? '—', 'Same, but punishes the big misses.'],
    ['sMAPE', m.smape != null ? `${m.smape}%` : '—', 'Symmetric percentage error.']
  ];
  const shown = compact ? rows.slice(0, 2) : rows;

  return (
    <dl className="ml-metrics">
      {shown.map(([k, v, note]) => (
        <div className="ml-metrics__row" key={k}>
          <dt>{k}</dt>
          <dd className="mono">{v}</dd>
          {!compact && <p className="tiny">{note}</p>}
        </div>
      ))}
    </dl>
  );
}

/* ---------- the human decision ----------
   Every recommendation ends here. Rejecting needs a reason and
   changing needs a number, because those are the two things the
   next model generation can actually learn from. */
export function Decision({ modelKey, subject, recommended, onDone, disabled }) {
  const [mode, setMode] = useState(null);
  const [value, setValue] = useState(recommended ?? '');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const send = async (decision, extra = {}) => {
    setBusy(true);
    setError(null);
    try {
      await onDone({ modelKey, subject, recommended, decision, ...extra });
      setMode('done');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (disabled) return <p className="tiny">Your role can read this but not act on it.</p>;
  if (mode === 'done') return <p className="tiny ml-decided">Recorded. It will be scored against what actually happens.</p>;

  return (
    <div className="ml-decision">
      {error && <div className="notice notice--error">{error}</div>}

      {mode === 'modify' && (
        <div className="ml-decision__form">
          <label className="field">
            <span className="field__label">Order instead</span>
            <input className="input mono" type="number" min="0" value={value}
              onChange={(e) => setValue(e.target.value)} />
          </label>
          <label className="field">
            <span className="field__label">Why the change</span>
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="Supplier minimum, budget, a launch coming…" />
          </label>
          <div className="ml-decision__actions">
            <button type="button" className="btn btn--gold btn--sm" disabled={busy}
              onClick={() => send('modified', { adjustedTo: Number(value), note })}>Save</button>
            <button type="button" className="btn btn--outline btn--sm" onClick={() => setMode(null)}>Cancel</button>
          </div>
        </div>
      )}

      {mode === 'reject' && (
        <div className="ml-decision__form">
          <label className="field">
            <span className="field__label">Why it is wrong</span>
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="Line is being discontinued, stock arriving already…" autoFocus />
            <span className="field__hint">This is the part the next model learns from.</span>
          </label>
          <div className="ml-decision__actions">
            <button type="button" className="btn btn--gold btn--sm" disabled={busy || !note.trim()}
              onClick={() => send('rejected', { note })}>Reject</button>
            <button type="button" className="btn btn--outline btn--sm" onClick={() => setMode(null)}>Cancel</button>
          </div>
        </div>
      )}

      {!mode && (
        <div className="ml-decision__actions">
          <button type="button" className="btn btn--gold btn--sm" disabled={busy}
            onClick={() => send('approved')}>Approve</button>
          <button type="button" className="btn btn--outline btn--sm" onClick={() => setMode('modify')}>Change the number</button>
          <button type="button" className="btn btn--outline btn--sm" onClick={() => setMode('reject')}>Reject</button>
        </div>
      )}
    </div>
  );
}

/* ---------- small shared furniture ---------- */
export function Head({ label, title, note, children }) {
  return (
    <header className="admin__head">
      <div>
        <span className="field__label">{label}</span>
        <h1 className="h2">{title}</h1>
        {note && <p className="tiny ml-head__note">{note}</p>}
      </div>
      {children && <div className="admin__headactions">{children}</div>}
    </header>
  );
}

export const Loading = () => (
  <div aria-busy="true">
    {Array.from({ length: 5 }).map((_, i) => (
      <div className="skeleton-line" key={i} style={{ height: 34, marginBottom: 8 }} />
    ))}
  </div>
);

export const Empty = ({ children }) => <div className="notice">{children}</div>;

export function SyntheticBanner({ data }) {
  if (!data?.present) return null;
  return (
    <div className="notice notice--warning ml-synthetic">
      <strong>{data.syntheticShare}% of the training data is synthetic.</strong>{' '}
      {data.synthetic.orders.toLocaleString('en-IN')} generated orders from {data.synthetic.from} to {data.synthetic.to},
      alongside {data.real.orders} real one{data.real.orders === 1 ? '' : 's'}. Every figure in this console is
      therefore a demonstration of the pipeline, not a reading of the business. Remove it under Training data
      before trusting anything here.
    </div>
  );
}
