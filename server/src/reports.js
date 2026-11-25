/* =============================================================
   SCHEDULED REPORTS
   A schedule advances itself — no one has to remember to click
   Generate. Each run is stored as a JSON snapshot, not emailed:
   there is no real mail sender wired into this app, and a report
   that claims to have been sent when it was not would be exactly
   the kind of fabricated figure this project forbids elsewhere.
   ============================================================= */
import { db } from './db/index.js';
import { listInventory, listTransactions, listSuppliers } from './inventory/inventoryService.js';
import { getProductPerformanceMatrix, getStockoutRiskBoard } from './ml/aiAnalyticsEngine.js';
import { audit } from './auth/rbac.js';

const REPORT_TYPES = new Set(['inventory', 'sales', 'movements', 'suppliers', 'forecast']);

/* Same column shapes ReportsCenter.jsx builds client-side, so a
   scheduled run and an on-demand preview always agree. */
export function generateReportRows(reportType) {
  if (!REPORT_TYPES.has(reportType)) throw new Error('Unknown report type.');

  if (reportType === 'inventory') {
    /* listInventory() clamps perPage to 100, so a 140-SKU catalogue
       needs a second page rather than one call that quietly drops
       the rest. */
    const first = listInventory({ perPage: 100, page: 1 });
    const rest = [];
    for (let p = 2; p <= first.pages; p++) rest.push(...listInventory({ perPage: 100, page: p }).items);
    return [...first.items, ...rest].map((i) => ({
      SKU: i.id, Product: i.name, Category: i.cat, Stock: i.global_stock,
      Available: i.global_available, Price: i.price, Valuation: i.total_value,
      SafetyStock: i.safety_stock, Status: i.inventoryStatus
    }));
  }
  if (reportType === 'sales') {
    return getProductPerformanceMatrix().map((p) => ({
      SKU: p.id, Product: p.name, Category: p.cat, UnitsSold: p.units_sold,
      Revenue: p.revenue, GrossMargin: p.grossProfit, MarginPct: `${p.marginPct}%`,
      Classification: p.classification
    }));
  }
  if (reportType === 'movements') {
    return listTransactions({ perPage: 100 }).items.map((t) => ({
      Timestamp: t.created_at, SKU: t.product_id, Product: t.product_name, Type: t.type,
      QuantityDelta: t.qty, Before: t.previous_qty, After: t.new_qty,
      Reason: t.reason, AuthorizedBy: t.staff_email || 'System'
    }));
  }
  if (reportType === 'suppliers') {
    return listSuppliers().map((s) => ({
      Code: s.code, Supplier: s.name, ReliabilityScore: `${s.reliability_score}/100`,
      LeadTimeDays: `${s.lead_time_days} days`, TotalPOs: s.total_pos, TotalSpend: s.total_spend,
      Currency: s.currency, Email: s.email
    }));
  }
  // forecast
  return getStockoutRiskBoard().map((f) => ({
    SKU: f.id, Product: f.name, Stock: f.stock, DailyDemand: f.forecastDailyDemand,
    DaysOfCover: f.daysOfCover,
    PredictedStockout: f.estimatedStockoutDate === 'None' ? 'Safe' : f.estimatedStockoutDate,
    RiskLevel: f.riskLevel, RecommendedPO: f.recommendedReorderQty
  }));
}

function nextRunFrom(date, frequency) {
  const d = new Date(date);
  if (frequency === 'daily') d.setUTCDate(d.getUTCDate() + 1);
  else if (frequency === 'weekly') d.setUTCDate(d.getUTCDate() + 7);
  else if (frequency === 'monthly') d.setUTCMonth(d.getUTCMonth() + 1);
  else throw new Error('Unknown frequency.');
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

export function listSchedules() {
  return db.prepare(`
    SELECT sr.*, s.first_name || ' ' || s.last_name AS created_by_name,
      (SELECT COUNT(*) FROM report_runs WHERE scheduled_report_id = sr.id) AS run_count
    FROM scheduled_reports sr LEFT JOIN staff s ON s.id = sr.created_by
    ORDER BY sr.created_at DESC
  `).all();
}

export function createSchedule({ name, reportType, frequency, staff }) {
  if (!REPORT_TYPES.has(reportType)) throw new Error('Unknown report type.');
  if (!['daily', 'weekly', 'monthly'].includes(frequency)) throw new Error('Unknown frequency.');
  const cleanName = String(name || '').trim() || `${reportType} report`;
  const nextRunAt = nextRunFrom(new Date(), frequency);

  const res = db.prepare(`
    INSERT INTO scheduled_reports (name, report_type, frequency, next_run_at, created_by)
    VALUES (?, ?, ?, ?, ?)
  `).run(cleanName, reportType, frequency, nextRunAt, staff?.id || null);

  audit({
    staff, action: 'report_schedule_created', entity: 'scheduled_report', entityId: String(res.lastInsertRowid),
    summary: `Scheduled "${cleanName}" (${reportType}, ${frequency})`
  });

  return { id: res.lastInsertRowid, name: cleanName, reportType, frequency, nextRunAt };
}

export function setScheduleStatus({ id, status, staff }) {
  if (!['active', 'paused'].includes(status)) throw new Error('Unknown status.');
  const sched = db.prepare('SELECT * FROM scheduled_reports WHERE id = ?').get(id);
  if (!sched) throw new Error('Schedule not found.');
  db.prepare('UPDATE scheduled_reports SET status = ? WHERE id = ?').run(status, id);
  audit({ staff, action: 'report_schedule_updated', entity: 'scheduled_report', entityId: String(id),
    summary: `${status === 'paused' ? 'Paused' : 'Resumed'} "${sched.name}"` });
  return { id, status };
}

export function deleteSchedule({ id, staff }) {
  const sched = db.prepare('SELECT * FROM scheduled_reports WHERE id = ?').get(id);
  if (!sched) throw new Error('Schedule not found.');
  db.prepare('DELETE FROM scheduled_reports WHERE id = ?').run(id);
  audit({ staff, action: 'report_schedule_deleted', entity: 'scheduled_report', entityId: String(id),
    summary: `Deleted schedule "${sched.name}"` });
  return { id };
}

export function listRuns(scheduleId) {
  return db.prepare(`
    SELECT id, report_type, row_count, generated_at FROM report_runs
    WHERE scheduled_report_id = ? ORDER BY generated_at DESC
  `).all(scheduleId);
}

export function getRun(runId) {
  const run = db.prepare('SELECT * FROM report_runs WHERE id = ?').get(runId);
  if (!run) return null;
  return { ...run, data: JSON.parse(run.data) };
}

/** Runs any schedule whose next_run_at has arrived. Called on an
    interval from index.js — see startReportScheduler(). */
export function runDueSchedules() {
  const due = db.prepare(`
    SELECT * FROM scheduled_reports WHERE status = 'active' AND next_run_at <= datetime('now')
  `).all();

  due.forEach((sched) => {
    try {
      const rows = generateReportRows(sched.report_type);
      db.prepare(`
        INSERT INTO report_runs (scheduled_report_id, report_type, row_count, data)
        VALUES (?, ?, ?, ?)
      `).run(sched.id, sched.report_type, rows.length, JSON.stringify(rows));

      const nextRunAt = nextRunFrom(new Date(), sched.frequency);
      db.prepare(`
        UPDATE scheduled_reports SET last_run_at = datetime('now'), next_run_at = ? WHERE id = ?
      `).run(nextRunAt, sched.id);

      audit({
        action: 'report_run_generated', entity: 'scheduled_report', entityId: String(sched.id),
        summary: `Auto-generated "${sched.name}" (${rows.length} rows)`
      });
    } catch (err) {
      console.error(`[reports] schedule ${sched.id} failed:`, err.message);
    }
  });

  return due.length;
}

export function startReportScheduler(intervalMs = 60_000) {
  const timer = setInterval(() => {
    try {
      const n = runDueSchedules();
      if (n) console.log(`[reports] ran ${n} due schedule(s)`);
    } catch (err) {
      console.error('[reports] scheduler failed:', err.message);
    }
  }, intervalMs);
  timer.unref?.();
  return timer;
}
