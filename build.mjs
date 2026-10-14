// Build: tsc → dist/esm (ES modules + .d.ts), then a dependency-free bundler
// that concatenates those modules into dist/dsviz.iife.js (global `DV`) and
// dist/dsviz.js (single-file ESM). It works because the library has no
// runtime dependencies and every top-level name is unique across files.
// (In a real repo, swap this for esbuild/tsup/Vite library mode.)
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

execSync('tsc -p .', { stdio: 'inherit' });
const root = path.resolve('dist/esm');
const order = [];
const seen = new Set();
const exportsList = [];

function visit(file) {
  if (seen.has(file)) return;
  seen.add(file);
  const src = fs.readFileSync(file, 'utf8');
  for (const m of src.matchAll(/^(?:import|export)[^;]*?from\s+['"](\.[^'"]+)['"];?/gms)) {
    let dep = path.resolve(path.dirname(file), m[1]);
    if (!dep.endsWith('.js')) dep += '.js';
    visit(dep);
  }
  order.push(file);
}
visit(path.join(root, 'index.js'));

let body = '';
for (const file of order) {
  let src = fs.readFileSync(file, 'utf8');
  src = src.replace(/^(?:import|export)[^;]*?from\s+['"][^'"]+['"];?\s*$/gms, '');
  src = src.replace(/^export \{\};?\s*$/gm, '');
  src = src.replace(/^export (const|let|function|class|async function) ([A-Za-z0-9_$]+)/gm, (_, kw, name) => {
    exportsList.push(name);
    return `${kw} ${name}`;
  });
  body += `// ── ${path.relative(root, file)} ──\n${src.trim()}\n\n`;
}
const names = [...new Set(exportsList)].sort();
fs.writeFileSync('dist/dsviz.iife.js', `/* dsviz — MIT */\nvar DV = (function () {\n'use strict';\n${body}return { ${names.join(', ')} };\n})();\n`);
fs.writeFileSync('dist/dsviz.js', `/* dsviz — MIT */\n${body}export { ${names.join(', ')} };\n`);
console.log(`bundled ${order.length} modules, ${names.length} exports`);

// Demo site: inline the IIFE bundle into the page template.
const tpl = fs.readFileSync('site/template.html', 'utf8');
const iife = fs.readFileSync('dist/dsviz.iife.js', 'utf8');
fs.writeFileSync('site/index.html', tpl.replace('/*__DSVIZ__*/', () => iife));
console.log('wrote site/index.html');
