/* =============================================================
   AURELIS API - SESSION STORE
   In-memory sessions, snapshotted to disk so a restart during
   development does not empty anyone's bag.
   ============================================================= */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { SEED_ADDRESSES, SEED_CARDS, SEED_ORDERS } from './data/catalog.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../.data');
const DB_FILE = path.join(DATA_DIR, 'sessions.json');

const sessions = new Map();
let flushTimer = null;

/* An unauthenticated caller could previously mint an unbounded number
   of permanently-retained sessions, each re-serialising the whole map
   to disk. On a 512 MB instance that is a denial of service anyone can
   run with a shell loop. */
const MAX_SESSIONS = 5000;
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;   // a week

/* ---------------- disk ---------------- */
function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function hydrate() {
  try {
    if (!fs.existsSync(DB_FILE)) return;
    const raw = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    Object.entries(raw).forEach(([id, value]) => sessions.set(id, value));
    console.log(`[aurelis] restored ${sessions.size} session(s)`);
  } catch (err) {
    console.warn('[aurelis] could not restore sessions:', err.message);
  }
}

export function flush() {
  clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    try {
      ensureDir();
      fs.writeFileSync(DB_FILE, JSON.stringify(Object.fromEntries(sessions), null, 0));
    } catch (err) {
      console.warn('[aurelis] could not persist sessions:', err.message);
    }
  }, 250);
}

/* ---------------- shape ---------------- */
function blank(id) {
  return {
    id,
    createdAt: new Date().toISOString(),
    cart: [],
    wishlist: [],
    recent: [],
    user: null,
    /* A new visitor owns nothing. These used to be cloned from the
       fixtures, so every session began holding Alexandra Sorensen's
       address book, cards and order history — and checkout defaulted
       to her address, so real orders shipped to a stranger in Chelsea
       and the buyer's own address was never captured. */
    addresses: [],
    cards: [],
    orders: [],
    prefs: { email: true, sms: false, post: false, currency: 'INR' },
    checkout: {
      mode: null,
      email: '',
      /* Nothing is pre-selected: the buyer must supply an address. */
      shipTo: null,
      method: 'std',
      payment: 'card',
      cardId: null,
      billingSame: true,
      gift: false,
      giftNote: '',
      engraving: '',
      promo: null,
      pickupStore: null
    },
    subscriptions: []
  };
}

export function getSession(id) {
  if (!id) return null;
  if (!sessions.has(id)) {
    evict();
    sessions.set(id, blank(id));
    flush();
  }
  const s = sessions.get(id);
  /* Touch on read so eviction removes the genuinely idle, not the
     merely old. */
  s.lastSeen = new Date().toISOString();
  return s;
}


/* Math.random() is not a CSPRNG and the old id carried ~41 guessable
   bits. A session is a bearer credential for a person's name, address,
   phone and order history, so it gets 256 bits from the OS. */
export function newSessionId() {
  return 'sess_' + randomBytes(32).toString('hex');
}

/** True only for ids this server actually issued. The middleware used
    to accept ANY string beginning with "sess_" and create a session for
    it on the spot, which let a caller choose their own id — or land on
    someone else's. */
export function isKnownSession(id) {
  return typeof id === 'string' && sessions.has(id);
}

/** Drop what has gone stale, then what is oldest if we are still over
    the cap. Called on write, so it costs nothing on a quiet server. */
function evict() {
  const now = Date.now();
  for (const [id, s] of sessions) {
    const seen = Date.parse(s.lastSeen || s.createdAt || 0) || 0;
    if (now - seen > SESSION_TTL_MS) sessions.delete(id);
  }
  if (sessions.size <= MAX_SESSIONS) return;
  const byAge = [...sessions.entries()]
    .sort((a, b) => (Date.parse(a[1].lastSeen || a[1].createdAt || 0) || 0)
                  - (Date.parse(b[1].lastSeen || b[1].createdAt || 0) || 0));
  for (const [id] of byAge.slice(0, sessions.size - MAX_SESSIONS)) sessions.delete(id);
}

export function resetSession(id) {
  sessions.set(id, blank(id));
  flush();
  return sessions.get(id);
}

export function sessionCount() { return sessions.size; }

hydrate();
