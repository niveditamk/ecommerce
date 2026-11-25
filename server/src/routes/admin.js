/* =============================================================
   ADMIN API
   Every route below the auth block is guarded by a permission
   key. Writes are recorded in the audit log with before/after.
   ============================================================= */
import { Router } from 'express';
import { db, PERMISSIONS, ROLES, SEED_STAFF, DEMO_MODE } from '../db/index.js';
import { verifyPassword, hashPassword, checkStrength } from '../auth/password.js';
/* Cancelling an order has to put its units back on the shelf, and the
   status change and the restock must land together. */
import { tx, restore } from '../inventory/engine.js';
import {
  createSession, destroySession, purgeExpired, recordAttempt,
  isLockedOut, clearAttempts, audit, attachStaff, requireStaff, require_
} from '../auth/rbac.js';
import {
  listWarehouses, getWarehouseHeatmap, listInventory, adjustStock,
  listTransactions, listTransfers, createTransfer, updateTransferStatus,
  listSuppliers, listPurchaseOrders, createPurchaseOrder, updatePurchaseOrderStatus,
  createCycleCount, listCycleCounts, getCycleCount, recordCount, completeCycleCount, cancelCycleCount
} from '../inventory/inventoryService.js';
import {
  getCommandCenterKPIs, getAIBusinessSummary, listAIAlerts, updateAIAlertStatus,
  getDemandForecast, getStockoutRiskBoard, getSmartReorders, getOverstockAndDeadStock,
  getInventoryHealthScore, runForecastSimulation, getProductPerformanceMatrix,
  getCustomerBehaviorAnalytics, getReturnsAnalytics, getPricingAnalytics,
  getAIPerformanceOutcomes, getPeriodMetrics
} from '../ml/aiAnalyticsEngine.js';
import { askAssistant } from '../ai/assistant.js';
import { listNotes, createNote } from '../notes.js';
import { listBatches, createBatch, deleteBatch, listExpiringBatches } from '../batches.js';
import {
  generateReportRows, listSchedules, createSchedule, setScheduleStatus,
  deleteSchedule, listRuns, getRun
} from '../reports.js';
import { isConfigured as aiAssistantConfigured } from '../ai/openrouter.js';

const router = Router();
const ipOf = (req) => req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null;
const parse = (v, fallback) => { try { return v ? JSON.parse(v) : fallback; } catch { return fallback; } };

/* Synthetic history exists so the forecasting models can be built
   before the shop has traded for a year. It must never reach the
   figures an operator runs the business on — revenue, order counts,
   customer lifetime value and the top-sellers chart all read real
   trade only. The orders list is the one exception: it can show
   synthetic rows, but only when explicitly asked. */
const REAL_TRADE = "channel != 'synthetic'";
const REAL_TRADE_O = "o.channel != 'synthetic'";

router.use(attachStaff);

/* =========================================================
   AUTH
   ========================================================= */
router.post('/login', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  if (!email || !password) return res.status(400).json({ error: 'Enter your email and password.' });
  if (isLockedOut(email)) {
    return res.status(429).json({ error: 'Too many failed attempts. Try again in fifteen minutes.' });
  }

  const row = db.prepare(
    `SELECT s.*, r.key AS role_key FROM staff s JOIN roles r ON r.id = s.role_id WHERE s.email = ?`
  ).get(email);

  const ok = row && row.status === 'active' && verifyPassword(password, row.password_hash, row.salt);
  recordAttempt(email, ipOf(req), ok);

  if (!ok) {
    /* Same message either way — never reveal whether an account exists. */
    return res.status(401).json({ error: 'Those details do not match an account.' });
  }

  clearAttempts(email);
  purgeExpired();
  db.prepare("UPDATE staff SET last_login_at = datetime('now') WHERE id = ?").run(row.id);
  const token = createSession(row.id, ipOf(req), req.get('user-agent'));

  audit({
    staff: { id: row.id, firstName: row.first_name, lastName: row.last_name, roleName: row.role_key },
    action: 'login', entity: 'staff', entityId: row.id, summary: 'Signed in', ip: ipOf(req)
  });

  req.staff = null;
  res.json({ token, staff: sessionShape(row.id) });
});

function sessionShape(staffId) {
  const row = db.prepare(
    `SELECT s.id, s.email, s.first_name, s.last_name, s.last_login_at,
            r.key AS role_key, r.name AS role_name
       FROM staff s JOIN roles r ON r.id = s.role_id WHERE s.id = ?`
  ).get(staffId);
  const perms = db.prepare(
    `SELECT p.key FROM role_permissions rp
       JOIN permissions p ON p.id = rp.permission_id
      WHERE rp.role_id = (SELECT role_id FROM staff WHERE id = ?)`
  ).all(staffId).map((p) => p.key);
  return {
    id: row.id, email: row.email, firstName: row.first_name, lastName: row.last_name,
    role: row.role_key, roleName: row.role_name, lastLoginAt: row.last_login_at, permissions: perms
  };
}

router.post('/logout', requireStaff, (req, res) => {
  audit({ staff: req.staff, action: 'logout', entity: 'staff', entityId: req.staff.id, summary: 'Signed out', ip: ipOf(req) });
  destroySession(req.adminToken);
  res.json({ ok: true });
});

router.get('/me', requireStaff, (req, res) => res.json({ staff: req.staff }));

/* Demo logins for the sign-in screen.

   This endpoint hands out working passwords, so it is only ever
   available while DEMO_MODE is on, and it never exposes an account
   whose password came from the environment. Turn DEMO_MODE off and
   the public deployment has no advertised way in. */
router.get('/demo-accounts', (_req, res) => {
  /* This hands out working credentials. It must never answer in a
     production build, whatever DEMO_MODE says — the flag is a
     convenience, not a security control. */
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }
  if (!DEMO_MODE) return res.json({ accounts: [], demoMode: false });

  /* Only accounts whose password is a literal in this repository may be
     listed. The filter used to be `s.demo`, and the super admin carried
     that flag — so with demo mode on, this unauthenticated endpoint
     published whatever the operator had set SUPER_ADMIN_PASSWORD to.
     Keying on demoOnly means a credential that came from the
     environment can never appear here, whatever any flag says. */
  const listable = SEED_STAFF.filter((s) => s.demoOnly && s.password);
  res.json({
    demoMode: true,
    accounts: listable.map((s) => ({
      email: s.email, password: s.password, role: s.role,
      name: ROLES.find((r) => r.key === s.role)?.name || s.role
    }))
  });
});

/* =========================================================
   DASHBOARD
   ========================================================= */
router.get('/dashboard', require_('dashboard.view'), (req, res) => {
  const one = (sql, ...a) => db.prepare(sql).get(...a) || {};

  const revenue = one(`SELECT COALESCE(SUM(total),0) AS v, COUNT(*) AS n FROM orders
                        WHERE status != 'Cancelled' AND ${REAL_TRADE}`);
  const pending = one(`SELECT COUNT(*) AS n FROM orders
                        WHERE status IN ('Confirmed','Processing') AND ${REAL_TRADE}`);
  const customers = one('SELECT COUNT(*) AS n FROM customers');
  const products = one("SELECT COUNT(*) AS n FROM products WHERE status = 'active'");
  const invValue = one("SELECT COALESCE(SUM(price * stock),0) AS v FROM products WHERE status = 'active'");
  const low = db.prepare(
    `SELECT id, name, stock, low_stock_at FROM products
      WHERE status='active' AND stock <= low_stock_at ORDER BY stock ASC LIMIT 8`
  ).all();
  const outOfStock = one("SELECT COUNT(*) AS n FROM products WHERE status='active' AND stock = 0");

  const recent = db.prepare(
    `SELECT o.id, o.status, o.total, o.placed_at, o.email,
            (SELECT COUNT(*) FROM order_items i WHERE i.order_id = o.id) AS items
       FROM orders o WHERE ${REAL_TRADE_O} ORDER BY o.placed_at DESC LIMIT 6`
  ).all();

  const top = db.prepare(
    `SELECT i.product_id AS id, i.name, SUM(i.qty) AS units, SUM(i.qty * i.unit_price) AS revenue
       FROM order_items i JOIN orders o ON o.id = i.order_id
      WHERE ${REAL_TRADE_O} AND o.status != 'Cancelled'
      GROUP BY i.product_id ORDER BY revenue DESC LIMIT 5`
  ).all();

  /* Revenue by month for the chart. */
  const series = db.prepare(
    `SELECT substr(placed_at,1,7) AS month, SUM(total) AS total, COUNT(*) AS orders
       FROM orders WHERE status != 'Cancelled' AND ${REAL_TRADE}
      GROUP BY month ORDER BY month ASC`
  ).all();

  const aov = revenue.n ? Math.round(revenue.v / revenue.n) : 0;

  res.json({
    kpis: {
      revenue: revenue.v, orders: revenue.n, averageOrderValue: aov,
      customers: customers.n, products: products.n,
      inventoryValue: invValue.v, pendingOrders: pending.n,
      lowStock: low.length, outOfStock: outOfStock.n
    },
    lowStock: low, recentOrders: recent, topProducts: top, series
  });
});

/* =========================================================
   AI ASSISTANT — available from every admin page, not just
   the Medusa panel. Gated on dashboard.view (the one permission
   every staff session already holds) since it is a read-only
   question box, not a place that changes anything.
   ========================================================= */
router.get('/ai/status', require_('dashboard.view'), (_req, res) => {
  res.json({ configured: aiAssistantConfigured() });
});

router.post('/ai/ask', require_('dashboard.view'), async (req, res) => {
  const out = await askAssistant(req.body?.question, { history: req.body?.history });
  res.status(out.ok ? 200 : 503).json(out);
});

/* =========================================================
   COLLABORATION NOTES
   ========================================================= */
router.get('/notes', require_('dashboard.view'), (req, res) => {
  try {
    res.json({ notes: listNotes(req.query.entity, req.query.entityId) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/notes', require_('dashboard.view'), (req, res) => {
  try {
    const note = createNote({ ...req.body, staff: req.staff });
    res.status(201).json({ note });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* =========================================================
   SCHEDULED REPORTS
   ========================================================= */
router.get('/scheduled-reports', require_('reports.view'), (_req, res) => {
  res.json({ schedules: listSchedules() });
});

router.post('/scheduled-reports', require_('reports.view'), (req, res) => {
  try {
    const result = createSchedule({ ...req.body, staff: req.staff });
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/scheduled-reports/:id', require_('reports.view'), (req, res) => {
  try {
    const result = setScheduleStatus({ id: req.params.id, status: req.body?.status, staff: req.staff });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/scheduled-reports/:id', require_('reports.view'), (req, res) => {
  try {
    const result = deleteSchedule({ id: req.params.id, staff: req.staff });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/scheduled-reports/:id/runs', require_('reports.view'), (req, res) => {
  res.json({ runs: listRuns(req.params.id) });
});

router.get('/report-runs/:id', require_('reports.view'), (req, res) => {
  const run = getRun(req.params.id);
  if (!run) return res.status(404).json({ error: 'Report run not found' });
  res.json({ run });
});

router.post('/reports/preview/:type', require_('reports.view'), (req, res) => {
  try {
    res.json({ rows: generateReportRows(req.params.type) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* =========================================================
   PRODUCTS
   ========================================================= */
const productShape = (r) => ({
  ...r,
  details: parse(r.details, []), sizes: parse(r.sizes, []), colors: parse(r.colors, []),
  badges: parse(r.badges, []), tags: parse(r.tags, [])
});

router.get('/products', require_('products.view'), (req, res) => {
  const { q = '', cat = '', status = '', stock = '', sort = 'name', page = 1, perPage = 20 } = req.query;
  const where = [];
  const args = [];
  if (q) { where.push('(name LIKE ? OR id LIKE ?)'); args.push(`%${q}%`, `%${q}%`); }
  if (cat) { where.push('cat = ?'); args.push(cat); }
  if (status) { where.push('status = ?'); args.push(status); }
  if (stock === 'low') where.push('stock <= low_stock_at AND stock > 0');
  if (stock === 'out') where.push('stock = 0');

  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const order = { name: 'name ASC', price: 'price DESC', stock: 'stock ASC', newest: 'created_at DESC' }[sort] || 'name ASC';

  const total = db.prepare(`SELECT COUNT(*) AS n FROM products ${clause}`).get(...args).n;
  const size = Math.min(100, Math.max(1, Number(perPage)));
  const offset = (Math.max(1, Number(page)) - 1) * size;
  const items = db.prepare(`SELECT * FROM products ${clause} ORDER BY ${order} LIMIT ? OFFSET ?`)
    .all(...args, size, offset).map(productShape);

  res.json({ total, page: Number(page), perPage: size, pages: Math.max(1, Math.ceil(total / size)), items });
});

router.get('/products/:id', require_('products.view'), (req, res) => {
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Product not found' });
  const movements = db.prepare(
    'SELECT * FROM stock_movements WHERE product_id = ? ORDER BY created_at DESC LIMIT 20'
  ).all(req.params.id);
  res.json({ product: productShape(row), movements });
});

/* =========================================================
   BATCH & EXPIRY TRACKING (parfums only — see batches.js)
   ========================================================= */
router.get('/products/:id/batches', require_('products.view'), (req, res) => {
  res.json({ batches: listBatches(req.params.id) });
});

router.post('/products/:id/batches', require_('products.edit'), (req, res) => {
  try {
    const batch = createBatch({ ...req.body, productId: req.params.id, staff: req.staff });
    res.status(201).json({ batch });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/product-batches/:id', require_('products.edit'), (req, res) => {
  try {
    res.json(deleteBatch({ id: req.params.id, staff: req.staff }));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/batches/expiring', require_('products.view'), (req, res) => {
  res.json({ batches: listExpiringBatches(Number(req.query.days) || 90) });
});

const EDITABLE = ['name', 'cat', 'sub', 'price', 'was', 'materials', 'blurb', 'story', 'care',
  'edition', 'year', 'shape', 'palette', 'status', 'low_stock_at'];

router.patch('/products/:id', require_('products.edit'), (req, res) => {
  const before = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!before) return res.status(404).json({ error: 'Product not found' });

  const sets = [];
  const args = [];
  EDITABLE.forEach((f) => {
    if (req.body[f] !== undefined) { sets.push(`${f} = ?`); args.push(req.body[f]); }
  });
  ['details', 'sizes', 'colors', 'badges', 'tags'].forEach((f) => {
    if (req.body[f] !== undefined) { sets.push(`${f} = ?`); args.push(JSON.stringify(req.body[f])); }
  });
  if (!sets.length) return res.status(400).json({ error: 'Nothing to update.' });

  sets.push("updated_at = datetime('now')");
  db.prepare(`UPDATE products SET ${sets.join(', ')} WHERE id = ?`).run(...args, req.params.id);
  const after = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);

  const changed = EDITABLE.filter((f) => before[f] !== after[f]);
  audit({
    staff: req.staff, action: 'updated', entity: 'product', entityId: after.id,
    summary: `Changed ${changed.join(', ') || 'details'} on ${after.name}`,
    before: Object.fromEntries(changed.map((f) => [f, before[f]])),
    after: Object.fromEntries(changed.map((f) => [f, after[f]])),
    ip: ipOf(req)
  });

  res.json({ product: productShape(after) });
});

router.post('/products', require_('products.create'), (req, res) => {
  const { id, name, cat, price } = req.body || {};
  if (!id || !name || !cat || price == null) {
    return res.status(400).json({ error: 'An id, name, collection and price are required.' });
  }
  if (db.prepare('SELECT 1 FROM products WHERE id = ?').get(id)) {
    return res.status(409).json({ error: 'That product id already exists.' });
  }
  db.prepare(
    `INSERT INTO products (id,name,cat,sub,price,shape,palette,materials,blurb,stock,status)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`
  ).run(id, name, cat, req.body.sub || null, price, req.body.shape || 'atelier',
    req.body.palette || 'noir', req.body.materials || null, req.body.blurb || null,
    req.body.stock || 0, req.body.status || 'draft');

  audit({ staff: req.staff, action: 'created', entity: 'product', entityId: id, summary: `Created ${name}`, after: req.body, ip: ipOf(req) });
  res.status(201).json({ product: productShape(db.prepare('SELECT * FROM products WHERE id = ?').get(id)) });
});

router.delete('/products/:id', require_('products.delete'), (req, res) => {
  const before = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!before) return res.status(404).json({ error: 'Product not found' });
  /* Archive rather than destroy — orders reference these rows. */
  db.prepare("UPDATE products SET status = 'archived', updated_at = datetime('now') WHERE id = ?").run(req.params.id);
  audit({ staff: req.staff, action: 'archived', entity: 'product', entityId: req.params.id, summary: `Archived ${before.name}`, ip: ipOf(req) });
  res.json({ ok: true });
});

/* ---- bulk actions ---- */
router.post('/products/bulk', require_('products.edit'), (req, res) => {
  const { ids = [], action, value } = req.body || {};
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'Select at least one product.' });

  const rows = db.prepare(`SELECT * FROM products WHERE id IN (${ids.map(() => '?').join(',')})`).all(...ids);
  if (!rows.length) return res.status(404).json({ error: 'None of those products exist.' });

  let changed = 0;
  const runOne = (r) => {
    if (action === 'status') {
      if (!['active', 'draft', 'archived'].includes(value)) throw new Error('Unknown status.');
      db.prepare("UPDATE products SET status = ?, updated_at = datetime('now') WHERE id = ?").run(value, r.id);
    } else if (action === 'price-pct') {
      const pct = Number(value);
      if (!Number.isFinite(pct) || pct === 0) throw new Error('Enter a non-zero percentage.');
      const next = Math.max(1, Math.round(r.price * (1 + pct / 100)));
      db.prepare("UPDATE products SET price = ?, updated_at = datetime('now') WHERE id = ?").run(next, r.id);
    } else if (action === 'reorder-point') {
      /* Number('') is 0, so an empty field would have set the reorder
         point to zero on every selected product and reported success. */
      if (value === '' || value === null || value === undefined) {
        throw new Error('Enter a reorder point before applying.');
      }
      const n = Number(value);
      if (!Number.isFinite(n) || n < 0) throw new Error('Enter a reorder point of zero or more.');
      db.prepare("UPDATE products SET low_stock_at = ?, updated_at = datetime('now') WHERE id = ?").run(n, r.id);
    } else {
      throw new Error('Unknown bulk action.');
    }
    changed += 1;
  };

  try {
    rows.forEach(runOne);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  audit({
    staff: req.staff, action: 'bulk-updated', entity: 'product', entityId: null,
    summary: `${action} = ${value} applied to ${changed} products`,
    before: rows.map((r) => ({ id: r.id, price: r.price, status: r.status })),
    after: { action, value }, ip: ipOf(req)
  });

  res.json({ changed });
});

/* ---- CSV export ---- */
router.get('/products/export/csv', require_('products.view'), (_req, res) => {
  const rows = db.prepare('SELECT * FROM products ORDER BY cat, name').all();
  const cols = ['id', 'name', 'cat', 'sub', 'price', 'stock', 'low_stock_at', 'status', 'materials', 'edition', 'year'];
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="aurelis-products-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(csv);
});

/* =========================================================
   CATEGORIES
   ========================================================= */
router.get('/categories', require_('products.view'), (_req, res) => {
  const items = db.prepare(
    `SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.cat = c.slug) AS product_count
       FROM categories c ORDER BY c.position ASC`
  ).all().map((c) => ({ ...c, sub: parse(c.sub, []) }));
  res.json({ items });
});

router.patch('/categories/:slug', require_('categories.manage'), (req, res) => {
  const before = db.prepare('SELECT * FROM categories WHERE slug = ?').get(req.params.slug);
  if (!before) return res.status(404).json({ error: 'Category not found' });

  const sets = [];
  const args = [];
  ['name', 'tag', 'blurb', 'shape', 'palette', 'position'].forEach((f) => {
    if (req.body[f] !== undefined) { sets.push(`${f} = ?`); args.push(req.body[f]); }
  });
  if (req.body.sub !== undefined) { sets.push('sub = ?'); args.push(JSON.stringify(req.body.sub)); }
  if (!sets.length) return res.status(400).json({ error: 'Nothing to update.' });

  db.prepare(`UPDATE categories SET ${sets.join(', ')} WHERE slug = ?`).run(...args, req.params.slug);
  const after = db.prepare('SELECT * FROM categories WHERE slug = ?').get(req.params.slug);

  audit({
    staff: req.staff, action: 'updated', entity: 'category', entityId: after.slug,
    summary: `Updated ${after.name}`, before, after, ip: ipOf(req)
  });
  res.json({ category: { ...after, sub: parse(after.sub, []) } });
});

/* =========================================================
   ORDERS
   ========================================================= */
const STAGES = ['Confirmed', 'Processing', 'Packed', 'Shipped', 'Delivered'];

router.get('/orders', require_('orders.view'), (req, res) => {
  const { status = '', q = '', page = 1, perPage = 20, channel = '' } = req.query;
  const where = [];
  const args = [];

  /* Real trade unless synthetic history is asked for by name. An
     operator scrolling the orders list is looking at the business,
     not at the forecaster's training set. */
  if (channel === 'synthetic') where.push(`o.channel = 'synthetic'`);
  else if (channel === 'all') { /* both, deliberately */ }
  else where.push(REAL_TRADE_O);

  if (status) { where.push('o.status = ?'); args.push(status); }
  if (q) { where.push('(o.id LIKE ? OR o.email LIKE ?)'); args.push(`%${q}%`, `%${q}%`); }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const total = db.prepare(`SELECT COUNT(*) AS n FROM orders o ${clause}`).get(...args).n;
  const size = Math.min(100, Number(perPage));
  const items = db.prepare(
    `SELECT o.*, (SELECT COUNT(*) FROM order_items i WHERE i.order_id = o.id) AS item_count
       FROM orders o ${clause} ORDER BY o.placed_at DESC LIMIT ? OFFSET ?`
  ).all(...args, size, (Math.max(1, Number(page)) - 1) * size);

  /* Say how many are being withheld, rather than silently hiding them. */
  const synthetic = db.prepare(
    `SELECT COUNT(*) AS n FROM orders WHERE channel = 'synthetic'`
  ).get().n;

  res.json({
    total,
    items,
    statuses: STAGES.concat(['Cancelled', 'Returned']),
    channel: channel || 'real',
    syntheticCount: synthetic
  });
});

router.get('/orders/:id', require_('orders.view'), (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  const history = db.prepare(
    "SELECT * FROM audit_logs WHERE entity = 'order' AND entity_id = ? ORDER BY created_at DESC"
  ).all(order.id);
  res.json({ order: { ...order, address: parse(order.address, null) }, items, history });
});

router.patch('/orders/:id', require_('orders.edit'), (req, res) => {
  const before = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!before) return res.status(404).json({ error: 'Order not found' });

  const { status, notes } = req.body || {};
  if (status && !STAGES.concat(['Cancelled', 'Returned']).includes(status)) {
    return res.status(400).json({ error: 'Unknown order status.' });
  }
  if (status === 'Cancelled' && !req.staff.permissions.includes('orders.cancel')) {
    return res.status(403).json({ error: 'Your role cannot cancel orders.' });
  }

  const stage = status ? Math.max(1, STAGES.indexOf(status) + 1) : before.stage;
  db.prepare('UPDATE orders SET status = COALESCE(?, status), stage = ?, notes = COALESCE(?, notes) WHERE id = ?')
    .run(status || null, stage, notes ?? null, req.params.id);

  audit({
    staff: req.staff, action: 'updated', entity: 'order', entityId: req.params.id,
    summary: status ? `Status ${before.status} → ${status}` : 'Note added',
    before: { status: before.status }, after: { status: status || before.status }, ip: ipOf(req)
  });

  res.json({ order: db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id) });
});

/* =========================================================
   CUSTOMERS
   ========================================================= */
router.get('/customers', require_('customers.view'), (req, res) => {
  /* Credentials never leave the server — password_hash/password_salt
     are excluded explicitly rather than trusted to a `c.*` select. */
  const items = db.prepare(
    `SELECT c.id, c.email, c.first_name, c.last_name, c.tier, c.phone, c.created_at,
            (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id AND ${REAL_TRADE_O}) AS orders,
            (SELECT COALESCE(SUM(total),0) FROM orders o WHERE o.customer_id = c.id AND ${REAL_TRADE_O}) AS lifetime
       FROM customers c ORDER BY lifetime DESC`
  ).all();
  res.json({ total: items.length, items });
});

/* =========================================================
   STAFF, ROLES, AUDIT
   ========================================================= */
router.get('/staff', require_('staff.view'), (_req, res) => {
  res.json({
    items: db.prepare(
      `SELECT s.id, s.email, s.first_name, s.last_name, s.status, s.last_login_at, r.name AS role_name, r.key AS role_key
         FROM staff s JOIN roles r ON r.id = s.role_id ORDER BY r.rank ASC, s.first_name ASC`
    ).all()
  });
});

/* This was guarded by requireStaff alone — the one data route in
   the admin router without a permission key, which quietly broke the
   invariant the file's header claims. */
router.get('/roles', require_('staff.view'), (_req, res) => {
  const roles = db.prepare('SELECT * FROM roles ORDER BY rank ASC').all().map((r) => ({
    ...r,
    permissions: db.prepare(
      `SELECT p.key FROM role_permissions rp JOIN permissions p ON p.id = rp.permission_id WHERE rp.role_id = ?`
    ).all(r.id).map((p) => p.key)
  }));
  res.json({ roles, permissions: PERMISSIONS.map(([key, module, label]) => ({ key, module, label })) });
});

/* =========================================================
   CATEGORIES — create and archive
   The permission key categories.manage already existed and the
   read and update routes were already here; create and delete
   were never written, so a category could be renamed but never
   added or retired from the admin.
   ========================================================= */
router.post('/categories', require_('categories.manage'), (req, res) => {
  const slug = String(req.body?.slug || '').trim().toLowerCase();
  const name = String(req.body?.name || '').trim();
  if (!/^[a-z0-9-]{2,40}$/.test(slug)) {
    return res.status(400).json({ error: 'A slug of 2-40 lowercase letters, digits or hyphens is required.' });
  }
  if (!name) return res.status(400).json({ error: 'A name is required.' });
  if (db.prepare('SELECT 1 FROM categories WHERE slug = ?').get(slug)) {
    return res.status(409).json({ error: 'That slug is already in use.' });
  }

  const position = req.body.position ?? (db.prepare('SELECT COALESCE(MAX(position), -1) + 1 AS n FROM categories').get().n);
  db.prepare(
    'INSERT INTO categories (slug, name, tag, blurb, shape, palette, sub, position) VALUES (?,?,?,?,?,?,?,?)'
  ).run(slug, name, req.body.tag || null, req.body.blurb || null,
    req.body.shape || 'atelier', req.body.palette || 'noir',
    JSON.stringify(req.body.sub || []), position);

  const after = db.prepare('SELECT * FROM categories WHERE slug = ?').get(slug);
  audit({ staff: req.staff, action: 'created', entity: 'category', entityId: slug, summary: `Created ${name}`, after, ip: ipOf(req) });
  res.status(201).json({ category: { ...after, sub: parse(after.sub, []) } });
});

router.delete('/categories/:slug', require_('categories.manage'), (req, res) => {
  const before = db.prepare('SELECT * FROM categories WHERE slug = ?').get(req.params.slug);
  if (!before) return res.status(404).json({ error: 'Category not found' });

  /* Deleting a category that still holds products would orphan them
     into a collection that no longer exists. Say so rather than
     silently breaking the storefront. */
  const held = db.prepare("SELECT COUNT(*) AS n FROM products WHERE cat = ? AND status != 'archived'").get(req.params.slug).n;
  if (held > 0) {
    return res.status(409).json({
      error: `${before.name} still holds ${held} product${held === 1 ? '' : 's'}. Move or archive them first.`,
      products: held
    });
  }

  db.prepare('DELETE FROM categories WHERE slug = ?').run(req.params.slug);
  audit({ staff: req.staff, action: 'deleted', entity: 'category', entityId: req.params.slug, summary: `Deleted ${before.name}`, before, ip: ipOf(req) });
  res.json({ ok: true });
});

/* =========================================================
   CUSTOMERS — update and archive
   customers.edit was defined as a permission from the start but
   nothing ever used it: the customers screen was read-only.
   ========================================================= */
router.get('/customers/:id', require_('customers.view'), (req, res) => {
  const row = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Customer not found' });
  const orders = db.prepare(
    'SELECT id, status, total, placed_at FROM orders WHERE customer_id = ? ORDER BY placed_at DESC LIMIT 50'
  ).all(row.id);
  /* Credentials never leave the server. */
  const { password_hash, password_salt, ...safe } = row;
  res.json({ customer: safe, orders });
});

router.patch('/customers/:id', require_('customers.edit'), (req, res) => {
  const before = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!before) return res.status(404).json({ error: 'Customer not found' });

  const sets = [];
  const args = [];
  /* password_hash and password_salt are deliberately absent: staff
     cannot set a customer's passphrase, only the customer can. */
  ['first_name', 'last_name', 'tier', 'phone'].forEach((f) => {
    if (req.body[f] !== undefined) { sets.push(`${f} = ?`); args.push(req.body[f]); }
  });
  if (req.body.email !== undefined) {
    const email = String(req.body.email).trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
    const clash = db.prepare('SELECT 1 FROM customers WHERE email = ? AND id != ?').get(email, req.params.id);
    if (clash) return res.status(409).json({ error: 'Another customer already uses that address.' });
    sets.push('email = ?'); args.push(email);
  }
  if (!sets.length) return res.status(400).json({ error: 'Nothing to update.' });

  db.prepare(`UPDATE customers SET ${sets.join(', ')} WHERE id = ?`).run(...args, req.params.id);
  const after = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  audit({
    staff: req.staff, action: 'updated', entity: 'customer', entityId: String(after.id),
    summary: `Updated ${after.email}`, before, after, ip: ipOf(req)
  });
  const { password_hash, password_salt, ...safe } = after;
  res.json({ customer: safe });
});

/* =========================================================
   STAFF — create, update, deactivate
   staff.manage existed as a permission and the screen listed
   accounts, but there was no way to add a colleague or revoke
   anyone's access without editing the database by hand.
   ========================================================= */
router.post('/staff', require_('staff.manage'), (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const { first, last, role, password } = req.body || {};
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (!first || !last) return res.status(400).json({ error: 'A first and family name are required.' });

  const weak = checkStrength(password);
  if (weak) return res.status(400).json({ error: weak });

  /* There is one staff role. Asking a caller to name it is a choice with
     a single option, so it defaults — but a role that was named and does
     not exist is still an error rather than something to paper over. */
  const only = db.prepare('SELECT id, key, name FROM roles ORDER BY rank ASC LIMIT 1').get();
  const roleRow = role
    ? db.prepare('SELECT id, key, name FROM roles WHERE key = ?').get(role)
    : only;
  if (!roleRow) return res.status(400).json({ error: 'Unknown role.' });
  if (db.prepare('SELECT 1 FROM staff WHERE email = ?').get(email)) {
    return res.status(409).json({ error: 'A staff account already uses that address.' });
  }

  const { hash, salt } = hashPassword(password);
  const id = Number(db.prepare(
    "INSERT INTO staff (email, password_hash, salt, first_name, last_name, role_id, status) VALUES (?,?,?,?,?,?,'active')"
  ).run(email, hash, salt, first, last, roleRow.id).lastInsertRowid);

  audit({
    staff: req.staff, action: 'created', entity: 'staff', entityId: String(id),
    summary: `Created ${email} as ${roleRow.name}`, after: { email, role: roleRow.key }, ip: ipOf(req)
  });
  res.status(201).json({ staff: { id, email, first_name: first, last_name: last, role_key: roleRow.key, status: 'active' } });
});

router.patch('/staff/:id', require_('staff.manage'), (req, res) => {
  const before = db.prepare('SELECT * FROM staff WHERE id = ?').get(req.params.id);
  if (!before) return res.status(404).json({ error: 'Staff account not found' });

  const sets = [];
  const args = [];
  ['first_name', 'last_name'].forEach((f) => {
    if (req.body[f] !== undefined) { sets.push(`${f} = ?`); args.push(req.body[f]); }
  });
  if (req.body.role !== undefined) {
    const roleRow = db.prepare('SELECT id FROM roles WHERE key = ?').get(req.body.role);
    if (!roleRow) return res.status(400).json({ error: 'Unknown role.' });
    /* Nobody may demote themselves out of the seat they are using. */
    if (Number(req.params.id) === Number(req.staff.id)) {
      return res.status(409).json({ error: 'You cannot change your own role. Ask another administrator.' });
    }
    sets.push('role_id = ?'); args.push(roleRow.id);
  }
  if (req.body.status !== undefined) {
    if (!['active', 'disabled'].includes(req.body.status)) return res.status(400).json({ error: 'Status must be active or disabled.' });
    if (Number(req.params.id) === Number(req.staff.id)) {
      return res.status(409).json({ error: 'You cannot disable your own account.' });
    }
    sets.push('status = ?'); args.push(req.body.status);
  }
  if (req.body.password !== undefined) {
    const weak = checkStrength(req.body.password);
    if (weak) return res.status(400).json({ error: weak });
    const { hash, salt } = hashPassword(req.body.password);
    sets.push('password_hash = ?', 'salt = ?'); args.push(hash, salt);
  }
  if (!sets.length) return res.status(400).json({ error: 'Nothing to update.' });

  db.prepare(`UPDATE staff SET ${sets.join(', ')} WHERE id = ?`).run(...args, req.params.id);
  const after = db.prepare('SELECT * FROM staff WHERE id = ?').get(req.params.id);

  /* A password change invalidates that account's open sessions. */
  if (req.body.password !== undefined) {
    db.prepare('DELETE FROM staff_sessions WHERE staff_id = ?').run(req.params.id);
  }

  audit({
    staff: req.staff, action: 'updated', entity: 'staff', entityId: String(after.id),
    summary: `Updated ${after.email}`,
    before: { ...before, password_hash: undefined, salt: undefined },
    after: { ...after, password_hash: undefined, salt: undefined },
    ip: ipOf(req)
  });
  const { password_hash, salt, ...safe } = after;
  res.json({ staff: safe });
});

router.delete('/staff/:id', require_('staff.manage'), (req, res) => {
  const before = db.prepare('SELECT * FROM staff WHERE id = ?').get(req.params.id);
  if (!before) return res.status(404).json({ error: 'Staff account not found' });
  if (Number(req.params.id) === Number(req.staff.id)) {
    return res.status(409).json({ error: 'You cannot revoke your own access.' });
  }
  /* Disabled, never deleted: the audit log points at these rows and
     must keep resolving to a real person. */
  db.prepare("UPDATE staff SET status = 'disabled' WHERE id = ?").run(req.params.id);
  db.prepare('DELETE FROM staff_sessions WHERE staff_id = ?').run(req.params.id);
  audit({ staff: req.staff, action: 'disabled', entity: 'staff', entityId: req.params.id, summary: `Revoked access for ${before.email}`, before, ip: ipOf(req) });
  res.json({ ok: true });
});

/* =========================================================
   ROLES — permission assignment
   permissions.manage existed; nothing used it.
   ========================================================= */
router.put('/roles/:key/permissions', require_('permissions.manage'), (req, res) => {
  const role = db.prepare('SELECT * FROM roles WHERE key = ?').get(req.params.key);
  if (!role) return res.status(404).json({ error: 'Role not found' });
  const keys = Array.isArray(req.body?.permissions) ? req.body.permissions : null;
  if (!keys) return res.status(400).json({ error: 'Send a permissions array.' });

  const known = db.prepare('SELECT id, key FROM permissions').all();
  const byKey = new Map(known.map((p) => [p.key, p.id]));
  const unknown = keys.filter((k) => !byKey.has(k));
  if (unknown.length) return res.status(400).json({ error: `Unknown permission(s): ${unknown.join(', ')}` });

  const beforeKeys = db.prepare(
    'SELECT p.key FROM role_permissions rp JOIN permissions p ON p.id = rp.permission_id WHERE rp.role_id = ?'
  ).all(role.id).map((r) => r.key);

  /* An owner who removes permissions.manage from their own role locks
     every administrator out of this screen permanently. */
  if (req.staff.role === role.key && !keys.includes('permissions.manage')) {
    return res.status(409).json({ error: 'You cannot remove permission management from your own role.' });
  }

  tx(() => {
    db.prepare('DELETE FROM role_permissions WHERE role_id = ?').run(role.id);
    const ins = db.prepare('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)');
    for (const k of keys) ins.run(role.id, byKey.get(k));
  });

  audit({
    staff: req.staff, action: 'updated', entity: 'role', entityId: role.key,
    summary: `Set ${keys.length} permission(s) on ${role.name}`,
    before: { permissions: beforeKeys }, after: { permissions: keys }, ip: ipOf(req)
  });
  res.json({ role: role.key, permissions: keys });
});

/* =========================================================
   ORDERS — cancel
   orders.cancel existed as a permission with no route. Cancelling
   has to return the units to the shelf, which the inventory engine
   already knows how to do.
   ========================================================= */
router.post('/orders/:id/cancel', require_('orders.cancel'), (req, res) => {
  const before = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!before) return res.status(404).json({ error: 'Order not found' });
  if (before.status === 'Cancelled') return res.status(409).json({ error: 'That order is already cancelled.' });

  const reason = String(req.body?.reason || '').trim();
  if (!reason) return res.status(400).json({ error: 'Give a reason — it is written to the audit log.' });

  /* The status change and the stock return are one unit: a cancelled
     order whose units never came back is worse than no cancellation. */
  tx(() => {
    db.prepare("UPDATE orders SET status = 'Cancelled' WHERE id = ?").run(req.params.id);
    restore(req.params.id, { reason: `Cancelled: ${reason}` });
  });

  const after = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  audit({
    staff: req.staff, action: 'cancelled', entity: 'order', entityId: req.params.id,
    summary: `Cancelled ${req.params.id} — ${reason}`, before, after, ip: ipOf(req)
  });
  res.json({ order: after, restocked: true });
});

/* =========================================================
   COMMAND CENTER & AI INTELLIGENCE
   ========================================================= */
router.get('/command-center', require_('dashboard.view'), (req, res) => {
  try {
    const kpis = getCommandCenterKPIs();
    const summary = getAIBusinessSummary();
    const health = getInventoryHealthScore();
    const alerts = listAIAlerts({ status: 'active' }).slice(0, 6);
    res.json({ kpis, summary, health, recentAlerts: alerts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/ai/summary', require_('ai.view'), (_req, res) => {
  try {
    res.json(getAIBusinessSummary());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/ai/alerts', require_('ai.view'), (req, res) => {
  try {
    const alerts = listAIAlerts(req.query);
    res.json({ alerts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/ai/alerts/:id', require_('ai.feedback'), (req, res) => {
  try {
    const { status } = req.body || {};
    const updated = updateAIAlertStatus(req.params.id, status);
    audit({
      staff: req.staff, action: 'alert_updated', entity: 'ai_alert', entityId: req.params.id,
      summary: `Alert #${req.params.id} marked ${status}`, after: { status }, ip: ipOf(req)
    });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/ai/forecast', require_('ai.view'), (req, res) => {
  try {
    const forecast = getDemandForecast(req.query);
    res.json(forecast);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/ai/stockout-risk', require_('ai.view'), (_req, res) => {
  try {
    const items = getStockoutRiskBoard();
    res.json({ items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/ai/reorders', require_('ai.view'), (_req, res) => {
  try {
    const reorders = getSmartReorders();
    res.json({ reorders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/ai/reorders/approve', require_('inventory.purchase'), (req, res) => {
  try {
    const { supplierId, warehouseId, items, notes } = req.body || {};
    const po = createPurchaseOrder({
      supplierId: supplierId || 1,
      warehouseId: warehouseId || 1,
      items: items || [],
      notes: notes || 'AI Smart Reorder approval',
      aiRecommended: 1,
      staff: req.staff,
      ip: ipOf(req)
    });
    res.json({ po, success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/ai/overstock-deadstock', require_('ai.view'), (_req, res) => {
  try {
    res.json(getOverstockAndDeadStock());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/ai/health', require_('ai.view'), (_req, res) => {
  try {
    res.json(getInventoryHealthScore());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/ai/simulate', require_('ai.view'), (req, res) => {
  try {
    const result = runForecastSimulation(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/ai/performance', require_('ai.view'), (_req, res) => {
  try {
    res.json(getAIPerformanceOutcomes());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================================================
   WAREHOUSES & HEATMAP
   ========================================================= */
router.get('/warehouses', require_('warehouses.view'), (_req, res) => {
  try {
    const warehouses = listWarehouses();
    res.json({ warehouses });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/warehouses/:id/heatmap', require_('warehouses.view'), (req, res) => {
  try {
    const data = getWarehouseHeatmap(req.params.id, req.query);
    if (!data) return res.status(404).json({ error: 'Warehouse not found.' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/transfers', require_('inventory.transfer'), (req, res) => {
  try {
    res.json(listTransfers(req.query));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/transfers', require_('inventory.transfer'), (req, res) => {
  try {
    const result = createTransfer({ ...req.body, staff: req.staff, ip: ipOf(req) });
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/transfers/:id/status', require_('inventory.transfer'), (req, res) => {
  try {
    const result = updateTransferStatus({
      transferId: req.params.id, status: req.body.status, staff: req.staff, ip: ipOf(req)
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* =========================================================
   PROCUREMENT & SUPPLIERS
   ========================================================= */
router.get('/suppliers', require_('inventory.purchase'), (_req, res) => {
  try {
    res.json({ suppliers: listSuppliers() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/purchase-orders', require_('inventory.purchase'), (req, res) => {
  try {
    res.json(listPurchaseOrders(req.query));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/purchase-orders', require_('inventory.purchase'), (req, res) => {
  try {
    const result = createPurchaseOrder({ ...req.body, staff: req.staff, ip: ipOf(req) });
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/purchase-orders/:id/status', require_('inventory.purchase'), (req, res) => {
  try {
    const result = updatePurchaseOrderStatus({
      poId: req.params.id, status: req.body.status, staff: req.staff, ip: ipOf(req)
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* =========================================================
   INVENTORY V2 & TRANSACTIONS
   ========================================================= */
router.get('/inventory-v2', require_('inventory.view'), (req, res) => {
  try {
    res.json(listInventory(req.query));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/inventory/:id/adjust-v2', require_('inventory.adjust'), (req, res) => {
  try {
    const result = adjustStock({
      productId: req.params.id,
      ...req.body,
      staff: req.staff,
      ip: ipOf(req)
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/inventory/transactions', require_('inventory.view'), (req, res) => {
  try {
    res.json(listTransactions(req.query));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================================================
   CYCLE COUNTS — physical stocktake
   ========================================================= */
router.get('/cycle-counts', require_('inventory.view'), (_req, res) => {
  try {
    res.json({ counts: listCycleCounts() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/cycle-counts', require_('inventory.adjust'), (req, res) => {
  try {
    const result = createCycleCount({ ...req.body, staff: req.staff });
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/cycle-counts/:id', require_('inventory.view'), (req, res) => {
  const cc = getCycleCount(req.params.id);
  if (!cc) return res.status(404).json({ error: 'Cycle count not found' });
  res.json({ cycleCount: cc });
});

router.patch('/cycle-counts/:id/items/:productId', require_('inventory.adjust'), (req, res) => {
  try {
    const result = recordCount({
      cycleCountId: req.params.id,
      productId: req.params.productId,
      countedQty: req.body?.countedQty,
      staff: req.staff
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/cycle-counts/:id/complete', require_('inventory.adjust'), (req, res) => {
  try {
    const result = completeCycleCount({ cycleCountId: req.params.id, staff: req.staff, ip: ipOf(req) });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/cycle-counts/:id/cancel', require_('inventory.adjust'), (req, res) => {
  try {
    const result = cancelCycleCount({ cycleCountId: req.params.id, staff: req.staff });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* =========================================================
   ANALYTICS & REPORTING
   ========================================================= */
router.get('/analytics/period', require_('dashboard.view'), (req, res) => {
  try {
    res.json(getPeriodMetrics({ from: req.query.from, to: req.query.to }));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/analytics/products', require_('dashboard.view'), (_req, res) => {
  try {
    res.json({ products: getProductPerformanceMatrix() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/analytics/customers', require_('dashboard.view'), (_req, res) => {
  try {
    res.json(getCustomerBehaviorAnalytics());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/analytics/returns', require_('dashboard.view'), (_req, res) => {
  try {
    res.json(getReturnsAnalytics());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/analytics/pricing', require_('dashboard.view'), (_req, res) => {
  try {
    res.json({ products: getPricingAnalytics() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================================================
   ANALYTICS SERIES
   The dashboard had KPIs — single numbers — and nothing over
   time, so there was nothing a chart could be drawn from. These
   are the series behind the graphs: real orders only, with the
   synthetic ML training history excluded, so a figure on screen
   is a figure the business actually took.
   ========================================================= */
const REAL_ORDERS = "channel IS NULL OR channel != 'synthetic'";

router.get('/analytics/series', require_('dashboard.view'), (req, res) => {
  const days = Math.min(Math.max(Number(req.query.days) || 30, 7), 180);

  /* A day with no orders has to appear as a zero, not be missing —
     a gap in a time series reads as "we did not measure", which is a
     different claim from "we sold nothing". SQLite has no generate_series,
     so the calendar is built here and the totals are joined onto it. */
  const rows = db.prepare(
    `SELECT date(placed_at) AS day,
            COUNT(*)        AS orders,
            SUM(total)      AS revenue,
            SUM(discount)   AS discount
       FROM orders
      WHERE (${REAL_ORDERS})
        AND date(placed_at) >= date('now', ?)
      GROUP BY date(placed_at)`
  ).all(`-${days - 1} days`);

  const byDay = new Map(rows.map((r) => [r.day, r]));
  const series = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const day = db.prepare("SELECT date('now', ?) AS d").get(`-${i} days`).d;
    const hit = byDay.get(day);
    series.push({
      day,
      orders: hit ? hit.orders : 0,
      revenue: hit ? hit.revenue : 0,
      averageOrder: hit && hit.orders ? Math.round(hit.revenue / hit.orders) : 0
    });
  }

  /* revenue by collection — ranked, so one hue and a label per bar */
  const byCategory = db.prepare(
    `SELECT p.cat AS category,
            SUM(oi.qty * oi.unit_price) AS revenue,
            SUM(oi.qty)                 AS units
       FROM order_items oi
       JOIN orders o   ON o.id = oi.order_id
       JOIN products p ON p.id = oi.product_id
      WHERE (${REAL_ORDERS.replace(/channel/g, 'o.channel')})
        AND date(o.placed_at) >= date('now', ?)
      GROUP BY p.cat
      ORDER BY revenue DESC`
  ).all(`-${days - 1} days`);

  const byStatus = db.prepare(
    `SELECT status, COUNT(*) AS orders, SUM(total) AS revenue
       FROM orders
      WHERE (${REAL_ORDERS})
      GROUP BY status
      ORDER BY orders DESC`
  ).all();

  const topProducts = db.prepare(
    `SELECT p.id, p.name, p.cat AS category,
            SUM(oi.qty)                 AS units,
            SUM(oi.qty * oi.unit_price) AS revenue
       FROM order_items oi
       JOIN orders o   ON o.id = oi.order_id
       JOIN products p ON p.id = oi.product_id
      WHERE (${REAL_ORDERS.replace(/channel/g, 'o.channel')})
      GROUP BY p.id
      ORDER BY revenue DESC
      LIMIT 8`
  ).all();

  /* Stock health uses the reserved status palette, so the bands are
     named here rather than being decided in the view. */
  const stock = db.prepare(
    `SELECT
        SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END)                          AS out,
        SUM(CASE WHEN stock BETWEEN 1 AND 3 THEN 1 ELSE 0 END)              AS critical,
        SUM(CASE WHEN stock BETWEEN 4 AND 10 THEN 1 ELSE 0 END)             AS low,
        SUM(CASE WHEN stock > 10 THEN 1 ELSE 0 END)                         AS healthy,
        COUNT(*)                                                            AS total
       FROM products WHERE status = 'active'`
  ).get();

  const totalRevenue = series.reduce((n, d) => n + d.revenue, 0);
  const totalOrders = series.reduce((n, d) => n + d.orders, 0);

  res.json({
    days,
    series,
    byCategory,
    byStatus,
    topProducts,
    stock,
    totals: {
      revenue: totalRevenue,
      orders: totalOrders,
      averageOrder: totalOrders ? Math.round(totalRevenue / totalOrders) : 0,
      tradingDays: series.filter((d) => d.orders > 0).length
    },
    /* Said plainly so nobody reads a demo shop's numbers as a business. */
    note: 'Real orders only. Synthetic history used to train the forecasting models is excluded.'
  });
});

router.get('/audit', require_('audit.view'), (req, res) => {
  const { entity = '', limit = 100 } = req.query;
  const rows = entity
    ? db.prepare('SELECT * FROM audit_logs WHERE entity = ? ORDER BY created_at DESC LIMIT ?').all(entity, Number(limit))
    : db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?').all(Number(limit));
  res.json({ items: rows.map((r) => ({ ...r, before_val: parse(r.before_val, null), after_val: parse(r.after_val, null) })) });
});

export default router;
