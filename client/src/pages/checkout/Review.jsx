/* =============================================================
   AURELIS - CHECKOUT · REVIEW & PLACE ORDER
   ============================================================= */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Breadcrumbs, Check, Empty, Glass, Icon, PageHead, ProductArt, Sheen
} from '../../components/primitives';
import { CheckoutSteps, OrderSummary } from '../../components/checkout';
import { useStore } from '../../context/StoreContext';
import { useAsync } from '../../lib/useAsync';
import api from '../../lib/api';
import { dx, money, paletteForVariant } from '../../lib/format';

export default function CheckoutReview() {
  const { session, content, placeOrder, busy } = useStore();
  const navigate = useNavigate();
  const [accept, setAccept] = useState(false);
  const [error, setError] = useState(null);
  const [placing, setPlacing] = useState(false);

  const stores = useAsync(() => api.stores(), []);
  const { checkout, cart, totals, addresses, cards, user } = session;

  if (cart.length === 0 && !placing) {
    return (
      <div className="shell section">
        <Empty icon="lock" title="Nothing to check out"
          body="Your bag is empty, so there is nothing to carry through checkout."
          cta={{ to: '/categories', label: 'Explore collections' }} />
      </div>
    );
  }

  const method = (content?.shippingMethods || []).find((m) => m.id === checkout.method);
  const payMethod = (content?.paymentMethods || []).find((m) => m.id === checkout.payment);
  const address = addresses.find((a) => a.id === checkout.shipTo);
  const card = cards.find((c) => c.id === checkout.cardId) || cards.find((c) => c.isDefault);
  const pickup = (stores.data?.items || []).find((s) => s.id === checkout.pickupStore);
  const isPickup = checkout.method === 'pick';

  const submit = async () => {
    if (!accept) { setError('Please accept the Terms of Sale to place the order.'); return; }
    setError(null);
    setPlacing(true);
    const res = await placeOrder();
    if (res.ok) navigate(`/order/confirmation/${res.order.id}`, { state: { order: res.order } });
    else { setPlacing(false); setError(res.error); }
  };

  return (
    <div className="shell">
      <Breadcrumbs trail={[{ label: 'Home', to: '/' }, { label: 'Bag', to: '/cart' }, { label: 'Review' }]} />

      <PageHead
        kicker="Step four of four"
        title="One last look"
        lede="Nothing is charged until you place the order. After that, we can still change or cancel it until the piece reaches the finishing bench."
      />

      <section className="section" style={{ paddingTop: 0 }}>
        <CheckoutSteps current="review" />

        <div className="split">
          <div>
            {/* ---------- contact ---------- */}
            <Glass variant="glass--pane" className="co-review-block">
              <div className="co-review-block__head">
                <h5>Contact</h5>
                <Link className="link" to="/checkout/login">Change</Link>
              </div>
              <p style={{ color: 'var(--pearl)' }}>{checkout.email || user?.email || '—'}</p>
              <p className="tiny" style={{ textTransform: 'none', letterSpacing: '.03em', marginTop: '.3rem' }}>
                {user ? `${dx(user.first)} ${dx(user.last)} · ${user.tier}` : 'Guest checkout'}
              </p>
            </Glass>

            {/* ---------- delivery ---------- */}
            <Glass variant="glass--pane" className="co-review-block">
              <div className="co-review-block__head">
                <h5>{isPickup ? 'Collection' : 'Delivery'}</h5>
                <Link className="link" to="/checkout/shipping">Change</Link>
              </div>
              {isPickup ? (
                <>
                  <p style={{ color: 'var(--pearl)' }}>{dx(pickup?.name || 'Geneva')}</p>
                  <p className="muted" style={{ fontSize: '.86rem', marginTop: '.3rem' }}>
                    {(pickup?.address || []).map(dx).join(', ')}
                  </p>
                </>
              ) : address ? (
                <>
                  <p style={{ color: 'var(--pearl)' }}>{dx(address.first)} {dx(address.last)}</p>
                  <p className="muted" style={{ fontSize: '.86rem', marginTop: '.3rem' }}>
                    {[address.line1, address.line2, address.city, address.region, address.post, address.country]
                      .filter(Boolean).map(dx).join(', ')}
                  </p>
                  {address.phone && <p className="tiny" style={{ marginTop: '.3rem', textTransform: 'none' }}>{dx(address.phone)}</p>}
                </>
              ) : (
                <p className="muted">No address chosen.</p>
              )}
              <div className="center wrap" style={{ marginTop: '.9rem', gap: '.6rem' }}>
                <span className="badge"><Icon name="truck" size={12} /> {dx(method?.name || 'Signature Delivery')}</span>
                <span className="badge badge--quiet">{dx(method?.eta || '')}</span>
                <span className="badge badge--quiet">{method?.price ? money(method.price) : 'Complimentary'}</span>
              </div>
            </Glass>

            {/* ---------- payment ---------- */}
            <Glass variant="glass--pane" className="co-review-block">
              <div className="co-review-block__head">
                <h5>Payment</h5>
                <Link className="link" to="/checkout/payment">Change</Link>
              </div>
              {checkout.payment === 'card' && card ? (
                <div className="between wrap" style={{ gap: '1.4rem' }}>
                  <div>
                    <p style={{ color: 'var(--pearl)' }}>{card.brand} ···· {card.last4}</p>
                    <p className="tiny" style={{ marginTop: '.3rem', textTransform: 'none' }}>
                      {card.name} · expires {card.exp}
                    </p>
                  </div>
                  <Glass variant="glass--frost" className="cardface" style={{ maxWidth: 220 }}>
                    <div className="between">
                      <span className="keycard__chip" style={{ width: 30, height: 22 }} />
                      <span className="tiny" style={{ color: 'var(--pearl-2)' }}>{card.brand}</span>
                    </div>
                    <div className="cardface__no" style={{ fontSize: '.92rem' }}>···· ···· ···· {card.last4}</div>
                  </Glass>
                </div>
              ) : (
                <p style={{ color: 'var(--pearl)' }}>{dx(payMethod?.name || 'Card')}</p>
              )}
              <p className="tiny" style={{ marginTop: '.6rem', textTransform: 'none', letterSpacing: '.03em' }}>
                Billing address {checkout.billingSame ? 'matches the delivery address' : 'set separately'}.
              </p>
            </Glass>

            {/* ---------- items ---------- */}
            <Glass variant="glass--pane" className="co-review-block">
              <div className="co-review-block__head">
                <h5>{totals.count} {totals.count === 1 ? 'piece' : 'pieces'}</h5>
                <Link className="link" to="/cart">Edit bag</Link>
              </div>
              {cart.map((line) => (
                <div className="cart-line" key={line.key} style={{ gridTemplateColumns: '84px 1fr auto' }}>
                  <div className="cart-line__media">
                    <ProductArt
                      id={line.product.id}
                    shape={line.product.shape}
                      palette={paletteForVariant(line.product, line.variant)}
                      label={line.product.name}
                    />
                  </div>
                  <div>
                    <div className="h4">{dx(line.product.name)}</div>
                    <div className="tiny" style={{ marginTop: '.35rem', textTransform: 'none', letterSpacing: '.03em' }}>
                      {[line.variant, line.size].filter(Boolean).map(dx).join(' · ')} · Quantity {line.qty}
                    </div>
                  </div>
                  <div className="card__price">{money(line.lineTotal)}</div>
                </div>
              ))}

              {(checkout.gift || checkout.engraving) && (
                <div className="center wrap" style={{ marginTop: '1.2rem', gap: '.6rem' }}>
                  {checkout.gift && <span className="badge"><Icon name="gift" size={12} /> Gift presentation</span>}
                  {checkout.engraving && <span className="badge">Engraved “{checkout.engraving}”</span>}
                </div>
              )}
              {checkout.gift && checkout.giftNote && (
                <p className="muted" style={{ marginTop: '.8rem', fontStyle: 'italic', fontSize: '.88rem' }}>
                  “{checkout.giftNote}”
                </p>
              )}
            </Glass>

            {/* ---------- place ---------- */}
            <Glass variant="glass--gold" className="panel" style={{ marginTop: '1.4rem' }}>
              <Check
                label="I accept the Terms of Sale and confirm the details above"
                checked={accept}
                onChange={(e) => { setAccept(e.target.checked); setError(null); }}
              />
              {error && <p className="field__err" style={{ display: 'block', marginTop: '.8rem' }}>{error}</p>}

              <div className="between wrap" style={{ marginTop: '1.4rem', gap: '1rem' }}>
                <div>
                  <span className="tiny">Total to pay</span>
                  <div className="h2" style={{ marginTop: '.2rem' }}>{money(totals.total)}</div>
                  {checkout.payment === 'split' && (
                    <span className="tiny gold">or 12 × {money(Math.round(totals.total / 12))} at 0%</span>
                  )}
                </div>
                <button className="btn btn--gold btn--lg" type="button" onClick={submit} disabled={busy || placing}>
                  <Sheen />{placing ? 'Placing…' : 'Place order'}
                </button>
              </div>

              <p className="tiny" style={{ marginTop: '1.1rem', textTransform: 'none', letterSpacing: '.03em' }}>
                By placing this order you agree to our{' '}
                <Link className="link-gold" to="/legal">Terms of Sale</Link> and{' '}
                <Link className="link-gold" to="/legal#privacy">Privacy Policy</Link>. An order becomes binding when we
                issue a confirmation number.
              </p>
            </Glass>

            <Link className="btn btn--quiet" style={{ marginTop: '1.4rem' }} to="/checkout/payment">← Back to payment</Link>
          </div>

          <OrderSummary showPromo={false} />
        </div>
      </section>
    </div>
  );
}
