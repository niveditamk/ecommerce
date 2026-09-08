/* =============================================================
   THE ANALYST
   Answers an operator's questions about how the catalogue is
   doing, in plain English, from data this system actually holds.

   It is NOT a language model, and the console says so. Every
   answer is computed from a real query — Medusa's inventory, the
   demand forecaster, the order ledger — and every figure carries
   where it came from and how much of it is trustworthy.

   The rule that governs all of it: if the data cannot support an
   answer, the answer is that it cannot, not a number that reads
   well. A forecast built on nine days of trading is not a
   forecast, and calling it one is how an operator ends up buying
   stock on a guess.
   ============================================================= */
import { db } from '../db/index.js';
import { riskBoard, reorderPlan, overstockBoard } from '../ml/insights.js';
import { syntheticStats } from '../ml/synthetic.js';
import { dataReadiness } from '../ml/trainer.js';
import * as medusa from './client.js';

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

/* The catalogue is authored with HTML entities. This module composes
   prose, so it decodes here rather than leaving '&mdash;' in a sentence
   a human is meant to read. */
const ENTITIES = { '&amp;': '&', '&mdash;': '—', '&ndash;': '–', '&rsquo;': '’', '&lsquo;': '‘', '&ldquo;': '“', '&rdquo;': '”', '&hellip;': '…', '&nbsp;': ' ', '&quot;': '\\"' };
const dx = (v) => String(v ?? '').replace(/&[a-z]+;/g, (m) => ENTITIES[m] ?? m);

/** Real trade only — synthetic history must never be reported as sales. */
function realSales(days = 90) {
  return db.prepare(`
    SELECT i.product_id AS sku, p.name,
           SUM(i.qty) AS units,
           SUM(i.qty * i.unit_price) AS revenue,
           COUNT(DISTINCT o.id) AS orders
      FROM order_items i
      JOIN orders o ON o.id = i.order_id
      JOIN products p ON p.id = i.product_id
     WHERE o.status != 'Cancelled'
       AND o.channel != 'synthetic'
       AND julianday('now') - julianday(o.placed_at) <= ?
     GROUP BY i.product_id
     ORDER BY units DESC
  `).all(days);
}

/* ---------- the caveat that belongs on every performance answer ---------- */
function provenance() {
  const s = syntheticStats();
  const ready = dataReadiness();
  return {
    realOrders: s.real.orders,
    syntheticOrders: s.synthetic.orders,
    syntheticShare: s.syntheticShare,
    forecastableSkus: ready.ready,
    totalSkus: ready.skus,
    caveat: s.present
      ? `${s.syntheticShare}% of the sales history in this system is synthetic, generated so the `
        + `forecaster had something to learn from. Anything below that describes trading is computed `
        + `from the ${s.real.orders} REAL orders only; anything describing a forecast is a model `
        + `trained largely on generated data. Treat the forecast as a demonstration.`
      : null
  };
}

/* ---------- the questions ---------- */
const QUESTIONS = [
  {
    id: 'performance',
    label: 'How are products performing?',
    hint: 'Real sales only, last 90 days',
    async answer() {
      const sales = realSales(90);
      const prov = provenance();

      if (!sales.length) {
        return {
          headline: 'No real sales in the last 90 days.',
          body: [
            `This system holds ${prov.realOrders} real order(s) in total. There is nothing to rank.`,
            prov.syntheticOrders
              ? `The ${prov.syntheticOrders.toLocaleString('en-IN')} synthetic orders are deliberately excluded — they are training data, not trade.`
              : null
          ].filter(Boolean),
          table: null,
          confidence: 'INSUFFICIENT'
        };
      }

      const totalUnits = sales.reduce((n, r) => n + r.units, 0);
      const totalRev = sales.reduce((n, r) => n + r.revenue, 0);
      const top = sales.slice(0, 5);

      return {
        headline: `${totalUnits} unit(s) across ${sales.length} SKU(s), ${money(totalRev)} in the last 90 days.`,
        body: [
          `Best seller: ${dx(top[0].name)} at ${top[0].units} unit(s), ${money(top[0].revenue)}.`,
          sales.length < 5
            ? `Only ${sales.length} SKU(s) sold at all, so a ranking says little.`
            : `The top ${top.length} account for ${Math.round(100 * top.reduce((n, r) => n + r.units, 0) / totalUnits)}% of units.`,
          prov.caveat
        ].filter(Boolean),
        table: {
          columns: ['Product', 'Units', 'Revenue', 'Orders'],
          rows: top.map((r) => [dx(r.name), String(r.units), money(r.revenue), String(r.orders)])
        },
        confidence: sales.length >= 10 ? 'MEDIUM' : 'LOW'
      };
    }
  },

  {
    id: 'reorder',
    label: 'What needs reordering?',
    hint: 'Forecast + current stock',
    async answer() {
      const plan = reorderPlan();
      const prov = provenance();
      if (!plan.rows.length) {
        return {
          headline: 'Nothing is at its reorder point.',
          body: ['Either cover is healthy across the catalogue, or too few SKUs have enough history to judge.'],
          table: null,
          confidence: 'MEDIUM'
        };
      }
      return {
        headline: `${plan.rows.length} SKU(s) are at or below their reorder point — ${plan.units} unit(s), ${money(plan.retailValue)} at retail.`,
        body: [
          `Assumes a ${plan.leadTime}-day lead time; suppliers are not modelled yet, so that is a setting, not a fact.`,
          'Retail value, not cost — the catalogue holds no cost price.',
          prov.caveat
        ].filter(Boolean),
        table: {
          columns: ['Product', 'Available', 'Cover', 'Order'],
          rows: plan.rows.slice(0, 8).map((r) => [
            dx(r.name), String(r.available), r.coverDays != null ? `${r.coverDays}d` : '—', String(r.reorder.qty)
          ])
        },
        confidence: 'MEDIUM'
      };
    }
  },

  {
    id: 'risk',
    label: 'What is at risk of running out?',
    hint: 'Days of cover against lead time',
    async answer() {
      const board = riskBoard();
      const urgent = board.rows.filter((r) => r.risk === 'OUT' || r.risk === 'HIGH');
      return {
        headline: urgent.length
          ? `${urgent.length} SKU(s) will run out before a replacement could land.`
          : 'Nothing is due to run out inside the lead time.',
        body: [
          `Counts: ${Object.entries(board.counts).map(([k, v]) => `${k} ${v}`).join(', ')}.`,
          `Against a ${board.leadTime}-day lead time.`,
          board.counts.UNKNOWN
            ? `${board.counts.UNKNOWN} SKU(s) read UNKNOWN — too little history to state a risk. That is not the same as low risk.`
            : null
        ].filter(Boolean),
        table: urgent.length ? {
          columns: ['Risk', 'Product', 'Available', 'Cover'],
          rows: urgent.slice(0, 8).map((r) => [
            r.risk, dx(r.name), String(r.available), r.coverDays != null ? `${r.coverDays}d` : '—'
          ])
        } : null,
        confidence: 'MEDIUM'
      };
    }
  },

  {
    id: 'overstock',
    label: 'What is overstocked?',
    hint: 'More than six months of cover',
    async answer() {
      const board = overstockBoard();
      if (!board.rows.length) {
        return {
          headline: 'Nothing is carrying more than six months of cover.',
          body: [], table: null, confidence: 'MEDIUM'
        };
      }
      return {
        headline: `${board.rows.length} SKU(s) hold more than six months of cover — ${money(board.tiedUpRetail)} at retail.`,
        body: ['Consider a promotion, a bundle, or holding back the next intake.'],
        table: {
          columns: ['Product', 'On hand', 'Cover', 'Excess'],
          rows: board.rows.slice(0, 8).map((r) => [
            dx(r.name), String(r.onHand), `${Math.round(r.overstock.coverDays)}d`, String(r.overstock.excess)
          ])
        },
        confidence: 'MEDIUM'
      };
    }
  },

  {
    id: 'medusa-stock',
    label: 'What does Medusa hold?',
    hint: 'Live from the Medusa inventory module',
    async answer() {
      const snap = await medusa.inventorySnapshot();
      const empty = snap.byProduct.filter((p) => p.available === 0);
      return {
        headline: `Medusa holds ${snap.totals.stocked} unit(s) across ${snap.totals.variants} variants of ${snap.totals.products} products.`,
        body: [
          `${snap.totals.reserved} reserved, ${snap.totals.available} available.`,
          `${snap.totals.outOfStock} variant(s) are at zero available.`,
          empty.length
            ? `${empty.length} product(s) have no stock on any variant.`
            : null,
          'Imported from the Aurelis catalogue. Stock was recorded per SKU, not per variant, so the whole '
            + 'figure sits on each product’s first variant and the rest start at zero — those zeros are '
            + 'an artefact of the import, not a count.'
        ].filter(Boolean),
        table: {
          columns: ['Product', 'Variants', 'Stocked', 'Available'],
          rows: snap.byProduct.slice(0, 8).map((p) => [
            dx(p.product || p.handle), String(p.variants), String(p.stocked), String(p.available)
          ])
        },
        confidence: 'HIGH'
      };
    }
  }
];

export const questions = () => QUESTIONS.map((q) => ({ id: q.id, label: q.label, hint: q.hint }));

export async function ask(id) {
  const q = QUESTIONS.find((x) => x.id === id);
  if (!q) {
    return {
      id: null,
      question: null,
      headline: 'That is not a question this analyst can answer.',
      body: [
        'It answers from data this system holds, so its questions are fixed rather than open-ended.',
        `Available: ${QUESTIONS.map((x) => x.label).join(' · ')}`
      ],
      table: null,
      confidence: 'UNKNOWN'
    };
  }
  const out = await q.answer();
  return { id: q.id, question: q.label, ...out, provenance: provenance() };
}
