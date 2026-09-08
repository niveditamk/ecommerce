/* =============================================================
   AURELIS MAISON — INDIVIDUAL ORDER VIEW & VISUAL TRACKING
   5-stage visual timeline tracker, courier status, piece dossier,
   breakdown, and customer care actions.
   ============================================================= */
import { Link, useParams } from 'react-router-dom';
import {
  Breadcrumbs, Empty, Icon, Loading, PageHead, ProductArt
} from '../../components/primitives';
import { AccountNav, OrderTracker } from '../../components/checkout';
import { useStore } from '../../context/StoreContext';
import { useAsync } from '../../lib/useAsync';
import api from '../../lib/api';
import { dx, formatDate, money, paletteForVariant } from '../../lib/format';

const TIMELINE_STAGES = [
  ['Order Confirmed', 'A reference has been issued and the piece is claimed at the bench in Geneva.'],
  ['In the Atelier', 'Final hand-finishing, hallmarking, assay verification, and bespoke engraving.'],
  ['Quality Assured & Dispatched', 'Inspected against the maison master ledger, sealed in presentation case, and handed to courier.'],
  ['Out for Delivery', 'Tracked, temperature-regulated, and signature-verified with armed/insured courier.'],
  ['Delivered', 'The piece rests with you. Lifetime complimentary servicing and warranty begins.']
];

export default function OrderDetail() {
  const { id } = useParams();
  const { toast } = useStore();
  const { data: order, loading, error } = useAsync(() => api.order(id), [id]);

  if (loading) return <Loading label="Opening the order dossier" />;

  if (error || !order) {
    return (
      <div className="shell section">
        <Empty
          icon="box"
          title="Order Not Found"
          body="The order reference could not be located in the register."
          cta={{ to: '/account/orders', label: 'View All Orders' }}
        />
      </div>
    );
  }

  const copy = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(`${label} copied.`, 'check');
    } catch {
      toast('Copy unavailable in browser.', 'close');
    }
  };

  return (
    <div className="shell">
      <Breadcrumbs
        trail={[
          { label: 'Home', to: '/' },
          { label: 'Account', to: '/account/profile' },
          { label: 'Orders', to: '/account/orders' },
          { label: order.id }
        ]}
      />

      <PageHead
        kicker={`Placed ${formatDate(order.date)}`}
        title={`Order ${order.id}`}
        lede={`Status: ${order.status} · ${dx(order.methodName)} · ${dx(order.methodEta || 'Insured delivery')}`}
        aside={
          <div style={{ display: 'flex', gap: '8px' }}>
            {order.tracking && (
              <button
                type="button"
                className="btn btn--sm btn--outline"
                onClick={() => copy(order.tracking, 'Tracking number')}
              >
                <Icon name="truck" size={14} /> Tracking: {order.tracking}
              </button>
            )}
            <Link className="btn btn--sm btn--gold" to="/help">
              Concierge
            </Link>
          </div>
        }
      />

      <section className="section" style={{ paddingTop: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '48px', alignItems: 'start' }}>
          <AccountNav />

          <div>
            {/* Visual 5-stage timeline tracker */}
            <div style={{ background: 'var(--color-bone)', padding: '32px', borderRadius: 'var(--r-xs)', border: '1px solid var(--line)', marginBottom: '32px' }}>
              <div className="between" style={{ marginBottom: '24px', paddingBottom: '12px', borderBottom: '1px solid var(--line)' }}>
                <span className="eyebrow">Real-Time Atelier Tracking</span>
                <span className="badge badge--gold">{order.status}</span>
              </div>

              <OrderTracker stage={order.stage ?? 1} />

              <div style={{ display: 'grid', gap: '16px', marginTop: '32px', paddingTop: '20px', borderTop: '1px solid var(--line-2)' }}>
                {TIMELINE_STAGES.map(([title, desc], i) => {
                  const isCurrent = i === (order.stage ?? 1);
                  const isDone = i < (order.stage ?? 1);
                  return (
                    <div key={title} style={{ opacity: isDone || isCurrent ? 1 : 0.4, display: 'flex', gap: '14px' }}>
                      <span style={{ color: isCurrent ? 'var(--color-obsidian)' : isDone ? 'var(--gold)' : 'var(--pearl-4)', fontWeight: 600, fontSize: '14px' }}>
                        {isDone ? '✓' : `0${i + 1}`}
                      </span>
                      <div>
                        <div style={{ fontFamily: 'var(--serif)', fontSize: '16px', fontWeight: isCurrent ? 600 : 500, color: 'var(--pearl)' }}>
                          {title}
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--pearl-3)', marginTop: '2px' }}>
                          {desc}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Items in order */}
            <div style={{ background: 'var(--color-paper-light)', padding: '32px', borderRadius: 'var(--r-xs)', border: '1px solid var(--line)' }}>
              <h3 className="h3" style={{ fontFamily: 'var(--serif)', fontSize: '20px', marginBottom: '20px' }}>
                Pieces in this Order
              </h3>

              <div style={{ display: 'grid', gap: '16px' }}>
                {order.items.map((item, idx) => (
                  <div
                    key={`${item.id}-${idx}`}
                    style={{ display: 'grid', gridTemplateColumns: '80px 1fr auto', gap: '16px', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid var(--line-2)' }}
                  >
                    <div style={{ aspectRatio: '1/1', overflow: 'hidden', borderRadius: 'var(--r-xs)', background: 'var(--color-bone)' }}>
                      <ProductArt
                        id={item.id}
                        shape={item.product?.shape || 'atelier'}
                        palette={paletteForVariant(item.product, item.variant)}
                        label={item.product?.name}
                      />
                    </div>
                    <div>
                      <Link to={`/product/${item.id}`} style={{ fontFamily: 'var(--serif)', fontSize: '17px', color: 'var(--pearl)', fontWeight: 500 }}>
                        {dx(item.product?.name || item.name)}
                      </Link>
                      <div className="tiny" style={{ color: 'var(--pearl-3)', marginTop: '2px', textTransform: 'none' }}>
                        {[item.variant, item.size].filter(Boolean).map(dx).join(' · ')} &times; {item.qty}
                      </div>
                    </div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: '15px', fontWeight: 500 }}>
                      {money(item.lineTotal || item.price * item.qty)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Order financial breakdown */}
              <dl className="dl" style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--line)' }}>
                <div className="dl__row">
                  <dt>Subtotal</dt>
                  <dd>{money(order.totals?.subtotal || 0)}</dd>
                </div>
                {order.totals?.discount > 0 && (
                  <div className="dl__row" style={{ color: 'var(--gold-text)' }}>
                    <dt>Discount</dt>
                    <dd>&minus;{money(order.totals.discount)}</dd>
                  </div>
                )}
                <div className="dl__row">
                  <dt>Delivery</dt>
                  <dd>{order.totals?.shipping ? money(order.totals.shipping) : 'Complimentary'}</dd>
                </div>
                <div className="dl__row">
                  <dt>Taxes</dt>
                  <dd>{money(order.totals?.tax || 0)}</dd>
                </div>
                <div className="dl__row dl__row--total">
                  <dt>Total</dt>
                  <dd>{money(order.totals?.total || 0)}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
