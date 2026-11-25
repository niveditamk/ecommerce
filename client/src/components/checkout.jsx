/* =============================================================
   AURELIS MAISON — CHECKOUT & TRANSACTION CONSOLE PRIMITIVES
   Progress rail, order summary panel, account navigation sidebar,
   and visual order status tracker.
   ============================================================= */
import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Icon, ProductArt } from './primitives';
import { useStore } from '../context/StoreContext';
import { dx, money, paletteForVariant, initials } from '../lib/format';

const CHECKOUT_STEPS = [
  { id: 'login', step: 1, label: 'Identification', to: '/checkout/login' },
  { id: 'shipping', step: 2, label: 'Delivery', to: '/checkout/shipping' },
  { id: 'payment', step: 3, label: 'Payment', to: '/checkout/payment' },
  { id: 'review', step: 4, label: 'Review & Commit', to: '/checkout/review' }
];

export function CheckoutSteps({ current }) {
  const index = CHECKOUT_STEPS.findIndex((s) => s.id === current);
  return (
    <nav className="checkout-steps" aria-label="Checkout Progress">
      {CHECKOUT_STEPS.map((step, i) => {
        const isDone = i < index;
        const isCurrent = i === index;
        return (
          <div
            key={step.id}
            className={`checkout-step${isCurrent ? ' is-active' : ''}${isDone ? ' is-done' : ''}`}
          >
            {isDone ? (
              <Link to={step.to} className="checkout-step" style={{ textDecoration: 'none' }}>
                <span className="checkout-step-badge">✓</span>
                <span>{step.label}</span>
              </Link>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="checkout-step-badge">{step.step}</span>
                <span>{step.label}</span>
              </span>
            )}
            {i < CHECKOUT_STEPS.length - 1 && (
              <span style={{ opacity: 0.25, margin: '0 8px', fontSize: '0.8rem' }}>&rarr;</span>
            )}
          </div>
        );
      })}
    </nav>
  );
}

export function OrderSummary({ showPromo = true, editable = true }) {
  const { session, applyPromo, clearPromo, busy } = useStore();
  const { cart, totals, checkout } = session;
  const [promoCode, setPromoCode] = useState('');

  const submitPromo = async (e) => {
    e.preventDefault();
    if (!promoCode.trim()) return;
    const res = await applyPromo(promoCode.trim());
    if (res.ok) setPromoCode('');
  };

  return (
    <aside
      style={{
        background: '#FFFFFF',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-md)',
        padding: '24px',
        boxShadow: 'var(--sh-1)'
      }}
    >
      <div className="between" style={{ marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid var(--line)' }}>
        <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', color: 'var(--pearl)', fontWeight: 500, margin: 0 }}>
          Order Summary ({totals.count} {totals.count === 1 ? 'Piece' : 'Pieces'})
        </h3>
        {editable && (
          <Link to="/cart" style={{ fontSize: '0.78rem', color: 'var(--gold-text)', textDecoration: 'none', fontWeight: 600 }}>
            Edit Bag
          </Link>
        )}
      </div>

      {/* Cart Items List */}
      <div style={{ display: 'grid', gap: '14px', marginBottom: '20px' }}>
        {cart.map((line) => (
          <div key={line.key} style={{ display: 'grid', gridTemplateColumns: '54px 1fr auto', gap: '14px', alignItems: 'center', borderBottom: '1px solid var(--line)', paddingBottom: '12px' }}>
            <div style={{ aspectRatio: '1 / 1', overflow: 'hidden', borderRadius: 'var(--r-xs)', background: 'radial-gradient(circle at center, #FFFFFF 40%, #F5F2EB 100%)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px' }}>
              <ProductArt
                id={line.product.id}
                shape={line.product.shape}
                palette={paletteForVariant(line.product, line.variant)}
                label={line.product.name}
              />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '0.98rem', fontWeight: 500, color: 'var(--pearl)', lineHeight: 1.25 }}>
                {dx(line.product.name)}
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--pearl-3)', marginTop: '3px' }}>
                {[line.variant, line.size].filter(Boolean).map(dx).join(' &middot; ')} &times; {line.qty}
              </div>
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--pearl)' }}>
              {money(line.lineTotal)}
            </div>
          </div>
        ))}
      </div>

      {/* Promo Form */}
      {showPromo && (
        <div style={{ marginBottom: '18px', paddingTop: '8px' }}>
          {checkout.promo ? (
            <div className="between" style={{ padding: '8px 12px', background: 'var(--color-paper-light)', border: '1px solid var(--gold)', borderRadius: 'var(--r-xs)' }}>
              <span style={{ color: 'var(--gold-text)', fontSize: '0.8rem', fontWeight: 600 }}>
                Privilege [{checkout.promo.code}] Applied
              </span>
              <button type="button" onClick={clearPromo} style={{ color: 'var(--error)', background: 'none', border: 'none', fontSize: '0.76rem', cursor: 'pointer', textDecoration: 'underline' }}>
                Remove
              </button>
            </div>
          ) : (
            <form onSubmit={submitPromo} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder="Privilege code"
                style={{
                  padding: '8px 14px',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.82rem',
                  background: '#FFFFFF',
                  border: '1px solid var(--line-control)',
                  borderRadius: 'var(--r-pill)',
                  flex: 1,
                  textTransform: 'uppercase'
                }}
              />
              <button type="submit" className="btn btn--sm btn--gold" disabled={busy}>
                Apply
              </button>
            </form>
          )}
        </div>
      )}

      {/* Price Breakdown */}
      <div style={{ paddingTop: '8px', borderTop: '1px solid var(--line)' }}>
        <div className="luxury-summary-row">
          <span>Subtotal</span>
          <span>{money(totals.subtotal)}</span>
        </div>
        {totals.discount > 0 && (
          <div className="luxury-summary-row" style={{ color: 'var(--gold-text)' }}>
            <span>Privilege [{dx(checkout.promo?.label || 'DISCOUNT')}]</span>
            <span>&minus;{money(totals.discount)}</span>
          </div>
        )}
        <div className="luxury-summary-row">
          <span>Complimentary Insured Delivery</span>
          <span style={{ color: 'var(--success)' }}>{totals.shipping ? money(totals.shipping) : 'Complimentary'}</span>
        </div>
        <div className="luxury-summary-row">
          <span>Goods &amp; Services Tax (GST included)</span>
          <span>{money(totals.tax)}</span>
        </div>
        <div className="luxury-total-row">
          <span>Total</span>
          <span>{money(totals.total)}</span>
        </div>
      </div>
    </aside>
  );
}

const ACCOUNT_NAVIGATION = [
  { to: '/account/orders', label: 'Orders & Tracking', icon: 'box' },
  { to: '/account/profile', label: 'Profile & Preferences', icon: 'user' },
  { to: '/account/addresses', label: 'Delivery Addresses', icon: 'pin' },
  { to: '/account/payment', label: 'Payment Settings', icon: 'card' },
  { to: '/wishlist', label: 'Saved Pieces', icon: 'bag' },
  { to: '/returns', label: 'Returns & Exchanges', icon: 'refresh' },
  { to: '/help', label: 'Concierge Care', icon: 'chat' }
];

export function AccountNav() {
  const { session, logout } = useStore();
  const user = session.user;

  return (
    <aside style={{ background: 'var(--color-bone)', padding: '24px', border: '1px solid var(--line)', borderRadius: 'var(--r-xs)' }}>
      {/* Account User Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', paddingBottom: '16px', borderBottom: '1px solid var(--line)', marginBottom: '16px' }}>
        <span
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'var(--color-obsidian)',
            color: 'var(--color-paper)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--serif)',
            fontSize: '16px'
          }}
        >
          {initials(user)}
        </span>
        <div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: '17px', color: 'var(--pearl)', fontWeight: 500 }}>
            {user ? `${dx(user.first)} ${dx(user.last)}` : 'Guest Collector'}
          </div>
          <div className="tiny" style={{ color: 'var(--gold-text)', fontWeight: 600 }}>
            {user ? `${user.tier} · ${user.memberNo}` : 'Not Signed In'}
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div style={{ display: 'grid', gap: '4px' }}>
        {ACCOUNT_NAVIGATION.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              fontSize: '13px',
              borderRadius: 'var(--r-xs)',
              color: isActive ? 'var(--pearl)' : 'var(--pearl-3)',
              backgroundColor: isActive ? 'var(--color-paper-light)' : 'transparent',
              fontWeight: isActive ? 600 : 400
            })}
          >
            <Icon name={l.icon} size={16} />
            <span>{l.label}</span>
          </NavLink>
        ))}
      </div>

      <div className="rule" style={{ margin: '16px 0' }} />

      {user ? (
        <button
          type="button"
          onClick={logout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            width: '100%',
            padding: '8px 12px',
            fontSize: '13px',
            color: 'var(--error)'
          }}
        >
          <Icon name="close" size={16} />
          <span>Sign Out</span>
        </button>
      ) : (
        <Link
          to="/account/auth"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 12px',
            fontSize: '13px',
            color: 'var(--pearl)'
          }}
        >
          <Icon name="user" size={16} />
          <span>Sign In / Register</span>
        </Link>
      )}
    </aside>
  );
}

export function OrderTracker({ stage = 1 }) {
  const nodes = ['Confirmed', 'In Atelier', 'Dispatched', 'Out for Delivery', 'Delivered'];
  return (
    <div className="order-timeline">
      {nodes.map((label, i) => {
        const isDone = i < stage;
        const isCurrent = i === stage;
        return (
          <div
            key={label}
            className={`timeline-node${isDone ? ' is-done' : ''}${isCurrent ? ' is-current' : ''}`}
          >
            <span className="timeline-dot" />
            <span className="timeline-title">{label}</span>
          </div>
        );
      })}
    </div>
  );
}
