/* =============================================================
   AURELIS MAISON — STORE LOCATOR & BOUTIQUES
   Global salon network with opening hours, on-site services,
   and private appointment bookings.
   ============================================================= */
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Breadcrumbs, Empty, Icon, PageHead } from '../components/primitives';
import Art from '../lib/art';
import { useAsync } from '../lib/useAsync';
import api from '../lib/api';
import { dx, isOpenNow } from '../lib/format';

const SERVICES = [
  'All services',
  'Atelier & Repairs',
  'Private Salon',
  'Watchmaker On Site',
  'Engraving',
  'Perfume Bar',
  'Bespoke Commissions'
];

const MAP_HTML = Art.mapCanvas();

export default function Stores() {
  const navigate = useNavigate();
  const { data, loading } = useAsync(() => api.stores(), []);
  const [query, setQuery] = useState('');
  const [service, setService] = useState('All services');
  const [active, setActive] = useState(null);

  const stores = data?.items || [];

  const shown = useMemo(() => {
    let list = stores;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((s) =>
        dx(`${s.name} ${s.city} ${s.country} ${s.address.join(' ')}`).toLowerCase().includes(q)
      );
    }
    if (service !== 'All services') {
      list = list.filter((s) => s.services.some((x) => dx(x) === service));
    }
    return list;
  }, [stores, query, service]);

  const openCount = stores.filter(isOpenNow).length;

  return (
    <div className="shell">
      <Breadcrumbs trail={[{ label: 'Home', to: '/' }, { label: 'Boutiques & Salons' }]} />

      <PageHead
        kicker="Eight Global Houses"
        title="Boutiques &amp; Salons"
        lede="Each house features a resident watchmaker or master jeweller bench. Private viewings may be scheduled after hours."
        aside={
          <div className="badge badge--jade" style={{ padding: '8px 14px', fontSize: '12px' }}>
            {openCount} of {stores.length} Salons Open Now
          </div>
        }
      />

      <section className="section" style={{ paddingTop: 0 }}>
        {/* Filters */}
        <div className="filter-bar">
          <div className="filter-bar__left">
            <input
              type="search"
              placeholder="Search by city, street, or country…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ minWidth: '260px', padding: '8px 12px', fontSize: '13px' }}
            />
          </div>

          <div className="center" style={{ gap: '8px' }}>
            <span className="tiny">Filter Service:</span>
            <select
              value={service}
              onChange={(e) => setService(e.target.value)}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                border: '1px solid var(--line-dark)',
                borderRadius: 'var(--r-xs)',
                background: 'var(--color-paper-light)'
              }}
            >
              {SERVICES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Boutiques Cards Grid */}
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--pearl-3)' }}>
            Locating global salons…
          </div>
        ) : shown.length === 0 ? (
          <Empty
            icon="pin"
            title="No Boutiques Match Your Search"
            body="Try expanding your city query or resetting the service filter."
            cta={{ to: '/help', label: 'Consult Private Concierge' }}
          />
        ) : (
          <div className="boutique-grid">
            {shown.map((s) => {
              const open = isOpenNow(s);
              return (
                <article key={s.id} className="boutique-card">
                  <div className="boutique-card__body">
                    <div>
                      <div className="between" style={{ marginBottom: '6px' }}>
                        <span className="eyebrow">{dx(s.city)} &middot; {dx(s.country)}</span>
                        <span className={`badge ${open ? 'badge--jade' : 'badge--quiet'}`}>
                          {open ? 'Open Now' : 'Closed'}
                        </span>
                      </div>
                      <h3 style={{ fontFamily: 'var(--serif)', fontSize: '22px', color: 'var(--pearl)', marginTop: '4px' }}>
                        {dx(s.name)}
                      </h3>
                      <p style={{ fontSize: '13px', color: 'var(--pearl-3)', lineHeight: 1.6, marginTop: '8px' }}>
                        {s.address.map(dx).join(', ')}
                      </p>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '16px' }}>
                        {s.services.slice(0, 3).map((srv) => (
                          <span key={srv} className="badge" style={{ fontSize: '10px' }}>
                            {dx(srv)}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="between" style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--line-2)' }}>
                      <span className="tiny" style={{ color: 'var(--pearl-3)' }}>
                        Hours: {s.opens} &ndash; {s.closes}
                      </span>
                      <Link className="btn btn--sm btn--outline" to={`/stores/${s.id}`}>
                        Salon Details &rarr;
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Global Map Illustration */}
        <div style={{ marginTop: '48px', padding: '32px', background: 'var(--color-bone)', borderRadius: 'var(--r-xs)', border: '1px solid var(--line)' }}>
          <div className="between wrap" style={{ marginBottom: '16px' }}>
            <div>
              <span className="eyebrow">Worldwide Concierge</span>
              <h3 className="h4" style={{ fontFamily: 'var(--serif)', fontSize: '20px', marginTop: '4px' }}>
                Private Traveling Consultations
              </h3>
            </div>
            <Link className="btn btn--sm btn--gold" to="/help">
              Request Private Visit
            </Link>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--pearl-3)', lineHeight: 1.6, maxWidth: '64ch' }}>
            For high-value commissions, bespoke horology orders, or royal sets, senior atelier directors travel directly to client residences and yachts worldwide.
          </p>
        </div>
      </section>
    </div>
  );
}
