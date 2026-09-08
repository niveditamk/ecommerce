/* =============================================================
   AURELIS // TERMINAL NAVIGATION & CONTROL PANEL
   Futuristic shopping terminal interface from an alternate 1980s.
   Telemetry status bar, indexed navigation modules, tactile states.
   ============================================================= */
import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Icon, ProductArt } from './primitives';
import { useStore } from '../context/StoreContext';
import { dx } from '../lib/format';

const TELEMETRY_FEED = [
  ['[ SYS.ONLINE ]', ' NODE 01 // GENEVA', ' — ALL COMMERCE CIRCUITS OPERATIONAL'],
  ['[ PROTOCOL ]', ' SECURE ESCROW', ' — INSURED TRANSIT WORLDWIDE'],
  ['[ ARCHIVE ]', ' NUMBERED RUNS', ' — MECHANICAL CALIBRES & FINE JEWELLERY'],
  ['[ DISPATCH ]', ' REAL-TIME LEDGER', ' — COMPLIMENTARY COURIER FULFILLMENT']
];

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
      { label: 'Shop', to: '/categories', mega: true },
      { label: 'Jewellery', to: '/category/jewellery' },
      { label: 'Horology', to: '/category/horology' },
      { label: 'Parfums', to: '/category/parfums' },
      { label: 'Leather', to: '/category/leather' },
      { label: 'Boutiques', to: '/stores' }
    ],
    []
  );

  return (
    <header className={`site-header${stuck ? ' is-stuck' : ''}`} onMouseLeave={() => setMegaOpen(false)}>
      {/* Telemetry / Announcement Bar */}
      <div className="announce" role="region" aria-label="System Telemetry">
        <div className="announce__track">
          {[0, 1, 2].map((pass) =>
            TELEMETRY_FEED.map(([tag, title, rest]) => (
              <span key={`${pass}-${title}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: 'var(--color-terminal-green)', fontFamily: 'var(--font-mono)' }}>{tag}</span>
                <b>{title}</b>
                <span>{rest}</span>
              </span>
            ))
          )}
        </div>
      </div>

      {/* Main Terminal Control Panel */}
      <div className="nav" style={{ minHeight: '64px' }}>
        <div className="nav__left">
          <button className="burger" type="button" onClick={() => openLayer('nav')} aria-label="Open terminal navigation">
            <i />
          </button>
          <nav className="nav__links" aria-label="Primary terminal navigation">
            {primary.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav__link${isActive ? ' is-active' : ''}`}
                onMouseEnter={() => setMegaOpen(!!item.mega)}
                style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 12px' }}
              >
                {/* Each link used to carry an "01 //" index above its label.
                    Navigation is not a sequence — nobody reaches Parfums by
                    counting to four — so the number encoded nothing and cost
                    the header a second line to show it. */}
                <span style={{ fontWeight: 600 }}>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Center Brand / Terminal Designation */}
        <Link className="brand" to="/" aria-label="AURELIS Terminal">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '6px', height: '6px', background: 'var(--color-terminal-green)', borderRadius: '1px', display: 'inline-block' }} />
            <span className="brand__mark" style={{ letterSpacing: '0.12em' }}>AURELIS</span>
          </div>
          <span className="brand__sub" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem' }}>
            SYS.NODE // 1980.2026
          </span>
        </Link>

        {/* Right Terminal Actions */}
        <div className="nav__right">
          <button
            className="nav__link"
            type="button"
            onClick={() => openLayer('search')}
            aria-label="Search the catalogue"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <span style={{ color: 'var(--color-terminal-green-text)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>&gt;_</span>
            <span className="hide-sm">Search</span>
          </button>

          <Link
            className="nav__link hide-sm"
            to={user ? '/account/profile' : '/account/auth'}
            aria-label="User terminal account"
            style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}
          >
            {user ? `[ ${user.first || 'USER'} ]` : '[ AUTH ]'}
          </Link>

          <Link className="nav__link hide-sm" to="/wishlist" aria-label="Saved objects">
            <span>SAVED</span>
            {wishCount > 0 && (
              <span className="badge badge--terminal" style={{ marginLeft: 4, padding: '1px 5px', fontSize: '0.62rem' }}>
                {wishCount}
              </span>
            )}
          </Link>

          <button
            className="nav__link"
            type="button"
            onClick={() => openLayer('cart')}
            aria-label={`Shopping bag, ${count} ${count === 1 ? 'object' : 'objects'}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <span>CART</span>
            <span
              className="badge"
              style={{
                background: count > 0 ? 'var(--color-terminal-green)' : 'var(--color-bone)',
                color: count > 0 ? '#0B0D0E' : 'var(--pearl-3)',
                fontWeight: 700,
                padding: '2px 6px',
                fontSize: '0.65rem'
              }}
            >
              {String(count).padStart(2, '0')}
            </span>
          </button>
        </div>
      </div>

      {/* Mega Menu Dropdown */}
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
            <Link className="gold" to={`/category/${c.slug}`}>
              Explore collection &rarr;
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
          <span className="eyebrow" style={{ marginTop: '12px' }}>Atelier Selection</span>
          <div className="h4" style={{ marginTop: '4px', fontFamily: 'var(--serif)' }}>
            {dx(featured?.name || 'Numbered Editions')}
          </div>
          <p className="tiny" style={{ marginTop: '4px', textTransform: 'none', color: 'var(--pearl-3)' }}>
            Bench-made in Geneva. Numbered, hallmarked, and signed by its artisan.
          </p>
          <Link
            className="btn btn--sm btn--outline"
            style={{ marginTop: '14px' }}
            to={featured ? `/product/${featured.id}` : '/categories'}
          >
            Discover piece
          </Link>
        </div>
      </div>
    </div>
  );
}
