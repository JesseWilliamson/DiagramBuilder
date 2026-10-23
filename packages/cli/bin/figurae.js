#!/usr/bin/env node
// figurae: copy diagram components into your app, shadcn-style.
//
//   figurae list
//   figurae add <name...> [--dir <path>] [--force]
//
// Why the registry ships inside this package: the repository is private, so a
// raw GitHub fetch of the component files would 404 for everyone else. npm is
// the one place users can already reach, so build.mjs copies registry/ into
// packages/cli/registry/ and `files` publishes it. The bin finds the index
// next to itself, so `npx @figurae/cli add x` works offline once downloaded
// and always matches the version of the library the components were tested with.
// In a checkout of the repo, where nothing has been built, it falls back to the
// repo's own registry/.
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const here = path.dirname(fileURLToPath(import.meta.url));
const registry = [path.join(here, '../registry'), path.join(here, '../../../registry')]
  .find((d) => existsSync(path.join(d, 'index.json')));

const usage = `usage: figurae list
       figurae add <name...> [--dir <path>] [--force]

  --dir    where to copy to (default ./src/components/figurae)
  --force  overwrite files that already exist`;

const fail = (msg) => {
  console.error(msg);
  process.exit(1);
};

let args;
try {
  args = parseArgs({
    allowPositionals: true,
    options: { dir: { type: 'string', default: './src/components/figurae' }, force: { type: 'boolean', default: false }, help: { type: 'boolean', short: 'h' } },
  });
} catch (e) {
  fail(`${e.message}\n${usage}`);
}
const [command, ...names] = args.positionals;
if (args.values.help || !command) fail(usage);
if (!registry) fail('figurae: registry not found (is the package built? run `npm run build`).');
const index = JSON.parse(readFileSync(path.join(registry, 'index.json'), 'utf8'));

if (command === 'list') {
  const width = Math.max(...index.map((e) => e.name.length));
  for (const e of index) console.log(`${e.name.padEnd(width)}  ${e.group.padEnd(6)}  ${e.title}`);
} else if (command === 'add') {
  if (!names.length) fail(`figurae add: name at least one component (see \`figurae list\`).\n${usage}`);
  const entries = names.map((n) => index.find((e) => e.name === n) ?? fail(`figurae add: no component called '${n}' (see \`figurae list\`).`));
  const dir = path.resolve(args.values.dir);
  // Check everything first, so a refused name leaves nothing half-copied.
  for (const e of entries) {
    if (existsSync(path.join(dir, e.file)) && !args.values.force) fail(`figurae add: ${path.join(args.values.dir, e.file)} already exists (use --force to overwrite).`);
  }
  mkdirSync(dir, { recursive: true });
  for (const e of entries) {
    copyFileSync(path.join(registry, e.file), path.join(dir, e.file));
    console.log(`added ${path.join(args.values.dir, e.file)}`);
  }
  const packages = [...new Set(entries.flatMap((e) => e.packages))].sort();
  console.log(`\nnpm install ${packages.join(' ')}`);
} else {
  fail(`figurae: unknown command '${command}'.\n${usage}`);
}
