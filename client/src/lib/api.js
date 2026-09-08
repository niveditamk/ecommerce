/* =============================================================
   AURELIS - API CLIENT
   Thin fetch wrapper. The session id issued by the server on
   first contact is persisted and replayed on every request.
   ============================================================= */

const SESSION_KEY = 'aurelis.session';
const API_HOST = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : '';
const BASE = `${API_HOST}/api`;

function readSession() {
  try { return window.localStorage.getItem(SESSION_KEY) || ''; } catch { return ''; }
}

/* The first id issued wins. The server echoes back whatever we send, so an
   overwrite can only ever come from a request that raced before an id was
   established — and taking the later one would orphan the earlier session. */
function writeSession(id) {
  if (!id || readSession()) return;
  try { window.localStorage.setItem(SESSION_KEY, id); } catch { /* private mode */ }
}

/* A first visit fires several requests at once (and React StrictMode doubles
   them in development). Without this gate each one arrives header-less and the
   server mints a separate session. Establish exactly one, then let the rest go. */
let sessionHandshake = null;

function ensureSession() {
  const existing = readSession();
  if (existing) return Promise.resolve(existing);

  if (!sessionHandshake) {
    sessionHandshake = fetch(`${BASE}/session`, { headers: { Accept: 'application/json' } })
      .then((res) => {
        writeSession(res.headers.get('x-aurelis-session'));
        return readSession();
      })
      .catch(() => null)
      .finally(() => { sessionHandshake = null; });
  }
  return sessionHandshake;
}

export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

async function request(path, { method = 'GET', body, signal } = {}) {
  const session = await ensureSession();
  const headers = { Accept: 'application/json' };
  if (session) headers['x-aurelis-session'] = session;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers,
      signal,
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError('The maison is unreachable. Check that the API is running.', 0, null);
  }

  const issued = res.headers.get('x-aurelis-session');
  if (issued) writeSession(issued);

  const text = await res.text();
  const data = text ? safeParse(text) : null;

  if (!res.ok) {
    throw new ApiError(data?.error || `Request failed (${res.status})`, res.status, data);
  }
  return data;
}

function safeParse(text) {
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

const qs = (params) => {
  const search = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    search.set(k, Array.isArray(v) ? v.join(',') : String(v));
  });
  const s = search.toString();
  return s ? `?${s}` : '';
};

export const api = {
  /* ---- public catalogue ---- */
  health: () => request('/health'),
  brand: () => request('/brand'),
  categories: () => request('/categories'),
  category: (slug) => request(`/categories/${slug}`),
  products: (params, signal) => request(`/products${qs(params)}`, { signal }),
  product: (id) => request(`/products/${id}`),
  search: (q, signal) => request(`/search${qs({ q })}`, { signal }),
  stores: (params) => request(`/stores${qs(params)}`),
  store: (id) => request(`/stores/${id}`),
  content: () => request('/content'),

  /* ---- session ---- */
  session: () => request('/session'),

  /* ---- cart ---- */
  addToCart: (payload) => request('/cart/items', { method: 'POST', body: payload }),
  setLineQty: (key, qty) => request(`/cart/items/${encodeURIComponent(key)}`, { method: 'PATCH', body: { qty } }),
  removeLine: (key) => request(`/cart/items/${encodeURIComponent(key)}`, { method: 'DELETE' }),
  saveLineForLater: (key) => request(`/cart/items/${encodeURIComponent(key)}/save`, { method: 'POST' }),
  emptyCart: () => request('/cart', { method: 'DELETE' }),
  applyPromo: (code) => request('/cart/promo', { method: 'POST', body: { code } }),
  clearPromo: () => request('/cart/promo', { method: 'DELETE' }),

  /* ---- wishlist ---- */
  toggleWish: (id) => request('/wishlist/toggle', { method: 'POST', body: { id } }),
  markRecent: (id) => request('/recent', { method: 'POST', body: { id } }),

  /* ---- auth ---- */
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  logout: () => request('/auth/logout', { method: 'POST' }),

  /* ---- account ---- */
  updateProfile: (payload) => request('/account/profile', { method: 'PATCH', body: payload }),
  updatePrefs: (payload) => request('/account/prefs', { method: 'PATCH', body: payload }),

  addAddress: (payload) => request('/addresses', { method: 'POST', body: payload }),
  updateAddress: (id, payload) => request(`/addresses/${id}`, { method: 'PUT', body: payload }),
  removeAddress: (id) => request(`/addresses/${id}`, { method: 'DELETE' }),
  defaultAddress: (id) => request(`/addresses/${id}/default`, { method: 'POST' }),

  addCard: (payload) => request('/cards', { method: 'POST', body: payload }),
  removeCard: (id) => request(`/cards/${id}`, { method: 'DELETE' }),
  defaultCard: (id) => request(`/cards/${id}/default`, { method: 'POST' }),

  /* ---- checkout + orders ---- */
  patchCheckout: (payload) => request('/checkout', { method: 'PATCH', body: payload }),
  placeOrder: () => request('/orders', { method: 'POST', body: {} }),
  orders: () => request('/orders'),
  order: (id) => request(`/orders/${id}`),
  requestReturn: (id, payload) => request(`/orders/${id}/return`, { method: 'POST', body: payload }),

  /* ---- misc ---- */
  subscribe: (payload) => request('/newsletter', { method: 'POST', body: payload }),
  contact: (payload) => request('/contact', { method: 'POST', body: payload }),
  bookAppointment: (payload) => request('/appointments', { method: 'POST', body: payload })
};

export default api;
