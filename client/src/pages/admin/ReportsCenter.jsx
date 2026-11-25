/* =============================================================
   REPORTS CENTER
   Enterprise report generation, live tabular data preview,
   and CSV / formatted print exports.
   ============================================================= */
import { useEffect, useState } from 'react';
import { money, formatShortDate } from '../../lib/format';
import { readToken, authFetch } from '../../lib/adminApi';

export default function ReportsCenter() {
  const [mainTab, setMainTab] = useState('generate'); // 'generate' | 'scheduled'
  const [reportType, setReportType] = useState('inventory'); // 'inventory' | 'sales' | 'movements' | 'suppliers' | 'forecast'
  const [dateRange, setDateRange] = useState('30d');
  const [previewData, setPreviewData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Scheduled reports
  const [schedules, setSchedules] = useState([]);
  const [newScheduleOpen, setNewScheduleOpen] = useState(false);
  const [scheduleName, setScheduleName] = useState('');
  const [scheduleType, setScheduleType] = useState('inventory');
  const [scheduleFrequency, setScheduleFrequency] = useState('weekly');
  const [scheduleSubmitting, setScheduleSubmitting] = useState(false);
  const [scheduleFeedback, setScheduleFeedback] = useState(null);
  const [viewingRun, setViewingRun] = useState(null);

  const token = readToken();
  const headers = { Authorization: `Bearer ${token}` };

  const loadSchedules = () => {
    fetch('/api/admin/scheduled-reports', { headers })
      .then((r) => r.json())
      .then((res) => setSchedules(res.schedules || []))
      .catch(() => {});
  };

  useEffect(() => {
    if (mainTab === 'scheduled') loadSchedules();
  }, [mainTab]);

  const submitNewSchedule = async (e) => {
    e.preventDefault();
    setScheduleSubmitting(true);
    setScheduleFeedback(null);
    try {
      const res = await fetch('/api/admin/scheduled-reports', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: scheduleName, reportType: scheduleType, frequency: scheduleFrequency })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not create schedule');
      setNewScheduleOpen(false);
      setScheduleName('');
      loadSchedules();
    } catch (err) {
      setScheduleFeedback({ success: false, message: err.message });
    } finally {
      setScheduleSubmitting(false);
    }
  };

  const toggleScheduleStatus = async (sched) => {
    await fetch(`/api/admin/scheduled-reports/${sched.id}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: sched.status === 'active' ? 'paused' : 'active' })
    });
    loadSchedules();
  };

  const deleteScheduleRow = async (id) => {
    await fetch(`/api/admin/scheduled-reports/${id}`, { method: 'DELETE', headers });
    loadSchedules();
  };

  const viewLatestRun = async (scheduleId) => {
    const runsRes = await fetch(`/api/admin/scheduled-reports/${scheduleId}/runs`, { headers }).then((r) => r.json());
    const latest = runsRes.runs?.[0];
    if (!latest) { setScheduleFeedback({ success: false, message: 'No runs yet — this schedule has not fired.' }); return; }
    const runRes = await fetch(`/api/admin/report-runs/${latest.id}`, { headers }).then((r) => r.json());
    setViewingRun(runRes.run);
  };

  const generateReportData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (reportType === 'inventory') {
        const res = await fetch('/api/admin/inventory-v2', { headers }).then((r) => r.json());
        const rows = (res.items || []).map((i) => ({
          SKU: i.id,
          Product: i.name,
          Category: i.cat,
          Stock: i.stock,
          Available: i.global_available,
          Price: i.price,
          Valuation: i.stock * i.price,
          SafetyStock: i.safety_stock,
          Status: i.inventoryStatus
        }));
        setPreviewData(rows);
      } else if (reportType === 'sales') {
        const res = await fetch('/api/admin/analytics/products', { headers }).then((r) => r.json());
        const rows = (res.products || []).map((p) => ({
          SKU: p.id,
          Product: p.name,
          Category: p.cat,
          UnitsSold: p.units_sold,
          Revenue: p.revenue,
          GrossMargin: p.grossProfit,
          MarginPct: `${p.marginPct}%`,
          Classification: p.classification
        }));
        setPreviewData(rows);
      } else if (reportType === 'movements') {
        const res = await fetch('/api/admin/inventory/transactions', { headers }).then((r) => r.json());
        const rows = (res.items || []).map((t) => ({
          Timestamp: t.created_at,
          SKU: t.product_id,
          Product: t.product_name,
          Type: t.type,
          QuantityDelta: t.qty,
          Before: t.previous_qty,
          After: t.new_qty,
          Reason: t.reason,
          AuthorizedBy: t.staff_email || 'System'
        }));
        setPreviewData(rows);
      } else if (reportType === 'suppliers') {
        const res = await fetch('/api/admin/suppliers', { headers }).then((r) => r.json());
        const rows = (res.suppliers || []).map((s) => ({
          Code: s.code,
          Supplier: s.name,
          ReliabilityScore: `${s.reliability_score}/100`,
          LeadTimeDays: `${s.lead_time_days} days`,
          TotalPOs: s.total_pos,
          TotalSpend: s.total_spend,
          Currency: s.currency,
          Email: s.email
        }));
        setPreviewData(rows);
      } else if (reportType === 'forecast') {
        const res = await fetch('/api/admin/ai/stockout-risk', { headers }).then((r) => r.json());
        const rows = (res.items || []).map((f) => ({
          SKU: f.id,
          Product: f.name,
          Stock: f.stock,
          DailyDemand: f.forecastDailyDemand,
          DaysOfCover: f.daysOfCover,
          PredictedStockout: f.estimatedStockoutDate === 'None' ? 'Safe' : f.estimatedStockoutDate,
          RiskLevel: f.riskLevel,
          RecommendedPO: f.recommendedReorderQty
        }));
        setPreviewData(rows);
      }
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    generateReportData();
  }, [reportType, dateRange]);

  // Export to CSV
  const downloadCSV = () => {
    if (!previewData.length) return;
    const headers = Object.keys(previewData[0]);
    const csvRows = [];
    csvRows.push(headers.join(','));

    previewData.forEach((row) => {
      const values = headers.map((h) => {
        const val = row[h] === null || row[h] === undefined ? '' : String(row[h]);
        return `"${val.replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Aurelis_Report_${reportType}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Report
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="admin-reports-hub">
      <header className="admin__head">
        <div>
          <span className="field__label">Compliance & Regulatory Auditing</span>
          <h1 className="h2">Financial Reports & Data Exports</h1>
          <p className="tiny" style={{ textTransform: 'none', letterSpacing: '.02em', marginTop: 4 }}>
            Generate auditable financial ledgers, inventory valuations, and supplier metrics for export.
          </p>
        </div>
        <div className="admin__headactions">
          <button type="button" className="btn btn--gold btn--sm" onClick={downloadCSV} disabled={loading || !previewData.length}>
            &darr; Export CSV Document
          </button>
          <button type="button" className="btn btn--sm" onClick={handlePrint} disabled={loading || !previewData.length}>
            🖨️ Print / PDF
          </button>
        </div>
      </header>

      <div className="hub-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={mainTab === 'generate'}
          className={`hub-tab-btn ${mainTab === 'generate' ? 'is-active' : ''}`}
          onClick={() => setMainTab('generate')}>
          Generate Now
        </button>
        <button type="button" role="tab" aria-selected={mainTab === 'scheduled'}
          className={`hub-tab-btn ${mainTab === 'scheduled' ? 'is-active' : ''}`}
          onClick={() => setMainTab('scheduled')}>
          🕐 Scheduled Reports ({schedules.filter((s) => s.status === 'active').length} active)
        </button>
      </div>

      {mainTab === 'generate' && (
      <>
      {/* Report Config Bar */}
      <div className="admin-filters-bar">
        <div className="filter-group">
          <label htmlFor="rep-type" className="tiny field__label" style={{ alignSelf: 'center', margin: 0 }}>
            Report:
          </label>
          <select
            id="rep-type"
            className="input"
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
          >
            <option value="inventory">📦 Inventory Valuation & Stock Report</option>
            <option value="sales">📈 Sales & Profitability Ledger</option>
            <option value="movements">📜 Stock Movements & Audit Trail</option>
            <option value="suppliers">🏆 Supplier Performance & Procurement</option>
            <option value="forecast">🔮 AI Demand Forecast & Stockout Plan</option>
          </select>

          <label htmlFor="rep-date" className="tiny field__label" style={{ alignSelf: 'center', margin: 0 }}>
            Period:
          </label>
          <select
            id="rep-date"
            className="input"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="today">Today</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last Quarter (90d)</option>
            <option value="1y">Fiscal Year to Date</option>
          </select>
        </div>

        <span className="tiny mono" style={{ opacity: 0.75 }}>
          {previewData.length} records synthesized &middot; Generated {new Date().toLocaleTimeString()}
        </span>
      </div>

      {error && <div className="notice notice--error">{error}</div>}

      {/* Live Table Preview */}
      <section className="hub-section">
        {loading ? (
          <div className="admin-loading-inline">Compiling report data table...</div>
        ) : previewData.length === 0 ? (
          <div className="notice">No records match the requested report criteria.</div>
        ) : (
          <div className="tbl-wrap print-table-wrap">
            <div className="print-only report-letterhead" style={{ display: 'none' }}>
              <h2>AURELIS MAISON &mdash; OFFICIAL REPORT</h2>
              <p>Generated: {new Date().toISOString()} | Confidential Internal Audit Record</p>
            </div>

            <table className="tbl">
              <thead>
                <tr>
                  {Object.keys(previewData[0]).map((col) => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.map((row, idx) => (
                  <tr key={idx}>
                    {Object.entries(row).map(([key, val], cIdx) => (
                      <td key={cIdx} className={typeof val === 'number' ? 'tr mono' : ''}>
                        {typeof val === 'number' && (key.includes('Valuation') || key.includes('Revenue') || key.includes('Margin') || key.includes('Price') || key.includes('Spend'))
                          ? money(val)
                          : String(val ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      </>
      )}

      {mainTab === 'scheduled' && (
        <section className="hub-section">
          {scheduleFeedback && !scheduleFeedback.success && (
            <div className="notice notice--error">{scheduleFeedback.message}</div>
          )}
          <div className="admin-filters-bar">
            <span className="tiny mono" style={{ opacity: 0.65 }}>
              A schedule advances on its own — no one has to remember to click Generate. Each run is saved here, not emailed.
            </span>
            <button type="button" className="btn btn--gold btn--sm" onClick={() => setNewScheduleOpen(true)}>
              + New Schedule
            </button>
          </div>

          {schedules.length === 0 ? (
            <div className="notice">No scheduled reports yet.</div>
          ) : (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Frequency</th>
                    <th>Status</th>
                    <th>Next Run</th>
                    <th>Last Run</th>
                    <th className="tr">Runs</th>
                    <th className="tr">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((s) => (
                    <tr key={s.id}>
                      <td className="font-semibold">{s.name}</td>
                      <td className="tiny mono">{s.report_type}</td>
                      <td className="tiny" style={{ textTransform: 'capitalize' }}>{s.frequency}</td>
                      <td><span className={`pill pill--${s.status === 'active' ? 'ok' : 'neutral'}`}>{s.status}</span></td>
                      <td className="tiny mono">{s.next_run_at?.slice(0, 16)}</td>
                      <td className="tiny mono">{s.last_run_at ? s.last_run_at.slice(0, 16) : 'Never'}</td>
                      <td className="tr mono">{s.run_count}</td>
                      <td className="tr">
                        <div style={{ display: 'inline-flex', gap: 4 }}>
                          {s.run_count > 0 && (
                            <button type="button" className="btn btn--sm btn--outline" onClick={() => viewLatestRun(s.id)}>View Latest</button>
                          )}
                          <button type="button" className="btn btn--sm" onClick={() => toggleScheduleStatus(s)}>
                            {s.status === 'active' ? 'Pause' : 'Resume'}
                          </button>
                          <button type="button" className="btn btn--sm btn--outline" onClick={() => deleteScheduleRow(s.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {viewingRun && (
            <div className="card-box" style={{ marginTop: 16 }}>
              <div className="card-box__head">
                <h3>Run from {viewingRun.generated_at?.slice(0, 16)} &middot; {viewingRun.row_count} rows</h3>
                <button type="button" className="btn btn--sm btn--outline" onClick={() => setViewingRun(null)}>Close</button>
              </div>
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>{Object.keys(viewingRun.data[0] || {}).map((c) => <th key={c}>{c}</th>)}</tr>
                  </thead>
                  <tbody>
                    {viewingRun.data.slice(0, 50).map((row, i) => (
                      <tr key={i}>{Object.values(row).map((v, j) => <td key={j} className="tiny">{String(v ?? '—')}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {newScheduleOpen && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-schedule-title">
          <div className="admin-modal-box">
            <div className="admin-modal-head">
              <h3 id="modal-schedule-title" className="h3">New Scheduled Report</h3>
              <button type="button" className="modal-close-btn" onClick={() => setNewScheduleOpen(false)} aria-label="Close">&times;</button>
            </div>
            <form onSubmit={submitNewSchedule} style={{ padding: 'var(--spacing-24)' }}>
              <div className="field">
                <label htmlFor="sched-name">Name</label>
                <input id="sched-name" className="input" value={scheduleName} onChange={(e) => setScheduleName(e.target.value)}
                  placeholder="Weekly inventory valuation" required />
              </div>
              <div className="field">
                <label htmlFor="sched-type">Report</label>
                <select id="sched-type" className="input" value={scheduleType} onChange={(e) => setScheduleType(e.target.value)}>
                  <option value="inventory">📦 Inventory Valuation & Stock Report</option>
                  <option value="sales">📈 Sales & Profitability Ledger</option>
                  <option value="movements">📜 Stock Movements & Audit Trail</option>
                  <option value="suppliers">🏆 Supplier Performance & Procurement</option>
                  <option value="forecast">🔮 AI Demand Forecast & Stockout Plan</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="sched-freq">Frequency</label>
                <select id="sched-freq" className="input" value={scheduleFrequency} onChange={(e) => setScheduleFrequency(e.target.value)}>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <button type="submit" className="btn btn--gold btn--block" disabled={scheduleSubmitting}>
                {scheduleSubmitting ? 'Creating…' : 'Create Schedule'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

