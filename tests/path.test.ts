import { describe, expect, it } from 'vitest';
import { bounds, combine, namespace, path, translate } from '../src/scene';
import { dotData, pathData, resample, resampleProps } from '../src/path';

describe('pathData', () => {
  it('draws straight segments, closing with Z', () => {
    expect(pathData([[0, 0], [10, 0], [10, 10]], false, false)).toBe('M0 0L10 0L10 10');
    expect(pathData([[0, 0], [10, 0], [10, 10]], true, false)).toBe('M0 0L10 0L10 10L0 0Z');
  });
  it('smooth curves pass through every point (end of each C is the next point)', () => {
    const d = pathData([[0, 0], [10, 10], [20, 0]], false, true);
    expect(d.startsWith('M0 0C')).toBe(true);
    expect(d.endsWith('10 10')).toBe(false);
    expect(d.endsWith('20 0')).toBe(true);
  });
});

describe('dotData', () => {
  it('draws one zero-length segment per point', () => {
    expect(dotData([[0, 0], [10.123, 5]])).toBe('M0 0h0M10.12 5h0');
  });
});

describe('resample', () => {
  it('keeps endpoints of an open path and spaces points by length', () => {
    const out = resample([[0, 0], [10, 0]], 5);
    expect(out.map((p) => p[0])).toEqual([0, 2.5, 5, 7.5, 10]);
  });
  it('is length-aware across uneven segments', () => {
    // L-shape: 10 right then 10 down; the midpoint by length is the corner
    const out = resample([[0, 0], [10, 0], [10, 10]], 3);
    expect(out[1]).toEqual([10, 0]);
    expect(out[2]).toEqual([10, 10]);
  });
  it('closed shapes do not repeat the start point', () => {
    const out = resample([[0, 0], [4, 0], [4, 4], [0, 4]], 4, true);
    expect(out).toEqual([[0, 0], [4, 0], [4, 4], [0, 4]]);
  });
  it('works on the flat numeric bag the renderer tweens', () => {
    const bag = { p0: 0, p1: 0, p2: 10, p3: 0 };
    expect(resampleProps(bag, 2, 3, false)).toEqual({ p0: 0, p1: 0, p2: 5, p3: 0, p4: 10, p5: 0 });
  });
});

describe('scene helpers with paths', () => {
  const tri = path({ id: 't', points: [[0, 0], [10, 0], [5, 8]], closed: true, width: 2 });
  it('bounds include stroke width', () => {
    expect(bounds(tri)).toEqual({ x: -1, y: -1, w: 12, h: 10 });
  });
  it('translate moves points', () => {
    const t = translate(tri, 5, 5).nodes[0];
    expect(t.kind === 'path' && t.points[0]).toEqual([5, 5]);
  });
  it('namespace prefixes ids', () => {
    expect(namespace(combine(tri), 'a').nodes[0].id).toBe('a/t');
  });
});
