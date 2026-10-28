// Library build: esbuild turns each file in src/ into its own ES module in
// dist/ (tsc emits only the .d.ts files, see tsconfig.build.json). The
// families are subpath exports of the one package (package.json "exports"):
// `dsviz` is src/core, `dsviz/ds` is src/ds, and so on.
//
// One module per file, not one bundle, so an app's bundler can tree-shake it.
// A bundle has to build the namespace exports as objects at load time, and an
// object that names every function in a family keeps every one of them alive:
// a page that drew a single array used to carry the whole library. As separate
// modules, `export * from './array'` is a static re-export, and whatever
// nobody imports is dropped.
//
// esbuild leaves import paths as written ('./vec', '../core'), which bundlers
// resolve but Node's ESM loader does not, so each relative import is pointed at
// the file it means ('./vec.js', '../core/index.js'). Imports of React and
// Radix stay imports, so the app's copies are the ones that run.
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const files = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(f) && !f.endsWith('.d.ts') ? [p] : [];
  });

const src = 'src', dist = 'dist';
rmSync(dist, { recursive: true, force: true });

await build({
  entryPoints: files(src),
  outdir: dist,
  outbase: src,
  bundle: false,
  format: 'esm',
  target: 'es2022',
  jsx: 'automatic',
  sourcemap: true,
});

// './vec' → './vec.js', '../core' → '../core/index.js', checked against src/ so a
// path that matches neither is an error here rather than in someone's app.
const relative = /(\bfrom\s*|\bimport\s*\(?\s*)(['"])(\.\.?\/[^'"]+)\2/g;
for (const js of files(src).map((f) => path.join(dist, path.relative(src, f)).replace(/\.tsx?$/, '.js'))) {
  const dir = path.join(src, path.relative(dist, path.dirname(js)));
  const code = readFileSync(js, 'utf8').replace(relative, (_, lead, q, spec) => {
    if (/\.js$/.test(spec)) return `${lead}${q}${spec}${q}`;
    const target = path.join(dir, spec);
    if (existsSync(`${target}.ts`) || existsSync(`${target}.tsx`)) return `${lead}${q}${spec}.js${q}`;
    if (existsSync(path.join(target, 'index.ts'))) return `${lead}${q}${spec}/index.js${q}`;
    throw new Error(`${js}: cannot resolve ${spec}`);
  });
  writeFileSync(js, code);
}

execFileSync('npx', ['tsc', '-p', 'tsconfig.build.json'], { stdio: 'inherit' });
console.log(`built ${dist}/`);
