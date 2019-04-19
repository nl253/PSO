#!/usr/bin/env node

const PSO = require('..');

const f = xs => xs.reduce((x1, x2) => x1 + x2, 0);

const SEC = 1000;
const nDims = 1500;
const opts = {
  maxPos: 1E10,
  minImp: 0.01,
  minPos: -1E10,
  nNeigh: 0.15,
  nParts: 50,
  nTrack: 50,
  timeOutMS: 30 * SEC,
};

const pso = new PSO(f, nDims, opts);

pso.on('start', (_, opts) => console.log(opts));
pso.on('rounds', () => console.log('[END] rounds'));
pso.on('stuck', () => console.log('[END] stuck'));
pso.on('timeout', () => console.log('[END] timeout'));
pso.on('end', (rIdx, ms) => console.log(`[DONE] rounds ${rIdx}, took ${ms / SEC}sec`));
pso.on('best', fitness => console.log(fitness, fitness / (opts.maxPos * nDims)));
pso.on('round', rIdx => console.log(`round #${rIdx}`));

Array.from(pso.search())
