/* =============================================================
   PRODUCT EDITOR
   One form for creating and editing. Saves are explicit, the
   save button stays disabled until something actually changed,
   and leaving with unsaved work warns you first.
   ============================================================= */
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import adminApi from '../../lib/adminApi';
import { useAdmin } from '../../context/AdminContext';
import { useAsync } from '../../lib/useAsync';
import { money, formatShortDate, dx } from '../../lib/format';

const TEXT_FIELDS = ['name', 'sub', 'materials', 'blurb', 'story', 'care', 'edition'];

const BLANK = {
  id: '', name: '', cat: '', sub: '', price: 0, was: null,
  materials: '', blurb: '', story: '', care: '', edition: 'Open series',
  year: new Date().getFullYear(), shape: 'atelier', palette: 'noir',
  status: 'draft', low_stock_at: 5,
  sizes: [], colors: [], badges: [], tags: [], details: []
};

const SHAPES = ['ring', 'necklace', 'cuff', 'watch', 'flacon', 'bag', 'decanter', 'candle', 'scarf', 'glasses', 'atelier', 'boutique'];
const PALETTES = ['noir', 'obsidian', 'platinum', 'violet', 'sapphire', 'gold', 'amber', 'rose', 'jade'];

export default function ProductEditor() {
  const { id } = useParams();
  /* App.jsx registers "products/new" as a literal route, so on the create
     screen useParams() has no id at all — it is never the string "new".
     Testing only for that string left isNew false, so the editor fetched
     /api/admin/products/undefined, got a 404 and rendered "Product not
     found" where the blank form should have been. Add product has been
     unreachable. Accept either shape, so it survives whichever way the
     route is declared. */
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const { can } = useAdmin();

  const [form, setForm] = useState(BLANK);
  const [original, setOriginal] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState(null);
  const [error, setError] = useState(null);

  const cats = useAsync(() => adminApi.categories(), []);
  const loaded = useAsync(() => (isNew ? Promise.resolve(null) : adminApi.product(id)), [id]);

  useEffect(() => {
    if (isNew) { setForm(BLANK); setOriginal(BLANK); return; }
    if (loaded.data?.product) {
      const p = { ...BLANK, ...loaded.data.product };
      /* The seed catalogue is authored with HTML entities. An editor
         must show the merchandiser the words, not "&rsquo;" — and
         what they save back is the plain text, which dx() passes
         through untouched everywhere else. */
      TEXT_FIELDS.forEach((f) => { if (typeof p[f] === 'string') p[f] = dx(p[f]); });
      setForm(p);
      setOriginal(p);
    }
  }, [isNew, loaded.data]);

  const dirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(original),
    [form, original]
  );

  /* Don't let a half-finished edit vanish on a stray back-click. */
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const set = (field) => (e) => {
    const raw = e?.target ? e.target.value : e;
    const numeric = ['price', 'was', 'year', 'low_stock_at'].includes(field);
    setForm((f) => ({ ...f, [field]: numeric ? (raw === '' ? null : Number(raw)) : raw }));
  };

  const setList = (field) => (e) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [field]: value.split(',').map((s) => s.trim()).filter(Boolean) }));
  };

  const setDetail = (i, key, value) => {
    setForm((f) => {
      const details = [...(f.details || [])];
      details[i] = { ...details[i], [key]: value };
      return { ...f, details };
    });
  };
  const addDetail = () => setForm((f) => ({ ...f, details: [...(f.details || []), { k: '', v: '' }] }));
  const removeDetail = (i) => setForm((f) => ({ ...f, details: f.details.filter((_, x) => x !== i) }));

  const save = async (e) => {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) return setError('A product name is required.');
    if (!form.cat) return setError('Choose a collection.');
    if (!Number.isFinite(Number(form.price)) || Number(form.price) <= 0) return setError('Enter a price above zero.');
    if (isNew && !/^[a-z0-9-]{3,}$/.test(form.id)) return setError('The SKU must be lowercase letters, numbers or hyphens.');

    setSaving(true);
    try {
      if (isNew) {
        await adminApi.createProduct(form);
        setFlash('Product created.');
        navigate(`/admin/products/${form.id}`, { replace: true });
      } else {
        const { product } = await adminApi.updateProduct(id, form);
        const next = { ...BLANK, ...product };
        TEXT_FIELDS.forEach((f) => { if (typeof next[f] === 'string') next[f] = dx(next[f]); });
        setForm(next);
        setOriginal(next);
        setFlash('Saved.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
      setTimeout(() => setFlash(null), 3000);
    }
  };

  const archive = async () => {
    if (!window.confirm('Archive this product? It disappears from the shop but stays on past orders.')) return;
    try {
      await adminApi.archiveProduct(id);
      navigate('/admin/products');
    } catch (err) { setError(err.message); }
  };

  if (!isNew && loaded.loading) return <div className="skeleton-line" style={{ height: 300 }} />;
  if (!isNew && loaded.error) return <div className="notice notice--error">{loaded.error}</div>;

  const readOnly = !can(isNew ? 'products.create' : 'products.edit');
  const movements = loaded.data?.movements || [];

  return (
    <form onSubmit={save}>
      <header className="admin__head">
        <div>
          <span className="field__label">
            <Link className="link" to="/admin/products">Products</Link> / {isNew ? 'New' : form.id}
          </span>
          <h1 className="h2">{isNew ? 'Add a product' : form.name || form.id}</h1>
          {!isNew && (
            <p className="tiny" style={{ textTransform: 'none', letterSpacing: '.02em', marginTop: 4 }}>
              {money(form.price)} · {form.stock ?? 0} in stock · {form.status}
            </p>
          )}
        </div>
        <div className="admin__headactions">
          {dirty && <span className="pill pill--warn">Unsaved</span>}
          <button className="btn btn--gold" type="submit" disabled={saving || readOnly || (!isNew && !dirty)}>
            {saving ? 'Saving…' : isNew ? 'Create product' : 'Save changes'}
          </button>
        </div>
      </header>

      {error && <div className="notice notice--error" role="alert" style={{ marginBottom: 'var(--spacing-18)' }}>{error}</div>}
      {flash && <div className="notice notice--success" style={{ marginBottom: 'var(--spacing-18)' }}>{flash}</div>}
      {readOnly && <div className="notice notice--warning" style={{ marginBottom: 'var(--spacing-18)' }}>Your role can view this product but not change it.</div>}

      <div className="admin-editor">
        <div>
          {/* ---- identity ---- */}
          <section className="admin-panel">
            <h2 className="admin-panel__title">Identity</h2>
            <div className="field-row" style={{ marginTop: 0 }}>
              <label className="field">
                <span className="field__label">Name</span>
                <input className="input" value={form.name} onChange={set('name')} disabled={readOnly} required />
              </label>
              <label className="field">
                <span className="field__label">SKU {isNew ? '' : '(fixed)'}</span>
                <input className="input mono" value={form.id} onChange={set('id')} disabled={!isNew || readOnly}
                  placeholder="aur-000" />
              </label>
            </div>
            <div className="field-row">
              <label className="field">
                <span className="field__label">Collection</span>
                <select className="input" value={form.cat} onChange={set('cat')} disabled={readOnly} required>
                  <option value="">Choose…</option>
                  {(cats.data?.items || []).map((c) => <option key={c.slug} value={c.slug}>{dx(c.name)}</option>)}
                </select>
              </label>
              <label className="field">
                <span className="field__label">Sub-collection</span>
                <input className="input" value={form.sub || ''} onChange={set('sub')} disabled={readOnly} />
              </label>
            </div>
          </section>

          {/* ---- copy ---- */}
          <section className="admin-panel">
            <h2 className="admin-panel__title">Copy</h2>
            <label className="field" style={{ marginTop: 0 }}>
              <span className="field__label">Materials</span>
              <input className="input" value={form.materials || ''} onChange={set('materials')} disabled={readOnly} />
            </label>
            <label className="field">
              <span className="field__label">Short description</span>
              <textarea className="input" rows={2} value={form.blurb || ''} onChange={set('blurb')} disabled={readOnly} />
            </label>
            <label className="field">
              <span className="field__label">Story</span>
              <textarea className="input" rows={5} value={form.story || ''} onChange={set('story')} disabled={readOnly} />
            </label>
            <label className="field">
              <span className="field__label">Care</span>
              <textarea className="input" rows={2} value={form.care || ''} onChange={set('care')} disabled={readOnly} />
            </label>
          </section>

          {/* ---- attributes ---- */}
          <section className="admin-panel">
            <h2 className="admin-panel__title">Attributes</h2>
            <p className="field__hint" style={{ marginBottom: 'var(--spacing-18)' }}>Comma separated.</p>
            <div className="field-row" style={{ marginTop: 0 }}>
              <label className="field">
                <span className="field__label">Sizes</span>
                <input className="input" value={(form.sizes || []).join(', ')} onChange={setList('sizes')} disabled={readOnly} />
              </label>
              <label className="field">
                <span className="field__label">Badges</span>
                <input className="input" value={(form.badges || []).join(', ')} onChange={setList('badges')} disabled={readOnly}
                  placeholder="New, Rare, Icon, Atelier" />
              </label>
            </div>
            <label className="field">
              <span className="field__label">Search tags</span>
              <input className="input" value={(form.tags || []).join(', ')} onChange={setList('tags')} disabled={readOnly} />
            </label>
          </section>

          {/* ---- specification ---- */}
          <section className="admin-panel">
            <div className="admin-panel__head">
              <h2 className="admin-panel__title">Specification</h2>
              {!readOnly && <button type="button" className="btn btn--sm" onClick={addDetail}>Add row</button>}
            </div>
            {(form.details || []).length === 0 && (
              <p className="field__hint">No specification rows. These appear in the product page accordion.</p>
            )}
            {(form.details || []).map((d, i) => (
              <div className="admin-detailrow" key={i}>
                <input className="input" value={d.k || ''} onChange={(e) => setDetail(i, 'k', e.target.value)}
                  placeholder="Label" disabled={readOnly} aria-label={`Specification label ${i + 1}`} />
                <input className="input" value={d.v || ''} onChange={(e) => setDetail(i, 'v', e.target.value)}
                  placeholder="Value" disabled={readOnly} aria-label={`Specification value ${i + 1}`} />
                {!readOnly && (
                  <button type="button" className="mc-remove" onClick={() => removeDetail(i)} aria-label={`Remove row ${i + 1}`}>
                    Remove
                  </button>
                )}
              </div>
            ))}
          </section>
        </div>

        {/* ---- sidebar ---- */}
        <aside>
          <section className="admin-panel">
            <h2 className="admin-panel__title">Pricing &amp; stock</h2>
            <label className="field" style={{ marginTop: 0 }}>
              <span className="field__label">Price (INR, incl. GST)</span>
              <input className="input mono" type="number" min="1" value={form.price ?? ''} onChange={set('price')} disabled={readOnly} required />
            </label>
            <label className="field">
              <span className="field__label">Compare-at price</span>
              <input className="input mono" type="number" value={form.was ?? ''} onChange={set('was')} disabled={readOnly}
                placeholder="Leave empty for none" />
            </label>
            <label className="field">
              <span className="field__label">Reorder point</span>
              <input className="input mono" type="number" min="0" value={form.low_stock_at ?? 5} onChange={set('low_stock_at')} disabled={readOnly} />
              <span className="field__hint">Flagged as low at or below this.</span>
            </label>
            {!isNew && (
              <p className="field__hint" style={{ marginTop: 'var(--spacing-12)' }}>
                Stock is {form.stock ?? 0}. Change it from{' '}
                <Link className="link" to="/admin/inventory">Inventory</Link>, so every movement is recorded.
              </p>
            )}
          </section>

          <section className="admin-panel">
            <h2 className="admin-panel__title">Status</h2>
            <label className="field" style={{ marginTop: 0 }}>
              <span className="field__label">Visibility</span>
              <select className="input" value={form.status} onChange={set('status')} disabled={readOnly}>
                <option value="active">Active — on the shop</option>
                <option value="draft">Draft — hidden</option>
                <option value="archived">Archived — retired</option>
              </select>
            </label>
            <div className="field-row">
              <label className="field">
                <span className="field__label">Edition</span>
                <input className="input" value={form.edition || ''} onChange={set('edition')} disabled={readOnly} />
              </label>
              <label className="field">
                <span className="field__label">Year</span>
                <input className="input mono" type="number" value={form.year ?? ''} onChange={set('year')} disabled={readOnly} />
              </label>
            </div>
          </section>

          <section className="admin-panel">
            <h2 className="admin-panel__title">Artwork</h2>
            <p className="field__hint" style={{ marginBottom: 'var(--spacing-12)' }}>
              Used when the product has no photograph on file.
            </p>
            <div className="field-row" style={{ marginTop: 0 }}>
              <label className="field">
                <span className="field__label">Shape</span>
                <select className="input" value={form.shape} onChange={set('shape')} disabled={readOnly}>
                  {SHAPES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="field">
                <span className="field__label">Palette</span>
                <select className="input" value={form.palette} onChange={set('palette')} disabled={readOnly}>
                  {PALETTES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
            </div>
          </section>

          {!isNew && movements.length > 0 && (
            <section className="admin-panel">
              <h2 className="admin-panel__title">Recent stock movement</h2>
              <table className="tbl">
                <tbody>
                  {movements.slice(0, 6).map((m) => (
                    <tr key={m.id}>
                      <td className="tiny" style={{ textTransform: 'none' }}>{formatShortDate(m.created_at?.slice(0, 10))}</td>
                      <td>{m.reason}</td>
                      <td className="tr mono">{m.delta > 0 ? `+${m.delta}` : m.delta}</td>
                      <td className="tr mono">{m.balance}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {!isNew && can('products.delete') && form.status !== 'archived' && (
            <section className="admin-panel">
              <h2 className="admin-panel__title">Danger zone</h2>
              <p className="field__hint" style={{ marginBottom: 'var(--spacing-12)' }}>
                Archiving removes it from the shop. Past orders keep their record.
              </p>
              <button type="button" className="btn btn--danger" onClick={archive}>Archive product</button>
            </section>
          )}
        </aside>
      </div>
    </form>
  );
}
