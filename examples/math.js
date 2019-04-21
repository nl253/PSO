#!/usr/bin/env node
/**
 * This example finds roots of an equation.
 */
const PSO = require('..');

const expr = (x1, x2, x3) => (x1 + x2 ** x1) / x3;
const scoreFunct = (xs) => {
  const val = -(expr(...xs)**2);
  if (Object.is(val, Infinity) || Object.is(val, NaN)) {
    return -Infinity;
  } else {
    return val;
  }
};

const pso = new PSO(scoreFunct, 3 /* dimensions */);

// [optional] use the EventEmitter API for profiling
pso.on('start', (_, opts) => console.log(opts));
pso.on('rounds', () => console.log('[END] rounds'));
pso.on('stuck', () => console.log('[END] stuck'));
pso.on('timeout', () => console.log('[END] timeout'));
pso.on('end', (rIdx, ms) => console.log(`[DONE] rounds ${rIdx}, took ${ms / 1000}sec`));

const solutions = Array.from(pso.search() /* generator */)
                        // sort from worst to best 
                        .map(p => ({ p, score: scoreFunct(p) }))
                        .sort((o1, o2) => (o1.score > o2.score ? 1 : -1))
                        .map(({ p }) => p);

console.log(`TASK: find x1, x2, x3 such that (x1 + x2^x1) / x3 = 0`);

for (const p of solutions) {
  console.log(`(${p[0]} + ${p[1]}^${p[0]}) / ${p[2]} = ${scoreFunct(p)}`);
}
