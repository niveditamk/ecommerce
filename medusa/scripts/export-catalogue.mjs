/* Export the Aurelis catalogue from SQLite into a plain JSON file that
   the Medusa import script can read.

   Done as a separate step on purpose: it keeps `node:sqlite` out of the
   Medusa process entirely, so the import is a pure data load with no
   interop between two runtimes' module systems.

   Usage:  node scripts/export-catalogue.mjs
*/
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DB = path.resolve(HERE, '../../server/.data/aurelis.db');
const OUT = path.resolve(HERE, '../data/aurelis-catalogue.json');

if (!fs.existsSync(DB)) {
  console.error(`No database at ${DB} — start the Aurelis server once to create it.`);
  process.exit(1);
}

const db = new DatabaseSync(DB, { readOnly: true });
const parse = (v, fallback) => { try { return v ? JSON.parse(v) : fallback; } catch { return fallback; } };

const categories = db.prepare(
  'SELECT slug, name, tag, blurb, sub, position FROM categories ORDER BY position'
).all().map((c) => ({
  slug: c.slug,
  name: c.name,
  description: c.blurb,
  sub: parse(c.sub, [])
}));

const products = db.prepare(
  `SELECT id, name, cat, sub, price, was, materials, blurb, story, care,
          details, sizes, colors, badges, tags, stock, low_stock_at, status, edition, year
     FROM products WHERE status != 'archived' ORDER BY id`
).all().map((p) => ({
  handle: p.id,
  title: p.name,
  category: p.cat,
  subcategory: p.sub,
  /* Our prices are whole rupees, which is what Medusa's decimal amount
     wants for INR — no minor-unit conversion. */
  price: p.price,
  compareAt: p.was || null,
  description: p.blurb,
  story: p.story,
  material: p.materials,
  care: p.care,
  edition: p.edition,
  year: p.year,
  sizes: parse(p.sizes, []),
  colours: parse(p.colors, []).map((c) => (typeof c === 'string' ? c : c.name)),
  details: parse(p.details, []),
  tags: parse(p.tags, []),
  badges: parse(p.badges, []),
  stock: p.stock,
  reorderPoint: p.low_stock_at,
  image: `/products/${p.id}.jpg`
}));

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify({ categories, products }, null, 2)}\n`);

const variants = products.reduce((n, p) => n + Math.max(1, p.sizes.length * Math.max(1, p.colours.length)), 0);
console.log(`exported ${categories.length} categories, ${products.length} products (~${variants} variants) -> ${path.relative(process.cwd(), OUT)}`);
console.log(`total stock: ${products.reduce((n, p) => n + p.stock, 0)} units`);
db.close();
