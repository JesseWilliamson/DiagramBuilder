import { describe, expect, it } from 'vitest';
import { connector, pointAlong, rectEdge, route, sys, uml } from '../src';

describe('rectEdge', () => {
  const f = { x: 0, y: 0, w: 100, h: 40 };
  it('exits through the side the ray hits first', () => {
    expect(rectEdge(f, { x: 500, y: 0 })).toEqual({ x: 50, y: 0 });
    expect(rectEdge(f, { x: 0, y: -500 })).toEqual({ x: 0, y: -20 });
    expect(rectEdge(f, { x: 100, y: 100 })).toEqual({ x: 20, y: 20 }); // a 45° ray hits the bottom (h/2 = 20) first
  });
});

describe('route', () => {
  it('elbow routes leave through facing sides, with right angles', () => {
    const a = { x: 0, y: 0, w: 100, h: 40 }, b = { x: 60, y: 200, w: 100, h: 40 };
    const pts = route(a, b, 'elbow');
    expect(pts[0]).toEqual({ x: 0, y: 20 });          // bottom of a
    expect(pts.at(-1)).toEqual({ x: 60, y: 180 });     // top of b
    for (let i = 1; i < pts.length; i++) expect(pts[i].x === pts[i - 1].x || pts[i].y === pts[i - 1].y).toBe(true);
  });
  it('pointAlong measures by length', () => {
    expect(pointAlong([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 30 }], 0.5)).toEqual({ x: 10, y: 10 });
  });
  it('the line stops where a hollow marker begins', () => {
    const c = connector({ id: 'c', from: { x: 0, y: 0 }, to: { x: 100, y: 0 }, end: 'triangle' });
    const line = c.nodes.find((n) => n.id === 'c:line');
    expect(line?.kind === 'path' && line.points[1][0]).toBe(86);
  });
});

describe('uml.activations', () => {
  const msgs: uml.Message[] = [
    { from: 'u', to: 'api', label: 'login()' },
    { from: 'api', to: 'db', label: 'find()' },
    { from: 'db', to: 'api', label: 'row', kind: 'return' },
    { from: 'api', to: 'api', label: 'check()' },
    { from: 'api', to: 'u', label: 'token', kind: 'return' },
  ];
  it('calls push, returns pop, self-calls nest for one row', () => {
    expect(uml.activations(msgs)).toEqual([
      { participant: 'api', depth: 0, start: 0, end: 4 },
      { participant: 'db', depth: 0, start: 1, end: 2 },
      { participant: 'api', depth: 1, start: 3, end: 3 },
    ]);
  });
  it('an unanswered call runs to the end', () => {
    expect(uml.activations(msgs.slice(0, 2)).map((a) => a.end)).toEqual([1, 1]);
  });
});

describe('uml.classSize', () => {
  it('grows with the longest member and the number of rows', () => {
    const small = uml.classSize({ id: 'a', name: 'A', x: 0, y: 0 });
    const big = uml.classSize({ id: 'a', name: 'A', x: 0, y: 0, attributes: ['- aVeryLongAttributeName: string'], methods: ['+ m()'] });
    expect(big.w).toBeGreaterThan(small.w);
    expect(big.h).toBeGreaterThan(small.h);
    // collapsed: members are hidden, so they don't change the height
    expect(uml.classSize({ id: 'a', name: 'A', x: 0, y: 0, methods: ['+ m()'] }, true).h).toBe(uml.classSize({ id: 'a', name: 'A', x: 0, y: 0 }, true).h);
  });
});

describe('sys.architecture', () => {
  const a = sys.architecture(
    [{ id: 'c', kind: 'client', label: 'C', x: 0, y: 0 }, { id: 's', kind: 'service', label: 'S', x: 300, y: 0 }],
    [{ from: 'c', to: 's' }],
  );
  it('along() runs edge to edge, in either direction', () => {
    expect(a.along('c', 's', 0)).toEqual({ x: 48, y: 0 });
    expect(a.along('c', 's', 1)).toEqual({ x: 240, y: 0 });
    expect(a.along('s', 'c', 0)).toEqual({ x: 240, y: 0 });
  });
});

describe('sys zones', () => {
  const parts: sys.Component[] = [
    { id: 'web', kind: 'service', label: 'Web', x: 0, y: 0 },
    { id: 'db', kind: 'db', label: 'DB', x: 200, y: 0 },
    { id: 'vm', kind: 'service', label: 'VM', x: 400, y: 0 },
  ];
  const zones: sys.Zone[] = [
    { id: 'cloud', label: 'Cloud', around: ['web', 'db', 'vm'] },
    { id: 'box', label: 'Box', around: ['vm'] },
  ];
  const a = sys.architecture(parts, [], { zones });
  const box = (k: string) => a.nodes.find((n) => n.id === `sys:zone:${k}`) as { x: number; y: number; w: number; h: number };
  const edges = (r: { x: number; y: number; w: number; h: number }) => ({ l: r.x - r.w / 2, r: r.x + r.w / 2, t: r.y - r.h / 2, b: r.y + r.h / 2 });

  it('surrounds every component it holds', () => {
    const z = edges(box('cloud'));
    for (const p of parts) {
      const f = a.frame(p.id);
      expect(z.l).toBeLessThan(f.x - f.w / 2);
      expect(z.r).toBeGreaterThan(f.x + f.w / 2);
      expect(z.t).toBeLessThan(f.y - f.h / 2);
      expect(z.b).toBeGreaterThan(f.y + f.h / 2);
    }
  });

  it('grows an outer zone around an inner one, label strip and all', () => {
    const outer = edges(box('cloud')), inner = edges(box('box'));
    expect(outer.r).toBeGreaterThan(inner.r);
    expect(outer.t).toBeLessThan(inner.t);
    expect(outer.b).toBeGreaterThan(inner.b);
  });

  it('draws zones first, outer before inner, so they sit under everything', () => {
    const ids = a.nodes.map((n) => n.id);
    expect(ids.indexOf('sys:zone:cloud')).toBe(0);
    expect(ids.indexOf('sys:zone:box')).toBeGreaterThan(0);
    expect(ids.indexOf('sys:zone:box')).toBeLessThan(ids.indexOf('sys:web'));
  });
});

describe('sys file', () => {
  it('is a page with a folded corner', () => {
    const c = sys.component({ id: 'in', kind: 'file', label: 'input.json', x: 0, y: 0 });
    const page = c.nodes.find((n) => n.id === 'sys:in');
    expect(page?.kind).toBe('path');
    expect(page?.role).toBe('sys-file');
    expect(c.nodes.some((n) => n.id === 'sys:in:fold')).toBe(true);
  });
});

describe('uml.sequence fragments', () => {
  const people: uml.Participant[] = [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }];
  const msgs: uml.Message[] = [
    { from: 'a', to: 'b', label: 'start' },
    { from: 'b', to: 'c', label: 'poll' },
    { from: 'c', to: 'b', label: 'pending', kind: 'return' },
    { from: 'b', to: 'a', label: 'done', kind: 'return' },
  ];
  const fragments = [{ kind: 'loop', label: 'until ready', from: 1, to: 2, over: ['b', 'c'] as const }];
  const frag = (upTo: number) => uml.sequence(people, msgs, { fragments, upTo }).nodes.find((n) => n.id === 'seq:frag:0') as { y: number; h: number; x: number; w: number } | undefined;

  it('is not drawn before its first message', () => {
    expect(frag(0)).toBeUndefined();
  });

  it('grows with the messages revealed, then stops at its last', () => {
    expect(frag(2)!.h).toBeGreaterThan(frag(1)!.h);
    expect(frag(3)!.h).toBe(frag(2)!.h);
  });

  it('spans only the participants it is over', () => {
    const d = uml.sequence(people, msgs, { fragments });
    const f = frag(3)!;
    expect(f.x - f.w / 2).toBeGreaterThan(d.x('a'));
    expect(f.x + f.w / 2).toBeGreaterThan(d.x('c'));
  });
});

describe('sys links with waypoints', () => {
  it('pass through the waypoints and meet both boxes at their edges', () => {
    const parts: sys.Component[] = [
      { id: 'a', kind: 'service', label: 'A', x: 0, y: 0 },
      { id: 'b', kind: 'service', label: 'B', x: 300, y: 0 },
    ];
    const a = sys.architecture(parts, [{ from: 'a', to: 'b', via: [{ x: 0, y: 100 }, { x: 300, y: 100 }] }]);
    const line = a.nodes.find((n) => n.id === 'sys:link:a-b:line') as { points: readonly (readonly [number, number])[] };
    expect(line.points[0]).toEqual([0, 26]); // the bottom edge of a (52 tall)
    expect(line.points[1]).toEqual([0, 100]);
    expect(line.points[2]).toEqual([300, 100]);
    // the end is trimmed back from b's bottom edge to make room for the arrowhead
    expect(line.points[3][0]).toBe(300);
    expect(line.points[3][1]).toBeGreaterThan(26);
    expect(a.along('a', 'b', 0.5)).toEqual({ x: 150, y: 100 });
  });
});
