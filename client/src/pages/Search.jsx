/* =============================================================
   AURELIS MAISON // SEARCH RESULTS & DISCOVERY
   Faceted search discovery, sorting, and category filters.
   ============================================================= */
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Breadcrumbs, Empty, Icon, PageHead, Reveal } from '../components/primitives';
import { ProductGrid } from '../components/ProductCard';
import { useStore } from '../context/StoreContext';
import { useAsync } from '../lib/useAsync';
import api from '../lib/api';
import { dx, money } from '../lib/format';

const SORTS = [
  { value: 'relevance', label: 'Recommended' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'newest', label: 'Newest Additions' }
];

export default function Search() {
  const [params, setParams] = useSearchParams();
  const { categories, openLayer } = useStore();
  const query = params.get('q') || '';
  const facet = params.get('cat') || '';
  const [sort, setSort] = useState('relevance');

  const { data, loading } = useAsync(() => (query ? api.search(query) : Promise.resolve({ items: [], total: 0 })), [query]);

  const results = useMemo(() => {
    let list = data?.items || [];
    if (facet) list = list.filter((p) => p.cat === facet);
    const sorted = [...list];
    if (sort === 'price-asc') sorted.sort((a, b) => a.price - b.price);
    if (sort === 'price-desc') sorted.sort((a, b) => b.price - a.price);
    if (sort === 'rating') sorted.sort((a, b) => b.rating - a.rating);
    if (sort === 'newest') sorted.sort((a, b) => b.year - a.year);
    return sorted;
  }, [data, facet, sort]);

  const facets = useMemo(() => {
    const counts = new Map();
    (data?.items || []).forEach((p) => counts.set(p.cat, (counts.get(p.cat) || 0) + 1));
    return [...counts.entries()].map(([slug, n]) => ({
      slug, n, name: dx(categories.find((c) => c.slug === slug)?.name || slug)
    }));
  }, [data, categories]);

  const setFacet = (slug) => {
    const next = new URLSearchParams(params);
    if (!slug || slug === facet) next.delete('cat');
    else next.set('cat', slug);
    setParams(next);
  };

  const catName = (slug) => dx(categories.find((c) => c.slug === slug)?.name || '');

  return (
    <div className="shell">
      <Breadcrumbs trail={[{ label: 'Home', to: '/' }, { label: 'Search' }]} />

      <PageHead
        kicker="Search Results"
        title={query ? `Results for “${query}”` : 'Maison Catalogue Search'}
        lede={
          query
            ? `Creations matching “${query}” across our fine jewellery, horology, and leather ateliers.`
            : 'Explore our creations by material, collection, artisan métier, or reference.'
        }
        aside={
          <button type="button" className="btn btn--outline btn--sm" onClick={() => openLayer('search')}>
            Refine Search
          </button>
        }
      />

      <section className="section" style={{ paddingTop: 0 }}>
        {!query ? (
          <Empty
            icon="search"
            title="Search the Maison Catalogue"
            body="Discover creations by material ('18k gold', 'citrine'), collection ('horology', 'jewellery'), or reference number."
            cta={{ to: '/categories', label: 'Explore All Collections' }}
          />
        ) : loading ? (
          <div className="product-grid">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card" style={{ minHeight: 380 }}>
                <div style={{ aspectRatio: '1/1', background: 'var(--color-bone)' }} />
              </div>
            ))}
          </div>
        ) : (data?.total || 0) === 0 ? (
          <Empty
            icon="search"
            title={`No results found for “${query}”`}
            body="All creations are handcrafted in limited series. Our concierge team can verify archive pieces or assist with bespoke commissions."
            cta={{ to: '/help', label: 'Contact Maison Concierge' }}
          />
        ) : (
          <>
            {/* Filter Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '16px 20px', background: '#FFFFFF', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--pearl-2)', marginRight: '8px' }}>
                  {results.length} {results.length === 1 ? 'Piece' : 'Pieces'}
                </span>
                {facets.map((f) => (
                  <button
                    key={f.slug}
                    type="button"
                    className={`btn btn--sm ${facet === f.slug ? 'btn--primary' : 'btn--outline'}`}
                    onClick={() => setFacet(f.slug)}
                    style={{ borderRadius: 'var(--r-pill)', fontSize: '0.74rem' }}
                  >
                    {f.name} ({f.n})
                  </button>
                ))}
                {facet && (
                  <button type="button" className="btn--ghost" onClick={() => setFacet('')} style={{ fontSize: '0.76rem', color: 'var(--alert)' }}>
                    Reset Filter
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--pearl-3)' }}>Sort by:</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  style={{
                    padding: '8px 14px',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '0.82rem',
                    border: '1px solid var(--line-control)',
                    borderRadius: 'var(--r-pill)',
                    background: '#FFFFFF',
                    color: 'var(--pearl)'
                  }}
                >
                  {SORTS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <Reveal>
              <ProductGrid items={results} categoryLookup={catName} />
            </Reveal>

            {/* Concierge Assistance */}
            <div style={{ marginTop: '56px', padding: '36px', background: '#FFFFFF', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', boxShadow: 'var(--sh-1)' }}>
              <div className="between wrap" style={{ gap: '24px', alignItems: 'center' }}>
                <div>
                  <h3 className="h3" style={{ fontSize: '1.4rem' }}>
                    Looking for a specific archive edition?
                  </h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--pearl-3)', marginTop: '6px', maxWidth: '52ch' }}>
                    Historic references, rare stone allocations, and private commissions can be accessed through our Geneva salon archives.
                  </p>
                </div>
                <Link className="btn btn--primary" to="/help">
                  Inquire with Concierge
                </Link>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
