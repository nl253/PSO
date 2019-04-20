#!/usr/bin/node
/**
 * This example shows that many GeneticAlgorightms can be run in parallel.
 */
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

// main thread dispatches
if (cluster.isMaster) {
  for (let i = 0; i < numCPUs; i++) {
    console.log(`worker #${i} started`);
    cluster.fork();
  }
  process.exit(0);
} 

// this is the worker code 
const PSO = require('..');
const SEC = 1000;

const f = xs => xs.reduce((x, y) => x + y, 0);
const nDims = 500;

// randomness will ensure different config for every child
const opts = {
  nNeighs: 0.1 + (Math.random() * 0.3),
  nParts: 30 + Math.floor(Math.random() * 120),
  timeOutMS: 45 * SEC,
};

const pso = new PSO(f, nDims, opts);

const bestPossible = 1E9 * nDims;

// use the EventEmitter API for getting profiling
pso.on('start', (time, opts) => console.log(`[START] at ${new Date(time).toTimeString()} with opts`, opts));
pso.on('best', (_bestCandIdx, score) => console.log((score / bestPossible).toPrecision(4)));
pso.on('stuck', () => console.log(`[END] stuck`));
pso.on('timeout', () => console.log(`[END] timeout`));
pso.on('end', (nr, d, ms) => console.log(`[END] after round #${nr} (took ${ms / SEC}sec)`));

/* pso.search() will create a generator that iterates over the best population
 * if you want the best solution, just request the very first: */
const best = pso.search().next().value;
const bestActual = f(best);
console.log(bestActual / bestPossible); 
