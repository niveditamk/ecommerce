#!/usr/bin/env node
/* =============================================================
   REPLACE UNSUITABLE PRODUCT PHOTOGRAPHS

   The first Commons sweep used broad search terms, and broad terms
   return scenes rather than objects: "desk" brought back five
   photographs of women at typewriters, "sunglasses vintage" brought
   back a costume fair and a dog. The written copy is fine — each
   product describes a real sellable object drawn from its scene —
   so only the photograph needs replacing.

   This takes a list of product ids, searches Commons for that
   product's own object type, and swaps in the first clean, free,
   unused result. Every candidate is checked against the SHA-1s
   already in the manifest so no image is ever used twice.

     node scripts/replace-images.mjs --dry
     node scripts/replace-images.mjs
   ============================================================= */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'client', 'public', 'products');
const MANIFEST = path.join(ROOT, 'client', 'src', 'lib', 'imageManifest.json');
const UA = 'AurelisCatalogueBot/1.0 (product imagery for a demo storefront)';
const API = 'https://commons.wikimedia.org/w/api.php';
const DRY = process.argv.includes('--dry');

/* id -> the search that actually describes the object being sold */
const REPLACE = {
  'aur-208': 'pocket watch movement close up',
  'aur-711': 'spectacles frame museum object',
  'aur-713': 'spectacles museum collection',
  'aur-718': 'eyeglasses museum collection'
};

const FREE = [/^cc0/i, /^public domain/i, /^pd-/i, /^cc by(-sa)?[- ]?[0-9.]*$/i, /^cc-by(-sa)?-[0-9.]+$/i];
const isFree = (l) => !!l && FREE.some((re) => re.test(l.trim()));
const strip = (h) => String(h || '').replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();

/* Only what actually disqualifies a product photograph. The first pass
   also rejected "man", "woman" and "portrait", which threw away good
   museum captions — those routinely name a donor or a sitter without the
   photograph being of a person. */
const SCENE = /\b(dog|cat|selfie|crowd|parade|cosplay|typewriter|seated at|wearing (a|the|his|her)?\s*(sunglasses|spectacles|dress))\b/i;

async function search(term) {
  const url = `${API}?${new URLSearchParams({
    action: 'query', format: 'json', generator: 'search',
    gsrsearch: `filetype:bitmap ${term}`, gsrnamespace: '6', gsrlimit: '80',
    prop: 'imageinfo', iiprop: 'url|extmetadata|size|sha1|mime', iiurlwidth: '900'
  })}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) return [];
  const data = await res.json();
  return Object.values(data?.query?.pages || {}).map((p) => {
    const info = (p.imageinfo || [])[0];
    if (!info) return null;
    const meta = info.extmetadata || {};
    return {
      title: p.title, sha1: info.sha1, mime: info.mime,
      width: info.width, height: info.height,
      url: info.thumburl || info.url, descriptionUrl: info.descriptionurl,
      licence: strip(meta.LicenseShortName?.value),
      author: strip(meta.Artist?.value).slice(0, 90),
      description: strip(meta.ImageDescription?.value).slice(0, 200)
    };
  }).filter(Boolean);
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));

/* every image already in use, by content hash, so nothing repeats */
const used = new Set();
for (const f of fs.readdirSync(DIR)) {
  used.add(crypto.createHash('sha1').update(fs.readFileSync(path.join(DIR, f))).digest('hex'));
}

let replaced = 0, failed = [];
for (const [id, term] of Object.entries(REPLACE)) {
  const entry = manifest[id];
  if (!entry) { failed.push(`${id}: not in manifest`); continue; }

  let picked = null;
  for (const c of await search(term)) {
    if (!/^image\/(jpeg|png)$/.test(c.mime || '')) continue;
    if (!isFree(c.licence)) continue;
    if (!c.description || c.description.length < 12) continue;
    if (SCENE.test(c.description)) continue;
    if (!c.width || !c.height) continue;
    if (c.width / c.height > 2.2 || c.height / c.width > 2.2) continue;
    picked = c;
    break;
  }
  if (!picked) { failed.push(`${id}: no clean candidate for "${term}"`); continue; }

  if (DRY) {
    console.log(`${id}  ${picked.licence.padEnd(14)} ${picked.description.slice(0, 72)}`);
    replaced += 1;
    await new Promise((r) => setTimeout(r, 700));
    continue;
  }

  const res = await fetch(picked.url, { headers: { 'User-Agent': UA } });
  if (!res.ok) { failed.push(`${id}: download ${res.status}`); continue; }
  const buf = Buffer.from(await res.arrayBuffer());
  const hash = crypto.createHash('sha1').update(buf).digest('hex');
  /* The file being overwritten is itself in `used`, so a re-run that lands
     on the same photograph would otherwise report a collision with itself.
     Drop the target's own current hash before testing. */
  const target = path.join(DIR, path.basename(entry.src));
  if (fs.existsSync(target)) {
    used.delete(crypto.createHash('sha1').update(fs.readFileSync(target)).digest('hex'));
  }
  if (used.has(hash)) { failed.push(`${id}: candidate duplicates a different product's image`); continue; }
  used.add(hash);

  fs.writeFileSync(path.join(DIR, path.basename(entry.src)), buf);
  manifest[id] = {
    src: entry.src,
    alt: picked.description,
    licence: picked.licence,
    author: picked.author || 'Unknown',
    source: picked.descriptionUrl
  };
  replaced += 1;
  console.log(`${id}  ${picked.licence.padEnd(14)} ${picked.description.slice(0, 66)}`);
  await new Promise((r) => setTimeout(r, 250));
}

if (!DRY) fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
console.log(`\n${replaced} replaced${DRY ? ' (dry run, nothing written)' : ''}`);
if (failed.length) console.log('unresolved:\n  ' + failed.join('\n  '));
