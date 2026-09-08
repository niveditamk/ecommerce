/* =============================================================
   AURELIS MAISON — SEARCH RESULTS PAGE
   Instant faceted search discovery, sorting, and category filters.
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
  { value: 'relevance', label: 'Best match' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'newest', label: 'Newest First' }
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
      <Breadcrumbs trail={[{ label: 'Home', to: '/' }, { label: 'Search Catalogue' }]} />

      <PageHead
        kicker="// TERMINAL DISCOVERY PROTOCOL"
        title={query ? `QUERY: "${query.toUpperCase()}"` : 'DATABASE SEARCH'}
        lede={
          query
            ? `Indexed specimen records matching "${query}" across jewellery, horology, parfums, and leather ateliers.`
            : 'Query system archive by piece designation, metallurgical standard, atelier discipline, or reference SKU.'
        }
        aside={
          <button type="button" className="btn btn--gold btn--sm" onClick={() => openLayer('search')}>
            &gt;_ REFINE QUERY
          </button>
        }
      />

      <section className="section" style={{ paddingTop: 0 }}>
        {!query ? (
          <Empty
            icon="search"
            title="AWAITING SYSTEM QUERY PARAMETERS"
            body="Query system records by material ('18k gold', 'citrine'), discipline ('horology', 'parfums'), or unique specimen code."
            cta={{ to: '/categories', label: 'EXPLORE ALL DISCIPLINES [ 04 ]' }}
          />
        ) : loading ? (
          <div className="card-grid">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card" style={{ minHeight: 380 }}>
                <div style={{ aspectRatio: '3/4', background: 'var(--color-bone)' }} />
              </div>
            ))}
          </div>
        ) : (data?.total || 0) === 0 ? (
          <Empty
            icon="search"
            title={`ZERO RECORDS LOCATED FOR "${query.toUpperCase()}"`}
            body="All specimens are crafted in numbered batches. Certain editions may be restricted to private archive ledgers. Concierge can verify unlisted allocations."
            cta={{ to: '/help', label: 'TRANSMIT CONCIERGE DISPATCH' }}
          />
        ) : (
          <>
            {/* Filter toolbar */}
            <div className="filter-bar" style={{ background: 'var(--color-paper-light)', border: '1px solid var(--line)', borderRadius: 'var(--r-xs)', padding: '10px 16px' }}>
              <div className="filter-bar__left" style={{ alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--color-terminal-green-text)', fontWeight: 700, marginRight: '12px' }}>
                  [ {results.length} / {data.total} SPECIMENS ]
                </span>
                {facets.map((f) => (
                  <button
                    key={f.slug}
                    type="button"
                    className={`chip${facet === f.slug ? ' is-active' : ''}`}
                    onClick={() => setFacet(f.slug)}
                    style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}
                  >
                    {f.name.toUpperCase()} [{f.n}]
                  </button>
                ))}
                {facet && (
                  <button type="button" className="tiny" onClick={() => setFacet('')} style={{ color: 'var(--error)', textDecoration: 'none', fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>
                    [ &times; RESET FILTER ]
                  </button>
                )}
              </div>

              <div className="center" style={{ gap: '8px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--pearl-3)' }}>SORT_ORDER:</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.72rem',
                    border: '1px solid var(--line-dark)',
                    borderRadius: 'var(--r-xs)',
                    background: 'var(--color-paper)',
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

            {/* Archive Assistance */}
            <div style={{ marginTop: '48px', padding: '32px', background: 'var(--color-bone)', border: '1px solid var(--line)', borderRadius: 'var(--r-xs)' }}>
              <div className="between wrap" style={{ gap: '20px' }}>
                <div>
                  <h4 className="h4" style={{ fontFamily: 'var(--serif)', fontSize: '20px' }}>
                    Looking for a specific archive edition?
                  </h4>
                  <p style={{ fontSize: '14px', color: 'var(--pearl-3)', marginTop: '4px', maxWidth: '52ch' }}>
                    Over two thousand historic pieces and custom commissions reside in our private Geneva vault.
                  </p>
                </div>
                <Link className="btn btn--gold btn--sm" to="/help">
                  Inquire with Archive
                </Link>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
