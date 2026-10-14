import { describe, expect, it } from 'vitest';
import { geom, mem, plot, prob, sched } from '../src';
import { V2 } from '../src/vec';

const close = (a: number, b: number, eps = 1e-6) => expect(Math.abs(a - b)).toBeLessThan(eps);

describe('geom', () => {
  it('angleAt gives the interior angle', () => {
    close(geom.angleAt(V2(1, 0), V2(0, 0), V2(0, 1)), Math.PI / 2);
    close(geom.angleAt(V2(1, 0), V2(0, 0), V2(-1, 0)), Math.PI);
  });
  it('circumcircle of a right triangle is centred on the hypotenuse', () => {
    const c = geom.circumcircle(V2(0, 0), V2(4, 0), V2(0, 3))!;
    close(c.center.x, 2);
    close(c.center.y, 1.5);
    close(c.r, 2.5);
    expect(geom.circumcircle(V2(0, 0), V2(1, 1), V2(2, 2))).toBeNull();
  });
  it('circle intersections', () => {
    const pts = geom.circleIntersections(V2(0, 0), 1, V2(1, 0), 1);
    expect(pts).toHaveLength(2);
    for (const p of pts) close(Math.hypot(p.x, p.y), 1);
    expect(geom.circleIntersections(V2(0, 0), 1, V2(5, 0), 1)).toHaveLength(0);
  });
  it('foot of perpendicular and line intersection', () => {
    const f = geom.footOfPerpendicular(V2(2, 5), V2(0, 0), V2(10, 0));
    expect(f).toEqual({ x: 2, y: 0 });
    expect(geom.lineIntersection(V2(0, 0), V2(1, 1), V2(0, 1), V2(1, 0))).toEqual({ x: 0.5, y: 0.5 });
  });
});

describe('prob.venn', () => {
  const a = { x: 0, y: 0, r: 1 }, b = { x: 1, y: 0, r: 1 };
  it('lens area matches the closed form for unit circles one radius apart', () => {
    close(prob.vennAreas(a, b).both, (2 * Math.PI) / 3 - Math.sqrt(3) / 2);
  });
  it('region boundaries are continuous (each arc ends where the next starts)', () => {
    const r = prob.vennRegions(a, b);
    for (const pts of [r.both, r.aOnly, r.bOnly]) {
      const h = pts.length / 2;
      close(pts[h - 1][0], pts[h][0], 1e-9);
      close(pts[h - 1][1], pts[h][1], 1e-9);
      close(pts[pts.length - 1][0], pts[0][0], 1e-9);
      close(pts[pts.length - 1][1], pts[0][1], 1e-9);
    }
  });
  it('lens points lie in both circles', () => {
    for (const [x, y] of prob.vennRegions(a, b).both) {
      expect(Math.hypot(x - a.x, y - a.y)).toBeLessThanOrEqual(1 + 1e-9);
      expect(Math.hypot(x - b.x, y - b.y)).toBeLessThanOrEqual(1 + 1e-9);
    }
  });
  it('regionAt classifies points', () => {
    expect(prob.vennRegionAt(V2(0.5, 0), a, b)).toBe('both');
    expect(prob.vennRegionAt(V2(-0.5, 0), a, b)).toBe('aOnly');
    expect(prob.vennRegionAt(V2(5, 5), a, b)).toBe('neither');
  });
});

describe('prob.probTree', () => {
  it('leaf products multiply along the path', () => {
    const t = prob.probTree({
      key: 'r', label: 'start', children: [
        { key: 'a', label: 'A', p: 0.3, children: [{ key: 'x', label: 'x', p: 0.5 }, { key: 'y', label: 'y', p: 0.5 }] },
        { key: 'b', label: 'B', p: 0.7 },
      ],
    });
    expect(t.leaves.map((l) => [l.path, +l.p.toFixed(6)])).toEqual([['r/a/x', 0.15], ['r/a/y', 0.15], ['r/b', 0.7]]);
  });
});

describe('sched.simulate', () => {
  const procs = [
    { id: 'P1', arrival: 0, burst: 5 },
    { id: 'P2', arrival: 1, burst: 3 },
    { id: 'P3', arrival: 2, burst: 1 },
  ];
  it('fcfs runs in arrival order', () => {
    const s = sched.simulate(procs, 'fcfs');
    expect(s.segments).toEqual([{ id: 'P1', start: 0, end: 5 }, { id: 'P2', start: 5, end: 8 }, { id: 'P3', start: 8, end: 9 }]);
    close(s.avgWaiting, (0 + 4 + 6) / 3);
  });
  it('sjf picks the shortest ready job when the CPU frees up', () => {
    expect(sched.simulate(procs, 'sjf').segments.map((x) => x.id)).toEqual(['P1', 'P3', 'P2']);
  });
  it('srtf preempts for a shorter job', () => {
    expect(sched.simulate(procs, 'srtf').segments).toEqual([
      { id: 'P1', start: 0, end: 1 }, { id: 'P2', start: 1, end: 2 }, { id: 'P3', start: 2, end: 3 },
      { id: 'P2', start: 3, end: 5 }, { id: 'P1', start: 5, end: 9 },
    ]);
  });
  it('round robin shares the CPU in quanta', () => {
    const s = sched.simulate(procs, 'rr', 2);
    expect(s.segments.map((x) => `${x.id}:${x.start}-${x.end}`)).toEqual(['P1:0-2', 'P2:2-4', 'P3:4-5', 'P1:5-7', 'P2:7-8', 'P1:8-9']);
    expect(s.end).toBe(9);
  });
});

describe('plot', () => {
  const p = plot.plane({ x: [-5, 5], y: [-5, 5], width: 100, height: 100 });
  it('maps world to pixels with y up, and back', () => {
    expect(p.toPx(0, 0)).toEqual({ x: 50, y: 50 });
    expect(p.toPx(5, 5)).toEqual({ x: 100, y: 0 });
    expect(p.toWorld(100, 0)).toEqual({ x: 5, y: 5 });
  });
  it('splits 1/x at the asymptote', () => {
    expect(plot.fn(p, (x) => 1 / x, { samples: 101 }).nodes.length).toBe(2);
    expect(plot.fn(p, Math.sin).nodes.length).toBe(1);
  });
  it('riemann sums converge on the integral', () => {
    close(plot.riemann(p, (x) => x * x, 0, 1, 1000, 'mid').sum, 1 / 3, 1e-6);
    close(plot.integrate((x) => x * x, 0, 1), 1 / 3, 1e-9);
  });
  it('niceTicks', () => {
    expect(plot.niceTicks(0, 10, 5)).toEqual([0, 2, 4, 6, 8, 10]);
  });
});

describe('mem', () => {
  it('hex formats the low digits', () => {
    expect(mem.hex(0x7ffc1004)).toBe('0x1004');
    expect(mem.hex(255, 2)).toBe('0xff');
  });
  it('stackHeap draws one arrow per reference', () => {
    const s = mem.stackHeap(
      [{ name: 'Global', vars: [{ name: 'a', value: { ref: 'L' } }, { name: 'b', value: { ref: 'L' } }, { name: 'n', value: 3 }] }],
      [{ id: 'L', kind: 'list', items: [1, 2] }],
    );
    expect(s.nodes.filter((n) => n.kind === 'arrow')).toHaveLength(2);
  });
});
