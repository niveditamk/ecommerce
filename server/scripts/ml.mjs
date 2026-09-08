#!/usr/bin/env node
/* =============================================================
   ML CLI  —  node scripts/ml.mjs <command>

     status                 what exists, what is trained
     seed [days] [seed]     generate synthetic history (dev only)
     purge                  remove every synthetic row
     train                  train the demand forecaster
     predict <sku>          serve a forecast from the active version
     risk                   stock-out risk board
     reorder                reorder recommendations

   Everything here is also available in the admin console; the CLI
   exists so a training run can be scripted or scheduled.
   ============================================================= */
import { init, db } from '../src/db/index.js';
import { generateSyntheticHistory, purgeSynthetic, syntheticStats } from '../src/ml/synthetic.js';
import { trainDemandForecast, predict } from '../src/ml/trainer.js';
import { listModels, listRuns, listVersions } from '../src/ml/registry.js';

init();

const [cmd, ...args] = process.argv.slice(2);
const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

function status() {
  const s = syntheticStats();
  console.log('\nTRAINING DATA');
  console.log(`  real orders       ${s.real.orders}${s.real.a ? `   ${s.real.a} → ${s.real.b}` : ''}`);
  console.log(`  synthetic orders  ${s.synthetic.orders}${s.synthetic.a ? `   ${s.synthetic.a} → ${s.synthetic.b}` : ''}`);
  console.log(`  synthetic share   ${s.syntheticShare}%`);

  console.log('\nMODELS');
  listModels().forEach((m) => {
    const v = m.active_version ? `v${m.active_version} (${m.active_algorithm})` : '—';
    console.log(`  ${m.key.padEnd(18)} ${m.status.padEnd(10)} ${String(m.versions).padStart(2)} version(s)  active ${v}`);
  });

  const runs = listRuns(null, 5);
  if (runs.length) {
    console.log('\nRECENT RUNS');
    runs.forEach((r) => console.log(`  #${r.id} ${r.model_key} ${r.status} — ${r.message || ''}`));
  }
  console.log('');
}

switch (cmd) {
  case 'seed': {
    const days = Number(args[0]) || 540;
    const seed = Number(args[1]) || 20260824;
    console.log(`Generating ${days} days of synthetic history (seed ${seed})…`);
    const out = generateSyntheticHistory({ days, seed });
    console.log(out.ok ? out : `FAILED — ${out.reason}`);
    break;
  }

  case 'purge':
    console.log(purgeSynthetic());
    break;

  case 'train': {
    const out = trainDemandForecast({ trigger: 'manual' });
    if (!out.ok) { console.log(`SKIPPED — ${out.reason}`); break; }
    console.log(`\nVersion ${out.version} active in ${out.durationMs}ms`);
    console.log(`Trained ${out.trained} SKU(s), skipped ${out.skipped} for thin history\n`);
    console.log('LEADERBOARD (pooled across the catalogue)');
    console.log(`  ${'algorithm'.padEnd(18)} ${'SKUs'.padStart(5)} ${'MAE'.padStart(8)} ${'RMSE'.padStart(8)} ${'WAPE%'.padStart(8)} ${'TOTAL%'.padStart(8)}`);
    out.leaderboard.forEach((c) => console.log(
      `  ${c.algorithm.padEnd(18)} ${String(c.skus).padStart(5)} ${String(c.metrics.mae).padStart(8)} ${String(c.metrics.rmse).padStart(8)} ${String(c.metrics.wape).padStart(8)} ${String(c.metrics.cumulativeError).padStart(8)}`
    ));
    console.log(`\n  WAPE%  = day-level error. Always high on intermittent demand:`);
    console.log(`           you cannot predict which day the one sale lands on.`);
    console.log(`  TOTAL% = error on the total over the holdout window. This is the`);
    console.log(`           figure a purchase order actually depends on.`);
    console.log(`\nPer-SKU champions pooled: WAPE ${out.metrics.wape}%  total ${out.metrics.cumulativeError}%  MAE ${out.metrics.mae}\n`);
    break;
  }

  case 'predict': {
    const sku = args[0];
    if (!sku) { console.log('usage: predict <sku>'); break; }
    const p = predict(sku);
    console.log(JSON.stringify(p, null, 2));
    break;
  }

  case 'risk': {
    const { riskBoard } = await import('../src/ml/insights.js');
    const b = riskBoard();
    console.log(`\nSTOCK-OUT RISK  (lead time ${b.leadTime} days)`);
    console.log(`  ${Object.entries(b.counts).map(([k, v]) => `${k} ${v}`).join('   ')}\n`);
    b.rows.slice(0, 14).forEach((r) => console.log(
      `  ${r.risk.padEnd(8)}${r.sku.padEnd(10)}${String(r.available).padStart(4)} avail  ${String(r.coverDays ?? '—').padStart(7)}d cover  ${r.riskReason}`
    ));
    console.log('');
    break;
  }

  case 'reorder': {
    const { reorderPlan } = await import('../src/ml/insights.js');
    const b = reorderPlan();
    console.log(`\nREORDER PROPOSALS — ${b.rows.length} SKU(s), ${b.units} units, ${money(b.retailValue)} at retail`);
    b.rows.forEach((r) => {
      console.log(`\n  ${r.sku}  ${r.name}  → order ${r.reorder.qty}`);
      r.reorder.reasoning.forEach((x) => console.log(`      ${x}`));
    });
    console.log('');
    break;
  }

  case 'anomalies': {
    const { anomalies } = await import('../src/ml/insights.js');
    const a = anomalies();
    console.log(`\nANOMALIES — ${a.length}`);
    a.forEach((x) => console.log(
      `  ${x.direction.padEnd(6)}${x.sku.padEnd(10)}z=${String(x.z).padStart(7)}  ${x.changePct}%  ${x.name}`
    ));
    console.log('');
    break;
  }

  case 'versions':
    console.table(listVersions(args[0] || 'demand_forecast').map((v) => ({
      v: v.version, algorithm: v.algorithm, rows: v.train_rows,
      mae: v.mae, wape: v.wape, active: !!v.is_active, at: v.created_at
    })));
    break;

  case 'status':
  case undefined:
    status();
    break;

  default:
    console.log(`Unknown command "${cmd}". Try: status | seed | purge | train | predict <sku> | versions`);
}

db.close?.();
