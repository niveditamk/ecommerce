/* =============================================================
   AURELIS API - PRICING
   Cart lines and totals are computed here, never trusted from
   the client. VAT is illustrative (Swiss standard rate).
   ============================================================= */
import { productById, SHIPPING_METHODS, PROMOS } from './data/catalog.js';

/* Prices are held in Indian Rupees. GST is charged at the standard 18%. */
export const GST_RATE = 0.18;
export const ENGRAVING_THRESHOLD = 400000;
export const INSTALMENT_THRESHOLD = 165000;

const rupees = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;

export function lineKey(id, variant, size) {
  return `${id}::${variant || '-'}::${size || '-'}`;
}

export function resolveLines(cart) {
  return cart
    .map((line) => {
      const product = productById(line.id);
      if (!product) return null;
      return {
        ...line,
        product,
        unitPrice: product.price,
        lineTotal: product.price * line.qty
      };
    })
    .filter(Boolean);
}

export function computeTotals(session) {
  const lines = resolveLines(session.cart);
  const subtotal = lines.reduce((n, l) => n + l.lineTotal, 0);
  const count = lines.reduce((n, l) => n + l.qty, 0);

  let discount = 0;
  const promo = session.checkout.promo;
  if (promo) {
    discount = promo.type === 'pct' ? Math.round((subtotal * promo.value) / 100) : promo.value;
    discount = Math.min(discount, subtotal);
  }

  const method = SHIPPING_METHODS.find((m) => m.id === session.checkout.method);
  const shipping = method ? method.price : 0;
  const taxable = Math.max(0, subtotal - discount);
  const tax = Math.round(taxable * GST_RATE);

  return {
    subtotal,
    discount,
    shipping,
    tax,
    total: taxable + shipping + tax,
    count,
    currency: 'INR',
    gstRate: GST_RATE,
    engravingThreshold: ENGRAVING_THRESHOLD,
    engravingUnlocked: subtotal >= ENGRAVING_THRESHOLD,
    engravingRemaining: Math.max(0, ENGRAVING_THRESHOLD - subtotal),
    instalmentThreshold: INSTALMENT_THRESHOLD,
    instalmentEligible: subtotal > 0 && taxable + shipping + tax >= INSTALMENT_THRESHOLD
  };
}

export function validatePromo(code, subtotal) {
  const key = String(code || '').trim().toUpperCase();
  const promo = PROMOS[key];
  if (!promo) return { ok: false, message: 'That code is not recognised.' };
  if (promo.min && subtotal < promo.min) {
    return { ok: false, message: `This credit applies to orders above ${rupees(promo.min)}.` };
  }
  return { ok: true, promo: { code: key, ...promo }, message: `${promo.label} applied.` };
}

/* Public projection of a session — never leaks internals. */
export function snapshot(session) {
  const lines = resolveLines(session.cart).map((l) => ({
    key: l.key,
    id: l.id,
    qty: l.qty,
    variant: l.variant,
    size: l.size,
    unitPrice: l.unitPrice,
    lineTotal: l.lineTotal,
    product: {
      id: l.product.id,
      name: l.product.name,
      cat: l.product.cat,
      shape: l.product.shape,
      palette: l.product.palette,
      colors: l.product.colors,
      materials: l.product.materials,
      price: l.product.price
    }
  }));

  return {
    sessionId: session.id,
    user: session.user,
    cart: lines,
    totals: computeTotals(session),
    wishlist: session.wishlist,
    recent: session.recent,
    addresses: session.addresses,
    cards: session.cards,
    orders: session.orders,
    prefs: session.prefs,
    checkout: session.checkout
  };
}
