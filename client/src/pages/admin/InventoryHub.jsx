/* =============================================================
   INVENTORY HUB
   Real-time multi-warehouse inventory management, stock levels,
   transaction ledger, and auditable stock adjustment workflow.
   ============================================================= */
import { useEffect, useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { useAdminFilters } from '../../context/AdminFilterContext';
import { money, formatShortDate, dx } from '../../lib/format';
import { readToken, authFetch } from '../../lib/adminApi';

export default function InventoryHub() {
  const { can, staff } = useAdmin();
  const { warehouse: globalWarehouse } = useAdminFilters();

  const [activeTab, setActiveTab] = useState('stock'); // 'stock' | 'ledger' | 'adjust'
  const [items, setItems] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [filterWarehouse, setFilterWarehouse] = useState(globalWarehouse || '');
  const [filterCat, setFilterCat] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState('');

  // Audited Adjustment Modal State
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [targetProduct, setTargetProduct] = useState(null);
  const [adjustWarehouseId, setAdjustWarehouseId] = useState(1);
  const [adjustType, setAdjustType] = useState('add'); // 'add' | 'remove' | 'set'
  const [adjustQty, setAdjustQty] = useState(1);
  const [adjustReason, setAdjustReason] = useState('inventory_count');
  const [adjustNote, setAdjustNote] = useState('');
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);
  const [adjustFeedback, setAdjustFeedback] = useState(null);

  const token = readToken();

  // Sync with global filter if changed
  useEffect(() => {
    if (globalWarehouse) setFilterWarehouse(globalWarehouse);
  }, [globalWarehouse]);

  const loadData = () => {
    setLoading(true);
    const headers = { Authorization: `Bearer ${token}` };

    const invParams = new URLSearchParams();
    if (filterWarehouse) invParams.set('warehouse', filterWarehouse);
    if (filterCat) invParams.set('category', filterCat);
    if (filterStatus) invParams.set('status', filterStatus);
    if (searchQuery) invParams.set('search', searchQuery);

    const txParams = new URLSearchParams();
    if (filterWarehouse) txParams.set('warehouse', filterWarehouse);
    if (txTypeFilter) txParams.set('type', txTypeFilter);

    Promise.all([
      fetch(`/api/admin/inventory-v2?${invParams.toString()}`, { headers }).then((r) => r.json()),
      fetch('/api/admin/warehouses', { headers }).then((r) => r.json()),
      fetch(`/api/admin/inventory/transactions?${txParams.toString()}`, { headers }).then((r) => r.json())
    ])
      .then(([invRes, whRes, txRes]) => {
        setItems(invRes.items || []);
        setWarehouses(whRes.warehouses || []);
        setTransactions(txRes.transactions || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, [filterWarehouse, filterCat, filterStatus, txTypeFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  const openAdjustmentModal = (prod) => {
    setTargetProduct(prod);
    setAdjustWarehouseId(prod.warehouse_stocks?.[0]?.warehouse_id || 1);
    setAdjustQty(1);
    setAdjustType('add');
    setAdjustReason('inventory_count');
    setAdjustNote('');
    setAdjustFeedback(null);
    setAdjustModalOpen(true);
  };

  const submitAdjustment = async (e) => {
    e.preventDefault();
    if (!targetProduct) return;
    setAdjustSubmitting(true);
    setAdjustFeedback(null);

    const delta = adjustType === 'remove' ? -Math.abs(Number(adjustQty)) : Math.abs(Number(adjustQty));

    try {
      const res = await fetch(`/api/admin/inventory/${targetProduct.id}/adjust-v2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          warehouseId: adjustWarehouseId,
          delta: adjustType === 'set' ? undefined : delta,
          newQuantity: adjustType === 'set' ? Number(adjustQty) : undefined,
          reason: adjustReason,
          notes: adjustNote || `Manual operator adjustment: ${adjustReason}`
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Adjustment failed');

      setAdjustFeedback({ success: true, message: `Successfully adjusted ${targetProduct.name}. New total stock: ${data.productStock}` });
      setTimeout(() => {
        setAdjustModalOpen(false);
        loadData();
      }, 1200);
    } catch (err) {
      setAdjustFeedback({ success: false, message: err.message });
    } finally {
      setAdjustSubmitting(false);
    }
  };

  // Calculations for summary stats
  const totalValuation = items.reduce((sum, item) => sum + (item.stock * (item.price || 0)), 0);
  const totalUnits = items.reduce((sum, item) => sum + item.stock, 0);
  const outOfStockCount = items.filter((i) => i.stock === 0).length;
  const lowStockCount = items.filter((i) => i.stock > 0 && i.stock <= i.low_stock_at).length;

  return (
    <div className="admin-inventory-hub">
      {/* Header */}
      <header className="admin__head">
        <div>
          <span className="field__label">Inventory Management System</span>
          <h1 className="h2">Real-Time Inventory & Stock Operations</h1>
          <p className="tiny" style={{ textTransform: 'none', letterSpacing: '.02em', marginTop: 4 }}>
            Multi-warehouse stock allocation, auditable transaction ledger, and inventory adjustments.
          </p>
        </div>
        <div className="admin__headactions">
          <button
            type="button"
            className="btn btn--gold btn--sm"
            onClick={() => openAdjustmentModal(items[0] || { id: 'aur-101', name: 'Select item...' })}
            disabled={!can('inventory.adjust')}
          >
            + Adjust Stock Balance
          </button>
          <button type="button" className="btn btn--sm" onClick={loadData}>
            ↻ Refresh
          </button>
        </div>
      </header>

      {/* Summary KPI Strip */}
      <div className="kpi-mini-strip">
        <div className="kpi-mini-card">
          <span className="kpi-mini-label">Total SKUs</span>
          <span className="kpi-mini-val mono">{items.length}</span>
        </div>
        <div className="kpi-mini-card">
          <span className="kpi-mini-label">Units On Hand</span>
          <span className="kpi-mini-val mono">{totalUnits.toLocaleString()}</span>
        </div>
        <div className="kpi-mini-card">
          <span className="kpi-mini-label">Inventory Valuation</span>
          <span className="kpi-mini-val mono">{money(totalValuation)}</span>
        </div>
        <div className="kpi-mini-card">
          <span className="kpi-mini-label">Low Stock Alerts</span>
          <span className="kpi-mini-val mono" style={{ color: lowStockCount > 0 ? 'var(--gold-2)' : 'inherit' }}>
            {lowStockCount}
          </span>
        </div>
        <div className="kpi-mini-card">
          <span className="kpi-mini-label">Stockouts</span>
          <span className="kpi-mini-val mono" style={{ color: outOfStockCount > 0 ? '#ff5252' : 'inherit' }}>
            {outOfStockCount}
          </span>
        </div>
      </div>

      {/* Hub Navigation Tabs */}
      <div className="hub-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'stock'}
          className={`hub-tab-btn ${activeTab === 'stock' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('stock')}
        >
          📦 Stock Levels & Warehouses ({items.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'ledger'}
          className={`hub-tab-btn ${activeTab === 'ledger' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('ledger')}
        >
          📜 Stock Movements Ledger ({transactions.length})
        </button>
      </div>

      {error && <div className="notice notice--error">{error}</div>}

      {/* TAB 1: Stock Levels */}
      {activeTab === 'stock' && (
        <section className="hub-section">
          {/* Filters Bar */}
          <div className="admin-filters-bar">
            <form onSubmit={handleSearchSubmit} className="search-form">
              <input
                type="search"
                className="input"
                placeholder="Search SKU, Product Name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit" className="btn btn--sm">Search</button>
            </form>

            <div className="filter-group">
              <label htmlFor="wh-select" className="tiny sr-only">Warehouse</label>
              <select
                id="wh-select"
                className="input"
                value={filterWarehouse}
                onChange={(e) => setFilterWarehouse(e.target.value)}
              >
                <option value="">All Warehouses</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.code}>{w.code} - {w.name}</option>
                ))}
              </select>

              <label htmlFor="cat-select" className="tiny sr-only">Category</label>
              <select
                id="cat-select"
                className="input"
                value={filterCat}
                onChange={(e) => setFilterCat(e.target.value)}
              >
                <option value="">All Collections</option>
                <option value="Fine Jewelry">Fine Jewelry</option>
                <option value="Timepieces">Timepieces</option>
                <option value="Haute Parfumerie">Haute Parfumerie</option>
                <option value="Leather Goods">Leather Goods</option>
              </select>

              <label htmlFor="status-select" className="tiny sr-only">Stock Status</label>
              <select
                id="status-select"
                className="input"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">All Stock States</option>
                <option value="out">Out of Stock (0)</option>
                <option value="low">Low Stock (&le; Reorder Pt)</option>
                <option value="healthy">Healthy Stock</option>
                <option value="overstocked">Overstocked (&gt; Safety)</option>
              </select>
            </div>
          </div>

          {/* Stock Table */}
          {loading ? (
            <div className="admin-loading-inline">Loading inventory catalog...</div>
          ) : items.length === 0 ? (
            <div className="notice">No products found matching the selected filters.</div>
          ) : (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Product / SKU</th>
                    <th>Collection</th>
                    <th className="tr">Total Stock</th>
                    <th>Warehouse Distribution</th>
                    <th className="tr">Safety Stock</th>
                    <th className="tr">Inventory Value</th>
                    <th>Status</th>
                    <th className="tr">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((prod) => {
                    const isOut = prod.stock === 0;
                    const isLow = prod.stock > 0 && prod.stock <= (prod.low_stock_at || 3);
                    const isOver = prod.stock > (prod.safety_stock || 10) * 3;

                    return (
                      <tr key={prod.id}>
                        <td>
                          <div className="font-serif" style={{ fontWeight: 500 }}>{dx(prod.name)}</div>
                          <span className="tiny mono" style={{ opacity: 0.65 }}>{prod.id}</span>
                        </td>
                        <td>{prod.cat}</td>
                        <td className="tr mono" style={{ fontWeight: 600 }}>
                          <span className={isOut ? 'text-urgent' : isLow ? 'text-warn' : ''}>
                            {prod.stock}
                          </span>
                        </td>
                        <td>
                          <div className="wh-chips-cell">
                            {prod.warehouse_stocks && prod.warehouse_stocks.length > 0 ? (
                              prod.warehouse_stocks.map((ws) => (
                                <span key={ws.warehouse_code} className="wh-chip mono" title={`${ws.warehouse_name}: ${ws.quantity} units (Bin: ${ws.bin_location})`}>
                                  <span className="wh-chip-code">{ws.warehouse_code.split('-')[0]}</span>
                                  <span className="wh-chip-qty">{ws.quantity}</span>
                                </span>
                              ))
                            ) : (
                              <span className="tiny" style={{ opacity: 0.4 }}>Unassigned</span>
                            )}
                          </div>
                        </td>
                        <td className="tr mono" style={{ opacity: 0.75 }}>
                          {prod.safety_stock || 5}
                        </td>
                        <td className="tr mono">
                          {money(prod.stock * (prod.price || 0))}
                        </td>
                        <td>
                          {isOut ? (
                            <span className="pill pill--urgent">Out of Stock</span>
                          ) : isLow ? (
                            <span className="pill pill--warn">Low Stock</span>
                          ) : isOver ? (
                            <span className="pill pill--info">Overstocked</span>
                          ) : (
                            <span className="pill pill--ok">Healthy</span>
                          )}
                        </td>
                        <td className="tr">
                          <button
                            type="button"
                            className="btn btn--sm"
                            onClick={() => openAdjustmentModal(prod)}
                            disabled={!can('inventory.adjust')}
                            title="Adjust quantity or reconcile count"
                          >
                            Adjust
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* TAB 2: Movements Ledger */}
      {activeTab === 'ledger' && (
        <section className="hub-section">
          <div className="admin-filters-bar">
            <div className="filter-group">
              <label htmlFor="tx-type" className="tiny sr-only">Transaction Type</label>
              <select
                id="tx-type"
                className="input"
                value={txTypeFilter}
                onChange={(e) => setTxTypeFilter(e.target.value)}
              >
                <option value="">All Movement Types</option>
                <option value="sale">Customer Sales (Out)</option>
                <option value="return">Customer Returns (In)</option>
                <option value="po_receipt">Supplier Receipts (In)</option>
                <option value="adjustment">Manual Adjustments</option>
                <option value="transfer_in">Transfer In</option>
                <option value="transfer_out">Transfer Out</option>
              </select>

              <label htmlFor="tx-wh" className="tiny sr-only">Warehouse</label>
              <select
                id="tx-wh"
                className="input"
                value={filterWarehouse}
                onChange={(e) => setFilterWarehouse(e.target.value)}
              >
                <option value="">All Warehouses</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.code}>{w.code}</option>
                ))}
              </select>
            </div>
            <span className="tiny mono" style={{ opacity: 0.65 }}>
              Immutable audit ledger &middot; {transactions.length} entries recorded
            </span>
          </div>

          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Product / SKU</th>
                  <th>Warehouse</th>
                  <th>Type</th>
                  <th className="tr">Delta</th>
                  <th className="tr">Before &rarr; After</th>
                  <th>Reason / Notes</th>
                  <th>Authorized By</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="tiny mono" style={{ whiteSpace: 'nowrap' }}>
                      {tx.created_at ? tx.created_at.slice(0, 16).replace('T', ' ') : '—'}
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{tx.product_name || tx.product_id}</div>
                      <span className="tiny mono" style={{ opacity: 0.65 }}>{tx.product_id}</span>
                    </td>
                    <td>
                      <span className="mono tiny font-semibold">{tx.warehouse_code || 'GVA'}</span>
                    </td>
                    <td>
                      <span className={`pill pill--${tx.movement_type === 'sale' ? 'neutral' : tx.movement_type === 'return' || tx.movement_type === 'po_receipt' ? 'ok' : 'warn'}`}>
                        {tx.movement_type}
                      </span>
                    </td>
                    <td className="tr mono" style={{ fontWeight: 600, color: tx.quantity_delta > 0 ? '#4caf50' : '#ff5252' }}>
                      {tx.quantity_delta > 0 ? `+${tx.quantity_delta}` : tx.quantity_delta}
                    </td>
                    <td className="tr mono tiny" style={{ opacity: 0.8 }}>
                      {tx.prev_quantity} &rarr; {tx.new_quantity}
                    </td>
                    <td>
                      <div className="tiny" style={{ maxWidth: 260 }}>
                        <span style={{ fontWeight: 500 }}>{tx.reason}</span>
                        {tx.notes && <span style={{ opacity: 0.65 }}> &middot; {tx.notes}</span>}
                      </div>
                    </td>
                    <td className="tiny">
                      <span>{tx.staff_email || 'System'}</span>
                      {tx.ip_address && <div className="mono" style={{ opacity: 0.4 }}>{tx.ip_address}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Stock Adjustment Modal */}
      {adjustModalOpen && targetProduct && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-adjust-title">
          <div className="admin-modal-box">
            <div className="admin-modal-head">
              <h3 id="modal-adjust-title" className="h3">Audited Stock Adjustment</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setAdjustModalOpen(false)}
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>

            <form onSubmit={submitAdjustment} className="admin-modal-body">
              <div className="modal-item-preview">
                <div>
                  <span className="tiny field__label">Selected Product</span>
                  <div className="font-serif" style={{ fontSize: '1.15rem' }}>{targetProduct.name}</div>
                  <div className="tiny mono">{targetProduct.id} &middot; Retail: {money(targetProduct.price)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="tiny field__label">Total On Hand</span>
                  <div className="h3 mono">{targetProduct.stock}</div>
                </div>
              </div>

              {adjustFeedback && (
                <div className={`notice notice--${adjustFeedback.success ? 'ok' : 'error'}`} style={{ marginTop: 12 }}>
                  {adjustFeedback.message}
                </div>
              )}

              <div className="form-grid" style={{ marginTop: 16 }}>
                <div>
                  <label htmlFor="adj-wh" className="field__label">Target Warehouse Vault</label>
                  <select
                    id="adj-wh"
                    className="input"
                    value={adjustWarehouseId}
                    onChange={(e) => setAdjustWarehouseId(Number(e.target.value))}
                    required
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.code} &mdash; {w.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="adj-type" className="field__label">Adjustment Action</label>
                  <select
                    id="adj-type"
                    className="input"
                    value={adjustType}
                    onChange={(e) => setAdjustType(e.target.value)}
                  >
                    <option value="add">Positive Adjustment (+ Increase)</option>
                    <option value="remove">Negative Adjustment (&minus; Shrinkage/Damage)</option>
                    <option value="set">Set Exact Count (= Absolute Count)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="adj-qty" className="field__label">
                    {adjustType === 'set' ? 'New Exact Quantity' : 'Quantity Units'}
                  </label>
                  <input
                    id="adj-qty"
                    type="number"
                    min={adjustType === 'set' ? 0 : 1}
                    className="input mono"
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="adj-reason" className="field__label">Regulatory / Compliance Reason</label>
                  <select
                    id="adj-reason"
                    className="input"
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    required
                  >
                    <option value="inventory_count">Physical Cycle Count Reconciliation</option>
                    <option value="damaged">Damaged in Handling / Transport</option>
                    <option value="shrinkage">Unexplained Shrinkage / Vault Discrepancy</option>
                    <option value="sample">VIP Private Client Showing / Sample</option>
                    <option value="return_restock">Inspected Returned Item Restock</option>
                    <option value="audit">Internal Financial Audit Adjustment</option>
                  </select>
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="adj-notes" className="field__label">Mandatory Audit Justification</label>
                  <textarea
                    id="adj-notes"
                    className="input"
                    rows={2}
                    placeholder="Provide detailed justification for internal compliance..."
                    value={adjustNote}
                    onChange={(e) => setAdjustNote(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="btn btn--sm"
                  onClick={() => setAdjustModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn--gold btn--sm"
                  disabled={adjustSubmitting}
                >
                  {adjustSubmitting ? 'Recording Immutable Audit...' : 'Execute Stock Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

