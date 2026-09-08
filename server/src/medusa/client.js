/* =============================================================
   MEDUSA CLIENT
   Talks to the Medusa Admin API on behalf of the Aurelis admin.

   The browser never talks to Medusa directly. Every call goes
   through our own permission-guarded routes, so a Medusa admin
   token is never handed to a client, and an operator's access to
   Medusa data is governed by the same RBAC as everything else.

   Medusa is treated as a SOURCE, not as the source of truth. The
   storefront still sells from SQLite. Nothing here writes to
   Medusa unless a route explicitly asks it to.
   ============================================================= */

const BASE = process.env.MEDUSA_URL || 'http://localhost:9000';
const EMAIL = process.env.MEDUSA_EMAIL || '';
const PASSWORD = process.env.MEDUSA_PASSWORD || '';

/* A Medusa JWT lasts a while; re-authenticating on every request
   would be a needless round trip on every page load. */
let cached = { token: null, at: 0 };
const TOKEN_TTL_MS = 20 * 60 * 1000;

export const isConfigured = () => Boolean(EMAIL && PASSWORD);

export class MedusaError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = 'MedusaError';
    this.status = status;
    this.payload = payload;
  }
}

async function authenticate() {
  if (!isConfigured()) {
    throw new MedusaError(
      'MEDUSA_EMAIL and MEDUSA_PASSWORD are not set, so this server cannot reach Medusa.',
      503
    );
  }
  const res = await fetch(`${BASE}/auth/user/emailpass`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD })
  });
  if (!res.ok) {
    throw new MedusaError(`Medusa rejected the service credentials (${res.status}).`, 502);
  }
  const { token } = await res.json();
  cached = { token, at: Date.now() };
  return token;
}

async function token() {
  if (cached.token && Date.now() - cached.at < TOKEN_TTL_MS) return cached.token;
  return authenticate();
}

/** GET against the Medusa Admin API. Retries once on a 401, because
    the usual cause is a token that expired between calls. */
export async function get(path, { retry = true } = {}) {
  let t;
  try {
    t = await token();
  } catch (err) {
    throw err;
  }

  let res;
  try {
    res = await fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${t}` } });
  } catch {
    throw new MedusaError(`Medusa is not reachable at ${BASE}. Is it running?`, 503);
  }

  if (res.status === 401 && retry) {
    cached = { token: null, at: 0 };
    return get(path, { retry: false });
  }
  if (!res.ok) {
    const body = await res.text();
    throw new MedusaError(`Medusa returned ${res.status} for ${path}`, res.status, body.slice(0, 300));
  }
  return res.json();
}

export async function post(path, body) {
  const t = await token();
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {})
  });
  if (!res.ok) {
    const text = await res.text();
    throw new MedusaError(`Medusa returned ${res.status} for ${path}`, res.status, text.slice(0, 300));
  }
  return res.json();
}

/* ---------- reads the console actually needs ---------- */

export async function health() {
  try {
    const res = await fetch(`${BASE}/health`);
    return { reachable: res.ok, status: res.status, base: BASE, configured: isConfigured() };
  } catch {
    return { reachable: false, status: 0, base: BASE, configured: isConfigured() };
  }
}

export async function products(limit = 100) {
  const j = await get(`/admin/products?limit=${limit}&fields=id,title,handle,status,*variants`);
  return j.products || [];
}

export async function inventoryItems(limit = 200) {
  const j = await get(`/admin/inventory-items?limit=${limit}`);
  return j.inventory_items || [];
}

export async function stockLocations() {
  const j = await get('/admin/stock-locations');
  return j.stock_locations || [];
}

export async function reservations(limit = 100) {
  const j = await get(`/admin/reservations?limit=${limit}`);
  return j.reservations || [];
}

/** Everything the inventory dashboard needs, in one round of calls. */
export async function inventorySnapshot() {
  const [items, locations, prods] = await Promise.all([
    inventoryItems(500),
    stockLocations(),
    products(200)
  ]);

  /* Map a variant SKU back to the product that owns it, so the board
     can group 77 variants under 21 pieces rather than listing them flat. */
  const byVariantSku = new Map();
  for (const p of prods) {
    for (const v of p.variants || []) {
      if (v.sku) byVariantSku.set(v.sku, { handle: p.handle, title: p.title, variant: v.title });
    }
  }

  const rows = items.map((i) => {
    const owner = byVariantSku.get(i.sku) || {};
    const stocked = Number(i.stocked_quantity ?? 0);
    const reserved = Number(i.reserved_quantity ?? 0);
    return {
      id: i.id,
      sku: i.sku,
      product: owner.title || null,
      handle: owner.handle || null,
      variant: owner.variant || null,
      stocked,
      reserved,
      available: Math.max(0, stocked - reserved)
    };
  });

  const byProduct = new Map();
  for (const r of rows) {
    const key = r.handle || 'unassigned';
    const acc = byProduct.get(key) || {
      handle: key, product: r.product, variants: 0, stocked: 0, reserved: 0, available: 0
    };
    acc.variants += 1;
    acc.stocked += r.stocked;
    acc.reserved += r.reserved;
    acc.available += r.available;
    byProduct.set(key, acc);
  }

  return {
    locations: locations.map((l) => ({ id: l.id, name: l.name })),
    totals: {
      products: prods.length,
      variants: rows.length,
      stocked: rows.reduce((n, r) => n + r.stocked, 0),
      reserved: rows.reduce((n, r) => n + r.reserved, 0),
      available: rows.reduce((n, r) => n + r.available, 0),
      outOfStock: rows.filter((r) => r.available === 0).length
    },
    byProduct: [...byProduct.values()].sort((a, b) => a.available - b.available),
    rows
  };
}
