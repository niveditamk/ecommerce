/* =============================================================
   AURELIS MAISON — WISHLIST / SAVED PIECES
   Curated register of saved objects with 1-click move to bag.
   ============================================================= */
import { Link } from 'react-router-dom';
import { Breadcrumbs, Empty, Icon, PageHead } from '../components/primitives';
import { ProductGrid } from '../components/ProductCard';
import { AccountNav } from '../components/checkout';
import { useStore } from '../context/StoreContext';
import { useAsync } from '../lib/useAsync';
import api from '../lib/api';
import { dx } from '../lib/format';

export default function Wishlist() {
  const { session, categories } = useStore();
  const ids = session.wishlist || [];

  const { data, loading } = useAsync(
    () => (ids.length ? Promise.all(ids.map((id) => api.product(id))) : Promise.resolve([])),
    [ids.join(',')]
  );

  const items = (data || []).map((d) => d.product).filter(Boolean);
  const catName = (slug) => dx(categories.find((c) => c.slug === slug)?.name || '');

  return (
    <div className="shell">
      <Breadcrumbs trail={[{ label: 'Home', to: '/' }, { label: 'Saved Pieces' }]} />

      <PageHead
        kicker="Your Personal Register"
        title="Saved Objects"
        lede="Pieces saved across your devices. Numbered editions remain available on a first-come basis until checked out."
      />

      <section className="section" style={{ paddingTop: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '48px', alignItems: 'start' }}>
          <AccountNav />

          <div>
            {loading ? (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--pearl-3)' }}>
                Gathering your saved pieces from the register…
              </div>
            ) : items.length === 0 ? (
              <Empty
                icon="bag"
                title="Your Register is Empty"
                body="Select 'Save' on any piece to curate your private list. Saved items persist across visits."
                cta={{ to: '/categories', label: 'Discover Collections' }}
              />
            ) : (
              <>
                <div className="between" style={{ padding: '12px 16px', background: 'var(--color-bone)', borderRadius: 'var(--r-xs)', border: '1px solid var(--line)', marginBottom: '24px' }}>
                  <span className="tiny" style={{ fontWeight: 600, color: 'var(--pearl-2)' }}>
                    {items.length} {items.length === 1 ? 'Piece Saved' : 'Pieces Saved'}
                  </span>
                  <span className="tiny" style={{ color: 'var(--gold-text)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Icon name="sparkle" size={14} /> Real-time stock tracked
                  </span>
                </div>

                <ProductGrid items={items} categoryLookup={catName} />

                {/* Concierge Consultation Card */}
                <div style={{ marginTop: '48px', padding: '32px', background: 'var(--color-bone)', border: '1px solid var(--line-gold)', borderRadius: 'var(--r-xs)' }}>
                  <div className="between wrap" style={{ gap: '20px' }}>
                    <div>
                      <h4 className="h4" style={{ fontFamily: 'var(--serif)', fontSize: '20px' }}>
                        Review your saved pieces with an Atelier Concierge
                      </h4>
                      <p style={{ fontSize: '14px', color: 'var(--pearl-3)', marginTop: '4px', maxWidth: '52ch' }}>
                        Share your shortlisted pieces for custom engraving advice, sizing consultations, or private salon viewing.
                      </p>
                    </div>
                    <Link className="btn btn--gold btn--sm" to="/help">
                      Consult Concierge
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
