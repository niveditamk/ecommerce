/* =============================================================
   ADMIN MODULES
   Products · Inventory · Orders · Customers · Staff · Roles · Audit
   These share one table/filter idiom deliberately — an operator
   should only have to learn the pattern once.
   ============================================================= */
import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAsync } from '../../lib/useAsync';
import adminApi from '../../lib/adminApi';
import { useAdmin } from '../../context/AdminContext';
import { money, formatShortDate, dx } from '../../lib/format';

/* ---------- shared ---------- */
function Head({ label, title, note, children }) {
  return (
    <header className="admin__head">
      <div>
        <span className="field__label">{label}</span>
        <h1 className="h2">{title}</h1>
        {note && <p className="tiny" style={{ textTransform: 'none', letterSpacing: '.02em', marginTop: 4 }}>{note}</p>}
      </div>
      {children && <div className="admin__headactions">{children}</div>}
    </header>
  );
}

const Loading = () => (
  <div aria-busy="true">
    {Array.from({ length: 6 }).map((_, i) => (
      <div className="skeleton-line" key={i} style={{ height: 34, marginBottom: 8 }} />
    ))}
  </div>
);

const Denied = ({ what }) => (
  <div className="notice notice--warning">Your role cannot {what}.</div>
);

/* An audit entry stores the whole row before and after. Dumping both
   objects is unreadable, so only the fields that actually changed are
   shown. Values are printed exactly as stored — an audit trail that
   prettifies what it recorded is worth less than one that does not,
   which is why HTML entities appear here verbatim. */
function AuditDiff({ before, after }) {
  if (!before || !after || typeof before !== 'object' || typeof after !== 'object') return null;

  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]));

  if (!keys.length) return null;

  const show = (v) => {
    if (v === undefined) return '—';
    const str = typeof v === 'string' ? v : JSON.stringify(v);
    return str.length > 90 ? `${str.slice(0, 90)}…` : str;
  };

  return (
    <dl className="admin-diff">
      {keys.map((k) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd><s>{show(before[k])}</s> → <b>{show(after[k])}</b></dd>
        </div>
      ))}
    </dl>
  );
}

/* =========================================================
   PRODUCTS
   ========================================================= */
export function AdminProducts() {
  const { can } = useAdmin();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const cat = params.get('cat') || '';
  const status = params.get('status') || '';
  const stock = params.get('stock') || '';
  const sort = params.get('sort') || 'name';

  const [picked, setPicked] = useState([]);
  const [bulk, setBulk] = useState({ action: 'status', value: 'active' });
  const [flash, setFlash] = useState(null);
  const [working, setWorking] = useState(false);
  const [exporting, setExporting] = useState(false);

  const cats = useAsync(() => adminApi.categories(), []);
  const { data, loading, error, reload } = useAsync(
    () => adminApi.products({ q, cat, status, stock, sort, perPage: 100 }),
    [q, cat, status, stock, sort]
  );

  const setParam = (k, v) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v); else next.delete(k);
    setParams(next);
    setPicked([]);
  };

  const items = data?.items || [];
  const allPicked = items.length > 0 && picked.length === items.length;
  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const toggleAll = () => setPicked(allPicked ? [] : items.map((p) => p.id));

  const say = (msg) => { setFlash(msg); setTimeout(() => setFlash(null), 3500); };

  /* The export needs the bearer token, which a plain link cannot
     carry, so it is fetched and handed to the browser as a blob. */
  const exportCsv = async () => {
    setExporting(true);
    try {
      const blob = await adminApi.exportProducts();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aurelis-products-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      say(err.message);
    } finally {
      setExporting(false);
    }
  };

  const applyBulk = async () => {
    if (!picked.length) return;
    if (bulk.action !== 'status' && String(bulk.value).trim() === '') {
      say('Enter a value before applying.');
      return;
    }
    setWorking(true);
    try {
      const res = await adminApi.bulkProducts(picked, bulk.action, bulk.value);
      say(`${res.changed} ${res.changed === 1 ? 'product' : 'products'} updated.`);
      setPicked([]);
      reload();
    } catch (err) {
      say(err.message);
    } finally {
      setWorking(false);
    }
  };

  if (error) return <div className="notice notice--error">{error}</div>;

  return (
    <>
      <Head label="Catalog" title="Products" note={data ? `${data.total} products` : 'Loading'}>
        <button type="button" className="btn btn--outline btn--sm" disabled={exporting} onClick={exportCsv}>
          {exporting ? 'Preparing…' : 'Export CSV'}
        </button>
        {can('products.create') && <Link className="btn btn--gold" to="/admin/products/new">Add product</Link>}
      </Head>

      <div className="admin-filters">
        <input
          className="input" placeholder="Search name or SKU" defaultValue={q}
          onKeyDown={(e) => { if (e.key === 'Enter') setParam('q', e.currentTarget.value); }}
          aria-label="Search products"
        />
        <select className="input" value={cat} onChange={(e) => setParam('cat', e.target.value)} aria-label="Collection">
          <option value="">All collections</option>
          {(cats.data?.items || []).map((c) => <option key={c.slug} value={c.slug}>{dx(c.name)}</option>)}
        </select>
        <select className="input" value={status} onChange={(e) => setParam('status', e.target.value)} aria-label="Status">
          <option value="">Any status</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
        <select className="input" value={stock} onChange={(e) => setParam('stock', e.target.value)} aria-label="Stock">
          <option value="">All stock</option>
          <option value="low">Running low</option>
          <option value="out">Out of stock</option>
        </select>
        <select className="input" value={sort} onChange={(e) => setParam('sort', e.target.value)} aria-label="Sort">
          <option value="name">Name</option>
          <option value="price">Price, high to low</option>
          <option value="stock">Stock, low to high</option>
          <option value="newest">Newest</option>
        </select>
        {(q || cat || status || stock) && (
          <button type="button" className="btn btn--sm" onClick={() => { setParams(new URLSearchParams()); setPicked([]); }}>
            Clear
          </button>
        )}
      </div>

      {flash && <div className="notice" style={{ marginBottom: 'var(--spacing-18)' }}>{flash}</div>}

      {/* Bulk bar only exists when a selection does — no dead controls. */}
      {picked.length > 0 && can('products.edit') && (
        <div className="admin-bulk" role="region" aria-label="Bulk actions">
          <span className="admin-bulk__count">{picked.length} selected</span>

          <select className="input" value={bulk.action} aria-label="Bulk action"
            onChange={(e) => setBulk({ action: e.target.value, value: e.target.value === 'status' ? 'active' : '' })}>
            <option value="status">Set status</option>
            <option value="price-pct">Adjust price %</option>
            <option value="reorder-point">Set reorder point</option>
          </select>

          {bulk.action === 'status' ? (
            <select className="input" value={bulk.value} onChange={(e) => setBulk((b) => ({ ...b, value: e.target.value }))} aria-label="New status">
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          ) : (
            <input className="input mono" type="number" value={bulk.value} placeholder={bulk.action === 'price-pct' ? '-10' : '5'}
              onChange={(e) => setBulk((b) => ({ ...b, value: e.target.value }))} aria-label="Value" />
          )}

          <button type="button" className="btn btn--gold btn--sm" onClick={applyBulk} disabled={working}>
            {working ? 'Applying…' : 'Apply'}
          </button>
          <button type="button" className="btn btn--sm" onClick={() => setPicked([])}>Cancel</button>
        </div>
      )}

      {loading ? <Loading /> : items.length === 0 ? (
        <div className="notice">No products match those filters.</div>
      ) : (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                {can('products.edit') && (
                  <th style={{ width: 32 }}>
                    <input type="checkbox" checked={allPicked} onChange={toggleAll} aria-label="Select all" />
                  </th>
                )}
                <th>Product</th><th>Collection</th>
                <th className="tr">Price</th><th className="tr">Stock</th>
                <th>Status</th><th />
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className={picked.includes(p.id) ? 'is-picked' : ''}>
                  {can('products.edit') && (
                    <td>
                      <input type="checkbox" checked={picked.includes(p.id)} onChange={() => toggle(p.id)}
                        aria-label={`Select ${dx(p.name)}`} />
                    </td>
                  )}
                  <td>
                    <Link className="link" to={`/admin/products/${p.id}`}>{dx(p.name)}</Link>
                    <div className="tiny mono" style={{ textTransform: 'none' }}>{p.id}</div>
                  </td>
                  <td>{p.cat}</td>
                  <td className="tr mono">{money(p.price)}</td>
                  <td className="tr mono">
                    {p.stock === 0
                      ? <span className="pill pill--urgent">0</span>
                      : p.stock <= p.low_stock_at ? <span className="pill pill--warn">{p.stock}</span> : p.stock}
                  </td>
                  <td><span className={`pill pill--${p.status}`}>{p.status}</span></td>
                  <td className="tr">
                    <Link className="link tiny" to={`/admin/products/${p.id}`}>Edit</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!can('products.edit') && (
        <p className="field__hint" style={{ marginTop: 'var(--spacing-18)' }}>
          You have read access to the catalogue. Editing requires the Manager role or above.
        </p>
      )}
    </>
  );
}

/* =========================================================
   CATEGORIES
   ========================================================= */
export function AdminCategories() {
  const { can } = useAdmin();
  const { data, loading, error, reload } = useAsync(() => adminApi.categories(), []);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({});
  const [flash, setFlash] = useState(null);
  const [creating, setCreating] = useState(false);
  const [newCat, setNewCat] = useState({ slug: '', name: '', tag: '', blurb: '' });
  const [busy, setBusy] = useState(false);

  if (error) return <div className="notice notice--error">{error}</div>;
  if (loading && !data) return <Loading />;
  if (!data) return null;

  const start = (c) => { setEditing(c.slug); setDraft({ name: c.name, tag: c.tag || '', blurb: c.blurb || '' }); };

  const save = async (slug) => {
    try {
      await adminApi.updateCategory(slug, draft);
      setFlash('Collection updated.');
      setEditing(null);
      reload();
    } catch (err) {
      setFlash(err.message);
      /* The select is controlled off server state, so re-reading the
         list is what snaps the row back. Without this the dropdown
         kept showing a status the server had refused. */
      reload();
    }
    setTimeout(() => setFlash(null), 4000);
  };

  const createCollection = async () => {
    setBusy(true);
    try {
      await adminApi.createCategory(newCat);
      setFlash(`Created ${newCat.name}.`);
      setCreating(false);
      setNewCat({ slug: '', name: '', tag: '', blurb: '' });
      reload();
    } catch (err) {
      setFlash(err.message);
    } finally {
      setBusy(false);
      setTimeout(() => setFlash(null), 4000);
    }
  };

  const remove = async (c) => {
    if (!window.confirm(`Delete the "${c.name}" collection? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await adminApi.deleteCategory(c.slug);
      setFlash(`Deleted ${c.name}.`);
      reload();
    } catch (err) {
      setFlash(err.message);
    } finally {
      setBusy(false);
      setTimeout(() => setFlash(null), 4000);
    }
  };

  return (
    <>
      <Head label="Catalog" title="Collections" note={`${data.items.length} collections`}>
        {can('categories.manage') && !creating && (
          <button type="button" className="btn btn--gold btn--sm" onClick={() => setCreating(true)}>New collection</button>
        )}
      </Head>
      {flash && <div className="notice" style={{ marginBottom: 'var(--spacing-18)' }}>{flash}</div>}

      {creating && (
        <div className="notice" style={{ marginBottom: 'var(--spacing-18)' }}>
          <div style={{ display: 'flex', gap: 'var(--spacing-12)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <label className="field">
              <span className="field__label">Slug</span>
              <input className="input" value={newCat.slug} placeholder="e.g. maroquinerie"
                onChange={(e) => setNewCat((d) => ({ ...d, slug: e.target.value.toLowerCase() }))} />
            </label>
            <label className="field">
              <span className="field__label">Name</span>
              <input className="input" value={newCat.name} onChange={(e) => setNewCat((d) => ({ ...d, name: e.target.value }))} />
            </label>
            <label className="field">
              <span className="field__label">Label</span>
              <input className="input" value={newCat.tag} onChange={(e) => setNewCat((d) => ({ ...d, tag: e.target.value }))} />
            </label>
            <label className="field" style={{ flex: '1 1 220px' }}>
              <span className="field__label">Description</span>
              <input className="input" value={newCat.blurb} onChange={(e) => setNewCat((d) => ({ ...d, blurb: e.target.value }))} />
            </label>
            <button type="button" className="btn btn--gold btn--sm" disabled={busy || !newCat.slug || !newCat.name} onClick={createCollection}>Create</button>
            <button type="button" className="btn btn--outline btn--sm" onClick={() => setCreating(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr><th>Collection</th><th>Label</th><th>Description</th><th className="tr">Products</th><th /></tr>
          </thead>
          <tbody>
            {data.items.map((c) => (
              <tr key={c.slug}>
                {editing === c.slug ? (
                  <>
                    <td>
                      <input className="admin-cell" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} aria-label="Name" />
                      <div className="tiny mono" style={{ textTransform: 'none' }}>{c.slug}</div>
                    </td>
                    <td><input className="admin-cell" value={draft.tag} onChange={(e) => setDraft((d) => ({ ...d, tag: e.target.value }))} aria-label="Label" /></td>
                    <td><input className="admin-cell" style={{ maxWidth: 'none' }} value={draft.blurb} onChange={(e) => setDraft((d) => ({ ...d, blurb: e.target.value }))} aria-label="Description" /></td>
                    <td className="tr mono">{c.product_count}</td>
                    <td className="tr">
                      <button type="button" className="link tiny" onClick={() => save(c.slug)}>Save</button>{' '}
                      <button type="button" className="mc-remove" onClick={() => setEditing(null)}>Cancel</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td>
                      <b>{dx(c.name)}</b>
                      <div className="tiny mono" style={{ textTransform: 'none' }}>{c.slug}</div>
                    </td>
                    <td>{dx(c.tag)}</td>
                    <td style={{ maxWidth: 420 }}>{dx(c.blurb)}</td>
                    <td className="tr mono">{c.product_count}</td>
                    <td className="tr">
                      {can('categories.manage') ? (
                        <>
                          <button type="button" className="link tiny" onClick={() => start(c)}>Edit</button>{' '}
                          <button type="button" className="mc-remove" disabled={busy} onClick={() => remove(c)}>Delete</button>
                        </>
                      ) : <span className="tiny">—</span>}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* =========================================================
   ORDERS
   ========================================================= */
export function AdminOrders() {
  const { can } = useAdmin();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || '';
  /* Real trade by default. Synthetic history is training data for the
     forecaster, not business, so it is opt-in and clearly labelled. */
  const channel = params.get('channel') || '';
  const { data, loading, error, reload } = useAsync(
    () => adminApi.orders({ status, channel, perPage: 50 }),
    [status, channel]
  );
  const [flash, setFlash] = useState(null);

  const setStatus = async (id, next) => {
    try {
      if (next === 'Cancelled') {
        const reason = window.prompt('Reason for cancelling this order? Required — this restocks the inventory and is written to the audit log.');
        if (!reason || !reason.trim()) return;
        await adminApi.cancelOrder(id, reason.trim());
      } else {
        await adminApi.updateOrder(id, { status: next });
      }
      setFlash(`${id} → ${next}`);
      reload();
    } catch (err) {
      setFlash(err.message);
    }
    setTimeout(() => setFlash(null), 3000);
  };

  if (error) return <div className="notice notice--error">{error}</div>;

  return (
    <>
      <Head
        label="Sales"
        title="Orders"
        note={data
          ? `${data.total} ${data.channel === 'synthetic' ? 'synthetic' : data.channel === 'all' ? 'total' : 'real'} order${data.total === 1 ? '' : 's'}`
          : 'Loading'}
      />

      {data?.syntheticCount > 0 && (
        <div className="notice" style={{ marginBottom: 'var(--spacing-18)' }}>
          {data.channel === 'real'
            ? `${data.syntheticCount.toLocaleString('en-IN')} synthetic orders are hidden — they are training data for the forecasting models, not trade.`
            : data.channel === 'synthetic'
              ? 'Showing synthetic training data only. These are not real orders and are excluded from every revenue figure.'
              : 'Showing real and synthetic orders together. Synthetic rows carry a SYN- prefix.'}
          {' '}
          {['real', 'synthetic', 'all'].filter((c) => c !== (data.channel || 'real')).map((c) => (
            <button
              key={c}
              type="button"
              className="link"
              style={{ marginLeft: 8 }}
              onClick={() => {
                const n = new URLSearchParams(params);
                if (c === 'real') n.delete('channel'); else n.set('channel', c);
                setParams(n);
              }}
            >
              Show {c}
            </button>
          ))}
        </div>
      )}

      <div className="admin-filters">
        {['', 'Confirmed', 'Processing', 'Packed', 'Shipped', 'Delivered', 'Cancelled'].map((s) => (
          <button
            key={s || 'all'}
            type="button"
            className={`chip${status === s ? ' is-on' : ''}`}
            onClick={() => { const n = new URLSearchParams(params); if (s) n.set('status', s); else n.delete('status'); setParams(n); }}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {flash && <div className="notice" style={{ marginBottom: 'var(--spacing-18)' }}>{flash}</div>}

      {loading ? <Loading /> : data.items.length === 0 ? (
        <div className="notice">No orders with that status.</div>
      ) : (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr><th>Order</th><th>Placed</th><th>Customer</th><th className="tr">Items</th><th className="tr">Total</th><th>Status</th></tr>
            </thead>
            <tbody>
              {data.items.map((o) => (
                <tr key={o.id}>
                  <td><Link to={`/admin/orders/${o.id}`} className="mono">{o.id}</Link></td>
                  <td>{formatShortDate(o.placed_at?.slice(0, 10))}</td>
                  <td>{o.email}</td>
                  <td className="tr mono">{o.item_count}</td>
                  <td className="tr mono">{money(o.total)}</td>
                  <td>
                    {can('orders.edit') ? (
                      <select className="admin-cell" value={o.status} onChange={(e) => setStatus(o.id, e.target.value)} aria-label={`Status for ${o.id}`}>
                        {(data.statuses || []).map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : <span className={`pill pill--${o.status.toLowerCase()}`}>{o.status}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* =========================================================
   CUSTOMERS
   ========================================================= */
export function AdminCustomers() {
  const { can } = useAdmin();
  const { data, loading, error, reload } = useAsync(() => adminApi.customers(), []);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({});
  const [flash, setFlash] = useState(null);
  const [busy, setBusy] = useState(false);

  if (error) return <Denied what="view customers" />;
  if (loading && !data) return <Loading />;
  if (!data) return null;

  const knownTiers = [...new Set(data.items.map((c) => c.tier).filter(Boolean))];

  const start = (c) => { setEditingId(c.id); setDraft({ first_name: c.first_name, last_name: c.last_name, email: c.email, tier: c.tier || '', phone: c.phone || '' }); };

  const save = async (id) => {
    setBusy(true);
    try {
      await adminApi.updateCustomer(id, draft);
      setFlash('Customer updated.');
      setEditingId(null);
      reload();
    } catch (err) {
      setFlash(err.message);
    } finally {
      setBusy(false);
      setTimeout(() => setFlash(null), 4000);
    }
  };

  return (
    <>
      <Head label="Sales" title="Customers" note={`${data.total} registered`} />
      {flash && <div className="notice" style={{ marginBottom: 'var(--spacing-18)' }}>{flash}</div>}
      <datalist id="customer-tiers">
        {knownTiers.map((t) => <option key={t} value={t} />)}
      </datalist>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Customer</th><th>Email</th><th>Tier</th><th>Phone</th><th className="tr">Orders</th><th className="tr">Lifetime value</th><th /></tr></thead>
          <tbody>
            {data.items.map((c) => (
              <tr key={c.id}>
                {editingId === c.id ? (
                  <>
                    <td>
                      <input className="admin-cell" value={draft.first_name} onChange={(e) => setDraft((d) => ({ ...d, first_name: e.target.value }))} aria-label="First name" />
                      <input className="admin-cell" value={draft.last_name} onChange={(e) => setDraft((d) => ({ ...d, last_name: e.target.value }))} aria-label="Last name" />
                    </td>
                    <td><input className="admin-cell" type="email" value={draft.email} onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))} aria-label="Email" /></td>
                    <td><input className="admin-cell" list="customer-tiers" value={draft.tier} onChange={(e) => setDraft((d) => ({ ...d, tier: e.target.value }))} aria-label="Tier" /></td>
                    <td><input className="admin-cell" value={draft.phone} onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))} aria-label="Phone" /></td>
                    <td className="tr mono">{c.orders}</td>
                    <td className="tr mono">{money(c.lifetime)}</td>
                    <td className="tr">
                      <button type="button" className="link tiny" disabled={busy} onClick={() => save(c.id)}>Save</button>{' '}
                      <button type="button" className="mc-remove" onClick={() => setEditingId(null)}>Cancel</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td><b>{c.first_name} {c.last_name}</b></td>
                    <td>{c.email}</td>
                    <td>{c.tier}</td>
                    <td>{c.phone || '—'}</td>
                    <td className="tr mono">{c.orders}</td>
                    <td className="tr mono">{money(c.lifetime)}</td>
                    <td className="tr">
                      {can('customers.edit')
                        ? <button type="button" className="link tiny" onClick={() => start(c)}>Edit</button>
                        : <span className="tiny">—</span>}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* =========================================================
   STAFF
   ========================================================= */
export function AdminStaff() {
  const { staff: me, can } = useAdmin();
  const { data, loading, error, reload } = useAsync(() => adminApi.staff(), []);
  const roles = useAsync(() => adminApi.roles(), []);
  const [flash, setFlash] = useState(null);
  const [busy, setBusy] = useState(false);

  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ first: '', last: '', email: '', password: '', role: '' });

  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({});

  if (error) return <Denied what="view staff" />;
  if (loading && !data) return <Loading />;
  if (!data) return null;

  const roleOptions = roles.data?.roles || [];

  const say = (msg) => { setFlash(msg); setTimeout(() => setFlash(null), 4000); };

  const createAccount = async () => {
    setBusy(true);
    try {
      await adminApi.createStaff(draft);
      say(`Created ${draft.email}.`);
      setCreating(false);
      setDraft({ first: '', last: '', email: '', password: '', role: '' });
      reload();
    } catch (err) {
      say(err.message);
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (s) => { setEditingId(s.id); setEditDraft({ first_name: s.first_name, last_name: s.last_name, role: s.role_key }); };

  const saveEdit = async (id) => {
    setBusy(true);
    try {
      await adminApi.updateStaff(id, editDraft);
      say('Updated.');
      setEditingId(null);
      reload();
    } catch (err) {
      say(err.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleStatus = async (s) => {
    setBusy(true);
    try {
      if (s.status === 'active') {
        await adminApi.disableStaff(s.id);
        say(`Revoked access for ${s.email}.`);
      } else {
        await adminApi.updateStaff(s.id, { status: 'active' });
        say(`Reactivated ${s.email}.`);
      }
      reload();
    } catch (err) {
      say(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Head label="Access" title="Staff" note={`${data.items.length} accounts`}>
        {can('staff.manage') && !creating && (
          <button type="button" className="btn btn--gold btn--sm" onClick={() => setCreating(true)}>New staff</button>
        )}
      </Head>
      {flash && <div className="notice" style={{ marginBottom: 'var(--spacing-18)' }}>{flash}</div>}

      {creating && (
        <div className="notice" style={{ marginBottom: 'var(--spacing-18)' }}>
          <div style={{ display: 'flex', gap: 'var(--spacing-12)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <label className="field">
              <span className="field__label">First name</span>
              <input className="input" value={draft.first} onChange={(e) => setDraft((d) => ({ ...d, first: e.target.value }))} />
            </label>
            <label className="field">
              <span className="field__label">Last name</span>
              <input className="input" value={draft.last} onChange={(e) => setDraft((d) => ({ ...d, last: e.target.value }))} />
            </label>
            <label className="field">
              <span className="field__label">Email</span>
              <input className="input" type="email" value={draft.email} onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))} />
            </label>
            <label className="field">
              <span className="field__label">Temporary password</span>
              <input className="input" type="password" value={draft.password} onChange={(e) => setDraft((d) => ({ ...d, password: e.target.value }))} />
            </label>
            <label className="field">
              <span className="field__label">Role</span>
              <select className="input" value={draft.role} onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value }))}>
                <option value="">Default</option>
                {roleOptions.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
              </select>
            </label>
            <button type="button" className="btn btn--gold btn--sm" disabled={busy || !draft.first || !draft.last || !draft.email || !draft.password} onClick={createAccount}>Create</button>
            <button type="button" className="btn btn--outline btn--sm" onClick={() => setCreating(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Last signed in</th><th /></tr></thead>
          <tbody>
            {data.items.map((s) => {
              const isSelf = me?.id === s.id;
              return (
                <tr key={s.id}>
                  {editingId === s.id ? (
                    <>
                      <td>
                        <input className="admin-cell" value={editDraft.first_name} onChange={(e) => setEditDraft((d) => ({ ...d, first_name: e.target.value }))} aria-label="First name" />
                        <input className="admin-cell" value={editDraft.last_name} onChange={(e) => setEditDraft((d) => ({ ...d, last_name: e.target.value }))} aria-label="Last name" />
                      </td>
                      <td>{s.email}</td>
                      <td>
                        <select className="admin-cell" value={editDraft.role} disabled={isSelf} onChange={(e) => setEditDraft((d) => ({ ...d, role: e.target.value }))}>
                          {roleOptions.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
                        </select>
                      </td>
                      <td><span className={`pill pill--${s.status}`}>{s.status}</span></td>
                      <td>{s.last_login_at ? formatShortDate(s.last_login_at.slice(0, 10)) : 'Never'}</td>
                      <td className="tr">
                        <button type="button" className="link tiny" disabled={busy} onClick={() => saveEdit(s.id)}>Save</button>{' '}
                        <button type="button" className="mc-remove" onClick={() => setEditingId(null)}>Cancel</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td><b>{s.first_name} {s.last_name}</b>{isSelf && <span className="tiny"> (you)</span>}</td>
                      <td>{s.email}</td>
                      <td>{s.role_name}</td>
                      <td><span className={`pill pill--${s.status}`}>{s.status}</span></td>
                      <td>{s.last_login_at ? formatShortDate(s.last_login_at.slice(0, 10)) : 'Never'}</td>
                      <td className="tr">
                        {can('staff.manage') && !isSelf ? (
                          <>
                            <button type="button" className="link tiny" onClick={() => startEdit(s)}>Edit</button>{' '}
                            <button type="button" className="mc-remove" disabled={busy} onClick={() => toggleStatus(s)}>
                              {s.status === 'active' ? 'Disable' : 'Reactivate'}
                            </button>
                          </>
                        ) : <span className="tiny">—</span>}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* =========================================================
   ROLES & PERMISSIONS
   ========================================================= */
export function AdminRoles() {
  const { data, loading, error } = useAsync(() => adminApi.roles(), []);
  if (error) return <div className="notice notice--error">{error}</div>;
  if (loading && !data) return <Loading />;
  if (!data) return null;

  const modules = [...new Set(data.permissions.map((p) => p.module))];

  return (
    <>
      <Head label="Access" title="Roles & permissions" note="Read-only. Only a Super Admin can change grants." />
      <div className="tbl-wrap">
        <table className="tbl admin-matrix">
          <thead>
            <tr>
              <th>Permission</th>
              {data.roles.map((r) => <th key={r.key} className="tc">{r.name}</th>)}
            </tr>
          </thead>
          <tbody>
            {modules.map((m) => (
              <>
                <tr key={m} className="admin-matrix__group"><td colSpan={data.roles.length + 1}>{m}</td></tr>
                {data.permissions.filter((p) => p.module === m).map((p) => (
                  <tr key={p.key}>
                    <td>{p.label}<div className="tiny mono" style={{ textTransform: 'none' }}>{p.key}</div></td>
                    {data.roles.map((r) => (
                      <td key={r.key} className="tc">
                        {r.permissions.includes(p.key)
                          ? <span className="admin-yes" aria-label="granted">✓</span>
                          : <span className="admin-no" aria-label="not granted">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* =========================================================
   AUDIT LOG
   ========================================================= */
export function AdminAudit() {
  const [entity, setEntity] = useState('');
  const { data, loading, error } = useAsync(() => adminApi.audit({ limit: 100, entity: entity || undefined }), [entity]);
  const [entities, setEntities] = useState([]);

  /* No endpoint enumerates every entity type that has ever been
     audited, so the filter's options grow from what has actually
     been seen rather than a guessed, possibly-stale list. */
  useEffect(() => {
    if (!data || entity) return;
    const seen = [...new Set(data.items.map((a) => a.entity))];
    setEntities((prev) => [...new Set([...prev, ...seen])].sort());
  }, [data, entity]);

  if (error) return <Denied what="view the audit log" />;
  if (loading && !data) return <Loading />;
  if (!data) return null;

  return (
    <>
      <Head label="Access" title="Audit log" note="Who changed what, when — newest first.">
        <label className="field">
          <span className="field__label">Entity</span>
          <select className="input" value={entity} onChange={(e) => setEntity(e.target.value)}>
            <option value="">All</option>
            {entities.map((e) => <option key={e} value={e}>{e.replace(/_/g, ' ')}</option>)}
          </select>
        </label>
      </Head>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>When</th><th>Who</th><th>Action</th><th>What changed</th></tr></thead>
          <tbody>
            {data.items.map((a) => (
              <tr key={a.id}>
                <td className="mono tiny" style={{ textTransform: 'none' }} title={`${a.created_at} UTC`}>
                  {formatShortDate(a.created_at)}
                  <div style={{ color: 'var(--pearl-3)' }}>{String(a.created_at).slice(11, 16)} UTC</div>
                </td>
                <td>{a.actor}</td>
                <td><span className="pill">{a.action}</span></td>
                <td>
                  {dx(a.summary)}
                  <AuditDiff before={a.before_val} after={a.after_val} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
