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
  { id: 'login', label: '01 // IDENTITY', to: '/checkout/login' },
  { id: 'shipping', label: '02 // DISPATCH', to: '/checkout/shipping' },
  { id: 'payment', label: '03 // SETTLEMENT', to: '/checkout/payment' },
  { id: 'review', label: '04 // VERIFY & COMMIT', to: '/checkout/review' }
];

export function CheckoutSteps({ current }) {
  const index = CHECKOUT_STEPS.findIndex((s) => s.id === current);
  return (
    <nav className="checkout-steps" aria-label="Checkout Progress" style={{ background: 'var(--color-paper-light)', border: '1px solid var(--line)', borderRadius: 'var(--r-xs)', padding: '12px 20px', marginBottom: '32px' }}>
      {CHECKOUT_STEPS.map((step, i) => {
        const isDone = i < index;
        const isCurrent = i === index;
        return (
          <div
            key={step.id}
            className={`checkout-step${isCurrent ? ' is-active' : ''}${isDone ? ' is-done' : ''}`}
            style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', letterSpacing: '0.06em' }}
          >
            {isDone ? (
              <Link to={step.to} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-terminal-green-text)', fontWeight: 700 }}>
                <span>[✓]</span>
                <span>{step.label}</span>
              </Link>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isCurrent ? 'var(--pearl)' : 'var(--pearl-4)', fontWeight: isCurrent ? 700 : 500 }}>
                {isCurrent && <span style={{ color: 'var(--color-terminal-green-text)' }}>&gt;</span>}
                <span>{step.label}</span>
              </span>
            )}
            {i < CHECKOUT_STEPS.length - 1 && <span style={{ opacity: 0.3, margin: '0 10px' }}>&middot;&middot;&middot;</span>}
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
    <aside style={{ background: 'var(--color-paper)', border: '1px solid var(--line-dark)', borderRadius: 'var(--r-sm)', padding: '22px' }}>
      <div className="between" style={{ marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid var(--line)' }}>
        <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-terminal-green-text)', fontWeight: 700, letterSpacing: '0.06em' }}>
          // TRANSACTION LEDGER ({totals.count} {totals.count === 1 ? 'SPECIMEN' : 'SPECIMENS'})
        </h3>
        {editable && (
          <Link to="/cart" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--pearl-3)', textDecoration: 'underline' }}>
            [ EDIT QUEUE ]
          </Link>
        )}
      </div>

      {/* Cart Items List */}
      <div style={{ display: 'grid', gap: '12px', marginBottom: '18px' }}>
        {cart.map((line) => (
          <div key={line.key} style={{ display: 'grid', gridTemplateColumns: '48px 1fr auto', gap: '12px', alignItems: 'center', borderBottom: '1px solid var(--line)', paddingBottom: '10px' }}>
            <div style={{ aspectRatio: '1/1', overflow: 'hidden', borderRadius: 'var(--r-xs)', background: 'var(--color-paper-light)', border: '1px solid var(--line)' }}>
              <ProductArt
                id={line.product.id}
                shape={line.product.shape}
                palette={paletteForVariant(line.product, line.variant)}
                label={line.product.name}
              />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-grotesk)', fontSize: '0.88rem', fontWeight: 700, color: 'var(--pearl)', lineHeight: 1.2 }}>
                {dx(line.product.name)}
              </div>
              <div className="tiny" style={{ fontFamily: 'var(--font-mono)', color: 'var(--pearl-3)', marginTop: '2px' }}>
                {[line.variant, line.size].filter(Boolean).map(dx).join(' · ').toUpperCase()} &times; {line.qty}
              </div>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem', fontWeight: 700 }}>
              {money(line.lineTotal)}
            </div>
          </div>
        ))}
      </div>

      {/* Promo Form */}
      {showPromo && (
        <div style={{ marginBottom: '16px', paddingTop: '10px' }}>
          {checkout.promo ? (
            <div className="between" style={{ padding: '6px 10px', background: 'var(--color-terminal-green-dim)', border: '1px solid var(--line-green)', borderRadius: 'var(--r-xs)' }}>
              <span className="tiny" style={{ color: 'var(--color-terminal-green-text)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>[ {checkout.promo.code} APPLIED ]</span>
              <button type="button" className="tiny" onClick={clearPromo} style={{ color: 'var(--error)', fontFamily: 'var(--font-mono)' }}>[ REMOVE ]</button>
            </div>
          ) : (
            <form onSubmit={submitPromo} style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder="PROMO CODE >"
                style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', background: 'var(--color-paper-light)', border: '1px solid var(--line)', borderRadius: 'var(--r-xs)', flex: 1, textTransform: 'uppercase' }}
              />
              <button type="submit" className="btn btn--sm btn--gold" disabled={busy}>
                APPLY
              </button>
            </form>
          )}
        </div>
      )}

      {/* Price Breakdown with dotted leaders */}
      <div style={{ paddingTop: '10px', borderTop: '1px solid var(--line)' }}>
        <div className="console-summary-row">
          <span>SUBTOTAL</span>
          <span className="console-dots" />
          <span>{money(totals.subtotal)}</span>
        </div>
        {totals.discount > 0 && (
          <div className="console-summary-row" style={{ color: 'var(--color-terminal-green-text)' }}>
            <span>PROMO [{dx(checkout.promo?.label || 'DISCOUNT')}]</span>
            <span className="console-dots" />
            <span>&minus;{money(totals.discount)}</span>
          </div>
        )}
        <div className="console-summary-row">
          <span>INSURED DISPATCH</span>
          <span className="console-dots" />
          <span>{totals.shipping ? money(totals.shipping) : 'COMPLIMENTARY'}</span>
        </div>
        <div className="console-summary-row">
          <span>GST / STATUTORY DUTIES</span>
          <span className="console-dots" />
          <span>{money(totals.tax)}</span>
        </div>
        <div className="console-total-row">
          <span>COMMIT TOTAL</span>
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
