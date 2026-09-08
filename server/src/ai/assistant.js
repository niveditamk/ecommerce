/* =============================================================
   THE ASSISTANT
   Free-form questions about the shop, answered by a language
   model that is handed this system's real figures and told to
   explain them.

   The order matters. We gather the facts FIRST — inventory,
   forecasts, risk, real sales — and put them in the prompt. The
   model's job is interpretation, not recall. It is explicitly
   forbidden from producing a number that is not in the brief, and
   the console shows the same figures underneath the answer so a
   human can check the work rather than trust it.

   This is the difference between an assistant and a liability: it
   can be wrong about what the numbers MEAN, and an operator can
   see that. It cannot be wrong about what the numbers ARE.
   ============================================================= */
import { db } from '../db/index.js';
import { riskBoard, reorderPlan, overstockBoard } from '../ml/insights.js';
import { syntheticStats } from '../ml/synthetic.js';
import { dataReadiness } from '../ml/trainer.js';
import * as medusa from '../medusa/client.js';
import { complete, isConfigured } from './openrouter.js';

const ENTITIES = {
  '&amp;': '&', '&mdash;': '—', '&ndash;': '–', '&rsquo;': '’',
  '&lsquo;': '‘', '&ldquo;': '“', '&rdquo;': '”', '&hellip;': '…', '&nbsp;': ' '
};
const dx = (v) => String(v ?? '').replace(/&[a-z]+;/g, (m) => ENTITIES[m] ?? m);
const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

/* ---------- the brief ----------
   Everything the model is allowed to reason from. Deliberately
   compact: a smaller, cleaner brief produces better answers from a
   free model than a dump of every row. */
export async function gatherContext() {
  const synth = syntheticStats();
  const ready = dataReadiness();

  const realSales = db.prepare(`
    SELECT p.name, SUM(i.qty) AS units, SUM(i.qty * i.unit_price) AS revenue
      FROM order_items i
      JOIN orders o ON o.id = i.order_id
      JOIN products p ON p.id = i.product_id
     WHERE o.status != 'Cancelled' AND o.channel != 'synthetic'
     GROUP BY i.product_id ORDER BY units DESC LIMIT 10
  `).all();

  const totals = db.prepare(`
    SELECT COUNT(*) AS orders, COALESCE(SUM(total),0) AS revenue
      FROM orders WHERE status != 'Cancelled' AND channel != 'synthetic'
  `).get();

  const stock = db.prepare(`
    SELECT id, name, stock, reserved, low_stock_at
      FROM products WHERE status = 'active' ORDER BY stock ASC LIMIT 12
  `).all();

  const risk = riskBoard();
  const reorder = reorderPlan();
  const over = overstockBoard();

  let medusaSnap = null;
  try {
    medusaSnap = await medusa.inventorySnapshot();
  } catch {
    /* Medusa being down must not stop the assistant answering from
       everything else it holds. */
  }

  return {
    provenance: {
      realOrders: synth.real.orders,
      syntheticOrders: synth.synthetic.orders,
      syntheticSharePct: synth.syntheticShare,
      forecastableSkus: `${ready.ready} of ${ready.skus}`
    },
    realTrade: {
      orders: totals.orders,
      revenue: inr(totals.revenue),
      topSellers: realSales.map((r) => ({ product: dx(r.name), units: r.units, revenue: inr(r.revenue) }))
    },
    stockPosition: stock.map((s) => ({
      product: dx(s.name), onHand: s.stock, reserved: s.reserved, reorderPoint: s.low_stock_at
    })),
    stockOutRisk: {
      counts: risk.counts,
      leadTimeDays: risk.leadTime,
      urgent: risk.rows
        .filter((r) => r.risk === 'OUT' || r.risk === 'HIGH')
        .slice(0, 8)
        .map((r) => ({ product: dx(r.name), risk: r.risk, available: r.available, daysOfCover: r.coverDays }))
    },
    reorderProposals: {
      skus: reorder.rows.length,
      units: reorder.units,
      retailValue: inr(reorder.retailValue),
      top: reorder.rows.slice(0, 6).map((r) => ({ product: dx(r.name), order: r.reorder.qty, cover: r.coverDays }))
    },
    overstock: {
      skus: over.rows.length,
      tiedUpRetail: inr(over.tiedUpRetail),
      top: over.rows.slice(0, 5).map((r) => ({ product: dx(r.name), onHand: r.onHand, excess: r.overstock.excess }))
    },
    medusa: medusaSnap ? {
      products: medusaSnap.totals.products,
      variants: medusaSnap.totals.variants,
      stocked: medusaSnap.totals.stocked,
      available: medusaSnap.totals.available,
      variantsAtZero: medusaSnap.totals.outOfStock,
      note: 'Stock was imported per SKU, not per variant, so each product’s whole quantity sits on its '
        + 'first variant and the rest read zero. Those zeros are an import artefact, not a count.'
    } : { unavailable: 'The Medusa service is not reachable from the server right now.' }
  };
}

const SYSTEM = [
  'You are the operations assistant inside the admin console of Aurelis, a luxury e-commerce shop in India.',
  'You are answering a member of staff who runs the shop.',
  '',
  'ABSOLUTE RULES — these are not style preferences:',
  '1. Use ONLY the figures in the DATA block. Never state a number that is not there. If the answer',
  '   needs a figure you were not given, say precisely which figure is missing.',
  '2. If the data cannot answer the question, say so plainly and stop. Do not approximate, extrapolate',
  '   or offer a plausible-sounding guess. "I cannot tell you that from this data" is a correct answer.',
  '3. The sales history is largely SYNTHETIC — generated so the forecasting models had something to',
  '   learn from. Whenever you discuss sales performance or forecasts, say that the figures are a',
  '   demonstration rather than real trading. Never let a synthetic figure pass as real trade.',
  '4. You advise. You never instruct someone to buy stock or change a price as though the decision',
  '   were made. Recommendations are for a human to accept or reject.',
  '',
  'STYLE: British English. Currency in rupees, as written in the data. Direct and specific — no',
  'preamble, no "great question", no bullet-point padding. Two or three short paragraphs at most,',
  'or a short list where a list genuinely helps. Lead with the answer.'
].join('\n');

export async function askAssistant(question, { signal } = {}) {
  if (!isConfigured()) {
    return {
      ok: false,
      error: 'No OpenRouter key is configured on the server, so the assistant is unavailable.',
      context: null
    };
  }

  const q = String(question || '').trim();
  if (!q) return { ok: false, error: 'Ask a question first.' };
  if (q.length > 500) return { ok: false, error: 'Keep the question under 500 characters.' };

  const context = await gatherContext();

  const user = [
    'DATA (everything you are permitted to reason from):',
    '```json',
    JSON.stringify(context, null, 1),
    '```',
    '',
    `QUESTION: ${q}`
  ].join('\n');

  try {
    const { text, model, attempts } = await complete({ system: SYSTEM, user, signal });
    return {
      ok: true,
      question: q,
      answer: text,
      model,
      /* Surfaced so the console can show which models declined —
         a quiet AI panel should be explainable, not mysterious. */
      skipped: attempts.filter((a) => a.error).map((a) => `${a.model}: ${a.error}`),
      context
    };
  } catch (err) {
    return {
      ok: false,
      question: q,
      error: err.message,
      detail: err.detail,
      /* The figures are still worth returning — the operator can read
         them even when no model is available to narrate them. */
      context
    };
  }
}
