#!/usr/bin/env node

const PSO = require('..');

const SEC = 1000;

const f = xs => xs.reduce((x1, x2) => x1 + x2, 0);
const nDims = 1500;
const pso = new PSO(f, nDims);

pso.on('start', (_, opts) => console.log(opts));
pso.on('rounds', () => console.log('[END] rounds'));
pso.on('stuck', () => console.log('[END] stuck'));
pso.on('timeout', () => console.log('[END] timeout'));
pso.on('inertia', w => console.log('inertia', w.toFixed(4)));
pso.on('end', (rIdx, ms) => console.log(`[DONE] rounds ${rIdx}, took ${ms / SEC}sec`));
pso.on('best', (_bestPartIdx, score) => console.log('score', (score / (pso.maxPos * nDims)).toFixed(4), '/ 1.0'));
pso.on('round', rIdx => console.log(`round #${rIdx}`));

Array.from(pso.search());
