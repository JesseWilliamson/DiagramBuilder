import { describe, expect, it } from 'vitest';
import { PathNode, Scene, SceneNode } from '@dsviz/core';
import { activity, ActivityFlow, ActivityNode, activitySize, component, COMPONENT, componentSize, Connection, ellipsePoints, UmlComponent, useCase, UseCaseActor, UseCaseOval, UseCaseRelation } from '@dsviz/uml';

const find = (s: Scene, id: string): SceneNode => {
  const n = s.nodes.find((n) => n.id === id);
  if (!n) throw new Error(`no node ${id}`);
  return n;
};
const has = (s: Scene, id: string) => s.nodes.some((n) => n.id === id);
const ids = (s: Scene) => s.nodes.map((n) => n.id);
const inside = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
  a.x - a.w / 2 >= b.x - b.w / 2 - 0.01 && a.x + a.w / 2 <= b.x + b.w / 2 + 0.01 && a.y - a.h / 2 >= b.y - b.h / 2 - 0.01 && a.y + a.h / 2 <= b.y + b.h / 2 + 0.01;
const overlap = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
  Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2;

describe('useCase', () => {
  const actors: UseCaseActor[] = [{ id: 'cust', name: 'Customer' }, { id: 'bank', name: 'Bank', side: 'right' }];
  const cases: UseCaseOval[] = [{ id: 'order', name: 'Place order' }, { id: 'pay', name: 'Pay' }, { id: 'card', name: 'Verify card' }, { id: 'coupon', name: 'Apply coupon' }];
  const rels: UseCaseRelation[] = [
    { from: 'cust', to: 'order', kind: 'association' },
    { from: 'bank', to: 'card', kind: 'association' },
    { from: 'order', to: 'pay', kind: 'include' },
    { from: 'pay', to: 'card', kind: 'include' },
    { from: 'coupon', to: 'order', kind: 'extend' },
  ];
  const d = useCase(actors, cases, rels, { system: { name: 'Shop' }, interactive: true, draggable: true });

  it('gives every part a stable id and a semantic role', () => {
    expect(new Set(ids(d)).size).toBe(d.nodes.length);
    expect(find(d, 'uc:case:order')).toMatchObject({ kind: 'path', role: 'usecase', closed: true, data: { case: 'order' } });
    expect(find(d, 'uc:case:order:label')).toMatchObject({ role: 'value', text: 'Place order' });
    expect(find(d, 'uc:actor:cust:head')).toMatchObject({ role: 'figure' });
    expect(find(d, 'uc:actor:cust:legs')).toMatchObject({ role: 'figure-line' });
    expect(find(d, 'uc:actor:cust:hit')).toMatchObject({ role: 'hit', draggable: true, data: { actor: 'cust' } });
    expect(find(d, 'uc:system')).toMatchObject({ role: 'boundary' });
    expect(find(d, 'uc:system:title')).toMatchObject({ text: 'Shop' });
  });
  it('draws ellipses through their four extremes', () => {
    const p = ellipsePoints(10, 20, 50, 20, 40);
    expect(p[0]).toEqual([60, 20]);
    expect(p[10][0]).toBeCloseTo(10);
    expect(p[10][1]).toBeCloseTo(40);
  });
  it('puts cases in layered columns: a base case, then what it includes, then theirs', () => {
    const x = (k: string) => d.frame(k).x;
    expect(x('order')).toBeLessThan(x('pay'));
    expect(x('pay')).toBeLessThan(x('card'));
    expect(x('coupon')).toBeGreaterThan(x('order')); // an extension sits after its base
  });
  it('keeps the boundary round the cases and the actors outside, on their sides', () => {
    for (const c of cases) expect(inside(d.frame(c.id), d.boundary!)).toBe(true);
    expect(d.frame('cust').x + d.frame('cust').w / 2).toBeLessThan(d.boundary!.x - d.boundary!.w / 2);
    expect(d.frame('bank').x - d.frame('bank').w / 2).toBeGreaterThan(d.boundary!.x + d.boundary!.w / 2);
    // an actor stands level with the case it uses
    expect(d.frame('cust').y).toBeCloseTo(d.frame('order').y, 0);
    expect(d.frames.cust).toEqual(d.box('cust'));
  });
  it('draws each relation with its own line and marker', () => {
    const inc = 'uc:rel:order-include-pay';
    expect(find(d, `${inc}:line`)).toMatchObject({ dashed: true });
    expect(find(d, `${inc}:end`)).toMatchObject({ role: 'end-open' });
    expect(find(d, `${inc}:label`)).toMatchObject({ text: '«include»' });
    expect(find(d, 'uc:rel:coupon-extend-order:label')).toMatchObject({ text: '«extend»' });
    expect(find(d, 'uc:rel:cust-association-order:line').dashed).toBeFalsy();
    expect(has(d, 'uc:rel:cust-association-order:end')).toBe(false);
    const g = useCase([{ id: 'a', name: 'A', x: 0, y: 0 }, { id: 'b', name: 'B', x: 0, y: 120 }], [], [{ from: 'b', to: 'a', kind: 'generalization' }]);
    expect(find(g, 'uc:rel:b-generalization-a:end')).toMatchObject({ role: 'end-hollow' });
  });
  it('ends lines on the ellipse, not its bounding box', () => {
    const f = d.frame('order');
    const line = find(d, 'uc:rel:order-include-pay:line') as PathNode;
    const [px, py] = line.points[0];
    expect(Math.hypot((px - f.x) / (f.w / 2), (py - f.y) / (f.h / 2))).toBeCloseTo(1, 1);
  });
  it('places unrelated cases in a grid and respects explicit positions', () => {
    const g = useCase([], [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C', x: 500, y: 7 }]);
    expect(g.frame('a').x).toBe(g.frame('b').x);
    expect(g.frame('b').y).toBeGreaterThan(g.frame('a').y);
    expect(g.frame('c')).toMatchObject({ x: 500, y: 7 });
    expect(g.boundary).toBeUndefined();
  });
  it('fades what is dimmed, and the lines to it', () => {
    const f = useCase(actors, cases, rels, { dim: new Set(['pay']) });
    expect(find(f, 'uc:case:pay').opacity).toBeLessThan(1);
    expect(find(f, 'uc:rel:order-include-pay:line').opacity).toBeLessThan(1);
    expect(find(f, 'uc:case:order').opacity).toBe(1);
  });
  it('sets the stereotype beside the line, not on it, as small italic text', () => {
    const l = find(d, 'uc:rel:order-include-pay:label');
    expect(l).toMatchObject({ size: 11, role: 'usecase-rel-label', text: '«include»' });
    const [[ax, ay], [bx, by]] = (find(d, 'uc:rel:order-include-pay:line') as PathNode).points;
    const { x, y } = l as { x: number; y: number };
    const dx = bx - ax, dy = by - ay, t = ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy);
    expect(t).toBeCloseTo(0.5, 1);
    expect(Math.hypot(x - (ax + t * dx), y - (ay + t * dy))).toBeGreaterThanOrEqual(8);
  });
  it('titles the boundary at its top-left corner', () => {
    const t = find(d, 'uc:system:title') as { x: number; y: number; anchor?: string; size?: number };
    expect(t.anchor).toBe('start');
    expect(t.size).toBe(12);
    expect(t.x).toBeLessThan(d.boundary!.x - d.boundary!.w / 4);
    expect(t.y).toBeLessThan(d.boundary!.y - d.boundary!.h / 4);
  });
  it('orders the cases by their actors, so a shared case sits between them and lines do not cross', () => {
    const two = [{ id: 'cust', name: 'Customer' }, { id: 'admin', name: 'Admin' }];
    const three = [{ id: 'order', name: 'Place order' }, { id: 'browse', name: 'Browse' }, { id: 'catalog', name: 'Catalogue' }];
    const links: UseCaseRelation[] = [
      { from: 'cust', to: 'order', kind: 'association' }, { from: 'cust', to: 'browse', kind: 'association' },
      { from: 'admin', to: 'browse', kind: 'association' }, { from: 'admin', to: 'catalog', kind: 'association' },
    ];
    const g = useCase(two, three, links);
    const y = (k: string) => g.frame(k).y;
    expect(y('browse')).toBeGreaterThan(Math.min(y('order'), y('catalog')));
    expect(y('browse')).toBeLessThan(Math.max(y('order'), y('catalog')));
    expect(Math.sign(y('admin') - y('cust'))).toBe(Math.sign(y('catalog') - y('order')));
    expect(g.frame('order').x).toBe(g.frame('catalog').x);
  });
});

describe('activity', () => {
  const nodes: ActivityNode[] = [
    { id: 's', kind: 'start', lane: 'a' },
    { id: 'pick', label: 'Pick', lane: 'a' },
    { id: 'dec', kind: 'decision', lane: 'b' },
    { id: 'yes', label: 'Yes branch', lane: 'b' },
    { id: 'no', label: 'No branch', lane: 'b' },
    { id: 'm', kind: 'merge', lane: 'b' },
    { id: 'fork', kind: 'fork' },
    { id: 'x', label: 'X', lane: 'a' },
    { id: 'y', label: 'Y', lane: 'c' },
    { id: 'join', kind: 'join' },
    { id: 'ff', kind: 'flowFinal', lane: 'b' },
    { id: 'e', kind: 'end', lane: 'a' },
  ];
  const flows: ActivityFlow[] = [
    { from: 's', to: 'pick' }, { from: 'pick', to: 'dec' },
    { from: 'dec', to: 'yes', guard: 'x > 0' }, { from: 'dec', to: 'no', guard: '[else]' },
    { from: 'yes', to: 'm' }, { from: 'no', to: 'm' },
    { from: 'm', to: 'fork' }, { from: 'fork', to: 'x' }, { from: 'fork', to: 'y' },
    { from: 'x', to: 'join' }, { from: 'y', to: 'join' }, { from: 'join', to: 'e' }, { from: 'no', to: 'ff' },
  ];
  const lanes = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }];
  const d = activity(nodes, flows, { swimlanes: lanes, current: 'dec', taken: new Set([0, 1]), interactive: true });
  const line = (s: Scene, id: string) => (find(s, id) as PathNode).points;
  // distance from a point to a segment p–q
  const offSegment = (x: number, y: number, p: readonly number[], q: readonly number[]) => {
    const dx = q[0] - p[0], dy = q[1] - p[1], len2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((x - p[0]) * dx + (y - p[1]) * dy) / len2));
    return Math.hypot(x - p[0] - t * dx, y - p[1] - t * dy);
  };

  it('draws each kind with its own role and a stable id', () => {
    expect(new Set(ids(d)).size).toBe(d.nodes.length);
    expect(find(d, 'act:n:s')).toMatchObject({ kind: 'circle', role: 'pseudo', r: 8 });
    expect(find(d, 'act:n:pick')).toMatchObject({ kind: 'rect', role: 'card', rx: 10, h: 38, data: { node: 'pick' } });
    expect(find(d, 'act:n:pick:label')).toMatchObject({ size: 13 });
    expect(find(d, 'act:n:dec')).toMatchObject({ kind: 'path', role: 'decision', closed: true });
    expect(find(d, 'act:n:m')).toMatchObject({ role: 'decision' });
    expect(find(d, 'act:n:fork')).toMatchObject({ role: 'fork-bar' });
    expect(find(d, 'act:n:join')).toMatchObject({ role: 'fork-bar' });
    expect(find(d, 'act:n:e')).toMatchObject({ role: 'outline', r: 8 });
    expect(find(d, 'act:n:e:dot')).toMatchObject({ role: 'pseudo', r: 5 });
    expect(find(d, 'act:n:ff')).toMatchObject({ role: 'flow-final', r: 8 });
    expect(has(d, 'act:n:ff:x1') && has(d, 'act:n:ff:x2')).toBe(true);
    expect(find(d, 'act:lane:a:title')).toMatchObject({ role: 'lane-title', h: 26 });
    expect(find(d, 'act:lane:a:name')).toMatchObject({ role: 'lane-name', size: 12, text: 'A' });
  });
  it('sizes: a 26px diamond, 16px start / end / flow final, 6px bars, actions from their text', () => {
    expect(activitySize({ id: 'd', kind: 'decision' })).toEqual({ w: 26, h: 26 });
    expect(activitySize({ id: 's', kind: 'start' })).toEqual({ w: 16, h: 16 });
    expect(activitySize({ id: 'e', kind: 'end' })).toEqual({ w: 16, h: 16 });
    expect(activitySize({ id: 'f', kind: 'fork' }, true, 100)).toEqual({ w: 100, h: 6 });
    expect(activitySize({ id: 'a', label: 'A rather long action name' }).w).toBeGreaterThan(96);
    const dia = line(d, 'act:n:dec');
    expect(dia[1][0] - dia[3][0]).toBe(26);
  });
  it('flows down the layers, one row per step', () => {
    const y = (k: string) => d.frame(k).y;
    expect(y('s')).toBeLessThan(y('pick'));
    expect(y('pick')).toBeLessThan(y('dec'));
    expect(y('dec')).toBeLessThan(y('yes'));
    expect(y('yes')).toBeLessThan(y('m'));
    expect(y('m')).toBeLessThan(y('fork'));
    expect(y('fork')).toBeLessThan(y('x'));
    expect(y('x')).toBeLessThan(y('join'));
  });
  it('keeps every node inside its lane, lanes left to right', () => {
    for (const n of nodes) if (n.lane) expect(inside(d.frame(n.id), d.lanes[n.lane]), n.id).toBe(true);
    expect(d.lanes.a.x).toBeLessThan(d.lanes.b.x);
    expect(d.lanes.b.x).toBeLessThan(d.lanes.c.x);
    // lanes are a row of equal-height columns that touch, with the title band across the top
    expect(d.lanes.a.y).toBe(d.lanes.b.y);
    expect(d.lanes.a.x + d.lanes.a.w / 2).toBeCloseTo(d.lanes.b.x - d.lanes.b.w / 2);
    const band = find(d, 'act:lane:a:title') as { y: number; h: number };
    expect(band.y - band.h / 2).toBeCloseTo(d.lanes.a.y - d.lanes.a.h / 2);
  });
  it('puts the branches of a decision side by side in their lane, never overlapping', () => {
    expect(d.frame('yes').y).toBe(d.frame('no').y);
    expect(d.frame('yes').x).not.toBe(d.frame('no').x);
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) expect(overlap(d.frame(nodes[i].id), d.frame(nodes[j].id)), `${nodes[i].id}/${nodes[j].id}`).toBe(false);
  });
  it('stretches a bar across the flows it splits or gathers, plus 24', () => {
    const f = d.frame('fork'), j = d.frame('join');
    expect(j.w).toBeCloseTo(f.w); // x and y are as far apart either side
    expect(f.w).toBeCloseTo(Math.abs(d.frame('y').x - d.frame('x').x) + 24);
    for (const k of ['x', 'y']) expect(Math.abs(d.frame(k).x - j.x)).toBeLessThan(j.w / 2);
    for (const k of ['x', 'y']) expect(Math.abs(d.frame(k).x - f.x)).toBeLessThan(f.w / 2);
    expect(f.h).toBe(6);
    // each parallel flow meets the bar straight above / below its node
    expect(line(d, 'act:flow:7:line')[0][0]).toBeCloseTo(d.frame('x').x);
    expect(line(d, 'act:flow:8:line')[0][0]).toBeCloseTo(d.frame('y').x);
  });
  it('leaves a decision by its side point for a sideways branch, and labels the guard beside that segment', () => {
    const dec = d.frame('dec');
    for (const [i, k] of [[2, 'yes'], [3, 'no']] as const) {
      const p = line(d, `act:flow:${i}:line`);
      expect(p[0][1]).toBeCloseTo(dec.y); // out of the side point…
      expect(Math.abs(p[0][0] - dec.x)).toBeCloseTo(13);
      expect(Math.sign(p[0][0] - dec.x)).toBe(Math.sign(d.frame(k).x - dec.x)); // …on the branch's side
      expect(p[1][1]).toBeCloseTo(dec.y); // first along, then down into the top of the action
      const tip = (find(d, `act:flow:${i}:end`) as PathNode).points[0];
      expect(tip[0]).toBeCloseTo(d.frame(k).x);
      expect(tip[1]).toBeCloseTo(d.frame(k).y - d.frame(k).h / 2);
      const label = find(d, `act:flow:${i}:label`) as { x: number; y: number; size?: number; role?: string };
      expect(label).toMatchObject({ role: 'edge-label', size: 11 });
      expect(offSegment(label.x, label.y, p[0], p[1])).toBeCloseTo(9); // off the line, not on it
      for (let s = 0; s < p.length - 1; s++) expect(offSegment(label.x, label.y, p[s], p[s + 1])).toBeGreaterThanOrEqual(8.99);
    }
    expect(find(d, 'act:flow:2:label')).toMatchObject({ text: '[x > 0]' });
    expect(find(d, 'act:flow:3:label')).toMatchObject({ text: '[else]' });
  });
  it('labels a guard on a straight-down flow beside the line, just under the decision', () => {
    const g = activity([{ id: 'q', kind: 'decision' }, { id: 'a' }], [{ from: 'q', to: 'a', guard: 'ok' }]);
    const p = line(g, 'act:flow:0:line'), label = find(g, 'act:flow:0:label') as { x: number; y: number; anchor?: string };
    expect(p[0][0]).toBeCloseTo(g.frame('q').x); // straight: out of the bottom point
    expect(label.x - p[0][0]).toBeCloseTo(8);
    expect(label.anchor).toBe('start');
    expect(label.y).toBeGreaterThan(p[0][1]);
    expect(label.y).toBeLessThan(g.frame('a').y - g.frame('a').h / 2);
  });
  it('highlights the current node and the flows taken', () => {
    expect(find(d, 'act:n:dec').tone).toBe('active');
    expect(find(d, 'act:n:pick').tone).toBeUndefined();
    expect(find(d, 'act:flow:0:line').tone).toBe('active');
    expect(find(d, 'act:flow:1:end').tone).toBe('active');
    expect(find(d, 'act:flow:2:line').tone).toBeUndefined();
    const two = activity(nodes, flows, { current: new Set(['x', 'y']), taken: 4 });
    expect(find(two, 'act:n:x').tone).toBe('active');
    expect(find(two, 'act:n:y').tone).toBe('active');
    expect(find(two, 'act:flow:4:line').tone).toBe('active');
    expect(find(two, 'act:flow:5:line').tone).toBeUndefined();
    const g = activity(nodes, flows, { taken: 2 });
    expect(find(g, 'act:flow:2:label').tone).toBe('active'); // the guard colours with its flow
  });
  it('draws flows from the bottom centre of one node to the top centre of the next, with an arrow', () => {
    const p = line(d, 'act:flow:1:line');
    const a = d.frame('pick'), b = d.frame('dec');
    expect(p[0]).toEqual([a.x, a.y + a.h / 2]);
    const tip = (find(d, 'act:flow:1:end') as PathNode).points[0];
    expect(tip[0]).toBeCloseTo(b.x);
    expect(tip[1]).toBeCloseTo(b.y - b.h / 2);
    expect(find(d, 'act:flow:1:end')).toMatchObject({ role: 'end-solid' });
    // an elbow between lanes: down, across, down
    expect(p.length).toBe(4);
    expect(p[1][0]).toBe(p[0][0]);
    expect(p[1][1]).toBe(p[2][1]);
  });
  it('routes round a node or a bar that is in the way', () => {
    const placed = activity(
      [{ id: 'a', x: 0, y: 0 }, { id: 'f', kind: 'fork', x: 0, y: 90 }, { id: 'b', x: -60, y: 180 }, { id: 'c', x: 60, y: 180 }, { id: 'd', x: 0, y: 300 }],
      [{ from: 'f', to: 'b' }, { from: 'f', to: 'c' }, { from: 'a', to: 'd' }],
    );
    const p = line(placed, 'act:flow:2:line');
    const bar = placed.frame('f');
    expect(Math.max(...p.map((q) => q[0]))).toBeGreaterThan(bar.x + bar.w / 2); // out and round the bar's end
    expect(p[0]).toEqual([0, 19]);
    expect(p[p.length - 1][0]).toBe(0); // back in over d
  });
  it('routes a retry loop up the right side, clear of the nodes', () => {
    const loop = activity([{ id: 'a' }, { id: 'b' }, { id: 'c' }], [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }, { from: 'c', to: 'a', guard: 'retry' }]);
    const p = line(loop, 'act:flow:2:line');
    const right = Math.max(...['a', 'b', 'c'].map((k) => loop.frame(k).x + loop.frame(k).w / 2));
    expect(Math.max(...p.map((q) => q[0]))).toBeGreaterThan(right);
  });
  it('lays out without lanes, and keeps explicit positions', () => {
    const p = activity([{ id: 'a' }, { id: 'b', x: 300, y: 40 }, { id: 'c' }], [{ from: 'a', to: 'c' }]);
    expect(p.frame('b')).toMatchObject({ x: 300, y: 40 });
    expect(p.frame('a').y).toBeLessThan(p.frame('c').y);
    expect(p.lanes).toEqual({});
  });
  it('turns lanes into rows when the flow runs right', () => {
    const r = activity(nodes, flows, { swimlanes: lanes, direction: 'right' });
    expect(r.frame('s').x).toBeLessThan(r.frame('pick').x);
    expect(r.lanes.a.y).toBeLessThan(r.lanes.b.y);
    expect(r.lanes.a.x).toBe(r.lanes.b.x);
    for (const n of nodes) if (n.lane) expect(inside(r.frame(n.id), r.lanes[n.lane]), n.id).toBe(true);
    const bar = r.frame('fork');
    expect(bar.w).toBe(6);
    expect(bar.h).toBeGreaterThan(48);
    // guards still sit off their first segment
    const p = line(r, 'act:flow:2:line'), label = find(r, 'act:flow:2:label') as { x: number; y: number };
    for (let s = 0; s < p.length - 1; s++) expect(offSegment(label.x, label.y, p[s], p[s + 1])).toBeGreaterThan(6);
  });
});

describe('component', () => {
  const parts: UmlComponent[] = [
    { id: 'web', name: 'Web' },
    { id: 'back', name: 'Backend', ports: [{ id: 'api', side: 'left' }] },
    { id: 'orders', name: 'Orders', parent: 'back', provides: [{ name: 'IOrders', side: 'top' }], requires: ['IPay'] },
    { id: 'stock', name: 'Stock', parent: 'back', stereotype: 'service' },
    { id: 'pay', name: 'Pay', provides: ['IPay'] },
  ];
  const links: Connection[] = [
    { from: 'orders', to: 'pay', kind: 'assembly', interface: 'IPay' },
    { from: 'web', to: 'api', kind: 'dependency', label: 'HTTP' },
    { from: 'api', to: 'orders', kind: 'delegate' },
    { from: 'orders', to: 'stock', kind: 'dependency' },
  ];
  const d = component(parts, links, { interactive: true });

  it('gives every part a stable id and a semantic role', () => {
    expect(new Set(ids(d)).size).toBe(d.nodes.length);
    expect(find(d, 'comp:c:web')).toMatchObject({ role: 'card', data: { component: 'web' }, interactive: true });
    expect(find(d, 'comp:c:web:icon')).toMatchObject({ role: 'comp-icon' });
    expect(has(d, 'comp:c:web:tab1') && has(d, 'comp:c:web:tab2')).toBe(true);
    expect(find(d, 'comp:c:stock:stereo')).toMatchObject({ text: '«service»', role: 'stereotype' });
    expect(find(d, 'comp:c:back')).toMatchObject({ role: 'component-frame' });
    expect(find(d, 'comp:port:api')).toMatchObject({ role: 'port' });
    expect(find(d, 'comp:i:orders:p:IOrders:ball')).toMatchObject({ kind: 'circle', role: 'iface' });
    expect(find(d, 'comp:i:orders:p:IOrders:stub')).toMatchObject({ role: 'iface-line' });
    expect(find(d, 'comp:i:orders:p:IOrders:label')).toMatchObject({ text: 'IOrders', role: 'iface-label' });
  });
  it('places components left to right, requirers before their providers', () => {
    expect(d.frame('web').x).toBeLessThan(d.frame('back').x);
    expect(d.frame('back').x).toBeLessThan(d.frame('pay').x);
  });
  it('draws a parent as a frame round its children', () => {
    expect(inside(d.frame('orders'), d.frame('back'))).toBe(true);
    expect(inside(d.frame('stock'), d.frame('back'))).toBe(true);
    expect(overlap(d.frame('orders'), d.frame('stock'))).toBe(false);
    expect(d.frame('pay').x - d.frame('pay').w / 2).toBeGreaterThan(d.frame('back').x + d.frame('back').w / 2);
  });
  it('puts a port on its component edge', () => {
    const p = d.frame('api'), b = d.frame('back');
    expect(p.x).toBeCloseTo(b.x - b.w / 2);
    expect(p.y).toBeCloseTo(b.y);
    expect(p.w).toBe(COMPONENT.port);
  });
  it('puts a port at an exact coordinate along its side when given one', () => {
    const s = component([{ id: 'a', name: 'A', x: 100, y: 100, ports: [{ id: 'p', name: 'p', side: 'top', x: 70 }, { id: 'q', side: 'right', y: 90 }] }]);
    const f = s.frame('a');
    expect(s.frame('p')).toMatchObject({ x: 70, y: f.y - f.h / 2 });
    expect(s.frame('q')).toMatchObject({ x: f.x + f.w / 2, y: 90 });
    const label = find(s, 'comp:port:p:label');
    if (label.kind !== 'text') throw new Error();
    expect(label.x).toBeGreaterThan(70 + COMPONENT.port / 2); // beside the square, not on the edge line
  });
  it('points a delegate at a provided interface\'s ball when the connection names one', () => {
    const s = component(
      [{ id: 'p', name: 'P', ports: [{ id: 'in', side: 'top', x: 100 }] }, { id: 'c', name: 'C', parent: 'p', x: 100, y: 200, provides: [{ name: 'I', side: 'top' }] }],
      [{ from: 'in', to: 'c', kind: 'delegate', interface: 'I' }],
    );
    const ball = find(s, 'comp:i:c:p:I:ball'), end = find(s, 'comp:conn:0:end') as PathNode;
    if (ball.kind !== 'circle') throw new Error();
    expect(end.points[1][1]).toBeCloseTo(ball.y - COMPONENT.ball); // the arrow tip touches the ball, not the box
    expect(end.points[1][0]).toBeCloseTo(ball.x);
  });
  it('joins an assembly as a socket closed round the provider\'s ball', () => {
    const ball = find(d, 'comp:i:pay:p:IPay:ball');
    const socket = find(d, 'comp:asm:0:socket') as PathNode;
    if (ball.kind !== 'circle') throw new Error();
    for (const [x, y] of socket.points) expect(Math.hypot(x - ball.x, y - ball.y)).toBeCloseTo(COMPONENT.socket);
    expect(ball.r).toBe(COMPONENT.ball);
    expect(socket.role).toBe('socket');
    // the half circle bulges toward the requirer (to the left), so its middle point is its leftmost
    expect(socket.points[4][0]).toBeLessThan(ball.x);
    // the plug sits halfway across the gap between the two boxes, on the provider's row; the requirer's stub elbows to it
    const provEdge = d.frame('pay').x - d.frame('pay').w / 2, reqEdge = d.frame('orders').x + d.frame('orders').w / 2;
    expect(ball.x).toBeCloseTo((provEdge + reqEdge) / 2);
    expect(ball.y).toBeCloseTo(d.frame('pay').y);
    const stub = find(d, 'comp:asm:0:stub') as PathNode;
    expect(stub.points[0][0]).toBeCloseTo(reqEdge);
    expect(stub.points[stub.points.length - 1]).toEqual([ball.x - COMPONENT.socket, ball.y]);
    const pstub = find(d, 'comp:i:pay:p:IPay:stub') as PathNode;
    expect(pstub.points[0][0]).toBeCloseTo(provEdge);
    expect(pstub.points[1][0]).toBeCloseTo(ball.x + COMPONENT.ball);
    // the requirer's own socket is not drawn separately while it is plugged in
    expect(has(d, 'comp:i:orders:r:IPay:arc')).toBe(false);
    expect(has(d, 'comp:i:pay:p:IPay:stub')).toBe(true);
  });
  it('draws an unconnected requirement as a socket on the box edge', () => {
    const s = component([{ id: 'a', name: 'A', x: 0, y: 0, requires: ['IFoo'] }]);
    const f = s.frame('a');
    const stub = find(s, 'comp:i:a:r:IFoo:stub') as PathNode;
    expect(stub.points[0][0]).toBeCloseTo(f.x + f.w / 2); // by default a requirement leaves to the right
    expect(stub.points[1][0] - stub.points[0][0]).toBe(COMPONENT.stub);
    const arc = find(s, 'comp:i:a:r:IFoo:arc') as PathNode;
    expect(arc.role).toBe('socket');
    expect(arc.closed).toBeFalsy();
    expect(arc.points).toHaveLength(9);
    // the half circle bulges back toward the box: its middle point is its leftmost, on the stub's axis
    const c = { x: stub.points[1][0] + COMPONENT.socket, y: stub.points[1][1] };
    for (const [x, y] of arc.points) expect(Math.hypot(x - c.x, y - c.y)).toBeCloseTo(COMPONENT.socket);
    expect(arc.points[4][0]).toBeCloseTo(c.x - COMPONENT.socket);
    // the name sits above the socket, clear of the stub
    const label = find(s, 'comp:i:a:r:IFoo:label');
    if (label.kind !== 'text') throw new Error();
    expect(label.size).toBe(COMPONENT.label);
    expect(label.y).toBeLessThan(c.y - COMPONENT.socket);
  });
  it('draws a lollipop: a 16px stub and a ball, named beside it when the stub is vertical', () => {
    const s = component([{ id: 'a', name: 'A', x: 0, y: 0, provides: ['IFoo', { name: 'IBar', side: 'top' }] }]);
    const f = s.frame('a');
    const stub = find(s, 'comp:i:a:p:IFoo:stub') as PathNode, ball = find(s, 'comp:i:a:p:IFoo:ball');
    if (ball.kind !== 'circle') throw new Error();
    expect(stub.points[0][0]).toBeCloseTo(f.x - f.w / 2); // a provided interface faces the flow: left
    expect(stub.points[0][0] - stub.points[1][0]).toBe(COMPONENT.stub);
    expect(ball.x).toBeCloseTo(stub.points[1][0] - COMPONENT.ball);
    const top = find(s, 'comp:i:a:p:IBar:ball'), label = find(s, 'comp:i:a:p:IBar:label');
    if (top.kind !== 'circle' || label.kind !== 'text') throw new Error();
    expect(top.y).toBeCloseTo(f.y - f.h / 2 - COMPONENT.stub - COMPONENT.ball);
    expect(label).toMatchObject({ anchor: 'start', y: top.y });
    expect(label.x).toBeGreaterThan(top.x + COMPONENT.ball);
  });
  it('spreads several interfaces on one side so that no two touch, and grows the box for them', () => {
    const c: UmlComponent = { id: 'a', name: 'A', x: 0, y: 0, requires: ['I1', 'I2', 'I3'] };
    const s = component([c]);
    const ys = ['I1', 'I2', 'I3'].map((n) => (find(s, `comp:i:a:r:${n}:stub`) as PathNode).points[0][1]).sort((p, q) => p - q);
    expect(ys[1] - ys[0]).toBeGreaterThanOrEqual(2 * COMPONENT.socket + 2);
    expect(ys[2] - ys[1]).toBeGreaterThanOrEqual(2 * COMPONENT.socket + 2);
    expect(componentSize(c, { leftRight: 3, topBottom: 0 }).h).toBeGreaterThan(componentSize(c).h);
  });
  it('draws the component icon at the top-right of the box: a rect with two tabs on its left edge', () => {
    const s = component([{ id: 'a', name: 'A', x: 0, y: 0 }]);
    const f = s.frame('a');
    const icon = find(s, 'comp:c:a:icon') as PathNode, tab = find(s, 'comp:c:a:tab1') as PathNode;
    const xs = icon.points.map((p) => p[0]), ys = icon.points.map((p) => p[1]);
    expect(Math.max(...xs) - Math.min(...xs)).toBe(COMPONENT.icon.w);
    expect(Math.max(...ys) - Math.min(...ys)).toBe(COMPONENT.icon.h);
    expect(Math.max(...xs)).toBeCloseTo(f.x + f.w / 2 - COMPONENT.pad);
    expect(Math.min(...ys)).toBeCloseTo(f.y - f.h / 2 + 8);
    expect(Math.min(...tab.points.map((p) => p[0]))).toBeLessThan(Math.min(...xs)); // the tab straddles the left edge
    expect(Math.max(...tab.points.map((p) => p[0]))).toBeGreaterThan(Math.min(...xs));
  });
  it('declares an interface an assembly names when nobody did', () => {
    const s = component([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], [{ from: 'a', to: 'b', kind: 'assembly', interface: 'IX' }]);
    expect(has(s, 'comp:i:b:p:IX:ball')).toBe(true);
    expect(has(s, 'comp:asm:0:socket')).toBe(true);
  });
  it('faces an interface toward the component it is connected to', () => {
    const s = component(
      [{ id: 'a', name: 'A', x: 0, y: 0, requires: ['I'] }, { id: 'b', name: 'B', x: 0, y: 300, provides: ['I'] }],
      [{ from: 'a', to: 'b', kind: 'assembly', interface: 'I' }],
    );
    const ball = find(s, 'comp:i:b:p:I:ball');
    if (ball.kind !== 'circle') throw new Error();
    expect(ball.y).toBeLessThan(s.frame('b').y - s.frame('b').h / 2); // above b, toward a
  });
  it('styles the connections: dependency dashed, delegate solid, both with open arrows', () => {
    expect(find(d, 'comp:conn:1:line')).toMatchObject({ dashed: true });
    expect(find(d, 'comp:conn:1:end')).toMatchObject({ role: 'end-open' });
    expect(find(d, 'comp:conn:1:label')).toMatchObject({ text: 'HTTP', size: COMPONENT.label });
    // the label sits beside the line, not on it
    const label = find(d, 'comp:conn:1:label'), line = find(d, 'comp:conn:1:line') as PathNode;
    if (label.kind !== 'text') throw new Error();
    const onLine = line.points.slice(1).some(([x1, y1], i) => {
      const [x0, y0] = line.points[i];
      return Math.abs(x1 - x0) < 1 ? Math.abs(label.x - x0) < 1 : Math.abs(y1 - y0) < 1 ? Math.abs(label.y - y0) < 1 : false;
    });
    expect(onLine).toBe(false);
    expect(find(d, 'comp:conn:2:line').dashed).toBeFalsy();
    expect(find(d, 'comp:conn:2:end')).toMatchObject({ role: 'end-open' });
    expect(has(d, 'comp:conn:0:line')).toBe(false); // the assembly is drawn by its socket
  });
  it('respects explicit positions, including a parent drawn round placed children', () => {
    const s = component([{ id: 'p', name: 'P' }, { id: 'c1', name: 'C1', parent: 'p', x: 100, y: 100 }, { id: 'c2', name: 'C2', parent: 'p', x: 400, y: 100 }]);
    expect(s.frame('c1')).toMatchObject({ x: 100, y: 100 });
    expect(inside(s.frame('c1'), s.frame('p')) && inside(s.frame('c2'), s.frame('p'))).toBe(true);
  });
  it('fades dimmed components and what hangs on them', () => {
    const f = component(parts, links, { dim: new Set(['pay']) });
    expect(find(f, 'comp:c:pay').opacity).toBeLessThan(1);
    expect(find(f, 'comp:asm:0:socket').opacity).toBeLessThan(1);
    expect(find(f, 'comp:c:web').opacity).toBe(1);
  });
});
