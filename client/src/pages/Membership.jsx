/* =============================================================
   AURELIS MAISON — LE CERCLE MEMBERSHIP
   Private patron register with tiers, benefits, and application.
   ============================================================= */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Accordion, Breadcrumbs, Check, Field, Icon, PageHead, ProductArt, Reveal, SectionHead
} from '../components/primitives';
import { useStore } from '../context/StoreContext';
import { dx } from '../lib/format';

const TIERS = [
  {
    name: 'Cercle',
    sub: 'On registration',
    lines: [
      'Order history and service register',
      'Saved addresses and tokenised cards',
      'Edition previews by private dispatch',
      'Standard concierge response within 24 hours'
    ]
  },
  {
    name: 'Cercle Or',
    sub: 'By invitation, after a first commission',
    lines: [
      'Everything in Cercle',
      '48-hour first refusal on numbered atelier editions',
      'Lifetime servicing, assay checks, and re-polishing at no charge',
      'Dedicated concierge with a direct Geneva line',
      'After-hours private salon in any global boutique'
    ],
    featured: true
  },
  {
    name: 'Cercle Noir',
    sub: 'Capped at two hundred patrons worldwide',
    lines: [
      'Everything in Cercle Or',
      'Annual bespoke commission credit',
      'Geneva Atelier residency invitation each spring',
      'Full access to the private vault and unlisted archive pieces',
      'Guaranteed right of first refusal on buy-backs'
    ]
  }
];

const FAQ = [
  {
    title: 'Is there a membership fee?',
    body: <p>No. Membership is complimentary. It is capped strictly because a single concierge can only look after a limited number of collectors with genuine care.</p>
  },
  {
    title: 'How are applications evaluated?',
    body: <p>By atelier capacity, not simply by spend. We review applications weekly and answer every collector in person.</p>
  },
  {
    title: 'Can membership status lapse?',
    body: <p>Cercle and Cercle Or memberships do not lapse. Cercle Noir is reviewed annually due to the worldwide cap of 200 members.</p>
  },
  {
    title: 'How is client privacy maintained?',
    body: <p>Discretion is absolute. We do not sell data or share client information with advertising networks. Your collector registry remains sealed.</p>
  }
];

export default function Membership() {
  const { content, session, toast } = useStore();
  const [form, setForm] = useState({ email: session.user?.email || '', name: '', city: '', note: '' });
  const [accept, setAccept] = useState(false);
  const [sent, setSent] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) {
      toast('Enter a valid email address.', 'close');
      return;
    }
    if (!form.name.trim()) {
      toast('Please provide your name.', 'close');
      return;
    }
    if (!accept) {
      toast('Please accept the terms to apply.', 'close');
      return;
    }
    setSent(true);
    toast('Application received. A concierge will respond in person.', 'crown');
  };

  return (
    <div className="shell">
      <Breadcrumbs trail={[{ label: 'Home', to: '/' }, { label: 'Le Cercle' }]} />

      <PageHead
        kicker="By Application &middot; Capped"
        title="Le Cercle"
        lede="A private register of collectors who see numbered editions before anyone else, and whose pieces are cared for indefinitely."
      />

      {/* Main Feature / Keycard Showcase */}
      <section className="section" style={{ paddingTop: 0 }}>
        <Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '48px', alignItems: 'center', background: 'var(--color-bone)', padding: '48px', borderRadius: 'var(--r-xs)', border: '1px solid var(--line)' }}>
            <div>
              <span className="eyebrow">Patron Privileges</span>
              <h2 className="h2" style={{ marginTop: '8px' }}>Essential benefits of the register</h2>
              <ul style={{ display: 'grid', gap: '12px', marginTop: '20px' }}>
                {(content?.memberPerks || []).map((p) => (
                  <li key={p} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '14px', color: 'var(--pearl-2)' }}>
                    <span style={{ color: 'var(--gold-text)', marginTop: '2px' }}><Icon name="check" size={16} /></span>
                    <span>{dx(p)}</span>
                  </li>
                ))}
              </ul>
              <p className="tiny" style={{ marginTop: '24px', textTransform: 'none', color: 'var(--pearl-3)' }}>
                Membership is not a loyalty points scheme. There are no points, and privileges never expire.
              </p>
            </div>

            {/* Simulated Luxury Member Keycard */}
            <div className="keycard">
              <div className="between">
                <span className="keycard__chip" />
                <span className="badge badge--gold">Cercle Or</span>
              </div>
              <div className="keycard__no">
                {session.user ? session.user.memberNo.replace('C-', '0') : '0114'} &middot; 8823 &middot; 0091
              </div>
              <div className="between" style={{ fontSize: '12px', opacity: 0.85 }}>
                <div>
                  <span className="tiny" style={{ color: 'rgba(250,248,245,0.6)' }}>Collector</span>
                  <div style={{ fontWeight: 500 }}>{session.user ? `${session.user.first} ${session.user.last}` : 'Private Member'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="tiny" style={{ color: 'rgba(250,248,245,0.6)' }}>Maison</span>
                  <div style={{ fontFamily: 'var(--serif)', letterSpacing: '0.1em' }}>AURELIS &middot; 1911</div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Three Tiers Overview */}
      <section className="section" style={{ paddingTop: 0 }}>
        <Reveal>
          <SectionHead kicker="Three Registers" title="How Le Cercle is structured" />
        </Reveal>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          {TIERS.map((t, i) => (
            <Reveal key={t.name} delay={i + 1}>
              <div
                style={{
                  background: t.featured ? 'var(--color-paper-light)' : 'var(--color-bone)',
                  border: t.featured ? '2px solid var(--gold)' : '1px solid var(--line)',
                  borderRadius: 'var(--r-xs)',
                  padding: '32px',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div className="between" style={{ marginBottom: '8px' }}>
                    <h3 className="h3" style={{ fontFamily: 'var(--serif)', fontSize: '24px' }}>{t.name}</h3>
                    {t.featured && <span className="badge badge--gold">Most Held</span>}
                  </div>
                  <div className="tiny" style={{ color: 'var(--pearl-3)', textTransform: 'none' }}>{t.sub}</div>

                  <ul style={{ display: 'grid', gap: '10px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--line-2)' }}>
                    {t.lines.map((l) => (
                      <li key={l} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: 'var(--pearl-2)' }}>
                        <span style={{ color: 'var(--gold-text)' }}>{'✓'}</span>
                        <span>{l}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Application & Atelier FAQ */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '48px', alignItems: 'start' }}>
          {/* Form */}
          <div style={{ background: 'var(--color-paper-light)', border: '1px solid var(--line)', borderRadius: 'var(--r-xs)', padding: '36px' }}>
            <span className="eyebrow">Register Application</span>
            <h2 className="h2" style={{ marginTop: '8px' }}>Apply for Consideration</h2>
            <p className="muted" style={{ marginTop: '8px', fontSize: '14px' }}>
              Applications are reviewed weekly in Geneva. If current capacity is reached, we will notify you and hold your place.
            </p>

            {sent ? (
              <div style={{ marginTop: '24px', padding: '24px', background: 'var(--color-bone)', borderRadius: 'var(--r-xs)', border: '1px solid var(--line-gold)', display: 'flex', gap: '16px', alignItems: 'center' }}>
                <span style={{ color: 'var(--gold-text)' }}><Icon name="crown" size={32} /></span>
                <div>
                  <h4 className="h4">Application Received</h4>
                  <p style={{ fontSize: '13px', color: 'var(--pearl-3)', marginTop: '4px' }}>
                    An atelier concierge will contact you at {form.email} within 48 hours.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} style={{ marginTop: '24px' }} noValidate>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <Field label="Full Name" name="name" value={form.name} onChange={set('name')} required />
                  <Field label="City &amp; Country" name="city" value={form.city} onChange={set('city')} placeholder="e.g. Geneva, London" />
                </div>
                <Field label="Email Address" name="email" type="email" value={form.email} onChange={set('email')} required autoComplete="email" />
                <Field
                  label="Interests &amp; Collection Preferences"
                  name="note"
                  type="textarea"
                  value={form.note}
                  onChange={set('note')}
                  placeholder="Tell us about the disciplines you follow (e.g. mechanical calibres, rare parfums, bespoke jewellery)."
                />
                <div style={{ marginTop: '16px' }}>
                  <Check
                    label="I accept the Terms of Confidentiality and Client Care policy"
                    checked={accept}
                    onChange={(e) => setAccept(e.target.checked)}
                  />
                </div>
                <button className="btn btn--gold btn--block" style={{ marginTop: '24px' }} type="submit">
                  Submit Application
                </button>
              </form>
            )}
          </div>

          {/* Boutique Visiting & FAQ */}
          <div>
            <div style={{ background: 'var(--color-bone)', borderRadius: 'var(--r-xs)', border: '1px solid var(--line)', overflow: 'hidden' }}>
              <ProductArt shape="boutique" palette="gold" label="Geneva Salon" className="art--wide" />
              <div style={{ padding: '24px' }}>
                <span className="eyebrow">Geneva Atelier</span>
                <h3 className="h4" style={{ marginTop: '4px', fontFamily: 'var(--serif)', fontSize: '18px' }}>
                  Patrons are welcome at the bench
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--pearl-3)', marginTop: '8px', lineHeight: 1.6 }}>
                  The third floor of Rue du Rhône has been a working atelier since 1911. Members may arrange private bench visits.
                </p>
                <Link className="btn btn--sm btn--outline" style={{ marginTop: '16px' }} to="/stores/gva">
                  Geneva Boutique Details
                </Link>
              </div>
            </div>

            <div style={{ marginTop: '24px', background: 'var(--color-paper-light)', border: '1px solid var(--line)', borderRadius: 'var(--r-xs)', padding: '24px' }}>
              <h3 className="h4" style={{ fontFamily: 'var(--serif)', fontSize: '18px', marginBottom: '12px' }}>
                Frequently Answered Questions
              </h3>
              <Accordion items={FAQ} openFirst />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
