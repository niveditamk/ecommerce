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
      <Breadcrumbs trail={[{ label: 'SYS.ROOT', to: '/' }, { label: 'TRANSACTION RECEIPT' }]} />

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="confirm" style={{ background: 'var(--color-paper)', border: '1px solid var(--line-dark)', borderRadius: 'var(--r-sm)', padding: '36px 28px', textAlign: 'center' }}>
          <div className="confirm__seal" style={{ background: 'var(--color-terminal-green-dim)', border: '1px solid var(--line-green)', color: 'var(--color-terminal-green-text)', width: '64px', height: '64px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Icon name="check" size={32} />
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--color-terminal-green-text)', fontWeight: 700, letterSpacing: '0.08em', display: 'block' }}>
            [ ESCROW COMMITTED &middot; {formatDate(order.date).toUpperCase()} ]
          </span>
          <h1 className="h1" style={{ marginTop: '0.6rem', fontFamily: 'var(--font-grotesk)', fontWeight: 700, textTransform: 'uppercase' }}>
            TRANSACTION CONFIRMED. SPECIMEN COMMISSIONED.
          </h1>
          <p className="lede muted" style={{ margin: '1rem auto 0', maxWidth: '58ch', fontFamily: 'var(--font-grotesk)', fontSize: '0.95rem' }}>
            A verified receipt has been transmitted to <span style={{ color: 'var(--color-terminal-green-text)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{order.email}</span>. Your specimen has been claimed at the Geneva bench; telemetry will update the moment dispatch initiates.
          </p>

          <div className="confirm__no" style={{ background: 'var(--color-paper-light)', border: '1px solid var(--line)', borderRadius: 'var(--r-xs)', padding: '10px 18px', display: 'inline-flex', alignItems: 'center', gap: '12px', margin: '20px auto' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--pearl-3)' }}>SYSTEM REF:</span>
            <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', color: 'var(--pearl)' }}>{order.id}</strong>
            <button type="button" className="icon-btn" onClick={copyRef} aria-label="Copy order reference" title="Copy Reference">
              <Icon name="doc" size={16} />
            </button>
          </div>

          <OrderTracker stage={order.stage ?? 1} />

          <div className="confirm__grid" style={{ marginTop: '28px' }}>
            <div className="panel" style={{ background: 'var(--color-paper-light)', border: '1px solid var(--line)', borderRadius: 'var(--r-xs)', padding: '20px', textAlign: 'left' }}>
              <h5 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--color-terminal-green-text)', fontWeight: 700, letterSpacing: '0.08em' }}>// DISPATCH COORDINATES</h5>
              <p style={{ color: 'var(--pearl)', marginTop: '.7rem', fontFamily: 'var(--font-grotesk)', fontWeight: 700 }}>{dx(order.methodName || 'Signature Courier Dispatch')}</p>
              <p className="muted" style={{ fontSize: '.86rem', marginTop: '.3rem', fontFamily: 'var(--font-mono)' }}>{dx(order.methodEta || '')}</p>
              {order.address ? (
                <p className="muted" style={{ fontSize: '.86rem', marginTop: '.8rem', lineHeight: 1.5 }}>
                  {dx(order.address.first)} {dx(order.address.last)}<br />
                  {[order.address.line1, order.address.line2, order.address.city, order.address.post, order.address.country]
                    .filter(Boolean).map(dx).join(', ')}
                </p>
              ) : (
                <p className="muted" style={{ fontSize: '.86rem', marginTop: '.8rem' }}>
                  Held in Geneva atelier for salon pickup.
                </p>
              )}
              <p className="tiny" style={{ marginTop: '.9rem', fontFamily: 'var(--font-mono)', color: 'var(--color-terminal-green-text)', fontWeight: 700 }}>
                [ ESTIMATED ARRIVAL: {formatDate(eta.toISOString().slice(0, 10)).toUpperCase()} ]
              </p>
            </div>

            <div className="panel" style={{ background: 'var(--color-paper-light)', border: '1px solid var(--line)', borderRadius: 'var(--r-xs)', padding: '20px', textAlign: 'left' }}>
              <h5 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--color-terminal-green-text)', fontWeight: 700, letterSpacing: '0.08em' }}>// SETTLEMENT LEDGER</h5>
              <p style={{ color: 'var(--pearl)', marginTop: '.7rem', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>{dx(order.payment).toUpperCase()}</p>
              <div style={{ marginTop: '.9rem' }}>
                <div className="console-summary-row"><dt>SUBTOTAL</dt><dd>{money(order.totals.subtotal)}</dd></div>
                {order.totals.discount > 0 && (
                  <div className="console-summary-row" style={{ color: 'var(--color-terminal-green-text)' }}>
                    <dt>{dx(order.promo?.label || 'PROMO')}</dt><dd>&minus;{money(order.totals.discount)}</dd>
                  </div>
                )}
                <div className="console-summary-row"><dt>COURIER ESCROW</dt><dd>{order.totals.shipping ? money(order.totals.shipping) : 'FREE'}</dd></div>
                <div className="console-summary-row"><dt>GST / TAX</dt><dd>{money(order.totals.tax)}</dd></div>
                <div className="console-total-row"><dt>SETTLED</dt><dd>{money(order.totals.total)}</dd></div>
              </div>
            </div>

            <div className="panel" style={{ background: 'var(--color-paper-light)', border: '1px solid var(--line)', borderRadius: 'var(--r-xs)', padding: '20px', textAlign: 'left' }}>
              <h5 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--color-terminal-green-text)', fontWeight: 700, letterSpacing: '0.08em' }}>// TELEMETRY TRACKING</h5>
              <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--pearl)', marginTop: '.7rem', fontSize: '0.95rem' }}>{order.tracking}</p>
              <p className="muted" style={{ fontSize: '.82rem', marginTop: '.6rem', lineHeight: 1.5 }}>
                Encrypted consignment status activates upon bench release. 100% insured under Geneva escrow protocol.
              </p>
              <div style={{ display: 'grid', gap: '.6rem', marginTop: '1.1rem' }}>
                <Link className="btn btn--gold btn--sm btn--block" to={`/account/orders/${order.id}`}>
                  AUDIT TRANSACTION LEDGER
                </Link>
                <Link className="btn btn--outline btn--sm btn--block" to="/help">
                  TRANSMIT CONCIERGE INQUIRY
                </Link>
              </div>
            </div>
          </div>

          <div className="rule" style={{ margin: '2.4rem 0 1.8rem' }} />

          <div style={{ textAlign: 'left' }}>
            <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-terminal-green-text)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '1rem' }}>
              // ALLOCATED SPECIMEN MANIFEST
            </h3>
            {order.items.map((it, i) => (
              <div className="co-sum__item" key={`${it.id}-${i}`}>
                <span className="thumb">
                  <ProductArt
                    id={it.id}
                    shape={it.product?.shape || 'atelier'}
                    palette={paletteForVariant(it.product, it.variant)}
                    label={it.product?.name}
                  />
                  <b>{it.qty}</b>
                </span>
                <span>
                  <span style={{ fontFamily: 'var(--font-grotesk)', fontWeight: 700, color: 'var(--pearl)', display: 'block' }}>
                    {dx(it.product?.name || 'Piece')}
                  </span>
                  <span className="tiny" style={{ fontFamily: 'var(--font-mono)', letterSpacing: '.06em', textTransform: 'none' }}>
                    {[it.variant, it.size].filter(Boolean).map(dx).join(' · ').toUpperCase()}
                  </span>
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--pearl)' }}>{money(it.lineTotal)}</span>
              </div>
            ))}
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
