// Roda N sorteios sem interface e confere se as 25 dezenas saem com a mesma frequência.
// Uso: node test/uniformidade.mjs [N]
import { runDraw, DEFAULTS } from '../src/physics.js';

const N = Number(process.argv[2] || 500);
const freq = new Array(26).fill(0);
let incompletos = 0, tempo = 0;
const t0 = Date.now();
for (let i = 0; i < N; i++) {
  const r = runDraw({}, 1000 + i);
  if (!r.complete) incompletos++;
  tempo += r.time;
  for (const n of r.order) freq[n]++;
}
const esperado = (N * DEFAULTS.picks) / DEFAULTS.total;
let chi2 = 0;
for (let n = 1; n <= 25; n++) chi2 += (freq[n] - esperado) ** 2 / esperado;
// Cada dezena é uma binomial com p = 15/25; a soma abaixo corrige a variância
// (amostragem sem reposição) para comparar com qui-quadrado de 24 graus de liberdade.
const chi2corr = chi2 / (1 - DEFAULTS.picks / DEFAULTS.total);
console.log(`sorteios: ${N}  incompletos: ${incompletos}  duração média simulada: ${(tempo / N).toFixed(1)} s`);
console.log(`tempo de CPU: ${((Date.now() - t0) / N).toFixed(0)} ms por sorteio`);
console.log('frequências:', freq.slice(1).join(' '));
console.log(`esperado por dezena: ${esperado}  qui² (24 gl): ${chi2corr.toFixed(1)}  (limite 5%: 36.4)`);
