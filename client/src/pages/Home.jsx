/* =============================================================
   AURELIS MAISON — RETRO-FUTURISTIC COMMERCE TERMINAL
   Precision shopping terminal designed in an alternate 1980s.
   Hardware telemetry, protocol standards, CAD discipline showcases,
   specimen ledgers, material matrices, and terminal dispatch.
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

const TRUST_STANDARDS = [
  {
    code: 'ESCROW',
    title: 'SECURE ESCROW TRANSIT',
    body: 'Complimentary tamper-evident delivery, tracked, encrypted, and fully insured to destination.'
  },
  {
    code: 'CALIBRATION',
    title: 'LIFETIME CALIBRATION',
    body: 'Annual precision inspection, ultrasonic restoration, and certified recalibration.'
  },
  {
    code: 'RETURNS',
    title: '30-DAY REVERSAL',
    body: 'Direct courier retrieval with zero friction, backed by automated ledger credit.'
  },
  {
    code: 'HALLMARK',
    title: 'MAKER\'S ASSAY SEAL',
    body: 'Every specimen carries a unique hallmarked assay punch registered in the central system.'
  }
];

const CRAFTSMANSHIP_PILLARS = [
  {
    kicker: 'METALLURGY',
    title: 'Recycled 18k & Platinum 950',
    desc: 'Ethically sourced, precision-machined in Geneva, and finished with closed-back bezel settings calibrated for ambient light.'
  },
  {
    kicker: 'MECHANISMS',
    title: 'Regulated Mechanical Calibres',
    desc: 'Calibre 8000 movements adjusted across 5 positions over sixty days. Hand-beveled bridges, Côtes de Genève, and blued balance springs.'
  },
  {
    kicker: 'MOLECULES',
    title: 'Grasse Extraits Rares',
    desc: 'High-concentration botanical extraits aged in French oak casks before precision bottling into mouth-blown crystal flacons.'
  },
  {
    kicker: 'MATERIALITY',
    title: '9-Month Pit-Tanned Leather',
    desc: 'Full-grain hides vegetable-tanned with mimosa bark, hand-cut, and saddle-stitched with waxed linen thread.'
  }
];

const BAND_TERMS = [
  'SYS.STATUS // OPTIMAL',
  'GENEVA NODE 1980.2026',
  'CALIBRE 5-POS REGULATED',
  'NUMBERED EDITIONS',
  'RECYCLED 18K GOLD & PLATINUM',
  '9-MONTH PIT-TANNED GRAIN',
  '256-BIT ESCROW SECURITY',
  'GRASSE BOTANICAL EXTRAITS'
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
      {/* ============ 1. TERMINAL HERO ============ */}
      <section className="hero hero--terminal" aria-label="Terminal Catalogue Introduction">
        <div className="shell">
          <div className="terminal-telemetry-bar" aria-label="System Telemetry">
            <div className="telemetry-item">
              <span className="badge badge--green">[ SYS.ONLINE ]</span>
              <span>NODE // GVA-8086</span>
            </div>
            <div className="telemetry-item">
              <span>LATENCY: 14MS</span>
              <span style={{ opacity: 0.3 }}>|</span>
              <span>BAUD: 9600</span>
            </div>
            <div className="telemetry-item">
              <span>IN THE CATALOGUE: 140 PIECES</span>
            </div>
            <div className="telemetry-item">
              <span>DISPATCH: ALL REGIONS AVAILABLE</span>
            </div>
          </div>

          <div className="hero__grid">
            <Reveal className="hero__copy">
              <span className="eyebrow" style={{ color: 'var(--color-terminal-green-text)', fontWeight: 700 }}>
                Geneva &middot; est. 1911
              </span>
              <h1 className="hero__title" style={{ fontFamily: 'var(--font-grotesk)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
                The next generation of everyday objects.
              </h1>
              <p className="hero__lede">
                High-precision mechanical timepieces, hallmarked metallurgical jewellery, and rare molecular extraits. Bench-fabricated in numbered series by master artisans on Rue du Rh&ocirc;ne.
              </p>
              <div className="hero__actions">
                <Link className="btn btn--gold" to="/categories">
                  Explore the catalogue
                </Link>
                <Link className="btn btn--outline" to="/stores/gva">
                  Atelier Directory
                </Link>
              </div>
            </Reveal>

            <Reveal delay={1} className="hero__media">
              {heroPiece ? (
                <div className="hero-chassis">
                  <div className="hero-chassis__bracket hero-chassis__bracket--tl" aria-hidden="true" />
                  <div className="hero-chassis__bracket hero-chassis__bracket--tr" aria-hidden="true" />
                  <div className="hero-chassis__bracket hero-chassis__bracket--bl" aria-hidden="true" />
                  <div className="hero-chassis__bracket hero-chassis__bracket--br" aria-hidden="true" />

                  <Link
                    to={`/product/${heroPiece.id}`}
                    aria-label={`Featured Specimen: ${dx(heroPiece.name)}`}
                    style={{ display: 'block', textDecoration: 'none' }}
                  >
                    <div className="hero-chassis__media">
                      <ProductArt
                        id={heroPiece.id}
                        shape={heroPiece.shape}
                        palette={heroPiece.palette}
                        label={heroPiece.name}
                        glow
                      />
                    </div>
                    <div className="hero-terminal-caption">
                      <div>
                        <div className="hero-terminal-caption__sub">
                          {dx(heroPiece.sub || 'Featured')}
                        </div>
                        <div className="hero-terminal-caption__title">
                          {dx(heroPiece.name)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="hero-terminal-caption__price">
                          {money(heroPiece.price)}
                        </div>
                        <span className="badge badge--green" style={{ fontSize: '0.6rem', marginTop: 4 }}>
                          IN STOCK
                        </span>
                      </div>
                    </div>
                  </Link>
                </div>
              ) : (
                <div
                  style={{
                    aspectRatio: '16/10',
                    background: 'var(--color-bone)',
                    border: '1px solid var(--line)'
                  }}
                />
              )}
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============ 2. PROTOCOL SERVICE STANDARDS ============ */}
      <section className="section section--tight" aria-label="System Service Protocols">
        <div className="shell">
          <Reveal>
            <div className="protocol-grid">
              {TRUST_STANDARDS.map((t) => (
                <div className="protocol-card" key={t.code}>
                  <div className="protocol-card__header">
                    <span>{t.code}</span>
                    <span style={{ fontSize: '0.62rem', color: 'var(--pearl-3)' }}>[ VERIFIED ]</span>
                  </div>
                  <h3 className="protocol-card__title">{t.title}</h3>
                  <p className="protocol-card__body">{t.body}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ 3. CURATED DISCIPLINE SHOWCASE ============ */}
      <section className="section" id="collections" aria-label="Curated Disciplines">
        <div className="shell">
          <Reveal>
            <SectionHead
              kicker="// DIRECTORY 01 &mdash; PRODUCTION DISCIPLINES"
              title="Four disciplines of singular craft"
              body="Each department operates as an autonomous bench facility within our Geneva atelier. Zero mass fabrication."
              action={
                <Link className="btn btn--outline btn--sm" to="/categories">
                  All Disciplines [ 04 ] &rarr;
                </Link>
              }
            />
          </Reveal>

          <Reveal delay={1}>
            <div className="discipline-grid">
              <div className="discipline-card">
                <div className="discipline-card__top">
                  <span>DISCIPLINE 01 // JEWELLERY</span>
                  <span className="badge badge--green">[ ACTIVE ]</span>
                </div>
                <Link className="discipline-card__media" to="/category/jewellery" aria-label="Browse Fine Jewellery">
                  <ProductArt id="aur-101" shape="ring" palette="gold" label="Fine Jewellery" className="art--wide" />
                </Link>
                <div className="discipline-card__body">
                  <div>
                    <h3 className="discipline-card__title">Metallurgy &amp; Gemstone Settings</h3>
                    <p className="discipline-card__desc">
                      Hand-forged bands, step-cut Zambian citrines, and solid platinum 950 bezels engineered in small numbered batches.
                    </p>
                  </div>
                  <Link className="btn btn--sm btn--outline" to="/category/jewellery">
                    Access Jewellery Database &rarr;
                  </Link>
                </div>
              </div>

              <div className="discipline-card">
                <div className="discipline-card__top">
                  <span>DISCIPLINE 02 // HOROLOGY</span>
                  <span className="badge badge--green">[ ACTIVE ]</span>
                </div>
                <Link className="discipline-card__media" to="/category/horology" aria-label="Browse Horology">
                  <ProductArt id="aur-201" shape="watch" palette="platinum" label="Horology" className="art--wide" />
                </Link>
                <div className="discipline-card__body">
                  <div>
                    <h3 className="discipline-card__title">Regulated Mechanical Calibres</h3>
                    <p className="discipline-card__desc">
                      Movements adjusted over sixty days across five positions. Hand-beveled Côtes de Genève bridges and enamel dials.
                    </p>
                  </div>
                  <Link className="btn btn--sm btn--outline" to="/category/horology">
                    Access Horology Database &rarr;
                  </Link>
                </div>
              </div>

              <div className="discipline-card">
                <div className="discipline-card__top">
                  <span>DISCIPLINE 03 // PARFUMS</span>
                  <span className="badge badge--green">[ ACTIVE ]</span>
                </div>
                <Link className="discipline-card__media" to="/category/parfums" aria-label="Browse Parfums">
                  <ProductArt id="aur-301" shape="flacon" palette="amber" label="Parfums Rares" className="art--wide" />
                </Link>
                <div className="discipline-card__body">
                  <div>
                    <h3 className="discipline-card__title">Molecular Extraits Rares</h3>
                    <p className="discipline-card__desc">
                      High concentrations composed in Grasse, matured for eleven months in oak and sealed in mouth-blown flacons.
                    </p>
                  </div>
                  <Link className="btn btn--sm btn--outline" to="/category/parfums">
                    Access Parfums Database &rarr;
                  </Link>
                </div>
              </div>

              <div className="discipline-card">
                <div className="discipline-card__top">
                  <span>DISCIPLINE 04 // LEATHER</span>
                  <span className="badge badge--green">[ ACTIVE ]</span>
                </div>
                <Link className="discipline-card__media" to="/category/leather" aria-label="Browse Leather Atelier">
                  <ProductArt id="aur-401" shape="bag" palette="noir" label="Leather Atelier" className="art--wide" />
                </Link>
                <div className="discipline-card__body">
                  <div>
                    <h3 className="discipline-card__title">Full-Grain Pit-Tanned Hides</h3>
                    <p className="discipline-card__desc">
                      Vegetable-tanned for nine months with natural mimosa bark. Hand-cut and saddle-stitched by a single artisan.
                    </p>
                  </div>
                  <Link className="btn btn--sm btn--outline" to="/category/leather">
                    Access Leather Database &rarr;
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ 4. FEATURED SPECIMENS GRID ============ */}
      <section className="section" id="featured" aria-label="Featured Specimens">
        <div className="shell">
          <Reveal>
            <SectionHead
              kicker="Recently finished"
              title="Featured pieces from the atelier"
              body="Numbered editions, house icons, and recent completions. Every specimen shown is currently verified and available for dispatch."
              action={
                <Link className="btn btn--outline btn--sm" to="/categories">
                  Full Catalogue Ledger &rarr;
                </Link>
              }
            />
          </Reveal>

          <Reveal delay={1}>
            {featured.loading ? (
              <div className="card-grid">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div className="card" key={i}>
                    <div style={{ aspectRatio: '3/4', background: 'var(--color-bone)' }} />
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

      {/* ============ 5. MARQUEE BAND ============ */}
      <div className="band" aria-hidden="true">
        <div className="band__track">
          {[0, 1, 2].map((pass) =>
            BAND_TERMS.map((word) => (
              <span key={`${pass}-${word}`}>
                {word} <i>&middot;</i>
              </span>
            ))
          )}
        </div>
      </div>

      {/* ============ 6. CRAFTSMANSHIP & ATELIER STORY ============ */}
      <section className="section" id="story" aria-label="The Atelier Story">
        <div className="shell">
          <Reveal>
            <div className="story-split">
              <AtelierCard />

              <div>
                <span className="eyebrow" style={{ color: 'var(--color-terminal-green-text)', fontWeight: 700 }}>
                  // DOSSIER &middot; GENEVA ATELIER
                </span>
                <h2 className="h2" style={{ marginTop: '8px', fontFamily: 'var(--font-grotesk)', fontWeight: 700, textTransform: 'uppercase' }}>
                  A house built on the slowest possible methods.
                </h2>
                <p className="lede muted" style={{ marginTop: '16px' }}>
                  We are fourteen makers on three floors of Rue du Rh&ocirc;ne. There is no automated assembly line. A piece is claimed by one artisan at the bench and remains with them until it is hallmarked, indexed, and boxed.
                </p>

                <blockquote className="story-split__quote" style={{ fontFamily: 'var(--font-grotesk)', borderLeft: '2px solid var(--color-terminal-green)' }}>
                  &ldquo;We do not make more by working faster. We make fewer, and we make them properly.&rdquo;
                </blockquote>

                <div className="story-split__sign" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                  H&eacute;l&egrave;ne Marchand &middot; Directrice de l&rsquo;Atelier // GVA-8086
                </div>

                <div style={{ marginTop: '32px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <Link className="btn btn--outline" to="/stores/gva">
                    Visit the Geneva Salon
                  </Link>
                  <Link className="btn btn--gold" to="/membership">
                    Access Le Cercle &rarr;
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ 7. MATERIALS & MASTERY PILLARS ============ */}
      <section className="section section--tight" style={{ background: 'var(--color-bone)', borderBlock: '1px solid var(--line)' }} aria-label="Materials Deep Dive">
        <div className="shell">
          <Reveal>
            <SectionHead
              kicker="// SPECIFICATION MATRIX"
              title="Considered inputs, uncompromising standards"
              body="We only work with materials that develop dignity and character through decades of everyday wear."
            />
          </Reveal>

          <Reveal delay={1}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '32px' }}>
              {CRAFTSMANSHIP_PILLARS.map((p) => (
                <div key={p.kicker} style={{ borderLeft: '2px solid var(--color-terminal-green)', paddingLeft: '20px' }}>
                  <span className="eyebrow" style={{ fontSize: '10px', color: 'var(--color-terminal-green-text)', fontWeight: 700 }}>{p.kicker}</span>
                  <h4 className="h4" style={{ marginTop: '4px', fontFamily: 'var(--font-grotesk)', fontSize: '18px', fontWeight: 700, textTransform: 'uppercase' }}>
                    {p.title}
                  </h4>
                  <p style={{ fontSize: '14px', color: 'var(--pearl-2)', lineHeight: 1.6, marginTop: '8px' }}>
                    {p.desc}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ 8. NEW ARRIVALS & NUMBERED EDITIONS ============ */}
      <section className="section" id="arrivals" aria-label="New Arrivals">
        <div className="shell">
          <Reveal>
            <SectionHead
              kicker="// ARCHIVE 03 &mdash; FRESH COMPLETIONS"
              title="Recent numbered additions"
              body="Completed this month by our watchmakers, jewellers, and leather craftsmen."
              action={
                <Link className="btn btn--outline btn--sm" to="/category/horology">
                  Discover Horology [ 02 ] &rarr;
                </Link>
              }
            />
          </Reveal>

          <Reveal delay={1}>
            {arrivals.loading ? (
              <div className="card-grid">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div className="card" key={i}>
                    <div style={{ aspectRatio: '3/4', background: 'var(--color-bone)' }} />
                  </div>
                ))}
              </div>
            ) : (
              <ProductGrid
                items={arrivals.data?.items || []}
                categoryLookup={catName}
              />
            )}
          </Reveal>
        </div>
      </section>

      {/* ============ 9. THE JOURNAL & STORIES ============ */}
      <section className="section" id="journal" aria-label="The Journal">
        <div className="shell">
          <Reveal>
            <SectionHead
              kicker="// DISPATCH ARCHIVE &mdash; ESSAYS"
              title="Atelier dispatches &amp; design essays"
              body="Observations on horology, rare materials, and the artisans who shape them."
            />
          </Reveal>

          <Reveal delay={1}>
            <div className="journal-grid">
              <article className="journal-card" style={{ border: '1px solid var(--line)', background: 'var(--color-paper-light)', borderRadius: 'var(--r-xs)', overflow: 'hidden' }}>
                <div className="journal-card__media">
                  <ProductArt shape="atelier" palette="platinum" label="The 5-Position Regulation" className="art--wide" />
                </div>
                <div style={{ padding: '16px' }}>
                  <div className="journal-card__meta" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--color-terminal-green-text)', fontWeight: 700 }}>
                    <span>HOROLOGY // CALIBRE 8000</span> &middot; <span>6 MIN READ</span>
                  </div>
                  <h3 className="journal-card__title" style={{ fontFamily: 'var(--font-grotesk)', fontWeight: 700, fontSize: '1.05rem', textTransform: 'uppercase', marginTop: '6px' }}>
                    The Art of the Calibre: Sixty Days on the Regulating Bench
                  </h3>
                  <p className="journal-card__excerpt" style={{ fontSize: '0.85rem', color: 'var(--pearl-2)', marginTop: '6px', lineHeight: 1.5 }}>
                    Why mechanical calibres must experience fifty-degree temperature swings before they are permitted to leave the testing room.
                  </p>
                </div>
              </article>

              <article className="journal-card" style={{ border: '1px solid var(--line)', background: 'var(--color-paper-light)', borderRadius: 'var(--r-xs)', overflow: 'hidden' }}>
                <div className="journal-card__media">
                  <ProductArt shape="flacon" palette="amber" label="Grasse at Sunrise" className="art--wide" />
                </div>
                <div style={{ padding: '16px' }}>
                  <div className="journal-card__meta" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--color-terminal-green-text)', fontWeight: 700 }}>
                    <span>PARFUMERIE // BOTANICAL</span> &middot; <span>4 MIN READ</span>
                  </div>
                  <h3 className="journal-card__title" style={{ fontFamily: 'var(--font-grotesk)', fontWeight: 700, fontSize: '1.05rem', textTransform: 'uppercase', marginTop: '6px' }}>
                    Grasse at Sunrise: Harvesting the Centifolia Rose
                  </h3>
                  <p className="journal-card__excerpt" style={{ fontSize: '0.85rem', color: 'var(--pearl-2)', marginTop: '6px', lineHeight: 1.5 }}>
                    How three hundred kilograms of morning petals yield a single ounce of absolute for our rare flacons.
                  </p>
                </div>
              </article>

              <article className="journal-card" style={{ border: '1px solid var(--line)', background: 'var(--color-paper-light)', borderRadius: 'var(--r-xs)', overflow: 'hidden' }}>
                <div className="journal-card__media">
                  <ProductArt shape="bag" palette="noir" label="Nine Months in Bark" className="art--wide" />
                </div>
                <div style={{ padding: '16px' }}>
                  <div className="journal-card__meta" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--color-terminal-green-text)', fontWeight: 700 }}>
                    <span>LEATHER // BOTANICAL TANNED</span> &middot; <span>5 MIN READ</span>
                  </div>
                  <h3 className="journal-card__title" style={{ fontFamily: 'var(--font-grotesk)', fontWeight: 700, fontSize: '1.05rem', textTransform: 'uppercase', marginTop: '6px' }}>
                    Nine Months in Oak Bark: The Chemistry of Patience
                  </h3>
                  <p className="journal-card__excerpt" style={{ fontSize: '0.85rem', color: 'var(--pearl-2)', marginTop: '6px', lineHeight: 1.5 }}>
                    Modern tanneries use chromium in twenty-four hours. We choose mimosa and chestnut vats that rest for nearly a year.
                  </p>
                </div>
              </article>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ 10. TERMINAL DISPATCH SUBSCRIPTION ============ */}
      <section className="section" aria-label="Terminal Dispatch">
        <div className="shell">
          <Reveal>
            <div className="dispatch-terminal">
              <div className="dispatch-terminal__header">
                <span>[ TERMINAL DISPATCH PROTOCOL // 1980.2026 ]</span>
                <span className="badge badge--green">CHANNEL ACTIVE</span>
              </div>
              <h2 className="dispatch-terminal__title">
                Receive direct telemetry on numbered runs &amp; salon completions.
              </h2>
              <p className="dispatch-terminal__lede">
                Direct communication twice monthly. Receive early ledger allocation on newly completed editions, private salon appointments, and engineering notes.
              </p>

              {newsletterSubscribed ? (
                <div style={{ color: 'var(--color-terminal-green)', display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontFamily: 'var(--font-mono)' }}>
                  <Icon name="check" size={18} />
                  <span>COMMUNICATION ADDRESS REGISTERED IN CENTRAL LEDGER.</span>
                </div>
              ) : (
                <form className="dispatch-form" onSubmit={handleNewsletter}>
                  <input
                    type="email"
                    className="dispatch-input"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder="ENTER COMMUNICATIONS ADDRESS >"
                    required
                    aria-label="Email address"
                  />
                  <button type="submit" className="btn btn--gold">
                    INITIALIZE [ &rarr; ]
                  </button>
                </form>
              )}
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
