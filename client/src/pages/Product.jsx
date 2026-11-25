/* =============================================================
   AURELIS MAISON // EDITORIAL LUXURY PRODUCT DOSSIER (PDP)
   Dual-column architectural showcase, multi-angle vitrines,
   material swatches, size selectors, Indian pincode checker,
   and expandable craftsmanship specifications.
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
      title: 'Craftsmanship & Provenance',
      body: (
        <>
          <p style={{ lineHeight: 1.7, color: 'var(--pearl-2)' }}>{dx(product.story)}</p>
          <p style={{ marginTop: '12px', fontSize: '0.84rem', color: 'var(--pearl-3)' }}>
            Finished entirely by hand at 14 Rue du Rh&ocirc;ne, Geneva. Individually numbered, hallmarked, and permanently registered in the central Maison archives.
          </p>
        </>
      )
    },
    {
      title: 'Technical Specifications & Noble Materials',
      body: (
        <table className="pdp-spec-table">
          <tbody>
            <tr>
              <td>Collection M&eacute;tier</td>
              <td>{catName}</td>
            </tr>
            {product.details?.map((d) => (
              <tr key={d.k}>
                <td>{dx(d.k)}</td>
                <td>{dx(d.v)}</td>
              </tr>
            ))}
            {product.edition && (
              <tr>
                <td>Edition Series</td>
                <td>{dx(product.edition)}</td>
              </tr>
            )}
            {product.year && (
              <tr>
                <td>Commission Year</td>
                <td>{product.year}</td>
              </tr>
            )}
            <tr>
              <td>Atelier Location</td>
              <td>Rue du Rh&ocirc;ne 14, Gen&egrave;ve</td>
            </tr>
            <tr>
              <td>Assay Hallmark</td>
              <td>Certified Swiss Hallmarked Assay</td>
            </tr>
          </tbody>
        </table>
      )
    },
    {
      title: 'Lifetime Servicing & Ultrasonic Care',
      body: (
        <>
          <p style={{ lineHeight: 1.7, color: 'var(--pearl-2)' }}>{dx(product.care)}</p>
          <p style={{ marginTop: '12px', fontSize: '0.84rem', color: 'var(--pearl-3)' }}>
            Every creation includes complimentary annual ultrasonic restoration, movement regulation, and polish across all AURELIS salons worldwide.
          </p>
        </>
      )
    },
    {
      title: 'Insured Delivery & 30-Day Return Privilege',
      body: (
        <>
          <p style={{ lineHeight: 1.7, color: 'var(--pearl-2)' }}>
            Complimentary white-glove signature courier delivery across India. Tracked, tamper-evident, and fully insured from the bench to your residence.
          </p>
          <p style={{ marginTop: '10px', lineHeight: 1.7, color: 'var(--pearl-2)' }}>
            30-day return privilege with complimentary doorstep courier collection and immediate credit or bespoke exchange.
          </p>
        </>
      )
    }
  ];

  return (
    <div className="shell">
      <Breadcrumbs
        trail={[
          { label: 'Home', to: '/' },
          { label: 'Collections', to: '/categories' },
          { label: catName, to: `/category/${product.cat}` },
          { label: dx(product.name) }
        ]}
      />

      {/* ============ PDP DUAL-COLUMN SHOWCASE ============ */}
      <div className="pdp-split">
        {/* Left: Multi-Angle Image Gallery */}
        <div className="pdp-gallery">
          <div className="pdp-main-vitrine">
            <ProductArt
              id={activeView === 0 ? product.id : null}
              shape={galleryViews[activeView]?.shape || product.shape}
              palette={galleryViews[activeView]?.palette || product.palette}
              label={galleryViews[activeView]?.label || product.name}
            />
          </div>

          {galleryViews.length > 1 && (
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px', overflowX: 'auto' }} aria-label="Gallery thumbnails">
              {galleryViews.map((v, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveView(i)}
                  aria-label={v.label}
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: 'var(--r-md)',
                    border: i === activeView ? '2px solid var(--gold)' : '1px solid var(--line)',
                    background: '#FFFFFF',
                    padding: '8px',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s ease',
                    flexShrink: 0
                  }}
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

        {/* Right: Buy-Box & Product Narrative */}
        <div className="pdp-info">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="eyebrow" style={{ margin: 0 }}>
              {catName} &middot; {dx(product.sub || 'Maison Piece')}
            </span>
            {product.edition && (
              <span className="badge badge--gold">{dx(product.edition)}</span>
            )}
          </div>

          <h1 className="pdp-title">
            {dx(product.name)}
          </h1>

          {/* Rating */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Stars rating={product.rating} size={14} />
            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--pearl-2)' }}>
              {product.rating.toFixed(1)}
            </span>
            <a href="#reviews" style={{ fontSize: '0.82rem', color: 'var(--gold-text)', textDecoration: 'none' }}>
              ({product.reviews} Verified Client Appraisals)
            </a>
          </div>

          {/* Pricing & Installment Note */}
          <div className="pdp-price-row">
            <span className="pdp-price">
              {product.was && <s style={{ color: 'var(--pearl-4)', fontSize: '1.2rem', marginRight: '12px', fontWeight: 400 }}>{money(product.was)}</s>}
              {money(product.price)}
            </span>
            <span className="badge badge--green">
              Complimentary Insured Delivery
            </span>
          </div>

          <div style={{ fontSize: '0.86rem', color: 'var(--pearl-3)', marginTop: '-12px', marginBottom: '20px' }}>
            Or 3 monthly instalments of <b>{money(Math.round(product.price / 3))}</b> with 0% interest
          </div>

          {/* Availability Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', fontSize: '0.86rem' }}>
            {product.stock > 3 ? (
              <span style={{ color: 'var(--success)', fontWeight: 600 }}>&bull; In Stock &middot; Ships within 24 hours</span>
            ) : product.stock > 0 ? (
              <span style={{ color: 'var(--alert)', fontWeight: 600 }}>&bull; Only {product.stock} pieces remaining in Geneva salon</span>
            ) : (
              <span style={{ color: 'var(--pearl-3)', fontWeight: 600 }}>&bull; Sold Out &middot; Join waitlist for next commission run</span>
            )}
          </div>

          <p style={{ fontSize: '0.98rem', lineHeight: 1.7, color: 'var(--pearl-2)', marginBottom: '28px' }}>
            {dx(product.blurb)}
          </p>

          {/* Material Finishes */}
          {product.colors?.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--pearl-3)', marginBottom: '10px' }}>
                Noble Material: <b style={{ color: 'var(--pearl)' }}>{variant}</b>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {product.colors.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    className={`btn btn--sm ${variant === c.name ? 'btn--primary' : 'btn--outline'}`}
                    onClick={() => setVariant(c.name)}
                    style={{ borderRadius: 'var(--r-pill)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                  >
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: c.hex, border: '1px solid rgba(0,0,0,0.1)' }} />
                    <span>{dx(c.name)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Size Selector */}
          {product.sizes?.length > 0 && (
            <div style={{ marginBottom: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--pearl-3)' }}>
                  Size / Dimension:
                </span>
                <Link to="/help?topic=Sizing" style={{ fontSize: '0.78rem', color: 'var(--gold-text)', textDecoration: 'none' }}>
                  Complimentary Sizing Guide &rarr;
                </Link>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`btn btn--sm ${size === s ? 'btn--primary' : 'btn--outline'}`}
                    onClick={() => setSize(s)}
                    style={{ minWidth: '44px', borderRadius: 'var(--r-pill)' }}
                  >
                    {dx(s)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity & CTA Actions */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '28px' }}>
            <QtyControl
              qty={qty}
              onChange={setQty}
              max={product.stock || 1}
              disabled={busy || product.stock === 0}
            />

            <button
              type="button"
              className="btn btn--gold"
              style={{ flex: 1, padding: '16px 24px' }}
              onClick={handleAdd}
              disabled={busy || product.stock === 0}
            >
              {product.stock === 0 ? 'Join Waitlist' : 'Add to Bag'}
            </button>

            <button
              type="button"
              className={`btn btn--outline${saved ? ' is-on' : ''}`}
              style={{ width: '52px', height: '52px', padding: 0, borderRadius: '50%', flexShrink: 0 }}
              onClick={() => toggleWish(product.id, dx(product.name))}
              aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
            >
              <Icon name={saved ? 'check' : 'heart'} size={18} />
            </button>
          </div>

          {/* Indian PIN Code Delivery Checker */}
          <PincodeChecker />

          {/* Expandable Specifications Accordion */}
          <div style={{ marginTop: '36px' }}>
            <Accordion items={detailAccordions} openFirst />
          </div>
        </div>
      </div>

      {/* ============ VERIFIED CLIENT REVIEWS ============ */}
      <section className="section" id="reviews" style={{ borderTop: '1px solid var(--line)', marginTop: '64px' }} aria-label="Client Appraisals">
        <Reveal>
          <SectionHead
            kicker="Client Testimonials"
            title="Verified Client Appraisals"
            body={`Read authentic appraisals from verified patrons who have acquired ${dx(product.name)}.`}
          />
        </Reveal>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginTop: '32px' }}>
          {(reviewsData?.items || []).slice(0, 3).map((r, i) => (
            <div key={i} style={{ background: '#FFFFFF', padding: '28px', borderRadius: 'var(--r-md)', border: '1px solid var(--line)', boxShadow: 'var(--sh-1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <Stars rating={r.rating} size={12} />
                <span className="tiny" style={{ color: 'var(--pearl-4)' }}>Verified Purchase</span>
              </div>
              <h4 className="h4" style={{ fontSize: '1.05rem', margin: '0 0 8px' }}>{dx(r.title)}</h4>
              <p style={{ fontSize: '0.88rem', color: 'var(--pearl-2)', lineHeight: 1.6 }}>{dx(r.body)}</p>
              <div style={{ fontSize: '0.78rem', color: 'var(--pearl-3)', marginTop: '16px', fontWeight: 600 }}>
                {dx(r.author)} &middot; {dx(r.location || 'India')}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============ ATELIER COMPLEMENTARY RECOMMENDATIONS ============ */}
      {relatedItems.length > 0 && (
        <section className="section" style={{ borderTop: '1px solid var(--line)', marginTop: '64px' }} aria-label="Complementary Creations">
          <Reveal>
            <SectionHead
              kicker="Maison Harmonies"
              title="Complementary creations from the atelier"
              body="Pieces that share material metallurgy, chronometric calibre, or styling affinity."
            />
          </Reveal>

          <Reveal delay={1}>
            <ProductGrid items={relatedItems.slice(0, 4)} />
          </Reveal>
        </section>
      )}
    </div>
  );
}
