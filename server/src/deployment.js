/* =============================================================
   DEPLOYMENT FACTS
   What this particular running copy can and cannot do, stated
   plainly and served to the client. The storefront renders a
   banner from it, so the claim on screen is derived from the
   environment rather than written by hand and left to rot.
   ============================================================= */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../.data');

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/* Render's free plan has no disk. Anything under the service's own
   working directory is destroyed on deploy, crash and wake-from-sleep,
   and the database re-seeds itself on the next boot — so the demo
   still looks populated and the loss is easy to miss. A mounted disk
   sets RENDER_DISK_PATH (or DATA_DIR here, for other hosts). */
function storageKind() {
  const mount = process.env.RENDER_DISK_PATH || process.env.DATA_DIR;
  if (mount && DATA_DIR.startsWith(path.resolve(mount))) return 'persistent';
  /* Off a managed host with no declared mount, assume the operator
     owns the filesystem — a laptop or a VM keeps its files. */
  if (!IS_PRODUCTION && !process.env.RENDER) return 'persistent';
  return 'ephemeral';
}

/* Payments are simulated until real Stripe keys are present. The UI
   must never imply a card was charged when nothing was. */
const paymentsLive = () => Boolean(process.env.STRIPE_SECRET_KEY);

export function deploymentFacts() {
  const storage = storageKind();
  return {
    environment: IS_PRODUCTION ? 'production' : 'development',
    storage,
    /* Written for a person, not for a log. The client shows this text
       verbatim, so it says what is lost and when. */
    storageNote: storage === 'ephemeral'
      ? 'This deployment has no persistent disk. Orders, accounts and stock changes are erased whenever the service restarts, and the catalogue re-seeds itself.'
      : null,
    payments: paymentsLive() ? 'live' : 'simulated',
    paymentsNote: paymentsLive()
      ? null
      : 'Checkout is a simulation. No card is charged and no payment details are stored.',
    demoMode: String(process.env.DEMO_MODE ?? 'false') === 'true',
    dataDir: DATA_DIR,
    /* Only meaningful when the file already exists. */
    databaseBytes: (() => {
      try { return fs.statSync(path.join(DATA_DIR, 'aurelis.db')).size; } catch { return 0; }
    })()
  };
}

/** Say it once at boot, where whoever deployed this will see it. */
export function announceDeployment() {
  const f = deploymentFacts();
  if (f.storage === 'ephemeral') {
    console.warn('\n  [aurelis] EPHEMERAL STORAGE — ' + f.storageNote);
    console.warn('  Attach a persistent disk mounted at server/.data before taking real orders.\n');
  }
  if (f.payments === 'simulated' && f.environment === 'production') {
    console.warn('  [aurelis] Payments are SIMULATED. Set STRIPE_SECRET_KEY to take real money.\n');
  }
}
