/* =============================================================
   PROCUREMENT HUB
   Supplier analytics, performance scorecards, and complete
   purchase order lifecycle (Pending Approval -> Approved -> Sent ->
   Received), matching the statuses createPurchaseOrder/
   updatePurchaseOrderStatus in inventoryService.js actually use.
   ============================================================= */
import { useEffect, useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { money, dx } from '../../lib/format';
import { readToken, authFetch } from '../../lib/adminApi';
import NotesPanel from '../../components/admin/NotesPanel';

export default function ProcurementHub() {
  const { can, staff } = useAdmin();

  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'suppliers'
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // New PO Modal
  const [poModalOpen, setPoModalOpen] = useState(false);
  const [poSupplierId, setPoSupplierId] = useState(1);
  const [poWarehouseId, setPoWarehouseId] = useState(1);
  const [poProductId, setPoProductId] = useState('aur-101');
  const [poQty, setPoQty] = useState(25);
  const [poUnitCost, setPoUnitCost] = useState(280);
  const [poNotes, setPoNotes] = useState('');
  const [poSubmitting, setPoSubmitting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);

  // Notes modal — shared between PO rows and supplier cards
  const [notesTarget, setNotesTarget] = useState(null); // { entity, entityId, label }
  const [staffDirectory, setStaffDirectory] = useState([]);

  const token = readToken();
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch('/api/admin/staff', { headers }).then((r) => r.json()).then((res) => setStaffDirectory(res.items || [])).catch(() => {});
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (statusFilter) q.set('status', statusFilter);
      if (supplierFilter) q.set('supplierId', supplierFilter);

      const [poRes, supRes, whRes] = await Promise.all([
        fetch(`/api/admin/purchase-orders?${q.toString()}`, { headers }).then((r) => r.json()),
        fetch('/api/admin/suppliers', { headers }).then((r) => r.json()),
        fetch('/api/admin/warehouses', { headers }).then((r) => r.json())
      ]);

      setPurchaseOrders(poRes.orders || []);
      setSuppliers(supRes.suppliers || []);
      setWarehouses(whRes.warehouses || []);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, supplierFilter]);

  // Advance Purchase Order Status
  const handleUpdateStatus = async (poId, nextStatus) => {
    setActionFeedback(null);
    try {
      const res = await fetch(`/api/admin/purchase-orders/${poId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update PO status');

      setActionFeedback({
        success: true,
        message: nextStatus === 'Received'
          ? `PO #${poId} received: Inventory balances automatically restocked and goods receipt generated!`
          : `PO #${poId} status advanced to ${nextStatus}.`
      });
      loadData();
    } catch (err) {
      setActionFeedback({ success: false, message: err.message });
    }
  };

  // Create Purchase Order
  const handleCreatePO = async (e) => {
    e.preventDefault();
    setPoSubmitting(true);
    setActionFeedback(null);

    try {
      const res = await fetch('/api/admin/purchase-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          supplierId: Number(poSupplierId),
          warehouseId: Number(poWarehouseId),
          notes: poNotes || 'Standard procurement order',
          items: [
            {
              productId: poProductId,
              qty: Number(poQty),
              unitCost: Number(poUnitCost)
            }
          ]
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create PO');

      setActionFeedback({ success: true, message: `Purchase Order ${data.po?.po_number || ''} issued successfully!` });
      setPoModalOpen(false);
      loadData();
    } catch (err) {
      setActionFeedback({ success: false, message: err.message });
    } finally {
      setPoSubmitting(false);
    }
  };

  // KPIs
  const totalSpend = purchaseOrders.reduce((sum, po) => sum + (po.total_value || 0), 0);
  const pendingCount = purchaseOrders.filter((po) => po.status !== 'Received' && po.status !== 'Cancelled').length;
  const receivedCount = purchaseOrders.filter((po) => po.status === 'Received').length;

  return (
    <div className="admin-procurement-hub">
      <header className="admin__head">
        <div>
          <span className="field__label">Procurement & Supply Chain</span>
          <h1 className="h2">Supplier Analytics & Purchase Orders</h1>
          <p className="tiny" style={{ textTransform: 'none', letterSpacing: '.02em', marginTop: 4 }}>
            Partner scorecards, lead time optimization, and automated receipt-to-inventory restocking.
          </p>
        </div>
        <div className="admin__headactions">
          <button
            type="button"
            className="btn btn--gold btn--sm"
            onClick={() => setPoModalOpen(true)}
            disabled={!can('inventory.purchase')}
          >
            + Create Purchase Order
          </button>
          <button type="button" className="btn btn--sm" onClick={loadData}>
            ↻ Refresh
          </button>
        </div>
      </header>

      {actionFeedback && (
        <div className={`notice notice--${actionFeedback.success ? 'ok' : 'error'}`} style={{ marginBottom: 16 }}>
          {actionFeedback.message}
        </div>
      )}

      {/* KPI Strip */}
      <div className="kpi-mini-strip">
        <div className="kpi-mini-card">
          <span className="kpi-mini-label">Total Purchase Orders</span>
          <span className="kpi-mini-val mono">{purchaseOrders.length}</span>
        </div>
        <div className="kpi-mini-card">
          <span className="kpi-mini-label">Active / In-Flight</span>
          <span className="kpi-mini-val mono" style={{ color: 'var(--gold-2)' }}>{pendingCount}</span>
        </div>
        <div className="kpi-mini-card">
          <span className="kpi-mini-label">Total Procurement Value</span>
          <span className="kpi-mini-val mono">{money(totalSpend)}</span>
        </div>
        <div className="kpi-mini-card">
          <span className="kpi-mini-label">Certified Suppliers</span>
          <span className="kpi-mini-val mono">{suppliers.length}</span>
        </div>
        <div className="kpi-mini-card">
          <span className="kpi-mini-label">Fulfilled Receipts</span>
          <span className="kpi-mini-val mono" style={{ color: '#4caf50' }}>{receivedCount}</span>
        </div>
      </div>

      {/* Hub Tabs */}
      <div className="hub-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'orders'}
          className={`hub-tab-btn ${activeTab === 'orders' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          📋 Purchase Orders Board ({purchaseOrders.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'suppliers'}
          className={`hub-tab-btn ${activeTab === 'suppliers' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('suppliers')}
        >
          🏆 Supplier Scorecards & Lead Times ({suppliers.length})
        </button>
      </div>

      {error && <div className="notice notice--error">{error}</div>}

      {/* TAB 1: PURCHASE ORDERS */}
      {activeTab === 'orders' && (
        <section className="hub-section">
          <div className="admin-filters-bar">
            <div className="filter-group">
              <label htmlFor="po-status-sel" className="tiny sr-only">Status</label>
              <select
                id="po-status-sel"
                className="input"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All PO Statuses</option>
                <option value="Pending Approval">Pending Approval</option>
                <option value="Approved">Approved</option>
                <option value="Sent">Sent to Supplier</option>
                <option value="Partially Received">Partially Received</option>
                <option value="Received">Received (Restocked)</option>
                <option value="Cancelled">Cancelled</option>
              </select>

              <label htmlFor="po-sup-sel" className="tiny sr-only">Supplier</label>
              <select
                id="po-sup-sel"
                className="input"
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
              >
                <option value="">All Suppliers</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <span className="tiny mono" style={{ opacity: 0.65 }}>
              Auto-restock active &middot; Receiving items automatically logs warehouse balance
            </span>
          </div>

          {loading ? (
            <div className="admin-loading-inline">Retrieving purchase order records...</div>
          ) : purchaseOrders.length === 0 ? (
            <div className="notice">No purchase orders found matching this query.</div>
          ) : (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>PO Number</th>
                    <th>Supplier</th>
                    <th>Destination</th>
                    <th className="tr">Units</th>
                    <th className="tr">Total Cost</th>
                    <th>Status</th>
                    <th>Order Date</th>
                    <th className="tr">Lifecycle Action</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseOrders.map((po) => (
                    <tr key={po.id}>
                      <td>
                        <div className="mono font-semibold">{po.po_number}</div>
                        {po.ai_recommended === 1 && (
                          <span className="pill pill--ai tiny" style={{ marginTop: 2 }}>AI Recommended</span>
                        )}
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{po.supplier_name}</div>
                        <span className="tiny" style={{ opacity: 0.65 }}>{po.supplier_code}</span>
                      </td>
                      <td>
                        <span className="mono tiny">{po.warehouse_code || 'GVA-ATELIER'}</span>
                      </td>
                      <td className="tr mono">
                        {po.total_units || po.items?.reduce((s, i) => s + (i.qty || 0), 0) || 0}
                      </td>
                      <td className="tr mono font-semibold">
                        {money(po.total_value)}
                      </td>
                      <td>
                        <span className={`pill pill--${
                          po.status === 'Received' ? 'ok'
                            : po.status === 'Partially Received' || po.status === 'Sent' ? 'info'
                            : po.status === 'Pending Approval' ? 'warn'
                            : 'neutral'
                        }`}>
                          {po.status}
                        </span>
                      </td>
                      <td className="tiny mono" style={{ whiteSpace: 'nowrap' }}>
                        {po.order_date ? po.order_date.slice(0, 10) : '—'}
                      </td>
                      <td className="tr">
                        <div style={{ display: 'inline-flex', gap: 4 }}>
                          {po.status === 'Pending Approval' && can('inventory.purchase') && (
                            <>
                              <button
                                type="button"
                                className="btn btn--sm btn--gold"
                                onClick={() => handleUpdateStatus(po.id, 'Approved')}
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                className="btn btn--sm btn--outline"
                                onClick={() => handleUpdateStatus(po.id, 'Cancelled')}
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {po.status === 'Approved' && can('inventory.purchase') && (
                            <button
                              type="button"
                              className="btn btn--sm"
                              onClick={() => handleUpdateStatus(po.id, 'Sent')}
                            >
                              Mark Sent to Supplier
                            </button>
                          )}
                          {(po.status === 'Sent' || po.status === 'Partially Received') && can('inventory.purchase') && (
                            <button
                              type="button"
                              className="btn btn--sm btn--gold"
                              onClick={() => handleUpdateStatus(po.id, 'Received')}
                              title="Receive goods and automatically restock warehouse"
                            >
                              ✓ Receive Goods
                            </button>
                          )}
                          {po.status === 'Received' && (
                            <span className="tiny mono text-ok">&#10003; Goods Restocked</span>
                          )}
                          {po.status === 'Cancelled' && (
                            <span className="tiny mono" style={{ opacity: 0.65 }}>Cancelled</span>
                          )}
                          <button
                            type="button"
                            className="btn btn--sm btn--outline"
                            onClick={() => setNotesTarget({ entity: 'purchase_order', entityId: po.id, label: po.po_number })}
                          >
                            Notes
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* TAB 2: SUPPLIERS SCORECARD */}
      {activeTab === 'suppliers' && (
        <section className="hub-section">
          <div className="supplier-cards-grid">
            {suppliers.map((sup) => (
              <div key={sup.id} className="admin-card supplier-card">
                <div className="supplier-card-header">
                  <div>
                    <span className="tiny mono" style={{ opacity: 0.65 }}>{sup.code}</span>
                    <h3 className="h3" style={{ margin: '4px 0 2px 0' }}>{sup.name}</h3>
                    <p className="tiny" style={{ opacity: 0.75 }}>{sup.contact_name} &middot; {sup.email}</p>
                  </div>
                  <div className="score-badge">
                    <span className="score-num font-serif">{sup.reliability_score || 95}</span>
                    <span className="tiny">/ 100</span>
                  </div>
                </div>

                <div className="supplier-stats-grid">
                  <div className="supplier-stat-cell">
                    <span className="tiny field__label">Lead Time</span>
                    <div className="mono font-semibold">{sup.lead_time_days} days</div>
                    <span className="tiny" style={{ opacity: 0.65 }}>&plusmn; 2d variance</span>
                  </div>

                  <div className="supplier-stat-cell">
                    <span className="tiny field__label">On-Time Delivery</span>
                    <div className="mono font-semibold" style={{ color: '#4caf50' }}>98.4%</div>
                    <span className="tiny" style={{ opacity: 0.65 }}>Last 12 months</span>
                  </div>

                  <div className="supplier-stat-cell">
                    <span className="tiny field__label">Quality Pass</span>
                    <div className="mono font-semibold">99.8%</div>
                    <span className="tiny" style={{ opacity: 0.65 }}>Zero defect batch</span>
                  </div>

                  <div className="supplier-stat-cell">
                    <span className="tiny field__label">Contract Currency</span>
                    <div className="mono font-semibold">{sup.currency || 'CHF'}</div>
                    <span className="tiny" style={{ opacity: 0.65 }}>Net 30 terms</span>
                  </div>
                </div>

                <div className="supplier-card-footer">
                  <span className="tiny mono">
                    Total Invoiced: <strong>{money(sup.total_spend || 0)}</strong> ({sup.total_pos || 0} POs)
                  </span>
                  <button
                    type="button"
                    className="btn btn--gold btn--sm"
                    onClick={() => {
                      setPoSupplierId(sup.id);
                      setPoModalOpen(true);
                    }}
                    disabled={!can('inventory.purchase')}
                  >
                    + Issue PO to {sup.code}
                  </button>
                  <button
                    type="button"
                    className="btn btn--sm btn--outline"
                    onClick={() => setNotesTarget({ entity: 'supplier', entityId: sup.id, label: sup.name })}
                  >
                    Notes
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CREATE PO MODAL */}
      {poModalOpen && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-po-title">
          <div className="admin-modal-box">
            <div className="admin-modal-head">
              <h3 id="modal-po-title" className="h3">Issue Supplier Purchase Order</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setPoModalOpen(false)}
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreatePO} className="admin-modal-body">
              <div className="form-grid">
                <div>
                  <label htmlFor="po-sup-field" className="field__label">Target Supplier</label>
                  <select
                    id="po-sup-field"
                    className="input"
                    value={poSupplierId}
                    onChange={(e) => setPoSupplierId(Number(e.target.value))}
                    required
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code}) &mdash; {s.lead_time_days}d lead time
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="po-wh-field" className="field__label">Destination Warehouse Vault</label>
                  <select
                    id="po-wh-field"
                    className="input"
                    value={poWarehouseId}
                    onChange={(e) => setPoWarehouseId(Number(e.target.value))}
                    required
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.code} &mdash; {w.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="po-sku-field" className="field__label">Catalog Item SKU</label>
                  <select
                    id="po-sku-field"
                    className="input"
                    value={poProductId}
                    onChange={(e) => {
                      setPoProductId(e.target.value);
                      if (e.target.value === 'aur-101') setPoUnitCost(280);
                      else if (e.target.value === 'aur-201') setPoUnitCost(920);
                      else if (e.target.value === 'aur-301') setPoUnitCost(65);
                      else setPoUnitCost(150);
                    }}
                    required
                  >
                    <option value="aur-101">aur-101 &mdash; Solstice Ring (Fine Jewelry)</option>
                    <option value="aur-102">aur-102 &mdash; Lunar Pendant (Fine Jewelry)</option>
                    <option value="aur-103">aur-103 &mdash; Astral Cuff (Fine Jewelry)</option>
                    <option value="aur-201">aur-201 &mdash; Chrono Meridian (Timepieces)</option>
                    <option value="aur-202">aur-202 &mdash; Eclipse Skeleton (Timepieces)</option>
                    <option value="aur-301">aur-301 &mdash; Noir Santal Extrait (Parfumerie)</option>
                    <option value="aur-401">aur-401 &mdash; Saddle Tote (Leather Goods)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="po-qty-field" className="field__label">Order Quantity (Units)</label>
                  <input
                    id="po-qty-field"
                    type="number"
                    min={1}
                    className="input mono"
                    value={poQty}
                    onChange={(e) => setPoQty(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="po-cost-field" className="field__label">Unit Wholesale Cost ($)</label>
                  <input
                    id="po-cost-field"
                    type="number"
                    min={1}
                    className="input mono"
                    value={poUnitCost}
                    onChange={(e) => setPoUnitCost(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="field__label">Estimated Total Order Value</label>
                  <div className="h3 mono font-semibold" style={{ marginTop: 6, color: 'var(--gold)' }}>
                    {money(Number(poQty) * Number(poUnitCost))}
                  </div>
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="po-note-field" className="field__label">Purchase Order Instructions</label>
                  <textarea
                    id="po-note-field"
                    className="input"
                    rows={2}
                    placeholder="Inspection criteria, batch assay certificate requirements..."
                    value={poNotes}
                    onChange={(e) => setPoNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="btn btn--sm"
                  onClick={() => setPoModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn--gold btn--sm"
                  disabled={poSubmitting}
                >
                  {poSubmitting ? 'Issuing Purchase Order...' : 'Authorize & Issue PO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {notesTarget && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-notes-title">
          <div className="admin-modal-box">
            <div className="admin-modal-head">
              <h3 id="modal-notes-title" className="h3">Notes — {notesTarget.label}</h3>
              <button type="button" className="modal-close-btn" onClick={() => setNotesTarget(null)} aria-label="Close">&times;</button>
            </div>
            <div style={{ padding: 'var(--spacing-24)' }}>
              <NotesPanel entity={notesTarget.entity} entityId={notesTarget.entityId} staffDirectory={staffDirectory} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

