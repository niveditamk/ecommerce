/* =============================================================
   AURELIS MAISON — PRODUCT DETAIL PAGE (PDP)
   Editorial luxury dossier with high-res multi-view gallery,
   real-time inventory indicators, variant pills, size selectors,
   live pincode delivery estimator, collapsible craftsmanship specs,
   "The Making of the Object" narrative, verified reviews, and
   complementary recommendations.
   ============================================================= */
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Accordion, Breadcrumbs, Empty, Icon, Loading,
  PincodeChecker, ProductArt, QtyControl, Reveal, SectionHead, Stars
} from '../components/primitives';
import { ProductGrid } from '../components/ProductCard';
import { useStore } from '../context/StoreContext';
import { useAsync } from '../lib/useAsync';
import api from '../lib/api';
import { dx, money } from '../lib/format';

export default function Product() {
  const { id } = useParams();
  const { categories, addToCart, toggleWish, isWished, markRecent, busy } = useStore();
  const { data, loading, error } = useAsync(() => api.product(id), [id]);

  const product = data?.product;
  const [variant, setVariant] = useState(null);
  const [size, setSize] = useState(null);
  const [qty, setQty] = useState(1);
  const [activeView, setActiveView] = useState(0);

  useEffect(() => {
    if (!product) return;
    setVariant(product.colors?.[0]?.name || null);
    setSize(product.sizes?.[0] || null);
    setQty(1);
    setActiveView(0);
    markRecent(product.id);
  }, [product, markRecent]);

  /* Multi-angle and finish gallery views */
  const galleryViews = useMemo(() => {
    if (!product) return [];
    const views = [];
    if (product.colors?.length) {
      product.colors.forEach((c) => {
        views.push({
          shape: product.shape,
          palette: c.palette,
          label: `${dx(product.name)} — ${dx(c.name)}`
        });
      });
    } else {
      views.push({
        shape: product.shape,
        palette: product.palette,
        label: dx(product.name)
      });
    }
    // Add atelier close-up view
    views.push({
      shape: 'atelier',
      palette: product.palette,
      label: 'Atelier Workbench Detail'
    });
    return views;
  }, [product]);

  useEffect(() => {
    if (!product || !variant) return;
    const idx = (product.colors || []).findIndex((c) => c.name === variant);
    if (idx > -1) setActiveView(idx);
  }, [variant, product]);

  if (loading) return <Loading label="Retrieving piece from the atelier" />;
  if (error || !product) {
    return (
      <div className="shell section">
        <Empty
          icon="close"
          title="Piece Not Found in the House"
          body="This object may have been retired to the permanent archive, or the reference address is mistyped."
          cta={{ to: '/categories', label: 'Explore Collections' }}
        />
      </div>
    );
  }

  const categoryObj = categories.find((c) => c.slug === product.cat);
  const catName = dx(categoryObj?.name || product.sub || 'Collection');
  const saved = isWished(product.id);
  const reviewsData = data.reviews;
  const relatedItems = data.related || [];

  const handleAdd = () => {
    addToCart(
      {
        id: product.id,
        qty,
        variant,
        size
      },
      { name: dx(product.name) }
    );
  };

  /* Collapsible Accordion sections */
  const detailAccordions = [
    {
      title: 'TECHNICAL SPECIFICATIONS & BLUEPRINT METRICS',
      body: (
        <table className="pdp-spec-table">
          <tbody>
            <tr>
              <td>SYSTEM REF</td>
              <td>AUR-{product.id.toUpperCase()}</td>
            </tr>
            <tr>
              <td>DISCIPLINE</td>
              <td>{catName.toUpperCase()}</td>
            </tr>
            {product.details?.map((d) => (
              <tr key={d.k}>
                <td>{dx(d.k).toUpperCase()}</td>
                <td>{dx(d.v)}</td>
              </tr>
            ))}
            {product.edition && (
              <tr>
                <td>EDITION STATUS</td>
                <td>{dx(product.edition).toUpperCase()}</td>
              </tr>
            )}
            {product.year && (
              <tr>
                <td>COMMISSION YEAR</td>
                <td>{product.year}</td>
              </tr>
            )}
            <tr>
              <td>FABRICATION BENCH</td>
              <td>RUE DU RHÔNE 14, GENEVA</td>
            </tr>
            <tr>
              <td>ASSAY REGISTRATION</td>
              <td>CENTRAL LEDGER VERIFIED</td>
            </tr>
          </tbody>
        </table>
      )
    },
    {
      title: 'PROVENANCE & CRAFTSMANSHIP',
      body: (
        <>
          <p>{dx(product.story)}</p>
          <p style={{ marginTop: '12px', fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--pearl-3)' }}>
            Finished by hand at 14 Rue du Rhône, Geneva. Numbered and permanently registered in the central system ledger.
          </p>
        </>
      )
    },
    {
      title: 'MAINTENANCE & CALIBRATION',
      body: (
        <>
          <p>{dx(product.care)}</p>
          <p style={{ marginTop: '12px', fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--pearl-3)' }}>
            Complimentary annual ultrasonic cleaning and assay polish available at any certified AURELIS node worldwide.
          </p>
        </>
      )
    },
    {
      title: 'INSURED ESCROW DISPATCH & REVERSAL',
      body: (
        <>
          <p>
            Complimentary white-glove signature courier delivery. Tracked, encrypted, and 100% insured from bench to destination.
          </p>
          <p style={{ marginTop: '8px' }}>
            30-day return privilege. Courier collection arranged at zero friction with automated ledger refund.
          </p>
        </>
      )
    }
  ];

  return (
    <div className="shell">
      <Breadcrumbs
        trail={[
          { label: 'SYS.ROOT', to: '/' },
          { label: 'DISCIPLINES', to: '/categories' },
          { label: catName.toUpperCase(), to: `/category/${product.cat}` },
          { label: `REF // ${product.id.toUpperCase()}` }
        ]}
      />

      {/* ============ PDP SPLIT DOSSIER ============ */}
      <div className="pdp-grid">
        {/* Left: Multi-View Gallery */}
        <div className="pdp-gallery">
          <div className="hero-chassis pdp-gallery__main" style={{ position: 'relative' }}>
            <div className="hero-chassis__bracket hero-chassis__bracket--tl" aria-hidden="true" />
            <div className="hero-chassis__bracket hero-chassis__bracket--tr" aria-hidden="true" />
            <div className="hero-chassis__bracket hero-chassis__bracket--bl" aria-hidden="true" />
            <div className="hero-chassis__bracket hero-chassis__bracket--br" aria-hidden="true" />

            <div style={{ position: 'absolute', top: 12, left: 16, zIndex: 2, fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--pearl-3)', letterSpacing: '0.08em' }}>
              [ CAD SCHEMATIC VIEW // REF: {product.id.toUpperCase()} ]
            </div>

            <ProductArt
              id={activeView === 0 ? product.id : null}
              shape={galleryViews[activeView]?.shape || product.shape}
              palette={galleryViews[activeView]?.palette || product.palette}
              label={galleryViews[activeView]?.label || product.name}
              className="art--tall"
            />
          </div>

          {galleryViews.length > 1 && (
            <div className="pdp-gallery__thumbs" aria-label="Gallery views">
              {galleryViews.map((v, i) => (
                <button
                  key={i}
                  type="button"
                  className={`pdp-gallery__thumb${i === activeView ? ' is-active' : ''}`}
                  onClick={() => setActiveView(i)}
                  aria-label={v.label}
                  style={{ border: i === activeView ? '2px solid var(--color-terminal-green)' : '1px solid var(--line)' }}
                >
                  <ProductArt
                    id={i === 0 ? product.id : null}
                    shape={v.shape}
                    palette={v.palette}
                    label={v.label}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Sticky Dossier Info */}
        <div className="pdp-info">
          <div className="between" style={{ alignItems: 'center', borderBottom: '1px solid var(--line)', paddingBottom: '8px', marginBottom: '14px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--color-terminal-green-text)', fontWeight: 700 }}>
              // SPECIMEN DOSSIER &middot; REF: AUR-{product.id.toUpperCase()}
            </span>
            {product.edition && (
              <span className="badge badge--green">[ {dx(product.edition).toUpperCase()} ]</span>
            )}
          </div>

          <h1 className="pdp-title" style={{ fontFamily: 'var(--font-grotesk)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
            {dx(product.name)}
          </h1>

          {/* Rating & Review Link */}
          <div className="center" style={{ gap: '10px', marginTop: '10px' }}>
            <Stars rating={product.rating} size={13} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--pearl-2)' }}>
              {product.rating.toFixed(1)}
            </span>
            <a href="#reviews" style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--pearl-3)', textDecoration: 'underline' }}>
              ({product.reviews} VERIFIED COLLECTOR APPRAISALS)
            </a>
          </div>

          {/* Price & Installment Note */}
          <div className="pdp-price-row" style={{ marginTop: '16px' }}>
            <span className="pdp-price" style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--pearl)' }}>
              {product.was && <s style={{ color: 'var(--pearl-3)', fontSize: '16px', marginRight: '10px' }}>{money(product.was)}</s>}
              {money(product.price)}
            </span>
            <span className="badge badge--green" style={{ marginLeft: '12px' }}>
              VERIFIED SPECIMEN
            </span>
          </div>
          <div className="pdp-installment" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--pearl-3)' }}>
            [ ESCROW SPLIT: 3x INTEREST-FREE CYCLES OF {money(product.price / 3)} ]
          </div>

          {/* Real-time Inventory Status Indicator */}
          {product.stock > 3 ? (
            <div className="pdp-stock-badge pdp-stock-badge--available" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
              <span className="pdp-stock-dot" />
              <span>[ SYS.LEDGER // NOMINAL: SHIPS WITHIN 24 HOURS ]</span>
            </div>
          ) : product.stock > 0 ? (
            <div className="pdp-stock-badge pdp-stock-badge--low" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
              <span className="pdp-stock-dot" />
              <span>[ SYS.LEDGER // CRITICAL: ONLY {product.stock} SPECIMENS REMAINING ]</span>
            </div>
          ) : (
            <div className="pdp-stock-badge pdp-stock-badge--out" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
              <span className="pdp-stock-dot" />
              <span>[ SYS.LEDGER // EXHAUSTED: ALLOCATE FROM NEXT BATCH ]</span>
            </div>
          )}

          <p className="pdp-blurb" style={{ fontFamily: 'var(--font-grotesk)', fontSize: '0.95rem', lineHeight: 1.6, color: 'var(--pearl-2)' }}>
            {dx(product.blurb)}
          </p>

          {/* Variant Finishes */}
          {product.colors?.length > 0 && (
            <div className="pdp-swatches">
              <div className="pdp-swatches__label" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
                <span>MATERIAL / FINISH:</span>
                <b style={{ color: 'var(--pearl)' }}>{variant?.toUpperCase()}</b>
              </div>
              <div className="pdp-swatches__row">
                {product.colors.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    className={`pdp-color-pill${variant === c.name ? ' is-active' : ''}`}
                    onClick={() => setVariant(c.name)}
                    style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}
                  >
                    <span className="pdp-color-dot" style={{ backgroundColor: c.hex }} />
                    <span>{dx(c.name).toUpperCase()}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Size Selector */}
          {product.sizes?.length > 0 && (
            <div className="pdp-swatches">
              <div className="pdp-swatches__label" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
                <span>CALIBRATED SIZING:</span>
                <Link to="/help?topic=Sizing" style={{ textDecoration: 'underline', color: 'var(--color-terminal-green-text)' }}>
                  [ SIZING GUIDE ]
                </Link>
              </div>
              <div className="pdp-swatches__row">
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`pdp-size-btn${size === s ? ' is-active' : ''}`}
                    onClick={() => setSize(s)}
                    style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}
                  >
                    {dx(s)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity & Actions */}
          <div className="pdp-actions">
            <QtyControl
              qty={qty}
              onChange={setQty}
              max={product.stock || 1}
              disabled={busy || product.stock === 0}
            />

            <button
              type="button"
              className="btn btn--gold"
              style={{ flex: 1, padding: '14px 20px', fontSize: '0.82rem' }}
              onClick={handleAdd}
              disabled={busy || product.stock === 0}
            >
              {product.stock === 0 ? 'RESERVE UPCOMING RUN' : 'INITIALIZE ORDER [ ADD TO BAG ]'}
            </button>

            <button
              type="button"
              className={`btn btn--outline${saved ? ' is-active' : ''}`}
              onClick={() => toggleWish(product.id, dx(product.name))}
              aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
              style={{ padding: '12px 18px' }}
              title={saved ? 'Specimen Saved' : 'Save Specimen'}
            >
              <Icon name={saved ? 'check' : 'bag'} size={18} />
            </button>
          </div>

          {/* Live Pincode Estimator */}
          <PincodeChecker />

          {/* Collapsible Accordions */}
          <Accordion items={detailAccordions} openFirst />
        </div>
      </div>

      {/* ============ "THE MAKING OF THE OBJECT" EDITORIAL ============ */}
      <section className="section" style={{ borderTop: '1px solid var(--line)', marginTop: '48px' }}>
        <Reveal>
          <div className="story-split">
            <div>
              <span className="eyebrow" style={{ color: 'var(--color-terminal-green-text)', fontWeight: 700 }}>
                // BENCH FABRICATION &middot; DOSSIER
              </span>
              <h2 className="h2" style={{ marginTop: '8px', fontFamily: 'var(--font-grotesk)', fontWeight: 700, textTransform: 'uppercase' }}>
                Fabricated without compromise.
              </h2>
              <p className="lede muted" style={{ marginTop: '16px' }}>
                {dx(product.story || product.blurb)}
              </p>
              <div style={{ marginTop: '24px', display: 'grid', gap: '12px' }}>
                <div className="center" style={{ gap: '12px' }}>
                  <Icon name="scissors" size={20} />
                  <span style={{ fontSize: '14px', color: 'var(--pearl-2)', fontFamily: 'var(--font-mono)' }}>
                    BENCH TIME: 14 TO 60 DAYS ACCORDING TO SPECIFICATION TOLERANCES.
                  </span>
                </div>
                <div className="center" style={{ gap: '12px' }}>
                  <Icon name="shield" size={20} />
                  <span style={{ fontSize: '14px', color: 'var(--pearl-2)', fontFamily: 'var(--font-mono)' }}>
                    ASSAY HALLMARK: DIRECT SURFACE PUNCH REGISTERED TO CENTRAL NODE.
                  </span>
                </div>
              </div>
            </div>

            <div className="story-split__media hero-chassis">
              <ProductArt shape="atelier" palette={product.palette} label="Artisan Bench" className="art--wide" />
            </div>
          </div>
        </Reveal>
      </section>

      {/* ============ REVIEWS SECTION ============ */}
      <section id="reviews" className="reviews-section">
        <Reveal>
          <SectionHead
            kicker="// SYSTEM APPRAISALS &middot; VERIFIED OWNERSHIP"
            title="COLLECTOR FIELD REPORTS"
            body="Evaluations from authenticated owners and verified patrons registered in the central system."
          />
        </Reveal>

        <div className="reviews-grid">
          {/* Summary Score Box */}
          <div className="review-summary" style={{ background: 'var(--color-paper-light)', border: '1px solid var(--line)', borderRadius: 'var(--r-xs)' }}>
            <div className="review-summary__big" style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--pearl)' }}>{product.rating.toFixed(1)}</div>
            <div style={{ marginTop: '6px' }}><Stars rating={product.rating} size={16} /></div>
            <div className="tiny" style={{ marginTop: '8px', color: 'var(--pearl-3)', fontFamily: 'var(--font-mono)' }}>
              [ {product.reviews} VERIFIED COLLECTOR APPRAISALS ]
            </div>

            {reviewsData?.distribution && (
              <div className="review-bars">
                {[5, 4, 3, 2, 1].map((stars, idx) => {
                  const count = reviewsData.distribution[idx] || 0;
                  const pct = Math.round((count / (product.reviews || 1)) * 100);
                  return (
                    <div className="review-bar-row" key={stars} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
                      <span>{stars}&star;</span>
                      <div className="review-bar-track">
                        <div className="review-bar-fill" style={{ width: `${pct}%`, background: 'var(--color-terminal-green)' }} />
                      </div>
                      <span>{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Reviews List */}
          <div>
            {reviewsData?.items?.map((r, i) => (
              <article className="review-item" key={i} style={{ background: 'var(--color-paper-light)', border: '1px solid var(--line)', borderRadius: 'var(--r-xs)', marginBottom: '12px', padding: '16px' }}>
                <div className="review-item__head">
                  <div className="center" style={{ gap: '10px' }}>
                    <Stars rating={r.rating} size={12} />
                    <b style={{ fontSize: '14px', fontFamily: 'var(--font-grotesk)', color: 'var(--pearl)' }}>{r.name}</b>
                    <span className="tiny" style={{ color: 'var(--pearl-3)', fontFamily: 'var(--font-mono)' }}>({r.city})</span>
                  </div>
                  <span className="badge badge--green" style={{ fontSize: '0.65rem' }}>VERIFIED OWNER</span>
                </div>
                <h4 className="review-item__title" style={{ fontFamily: 'var(--font-grotesk)', fontWeight: 700, marginTop: '8px' }}>{r.title}</h4>
                <p className="review-item__body" style={{ fontSize: '0.85rem', color: 'var(--pearl-2)', lineHeight: 1.5, marginTop: '4px' }}>{r.body}</p>
                <div className="tiny" style={{ color: 'var(--pearl-3)', fontFamily: 'var(--font-mono)', marginTop: '8px' }}>
                  TIMESTAMP: {r.date}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ============ RECOMMENDATIONS GRID ============ */}
      {relatedItems.length > 0 && (
        <section className="section" style={{ borderTop: '1px solid var(--line)', marginTop: '64px' }}>
          <Reveal>
            <SectionHead
              kicker="// CO-ENGINEERED ARTIFACTS"
              title="COMPLEMENTARY SPECIMENS"
              body="Objects engineered to share proportions, metallurgical standards, and physical tolerances."
            />
          </Reveal>

          <Reveal delay={1}>
            <ProductGrid items={relatedItems} />
          </Reveal>
        </section>
      )}
    </div>
  );
}
