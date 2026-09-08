/* =============================================================
   AURELIS API - SESSION, CART, ACCOUNT, CHECKOUT, ORDERS
   Every route here operates on the caller's session, resolved
   by middleware from the x-aurelis-session header.
   ============================================================= */
import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { flush } from '../store.js';
import { lineKey, computeTotals, validatePromo, snapshot } from '../pricing.js';
import { SHIPPING_METHODS, STORES } from '../data/catalog.js';
/* stock is authoritative in the database, not the static catalogue */
import { productById } from '../db/queries.js';
import { db } from '../db/index.js';
import { reserve, release, commit, tx, availableOf } from '../inventory/engine.js';
import { hashPassword, verifyPassword } from '../auth/password.js';
import { recordAttempt, isLockedOut, clearAttempts } from '../auth/rbac.js';

const router = Router();
const ok = (res, session, extra = {}) => res.json({ ...snapshot(session), ...extra });

/* =========================================================
   SESSION
   ========================================================= */
router.get('/session', (req, res) => ok(res, req.session));

/* =========================================================
   CART
   ========================================================= */
router.post('/cart/items', (req, res) => {
  const { id, qty = 1, variant = null, size = null } = req.body || {};
  const product = productById(id);
  if (!product) return res.status(404).json({ error: 'Piece not found' });

  const chosenVariant = variant || (product.colors[0] ? product.colors[0].name : null);
  const chosenSize = size || (product.sizes[0] || null);
  const key = lineKey(id, chosenVariant, chosenSize);
  const existing = req.session.cart.find((l) => l.key === key);
  const want = Math.max(1, Number(qty) || 1);

  if (existing) {
    existing.qty = Math.min(existing.qty + want, Math.min(20, availableOf(id)));
  } else {
    req.session.cart.push({
      key, id, qty: Math.min(want, Math.min(20, availableOf(id))),
      variant: chosenVariant, size: chosenSize, addedAt: Date.now()
    });
  }
  flush();
  ok(res, req.session, { added: { id, name: product.name } });
});

router.patch('/cart/items/:key', (req, res) => {
  const line = req.session.cart.find((l) => l.key === req.params.key);
  if (!line) return res.status(404).json({ error: 'Line not in bag' });
  const product = productById(line.id);
  const qty = Number(req.body?.qty);

  if (!Number.isFinite(qty) || qty <= 0) {
    req.session.cart = req.session.cart.filter((l) => l.key !== req.params.key);
  } else {
    line.qty = Math.min(qty, Math.min(20, product ? availableOf(line.id) : 20));
  }
  flush();
  ok(res, req.session);
});

router.delete('/cart/items/:key', (req, res) => {
  req.session.cart = req.session.cart.filter((l) => l.key !== req.params.key);
  flush();
  ok(res, req.session);
});

router.delete('/cart', (req, res) => {
  req.session.cart = [];
  req.session.checkout.promo = null;
  flush();
  ok(res, req.session);
});

/* move a bag line to saved pieces */
router.post('/cart/items/:key/save', (req, res) => {
  const line = req.session.cart.find((l) => l.key === req.params.key);
  if (!line) return res.status(404).json({ error: 'Line not in bag' });
  if (!req.session.wishlist.includes(line.id)) req.session.wishlist.push(line.id);
  req.session.cart = req.session.cart.filter((l) => l.key !== req.params.key);
  flush();
  ok(res, req.session);
});

/* =========================================================
   PROMOTIONS
   ========================================================= */
router.post('/cart/promo', (req, res) => {
  const totals = computeTotals(req.session);
  const result = validatePromo(req.body?.code, totals.subtotal);
  if (!result.ok) return res.status(400).json({ error: result.message });
  req.session.checkout.promo = {
    code: result.promo.code, label: result.promo.label,
    type: result.promo.type, value: result.promo.value
  };
  flush();
  ok(res, req.session, { message: result.message });
});

router.delete('/cart/promo', (req, res) => {
  req.session.checkout.promo = null;
  flush();
  ok(res, req.session);
});

/* =========================================================
   WISHLIST + RECENTLY VIEWED
   ========================================================= */
router.post('/wishlist/toggle', (req, res) => {
  const { id } = req.body || {};
  if (!productById(id)) return res.status(404).json({ error: 'Piece not found' });
  const i = req.session.wishlist.indexOf(id);
  if (i > -1) req.session.wishlist.splice(i, 1);
  else req.session.wishlist.push(id);
  flush();
  ok(res, req.session, { saved: i === -1 });
});

router.post('/recent', (req, res) => {
  const { id } = req.body || {};
  if (!productById(id)) return res.status(404).json({ error: 'Piece not found' });
  req.session.recent = [id, ...req.session.recent.filter((x) => x !== id)].slice(0, 8);
  flush();
  res.json({ recent: req.session.recent });
});

/* =========================================================
   AUTH
   Storefront accounts are real: scrypt-hashed, stored in the
   customers table, rate-limited on failure. The previous version
   accepted ANY email with any six characters and built an identity
   out of the local part of the address — which meant signing in as
   another customer needed nothing but their email address.
   ========================================================= */
const normalise = (e) => String(e || '').trim().toLowerCase();
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function memberNumber(email) {
  let h = 0;
  for (let i = 0; i < email.length; i += 1) h = (h * 31 + email.charCodeAt(i)) % 8999;
  return `C-0${1000 + h}`;
}

const customerByEmail = (email) =>
  db.prepare('SELECT * FROM customers WHERE email = ?').get(email);

/* What the client is allowed to know about the signed-in customer. */
function publicUser(row) {
  return {
    email: row.email,
    first: row.first_name || 'Client',
    last: row.last_name || '',
    tier: row.tier || 'Cercle',
    since: Number(String(row.created_at || '').slice(0, 4)) || new Date().getFullYear(),
    memberNo: memberNumber(row.email)
  };
}

router.post('/auth/login', (req, res) => {
  const email = normalise(req.body?.email);
  const password = req.body?.password;

  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }
  if (isLockedOut(email)) {
    return res.status(429).json({ error: 'Too many attempts. Try again in fifteen minutes.' });
  }

  const row = customerByEmail(email);
  /* One message for both "no such account" and "wrong passphrase" —
     otherwise the response tells a stranger which addresses are
     registered here. */
  if (!row || !row.password_hash || !verifyPassword(password, row.password_hash, row.password_salt)) {
    recordAttempt(email, req.ip, false);
    return res.status(401).json({ error: 'That email and passphrase do not match an account.' });
  }

  clearAttempts(email);
  req.session.user = publicUser(row);
  req.session.checkout.email = email;
  req.session.checkout.mode = 'account';
  flush();
  ok(res, req.session);
});

router.post('/auth/register', (req, res) => {
  const email = normalise(req.body?.email);
  const { password, first, last } = req.body || {};

  if (!first || !last) return res.status(400).json({ error: 'We need your full name.' });
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }
  if (!password || String(password).length < 10) {
    return res.status(400).json({ error: 'Choose a passphrase of at least ten characters.' });
  }

  const existing = customerByEmail(email);
  if (existing && existing.password_hash) {
    return res.status(409).json({ error: 'An account already exists for that address. Sign in instead.' });
  }

  const { hash, salt } = hashPassword(password);
  let row;
  tx(() => {
    if (existing) {
      /* A guest checkout already created this customer. Claiming it
         sets the credentials rather than duplicating the record. */
      db.prepare(
        'UPDATE customers SET password_hash = ?, password_salt = ?, first_name = ?, last_name = ? WHERE id = ?'
      ).run(hash, salt, first, last, existing.id);
    } else {
      db.prepare(
        'INSERT INTO customers (email, first_name, last_name, tier, password_hash, password_salt) VALUES (?,?,?,?,?,?)'
      ).run(email, first, last, 'Cercle', hash, salt);
    }
    row = customerByEmail(email);
  });

  clearAttempts(email);
  req.session.user = publicUser(row);
  req.session.checkout.email = email;
  req.session.checkout.mode = 'account';
  flush();
  ok(res, req.session);
});

router.post('/auth/logout', (req, res) => {
  req.session.user = null;
  req.session.checkout.mode = null;
  flush();
  ok(res, req.session);
});

/* =========================================================
   PROFILE + PREFERENCES
   ========================================================= */
router.patch('/account/profile', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Sign in to update your profile.' });
  const { first, last, email, phone, birthday } = req.body || {};
  Object.assign(req.session.user, {
    ...(first ? { first } : {}), ...(last ? { last } : {}),
    ...(email ? { email } : {}), ...(phone !== undefined ? { phone } : {}),
    ...(birthday !== undefined ? { birthday } : {})
  });
  flush();
  ok(res, req.session, { message: 'Profile updated.' });
});

router.patch('/account/prefs', (req, res) => {
  Object.assign(req.session.prefs, req.body || {});
  flush();
  ok(res, req.session, { message: 'Preferences saved.' });
});

/* =========================================================
   ADDRESSES
   ========================================================= */
const REQUIRED_ADDRESS = ['first', 'last', 'line1', 'city', 'post', 'country'];

function validateAddress(body) {
  const missing = REQUIRED_ADDRESS.filter((f) => !String(body?.[f] || '').trim());
  return missing.length ? `Missing: ${missing.join(', ')}` : null;
}

router.post('/addresses', (req, res) => {
  const problem = validateAddress(req.body);
  if (problem) return res.status(400).json({ error: problem });
  const addr = {
    id: `a${Date.now().toString(36)}`,
    label: req.body.label || 'Address',
    ...req.body,
    isDefault: !!req.body.isDefault || req.session.addresses.length === 0
  };
  if (addr.isDefault) req.session.addresses.forEach((a) => { a.isDefault = false; });
  req.session.addresses.push(addr);
  if (!req.session.checkout.shipTo) req.session.checkout.shipTo = addr.id;
  flush();
  ok(res, req.session, { addressId: addr.id });
});

router.put('/addresses/:id', (req, res) => {
  const idx = req.session.addresses.findIndex((a) => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Address not found' });
  const problem = validateAddress(req.body);
  if (problem) return res.status(400).json({ error: problem });
  const merged = { ...req.session.addresses[idx], ...req.body, id: req.params.id };
  if (merged.isDefault) req.session.addresses.forEach((a) => { a.isDefault = false; });
  req.session.addresses[idx] = merged;
  flush();
  ok(res, req.session);
});

router.delete('/addresses/:id', (req, res) => {
  req.session.addresses = req.session.addresses.filter((a) => a.id !== req.params.id);
  if (req.session.checkout.shipTo === req.params.id) {
    req.session.checkout.shipTo = req.session.addresses[0]?.id || null;
  }
  if (req.session.addresses.length && !req.session.addresses.some((a) => a.isDefault)) {
    req.session.addresses[0].isDefault = true;
  }
  flush();
  ok(res, req.session);
});

router.post('/addresses/:id/default', (req, res) => {
  req.session.addresses.forEach((a) => { a.isDefault = a.id === req.params.id; });
  flush();
  ok(res, req.session);
});

/* =========================================================
   PAYMENT CARDS  (only the last four digits are ever stored)
   ========================================================= */
function brandFor(number) {
  const n = String(number || '').replace(/\s+/g, '');
  if (/^3[47]/.test(n)) return 'American Express';
  if (/^5[1-5]/.test(n)) return 'Mastercard';
  if (/^6/.test(n)) return 'Discover';
  return 'Visa';
}

router.post('/cards', (req, res) => {
  const { number, exp, name } = req.body || {};
  const digits = String(number || '').replace(/\D/g, '');
  if (digits.length < 13) return res.status(400).json({ error: 'Enter a full card number.' });
  if (!/^\d{2}\s*\/\s*\d{2}$/.test(String(exp || ''))) {
    return res.status(400).json({ error: 'Expiry must read MM / YY.' });
  }
  if (!String(name || '').trim()) return res.status(400).json({ error: 'Name on card is required.' });

  const card = {
    id: `c${Date.now().toString(36)}`,
    brand: brandFor(digits),
    last4: digits.slice(-4),
    exp: String(exp).replace(/\s+/g, ' ').trim(),
    name: String(name).toUpperCase(),
    isDefault: !!req.body.isDefault || req.session.cards.length === 0
  };
  if (card.isDefault) req.session.cards.forEach((c) => { c.isDefault = false; });
  req.session.cards.push(card);
  req.session.checkout.cardId = card.id;
  flush();
  ok(res, req.session, { cardId: card.id });
});

router.delete('/cards/:id', (req, res) => {
  req.session.cards = req.session.cards.filter((c) => c.id !== req.params.id);
  if (req.session.checkout.cardId === req.params.id) {
    req.session.checkout.cardId = req.session.cards[0]?.id || null;
  }
  if (req.session.cards.length && !req.session.cards.some((c) => c.isDefault)) {
    req.session.cards[0].isDefault = true;
  }
  flush();
  ok(res, req.session);
});

router.post('/cards/:id/default', (req, res) => {
  req.session.cards.forEach((c) => { c.isDefault = c.id === req.params.id; });
  flush();
  ok(res, req.session);
});

/* =========================================================
   CHECKOUT
   ========================================================= */
const CHECKOUT_FIELDS = ['mode', 'email', 'shipTo', 'method', 'payment', 'cardId',
  'billingSame', 'gift', 'giftNote', 'engraving', 'pickupStore'];

router.patch('/checkout', (req, res) => {
  const patch = req.body || {};
  Object.keys(patch).forEach((k) => {
    if (CHECKOUT_FIELDS.includes(k)) req.session.checkout[k] = patch[k];
  });
  if (patch.method && !SHIPPING_METHODS.some((m) => m.id === patch.method)) {
    return res.status(400).json({ error: 'Unknown delivery method.' });
  }
  flush();
  ok(res, req.session);
});

/* =========================================================
   ORDERS
   ========================================================= */
router.get('/orders', (req, res) => {
  res.json({ items: req.session.orders.map((o) => hydrateOrder(o, req.session)) });
});

router.get('/orders/:id', (req, res) => {
  const order = req.session.orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(hydrateOrder(order, req.session));
});

function hydrateOrder(order, session) {
  const method = SHIPPING_METHODS.find((m) => m.id === order.method);
  const address = order.address || session.addresses.find((a) => a.id === order.addressId) || null;
  return {
    ...order,
    address,
    methodName: method ? method.name : 'Signature Delivery',
    methodEta: method ? method.eta : '',
    items: order.items.map((it) => {
      const p = productById(it.id);
      return {
        ...it,
        product: p
          ? { id: p.id, name: p.name, cat: p.cat, shape: p.shape, palette: p.palette, price: p.price, colors: p.colors }
          : null,
        lineTotal: p ? p.price * it.qty : 0
      };
    })
  };
}

router.post('/orders', (req, res) => {
  const s = req.session;
  if (!s.cart.length) return res.status(400).json({ error: 'Your bag is empty.' });

  const email = s.checkout.email || s.user?.email;
  if (!email) return res.status(400).json({ error: 'We need an email address for the confirmation.' });

  const isPickup = s.checkout.method === 'pick';
  const address = isPickup ? null : s.addresses.find((a) => a.id === s.checkout.shipTo);
  if (!isPickup && !address) return res.status(400).json({ error: 'Choose a delivery address.' });

  /* ---- reserve the stock before anything else ----
     If someone else took the last unit while this basket sat open,
     this is where we find out — and the customer is told which
     piece, not handed a generic failure. */
  const holding = reserve(
    s.cart.map((l) => ({ productId: l.id, qty: l.qty })),
    { sessionId: s.id }
  );

  if (!holding.ok) {
    const f = holding.failures[0] || {};
    return res.status(409).json({
      error: f.name
        ? `${f.name} — only ${f.available} left, you asked for ${f.requested}.`
        : (f.reason || 'That is no longer available.'),
      failures: holding.failures,
      code: 'INSUFFICIENT_STOCK'
    });
  }

  const totals = computeTotals(s);
  const order = {
    /* A 5-digit random id is a 30,000-value space — collisions start
       failing checkouts at a few hundred orders. */
    id: `AUR-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`,
    date: new Date().toISOString().slice(0, 10),
    placedAt: new Date().toISOString(),
    status: 'Confirmed',
    stage: 1,
    items: s.cart.map(({ id, qty, variant, size }) => ({ id, qty, variant, size })),
    address: address ? structuredClone(address) : null,
    addressId: address ? address.id : null,
    pickupStore: isPickup ? (STORES.find((x) => x.id === s.checkout.pickupStore) || STORES[0]).id : null,
    method: s.checkout.method,
    payment: paymentLabel(s),
    email,
    gift: !!s.checkout.gift,
    giftNote: s.checkout.giftNote || '',
    engraving: s.checkout.engraving || '',
    promo: s.checkout.promo ? structuredClone(s.checkout.promo) : null,
    totals,
    tracking: `AUR-${String(s.checkout.method).toUpperCase()}-${10000000 + Math.floor(Math.random() * 89999999)}`
  };

  /* ---- write the order and consume the stock, atomically ----
     These were two separate transactions. If the process died between
     them the order existed while its units stayed merely "reserved",
     and the expiry sweeper handed them back to the shelf sixty seconds
     later — the same piece sold twice. One tx() now covers both, so
     either the order and the stock movement both land or neither does. */
  try {
    tx(() => {
      persistOrder(order, s, holding.reservationId);
      const consumed = commit(holding.reservationId, order.id);
      if (!consumed.ok) throw new Error(consumed.reason || 'Reservation was no longer open.');
    });
  } catch (err) {
    /* Never strand the held units if persistence fails. */
    release(holding.reservationId, { reason: 'Order could not be recorded' });
    console.error('[order] persist failed:', err);
    return res.status(500).json({ error: 'We could not record that order. Nothing has been charged.' });
  }

  s.orders.unshift(order);
  s.cart = [];
  s.checkout.promo = null;
  s.checkout.gift = false;
  s.checkout.giftNote = '';
  s.checkout.engraving = '';
  flush();

  res.status(201).json({ order: hydrateOrder(order, s), session: snapshot(s) });
});

/* Mirror the order into the transactional tables the admin reads. */
function persistOrder(order, s, reservationId) {
  tx(() => {
    let customerId = null;
    if (order.email) {
      const existing = db.prepare('SELECT id FROM customers WHERE email = ?').get(order.email);
      customerId = existing
        ? existing.id
        : Number(db.prepare('INSERT INTO customers (email, first_name, last_name, tier) VALUES (?,?,?,?)')
            .run(order.email, s.user?.first || order.address?.first || null,
                 s.user?.last || order.address?.last || null, s.user?.tier || 'Guest').lastInsertRowid);
    }

    db.prepare(
      `INSERT INTO orders
         (id, customer_id, email, status, stage, method, payment, tracking, address,
          subtotal, discount, shipping, tax, total, placed_at, session_id, reservation_id, channel)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'),?,?,'web')`
    ).run(
      order.id, customerId, order.email, order.status, order.stage, order.method,
      order.payment, order.tracking, JSON.stringify(order.address || null),
      order.totals.subtotal, order.totals.discount, order.totals.shipping,
      order.totals.tax, order.totals.total, s.id, reservationId
    );

    const insItem = db.prepare(
      'INSERT INTO order_items (order_id, product_id, name, variant, size, qty, unit_price) VALUES (?,?,?,?,?,?,?)'
    );
    for (const line of s.cart) {
      const p = productById(line.id);
      insItem.run(order.id, line.id, p ? p.name : line.id, line.variant, line.size, line.qty, p ? p.price : 0);
    }
  });
}

function paymentLabel(s) {
  if (s.checkout.payment === 'card') {
    const card = s.cards.find((c) => c.id === s.checkout.cardId) || s.cards.find((c) => c.isDefault);
    return card ? `${card.brand} ${card.last4}` : 'Card';
  }
  const labels = { wire: 'Bank Transfer', wallet: 'Digital Wallet', split: 'Instalments over 12 months' };
  return labels[s.checkout.payment] || 'Card';
}

/* =========================================================
   RETURNS
   ========================================================= */
router.post('/orders/:id/return', (req, res) => {
  const order = req.session.orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  const { items = [], reason = '', resolution = 'refund' } = req.body || {};
  if (!items.length) return res.status(400).json({ error: 'Select at least one piece to return.' });
  if (!reason) return res.status(400).json({ error: 'Tell us why, so we can improve.' });

  /* Item keys are `${productId}::${indexInOrder}` — reject anything that
     does not name a line actually present on this order. */
  const valid = order.items.map((it, i) => `${it.id}::${i}`);
  const unknown = items.filter((k) => !valid.includes(k));
  if (unknown.length) {
    return res.status(400).json({ error: 'Those pieces are not on this order.' });
  }
  if (order.returnRequest) {
    return res.status(409).json({ error: `A return is already open on this order (${order.returnRequest.ref}).` });
  }

  order.returnRequest = {
    ref: `RTN-${500000 + Math.floor(Math.random() * 499999)}`,
    items, reason, resolution,
    raised: new Date().toISOString().slice(0, 10),
    status: 'Label issued'
  };
  flush();
  res.status(201).json({ returnRequest: order.returnRequest, order: hydrateOrder(order, req.session) });
});

/* =========================================================
   NEWSLETTER + CONTACT
   ========================================================= */
router.post('/newsletter', (req, res) => {
  const { email, phone, channels = {}, interests = [] } = req.body || {};
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }
  if (channels.sms && !String(phone || '').trim()) {
    return res.status(400).json({ error: 'A mobile number is needed for SMS.' });
  }
  const record = {
    id: `sub_${Date.now().toString(36)}`,
    email, phone: phone || null, channels, interests,
    at: new Date().toISOString()
  };
  req.session.subscriptions.push(record);
  req.session.prefs.email = !!channels.email;
  req.session.prefs.sms = !!channels.sms;
  flush();
  res.status(201).json({ subscription: record, message: 'You are on the list. Watch for a confirmation.' });
});

router.post('/contact', (req, res) => {
  const { name, email, topic, message } = req.body || {};
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email and message are all required.' });
  }
  res.status(201).json({
    ticket: `CS-${100000 + Math.floor(Math.random() * 899999)}`,
    message: 'Your concierge has it. Expect a reply within one business day.',
    received: { name, email, topic: topic || 'General' }
  });
});

/* =========================================================
   APPOINTMENTS (boutique / store detail page)
   ========================================================= */
router.post('/appointments', (req, res) => {
  const { storeId, name, email, date, service } = req.body || {};
  const store = STORES.find((s) => s.id === storeId);
  if (!store) return res.status(404).json({ error: 'Boutique not found' });
  if (!name || !email || !date) return res.status(400).json({ error: 'Name, email and a date are required.' });
  res.status(201).json({
    reference: `APT-${20000 + Math.floor(Math.random() * 79999)}`,
    store: store.name,
    date, service: service || 'Private viewing',
    message: `Reserved at ${store.name.replace(/&mdash;/g, '-')}. A confirmation is on its way.`
  });
});

export default router;
