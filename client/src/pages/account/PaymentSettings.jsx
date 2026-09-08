/* =============================================================
   AURELIS - PAYMENT SETTINGS
   ============================================================= */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Breadcrumbs, Check, Field, Glass, Icon, PageHead, Sheen
} from '../../components/primitives';
import { AccountNav } from '../../components/checkout';
import { useStore } from '../../context/StoreContext';
import { dx, money } from '../../lib/format';

const BLANK = { number: '', exp: '', cvc: '', name: '', isDefault: false };

const groupCardNumber = (v) => v.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim();
const formatExp = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length <= 2 ? d : `${d.slice(0, 2)} / ${d.slice(2)}`;
};

export default function PaymentSettings() {
  const { session, content, addCard, removeCard, defaultCard, busy } = useStore();
  const [adding, setAdding] = useState(false);
  const [card, setCard] = useState(BLANK);
  const [errors, setErrors] = useState({});

  const { cards, orders } = session;
  const methods = content?.paymentMethods || [];
  const spend = orders.reduce((n, o) => n + (o.totals?.total || 0), 0);

  const save = async (e) => {
    e.preventDefault();
    const errs = {};
    if (card.number.replace(/\D/g, '').length < 13) errs.number = 'Enter the full card number.';
    if (!/^\d{2}\s*\/\s*\d{2}$/.test(card.exp)) errs.exp = 'MM / YY.';
    if (card.cvc.replace(/\D/g, '').length < 3) errs.cvc = '3 or 4 digits.';
    if (!card.name.trim()) errs.name = 'Name as printed on the card.';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const res = await addCard({ number: card.number, exp: card.exp, name: card.name, isDefault: card.isDefault });
    if (res.ok) { setCard(BLANK); setAdding(false); }
  };

  return (
    <div className="shell">
      <Breadcrumbs trail={[{ label: 'Home', to: '/' }, { label: 'Account', to: '/account/orders' }, { label: 'Payment' }]} />

      <PageHead
        kicker="Your register"
        title="Payment settings"
        lede="Cards are tokenised by our processor. We hold the last four digits and the expiry so you can recognise them — never the full number, never the security code."
        aside={
          !adding && (
            <button type="button" className="btn btn--gold" onClick={() => setAdding(true)}>
              <Sheen /><Icon name="plus" size={15} />Add a card
            </button>
          )
        }
      />

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="acct">
          <AccountNav />

          <div>
            <div className="stat-row">
              {[
                ['Cards on file', cards.length],
                ['Orders settled', orders.length],
                ['Lifetime value', money(spend)],
                ['Stored digits', '4']
              ].map(([label, value]) => (
                <Glass variant="glass--soft" className="stat" key={label}>
                  <b>{value}</b>
                  <span>{label}</span>
                </Glass>
              ))}
            </div>

            {adding && (
              <Glass variant="glass--pane" className="panel" style={{ marginBottom: '1.4rem' }}>
                <div className="panel__head">
                  <div>
                    <span className="eyebrow eyebrow--plain">New card</span>
                    <h2 className="h3" style={{ marginTop: '.4rem' }}>Add a payment method</h2>
                  </div>
                  <span className="badge badge--quiet"><Icon name="lock" size={12} /> Tokenised</span>
                </div>

                <form onSubmit={save} noValidate>
                  <Field
                    label="Card number" name="number" value={card.number}
                    onChange={(e) => { setCard((c) => ({ ...c, number: groupCardNumber(e.target.value) })); setErrors((x) => ({ ...x, number: null })); }}
                    error={errors.number} placeholder="4242 4242 4242 4242" inputMode="numeric" autoComplete="cc-number" required
                  />
                  <div className="field-row">
                    <Field
                      label="Expiry" name="exp" value={card.exp}
                      onChange={(e) => { setCard((c) => ({ ...c, exp: formatExp(e.target.value) })); setErrors((x) => ({ ...x, exp: null })); }}
                      error={errors.exp} placeholder="08 / 29" inputMode="numeric" autoComplete="cc-exp" required
                    />
                    <Field
                      label="Security code" name="cvc" value={card.cvc}
                      onChange={(e) => { setCard((c) => ({ ...c, cvc: e.target.value.replace(/\D/g, '').slice(0, 4) })); setErrors((x) => ({ ...x, cvc: null })); }}
                      error={errors.cvc} placeholder="123" inputMode="numeric" autoComplete="cc-csc" hint="Never stored." required
                    />
                  </div>
                  <Field
                    label="Name on card" name="name" value={card.name}
                    onChange={(e) => { setCard((c) => ({ ...c, name: e.target.value })); setErrors((x) => ({ ...x, name: null })); }}
                    error={errors.name} autoComplete="cc-name" required
                  />
                  <div style={{ marginTop: '1.1rem' }}>
                    <Check label="Make this my default card" checked={card.isDefault} onChange={(e) => setCard((c) => ({ ...c, isDefault: e.target.checked }))} />
                  </div>
                  <div className="center wrap" style={{ marginTop: '1.5rem', gap: '.7rem' }}>
                    <button className="btn btn--gold" type="submit" disabled={busy}><Sheen />Save card</button>
                    <button type="button" className="btn btn--ghost" onClick={() => { setAdding(false); setErrors({}); }}>
                      <Sheen />Cancel
                    </button>
                  </div>
                </form>
              </Glass>
            )}

            <div className="addr-grid">
              {cards.map((c) => (
                <Glass variant="glass--pane" className="addr" key={c.id}>
                  <div className="between" style={{ alignItems: 'flex-start' }}>
                    <span className="eyebrow eyebrow--plain">{c.brand}</span>
                    {c.isDefault && <span className="badge">Default</span>}
                  </div>

                  <Glass variant="glass--frost" className="cardface" style={{ maxWidth: 'none', marginTop: '.8rem' }}>
                    <div className="between">
                      <span className="keycard__chip" style={{ width: 34, height: 25 }} />
                      <span className="tiny" style={{ color: 'var(--pearl-2)' }}>{c.brand}</span>
                    </div>
                    <div className="cardface__no">···· ···· ···· {c.last4}</div>
                    <div className="keycard__row">
                      <div><span>Holder</span><b style={{ fontSize: '.82rem' }}>{c.name}</b></div>
                      <div style={{ textAlign: 'right' }}><span>Expires</span><b style={{ fontSize: '.82rem' }}>{c.exp}</b></div>
                    </div>
                  </Glass>

                  <div className="addr__acts">
                    {!c.isDefault && <button type="button" onClick={() => defaultCard(c.id)}>Make default</button>}
                    <button type="button" onClick={() => removeCard(c.id)}>Remove</button>
                  </div>
                </Glass>
              ))}

              {!adding && (
                <Glass variant="glass--soft" className="addr addr--add" onClick={() => setAdding(true)} role="button" tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') setAdding(true); }}>
                  <Icon name="plus" size={26} />
                  <span className="h4">Add a card</span>
                  <span className="tiny" style={{ textTransform: 'none', letterSpacing: '.03em' }}>
                    Visa, Mastercard or American Express
                  </span>
                </Glass>
              )}
            </div>

            <Glass variant="glass--pane" className="panel" style={{ marginTop: '1.4rem' }}>
              <div className="panel__head">
                <div>
                  <span className="eyebrow eyebrow--plain">Other ways to settle</span>
                  <h2 className="h3" style={{ marginTop: '.4rem' }}>Accepted at checkout</h2>
                </div>
              </div>
              <div style={{ display: 'grid', gap: '.8rem' }}>
                {methods.map((m) => (
                  <div className="opt" key={m.id} style={{ cursor: 'default' }}>
                    <span className="gold" style={{ marginTop: '.15rem' }}><Icon name={m.icon} size={20} /></span>
                    <span className="opt__body">
                      <span className="opt__title">{dx(m.name)}</span>
                      <span className="opt__meta">{dx(m.note)}</span>
                    </span>
                  </div>
                ))}
              </div>
            </Glass>

            <Glass variant="glass--soft" className="panel" style={{ marginTop: '1.4rem' }}>
              <div className="center" style={{ gap: '1rem', alignItems: 'flex-start' }}>
                <span className="gold"><Icon name="shield" size={22} /></span>
                <div>
                  <h3 className="h4">How we handle card data</h3>
                  <p className="muted" style={{ marginTop: '.5rem', maxWidth: '62ch', fontSize: '.9rem' }}>
                    Full card numbers never touch our systems. Our processor returns a token that can only be used to
                    charge on our account, and it can be revoked from this page at any time. Read more in the{' '}
                    <Link className="link-gold" to="/legal#privacy">Privacy Policy</Link>.
                  </p>
                </div>
              </div>
            </Glass>
          </div>
        </div>
      </section>
    </div>
  );
}
