/* =============================================================
   AURELIS MAISON — SHOPPING BAG
   High-fashion bag review, quantity controls, save for later,
   bespoke atelier gift packaging, complimentary micro-engraving,
   privilege code validation, and white-glove checkout.
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
                kicker="Curated Masterworks"
                title="Iconic Creations"
                body="Handcrafted creations finished in the Geneva atelier."
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
      <Breadcrumbs trail={[{ label: 'Home', to: '/' }, { label: 'Shopping Bag' }]} />

      <PageHead
        kicker="Maison Bag"
        title={`Your Selection (${totals.count} ${totals.count === 1 ? 'Creation' : 'Creations'})`}
        lede="Pieces remain reserved in your bag across sessions. Complimentary white-glove delivery, bespoke packaging, and signature authentication accompany every acquisition."
        aside={
          <button type="button" className="btn btn--sm btn--outline" onClick={emptyCart} disabled={busy}>
            Clear Bag
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
                    gridTemplateColumns: '110px 1fr auto',
                    gap: '24px',
                    padding: '24px',
                    background: '#FFFFFF',
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--r-md)',
                    boxShadow: 'var(--sh-1)',
                    alignItems: 'center'
                  }}
                >
                  <Link
                    to={`/product/${line.id}`}
                    style={{
                      aspectRatio: '1 / 1',
                      overflow: 'hidden',
                      borderRadius: 'var(--r-sm)',
                      background: 'radial-gradient(circle at center, #FFFFFF 40%, #F5F2EB 100%)',
                      border: '1px solid var(--line)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '12px'
                    }}
                  >
                    <ProductArt
                      id={line.product.id}
                      shape={line.product.shape}
                      palette={paletteForVariant(line.product, line.variant)}
                      label={line.product.name}
                    />
                  </Link>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--gold-text)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      {catName(line.product.cat)} &middot; REF AUR-{line.product.id.toUpperCase()}
                    </span>
                    <Link
                      to={`/product/${line.id}`}
                      style={{
                        fontFamily: 'var(--font-serif)',
                        fontSize: '1.25rem',
                        fontWeight: 500,
                        color: 'var(--pearl)',
                        textDecoration: 'none',
                        lineHeight: 1.2
                      }}
                    >
                      {dx(line.product.name)}
                    </Link>
                    <div style={{ fontSize: '0.82rem', color: 'var(--pearl-3)' }}>
                      {[line.variant, line.size].filter(Boolean).map(dx).join(' &middot; ') || dx(line.product.materials)}
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
                        onClick={() => removeLine(line.key)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--pearl-3)',
                          fontSize: '0.76rem',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          padding: 0
                        }}
                      >
                        Remove
                      </button>
                      <button
                        type="button"
                        onClick={() => saveForLater(line.key)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--gold-text)',
                          fontSize: '0.76rem',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          padding: 0
                        }}
                      >
                        Save for Later
                      </button>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--pearl)' }}>
                      {money(line.lineTotal)}
                    </div>
                    {line.qty > 1 && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--pearl-3)', marginTop: '4px' }}>
                        {money(line.unitPrice)} each
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Customization & Gift Options */}
            <div
              style={{
                marginTop: '32px',
                padding: '28px',
                background: '#FFFFFF',
                border: '1px solid var(--line)',
                borderRadius: 'var(--r-md)',
                boxShadow: 'var(--sh-1)'
              }}
            >
              <div className="between" style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--line)' }}>
                <span className="eyebrow" style={{ color: 'var(--gold-text)' }}>
                  Complimentary Atelier Services
                </span>
                <span className="badge badge--gold">Included</span>
              </div>

              <Check
                label="Complimentary Presentation Gift Packaging & Custom Handwritten Note Card"
                checked={checkout.gift}
                onChange={(e) => patchCheckout({ gift: e.target.checked })}
              />

              {checkout.gift && (
                <div style={{ marginTop: '16px' }}>
                  <Field
                    label="Personal Inscription Message (Handwritten on Atelier Parchment)"
                    name="giftNote"
                    type="textarea"
                    value={checkout.giftNote}
                    onChange={(e) => patchCheckout({ giftNote: e.target.value })}
                    placeholder="Write your personal message to accompany this acquisition..."
                    maxLength={240}
                  />
                </div>
              )}

              {totals.engravingUnlocked && (
                <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--line)' }}>
                  <Field
                    label="Complimentary Atelier Micro-Engraving (Max 16 Characters)"
                    name="engraving"
                    value={checkout.engraving}
                    onChange={(e) => patchCheckout({ engraving: e.target.value })}
                    placeholder="e.g. AURELIS 1911"
                    hint="Complimentary honour bestowed on all acquisitions meeting the privileged threshold."
                    maxLength={16}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Order Summary */}
          <div style={{ position: 'sticky', top: '96px' }}>
            <div
              style={{
                background: '#FFFFFF',
                padding: '28px',
                border: '1px solid var(--line)',
                borderRadius: 'var(--r-md)',
                boxShadow: 'var(--sh-2)'
              }}
            >
              <div className="between" style={{ borderBottom: '1px solid var(--line)', paddingBottom: '14px', marginBottom: '20px' }}>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', fontWeight: 500, margin: 0, color: 'var(--pearl)' }}>
                  Order Summary
                </h3>
                <span className="badge badge--quiet" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Icon name="lock" size={12} /> Secure
                </span>
              </div>

              <div>
                <div className="luxury-summary-row">
                  <span>Subtotal</span>
                  <span>{money(totals.subtotal)}</span>
                </div>
                {totals.discount > 0 && (
                  <div className="luxury-summary-row" style={{ color: 'var(--gold-text)' }}>
                    <span>Privilege Code [{dx(checkout.promo?.label || 'DISCOUNT')}]</span>
                    <span>&minus;{money(totals.discount)}</span>
                  </div>
                )}
                <div className="luxury-summary-row">
                  <span>Complimentary Insured Delivery</span>
                  <span style={{ color: 'var(--success)' }}>
                    {totals.shipping ? money(totals.shipping) : 'Complimentary'}
                  </span>
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

              {/* Promo Code Input */}
              <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--line)' }}>
                {checkout.promo ? (
                  <div className="between" style={{ padding: '10px 14px', background: 'var(--color-paper-light)', border: '1px solid var(--gold)', borderRadius: 'var(--r-sm)' }}>
                    <span style={{ color: 'var(--gold-text)', fontSize: '0.82rem', fontWeight: 600 }}>
                      Privilege Code [{checkout.promo.code}] Applied
                    </span>
                    <button type="button" onClick={clearPromo} style={{ color: 'var(--error)', background: 'none', border: 'none', fontSize: '0.78rem', cursor: 'pointer', textDecoration: 'underline' }}>
                      Remove
                    </button>
                  </div>
                ) : (
                  <form onSubmit={submitPromo} style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value)}
                      placeholder="Privilege or promo code"
                      style={{
                        textTransform: 'uppercase',
                        fontFamily: 'var(--font-sans)',
                        fontSize: '0.84rem',
                        background: '#FFFFFF',
                        border: '1px solid var(--line-control)',
                        padding: '10px 14px',
                        borderRadius: 'var(--r-pill)',
                        flex: 1
                      }}
                    />
                    <button type="submit" className="btn btn--sm btn--gold">
                      Apply
                    </button>
                  </form>
                )}
              </div>

              {/* Checkout Trigger CTA */}
              <div style={{ marginTop: '28px' }}>
                <Link className="btn btn--gold btn--block" to="/checkout/login" style={{ padding: '16px', fontSize: '0.92rem', letterSpacing: '0.04em' }}>
                  Proceed to Concierge Checkout &rarr;
                </Link>

                <div style={{ display: 'grid', gap: '8px', marginTop: '20px', fontSize: '0.76rem', color: 'var(--pearl-3)' }}>
                  <div className="center" style={{ gap: '8px' }}>
                    <Icon name="truck" size={14} />
                    <span>Complimentary White-Glove Delivery across India</span>
                  </div>
                  <div className="center" style={{ gap: '8px' }}>
                    <Icon name="shield" size={14} />
                    <span>Certificate of Authenticity &amp; Lifetime Warranty</span>
                  </div>
                  <div className="center" style={{ gap: '8px' }}>
                    <Icon name="refresh" size={14} />
                    <span>30-Day Complimentary Returns &amp; Exchanges</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
