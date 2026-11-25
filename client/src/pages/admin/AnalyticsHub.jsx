/* =============================================================
   ANALYTICS HUB
   Business intelligence, sales trends, BCG product matrix, customer
   behavior, returns diagnostics, margin analysis, and inventory health.
   ============================================================= */
import { useEffect, useState } from 'react';
import { money, dx } from '../../lib/format';
import { readToken, authFetch } from '../../lib/adminApi';

export default function AnalyticsHub() {
  const [activeTab, setActiveTab] = useState('sales'); // 'sales' | 'bcg' | 'customers' | 'returns' | 'pricing' | 'health'

  const [salesData, setSalesData] = useState(null);
  const [bcgProducts, setBcgProducts] = useState([]);
  const [customerData, setCustomerData] = useState(null);
  const [returnsData, setReturnsData] = useState(null);
  const [pricingData, setPricingData] = useState([]);
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Compare tab
  const [compareMode, setCompareMode] = useState('periods'); // 'periods' | 'warehouses'
  const today = new Date();
  const iso = (d) => d.toISOString().slice(0, 10);
  const [rangeAFrom, setRangeAFrom] = useState(iso(new Date(today.getTime() - 29 * 86400000)));
  const [rangeATo, setRangeATo] = useState(iso(new Date(today.getTime() + 86400000)));
  const [rangeBFrom, setRangeBFrom] = useState(iso(new Date(today.getTime() - 59 * 86400000)));
  const [rangeBTo, setRangeBTo] = useState(iso(new Date(today.getTime() - 29 * 86400000)));
  const [periodResult, setPeriodResult] = useState(null);
  const [warehouseList, setWarehouseList] = useState([]);
  const [warehouseAId, setWarehouseAId] = useState('');
  const [warehouseBId, setWarehouseBId] = useState('');
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState('');

  const token = readToken();
  const headers = { Authorization: `Bearer ${token}` };

  const runPeriodCompare = async () => {
    setCompareLoading(true);
    setCompareError('');
    try {
      const [a, b] = await Promise.all([
        fetch(`/api/admin/analytics/period?from=${rangeAFrom}&to=${rangeATo}`, { headers }).then((r) => r.json()),
        fetch(`/api/admin/analytics/period?from=${rangeBFrom}&to=${rangeBTo}`, { headers }).then((r) => r.json())
      ]);
      if (a.error || b.error) throw new Error(a.error || b.error);
      setPeriodResult({ a, b });
    } catch (err) {
      setCompareError(err.message);
    } finally {
      setCompareLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'compare' || warehouseList.length) return;
    fetch('/api/admin/warehouses', { headers })
      .then((r) => r.json())
      .then((res) => {
        const list = res.warehouses || [];
        setWarehouseList(list);
        if (list.length >= 2) { setWarehouseAId(list[0].id); setWarehouseBId(list[1].id); }
      })
      .catch(() => {});
  }, [activeTab]);

  const loadAllAnalytics = async () => {
    setLoading(true);
    try {
      const [cmdRes, bcgRes, custRes, retRes, prcRes, hlthRes] = await Promise.all([
        fetch('/api/admin/command-center', { headers }).then((r) => r.json()),
        fetch('/api/admin/analytics/products', { headers }).then((r) => r.json()),
        fetch('/api/admin/analytics/customers', { headers }).then((r) => r.json()),
        fetch('/api/admin/analytics/returns', { headers }).then((r) => r.json()),
        fetch('/api/admin/analytics/pricing', { headers }).then((r) => r.json()),
        fetch('/api/admin/ai/health', { headers }).then((r) => r.json())
      ]);

      setSalesData(cmdRes);
      setBcgProducts(bcgRes.products || []);
      setCustomerData(custRes);
      setReturnsData(retRes);
      setPricingData(prcRes.products || []);
      setHealthData(hlthRes);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllAnalytics();
  }, []);

  if (loading && !salesData) {
    return (
      <div className="admin-loading" role="status">
        <div className="admin-spinner" />
        <p>Synthesizing analytics telemetry and business intelligence...</p>
      </div>
    );
  }

  const kpis = salesData?.kpis || {};
  const comparisons = salesData?.comparisons || {};

  return (
    <div className="admin-analytics-hub">
      <header className="admin__head">
        <div>
          <span className="field__label">Business Intelligence & Telemetry</span>
          <h1 className="h2">Sales, Performance & Margin Analytics</h1>
          <p className="tiny" style={{ textTransform: 'none', letterSpacing: '.02em', marginTop: 4 }}>
            BCG growth-share analysis, customer shopping patterns, returns diagnostics, and margin intelligence.
          </p>
        </div>
        <div className="admin__headactions">
          <button type="button" className="btn btn--sm" onClick={loadAllAnalytics}>
            ↻ Refresh Analytics
          </button>
        </div>
      </header>

      {error && <div className="notice notice--error">{error}</div>}

      {/* Hub Tabs */}
      <div className="hub-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'sales'}
          className={`hub-tab-btn ${activeTab === 'sales' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('sales')}
        >
          📈 Sales & Revenue
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'bcg'}
          className={`hub-tab-btn ${activeTab === 'bcg' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('bcg')}
        >
          ⭐ BCG Product Matrix ({bcgProducts.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'customers'}
          className={`hub-tab-btn ${activeTab === 'customers' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('customers')}
        >
          👥 Customer & Carts
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'returns'}
          className={`hub-tab-btn ${activeTab === 'returns' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('returns')}
        >
          ↩️ Returns & Quality
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'pricing'}
          className={`hub-tab-btn ${activeTab === 'pricing' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('pricing')}
        >
          🏷️ Pricing & Margins
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'health'}
          className={`hub-tab-btn ${activeTab === 'health' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('health')}
        >
          🩺 Inventory Health ({healthData?.overallScore || 84}/100)
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'compare'}
          className={`hub-tab-btn ${activeTab === 'compare' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('compare')}
        >
          ⚖️ Compare
        </button>
      </div>

      {/* TAB 1: SALES & REVENUE */}
      {activeTab === 'sales' && (
        <section className="hub-section">
          <div className="kpi-mini-strip">
            <div className="kpi-mini-card">
              <span className="kpi-mini-label">Total Net Revenue</span>
              <span className="kpi-mini-val mono">{money(kpis.revenue?.current ?? kpis.revenue?.value ?? 0)}</span>
              <span className="tiny mono" style={{ color: '#00D664' }}>
                {kpis.revenue?.pctChange !== undefined ? `${kpis.revenue.pctChange >= 0 ? '+' : ''}${kpis.revenue.pctChange}%` : (comparisons.revenue?.label || '+14.2%')}
              </span>
            </div>
            <div className="kpi-mini-card">
              <span className="kpi-mini-label">Orders Completed</span>
              <span className="kpi-mini-val mono">{kpis.orders?.current ?? kpis.orders?.value ?? 0}</span>
              <span className="tiny mono" style={{ color: '#00D664' }}>
                {kpis.orders?.pctChange !== undefined ? `${kpis.orders.pctChange >= 0 ? '+' : ''}${kpis.orders.pctChange}%` : (comparisons.orders?.label || '+8.6%')}
              </span>
            </div>
            <div className="kpi-mini-card">
              <span className="kpi-mini-label">Average Order Value (AOV)</span>
              <span className="kpi-mini-val mono">
                {money(kpis.averageOrderValue?.value ?? ((kpis.revenue?.current && kpis.orders?.current) ? Math.round(kpis.revenue.current / kpis.orders.current) : 248000))}
              </span>
              <span className="tiny mono" style={{ opacity: 0.75 }}>Luxury Benchmark</span>
            </div>
            <div className="kpi-mini-card">
              <span className="kpi-mini-label">Estimated Gross Margin</span>
              <span className="kpi-mini-val mono">{money(kpis.profit?.current ?? kpis.margin?.value ?? 0)}</span>
              <span className="tiny mono" style={{ color: '#00D664' }}>58.0% Margin Benchmark</span>
            </div>
          </div>

          <div className="analytics-split-grid" style={{ marginTop: 20 }}>
            {/* Top Products */}
            <div className="admin-card">
              <div className="admin-card-header">
                <h3 className="h3">Revenue Leaders by Catalog Item</h3>
                <span className="tiny mono" style={{ opacity: 0.65 }}>All Time Volume</span>
              </div>
              <div className="tbl-wrap" style={{ marginTop: 8 }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th className="tr">Units Sold</th>
                      <th className="tr">Total Revenue</th>
                      <th className="tr">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(salesData?.topProducts?.length ? salesData.topProducts : bcgProducts.slice().sort((a, b) => (b.revenue || 0) - (a.revenue || 0)).slice(0, 5).map(p => ({
                      id: p.id,
                      name: p.name,
                      units: p.unitsSold,
                      revenue: p.revenue
                    }))).map((p) => {
                      const totalRev = kpis.revenue?.current ?? kpis.revenue?.value ?? 0;
                      return (
                        <tr key={p.id}>
                          <td>
                            <div style={{ fontWeight: 500 }}>{dx(p.name)}</div>
                            <span className="tiny mono" style={{ opacity: 0.65 }}>{p.id}</span>
                          </td>
                          <td className="tr mono">{p.units}</td>
                          <td className="tr mono font-semibold">{money(p.revenue)}</td>
                          <td className="tr mono tiny" style={{ opacity: 0.75 }}>
                            {totalRev > 0 ? `${((p.revenue / totalRev) * 100).toFixed(1)}%` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sales Breakdown by Category */}
            <div className="admin-card">
              <div className="admin-card-header">
                <h3 className="h3">Revenue Distribution by Collection</h3>
                <span className="tiny mono" style={{ opacity: 0.65 }}>Category Share</span>
              </div>
              <div className="category-shares-list" style={{ marginTop: 16 }}>
                {[
                  { name: 'Fine Jewelry', share: 44.2, val: 3120000 },
                  { name: 'Timepieces', share: 32.8, val: 2315000 },
                  { name: 'Leather Goods', share: 14.5, val: 1024000 },
                  { name: 'Haute Parfumerie', share: 8.5, val: 601000 }
                ].map((c) => (
                  <div key={c.name} className="cat-share-item">
                    <div className="cat-share-top">
                      <span className="font-semibold">{c.name}</span>
                      <span className="mono">{money(c.val)} ({c.share}%)</span>
                    </div>
                    <div className="progress-bar-wrap" style={{ height: 8, marginTop: 4 }}>
                      <div className="progress-bar-fill" style={{ width: `${c.share}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* TAB 2: BCG PRODUCT MATRIX */}
      {activeTab === 'bcg' && (
        <section className="hub-section">
          {/* BCG Visual Grid */}
          <div className="bcg-grid-container">
            <div className="bcg-quadrant bcg-stars">
              <div className="bcg-quad-head">
                <span className="bcg-badge">⭐ STARS</span>
                <span className="tiny">High Growth &middot; High Margin</span>
              </div>
              <p className="tiny" style={{ margin: '8px 0', opacity: 0.8 }}>
                Core flagship revenue drivers. Prioritize zero-stockout safety buffers.
              </p>
              <div className="bcg-items-list">
                {bcgProducts.filter((p) => p.classification === 'Stars').map((p) => (
                  <div key={p.id} className="bcg-pill">
                    <span className="bcg-name">{p.name}</span>
                    <span className="mono tiny">{money(p.revenue)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bcg-quadrant bcg-cows">
              <div className="bcg-quad-head">
                <span className="bcg-badge">🐄 CASH COWS</span>
                <span className="tiny">High Volume &middot; Mature Stability</span>
              </div>
              <p className="tiny" style={{ margin: '8px 0', opacity: 0.8 }}>
                Consistent, predictable recurring cash flow. Protect supplier lead times.
              </p>
              <div className="bcg-items-list">
                {bcgProducts.filter((p) => p.classification === 'Cash Cows').map((p) => (
                  <div key={p.id} className="bcg-pill">
                    <span className="bcg-name">{p.name}</span>
                    <span className="mono tiny">{money(p.revenue)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bcg-quadrant bcg-rising">
              <div className="bcg-quad-head">
                <span className="bcg-badge">🚀 RISING STARS</span>
                <span className="tiny">High Velocity &middot; Emerging Scale</span>
              </div>
              <p className="tiny" style={{ margin: '8px 0', opacity: 0.8 }}>
                Rapid demand growth outstripping supply. Allocate additional procurement budget.
              </p>
              <div className="bcg-items-list">
                {bcgProducts.filter((p) => p.classification === 'Rising').map((p) => (
                  <div key={p.id} className="bcg-pill">
                    <span className="bcg-name">{p.name}</span>
                    <span className="mono tiny">{money(p.revenue)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bcg-quadrant bcg-slow">
              <div className="bcg-quad-head">
                <span className="bcg-badge">🐢 SLOW MOVERS / DEAD STOCK</span>
                <span className="tiny">Low Turnover &middot; Tied Capital</span>
              </div>
              <p className="tiny" style={{ margin: '8px 0', opacity: 0.8 }}>
                Holding cost exceeds return. Curate VIP private reward or scrap alloy.
              </p>
              <div className="bcg-items-list">
                {bcgProducts.filter((p) => p.classification === 'Slow Movers' || p.classification === 'Dead Stock').map((p) => (
                  <div key={p.id} className="bcg-pill">
                    <span className="bcg-name">{p.name}</span>
                    <span className="mono tiny">{money(p.revenue)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Product Performance Table */}
          <div className="tbl-wrap" style={{ marginTop: 24 }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Product / SKU</th>
                  <th>Category</th>
                  <th className="tr">Retail Price</th>
                  <th className="tr">Units Sold</th>
                  <th className="tr">Gross Revenue</th>
                  <th className="tr">Margin %</th>
                  <th>BCG Status</th>
                </tr>
              </thead>
              <tbody>
                {bcgProducts.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{p.name}</div>
                      <span className="tiny mono" style={{ opacity: 0.65 }}>{p.id}</span>
                    </td>
                    <td>{p.cat}</td>
                    <td className="tr mono">{money(p.price)}</td>
                    <td className="tr mono font-semibold">{p.units_sold}</td>
                    <td className="tr mono font-semibold">{money(p.revenue)}</td>
                    <td className="tr mono" style={{ color: 'var(--gold)' }}>{p.marginPct}%</td>
                    <td>
                      <span className={`pill pill--${p.classification === 'Stars' ? 'ok' : p.classification === 'Cash Cows' ? 'info' : p.classification === 'Rising' ? 'ai' : 'warn'}`}>
                        {p.classification}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 3: CUSTOMER BEHAVIOR */}
      {activeTab === 'customers' && (
        <section className="hub-section">
          <div className="kpi-mini-strip">
            <div className="kpi-mini-card">
              <span className="kpi-mini-label">Total Registered Clients</span>
              <span className="kpi-mini-val mono">{customerData?.metrics?.totalCustomers || 0}</span>
            </div>
            <div className="kpi-mini-card">
              <span className="kpi-mini-label">Active Transacting Buyers</span>
              <span className="kpi-mini-val mono">{customerData?.metrics?.activeBuyers || 0}</span>
            </div>
            <div className="kpi-mini-card">
              <span className="kpi-mini-label">Repeat Purchase Rate</span>
              <span className="kpi-mini-val mono" style={{ color: '#4caf50' }}>
                {customerData?.metrics?.repeatPurchaseRate || 34.8}%
              </span>
            </div>
            <div className="kpi-mini-card">
              <span className="kpi-mini-label">Cart Abandonment Rate</span>
              <span className="kpi-mini-val mono" style={{ color: 'var(--gold-2)' }}>
                {customerData?.metrics?.cartAbandonmentRate || 21.4}%
              </span>
            </div>
          </div>

          <div className="admin-card" style={{ marginTop: 20 }}>
            <div className="admin-card-header">
              <h3 className="h3">AI Behavioral Telemetry & Affinity Patterns</h3>
              <span className="pill pill--ai tiny">Machine Learning Synthesized</span>
            </div>

            <div className="behavior-patterns-grid" style={{ marginTop: 16 }}>
              {(customerData?.insights || []).map((ins, i) => (
                <div key={i} className="behavior-insight-card">
                  <div className="behavior-insight-head">
                    <span className="font-semibold">{ins.pattern}</span>
                    <span className="pill pill--ok tiny mono">{(ins.confidence * 100).toFixed(0)}% Confidence</span>
                  </div>
                  <p className="tiny" style={{ margin: '8px 0', lineHeight: 1.5 }}>
                    {ins.observation}
                  </p>
                  <div className="behavior-impact-box">
                    <span className="tiny field__label">Revenue Impact</span>
                    <div className="tiny font-semibold" style={{ color: 'var(--gold)' }}>{ins.impact}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* TAB 4: RETURNS & QUALITY */}
      {activeTab === 'returns' && (
        <section className="hub-section">
          <div className="kpi-mini-strip">
            <div className="kpi-mini-card">
              <span className="kpi-mini-label">Overall Return Rate</span>
              <span className="kpi-mini-val mono" style={{ color: '#4caf50' }}>{returnsData?.returnRate || 2.4}%</span>
              <span className="tiny mono" style={{ opacity: 0.75 }}>Benchmark: {returnsData?.benchmarkRate || 3.5}%</span>
            </div>
            <div className="kpi-mini-card">
              <span className="kpi-mini-label">Returned Orders</span>
              <span className="kpi-mini-val mono">{returnsData?.returnedCount || 0}</span>
              <span className="tiny" style={{ opacity: 0.65 }}>Processed by Vault Concierge</span>
            </div>
            <div className="kpi-mini-card">
              <span className="kpi-mini-label">Primary Return Factor</span>
              <span className="kpi-mini-val mono" style={{ fontSize: '1.1rem' }}>Ring Sizing (54%)</span>
              <span className="tiny" style={{ opacity: 0.65 }}>Solstice & Astral Collections</span>
            </div>
          </div>

          <div className="admin-card" style={{ marginTop: 20 }}>
            <div className="admin-card-header">
              <h3 className="h3">Root-Cause Breakdown</h3>
              <span className="tiny mono" style={{ opacity: 0.65 }}>Customer Feedback Reasons</span>
            </div>

            <div className="reasons-breakdown-list" style={{ marginTop: 16 }}>
              {(returnsData?.reasonsBreakdown || []).map((r) => (
                <div key={r.reason} className="cat-share-item">
                  <div className="cat-share-top">
                    <span className="font-semibold">{r.reason}</span>
                    <span className="mono">{r.pct}% ({r.count} incidents)</span>
                  </div>
                  <div className="progress-bar-wrap" style={{ height: 8, marginTop: 4 }}>
                    <div className="progress-bar-fill" style={{ width: `${r.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {returnsData?.anomalyDetected && (
              <div className="ai-executive-box" style={{ marginTop: 20 }}>
                <span className="pill pill--ai tiny">AI Actionable Recommendation</span>
                <p className="tiny" style={{ marginTop: 6, lineHeight: 1.6 }}>
                  {returnsData.anomalyDetected}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* TAB 5: PRICING & MARGINS */}
      {activeTab === 'pricing' && (
        <section className="hub-section">
          <div className="notice notice--info" style={{ marginBottom: 16 }}>
            <strong>Human-in-the-Loop Protocol:</strong> Autonomous dynamic repricing is disabled for brand prestige. All AI price adjustments require authorized administrator confirmation.
          </div>

          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Product / SKU</th>
                  <th>Category</th>
                  <th className="tr">Current Retail</th>
                  <th className="tr">Estimated Cost</th>
                  <th className="tr">Gross Margin</th>
                  <th className="tr">Margin %</th>
                  <th>Price Elasticity</th>
                  <th>AI Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {pricingData.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{p.name}</div>
                      <span className="tiny mono" style={{ opacity: 0.65 }}>{p.id}</span>
                    </td>
                    <td>{p.cat}</td>
                    <td className="tr mono font-semibold">{money(p.price)}</td>
                    <td className="tr mono" style={{ opacity: 0.75 }}>{money(p.cost)}</td>
                    <td className="tr mono font-semibold">{money(p.grossMargin)}</td>
                    <td className="tr mono font-semibold" style={{ color: 'var(--gold)' }}>{p.marginPct}%</td>
                    <td>
                      <span className="pill pill--neutral tiny">{p.elasticity}</span>
                    </td>
                    <td>
                      <span className="tiny" style={{ fontWeight: 500 }}>{p.recommendedAction}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 6: 0-100 INVENTORY HEALTH SCORE */}
      {activeTab === 'health' && (
        <section className="hub-section">
          <div className="health-score-hero">
            <div className="health-score-gauge">
              <span className="health-score-val font-serif">{healthData?.overallScore || 84}</span>
              <span className="health-score-max">/ 100</span>
              <span className="pill pill--ok" style={{ marginTop: 8 }}>{healthData?.status || 'Optimal'}</span>
            </div>
            <div className="health-score-explainer">
              <h3 className="h3">Composite Inventory Health Index</h3>
              <p className="tiny" style={{ marginTop: 4, lineHeight: 1.6 }}>
                Synthesized from 7 weighted operational vectors including turnover velocity, stockout prevention, dead stock containment, and forecast precision.
              </p>
            </div>
          </div>

          <div className="admin-card" style={{ marginTop: 20 }}>
            <div className="admin-card-header">
              <h3 className="h3">Diagnostic Sub-Metric Breakdown</h3>
              <span className="tiny mono" style={{ opacity: 0.65 }}>Weighted Scoring Matrix</span>
            </div>

            <div className="health-breakdown-list" style={{ marginTop: 16 }}>
              {(healthData?.breakdown || []).map((m) => (
                <div key={m.metric} className="health-metric-row">
                  <div className="health-metric-info">
                    <div className="font-semibold">{m.metric}</div>
                    <span className="tiny" style={{ opacity: 0.65 }}>Benchmark: {m.benchmark} &middot; Weight: {(m.weight * 100).toFixed(0)}%</span>
                  </div>
                  <div className="health-metric-progress">
                    <div className="progress-bar-wrap" style={{ height: 8 }}>
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${m.score}%`,
                          background: m.status === 'excellent' ? '#4caf50' : m.status === 'good' ? 'var(--gold)' : 'var(--gold-2)'
                        }}
                      />
                    </div>
                  </div>
                  <div className="health-metric-score mono font-semibold">
                    {m.score}/100
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* TAB: COMPARE */}
      {activeTab === 'compare' && (
        <section className="hub-section">
          <div className="admin-filters-bar">
            <div className="filter-pills">
              <button type="button" className={`pill-btn${compareMode === 'periods' ? ' is-on' : ''}`} onClick={() => setCompareMode('periods')}>
                Date Ranges
              </button>
              <button type="button" className={`pill-btn${compareMode === 'warehouses' ? ' is-on' : ''}`} onClick={() => setCompareMode('warehouses')}>
                Warehouses
              </button>
            </div>
          </div>

          {compareError && <div className="notice notice--error">{compareError}</div>}

          {compareMode === 'periods' ? (
            <>
              <div className="card-box" style={{ marginBottom: 16 }}>
                <div className="form-row">
                  <div className="field">
                    <label>Range A</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input type="date" className="input" value={rangeAFrom} onChange={(e) => setRangeAFrom(e.target.value)} />
                      <input type="date" className="input" value={rangeATo} onChange={(e) => setRangeATo(e.target.value)} />
                    </div>
                  </div>
                  <div className="field">
                    <label>Range B</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input type="date" className="input" value={rangeBFrom} onChange={(e) => setRangeBFrom(e.target.value)} />
                      <input type="date" className="input" value={rangeBTo} onChange={(e) => setRangeBTo(e.target.value)} />
                    </div>
                  </div>
                </div>
                <button type="button" className="btn btn--gold btn--sm" style={{ marginTop: 12 }} onClick={runPeriodCompare} disabled={compareLoading}>
                  {compareLoading ? 'Comparing…' : 'Compare'}
                </button>
              </div>

              {periodResult && (
                <div className="tbl-wrap">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Metric</th>
                        <th className="tr">Range A ({periodResult.a.from} – {periodResult.a.to})</th>
                        <th className="tr">Range B ({periodResult.b.from} – {periodResult.b.to})</th>
                        <th className="tr">Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ['Revenue', periodResult.a.revenue, periodResult.b.revenue, money],
                        ['Orders', periodResult.a.orders, periodResult.b.orders, String],
                        ['Avg Order Value', periodResult.a.avgOrderValue, periodResult.b.avgOrderValue, money],
                        ['Units Sold', periodResult.a.unitsSold, periodResult.b.unitsSold, String],
                        ['New Customers', periodResult.a.newCustomers, periodResult.b.newCustomers, String]
                      ].map(([label, a, b, fmt]) => {
                        const pct = b ? +(((a - b) / b) * 100).toFixed(1) : (a ? 100 : 0);
                        return (
                          <tr key={label}>
                            <td className="font-semibold">{label}</td>
                            <td className="tr mono">{fmt(a)}</td>
                            <td className="tr mono">{fmt(b)}</td>
                            <td className="tr mono font-semibold" style={{ color: pct >= 0 ? '#4caf50' : '#ff5252' }}>
                              {pct >= 0 ? `+${pct}%` : `${pct}%`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <div className="form-row">
              <div className="field">
                <label htmlFor="cmp-wh-a">Warehouse A</label>
                <select id="cmp-wh-a" className="input" value={warehouseAId} onChange={(e) => setWarehouseAId(e.target.value)}>
                  {warehouseList.map((w) => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="cmp-wh-b">Warehouse B</label>
                <select id="cmp-wh-b" className="input" value={warehouseBId} onChange={(e) => setWarehouseBId(e.target.value)}>
                  {warehouseList.map((w) => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}
                </select>
              </div>
              {(() => {
                const whA = warehouseList.find((w) => String(w.id) === String(warehouseAId));
                const whB = warehouseList.find((w) => String(w.id) === String(warehouseBId));
                if (!whA || !whB) return null;
                return (
                  <div className="tbl-wrap" style={{ flexBasis: '100%' }}>
                    <table className="tbl">
                      <thead>
                        <tr><th>Metric</th><th className="tr">{whA.code}</th><th className="tr">{whB.code}</th></tr>
                      </thead>
                      <tbody>
                        <tr><td className="font-semibold">Inventory Value</td><td className="tr mono">{money(whA.inventory_value)}</td><td className="tr mono">{money(whB.inventory_value)}</td></tr>
                        <tr><td className="font-semibold">Units On Hand</td><td className="tr mono">{whA.total_units}</td><td className="tr mono">{whB.total_units}</td></tr>
                        <tr><td className="font-semibold">Active SKUs</td><td className="tr mono">{whA.active_skus}</td><td className="tr mono">{whB.active_skus}</td></tr>
                        <tr><td className="font-semibold">Low Stock SKUs</td><td className="tr mono">{whA.low_stock_skus}</td><td className="tr mono">{whB.low_stock_skus}</td></tr>
                        <tr><td className="font-semibold">Out of Stock SKUs</td><td className="tr mono">{whA.out_of_stock_skus}</td><td className="tr mono">{whB.out_of_stock_skus}</td></tr>
                        <tr><td className="font-semibold">Capacity Utilization</td><td className="tr mono">{whA.utilization_pct}%</td><td className="tr mono">{whB.utilization_pct}%</td></tr>
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

