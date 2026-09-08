/* =============================================================
   ML OPERATIONS — FORECAST EXPLORER
   One SKU at a time, with its history drawn underneath so the
   forecast can be read against what actually happened. Days the
   piece was out of stock are marked, because those zeros were
   never a measurement of demand.
   ============================================================= */
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAsync } from '../../../lib/useAsync';
import adminApi from '../../../lib/adminApi';
import { dx } from '../../../lib/format';
import { Head, Loading, Confidence, Evidence, Series, Metrics, Risk } from './shared';

const HORIZONS = [7, 14, 30, 60, 90];

export default function MlForecast() {
  const [params, setParams] = useSearchParams();
  const sku = params.get('sku') || '';

  const products = useAsync(() => adminApi.products({ perPage: 200, sort: 'name' }), []);
  const list = products.data?.items || [];

  /* Default to the first SKU rather than an empty screen. */
  const chosen = sku || list[0]?.id || '';
  const { data, loading, error } = useAsync(
    () => (chosen ? adminApi.ml.forecast(chosen) : Promise.resolve(null)),
    [chosen]
  );

  const pick = (id) => {
    const next = new URLSearchParams(params);
    if (id) next.set('sku', id); else next.delete('sku');
    setParams(next);
  };

  return (
    <>
      <Head
        label="Forecasting"
        title="Forecast explorer"
        note="What the serving version says about one piece, and the history it says it from."
      >
        <label className="field ml-picker">
          <span className="sr-only">Choose a product</span>
          <select className="input" value={chosen} onChange={(e) => pick(e.target.value)}>
            {list.map((p) => <option key={p.id} value={p.id}>{dx(p.name)} · {p.id}</option>)}
          </select>
        </label>
      </Head>

      {loading && <Loading />}
      {error && <div className="notice notice--error">{error}</div>}

      {data && <Panel data={data} />}
    </>
  );
}

function Panel({ data }) {
  const { forecast, intelligence, history } = data;
  const [horizon, setHorizon] = useState(30);

  if (forecast.confidence === 'INSUFFICIENT') {
    return (
      <>
        <section className="ml-panel ml-panel--flat">
          <Confidence value="INSUFFICIENT" showNote />
          <Evidence lines={forecast.explanation || [forecast.reason]} title="What is missing" />
        </section>
        <section className="ml-panel">
          <h2 className="h4">Sales history</h2>
          <Series points={history} height={72} />
        </section>
      </>
    );
  }

  const band = forecast.horizons[horizon];

  return (
    <>
      <section className="ml-forecast">
        <div className="ml-forecast__figure">
          <span className="field__label">Next {horizon} days</span>
          <p className="ml-forecast__units mono">{band.units}</p>
          <p className="tiny">units, between {band.lower} and {band.upper}</p>
          <Confidence value={forecast.confidence} showNote />
        </div>

        <div className="ml-forecast__horizons">
          <span className="field__label">Horizon</span>
          <div className="ml-horizons" role="group" aria-label="Forecast horizon">
            {HORIZONS.map((h) => (
              <button
                key={h}
                type="button"
                className={`ml-horizons__btn${h === horizon ? ' is-on' : ''}`}
                aria-pressed={h === horizon}
                onClick={() => setHorizon(h)}
              >
                {h}d
              </button>
            ))}
          </div>
          <table className="tbl ml-horizontable">
            <tbody>
              {HORIZONS.map((h) => (
                <tr key={h} className={h === horizon ? 'is-active' : undefined}>
                  <td className="tiny">{h} days</td>
                  <td className="mono">{forecast.horizons[h].units}</td>
                  <td className="mono tiny">{forecast.horizons[h].lower}–{forecast.horizons[h].upper}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="ml-panel">
        <h2 className="h4">Sales history</h2>
        <Series points={history} height={80} />
        <Evidence lines={forecast.explanation} />
      </section>

      <div className="ml-cards">
        <article className="ml-card">
          <h3 className="field__label">Position</h3>
          <dl className="ml-model__facts ml-model__facts--stack">
            <div><dt>On hand</dt><dd className="mono">{intelligence.onHand}</dd></div>
            <div><dt>Reserved</dt><dd className="mono">{intelligence.reserved}</dd></div>
            <div><dt>Available</dt><dd className="mono">{intelligence.available}</dd></div>
            <div><dt>Incoming</dt><dd className="mono">{intelligence.incoming}</dd></div>
          </dl>
        </article>

        <article className="ml-card">
          <h3 className="field__label">Cover</h3>
          <p className="ml-card__figure mono">
            {intelligence.coverDays != null ? `${intelligence.coverDays}d` : '—'}
          </p>
          <p className="tiny"><Risk value={intelligence.risk} /> {intelligence.riskReason}</p>
        </article>

        <article className="ml-card">
          <h3 className="field__label">Fitted model</h3>
          <p className="tiny">
            {forecast.algorithmLabel}, version {forecast.version}.
            Daily rate {forecast.dailyRate}.
          </p>
          <Metrics m={forecast.metrics} compact />
        </article>
      </div>

      {intelligence.reorder && (
        <section className="ml-panel">
          <h2 className="h4">Reorder proposal — {intelligence.reorder.qty} units</h2>
          <Evidence lines={intelligence.reorder.reasoning} />
          <p className="tiny ml-panel__note">
            Decide on this from the <Link className="link" to="/admin/ml/recommendations">recommendations board</Link>,
            where the decision is recorded against the model.
          </p>
        </section>
      )}

      {intelligence.overstock && (
        <section className="ml-panel">
          <h2 className="h4">Overstocked</h2>
          <Evidence lines={intelligence.overstock.reasoning} />
        </section>
      )}
    </>
  );
}
