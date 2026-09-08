/* =============================================================
   AURELIS - CHECKOUT · PAYMENT
   ============================================================= */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Breadcrumbs, Check, Empty, Field, Glass, Icon, PageHead, Sheen
} from '../../components/primitives';
import { CheckoutSteps, OrderSummary } from '../../components/checkout';
import { PaymentModeNotice } from '../../components/DeploymentNotice';
import { useStore } from '../../context/StoreContext';
import { dx, money } from '../../lib/format';

const BLANK_CARD = { number: '', exp: '', cvc: '', name: '', isDefault: false };

function groupCardNumber(v) {
  const digits = v.replace(/\D/g, '').slice(0, 19);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function formatExp(v) {
  const d = v.replace(/\D/g, '').slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)} / ${d.slice(2)}`;
}

export default function CheckoutPayment() {
  const { session, content, patchCheckout, addCard, busy } = useStore();
  const navigate = useNavigate();
  const { checkout, cards, totals } = session;
  const [adding, setAdding] = useState(cards.length === 0);
  const [card, setCard] = useState(BLANK_CARD);
  const [errors, setErrors] = useState({});

  const methods = content?.paymentMethods || [];

  if (session.cart.length === 0) {
    return (
      <div className="shell section">
        <Empty icon="lock" title="Nothing to check out"
          body="Your bag is empty, so there is nothing to carry through checkout."
          cta={{ to: '/categories', label: 'Explore collections' }} />
      </div>
    );
  }

  const saveCard = async (e) => {
    e.preventDefault();
    const errs = {};
    if (card.number.replace(/\D/g, '').length < 13) errs.number = 'Enter the full card number.';
    if (!/^\d{2}\s*\/\s*\d{2}$/.test(card.exp)) errs.exp = 'MM / YY.';
    if (card.cvc.replace(/\D/g, '').length < 3) errs.cvc = '3 or 4 digits.';
    if (!card.name.trim()) errs.name = 'Name as printed on the card.';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const res = await addCard({ number: card.number, exp: card.exp, name: card.name, isDefault: card.isDefault });
    if (res.ok) { setCard(BLANK_CARD); setAdding(false); }
  };

  const proceed = () => {
    if (checkout.payment === 'card' && !checkout.cardId && cards.length === 0) {
      setErrors({ pick: 'Add a card, or choose another way to pay.' });
      return;
    }
    navigate('/checkout/review');
  };

  const splitEligible = totals.total >= (totals.instalmentThreshold || 165000);

  return (
    <div className="shell">
      <Breadcrumbs trail={[{ label: 'Home', to: '/' }, { label: 'Bag', to: '/cart' }, { label: 'Payment' }]} />

      <PageHead
        kicker="Step three of four"
        title="How would you like to settle?"
        lede="Card details are tokenised by our processor. We keep the last four digits so you can recognise a card, and nothing more."
      />

      <section className="section" style={{ paddingTop: 0 }}>
        <CheckoutSteps current="payment" />

        <div className="split">
          <div>
            {/* ---------- method ---------- */}
            <Glass variant="glass--pane" className="panel">
              <div className="panel__head">
                <div>
                  <span className="eyebrow eyebrow--plain">Payment</span>
                  <h2 className="h3" style={{ marginTop: '.4rem' }}>Choose a method</h2>
                </div>
                <span className="badge badge--quiet"><Icon name="lock" size={12} /> Encrypted</span>
              </div>

              <PaymentModeNotice />

              <div style={{ display: 'grid', gap: '.8rem' }}>
                {methods.map((m) => {
                  const blocked = m.id === 'split' && !splitEligible;
                  return (
                    <label
                      className={`opt${checkout.payment === m.id ? ' is-on' : ''}`}
                      key={m.id}
                      style={blocked ? { opacity: 0.42, cursor: 'not-allowed' } : undefined}
                    >
                      <input
                        type="radio"
                        name="payment"
                        className="sr-only"
                        disabled={blocked}
                        checked={checkout.payment === m.id}
                        onChange={() => { patchCheckout({ payment: m.id }); setErrors({}); }}
                      />
                      <span className="gold" style={{ marginTop: '.15rem' }}><Icon name={m.icon} size={20} /></span>
                      <span className="opt__body">
                        <span className="opt__title">{dx(m.name)}</span>
                        <span className="opt__meta">
                          {blocked ? `Available on orders above ${money(totals.instalmentThreshold || 165000)}` : dx(m.note)}
                        </span>
                        {m.id === 'split' && splitEligible && (
                          <span className="opt__meta gold">
                            12 × {money(Math.round(totals.total / 12))} · 0% APR
                          </span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            </Glass>

            {/* ---------- cards ---------- */}
            {checkout.payment === 'card' && (
              <Glass variant="glass--pane" className="panel" style={{ marginTop: '1.4rem' }}>
                <div className="panel__head">
                  <div>
                    <span className="eyebrow eyebrow--plain">Card</span>
                    <h2 className="h3" style={{ marginTop: '.4rem' }}>Which card?</h2>
                  </div>
                  {!adding && (
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => setAdding(true)}>
                      <Sheen /><Icon name="plus" size={14} />New card
                    </button>
                  )}
                </div>

                {cards.length > 0 && (
                  <div style={{ display: 'grid', gap: '.8rem' }}>
                    {cards.map((c) => (
                      <label className={`opt${checkout.cardId === c.id ? ' is-on' : ''}`} key={c.id}>
                        <input
                          type="radio"
                          name="cardId"
                          className="sr-only"
                          checked={checkout.cardId === c.id}
                          onChange={() => { patchCheckout({ cardId: c.id }); setErrors({}); }}
                        />
                        <span className="gold" style={{ marginTop: '.15rem' }}><Icon name="card" size={20} /></span>
                        <span className="opt__body">
                          <span className="opt__title">
                            {c.brand} ···· {c.last4}
                            {c.isDefault && <span className="badge badge--quiet" style={{ marginLeft: '.6rem' }}>Default</span>}
                          </span>
                          <span className="opt__meta">{c.name} · expires {c.exp}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                {errors.pick && <p className="field__err" style={{ display: 'block', marginTop: '.8rem' }}>{errors.pick}</p>}

                {adding && (
                  <form onSubmit={saveCard} style={{ marginTop: cards.length ? '1.6rem' : 0 }} noValidate>
                    {cards.length > 0 && <div className="rule" style={{ marginBottom: '1.6rem' }} />}
                    <h3 className="h4" style={{ marginBottom: '1.2rem' }}>Add a card</h3>

                    <Field
                      label="Card number"
                      name="number"
                      value={card.number}
                      onChange={(e) => { setCard((c) => ({ ...c, number: groupCardNumber(e.target.value) })); setErrors((x) => ({ ...x, number: null })); }}
                      error={errors.number}
                      placeholder="4242 4242 4242 4242"
                      inputMode="numeric"
                      autoComplete="cc-number"
                      required
                    />
                    <div className="field-row">
                      <Field
                        label="Expiry"
                        name="exp"
                        value={card.exp}
                        onChange={(e) => { setCard((c) => ({ ...c, exp: formatExp(e.target.value) })); setErrors((x) => ({ ...x, exp: null })); }}
                        error={errors.exp}
                        placeholder="08 / 29"
                        inputMode="numeric"
                        autoComplete="cc-exp"
                        required
                      />
                      <Field
                        label="Security code"
                        name="cvc"
                        value={card.cvc}
                        onChange={(e) => { setCard((c) => ({ ...c, cvc: e.target.value.replace(/\D/g, '').slice(0, 4) })); setErrors((x) => ({ ...x, cvc: null })); }}
                        error={errors.cvc}
                        placeholder="123"
                        inputMode="numeric"
                        autoComplete="cc-csc"
                        hint="Never stored."
                        required
                      />
                    </div>
                    <Field
                      label="Name on card"
                      name="name"
                      value={card.name}
                      onChange={(e) => { setCard((c) => ({ ...c, name: e.target.value })); setErrors((x) => ({ ...x, name: null })); }}
                      error={errors.name}
                      autoComplete="cc-name"
                      required
                    />
                    <div style={{ marginTop: '1.1rem' }}>
                      <Check
                        label="Save as my default card"
                        checked={card.isDefault}
                        onChange={(e) => setCard((c) => ({ ...c, isDefault: e.target.checked }))}
                      />
                    </div>

                    <div className="center wrap" style={{ marginTop: '1.5rem', gap: '.7rem' }}>
                      <button className="btn btn--gold" type="submit" disabled={busy}><Sheen />Save card</button>
                      {cards.length > 0 && (
                        <button type="button" className="btn btn--ghost" onClick={() => { setAdding(false); setErrors({}); }}>
                          <Sheen />Cancel
                        </button>
                      )}
                    </div>
                  </form>
                )}
              </Glass>
            )}

            {/* ---------- alternative method notes ---------- */}
            {checkout.payment === 'wire' && (
              <Glass variant="glass--soft" className="panel" style={{ marginTop: '1.4rem' }}>
                <h3 className="h4">Bank transfer</h3>
                <p className="muted" style={{ marginTop: '.6rem' }}>
                  Transfer details are issued with your confirmation. Your pieces are held for five business days while
                  the funds clear; nothing is dispatched until they do.
                </p>
              </Glass>
            )}

            {checkout.payment === 'split' && splitEligible && (
              <Glass variant="glass--gold" className="panel" style={{ marginTop: '1.4rem' }}>
                <h3 className="h4">Twelve instalments, no interest</h3>
                <p className="muted" style={{ marginTop: '.6rem' }}>
                  {money(Math.round(totals.total / 12))} a month for twelve months. A soft credit check only — it will
                  not affect your score. The first instalment is taken at dispatch, not at order.
                </p>
              </Glass>
            )}

            {/* ---------- billing ---------- */}
            <Glass variant="glass--soft" className="panel" style={{ marginTop: '1.4rem' }}>
              <h3 className="h4" style={{ marginBottom: '.9rem' }}>Billing address</h3>
              <Check
                label="Billing address is the same as the delivery address"
                checked={checkout.billingSame}
                onChange={(e) => patchCheckout({ billingSame: e.target.checked })}
              />
              {!checkout.billingSame && (
                <p className="field__hint" style={{ marginTop: '.9rem' }}>
                  Choose a different billing address in{' '}
                  <Link className="link-gold" to="/account/addresses">your address book</Link>, then return here.
                </p>
              )}
            </Glass>

            <div className="between wrap" style={{ marginTop: '1.6rem' }}>
              <Link className="btn btn--quiet" to="/checkout/shipping">← Back</Link>
              <button type="button" className="btn btn--gold btn--lg" onClick={proceed} disabled={busy}>
                <Sheen />Review order
              </button>
            </div>
          </div>

          <OrderSummary />
        </div>
      </section>
    </div>
  );
}
