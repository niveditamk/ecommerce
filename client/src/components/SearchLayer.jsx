/* =============================================================
   AURELIS MAISON — SEARCH OVERLAY
   Debounced live discovery, popular search suggestions,
   category shortcuts, and instant product vitrine previews.
   ============================================================= */
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon, ProductArt } from './primitives';
import { useStore } from '../context/StoreContext';
import api from '../lib/api';
import { dx, money } from '../lib/format';

const POPULAR_SEARCHES = ['Solstice Signet', 'Calibre 09', 'Fumee', 'Bastion Tote', 'Carre Astral', 'Cire No.7', '18k Gold', 'Mechanical'];

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
    <div className={`search-layer${open ? ' is-open' : ''}`} aria-hidden={!open} role="dialog" aria-label="Search the catalogue">
      <div className="search-layer__inner">
        {/* Terminal Header */}
        <div className="search-terminal-header">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span className="status-dot" />
            <span>CATALOGUE DATABASE // QUERY INTERFACE 1980.2026</span>
          </div>
          <button
            type="button"
            onClick={closeLayer}
            style={{ background: 'transparent', border: 'none', color: 'rgba(255, 255, 255, 0.7)', fontFamily: 'var(--font-mono)', fontSize: '0.68rem', cursor: 'pointer', padding: '2px 6px', display: 'flex', alignItems: 'center', gap: '4px' }}
            aria-label="Close search"
          >
            <span>[ ESC // CLOSE ]</span>
          </button>
        </div>

        {/* Search Input Box */}
        <form className="search-box" onSubmit={submit} role="search">
          <span style={{ color: 'var(--color-terminal-green-text)', display: 'flex', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.1rem' }}>
            &gt;_
          </span>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="QUERY BY SPECIMEN, MATERIAL, OR SKU..."
            aria-label="Search the catalogue"
            autoComplete="off"
            style={{ fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.04em' }}
          />
          <button className="icon-btn" type="button" onClick={closeLayer} aria-label="Close search">
            <Icon name="close" size={18} />
          </button>
        </form>

        {/* Suggestions / Results Panel */}
        {!query.trim() ? (
          <div className="search-sug">
            <h5 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', letterSpacing: '0.08em', color: 'var(--color-terminal-green-text)' }}>
              // FREQUENT SEARCH TOKENS
            </h5>
            <div className="search-sug__row">
              {POPULAR_SEARCHES.map((term) => (
                <button key={term} type="button" className="chip" onClick={() => setQuery(term)} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                  &gt; {term}
                </button>
              ))}
            </div>

            <div className="rule" style={{ margin: '20px 0' }} />

            <h5 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', letterSpacing: '0.08em', color: 'var(--color-terminal-green-text)' }}>
              // DISCIPLINE DIRECTORIES
            </h5>
            <div className="search-sug__row">
              {categories.map((c, idx) => (
                <Link key={c.slug} className="chip" to={`/category/${c.slug}`} onClick={closeLayer} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                  0{idx + 1} // {dx(c.name).toUpperCase()}
                </Link>
              ))}
            </div>
          </div>
        ) : results && results.total === 0 && !searching ? (
          <div className="search-sug" style={{ textAlign: 'center', padding: '36px 20px' }}>
            <h5 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--color-obsidian)', letterSpacing: '0.08em' }}>
              [ 0 MATCHING SPECIMENS LOCATED ]
            </h5>
            <p className="muted" style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', maxWidth: '42ch', margin: '8px auto 20px' }}>
              No specimen in the current active ledger matches &ldquo;{query}&rdquo;. Contact central concierge for unlisted archive allocations.
            </p>
            <Link className="btn btn--sm btn--outline" to="/help" onClick={closeLayer}>
              TRANSMIT CONCIERGE INQUIRY &rarr;
            </Link>
          </div>
        ) : results ? (
          <div className="search-sug">
            <div className="between" style={{ marginBottom: '16px', borderBottom: '1px solid var(--line)', paddingBottom: '8px' }}>
              <h5 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', letterSpacing: '0.06em', color: 'var(--pearl)' }}>
                [ {results.total} {results.total === 1 ? 'SPECIMEN IDENTIFIED' : 'SPECIMENS IDENTIFIED'} ]
              </h5>
              {searching && <span className="badge badge--green">UPDATING...</span>}
            </div>

            <div style={{ display: 'grid', gap: '8px' }}>
              {results.items.slice(0, 6).map((p) => (
                <Link key={p.id} className="search-sug__prod" to={`/product/${p.id}`} onClick={closeLayer} style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-xs)', background: 'var(--color-paper-light)', padding: '8px 12px' }}>
                  <span className="thumb" style={{ width: '48px', height: '48px', borderRadius: 'var(--r-xs)', overflow: 'hidden', border: '1px solid var(--line)' }}>
                    <ProductArt id={p.id} shape={p.shape} palette={p.palette} label={p.name} />
                  </span>
                  <span style={{ flex: 1 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--color-terminal-green-text)', fontWeight: 700, display: 'block' }}>
                      REF // {p.id.toUpperCase()} &middot; {dx(p.sub || p.cat).toUpperCase()}
                    </span>
                    <span style={{ fontFamily: 'var(--font-grotesk)', fontSize: '0.95rem', fontWeight: 700, color: 'var(--pearl)', display: 'block' }}>
                      {dx(p.name)}
                    </span>
                    <span className="tiny" style={{ color: 'var(--pearl-3)', fontFamily: 'var(--font-mono)', fontSize: '0.68rem' }}>{dx(p.materials)}</span>
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.92rem', fontWeight: 700, color: 'var(--pearl)' }}>
                    {money(p.price)}
                  </span>
                </Link>
              ))}
            </div>

            <Link
              className="btn btn--sm btn--gold btn--block"
              style={{ marginTop: '16px' }}
              to={`/search?q=${encodeURIComponent(query.trim())}`}
              onClick={closeLayer}
            >
              ACCESS ALL {results.total} RESULTS IN DATABASE &rarr;
            </Link>
          </div>
        ) : (
          <div className="search-sug" style={{ textAlign: 'center', padding: '24px' }}>
            <span className="tiny" style={{ color: 'var(--pearl-3)', fontFamily: 'var(--font-mono)' }}>SCANNING SYSTEM DATABASE...</span>
          </div>
        )}
      </div>
    </div>
  );
}
