/* =============================================================
   INVENTORY SERVICE
   Enterprise multi-warehouse, bin allocation, stock adjustments,
   transfers, purchase orders, and goods receipts engine.
   ============================================================= */
import { db } from '../db/index.js';
import { audit } from '../auth/rbac.js';

export function listWarehouses() {
  const warehouses = db.prepare(`
    SELECT w.*,
           (SELECT COUNT(DISTINCT product_id) FROM warehouse_stock ws WHERE ws.warehouse_id = w.id AND ws.on_hand > 0) AS active_skus,
           (SELECT COALESCE(SUM(ws.on_hand), 0) FROM warehouse_stock ws WHERE ws.warehouse_id = w.id) AS total_units,
           (SELECT COALESCE(SUM(ws.on_hand * p.price), 0)
              FROM warehouse_stock ws JOIN products p ON p.id = ws.product_id
             WHERE ws.warehouse_id = w.id) AS inventory_value,
           (SELECT COUNT(*) FROM warehouse_stock ws
             WHERE ws.warehouse_id = w.id AND ws.on_hand <= ws.reorder_point AND ws.on_hand > 0) AS low_stock_skus,
           (SELECT COUNT(*) FROM warehouse_stock ws
             WHERE ws.warehouse_id = w.id AND ws.on_hand = 0) AS out_of_stock_skus,
           (SELECT COALESCE(SUM(ws.incoming), 0) FROM warehouse_stock ws WHERE ws.warehouse_id = w.id) AS incoming_units
      FROM warehouses w
     WHERE w.is_active = 1
     ORDER BY w.id ASC
  `).all();

  return warehouses.map((w) => ({
    ...w,
    utilization_pct: w.capacity_units > 0 ? +((w.total_units / w.capacity_units) * 100).toFixed(1) : 0
  }));
}

export function getWarehouseHeatmap(warehouseId, { aisle = '' } = {}) {
  const wh = db.prepare('SELECT * FROM warehouses WHERE id = ?').get(warehouseId);
  if (!wh) return null;

  let query = `
    SELECT ws.*, p.name AS product_name, p.cat AS category, p.price,
           (ws.on_hand * p.price) AS total_value
      FROM warehouse_stock ws
      JOIN products p ON p.id = ws.product_id
     WHERE ws.warehouse_id = ?
  `;
  const args = [warehouseId];
  if (aisle) {
    query += ' AND ws.aisle = ?';
    args.push(aisle);
  }
  query += ' ORDER BY ws.aisle ASC, ws.rack ASC, ws.bin ASC';

  const bins = db.prepare(query).all(...args);

  // Group by aisle & rack
  const heatmap = {};
  bins.forEach((b) => {
    if (!heatmap[b.aisle]) heatmap[b.aisle] = {};
    if (!heatmap[b.aisle][b.rack]) heatmap[b.aisle][b.rack] = [];
    
    // Determine cell occupancy state
    let state = 'healthy';
    if (b.on_hand === 0) state = 'empty';
    else if (b.on_hand <= b.reorder_point) state = 'low';
    else if (b.on_hand > b.safety_stock * 6) state = 'overstocked';
    else if (b.on_hand > 15) state = 'high';

    heatmap[b.aisle][b.rack].push({
      ...b,
      state
    });
  });

  return { warehouse: wh, heatmap, totalBins: bins.length };
}

export function listInventory({
  q = '', warehouseId = '', category = '', status = '',
  page = 1, perPage = 25, sort = 'name'
} = {}) {
  const where = ["p.status != 'archived'"];
  const args = [];

  if (q) {
    where.push('(p.name LIKE ? OR p.id LIKE ?)');
    args.push(`%${q}%`, `%${q}%`);
  }
  if (category) {
    where.push('p.cat = ?');
    args.push(category);
  }

  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = db.prepare(`SELECT COUNT(*) AS n FROM products p ${clause}`).get(...args).n;

  const size = Math.min(100, Math.max(1, Number(perPage)));
  const offset = (Math.max(1, Number(page)) - 1) * size;

  const items = db.prepare(`
    SELECT p.id, p.name, p.cat, p.price, p.stock AS global_stock,
           p.reserved, p.incoming, p.damaged, p.safety_stock, p.low_stock_at,
           (p.stock - p.reserved) AS global_available,
           (p.stock * p.price) AS total_value,
           p.status AS product_status
      FROM products p
      ${clause}
     ORDER BY p.name ASC
     LIMIT ? OFFSET ?
  `).all(...args, size, offset);

  // Attach warehouse-specific locations & positions
  const enriched = items.map((p) => {
    const locations = db.prepare(`
      SELECT ws.*, w.code AS warehouse_code, w.name AS warehouse_name, w.city
        FROM warehouse_stock ws
        JOIN warehouses w ON w.id = ws.warehouse_id
       WHERE ws.product_id = ?
       ORDER BY ws.on_hand DESC
    `).all(p.id);

    // Compute aggregate health status
    let inventoryStatus = 'Healthy';
    if (p.global_stock === 0) inventoryStatus = 'Out of Stock';
    else if (p.global_available <= (p.low_stock_at || 3)) inventoryStatus = 'Critical';
    else if (p.global_stock <= (p.low_stock_at || 5)) inventoryStatus = 'Low Stock';
    else if (p.global_stock > 35) inventoryStatus = 'Overstock';

    return {
      ...p,
      inventoryStatus,
      locations
    };
  });

  // Totals overview
  const totals = db.prepare(`
    SELECT COUNT(*) AS total_skus,
           COALESCE(SUM(stock), 0) AS total_units,
           COALESCE(SUM(stock * price), 0) AS inventory_value,
           COALESCE(SUM(reserved), 0) AS total_reserved,
           COALESCE(SUM(incoming), 0) AS total_incoming,
           COALESCE(SUM(damaged), 0) AS total_damaged,
           SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) AS out_of_stock_count,
           SUM(CASE WHEN stock > 0 AND (stock - reserved) <= low_stock_at THEN 1 ELSE 0 END) AS low_stock_count,
           SUM(CASE WHEN stock > 35 THEN 1 ELSE 0 END) AS overstock_count
      FROM products
     WHERE status != 'archived'
  `).get();

  return {
    items: enriched,
    total,
    page: Number(page),
    perPage: size,
    pages: Math.max(1, Math.ceil(total / size)),
    totals
  };
}

export function adjustStock({
  productId, warehouseId = 1, delta, reason = 'adjustment',
  notes = '', reference = '', staff, ip
}) {
  const p = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
  if (!p) throw new Error('Product not found.');

  const nDelta = Number(delta);
  if (!Number.isFinite(nDelta) || nDelta === 0) throw new Error('Adjustment delta must be non-zero.');

  const prevStock = p.stock;
  const nextStock = Math.max(0, prevStock + nDelta);

  // Update global product stock
  db.prepare("UPDATE products SET stock = ?, updated_at = datetime('now') WHERE id = ?").run(nextStock, p.id);

  // Update warehouse stock if table exists
  const ws = db.prepare('SELECT * FROM warehouse_stock WHERE warehouse_id = ? AND product_id = ?').get(warehouseId, productId);
  if (ws) {
    const nextOnHand = Math.max(0, ws.on_hand + nDelta);
    const nextAvail = Math.max(0, nextOnHand - ws.reserved);
    db.prepare(`
      UPDATE warehouse_stock
         SET on_hand = ?, available = ?, updated_at = datetime('now')
       WHERE warehouse_id = ? AND product_id = ?
    `).run(nextOnHand, nextAvail, warehouseId, productId);
  }

  // Insert into immutable transaction log
  db.prepare(`
    INSERT INTO inventory_transactions
      (product_id, type, qty, previous_qty, new_qty, reference_type, reference_id, reason, staff_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    productId,
    nDelta > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
    Math.abs(nDelta),
    prevStock,
    nextStock,
    reference ? 'MANUAL_REF' : 'ADJUSTMENT',
    reference || null,
    `${reason}: ${notes}`,
    staff?.id || null
  );

  // Insert legacy stock movement for backward compatibility
  db.prepare(`
    INSERT INTO stock_movements (product_id, delta, reason, note, staff_id, balance)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(productId, nDelta, reason, notes, staff?.id || null, nextStock);

  audit({
    staff,
    action: 'stock_adjusted',
    entity: 'inventory',
    entityId: productId,
    summary: `Adjusted stock by ${nDelta > 0 ? '+' : ''}${nDelta} (${reason}). New stock: ${nextStock}`,
    before: { stock: prevStock },
    after: { stock: nextStock, delta: nDelta, reason, notes },
    ip
  });

  return { productId, previous: prevStock, current: nextStock, delta: nDelta };
}

export function listTransactions({
  productId = '', type = '', page = 1, perPage = 25
} = {}) {
  const where = [];
  const args = [];

  if (productId) {
    where.push('t.product_id = ?');
    args.push(productId);
  }
  if (type) {
    where.push('t.type = ?');
    args.push(type);
  }

  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = db.prepare(`SELECT COUNT(*) AS n FROM inventory_transactions t ${clause}`).get(...args).n;

  const size = Math.min(100, Math.max(1, Number(perPage)));
  const offset = (Math.max(1, Number(page)) - 1) * size;

  const items = db.prepare(`
    SELECT t.*, p.name AS product_name, p.cat AS category,
           s.first_name, s.last_name, s.email AS staff_email
      FROM inventory_transactions t
      JOIN products p ON p.id = t.product_id
      LEFT JOIN staff s ON s.id = t.staff_id
      ${clause}
     ORDER BY t.created_at DESC
     LIMIT ? OFFSET ?
  `).all(...args, size, offset);

  return {
    items,
    total,
    page: Number(page),
    perPage: size,
    pages: Math.max(1, Math.ceil(total / size))
  };
}

export function listTransfers({ status = '', page = 1, perPage = 20 } = {}) {
  const where = [];
  const args = [];
  if (status) {
    where.push('t.status = ?');
    args.push(status);
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const total = db.prepare(`SELECT COUNT(*) AS n FROM warehouse_transfers t ${clause}`).get(...args).n;
  const size = Math.min(100, Math.max(1, Number(perPage)));
  const offset = (Math.max(1, Number(page)) - 1) * size;

  const transfers = db.prepare(`
    SELECT t.*,
           w1.code AS source_code, w1.name AS source_name, w1.city AS source_city,
           w2.code AS dest_code, w2.name AS dest_name, w2.city AS dest_city,
           s1.first_name AS req_first, s1.last_name AS req_last,
           s2.first_name AS app_first, s2.last_name AS app_last,
           (SELECT COUNT(*) FROM warehouse_transfer_items ti WHERE ti.transfer_id = t.id) AS item_count,
           (SELECT COALESCE(SUM(ti.requested_qty), 0) FROM warehouse_transfer_items ti WHERE ti.transfer_id = t.id) AS total_units
      FROM warehouse_transfers t
      JOIN warehouses w1 ON w1.id = t.source_id
      JOIN warehouses w2 ON w2.id = t.dest_id
      LEFT JOIN staff s1 ON s1.id = t.requested_by
      LEFT JOIN staff s2 ON s2.id = t.approved_by
      ${clause}
     ORDER BY t.created_at DESC
     LIMIT ? OFFSET ?
  `).all(...args, size, offset);

  // Attach items to each transfer
  const enriched = transfers.map((tr) => {
    const items = db.prepare(`
      SELECT ti.*, p.name AS product_name, p.price
        FROM warehouse_transfer_items ti
        JOIN products p ON p.id = ti.product_id
       WHERE ti.transfer_id = ?
    `).all(tr.id);
    return { ...tr, items };
  });

  return {
    transfers: enriched,
    total,
    page: Number(page),
    perPage: size,
    pages: Math.max(1, Math.ceil(total / size))
  };
}

export function createTransfer({
  sourceId, destId, items = [], notes = '', carrier = '', trackingNo = '', staff, ip
}) {
  if (sourceId === destId) throw new Error('Source and destination warehouse must be different.');
  if (!items.length) throw new Error('Transfer must include at least one item.');

  const transferNo = `TR-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;

  const res = db.prepare(`
    INSERT INTO warehouse_transfers
      (transfer_no, source_id, dest_id, status, requested_by, carrier, tracking_no, notes)
    VALUES (?, ?, ?, 'Requested', ?, ?, ?, ?)
  `).run(transferNo, sourceId, destId, staff?.id || null, carrier, trackingNo, notes);

  const transferId = res.lastInsertRowid;
  const insItem = db.prepare(`
    INSERT INTO warehouse_transfer_items (transfer_id, product_id, requested_qty)
    VALUES (?, ?, ?)
  `);

  items.forEach((it) => {
    insItem.run(transferId, it.productId, it.qty);
  });

  audit({
    staff,
    action: 'transfer_requested',
    entity: 'warehouse_transfer',
    entityId: String(transferId),
    summary: `Created transfer ${transferNo} with ${items.length} item(s)`,
    after: { transferNo, sourceId, destId, items },
    ip
  });

  return { id: transferId, transferNo, status: 'Requested' };
}

export function updateTransferStatus({ transferId, status, staff, ip }) {
  const valid = ['Requested', 'Approved', 'Picking', 'Dispatched', 'In Transit', 'Received', 'Reconciled', 'Cancelled'];
  if (!valid.includes(status)) throw new Error(`Invalid status: ${status}`);

  const tr = db.prepare('SELECT * FROM warehouse_transfers WHERE id = ?').get(transferId);
  if (!tr) throw new Error('Transfer not found.');

  const approvedBy = (status === 'Approved' || status === 'Dispatched') ? (staff?.id || tr.approved_by) : tr.approved_by;

  db.prepare(`
    UPDATE warehouse_transfers
       SET status = ?, approved_by = ?, updated_at = datetime('now')
     WHERE id = ?
  `).run(status, approvedBy, transferId);

  // If received/reconciled, shift stock between warehouses
  if (status === 'Received' && tr.status !== 'Received' && tr.status !== 'Reconciled') {
    const items = db.prepare('SELECT * FROM warehouse_transfer_items WHERE transfer_id = ?').all(transferId);
    items.forEach((it) => {
      // Deduct from source warehouse
      db.prepare(`
        UPDATE warehouse_stock
           SET on_hand = MAX(0, on_hand - ?), available = MAX(0, available - ?), updated_at = datetime('now')
         WHERE warehouse_id = ? AND product_id = ?
      `).run(it.requested_qty, it.requested_qty, tr.source_id, it.product_id);

      // Add to dest warehouse
      db.prepare(`
        INSERT INTO warehouse_stock (warehouse_id, product_id, on_hand, available)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(warehouse_id, product_id) DO UPDATE SET
          on_hand = on_hand + excluded.on_hand,
          available = available + excluded.available,
          updated_at = datetime('now')
      `).run(tr.dest_id, it.product_id, it.requested_qty, it.requested_qty);

      // Mark received qty
      db.prepare('UPDATE warehouse_transfer_items SET received_qty = requested_qty WHERE id = ?').run(it.id);
    });
  }

  audit({
    staff,
    action: 'transfer_status_updated',
    entity: 'warehouse_transfer',
    entityId: String(transferId),
    summary: `Transfer ${tr.transfer_no} transitioned from ${tr.status} to ${status}`,
    before: { status: tr.status },
    after: { status },
    ip
  });

  return { id: transferId, transferNo: tr.transfer_no, status };
}

export function listSuppliers() {
  return db.prepare(`
    SELECT s.*,
           (SELECT COUNT(*) FROM purchase_orders po WHERE po.supplier_id = s.id) AS total_pos,
           (SELECT COALESCE(SUM(po.total_value), 0) FROM purchase_orders po WHERE po.supplier_id = s.id AND po.status != 'Cancelled') AS total_spend
      FROM suppliers s
     ORDER BY s.reliability_score DESC
  `).all();
}

export function listPurchaseOrders({ status = '', supplierId = '', page = 1, perPage = 20 } = {}) {
  const where = [];
  const args = [];
  if (status) {
    where.push('po.status = ?');
    args.push(status);
  }
  if (supplierId) {
    where.push('po.supplier_id = ?');
    args.push(supplierId);
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const total = db.prepare(`SELECT COUNT(*) AS n FROM purchase_orders po ${clause}`).get(...args).n;
  const size = Math.min(100, Math.max(1, Number(perPage)));
  const offset = (Math.max(1, Number(page)) - 1) * size;

  const orders = db.prepare(`
    SELECT po.*,
           s.name AS supplier_name, s.code AS supplier_code, s.contact_name, s.email AS supplier_email,
           w.name AS warehouse_name, w.code AS warehouse_code, w.city AS warehouse_city,
           (SELECT COUNT(*) FROM purchase_order_items poi WHERE poi.po_id = po.id) AS item_count,
           (SELECT COALESCE(SUM(poi.qty), 0) FROM purchase_order_items poi WHERE poi.po_id = po.id) AS total_units,
           (SELECT COALESCE(SUM(poi.received_qty), 0) FROM purchase_order_items poi WHERE poi.po_id = po.id) AS received_units
      FROM purchase_orders po
      JOIN suppliers s ON s.id = po.supplier_id
      JOIN warehouses w ON w.id = po.warehouse_id
      ${clause}
     ORDER BY po.created_at DESC
     LIMIT ? OFFSET ?
  `).all(...args, size, offset);

  const enriched = orders.map((o) => {
    const items = db.prepare(`
      SELECT poi.*, p.name AS product_name, p.cat AS category
        FROM purchase_order_items poi
        JOIN products p ON p.id = poi.product_id
       WHERE poi.po_id = ?
    `).all(o.id);
    return { ...o, items };
  });

  return {
    orders: enriched,
    total,
    page: Number(page),
    perPage: size,
    pages: Math.max(1, Math.ceil(total / size))
  };
}

export function createPurchaseOrder({
  supplierId, warehouseId, expectedDate = '', items = [], notes = '',
  aiRecommended = 0, staff, ip
}) {
  if (!supplierId) throw new Error('Supplier is required.');
  if (!warehouseId) throw new Error('Destination warehouse is required.');
  if (!items.length) throw new Error('Purchase order requires at least one item.');

  const poNumber = `PO-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
  const totalValue = items.reduce((sum, it) => sum + (it.qty * it.unitCost), 0);

  const res = db.prepare(`
    INSERT INTO purchase_orders
      (po_number, supplier_id, warehouse_id, status, total_value, expected_date, ai_recommended, notes, created_by)
    VALUES (?, ?, ?, 'Pending Approval', ?, ?, ?, ?, ?)
  `).run(poNumber, supplierId, warehouseId, totalValue, expectedDate || null, aiRecommended ? 1 : 0, notes, staff?.id || null);

  const poId = res.lastInsertRowid;
  const insItem = db.prepare(`
    INSERT INTO purchase_order_items (po_id, product_id, qty, unit_cost)
    VALUES (?, ?, ?, ?)
  `);

  items.forEach((it) => {
    insItem.run(poId, it.productId, it.qty, it.unitCost);
    // Mark as incoming on product position
    db.prepare("UPDATE products SET incoming = incoming + ?, updated_at = datetime('now') WHERE id = ?")
      .run(it.qty, it.productId);
    db.prepare(`
      UPDATE warehouse_stock SET incoming = incoming + ?, updated_at = datetime('now')
       WHERE warehouse_id = ? AND product_id = ?
    `).run(it.qty, warehouseId, it.productId);
  });

  audit({
    staff,
    action: 'purchase_order_created',
    entity: 'purchase_order',
    entityId: String(poId),
    summary: `Created purchase order ${poNumber} for ₹${totalValue.toLocaleString()}`,
    after: { poNumber, supplierId, warehouseId, totalValue, items },
    ip
  });

  return { id: poId, poNumber, status: 'Pending Approval', totalValue };
}

export function updatePurchaseOrderStatus({ poId, status, staff, ip }) {
  const po = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(poId);
  if (!po) throw new Error('Purchase order not found.');

  const approvedBy = (status === 'Approved' || status === 'Sent') ? (staff?.id || po.approved_by) : po.approved_by;
  const receivedDate = (status === 'Received' || status === 'Partially Received') ? new Date().toISOString() : po.received_date;

  db.prepare(`
    UPDATE purchase_orders
       SET status = ?, approved_by = ?, received_date = ?, updated_at = datetime('now')
     WHERE id = ?
  `).run(status, approvedBy, receivedDate, poId);

  // If received, increment on-hand stock and write goods receipt
  if (status === 'Received' && po.status !== 'Received') {
    const items = db.prepare('SELECT * FROM purchase_order_items WHERE po_id = ?').all(poId);
    items.forEach((it) => {
      const receiveQty = it.qty - it.received_qty;
      if (receiveQty > 0) {
        // Update product stock
        db.prepare(`
          UPDATE products
             SET stock = stock + ?, incoming = MAX(0, incoming - ?), updated_at = datetime('now')
           WHERE id = ?
        `).run(receiveQty, receiveQty, it.product_id);

        // Update warehouse stock
        db.prepare(`
          UPDATE warehouse_stock
             SET on_hand = on_hand + ?, available = available + ?, incoming = MAX(0, incoming - ?), updated_at = datetime('now')
           WHERE warehouse_id = ? AND product_id = ?
        `).run(receiveQty, receiveQty, receiveQty, po.warehouse_id, it.product_id);

        db.prepare('UPDATE purchase_order_items SET received_qty = qty WHERE id = ?').run(it.id);

        // Record immutable ledger entry
        db.prepare(`
          INSERT INTO inventory_transactions
            (product_id, type, qty, previous_qty, new_qty, reference_type, reference_id, reason, staff_id)
          VALUES (?, 'PURCHASE_RECEIPT', ?, ?, ?, 'PURCHASE_ORDER', ?, 'Goods received from PO', ?)
        `).run(
          it.product_id,
          receiveQty,
          0,
          receiveQty,
          po.po_number,
          staff?.id || null
        );
      }
    });

    // Create goods receipt record
    const receiptNo = `REC-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
    db.prepare(`
      INSERT INTO goods_receipts (receipt_no, po_id, warehouse_id, received_by, status)
      VALUES (?, ?, ?, ?, 'Verified')
    `).run(receiptNo, poId, po.warehouse_id, staff?.id || null);
  }

  audit({
    staff,
    action: 'purchase_order_status_updated',
    entity: 'purchase_order',
    entityId: String(poId),
    summary: `PO ${po.po_number} transitioned from ${po.status} to ${status}`,
    before: { status: po.status },
    after: { status },
    ip
  });

  return { id: poId, poNumber: po.po_number, status };
}

