import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildIndex, packagesOf } from '../scripts/registry.mjs';

const committed = readFileSync('registry/index.json', 'utf8');
const entries = JSON.parse(committed) as { name: string; file: string; packages: string[] }[];

describe('registry/index.json', () => {
  it('is up to date (run `npm run registry`)', async () => {
    expect(await buildIndex()).toBe(committed);
  });
  it('names every file once and only packages that exist here', () => {
    expect(new Set(entries.map((e) => e.name)).size).toBe(entries.length);
    for (const e of entries) {
      expect(existsSync(`registry/${e.file}`), e.file).toBe(true);
      expect(e.packages, e.name).toEqual(['dsviz']);
    }
  });
  it('reads packages from import lines', () => {
    expect(packagesOf(`import { a } from 'dsviz/ds';\nimport x from 'react';\nimport { b } from './b';\nimport { c } from '@scope/pkg/sub';`)).toEqual(['@scope/pkg', 'dsviz']);
  });
});
