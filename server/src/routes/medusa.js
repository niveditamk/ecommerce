/* =============================================================
   MEDUSA ROUTES
   Mounted at /api/admin/medusa, behind the same staff session and
   permission keys as the rest of the admin.

   The browser never receives a Medusa token. Everything is
   proxied here so one permission model governs the whole admin,
   and a Medusa outage degrades to a clear message rather than a
   broken page.
   ============================================================= */
import { Router } from 'express';
import { attachStaff, requireStaff, require_ } from '../auth/rbac.js';
import * as medusa from '../medusa/client.js';
import { questions, ask } from '../medusa/analyst.js';
import { askAssistant, gatherContext } from '../ai/assistant.js';
import { probe, isConfigured as aiConfigured, MODEL_CHAIN } from '../ai/openrouter.js';

const router = Router();
router.use(attachStaff, requireStaff);

/* A Medusa failure is an integration problem, not a bug in the
   admin. Say which, and say what to do about it. */
const guard = (handler) => async (req, res) => {
  try {
    await handler(req, res);
  } catch (err) {
    const status = err.status || 502;
    res.status(status).json({
      error: err.message,
      code: err.name === 'MedusaError' ? 'MEDUSA_UNAVAILABLE' : 'ERROR',
      hint: status === 503
        ? 'Start it with: cd medusa && npm run db:start (in one terminal) and npx medusa develop (in another).'
        : undefined
    });
  }
};

/* ---------- status ----------
   Deliberately open to anyone who can see the AI section, because
   its whole job is to explain why the rest of the page is empty. */
router.get('/status', require_('ai.view'), guard(async (_req, res) => {
  const h = await medusa.health();
  res.json({
    ...h,
    explanation: h.reachable
      ? 'Medusa is running and holds the imported Aurelis catalogue.'
      : h.configured
        ? 'Medusa is configured but not answering. It is probably not running.'
        : 'Medusa credentials are not set on this server, so the admin cannot reach it.'
  });
}));

router.get('/inventory', require_('inventory.view'), guard(async (_req, res) => {
  res.json(await medusa.inventorySnapshot());
}));

router.get('/products', require_('products.view'), guard(async (_req, res) => {
  const list = await medusa.products(200);
  res.json({
    count: list.length,
    products: list.map((p) => ({
      id: p.id,
      handle: p.handle,
      title: p.title,
      status: p.status,
      variants: (p.variants || []).length
    }))
  });
}));

router.get('/reservations', require_('inventory.view'), guard(async (_req, res) => {
  res.json({ reservations: await medusa.reservations(100) });
}));

/* ---------- the analyst ---------- */
router.get('/ask', require_('ai.view'), guard(async (_req, res) => {
  res.json({
    questions: questions(),
    note: 'These answers are computed from data this system holds — the order ledger, the demand '
      + 'forecaster and Medusa’s inventory. This is not a language model, and it will say when the '
      + 'data cannot support an answer rather than produce one that reads well.'
  });
}));

router.get('/ask/:id', require_('ai.view'), guard(async (req, res) => {
  res.json(await ask(req.params.id));
}));

/* ---------- the language-model assistant ----------
   Free-form questions, answered from the figures above. The model
   never supplies a number; it explains the ones we hand it. */
router.get('/ai/status', require_('ai.view'), guard(async (_req, res) => {
  res.json({
    configured: aiConfigured(),
    models: MODEL_CHAIN,
    note: aiConfigured()
      ? 'Free models on OpenRouter are rate-limited upstream without warning, so the server walks a chain until one answers.'
      : 'Set OPENROUTER_API_KEY in server/.env to enable free-form questions.'
  });
}));

router.get('/ai/probe', require_('ai.manage'), guard(async (_req, res) => {
  res.json(await probe());
}));

/* The figures on their own, with no model involved — useful when
   every free model is refusing. */
router.get('/ai/context', require_('ai.view'), guard(async (_req, res) => {
  res.json(await gatherContext());
}));

router.post('/ai/ask', require_('ai.view'), guard(async (req, res) => {
  const out = await askAssistant(req.body?.question);
  res.status(out.ok ? 200 : 503).json(out);
}));

export default router;
