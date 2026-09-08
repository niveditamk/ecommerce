/* =============================================================
   AURELIS // MACHINE-INDEXED PRODUCT MODULE
   Retro-futuristic catalog card with product index number,
   barcode motif, technical category coordinates, and tactile CTA.
   ============================================================= */
import { Link } from 'react-router-dom';
import { Barcode, Icon, ProductArt, Stars } from './primitives';
import { useStore } from '../context/StoreContext';
import { dx, money } from '../lib/format';

export default function ProductCard({ product, categoryName, showQuickAdd = true }) {
  const { addToCart, toggleWish, isWished, busy } = useStore();
  const saved = isWished(product.id);

  // Extract or format 3-digit product index number (e.g. aur-101 -> PRODUCT 101)
  const numMatch = product.id.match(/\d+/);
  const prodNumber = numMatch ? `PRODUCT ${numMatch[0].padStart(3, '0')}` : `REF // ${product.id.toUpperCase()}`;

  // Availability status
  let stockStatus = '[ IN STOCK ]';
  let statusClass = 'badge--green';
  if (product.stock <= 3 && product.stock > 0) {
    stockStatus = `[ ONLY ${product.stock} LEFT ]`;
    statusClass = 'badge--alert';
  } else if (product.stock === 0) {
    stockStatus = '[ OUT OF STOCK ]';
    statusClass = 'badge--terminal';
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
      {/* 1. Machine Index Header: PRODUCT 024 + Availability */}
      <div className="card__top-index">
        <span style={{ fontWeight: 700, color: 'var(--pearl)', letterSpacing: '0.06em' }}>
          {prodNumber}
        </span>
        <span className={`badge ${statusClass}`} style={{ fontSize: '0.62rem', padding: '2px 6px' }}>
          {stockStatus}
        </span>
      </div>

      {/* 2. Product Visual (High-Res Photo or Technical CAD Blueprint) */}
      <Link className="card__media" to={`/product/${product.id}`} aria-label={dx(product.name)}>
        <ProductArt
          id={product.id}
          shape={product.shape}
          palette={product.palette}
          label={product.name}
          category={product.cat}
        />
      </Link>

      {/* 3. Barcode Decoration & SKU */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingBottom: '6px', borderBottom: '1px dotted var(--line)' }}>
        <Barcode code={product.id} />
        <span className="barcode-meta">
          ID // {product.id.toUpperCase()}
        </span>
      </div>

      {/* 4. Product Metadata & Title */}
      <div className="card__body">
        <span className="card__cat" style={{ color: 'var(--color-terminal-green-text)', fontWeight: 700 }}>
          {dx(categoryName || product.cat || 'OBJECT').toUpperCase()} // {dx(product.sub || 'EDITION')}
        </span>

        <Link className="card__name" to={`/product/${product.id}`}>
          {dx(product.name)}
        </Link>

        <p className="card__meta" style={{ margin: '4px 0 10px', fontSize: '0.74rem', color: 'var(--pearl-3)' }}>
          {dx(product.blurb || product.materials)}
        </p>

        {/* 5. Monospace Price & Star Rating */}
        <div className="card__foot">
          <div className="card__price">
            {product.was && <s>{money(product.was)}</s>}
            <span>{money(product.price)}</span>
          </div>
          <div className="card__stars">
            <Stars rating={product.rating} size={11} />
            <em style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>{product.rating.toFixed(1)}</em>
          </div>
        </div>

        {/* 6. Tactical Action Controls */}
        <div className="card__quick">
          {showQuickAdd && (
            <button
              type="button"
              className="btn btn--sm btn--primary"
              style={{ flexGrow: 1, padding: '9px 12px', fontSize: '0.74rem' }}
              onClick={quickAdd}
              disabled={busy || product.stock === 0}
            >
              {product.stock === 0 ? '[ WAITLIST ]' : '[ ADD TO CART ]'}
            </button>
          )}
          <button
            type="button"
            className={`btn btn--sm btn--outline${saved ? ' is-on' : ''}`}
            style={{ padding: '8px 12px', minWidth: '40px' }}
            onClick={(e) => {
              e.preventDefault();
              toggleWish(product.id, dx(product.name));
            }}
            aria-pressed={saved}
            aria-label={saved ? 'Remove from saved' : 'Save to wishlist'}
            title={saved ? 'Saved in memory' : 'Save object'}
          >
            <Icon name={saved ? 'check' : 'heart'} size={14} />
          </button>
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ items, categoryLookup, showQuickAdd = true, className = 'card-grid' }) {
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
