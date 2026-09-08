/* =============================================================
   AURELIS MAISON — CATEGORIES DIRECTORY
   Room-by-room overview of all atelier houses.
   ============================================================= */
import { Link } from 'react-router-dom';
import { Breadcrumbs, Icon, PageHead, ProductArt, Reveal, SectionHead } from '../components/primitives';
import { useStore } from '../context/StoreContext';
import { dx, money } from '../lib/format';

export default function Categories() {
  const { categories } = useStore();
  const totalPieces = categories.reduce((n, c) => n + (c.count || 0), 0);

  return (
    <div className="shell">
      <Breadcrumbs trail={[{ label: 'SYS.ROOT', to: '/' }, { label: 'DISCIPLINES' }]} />

      <PageHead
        kicker="// DIRECTORY ARCHIVE 01 &middot; BENCH FACILITIES"
        title="ALL PRODUCTION DISCIPLINES"
        lede="Each discipline operates as an independent bench facility in Geneva with dedicated artisans, calibrated tooling, and raw material ledgers."
        aside={
          <div className="badge badge--green" style={{ padding: '8px 14px', fontSize: '0.72rem' }}>
            [ {totalPieces} SPECIMENS IN HOUSE LEDGER ]
          </div>
        }
      />

      {/* Categories Grid */}
      <section className="section section--tight" style={{ paddingTop: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '28px' }}>
          {categories.map((c, i) => (
            <Reveal key={c.slug} delay={(i % 3) + 1}>
              <div className="discipline-card" style={{ height: '100%' }}>
                <div className="discipline-card__top">
                  <span>DISCIPLINE 0{i + 1} // {c.slug.toUpperCase()}</span>
                  <span className="badge badge--green">[ {c.count} SPECIMENS ]</span>
                </div>
                <Link className="discipline-card__media" to={`/category/${c.slug}`}>
                  <ProductArt shape={c.shape} palette={c.palette} label={c.name} className="art--wide" />
                </Link>
                <div className="discipline-card__body">
                  <div>
                    <h3 className="discipline-card__title">
                      {dx(c.name)}
                    </h3>
                    <p className="discipline-card__desc">
                      {dx(c.blurb)}
                    </p>
                  </div>
                  <div className="between" style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--line)' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--pearl-3)' }}>
                      FROM {money(c.from)}
                    </span>
                    <Link className="btn btn--sm btn--gold" to={`/category/${c.slug}`}>
                      ACCESS DATABASE &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Advisory & Assistance */}
      <section className="section" style={{ borderTop: '1px solid var(--line)', marginTop: '48px' }}>
        <Reveal>
          <SectionHead
            kicker="Atelier Advisory"
            title="Guidance for discerning collectors"
            body="Whether acquiring a first piece or commissioning a bespoke setting, our concierges are available seven days a week."
          />
        </Reveal>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          <div className="trust-cell" style={{ background: 'var(--color-bone)', padding: '24px', borderRadius: 'var(--r-xs)', border: '1px solid var(--line)' }}>
            <div className="trust-cell__icon"><Icon name="chat" size={24} /></div>
            <div>
              <b>Private Concierge</b>
              <span>Direct guidance on sizing, diamond grading, and bespoke commissions via phone, WhatsApp, or email.</span>
              <div style={{ marginTop: '12px' }}>
                <Link className="btn btn--sm btn--outline" to="/help">Inquire Online</Link>
              </div>
            </div>
          </div>

          <div className="trust-cell" style={{ background: 'var(--color-bone)', padding: '24px', borderRadius: 'var(--r-xs)', border: '1px solid var(--line)' }}>
            <div className="trust-cell__icon"><Icon name="pin" size={24} /></div>
            <div>
              <b>Salon Appointments</b>
              <span>Book an after-hours private viewing in Geneva, London, Paris, Tokyo, or New York.</span>
              <div style={{ marginTop: '12px' }}>
                <Link className="btn btn--sm btn--outline" to="/stores">View Boutiques</Link>
              </div>
            </div>
          </div>

          <div className="trust-cell" style={{ background: 'var(--color-bone)', padding: '24px', borderRadius: 'var(--r-xs)', border: '1px solid var(--line)' }}>
            <div className="trust-cell__icon"><Icon name="crown" size={24} /></div>
            <div>
              <b>Le Cercle Membership</b>
              <span>First refusal on numbered pieces, lifetime complimentary maintenance, and atelier tours.</span>
              <div style={{ marginTop: '12px' }}>
                <Link className="btn btn--sm btn--outline" to="/membership">Membership Privileges</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
