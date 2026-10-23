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
      for (const p of e.packages) expect(existsSync(`packages/${p.replace('@figurae/', '')}/package.json`), `${e.name}: ${p}`).toBe(true);
    }
  });
  it('reads packages from import lines', () => {
    expect(packagesOf(`import { a } from '@figurae/ds';\nimport x from 'react';\nimport { b } from './b';\nimport { c } from '@figurae/core/sub';`)).toEqual(['@figurae/core', '@figurae/ds']);
  });
});
