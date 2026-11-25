/* =============================================================
   AURELIS - ORDER CONFIRMATION
   ============================================================= */
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  Breadcrumbs, Empty, Glass, Icon, Loading, ProductArt, Reveal, SectionHead, Sheen
} from '../../components/primitives';
import { OrderTracker } from '../../components/checkout';
import { ProductGrid } from '../../components/ProductCard';
import { useStore } from '../../context/StoreContext';
import { useAsync } from '../../lib/useAsync';
import api from '../../lib/api';
import { dx, formatDate, money, paletteForVariant } from '../../lib/format';

export default function Confirmation() {
  const { id } = useParams();
  const location = useLocation();
  const { categories, toast } = useStore();

  const passed = location.state?.order;
  const { data, loading, error } = useAsync(
    () => (passed ? Promise.resolve(passed) : api.order(id)),
    [id]
  );

  const order = passed || data;
  const suggestions = useAsync(() => api.products({ sort: 'rating', perPage: 4 }), []);
  const catName = (slug) => dx(categories.find((c) => c.slug === slug)?.name || '');

  if (loading && !order) return <Loading label="Confirming your order" />;

  if (error || !order) {
    return (
      <div className="shell section">
        <Empty
          icon="box"
          title="We cannot find that order"
          body="The reference may be mistyped, or the order may belong to a different register."
          cta={{ to: '/account/orders', label: 'View your orders' }}
        />
      </div>
    );
  }

  const eta = new Date();
  eta.setDate(eta.getDate() + (order.method === 'exp' ? 2 : order.method === 'hand' ? 1 : 5));

  const copyRef = async () => {
    try {
      await navigator.clipboard.writeText(order.id);
      toast('Order reference copied.', 'doc');
    } catch {
      toast('Copy is unavailable in this browser.', 'close');
    }
  };

  return (
    <div className="shell">
      <Breadcrumbs trail={[{ label: 'Home', to: '/' }, { label: 'Order Confirmation' }]} />

      <section className="section" style={{ paddingTop: 0 }}>
        <div
          className="confirm"
          style={{
            background: '#FFFFFF',
            border: '1px solid var(--line)',
            borderRadius: 'var(--r-md)',
            padding: '48px 36px',
            textAlign: 'center',
            boxShadow: 'var(--sh-1)'
          }}
        >
          <div
            style={{
              background: 'radial-gradient(circle at center, rgba(200, 169, 126, 0.2) 0%, rgba(200, 169, 126, 0.05) 70%)',
              border: '1px solid var(--gold)',
              color: 'var(--gold-text)',
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 18px'
            }}
          >
            <Icon name="check" size={28} />
          </div>

          <span className="eyebrow" style={{ color: 'var(--gold-text)', display: 'block', marginBottom: '8px' }}>
            Acquisition Confirmed &middot; {formatDate(order.date)}
          </span>

          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(2rem, 3.5vw, 2.75rem)',
              fontWeight: 400,
              color: 'var(--pearl)',
              margin: '0 0 12px',
              lineHeight: 1.2
            }}
          >
            Order Confirmed. Crafting in Atelier.
          </h1>

          <p
            className="lede"
            style={{
              margin: '0 auto 24px',
              maxWidth: '62ch',
              fontSize: '0.98rem',
              color: 'var(--pearl-3)',
              lineHeight: 1.6
            }}
          >
            A verified receipt and provenance record have been sent to{' '}
            <strong style={{ color: 'var(--pearl)', fontWeight: 600 }}>{order.email}</strong>.
            Your piece is now claimed at the bench in Geneva; signature delivery will initiate upon final assay inspection.
          </p>

          <div
            style={{
              background: 'var(--color-paper-light)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--r-pill)',
              padding: '10px 24px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              margin: '0 auto 32px'
            }}
          >
            <span style={{ fontSize: '0.78rem', color: 'var(--pearl-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
              Order Reference
            </span>
            <strong style={{ fontFamily: 'var(--font-sans)', fontSize: '1.05rem', color: 'var(--pearl)', letterSpacing: '0.04em' }}>
              {order.id}
            </strong>
            <button
              type="button"
              className="icon-btn"
              onClick={copyRef}
              aria-label="Copy order reference"
              title="Copy Reference"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--pearl-2)' }}
            >
              <Icon name="doc" size={16} />
            </button>
          </div>

          <OrderTracker stage={order.stage ?? 1} />

          <div className="confirm__grid" style={{ marginTop: '36px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
            {/* 1: Delivery Coordinates */}
            <div
              style={{
                background: 'var(--color-paper-light)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--r-sm)',
                padding: '24px',
                textAlign: 'left'
              }}
            >
              <span className="eyebrow" style={{ color: 'var(--gold-text)', display: 'block', marginBottom: '8px' }}>
                Delivery Destination
              </span>
              <p style={{ color: 'var(--pearl)', fontFamily: 'var(--font-serif)', fontSize: '1.1rem', fontWeight: 500, margin: '4px 0 0' }}>
                {dx(order.methodName || 'White-Glove Insured Delivery')}
              </p>
              <p style={{ fontSize: '0.82rem', color: 'var(--pearl-3)', margin: '4px 0 12px' }}>
                {dx(order.methodEta || 'Complimentary Insured Delivery')}
              </p>

              {order.address ? (
                <div style={{ fontSize: '0.86rem', color: 'var(--pearl-2)', lineHeight: 1.6, borderTop: '1px solid var(--line)', paddingTop: '12px' }}>
                  <strong style={{ color: 'var(--pearl)', display: 'block' }}>
                    {dx(order.address.first)} {dx(order.address.last)}
                  </strong>
                  {[order.address.line1, order.address.line2, order.address.city, order.address.post, order.address.country]
                    .filter(Boolean).map(dx).join(', ')}
                  {order.address.phone && <div style={{ marginTop: '4px', color: 'var(--pearl-3)' }}>Tel: {dx(order.address.phone)}</div>}
                </div>
              ) : (
                <p style={{ fontSize: '0.86rem', color: 'var(--pearl-3)', borderTop: '1px solid var(--line)', paddingTop: '12px' }}>
                  Held in salon for white-glove collection.
                </p>
              )}

              <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--line)', fontSize: '0.78rem', color: 'var(--gold-text)', fontWeight: 600 }}>
                Estimated Arrival: {formatDate(eta.toISOString().slice(0, 10))}
              </div>
            </div>

            {/* 2: Settlement Ledger */}
            <div
              style={{
                background: 'var(--color-paper-light)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--r-sm)',
                padding: '24px',
                textAlign: 'left'
              }}
            >
              <span className="eyebrow" style={{ color: 'var(--gold-text)', display: 'block', marginBottom: '8px' }}>
                Payment Summary
              </span>
              <p style={{ color: 'var(--pearl)', fontFamily: 'var(--font-serif)', fontSize: '1.1rem', fontWeight: 500, margin: '4px 0 16px' }}>
                {dx(order.payment === 'card' ? 'Payment Card' : order.payment === 'wire' ? 'Bank Wire Escrow' : 'Split Settlement')}
              </p>

              <div>
                <div className="luxury-summary-row">
                  <span>Subtotal</span>
                  <span>{money(order.totals.subtotal)}</span>
                </div>
                {order.totals.discount > 0 && (
                  <div className="luxury-summary-row" style={{ color: 'var(--gold-text)' }}>
                    <span>Privilege [{dx(order.promo?.label || 'PROMO')}]</span>
                    <span>&minus;{money(order.totals.discount)}</span>
                  </div>
                )}
                <div className="luxury-summary-row">
                  <span>Complimentary Insured Delivery</span>
                  <span style={{ color: 'var(--success)' }}>
                    {order.totals.shipping ? money(order.totals.shipping) : 'Complimentary'}
                  </span>
                </div>
                <div className="luxury-summary-row">
                  <span>GST (statutory duties)</span>
                  <span>{money(order.totals.tax)}</span>
                </div>
                <div className="luxury-total-row">
                  <span>Total Settled</span>
                  <span>{money(order.totals.total)}</span>
                </div>
              </div>
            </div>

            {/* 3: Telemetry Tracking */}
            <div
              style={{
                background: 'var(--color-paper-light)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--r-sm)',
                padding: '24px',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <span className="eyebrow" style={{ color: 'var(--gold-text)', display: 'block', marginBottom: '8px' }}>
                Atelier Consignment
              </span>
              <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, color: 'var(--pearl)', margin: '4px 0 0', fontSize: '1.05rem', letterSpacing: '0.04em' }}>
                {order.tracking}
              </p>
              <p style={{ fontSize: '0.84rem', color: 'var(--pearl-3)', margin: '8px 0 0', lineHeight: 1.5 }}>
                Insured under Geneva maison escort protocol. Live tracking coordinates activate once bench hallmarking concludes.
              </p>

              <div style={{ display: 'grid', gap: '8px', marginTop: 'auto', paddingTop: '20px' }}>
                <Link className="btn btn--gold btn--sm btn--block" to={`/account/orders/${order.id}`}>
                  View Order Dossier
                </Link>
                <Link className="btn btn--outline btn--sm btn--block" to="/help">
                  Contact Atelier Concierge
                </Link>
              </div>
            </div>
          </div>

          <div className="rule" style={{ margin: '40px 0 32px' }} />

          {/* Allocated Specimen Manifest */}
          <div style={{ textAlign: 'left' }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: 'var(--pearl)', fontWeight: 500, margin: '0 0 20px' }}>
              Acquired Creations
            </h3>

            <div style={{ display: 'grid', gap: '14px' }}>
              {order.items.map((it, i) => (
                <div
                  key={`${it.id}-${i}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '64px 1fr auto',
                    gap: '16px',
                    alignItems: 'center',
                    padding: '16px',
                    background: 'var(--color-paper-light)',
                    borderRadius: 'var(--r-sm)',
                    border: '1px solid var(--line)'
                  }}
                >
                  <div style={{ aspectRatio: '1 / 1', overflow: 'hidden', borderRadius: 'var(--r-xs)', background: 'radial-gradient(circle at center, #FFFFFF 40%, #F5F2EB 100%)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px' }}>
                    <ProductArt
                      id={it.id}
                      shape={it.product?.shape || 'atelier'}
                      palette={paletteForVariant(it.product, it.variant)}
                      label={it.product?.name}
                    />
                  </div>

                  <div>
                    <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.05rem', fontWeight: 500, color: 'var(--pearl)', display: 'block' }}>
                      {dx(it.product?.name || 'Piece')}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--pearl-3)', marginTop: '2px', display: 'block' }}>
                      {[it.variant, it.size].filter(Boolean).map(dx).join(' &middot; ')} &times; {it.qty}
                    </span>
                  </div>

                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--pearl)' }}>
                    {money(it.lineTotal)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="help-grid">
          {[
            { icon: 'crown', title: 'Join Le Cercle', body: 'Members see numbered editions forty-eight hours early and never pay for servicing.', to: '/membership', cta: 'Apply' },
            { icon: 'refresh', title: 'Change of mind?', body: 'Thirty days to return, collected at our cost. Start it from your order at any time.', to: '/returns', cta: 'Returns' },
            { icon: 'pin', title: 'Visit a boutique', body: 'Have your piece fitted, engraved or serviced in person at any of eight houses.', to: '/stores', cta: 'Find one' }
          ].map((c, i) => (
            <Reveal key={c.title} delay={i + 1}>
              <Glass variant="glass--lift" className="help-card">
                <Icon name={c.icon} size={26} />
                <h3>{c.title}</h3>
                <p>{c.body}</p>
                <Link className="btn btn--glass btn--sm" to={c.to}><Sheen />{c.cta}</Link>
              </Glass>
            </Reveal>
          ))}
        </div>
      </section>

      {suggestions.data?.items?.length > 0 && (
        <section className="section" style={{ paddingTop: 0 }}>
          <SectionHead kicker="While you wait" title="Others in the house" />
          <ProductGrid items={suggestions.data.items} categoryLookup={catName} />
        </section>
      )}
    </div>
  );
}
