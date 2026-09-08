/* =============================================================
   ADMIN — ORDER DETAIL
   The dashboard has always linked here and the server has always
   served it; the screen itself was never built, so every one of
   those links dropped the operator onto the shopper 404. This is
   the missing half.
   ============================================================= */
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAsync } from '../../lib/useAsync';
import adminApi from '../../lib/adminApi';
import { useAdmin } from '../../context/AdminContext';
import { money, formatShortDate, dx } from '../../lib/format';

const STAGES = ['Confirmed', 'Processing', 'Packed', 'Shipped', 'Delivered'];

export default function AdminOrderDetail() {
  const { id } = useParams();
  const { can } = useAdmin();
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(null);

  const { data, loading, error, reload } = useAsync(() => adminApi.order(id), [id]);

  const setStatus = async (next) => {
    setBusy(true);
    try {
      await adminApi.updateOrder(id, { status: next });
      setFlash(`Moved to ${next}.`);
      reload();
    } catch (err) {
      setFlash(err.message);
      reload();
    } finally {
      setBusy(false);
      setTimeout(() => setFlash(null), 4000);
    }
  };

  if (loading && !data) return <div className="skeleton-line" style={{ height: 320 }} />;
  if (error) return <div className="notice notice--error">{error}</div>;
  if (!data?.order) return <div className="notice">That order could not be found.</div>;

  const { order, items = [], history = [] } = data;
  const address = (() => {
    try { return order.address ? JSON.parse(order.address) : null; } catch { return null; }
  })();
  const synthetic = order.channel === 'synthetic';

  return (
    <>
      <header className="admin__head">
        <div>
          <span className="field__label">
            <Link className="link" to="/admin/orders">Orders</Link> / {order.id}
          </span>
          <h1 className="h2">{money(order.total)}</h1>
          <p className="tiny" style={{ textTransform: 'none', letterSpacing: '.02em', marginTop: 4 }}>
            {formatShortDate(order.placed_at)} · {order.email} · {items.length} item{items.length === 1 ? '' : 's'}
          </p>
        </div>
        {can('orders.edit') && !synthetic && (
          <div className="admin__headactions">
            <label className="field">
              <span className="field__label">Status</span>
              <select className="input" value={order.status} disabled={busy}
                onChange={(e) => setStatus(e.target.value)}>
                {STAGES.concat(['Cancelled', 'Returned']).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          </div>
        )}
      </header>

      {flash && <div className="notice" style={{ marginBottom: 'var(--spacing-18)' }}>{flash}</div>}

      {synthetic && (
        <div className="notice notice--warning" style={{ marginBottom: 'var(--spacing-18)' }}>
          This is generated training data, not a real order. It is excluded from every revenue figure
          and cannot be edited.
        </div>
      )}

      <div className="admin-editor">
        <div>
          <section className="admin-panel">
            <h2 className="admin-panel__title">Items</h2>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr><th>Product</th><th>Variant</th><th className="tr">Qty</th><th className="tr">Unit</th><th className="tr">Line</th></tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.id}>
                      <td>
                        {it.product_id
                          ? <Link className="link" to={`/admin/products/${it.product_id}`}>{dx(it.name)}</Link>
                          : dx(it.name)}
                        <div className="tiny mono" style={{ textTransform: 'none' }}>{it.product_id}</div>
                      </td>
                      <td className="tiny">{[it.variant, it.size].filter(Boolean).join(' · ') || '—'}</td>
                      <td className="tr mono">{it.qty}</td>
                      <td className="tr mono">{money(it.unit_price)}</td>
                      <td className="tr mono">{money(it.unit_price * it.qty)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {history.length > 0 && (
            <section className="admin-panel">
              <h2 className="admin-panel__title">History</h2>
              <ul className="ml-runs">
                {history.map((h) => (
                  <li key={h.id}>
                    <span className="pill">{h.action}</span>
                    <span className="tiny">{dx(h.summary)}</span>
                    <span className="tiny ml-runs__when">{formatShortDate(h.created_at)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div>
          <section className="admin-panel">
            <h2 className="admin-panel__title">Totals</h2>
            <dl className="ml-model__facts ml-model__facts--stack">
              <div><dt>Subtotal</dt><dd className="mono">{money(order.subtotal)}</dd></div>
              {order.discount > 0 && <div><dt>Discount</dt><dd className="mono">−{money(order.discount)}</dd></div>}
              <div><dt>Shipping</dt><dd className="mono">{order.shipping ? money(order.shipping) : 'Free'}</dd></div>
              <div><dt>GST</dt><dd className="mono">{money(order.tax)}</dd></div>
              <div><dt>Total</dt><dd className="mono">{money(order.total)}</dd></div>
            </dl>
          </section>

          <section className="admin-panel">
            <h2 className="admin-panel__title">Delivery</h2>
            {address ? (
              <p className="tiny" style={{ textTransform: 'none', lineHeight: 1.7 }}>
                {[address.name, address.line1, address.line2, address.city, address.postcode, address.country]
                  .filter(Boolean).map((l, i) => <span key={i} style={{ display: 'block' }}>{l}</span>)}
              </p>
            ) : <p className="tiny">No address recorded.</p>}
            <dl className="ml-model__facts ml-model__facts--stack" style={{ marginTop: 'var(--spacing-12)' }}>
              <div><dt>Method</dt><dd>{order.method || '—'}</dd></div>
              <div><dt>Payment</dt><dd>{order.payment || '—'}</dd></div>
              <div><dt>Tracking</dt><dd className="mono tiny">{order.tracking || '—'}</dd></div>
            </dl>
          </section>
        </div>
      </div>
    </>
  );
}
