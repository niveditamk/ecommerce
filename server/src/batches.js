/* =============================================================
   BATCH & EXPIRY TRACKING
   Scoped to parfums — the one category here with a real shelf
   life. This tracks what was received and when it expires; it
   does not re-plumb the sales-side stock deduction to be
   batch-aware, so a batch's qty is what arrived in that lot, not
   a live remaining count drawn from orders.
   ============================================================= */
import { db } from './db/index.js';
import { audit } from './auth/rbac.js';

function assertExpiryEligible(productId) {
  const p = db.prepare('SELECT id, cat FROM products WHERE id = ?').get(productId);
  if (!p) throw new Error('Product not found.');
  if (p.cat !== 'parfums') throw new Error('Batch and expiry tracking only applies to Parfums.');
  return p;
}

export function listBatches(productId) {
  return db.prepare(`
    SELECT * FROM product_batches WHERE product_id = ? ORDER BY expiry_date ASC
  `).all(productId);
}

export function createBatch({ productId, batchNumber, qty, expiryDate, staff }) {
  assertExpiryEligible(productId);
  const cleanQty = Math.max(0, Math.round(Number(qty)));
  if (!cleanQty) throw new Error('Enter a quantity greater than zero.');
  if (!batchNumber || !String(batchNumber).trim()) throw new Error('Enter a batch number.');
  if (!expiryDate || Number.isNaN(new Date(expiryDate).getTime())) throw new Error('Enter a valid expiry date.');

  const res = db.prepare(`
    INSERT INTO product_batches (product_id, batch_number, qty, expiry_date, created_by)
    VALUES (?, ?, ?, ?, ?)
  `).run(productId, String(batchNumber).trim(), cleanQty, expiryDate, staff?.id || null);

  audit({
    staff, action: 'batch_received', entity: 'product', entityId: productId,
    summary: `Logged batch ${batchNumber} (${cleanQty} units, expires ${expiryDate})`
  });

  return db.prepare('SELECT * FROM product_batches WHERE id = ?').get(res.lastInsertRowid);
}

export function deleteBatch({ id, staff }) {
  const batch = db.prepare('SELECT * FROM product_batches WHERE id = ?').get(id);
  if (!batch) throw new Error('Batch not found.');
  db.prepare('DELETE FROM product_batches WHERE id = ?').run(id);
  audit({
    staff, action: 'batch_removed', entity: 'product', entityId: batch.product_id,
    summary: `Removed batch ${batch.batch_number}`
  });
  return { id };
}

/** Every parfums batch expiring within `withinDays`, or already
    expired — the cross-catalogue view a "count everything one by
    one" workflow can't give you. */
export function listExpiringBatches(withinDays = 90) {
  return db.prepare(`
    SELECT b.*, p.name AS product_name,
           CAST((julianday(b.expiry_date) - julianday('now')) AS INTEGER) AS days_until_expiry
      FROM product_batches b
      JOIN products p ON p.id = b.product_id
     WHERE julianday(b.expiry_date) - julianday('now') <= ?
     ORDER BY b.expiry_date ASC
  `).all(withinDays);
}
