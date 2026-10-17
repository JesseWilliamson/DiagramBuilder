// Library build: esbuild turns every file in src/ into its own ES module in
// dist/ (tsc emits only the .d.ts files, see tsconfig.build.json).
//
// One module per file, not one bundle, so an app's bundler can tree-shake it.
// A bundle has to build the namespace exports (`plot`, `sys`, …) as objects
// at load time, and an object that names every function in a family keeps
// every one of them alive: a page that drew a single array used to carry the
// whole library. As separate modules, `export * as plot from './plot/index.js'`
// is a static re-export, and whatever nobody imports is dropped.
//
// esbuild leaves import paths as written ('./vec'), which bundlers resolve but
// Node's ESM loader does not, so each relative import is pointed at the file
// it means ('./vec.js', './ds/index.js'). React and Radix stay imports, so the
// app's copies are the ones that run.
import { build } from 'esbuild';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const files = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(f) && !f.endsWith('.d.ts') ? [p] : [];
  });

await build({
  entryPoints: files('src'),
  outdir: 'dist',
  outbase: 'src',
  bundle: false,
  format: 'esm',
  target: 'es2022',
  jsx: 'automatic',
  sourcemap: true,
});

// './vec' → './vec.js', './ds' → './ds/index.js', checked against src/ so a
// path that matches neither is an error here rather than in someone's app.
const relative = /(\bfrom\s*|\bimport\s*\(?\s*)(['"])(\.\.?\/[^'"]+)\2/g;
for (const js of files('src').map((f) => f.replace(/^src/, 'dist').replace(/\.tsx?$/, '.js'))) {
  const dir = path.dirname(js).replace(/^dist/, 'src');
  const code = readFileSync(js, 'utf8').replace(relative, (_, lead, q, spec) => {
    if (/\.js$/.test(spec)) return `${lead}${q}${spec}${q}`;
    const target = path.join(dir, spec);
    if (existsSync(`${target}.ts`) || existsSync(`${target}.tsx`)) return `${lead}${q}${spec}.js${q}`;
    if (existsSync(path.join(target, 'index.ts'))) return `${lead}${q}${spec}/index.js${q}`;
    throw new Error(`${js}: cannot resolve ${spec}`);
  });
  writeFileSync(js, code);
}
console.log('built dist/');
