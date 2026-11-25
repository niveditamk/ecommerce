/* =============================================================
   WAREHOUSES HUB
   Multi-facility warehouse management, interactive 2D bin heatmap,
   and inter-warehouse inventory transfers workflow.
   ============================================================= */
import { useEffect, useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { useAdminFilters } from '../../context/AdminFilterContext';
import { money, dx } from '../../lib/format';
import { readToken, authFetch } from '../../lib/adminApi';

export default function WarehousesHub() {
  const { can, staff } = useAdmin();
  const { warehouse: globalWarehouse } = useAdminFilters();

  const [activeTab, setActiveTab] = useState('heatmap'); // 'heatmap' | 'directory' | 'transfers'
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(1);
  const [heatmapData, setHeatmapData] = useState(null);
  const [selectedAisle, setSelectedAisle] = useState('');
  const [selectedBin, setSelectedBin] = useState(null);
  const [transfers, setTransfers] = useState([]);
  const [transferFilterStatus, setTransferFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // New Transfer Modal
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [sourceWarehouseId, setSourceWarehouseId] = useState(1);
  const [destWarehouseId, setDestWarehouseId] = useState(2);
  const [transferProductId, setTransferProductId] = useState('aur-101');
  const [transferQty, setTransferQty] = useState(5);
  const [transferNotes, setTransferNotes] = useState('');
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);

  const token = readToken();
  const headers = { Authorization: `Bearer ${token}` };

  // Load Warehouses list
  const loadWarehouses = async () => {
    try {
      const res = await fetch('/api/admin/warehouses', { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch warehouses');
      setWarehouses(data.warehouses || []);
      if (data.warehouses?.length && !selectedWarehouseId) {
        setSelectedWarehouseId(data.warehouses[0].id);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // Load Heatmap for selected warehouse
  const loadHeatmap = async (whId, aisle = '') => {
    setLoading(true);
    try {
      const q = aisle ? `?aisle=${aisle}` : '';
      const res = await fetch(`/api/admin/warehouses/${whId}/heatmap${q}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch heatmap');
      setHeatmapData(data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  // Load Transfers
  const loadTransfers = async () => {
    try {
      const q = transferFilterStatus ? `?status=${transferFilterStatus}` : '';
      const res = await fetch(`/api/admin/transfers${q}`, { headers });
      const data = await res.json();
      if (res.ok) {
        setTransfers(data.transfers || []);
      }
    } catch (err) {
      console.error('Failed to load transfers:', err);
    }
  };

  useEffect(() => {
    loadWarehouses();
    loadTransfers();
  }, []);

  useEffect(() => {
    if (selectedWarehouseId) {
      loadHeatmap(selectedWarehouseId, selectedAisle);
    }
  }, [selectedWarehouseId, selectedAisle]);

  // Handle Transfer Status Update
  const handleTransferStatusChange = async (transferId, nextStatus) => {
    setActionFeedback(null);
    try {
      const res = await fetch(`/api/admin/transfers/${transferId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update transfer status');
      setActionFeedback({ success: true, message: `Transfer #${transferId} updated to ${nextStatus}` });
      loadTransfers();
      loadWarehouses();
      if (selectedWarehouseId) loadHeatmap(selectedWarehouseId, selectedAisle);
    } catch (err) {
      setActionFeedback({ success: false, message: err.message });
    }
  };

  // Handle Create Transfer
  const handleCreateTransfer = async (e) => {
    e.preventDefault();
    if (sourceWarehouseId === destWarehouseId) {
      setActionFeedback({ success: false, message: 'Source and destination warehouses cannot be the same.' });
      return;
    }
    setTransferSubmitting(true);
    setActionFeedback(null);

    try {
      const res = await fetch('/api/admin/transfers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          sourceId: sourceWarehouseId,
          destId: destWarehouseId,
          notes: transferNotes,
          items: [{ productId: transferProductId, qty: Number(transferQty) }]
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create transfer');

      setActionFeedback({ success: true, message: `Transfer ${data.transferNo || ''} initiated successfully!` });
      setTransferModalOpen(false);
      loadTransfers();
      loadWarehouses();
    } catch (err) {
      setActionFeedback({ success: false, message: err.message });
    } finally {
      setTransferSubmitting(false);
    }
  };

  const selectedWarehouse = warehouses.find((w) => w.id === Number(selectedWarehouseId));

  return (
    <div className="admin-warehouses-hub">
      <header className="admin__head">
        <div>
          <span className="field__label">Logistics & Supply Infrastructure</span>
          <h1 className="h2">Multi-Warehouse & Heatmap Operations</h1>
          <p className="tiny" style={{ textTransform: 'none', letterSpacing: '.02em', marginTop: 4 }}>
            Facility utilization, 2D bin coordinate heatmaps, and secure inter-vault stock transfers.
          </p>
        </div>
        <div className="admin__headactions">
          <button
            type="button"
            className="btn btn--gold btn--sm"
            onClick={() => setTransferModalOpen(true)}
            disabled={!can('inventory.transfer')}
          >
            + Initiate Stock Transfer
          </button>
          <button
            type="button"
            className="btn btn--sm"
            onClick={() => {
              loadWarehouses();
              if (selectedWarehouseId) loadHeatmap(selectedWarehouseId, selectedAisle);
              loadTransfers();
            }}
          >
            ↻ Refresh
          </button>
        </div>
      </header>

      {actionFeedback && (
        <div className={`notice notice--${actionFeedback.success ? 'ok' : 'error'}`} style={{ marginBottom: 16 }}>
          {actionFeedback.message}
        </div>
      )}

      {/* Hub Tabs */}
      <div className="hub-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'heatmap'}
          className={`hub-tab-btn ${activeTab === 'heatmap' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('heatmap')}
        >
          🗺️ 2D Bin Heatmap & Coordinates
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'directory'}
          className={`hub-tab-btn ${activeTab === 'directory' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('directory')}
        >
          🏛️ Facility Directory & Capacity ({warehouses.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'transfers'}
          className={`hub-tab-btn ${activeTab === 'transfers' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('transfers')}
        >
          🔄 Inter-Warehouse Transfers ({transfers.length})
        </button>
      </div>

      {error && <div className="notice notice--error">{error}</div>}

      {/* TAB 1: 2D WAREHOUSE HEATMAP */}
      {activeTab === 'heatmap' && (
        <section className="hub-section">
          {/* Controls Bar */}
          <div className="admin-filters-bar">
            <div className="filter-group">
              <label htmlFor="wh-picker" className="tiny field__label" style={{ alignSelf: 'center', margin: 0 }}>
                Facility:
              </label>
              <select
                id="wh-picker"
                className="input"
                value={selectedWarehouseId}
                onChange={(e) => setSelectedWarehouseId(Number(e.target.value))}
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code} &mdash; {w.name} ({w.city})
                  </option>
                ))}
              </select>

              <label htmlFor="aisle-picker" className="tiny field__label" style={{ alignSelf: 'center', margin: 0 }}>
                Aisle:
              </label>
              <select
                id="aisle-picker"
                className="input"
                value={selectedAisle}
                onChange={(e) => setSelectedAisle(e.target.value)}
              >
                <option value="">All Aisles (A &ndash; D)</option>
                <option value="A">Aisle A &mdash; Fine Jewelry Vault</option>
                <option value="B">Aisle B &mdash; Timepieces & Complications</option>
                <option value="C">Aisle C &mdash; Parfumerie & Extracts</option>
                <option value="D">Aisle D &mdash; Leather Goods & Luggage</option>
              </select>
            </div>

            {/* Heatmap Legend */}
            <div className="heatmap-legend">
              <span className="legend-item"><span className="legend-dot dot-empty" /> Empty</span>
              <span className="legend-item"><span className="legend-dot dot-low" /> Low Stock</span>
              <span className="legend-item"><span className="legend-dot dot-healthy" /> Healthy</span>
              <span className="legend-item"><span className="legend-dot dot-high" /> High Density</span>
              <span className="legend-item"><span className="legend-dot dot-over" /> Overstocked</span>
            </div>
          </div>

          {/* Warehouse Profile Header Card */}
          {selectedWarehouse && (
            <div className="wh-profile-bar">
              <div>
                <span className="tiny mono" style={{ opacity: 0.65 }}>{selectedWarehouse.code}</span>
                <h3 className="h3" style={{ margin: '2px 0' }}>{selectedWarehouse.name}</h3>
                <span className="tiny" style={{ opacity: 0.8 }}>{selectedWarehouse.address}, {selectedWarehouse.city}, {selectedWarehouse.country}</span>
              </div>
              <div className="wh-profile-metrics">
                <div>
                  <span className="tiny field__label">Storage Capacity</span>
                  <div className="mono font-semibold">{selectedWarehouse.total_units} / {selectedWarehouse.capacity_units} units</div>
                  <div className="progress-bar-wrap" style={{ width: 140, height: 6, marginTop: 4 }}>
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${Math.min(100, selectedWarehouse.utilization_pct || 0)}%`,
                        background: selectedWarehouse.utilization_pct > 85 ? 'var(--gold-2)' : 'var(--gold)'
                      }}
                    />
                  </div>
                </div>
                <div>
                  <span className="tiny field__label">Valuation on Floor</span>
                  <div className="mono font-semibold">{money(selectedWarehouse.inventory_value || 0)}</div>
                  <span className="tiny" style={{ opacity: 0.75 }}>{selectedWarehouse.active_skus} Active SKUs</span>
                </div>
                <div>
                  <span className="tiny field__label">Climate & Vault Specs</span>
                  <div className="tiny mono" style={{ color: '#4caf50' }}>✓ 19.2°C &middot; 45% Humidity</div>
                  <span className="tiny" style={{ opacity: 0.75 }}>Class IV High-Security Vault</span>
                </div>
              </div>
            </div>
          )}

          {/* 2D Grid Representation */}
          {loading ? (
            <div className="admin-loading-inline">Rendering bin spatial telemetry...</div>
          ) : !heatmapData || !heatmapData.heatmap || Object.keys(heatmapData.heatmap).length === 0 ? (
            <div className="notice">No bin coordinates mapped for this warehouse or aisle filter.</div>
          ) : (
            <div className="heatmap-container">
              {Object.entries(heatmapData.heatmap).map(([aisleKey, racks]) => (
                <div key={aisleKey} className="aisle-block">
                  <div className="aisle-header">
                    <span className="aisle-tag mono">AISLE {aisleKey}</span>
                    <span className="tiny" style={{ opacity: 0.65 }}>
                      {aisleKey === 'A' ? 'Precious Metals & Gems' : aisleKey === 'B' ? 'Horology Vault' : aisleKey === 'C' ? 'Climate Regulated Fragrances' : 'Exotic Leather Reserves'}
                    </span>
                  </div>

                  <div className="racks-grid">
                    {Object.entries(racks).map(([rackKey, bins]) => (
                      <div key={rackKey} className="rack-col">
                        <div className="rack-label mono">RACK {rackKey}</div>
                        <div className="bins-stack">
                          {bins.map((b) => (
                            <button
                              type="button"
                              key={b.bin}
                              className={`bin-cell bin-cell--${b.state} ${selectedBin?.bin === b.bin && selectedBin?.aisle === b.aisle && selectedBin?.rack === b.rack ? 'is-selected' : ''}`}
                              onClick={() => setSelectedBin(b)}
                              title={`Bin ${b.aisle}-${b.rack}-${b.bin}: ${b.product_name || 'Empty'} (${b.on_hand} units)`}
                            >
                              <span className="bin-coord mono">{b.bin}</span>
                              <span className="bin-qty mono">{b.on_hand}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Selected Bin Detail Modal / Drawer */}
          {selectedBin && (
            <div className="bin-detail-drawer">
              <div className="drawer-header">
                <div>
                  <span className="tiny field__label">Selected Storage Coordinate</span>
                  <div className="h3 mono" style={{ margin: '2px 0' }}>
                    {selectedWarehouse?.code}-{selectedBin.aisle}-{selectedBin.rack}-{selectedBin.bin}
                  </div>
                </div>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setSelectedBin(null)}
                  aria-label="Close coordinate details"
                >
                  &times;
                </button>
              </div>

              <div className="bin-detail-grid">
                <div>
                  <span className="tiny field__label">Product Name</span>
                  <div className="font-serif" style={{ fontSize: '1.05rem', fontWeight: 500 }}>
                    {dx(selectedBin.product_name) || 'Vacant Storage Bin'}
                  </div>
                  <span className="tiny mono" style={{ opacity: 0.65 }}>{selectedBin.product_id}</span>
                </div>

                <div>
                  <span className="tiny field__label">Current On-Hand</span>
                  <div className="h3 mono" style={{ margin: '2px 0' }}>{selectedBin.on_hand} units</div>
                  <span className="tiny" style={{ opacity: 0.75 }}>
                    Available: {selectedBin.available} &middot; Reserved: {selectedBin.reserved || 0}
                  </span>
                </div>

                <div>
                  <span className="tiny field__label">Thresholds</span>
                  <div className="tiny mono" style={{ marginTop: 4 }}>
                    Reorder Point: <strong>{selectedBin.reorder_point}</strong> &middot; Safety Stock: <strong>{selectedBin.safety_stock}</strong>
                  </div>
                </div>

                <div>
                  <span className="tiny field__label">Total Value in Bin</span>
                  <div className="mono font-semibold" style={{ fontSize: '1.1rem', marginTop: 4 }}>
                    {money(selectedBin.total_value || 0)}
                  </div>
                </div>
              </div>

              <div className="drawer-actions" style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn--gold btn--sm"
                  onClick={() => {
                    setSourceWarehouseId(selectedWarehouseId);
                    setTransferProductId(selectedBin.product_id);
                    setTransferQty(Math.min(selectedBin.available || 5, 5));
                    setTransferModalOpen(true);
                  }}
                  disabled={!selectedBin.product_id || selectedBin.on_hand === 0}
                >
                  ⇄ Transfer Stock from this Bin
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* TAB 2: FACILITY DIRECTORY */}
      {activeTab === 'directory' && (
        <section className="hub-section">
          <div className="warehouse-cards-grid">
            {warehouses.map((wh) => (
              <div key={wh.id} className="admin-card warehouse-card">
                <div className="wh-card-header">
                  <div>
                    <span className="wh-badge mono">{wh.code}</span>
                    <h3 className="h3" style={{ margin: '6px 0 2px 0' }}>{wh.name}</h3>
                    <p className="tiny" style={{ opacity: 0.75 }}>{wh.address}, {wh.city}, {wh.country}</p>
                  </div>
                  <div className="wh-status-indicator">
                    <span className="status-indicator-dot" />
                    <span className="tiny font-semibold">Operational</span>
                  </div>
                </div>

                <div className="wh-kpi-row">
                  <div>
                    <span className="tiny field__label">Storage Capacity</span>
                    <div className="mono font-semibold">{wh.total_units} / {wh.capacity_units}</div>
                    <div className="progress-bar-wrap" style={{ height: 6, marginTop: 4 }}>
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${Math.min(100, wh.utilization_pct || 0)}%`,
                          background: wh.utilization_pct > 80 ? 'var(--gold-2)' : 'var(--gold)'
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <span className="tiny field__label">Valuation</span>
                    <div className="mono font-semibold">{money(wh.inventory_value || 0)}</div>
                    <span className="tiny" style={{ opacity: 0.65 }}>{wh.active_skus} Active SKUs</span>
                  </div>
                </div>

                <div className="wh-specs-box">
                  <div className="tiny"><strong>Environmental:</strong> 19.5°C &plusmn; 0.5°C, 45% RH</div>
                  <div className="tiny"><strong>Security Tier:</strong> European EN 1143-1 Grade V Vault</div>
                  <div className="tiny"><strong>Logistics Access:</strong> Armored Courier & Dedicated Air Freight</div>
                </div>

                <div className="wh-card-footer">
                  <button
                    type="button"
                    className="btn btn--sm"
                    onClick={() => {
                      setSelectedWarehouseId(wh.id);
                      setActiveTab('heatmap');
                    }}
                  >
                    View 2D Heatmap &rarr;
                  </button>
                  <button
                    type="button"
                    className="btn btn--gold btn--sm"
                    onClick={() => {
                      setSourceWarehouseId(wh.id);
                      setTransferModalOpen(true);
                    }}
                  >
                    Transfer Goods
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* TAB 3: INTER-WAREHOUSE TRANSFERS */}
      {activeTab === 'transfers' && (
        <section className="hub-section">
          <div className="admin-filters-bar">
            <div className="filter-group">
              <label htmlFor="tx-filter-st" className="tiny sr-only">Status Filter</label>
              <select
                id="tx-filter-st"
                className="input"
                value={transferFilterStatus}
                onChange={(e) => setTransferFilterStatus(e.target.value)}
              >
                <option value="">All Transfer Statuses</option>
                <option value="Requested">Requested (Pending Approval)</option>
                <option value="Approved">Approved</option>
                <option value="Picking">Picking / Vault Retrieval</option>
                <option value="In Transit">In Transit</option>
                <option value="Received">Received & Reconciled</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            <button
              type="button"
              className="btn btn--gold btn--sm"
              onClick={() => setTransferModalOpen(true)}
              disabled={!can('inventory.transfer')}
            >
              + Create Transfer Order
            </button>
          </div>

          {transfers.length === 0 ? (
            <div className="notice">No inter-warehouse transfers recorded for this filter.</div>
          ) : (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Transfer No</th>
                    <th>Route</th>
                    <th>Items</th>
                    <th>Created</th>
                    <th>Status</th>
                    <th>Courier & Notes</th>
                    <th className="tr">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.map((tr) => (
                    <tr key={tr.id}>
                      <td className="mono font-semibold">{tr.transfer_no}</td>
                      <td>
                        <div className="transfer-route-cell">
                          <span className="wh-tag mono">{tr.source_code}</span>
                          <span className="route-arrow">&rarr;</span>
                          <span className="wh-tag mono">{tr.dest_code}</span>
                        </div>
                        <div className="tiny" style={{ opacity: 0.65 }}>
                          {tr.source_name} &rarr; {tr.dest_name}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{tr.items?.[0]?.product_name || 'Luxury Goods'}</div>
                        <span className="tiny mono" style={{ opacity: 0.75 }}>
                          Qty: {tr.items?.[0]?.requested_qty || 1} units
                        </span>
                      </td>
                      <td className="tiny mono" style={{ whiteSpace: 'nowrap' }}>
                        {tr.created_at ? tr.created_at.slice(0, 10) : '—'}
                      </td>
                      <td>
                        <span className={`pill pill--${tr.status === 'Received' ? 'ok' : tr.status === 'In Transit' ? 'info' : tr.status === 'Cancelled' ? 'neutral' : 'warn'}`}>
                          {tr.status}
                        </span>
                      </td>
                      <td className="tiny" style={{ maxWidth: 220 }}>
                        {tr.notes || 'Direct armored vault replenishment'}
                      </td>
                      <td className="tr">
                        <div style={{ display: 'inline-flex', gap: 4 }}>
                          {tr.status === 'Requested' && can('inventory.transfer') && (
                            <button
                              type="button"
                              className="btn btn--sm btn--gold"
                              onClick={() => handleTransferStatusChange(tr.id, 'Approved')}
                            >
                              Approve
                            </button>
                          )}
                          {tr.status === 'Approved' && can('inventory.transfer') && (
                            <button
                              type="button"
                              className="btn btn--sm"
                              onClick={() => handleTransferStatusChange(tr.id, 'In Transit')}
                            >
                              Ship (Transit)
                            </button>
                          )}
                          {tr.status === 'In Transit' && can('inventory.transfer') && (
                            <button
                              type="button"
                              className="btn btn--sm btn--gold"
                              onClick={() => handleTransferStatusChange(tr.id, 'Received')}
                              title="Confirm receipt and reconcile warehouse balances"
                            >
                              Receive Goods
                            </button>
                          )}
                          {tr.status === 'Received' && (
                            <span className="tiny mono text-ok">&#10003; Reconciled</span>
                          )}
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

      {/* CREATE TRANSFER MODAL */}
      {transferModalOpen && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-tr-title">
          <div className="admin-modal-box">
            <div className="admin-modal-head">
              <h3 id="modal-tr-title" className="h3">Initiate Inter-Warehouse Transfer</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setTransferModalOpen(false)}
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateTransfer} className="admin-modal-body">
              <div className="form-grid">
                <div>
                  <label htmlFor="source-wh" className="field__label">Source Facility (Dispatch)</label>
                  <select
                    id="source-wh"
                    className="input"
                    value={sourceWarehouseId}
                    onChange={(e) => setSourceWarehouseId(Number(e.target.value))}
                    required
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.code} &mdash; {w.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="dest-wh" className="field__label">Destination Facility (Arrival)</label>
                  <select
                    id="dest-wh"
                    className="input"
                    value={destWarehouseId}
                    onChange={(e) => setDestWarehouseId(Number(e.target.value))}
                    required
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.code} &mdash; {w.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="tr-prod" className="field__label">Product SKU</label>
                  <select
                    id="tr-prod"
                    className="input"
                    value={transferProductId}
                    onChange={(e) => setTransferProductId(e.target.value)}
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
                  <label htmlFor="tr-qty" className="field__label">Transfer Units</label>
                  <input
                    id="tr-qty"
                    type="number"
                    min={1}
                    max={100}
                    className="input mono"
                    value={transferQty}
                    onChange={(e) => setTransferQty(e.target.value)}
                    required
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="tr-notes" className="field__label">Courier Protocol & Security Notes</label>
                  <textarea
                    id="tr-notes"
                    className="input"
                    rows={2}
                    placeholder="e.g., Ferrari Armored Courier Service, insured airway bill #SW-99201"
                    value={transferNotes}
                    onChange={(e) => setTransferNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="btn btn--sm"
                  onClick={() => setTransferModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn--gold btn--sm"
                  disabled={transferSubmitting}
                >
                  {transferSubmitting ? 'Dispatching Transfer Order...' : 'Authorize Transfer Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

