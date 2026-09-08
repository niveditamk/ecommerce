/* =============================================================
   AURELIS MAISON — MOBILE NAVIGATION DRAWER
   Smooth full-height slide-over with category hierarchy,
   maison links, customer account, and concierge access.
   ============================================================= */
import { Link } from 'react-router-dom';
import { Icon } from './primitives';
import { useStore } from '../context/StoreContext';
import { dx } from '../lib/format';

const MAISON_LINKS = [
  ['/membership', 'Le Cercle Membership', 'crown'],
  ['/stores', 'Global Boutiques', 'pin'],
  ['/help', 'Concierge & Client Care', 'chat'],
  ['/shipping', 'Insured Shipping', 'truck'],
  ['/returns', 'Returns & Exchanges', 'refresh']
];

export default function NavDrawer() {
  const { session, categories, layer, closeLayer } = useStore();
  const open = layer === 'nav';
  const user = session.user;

  return (
    <aside
      className={`drawer drawer--nav${open ? ' is-open' : ''}`}
      aria-label="Navigation Menu"
      aria-hidden={!open}
    >
      <div className="drawer__head">
        <div className="brand" style={{ alignItems: 'flex-start', padding: 0 }}>
          <span className="brand__mark" style={{ fontSize: '20px' }}>AURELIS</span>
          <span className="brand__sub">Geneva &middot; 1911</span>
        </div>
        <button className="icon-btn" type="button" onClick={closeLayer} aria-label="Close menu">
          <Icon name="close" size={20} />
        </button>
      </div>

      <div className="drawer__body">
        <span className="eyebrow" style={{ marginBottom: '12px' }}>Collections</span>
        <div style={{ display: 'grid', gap: '4px', marginBottom: '24px' }}>
          {categories.map((c) => (
            <Link
              key={c.slug}
              to={`/category/${c.slug}`}
              onClick={closeLayer}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 0',
                fontSize: '15px',
                fontFamily: 'var(--serif)',
                color: 'var(--pearl)',
                borderBottom: '1px solid var(--line-2)'
              }}
            >
              <span>{dx(c.name)}</span>
              <span className="tiny" style={{ color: 'var(--pearl-3)' }}>{c.count}</span>
            </Link>
          ))}
        </div>

        <span className="eyebrow" style={{ marginBottom: '12px' }}>The Maison</span>
        <div style={{ display: 'grid', gap: '4px', marginBottom: '24px' }}>
          {MAISON_LINKS.map(([to, label, icon]) => (
            <Link
              key={to}
              to={to}
              onClick={closeLayer}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px 0',
                fontSize: '14px',
                color: 'var(--pearl-2)'
              }}
            >
              <Icon name={icon} size={16} />
              <span>{label}</span>
            </Link>
          ))}
        </div>

        <div className="rule" style={{ margin: '16px 0' }} />

        <span className="eyebrow" style={{ marginBottom: '12px' }}>Account &amp; Orders</span>
        <div style={{ display: 'grid', gap: '8px' }}>
          <Link
            to={user ? '/account/profile' : '/account/auth'}
            onClick={closeLayer}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'var(--pearl)' }}
          >
            <Icon name="user" size={16} />
            <span>{user ? `${dx(user.first)}'s Account` : 'Sign in / Create Account'}</span>
          </Link>
          <Link
            to="/wishlist"
            onClick={closeLayer}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'var(--pearl)' }}
          >
            <Icon name="bag" size={16} />
            <span>Saved Pieces ({session.wishlist?.length || 0})</span>
          </Link>
          <Link
            to="/account/orders"
            onClick={closeLayer}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'var(--pearl)' }}
          >
            <Icon name="box" size={16} />
            <span>Track Orders</span>
          </Link>
        </div>
      </div>

      <div className="drawer__foot">
        <Link className="btn btn--gold btn--block btn--sm" to="/membership" onClick={closeLayer}>
          Apply to Le Cercle
        </Link>
      </div>
    </aside>
  );
}
