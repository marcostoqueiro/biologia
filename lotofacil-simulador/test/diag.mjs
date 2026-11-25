// Diagnóstico de mistura: node test/diag.mjs N '{"rpm":70}'
import { Draw, DEFAULTS } from '../src/physics.js';
const N = Number(process.argv[2] || 100), cfg = JSON.parse(process.argv[3] || '{}');
const freq = new Array(26).fill(0); let wallTop = 0, samples = 0, tsum = 0, inc = 0, hsum = 0;
for (let i = 0; i < N; i++) {
  const d = new Draw(cfg, 5000 + i); let k = 0;
  const max = 300 / d.p.dt;
  while (!d.done && k++ < max) {
    d.step();
    if (k % 300 === 0 && d.time > 3) for (const b of d.balls) if (b.active) {
      samples++; hsum += b.y;
      if (b.y > 0 && Math.hypot(b.x, b.y) > d.p.globeRadius - b.r - 0.01) wallTop++;
    }
  }
  if (!d.done) inc++; tsum += d.time;
  for (const n of d.drawn) freq[n]++;
}
const e = N * 15 / 25; let chi = 0; for (let n = 1; n <= 25; n++) chi += (freq[n] - e) ** 2 / e;
console.log(JSON.stringify(cfg), `qui²=${(chi / 0.4).toFixed(1)} incompletos=${inc} dur=${(tsum / N).toFixed(0)}s coladasNoTopo=${(100 * wallTop / samples).toFixed(1)}% alturaMédia=${(100 * hsum / samples).toFixed(1)}cm`);
