/* =============================================================
   AURELIS - PROFILE / ACCOUNT SETTINGS
   ============================================================= */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Breadcrumbs, Empty, Field, Glass, Icon, PageHead, Sheen, Toggle
} from '../../components/primitives';
import { AccountNav } from '../../components/checkout';
import { useStore } from '../../context/StoreContext';
import { dx, initials } from '../../lib/format';

const CHANNELS = [
  ['email', 'Email', 'Atelier notes, edition previews and order updates.'],
  ['sms', 'SMS', 'Dispatch and delivery messages only. Never marketing.'],
  ['post', 'Post', 'The printed annual, once a year, if you would like it.']
];

const CURRENCIES = ['INR'];

export default function Profile() {
  const { session, updateProfile, updatePrefs, logout, busy } = useStore();
  const user = session.user;

  const [form, setForm] = useState({ first: '', last: '', email: '', phone: '', birthday: '' });
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!user) return;
    setForm({
      first: user.first || '', last: user.last || '', email: user.email || '',
      phone: user.phone || '', birthday: user.birthday || ''
    });
    setDirty(false);
  }, [user]);

  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setDirty(true); };

  const save = async (e) => {
    e.preventDefault();
    const res = await updateProfile(form);
    if (res.ok) setDirty(false);
  };

  if (!user) {
    return (
      <div className="shell">
        <Breadcrumbs trail={[{ label: 'Home', to: '/' }, { label: 'Account' }]} />
        <section className="section" style={{ paddingTop: 0 }}>
          <Empty
            icon="lock"
            title="Sign in to see your settings"
            body="Your profile, addresses, cards and service history live behind a sign-in. Guest orders can still be tracked from the confirmation email."
            cta={{ to: '/account/auth', label: 'Sign in or create a register' }}
          />
        </section>
      </div>
    );
  }

  return (
    <div className="shell">
      <Breadcrumbs trail={[{ label: 'Home', to: '/' }, { label: 'Account', to: '/account/orders' }, { label: 'Profile' }]} />

      <PageHead
        kicker="Your register"
        title="Profile & settings"
        lede="What we hold, and how we reach you. Everything here can be changed or erased at any time."
      />

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="acct">
          <AccountNav />

          <div>
            {/* ---- identity card ---- */}
            <Glass variant="glass--gold" className="panel">
              <div className="between wrap" style={{ gap: '1.4rem' }}>
                <div className="center" style={{ gap: '1.2rem' }}>
                  <span className="avatar" style={{ width: 62, height: 62, fontSize: '1.4rem' }}>{initials(user)}</span>
                  <div>
                    <h2 className="h3">{dx(user.first)} {dx(user.last)}</h2>
                    <div className="center wrap" style={{ gap: '.6rem', marginTop: '.5rem' }}>
                      <span className="badge"><Icon name="crown" size={12} /> {user.tier}</span>
                      <span className="badge badge--quiet">{user.memberNo}</span>
                      <span className="badge badge--quiet">Member since {user.since}</span>
                    </div>
                  </div>
                </div>
                <Link className="btn btn--glass btn--sm" to="/membership"><Sheen />Membership</Link>
              </div>
            </Glass>

            {/* ---- details ---- */}
            <Glass variant="glass--pane" className="panel" style={{ marginTop: '1.4rem' }}>
              <div className="panel__head">
                <div>
                  <span className="eyebrow eyebrow--plain">Details</span>
                  <h2 className="h3" style={{ marginTop: '.4rem' }}>Who you are to us</h2>
                </div>
                {dirty && <span className="badge badge--quiet">Unsaved changes</span>}
              </div>

              <form onSubmit={save} noValidate>
                <div className="field-row" style={{ marginTop: 0 }}>
                  <Field label="First name" name="first" value={form.first} onChange={set('first')} required autoComplete="given-name" />
                  <Field label="Family name" name="last" value={form.last} onChange={set('last')} required autoComplete="family-name" />
                </div>
                <Field label="Email address" name="email" type="email" value={form.email} onChange={set('email')} required autoComplete="email" />
                <div className="field-row">
                  <Field label="Telephone" name="phone" type="tel" value={form.phone} onChange={set('phone')} hint="Used by couriers and your concierge." autoComplete="tel" />
                  <Field label="Date of birth" name="birthday" type="date" value={form.birthday} onChange={set('birthday')} hint="Optional. We mark it with a small gesture." />
                </div>

                <div className="center wrap" style={{ marginTop: '1.6rem', gap: '.7rem' }}>
                  <button className="btn btn--gold" type="submit" disabled={busy || !dirty}><Sheen />Save changes</button>
                  <Link className="btn btn--ghost" to="/help?topic=Account"><Sheen />Change passphrase</Link>
                </div>
              </form>
            </Glass>

            {/* ---- communication ---- */}
            <Glass variant="glass--pane" className="panel" style={{ marginTop: '1.4rem' }}>
              <div className="panel__head">
                <div>
                  <span className="eyebrow eyebrow--plain">Communication</span>
                  <h2 className="h3" style={{ marginTop: '.4rem' }}>How we reach you</h2>
                </div>
                <Link className="link" to="/signup">Full preferences</Link>
              </div>

              {CHANNELS.map(([key, label, note]) => (
                <div className="pref-row" key={key}>
                  <div>
                    <b>{label}</b>
                    <span>{note}</span>
                  </div>
                  <Toggle
                    on={!!session.prefs[key]}
                    label={`${label} preferences`}
                    onClick={() => updatePrefs({ [key]: !session.prefs[key] })}
                  />
                </div>
              ))}

              <div className="pref-row">
                <div>
                  <b>Currency</b>
                  <span>The maison prices in rupees. Every figure you see includes GST.</span>
                </div>
                <span className="badge">₹ Indian Rupee · {CURRENCIES[0]}</span>
              </div>
            </Glass>

            {/* ---- privacy ---- */}
            <Glass variant="glass--soft" className="panel" style={{ marginTop: '1.4rem' }}>
              <div className="panel__head">
                <div>
                  <span className="eyebrow eyebrow--plain">Privacy</span>
                  <h2 className="h3" style={{ marginTop: '.4rem' }}>Your data, your call</h2>
                </div>
              </div>
              <p className="muted" style={{ maxWidth: '62ch' }}>
                We hold what is needed to sell you an object and look after it afterwards. We do not sell personal data
                and we do not share it with advertising networks. Read the{' '}
                <Link className="link-gold" to="/legal#privacy">Privacy Policy</Link> in full.
              </p>
              <div className="center wrap" style={{ marginTop: '1.4rem', gap: '.7rem' }}>
                <button type="button" className="btn btn--ghost btn--sm"><Sheen /><Icon name="doc" size={14} />Download my data</button>
                <button type="button" className="btn btn--danger btn--sm"><Sheen />Request erasure</button>
                <button type="button" className="btn btn--ghost btn--sm" onClick={logout}>
                  <Sheen /><Icon name="logout" size={14} />Sign out
                </button>
              </div>
            </Glass>
          </div>
        </div>
      </section>
    </div>
  );
}
