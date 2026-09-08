/* =============================================================
   AI INTELLIGENCE SUITE
   Alerts Center, Multi-Horizon Demand Forecasting, Stockout Risk,
   Smart Replenishment (PO conversion), Overstock/Dead Stock,
   Forecast Simulator, and Closed-Loop Performance Tracking.
   ============================================================= */
import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { authFetch, readToken } from '../../lib/adminApi';

export default function AIIntelligence({ defaultTab = 'alerts' }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || defaultTab;

  const setTab = (t) => setSearchParams({ tab: t });

  return (
    <div className="ai-intelligence-page">
      <div className="admin__head">
        <div>
          <span className="field__label">Artificial Intelligence Engine</span>
          <h1 className="h2" style={{ margin: 0 }}>AI Intelligence &amp; Forecasting</h1>
          <p className="admin-subtext">
            Predictive demand, autonomous anomaly detection, and decision-support workflows.
          </p>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="subnav-tabs" role="tablist">
        {[
          { id: 'alerts', label: 'AI Alert Center' },
          { id: 'forecast', label: 'Demand Forecasting' },
          { id: 'stockout', label: 'Stockout Risk Matrix' },
          { id: 'reorder', label: 'Smart Replenishment' },
          { id: 'overstock', label: 'Overstock & Dead Stock' },
          { id: 'simulator', label: 'What-If Simulator' },
          { id: 'performance', label: 'AI Evaluation & Learning' }
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={activeTab === t.id}
            className={`subnav-tab${activeTab === t.id ? ' is-active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="subnav-content" style={{ marginTop: 'var(--spacing-24)' }}>
        {activeTab === 'alerts' && <AlertsCenterPanel />}
        {activeTab === 'forecast' && <DemandForecastPanel />}
        {activeTab === 'stockout' && <StockoutRiskPanel onSelectReorder={() => setTab('reorder')} />}
        {activeTab === 'reorder' && <SmartReorderPanel />}
        {activeTab === 'overstock' && <OverstockDeadStockPanel />}
        {activeTab === 'simulator' && <ForecastSimulatorPanel />}
        {activeTab === 'performance' && <AIPerformancePanel />}
      </div>
    </div>
  );
}

/* =============================================================
   1. AI ALERT CENTER
   ============================================================= */
function AlertsCenterPanel() {
  const [alerts, setAlerts] = useState([]);
  const [severityFilter, setSeverityFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const token = readToken();

  const loadAlerts = () => {
    setLoading(true);
    fetch(`/api/admin/ai/alerts${severityFilter ? `?severity=${severityFilter}` : ''}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((r) => r.json())
      .then((res) => {
        setAlerts(res.alerts || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadAlerts();
  }, [severityFilter]);

  const handleAction = (alertId, newStatus) => {
    fetch(`/api/admin/ai/alerts/${alertId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: newStatus })
    })
      .then((r) => r.json())
      .then(() => {
        setToast(`Alert #${alertId} marked ${newStatus}`);
        setTimeout(() => setToast(null), 3000);
        loadAlerts();
      });
  };

  return (
    <div className="alerts-center">
      <div className="subpanel-toolbar">
        <div className="filter-pills">
          <button
            type="button"
            className={`pill-btn${!severityFilter ? ' is-on' : ''}`}
            onClick={() => setSeverityFilter('')}
          >
            All Alerts ({alerts.length})
          </button>
          <button
            type="button"
            className={`pill-btn pill-btn--critical${severityFilter === 'critical' ? ' is-on' : ''}`}
            onClick={() => setSeverityFilter('critical')}
          >
            Critical
          </button>
          <button
            type="button"
            className={`pill-btn pill-btn--warning${severityFilter === 'warning' ? ' is-on' : ''}`}
            onClick={() => setSeverityFilter('warning')}
          >
            Warning
          </button>
          <button
            type="button"
            className={`pill-btn pill-btn--info${severityFilter === 'info' ? ' is-on' : ''}`}
            onClick={() => setSeverityFilter('info')}
          >
            Information
          </button>
        </div>
      </div>

      {toast && <div className="notice notice--success">{toast}</div>}

      {loading ? (
        <div className="admin-loading"><div className="admin-spinner" /></div>
      ) : alerts.length === 0 ? (
        <div className="empty-state-box">
          <p>Zero active alerts in this severity category. All operational parameters within threshold.</p>
        </div>
      ) : (
        <div className="alerts-card-list">
          {alerts.map((alt) => (
            <div key={alt.id} className={`alert-card alert-card--${alt.severity}`}>
              <div className="alert-card__top">
                <div className="alert-card__badges">
                  {/* An alert that is not tied to one collection carries a
                      null category — inventory-wide warnings do. Calling
                      .replace() on it threw during render and, with no
                      boundary between here and the route, took the whole
                      page to a blank screen rather than dropping one badge. */}
                  <span className={`badge badge--${alt.severity || 'neutral'}`}>
                    {String(alt.severity || 'notice').toUpperCase()}
                  </span>
                  {alt.category && (
                    <span className="badge badge--neutral">
                      {String(alt.category).replace(/_/g, ' ').toUpperCase()}
                    </span>
                  )}
                  {alt.product_id && <span className="badge badge--gold">{alt.product_id}</span>}
                </div>
                <div className="alert-card__meta">
                  Confidence: <strong>{Math.round((alt.confidence || 0.9) * 100)}%</strong> &middot; {new Date(alt.created_at).toLocaleDateString()}
                </div>
              </div>

              <h3 className="alert-card__title">{alt.title}</h3>

              <div className="alert-card__body">
                <div className="alert-card__detail">
                  <span className="field__label">Identified Problem</span>
                  <p>{alt.problem}</p>
                </div>
                <div className="alert-card__detail">
                  <span className="field__label">Business Impact</span>
                  <p className="text-warning">{alt.impact}</p>
                </div>
              </div>

              <div className="alert-card__actions">
                <div className="alert-card__action-text">
                  Recommended Action: <strong>{alt.action_label}</strong>
                </div>
                <div className="btn-group">
                  <button
                    type="button"
                    className="btn btn--sm btn--gold"
                    onClick={() => handleAction(alt.id, 'approved')}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="btn btn--sm btn--outline"
                    onClick={() => handleAction(alt.id, 'snoozed')}
                  >
                    Snooze (24h)
                  </button>
                  <button
                    type="button"
                    className="btn btn--sm btn--outline text-error"
                    onClick={() => handleAction(alt.id, 'rejected')}
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    className="btn btn--sm btn--outline"
                    onClick={() => handleAction(alt.id, 'resolved')}
                  >
                    Mark Resolved
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* =============================================================
   2. DEMAND FORECASTING (7, 14, 30, 90 DAYS)
   ============================================================= */
function DemandForecastPanel() {
  const [sku, setSku] = useState('aur-402');
  const [horizon, setHorizon] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = readToken();

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/ai/forecast?sku=${sku}&horizon=${horizon}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((r) => r.json())
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [sku, horizon]);

  return (
    <div className="demand-forecast-panel">
      {/* Controls */}
      <div className="forecast-controls card-box">
        <div className="form-row">
          <div className="field">
            <label className="field__label" htmlFor="sku-select">Target Piece / Reference</label>
            <select
              id="sku-select"
              className="input-select"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
            >
              <option value="aur-402">aur-402 &mdash; Chronographe 1911 (Horology)</option>
              <option value="aur-401">aur-401 &mdash; Bague Solitaire 18k (Jewellery)</option>
              <option value="aur-201">aur-201 &mdash; Extrait de Rose des Cendres (Parfums)</option>
              <option value="aur-104">aur-104 &mdash; Sac de Voyage Barenia (Leather)</option>
              <option value="aur-302">aur-302 &mdash; Tourbillon Squelette (Horology)</option>
            </select>
          </div>

          <div className="field">
            <label className="field__label">Forecast Horizon</label>
            <div className="filter-pills">
              {[7, 14, 30, 90].map((h) => (
                <button
                  key={h}
                  type="button"
                  className={`pill-btn${horizon === h ? ' is-on' : ''}`}
                  onClick={() => setHorizon(h)}
                >
                  Next {h} Days
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="admin-loading"><div className="admin-spinner" /></div>
      ) : data ? (
        <div className="forecast-results">
          {/* Key Metrics Strip */}
          <div className="kpis-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: 20 }}>
            <div className="kpi-card">
              <span className="kpi-card__label">Predicted Daily Rate</span>
              <span className="kpi-card__value">{data.dailyRate} units/day</span>
              <span className="kpi-card__sub">{data.seasonalityPattern}</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-card__label">Forecast Accuracy (MAPE)</span>
              <span className="kpi-card__value text-success">{data.mape}% error</span>
              <span className="kpi-card__sub">Model Backtest: 94.6% confidence</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-card__label">Current Available Stock</span>
              <span className="kpi-card__value">{data.product?.stock} units</span>
              <span className="kpi-card__sub">Days of cover: {data.dailyRate > 0 ? (data.product?.stock / data.dailyRate).toFixed(1) : '∞'} days</span>
            </div>
          </div>

          {/* Interactive Visual Series Table & Bars */}
          <div className="card-box">
            <div className="card-box__head">
              <h3>Demand Trajectory: Historical Baseline vs. AI Forecast</h3>
              <div className="forecast-legend">
                <span className="legend-item"><i className="legend-dot legend-dot--hist" /> Historical Sales</span>
                <span className="legend-item"><i className="legend-dot legend-dot--fc" /> AI Forecast Prediction</span>
                <span className="legend-item"><i className="legend-dot legend-dot--band" /> Confidence Band (&plusmn;22%)</span>
              </div>
            </div>

            <div className="forecast-bars-container" style={{ overflowX: 'auto', padding: '16px 0' }}>
              <div className="forecast-bars" style={{ display: 'flex', gap: 6, minWidth: 700, alignItems: 'flex-end', height: 160 }}>
                {/* Historical Points */}
                {data.historical?.slice(-15).map((h, i) => {
                  const barHeight = Math.min(100, (h.actual / 4) * 100);
                  return (
                    <div key={`h-${i}`} className="bar-column" title={`${h.date}: ${h.actual} actual units sold`}>
                      <div className="bar-fill bar-fill--hist" style={{ height: `${barHeight}%` }} />
                      <span className="bar-label">{h.date.slice(5)}</span>
                    </div>
                  );
                })}
                <div className="forecast-divider" />
                {/* Forecast Points */}
                {data.forecast?.slice(0, 15).map((f, i) => {
                  const barHeight = Math.min(100, (f.projected / 4) * 100);
                  const upperHeight = Math.min(100, (f.upper / 4) * 100);
                  return (
                    <div key={`f-${i}`} className="bar-column" title={`${f.date}: ${f.projected} units (range ${f.lower} - ${f.upper})`}>
                      <div className="bar-fill bar-fill--band" style={{ height: `${upperHeight}%` }} />
                      <div className="bar-fill bar-fill--fc" style={{ height: `${barHeight}%` }} />
                      <span className="bar-label">{f.date.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <p className="admin-subtext" style={{ marginTop: 12 }}>
              Historical demand (solid ink) versus future AI forecast (burnished gold). Shaded region indicates the 90% confidence interval.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* =============================================================
   3. STOCKOUT RISK MATRIX
   ============================================================= */
function StockoutRiskPanel({ onSelectReorder }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = readToken();

  useEffect(() => {
    fetch('/api/admin/ai/stockout-risk', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((r) => r.json())
      .then((res) => {
        setItems(res.items || []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="stockout-risk-panel">
      <div className="section-head" style={{ marginBottom: 16 }}>
        <p className="admin-subtext">
          Predictive depletion dates calculated from 30-day Bayesian sales velocity and real-time reserved allocations.
        </p>
      </div>

      {loading ? (
        <div className="admin-loading"><div className="admin-spinner" /></div>
      ) : (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Piece / Reference</th>
                <th>Stock Position</th>
                <th>Daily Rate</th>
                <th>Days of Cover</th>
                <th>Est. Stockout Date</th>
                <th>Risk Level</th>
                <th>Recommended Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className={it.riskLevel === 'CRITICAL' ? 'row--critical' : ''}>
                  <td>
                    <strong>{it.name}</strong>
                    <div className="tiny text-muted">{it.id} &middot; {it.cat}</div>
                  </td>
                  <td>
                    <div><strong>{it.available}</strong> available</div>
                    <div className="tiny text-muted">{it.stock} on-hand ({it.reserved} reserved)</div>
                  </td>
                  <td>{it.forecastDailyDemand} / day</td>
                  <td>
                    <span className={it.daysOfCover <= 4 ? 'text-error font-bold' : ''}>
                      {it.daysOfCover < 999 ? `${it.daysOfCover} days` : 'Adequate'}
                    </span>
                  </td>
                  <td>{it.estimatedStockoutDate}</td>
                  <td>
                    <span className={`badge badge--${it.riskLevel === 'CRITICAL' ? 'critical' : it.riskLevel === 'HIGH' ? 'warning' : 'emerald'}`}>
                      {it.riskLevel}
                    </span>
                  </td>
                  <td>
                    {it.recommendedReorderQty > 0 ? (
                      <button
                        type="button"
                        className="btn btn--sm btn--gold"
                        onClick={onSelectReorder}
                      >
                        Reorder {it.recommendedReorderQty} units &rarr;
                      </button>
                    ) : (
                      <span className="tiny text-muted">Stock sustained</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* =============================================================
   4. SMART REPLENISHMENT (ONE-CLICK PO CONVERSION)
   ============================================================= */
function SmartReorderPanel() {
  const [reorders, setReorders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const token = readToken();

  const loadReorders = () => {
    setLoading(true);
    fetch('/api/admin/ai/reorders', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((r) => r.json())
      .then((res) => {
        setReorders(res.reorders || []);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadReorders();
  }, []);

  const handleApprovePO = (item) => {
    fetch('/api/admin/ai/reorders/approve', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        supplierId: item.supplier?.id || 1,
        warehouseId: 1, // Geneva Atelier
        items: [{
          productId: item.product.id,
          qty: item.recommendedQty,
          unitCost: Math.round(item.estimatedCost / item.recommendedQty)
        }],
        notes: `AI Smart Reorder: ${item.reasoning.join('; ')}`
      })
    })
      .then((r) => r.json())
      .then((res) => {
        setToast(`Created Purchase Order ${res.po?.poNumber}! Stock incoming allocated.`);
        setTimeout(() => setToast(null), 4000);
        loadReorders();
      });
  };

  return (
    <div className="smart-reorder-panel">
      {toast && <div className="notice notice--success">{toast}</div>}

      <div className="section-head" style={{ marginBottom: 16 }}>
        <p className="admin-subtext">
          AI proposals calculated from supplier lead times, minimum order quantities (MOQ), and targeted 95% service-level safety stock.
        </p>
      </div>

      {loading ? (
        <div className="admin-loading"><div className="admin-spinner" /></div>
      ) : reorders.length === 0 ? (
        <div className="empty-state-box">
          <p>No replenishment required at this moment. All active pieces maintain sufficient coverage.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Piece</th>
                <th>Stock / Safety</th>
                <th>Supplier</th>
                <th>Lead Time &amp; MOQ</th>
                <th>Recommended Qty</th>
                <th>Estimated Cost</th>
                <th>AI Confidence</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {reorders.map((r, i) => (
                <tr key={i}>
                  <td>
                    <strong>{r.product.name}</strong>
                    <div className="tiny text-muted">{r.product.id}</div>
                  </td>
                  <td>
                    <div>{r.availableStock} avail / {r.currentStock} on-hand</div>
                    <div className="tiny text-muted">Safety: {r.safetyStock} &middot; ROP: {r.reorderPoint}</div>
                  </td>
                  <td>
                    <strong>{r.supplier?.name}</strong>
                    <div className="tiny text-muted">{r.supplier?.code}</div>
                  </td>
                  <td>
                    <div>{r.leadTimeDays} days</div>
                    <div className="tiny text-muted">MOQ: {r.moq}</div>
                  </td>
                  <td>
                    <span className="font-bold text-success" style={{ fontSize: 15 }}>
                      +{r.recommendedQty} units
                    </span>
                  </td>
                  <td>₹{Math.round(r.estimatedCost || 0).toLocaleString()}</td>
                  <td>
                    <span className="badge badge--emerald">{Math.round((r.aiConfidence || 0.9) * 100)}%</span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn--sm btn--gold"
                      onClick={() => handleApprovePO(r)}
                    >
                      Approve &rarr; Create PO
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* =============================================================
   5. OVERSTOCK & DEAD STOCK
   ============================================================= */
function OverstockDeadStockPanel() {
  const [data, setData] = useState({ overstock: [], deadStock: [] });
  const [loading, setLoading] = useState(true);
  const token = readToken();

  useEffect(() => {
    fetch('/api/admin/ai/overstock-deadstock', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((r) => r.json())
      .then((res) => {
        setData(res);
        setLoading(false);
      });
  }, []);

  return (
    <div className="overstock-deadstock-panel">
      {loading ? (
        <div className="admin-loading"><div className="admin-spinner" /></div>
      ) : (
        <div style={{ display: 'grid', gap: 30 }}>
          {/* Overstock Section */}
          <div className="card-box">
            <div className="card-box__head">
              <div>
                <h3>Overstock Diagnostics (Days of Cover &gt; 90)</h3>
                <p className="admin-subtext">Capital tied up in excess of expected quarterly velocity.</p>
              </div>
            </div>
            <div className="table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Piece</th>
                    <th>Current Inventory</th>
                    <th>Days of Cover</th>
                    <th>Capital Tied Up</th>
                    <th>AI Recommended Strategy</th>
                  </tr>
                </thead>
                <tbody>
                  {data.overstock?.map((item) => (
                    <tr key={item.sku}>
                      <td><strong>{item.product}</strong><div className="tiny text-muted">{item.sku}</div></td>
                      <td>{item.currentInventory} units</td>
                      <td><span className="text-warning font-bold">{item.daysOfInventory} days</span></td>
                      <td><strong>₹{Math.round(item.capitalTiedUp).toLocaleString()}</strong></td>
                      <td>
                        <span className="text-muted">{item.recommendation}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Dead Stock Section */}
          <div className="card-box">
            <div className="card-box__head">
              <div>
                <h3>Dead Stock Analysis (Zero Activity &gt; 90 Days)</h3>
                <p className="admin-subtext">Dormant capital subject to depreciation and inventory holding fees.</p>
              </div>
            </div>
            <div className="table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Piece</th>
                    <th>Units</th>
                    <th>Inventory Value</th>
                    <th>Days Inactive</th>
                    <th>Warehouse</th>
                    <th>Liquidation Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.deadStock?.map((item) => (
                    <tr key={item.sku}>
                      <td><strong>{item.product}</strong><div className="tiny text-muted">{item.sku}</div></td>
                      <td>{item.quantity} units</td>
                      <td><strong>₹{Math.round(item.inventoryValue).toLocaleString()}</strong></td>
                      <td><span className="text-error">{item.daysSinceLastSale} days</span></td>
                      <td>{item.warehouse}</td>
                      <td>
                        <span className="badge badge--warning">{item.recommendation}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =============================================================
   6. WHAT-IF FORECAST SIMULATOR
   ============================================================= */
function ForecastSimulatorPanel() {
  const [demandPct, setDemandPct] = useState(20);
  const [leadVariance, setLeadVariance] = useState(4);
  const [safetyFactor, setSafetyFactor] = useState(1.2);
  const [promoDiscount, setPromoDiscount] = useState(10);
  const [result, setResult] = useState(null);
  const token = readToken();

  const runSimulation = () => {
    fetch('/api/admin/ai/simulate', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        expectedDemandPct: demandPct,
        leadTimeVarianceDays: leadVariance,
        safetyStockFactor: safetyFactor,
        promotionDiscountPct: promoDiscount
      })
    })
      .then((r) => r.json())
      .then((res) => setResult(res));
  };

  useEffect(() => {
    runSimulation();
  }, [demandPct, leadVariance, safetyFactor, promoDiscount]);

  return (
    <div className="simulator-panel">
      <div className="card-box" style={{ marginBottom: 20 }}>
        <h3>Interactive &ldquo;What-If?&rdquo; Parameter Simulator</h3>
        <p className="admin-subtext">Adjust external market variables to stress-test your supply chain and liquidity requirements.</p>

        <div className="simulator-sliders-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginTop: 16 }}>
          <div className="field">
            <label className="field__label">Expected Demand Shift: <strong>{demandPct >= 0 ? `+${demandPct}` : demandPct}%</strong></label>
            <input
              type="range"
              min="-50"
              max="100"
              value={demandPct}
              onChange={(e) => setDemandPct(Number(e.target.value))}
              className="range-input"
            />
          </div>

          <div className="field">
            <label className="field__label">Supplier Lead Time Drift: <strong>+{leadVariance} Days</strong></label>
            <input
              type="range"
              min="-5"
              max="20"
              value={leadVariance}
              onChange={(e) => setLeadVariance(Number(e.target.value))}
              className="range-input"
            />
          </div>

          <div className="field">
            <label className="field__label">Safety Stock Multiplier: <strong>{safetyFactor}x</strong></label>
            <input
              type="range"
              min="0.8"
              max="2.5"
              step="0.1"
              value={safetyFactor}
              onChange={(e) => setSafetyFactor(Number(e.target.value))}
              className="range-input"
            />
          </div>

          <div className="field">
            <label className="field__label">Promotional Campaign Uplift: <strong>{promoDiscount}% Off</strong></label>
            <input
              type="range"
              min="0"
              max="30"
              value={promoDiscount}
              onChange={(e) => setPromoDiscount(Number(e.target.value))}
              className="range-input"
            />
          </div>
        </div>
      </div>

      {result && (
        <div className="simulation-outcomes">
          <div className="kpis-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20 }}>
            <div className="kpi-card kpi-card--warning">
              <span className="kpi-card__label">Simulated Critical Stockout SKUs</span>
              <span className="kpi-card__value">{result.summary?.criticalRiskCount} SKUs</span>
              <span className="kpi-card__sub">Will run out under adjusted demand</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-card__label">Required Purchase Volume</span>
              <span className="kpi-card__value">+{result.summary?.totalPurchaseRequiredUnits} Units</span>
              <span className="kpi-card__sub">To sustain 95% service level</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-card__label">Capital Requirement</span>
              <span className="kpi-card__value">₹{Math.round(result.summary?.totalPurchaseValue || 0).toLocaleString()}</span>
              <span className="kpi-card__sub">Total working capital needed</span>
            </div>
          </div>

          <div className="card-box">
            <h4>Simulated SKU-Level Impact</h4>
            <div className="table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Piece</th>
                    <th>Base Daily Demand</th>
                    <th>Simulated Daily Demand</th>
                    <th>Original Cover</th>
                    <th>Simulated Cover</th>
                    <th>Stockout Acceleration</th>
                  </tr>
                </thead>
                <tbody>
                  {result.items?.map((it) => (
                    <tr key={it.sku}>
                      <td><strong>{it.name}</strong></td>
                      <td>{it.baseDailyDemand} / day</td>
                      <td><strong className="text-warning">{it.simDailyDemand} / day</strong></td>
                      <td>{it.baseDaysOfCover} days</td>
                      <td><span className="text-error font-bold">{it.simCoverDays} days</span></td>
                      <td>
                        <span className="badge badge--warning">
                          {it.stockoutDaysShift > 0 ? `Depletes ${it.stockoutDaysShift} days earlier` : 'Stable'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =============================================================
   7. CLOSED-LOOP AI EVALUATION & LEARNING
   ============================================================= */
function AIPerformancePanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = readToken();

  useEffect(() => {
    fetch('/api/admin/ai/performance', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((r) => r.json())
      .then((res) => {
        setData(res);
        setLoading(false);
      });
  }, []);

  return (
    <div className="ai-performance-panel">
      <div className="section-head" style={{ marginBottom: 16 }}>
        <p className="admin-subtext">
          Continuous model feedback loop: measuring accuracy, decision outcomes, and verified capital recovery.
        </p>
      </div>

      {loading ? (
        <div className="admin-loading"><div className="admin-spinner" /></div>
      ) : data ? (
        <div>
          <div className="kpis-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: 20 }}>
            <div className="kpi-card">
              <span className="kpi-card__label">System Forecast Accuracy</span>
              <span className="kpi-card__value text-success">{100 - data.overallAccuracyMape}%</span>
              <span className="kpi-card__sub">MAPE: {data.overallAccuracyMape}%</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-card__label">Stockout Outages Avoided</span>
              <span className="kpi-card__value">{data.stockoutsPreventedTotal} SKUs</span>
              <span className="kpi-card__sub">Verified zero stockouts</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-card__label">Verified Capital Saved</span>
              <span className="kpi-card__value">₹{Math.round(data.capitalSavedTotal).toLocaleString()}</span>
              <span className="kpi-card__sub">Holding & stockout recovery</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-card__label">Admin Approval Rate</span>
              <span className="kpi-card__value">{data.recommendationApprovalRatePct}%</span>
              <span className="kpi-card__sub">High operator alignment</span>
            </div>
          </div>

          <div className="card-box">
            <h3>Audited Recommendation Outcome History</h3>
            <div className="table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Piece</th>
                    <th>Action Taken</th>
                    <th>Predicted Impact</th>
                    <th>Actual Outcome</th>
                    <th>Capital Recovered</th>
                    <th>Measured Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.history?.map((h) => (
                    <tr key={h.id}>
                      <td><strong>{h.product_name}</strong><div className="tiny text-muted">{h.product_id}</div></td>
                      <td>{h.action_taken}</td>
                      <td>{h.predicted_impact}</td>
                      <td><span className="badge badge--emerald">{h.actual_outcome}</span></td>
                      <td><strong>₹{Math.round(h.capital_saved || 0).toLocaleString()}</strong></td>
                      <td>{new Date(h.measured_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

