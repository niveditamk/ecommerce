/* =============================================================
   COMMERCE ENGINE (MEDUSA)
   Three things on one page, because an operator asked three
   different questions of it:

     1. What is this and how does it work — stated plainly, at the
        top, because a second backend appearing in the admin is
        confusing unless somebody explains it.
     2. Ask — answers computed from real data, never invented.
     3. The inventory itself, to read manually.
   ============================================================= */
import { useState } from 'react';
import { useAsync } from '../../lib/useAsync';
import adminApi from '../../lib/adminApi';
import { useAdmin } from '../../context/AdminContext';
import { dx } from '../../lib/format';

const CONF = {
  HIGH: 'High confidence',
  MEDIUM: 'Medium confidence',
  LOW: 'Low confidence',
  INSUFFICIENT: 'Insufficient data',
  UNKNOWN: 'Unknown'
};

function Head({ label, title, note }) {
  return (
    <header className="admin__head">
      <div>
        <span className="field__label">{label}</span>
        <h1 className="h2">{title}</h1>
        {note && <p className="tiny ml-head__note">{note}</p>}
      </div>
    </header>
  );
}

/* ---------------- how it works ---------------- */
function Explainer({ status }) {
  return (
    <section className="ml-panel">
      <h2 className="h4">What this page is</h2>
      <div className="ml-evidence">
        <span className="field__label">In short</span>
        <ul>
          <li>
            Medusa is an open-source commerce engine running alongside Aurelis. It holds a copy of the
            catalogue and a full inventory system — stock locations, per-variant levels and reservations.
          </li>
          <li>
            The storefront still sells from the Aurelis database. Medusa is <strong>not</strong> serving
            customers yet; this page reads from it so you can see what it holds and compare.
          </li>
          <li>
            Your browser never talks to Medusa. Everything here is proxied through the Aurelis admin, so
            the same roles and permissions apply as everywhere else.
          </li>
          <li>
            Two inventory systems exist while this is being evaluated. Aurelis is the one that decides
            whether a customer can buy. Treat Medusa's numbers as a second opinion, not as the truth.
          </li>
        </ul>
      </div>

      <div className={`notice ${status?.reachable ? '' : 'notice--warning'}`} style={{ marginTop: 'var(--spacing-12)' }}>
        <strong>{status?.reachable ? 'Connected.' : 'Not connected.'}</strong>{' '}
        {status?.explanation}
        {!status?.reachable && status?.configured && (
          <div className="tiny mono" style={{ marginTop: 8, textTransform: 'none' }}>
            cd medusa &amp;&amp; npm run db:start &nbsp;·&nbsp; then: npx medusa develop
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------------- ask ---------------- */
function Ask() {
  const [active, setActive] = useState(null);
  const [answer, setAnswer] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const { data, loading } = useAsync(() => adminApi.medusa.questions(), []);

  const run = async (id) => {
    setBusy(true); setActive(id); setError(null); setAnswer(null);
    try {
      setAnswer(await adminApi.medusa.ask(id));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="skeleton-line" style={{ height: 120 }} />;

  return (
    <section className="ml-panel">
      <div className="ml-panel__head">
        <h2 className="h4">Ask</h2>
        <span className="tiny">Computed from data, not written by a language model</span>
      </div>

      <p className="tiny ml-panel__note">{data?.note}</p>

      <div className="ml-tabs" style={{ flexWrap: 'wrap' }}>
        {(data?.questions || []).map((q) => (
          <button
            key={q.id}
            type="button"
            className={`ml-tabs__btn${active === q.id ? ' is-on' : ''}`}
            onClick={() => run(q.id)}
            disabled={busy}
            title={q.hint}
          >
            {q.label}
          </button>
        ))}
      </div>

      {busy && <div className="skeleton-line" style={{ height: 90, marginTop: 12 }} />}
      {error && <div className="notice notice--error" style={{ marginTop: 12 }}>{error}</div>}

      {answer && !busy && (
        <div className="ml-gate" style={{ marginTop: 'var(--spacing-12)' }}>
          <div className="ml-gate__figure">
            <span className={`ml-conf ml-conf--${String(answer.confidence || 'unknown').toLowerCase()}`}>
              <span className="ml-conf__dot" aria-hidden="true" />
              <span className="ml-conf__label">{CONF[answer.confidence] || answer.confidence}</span>
            </span>
          </div>
          <div className="ml-gate__body">
            <h3 className="h4">{dx(answer.headline)}</h3>
            {(answer.body || []).map((line, i) => (
              <p className="tiny ml-gate__note" key={i}>{dx(line)}</p>
            ))}

            {answer.table && (
              <div className="tbl-wrap" style={{ marginTop: 'var(--spacing-12)' }}>
                <table className="tbl">
                  <thead>
                    <tr>{answer.table.columns.map((c) => <th key={c}>{c}</th>)}</tr>
                  </thead>
                  <tbody>
                    {answer.table.rows.map((row, i) => (
                      <tr key={i}>{row.map((cell, j) => <td key={j}>{dx(cell)}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

/* ---------------- the inventory, read manually ---------------- */
function Inventory() {
  const [expanded, setExpanded] = useState(false);
  const { data, loading, error } = useAsync(() => adminApi.medusa.inventory(), []);

  if (loading) return <div className="skeleton-line" style={{ height: 220 }} />;
  if (error) return <div className="notice notice--warning">{error}</div>;
  if (!data) return null;

  const t = data.totals;

  return (
    <section className="ml-panel">
      <div className="ml-panel__head">
        <h2 className="h4">Inventory in Medusa</h2>
        <span className="tiny mono">{data.locations.map((l) => l.name).join(', ') || 'no location'}</span>
      </div>

      <div className="ml-cards">
        <article className="ml-card">
          <h3 className="field__label">Stocked</h3>
          <p className="ml-card__figure mono">{t.stocked}</p>
          <p className="tiny ml-card__note">across {t.variants} variants of {t.products} products</p>
        </article>
        <article className="ml-card">
          <h3 className="field__label">Available</h3>
          <p className="ml-card__figure mono">{t.available}</p>
          <p className="tiny ml-card__note">{t.reserved} reserved</p>
        </article>
        <article className="ml-card">
          <h3 className="field__label">At zero</h3>
          <p className="ml-card__figure mono">{t.outOfStock}</p>
          <p className="tiny ml-card__note">
            variants with nothing available — mostly an artefact of the import, which put each SKU's whole
            stock on its first variant
          </p>
        </article>
      </div>

      <div className="tbl-wrap" style={{ marginTop: 'var(--spacing-18)' }}>
        <table className="tbl">
          <thead>
            <tr><th>Product</th><th>Variants</th><th>Stocked</th><th>Reserved</th><th>Available</th></tr>
          </thead>
          <tbody>
            {data.byProduct.map((p) => (
              <tr key={p.handle}>
                <td>{dx(p.product || p.handle)}<span className="mono tiny ml-sku">{p.handle}</span></td>
                <td className="mono tiny">{p.variants}</td>
                <td className="mono">{p.stocked}</td>
                <td className="mono tiny">{p.reserved}</td>
                <td className="mono">{p.available}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        className="btn btn--outline btn--sm"
        style={{ marginTop: 'var(--spacing-12)', width: 'fit-content' }}
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? 'Hide variant detail' : `Show all ${data.rows.length} variants`}
      </button>

      {expanded && (
        <div className="tbl-wrap" style={{ marginTop: 'var(--spacing-12)' }}>
          <table className="tbl">
            <thead>
              <tr><th>SKU</th><th>Product</th><th>Variant</th><th>Stocked</th><th>Available</th></tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.id}>
                  <td className="mono tiny">{r.sku}</td>
                  <td className="tiny">{dx(r.product || '—')}</td>
                  <td className="tiny">{r.variant || '—'}</td>
                  <td className="mono">{r.stocked}</td>
                  <td className="mono">{r.available}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}


/* ---------------- free-form assistant ----------------
   The model is handed the figures this system computed and asked to
   explain them. It never supplies a number, which is why the answer
   sits above the very data it was given — so the reader can check
   the working rather than take it on trust. */
const SUGGESTED = [
  'Which products should I worry about this week, and why?',
  'What should I buy more of, and what should I stop buying?',
  'Is anything tying up money that I should discount?',
  'Summarise the state of the shop in three sentences.'
];

function Assistant() {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showData, setShowData] = useState(false);
  const { data: status } = useAsync(() => adminApi.medusa.aiStatus(), []);

  const submit = async (q) => {
    const text = (q ?? question).trim();
    if (!text || busy) return;
    setQuestion(text);
    setBusy(true);
    setResult(null);
    try {
      setResult(await adminApi.medusa.aiAsk(text));
    } catch (err) {
      setResult({ ok: false, error: err.payload?.error || err.message, detail: err.payload?.detail });
    } finally {
      setBusy(false);
    }
  };

  if (status && !status.configured) {
    return (
      <section className="ml-panel">
        <h2 className="h4">Ask anything</h2>
        <div className="notice notice--warning">{status.note}</div>
      </section>
    );
  }

  return (
    <section className="ml-panel">
      <div className="ml-panel__head">
        <h2 className="h4">Ask anything</h2>
        <span className="tiny">Answers are written from this shop's own figures</span>
      </div>

      <p className="tiny ml-panel__note">
        A language model reads the figures below and explains them. It is told never to state a number
        it was not given, and to say so when the data cannot answer. The figures it used are shown
        underneath every answer, so you can check the working.
      </p>

      <form
        onSubmit={(e) => { e.preventDefault(); submit(); }}
        style={{ display: 'flex', gap: 'var(--spacing-12)', flexWrap: 'wrap', alignItems: 'flex-end' }}
      >
        <label className="field" style={{ flex: '1 1 420px' }}>
          <span className="field__label">Your question</span>
          <input
            className="input"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. what should I reorder first?"
            maxLength={500}
            disabled={busy}
          />
        </label>
        <button type="submit" className="btn btn--gold btn--sm" disabled={busy || !question.trim()}>
          {busy ? 'Thinking…' : 'Ask'}
        </button>
      </form>

      <div className="ml-tabs" style={{ flexWrap: 'wrap', marginTop: 'var(--spacing-12)' }}>
        {SUGGESTED.map((s) => (
          <button key={s} type="button" className="ml-tabs__btn" onClick={() => submit(s)} disabled={busy}>
            {s}
          </button>
        ))}
      </div>

      {busy && <div className="skeleton-line" style={{ height: 110, marginTop: 16 }} />}

      {result && !busy && !result.ok && (
        <div className="notice notice--warning" style={{ marginTop: 16 }}>
          <strong>No model answered.</strong> {result.error}
          {Array.isArray(result.detail) && (
            <ul style={{ marginTop: 8 }}>
              {result.detail.slice(0, 4).map((a, i) => (
                <li key={i} className="tiny mono" style={{ textTransform: 'none' }}>
                  {a.model}: {a.error}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {result && !busy && result.ok && (
        <>
          <div className="ml-gate" style={{ marginTop: 16 }}>
            <div className="ml-gate__figure">
              <span className="field__label">Answered by</span>
              <span className="tiny mono" style={{ textTransform: 'none' }}>{result.model}</span>
              {result.skipped?.length > 0 && (
                <span className="tiny" style={{ color: 'var(--pearl-3)', textTransform: 'none' }}>
                  {result.skipped.length} model(s) were rate-limited first
                </span>
              )}
            </div>
            <div className="ml-gate__body">
              {String(result.answer).split(/\n{2,}/).map((para, i) => (
                <p key={i} className="tiny ml-gate__note" style={{ marginBottom: 10 }}>{para}</p>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="btn btn--outline btn--sm"
            style={{ marginTop: 12, width: 'fit-content' }}
            onClick={() => setShowData((v) => !v)}
          >
            {showData ? 'Hide the figures it was given' : 'Show the figures it was given'}
          </button>

          {showData && (
            <pre
              className="mono tiny"
              style={{
                marginTop: 12, padding: 'var(--spacing-12)', overflowX: 'auto',
                background: 'var(--nb-shade, #f2efe6)', border: '2px solid currentColor',
                textTransform: 'none', maxHeight: 420
              }}
            >
              {JSON.stringify(result.context, null, 1)}
            </pre>
          )}
        </>
      )}
    </section>
  );
}

export default function AdminMedusa() {
  const { can } = useAdmin();
  const { data: status, loading } = useAsync(() => adminApi.medusa.status(), []);

  if (!can('ai.view')) {
    return <div className="notice notice--warning">Your role cannot open the commerce engine.</div>;
  }

  return (
    <>
      <Head
        label="Commerce engine"
        title="Medusa"
        note="An open-source commerce engine running beside Aurelis, holding a copy of the catalogue and a full inventory system."
      />

      {loading ? <div className="skeleton-line" style={{ height: 140 }} /> : <Explainer status={status} />}

      {status?.reachable && (
        <>
          {can('ai.view') && <Assistant />}
          {can('ai.view') && <Ask />}
          {can('inventory.view') && <Inventory />}
        </>
      )}
    </>
  );
}
