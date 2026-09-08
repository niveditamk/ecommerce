/* =============================================================
   AURELIS MAISON — ORDERS / ORDER HISTORY
   Collector register of past orders and real-time status tracking.
   ============================================================= */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumbs, Empty, Icon, PageHead, ProductArt } from '../../components/primitives';
import { AccountNav } from '../../components/checkout';
import { useStore } from '../../context/StoreContext';
import { useAsync } from '../../lib/useAsync';
import api from '../../lib/api';
import { dx, formatDate, money, paletteForVariant } from '../../lib/format';

const FILTERS = ['All', 'In Transit', 'Delivered', 'Confirmed'];
const STATUS_TONE = { Delivered: 'badge--jade', 'In Transit': 'badge--alert', Confirmed: 'badge--gold' };

export default function Orders() {
  const { session } = useStore();
  const { data, loading } = useAsync(() => api.orders(), [session.orders.length]);
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');

  const orders = data?.items || [];

  const shown = useMemo(() => {
    let list = orders;
    if (filter !== 'All') list = list.filter((o) => o.status === filter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          o.items.some((i) => dx(i.product?.name || '').toLowerCase().includes(q))
      );
    }
    return list;
  }, [orders, filter, query]);

  const totalSpend = orders.reduce((n, o) => n + (o.totals?.total || 0), 0);
  const totalPieces = orders.reduce((n, o) => n + o.items.reduce((m, i) => m + i.qty, 0), 0);

  return (
    <div className="shell">
      <Breadcrumbs trail={[{ label: 'Home', to: '/' }, { label: 'Account', to: '/account/profile' }, { label: 'Orders' }]} />

      <PageHead
        kicker="Collector Register"
        title="Your Orders &amp; Commissions"
        lede="Complete chronological record of every piece crafted for you, with attached service history."
      />

      <section className="section" style={{ paddingTop: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '48px', alignItems: 'start' }}>
          <AccountNav />

          <div>
            {/* Stat Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              {[
                ['Orders Placed', orders.length],
                ['Pieces Owned', totalPieces],
                ['Collection Value', money(totalSpend)],
                ['Servicing Guarantee', 'Lifetime']
              ].map(([label, value]) => (
                <div key={label} style={{ background: 'var(--color-bone)', padding: '16px', borderRadius: 'var(--r-xs)', border: '1px solid var(--line)' }}>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: '24px', fontWeight: 500, color: 'var(--pearl)' }}>{value}</div>
                  <div className="tiny" style={{ color: 'var(--pearl-3)', marginTop: '4px' }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Filter toolbar */}
            <div className="filter-bar">
              <div className="filter-bar__left">
                {FILTERS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    className={`chip${filter === f ? ' is-active' : ''}`}
                    onClick={() => setFilter(f)}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <input
                type="search"
                style={{ maxWidth: '240px', padding: '6px 12px', fontSize: '13px' }}
                placeholder="Search orders or pieces…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search orders"
              />
            </div>

            {/* Orders list */}
            {loading ? (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--pearl-3)' }}>
                Retrieving orders from the register…
              </div>
            ) : shown.length === 0 ? (
              <Empty
                icon="box"
                title={orders.length === 0 ? 'No Orders Placed Yet' : 'No Matching Orders Found'}
                body={
                  orders.length === 0
                    ? 'When you acquire a piece, its progress through the atelier, shipping details, and lifetime servicing record will be catalogued here.'
                    : 'Try clearing the search or choosing another status filter.'
                }
                cta={{ to: '/categories', label: 'Discover Collections' }}
              />
            ) : (
              <div style={{ display: 'grid', gap: '20px' }}>
                {shown.map((o) => (
                  <div
                    key={o.id}
                    style={{
                      background: 'var(--color-paper-light)',
                      border: '1px solid var(--line)',
                      borderRadius: 'var(--r-xs)',
                      padding: '24px',
                      display: 'grid',
                      gridTemplateColumns: '1fr auto',
                      gap: '24px',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div className="center wrap" style={{ gap: '10px' }}>
                        <Link to={`/account/orders/${o.id}`} style={{ fontFamily: 'var(--serif)', fontSize: '18px', fontWeight: 500, color: 'var(--pearl)' }}>
                          {o.id}
                        </Link>
                        <span className={`badge ${STATUS_TONE[o.status] || 'badge--gold'}`}>{o.status}</span>
                        {o.returnRequest && <span className="badge badge--alert">Return {o.returnRequest.status}</span>}
                      </div>

                      <div className="center wrap" style={{ gap: '16px', marginTop: '10px', fontSize: '13px', color: 'var(--pearl-3)' }}>
                        <span>Placed on <b>{formatDate(o.date)}</b></span>
                        <span>&middot;</span>
                        <span>{dx(o.methodName)}</span>
                        <span>&middot;</span>
                        <span>{o.items.reduce((n, i) => n + i.qty, 0)} pieces</span>
                        <span>&middot;</span>
                        <span style={{ fontFamily: 'var(--mono)', color: 'var(--pearl)', fontWeight: 500 }}>
                          Total: {money(o.totals?.total || 0)}
                        </span>
                      </div>

                      {/* Item thumbnails */}
                      <div className="center" style={{ gap: '10px', marginTop: '16px' }}>
                        {o.items.slice(0, 4).map((i, idx) => (
                          <span
                            key={`${i.id}-${idx}`}
                            style={{ width: '48px', height: '48px', borderRadius: 'var(--r-xs)', overflow: 'hidden', background: 'var(--color-bone)', border: '1px solid var(--line)' }}
                          >
                            <ProductArt
                              id={i.id}
                              shape={i.product?.shape || 'atelier'}
                              palette={paletteForVariant(i.product, i.variant)}
                              label={i.product?.name}
                            />
                          </span>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gap: '8px', minWidth: '160px' }}>
                      <Link className="btn btn--sm btn--outline btn--block" to={`/account/orders/${o.id}`}>
                        Track &amp; Details
                      </Link>
                      {o.status === 'Delivered' && !o.returnRequest && (
                        <Link className="btn btn--sm btn--ghost btn--block" to={`/returns?order=${o.id}`}>
                          Request Return
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
