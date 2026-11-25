/* =============================================================
   AURELIS - CHECKOUT · SHIPPING
   ============================================================= */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Breadcrumbs, Check, Empty, Field, Glass, Icon, PageHead, Sheen
} from '../../components/primitives';
import { CheckoutSteps, OrderSummary } from '../../components/checkout';
import { useStore } from '../../context/StoreContext';
import { useAsync } from '../../lib/useAsync';
import api from '../../lib/api';
import { dx, money } from '../../lib/format';

const COUNTRIES = ['India', 'United Kingdom', 'Switzerland', 'France', 'United States', 'Singapore', 'United Arab Emirates', 'Germany', 'Italy', 'Japan', 'Australia', 'Canada'];

const BLANK = {
  label: 'Home', first: '', last: '', line1: '', line2: '',
  city: '', region: '', post: '', country: 'India', phone: '', isDefault: false
};

export default function CheckoutShipping() {
  const { session, content, patchCheckout, addAddress, busy } = useStore();
  const navigate = useNavigate();
  const [adding, setAdding] = useState(session.addresses.length === 0);
  const [form, setForm] = useState(BLANK);
  const [errors, setErrors] = useState({});

  const stores = useAsync(() => api.stores(), []);
  const methods = content?.shippingMethods || [];
  const { checkout, addresses } = session;
  const isPickup = checkout.method === 'pick';

  if (session.cart.length === 0) {
    return (
      <div className="shell section">
        <Empty icon="lock" title="Nothing to check out"
          body="Your bag is empty, so there is nothing to carry through checkout."
          cta={{ to: '/categories', label: 'Explore collections' }} />
      </div>
    );
  }

  const set = (k) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [k]: value }));
    setErrors((x) => ({ ...x, [k]: null }));
  };

  const saveAddress = async (e) => {
    e.preventDefault();
    const need = ['first', 'last', 'line1', 'city', 'post', 'country'];
    const errs = {};
    need.forEach((f) => { if (!String(form[f] || '').trim()) errs[f] = 'Required.'; });
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const res = await addAddress(form);
    if (res.ok) {
      const id = res.data.addressId;
      await patchCheckout({ shipTo: id });
      setForm(BLANK);
      setAdding(false);
    }
  };

  const proceed = () => {
    if (!isPickup && !checkout.shipTo) { setErrors({ pick: 'Choose a delivery address.' }); return; }
    navigate('/checkout/payment');
  };

  return (
    <div className="shell">
      <Breadcrumbs trail={[{ label: 'Home', to: '/' }, { label: 'Bag', to: '/cart' }, { label: 'Shipping' }]} />

      <PageHead
        kicker="Step two of four"
        title="Where should it go?"
        lede="Every delivery is insured and requires a signature. Hand delivery by a member of the boutique team is available in selected cities."
      />

      <section className="section" style={{ paddingTop: 0 }}>
        <CheckoutSteps current="shipping" />

        <div className="split">
          <div>
            {/* ---------- method ---------- */}
            <Glass variant="glass--pane" className="panel">
              <div className="panel__head">
                <div>
                  <span className="eyebrow eyebrow--plain">Delivery</span>
                  <h2 className="h3" style={{ marginTop: '.4rem' }}>Choose how it travels</h2>
                </div>
              </div>

              <div style={{ display: 'grid', gap: '.8rem' }}>
                {methods.map((m) => (
                  <label className={`opt${checkout.method === m.id ? ' is-on' : ''}`} key={m.id}>
                    <input
                      type="radio"
                      name="method"
                      className="sr-only"
                      checked={checkout.method === m.id}
                      onChange={() => patchCheckout({ method: m.id })}
                    />
                    <span className="gold" style={{ marginTop: '.15rem' }}>
                      <Icon name={m.id === 'pick' ? 'pin' : m.id === 'hand' ? 'gift' : 'truck'} size={20} />
                    </span>
                    <span className="opt__body">
                      <span className="opt__title">{dx(m.name)}</span>
                      <span className="opt__meta">{dx(m.eta)} · {dx(m.note)}</span>
                    </span>
                    <span className="opt__price">{m.price ? money(m.price) : 'Free'}</span>
                  </label>
                ))}
              </div>
            </Glass>

            {/* ---------- pickup boutique ---------- */}
            {isPickup ? (
              <Glass variant="glass--pane" className="panel" style={{ marginTop: '1.4rem' }}>
                <div className="panel__head">
                  <div>
                    <span className="eyebrow eyebrow--plain">Collection</span>
                    <h2 className="h3" style={{ marginTop: '.4rem' }}>Which boutique?</h2>
                  </div>
                  <Link className="link" to="/stores">See all boutiques</Link>
                </div>

                <div style={{ display: 'grid', gap: '.8rem' }}>
                  {(stores.data?.items || []).map((s) => (
                    <label className={`opt${checkout.pickupStore === s.id ? ' is-on' : ''}`} key={s.id}>
                      <input
                        type="radio"
                        name="pickup"
                        className="sr-only"
                        checked={checkout.pickupStore === s.id}
                        onChange={() => patchCheckout({ pickupStore: s.id })}
                      />
                      <span className="gold" style={{ marginTop: '.15rem' }}><Icon name="pin" size={20} /></span>
                      <span className="opt__body">
                        <span className="opt__title">{dx(s.name)}</span>
                        <span className="opt__meta">{s.address.map(dx).join(', ')}</span>
                      </span>
                      <span className="badge badge--quiet">Ready in 2h</span>
                    </label>
                  ))}
                </div>
              </Glass>
            ) : (
              /* ---------- addresses ---------- */
              <Glass variant="glass--pane" className="panel" style={{ marginTop: '1.4rem' }}>
                <div className="panel__head">
                  <div>
                    <span className="eyebrow eyebrow--plain">Address</span>
                    <h2 className="h3" style={{ marginTop: '.4rem' }}>Deliver to</h2>
                  </div>
                  {!adding && (
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => setAdding(true)}>
                      <Sheen /><Icon name="plus" size={14} />New address
                    </button>
                  )}
                </div>

                {addresses.length > 0 && (
                  <div style={{ display: 'grid', gap: '.8rem' }}>
                    {addresses.map((a) => (
                      <label className={`opt${checkout.shipTo === a.id ? ' is-on' : ''}`} key={a.id}>
                        <input
                          type="radio"
                          name="shipTo"
                          className="sr-only"
                          checked={checkout.shipTo === a.id}
                          onChange={() => { patchCheckout({ shipTo: a.id }); setErrors({}); }}
                        />
                        <span className="gold" style={{ marginTop: '.15rem' }}><Icon name="pin" size={20} /></span>
                        <span className="opt__body">
                          <span className="opt__title">
                            {dx(a.first)} {dx(a.last)}
                            {a.isDefault && <span className="badge badge--quiet" style={{ marginLeft: '.6rem' }}>Default</span>}
                          </span>
                          <span className="opt__meta">
                            {[a.line1, a.line2, a.city, a.region, a.post, a.country].filter(Boolean).map(dx).join(', ')}
                          </span>
                          {a.phone && <span className="opt__meta">{dx(a.phone)}</span>}
                        </span>
                        <span className="badge badge--quiet">{dx(a.label)}</span>
                      </label>
                    ))}
                  </div>
                )}

                {errors.pick && <p className="field__err" style={{ display: 'block', marginTop: '.8rem' }}>{errors.pick}</p>}

                {adding && (
                  <form onSubmit={saveAddress} style={{ marginTop: addresses.length ? '1.6rem' : 0 }} noValidate>
                    {addresses.length > 0 && <div className="rule" style={{ marginBottom: '1.6rem' }} />}
                    <h3 className="h4" style={{ marginBottom: '1.2rem' }}>New address</h3>

                    <div className="field-row" style={{ marginTop: 0 }}>
                      <Field label="First name" name="first" value={form.first} onChange={set('first')} error={errors.first} required autoComplete="given-name" />
                      <Field label="Family name" name="last" value={form.last} onChange={set('last')} error={errors.last} required autoComplete="family-name" />
                    </div>
                    <Field label="Address line 1" name="line1" value={form.line1} onChange={set('line1')} error={errors.line1} required autoComplete="address-line1" />
                    <Field label="Address line 2" name="line2" value={form.line2} onChange={set('line2')} placeholder="Apartment, floor, entrance" autoComplete="address-line2" />
                    <div className="field-row">
                      <Field label="City" name="city" value={form.city} onChange={set('city')} error={errors.city} required autoComplete="address-level2" />
                      <Field label="State / Province" name="region" value={form.region} onChange={set('region')} autoComplete="address-level1" placeholder="e.g. Maharashtra" />
                    </div>
                    <div className="field-row">
                      <Field label="PIN code / Postal code" name="post" value={form.post} onChange={set('post')} error={errors.post} required autoComplete="postal-code" placeholder="e.g. 400001" />
                      <Field label="Country" name="country" type="select" value={form.country} onChange={set('country')} options={COUNTRIES} required />
                    </div>
                    <div className="field-row">
                      <Field label="Telephone" name="phone" type="tel" value={form.phone} onChange={set('phone')} hint="Used only by the courier." autoComplete="tel" />
                      <Field label="Label" name="label" value={form.label} onChange={set('label')} placeholder="Home, Studio, Office" />
                    </div>
                    <div style={{ marginTop: '1.1rem' }}>
                      <Check label="Make this my default address" checked={form.isDefault} onChange={set('isDefault')} />
                    </div>

                    <div className="center wrap" style={{ marginTop: '1.5rem', gap: '.7rem' }}>
                      <button className="btn btn--gold" type="submit" disabled={busy}><Sheen />Save address</button>
                      {addresses.length > 0 && (
                        <button type="button" className="btn btn--ghost" onClick={() => { setAdding(false); setErrors({}); }}>
                          <Sheen />Cancel
                        </button>
                      )}
                    </div>
                  </form>
                )}
              </Glass>
            )}

            <div className="between wrap" style={{ marginTop: '1.6rem' }}>
              <Link className="btn btn--quiet" to="/checkout/login">← Back</Link>
              <button type="button" className="btn btn--gold btn--lg" onClick={proceed} disabled={busy}>
                <Sheen />Continue to payment
              </button>
            </div>
          </div>

          <OrderSummary />
        </div>
      </section>
    </div>
  );
}
