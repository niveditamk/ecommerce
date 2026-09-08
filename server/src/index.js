/* =============================================================
   AURELIS API - SERVER
   Express, ESM, zero external database. Sessions are resolved
   from an x-aurelis-session header issued on first contact.
   ============================================================= */
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import catalogRoutes from './routes/catalog.js';
import commerceRoutes from './routes/commerce.js';
import adminRoutes from './routes/admin.js';
import mlRoutes from './routes/ml.js';
import medusaRoutes from './routes/medusa.js';
import { init as initDb, db as dbHandle } from './db/index.js';
import { startSweeper } from './inventory/engine.js';
import { getSession, newSessionId, sessionCount, isKnownSession } from './store.js';
import { deploymentFacts, announceDeployment } from './deployment.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4000);
const CLIENT_DIST = path.resolve(__dirname, '../../client/dist');

initDb();
announceDeployment();
/* abandoned checkouts must not hold stock for ever */
startSweeper();

const app = express();

app.disable('x-powered-by');
/* The client ships 1.4 MB of JavaScript. Nothing in front of this
   process compresses it, so without this the first paint on a phone
   pulls the lot uncompressed. */
app.use(compression());

/* An id per request, echoed to the caller and printed with any error,
   so a user's "it failed at 14:32" can be found in the log. */
app.use((req, res, next) => {
  req.id = req.get('x-request-id') || randomUUID();
  res.set('x-request-id', req.id);
  next();
});
/* 256kb is right for the storefront and the admin — nothing a person
   submits is bigger. A trained model artifact is, so that ONE route
   parses its own body at its own limit rather than the whole app
   carrying a ceiling raised for a single caller. */
const ML_INGEST_PATH = '/api/admin/ml/register';
const jsonParser = express.json({ limit: '256kb' });
app.use((req, res, next) => (req.path === ML_INGEST_PATH ? next() : jsonParser(req, res, next)));
app.use(
  cors({
    /* `origin: true` reflected whatever Origin was sent, so any site on
       the internet could call this API. That was tolerable while the
       client was served from this same process; putting the frontend on
       its own host makes the API genuinely cross-origin and the setting
       genuinely wrong.

       Set ALLOWED_ORIGINS to a comma-separated list of the hosts that
       may call it — the Vercel URL, plus any preview domains. Left
       unset, development stays permissive so nothing local breaks, and
       production refuses everything it was not told about. */
    origin(origin, cb) {
      const allowed = String(process.env.ALLOWED_ORIGINS || '')
        .split(',').map((s) => s.trim()).filter(Boolean);

      /* Same-origin requests and curl send no Origin header at all. */
      if (!origin) return cb(null, true);
      if (allowed.includes(origin)) return cb(null, true);
      if (!allowed.length && process.env.NODE_ENV !== 'production') return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
    /* The client reads the session id the server issues from this header,
       so it has to survive the cross-origin response. */
    exposedHeaders: ['x-aurelis-session', 'x-request-id']
  })
);

/* ---- request log (compact) ---- */
app.use((req, _res, next) => {
  if (req.path.startsWith('/api')) {
    console.log(`${req.method.padEnd(6)} ${req.path}  ${req.id.slice(0, 8)}`);
  }
  next();
});

/* ---- session resolution ----
   Two things changed here, both of them security rather than tidiness:

   1. An id is only honoured if THIS server issued it. The old test was
      startsWith('sess_'), and getSession() created whatever it was
      handed — so a caller could pick their own id, or guess someone
      else's and be handed that person's name, address and orders.

   2. Reads no longer mint sessions. Every unauthenticated request —
      including Render's own health probe — used to create a permanently
      retained record and rewrite the whole store to disk. */
/* Mounted at '/api', so req.path here is already relative to it —
   '/api/health' would never match and the probe kept minting sessions. */
const SESSIONLESS = new Set(['/health', '/deployment']);

app.use('/api', (req, res, next) => {
  if (SESSIONLESS.has(req.path)) return next();

  const incoming = req.get('x-aurelis-session');
  const id = isKnownSession(incoming) ? incoming : newSessionId();
  req.session = getSession(id);
  res.set('x-aurelis-session', id);
  return next();
});

/* ---- health ---- */
app.get('/api/health', (_req, res) => {
  /* Liveness alone cannot tell a working API from one whose database
     died after boot — it reported "ok" either way. */
  let database = 'ok';
  try {
    dbHandle.prepare('SELECT COUNT(*) AS n FROM products').get();
  } catch (err) {
    database = 'unavailable';
  }
  if (database !== 'ok') {
    return res.status(503).json({
      status: 'degraded', database, service: 'aurelis-api',
      uptime: Math.round(process.uptime()), time: new Date().toISOString()
    });
  }
  res.json({
    status: 'ok',
    service: 'aurelis-api',
    sessions: sessionCount(),
    uptime: Math.round(process.uptime()),
    time: new Date().toISOString()
  });
});

/* ---- what this copy can actually do ----
   Public and unauthenticated on purpose: the storefront reads it to
   decide whether to warn that data will not survive a restart, and
   whether to say the payment is simulated. */
app.get('/api/deployment', (_req, res) => {
  const f = deploymentFacts();
  res.json({
    environment: f.environment,
    storage: f.storage,
    storageNote: f.storageNote,
    payments: f.payments,
    paymentsNote: f.paymentsNote,
    demoMode: f.demoMode
  });
});

/* ---- routes ---- */
app.use('/api/admin/ml', mlRoutes);
app.use('/api/admin/medusa', medusaRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', catalogRoutes);
app.use('/api', commerceRoutes);

/* ---- api 404 ---- */
app.use('/api', (_req, res) => res.status(404).json({ error: 'No such endpoint' }));

/* ---- serve the built client when it exists (npm run build) ---- */
if (fs.existsSync(CLIENT_DIST)) {
  /* Content-hashed bundles can be cached for a year; index.html must
     never be, or a deploy is invisible until a hard refresh. */
  app.use('/assets', express.static(path.join(CLIENT_DIST, 'assets'), {
    immutable: true, maxAge: '1y', index: false
  }));
  app.use(express.static(CLIENT_DIST, { maxAge: '1h', setHeaders(res, f) {
    if (f.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache');
  } }));
  app.get('*', (_req, res) => res.sendFile(path.join(CLIENT_DIST, 'index.html')));
} else {
  app.get('/', (_req, res) =>
    res
      .type('text/plain')
      .send('AURELIS API is running. Start the client with `npm run dev` from the project root.')
  );
}

/* ---- error handler ---- */
app.use((err, req, res, _next) => {
  console.error(`[aurelis] unhandled ${req.id}:`, err);
  res.status(500).json({
    error: 'Something went wrong at the maison. Please try again.',
    /* Quote this back to us and the log line is one grep away. */
    requestId: req.id
  });
});

app.listen(PORT, () => {
  console.log(`\n  AURELIS API  ->  http://localhost:${PORT}/api/health\n`);
});
