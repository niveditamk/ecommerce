/* =============================================================
   AURELIS API - PUBLIC CATALOGUE & CONTENT ROUTES
   ============================================================= */
import { Router } from 'express';
import { BRAND, JOURNAL, VALUES, MEMBER_PERKS, SHIPPING_METHODS, PAYMENT_METHODS, FAQS, LEGAL_SECTIONS, STORES } from '../data/catalog.js';
/* Catalogue reads come from SQLite so the shop reflects admin edits live. */
import { allCategories as CATEGORIES_FN, allProducts as PRODUCTS_FN, productById, categoryBySlug, relatedTo, filterProducts, searchProducts } from '../db/queries.js';

const router = Router();

/* ---- brand + navigation ---- */
router.get('/brand', (_req, res) => {
  res.json({
    brand: BRAND,
    categories: CATEGORIES_FN().map((c) => ({
      ...c,
      count: PRODUCTS_FN().filter((p) => p.cat === c.slug).length,
      from: Math.min(...PRODUCTS_FN().filter((p) => p.cat === c.slug).map((p) => p.price))
    }))
  });
});

/* ---- categories ---- */
router.get('/categories', (_req, res) => {
  res.json(
    CATEGORIES_FN().map((c) => {
      const items = PRODUCTS_FN().filter((p) => p.cat === c.slug);
      return {
        ...c,
        count: items.length,
        from: items.length ? Math.min(...items.map((p) => p.price)) : 0,
        highlight: items.slice(0, 3).map((p) => ({ id: p.id, name: p.name, shape: p.shape, palette: p.palette }))
      };
    })
  );
});

router.get('/categories/:slug', (req, res) => {
  const cat = categoryBySlug(req.params.slug);
  if (!cat) return res.status(404).json({ error: 'Category not found' });
  const items = PRODUCTS_FN().filter((p) => p.cat === cat.slug);
  res.json({
    ...cat,
    count: items.length,
    from: items.length ? Math.min(...items.map((p) => p.price)) : 0,
    to: items.length ? Math.max(...items.map((p) => p.price)) : 0
  });
});

/* ---- products ---- */
router.get('/products', (req, res) => {
  const { cat, sub, q, min, max, sort, badge, page = 1, perPage = 24 } = req.query;
  const badges = badge ? String(badge).split(',').filter(Boolean) : [];
  const all = filterProducts({
    cat, sub, q,
    min: min !== undefined ? Number(min) : null,
    max: max !== undefined ? Number(max) : null,
    sort, badges
  });
  const p = Math.max(1, Number(page));
  const size = Math.min(60, Math.max(1, Number(perPage)));
  const start = (p - 1) * size;

  res.json({
    total: all.length,
    page: p,
    perPage: size,
    pages: Math.max(1, Math.ceil(all.length / size)),
    priceRange: all.length
      ? { min: Math.min(...all.map((x) => x.price)), max: Math.max(...all.map((x) => x.price)) }
      : { min: 0, max: 0 },
    items: all.slice(start, start + size)
  });
});

router.get('/products/:id', (req, res) => {
  const product = productById(req.params.id);
  if (!product) return res.status(404).json({ error: 'Piece not found' });
  res.json({ product, related: relatedTo(product, 4), reviews: reviewsFor(product) });
});

/* Deterministic pseudo-reviews so the PDP has substance without a review DB. */
function reviewsFor(product) {
  const voices = [
    { name: 'M. Delacroix', city: 'Paris', title: 'Worth the wait',
      body: 'Ordered in March, delivered in May, and I would wait again. The finishing is on a level I have not seen outside of bespoke.' },
    { name: 'J. Whitfield', city: 'London', title: 'Quietly exceptional',
      body: 'Nothing about it announces itself, which is precisely why I wear it every day. The concierge remembered my sizing without being asked.' },
    { name: 'A. Nakamura', city: 'Tokyo', title: 'The details hold up',
      body: 'I inspected it closely, expecting to find a shortcut somewhere. There is not one. The packaging alone is worth keeping.' },
    { name: 'R. Okonjo', city: 'New York', title: 'Second piece from the house',
      body: 'My first is nine years old and has been serviced once, free of charge. That is why there is now a second.' }
  ];
  const dist = [
    Math.round(product.reviews * 0.78),
    Math.round(product.reviews * 0.15),
    Math.round(product.reviews * 0.05),
    Math.round(product.reviews * 0.015),
    Math.round(product.reviews * 0.005)
  ];
  const n = (product.name.length % 2) + 3;
  return {
    average: product.rating,
    count: product.reviews,
    distribution: dist,
    items: voices.slice(0, n).map((v, i) => ({
      ...v,
      rating: i === voices.length - 1 ? 4 : 5,
      date: `2026-0${(i % 6) + 1}-1${i + 2}`,
      verified: true
    }))
  };
}

/* ---- search ---- */
router.get('/search', (req, res) => {
  const q = String(req.query.q || '');
  const items = searchProducts(q);
  res.json({
    query: q,
    total: items.length,
    items,
    suggestions: CATEGORIES_FN().filter((c) =>
      items.some((p) => p.cat === c.slug)
    ).map((c) => ({ slug: c.slug, name: c.name }))
  });
});

/* ---- boutiques ---- */
router.get('/stores', (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  const service = String(req.query.service || '').trim().toLowerCase();
  let list = [...STORES];
  if (q) {
    list = list.filter((s) =>
      `${s.name} ${s.city} ${s.country} ${s.address.join(' ')}`.toLowerCase().includes(q)
    );
  }
  if (service) {
    list = list.filter((s) => s.services.some((x) => x.toLowerCase().includes(service)));
  }
  res.json({ total: list.length, items: list });
});

router.get('/stores/:id', (req, res) => {
  const store = STORES.find((s) => s.id === req.params.id);
  if (!store) return res.status(404).json({ error: 'Boutique not found' });
  const nearby = STORES.filter((s) => s.id !== store.id).slice(0, 3);
  res.json({ store, nearby });
});

/* ---- editorial + policy content ---- */
router.get('/content', (_req, res) => {
  res.json({
    journal: JOURNAL,
    values: VALUES,
    memberPerks: MEMBER_PERKS,
    shippingMethods: SHIPPING_METHODS,
    paymentMethods: PAYMENT_METHODS,
    faqs: FAQS,
    legal: LEGAL_SECTIONS
  });
});

export default router;
