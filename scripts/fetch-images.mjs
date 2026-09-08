#!/usr/bin/env node
/* =============================================================
   PRODUCT IMAGERY — WIKIMEDIA COMMONS

   The 21 original product photographs are CC-licensed museum
   pieces, each carrying its licence, author and source URL in
   client/src/lib/imageManifest.json. Expanding the catalogue
   means more of the same, not stock filler: random photography
   reads as wrong on a maison storefront, and it would break the
   attribution the manifest already models.

   This fetches candidates per category, keeps only genuinely
   free licences, de-duplicates on the SHA-1 Commons itself
   reports, and writes a pool file. Nothing is downloaded twice
   and no image is ever assigned to two products.

     node scripts/fetch-images.mjs            fetch the pool
     node scripts/fetch-images.mjs --dry      report only
   ============================================================= */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'client', 'public', 'products');
const POOL_FILE = path.join(ROOT, 'scripts', '.image-pool.json');
const MANIFEST = path.join(ROOT, 'client', 'src', 'lib', 'imageManifest.json');
const DRY = process.argv.includes('--dry');

/* Commons asks for a descriptive agent with contact details. */
const UA = 'AurelisCatalogueBot/1.0 (https://github.com/aurelis; product imagery for a demo storefront)';
const API = 'https://commons.wikimedia.org/w/api.php';

/* Searches chosen to return objects a maison would actually sell.
   Museum collections are the richest free source of these. */
const SEARCHES = {
  jewellery: [
    'gold ring museum collection', 'necklace museum gold', 'brooch museum collection',
    'bracelet gold museum', 'earrings museum collection', 'pendant gold museum'
  ],
  horology: [
    'pocket watch movement', 'wristwatch museum', 'watch movement caliber',
    'chronometer marine', 'clock mechanism brass'
  ],
  parfums: [
    'perfume bottle glass museum', 'scent bottle antique', 'flacon parfum',
    'perfume flask crystal', 'cologne bottle vintage'
  ],
  leather: [
    'leather bag museum collection', 'leather satchel antique', 'leather bookbinding',
    'leather wallet vintage', 'leather trunk luggage'
  ],
  objets: [
    'silver desk object museum', 'inkwell antique', 'paperweight glass museum',
    'letter opener antique', 'decorative box enamel museum'
  ],
  silk: [
    'silk scarf textile museum', 'silk textile pattern museum', 'embroidered silk museum',
    'woven silk fabric museum', 'silk shawl collection'
  ],
  eyewear: [
    'spectacles antique museum', 'eyeglasses vintage collection', 'sunglasses vintage',
    'lorgnette antique', 'pince-nez spectacles'
  ]
};

/* Anything not on this list is treated as unusable, including the
   "fair use" and "non-commercial" tags that look free but are not. */
const FREE = [
  /^cc0/i, /^public domain/i, /^pd-/i, /^cc by(-sa)?[- ]?[0-9.]*$/i,
  /^cc-by(-sa)?-[0-9.]+$/i
];
const isFree = (licence) => !!licence && FREE.some((re) => re.test(licence.trim()));

const strip = (html) => String(html || '')
  .replace(/<[^>]*>/g, '')
  .replace(/&[a-z]+;/gi, ' ')
  .replace(/\s+/g, ' ')
  .trim();

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: 'json', origin: '*', ...params })}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Commons ${res.status} for ${params.gsrsearch || params.titles}`);
  return res.json();
}

async function search(term, limit = 30) {
  const data = await api({
    action: 'query',
    generator: 'search',
    gsrsearch: `filetype:bitmap ${term}`,
    gsrnamespace: '6',
    gsrlimit: String(limit),
    prop: 'imageinfo',
    iiprop: 'url|extmetadata|size|sha1|mime',
    iiurlwidth: '1400'
  });
  const pages = data?.query?.pages || {};
  return Object.values(pages).map((p) => {
    const info = (p.imageinfo || [])[0];
    if (!info) return null;
    const meta = info.extmetadata || {};
    return {
      title: p.title,
      sha1: info.sha1,
      mime: info.mime,
      width: info.width,
      height: info.height,
      url: info.thumburl || info.url,
      descriptionUrl: info.descriptionurl,
      licence: strip(meta.LicenseShortName?.value),
      author: strip(meta.Artist?.value).slice(0, 90),
      description: strip(meta.ImageDescription?.value).slice(0, 220)
    };
  }).filter(Boolean);
}

function usable(c) {
  if (!c.url || !c.sha1) return false;
  if (!/^image\/(jpeg|png)$/.test(c.mime || '')) return false;
  if (!isFree(c.licence)) return false;
  /* Portrait-ish or square reads best in the product frames; very
     wide panoramas crop badly at 3:4. */
  if (!c.width || !c.height) return false;
  if (c.width / c.height > 2.2 || c.height / c.width > 2.2) return false;
  if (c.width < 700) return false;
  if (!c.description || c.description.length < 12) return false;
  return true;
}

const main = async () => {
  const seenSha = new Set();
  const seenTitle = new Set();

  /* Whatever the 21 originals already use stays reserved. */
  if (fs.existsSync(MANIFEST)) {
    const existing = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    for (const v of Object.values(existing)) if (v.source) seenTitle.add(decodeURIComponent(v.source));
  }

  const pool = {};
  for (const [cat, terms] of Object.entries(SEARCHES)) {
    pool[cat] = [];
    for (const term of terms) {
      if (pool[cat].length >= 24) break;
      let candidates = [];
      try {
        candidates = await search(term);
      } catch (err) {
        console.warn(`  ! ${cat} "${term}": ${err.message}`);
        continue;
      }
      for (const c of candidates) {
        if (pool[cat].length >= 24) break;
        if (!usable(c)) continue;
        if (seenSha.has(c.sha1)) continue;          // same file, different name
        if (seenTitle.has(c.title)) continue;
        seenSha.add(c.sha1);
        seenTitle.add(c.title);
        pool[cat].push(c);
      }
      /* Be a good citizen of a donated API. */
      await new Promise((r) => setTimeout(r, 350));
    }
    console.log(`${String(pool[cat].length).padStart(3)}  ${cat}`);
  }

  const total = Object.values(pool).reduce((n, a) => n + a.length, 0);
  console.log(`\n${total} usable, free-licensed, de-duplicated candidates`);
  console.log(`${seenSha.size} distinct SHA-1s seen — no image can be assigned twice`);

  if (DRY) { console.log('\n--dry: nothing written'); return; }
  fs.mkdirSync(path.dirname(POOL_FILE), { recursive: true });
  fs.writeFileSync(POOL_FILE, JSON.stringify(pool, null, 2));
  console.log(`\npool written to ${path.relative(ROOT, POOL_FILE)}`);
  console.log('download with: node scripts/fetch-images.mjs --download');
};

/* ---- download phase, run once the pool is settled ---- */
async function download() {
  const pool = JSON.parse(fs.readFileSync(POOL_FILE, 'utf8'));
  fs.mkdirSync(OUT_DIR, { recursive: true });
  let n = 0;
  for (const [cat, items] of Object.entries(pool)) {
    for (const [i, item] of items.entries()) {
      const file = path.join(OUT_DIR, `${cat}-${String(i + 1).padStart(2, '0')}.jpg`);
      if (fs.existsSync(file)) { item.localFile = path.basename(file); continue; }
      const res = await fetch(item.url, { headers: { 'User-Agent': UA } });
      if (!res.ok) { console.warn(`  ! ${item.title}: ${res.status}`); continue; }
      fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
      item.localFile = path.basename(file);
      n += 1;
      process.stdout.write(`\r  downloaded ${n}`);
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  fs.writeFileSync(POOL_FILE, JSON.stringify(pool, null, 2));
  console.log(`\n${n} new file(s) into ${path.relative(ROOT, OUT_DIR)}`);
}

if (process.argv.includes('--download')) await download();
else await main();
