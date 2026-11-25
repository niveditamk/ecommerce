/* =============================================================
   AURELIS MAISON // EDITORIAL LUXURY FLAGSHIP HOMEPAGE
   Modern Architectural Opulence & Quiet Luxury.
   Luminous Alabaster Ground, Serene Typography (Fraunces & Space Grotesk),
   Opulent Collection Showcases, and Geneva Atelier Provenance.
   ============================================================= */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon, ProductArt, Reveal, SectionHead } from '../components/primitives';
import { ProductGrid } from '../components/ProductCard';
import AtelierCard from '../components/AtelierCard';
import { useStore } from '../context/StoreContext';
import { useAsync } from '../lib/useAsync';
import api from '../lib/api';
import { dx, money } from '../lib/format';

const EXCELLENCE_PILLARS = [
  {
    icon: 'truck',
    title: 'White-Glove Insured Delivery',
    body: 'Complimentary, tamper-evident courier dispatch across India, fully insured to your doorstep.'
  },
  {
    icon: 'shield',
    title: 'Lifetime Atelier Care',
    body: 'Annual ultrasonic cleaning, movement calibration, and certified restoration by our master artisans.'
  },
  {
    icon: 'check',
    title: '30-Day Return Privilege',
    body: 'Complimentary courier collection with zero friction and seamless credit or bespoke exchange.'
  },
  {
    icon: 'sparkle',
    title: 'Geneva Assay Hallmark',
    body: 'Every specimen carries an assay stamp registered permanently in the central Maison archives.'
  }
];

const CRAFTSMANSHIP_PILLARS = [
  {
    kicker: 'METALLURGY',
    title: '100% Recycled 18k & Platinum',
    desc: 'Ethically sourced, precision-machined in Geneva, and finished with closed-back settings tuned for ambient luminosity.'
  },
  {
    kicker: 'CHRONOMETRY',
    title: '5-Position Regulated Movements',
    desc: 'Mechanical calibres tested over sixty days. Hand-beveled bridges, Côtes de Genève graining, and blued balance springs.'
  },
  {
    kicker: 'HAUTE PARFUMERIE',
    title: 'Grasse Botanical Extraits',
    desc: 'High-concentration rare essences aged in French oak casks before precision pouring into mouth-blown crystal flacons.'
  },
  {
    kicker: 'LEATHERCRAFT',
    title: '9-Month Pit-Tanned Grain',
    desc: 'Full-grain hides vegetable-tanned with natural mimosa bark, hand-cut, and saddle-stitched with waxed linen thread.'
  }
];

export default function Home() {
  const { categories } = useStore();
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);

  const featured = useAsync(() => api.products({ badge: 'Icon,Rare,Atelier', perPage: 8 }), []);
  const arrivals = useAsync(() => api.products({ sort: 'newest', perPage: 4 }), []);

  const catName = (slug) => dx(categories.find((c) => c.slug === slug)?.name || '');
  const heroPiece = featured.data?.items?.[0];

  const handleNewsletter = (e) => {
    e.preventDefault();
    if (!newsletterEmail) return;
    setNewsletterSubscribed(true);
  };

  return (
    <>
      {/* ============ 1. EDITORIAL LUXURY HERO ============ */}
      <section className="hero" aria-label="Aurelis Maison Introduction">
        <div className="hero-luxury">
          <Reveal className="hero-copy">
            <span className="eyebrow">
              Maison Gen&egrave;ve &middot; Est. 1911
            </span>
            <h1 className="hero-title">
              The Architecture of Rarity &amp; Timeless Craft.
            </h1>
            <p className="hero-desc">
              Handcrafted fine jewellery in recycled 18k gold, mechanical horology regulated across five positions, and artisanal leather goods created in limited bench editions in our Geneva ateliers.
            </p>
            <div className="hero-actions">
              <Link className="btn btn--primary" to="/categories">
                Explore Collections
              </Link>
              <Link className="btn btn--outline" to="/stores/gva">
                Discover the Atelier
              </Link>
            </div>
          </Reveal>

          <Reveal delay={1}>
            {heroPiece ? (
              <div className="hero-showcase">
                <Link
                  to={`/product/${heroPiece.id}`}
                  aria-label={`Featured Masterpiece: ${dx(heroPiece.name)}`}
                  style={{ display: 'block', textDecoration: 'none', width: '100%' }}
                >
                  <div style={{ aspectRatio: '1/1', width: '100%', maxHeight: '440px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ProductArt
                      id={heroPiece.id}
                      shape={heroPiece.shape}
                      palette={heroPiece.palette}
                      label={heroPiece.name}
                      glow
                    />
                  </div>
                  <div className="hero-showcase-caption">
                    <span className="eyebrow" style={{ fontSize: '0.7rem' }}>
                      {dx(heroPiece.sub || 'Maison Icon')}
                    </span>
                    <h2 className="h3" style={{ margin: '4px 0', fontSize: '1.4rem' }}>
                      {dx(heroPiece.name)}
                    </h2>
                    <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--pearl)', marginTop: '6px' }}>
                      {money(heroPiece.price)}
                    </div>
                  </div>
                </Link>
              </div>
            ) : (
              <div style={{ aspectRatio: '1/1', background: 'var(--color-bone)', borderRadius: 'var(--r-lg)' }} />
            )}
          </Reveal>
        </div>
      </section>

      {/* ============ 2. PILLARS OF MAISON EXCELLENCE ============ */}
      <section className="section" style={{ paddingTop: 0 }} aria-label="Maison Service Standards">
        <div className="shell">
          <Reveal>
            <div className="standards-grid">
              {EXCELLENCE_PILLARS.map((p) => (
                <div className="standard-card" key={p.title}>
                  <span style={{ color: 'var(--gold-text)' }}>
                    <Icon name={p.icon} size={22} />
                  </span>
                  <h3 className="standard-card__title">{p.title}</h3>
                  <p className="standard-card__body">{p.body}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ 3. CURATED DEPARTMENTS SHOWCASE ============ */}
      <section className="section" id="collections" aria-label="Curated Collections">
        <div className="shell">
          <Reveal>
            <SectionHead
              kicker="The Four Disciplines"
              title="Enduring craft across distinct métiers"
              body="Each department operates as an autonomous bench facility within our Geneva atelier, guided by master craftsmen."
              action={
                <Link className="btn btn--outline btn--sm" to="/categories">
                  View All Collections &rarr;
                </Link>
              }
            />
          </Reveal>

          <Reveal delay={1}>
            <div className="discipline-grid">
              {/* 01 Fine Jewellery */}
              <Link className="discipline-card" to="/category/jewellery" aria-label="Fine Jewellery Collection">
                <div className="discipline-card__media">
                  <ProductArt id="aur-101" shape="ring" palette="gold" label="Fine Jewellery" />
                </div>
                <div className="discipline-card__body">
                  <span className="eyebrow" style={{ fontSize: '0.68rem' }}>Métier 01</span>
                  <h3 className="discipline-card__title">Fine Jewellery</h3>
                  <p className="discipline-card__meta">
                    Hand-forged bands, step-cut gemstones, and solid platinum 950 bezels engineered in small numbered editions.
                  </p>
                </div>
              </Link>

              {/* 02 Horology */}
              <Link className="discipline-card" to="/category/horology" aria-label="Horology Collection">
                <div className="discipline-card__media">
                  <ProductArt id="aur-201" shape="watch" palette="platinum" label="Horology" />
                </div>
                <div className="discipline-card__body">
                  <span className="eyebrow" style={{ fontSize: '0.68rem' }}>Métier 02</span>
                  <h3 className="discipline-card__title">Horology</h3>
                  <p className="discipline-card__meta">
                    Mechanical calibres adjusted over sixty days across five positions with hand-beveled Côtes de Genève bridges.
                  </p>
                </div>
              </Link>

              {/* 03 Haute Parfumerie */}
              <Link className="discipline-card" to="/category/parfums" aria-label="Haute Parfumerie Collection">
                <div className="discipline-card__media">
                  <ProductArt id="aur-301" shape="flacon" palette="amber" label="Haute Parfumerie" />
                </div>
                <div className="discipline-card__body">
                  <span className="eyebrow" style={{ fontSize: '0.68rem' }}>Métier 03</span>
                  <h3 className="discipline-card__title">Haute Parfumerie</h3>
                  <p className="discipline-card__meta">
                    Rare extracts composed in Grasse, matured for eleven months in oak and sealed in mouth-blown crystal flacons.
                  </p>
                </div>
              </Link>

              {/* 04 Leather Goods */}
              <Link className="discipline-card" to="/category/leather" aria-label="Leather Goods Collection">
                <div className="discipline-card__media">
                  <ProductArt id="aur-401" shape="bag" palette="noir" label="Leather Goods" />
                </div>
                <div className="discipline-card__body">
                  <span className="eyebrow" style={{ fontSize: '0.68rem' }}>Métier 04</span>
                  <h3 className="discipline-card__title">Leathercraft</h3>
                  <p className="discipline-card__meta">
                    Full-grain hides vegetable-tanned with natural mimosa bark, hand-cut, and saddle-stitched by a single artisan.
                  </p>
                </div>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ 4. FEATURED PIECES FROM THE ATELIER ============ */}
      <section className="section" id="featured" aria-label="Featured Pieces">
        <div className="shell">
          <Reveal>
            <SectionHead
              kicker="Atelier Curations"
              title="Featured masterworks of the season"
              body="Numbered editions and house icons currently available for immediate white-glove dispatch."
              action={
                <Link className="btn btn--outline btn--sm" to="/categories">
                  Explore Full Catalogue &rarr;
                </Link>
              }
            />
          </Reveal>

          <Reveal delay={1}>
            {featured.loading ? (
              <div className="product-grid">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div className="card" key={i}>
                    <div style={{ aspectRatio: '1/1', background: 'var(--color-bone)' }} />
                  </div>
                ))}
              </div>
            ) : (
              <ProductGrid
                items={(featured.data?.items || []).slice(0, 8)}
                categoryLookup={catName}
              />
            )}
          </Reveal>
        </div>
      </section>

      {/* ============ 5. CRAFTSMANSHIP & ATELIER STORY ============ */}
      <section className="section" id="story" aria-label="The Atelier Story">
        <div className="shell">
          <Reveal>
            <div className="story-split">
              <AtelierCard />

              <div>
                <span className="eyebrow">
                  Geneva Atelier Provenance
                </span>
                <h2 className="h2" style={{ marginTop: '8px', fontSize: 'clamp(1.8rem, 3vw, 2.5rem)' }}>
                  A house founded on the deliberate philosophy of slowness.
                </h2>
                <p className="lede muted" style={{ marginTop: '16px', lineHeight: 1.7 }}>
                  We are fourteen artisans working on three floors along Rue du Rh&ocirc;ne. There is no automated conveyor belt. A piece is claimed by a single craftsman at the bench and remains in their hands until it is hallmarked, registered, and prepared for dispatch.
                </p>

                <blockquote className="story-split__quote">
                  &ldquo;We do not produce more by accelerating. We produce fewer pieces, and we make them flawlessly.&rdquo;
                </blockquote>

                <div className="story-split__sign" style={{ fontSize: '0.86rem', color: 'var(--pearl-2)' }}>
                  H&eacute;l&egrave;ne Marchand &middot; Directrice de l&rsquo;Atelier, Gen&egrave;ve
                </div>

                <div style={{ marginTop: '32px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <Link className="btn btn--outline" to="/stores/gva">
                    Visit Geneva Salon
                  </Link>
                  <Link className="btn btn--gold" to="/membership">
                    Collector Salon Access &rarr;
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ 6. MATERIALS & MASTERY ============ */}
      <section className="section" style={{ background: 'var(--color-bone)', borderBlock: '1px solid var(--line)' }} aria-label="Materials Deep Dive">
        <div className="shell">
          <Reveal>
            <SectionHead
              kicker="Material Provenance"
              title="Considered inputs, uncompromising standards"
              body="We work solely with noble substances that gain character, patina, and dignity through decades of wear."
            />
          </Reveal>

          <Reveal delay={1}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '32px', marginTop: '24px' }}>
              {CRAFTSMANSHIP_PILLARS.map((p) => (
                <div key={p.kicker} style={{ borderLeft: '2px solid var(--gold)', paddingLeft: '20px' }}>
                  <span className="eyebrow" style={{ fontSize: '0.72rem' }}>{p.kicker}</span>
                  <h4 className="h4" style={{ marginTop: '4px', fontSize: '1.05rem', color: 'var(--pearl)' }}>
                    {p.title}
                  </h4>
                  <p style={{ fontSize: '0.88rem', color: 'var(--pearl-2)', lineHeight: 1.6, marginTop: '8px' }}>
                    {p.desc}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ 7. NEW ARRIVALS ============ */}
      <section className="section" id="arrivals" aria-label="New Arrivals">
        <div className="shell">
          <Reveal>
            <SectionHead
              kicker="Fresh Additions"
              title="Recently completed at the bench"
              body="Completed this month by our watchmakers, jewellers, and leather craftsmen."
              action={
                <Link className="btn btn--outline btn--sm" to="/category/horology">
                  Discover Horology &rarr;
                </Link>
              }
            />
          </Reveal>

          <Reveal delay={1}>
            {arrivals.loading ? (
              <div className="product-grid">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div className="card" key={i}>
                    <div style={{ aspectRatio: '1/1', background: 'var(--color-bone)' }} />
                  </div>
                ))}
              </div>
            ) : (
              <ProductGrid
                items={(arrivals.data?.items || []).slice(0, 4)}
                categoryLookup={catName}
              />
            )}
          </Reveal>
        </div>
      </section>

      {/* ============ 8. PRIVATE CLIENT GAZETTE / NEWSLETTER ============ */}
      <section className="section section--tight" style={{ borderTop: '1px solid var(--line)' }} aria-label="Client Gazette">
        <div className="shell" style={{ maxWidth: '680px', textAlign: 'center' }}>
          <Reveal>
            <span className="eyebrow">The Aurelis Gazette</span>
            <h2 className="h2" style={{ marginTop: '8px', fontSize: '2.2rem' }}>
              Private invitations to limited numbered editions.
            </h2>
            <p className="muted" style={{ marginTop: '12px', fontSize: '0.96rem', lineHeight: 1.6 }}>
              Receive seasonal monographs, provenance dossiers, and priority access to numbered horology and jewellery completions before public release.
            </p>

            {newsletterSubscribed ? (
              <div className="badge badge--green" style={{ padding: '12px 24px', fontSize: '0.86rem', marginTop: '24px' }}>
                <Icon name="check" size={16} /> Thank you. Your invitation to the private salon has been recorded.
              </div>
            ) : (
              <form onSubmit={handleNewsletter} style={{ display: 'flex', gap: '12px', marginTop: '28px' }}>
                <input
                  type="email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                  style={{
                    flexGrow: 1,
                    padding: '12px 20px',
                    borderRadius: 'var(--r-pill)',
                    border: '1px solid var(--line-control)',
                    fontSize: '0.9rem',
                    fontFamily: 'var(--font-sans)',
                    background: '#FFFFFF'
                  }}
                />
                <button type="submit" className="btn btn--primary">
                  Subscribe
                </button>
              </form>
            )}
          </Reveal>
        </div>
      </section>
    </>
  );
}
