// Beta posterior, Wilson interval, SRM and power - Specification Sections 8.2, 14.1
export function wilsonInterval(successes: number, n: number, z = 1.959964): { low: number; high: number } {
  if (n === 0) return { low: 0, high: 0 };
  const p = successes / n;
  const d = 1 + (z * z) / n;
  const centre = (p + (z * z) / (2 * n)) / d;
  const margin = (z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n)) / d;
  return { low: Math.max(0, centre - margin), high: Math.min(1, centre + margin) };
}

// Deterministic PRNG (mulberry32) so published numbers reproduce exactly.
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Marsaglia-Tsang gamma sampler for Beta draws.
function gammaSample(rng: () => number, shape: number): number {
  if (shape < 1) {
    const u = rng();
    return gammaSample(rng, shape + 1) * Math.pow(u, 1 / shape);
  }
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x = 0, v = 0;
    do {
      // Box-Muller normal
      const u1 = Math.max(rng(), 1e-12), u2 = rng();
      const r = Math.sqrt(-2 * Math.log(u1));
      x = r * Math.cos(2 * Math.PI * u2);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = rng();
    if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}
function betaSample(rng: () => number, a: number, b: number): number {
  const x = gammaSample(rng, a), y = gammaSample(rng, b);
  return x / (x + y);
}

export interface PosteriorResult {
  pChallengerBetter: number;
  diffMean: number;
  diffLow: number; // 95% credible interval for (B - A)
  diffHigh: number;
  draws: number;
}

export function posteriorDiff(convA: number, expA: number, convB: number, expB: number, draws = 100000, seed = 20261127): PosteriorResult {
  const rng = mulberry32(seed);
  const diffs = new Float64Array(draws);
  let better = 0;
  for (let i = 0; i < draws; i++) {
    const a = betaSample(rng, 1 + convA, 1 + Math.max(0, expA - convA));
    const b = betaSample(rng, 1 + convB, 1 + Math.max(0, expB - convB));
    const d = b - a;
    diffs[i] = d;
    if (d > 0) better++;
  }
  const sorted = Float64Array.from(diffs).sort();
  const q = (p: number) => sorted[Math.min(draws - 1, Math.max(0, Math.floor(p * draws)))];
  let mean = 0; for (let i = 0; i < draws; i++) mean += diffs[i];
  return { pChallengerBetter: better / draws, diffMean: mean / draws, diffLow: q(0.025), diffHigh: q(0.975), draws };
}

// Sample ratio mismatch: chi-square against 50/50, 1 df. Returns p-value.
export function srmTest(expA: number, expB: number): { chi2: number; p: number } {
  const total = expA + expB;
  if (total === 0) return { chi2: 0, p: 1 };
  const e = total / 2;
  const chi2 = ((expA - e) ** 2) / e + ((expB - e) ** 2) / e;
  // chi-square survival function for 1 df via erfc
  const p = erfc(Math.sqrt(chi2 / 2));
  return { chi2, p };
}
function erfc(x: number): number {
  // Abramowitz & Stegun 7.1.26, |error| <= 1.5e-7
  const p = 0.3275911;
  const a = [0.254829592, -0.284496736, 1.421413741, -1.453152027, 1.061405429];
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + p * ax);
  const poly = t * (a[0] + t * (a[1] + t * (a[2] + t * (a[3] + t * a[4]))));
  const erf = 1 - poly * Math.exp(-ax * ax);
  return 1 - sign * erf;
}

// Two-proportion sample size per arm (normal approximation). Reproduces 356 for 0.30 -> 0.40, alpha .05, power .80.
export function sampleSizePerArm(p1: number, p2: number, alpha = 0.05, power = 0.8): number {
  const zA = 1.959964, zB = 0.841621;
  const pBar = (p1 + p2) / 2;
  const num = (zA * Math.sqrt(2 * pBar * (1 - pBar)) + zB * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))) ** 2;
  return Math.ceil(num / ((p2 - p1) ** 2));
}

// Beta PDF for charting (client-safe, deterministic).
export function logGamma(z: number): number {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.001208650973866179, -0.000005395239384953];
  let x = z, y = z, tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) ser += c[j] / ++y;
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}
export function betaPdf(x: number, a: number, b: number): number {
  if (x <= 0 || x >= 1) return 0;
  const lbeta = logGamma(a) + logGamma(b) - logGamma(a + b);
  return Math.exp((a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x) - lbeta);
}
// Density of the difference (B - A) by convolution on a grid - for the chart.
export function diffDensity(convA: number, expA: number, convB: number, expB: number, points = 81): { x: number; y: number }[] {
  const aA = 1 + convA, bA = 1 + Math.max(0, expA - convA);
  const aB = 1 + convB, bB = 1 + Math.max(0, expB - convB);
  const grid = 200;
  const pdfA: number[] = [], pdfB: number[] = [];
  for (let i = 0; i <= grid; i++) { const x = i / grid; pdfA.push(betaPdf(x, aA, bA)); pdfB.push(betaPdf(x, aB, bB)); }
  const out: { x: number; y: number }[] = [];
  for (let k = 0; k < points; k++) {
    const d = -1 + (2 * k) / (points - 1);
    let s = 0;
    for (let i = 0; i <= grid; i++) {
      const xb = i / grid; const xa = xb - d;
      if (xa < 0 || xa > 1) continue;
      const j = Math.round(xa * grid);
      s += pdfB[i] * pdfA[j] / grid;
    }
    out.push({ x: d, y: s });
  }
  return out;
}
