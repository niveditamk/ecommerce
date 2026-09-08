/* =============================================================
   AURELIS - LOGIN / CREATE ACCOUNT
   ============================================================= */
import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Breadcrumbs, Check, Field, Glass, Icon, PageHead, Sheen } from '../components/primitives';
import { useStore } from '../context/StoreContext';

const BENEFITS = [
  'Your pieces, orders and service history in one register',
  'Saved addresses and tokenised cards for a two-click checkout',
  'Early access windows on numbered editions',
  'Service reminders timed to your calibre, not to a mailing list',
  'A named concierge rather than a queue'
];

function strength(pw) {
  let s = 0;
  if (pw.length >= 6) s += 1;
  if (pw.length >= 10) s += 1;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s += 1;
  if (/\d/.test(pw) || /[^\w\s]/.test(pw)) s += 1;
  return s;
}

export default function Auth() {
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { session, login, register, busy } = useStore();

  const [mode, setMode] = useState(params.get('mode') === 'create' ? 'create' : 'signin');
  const [form, setForm] = useState({ email: '', password: '', first: '', last: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [remember, setRemember] = useState(true);
  const [accept, setAccept] = useState(false);

  const next = location.state?.from || params.get('next') || '/account/profile';
  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setErrors((x) => ({ ...x, [k]: null })); };

  if (session.user) {
    return (
      <div className="shell">
        <Breadcrumbs trail={[{ label: 'Home', to: '/' }, { label: 'Account' }]} />
        <section className="section" style={{ paddingTop: 0 }}>
          <Glass variant="glass--deep" className="panel" style={{ textAlign: 'center' }}>
            <div className="empty__ring" style={{ margin: '0 auto 1.4rem' }}><Icon name="check" size={28} /></div>
            <h2 className="h2">You are signed in</h2>
            <p className="lede muted" style={{ margin: '1rem auto 0', maxWidth: '46ch' }}>
              Welcome back, {session.user.first}. Your register, addresses and payment methods are ready.
            </p>
            <div className="center wrap" style={{ justifyContent: 'center', marginTop: '2rem', gap: '.7rem' }}>
              <Link className="btn btn--gold" to="/account/orders"><Sheen />View orders</Link>
              <Link className="btn btn--glass" to="/account/profile"><Sheen />Account settings</Link>
            </div>
          </Glass>
        </section>
      </div>
    );
  }

  const validate = () => {
    const e = {};
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) e.email = 'Enter a valid email address.';
    /* Sign-in only needs something typed; the server decides whether
       it is right. Creating an account has to clear the real bar the
       API enforces, or the form accepts what the server will reject. */
    if (!form.password) e.password = 'Enter your passphrase.';
    else if (mode === 'create' && form.password.length < 10) {
      e.password = 'At least ten characters.';
    }
    if (mode === 'create') {
      if (!form.first.trim()) e.first = 'We need your first name.';
      if (!form.last.trim()) e.last = 'We need your family name.';
      if (form.confirm !== form.password) e.confirm = 'The two passphrases differ.';
      if (!accept) e.accept = 'Please accept the terms to continue.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    const res = mode === 'signin'
      ? await login({ email: form.email, password: form.password })
      : await register({ email: form.email, password: form.password, first: form.first, last: form.last });

    if (res.ok) navigate(next, { replace: true });
    else setErrors({ email: res.error });
  };

  const pw = strength(form.password);

  return (
    <div className="shell">
      <Breadcrumbs trail={[{ label: 'Home', to: '/' }, { label: mode === 'signin' ? 'Sign in' : 'Create account' }]} />

      <PageHead
        kicker="Your register"
        title={mode === 'signin' ? 'Welcome back' : 'Open a register'}
        lede="One account holds your orders, service history, saved pieces and addresses across every boutique."
      />

      <section className="section" style={{ paddingTop: 0 }}>
        <Glass variant="glass--deep" className="auth">
          <div className="auth__aside">
            <div>
              <span className="eyebrow">Why a register</span>
              <h2 className="h2" style={{ marginTop: '1rem' }}>Kept, not marketed to</h2>
              <p className="lede muted" style={{ marginTop: '1rem' }}>
                We hold what is needed to look after an object for decades — and nothing else. No advertising networks,
                no resold data.
              </p>
              <ul>
                {BENEFITS.map((b) => (
                  <li key={b}><Icon name="check" size={17} /><span>{b}</span></li>
                ))}
              </ul>
            </div>

            <Glass variant="glass--gold" style={{ padding: '1.2rem 1.3rem', borderRadius: 'var(--r-md)', marginTop: '2rem' }}>
              <div className="center" style={{ gap: '.9rem' }}>
                <span className="gold"><Icon name="crown" size={22} /></span>
                <div>
                  <b style={{ display: 'block', color: 'var(--pearl)', fontWeight: 400 }}>Le Cercle</b>
                  <span className="tiny" style={{ textTransform: 'none', letterSpacing: '.03em' }}>
                    Members see numbered editions forty-eight hours early.
                  </span>
                </div>
              </div>
            </Glass>
          </div>

          <div className="auth__panel">
            <div className="tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'signin'}
                className={mode === 'signin' ? 'is-on' : ''}
                onClick={() => { setMode('signin'); setErrors({}); }}
              >
                Sign in
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'create'}
                className={mode === 'create' ? 'is-on' : ''}
                onClick={() => { setMode('create'); setErrors({}); }}
              >
                Create account
              </button>
            </div>

            <form onSubmit={submit} noValidate>
              {mode === 'create' && (
                <div className="field-row" style={{ marginTop: 0 }}>
                  <Field label="First name" name="first" value={form.first} onChange={set('first')} error={errors.first} required autoComplete="given-name" />
                  <Field label="Family name" name="last" value={form.last} onChange={set('last')} error={errors.last} required autoComplete="family-name" />
                </div>
              )}

              <Field
                label="Email address"
                name="email"
                type="email"
                value={form.email}
                onChange={set('email')}
                error={errors.email}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />

              <Field
                label="Passphrase"
                name="password"
                type="password"
                value={form.password}
                onChange={set('password')}
                error={errors.password}
                placeholder={mode === 'create' ? 'At least ten characters' : 'Your passphrase'}
                required
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              />

              {mode === 'create' && (
                <>
                  <div className="pw-meter" aria-hidden="true">
                    {[0, 1, 2, 3].map((i) => <i key={i} className={i < pw ? 'on' : ''} />)}
                  </div>
                  <Field
                    label="Confirm passphrase"
                    name="confirm"
                    type="password"
                    value={form.confirm}
                    onChange={set('confirm')}
                    error={errors.confirm}
                    required
                    autoComplete="new-password"
                  />
                </>
              )}

              <div style={{ marginTop: '1.3rem', display: 'grid', gap: '.9rem' }}>
                {mode === 'signin' ? (
                  <div className="between wrap">
                    <Check label="Keep me signed in" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                    <Link className="link" to="/help?topic=Account">Forgotten passphrase?</Link>
                  </div>
                ) : (
                  <>
                    <Check
                      label="I accept the Terms of Sale and Privacy Policy"
                      checked={accept}
                      onChange={(e) => { setAccept(e.target.checked); setErrors((x) => ({ ...x, accept: null })); }}
                    />
                    {errors.accept && <span className="field__err" style={{ display: 'block' }}>{errors.accept}</span>}
                    <Check
                      label="Send me atelier notes and edition previews"
                      hint="Twice a month at most. Leave whenever you like."
                      checked
                      onChange={() => {}}
                    />
                  </>
                )}
              </div>

              <button className="btn btn--gold btn--block btn--lg" style={{ marginTop: '1.6rem' }} type="submit" disabled={busy}>
                <Sheen />{mode === 'signin' ? 'Sign in' : 'Create my register'}
              </button>

              <div className="or">or continue with</div>

              <div className="sso">
                <button type="button" className="btn btn--glass"><Sheen /><Icon name="globe" size={16} />Google</button>
                <button type="button" className="btn btn--glass"><Sheen /><Icon name="key" size={16} />Passkey</button>
              </div>

              <p className="field__hint" style={{ marginTop: '1.4rem', textAlign: 'center' }}>
                This is a demonstration storefront. Accounts are real: create one to sign in, and your passphrase is stored hashed, never in plain text.
              </p>

              <div className="rule" style={{ margin: '1.6rem 0' }} />

              <div className="center" style={{ justifyContent: 'center', gap: '.6rem' }}>
                <Icon name="lock" size={14} />
                <span className="tiny" style={{ textTransform: 'none', letterSpacing: '.04em' }}>
                  Checking out as a guest?{' '}
                  <Link className="link-gold" to="/checkout/login">Continue without an account</Link>
                </span>
              </div>
            </form>
          </div>
        </Glass>
      </section>
    </div>
  );
}
