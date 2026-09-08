/* =============================================================
   REPORTS CENTER
   Enterprise report generation, live tabular data preview,
   and CSV / formatted print exports.
   ============================================================= */
import { useEffect, useState } from 'react';
import { money, formatShortDate } from '../../lib/format';
import { readToken, authFetch } from '../../lib/adminApi';

export default function ReportsCenter() {
  const [reportType, setReportType] = useState('inventory'); // 'inventory' | 'sales' | 'movements' | 'suppliers' | 'forecast'
  const [dateRange, setDateRange] = useState('30d');
  const [previewData, setPreviewData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const token = readToken();
  const headers = { Authorization: `Bearer ${token}` };

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
        const rows = (res.transactions || []).map((t) => ({
          Timestamp: t.created_at,
          SKU: t.product_id,
          Product: t.product_name,
          Type: t.movement_type,
          QuantityDelta: t.quantity_delta,
          Before: t.prev_quantity,
          After: t.new_quantity,
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
          PredictedStockout: f.predictedStockoutDate || 'Safe',
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
    </div>
  );
}

