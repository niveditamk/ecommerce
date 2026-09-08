/* =============================================================
   DEPLOYMENT NOTICE
   The server reports what this running copy can actually do.
   Two facts are worth a customer's attention: whether their data
   survives a restart, and whether a payment is real. Both are read
   from /api/deployment rather than hard-coded, so the wording on
   screen cannot drift from the environment it describes.
   ============================================================= */
import { useEffect, useState } from 'react';

let cached = null;
let inflight = null;

function loadFacts() {
  if (cached) return Promise.resolve(cached);
  if (!inflight) {
    inflight = fetch('/api/deployment', { headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { cached = d; return d; })
      .catch(() => null)
      .finally(() => { inflight = null; });
  }
  return inflight;
}

export function useDeployment() {
  const [facts, setFacts] = useState(cached);
  useEffect(() => {
    let live = true;
    loadFacts().then((d) => { if (live) setFacts(d); });
    return () => { live = false; };
  }, []);
  return facts;
}

const DISMISS_KEY = 'aurelis.notice.storage';

/** Site-wide, dismissible. Shown only when the host really is ephemeral. */
export default function DeploymentNotice() {
  const facts = useDeployment();
  const [hidden, setHidden] = useState(() => {
    try { return window.sessionStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
  });

  if (!facts || facts.storage !== 'ephemeral' || hidden) return null;

  const dismiss = () => {
    setHidden(true);
    try { window.sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* private mode */ }
  };

  return (
    <div className="shell" style={{ paddingTop: '1.2rem' }}>
      <div className="notice notice--warning" role="status">
        <strong>Demonstration deployment.</strong>{' '}
        {facts.storageNote}{' '}
        {facts.payments === 'simulated' && facts.paymentsNote}
        <button
          type="button"
          className="btn btn--quiet btn--sm"
          onClick={dismiss}
          style={{ marginLeft: '.9rem' }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

/** Placed where money would change hands. Never dismissible. */
export function PaymentModeNotice() {
  const facts = useDeployment();
  if (!facts || facts.payments !== 'simulated') return null;
  return (
    <p className="notice notice--info" role="note" style={{ marginBottom: '1.1rem' }}>
      <strong>No payment is taken.</strong> {facts.paymentsNote} Card details entered
      here are held in this browser session only and are never sent to a payment network.
    </p>
  );
}
