// Gera um único arquivo HTML autônomo (abre com duplo clique, sem servidor nem internet).
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';

const out = await build({
  entryPoints: ['src/main.js'],
  bundle: true,
  minify: true,
  format: 'iife',
  write: false,
  legalComments: 'none',
});
const js = out.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const html = readFileSync('src/template.html', 'utf8').replace('/*__BUNDLE__*/', () => js);
writeFileSync('lotofacil-simulador.html', html);
console.log(`lotofacil-simulador.html: ${(html.length / 1024).toFixed(0)} KB`);
