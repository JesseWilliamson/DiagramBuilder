import { describe, expect, it } from 'vitest';
import { Scene, SceneNode } from '@dsviz/core';
import { Artifact, DEPLOY, DeployNode, NODE_DEPTH, PACKAGE_RELATION, headHeight, TAB_H, UmlObject, UmlPackage, classSize, deployment, objectDiagram, objectSize, objectTitle, packageDiagram } from '@dsviz/uml';

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
    // the nested node's faces stay inside the parent too, below its title band, with the padding all round
    const j = d.box('jvm'), p = d.box('srv');
    expect(j.y - j.h / 2 - NODE_DEPTH).toBeGreaterThanOrEqual(p.y - p.h / 2 + headHeight(nodes[1]));
    expect(j.x + j.w / 2 + NODE_DEPTH).toBeLessThanOrEqual(p.x + p.w / 2 - DEPLOY.pad + 0.01);
    expect(j.x - j.w / 2).toBeGreaterThanOrEqual(p.x - p.w / 2 + DEPLOY.pad - 0.01);
    expect(j.y + j.h / 2).toBeLessThanOrEqual(p.y + p.h / 2 - DEPLOY.pad + 0.01);
  });
  it('sizes the title band from the stereotype and the name, 13px bold over 11px italic', () => {
    expect(headHeight({ id: 'n', name: 'N' })).toBe(6 + DEPLOY.title);
    expect(headHeight(nodes[0])).toBe(6 + DEPLOY.stereoLine + DEPLOY.title);
    const name = get(d, 'deploy:client:name'), stereo = get(d, 'deploy:client:stereo');
    expect(name).toMatchObject({ kind: 'text', text: 'Laptop', size: DEPLOY.name, role: 'node-name' });
    expect(stereo).toMatchObject({ kind: 'text', text: '«device»', size: DEPLOY.stereo, role: 'stereotype' });
    if (name?.kind !== 'text' || stereo?.kind !== 'text') throw new Error();
    expect(stereo.y).toBeLessThan(name.y);
    const f = d.box('client');
    expect(name.y + DEPLOY.name / 2).toBeLessThanOrEqual(f.y - f.h / 2 + headHeight(nodes[0]));
  });
  it('draws an artifact as a card with its name in 12px at the left and the page icon at the top-right', () => {
    const f = d.box('a1');
    expect(get(d, 'deploy:a1')).toMatchObject({ kind: 'rect', role: 'artifact', h: DEPLOY.artifact.h });
    const name = get(d, 'deploy:a1:name'), icon = get(d, 'deploy:a1:icon'), fold = get(d, 'deploy:a1:fold');
    expect(name).toMatchObject({ text: 'app.war', size: DEPLOY.artifactName, anchor: 'start', role: 'artifact-name' });
    if (name?.kind !== 'text' || icon?.kind !== 'path' || fold?.kind !== 'path') throw new Error();
    expect(name.x).toBeCloseTo(f.x - f.w / 2 + 8);
    const xs = icon.points.map((p) => p[0]), ys = icon.points.map((p) => p[1]);
    expect(Math.max(...xs) - Math.min(...xs)).toBe(DEPLOY.artifact.icon.w);
    expect(Math.max(...ys) - Math.min(...ys)).toBe(DEPLOY.artifact.icon.h);
    expect(Math.max(...xs)).toBeCloseTo(f.x + f.w / 2 - 8);
    expect(Math.min(...xs)).toBeGreaterThan(name.x + name.text.length * DEPLOY.artifactName * 0.6); // never over the name
    expect(fold.closed).toBeFalsy();
    expect(icon.role).toBe('artifact-icon');
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
    expect(Math.abs(d.box('client').y - d.box('srv').y)).toBeLessThan(1);
    // with air between them, and top to bottom on request
    expect(d.box('srv').x - d.box('srv').w / 2 - (d.box('client').x + d.box('client').w / 2 + NODE_DEPTH)).toBeGreaterThanOrEqual(90);
    const down = deployment(nodes, arts, links, { direction: 'down' });
    expect(down.box('client').y).toBeLessThan(down.box('srv').y);
    expect(Math.abs(down.box('client').x - down.box('srv').x)).toBeLessThan(1);
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
    expect(label).toMatchObject({ size: DEPLOY.stereo, role: 'edge-label' });
    // the label is lifted off the line: a horizontal line gets it 9 above the middle
    if (label?.kind !== 'text' || comm?.kind !== 'path') throw new Error();
    const [[x0, y0], [x1, y1]] = comm.points;
    expect(y1).toBeCloseTo(y0);
    expect(label.x).toBeCloseTo((x0 + x1) / 2);
    expect(label.y).toBeCloseTo(y0 - 9);
    // a vertical line gets it beside, anchored at its start
    const v = deployment([{ id: 'a', name: 'A', x: 0, y: 0 }, { id: 'b', name: 'B', x: 0, y: 200 }], [], [{ from: 'a', to: 'b', protocol: 'TCP' }]);
    const vl = get(v, 'deploy:link:a-comm-b:label');
    expect(vl).toMatchObject({ anchor: 'start', x: 7 });
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
  it('underlines each title, 2px under the baseline and as wide as the text', () => {
    expect(byRole(d, 'object-name-underline')).toHaveLength(3);
    const name = get(d, 'obj:c:name'), line = get(d, 'obj:c:underline');
    if (name?.kind !== 'text' || line?.kind !== 'path') throw new Error('missing');
    expect(line.points[0][1]).toBeCloseTo(name.y + 14 * 0.35 + 2); // 14px text centred on y: baseline ≈ 0.35em down
    expect(line.points[0][1]).toBe(line.points[1][1]);
    const w = line.points[1][0] - line.points[0][0];
    expect(w).toBeGreaterThan(14 * 0.5 * 'c1 : Circle'.length);
    expect(w).toBeLessThan(14 * 0.65 * 'c1 : Circle'.length);
    expect((line.points[0][0] + line.points[1][0]) / 2).toBeCloseTo(name.x); // centred under the title
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
    expect(end?.role).toBe('link-role');
    // the role name sits beside the line, 10px off it near the end, not on it
    const line = get(d, 'obj:link:p-c:line');
    if (line?.kind !== 'path' || end?.kind !== 'text') throw new Error('missing');
    const [tx, ty] = line.points[line.points.length - 1], [fx, fy] = line.points[line.points.length - 2];
    const len = Math.hypot(tx - fx, ty - fy), dx = (tx - fx) / len, dy = (ty - fy) / len;
    const off = Math.abs((end.x - tx) * -dy + (end.y - ty) * dx);
    expect(off).toBeCloseTo(6);
    expect(Math.abs((end.x - tx) * dx + (end.y - ty) * dy)).toBeCloseTo(12); // 12px back out from the box edge
    expect(end.size).toBe(11);
  });
  it('routes with one elbow by default, straight on request, leaving through the facing edges', () => {
    const line = get(d, 'obj:link:p-c:line');
    if (line?.kind !== 'path') throw new Error('missing');
    expect(line.points).toHaveLength(4);
    expect(line.points[0][1]).toBeCloseTo(d.box('p').y + d.box('p').h / 2); // bottom edge of p…
    expect(line.points[3][1]).toBeCloseTo(d.box('c').y - d.box('c').h / 2); // …to the top edge of c
    expect(line.points[0][0]).toBe(line.points[1][0]); // vertical stub, horizontal middle, vertical stub
    expect(line.points[1][1]).toBe(line.points[2][1]);
    const st = get(objectDiagram(objs, links, { route: 'straight' }), 'obj:link:p-c:line');
    expect(st?.kind === 'path' && st.points).toHaveLength(2);
  });
  it('spreads several links on one side of a box along that edge, in the order of their far ends', () => {
    const pc = get(d, 'obj:link:p-c:line'), pu = get(d, 'obj:link:p-u:line');
    if (pc?.kind !== 'path' || pu?.kind !== 'path') throw new Error('missing');
    expect(pc.points[0][1]).toBe(pu.points[0][1]); // both leave p's bottom edge…
    expect(Math.abs(pc.points[0][0] - pu.points[0][0])).toBeCloseTo(24); // …24px apart…
    expect(Math.sign(pc.points[0][0] - pu.points[0][0])).toBe(Math.sign(d.box('c').x - d.box('u').x)); // …without crossing
    const p = d.box('p');
    for (const x of [pc.points[0][0], pu.points[0][0]]) { expect(x).toBeGreaterThan(p.x - p.w / 2); expect(x).toBeLessThan(p.x + p.w / 2); }
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
  // the examples page's app: three nested packages in rows and a shared util
  const app: UmlPackage[] = [
    { id: 'web', name: 'web', children: [{ id: 'ui', name: 'ui' }, { id: 'api', name: 'api' }] },
    { id: 'domain', name: 'domain', children: [{ id: 'services', name: 'services' }, { id: 'model', name: 'model' }] },
    { id: 'infra', name: 'infra', children: [{ id: 'db', name: 'db' }, { id: 'http', name: 'http' }] },
    { id: 'util', name: 'util' },
  ];
  const appRels = [
    { from: 'ui', to: 'api', kind: 'import' as const },
    { from: 'api', to: 'services', kind: 'import' as const },
    { from: 'services', to: 'model', kind: 'access' as const },
    { from: 'db', to: 'model', kind: 'dependency' as const },
    { from: 'http', to: 'util', kind: 'merge' as const },
    { from: 'api', to: 'util', kind: 'import' as const },
  ];
  const flat = (ps: readonly UmlPackage[]): UmlPackage[] => ps.flatMap((q) => [q, ...flat(q.children ?? [])]);
  const ancestors = (ps: readonly UmlPackage[], k: string, trail: string[] = []): string[] => {
    for (const q of ps) {
      if (q.id === k) return [...trail, k];
      const t = ancestors(q.children ?? [], k, [...trail, q.id]);
      if (t.length) return t;
    }
    return [];
  };
  /** The whole symbol (body + tab) as a top-left box. */
  const outer = (s: ReturnType<typeof packageDiagram>, k: string) => { const f = s.box(k); return { x: f.x - f.w / 2, y: f.y - f.h / 2 - TAB_H, w: f.w, h: f.h + TAB_H }; };
  const segmentCrosses = ([ax, ay]: readonly [number, number], [bx, by]: readonly [number, number], b: { x: number; y: number; w: number; h: number }) => {
    const x0 = Math.min(ax, bx), x1 = Math.max(ax, bx), y0 = Math.min(ay, by), y1 = Math.max(ay, by);
    return x0 < b.x + b.w - 0.5 && x1 > b.x + 0.5 && y0 < b.y + b.h - 0.5 && y1 > b.y + 0.5;
  };
  const crossings = (ps: readonly UmlPackage[], rs: readonly { from: string; to: string; kind: 'import' | 'access' | 'merge' | 'dependency' }[], s: ReturnType<typeof packageDiagram>) =>
    rs.flatMap((r) => {
      const pts = lastPoint(get(s, `pkg:rel:${r.from}-${r.kind}-${r.to}:line`));
      const skip = new Set([...ancestors(ps, r.from), ...ancestors(ps, r.to)]);
      return flat(ps).filter((q) => !skip.has(q.id)).filter((q) => pts.some((p, i) => i > 0 && segmentCrosses(pts[i - 1], p, outer(s, q.id)))).map((q) => `${r.from}→${r.to} through ${q.id}`);
    });

  it('unique ids, one folder outline and a name for each package', () => {
    expect(new Set(ids(d)).size).toBe(d.nodes.length);
    expect(byRole(d, 'package')).toHaveLength(7);
    expect(byRole(d, 'package-name')).toHaveLength(7);
    expect(d.nodes.every((n) => n.role)).toBe(true);
    // the outline is one closed path: tab top-left, then the body
    const core = d.box('core'), o = get(d, 'pkg:core');
    expect(o).toMatchObject({ kind: 'path', closed: true, data: { package: 'core' } });
    const pts = lastPoint(o);
    expect(pts).toHaveLength(7);
    expect(pts[1]).toEqual([core.x - core.w / 2, core.y - core.h / 2 - TAB_H]);
    expect(pts[5]).toEqual([core.x + core.w / 2, core.y + core.h / 2]);
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
  it('siblings do not overlap, and related siblings sit side by side across the rows', () => {
    const a = d.box('auth'), b = d.box('billing');
    expect(Math.abs(a.x - b.x) >= (a.w + b.w) / 2 || Math.abs(a.y - b.y) >= (a.h + b.h) / 2).toBe(true);
    // flows alternate with depth: core's children sit in a row, services' (one level deeper) in a column, billing above auth
    expect(b.x).toBeCloseTo(a.x);
    expect(b.y).toBeLessThan(a.y);
    expect(d.box('model').y).toBeCloseTo(d.box('services').y); // columns of a row are centred on one line
    const g = packageDiagram(app, appRels);
    expect(g.box('db').y).toBeCloseTo(g.box('http').y);
  });
  it('puts the name in the tab when there are children, centred in the body otherwise', () => {
    const core = d.box('core'), leaf = d.box('ui');
    const inTab = get(d, 'pkg:core:name'), centred = get(d, 'pkg:ui:name');
    expect(inTab).toMatchObject({ y: core.y - core.h / 2 - TAB_H / 2, size: 12 });
    expect((inTab as { x: number }).x).toBeLessThan(core.x);
    expect(centred).toMatchObject({ x: leaf.x, y: leaf.y, size: 13 });
  });
  it('lays top-level packages in rows along the relations when x/y are absent, tops flush', () => {
    expect(d.box('ui').y).toBeLessThan(d.box('core').y);
    const g = packageDiagram(app, appRels);
    expect(g.box('web').y).toBeLessThan(g.box('domain').y);
    expect(outer(g, 'domain').y).toBeCloseTo(outer(g, 'util').y);
    const cols = packageDiagram(pk, rels, { direction: 'right' });
    expect(cols.box('ui').x).toBeLessThan(cols.box('core').x);
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
    expect(l).toMatchObject({ text: '«import»', size: 11, role: 'package-rel-label' });
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
  it('routes at right angles, in lanes between the rows, never through a package it does not join', () => {
    for (const [ps, rs] of [[pk, rels], [app, appRels]] as const) {
      const s = packageDiagram(ps, rs);
      for (const r of rs) {
        const pts = lastPoint(get(s, `pkg:rel:${r.from}-${r.kind}-${r.to}:line`));
        expect(pts.length).toBeGreaterThanOrEqual(2);
        for (let i = 1; i < pts.length; i++) expect(Math.abs(pts[i][0] - pts[i - 1][0]) < 0.01 || Math.abs(pts[i][1] - pts[i - 1][1]) < 0.01).toBe(true);
      }
      expect(crossings(ps, rs, s)).toEqual([]);
    }
    // four lines share the gap between the two rows of the app: each on its own lane
    const g = packageDiagram(app, appRels);
    const laneY = (from: string, kind: string, to: string) => lastPoint(get(g, `pkg:rel:${from}-${kind}-${to}:line`)).find((p, i, a) => i > 0 && Math.abs(p[1] - a[i - 1][1]) < 0.01)![1];
    const lanes = [laneY('api', 'import', 'services'), laneY('api', 'import', 'util'), laneY('db', 'dependency', 'model'), laneY('http', 'merge', 'util')];
    expect(new Set(lanes.map((y) => Math.round(y))).size).toBe(4);
    const web = outer(g, 'web'), domain = outer(g, 'domain');
    for (const y of lanes) { expect(y).toBeGreaterThan(web.y + web.h); expect(y).toBeLessThan(domain.y); }
    // two lines leaving api's bottom get their own ports
    const exits = [lastPoint(get(g, 'pkg:rel:api-import-services:line'))[0], lastPoint(get(g, 'pkg:rel:api-import-util:line'))[0]];
    expect(exits[0][1]).toBeCloseTo(exits[1][1]);
    expect(exits[0][0]).not.toBeCloseTo(exits[1][0]);
  });
  it('steps around a sibling that sits in the way out', () => {
    // a and b are stacked under p (a → b and a → c put b and c in one column); b → q must not run through c
    const ps: UmlPackage[] = [{ id: 'p', name: 'p', children: [{ id: 'a', name: 'a' }, { id: 'b', name: 'b' }, { id: 'c', name: 'c' }] }, { id: 'q', name: 'q' }];
    const rs = [{ from: 'a', to: 'b', kind: 'import' as const }, { from: 'a', to: 'c', kind: 'import' as const }, { from: 'b', to: 'q', kind: 'import' as const }, { from: 'c', to: 'q', kind: 'import' as const }];
    const s = packageDiagram(ps, rs);
    expect(crossings(ps, rs, s)).toEqual([]);
  });
  it('keeps labels off their line', () => {
    const g = packageDiagram(app, appRels);
    for (const r of appRels) {
      const k = `pkg:rel:${r.from}-${r.kind}-${r.to}`, l = get(g, `${k}:label`);
      if (!l || l.kind !== 'text') continue;
      const pts = lastPoint(get(g, `${k}:line`));
      const dist = pts.slice(1).map((p, i) => {
        const [ax, ay] = pts[i], [bx, by] = p, dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy || 1;
        const t = Math.max(0, Math.min(1, ((l.x - ax) * dx + (l.y - ay) * dy) / len2));
        return Math.hypot(l.x - (ax + t * dx), l.y - (ay + t * dy));
      });
      expect(Math.min(...dist)).toBeGreaterThanOrEqual(6);
    }
  });
  it('a flattened view keeps the leaf ids, so the boxes slide between the two', () => {
    const leaves = flat(app).filter((q) => !q.children?.length).map((q) => ({ ...q, children: undefined }));
    const f = packageDiagram(leaves, appRels);
    for (const q of leaves) expect(get(f, `pkg:${q.id}`)).toBeDefined();
    expect(get(f, 'pkg:web')).toBeUndefined();
    expect(f.box('ui').y).toBeLessThan(f.box('api').y);
    expect(crossings(leaves, appRels, f)).toEqual([]);
  });
  it('click and drag data; drag only top-level; dim fades', () => {
    const i = packageDiagram(pk, rels, { interactive: true, draggable: true, dim: new Set(['util']) });
    expect(get(i, 'pkg:core')).toMatchObject({ interactive: true, draggable: true, data: { package: 'core' } });
    expect(get(i, 'pkg:auth')?.draggable).toBeFalsy();
    expect(get(i, 'pkg:util')?.opacity).toBe(0.3);
    expect(get(i, 'pkg:rel:auth-merge-util:line')?.opacity).toBe(0.25);
  });
});
