import { describe, expect, it } from 'vitest';
import { Scene, SceneNode } from 'dsviz';
import { Artifact, DEPLOY, DeployNode, NODE_DEPTH, headHeight, classSize, deployment } from 'dsviz/uml';

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
