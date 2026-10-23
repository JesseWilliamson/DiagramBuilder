import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const bin = path.resolve('packages/cli/bin/figurae.js');
const tmp = mkdtempSync(path.join(tmpdir(), 'figurae-cli-'));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));
const run = (...a: string[]) => spawnSync('node', [bin, ...a], { cwd: tmp, encoding: 'utf8' });

describe('figurae CLI', () => {
  it('lists the registry', () => {
    const r = run('list');
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/binary-search\s+ds\s+Binary search/);
    expect(r.stdout.trim().split('\n').length).toBe(JSON.parse(readFileSync('registry/index.json', 'utf8')).length);
  });
  it('adds a component and prints the install line', () => {
    const r = run('add', 'binary-search', '--dir', 'out');
    expect(r.status).toBe(0);
    expect(readFileSync(path.join(tmp, 'out/BinarySearch.tsx'), 'utf8')).toBe(readFileSync('registry/BinarySearch.tsx', 'utf8'));
    expect(r.stdout).toContain('npm install @figurae/core @figurae/ds @figurae/react');
  });
  it('refuses to overwrite, then overwrites with --force', () => {
    writeFileSync(path.join(tmp, 'out/BinarySearch.tsx'), 'mine');
    const refused = run('add', 'binary-search', '--dir', 'out');
    expect(refused.status).toBe(1);
    expect(refused.stderr).toContain('already exists');
    expect(readFileSync(path.join(tmp, 'out/BinarySearch.tsx'), 'utf8')).toBe('mine');
    expect(run('add', 'binary-search', '--dir', 'out', '--force').status).toBe(0);
    expect(readFileSync(path.join(tmp, 'out/BinarySearch.tsx'), 'utf8')).not.toBe('mine');
  });
  it('copies nothing when one name is unknown', () => {
    const r = run('add', 'riemann', 'nope', '--dir', 'out2');
    expect(r.status).toBe(1);
    expect(existsSync(path.join(tmp, 'out2'))).toBe(false);
  });
  it('runs under plain node with no arguments', () => {
    expect(() => execFileSync('node', [bin], { stdio: 'pipe' })).toThrow();
  });
});
