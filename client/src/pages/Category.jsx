/* =============================================================
   AURELIS MAISON // EDITORIAL COLLECTION PAGE
   Collection vitrine with real-time sub-category filters,
   sort controls, badge filters, and pagination.
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
  { value: 'featured', label: 'Featured / Recommended' },
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
          { label: 'Home', to: '/' },
          { label: 'Collections', to: '/categories' },
          { label: meta ? dx(meta.name) : '...' }
        ]}
      />

      <PageHead
        kicker={meta ? `Maison Collection · ${dx(meta.tag || 'Handcrafted')}` : ''}
        title={meta ? dx(meta.name) : 'Collection'}
        lede={meta ? dx(meta.blurb) : ''}
        aside={
          <div className="badge badge--green" style={{ padding: '8px 16px', fontSize: '0.78rem' }}>
            {total} {total === 1 ? 'Piece Available' : 'Pieces Available'}
          </div>
        }
      />

      {/* Sub-categories & Filter Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '16px 20px', background: '#FFFFFF', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', marginBottom: '24px' }}>
        {/* Left: Subcategory chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn btn--sm ${!sub ? 'btn--primary' : 'btn--outline'}`}
            onClick={() => setParam('sub', '')}
            style={{ borderRadius: 'var(--r-pill)', fontSize: '0.76rem' }}
          >
            All Creations
          </button>
          {subCategories.map((s) => (
            <button
              key={s}
              type="button"
              className={`btn btn--sm ${sub === s ? 'btn--primary' : 'btn--outline'}`}
              onClick={() => setParam('sub', sub === s ? '' : s)}
              style={{ borderRadius: 'var(--r-pill)', fontSize: '0.76rem' }}
            >
              {dx(s)}
            </button>
          ))}

          {/* Badges Filters */}
          <div style={{ display: 'inline-flex', gap: '6px', marginLeft: '6px' }}>
            {BADGES.map((b) => (
              <button
                key={b}
                type="button"
                className={`btn btn--sm ${activeBadges.includes(b) ? 'btn--gold' : 'btn--ghost'}`}
                onClick={() => toggleBadge(b)}
                style={{ borderRadius: 'var(--r-pill)', fontSize: '0.74rem' }}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Sort Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label htmlFor="sort-select" style={{ fontSize: '0.78rem', color: 'var(--pearl-3)' }}>
            Sort by:
          </label>
          <select
            id="sort-select"
            value={sort}
            onChange={(e) => setParam('sort', e.target.value)}
            style={{
              padding: '8px 14px',
              fontFamily: 'var(--font-sans)',
              fontSize: '0.82rem',
              border: '1px solid var(--line-control)',
              borderRadius: 'var(--r-pill)',
              background: '#FFFFFF',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--pearl-3)' }}>Active Filters:</span>
          {applied.map((a) => (
            <span key={a.key} className="badge badge--gold" style={{ padding: '4px 10px', fontSize: '0.72rem' }}>
              <span>{a.label}</span>
              <button
                type="button"
                onClick={() => clearApplied(a.key)}
                aria-label={`Remove filter ${a.label}`}
                style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: '4px', color: 'inherit' }}
              >
                &times;
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={clearAll}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--alert)', marginLeft: '8px' }}
          >
            Clear All
          </button>
        </div>
      )}

      {/* Product Grid */}
      {listing.loading && items.length === 0 ? (
        <Loading label="Curating the atelier collection" />
      ) : items.length === 0 ? (
        <Empty
          icon="bag"
          title="No Pieces Match Your Selection"
          body="Try clearing your active filters to view all creations in this collection."
          cta={{ onClick: clearAll, label: 'Reset All Filters' }}
        />
      ) : (
        <>
          <ProductGrid items={items} />

          {/* Pagination */}
          {pages > 1 && (
            <nav className="pagination" style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '56px' }} aria-label="Pagination">
              {Array.from({ length: pages }).map((_, i) => {
                const p = i + 1;
                const isCurrent = p === page;
                return (
                  <button
                    key={p}
                    type="button"
                    className={`btn btn--sm ${isCurrent ? 'btn--primary' : 'btn--outline'}`}
                    onClick={() => setParam('page', String(p))}
                    aria-current={isCurrent ? 'page' : undefined}
                    style={{ minWidth: '40px', borderRadius: 'var(--r-pill)' }}
                  >
                    {p}
                  </button>
                );
              })}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
