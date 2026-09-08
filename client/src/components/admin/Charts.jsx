/* =============================================================
   ADMIN CHARTS

   Hand-built SVG. The project ships no charting library and the
   forms needed here — a time series, ranked bars, a status band —
   are a few dozen lines each, which is far less than the weight
   of a dependency.

   Colour decisions, in order, and why:
     - Every plot is a SINGLE series, so each chart's title names
       it and no legend box is needed. One hue does all of them:
       #2a78d6, which validated PASS on lightness, chroma, CVD
       separation and 3:1 contrast against the admin surface.
     - Bars are ranked by magnitude, so length carries the value
       and hue carries nothing — cycling colours across them would
       imply an identity the data does not have.
     - Stock health is the one place a reserved STATUS palette is
       used. Two of its four steps sit under 3:1 on a light ground
       by design, so every band ships its name and its count as
       text: colour never carries the meaning alone.
     - Revenue and orders are two different scales, so they are two
       charts. A second y-axis would let either curve be made to
       tell whichever story the axis was drawn for.
   ============================================================= */
import { useId, useMemo, useState } from 'react';

const HUE = 'var(--viz-series-1)';

/* ---------- shared helpers ---------- */
const money = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
const shortMoney = (n) => {
  const v = Number(n || 0);
  if (v >= 10000000) return '₹' + (v / 10000000).toFixed(1) + 'cr';
  if (v >= 100000) return '₹' + (v / 100000).toFixed(1) + 'L';
  if (v >= 1000) return '₹' + Math.round(v / 1000) + 'k';
  return '₹' + v;
};
const dayLabel = (iso) => {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
};

/* =========================================================
   TIME SERIES — crosshair and tooltip, because an HTML chart
   that cannot be interrogated is a picture of data.
   ========================================================= */
export function TimeSeries({ points, valueKey, title, caption, format = 'number', height = 210 }) {
  const [hover, setHover] = useState(null);
  const clipId = useId();

  const w = 720;
  const h = height;
  const pad = { t: 14, r: 16, b: 26, l: 54 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;

  const values = points.map((p) => Number(p[valueKey]) || 0);
  const max = Math.max(...values, 1);
  /* A zero baseline, always: a truncated axis exaggerates every
     wobble into a trend. */
  const y = (v) => pad.t + innerH - (v / max) * innerH;
  const x = (i) => pad.l + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);

  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(values[i]).toFixed(1)}`).join(' ');
  const area = `${line} L${x(points.length - 1).toFixed(1)},${pad.t + innerH} L${x(0).toFixed(1)},${pad.t + innerH} Z`;

  const fmt = format === 'currency' ? shortMoney : (n) => Number(n).toLocaleString('en-IN');
  const ticks = [0, 0.5, 1].map((f) => Math.round(max * f));

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * w;
    const i = Math.round(((px - pad.l) / innerW) * (points.length - 1));
    if (i >= 0 && i < points.length) setHover(i);
  };

  return (
    <figure className="viz">
      <figcaption className="viz__head">
        <h3 className="viz__title">{title}</h3>
        {caption && <p className="viz__caption">{caption}</p>}
      </figcaption>

      <div className="viz__plot">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          role="img"
          aria-label={`${title}. ${points.length} days, peak ${fmt(max)}.`}
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={`g-${clipId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={HUE} stopOpacity="0.16" />
              <stop offset="100%" stopColor={HUE} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* recessive grid */}
          {ticks.map((t) => (
            <g key={t}>
              <line className="viz__grid" x1={pad.l} x2={w - pad.r} y1={y(t)} y2={y(t)} />
              <text className="viz__axis" x={pad.l - 8} y={y(t) + 4} textAnchor="end">{fmt(t)}</text>
            </g>
          ))}

          <path d={area} fill={`url(#g-${clipId})`} />
          <path d={line} fill="none" stroke={HUE} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

          {hover !== null && (
            <g>
              <line className="viz__crosshair" x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + innerH} />
              {/* a 2px surface ring keeps the marker legible over the line */}
              <circle cx={x(hover)} cy={y(values[hover])} r="5" fill={HUE} stroke="var(--viz-surface)" strokeWidth="2" />
            </g>
          )}

          {/* first and last day only — a label on every point is noise */}
          <text className="viz__axis" x={pad.l} y={h - 8} textAnchor="start">{dayLabel(points[0].day)}</text>
          <text className="viz__axis" x={w - pad.r} y={h - 8} textAnchor="end">{dayLabel(points[points.length - 1].day)}</text>
        </svg>

        {hover !== null && (
          <div
            className="viz__tip"
            style={{ left: `${(x(hover) / w) * 100}%` }}
            role="status"
          >
            <b>{format === 'currency' ? money(values[hover]) : values[hover].toLocaleString('en-IN')}</b>
            <span>{points[hover].day}</span>
          </div>
        )}
      </div>
    </figure>
  );
}

/* =========================================================
   RANKED BARS — length carries the value, so one hue.
   ========================================================= */
export function RankedBars({ rows, labelKey, valueKey, title, caption, format = 'currency' }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(...rows.map((r) => Number(r[valueKey]) || 0), 1);
  const fmt = format === 'currency' ? money : (n) => Number(n).toLocaleString('en-IN');

  if (!rows.length) {
    return (
      <figure className="viz">
        <figcaption className="viz__head"><h3 className="viz__title">{title}</h3></figcaption>
        <p className="viz__empty">Nothing sold in this window yet.</p>
      </figure>
    );
  }

  return (
    <figure className="viz">
      <figcaption className="viz__head">
        <h3 className="viz__title">{title}</h3>
        {caption && <p className="viz__caption">{caption}</p>}
      </figcaption>

      <ul className="viz__bars">
        {rows.map((r, i) => {
          const v = Number(r[valueKey]) || 0;
          return (
            <li
              key={r[labelKey] || i}
              className={`viz__bar${hover === i ? ' is-hover' : ''}`}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <span className="viz__bar-label">{String(r[labelKey])}</span>
              <span className="viz__bar-track">
                <span className="viz__bar-fill" style={{ width: `${Math.max((v / max) * 100, 1.5)}%`, background: HUE }} />
              </span>
              {/* direct label on every bar — this is the relief the
                  contrast check asks for, and it means the reader
                  never has to measure a bar against an axis. */}
              <span className="viz__bar-value">{fmt(v)}</span>
            </li>
          );
        })}
      </ul>
    </figure>
  );
}

/* =========================================================
   STOCK HEALTH — the one reserved status palette in the admin.
   Every band carries its name and count, so hue is never the
   only thing distinguishing "critical" from "out".
   ========================================================= */
const STOCK_BANDS = [
  { key: 'healthy', label: 'Healthy', hint: 'more than 10', token: 'var(--viz-good)' },
  { key: 'low', label: 'Low', hint: '4 to 10', token: 'var(--viz-warning)' },
  { key: 'critical', label: 'Critical', hint: '1 to 3', token: 'var(--viz-serious)' },
  { key: 'out', label: 'Out of stock', hint: 'none left', token: 'var(--viz-critical)' }
];

export function StockHealth({ stock, title = 'Stock health' }) {
  const total = Number(stock?.total) || 0;
  if (!total) return null;

  return (
    <figure className="viz">
      <figcaption className="viz__head">
        <h3 className="viz__title">{title}</h3>
        <p className="viz__caption">{total} active pieces</p>
      </figcaption>

      {/* 2px surface gaps between segments, so adjacent bands read
          as separate even where their hues are close. */}
      <div className="viz__stack" role="img" aria-label={STOCK_BANDS.map((b) => `${b.label} ${stock[b.key] || 0}`).join(', ')}>
        {STOCK_BANDS.map((b) => {
          const n = Number(stock[b.key]) || 0;
          if (!n) return null;
          return <span key={b.key} className="viz__stack-seg" style={{ flexGrow: n, background: b.token }} />;
        })}
      </div>

      <ul className="viz__key">
        {STOCK_BANDS.map((b) => (
          <li key={b.key}>
            <span className="viz__swatch" style={{ background: b.token }} aria-hidden="true" />
            <span className="viz__key-label">{b.label}</span>
            <span className="viz__key-hint">{b.hint}</span>
            <b className="viz__key-value">{Number(stock[b.key]) || 0}</b>
          </li>
        ))}
      </ul>
    </figure>
  );
}

/* =========================================================
   STAT TILE — a single headline is not a chart.
   ========================================================= */
export function StatTile({ label, value, sub, format = 'number' }) {
  const shown = format === 'currency' ? money(value) : Number(value || 0).toLocaleString('en-IN');
  return (
    <div className="viz-stat">
      <span className="viz-stat__label">{label}</span>
      <b className="viz-stat__value">{shown}</b>
      {sub && <span className="viz-stat__sub">{sub}</span>}
    </div>
  );
}

/* =========================================================
   TABLE VIEW — the relief every chart on this page owes, and
   the only form that works in a screen reader without fuss.
   ========================================================= */
export function SeriesTable({ points, open, onToggle }) {
  const rows = useMemo(() => points.filter((p) => p.orders > 0), [points]);
  return (
    <div className="viz-table">
      <button type="button" className="btn btn--outline btn--sm" onClick={onToggle} aria-expanded={open}>
        {open ? 'Hide the numbers' : 'Show the numbers'}
      </button>
      {open && (
        <div className="tbl-wrap" style={{ marginTop: '0.8rem' }}>
          <table>
            <caption className="sr-only">Daily orders and revenue</caption>
            <thead>
              <tr><th scope="col">Day</th><th scope="col">Orders</th><th scope="col">Revenue</th><th scope="col">Average order</th></tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={4}>No orders in this window.</td></tr>}
              {rows.map((p) => (
                <tr key={p.day}>
                  <td>{p.day}</td>
                  <td className="tc">{p.orders}</td>
                  <td className="tc">{money(p.revenue)}</td>
                  <td className="tc">{money(p.averageOrder)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
