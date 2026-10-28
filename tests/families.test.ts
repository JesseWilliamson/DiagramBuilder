import { describe, expect, it } from 'vitest';
import { fitViewBox, nextCamera, rect, V2 } from 'dsviz';
import { grid, hashMap } from 'dsviz/ds';
import { angleAt, circleIntersections, circumcircle, footOfPerpendicular, lineIntersection } from 'dsviz/geom';
import { gantt, hex, simulate, stackHeap } from 'dsviz/os';
import { clipToPlane, fn, integrate, niceTicks, plane, riemann } from 'dsviz/plot';
import { probTree, vennAreas, vennRegionAt, vennRegions } from 'dsviz/prob';

const close = (a: number, b: number, eps = 1e-6) => expect(Math.abs(a - b)).toBeLessThan(eps);

describe('geom', () => {
  it('angleAt gives the interior angle', () => {
    close(angleAt(V2(1, 0), V2(0, 0), V2(0, 1)), Math.PI / 2);
    close(angleAt(V2(1, 0), V2(0, 0), V2(-1, 0)), Math.PI);
  });
  it('circumcircle of a right triangle is centred on the hypotenuse', () => {
    const c = circumcircle(V2(0, 0), V2(4, 0), V2(0, 3))!;
    close(c.center.x, 2);
    close(c.center.y, 1.5);
    close(c.r, 2.5);
    expect(circumcircle(V2(0, 0), V2(1, 1), V2(2, 2))).toBeNull();
  });
  it('circle intersections', () => {
    const pts = circleIntersections(V2(0, 0), 1, V2(1, 0), 1);
    expect(pts).toHaveLength(2);
    for (const p of pts) close(Math.hypot(p.x, p.y), 1);
    expect(circleIntersections(V2(0, 0), 1, V2(5, 0), 1)).toHaveLength(0);
  });
  it('foot of perpendicular and line intersection', () => {
    const f = footOfPerpendicular(V2(2, 5), V2(0, 0), V2(10, 0));
    expect(f).toEqual({ x: 2, y: 0 });
    expect(lineIntersection(V2(0, 0), V2(1, 1), V2(0, 1), V2(1, 0))).toEqual({ x: 0.5, y: 0.5 });
  });
});

describe('prob.venn', () => {
  const a = { x: 0, y: 0, r: 1 }, b = { x: 1, y: 0, r: 1 };
  it('lens area matches the closed form for unit circles one radius apart', () => {
    close(vennAreas(a, b).both, (2 * Math.PI) / 3 - Math.sqrt(3) / 2);
  });
  it('region boundaries are continuous (each arc ends where the next starts)', () => {
    const r = vennRegions(a, b);
    for (const pts of [r.both, r.aOnly, r.bOnly]) {
      const h = pts.length / 2;
      close(pts[h - 1][0], pts[h][0], 1e-9);
      close(pts[h - 1][1], pts[h][1], 1e-9);
      close(pts[pts.length - 1][0], pts[0][0], 1e-9);
      close(pts[pts.length - 1][1], pts[0][1], 1e-9);
    }
  });
  it('lens points lie in both circles', () => {
    for (const [x, y] of vennRegions(a, b).both) {
      expect(Math.hypot(x - a.x, y - a.y)).toBeLessThanOrEqual(1 + 1e-9);
      expect(Math.hypot(x - b.x, y - b.y)).toBeLessThanOrEqual(1 + 1e-9);
    }
  });
  it('regionAt classifies points', () => {
    expect(vennRegionAt(V2(0.5, 0), a, b)).toBe('both');
    expect(vennRegionAt(V2(-0.5, 0), a, b)).toBe('aOnly');
    expect(vennRegionAt(V2(5, 5), a, b)).toBe('neither');
  });
});

describe('probTree', () => {
  it('leaf products multiply along the path', () => {
    const t = probTree({
      key: 'r', label: 'start', children: [
        { key: 'a', label: 'A', p: 0.3, children: [{ key: 'x', label: 'x', p: 0.5 }, { key: 'y', label: 'y', p: 0.5 }] },
        { key: 'b', label: 'B', p: 0.7 },
      ],
    });
    expect(t.leaves.map((l) => [l.path, +l.p.toFixed(6)])).toEqual([['r/a/x', 0.15], ['r/a/y', 0.15], ['r/b', 0.7]]);
  });
});

describe('simulate', () => {
  const procs = [
    { id: 'P1', arrival: 0, burst: 5 },
    { id: 'P2', arrival: 1, burst: 3 },
    { id: 'P3', arrival: 2, burst: 1 },
  ];
  it('fcfs runs in arrival order', () => {
    const s = simulate(procs, 'fcfs');
    expect(s.segments).toEqual([{ id: 'P1', start: 0, end: 5 }, { id: 'P2', start: 5, end: 8 }, { id: 'P3', start: 8, end: 9 }]);
    close(s.avgWaiting, (0 + 4 + 6) / 3);
  });
  it('sjf picks the shortest ready job when the CPU frees up', () => {
    expect(simulate(procs, 'sjf').segments.map((x) => x.id)).toEqual(['P1', 'P3', 'P2']);
  });
  it('srtf preempts for a shorter job', () => {
    expect(simulate(procs, 'srtf').segments).toEqual([
      { id: 'P1', start: 0, end: 1 }, { id: 'P2', start: 1, end: 2 }, { id: 'P3', start: 2, end: 3 },
      { id: 'P2', start: 3, end: 5 }, { id: 'P1', start: 5, end: 9 },
    ]);
  });
  it('round robin shares the CPU in quanta', () => {
    const s = simulate(procs, 'rr', 2);
    expect(s.segments.map((x) => `${x.id}:${x.start}-${x.end}`)).toEqual(['P1:0-2', 'P2:2-4', 'P3:4-5', 'P1:5-7', 'P2:7-8', 'P1:8-9']);
    expect(s.end).toBe(9);
  });
});

describe('plot', () => {
  const p = plane({ x: [-5, 5], y: [-5, 5], width: 100, height: 100 });
  it('maps world to pixels with y up, and back', () => {
    expect(p.toPx(0, 0)).toEqual({ x: 50, y: 50 });
    expect(p.toPx(5, 5)).toEqual({ x: 100, y: 0 });
    expect(p.toWorld(100, 0)).toEqual({ x: 5, y: 5 });
  });
  it('splits 1/x at the asymptote', () => {
    expect(fn(p, (x) => 1 / x, { samples: 101 }).nodes.length).toBe(2);
    expect(fn(p, Math.sin).nodes.length).toBe(1);
  });
  it('riemann sums converge on the integral', () => {
    close(riemann(p, (x) => x * x, 0, 1, 1000, 'mid').sum, 1 / 3, 1e-6);
    close(integrate((x) => x * x, 0, 1), 1 / 3, 1e-9);
  });
  it('niceTicks', () => {
    expect(niceTicks(0, 10, 5)).toEqual([0, 2, 4, 6, 8, 10]);
  });
});

describe('mem', () => {
  it('hex formats the low digits', () => {
    expect(hex(0x7ffc1004)).toBe('0x1004');
    expect(hex(255, 2)).toBe('0xff');
  });
  it('stackHeap draws one arrow per reference', () => {
    const s = stackHeap(
      [{ name: 'Global', vars: [{ name: 'a', value: { ref: 'L' } }, { name: 'b', value: { ref: 'L' } }, { name: 'n', value: 3 }] }],
      [{ id: 'L', kind: 'list', items: [1, 2] }],
    );
    expect(s.nodes.filter((n) => n.kind === 'arrow')).toHaveLength(2);
  });
});

describe('lesson facts', () => {
  it('SRTF gives the lowest average wait for the scheduling lesson’s processes', () => {
    const procs = [
      { id: 'P1', arrival: 0, burst: 6 }, { id: 'P2', arrival: 1, burst: 3 }, { id: 'P3', arrival: 2, burst: 1 },
      { id: 'P4', arrival: 4, burst: 4 }, { id: 'P5', arrival: 6, burst: 2 },
    ];
    const avg = Object.fromEntries((['fcfs', 'sjf', 'srtf', 'rr'] as const).map((p) => [p, simulate(procs, p, 2).avgWaiting]));
    expect(Math.min(...Object.values(avg))).toBe(avg.srtf);
    expect(Object.values(avg).filter((v) => v === avg.srtf)).toHaveLength(1);
  });
});


describe('camera', () => {
  it('stays put while the content fits', () => {
    expect(nextCamera([0, 0, 100, 100], [10, 10, 80, 80])).toEqual([0, 0, 100, 100]);
  });
  it('grows to include content that would fall outside', () => {
    expect(nextCamera([0, 0, 100, 100], [50, 50, 100, 20])).toEqual([0, 0, 150, 100]);
  });
  it('shrinks only when the content fills less than half the frame', () => {
    expect(nextCamera([0, 0, 100, 100], [10, 10, 40, 40])).toEqual([10, 10, 40, 40]);
  });
  it("'fit' always refits, and boxes snap outward to whole units", () => {
    expect(nextCamera([0, 0, 100, 100], [10.4, 10.6, 50.2, 60], 'fit')).toEqual([10, 10, 51, 61]);
  });
  it('fitViewBox covers every frame', () => {
    const frames = [rect({ id: 'a', x: 0, y: 0, w: 10, h: 10 }), rect({ id: 'a', x: 100, y: 0, w: 10, h: 10 })];
    expect(fitViewBox(frames, 5)).toEqual([-10, -10, 120, 20]);
  });
});

describe('clipToPlane', () => {
  const p = plane({ x: [0, 10], y: [0, 10], width: 100, height: 100 });
  it('keeps a segment that is already inside', () => {
    expect(clipToPlane(p, { x: 1, y: 1 }, { x: 9, y: 9 })).toEqual([{ x: 1, y: 1 }, { x: 9, y: 9 }]);
  });
  it('cuts a segment at the edges it crosses', () => {
    expect(clipToPlane(p, { x: -5, y: 5 }, { x: 15, y: 5 })).toEqual([{ x: 0, y: 5 }, { x: 10, y: 5 }]);
  });
  it('returns null for a segment that misses the box', () => {
    expect(clipToPlane(p, { x: -5, y: -5 }, { x: -1, y: 20 })).toBeNull();
  });
});

describe('gantt segments with their own lane, label and tone', () => {
  it('puts several ids in one lane, labelled and toned per bar', () => {
    const g = gantt(
      [
        { id: 'r1', lane: 'server', start: 0, end: 2, label: 'v1', tone: 'accent' },
        { id: 'r2', lane: 'server', start: 3, end: 5, label: 'v2', tone: 'success' },
      ],
      { lanes: ['server'] },
    );
    const bar = (k: string) => g.nodes.find((n) => n.id === `gantt:bar:${k}:0`) as { y: number; tone?: string };
    expect(bar('r1').y).toBe(g.laneY('server'));
    expect(bar('r2').y).toBe(g.laneY('server'));
    expect(bar('r2').tone).toBe('success');
    expect(g.nodes.find((n) => n.id === 'gantt:bar:r2:0:t')).toMatchObject({ text: 'v2' });
  });
});

describe('grid cells that are not square', () => {
  it('lays out by width and height, and anchors on the edges', () => {
    const g = grid([['a', 'b'], ['c', 'd']], { cellWidth: 100, cellHeight: 30, gap: 10 });
    expect(g.center(1, 1)).toEqual({ x: 160, y: 55 });
    expect(g.right(0, 0)).toEqual({ x: 100, y: 15 });
    expect(g.bottom(0, 0)).toEqual({ x: 50, y: 30 });
    const value = g.nodes.find((n) => n.id === 'grid:val:0,0') as { size: number };
    expect(value.size).toBe(Math.round(30 * 0.38));
  });
});

describe('gantt labels', () => {
  it('are left off a bar too narrow to hold them, such as one cut short by now', () => {
    const seg = [{ id: 'v2', lane: 'server', start: 0, end: 10, label: 'version 9f2c' }];
    const has = (now: number) => gantt(seg, { lanes: ['server'], now }).nodes.some((n) => n.id === 'gantt:bar:v2:0:t');
    expect(has(10)).toBe(true);
    expect(has(1)).toBe(false);
  });
});

describe('hashMap', () => {
  it('draws a Map or pairs as key and value cells, keyed by the key', () => {
    const m = hashMap(new Map([[7, 0], [2, 1]]));
    expect(m.size).toBe(2);
    expect(m.nodes.some((n) => n.id === 'map:row:7:k')).toBe(true);
    expect(m.nodes.find((n) => n.id === 'map:row:2:vt')).toMatchObject({ text: '1' });
    expect(m.keyAt(2)!.y).toBeGreaterThan(m.keyAt(7)!.y);
    expect(m.valueAt(7)!.x).toBeGreaterThan(m.keyAt(7)!.x);
    expect(m.keyAt(99)).toBeUndefined();
  });

  it('keeps a row on its key when entries before it change', () => {
    const before = hashMap([['b', 1]] as const);
    const after = hashMap([['a', 0], ['b', 2]] as const);
    const id = (s: { nodes: { id: string }[] }) => s.nodes.map((n) => n.id);
    expect(id(after)).toContain('map:row:b:k');
    expect(id(before)).toContain('map:row:b:k');
    expect(after.nodes.find((n) => n.id === 'map:row:b:vt')).toMatchObject({ text: '2' });
  });

  it('draws bare keys as a set, with no value column', () => {
    const s = hashMap([3, 1, 4]);
    expect(s.nodes.some((n) => n.id.endsWith(':v'))).toBe(false);
    expect(s.valueAt(1)).toEqual(s.keyAt(1));
  });

  it('shows an empty map as one faint row, and set: true makes an empty set', () => {
    expect(hashMap([]).nodes.some((n) => n.id === 'map:empty')).toBe(true);
    const wide = (s: ReturnType<typeof hashMap>) => (s.nodes.find((n) => n.id === 'map:empty') as { w: number }).w;
    expect(wide(hashMap([], { set: true }))).toBeLessThan(wide(hashMap([])));
  });
});
