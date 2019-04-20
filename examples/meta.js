#!/usr/bin/node
/**
 * Sets the meta-parameters of the Particle-Swarm-Optimization algorithm by running sub-algorithms with different settings.
 */
const PSO = require('..');

const SEC = 1000;
const MIN = 60 * SEC;

/**
 * @param {Uint32Array|Uint16Array|Uint8Array|Float64Array|Float32Array|Int32Array|Int8Array|Int16Array} particle
 * @returns {{nParts: !Number, timeOutMS: !Number, inertia: !Number}} opts
 */
function decodeSolution(particle) {
  const inertia = Math.min(1, 0.1 + (Math.abs(particle[4] - Math.trunc(particle[4]))));
  const minVel = 5 + Math.abs(particle[3]);
  const maxVel = 5 + minVel + Math.abs(particle[4]);
  const nNeighs = Math.min(1, 0.1 + Math.abs(particle[0] - Math.trunc(particle[0])));
  const nParts = 20 + Math.floor(Math.abs(particle[1])) % 200;
  const nTrack = 10 + (Math.trunc(Math.abs(particle[5])) % 300);
  return {
    inertia,
    maxVel,
    minVel,
    nNeighs,
    nParts,
    nTrack,
    maxPos: 1E9,
    minPos: 0,
    timeOutMS: 12 * SEC,
  };
}

/**
 * @param {Uint32Array|Uint16Array|Uint8Array} particle
 * @returns {!Number} score
 */
function paramSetterScoreFunct(particle) {
  const nDims = 300;
  const opts = decodeSolution(particle);
  const scoreFunct = c => c.reduce((g1, g2) => g1 + g2, 0) / (nDims * opts.maxPos);
  const maximizer = new PSO(scoreFunct, nDims, opts);
  maximizer.on('start', (time, opts) => console.log('sub-algorithm [START] with opts', opts));
  maximizer.on('stuck', () => console.log('sub-algorithm [END] stuck'));
  maximizer.on('timeout', () => console.log('sub-algorithm [END] timeout'));
  maximizer.on('end', (nr, d, ms) => console.log(`sub-algorithm [END] after round #${nr} (took ${ms / SEC}sec)`));
  const startTm = Date.now();
  const bestParticle = maximizer.search().next().value;
  const msTook = Date.now() - startTm;
  const scoreSearch = scoreFunct(bestParticle);
  const scoreTime = (1 - (msTook / (12 * SEC))) / 2;
  const totalScore = scoreSearch + scoreTime;
  console.log('sub-algorithm score', totalScore);
  return totalScore;
}

const paramSetterOpts = { minPos: 0, maxPos: 1000, nNeighs: 5, nParts: 25, timeOutMS: 30 * MIN };
const paramSetterNDims = 6;

const paramSetter = new PSO(paramSetterScoreFunct, paramSetterNDims, paramSetterOpts);

// use the EventEmitter API for getting profiling
paramSetter.on('start', time => console.log(`[START] at ${new Date(time).toTimeString()}`));
paramSetter.on('best', (_, score) => console.log(score));
paramSetter.on('stuck', () => console.log('[END] stuck'));
paramSetter.on('timeout', () => console.log('[END] timeout'));
paramSetter.on('end', (nr, d, ms) => console.log(`[END] after round #${nr} (took ${ms / SEC}sec)`));

const bestConfigs = paramSetter.search();

for (const bestCfg of bestConfigs) {
  console.log(decodeSolution(bestCfg));
}
