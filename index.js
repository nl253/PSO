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
   * @param {!number} nDim
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
    const offset = this.nDims * 3;

    const pop = new Float64Array(new ArrayBuffer(8 * 3 * this.nParts * this.nDims));

    for (let i = 0; i < pop.length; i++) {
      pop[i] = Math.random() * 1000;
    }

    const scores = new Float64Array(new ArrayBuffer(8 * this.nTrack));

    this.emit('randomize');

    const indexes = new Uint16Array(new ArrayBuffer(2 * this.nParts)).map((_, idx) => idx);
    const distances = new Float64Array(new ArrayBuffer(8 * this.nParts));

    const cachePos = new Map();
    const cacheBest = new Map();

    let rIdx = 0;
    const startTm = Date.now();

    this.emit('start', startTm, {
      inertia: this.inertia,
      maxVel: this.maxVel,
      nDims: this.nDims,
      nParts: this.nParts,
      nRounds: this.nRounds,
      timeOutMS: this.timeOutMS,
    });

    let timeTaken;

    while (true) {
      timeTaken = Date.now() - startTm;
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

      for (let pIdx = 0; pIdx < this.nParts; pIdx++) {
        let fp = cachePos.get(pIdx);
        const offsetPos = pIdx * offset;
        const offsetBest = offsetPos + this.nDims;
        const offsetVel = offsetBest + this.nDims;

        if (fp === undefined) {
          fp = this.f(pop.subarray(offsetPos, offsetBest));
          cachePos.set(pIdx, fp);
        }

        let fb = cacheBest.get(pIdx);

        if (fb === undefined) {
          fb = this.f(pop.subarray(offsetBest, offsetVel));
          cacheBest.set(pIdx, fb);
        }

        if (fp > fb) {
          cacheBest.set(pIdx, fp);
          for (let j = 0; j < this.nDims; j++) {
            pop[offsetBest + j] = pop[offsetPos + j];
          }
        }

        // get neighbours
        for (let nIdx = 0; nIdx < this.nParts; nIdx++) {
          distances[nIdx] = 0;
          const offsetPosN = nIdx * offset;
          for (let j = 0; j < this.nDims; j++) {
            distances[nIdx] += Math.abs(pop[offsetPos + j] - pop[offsetPosN + j]);
          }
        }

        // the 0th item will be self which has a distance of 0 (not useful)
        const neighbourIdxs = indexes.sort((a, b) => (distances[a] > distances[b] ? 1 : -1)).subarray(1, this.nNeighs + 1);

        // assume the first neighbour is the fittest
        let fittestNeighIdx = 0;
        let bestFitness = cachePos.get(0);

        if (bestFitness === undefined) {
          bestFitness = this.f(pop.subarray(0, this.nDims));
          cachePos.set(0, bestFitness);
        }

        for (let nIdx = 1; nIdx < this.nNeighs; nIdx++) {
          let fitness = cachePos.get(nIdx);

          if (fitness === undefined) {
            fitness = this.f(pop.subarray(nIdx * offset, nIdx * offset + this.nDims));
            cachePos.set(nIdx, fitness);
          }

          if (fitness > bestFitness) {
            bestFitness = fitness;
            fittestNeighIdx = nIdx;
          }
        }
        this.emit('best', bestFitness);
        scores.set(scores.subarray(1));
        scores[scores.length - 1] = bestFitness;
        const weight = this.inertia === null ? (1 - (timeTaken / this.timeOutMS)) : this.inertia;
        const offsetPosFittestNeigh = fittestNeighIdx * offset;
        for (let dim = 0; dim < this.nDims; dim++) {
          const particlePos = pop[offsetPos + dim];
          // decrease inertia linearly with time
          pop[offsetVel + dim] = Math.max(
            this.minVel,
            Math.min(
              this.maxVel,
              weight * pop[offsetVel + dim] + Math.random() * (pop[offsetBest + dim] - particlePos) + Math.random() * (pop[offsetPosFittestNeigh + dim] - particlePos),
            ),
          );
        }
        cachePos.delete(pIdx);
        for (let dim = 0; dim < this.nDims; dim++) {
          pop[offsetPos + dim] = Math.min(this.maxPos, Math.max(this.minPos, pop[offsetPos + dim] + pop[offsetVel + dim]));
        }
      }
    }

    this.emit('end', rIdx, new Date(), timeTaken);

    for (let pIdx = 0; pIdx < this.nParts; pIdx++) {
      yield pop.subarray(pIdx * offset + this.nDims, pIdx * offset + this.nDims + this.nDims);
    }
  }
}

module.exports = PSO;

// vim:nu:hlsearch:
