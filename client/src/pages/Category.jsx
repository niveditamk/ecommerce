/* =============================================================
   AURELIS MAISON — CATEGORY / COLLECTION LISTING PAGE
   Editorial collection vitrine with real-time URL-backed
   sub-category filters, sort controls, badge filters, and pagination.
   ============================================================= */
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Breadcrumbs, Empty, Icon, Loading, PageHead } from '../components/primitives';
import { ProductGrid } from '../components/ProductCard';
import { useStore } from '../context/StoreContext';
import { useAsync } from '../lib/useAsync';
import api from '../lib/api';
import { dx, money } from '../lib/format';

const SORTS = [
  { value: 'featured', label: 'Featured / Considered' },
  { value: 'newest', label: 'Newest Arrivals' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Highest Rated' }
];

const BADGES = ['New', 'Rare', 'Icon', 'Atelier'];

export default function Category() {
  const { slug } = useParams();
  const { categories } = useStore();
  const [params, setParams] = useSearchParams();

  const sub = params.get('sub') || '';
  const sort = params.get('sort') || 'featured';
  const min = params.get('min') || '';
  const max = params.get('max') || '';
  const badge = params.get('badge') || '';
  const page = Number(params.get('page') || 1);

  const category = useAsync(() => api.category(slug), [slug]);
  const listing = useAsync(
    () => api.products({ cat: slug, sub, sort, min, max, badge, page, perPage: 12 }),
    [slug, sub, sort, min, max, badge, page]
  );

  const meta = category.data;
  const currentCategory = categories.find((c) => c.slug === slug);
  const subCategories = currentCategory?.sub || [];

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (!value) next.delete(key);
    else next.set(key, value);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: false });
  };

  const activeBadges = badge ? badge.split(',').filter(Boolean) : [];
  const toggleBadge = (b) => {
    const next = activeBadges.includes(b)
      ? activeBadges.filter((x) => x !== b)
      : [...activeBadges, b];
    setParam('badge', next.join(','));
  };

  const applied = useMemo(() => {
    const list = [];
    if (sub) list.push({ key: 'sub', label: dx(sub) });
    if (max) list.push({ key: 'max', label: `Under ${money(max)}` });
    activeBadges.forEach((b) => list.push({ key: `badge:${b}`, label: b }));
    return list;
  }, [sub, max, badge]);

  const clearApplied = (key) => {
    if (key.startsWith('badge:')) toggleBadge(key.slice(6));
    else setParam(key, '');
  };

  const clearAll = () => setParams(new URLSearchParams(sort !== 'featured' ? { sort } : {}));

  const items = listing.data?.items || [];
  const total = listing.data?.total ?? 0;
  const pages = listing.data?.pages ?? 1;

  if (category.error) {
    return (
      <div className="shell section">
        <Empty
          icon="close"
          title="Collection Not Found"
          body="This collection is not listed in the current house catalogue. It may have been retired to the archive."
          cta={{ to: '/categories', label: 'View All Collections' }}
        />
      </div>
    );
  }

  return (
    <div className="shell">
      <Breadcrumbs
        trail={[
          { label: 'SYS.ROOT', to: '/' },
          { label: 'DISCIPLINES', to: '/categories' },
          { label: meta ? dx(meta.name).toUpperCase() : '...' }
        ]}
      />

      <PageHead
        kicker={meta ? `// DISCIPLINE CODE: ${slug.toUpperCase()} · ${dx(meta.tag || 'FACILITY')}` : ''}
        title={meta ? dx(meta.name).toUpperCase() : 'COLLECTION'}
        lede={meta ? dx(meta.blurb) : ''}
        aside={
          <div className="badge badge--green" style={{ padding: '8px 14px', fontSize: '0.72rem' }}>
            [ {total} {total === 1 ? 'SPECIMEN AVAILABLE' : 'SPECIMENS AVAILABLE'} ]
          </div>
        }
      />

      {/* Sub-categories & Filter Bar */}
      <div className="filter-bar" style={{ background: 'var(--color-paper-light)', border: '1px solid var(--line)', borderRadius: 'var(--r-xs)', padding: '10px 16px' }}>
        {/* Left: Subcategory chips */}
        <div className="filter-bar__left" style={{ alignItems: 'center' }}>
          <button
            type="button"
            className={`chip${!sub ? ' is-active' : ''}`}
            onClick={() => setParam('sub', '')}
            style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}
          >
            [ ALL SPECIMENS ]
          </button>
          {subCategories.map((s) => (
            <button
              key={s}
              type="button"
              className={`chip${sub === s ? ' is-active' : ''}`}
              onClick={() => setParam('sub', sub === s ? '' : s)}
              style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}
            >
              [ {dx(s).toUpperCase()} ]
            </button>
          ))}

          {/* Badges Filters */}
          <div style={{ display: 'inline-flex', gap: '6px', marginLeft: '8px' }}>
            {BADGES.map((b) => (
              <button
                key={b}
                type="button"
                className={`chip${activeBadges.includes(b) ? ' is-active' : ''}`}
                onClick={() => toggleBadge(b)}
                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem' }}
              >
                {b.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Sort selector */}
        <div className="center" style={{ gap: '10px' }}>
          <label htmlFor="sort-select" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--pearl-3)' }}>
            SORT_ORDER:
          </label>
          <select
            id="sort-select"
            value={sort}
            onChange={(e) => setParam('sort', e.target.value)}
            style={{
              padding: '6px 12px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.72rem',
              border: '1px solid var(--line-dark)',
              borderRadius: 'var(--r-xs)',
              background: 'var(--color-paper)',
              color: 'var(--pearl)',
              cursor: 'pointer'
            }}
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Applied filter tags */}
      {applied.length > 0 && (
        <div className="filter-tags" style={{ marginBottom: '24px' }}>
          <span className="tiny" style={{ color: 'var(--pearl-3)' }}>Active Filters:</span>
          {applied.map((a) => (
            <span key={a.key} className="filter-tag">
              <span>{a.label}</span>
              <button type="button" onClick={() => clearApplied(a.key)} aria-label={`Remove filter ${a.label}`}>
                &times;
              </button>
            </span>
          ))}
          <button
            type="button"
            className="tiny"
            onClick={clearAll}
            style={{ textDecoration: 'underline', color: 'var(--pearl-3)', marginLeft: '8px' }}
          >
            Clear all
          </button>
        </div>
      )}

      {/* Products Grid */}
      <section className="section" style={{ paddingTop: 0 }}>
        {listing.loading ? (
          <div className="card-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div className="card" key={i}>
                <div style={{ aspectRatio: '3/4', background: 'var(--color-bone)' }} />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: '64px 20px', textAlign: 'center' }}>
            <h3 className="h3">No pieces match these criteria</h3>
            <p className="muted" style={{ marginTop: '8px', marginBottom: '20px' }}>
              Try removing some filters or explore all items in {meta ? dx(meta.name) : 'the collection'}.
            </p>
            <button type="button" className="btn btn--sm btn--gold" onClick={clearAll}>
              Reset Filters
            </button>
          </div>
        ) : (
          <ProductGrid items={items} />
        )}

        {/* Pagination */}
        {pages > 1 && (
          <nav className="center" style={{ justifyContent: 'center', gap: '8px', marginTop: '64px' }} aria-label="Pagination">
            {Array.from({ length: pages }).map((_, i) => {
              const p = i + 1;
              return (
                <button
                  key={p}
                  type="button"
                  className={`btn btn--sm${p === page ? ' btn--gold' : ' btn--outline'}`}
                  onClick={() => setParam('page', String(p))}
                  aria-current={p === page ? 'page' : undefined}
                >
                  {p}
                </button>
              );
            })}
          </nav>
        )}
      </section>
    </div>
  );
}
