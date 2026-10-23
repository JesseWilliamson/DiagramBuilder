// Generates registry/index.json: one entry per component file in registry/.
//
// Metadata (title, description, group) is NOT repeated in the components. It
// lives in site/examples.ts, which already orders the examples page, so there
// is one list to edit. The only thing read from a component is its import
// lines, which say which npm packages the app needs once it owns the file.
//
//   npm run registry     rewrite registry/index.json
//   tests/registry.test.ts compares buildIndex() with the committed file
import { transform } from 'esbuild';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dir = `${root}registry/`;

export const kebab = (name) => name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

/** The npm packages a source file imports, sorted; react itself is the app's own. */
export function packagesOf(source) {
  const found = new Set();
  for (const m of source.matchAll(/^\s*import\b[^'"]*?['"]([^'"]+)['"]/gm)) {
    const spec = m[1];
    if (spec.startsWith('.') || spec === 'react' || spec.startsWith('react/')) continue;
    // '@scope/name/sub' -> '@scope/name', 'name/sub' -> 'name'
    found.add(spec.split('/').slice(0, spec.startsWith('@') ? 2 : 1).join('/'));
  }
  return [...found].sort();
}

async function loadGroups() {
  const ts = readFileSync(`${root}site/examples.ts`, 'utf8');
  const { code } = await transform(ts, { loader: 'ts', format: 'esm' });
  return (await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)).groups;
}

/** The index as the string that belongs in registry/index.json. */
export async function buildIndex() {
  const files = readdirSync(dir).filter((f) => f.endsWith('.tsx')).sort();
  const entries = [];
  for (const group of await loadGroups()) {
    for (const it of group.items) {
      const file = `${it.name}.tsx`;
      if (!files.includes(file)) throw new Error(`site/examples.ts lists ${it.name}, but registry/${file} does not exist`);
      entries.push({
        name: kebab(it.name),
        title: it.title,
        description: it.desc,
        group: group.id,
        file,
        packages: packagesOf(readFileSync(dir + file, 'utf8')),
      });
    }
  }
  const listed = new Set(entries.map((e) => e.file));
  const orphan = files.find((f) => !listed.has(f));
  if (orphan) throw new Error(`registry/${orphan} is not listed in site/examples.ts`);
  return JSON.stringify(entries, null, 2) + '\n';
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeFileSync(`${dir}index.json`, await buildIndex());
  console.log('wrote registry/index.json');
}
