/* =============================================================
   AURELIS - ADDRESSES
   ============================================================= */
import { useState } from 'react';
import {
  Breadcrumbs, Check, Field, Glass, Icon, PageHead, Sheen
} from '../../components/primitives';
import { AccountNav } from '../../components/checkout';
import { useStore } from '../../context/StoreContext';
import { dx } from '../../lib/format';

const COUNTRIES = ['United Kingdom', 'France', 'Switzerland', 'Italy', 'Germany', 'Spain',
  'United States', 'Canada', 'Japan', 'Singapore', 'United Arab Emirates', 'Australia'];

const BLANK = {
  label: 'Home', first: '', last: '', line1: '', line2: '',
  city: '', region: '', post: '', country: 'United Kingdom', phone: '', isDefault: false
};

export default function Addresses() {
  const { session, addAddress, updateAddress, removeAddress, defaultAddress, busy } = useStore();
  const [editing, setEditing] = useState(null);   /* 'new' | address id | null */
  const [form, setForm] = useState(BLANK);
  const [errors, setErrors] = useState({});

  const addresses = session.addresses;

  const startNew = () => { setForm(BLANK); setErrors({}); setEditing('new'); };
  const startEdit = (a) => { setForm({ ...BLANK, ...a }); setErrors({}); setEditing(a.id); };
  const cancel = () => { setEditing(null); setErrors({}); };

  const set = (k) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [k]: value }));
    setErrors((x) => ({ ...x, [k]: null }));
  };

  const save = async (e) => {
    e.preventDefault();
    const need = ['first', 'last', 'line1', 'city', 'post', 'country'];
    const errs = {};
    need.forEach((f) => { if (!String(form[f] || '').trim()) errs[f] = 'Required.'; });
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const res = editing === 'new' ? await addAddress(form) : await updateAddress(editing, form);
    if (res.ok) cancel();
  };

  return (
    <div className="shell">
      <Breadcrumbs trail={[{ label: 'Home', to: '/' }, { label: 'Account', to: '/account/orders' }, { label: 'Addresses' }]} />

      <PageHead
        kicker="Your register"
        title="Addresses"
        lede="Where your pieces go. Couriers require a signature, so a place where someone can sign is best."
        aside={
          !editing && (
            <button type="button" className="btn btn--gold" onClick={startNew}>
              <Sheen /><Icon name="plus" size={15} />New address
            </button>
          )
        }
      />

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="acct">
          <AccountNav />

          <div>
            {editing && (
              <Glass variant="glass--pane" className="panel" style={{ marginBottom: '1.4rem' }}>
                <div className="panel__head">
                  <div>
                    <span className="eyebrow eyebrow--plain">{editing === 'new' ? 'New address' : 'Edit address'}</span>
                    <h2 className="h3" style={{ marginTop: '.4rem' }}>
                      {editing === 'new' ? 'Add a delivery address' : dx(form.label || 'Address')}
                    </h2>
                  </div>
                </div>

                <form onSubmit={save} noValidate>
                  <div className="field-row" style={{ marginTop: 0 }}>
                    <Field label="First name" name="first" value={form.first} onChange={set('first')} error={errors.first} required autoComplete="given-name" />
                    <Field label="Family name" name="last" value={form.last} onChange={set('last')} error={errors.last} required autoComplete="family-name" />
                  </div>
                  <Field label="Address line 1" name="line1" value={form.line1} onChange={set('line1')} error={errors.line1} required autoComplete="address-line1" />
                  <Field label="Address line 2" name="line2" value={form.line2} onChange={set('line2')} placeholder="Apartment, floor, entrance" autoComplete="address-line2" />
                  <div className="field-row">
                    <Field label="City" name="city" value={form.city} onChange={set('city')} error={errors.city} required autoComplete="address-level2" />
                    <Field label="Region or county" name="region" value={form.region} onChange={set('region')} autoComplete="address-level1" />
                  </div>
                  <div className="field-row">
                    <Field label="Postal code" name="post" value={form.post} onChange={set('post')} error={errors.post} required autoComplete="postal-code" />
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
                    <button className="btn btn--gold" type="submit" disabled={busy}>
                      <Sheen />{editing === 'new' ? 'Save address' : 'Update address'}
                    </button>
                    <button type="button" className="btn btn--ghost" onClick={cancel}><Sheen />Cancel</button>
                  </div>
                </form>
              </Glass>
            )}

            <div className="addr-grid">
              {addresses.map((a) => (
                <Glass variant="glass--pane" className="addr" key={a.id}>
                  <div className="between" style={{ alignItems: 'flex-start' }}>
                    <span className="eyebrow eyebrow--plain">{dx(a.label || 'Address')}</span>
                    {a.isDefault && <span className="badge">Default</span>}
                  </div>

                  <div style={{ fontFamily: 'var(--serif)', fontSize: '1.1rem', color: 'var(--pearl)', marginTop: '.4rem' }}>
                    {dx(a.first)} {dx(a.last)}
                  </div>

                  <address>
                    {dx(a.line1)}<br />
                    {a.line2 && <>{dx(a.line2)}<br /></>}
                    {dx(a.city)}{a.region ? `, ${dx(a.region)}` : ''}<br />
                    {dx(a.post)}<br />
                    {dx(a.country)}
                    {a.phone && <><br />{dx(a.phone)}</>}
                  </address>

                  <div className="addr__acts">
                    <button type="button" onClick={() => startEdit(a)}>Edit</button>
                    {!a.isDefault && <button type="button" onClick={() => defaultAddress(a.id)}>Make default</button>}
                    {addresses.length > 1 && <button type="button" onClick={() => removeAddress(a.id)}>Remove</button>}
                  </div>
                </Glass>
              ))}

              {!editing && (
                <Glass
                  variant="glass--soft"
                  className="addr addr--add"
                  role="button"
                  tabIndex={0}
                  onClick={startNew}
                  onKeyDown={(e) => { if (e.key === 'Enter') startNew(); }}
                >
                  <Icon name="plus" size={26} />
                  <span className="h4">Add an address</span>
                  <span className="tiny" style={{ textTransform: 'none', letterSpacing: '.03em' }}>
                    We deliver to 62 countries
                  </span>
                </Glass>
              )}
            </div>

            <Glass variant="glass--soft" className="panel" style={{ marginTop: '1.4rem' }}>
              <div className="center" style={{ gap: '1rem', alignItems: 'flex-start' }}>
                <span className="gold"><Icon name="truck" size={22} /></span>
                <div>
                  <h3 className="h4">A note on signatures</h3>
                  <p className="muted" style={{ marginTop: '.5rem', maxWidth: '62ch', fontSize: '.9rem' }}>
                    Every consignment is insured and requires a signature — we cannot authorise a doorstep drop. If a
                    delivery address is difficult, hand delivery by a member of the boutique team is available in
                    selected cities, or the piece can be held for collection.
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
