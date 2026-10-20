import { describe, expect, it } from 'vitest';
import { binaryTree, bounds, tree, treeFromLevelOrder } from '../src';
import type { TreeNode } from '../src';
import { tidy } from '../src/layout/tidy';

type N = { k: string; c?: N[] };
const n = (k: string, ...c: N[]): N => ({ k, c });
const place = (root: N, gap = 16) => {
  const out = new Map<string, { x: number; depth: number }>();
  for (const p of tidy(root, (x) => x.c, { gap })) out.set(p.node.k, { x: p.x, depth: p.depth });
  return out;
};

/** Every pair of nodes on the same depth is at least one box width + gap apart. */
function expectNoOverlap(pos: Map<string, { x: number; depth: number }>, w = 40, gap = 16) {
  const byDepth = new Map<number, number[]>();
  for (const p of pos.values()) (byDepth.get(p.depth) ?? byDepth.set(p.depth, []).get(p.depth)!).push(p.x);
  for (const xs of byDepth.values()) {
    xs.sort((a, b) => a - b);
    for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(w + gap - 1e-9);
  }
}

/** Every parent sits midway between its first and last child. */
function expectCentred(root: N, pos: Map<string, { x: number }>) {
  const walk = (t: N) => {
    if (t.c?.length) {
      expect(pos.get(t.k)!.x).toBeCloseTo((pos.get(t.c[0].k)!.x + pos.get(t.c[t.c.length - 1].k)!.x) / 2);
      t.c.forEach(walk);
    }
  };
  walk(root);
}

describe('tidy (Reingold–Tilford)', () => {
  it('a single node sits at 0', () => {
    expect(place(n('a')).get('a')).toEqual({ x: 0, depth: 0 });
  });

  it('a fan of leaves is packed one box + gap apart, centred under the root', () => {
    const p = place(n('r', n('a'), n('b'), n('c')));
    expect(['r', 'a', 'b', 'c'].map((k) => p.get(k)!.x)).toEqual([0, -56, 0, 56]);
  });

  it('compares whole contours: a deep grandchild never overlaps a cousin', () => {
    // two subtrees that lean towards each other two levels down
    const t = n('r', n('a', n('a1'), n('a2', n('a21'), n('a22'))), n('b', n('b1', n('b11'), n('b12')), n('b2')));
    const p = place(t);
    expectNoOverlap(p);
    expectCentred(t, p);
    // checking only the children's own boxes would have put a and b 56 apart, overlapping a22 and b11
    expect(p.get('b')!.x - p.get('a')!.x).toBeGreaterThan(56);
  });

  it('draws a subtree the same way wherever it appears', () => {
    const sub = () => n('s', n('s1'), n('s2', n('s21')));
    const p = place(n('r', n('x', sub()), n('y')));
    const q = place(n('r', n('y'), n('z', n('z1'), n('z2')), n('x', sub())));
    const rel = (m: Map<string, { x: number }>) => ['s1', 's2', 's21'].map((k) => m.get(k)!.x - m.get('s')!.x);
    expect(rel(p)).toEqual(rel(q));
  });

  it('is narrower than one column per leaf on a classic unbalanced tree', () => {
    const t = n('r', n('a', n('a1', n('a11'), n('a12'), n('a13'))), n('b'), n('c', n('c1'), n('c2')));
    const p = place(t);
    expectNoOverlap(p);
    expectCentred(t, p);
    const xs = [...p.values()].map((v) => v.x);
    const width = Math.max(...xs) - Math.min(...xs);
    expect(width).toBeLessThan((6 - 1) * 56); // six leaves, one column each
  });

  it('a null child is an empty slot, so a lone child keeps its side', () => {
    type B = { k: string; c?: (B | null)[] };
    const t: B = { k: 'r', c: [null, { k: 'right' }] };
    const [r, right] = tidy(t, (x) => x.c);
    expect(right.x).toBeGreaterThan(r.x);
  });
});

describe('ds.tree and binaryTree', () => {
  const org: TreeNode = { key: 'ceo', children: [{ key: 'cto', children: [{ key: 'dev1' }, { key: 'dev2' }] }, { key: 'cfo' }, { key: 'coo', children: [{ key: 'ops' }] }] };
  it('tree() keys nodes, labels and parent edges by key', () => {
    const t = tree(org);
    const ids = t.nodes.map((x) => x.id);
    expect(ids).toContain('tree:node:dev2');
    expect(ids).toContain('tree:edge:dev2');
    expect(ids).not.toContain('tree:edge:ceo');
    expect(t.pos('ceo')!.y).toBeLessThan(t.pos('cto')!.y);
  });
  it("layout: 'leaves' is never narrower than tidy", () => {
    expect(bounds(tree(org, { layout: 'leaves' })).w).toBeGreaterThanOrEqual(bounds(tree(org)).w);
  });
  it('rect nodes are as wide as their labels', () => {
    const t = tree({ key: 'root', label: 'a long label here', children: [{ key: 'x' }] }, { shape: 'rect' });
    const box = t.nodes.find((x) => x.id === 'tree:node:root');
    expect(box?.kind === 'rect' && box.w).toBeGreaterThan(150);
  });
  it("binaryTree({ layout: 'tidy' }) is narrower than in-order and keeps lone children on their side", () => {
    const root = treeFromLevelOrder([1, 2, 3, 4, 5, 6, 7, null, null, null, null, 8, 9, 10, 11])!;
    expect(bounds(binaryTree(root, { layout: 'tidy' })).w).toBeLessThan(bounds(binaryTree(root)).w);
    const lone = binaryTree({ key: 'p', right: { key: 'c' } }, { layout: 'tidy' });
    expect(lone.pos('c')!.x).toBeGreaterThan(lone.pos('p')!.x);
  });
});
