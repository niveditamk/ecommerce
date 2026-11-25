/* =============================================================
   AURELIS MAISON // ARCHITECTURAL LUXURY HEADER
   Minimalist haute navigation, editorial wordmark,
   complimentary concierge shipping announcement, and bag drawer trigger.
   ============================================================= */
import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Icon, ProductArt } from './primitives';
import { useStore } from '../context/StoreContext';
import { dx } from '../lib/format';

export default function Header() {
  const { session, categories, openLayer } = useStore();
  const [stuck, setStuck] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMegaOpen(false);
  }, [location.pathname, location.search]);

  const count = session.totals.count;
  const wishCount = session.wishlist?.length || 0;
  const user = session.user;

  const primary = useMemo(
    () => [
      { label: 'Shop All', to: '/categories', mega: true },
      { label: 'Fine Jewellery', to: '/category/jewellery' },
      { label: 'Horology', to: '/category/horology' },
      { label: 'Haute Parfumerie', to: '/category/parfums' },
      { label: 'Leather Goods', to: '/category/leather' },
      { label: 'Ateliers', to: '/stores' }
    ],
    []
  );

  return (
    <header className={`site-header${stuck ? ' is-stuck' : ''}`} onMouseLeave={() => setMegaOpen(false)}>
      {/* Luxury Concierge Announcement Bar */}
      <div className="announce" role="region" aria-label="Maison Service Announcement">
        <span>Complimentary White-Glove Insured Delivery Across India &middot; Geneva Atelier Craftsmanship &middot; 30-Day Returns</span>
      </div>

      {/* Main Luxury Navigation Bar */}
      <div className="nav">
        <div className="nav__left">
          <button className="burger" type="button" onClick={() => openLayer('nav')} aria-label="Open navigation menu">
            <i />
          </button>
          <nav className="nav__links" aria-label="Primary navigation">
            {primary.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav__link${isActive ? ' is-active' : ''}`}
                onMouseEnter={() => setMegaOpen(!!item.mega)}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Center Brand Identity */}
        <Link className="brand" to="/" aria-label="AURELIS Maison Geneva">
          <span className="brand__mark">AURELIS</span>
          <span className="brand__sub">MAISON GENÈVE &middot; EST. 1911</span>
        </Link>

        {/* Right Luxury Actions */}
        <div className="nav__actions">
          <button
            className="btn--ghost"
            type="button"
            onClick={() => openLayer('search')}
            aria-label="Search collections"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
          >
            <Icon name="search" size={18} />
            <span className="hide-sm">Search</span>
          </button>

          <Link
            className="btn--ghost hide-sm"
            to={user ? '/account/profile' : '/account/auth'}
            aria-label="Client Account"
            style={{ fontSize: '0.82rem' }}
          >
            {user ? `${user.first || 'Account'}` : 'Sign In'}
          </Link>

          <Link
            className="btn--ghost hide-sm"
            to="/wishlist"
            aria-label="Saved pieces"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
          >
            <span>Wishlist</span>
            {wishCount > 0 && (
              <span className="cart-count-pill" style={{ fontSize: '0.65rem' }}>
                {wishCount}
              </span>
            )}
          </Link>

          <button
            className="nav-cart-btn"
            type="button"
            onClick={() => openLayer('cart')}
            aria-label={`Shopping bag containing ${count} items`}
          >
            <Icon name="bag" size={17} />
            <span className="hide-sm">Bag</span>
            <span className="cart-count-pill">
              {count}
            </span>
          </button>
        </div>
      </div>

      {/* Modern Luxury Mega Menu */}
      <MegaMenu open={megaOpen} categories={categories} onEnter={() => setMegaOpen(true)} />
    </header>
  );
}

function MegaMenu({ open, categories, onEnter }) {
  const featured = useMemo(() => {
    const withHighlight = categories.find((c) => c.highlight?.length);
    return withHighlight?.highlight?.[0] || null;
  }, [categories]);

  const primary = categories.slice(0, 4);

  return (
    <div className={`mega glass glass--deep${open ? ' is-open' : ''}`} onMouseEnter={onEnter}>
      <div className="mega__grid">
        {primary.map((c) => (
          <div className="mega__col" key={c.slug}>
            <h5>{dx(c.name)}</h5>
            {(c.sub || []).map((s) => (
              <Link key={s} to={`/category/${c.slug}?sub=${encodeURIComponent(dx(s))}`}>
                {dx(s)}
              </Link>
            ))}
            <Link className="gold" to={`/category/${c.slug}`} style={{ marginTop: '8px', display: 'inline-block' }}>
              Explore Collection &rarr;
            </Link>
          </div>
        ))}

        <div className="mega__promo">
          {featured && (
            <ProductArt
              className="art--wide"
              shape={featured.shape}
              palette={featured.palette}
              label={featured.name}
            />
          )}
          <span className="eyebrow" style={{ marginTop: '14px' }}>Atelier Highlight</span>
          <div className="h4" style={{ marginTop: '4px', fontFamily: 'var(--font-serif)' }}>
            {dx(featured?.name || 'Numbered Editions')}
          </div>
          <p className="tiny" style={{ marginTop: '4px', textTransform: 'none', color: 'var(--pearl-3)' }}>
            Bench-made in our Geneva atelier. Hallmarked and individually certified.
          </p>
          <Link
            className="btn btn--sm btn--primary"
            style={{ marginTop: '16px' }}
            to={featured ? `/product/${featured.id}` : '/categories'}
          >
            Discover Piece
          </Link>
        </div>
      </div>
    </div>
  );
}
