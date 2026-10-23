import { describe, expect, it } from 'vitest';
import { PathNode, Scene, SceneNode } from '@figurae/core';
import { activity, ActivityFlow, ActivityNode, component, Connection, ellipsePoints, UmlComponent, useCase, UseCaseActor, UseCaseOval, UseCaseRelation } from '@figurae/uml';

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

  it('draws each kind with its own role and a stable id', () => {
    expect(new Set(ids(d)).size).toBe(d.nodes.length);
    expect(find(d, 'act:n:s')).toMatchObject({ kind: 'circle', role: 'pseudo' });
    expect(find(d, 'act:n:pick')).toMatchObject({ kind: 'rect', role: 'card', data: { node: 'pick' } });
    expect(find(d, 'act:n:dec')).toMatchObject({ kind: 'path', role: 'decision', closed: true });
    expect(find(d, 'act:n:m')).toMatchObject({ role: 'decision' });
    expect(find(d, 'act:n:fork')).toMatchObject({ role: 'fork-bar' });
    expect(find(d, 'act:n:join')).toMatchObject({ role: 'fork-bar' });
    expect(find(d, 'act:n:e')).toMatchObject({ role: 'outline' });
    expect(find(d, 'act:n:e:dot')).toMatchObject({ role: 'pseudo' });
    expect(find(d, 'act:n:ff')).toMatchObject({ role: 'flow-final' });
    expect(has(d, 'act:n:ff:x1') && has(d, 'act:n:ff:x2')).toBe(true);
    expect(find(d, 'act:lane:a:title')).toMatchObject({ role: 'lane-title' });
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
    // lanes are a row of equal-height columns that touch
    expect(d.lanes.a.y).toBe(d.lanes.b.y);
    expect(d.lanes.a.x + d.lanes.a.w / 2).toBeCloseTo(d.lanes.b.x - d.lanes.b.w / 2);
  });
  it('puts the branches of a decision side by side in their lane, never overlapping', () => {
    expect(d.frame('yes').y).toBe(d.frame('no').y);
    expect(d.frame('yes').x).not.toBe(d.frame('no').x);
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) expect(overlap(d.frame(nodes[i].id), d.frame(nodes[j].id)), `${nodes[i].id}/${nodes[j].id}`).toBe(false);
  });
  it('stretches a fork across the nodes it touches', () => {
    const f = d.frame('fork'), j = d.frame('join');
    expect(j.w).toBeGreaterThan(f.w - 1); // x and y are as far apart either side
    for (const k of ['x', 'y']) expect(Math.abs(d.frame(k).x - j.x)).toBeLessThan(j.w / 2);
    for (const k of ['x', 'y']) expect(Math.abs(d.frame(k).x - f.x)).toBeLessThan(f.w / 2);
    expect(f.h).toBe(6);
  });
  it('labels guards with brackets and halo-ed edge labels', () => {
    expect(find(d, 'act:flow:2:label')).toMatchObject({ text: '[x > 0]', role: 'edge-label' });
    expect(find(d, 'act:flow:3:label')).toMatchObject({ text: '[else]' });
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
  });
  it('draws flows from the edge of one node to the edge of the next, with an arrow', () => {
    const line = find(d, 'act:flow:1:line') as PathNode;
    const a = d.frame('pick'), b = d.frame('dec');
    expect(line.points[0][1]).toBeCloseTo(a.y + a.h / 2);
    const tip = (find(d, 'act:flow:1:end') as PathNode).points[0];
    expect(tip[1]).toBeCloseTo(b.y - b.h / 2);
    expect(find(d, 'act:flow:1:end')).toMatchObject({ role: 'end-solid' });
  });
  it('routes a retry loop up the right side, clear of the nodes', () => {
    const loop = activity([{ id: 'a' }, { id: 'b' }, { id: 'c' }], [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }, { from: 'c', to: 'a', guard: 'retry' }]);
    const line = find(loop, 'act:flow:2:line') as PathNode;
    const right = Math.max(...['a', 'b', 'c'].map((k) => loop.frame(k).x + loop.frame(k).w / 2));
    expect(Math.max(...line.points.map((p) => p[0]))).toBeGreaterThan(right);
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
    expect(bar.h).toBeGreaterThan(80);
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
  });
  it('joins an assembly as a socket closed round the provider\'s ball', () => {
    const ball = find(d, 'comp:i:pay:p:IPay:ball');
    const socket = find(d, 'comp:asm:0:socket') as PathNode;
    if (ball.kind !== 'circle') throw new Error();
    for (const [x, y] of socket.points) expect(Math.hypot(x - ball.x, y - ball.y)).toBeCloseTo(11);
    expect(socket.role).toBe('socket');
    // the half circle bulges toward the requirer (to the left), so its middle point is its leftmost
    expect(socket.points[4][0]).toBeLessThan(ball.x);
    // the ball is on the provider's side facing the requirer, the stub reaches the requirer's edge
    expect(ball.x).toBeLessThan(d.frame('pay').x - d.frame('pay').w / 2);
    const stub = find(d, 'comp:asm:0:stub') as PathNode;
    expect(stub.points[0][0]).toBeCloseTo(d.frame('orders').x + d.frame('orders').w / 2);
    // the requirer's own socket is not drawn separately while it is plugged in
    expect(has(d, 'comp:i:orders:r:IPay:arc')).toBe(false);
    expect(has(d, 'comp:i:pay:p:IPay:stub')).toBe(true);
  });
  it('draws an unconnected requirement as a socket on the box edge', () => {
    const s = component([{ id: 'a', name: 'A', x: 0, y: 0, requires: ['IFoo'] }]);
    const f = s.frame('a');
    const stub = find(s, 'comp:i:a:r:IFoo:stub') as PathNode;
    expect(stub.points[0][0]).toBeCloseTo(f.x + f.w / 2); // by default a requirement leaves to the right
    const arc = find(s, 'comp:i:a:r:IFoo:arc') as PathNode;
    expect(arc.role).toBe('socket');
    expect(arc.closed).toBeFalsy();
    expect(arc.points).toHaveLength(9);
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
    expect(find(d, 'comp:conn:1:label')).toMatchObject({ text: 'HTTP' });
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
