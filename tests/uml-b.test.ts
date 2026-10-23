import { describe, expect, it } from 'vitest';
import { Scene, SceneNode } from '@figurae/core';
import { Artifact, DeployNode, NODE_DEPTH, PACKAGE_RELATION, TAB_H, UmlObject, UmlPackage, classSize, deployment, objectDiagram, objectSize, objectTitle, packageDiagram } from '@figurae/uml';

const byRole = (s: Scene, role: string) => s.nodes.filter((n) => n.role === role);
const get = (s: Scene, id: string) => s.nodes.find((n) => n.id === id);
const ids = (s: Scene) => s.nodes.map((n) => n.id);
const inside = (inner: { x: number; y: number; w: number; h: number }, outer: { x: number; y: number; w: number; h: number }) =>
  inner.x - inner.w / 2 >= outer.x - outer.w / 2 - 0.01 && inner.x + inner.w / 2 <= outer.x + outer.w / 2 + 0.01 &&
  inner.y - inner.h / 2 >= outer.y - outer.h / 2 - 0.01 && inner.y + inner.h / 2 <= outer.y + outer.h / 2 + 0.01;
const lastPoint = (n: SceneNode | undefined) => (n?.kind === 'path' ? n.points : []);

describe('deployment', () => {
  const nodes: DeployNode[] = [
    { id: 'client', name: 'Laptop', stereotype: 'device' },
    { id: 'srv', name: 'Server', stereotype: 'device' },
    { id: 'jvm', name: 'JVM', stereotype: 'executionEnvironment', parent: 'srv' },
  ];
  const arts: Artifact[] = [
    { id: 'a1', name: 'app.war', node: 'jvm' },
    { id: 'a2', name: 'config.yml', node: 'jvm' },
    { id: 'a3', name: 'nginx.conf', node: 'srv' },
    { id: 'a4', name: 'browser', node: 'client' },
  ];
  const links = [{ from: 'client', to: 'srv', protocol: 'HTTPS' }, { from: 'a3', to: 'srv', kind: 'deploy' as const }];
  const d = deployment(nodes, arts, links);

  it('gives every part a unique id and a role', () => {
    expect(new Set(ids(d)).size).toBe(d.nodes.length);
    expect(d.nodes.every((n) => n.role)).toBe(true);
  });
  it('draws each node with a top and a right face', () => {
    expect(byRole(d, 'node-face-top')).toHaveLength(3);
    expect(byRole(d, 'node-face-side')).toHaveLength(3);
    const f = d.box('srv');
    const top = get(d, 'deploy:srv:top');
    expect(lastPoint(top)[0]).toEqual([f.x - f.w / 2, f.y - f.h / 2]);
    expect(lastPoint(top)[1]).toEqual([f.x - f.w / 2 + NODE_DEPTH, f.y - f.h / 2 - NODE_DEPTH]);
  });
  it('places artifacts inside their node and nested nodes inside their parent', () => {
    for (const a of arts) expect(inside(d.box(a.id), d.box(a.node))).toBe(true);
    expect(inside(d.box('jvm'), d.box('srv'))).toBe(true);
    // the artifacts of the nested node sit inside the nested node, not just the server
    expect(inside(d.box('a1'), d.box('jvm'))).toBe(true);
  });
  it('does not overlap sibling artifacts', () => {
    const a = d.box('a1'), b = d.box('a2');
    expect(Math.abs(a.x - b.x) >= a.w || Math.abs(a.y - b.y) >= a.h).toBe(true);
  });
  it('sizes a node to fit many artifacts in a grid', () => {
    const many = Array.from({ length: 5 }, (_, i): Artifact => ({ id: `m${i}`, name: `file${i}.jar`, node: 'srv' }));
    const g = deployment([{ id: 'srv', name: 'Server' }], many);
    for (const a of many) expect(inside(g.box(a.id), g.box('srv'))).toBe(true);
    expect(g.box('srv').h).toBeGreaterThan(deployment([{ id: 'srv', name: 'Server' }], many.slice(0, 2)).box('srv').h);
  });
  it('lays top-level nodes out left to right when x/y are absent, along the links', () => {
    expect(d.box('client').x).toBeLessThan(d.box('srv').x);
  });
  it('keeps given positions', () => {
    const p = deployment([{ id: 'n', name: 'N', x: 200, y: 100 }]);
    expect(p.box('n')).toMatchObject({ x: 200, y: 100 });
  });
  it('draws communication as a plain line labelled with the protocol, deploy as a dashed open arrow', () => {
    const comm = get(d, 'deploy:link:client-comm-srv:line');
    expect(comm?.dashed).toBeFalsy();
    expect(get(d, 'deploy:link:client-comm-srv:end')).toBeUndefined();
    const label = get(d, 'deploy:link:client-comm-srv:label');
    expect(label?.kind === 'text' && label.text).toBe('«HTTPS»');
    const dep = get(d, 'deploy:link:a3-deploy-srv:line');
    expect(dep?.dashed).toBe(true);
    expect(get(d, 'deploy:link:a3-deploy-srv:end')?.role).toBe('end-open');
    const dl = get(d, 'deploy:link:a3-deploy-srv:label');
    expect(dl?.kind === 'text' && dl.text).toBe('«deploy»');
  });
  it('passes data for clicks and drags, drag only on top-level nodes', () => {
    const i = deployment(nodes, arts, [], { interactive: true, draggable: true });
    expect(get(i, 'deploy:srv')).toMatchObject({ interactive: true, draggable: true, data: { node: 'srv' } });
    expect(get(i, 'deploy:jvm')?.draggable).toBeFalsy();
    expect(get(i, 'deploy:a1')).toMatchObject({ data: { artifact: 'a1' } });
  });
});

describe('objectDiagram', () => {
  const objs: UmlObject[] = [
    { id: 'c', name: 'c1', class: 'Circle', slots: { r: 5, filled: true } },
    { id: 'u', anonymous: true, class: 'Point', slots: { x: 1 } },
    { id: 'p', name: 'p', class: 'Plot' },
  ];
  const links = [{ from: 'p', to: 'c', fromRole: 'plot', toRole: 'shape', label: 'draws' }, { from: 'p', to: 'u' }];
  const d = objectDiagram(objs, links);

  it('titles instances name : Class, anonymous : Class', () => {
    expect(objectTitle(objs[0])).toBe('c1 : Circle');
    expect(objectTitle(objs[1])).toBe(': Point');
    const t = get(d, 'obj:u:name');
    expect(t?.kind === 'text' && t.text).toBe(': Point');
  });
  it('underlines each title', () => {
    expect(byRole(d, 'object-name-underline')).toHaveLength(3);
    const name = get(d, 'obj:c:name'), line = get(d, 'obj:c:underline');
    expect(name?.kind === 'text' && line?.kind === 'path' && line.points[0][1]).toBeGreaterThan((name as { y: number }).y);
  });
  it('lists slots as attr = value', () => {
    const s = get(d, 'obj:c:slot:1');
    expect(s?.kind === 'text' && s.text).toBe('filled = true');
    expect(get(d, 'obj:p:slot:0')).toBeUndefined();
    expect(get(d, 'obj:p:div1')).toBeUndefined();
  });
  it('matches classDiagram sizes exactly', () => {
    const u: UmlObject = { id: 'x', name: 'x', class: 'K', slots: { a: 1, b: 2 } };
    expect(objectSize(u)).toEqual(classSize({ id: 'x', name: 'x : K', attributes: ['a = 1', 'b = 2'] }));
    expect(d.box('c').h).toBe(objectSize(objs[0]).h);
  });
  it('collapsed hides slots and shrinks the boxes', () => {
    const k = objectDiagram(objs, links, { collapsed: true });
    expect(get(k, 'obj:c:slot:0')).toBeUndefined();
    expect(k.box('c').h).toBeLessThan(d.box('c').h);
  });
  it('lays out in layers along the links when x/y are absent', () => {
    expect(d.box('p').y).toBeLessThan(d.box('c').y);
    expect(d.box('p').y).toBeLessThan(d.box('u').y);
  });
  it('links are plain lines with role names at the ends', () => {
    expect(get(d, 'obj:link:p-c:line')).toBeDefined();
    expect(get(d, 'obj:link:p-c:start')).toBeUndefined();
    expect(get(d, 'obj:link:p-c:end')).toBeUndefined();
    const start = get(d, 'obj:link:p-c:start-label'), end = get(d, 'obj:link:p-c:end-label');
    expect(start?.kind === 'text' && start.text).toBe('plot');
    expect(end?.kind === 'text' && end.text).toBe('shape');
  });
  it('shares ids with classDiagram box parts so the two views morph', () => {
    expect(ids(objectDiagram([{ id: 'Circle', name: 'c', class: 'Circle' }], [], { id: 'uml' }))).toContain('uml:Circle:box');
  });
  it('dim fades, data carries the id', () => {
    const k = objectDiagram(objs, links, { dim: new Set(['c']), interactive: true, draggable: true });
    expect(get(k, 'obj:c:box')).toMatchObject({ opacity: 0.3, data: { object: 'c' }, draggable: true });
  });
});

describe('packageDiagram', () => {
  const pk: UmlPackage[] = [
    { id: 'ui', name: 'ui' },
    { id: 'core', name: 'core', children: [
      { id: 'model', name: 'model' },
      { id: 'services', name: 'services', children: [{ id: 'auth', name: 'auth' }, { id: 'billing', name: 'billing' }] },
    ] },
    { id: 'util', name: 'util' },
  ];
  const rels = [
    { from: 'ui', to: 'core', kind: 'import' as const },
    { from: 'services', to: 'model', kind: 'access' as const },
    { from: 'auth', to: 'util', kind: 'merge' as const },
    { from: 'billing', to: 'auth', kind: 'dependency' as const },
  ];
  const d = packageDiagram(pk, rels);

  it('unique ids, a tab and a body for each package', () => {
    expect(new Set(ids(d)).size).toBe(d.nodes.length);
    expect(byRole(d, 'package')).toHaveLength(7);
    expect(byRole(d, 'package-tab')).toHaveLength(7);
    expect(d.nodes.every((n) => n.role)).toBe(true);
  });
  it('contains children at any depth', () => {
    expect(inside(d.box('model'), d.box('core'))).toBe(true);
    expect(inside(d.box('services'), d.box('core'))).toBe(true);
    expect(inside(d.box('auth'), d.box('services'))).toBe(true);
    expect(inside(d.box('auth'), d.box('core'))).toBe(true);
    // the tab (TAB_H above the top) of a child stays inside the parent too
    const a = d.box('auth'), s = d.box('services');
    expect(a.y - a.h / 2 - TAB_H).toBeGreaterThan(s.y - s.h / 2);
  });
  it('siblings do not overlap', () => {
    const a = d.box('auth'), b = d.box('billing');
    expect(Math.abs(a.x - b.x) >= (a.w + b.w) / 2 || Math.abs(a.y - b.y) >= (a.h + b.h) / 2).toBe(true);
  });
  it('puts the name in the tab when there are children, centred in the body otherwise', () => {
    const core = d.box('core'), leaf = d.box('ui');
    const inTab = get(d, 'pkg:core:name'), centred = get(d, 'pkg:ui:name');
    expect(inTab).toMatchObject({ y: core.y - core.h / 2 - TAB_H / 2 });
    expect(centred).toMatchObject({ x: leaf.x, y: leaf.y });
  });
  it('lays top-level packages in layers along the relations when x/y are absent', () => {
    expect(d.box('ui').y).toBeLessThan(d.box('core').y);
  });
  it('keeps given positions for top-level packages', () => {
    const p = packageDiagram([{ id: 'a', name: 'a', x: 50, y: 60 }]);
    expect(p.box('a')).toMatchObject({ x: 50, y: 60 });
  });
  it('relations: dashed open arrows, stereotype labels, joining frames at any depth', () => {
    for (const r of rels) {
      const k = `pkg:rel:${r.from}-${r.kind}-${r.to}`;
      expect(get(d, `${k}:line`)?.dashed).toBe(true);
      expect(get(d, `${k}:end`)?.role).toBe('end-open');
    }
    const l = get(d, 'pkg:rel:ui-import-core:label'), m = get(d, 'pkg:rel:auth-merge-util:label');
    expect(l?.kind === 'text' && l.text).toBe('«import»');
    expect(m?.kind === 'text' && m.text).toBe('«merge»');
    expect(get(d, 'pkg:rel:billing-dependency-auth:label')).toBeUndefined();
    expect(Object.keys(PACKAGE_RELATION)).toEqual(['import', 'access', 'merge', 'dependency']);
    // the arrow tip of auth → util ends on util's frame
    // (an open marker is not trimmed, so the line itself ends at the tip)
    const tip = lastPoint(get(d, 'pkg:rel:auth-merge-util:line')).at(-1)!;
    const u = d.box('util');
    const onEdge = Math.abs(Math.abs(tip[0] - u.x) - u.w / 2) < 1.5 || Math.abs(Math.abs(tip[1] - u.y) - u.h / 2) < 1.5;
    expect(onEdge).toBe(true);
  });
  it('click and drag data; drag only top-level', () => {
    const i = packageDiagram(pk, [], { interactive: true, draggable: true });
    expect(get(i, 'pkg:core')).toMatchObject({ interactive: true, draggable: true, data: { package: 'core' } });
    expect(get(i, 'pkg:auth')?.draggable).toBeFalsy();
  });
});
