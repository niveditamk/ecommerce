/* =============================================================
   AURELIS MAISON // EDITORIAL LUXURY SPOTLIGHT SEARCH
   Instant debounced discovery, popular suggestions,
   category shortcuts, and real-time product vitrine previews.
   ============================================================= */
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon, ProductArt } from './primitives';
import { useStore } from '../context/StoreContext';
import api from '../lib/api';
import { dx, money } from '../lib/format';

const POPULAR_SEARCHES = ['Solstice Signet', 'Calibre 09', 'Ember Band', 'Bastion Tote', '18k Gold Rings', 'Automatic Watch'];

export default function SearchLayer() {
  const { layer, closeLayer, categories } = useStore();
  const open = layer === 'search';
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 180);
      return () => clearTimeout(t);
    }
    setQuery('');
    setResults(null);
    return undefined;
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const term = query.trim();
    if (!term) {
      setResults(null);
      setSearching(false);
      return undefined;
    }

    const controller = new AbortController();
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const data = await api.search(term, controller.signal);
        setResults(data);
      } catch (err) {
        if (err.name !== 'AbortError') setResults({ items: [], total: 0, query: term });
      } finally {
        setSearching(false);
      }
    }, 200);

    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [query, open]);

  const submit = (e) => {
    e.preventDefault();
    const term = query.trim();
    if (!term) return;
    closeLayer();
    navigate(`/search?q=${encodeURIComponent(term)}`);
  };

  return (
    <div className={`search-layer${open ? ' is-open' : ''}`} aria-hidden={!open} role="dialog" aria-label="Search collections">
      <div className="search-layer__inner">
        {/* Luxury Search Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid var(--line)' }}>
          <span className="eyebrow" style={{ margin: 0 }}>Discover the Maison</span>
          <button
            type="button"
            className="btn--ghost"
            onClick={closeLayer}
            aria-label="Close search"
            style={{ padding: '6px 12px', fontSize: '0.82rem' }}
          >
            Close &times;
          </button>
        </div>

        {/* Search Input */}
        <form className="search-box" onSubmit={submit} role="search" style={{ marginTop: '20px' }}>
          <Icon name="search" size={20} />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search fine jewellery, horology, materials, or collections..."
            aria-label="Search collections"
          />
          {query && (
            <button
              type="button"
              className="btn--ghost"
              onClick={() => setQuery('')}
              aria-label="Clear query"
              style={{ padding: '4px 8px' }}
            >
              Clear
            </button>
          )}
        </form>

        {/* Suggestions & Quick Filters */}
        {!query && (
          <div style={{ marginTop: '28px' }}>
            <span className="eyebrow" style={{ fontSize: '0.7rem' }}>Popular Searches</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
              {POPULAR_SEARCHES.map((term) => (
                <button
                  key={term}
                  type="button"
                  className="btn btn--sm btn--outline"
                  onClick={() => setQuery(term)}
                  style={{ borderRadius: 'var(--r-pill)', textTransform: 'none', letterSpacing: '0.02em', fontSize: '0.82rem' }}
                >
                  {term}
                </button>
              ))}
            </div>

            <div style={{ marginTop: '28px' }}>
              <span className="eyebrow" style={{ fontSize: '0.7rem' }}>Explore by Collection</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px', marginTop: '12px' }}>
                {categories.map((c) => (
                  <Link
                    key={c.slug}
                    to={`/category/${c.slug}`}
                    onClick={closeLayer}
                    className="btn btn--sm btn--outline"
                    style={{ justifyContent: 'flex-start', padding: '12px 16px', borderRadius: 'var(--r-sm)' }}
                  >
                    {dx(c.name)} &rarr;
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Live Search Results Preview */}
        {searching && (
          <div style={{ padding: '36px 0', textAlign: 'center', color: 'var(--pearl-3)' }}>
            Searching the Maison archives...
          </div>
        )}

        {results && !searching && (
          <div style={{ marginTop: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span className="eyebrow" style={{ margin: 0 }}>
                {results.total} {results.total === 1 ? 'Piece Found' : 'Pieces Found'}
              </span>
              {results.total > 4 && (
                <button
                  type="button"
                  className="btn btn--sm btn--ghost"
                  onClick={submit}
                >
                  View all results &rarr;
                </button>
              )}
            </div>

            {results.items.length === 0 ? (
              <div style={{ padding: '36px 0', textAlign: 'center' }}>
                <p style={{ color: 'var(--pearl-2)' }}>No creations match &ldquo;{results.query}&rdquo;.</p>
                <p className="tiny" style={{ color: 'var(--pearl-3)', marginTop: '4px' }}>
                  Please verify your terms or browse our four primary collections.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
                {results.items.slice(0, 4).map((p) => (
                  <Link
                    key={p.id}
                    to={`/product/${p.id}`}
                    onClick={closeLayer}
                    style={{ textDecoration: 'none', color: 'inherit', background: '#FFFFFF', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', overflow: 'hidden', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}
                  >
                    <div style={{ aspectRatio: '1/1', background: 'var(--color-bone)', borderRadius: 'var(--r-xs)', overflow: 'hidden' }}>
                      <ProductArt id={p.id} shape={p.shape} palette={p.palette} label={p.name} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--gold-text)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        {dx(p.cat)}
                      </div>
                      <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1rem', fontWeight: 500, color: 'var(--pearl)', margin: '2px 0' }}>
                        {dx(p.name)}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--pearl)' }}>
                        {money(p.price)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
