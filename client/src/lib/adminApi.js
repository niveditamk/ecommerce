/* =============================================================
   ADMIN API CLIENT
   Bearer-token auth against /api/admin. Separate from the
   storefront client so a shopper session and a staff session
   can never be confused for one another.
   ============================================================= */
const TOKEN_KEY = 'aurelis.admin.token';
const TOKEN_KEY_LEGACY = 'aurelis_admin_token';
const API_HOST = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : '';
const BASE = `${API_HOST}/api/admin`;

export const readToken = () => {
  try {
    return window.localStorage.getItem(TOKEN_KEY) ||
           window.localStorage.getItem(TOKEN_KEY_LEGACY) ||
           '';
  } catch {
    return '';
  }
};

export const writeToken = (t) => {
  try {
    if (t) {
      window.localStorage.setItem(TOKEN_KEY, t);
      window.localStorage.setItem(TOKEN_KEY_LEGACY, t);
    } else {
      window.localStorage.removeItem(TOKEN_KEY);
      window.localStorage.removeItem(TOKEN_KEY_LEGACY);
    }
  } catch { /* private mode */ }
};

export async function authFetch(url, options = {}) {
  const token = readToken();
  const headers = { Accept: 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const fetchOptions = { ...options, headers };
  if (options.body !== undefined && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    fetchOptions.body = JSON.stringify(options.body);
  }

  let res;
  try {
    res = await fetch(url, fetchOptions);
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new AdminError('The server is unreachable.', 0, null);
  }

  if (res.status === 401) {
    writeToken('');
    window.dispatchEvent(new CustomEvent('aurelis:session-expired'));
  }
  return res;
}

export class AdminError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = 'AdminError';
    this.status = status;
    this.payload = payload;
  }
}

async function request(path, { method = 'GET', body, signal } = {}) {
  const headers = { Accept: 'application/json' };
  const token = readToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(BASE + path, { method, headers, signal, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new AdminError('The server is unreachable.', 0, null);
  }

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }

  /* Dropping the token was not enough: AdminContext kept the stale
     staff object, so the guard in AdminLayout never fired and the
     operator carried on clicking through an admin that 401s on every
     request. Tell the app the session is over. */
  if (res.status === 401) {
    writeToken('');
    window.dispatchEvent(new CustomEvent('aurelis:session-expired'));
  }
  if (!res.ok) throw new AdminError(data?.error || `Request failed (${res.status})`, res.status, data);
  return data;
}

const qs = (params) => {
  const s = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    s.set(k, String(v));
  });
  const out = s.toString();
  return out ? `?${out}` : '';
};

export const adminApi = {
  login: (email, password) => request('/login', { method: 'POST', body: { email, password } }),
  logout: () => request('/logout', { method: 'POST' }),
  me: () => request('/me'),
  demoAccounts: () => request('/demo-accounts'),

  dashboard: () => request('/dashboard'),

  products: (params) => request(`/products${qs(params)}`),
  product: (id) => request(`/products/${id}`),
  updateProduct: (id, patch) => request(`/products/${id}`, { method: 'PATCH', body: patch }),
  createProduct: (body) => request('/products', { method: 'POST', body }),
  archiveProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),
  bulkProducts: (ids, action, value) => request('/products/bulk', { method: 'POST', body: { ids, action, value } }),
  /* A plain <a href> sends no Authorization header, so the export
     was a 401 dressed up as a download. Fetch it with the token and
     hand the browser a blob instead. */
  exportProducts: async () => {
    const token = readToken();
    const res = await fetch(`${BASE}/products/export/csv`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!res.ok) {
      if (res.status === 401 && token) {
        writeToken('');
        window.dispatchEvent(new CustomEvent('aurelis:session-expired'));
      }
      throw new AdminError(`Export failed (${res.status})`, res.status, null);
    }
    return res.blob();
  },

  categories: () => request('/categories'),
  updateCategory: (slug, patch) => request(`/categories/${slug}`, { method: 'PATCH', body: patch }),

  inventory: () => request('/inventory'),
  adjustStock: (id, delta, reason, note) =>
    request(`/inventory/${id}/adjust`, { method: 'POST', body: { delta, reason, note } }),
  stockHistory: (id) => request(`/inventory/${id}/history`),

  orders: (params) => request(`/orders${qs(params)}`),
  order: (id) => request(`/orders/${id}`),
  updateOrder: (id, patch) => request(`/orders/${id}`, { method: 'PATCH', body: patch }),

  customers: () => request('/customers'),
  staff: () => request('/staff'),
  roles: () => request('/roles'),
  audit: (params) => request(`/audit${qs(params)}`),

  /* ---- Medusa ----
     Proxied through our own server so the browser never holds a
     Medusa token and one permission model governs everything. */
  medusa: {
    status: () => request('/medusa/status'),
    inventory: () => request('/medusa/inventory'),
    products: () => request('/medusa/products'),
    reservations: () => request('/medusa/reservations'),
    questions: () => request('/medusa/ask'),
    ask: (id) => request(`/medusa/ask/${id}`),
    aiStatus: () => request('/medusa/ai/status'),
    aiContext: () => request('/medusa/ai/context'),
    aiAsk: (question) => request('/medusa/ai/ask', { method: 'POST', body: { question } })
  },

  /* ---- ML operations ----
     Its own namespace because the console is a separate surface
     with its own permissions, not an extra tab on the catalogue. */
  ml: {
    overview: () => request('/ml/overview'),

    models: () => request('/ml/models'),
    model: (key) => request(`/ml/models/${key}`),
    train: (key) => request(`/ml/models/${key}/train`, { method: 'POST' }),
    activate: (key, versionId) =>
      request(`/ml/models/${key}/versions/${versionId}/activate`, { method: 'POST' }),
    runs: (params) => request(`/ml/runs${qs(params)}`),

    forecast: (sku, params) => request(`/ml/forecast/${sku}${qs(params)}`),
    snapshot: (horizon) => request('/ml/snapshot', { method: 'POST', body: { horizon } }),

    risk: (params) => request(`/ml/risk${qs(params)}`),
    reorder: (params) => request(`/ml/reorder${qs(params)}`),
    overstock: () => request('/ml/overstock'),
    anomalies: (params) => request(`/ml/anomalies${qs(params)}`),
    segments: () => request('/ml/segments'),

    feedback: (params) => request(`/ml/feedback${qs(params)}`),
    decide: (body) => request('/ml/feedback', { method: 'POST', body }),

    data: () => request('/ml/data'),
    generate: (body) => request('/ml/data/synthetic', { method: 'POST', body }),
    purge: () => request('/ml/data/synthetic', { method: 'DELETE' })
  }
};

export default adminApi;
