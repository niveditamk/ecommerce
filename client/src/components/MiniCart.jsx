/* =============================================================
   AURELIS MAISON — MINI CART (Global Slide-Over Bag Drawer)
   Real-time inventory sync, quantity controls, line removal,
   complimentary delivery progress, and direct checkout trigger.
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
      aria-label="Transaction console"
      aria-hidden={!open}
    >
      {/* Header */}
      <div className="drawer__head">
        <div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--color-terminal-green-text)', fontWeight: 700, letterSpacing: '0.08em', display: 'block' }}>
            // TRANSACTION CONSOLE · LEDGER ACTIVE
          </span>
          <div style={{ marginTop: '2px', fontFamily: 'var(--font-grotesk)', fontWeight: 700, fontSize: '1.1rem', textTransform: 'uppercase' }}>
            [ {totals.count} {totals.count === 1 ? 'SPECIMEN' : 'SPECIMENS'} COMMITTED ]
          </div>
        </div>
        <button
          type="button"
          onClick={closeLayer}
          style={{ background: 'transparent', border: 'none', color: 'var(--pearl-3)', fontFamily: 'var(--font-mono)', fontSize: '0.68rem', cursor: 'pointer', padding: '4px 6px' }}
          aria-label="Close transaction console"
        >
          [ ESC // CLOSE ]
        </button>
      </div>

      {/* Body */}
      <div className="drawer__body">
        {cart.length === 0 ? (
          <div className="empty" style={{ padding: '48px 16px', textAlign: 'center' }}>
            <div style={{ color: 'var(--color-terminal-green-text)', marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
              <Icon name="bag" size={32} />
            </div>
            <h3 style={{ fontFamily: 'var(--font-grotesk)', fontWeight: 700, textTransform: 'uppercase', fontSize: '1.1rem' }}>TRANSACTION LEDGER EMPTY</h3>
            <p className="muted" style={{ maxWidth: '34ch', margin: '10px auto 24px', fontSize: '13px', fontFamily: 'var(--font-mono)' }}>
              Awaiting specimen allocation. Selected specimens are committed to escrow during checkout verification.
            </p>
            <Link className="btn btn--sm btn--gold" to="/categories" onClick={closeLayer}>
              EXPLORE CATALOGUE [ 01 &rarr; 04 ]
            </Link>
          </div>
        ) : (
          <>
            {/* Complimentary Engraving / Delivery Indicator */}
            <div className="mc-progress" style={{ background: 'var(--color-paper-light)', border: '1px solid var(--line)', borderRadius: 'var(--r-xs)', padding: '10px 14px' }}>
              <div className="between" style={{ gap: '10px' }}>
                <span className="tiny" style={{ letterSpacing: '0.06em', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-terminal-green-text)', fontSize: '0.68rem' }}>
                  {totals.engravingUnlocked
                    ? '[ ENGRAVING PROTOCOL: UNLOCKED ]'
                    : `ALLOCATE ${money(totals.engravingRemaining)} FOR BESPOKE ENGRAVING`}
                </span>
                {totals.engravingUnlocked && (
                  <span style={{ color: 'var(--color-terminal-green-text)', display: 'flex' }}>
                    <Icon name="check" size={14} />
                  </span>
                )}
              </div>
              <div className="mc-progress__bar" style={{ height: '4px', background: 'rgba(0,0,0,0.08)', marginTop: '8px' }}>
                <div className="mc-progress__fill" style={{ width: `${pct}%`, background: 'var(--color-terminal-green)' }} />
              </div>
            </div>

            {/* Cart Items List */}
            {cart.map((line) => (
              <div className="mc-item" key={line.key} style={{ borderBottom: '1px solid var(--line)', padding: '14px 0' }}>
                <Link className="mc-item__media" to={`/product/${line.id}`} onClick={closeLayer} style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-xs)', background: 'var(--color-paper-light)' }}>
                  <ProductArt
                    id={line.product.id}
                    shape={line.product.shape}
                    palette={paletteForVariant(line.product, line.variant)}
                    label={line.product.name}
                  />
                </Link>

                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--color-terminal-green-text)', fontWeight: 700, display: 'block' }}>
                      REF // AUR-{line.product.id.toUpperCase()}
                    </span>
                    <Link className="mc-item__name" to={`/product/${line.id}`} onClick={closeLayer} style={{ fontFamily: 'var(--font-grotesk)', fontWeight: 700, fontSize: '0.95rem' }}>
                      {dx(line.product.name)}
                    </Link>
                    <div className="mc-item__meta" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--pearl-3)', marginTop: '2px' }}>
                      {[line.variant, line.size].filter(Boolean).map(dx).join(' · ').toUpperCase() || dx(line.product.materials)}
                    </div>
                  </div>

                  <div className="mc-item__ctrl" style={{ marginTop: '8px' }}>
                    <QtyControl
                      qty={line.qty}
                      small
                      disabled={busy}
                      onChange={(q) => setLineQty(line.key, q)}
                    />
                    <button
                      type="button"
                      className="mc-remove"
                      onClick={() => removeLine(line.key)}
                      aria-label="Remove item"
                      style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem' }}
                    >
                      [ REMOVE ]
                    </button>
                    {saveForLater && (
                      <button
                        type="button"
                        className="mc-remove"
                        onClick={() => saveForLater(line.key)}
                        aria-label="Save for later"
                        style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem' }}
                      >
                        [ HOLD ]
                      </button>
                    )}
                  </div>
                </div>

                <div className="mc-item__price" style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.95rem' }}>
                  {money(line.lineTotal)}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Footer */}
      {cart.length > 0 && (
        <div className="drawer__foot" style={{ background: 'var(--color-paper-light)', borderTop: '1px solid var(--line-dark)', padding: '18px 20px' }}>
          <div>
            <div className="console-summary-row">
              <span>SUBTOTAL</span>
              <span className="console-dots" />
              <span>{money(totals.subtotal)}</span>
            </div>
            {totals.discount > 0 && (
              <div className="console-summary-row" style={{ color: 'var(--color-terminal-green-text)' }}>
                <span>PROMO [{dx(session.checkout.promo?.label || 'DISCOUNT')}]</span>
                <span className="console-dots" />
                <span>&minus;{money(totals.discount)}</span>
              </div>
            )}
            <div className="console-summary-row">
              <span>INSURED ESCROW LOGISTICS</span>
              <span className="console-dots" />
              <span>{totals.shipping ? money(totals.shipping) : 'COMPLIMENTARY'}</span>
            </div>
            <div className="console-total-row">
              <span>ESTIMATED TOTAL</span>
              <span>{money(totals.total)}</span>
            </div>
          </div>

          <p className="tiny" style={{ marginTop: '10px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--pearl-3)' }}>
            DUTIES, ASSAY TAX &amp; 256-BIT ESCROW SECURITY INCLUDED.
          </p>

          <div style={{ display: 'grid', gap: '8px', marginTop: '14px' }}>
            <Link
              className="btn btn--block btn--gold"
              to="/checkout/login"
              onClick={closeLayer}
            >
              INITIALIZE CHECKOUT PROTOCOL &rarr;
            </Link>
            <Link
              className="btn btn--block btn--outline btn--sm"
              to="/cart"
              onClick={closeLayer}
            >
              AUDIT FULL TRANSACTION LEDGER
            </Link>
          </div>
        </div>
      )}
    </aside>
  );
}
