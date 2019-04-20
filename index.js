const { EventEmitter } = require('events');

const SEC = 1000;

const DEFAULTS = {
  inertia: null,
  maxPos: 1E9,
  maxVel: 1E9,
  minImp: 1E-6,
  minPos: -1E9,
  minVel: -1E9,
  nNeighs: 0.5,
  nParts: 30,
  nRounds: 1E6,
  nTrack: 200,
  timeOutMS: 30 * SEC,
};

class PSO extends EventEmitter {
  /**
   * @param {function(Float64Array): !Number} f
   * @param {!number} nDims
   * @param {!Object} [opts]
   */
  constructor(f, nDims, opts = {}) {
    super();
    Object.assign(this, Object.assign(Object.assign({
      nDims,
      f,
    }, DEFAULTS), opts));
    if (this.nNeighs < 1) {
      this.nNeighs = this.nParts * this.nNeighs;
    }
  }

  * search() {
    this.emit('init');

    let rIdx = 0;
    const offset = this.nDims * 3;

    // indexes of all particles sorted on every iteration
    const indexes = new Uint16Array(new ArrayBuffer(2 * this.nParts)).map((_, idx) => idx);

    // indexes of all particles computed on every iteration 
    const distances = new Float64Array(new ArrayBuffer(8 * this.nParts));

    // scores of candidates from last nTrack rounds
    const scores = new Float64Array(new ArrayBuffer(8 * this.nTrack));

    // in this algorithm score cache is extremly useful, you are requesting the score of the same particles over and over again
    const cachePos = new Map();
    const cacheBest = new Map();

    this.emit('generate');

    const swarm = new Float64Array(new ArrayBuffer(8 * 3 * this.nParts * this.nDims));

    this.emit('randomize');

    // initialise swarm to rand values
    for (let i = 0; i < swarm.length; i++) {
      swarm[i] = Math.random() * (Math.random() < 0.5 ? this.maxPos : this.minPos);
    }

    const startTm = Date.now();

    this.emit('start', startTm, {
      inertia: this.inertia,
      nNeighs: this.nNeighs,
      maxVel: this.maxVel,
      nDims: this.nDims,
      nParts: this.nParts,
      nRounds: this.nRounds,
      timeOutMS: this.timeOutMS,
    });

    let timeTaken;

    while (true) {
      timeTaken = Date.now() - startTm;

      // stop conditions
      if (rIdx >= this.nRounds) {
        this.emit('rounds');
        break;
      } else if (timeTaken >= this.timeOutMS) {
        this.emit('timeout', timeTaken);
        break;
      } else if (rIdx > this.nTrack && scores.subarray(1).map((s, idx) => s - scores[idx]).reduce((f1, f2) => f1 + f2, 0) < this.minImp) {
        this.emit('stuck');
        break;
      } else {
        this.emit('round', rIdx);
        rIdx++;
      }

      // decrease inertia linearly with time
      const weight = this.inertia === null ? (1 - (timeTaken / this.timeOutMS)) : this.inertia;
      this.emit('inertia', weight);

      for (let pIdx = 0; pIdx < this.nParts; pIdx++) {
        let scoreParticle = cachePos.get(pIdx);
        const offsetPos = pIdx * offset;
        const offsetBest = offsetPos + this.nDims;
        const offsetVel = offsetBest + this.nDims;

        if (scoreParticle === undefined) {
          scoreParticle = this.f(swarm.subarray(offsetPos, offsetBest));
          // protect against fitness function returnin NaN or Infinity
          if (Object.is(NaN, scoreParticle)) {
            console.warn('[WARN] fitness function returned NaN');
            scoreParticle = -Number.MAX_VALUE;
          } else {
            scoreParticle = Math.min(Number.MAX_VALUE, scoreParticle);
          }
          cachePos.set(pIdx, scoreParticle);
        }

        let scoreBestKnown = cacheBest.get(pIdx);

        if (scoreBestKnown === undefined) {
          scoreBestKnown = this.f(swarm.subarray(offsetBest, offsetVel));
          cacheBest.set(pIdx, scoreBestKnown);
        }

        if (scoreParticle > scoreBestKnown) {
          cacheBest.set(pIdx, scoreParticle);
          for (let j = 0; j < this.nDims; j++) {
            swarm[offsetBest + j] = swarm[offsetPos + j];
          }
        }

        // get neighbours
        for (let nIdx = 0; nIdx < this.nParts; nIdx++) {
          distances[nIdx] = 0;
          const offsetPosN = nIdx * offset;
          for (let j = 0; j < this.nDims; j++) {
            distances[nIdx] += Math.abs(swarm[offsetPos + j] - swarm[offsetPosN + j]);
          }
        }

        // the 0th item will be self which has a distance of 0 (not useful)
        const neighbourIdxs = indexes.sort((a, b) => (distances[a] > distances[b] ? 1 : -1)).subarray(1, this.nNeighs + 1);

        // assume the first neighbour is the best
        let bestNeighIdx = neighbourIdxs[0];
        let bestScore = cachePos.get(bestNeighIdx);

        if (bestScore === undefined) {
          const neigh = swarm.subarray(bestNeighIdx * offset, bestNeighIdx * offset + this.nDims);
          bestScore = this.f(neigh);
          cachePos.set(bestNeighIdx, bestScore);
        }

        for (let i = 1; i < neighbourIdxs.length; i++) {
          const nIdx = neighbourIdxs[i];
          let score = cachePos.get(nIdx);

          if (score === undefined) {
            score = this.f(swarm.subarray(nIdx * offset, nIdx * offset + this.nDims));
            cachePos.set(nIdx, score);
          }

          if (score > bestScore) {
            bestScore = score;
            bestNeighIdx = nIdx;
          }
        }
        this.emit('best', 
          bestNeighIdx, 
          bestScore, 
          bestScore - scores[scores.length - 1], // improvement
        );

        // shift scores
        scores.set(scores.subarray(1));
        scores[scores.length - 1] = bestScore;

        const offsetPosFittestNeigh = bestNeighIdx * offset;
        for (let dim = 0; dim < this.nDims; dim++) {
          const particlePos = swarm[offsetPos + dim];
          swarm[offsetVel + dim] = Math.max(
            this.minVel,
            Math.min(
              this.maxVel,
              weight * swarm[offsetVel + dim] + Math.random() * (swarm[offsetBest + dim] - particlePos) + Math.random() * (swarm[offsetPosFittestNeigh + dim] - particlePos),
            ),
          );
        }
        cachePos.delete(pIdx);
        for (let dim = 0; dim < this.nDims; dim++) {
          swarm[offsetPos + dim] = Math.min(this.maxPos, Math.max(this.minPos, swarm[offsetPos + dim] + swarm[offsetVel + dim]));
        }
      }
    }

    this.emit('end', rIdx, new Date(), timeTaken);

    for (let pIdx = 0; pIdx < this.nParts; pIdx++) {
      // yield best known
      yield swarm.subarray(pIdx * offset + this.nDims, pIdx * offset + this.nDims + this.nDims);
    }
  }
}

module.exports = PSO;

// vim:nu:hlsearch:
