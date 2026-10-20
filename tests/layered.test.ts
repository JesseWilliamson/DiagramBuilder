import { describe, expect, it } from 'vitest';
import { graph, sys, uml } from '../src';
import { layered, pack } from '../src/layout/layered';

/** A small deterministic PRNG (mulberry32), so the "random" graphs are the same every run. */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('pack', () => {
  it('keeps wanted positions that already respect the gaps', () => {
    expect(pack([0, 100, 200], [0, 50, 50])).toEqual([0, 100, 200]);
  });
  it('pushes violators apart symmetrically around where they wanted to be', () => {
    expect(pack([0, 0], [0, 40])).toEqual([-20, 20]);
    expect(pack([10, 10, 10], [0, 20, 20])).toEqual([-10, 10, 30]);
  });
});

describe('layered', () => {
  // a diamond with a tail: a → b, a → c, b → d, c → d, d → e
  const nodes = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, w: 40, h: 40 }));
  const diamond = [
    { from: 'a', to: 'b' }, { from: 'a', to: 'c' }, { from: 'b', to: 'd' }, { from: 'c', to: 'd' }, { from: 'd', to: 'e' },
  ];

  it('places a 5-node DAG exactly', () => {
    const L = layered(nodes, diamond);
    expect(L.layers).toEqual([['a'], ['b', 'c'], ['d'], ['e']]);
    // layers 96 apart (40 tall + 56 gap); b and c 68 apart (40 wide + 28 gap), centred under a
    expect(nodes.map((n) => L.pos(n.id))).toEqual([
      { x: 0, y: 0 }, { x: -34, y: 96 }, { x: 34, y: 96 }, { x: 0, y: 192 }, { x: 0, y: 288 },
    ]);
    expect(L.crossings).toBe(0);
  });

  it("direction 'right' swaps the axes", () => {
    const L = layered(nodes, diamond, { direction: 'right' });
    expect(L.pos('b')).toEqual({ x: 96, y: -34 });
    expect(L.pos('e')).toEqual({ x: 288, y: 0 });
  });

  it('routes a long edge through one point per skipped layer', () => {
    const L = layered(nodes, [...diamond, { from: 'a', to: 'e' }]);
    const p = L.path('a', 'e');
    expect(p.map((q) => q.y)).toEqual([0, 96, 192, 288]); // a, a bend in each skipped layer, e
    // the bends sit in the layers they cross, beside the boxes there, never on top of one
    for (const q of p.slice(1, -1)) for (const id of ['b', 'c', 'd']) expect(Math.abs(q.x - L.pos(id).x) >= 20 || Math.abs(q.y - L.pos(id).y) >= 20).toBe(true);
    // an elbow route is axis-aligned and leaves through the bottom of a, enters the top of e
    const el = L.route('a', 'e', 'elbow');
    expect(el[0]).toEqual({ x: L.pos('a').x, y: 20 });
    expect(el.at(-1)).toEqual({ x: L.pos('e').x, y: 288 - 20 });
    for (let i = 1; i < el.length; i++) expect(el[i].x === el[i - 1].x || el[i].y === el[i - 1].y).toBe(true);
  });

  it('is deterministic for a given input order', () => {
    const a = layered(nodes, diamond), b = layered(nodes.map((n) => ({ ...n })), diamond.map((e) => ({ ...e })));
    expect(nodes.map((n) => a.pos(n.id))).toEqual(nodes.map((n) => b.pos(n.id)));
  });

  it('breaks cycles without hanging, and routes the flipped edge backwards', () => {
    const L = layered(nodes, [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }, { from: 'c', to: 'a' }, { from: 'c', to: 'd' }, { from: 'd', to: 'c' }, { from: 'e', to: 'e' }]);
    expect([...L.reversed].sort()).toEqual(['c>a', 'd>c']);
    for (const n of nodes) expect(Number.isFinite(L.pos(n.id).x) && Number.isFinite(L.pos(n.id).y)).toBe(true);
    const back = L.path('c', 'a');
    expect(back[0]).toEqual(L.pos('c'));
    expect(back.at(-1)).toEqual(L.pos('a'));
  });

  it('keeps its invariants on random DAGs', () => {
    const rand = rng(7);
    for (let t = 0; t < 40; t++) {
      const n = 3 + Math.floor(rand() * 18);
      const ns = Array.from({ length: n }, (_, i) => ({ id: `n${i}`, w: 30 + Math.floor(rand() * 80), h: 24 + Math.floor(rand() * 30) }));
      const es: { from: string; to: string }[] = [];
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (rand() < 0.18) es.push({ from: `n${i}`, to: `n${j}` });
      for (const direction of ['down', 'right'] as const) {
        const L = layered(ns, es, { direction });
        // every node placed
        expect(L.layers.flat().sort()).toEqual(ns.map((x) => x.id).sort());
        // edges go down (or right), and nothing was reversed in a DAG
        expect(L.reversed.size).toBe(0);
        for (const e of es) {
          const a = L.pos(e.from), b = L.pos(e.to);
          expect(direction === 'down' ? b.y > a.y : b.x > a.x).toBe(true);
        }
        // no two boxes overlap
        for (let i = 0; i < n; i++)
          for (let j = i + 1; j < n; j++) {
            const a = L.pos(ns[i].id), b = L.pos(ns[j].id);
            const apart = Math.abs(a.x - b.x) >= (ns[i].w + ns[j].w) / 2 - 1e-6 || Math.abs(a.y - b.y) >= (ns[i].h + ns[j].h) / 2 - 1e-6;
            expect(apart).toBe(true);
          }
      }
    }
  });
});

describe('families use the layered layout for unplaced nodes', () => {
  it("graph({ layout: 'layered' }) puts each edge's target below its source", () => {
    const g = graph([{ id: 'a' }, { id: 'b' }, { id: 'c' }], [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }, { from: 'a', to: 'c' }], { layout: 'layered', directed: true });
    expect(g.pos('a').y).toBeLessThan(g.pos('b').y);
    expect(g.pos('b').y).toBeLessThan(g.pos('c').y);
    // the long edge a → c bends around b: it is drawn as a connector with an arrowhead
    expect(g.nodes.some((n) => n.id === 'graph:edge:a-c:end')).toBe(true);
  });
  it('the default layout is still the circle', () => {
    const g = graph([{ id: 'a' }, { id: 'b' }], []);
    expect(g.pos('a').x).toBeCloseTo(0);
    expect(g.pos('a').y).toBeCloseTo(-90);
  });
  it('architecture places components without x/y left to right along the links', () => {
    const a = sys.architecture(
      [{ id: 'web', kind: 'client', label: 'Web' }, { id: 'api', kind: 'service', label: 'API' }, { id: 'db', kind: 'db', label: 'DB' }],
      [{ from: 'web', to: 'api' }, { from: 'api', to: 'db' }],
    );
    expect(a.frame('web').x).toBeLessThan(a.frame('api').x);
    expect(a.frame('api').x).toBeLessThan(a.frame('db').x);
    // a placed component stays put
    expect(sys.architecture([{ id: 'x', kind: 'db', label: 'X', x: 5, y: 7 }]).frame('x')).toMatchObject({ x: 5, y: 7 });
  });
  it('class diagrams put parents above children', () => {
    const d = uml.classDiagram(
      [{ id: 'Shape', name: 'Shape' }, { id: 'Circle', name: 'Circle' }, { id: 'Square', name: 'Square' }],
      [{ from: 'Circle', to: 'Shape', kind: 'inherits' }, { from: 'Square', to: 'Shape', kind: 'inherits' }],
    );
    expect(d.box('Shape').y).toBeLessThan(d.box('Circle').y);
    expect(d.box('Circle').y).toBe(d.box('Square').y);
  });
});

describe('graph shapes and kinds', () => {
  it("shape: 'rect' sizes each node to its label and stops edges at the box", () => {
    const g = graph([{ id: 'a', label: 'parseConfig', x: 0, y: 0 }, { id: 'b', label: 'b', x: 300, y: 0 }], [{ from: 'a', to: 'b' }], { shape: 'rect' });
    const a = g.nodes.find((n) => n.id === 'graph:node:a');
    const b = g.nodes.find((n) => n.id === 'graph:node:b');
    expect(a?.kind).toBe('rect');
    expect(a?.kind === 'rect' && b?.kind === 'rect' && a.w > b.w).toBe(true);
    const edge = g.nodes.find((n) => n.id === 'graph:edge:a-b');
    // the line starts at a's right edge, not 22px (a circle's radius) from its centre
    expect(edge?.kind === 'arrow' && a?.kind === 'rect' && edge.x1).toBeCloseTo(a?.kind === 'rect' ? a.w / 2 : 0);
  });
  it('a node kind becomes its role, so the stylesheet decides the colour', () => {
    const g = graph([{ id: 'f', kind: 'changed' }, { id: 't', kind: 'test' }, { id: 'x' }], []);
    expect(g.nodes.find((n) => n.id === 'graph:node:f')?.role).toBe('node-changed');
    expect(g.nodes.find((n) => n.id === 'graph:node:t')?.role).toBe('node-test');
    expect(g.nodes.find((n) => n.id === 'graph:node:x')?.role).toBeUndefined();
  });
  it('the stylesheet colours the four built-in kinds', async () => {
    const { DEFAULT_CSS } = await import('../src/styles');
    for (const k of ['changed', 'upstream', 'downstream', 'test']) expect(DEFAULT_CSS).toContain(`.dv-role-node-${k}`);
  });
});
