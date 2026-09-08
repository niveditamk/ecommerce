/* =============================================================
   AURELIS - CHECKOUT · LOG IN OR GUEST
   ============================================================= */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Breadcrumbs, Check, Empty, Field, Glass, Icon, PageHead, Sheen
} from '../../components/primitives';
import { CheckoutSteps, OrderSummary } from '../../components/checkout';
import { useStore } from '../../context/StoreContext';

export default function CheckoutIdentify() {
  const { session, login, patchCheckout, busy } = useStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState(session.user ? 'account' : 'guest');
  const [creds, setCreds] = useState({ email: session.checkout.email || '', password: '' });
  const [guest, setGuest] = useState({ email: session.checkout.email || '' });
  const [errors, setErrors] = useState({});
  const [keepMe, setKeepMe] = useState(true);

  if (session.cart.length === 0) {
    return (
      <div className="shell section">
        <Empty
          icon="lock"
          title="Nothing to check out"
          body="Your bag is empty, so there is nothing to carry through checkout."
          cta={{ to: '/categories', label: 'Explore collections' }}
        />
      </div>
    );
  }

  const signIn = async (e) => {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(creds.email)) { setErrors({ email: 'Enter a valid email address.' }); return; }
    if (!creds.password) { setErrors({ password: 'Enter your passphrase.' }); return; }
    const res = await login(creds);
    if (res.ok) navigate('/checkout/shipping');
    /* A refused sign-in belongs on the passphrase field, not the email —
       the server deliberately will not say which of the two was wrong. */
    else setErrors({ password: res.error });
  };

  const continueAsGuest = async (e) => {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(guest.email)) { setErrors({ guest: 'Enter a valid email address.' }); return; }
    await patchCheckout({ mode: 'guest', email: guest.email });
    navigate('/checkout/shipping');
  };

  return (
    <div className="shell">
      <Breadcrumbs trail={[{ label: 'Home', to: '/' }, { label: 'Bag', to: '/cart' }, { label: 'Checkout' }]} />

      <PageHead
        kicker="Step one of four"
        title="How would you like to proceed?"
        lede="A register makes the next order faster and keeps your service history. Guest checkout asks for nothing beyond the delivery."
      />

      <section className="section" style={{ paddingTop: 0 }}>
        <CheckoutSteps current="login" />

        <div className="split">
          <div>
            {session.user ? (
              <Glass variant="glass--gold" className="panel">
                <div className="between wrap">
                  <div className="center" style={{ gap: '1rem' }}>
                    <span className="gold"><Icon name="check" size={26} /></span>
                    <div>
                      <div className="h4">Signed in as {session.user.first} {session.user.last}</div>
                      <div className="tiny" style={{ marginTop: '.3rem', textTransform: 'none', letterSpacing: '.03em' }}>
                        {session.user.email} · {session.user.tier} · {session.user.memberNo}
                      </div>
                    </div>
                  </div>
                  <Link className="btn btn--gold" to="/checkout/shipping"><Sheen />Continue to shipping</Link>
                </div>
              </Glass>
            ) : (
              <>
                <div className="tabs" role="tablist">
                  <button type="button" role="tab" aria-selected={tab === 'guest'} className={tab === 'guest' ? 'is-on' : ''} onClick={() => setTab('guest')}>
                    Guest checkout
                  </button>
                  <button type="button" role="tab" aria-selected={tab === 'account'} className={tab === 'account' ? 'is-on' : ''} onClick={() => setTab('account')}>
                    Sign in
                  </button>
                </div>

                {tab === 'guest' ? (
                  <Glass variant="glass--pane" className="panel">
                    <span className="eyebrow eyebrow--plain">No account needed</span>
                    <h2 className="h3" style={{ marginTop: '.5rem' }}>Continue as a guest</h2>
                    <p className="muted" style={{ marginTop: '.7rem', maxWidth: '56ch' }}>
                      We will use this address for the confirmation, the dispatch note and nothing else. You can open a
                      register afterwards and your order will attach itself to it.
                    </p>

                    <form onSubmit={continueAsGuest} style={{ marginTop: '1.6rem' }} noValidate>
                      <Field
                        label="Email address"
                        name="guestEmail"
                        type="email"
                        value={guest.email}
                        onChange={(e) => { setGuest({ email: e.target.value }); setErrors({}); }}
                        error={errors.guest}
                        placeholder="you@example.com"
                        required
                        autoComplete="email"
                      />
                      <div style={{ marginTop: '1.1rem' }}>
                        <Check
                          label="Send me atelier notes and edition previews"
                          hint="Twice a month at most. Unsubscribe in one click."
                          checked={keepMe}
                          onChange={(e) => setKeepMe(e.target.checked)}
                        />
                      </div>
                      <button className="btn btn--gold btn--block btn--lg" style={{ marginTop: '1.6rem' }} type="submit" disabled={busy}>
                        <Sheen />Continue to shipping
                      </button>
                    </form>
                  </Glass>
                ) : (
                  <Glass variant="glass--pane" className="panel">
                    <span className="eyebrow eyebrow--plain">Faster next time</span>
                    <h2 className="h3" style={{ marginTop: '.5rem' }}>Sign in to your register</h2>
                    <form onSubmit={signIn} style={{ marginTop: '1.4rem' }} noValidate>
                      <Field
                        label="Email address"
                        name="email"
                        type="email"
                        value={creds.email}
                        onChange={(e) => { setCreds((c) => ({ ...c, email: e.target.value })); setErrors({}); }}
                        error={errors.email}
                        required
                        autoComplete="email"
                      />
                      <Field
                        label="Passphrase"
                        name="password"
                        type="password"
                        value={creds.password}
                        onChange={(e) => { setCreds((c) => ({ ...c, password: e.target.value })); setErrors({}); }}
                        error={errors.password}
                        required
                        autoComplete="current-password"
                      />
                      <button className="btn btn--gold btn--block btn--lg" style={{ marginTop: '1.4rem' }} type="submit" disabled={busy}>
                        <Sheen />Sign in and continue
                      </button>
                      <p className="field__hint" style={{ marginTop: '1rem', textAlign: 'center' }}>
                        No register yet? <Link className="link-gold" to="/account/auth?mode=create">Create one</Link>.
                      </p>
                    </form>
                  </Glass>
                )}
              </>
            )}

            <Glass variant="glass--soft" className="panel" style={{ marginTop: '1.4rem' }}>
              <div className="between wrap" style={{ gap: '1.4rem' }}>
                {[
                  ['lock', 'Encrypted end to end'],
                  ['shield', 'Cards never stored by us'],
                  ['truck', 'Insured, signature on delivery'],
                  ['refresh', 'Thirty days to return']
                ].map(([icon, label]) => (
                  <div className="center" key={label} style={{ gap: '.6rem' }}>
                    <span className="gold"><Icon name={icon} size={17} /></span>
                    <span className="tiny" style={{ textTransform: 'none', letterSpacing: '.03em' }}>{label}</span>
                  </div>
                ))}
              </div>
            </Glass>
          </div>

          <OrderSummary />
        </div>
      </section>
    </div>
  );
}
