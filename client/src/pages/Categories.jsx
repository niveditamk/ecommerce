/* =============================================================
   AURELIS MAISON // COLLECTIONS DIRECTORY
   Curated overview of all atelier métiers & collections.
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
      <Breadcrumbs trail={[{ label: 'Home', to: '/' }, { label: 'Collections' }]} />

      <PageHead
        kicker="Maison Metiers &middot; Geneva Ateliers"
        title="All Maison Collections"
        lede="Each collection is created in dedicated bench ateliers in Geneva with master artisans, ethical noble metals, and regulated chronometric mechanisms."
        aside={
          <div className="badge badge--green" style={{ padding: '8px 16px', fontSize: '0.78rem' }}>
            {totalPieces} Creations in Catalogue
          </div>
        }
      />

      {/* Categories Grid */}
      <section className="section section--tight" style={{ paddingTop: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '32px' }}>
          {categories.map((c, i) => (
            <Reveal key={c.slug} delay={(i % 3) + 1}>
              <div className="discipline-card" style={{ height: '100%' }}>
                <Link className="discipline-card__media" to={`/category/${c.slug}`} aria-label={dx(c.name)}>
                  <ProductArt shape={c.shape} palette={c.palette} label={c.name} />
                </Link>
                <div className="discipline-card__body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span className="eyebrow" style={{ fontSize: '0.7rem', margin: 0 }}>
                      M&eacute;tier 0{i + 1}
                    </span>
                    <span className="badge badge--green" style={{ fontSize: '0.68rem' }}>
                      {c.count} Pieces
                    </span>
                  </div>
                  <div>
                    <h3 className="discipline-card__title">
                      {dx(c.name)}
                    </h3>
                    <p className="discipline-card__meta">
                      {dx(c.blurb)}
                    </p>
                  </div>
                  <div className="between" style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--line)', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.86rem', color: 'var(--pearl-2)', fontWeight: 600 }}>
                      From {money(c.from)}
                    </span>
                    <Link className="btn btn--sm btn--primary" to={`/category/${c.slug}`}>
                      Explore Collection &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Advisory & Assistance */}
      <section className="section" style={{ borderTop: '1px solid var(--line)', marginTop: '64px' }}>
        <Reveal>
          <SectionHead
            kicker="Atelier Advisory"
            title="Guidance for discerning collectors"
            body="Whether acquiring a first piece or commissioning a bespoke setting, our concierges are available seven days a week across India and worldwide."
          />
        </Reveal>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginTop: '32px' }}>
          <div style={{ background: '#FFFFFF', padding: '32px', borderRadius: 'var(--r-md)', border: '1px solid var(--line)', boxShadow: 'var(--sh-1)' }}>
            <div style={{ color: 'var(--gold-text)', marginBottom: '16px' }}><Icon name="chat" size={26} /></div>
            <div>
              <h4 className="h4" style={{ fontSize: '1.1rem' }}>Private Concierge</h4>
              <p style={{ fontSize: '0.88rem', color: 'var(--pearl-3)', marginTop: '8px', lineHeight: 1.6 }}>
                Direct consultation on sizing, diamond grading, and bespoke commissions via phone, WhatsApp, or email.
              </p>
              <div style={{ marginTop: '20px' }}>
                <Link className="btn btn--sm btn--outline" to="/help">Inquire Online</Link>
              </div>
            </div>
          </div>

          <div style={{ background: '#FFFFFF', padding: '32px', borderRadius: 'var(--r-md)', border: '1px solid var(--line)', boxShadow: 'var(--sh-1)' }}>
            <div style={{ color: 'var(--gold-text)', marginBottom: '16px' }}><Icon name="pin" size={26} /></div>
            <div>
              <h4 className="h4" style={{ fontSize: '1.1rem' }}>Salon Appointments</h4>
              <p style={{ fontSize: '0.88rem', color: 'var(--pearl-3)', marginTop: '8px', lineHeight: 1.6 }}>
                Book an after-hours private viewing at our salons in Geneva, London, Paris, Mumbai, or New Delhi.
              </p>
              <div style={{ marginTop: '20px' }}>
                <Link className="btn btn--sm btn--outline" to="/stores">View Salons</Link>
              </div>
            </div>
          </div>

          <div style={{ background: '#FFFFFF', padding: '32px', borderRadius: 'var(--r-md)', border: '1px solid var(--line)', boxShadow: 'var(--sh-1)' }}>
            <div style={{ color: 'var(--gold-text)', marginBottom: '16px' }}><Icon name="shield" size={26} /></div>
            <div>
              <h4 className="h4" style={{ fontSize: '1.1rem' }}>Valuation &amp; Archive</h4>
              <p style={{ fontSize: '0.88rem', color: 'var(--pearl-3)', marginTop: '8px', lineHeight: 1.6 }}>
                Every numbered piece is permanently registered in the Geneva central ledger with an assay certificate.
              </p>
              <div style={{ marginTop: '20px' }}>
                <Link className="btn btn--sm btn--outline" to="/membership">Discover Provenance</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
