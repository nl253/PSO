#!/usr/bin/env node
const PSO = require('..');

const expr = (x1, x2, x3) => (x1 + x2 ** x1) / x3;
const f = (xs) => {
  const val = -(expr(...xs)**2);
  if (Object.is(val, Infinity) || Object.is(val, NaN)) {
    return -Infinity;
  } else {
    return val;
  }
};

const opts = { nNeighs: 0.5 };

const pso = new PSO(f, 3, opts);

pso.on('start', (_, opts) => console.log(opts));
pso.on('rounds', () => console.log('[END] rounds'));
pso.on('stuck', () => console.log('[END] stuck'));
pso.on('timeout', () => console.log('[END] timeout'));
pso.on('end', (rIdx, ms) => console.log(`[DONE] rounds ${rIdx}, took ${ms / 1000}sec`));
// pso.on('best', (fitness, p) => console.log(parseFloat(fitness.toFixed(4))));
// pso.on('round', rIdx => console.log(`round #${rIdx}`));

const solutions = Array
  .from(pso.search())
  .map(p => ({ p, score: f(p) }))
  .sort((o1, o2) => (o1.score > o2.score ? 1 : -1))
  .map(({ p }) => p);

for (const p of solutions) {
  console.log(p, f(p).toFixed(4));
}
