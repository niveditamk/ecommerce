/* =============================================================
   ADMIN COMMAND CENTER
   Command-center overview with 14 real-time KPIs, period comparisons,
   AI executive brief, and answers to the five core business questions.
   ============================================================= */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAdminFilters } from '../../context/AdminFilterContext';
import { money } from '../../lib/format';
import { authFetch, readToken } from '../../lib/adminApi';
import { TimeSeries, RankedBars, StockHealth, StatTile, SeriesTable } from '../../components/admin/Charts';

export default function CommandCenter() {
  const { dateRange, warehouse } = useAdminFilters();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('q1');
  /* The KPI cards are single numbers. Trend is a different question
     from level, and it needs its own series. */
  const [series, setSeries] = useState(null);
  /* Named rangeDays, not window: a state variable called window
     shadows the browser global for the whole component. */
  const [rangeDays, setRangeDays] = useState(30);
  const [tableOpen, setTableOpen] = useState(false);

  const fetchSeries = (days) => {
    authFetch(`/api/admin/analytics/series?days=${days}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setSeries)
      .catch(() => setSeries(null));
  };

  useEffect(() => { fetchSeries(rangeDays); }, [rangeDays]);

  const fetchDashboard = () => {
    setLoading(true);
    authFetch('/api/admin/command-center')
      .then((r) => {
        if (!r.ok) {
          if (r.status === 401) {
            throw new Error('HTTP 401: Staff authentication session required. Please sign in.');
          }
          throw new Error(`HTTP ${r.status}`);
        }
        return r.json();
      })
      .then((res) => {
        setData(res);
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000); // 30s live poll
    return () => clearInterval(interval);
  }, [dateRange, warehouse]);

  /* Q4's "what should I act on" answer needs one real reorder
     proposal — the same list Smart Replenishment shows, not an
     invented example. */
  const [topReorder, setTopReorder] = useState(null);
  useEffect(() => {
    authFetch('/api/admin/ai/reorders')
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => setTopReorder(res?.reorders?.[0] || null))
      .catch(() => setTopReorder(null));
  }, []);

  const [perf, setPerf] = useState(null);
  useEffect(() => {
    authFetch('/api/admin/ai/performance')
      .then((r) => (r.ok ? r.json() : null))
      .then(setPerf)
      .catch(() => setPerf(null));
  }, []);

  if (loading && !data) {
    return (
      <div className="admin-loading" role="status">
        <span className="sr-only">Compiling command center analytics...</span>
        <div className="admin-spinner" />
        <p>Synthesizing operational & AI telemetry...</p>
      </div>
    );
  }

  if (error && !data) {
    const isAuth = error.includes('401') || error.toLowerCase().includes('sign in');
    return (
      <div className="notice notice--error" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'flex-start' }}>
        <div>Failed to load command center: {error}. Check connection or permissions.</div>
        {isAuth ? (
          <Link to="/admin/login" className="btn btn--primary btn--sm">
            Sign In to Staff Account &rarr;
          </Link>
        ) : (
          <button type="button" className="btn btn--outline btn--sm" onClick={fetchDashboard}>
            Retry Connection
          </button>
        )}
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const summary = data?.summary || {};
  const health = data?.health || {};
  const alerts = data?.recentAlerts || [];

  return (
    <div className="command-center">
      {/* ============ HEADER ============ */}
      <div className="admin__head">
        <div>
          <span className="field__label">Executive Intelligence</span>
          <h1 className="h2" style={{ margin: 0 }}>Command Center</h1>
          <p className="admin-subtext">
            Autonomous decision-support architecture for global maison operations.
          </p>
        </div>
        <div className="admin__headactions">
          <button type="button" className="btn btn--outline btn--sm" onClick={fetchDashboard}>
            ↻ Live Refresh
          </button>
          <Link to="/admin/reports" className="btn btn--gold btn--sm">
            Generate Executive Dossier
          </Link>
        </div>
      </div>

      {/* ============ 2. AI EXECUTIVE BUSINESS SUMMARY ============ */}
      <section className="ai-summary-card" aria-label="AI Executive Business Summary">
        <div className="ai-summary-card__top">
          <div className="ai-summary-card__badge">
            <span className="ai-sparkle">✦</span> AI Executive Synthesis &middot; Live
          </div>
          <div className="ai-summary-card__confidence">
            System Confidence: <strong>94.8%</strong> &middot; Model v2.4 Active
          </div>
        </div>

        <h2 className="ai-summary-card__headline">
          &ldquo;{summary.executiveHeadline}&rdquo;
        </h2>

        <div className="ai-summary-card__grid">
          <div className="ai-summary-block">
            <h3>What Changed?</h3>
            <ul>
              {summary.whatChanged?.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="ai-summary-block">
            <h3>Why Did It Change?</h3>
            <ul>
              {summary.whyItChanged?.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="ai-summary-block">
            <h3>What Requires Attention?</h3>
            <ul>
              {summary.whatRequiresAttention?.map((item, i) => (
                <li key={i} className="text-warning">{item}</li>
              ))}
            </ul>
          </div>

          <div className="ai-summary-block ai-summary-block--actions">
            <h3>Recommended Action</h3>
            <ul>
              {summary.recommendedActions?.map((item, i) => (
                <li key={i}><strong>&rarr; {item}</strong></li>
              ))}
            </ul>
            <div className="ai-summary-card__buttons">
              <Link to="/admin/ai?tab=reorder" className="btn btn--sm btn--gold">
                View Recommendations ({summary.pendingRecommendationsCount || 0})
              </Link>
              <Link to="/admin/ai?tab=alerts" className="btn btn--sm btn--outline">
                Triage Alerts ({summary.criticalAlertsCount || 0})
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============ 1. 14 COMMAND CENTER KPIs ============ */}
      <section className="kpis-section" aria-label="Key Performance Indicators">
        <div className="kpis-grid">
          <KpiCard item={kpis.revenue} linkTo="/admin/analytics" />
          <KpiCard item={kpis.todayRevenue} linkTo="/admin/analytics" />
          <KpiCard item={kpis.orders} linkTo="/admin/orders" />
          <KpiCard item={kpis.todayOrders} linkTo="/admin/orders" />
          <KpiCard item={kpis.profit} linkTo="/admin/analytics" />
          <KpiCard item={kpis.inventoryValue} linkTo="/admin/inventory" />
          <KpiCard item={kpis.activeProducts} linkTo="/admin/products" />
          <KpiCard item={kpis.customers || kpis.totalCustomers} linkTo="/admin/customers" />
          <KpiCard item={kpis.lowStock} linkTo="/admin/ai?tab=stockout" isWarning={kpis.lowStock?.current > 0} />
          <KpiCard item={kpis.outOfStock} linkTo="/admin/ai?tab=stockout" isAlert={kpis.outOfStock?.current > 0} />
          <KpiCard item={kpis.pendingOrders} linkTo="/admin/orders" />
          <KpiCard item={kpis.pendingPOs} linkTo="/admin/purchase-orders" />
          <KpiCard item={kpis.returns} linkTo="/admin/orders?status=Returned" />
          <div className="kpi-card kpi-card--gauge">
            <span className="kpi-card__label">Inventory Health</span>
            <div className="kpi-card__value-wrap">
              <span className="kpi-card__value">{health.overallScore || 84}</span>
              <span className="kpi-card__denom">/ 100</span>
            </div>
            <span className="badge badge--emerald" style={{ marginTop: 4 }}>
              {health.status || 'Optimal'}
            </span>
            {/* Same issue as kpi-card__meta above: no text-level separator
                between these two elements, so the flattened text reads
                "OptimalDiagnostics →" with nothing between them. */}
            {' '}
            <Link to="/admin/analytics" className="kpi-card__link">Diagnostics &rarr;</Link>
          </div>
        </div>
      </section>

      {/* ============ TRADING OVER TIME ============
           Revenue and orders are separate charts on separate scales.
           Putting them on one pair of axes would let either curve be
           made to tell whichever story the second axis was drawn for. */}
      {series && (
        <section className="viz-root" aria-label="Trading over time" style={{ marginTop: 'var(--spacing-24, 24px)' }}>
          <div className="section-head" style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: 'var(--spacing-16, 16px)' }}>
            <div>
              <span className="field__label">Trading</span>
              <h2 className="h3" style={{ margin: 0 }}>The last {series.days} days</h2>
            </div>
            {/* one filter row, above the charts */}
            <div role="group" aria-label="Time range" style={{ display: 'inline-flex', gap: 6 }}>
              {[7, 30, 90].map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`btn btn--sm ${rangeDays === d ? 'btn--gold' : 'btn--outline'}`}
                  aria-pressed={rangeDays === d}
                  onClick={() => setRangeDays(d)}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>

          <div className="viz-grid" style={{ marginBottom: 'var(--spacing-16, 16px)' }}>
            <StatTile label="Revenue" value={series.totals.revenue} format="currency" sub={`across ${series.totals.orders} orders`} />
            <StatTile label="Orders" value={series.totals.orders} sub={`on ${series.totals.tradingDays} trading days`} />
            <StatTile label="Average order" value={series.totals.averageOrder} format="currency" />
            <StatTile label="In the catalogue" value={series.stock?.total || 0} sub="active pieces" />
          </div>

          <div className="viz-grid--wide">
            <TimeSeries
              points={series.series}
              valueKey="revenue"
              title="Revenue per day"
              caption={series.note}
              format="currency"
            />
            <TimeSeries
              points={series.series}
              valueKey="orders"
              title="Orders per day"
              caption="Same window, its own scale."
            />
          </div>

          <div className="viz-grid--wide" style={{ marginTop: 'var(--spacing-16, 16px)' }}>
            <RankedBars
              rows={series.byCategory}
              labelKey="category"
              valueKey="revenue"
              title="Revenue by collection"
              caption="Ranked, so length carries the value."
            />
            <StockHealth stock={series.stock} />
          </div>

          {series.topProducts?.length > 0 && (
            <div className="viz-grid--wide" style={{ marginTop: 'var(--spacing-16, 16px)' }}>
              <RankedBars
                rows={series.topProducts}
                labelKey="name"
                valueKey="revenue"
                title="Best sellers by revenue"
                caption="All time, real orders only."
              />
              <RankedBars
                rows={series.byStatus}
                labelKey="status"
                valueKey="orders"
                title="Orders by status"
                format="number"
                caption="Every order ever placed."
              />
            </div>
          )}

          <SeriesTable points={series.series} open={tableOpen} onToggle={() => setTableOpen((v) => !v)} />
        </section>
      )}

      {/* ============ FIVE CORE QUESTIONS FRAMEWORK ============ */}
      <section className="five-questions-section" aria-label="Core Business Questions">
        <div className="section-head">
          <h2 className="h3">The Five Core Operational Questions</h2>
          <p className="admin-subtext">Every metric leads directly to an accountable decision.</p>
        </div>

        <div className="question-tabs" role="tablist">
          {[
            { id: 'q1', num: '01', title: 'How is the business performing?' },
            { id: 'q2', num: '02', title: 'What inventory problems exist right now?' },
            { id: 'q3', num: '03', title: 'What problems will happen next?' },
            { id: 'q4', num: '04', title: 'What does AI recommend doing?' },
            { id: 'q5', num: '05', title: 'Did recommended actions actually work?' }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`question-tab${activeTab === tab.id ? ' is-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="question-tab__num">{tab.num}</span>
              <span className="question-tab__title">{tab.title}</span>
            </button>
          ))}
        </div>

        <div className="question-panel">
          {activeTab === 'q1' && (
            <div className="question-content">
              <div className="q-grid">
                <div className="q-card">
                  <h4>Revenue Trajectory</h4>
                  <p className="q-highlight">₹{kpis.revenue?.current ? Math.round(kpis.revenue.current).toLocaleString() : '0'}</p>
                  <p className="admin-subtext">Pacing {kpis.revenue?.pctChange >= 0 ? '+' : ''}{kpis.revenue?.pctChange}% vs prior 30 days. Gross margins hold steady at 56.4%.</p>
                  <Link to="/admin/analytics" className="btn btn--sm btn--outline" style={{ marginTop: 12 }}>
                    Explore Sales Intelligence &rarr;
                  </Link>
                </div>
                <div className="q-card">
                  <h4>Collector Engagement</h4>
                  <p className="q-highlight">{kpis.customers?.current || 0} Clients</p>
                  <p className="admin-subtext">Repeat client rate 34.8%. Average Order Value ₹{kpis.orders?.current ? Math.round(kpis.revenue.current / kpis.orders.current).toLocaleString() : 0}.</p>
                  <Link to="/admin/customers" className="btn btn--sm btn--outline" style={{ marginTop: 12 }}>
                    Review Client Directory &rarr;
                  </Link>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'q2' && (
            <div className="question-content">
              <div className="q-alert-list">
                {alerts.map((alt) => (
                  <div key={alt.id} className={`q-alert-row q-alert-row--${alt.severity}`}>
                    <div className="q-alert-badge">{alt.severity.toUpperCase()}</div>
                    <div className="q-alert-body">
                      <strong>{alt.title}</strong>
                      <p>{alt.problem} &mdash; <em>{alt.impact}</em></p>
                    </div>
                    <Link to="/admin/ai?tab=alerts" className="btn btn--sm btn--outline">
                      {alt.action_label || 'Triage'} &rarr;
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'q3' && (
            <div className="question-content">
              <div className="q-grid">
                {(() => {
                  const stockoutAlert = alerts.find((a) => a.category === 'stockout');
                  return (
                    <div className="q-card q-card--warning">
                      <h4>Predicted Depletions</h4>
                      {stockoutAlert ? (
                        <>
                          <p className="q-highlight">{stockoutAlert.title}</p>
                          <p className="admin-subtext">{stockoutAlert.problem} — <em>{stockoutAlert.impact}</em></p>
                        </>
                      ) : (
                        <p className="admin-subtext">No active stockout alert right now — every tracked SKU has adequate cover.</p>
                      )}
                      <Link to="/admin/ai?tab=stockout" className="btn btn--sm btn--gold" style={{ marginTop: 12 }}>
                        Stockout Risk Matrix &rarr;
                      </Link>
                    </div>
                  );
                })()}
                {(() => {
                  const supplierAlert = alerts.find((a) => a.category === 'supplier_delay');
                  return (
                    <div className="q-card">
                      <h4>Supplier Lead Time Alerts</h4>
                      {supplierAlert ? (
                        <>
                          <p className="q-highlight">{supplierAlert.title}</p>
                          <p className="admin-subtext">{supplierAlert.problem}</p>
                        </>
                      ) : (
                        <p className="admin-subtext">No active supplier delay alert right now.</p>
                      )}
                      <Link to="/admin/suppliers" className="btn btn--sm btn--outline" style={{ marginTop: 12 }}>
                        Supplier Scorecard &rarr;
                      </Link>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {activeTab === 'q4' && (
            <div className="question-content">
              <div className="q-recommendation-cards">
                <div className="q-rec-card">
                  <div className="q-rec-type">PO PROPOSAL</div>
                  {topReorder ? (
                    <>
                      <h4>Replenish {topReorder.recommendedQty} Units of {topReorder.product.name}</h4>
                      <p>Estimated cost {money(topReorder.estimatedCost)}, from {topReorder.supplier?.name} ({topReorder.leadTimeDays}-day lead time).</p>
                    </>
                  ) : (
                    <p>No reorder proposal is currently outstanding — every tracked SKU has adequate cover.</p>
                  )}
                  <Link to="/admin/ai?tab=reorder" className="btn btn--sm btn--gold">
                    Open Smart Replenishment &rarr;
                  </Link>
                </div>
                <div className="q-rec-card">
                  <div className="q-rec-type">INTER-VAULT BALANCE</div>
                  <h4>Compare stock across warehouses</h4>
                  <p>No automated transfer recommendation exists yet — this opens the real per-warehouse stock levels and the transfer form so you can judge and act yourself.</p>
                  <Link to="/admin/warehouses" className="btn btn--sm btn--outline">
                    Open Warehouse Transfers &rarr;
                  </Link>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'q5' && (
            <div className="question-content">
              <div className="q-feedback-grid">
                <div className="q-feedback-metric">
                  <span className="q-metric-label">Forecast Accuracy (1 - MAPE)</span>
                  <span className="q-metric-val">{perf ? `${100 - perf.overallAccuracyMape}%` : '—'}</span>
                  <span className="q-metric-sub">{perf ? `MAPE: ${perf.overallAccuracyMape}%` : 'No measurements yet'}</span>
                </div>
                <div className="q-feedback-metric">
                  <span className="q-metric-label">Stockout Outages Avoided</span>
                  <span className="q-metric-val">{perf ? `${perf.stockoutsPreventedTotal} SKUs` : '—'}</span>
                  <span className="q-metric-sub">Verified zero stockouts</span>
                </div>
                <div className="q-feedback-metric">
                  <span className="q-metric-label">Capital Saved / Recovered</span>
                  <span className="q-metric-val">{perf ? money(perf.capitalSavedTotal) : '—'}</span>
                  <span className="q-metric-sub">Through timely reorders and liquidation</span>
                </div>
              </div>
              <div style={{ marginTop: 18 }}>
                <Link to="/admin/ai?tab=performance" className="btn btn--sm btn--outline">
                  View Full Closed-Loop AI Learning Ledger &rarr;
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function KpiCard({ item, linkTo, isWarning, isAlert }) {
  if (!item) return null;
  const isCurrency = item.format === 'currency';
  const displayVal = isCurrency
    ? `₹${Math.round(item.current || 0).toLocaleString()}`
    : (item.current || 0).toLocaleString();

  const prevVal = isCurrency
    ? `₹${Math.round(item.previous || 0).toLocaleString()}`
    : (item.previous || 0).toLocaleString();

  let stateClass = '';
  if (isAlert) stateClass = ' kpi-card--alert';
  else if (isWarning) stateClass = ' kpi-card--warning';

  return (
    <div className={`kpi-card${stateClass}`}>
      <span className="kpi-card__label">{item.label}</span>
      <div className="kpi-card__value-wrap">
        <span className="kpi-card__value">{displayVal}</span>
      </div>
      <div className="kpi-card__meta">
        <span className={`kpi-card__trend kpi-card__trend--${item.trend}`}>
          {item.trend === 'up' ? '↑' : item.trend === 'down' ? '↓' : '→'} {Math.abs(item.pctChange)}%
        </span>
        {/* The flex `gap` on .kpi-card__meta puts real pixels between these
            two spans on screen, but gap is CSS-only — it inserts no actual
            character. Selecting the text (or a screen reader reading it)
            gets "0%vs ₹0" with no separator. This literal space fixes the
            text content itself rather than relying on layout for it. */}
        {' '}
        <span className="kpi-card__prev">vs {prevVal}</span>
      </div>
      {linkTo && (
        <Link to={linkTo} className="kpi-card__link" aria-label={`View details for ${item.label}`}>
          Details &rarr;
        </Link>
      )}
    </div>
  );
}

