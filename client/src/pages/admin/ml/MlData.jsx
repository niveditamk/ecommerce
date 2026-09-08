/* =============================================================
   ML OPERATIONS — TRAINING DATA
   What the models have to learn from, per SKU, and the synthetic
   history that stands in while the shop is new. Synthetic data
   is labelled everywhere it appears and removable in one click —
   it exists so the pipeline can be built and demonstrated, not
   so the dashboard can look busy.
   ============================================================= */
import { useState } from 'react';
import { useAsync } from '../../../lib/useAsync';
import adminApi from '../../../lib/adminApi';
import { useAdmin } from '../../../context/AdminContext';
import { dx } from '../../../lib/format';
import { Head, Loading } from './shared';

export default function MlData() {
  const { can } = useAdmin();
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(null);
  const [days, setDays] = useState(540);
  const [confirming, setConfirming] = useState(false);

  const { data, loading, error, reload } = useAsync(() => adminApi.ml.data(), []);

  const say = (msg, tone = 'ok') => { setFlash({ msg, tone }); setTimeout(() => setFlash(null), 8000); };

  const generate = async () => {
    setBusy(true);
    try {
      const out = await adminApi.ml.generate({ days, replace: true });
      say(`${out.orders.toLocaleString('en-IN')} synthetic orders written across ${out.days} days `
        + `(${out.units} units, ${out.stockoutDays} out-of-stock days recorded). Retrain to use it.`);
      reload();
    } catch (err) {
      say(err.message, 'warn');
    } finally {
      setBusy(false);
    }
  };

  const purge = async () => {
    setBusy(true);
    setConfirming(false);
    try {
      const out = await adminApi.ml.purge();
      say(`Removed ${out.orders} synthetic orders, ${out.items} line items and ${out.ledger} ledger rows. `
        + 'Retrain to fall back to real trading only.');
      reload();
    } catch (err) {
      say(err.message, 'warn');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loading />;
  if (error) return <div className="notice notice--error">{error}</div>;

  const { readiness } = data;

  return (
    <>
      <Head
        label="Foundation"
        title="Training data"
        note="Models are only as honest as what they are fitted on. This is that, in full."
      />

      {flash && <div className={`notice ${flash.tone === 'warn' ? 'notice--warning' : ''}`}>{flash.msg}</div>}

      <section className="ml-panel">
        <h2 className="h4">Where the history comes from</h2>
        <div className="ml-provenance">
          <div className={`ml-prov${data.real.orders ? ' is-on' : ''}`}>
            <span className="ml-prov__count mono">{data.real.orders.toLocaleString('en-IN')}</span>
            <span className="field__label">Real orders</span>
            <p className="tiny">
              {data.real.from ? `${data.real.from} to ${data.real.to}` : 'None recorded.'}
            </p>
          </div>
          <div className={`ml-prov ml-prov--synthetic${data.present ? ' is-on' : ''}`}>
            <span className="ml-prov__count mono">{data.synthetic.orders.toLocaleString('en-IN')}</span>
            <span className="field__label">Synthetic orders</span>
            <p className="tiny">
              {data.present ? `${data.synthetic.from} to ${data.synthetic.to}` : 'None generated.'}
            </p>
          </div>
        </div>

        {data.present && (
          <p className="tiny ml-panel__note">
            <strong>{data.syntheticShare}% of the training set is generated.</strong> Those orders carry a
            SYN- prefix and a synthetic channel, they are excluded from revenue reporting, and their
            out-of-stock days are written to the ledger as synthetic too. Nothing pretends to be a real sale.
          </p>
        )}
      </section>

      {can('ai.data') && (
        <section className="ml-panel">
          <h2 className="h4">Generate or remove</h2>
          <p className="tiny ml-panel__note">
            A per-SKU daily forecaster needs months of history. A shop that opened this week does not have
            it. Generating a season of plausible trading — weekly rhythm, a Diwali peak, replenishment
            cycles and the stock-outs that come with them — lets the pipeline be built and measured now,
            and thrown away the moment real trading catches up.
          </p>

          <div className="ml-datacontrols">
            <label className="field">
              <span className="field__label">History to generate</span>
              <select className="input" value={days} onChange={(e) => setDays(Number(e.target.value))}>
                <option value={180}>180 days — six months</option>
                <option value={365}>365 days — one year</option>
                <option value={540}>540 days — eighteen months</option>
                <option value={730}>730 days — two years</option>
              </select>
              <span className="field__hint">Replaces whatever synthetic history is already there.</span>
            </label>

            <div className="ml-datacontrols__actions">
              <button type="button" className="btn btn--gold btn--sm" onClick={generate} disabled={busy}>
                {busy ? 'Working…' : data.present ? 'Regenerate' : 'Generate'}
              </button>
              {data.present && !confirming && (
                <button type="button" className="btn btn--outline btn--sm" onClick={() => setConfirming(true)} disabled={busy}>
                  Remove synthetic data
                </button>
              )}
              {confirming && (
                <span className="ml-confirm">
                  <span className="tiny">Remove all {data.synthetic.orders.toLocaleString('en-IN')} synthetic orders?</span>
                  <button type="button" className="btn btn--outline btn--sm" onClick={purge} disabled={busy}>Yes, remove</button>
                  <button type="button" className="btn btn--outline btn--sm" onClick={() => setConfirming(false)}>Cancel</button>
                </span>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="ml-panel">
        <div className="ml-panel__head">
          <h2 className="h4">Readiness by SKU</h2>
          <span className="tiny">
            {readiness.ready} of {readiness.skus} have the {readiness.minDays} clean days a forecast needs
          </span>
        </div>

        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr><th>Product</th><th>SKU</th><th>Clean days</th><th>Excluded</th><th>Units</th><th>Status</th></tr>
            </thead>
            <tbody>
              {readiness.rows.map((r) => (
                <tr key={r.sku}>
                  <td>{dx(r.name)}</td>
                  <td className="mono tiny">{r.sku}</td>
                  <td className="mono">{r.days}</td>
                  <td className="mono tiny">{r.censored || '—'}</td>
                  <td className="mono tiny">{r.units}</td>
                  <td>
                    {r.ready
                      ? <span className="ml-ready">ready</span>
                      : <span className="tiny">{readiness.minDays - r.days} more day(s) needed</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="tiny ml-panel__note">
          Excluded days are days the piece was out of stock. Those zeros are removed from training rather
          than counted, because a shelf nobody could buy from is not a measurement of demand — it is the
          single most common way a demand model teaches itself to under-buy.
        </p>
      </section>
    </>
  );
}
