/* =============================================================
   AURELIS MAISON // EDITORIAL LUXURY MINI CART
   Global slide-over shopping bag with real-time sync,
   quantity controls, complimentary engraving progress, and checkout.
   ============================================================= */
import { Link } from 'react-router-dom';
import { Icon, ProductArt, QtyControl } from './primitives';
import { useStore } from '../context/StoreContext';
import { dx, money, paletteForVariant } from '../lib/format';

export default function MiniCart() {
  const { session, layer, closeLayer, setLineQty, removeLine, saveForLater, busy } = useStore();
  const open = layer === 'cart';
  const { cart, totals } = session;
  const threshold = totals.engravingThreshold || 400000;
  const pct = Math.min(100, (totals.subtotal / threshold) * 100);

  return (
    <aside
      className={`drawer drawer--cart${open ? ' is-open' : ''}`}
      aria-label="Shopping Bag"
      aria-hidden={!open}
    >
      {/* Drawer Head */}
      <div className="drawer__head">
        <div>
          <span className="eyebrow" style={{ margin: 0 }}>Maison Shopping Bag</span>
          <h3 className="h3" style={{ fontSize: '1.25rem', marginTop: '2px' }}>
            {totals.count} {totals.count === 1 ? 'Creation' : 'Creations'}
          </h3>
        </div>
        <button
          type="button"
          onClick={closeLayer}
          className="btn--ghost"
          style={{ padding: '6px 12px', fontSize: '1.1rem' }}
          aria-label="Close bag"
        >
          &times;
        </button>
      </div>

      {/* Drawer Body */}
      <div className="drawer__body">
        {cart.length === 0 ? (
          <div className="empty" style={{ padding: '64px 20px', textAlign: 'center' }}>
            <div style={{ color: 'var(--gold-text)', marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
              <Icon name="bag" size={36} />
            </div>
            <h3 className="h3" style={{ fontSize: '1.3rem' }}>Your Bag is Empty</h3>
            <p style={{ maxWidth: '34ch', margin: '12px auto 24px', fontSize: '0.9rem', color: 'var(--pearl-3)', lineHeight: 1.6 }}>
              You have not added any creations from the atelier to your bag yet.
            </p>
            <Link className="btn btn--primary" to="/categories" onClick={closeLayer}>
              Discover Collections
            </Link>
          </div>
        ) : (
          <>
            {/* Complimentary Inscription Milestone */}
            <div style={{ background: '#FFFFFF', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '14px 16px', marginBottom: '20px' }}>
              <div className="between" style={{ gap: '10px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--gold-text)' }}>
                  {totals.engravingUnlocked
                    ? 'Complimentary Inscription Unlocked'
                    : `Add ${money(totals.engravingRemaining)} for complimentary bespoke inscription`}
                </span>
                {totals.engravingUnlocked && (
                  <span style={{ color: 'var(--gold-text)', display: 'flex' }}>
                    <Icon name="check" size={16} />
                  </span>
                )}
              </div>
              <div style={{ height: '4px', background: 'rgba(0,0,0,0.06)', borderRadius: '2px', marginTop: '8px', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: 'var(--gold)', transition: 'width 0.3s ease' }} />
              </div>
            </div>

            {/* Cart Items List */}
            {cart.map((line) => (
              <div key={line.key} style={{ display: 'grid', gridTemplateColumns: '76px 1fr', gap: '16px', padding: '16px 0', borderBottom: '1px solid var(--line)' }}>
                <Link to={`/product/${line.id}`} onClick={closeLayer} style={{ aspectRatio: '1/1', background: 'var(--color-bone)', borderRadius: 'var(--r-sm)', overflow: 'hidden', display: 'block' }}>
                  <ProductArt
                    id={line.product.id}
                    shape={line.product.shape}
                    palette={paletteForVariant(line.product, line.variant)}
                    label={line.product.name}
                  />
                </Link>

                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Link to={`/product/${line.id}`} onClick={closeLayer} style={{ textDecoration: 'none', color: 'var(--pearl)', fontFamily: 'var(--font-serif)', fontSize: '1.05rem', fontWeight: 500 }}>
                        {dx(line.product.name)}
                      </Link>
                      <button
                        type="button"
                        onClick={() => removeLine(line.key)}
                        disabled={busy}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pearl-4)', fontSize: '1rem', padding: '0 4px' }}
                        aria-label="Remove item"
                      >
                        &times;
                      </button>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: 'var(--pearl-3)', marginTop: '2px' }}>
                      {[line.variant, line.size].filter(Boolean).join(' · ')}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                    <QtyControl
                      qty={line.qty}
                      onChange={(q) => setLineQty(line.key, q)}
                      small
                      disabled={busy}
                    />
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--pearl)' }}>
                      {money(line.price * line.qty)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Drawer Footer */}
      {cart.length > 0 && (
        <div className="drawer__foot" style={{ padding: '24px', borderTop: '1px solid var(--line)', background: '#FFFFFF' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--pearl-2)' }}>Estimated Subtotal</span>
            <span style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--pearl)' }}>
              {money(totals.subtotal)}
            </span>
          </div>

          <p style={{ fontSize: '0.76rem', color: 'var(--pearl-3)', margin: '0 0 18px', lineHeight: 1.5 }}>
            Complimentary insured white-glove courier delivery and taxes calculated at checkout.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Link
              className="btn btn--gold"
              to="/checkout/login"
              onClick={closeLayer}
              style={{ width: '100%' }}
            >
              Proceed to Checkout
            </Link>

            <Link
              className="btn btn--outline"
              to="/cart"
              onClick={closeLayer}
              style={{ width: '100%' }}
            >
              View Full Bag
            </Link>
          </div>
        </div>
      )}
    </aside>
  );
}
