/* =============================================================
   AURELIS MAISON — BAG / CART PAGE
   Full page shopping bag review, quantity adjustments,
   line removal, save for later, gift options, complimentary
   engraving custom text, promo code validation, and checkout CTA.
   ============================================================= */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumbs, Check, Empty, Field, Icon, PageHead, ProductArt, QtyControl, SectionHead } from '../components/primitives';
import { ProductGrid } from '../components/ProductCard';
import { useStore } from '../context/StoreContext';
import { useAsync } from '../lib/useAsync';
import api from '../lib/api';
import { dx, money, paletteForVariant } from '../lib/format';

export default function Cart() {
  const {
    session, categories, setLineQty, removeLine, saveForLater, emptyCart,
    applyPromo, clearPromo, patchCheckout, busy
  } = useStore();
  const { cart, totals, checkout } = session;
  const [promoInput, setPromoInput] = useState('');

  const suggestions = useAsync(() => api.products({ sort: 'rating', perPage: 4 }), []);
  const catName = (slug) => dx(categories.find((c) => c.slug === slug)?.name || '');

  const submitPromo = async (e) => {
    e.preventDefault();
    if (!promoInput.trim()) return;
    const res = await applyPromo(promoInput.trim());
    if (res.ok) setPromoInput('');
  };

  if (cart.length === 0) {
    return (
      <div className="shell">
        <Breadcrumbs trail={[{ label: 'Home', to: '/' }, { label: 'Shopping Bag' }]} />
        <section className="section" style={{ paddingTop: 0 }}>
          <Empty
            icon="bag"
            title="Your Shopping Bag is Empty"
            body="Pieces you discover remain in your bag across sessions. Nothing is reserved from the atelier until checkout is complete."
            cta={{ to: '/categories', label: 'Explore Collections' }}
          />
          {suggestions.data?.items?.length > 0 && (
            <div style={{ marginTop: '64px' }}>
              <SectionHead
                kicker="Collector Favorites"
                title="Curated starting points"
                body="Iconic pieces finished in the Geneva atelier."
              />
              <ProductGrid items={suggestions.data.items} categoryLookup={catName} />
            </div>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="shell">
      <Breadcrumbs trail={[{ label: 'SYS.ROOT', to: '/' }, { label: 'TRANSACTION LEDGER' }]} />

      <PageHead
        kicker="// TRANSACTION LEDGER PROTOCOL · STATUS: PENDING COMMITTAL"
        title={`[ ${totals.count} ${totals.count === 1 ? 'SPECIMEN' : 'SPECIMENS'} COMMITTED ]`}
        lede="Specimens remain held in your active transaction queue. Permanent ledger reservation triggers upon checkout authorization."
        aside={
          <button type="button" className="btn btn--sm btn--outline" onClick={emptyCart} disabled={busy}>
            [ PURGE LEDGER ]
          </button>
        }
      />

      <section className="section" style={{ paddingTop: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '48px', alignItems: 'start' }}>
          {/* Left Column: Cart Lines List */}
          <div>
            <div style={{ display: 'grid', gap: '16px' }}>
              {cart.map((line) => (
                <div
                  key={line.key}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '100px 1fr auto',
                    gap: '20px',
                    padding: '20px',
                    background: 'var(--color-paper)',
                    border: '1px solid var(--line-dark)',
                    borderRadius: 'var(--r-xs)'
                  }}
                >
                  <Link to={`/product/${line.id}`} style={{ aspectRatio: '1/1', overflow: 'hidden', borderRadius: 'var(--r-xs)', background: 'var(--color-paper-light)', border: '1px solid var(--line)' }}>
                    <ProductArt
                      id={line.product.id}
                      shape={line.product.shape}
                      palette={paletteForVariant(line.product, line.variant)}
                      label={line.product.name}
                    />
                  </Link>

                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--color-terminal-green-text)', fontWeight: 700, display: 'block' }}>
                        REF // AUR-{line.product.id.toUpperCase()} · {catName(line.product.cat).toUpperCase()}
                      </span>
                      <Link to={`/product/${line.id}`} style={{ display: 'block', fontFamily: 'var(--font-grotesk)', fontSize: '1.05rem', fontWeight: 700, color: 'var(--pearl)', marginTop: '2px' }}>
                        {dx(line.product.name)}
                      </Link>
                      <div className="tiny" style={{ fontFamily: 'var(--font-mono)', color: 'var(--pearl-3)', marginTop: '4px' }}>
                        {[line.variant, line.size].filter(Boolean).map(dx).join(' · ').toUpperCase() || dx(line.product.materials)}
                      </div>
                    </div>

                    <div className="center" style={{ gap: '16px', marginTop: '12px' }}>
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
                        style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem' }}
                      >
                        [ REMOVE ]
                      </button>
                      <button
                        type="button"
                        className="mc-remove"
                        onClick={() => saveForLater(line.key)}
                        style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem' }}
                      >
                        [ HOLD ]
                      </button>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', fontWeight: 700 }}>
                      {money(line.lineTotal)}
                    </div>
                    {line.qty > 1 && (
                      <div className="tiny" style={{ fontFamily: 'var(--font-mono)', color: 'var(--pearl-3)', marginTop: '4px' }}>
                        {money(line.unitPrice)} each
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Customization & Gift Options */}
            <div style={{ marginTop: '32px', padding: '24px', background: 'var(--color-paper-light)', border: '1px solid var(--line)', borderRadius: 'var(--r-xs)' }}>
              <h4 className="h4" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--color-terminal-green-text)', marginBottom: '16px' }}>
                // BESPOKE PRESENTATION &amp; INSCRIPTION PROTOCOLS
              </h4>

              <Check
                label="Complimentary Presentation Packaging & Custom Serial Inscription Card"
                checked={checkout.gift}
                onChange={(e) => patchCheckout({ gift: e.target.checked })}
              />

              {checkout.gift && (
                <div style={{ marginTop: '12px' }}>
                  <Field
                    label="Personal Inscription Message (Handwritten by Atelier Concierge)"
                    name="giftNote"
                    type="textarea"
                    value={checkout.giftNote}
                    onChange={(e) => patchCheckout({ giftNote: e.target.value })}
                    placeholder="ENTER BESPOKE INSCRIPTION MESSAGE..."
                    maxLength={240}
                  />
                </div>
              )}

              {totals.engravingUnlocked && (
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--line)' }}>
                  <Field
                    label="Bespoke Metal Micro-Engraving (Max 16 Characters)"
                    name="engraving"
                    value={checkout.engraving}
                    onChange={(e) => patchCheckout({ engraving: e.target.value })}
                    placeholder="e.g. AUR-8086-GVA"
                    hint="Complimentary unlocked for orders meeting the threshold."
                    maxLength={16}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Order Summary */}
          <div style={{ position: 'sticky', top: '96px' }}>
            <div style={{ background: 'var(--color-paper)', padding: '24px', border: '1px solid var(--line-dark)', borderRadius: 'var(--r-sm)' }}>
              <div className="between" style={{ borderBottom: '1px solid var(--line)', paddingBottom: '10px', marginBottom: '16px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--color-terminal-green-text)', fontWeight: 700 }}>
                  // TRANSACTION LEDGER SUMMARY
                </span>
                <span className="badge badge--green">[ 256-BIT RSA ]</span>
              </div>

              <div>
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
                  <span>INSURED ESCROW LOGISTICS</span>
                  <span className="console-dots" />
                  <span>{totals.shipping ? money(totals.shipping) : 'COMPLIMENTARY'}</span>
                </div>
                <div className="console-total-row">
                  <span>TRANSACTION TOTAL</span>
                  <span>{money(totals.total)}</span>
                </div>
              </div>

              {/* Promo Code Input */}
              <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--line)' }}>
                {checkout.promo ? (
                  <div className="between" style={{ padding: '8px 12px', background: 'var(--color-terminal-green-dim)', border: '1px solid var(--line-green)', borderRadius: 'var(--r-xs)' }}>
                    <span className="tiny" style={{ color: 'var(--color-terminal-green-text)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                      [ {checkout.promo.code} APPLIED ]
                    </span>
                    <button type="button" className="tiny" onClick={clearPromo} style={{ color: 'var(--error)', fontFamily: 'var(--font-mono)' }}>
                      [ REMOVE ]
                    </button>
                  </div>
                ) : (
                  <form onSubmit={submitPromo} style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value)}
                      placeholder="ENTER PROMO TOKEN..."
                      style={{ textTransform: 'uppercase', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', background: 'var(--color-paper-light)', border: '1px solid var(--line)', padding: '8px 12px', borderRadius: 'var(--r-xs)', flex: 1 }}
                    />
                    <button type="submit" className="btn btn--sm btn--gold">
                      VALIDATE
                    </button>
                  </form>
                )}
              </div>

              {/* Checkout Trigger CTA */}
              <div style={{ marginTop: '24px' }}>
                <Link className="btn btn--gold btn--block" to="/checkout/login" style={{ padding: '14px', fontSize: '0.85rem' }}>
                  INITIALIZE CHECKOUT PROTOCOL &rarr;
                </Link>
                <div className="center" style={{ justifyContent: 'center', gap: '8px', marginTop: '14px', color: 'var(--pearl-3)', fontFamily: 'var(--font-mono)', fontSize: '0.68rem' }}>
                  <Icon name="shield" size={14} />
                  <span>256-BIT ENCRYPTED ESCROW · FULLY INSURED</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
