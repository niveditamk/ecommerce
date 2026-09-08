/* =============================================================
   INVENTORY ENGINE
   The single authority on stock. Nothing else in the codebase
   may write to products.on_hand or products.reserved — every
   mutation goes through here and leaves a ledger row behind.

   Invariant:  available = on_hand - reserved

   Concurrency: reservations are taken with a conditional UPDATE
   inside BEGIN IMMEDIATE. If two requests race for the last unit,
   the second one's UPDATE matches zero rows and the whole
   reservation rolls back — so overselling is impossible rather
   than merely unlikely.
   ============================================================= */
import { db } from '../db/index.js';

/* Ledger vocabulary — every stock movement is one of these. */
export const TX = {
  STOCK_RESERVED: 'STOCK_RESERVED',
  STOCK_RELEASED: 'STOCK_RELEASED',
  RESERVATION_EXPIRED: 'RESERVATION_EXPIRED',
  ORDER_CONFIRMED: 'ORDER_CONFIRMED',
  ORDER_CANCELLED: 'ORDER_CANCELLED',
  STOCK_ADJUSTED: 'STOCK_ADJUSTED',
  GOODS_RECEIVED: 'GOODS_RECEIVED',
  RETURN_RESTORED: 'RETURN_RESTORED'
};

export const RESERVATION_TTL_MINUTES = 20;

/* ---------- transaction helper ----------
   node:sqlite has no .transaction() wrapper, so this is ours.
   IMMEDIATE takes the write lock up front, which is what makes
   the read-then-write inside safe. */
let txDepth = 0;

export function tx(fn) {
  /* Reentrant: an inner tx() joins the transaction already open rather
     than starting a second one (node:sqlite would reject the nested
     BEGIN). This is what lets checkout write the order row and commit
     the stock in ONE unit — previously they were two transactions, and
     a crash in the gap left an order whose reserved units were later
     swept back onto the shelf and sold again. */
  if (txDepth > 0) {
    txDepth += 1;
    try { return fn(); } finally { txDepth -= 1; }
  }

  db.exec('BEGIN IMMEDIATE');
  txDepth = 1;
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    try { db.exec('ROLLBACK'); } catch { /* already unwound */ }
    throw err;
  } finally {
    txDepth = 0;
  }
}

/* ---------- ledger ---------- */
function record({ productId, type, qty, before, after, referenceType, referenceId, reason, staffId }) {
  db.prepare(
    `INSERT INTO inventory_transactions
       (product_id, type, qty, previous_qty, new_qty, reference_type, reference_id, reason, staff_id)
     VALUES (?,?,?,?,?,?,?,?,?)`
  ).run(productId, type, qty, before, after, referenceType || null, referenceId == null ? null : String(referenceId), reason || null, staffId || null);
}

/* ---------- reads ---------- */
export function position(productId) {
  const p = db.prepare(
    'SELECT id, name, stock AS on_hand, reserved, incoming, damaged, safety_stock, low_stock_at FROM products WHERE id = ?'
  ).get(productId);
  if (!p) return null;
  return { ...p, available: Math.max(0, p.on_hand - p.reserved) };
}

export const availableOf = (productId) => position(productId)?.available ?? 0;

/* ---------- reservations ----------
   All-or-nothing: a basket either reserves completely or not at
   all, so a customer never pays for a partially-held order. */
export function reserve(lines, { sessionId = null, ttlMinutes = RESERVATION_TTL_MINUTES } = {}) {
  const wanted = lines
    .map((l) => ({ productId: l.productId ?? l.id, qty: Number(l.qty) || 0 }))
    .filter((l) => l.qty > 0);

  if (!wanted.length) return { ok: false, failures: [{ reason: 'Nothing to reserve.' }] };

  try {
    return tx(() => {
      const held = [];
      const failures = [];

      for (const line of wanted) {
        const before = db.prepare('SELECT stock, reserved, name FROM products WHERE id = ?').get(line.productId);
        if (!before) { failures.push({ productId: line.productId, reason: 'No such product.' }); break; }

        /* The guard is in the WHERE clause, so the check and the
           write are one atomic step. A loser sees changes === 0. */
        const res = db.prepare(
          `UPDATE products
              SET reserved = reserved + ?, updated_at = datetime('now')
            WHERE id = ? AND (stock - reserved) >= ?`
        ).run(line.qty, line.productId, line.qty);

        if (res.changes === 0) {
          failures.push({
            productId: line.productId,
            name: before.name,
            requested: line.qty,
            available: Math.max(0, before.stock - before.reserved),
            reason: 'Not enough available.'
          });
          break;
        }
        held.push({ ...line, name: before.name, reservedBefore: before.reserved });
      }

      if (failures.length) throw Object.assign(new Error('reservation failed'), { failures });

      const row = db.prepare(
        `INSERT INTO inventory_reservations (session_id, status, expires_at)
         VALUES (?, 'held', datetime('now', ?))`
      ).run(sessionId, `+${ttlMinutes} minutes`);
      const reservationId = Number(row.lastInsertRowid);

      for (const h of held) {
        db.prepare(
          'INSERT INTO inventory_reservation_items (reservation_id, product_id, qty) VALUES (?,?,?)'
        ).run(reservationId, h.productId, h.qty);

        record({
          productId: h.productId, type: TX.STOCK_RESERVED, qty: -h.qty,
          before: h.reservedBefore, after: h.reservedBefore + h.qty,
          referenceType: 'reservation', referenceId: reservationId,
          reason: 'Held for checkout'
        });
      }

      return { ok: true, reservationId, expiresInMinutes: ttlMinutes };
    });
  } catch (err) {
    return { ok: false, failures: err.failures || [{ reason: err.message }] };
  }
}

/* Give the units back. Used on cancel, on failure, and by the sweeper. */
export function release(reservationId, { reason = 'Released', type = TX.STOCK_RELEASED } = {}) {
  return tx(() => {
    const r = db.prepare("SELECT * FROM inventory_reservations WHERE id = ? AND status = 'held'").get(reservationId);
    if (!r) return { ok: false, reason: 'Not an open reservation.' };

    const items = db.prepare('SELECT * FROM inventory_reservation_items WHERE reservation_id = ?').all(reservationId);
    for (const it of items) {
      const before = db.prepare('SELECT reserved FROM products WHERE id = ?').get(it.product_id);
      db.prepare(
        "UPDATE products SET reserved = MAX(0, reserved - ?), updated_at = datetime('now') WHERE id = ?"
      ).run(it.qty, it.product_id);
      record({
        productId: it.product_id, type, qty: it.qty,
        before: before?.reserved ?? 0, after: Math.max(0, (before?.reserved ?? 0) - it.qty),
        referenceType: 'reservation', referenceId: reservationId, reason
      });
    }

    db.prepare("UPDATE inventory_reservations SET status = 'released' WHERE id = ?").run(reservationId);
    return { ok: true, released: items.length };
  });
}

/* Payment succeeded: the held units leave the building. Reserved
   drops and on_hand drops with it, so available is unchanged —
   which is correct, those units were never available. */
export function commit(reservationId, orderId) {
  return tx(() => {
    const r = db.prepare("SELECT * FROM inventory_reservations WHERE id = ? AND status = 'held'").get(reservationId);
    if (!r) return { ok: false, reason: 'Not an open reservation.' };

    const items = db.prepare('SELECT * FROM inventory_reservation_items WHERE reservation_id = ?').all(reservationId);
    for (const it of items) {
      const before = db.prepare('SELECT stock, reserved FROM products WHERE id = ?').get(it.product_id);
      db.prepare(
        `UPDATE products
            SET stock = MAX(0, stock - ?), reserved = MAX(0, reserved - ?), updated_at = datetime('now')
          WHERE id = ?`
      ).run(it.qty, it.qty, it.product_id);
      record({
        productId: it.product_id, type: TX.ORDER_CONFIRMED, qty: -it.qty,
        before: before.stock, after: Math.max(0, before.stock - it.qty),
        referenceType: 'order', referenceId: orderId, reason: 'Sold'
      });
    }

    db.prepare("UPDATE inventory_reservations SET status = 'committed', order_id = ? WHERE id = ?")
      .run(orderId, reservationId);
    return { ok: true, committed: items.length };
  });
}

/* A cancelled order puts the units back on the shelf. */
export function restore(orderId, { type = TX.ORDER_CANCELLED, reason = 'Order cancelled' } = {}) {
  return tx(() => {
    const items = db.prepare('SELECT product_id, qty FROM order_items WHERE order_id = ?').all(orderId);
    for (const it of items) {
      const before = db.prepare('SELECT stock FROM products WHERE id = ?').get(it.product_id);
      if (!before) continue;
      db.prepare("UPDATE products SET stock = stock + ?, updated_at = datetime('now') WHERE id = ?")
        .run(it.qty, it.product_id);
      record({
        productId: it.product_id, type, qty: it.qty,
        before: before.stock, after: before.stock + it.qty,
        referenceType: 'order', referenceId: orderId, reason
      });
    }
    return { ok: true, restored: items.length };
  });
}

/* Manual correction from the admin. Still a ledger entry. */
export function adjust(productId, delta, { reason = 'Adjustment', staffId = null, type = TX.STOCK_ADJUSTED } = {}) {
  return tx(() => {
    const before = db.prepare('SELECT stock, reserved FROM products WHERE id = ?').get(productId);
    if (!before) return { ok: false, reason: 'No such product.' };

    const next = Math.max(0, before.stock + delta);
    /* Never let a correction strand more reserved than on hand. */
    if (next < before.reserved) {
      return { ok: false, reason: `${before.reserved} units are reserved; cannot drop on-hand below that.` };
    }

    db.prepare("UPDATE products SET stock = ?, updated_at = datetime('now') WHERE id = ?").run(next, productId);
    record({
      productId, type, qty: delta, before: before.stock, after: next,
      referenceType: 'manual', referenceId: staffId, reason, staffId
    });
    return { ok: true, on_hand: next, available: Math.max(0, next - before.reserved) };
  });
}

/* ---------- expiry sweeper ----------
   An abandoned checkout must not hold stock forever. */
export function sweepExpired() {
  const due = db.prepare(
    "SELECT id FROM inventory_reservations WHERE status = 'held' AND expires_at <= datetime('now')"
  ).all();
  let released = 0;
  for (const r of due) {
    const out = release(r.id, { reason: 'Reservation expired', type: TX.RESERVATION_EXPIRED });
    if (out.ok) {
      db.prepare("UPDATE inventory_reservations SET status = 'expired' WHERE id = ?").run(r.id);
      released += 1;
    }
  }
  return released;
}

export function startSweeper(intervalMs = 60_000) {
  const timer = setInterval(() => {
    try {
      const n = sweepExpired();
      if (n) console.log(`[inventory] released ${n} expired reservation(s)`);
    } catch (err) {
      console.error('[inventory] sweep failed:', err.message);
    }
  }, intervalMs);
  timer.unref?.();
  return timer;
}

export function ledger(productId, limit = 50) {
  return db.prepare(
    `SELECT t.*, s.first_name || ' ' || s.last_name AS staff
       FROM inventory_transactions t
       LEFT JOIN staff s ON s.id = t.staff_id
      WHERE t.product_id = ?
      ORDER BY t.id DESC LIMIT ?`
  ).all(productId, limit);
}
