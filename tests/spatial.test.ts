import { describe, expect, it } from 'vitest';
import { spatial } from '../src';

const pts = (xy: [number, number][]) => xy.map(([x, y], i) => ({ id: String.fromCharCode(65 + i), x, y }));
const box = { x: 0, y: 0, w: 100, h: 100 };

describe('spatial.quadtree', () => {
  it('splits only when a leaf holds more than capacity', () => {
    const one = spatial.buildQuadtree(pts([[10, 10]]), box);
    expect(one.children).toBeNull();
    const two = spatial.buildQuadtree(pts([[10, 10], [90, 90]]), box);
    expect(two.children?.map((c) => c.points.map((p) => p.id))).toEqual([['A'], [], [], ['B']]);
    expect(spatial.buildQuadtree(pts([[10, 10], [90, 90]]), box, { capacity: 2 }).children).toBeNull();
  });
  it('paths name quadrants: digit = east + 2·south', () => {
    const t = spatial.buildQuadtree(pts([[10, 10], [20, 20], [90, 90]]), box);
    // A and B share NW (0) and then NW-of-NW (00), so 00 splits too: A goes NW, B SE
    expect(spatial.leafAt(t, { x: 10, y: 10 }).path).toBe('000');
    expect(spatial.leafAt(t, { x: 20, y: 20 }).path).toBe('003');
    expect(spatial.leafAt(t, { x: 30, y: 20 }).path).toBe('01');
    expect(spatial.nodeAt(t, '3')?.points.map((p) => p.id)).toEqual(['C']);
  });
  it('maxDepth stops duplicates splitting forever', () => {
    const t = spatial.buildQuadtree(pts([[5, 5], [5, 5]]), box, { maxDepth: 3 });
    expect(spatial.leafAt(t, { x: 5, y: 5 }).depth).toBe(3);
  });
  it('range query finds exactly what a linear scan finds, and prunes', () => {
    let s = 7;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647) * 100;
    const all = Array.from({ length: 200 }, (_, i) => ({ id: `p${i}`, x: rnd(), y: rnd() }));
    const t = spatial.buildQuadtree(all, box, { capacity: 4 });
    const range = { x: 20, y: 30, w: 15, h: 25 };
    const q = spatial.queryRange(t, range);
    const scan = all.filter((p) => p.x >= 20 && p.x <= 35 && p.y >= 30 && p.y <= 55);
    expect(q.found.map((p) => p.id).sort()).toEqual(scan.map((p) => p.id).sort());
    expect(q.checked.length).toBeLessThan(all.length / 2);
    expect(q.pruned.size).toBeGreaterThan(0);
  });
});

describe('spatial.tiles', () => {
  it('projects the corners and the equator', () => {
    const c = spatial.project(0, 0);
    expect(c.x).toBeCloseTo(0.5);
    expect(c.y).toBeCloseTo(0.5);
    expect(spatial.project(-180, spatial.MAX_LAT).y).toBeCloseTo(0);
    const back = spatial.unproject(spatial.project(151.2, -33.87).x, spatial.project(151.2, -33.87).y);
    expect(back.lon).toBeCloseTo(151.2);
    expect(back.lat).toBeCloseTo(-33.87);
  });
  it('finds the OSM tile for a place', () => {
    // London at zoom 10 is the well-known tile 10/511/340
    expect(spatial.tileAt(-0.1276, 51.5072, 10)).toEqual({ z: 10, x: 511, y: 340 });
  });
  it('quadkeys round-trip and match the Bing example', () => {
    // From the Bing Maps tile system docs: tile (3, 5) at level 3 is quadkey "213"
    expect(spatial.quadkey({ z: 3, x: 3, y: 5 })).toBe('213');
    for (const q of ['', '0', '3', '1203', '33210']) expect(spatial.quadkey(spatial.fromQuadkey(q))).toBe(q);
  });
  it('a quadkey is the quadtree path of the tile square', () => {
    const t = { z: 4, x: 9, y: 6 };
    const b = spatial.tileBox(t);
    // two points in the same z4 tile keep splitting until maxDepth = 4: their leaf IS the tile
    const a = { id: 'a', x: b.x + b.w * 0.3, y: b.y + b.h * 0.3 }, c = { id: 'c', x: b.x + b.w * 0.4, y: b.y + b.h * 0.4 };
    const tree = spatial.buildQuadtree([a, c], { x: 0, y: 0, w: 1, h: 1 }, { maxDepth: 4 });
    expect(spatial.leafAt(tree, a).path).toBe(spatial.quadkey(t));
  });
  it('tilesCovering covers a box with the right count', () => {
    expect(spatial.tilesCovering({ x: 0, y: 0, w: 1, h: 1 }, 2)).toHaveLength(16);
    expect(spatial.tilesCovering({ x: 0.3, y: 0.3, w: 0.1, h: 0.1 }, 3).map(spatial.tileKey)).toEqual(['3/2/2', '3/3/2', '3/2/3', '3/3/3']);
  });
});
