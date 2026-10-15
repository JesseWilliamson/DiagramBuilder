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
