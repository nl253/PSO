#!/usr/bin/env node

const PSO = require('..');

const SEC = 1000;

const f = xs => xs.reduce((x1, x2) => x1 + x2, 0);
const nDims = 1500;
const opts = {
  minImp: 0.01,
  nNeigh: 3,
  nParts: 100,
  timeOutMS: 30 * SEC,
};

const pso = new PSO(f, nDims, opts);

pso.on('start', (_, opts) => console.log(opts));
pso.on('rounds', () => console.log('[END] rounds'));
pso.on('stuck', () => console.log('[END] stuck'));
pso.on('timeout', () => console.log('[END] timeout'));
pso.on('inertia', w => console.log('inertia', w.toFixed(4)));
pso.on('end', (rIdx, ms) => console.log(`[DONE] rounds ${rIdx}, took ${ms / SEC}sec`));
pso.on('best', (_bestPartIdx, fitness) => console.log((fitness / (pso.maxPos * nDims)).toFixed(4)));
pso.on('round', rIdx => console.log(`round #${rIdx}`));

Array.from(pso.search());
