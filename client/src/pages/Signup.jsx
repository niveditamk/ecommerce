/* =============================================================
   AURELIS - EMAIL & SMS SIGN UP
   ============================================================= */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Breadcrumbs, Check, Field, Glass, Icon, PageHead, ProductArt, Sheen
} from '../components/primitives';
import { useStore } from '../context/StoreContext';
import api from '../lib/api';
import { dx } from '../lib/format';

const INTERESTS = [
  'Fine Jewellery', 'Horology', 'Parfums Rares', 'Leather Atelier',
  'Objets & Home', 'Silk & Cashmere', 'Eyewear', 'Numbered editions', 'Atelier events'
];

const PROMISES = [
  ['mail', 'Twice a month at most', 'Edition previews, atelier notes and the occasional invitation. Nothing else.'],
  ['phone', 'SMS is transactional first', 'Dispatch and delivery only, unless you explicitly opt into edition alerts.'],
  ['lock', 'Never sold, never shared', 'Your address does not leave our systems. No advertising networks, ever.'],
  ['logout', 'One click to leave', 'Every message carries a working unsubscribe. No retention emails afterwards.']
];

export default function Signup() {
  const { session, toast } = useStore();
  const [form, setForm] = useState({
    email: session.user?.email || '',
    phone: '',
    first: session.user?.first || '',
    country: 'United Kingdom'
  });
  const [channels, setChannels] = useState({ email: true, sms: false });
  const [interests, setInterests] = useState([]);
  const [accept, setAccept] = useState(false);
  const [errors, setErrors] = useState({});
  const [done, setDone] = useState(null);
  const [sending, setSending] = useState(false);

  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setErrors((x) => ({ ...x, [k]: null })); };

  const toggleInterest = (i) =>
    setInterests((list) => (list.includes(i) ? list.filter((x) => x !== i) : [...list, i]));

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) errs.email = 'Enter a valid email address.';
    if (channels.sms && !form.phone.trim()) errs.phone = 'A mobile number is needed for SMS.';
    if (!channels.email && !channels.sms) errs.channels = 'Choose at least one channel.';
    if (!accept) errs.accept = 'Please accept the Privacy Policy.';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSending(true);
    try {
      const res = await api.subscribe({ email: form.email, phone: form.phone, channels, interests });
      setDone(res);
      toast(res.message, 'mail');
    } catch (err) {
      setErrors({ email: err.message });
      toast(err.message, 'close');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="shell">
      <Breadcrumbs trail={[{ label: 'Home', to: '/' }, { label: 'Email & SMS' }]} />

      <PageHead
        kicker="Stay close to the house"
        title="Email & SMS sign up"
        lede="A small list, written by the people at the benches. You choose the channel and the subjects — and leaving takes one click."
      />

      <section className="section" style={{ paddingTop: 0 }}>
        <Glass variant="glass--deep" className="signup">
          <figure className="signup__art">
            <ProductArt shape="flacon" palette="violet" label="Atelier notes" />
            <figcaption>
              <span className="eyebrow eyebrow--plain">From the atelier</span>
              <div className="h3" style={{ marginTop: '.5rem' }}>
                “The eleventh submission was accepted on the condition that nothing be removed.”
              </div>
              <p className="muted" style={{ marginTop: '.6rem', fontSize: '.86rem' }}>
                Elise Roux on Fumée d’Or — from a recent letter.
              </p>
            </figcaption>
          </figure>

          <div className="signup__form">
            {done ? (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <div className="empty__ring" style={{ margin: '0 auto 1.6rem' }}><Icon name="check" size={30} /></div>
                <h2 className="h2">You are on the list</h2>
                <p className="lede muted" style={{ margin: '1rem auto 0', maxWidth: '42ch' }}>
                  A confirmation is on its way to {form.email}. Nothing else will arrive until you confirm.
                </p>
                <div className="center wrap" style={{ justifyContent: 'center', marginTop: '2rem', gap: '.7rem' }}>
                  <Link className="btn btn--gold" to="/categories"><Sheen />Explore collections</Link>
                  <Link className="btn btn--glass" to="/membership"><Sheen />Apply to Le Cercle</Link>
                </div>
                <p className="tiny" style={{ marginTop: '2rem', textTransform: 'none', letterSpacing: '.03em' }}>
                  Reference {done.subscription.id}
                </p>
              </div>
            ) : (
              <form onSubmit={submit} noValidate>
                <span className="eyebrow eyebrow--plain">Your details</span>
                <h2 className="h3" style={{ marginTop: '.5rem', marginBottom: '1.4rem' }}>Where should we write?</h2>

                <Field
                  label="Email address" name="email" type="email" value={form.email}
                  onChange={set('email')} error={errors.email} placeholder="you@example.com" required autoComplete="email"
                />
                <div className="field-row">
                  <Field label="First name" name="first" value={form.first} onChange={set('first')} placeholder="Optional" autoComplete="given-name" />
                  <Field
                    label="Mobile" name="phone" type="tel" value={form.phone} onChange={set('phone')}
                    error={errors.phone} placeholder="+44 7700 900000" hint="Only needed for SMS." autoComplete="tel"
                  />
                </div>

                <div className="rule" style={{ margin: '1.8rem 0 1.4rem' }} />

                <h3 className="field__label" style={{ marginBottom: '.9rem' }}>Channels</h3>
                <div style={{ display: 'grid', gap: '.8rem' }}>
                  <label className={`opt${channels.email ? ' is-on' : ''}`}>
                    <input
                      type="checkbox" className="sr-only" checked={channels.email}
                      onChange={(e) => { setChannels((c) => ({ ...c, email: e.target.checked })); setErrors((x) => ({ ...x, channels: null })); }}
                    />
                    <span className="gold" style={{ marginTop: '.15rem' }}><Icon name="mail" size={20} /></span>
                    <span className="opt__body">
                      <span className="opt__title">Email</span>
                      <span className="opt__meta">Edition previews, atelier notes, private viewings. Twice a month at most.</span>
                    </span>
                  </label>

                  <label className={`opt${channels.sms ? ' is-on' : ''}`}>
                    <input
                      type="checkbox" className="sr-only" checked={channels.sms}
                      onChange={(e) => { setChannels((c) => ({ ...c, sms: e.target.checked })); setErrors((x) => ({ ...x, channels: null })); }}
                    />
                    <span className="gold" style={{ marginTop: '.15rem' }}><Icon name="phone" size={20} /></span>
                    <span className="opt__body">
                      <span className="opt__title">SMS</span>
                      <span className="opt__meta">Dispatch and delivery updates, plus edition alerts if you want them. Message rates may apply.</span>
                    </span>
                  </label>
                </div>
                {errors.channels && <p className="field__err" style={{ display: 'block', marginTop: '.7rem' }}>{errors.channels}</p>}

                <div className="rule" style={{ margin: '1.8rem 0 1.4rem' }} />

                <h3 className="field__label" style={{ marginBottom: '.9rem' }}>
                  What interests you? <span className="faint" style={{ letterSpacing: 0, textTransform: 'none' }}>Optional</span>
                </h3>
                <div className="filters__chips">
                  {INTERESTS.map((i) => (
                    <button
                      key={i}
                      type="button"
                      className={`chip${interests.includes(i) ? ' is-on' : ''}`}
                      onClick={() => toggleInterest(i)}
                    >
                      {i}
                    </button>
                  ))}
                </div>

                <div style={{ marginTop: '1.6rem' }}>
                  <Check
                    label="I have read and accept the Privacy Policy"
                    hint="We never sell your details or share them with advertising networks."
                    checked={accept}
                    onChange={(e) => { setAccept(e.target.checked); setErrors((x) => ({ ...x, accept: null })); }}
                  />
                  {errors.accept && <p className="field__err" style={{ display: 'block', marginTop: '.5rem' }}>{errors.accept}</p>}
                </div>

                <button className="btn btn--gold btn--block btn--lg" style={{ marginTop: '1.6rem' }} type="submit" disabled={sending}>
                  <Sheen />{sending ? 'Signing you up…' : 'Sign me up'}
                </button>

                <p className="field__hint" style={{ marginTop: '1rem', textAlign: 'center' }}>
                  Read the <Link className="link-gold" to="/legal#privacy">Privacy Policy</Link> in full.
                </p>
              </form>
            )}
          </div>
        </Glass>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="values">
          {PROMISES.map(([icon, title, body]) => (
            <Glass variant="glass--lift" className="value" key={title} style={{ minHeight: 0 }}>
              <span className="value__icon" style={{ marginTop: 0 }}><Icon name={icon} size={24} /></span>
              <h3 style={{ fontSize: '1.2rem' }}>{title}</h3>
              <p>{dx(body)}</p>
            </Glass>
          ))}
        </div>
      </section>
    </div>
  );
}
