/* =============================================================
   AURELIS - FORMATTING
   ============================================================= */

/* The maison prices in Indian Rupees. Grouping follows the Indian
   convention — lakh and crore — so 1568500 reads as 15,68,500. */
const SYMBOLS = { INR: '₹', USD: '$', EUR: '€', GBP: '£' };
const LOCALES = { INR: 'en-IN', USD: 'en-US', EUR: 'de-DE', GBP: 'en-GB' };

export const CURRENCY = 'INR';

export function money(value, currency = CURRENCY) {
  const symbol = SYMBOLS[currency] || '₹';
  const locale = LOCALES[currency] || 'en-IN';
  return symbol + Math.round(Number(value) || 0).toLocaleString(locale);
}

/* Catalogue copy is authored with HTML entities so it reads well in
   any context; React renders text nodes literally, so decode first. */
const ENTITIES = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"',
  '&mdash;': '—', '&ndash;': '–', '&hellip;': '…',
  '&rsquo;': '’', '&lsquo;': '‘', '&ldquo;': '“', '&rdquo;': '”',
  '&middot;': '·', '&bull;': '•', '&minus;': '−',
  '&rarr;': '→', '&larr;': '←', '&copy;': '©',
  '&times;': '×', '&nbsp;': ' ', '&deg;': '°', '&check;': '✓'
};

export function dx(input) {
  if (input == null) return '';
  return String(input).replace(/&[a-z]+;/g, (m) => ENTITIES[m] ?? m);
}

export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(String(iso).length <= 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatShortDate(iso) {
  if (!iso) return '';
  const d = new Date(String(iso).length <= 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* Boutique open/closed state from the store's declared window. */
export function isOpenNow(store) {
  if (!store?.opens || !store?.closes) return false;
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  const [oh, om] = store.opens.split(':').map(Number);
  const [ch, cm] = store.closes.split(':').map(Number);
  return mins >= oh * 60 + om && mins < ch * 60 + cm;
}

export const todayName = () =>
  ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];

export function initials(user) {
  if (!user) return 'A';
  return `${(user.first || '').charAt(0)}${(user.last || '').charAt(0)}`.toUpperCase() || 'A';
}

export function paletteForVariant(product, variantName) {
  if (!product) return 'gold';
  if (!variantName) return product.palette;
  const match = (product.colors || []).find((c) => c.name === variantName);
  return match?.palette || product.palette;
}
