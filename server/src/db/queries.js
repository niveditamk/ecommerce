/* =============================================================
   CATALOGUE READS — from SQLite
   The storefront reads through these, so anything an admin edits
   is live on the shop immediately. Response shapes match what
   the client already expects; nothing on the front end changes.
   ============================================================= */
import { db } from './index.js';

const parse = (v, fallback) => { try { return v ? JSON.parse(v) : fallback; } catch { return fallback; } };

export function hydrateProduct(r) {
  if (!r) return null;
  return {
    ...r,
    details: parse(r.details, []),
    sizes: parse(r.sizes, []),
    colors: parse(r.colors, []),
    badges: parse(r.badges, []),
    tags: parse(r.tags, [])
  };
}

export function hydrateCategory(c) {
  if (!c) return null;
  return { ...c, sub: parse(c.sub, []) };
}

/* Only active products are ever shown to shoppers. */
const LIVE = "status = 'active'";

export const allProducts = () =>
  db.prepare(`SELECT * FROM products WHERE ${LIVE} ORDER BY name ASC`).all().map(hydrateProduct);

export const productById = (id) =>
  hydrateProduct(db.prepare(`SELECT * FROM products WHERE id = ? AND ${LIVE}`).get(id));

export const allCategories = () =>
  db.prepare('SELECT * FROM categories ORDER BY position ASC').all().map(hydrateCategory);

export const categoryBySlug = (slug) =>
  hydrateCategory(db.prepare('SELECT * FROM categories WHERE slug = ?').get(slug));

export function relatedTo(product, n = 4) {
  const score = (p) =>
    (p.cat === product.cat ? 10 : 0) + p.tags.filter((t) => product.tags.includes(t)).length;
  return allProducts()
    .filter((p) => p.id !== product.id)
    .sort((a, b) => score(b) - score(a))
    .slice(0, n);
}

const flatten = (s) => String(s || '').replace(/&[a-z]+;/g, ' ').toLowerCase();

export function searchProducts(q) {
  const query = String(q || '').trim().toLowerCase();
  if (!query) return [];
  const terms = query.split(/\s+/);
  return allProducts()
    .map((p) => {
      const hay = flatten(`${p.name} ${p.cat} ${p.sub} ${p.materials} ${p.blurb} ${p.tags.join(' ')}`);
      let s = 0;
      terms.forEach((t) => {
        if (flatten(p.name).includes(t)) s += 8;
        if (p.tags.includes(t)) s += 5;
        if (hay.includes(t)) s += 2;
      });
      return { p, s };
    })
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((r) => r.p);
}

export function filterProducts({ cat, sub, q, min, max, sort, badges }) {
  let list = q ? searchProducts(q) : allProducts();
  if (cat) list = list.filter((p) => p.cat === cat);
  if (sub) list = list.filter((p) => flatten(p.sub).trim() === flatten(sub).trim());
  if (min != null) list = list.filter((p) => p.price >= Number(min));
  if (max != null) list = list.filter((p) => p.price <= Number(max));
  if (badges?.length) list = list.filter((p) => badges.some((b) => p.badges.includes(b)));

  switch (sort) {
    case 'price-asc': list.sort((a, b) => a.price - b.price); break;
    case 'price-desc': list.sort((a, b) => b.price - a.price); break;
    case 'rating': list.sort((a, b) => b.rating - a.rating); break;
    case 'newest': list.sort((a, b) => b.year - a.year); break;
    default: if (!q) list.sort((a, b) => b.reviews * b.rating - a.reviews * a.rating);
  }
  return list;
}
