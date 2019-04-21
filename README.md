# Particle Swarm Optimization

- use when search space is too large to use brute-force
  - e.g. solving equations or automating the process of design or other
    **optimization problems**
  - many **problems can be reformulated as exploring an n-dimensional search space**
  - PSO is used for problems where data is **continuous** (i.e. real numbers)
- each particle is a `Float64Array` representing a solution to the
  problem you are trying to solve
- **adaptive inertia**
- tweakable **neighborhood**
- detects when the algorithm is stuck in a local minimum and returns
- allows for profiling and debugging (see **EventEmitter API**)
- **efficient** (built on typed arrays)

For dealing with combinatorial problems (values are discrete i.e. integers) see
my [genetic algorithm](https://www.npmjs.com/package/genetic-algo) that follows
a similar API.

## Installation

```sh
$ npm install particle-swarm-optimization
```

[NPM link](https://www.npmjs.com/package/particle-swarm-optimization).

## API

Example:

```js
const PSO = require('particle-swarm-optimization')

// silly score function, maximises values on all dimensions (see below for a better example)
const scoreFunct = arr => arr.reduce((x, y) => x + y, 0) 

// you may also supply an object with options  see below DEFAULT OPTS)
const pso = new PSO(scoreFunct, 1000 /* nDims */)

// Array<Float64Array>
const solutions = Array.from(pso.search() /* generator */)
```

In a nutshell:

1.  Provide `nDims` (**Int** &gt; 0)
2.  Provide a score function that accepts a particle (`Float64Array`)
    and returns a number. Each particle is of length `nDims`. The
    particles that score the highest will *attract* other particles.
3.  [EXTRA] You probably want a decode function as well (see **TIPS** section below).

## Score Function

### Signature

`function(TypedArray): Number` <br>

The number it returns may be positive or negative. It may be an integer or a real number.

### Example

The previous example maximised the value of every gene. This example computes the negative of the distance from roots of an equation:

```js
const expr = (x1, x2, x3, x4, x5, x6) => (Math.log2(x1) * x2 ** x3 / x4) + x5 ** (Math.log2(x6))
const score = xs => {
  const val = -(Math.abs(expr(...xs)));
  if (Object.is(NaN, val) || Object.is(Infinity, val)) {
    return -Infinity
  } else {
    return val
  }
}
```

Best particles score 0 (distance from the root is 0 meaning root has been
found), worst particles have a negative value.

Output from running this scoring function in [this](https://github.com/nl253/PSO-JS/tree/master/examples/math.js) example:

```
(0 + 381135442.84136254^0) / 1000000000 = -1e-18
(0 + 653773523.3628045^0) / 1000000000 = -1e-18
(0 + 553500661.9872961^0) / 1000000000 = -1e-18
(0 + 1000000000^0) / 1000000000 = -1e-18
(0 + 1000000000^0) / 1000000000 = -1e-18
(0 + 1000000000^0) / 1000000000 = -1e-18
(0 + 0^0) / 1000000000 = -1e-18
(0 + 133269167.98425382^0) / 1000000000 = -1e-18
(0 + 198792532.17259422^0) / 1000000000 = -1e-18
(0 + 307306178.6563051^0) / 1000000000 = -1e-18
(0 + 490196345.0064646^0) / 1000000000 = -1e-18
...  ...  ...  ...  ...  ...  ...  ...  ...  ...  
```

### [OPTIONAL] Decode Function

It sometimes makes sense to have a `decode(particle)` function.

```js
function decode(particle) {
  return {
    price: particle[0],
    category: Math.floor(particle[1]),
    area: Math.floor(particle[2]),
    // etc.
  }
}
```

And then it's *much* easier in the score function:

```js
function scoreFunct(particle) {
  const { price, category, area, ... } = decode(particle)
  let fitnessScore = 0
  fitnessScore += 1000 - price
  fitnessScore += getQualOfCat(category)
  fitnessScore -= getCostOfArea(area)
  // other vars ...
  return fitnessScore
}
```

## Default `opts`

In addition to required parameters (`scoreFunct`, `nDims`), you can also supply an object with configuration.
I encourage to begin with defaults and then tweak if necessary.  Here are the defaults:

```js
const SEC = 1000;

const opts = {

  // stop condition 
  // (if you find that the algorithm gets stuck too quickly, increase it)
  timeOutMS: 30 * SEC, 

  // stop condition
  nRounds: 1E6,      

  // used to reduce the velocity 
  // if null (default) it will start as 1 and decrease with time 
  // I encourage to leave it unchanged,
  // if you do want to change it, it must be a value between 0 and 1
  inertia: null,

  // it makes sense for it to be 30 - 100 ish
  // (if you find that the algorithm gets stuck too quickly, increase it)
  nParts: 300,        

  // 0.2 is 20%, 10 is 10
  // this is how many neighbors a particle will consider 
  // every particle is attracted to the best neighbor)
  // (if you find that the algorithm gets stuck too quickly, decrease it)
  nNeighs: 0.1,         

  // keep track of improvements in previous rounds to detect local minima
  // (if you find that the algorithm gets stuck too quickly, increase it)
  nTrack: 200,          

  // this is used to detect being stuck local minima (no improvement), 
  // you should not need to change it
  minImprove: 1E-6,    

  // this limits the search space for all dimensions
  maxPos: 1E9,
  minPos: -1E9,

  // how quickly you can traverse the search space
  maxVel: 1E9,
  minVel: -1E9,
}
```

For example:

```js
const opts = { 
  timeOutMS: 30 * SEC, 
  nParts: 40,
  nNeighs: 10,         
}
const nDims = 1000

const pso = new PSO(someScoreFunct, nDims, opts)
```

## Theory Behind Particle Swarm Optimization

This algorithm uses a nature-inspired **heuristic** and has the
potential to achieve excellent results but it *might not* find the
optimal (ideal) solution. That said, for many applications the best
solution is not needed. By sacrificing a bit of quality you drastically
reduce the time needed to find a solution. Without such heuristics some
problems cannot be solved at all. These would NP complete problems to
which we do not have an algorithm which would run in polynomial time.
Solutions are as good as your scoring function.

### Particle

Each particle represents a **complete solution to the problem** you are
trying to solve. The algorithm keeps track of a population (swarm) of
those particles. **Particles are moved across the search space** (modified) in such a way that the
swarm approaches a solution. In this implementation particles are
typed arrays. Each candidate solution (particle) corresponds to a
point in the search space that you are exploring. **Particles are attracted
to neighbors that score high on the fitness function AND to their previous best
position in the search space**.

### Score Function

Measures the value of a particle (candidate solution). The algorithm
will perform well *if* your scoring function is good.

### Swarm

Swarm is a collection of particles (population of candidate solutions).
An initial population with `nParts = 5` and `nDims = 2` might look
something like this:

```js
// dim1     dim2 
[23.123,  312.3] // particle 1
[  -1.3,   41.4] // particle 2
[  10.0,   11.1] // particle 3
[-1.999,  100.0] // particle 4
[ 99912, 222.31] // particle 5
```

## Profiling with EventEmitter API

The `PSO` object emits signals along with some information which can be
used for profiling.

**NOTE** data emitted is in sub-bullets.

**Emitted Once** <br>

1. `"init"` right after `.search()` is called, *before* initialisation
2. `"generate"` when generating initial swarm.
3. `"randomize"` when setting random values for dimensions in the initial swarm.
4. `"start"` after `.search()` and all initialisation is complete, before the 1st round
    - **Int** `startTime` in milliseconds
    - **Object** `opts` the algorithm is run with (you can use it to see if you configured it properly)

**Emitted on Stop Condition Met** <br>

1. `"rounds"` when `nRounds` limit reached.
2. `"timeout"` when `timeOutMS` limit is reached.
3. `"stuck"` when stuck in a local minimum.
4. `"end"` when finished.
     - **Int** `roundNumber`
     - **Date** `dateFinished`
     - **Int** `msTaken`

**Emitted Every Round** <br>

1. `"round"` on every round start (**not** the same as `"rounds"`).
2. `"best"` after all particles have been evaluated and the best candidate is selected.
     - **Float** `scoreOfBestParticle`
     - **Float** `improvementSinceLastRound`
3. `"inertia"` after inertia has been computed (this makes sense when `inertia = null` which makes it adaptive, you can use it to see how it grows with time)
     - **Float** `inertia`

Example of extracting data from signals:

```js
pso.on('start', time => console.log(`[START] at ${new Date(time).toTimeString()}`))
pso.on('best', score => console.log(score))
pso.on('stuck', () => console.log(`[END] stuck`))
pso.on('timeout', () => console.log(`[END] timeout`))
pso.on('end', (rIdx, ms) => console.log(`[END] after round #${rIdx} (took ${ms / SEC}sec)`))
```

More examples [here](https://github.com/nl253/PSO-JS/tree/master/examples).

## Downsides

- single-threaded (but see [parallel example](https://github.com/nl253/PSO-JS/blob/master/examples/parallel.js)
  that uses the cluster module from node stdlib).
- this is a node.js library so it won't work in a browser

## License

MIT
