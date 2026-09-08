#!/usr/bin/env node
/* =============================================================
   DOWNSCALE PRODUCT IMAGERY

   The catalogue images were pulled at 1400px, which is more than
   any frame on the site renders and came to 80MB — heavy for a
   free-tier deploy where the whole service sleeps and cold-starts.

   There is no image library in this project and adding one means
   a native binary in the build. Commons renders thumbnails on its
   own side and encodes the width in the URL, so asking for a
   narrower one costs a request and no dependency at all.

     node scripts/downscale-images.mjs --width 900
   ============================================================= */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'client', 'public', 'products');
const POOL = path.join(ROOT, 'scripts', '.image-pool.json');
const UA = 'AurelisCatalogueBot/1.0 (product imagery for a demo storefront)';

const widthArg = process.argv.indexOf('--width');
const WIDTH = widthArg > -1 ? Number(process.argv[widthArg + 1]) : 900;

/* Commons serves only thumbnail widths it generated itself — editing the
   number in a URL by hand returns 400. Ask the API for this exact file at
   the width we want and use whatever URL it hands back. Answers are
   batched fifty titles at a time and cached, so this costs three requests
   for the whole catalogue rather than one per image. */
const thumbCache = new Map();

async function primeThumbs(titles, width) {
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50);
    const url = 'https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({
      action: 'query', format: 'json', prop: 'imageinfo',
      iiprop: 'url', iiurlwidth: String(width), titles: batch.join('|')
    });
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!res.ok) continue;
      const data = await res.json();
      for (const page of Object.values(data?.query?.pages || {})) {
        const info = (page.imageinfo || [])[0];
        if (page.title && info?.thumburl) thumbCache.set(page.title, info.thumburl);
      }
    } catch { /* leave those titles uncached; they are simply skipped */ }
    await new Promise((r) => setTimeout(r, 300));
  }
}

const thumbUrl = async (title) => thumbCache.get(title) || null;

const before = fs.readdirSync(DIR).reduce((n, f) => n + fs.statSync(path.join(DIR, f)).size, 0);
const pool = JSON.parse(fs.readFileSync(POOL, 'utf8'));

await primeThumbs(Object.values(pool).flat().map((i) => i.title), WIDTH);
console.log(`resolved ${thumbCache.size} thumbnail URLs at ${WIDTH}px`);

let done = 0, skipped = 0, saved = 0;

for (const [cat, items] of Object.entries(pool)) {
  for (const [i, item] of items.entries()) {
    const file = path.join(DIR, `${cat}-${String(i + 1).padStart(2, '0')}.jpg`);
    if (!fs.existsSync(file)) continue;

    /* Rewriting the width in the URL by hand returns 400: Wikimedia only
       serves thumbnail sizes it generated itself. Ask the API for this
       exact file at the width we want and use the URL it hands back. */
    const smaller = await thumbUrl(item.title);
    if (!smaller || smaller === item.url) { skipped += 1; continue; }

    const wasSize = fs.statSync(file).size;
    try {
      const res = await fetch(smaller, { headers: { 'User-Agent': UA } });
      if (!res.ok) { skipped += 1; continue; }
      const buf = Buffer.from(await res.arrayBuffer());
      /* Only keep it if it is actually smaller — some originals are
         already narrow and the "thumbnail" comes back upscaled. */
      if (buf.length >= wasSize) { skipped += 1; continue; }
      fs.writeFileSync(file, buf);
      saved += wasSize - buf.length;
      done += 1;
      process.stdout.write(`\r  rewritten ${done}`);
    } catch {
      skipped += 1;
    }
    await new Promise((r) => setTimeout(r, 120));
  }
}

const after = fs.readdirSync(DIR).reduce((n, f) => n + fs.statSync(path.join(DIR, f)).size, 0);
const mb = (b) => (b / 1024 / 1024).toFixed(1) + 'MB';
console.log(`\n${done} rewritten at ${WIDTH}px, ${skipped} left alone`);
console.log(`${mb(before)} -> ${mb(after)}  (${mb(saved)} saved)`);
