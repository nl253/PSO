#!/usr/bin/env node

const PSO = require('..');

const f = xs => xs.reduce((x1, x2) => x1 + x2, 0);

const SEC = 1000;
const MIN = SEC * 60;
const nDims = 1500;
const opts = {
  minImp: 0.01,
  maxPos: 1E9,
  nParts: 30,
  timeOutMS: 20 * SEC,
  nTrack: 25,
  nNeigh: 0.1,
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
