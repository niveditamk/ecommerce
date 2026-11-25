/* =============================================================
   AURELIS MAISON // EDITORIAL LUXURY PRODUCT CARD
   Clean haute vitrine, floating wishlist control,
   refined typography, and effortless Add to Bag action.
   ============================================================= */
import { Link } from 'react-router-dom';
import { Icon, ProductArt, Stars } from './primitives';
import { useStore } from '../context/StoreContext';
import { dx, money } from '../lib/format';

export default function ProductCard({ product, categoryName, showQuickAdd = true }) {
  const { addToCart, toggleWish, isWished, busy } = useStore();
  const saved = isWished(product.id);

  // Availability status
  let stockBadge = null;
  if (product.stock <= 3 && product.stock > 0) {
    stockBadge = <span className="badge badge--alert">Only {product.stock} left</span>;
  } else if (product.stock === 0) {
    stockBadge = <span className="badge">Sold Out</span>;
  }

  const quickAdd = (e) => {
    e.preventDefault();
    addToCart(
      {
        id: product.id,
        qty: 1,
        variant: product.colors?.[0]?.name || null,
        size: product.sizes?.[0] || null
      },
      { name: dx(product.name) }
    );
  };

  return (
    <article className="card">
      {/* 1. Product Visual Vitrine */}
      <Link className="card__media" to={`/product/${product.id}`} aria-label={dx(product.name)}>
        <ProductArt
          id={product.id}
          shape={product.shape}
          palette={product.palette}
          label={product.name}
          category={product.cat}
        />

        {/* Floating Wishlist Button */}
        <button
          type="button"
          className="btn--ghost"
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            width: '36px',
            height: '36px',
            padding: 0,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
            color: saved ? 'var(--alert)' : 'var(--pearl-2)',
            zIndex: 3
          }}
          onClick={(e) => {
            e.preventDefault();
            toggleWish(product.id, dx(product.name));
          }}
          aria-pressed={saved}
          aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
          title={saved ? 'Saved in wishlist' : 'Save to wishlist'}
        >
          <Icon name={saved ? 'check' : 'heart'} size={16} />
        </button>
      </Link>

      {/* 2. Product Narrative & Information */}
      <div className="card__body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <span className="card__cat">
            {dx(categoryName || product.cat || 'Piece')} &middot; {dx(product.sub || 'Edition')}
          </span>
          {stockBadge}
        </div>

        <Link className="card__name" to={`/product/${product.id}`}>
          {dx(product.name)}
        </Link>

        <p className="card__meta">
          {dx(product.blurb || product.materials)}
        </p>

        {/* 3. Pricing & Ratings */}
        <div className="card__foot">
          <div className="card__price">
            {product.was && <s>{money(product.was)}</s>}
            <span>{money(product.price)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Stars rating={product.rating} size={11} />
            <span style={{ fontSize: '0.74rem', color: 'var(--pearl-3)' }}>{product.rating.toFixed(1)}</span>
          </div>
        </div>

        {/* 4. Action Control */}
        {showQuickAdd && (
          <div className="card__quick">
            <button
              type="button"
              className="btn btn--sm btn--primary"
              style={{ width: '100%', borderRadius: 'var(--r-sm)' }}
              onClick={quickAdd}
              disabled={busy || product.stock === 0}
            >
              {product.stock === 0 ? 'Join Waitlist' : 'Add to Bag'}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

export function ProductGrid({ items, categoryLookup, showQuickAdd = true, className = 'product-grid' }) {
  return (
    <div className={className}>
      {items.map((p) => (
        <ProductCard
          key={p.id}
          product={p}
          categoryName={categoryLookup ? categoryLookup(p.cat) : undefined}
          showQuickAdd={showQuickAdd}
        />
      ))}
    </div>
  );
}
