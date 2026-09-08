/* =============================================================
   ADMIN SHELL & COMMAND NAVIGATION
   Clean, modern sidebar hierarchy and header bar with global filters,
   critical alert indicator, and role-based access control.
   ============================================================= */
import { useState } from 'react';
import { NavLink, Navigate, Outlet, useLocation, Link } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import { useAdminFilters } from '../../context/AdminFilterContext';

const NAV = [
  {
    group: 'Executive Command',
    items: [
      { label: 'Command Center', to: '/admin', end: true, need: 'dashboard.view' },
      { label: 'AI Intelligence', to: '/admin/ai', need: 'ai.view' }
    ]
  },
  {
    group: 'Inventory & Vaults',
    items: [
      { label: 'Inventory Management', to: '/admin/inventory', need: 'inventory.view' },
      { label: 'Warehouses & Heatmaps', to: '/admin/warehouses', need: 'warehouses.view' },
      { label: 'Procurement & POs', to: '/admin/procurement', need: 'inventory.purchase' }
    ]
  },
  {
    group: 'Intelligence & Reports',
    items: [
      { label: 'Sales & BI Analytics', to: '/admin/analytics', need: 'dashboard.view' },
      { label: 'Reports & Exports', to: '/admin/reports', need: 'dashboard.view' }
    ]
  },
  {
    group: 'Catalog & Orders',
    items: [
      { label: 'Products', to: '/admin/products', need: 'products.view' },
      { label: 'Categories', to: '/admin/categories', need: 'products.view' },
      { label: 'Orders', to: '/admin/orders', need: 'orders.view' },
      { label: 'Customers', to: '/admin/customers', need: 'customers.view' }
    ]
  },
  {
    group: 'System & Governance',
    items: [
      { label: 'Staff Management', to: '/admin/staff', need: 'staff.view' },
      { label: 'Roles & RBAC', to: '/admin/roles', need: 'staff.view' },
      { label: 'Audit Trail', to: '/admin/audit', need: 'audit.view' },
      { label: 'ML Operations', to: '/admin/ml', end: true, need: 'ai.view' },
      { label: 'Commerce Engine', to: '/admin/medusa', need: 'ai.view' }
    ]
  }
];

export default function AdminLayout() {
  const { staff, ready, logout, can } = useAdmin();
  const { warehouse, setWarehouse, dateRange, setDateRange, activeAlertCount } = useAdminFilters();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);

  if (!ready) {
    return (
      <div className="admin-boot" aria-busy="true">
        <span className="sr-only">Loading system...</span>
      </div>
    );
  }

  if (!staff) {
    const back = `${location.pathname}${location.search || ''}${location.hash || ''}`;
    return <Navigate to="/admin/login" replace state={{ from: back }} />;
  }

  const visible = NAV
    .map((entry) => {
      if (!entry.group) return can(entry.need) ? entry : null;
      const items = entry.items.filter((i) => can(i.need));
      return items.length ? { ...entry, items } : null;
    })
    .filter(Boolean);

  return (
    <div className={`admin${navOpen ? ' is-nav-open' : ''}`}>
      {/* Sidebar Navigation */}
      <aside className="admin__side" aria-label="Admin navigation">
        <div className="admin__brand">
          <span className="brand__mark">AURELIS</span>
          <span className="admin__brandsub">Executive &middot; AI Admin</span>
        </div>

        <nav className="admin__nav">
          {visible.map((entry) =>
            entry.group ? (
              <div className="admin__group" key={entry.group}>
                <h2 className="admin__grouplabel">{entry.group}</h2>
                {entry.items.map((i) => (
                  <NavItem key={i.to} item={i} onNavigate={() => setNavOpen(false)} />
                ))}
              </div>
            ) : (
              <div className="admin__group" key={entry.to}>
                <NavItem item={entry} onNavigate={() => setNavOpen(false)} />
              </div>
            )
          )}
        </nav>

        <div className="admin__who">
          <div className="admin__whoname">{staff.firstName} {staff.lastName}</div>
          <div className="admin__whorole">{staff.roleName}</div>
          <button
            type="button"
            className="btn btn--sm"
            onClick={logout}
            style={{ marginTop: 'var(--spacing-6)' }}
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content Area with Header */}
      <div className="admin__main">
        <header className="admin__bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              type="button"
              className="admin__burger"
              onClick={() => setNavOpen((v) => !v)}
              aria-expanded={navOpen}
              aria-label="Toggle navigation"
            >
              <i />
            </button>

            {/* Global Header Filters */}
            <div className="admin-header-filters">
              <label htmlFor="global-wh-select" className="sr-only">Facility Filter</label>
              <select
                id="global-wh-select"
                className="header-filter-select"
                value={warehouse}
                onChange={(e) => setWarehouse(e.target.value)}
                aria-label="Filter by facility"
              >
                <option value="all">Global (All Facilities)</option>
                <option value="GVA-ATELIER">Geneva Atelier (GVA)</option>
                <option value="ZRH-CENTRAL">Zurich Hub (ZRH)</option>
                <option value="PAR-VAULT">Paris Vault (PAR)</option>
                <option value="NYC-VAULT">New York Vault (NYC)</option>
              </select>

              <label htmlFor="global-period-select" className="sr-only">Period Filter</label>
              <select
                id="global-period-select"
                className="header-filter-select"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                aria-label="Filter by time period"
              >
                <option value="today">Today</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Quarter (90d)</option>
                <option value="1y">Fiscal Year</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Critical Alert Indicator Badge */}
            <Link
              to="/admin/ai"
              className="admin-alert-badge-link"
              title="Active AI Alerts"
            >
              <span className="alert-ping-dot" />
              <span className="tiny font-semibold">{activeAlertCount} Alerts</span>
            </Link>

            <a className="admin__storelink" href="/" target="_blank" rel="noreferrer">
              View storefront ↗
            </a>
          </div>
        </header>

        <main className="admin__content" id="admin-main">
          <Outlet />
        </main>
      </div>

      {navOpen && (
        <button
          type="button"
          className="admin__scrim"
          aria-label="Close navigation"
          onClick={() => setNavOpen(false)}
        />
      )}
    </div>
  );
}

function NavItem({ item, onNavigate }) {
  if (item.planned) {
    return (
      <span className="admin__link is-planned" aria-disabled="true" title="Planned — not built yet">
        {item.label}<em>Planned</em>
      </span>
    );
  }
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) => `admin__link${isActive ? ' is-on' : ''}`}
    >
      {item.label}
    </NavLink>
  );
}
