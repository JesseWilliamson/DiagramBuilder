/**
 * Trees: binary (`binaryTree`) and n-ary (`tree`).
 *
 * binaryTree's default layout is the simplest one that never overlaps:
 *   x = the node's position in an IN-ORDER traversal
 *   y = its depth
 * For a BST this has a lovely property: nodes are sorted left→right by key,
 * exactly like the array you'd get from an in-order walk. It's wider than a
 * "tidy" (Reingold–Tilford) layout. `layout: 'tidy'` uses layout/tidy.ts
 * instead, and `tree()` uses it by default.
 *
 * Exercise: before reading layout/tidy.ts, write it yourself. The tests in
 * tests/tidy.test.ts say what it must do (subtrees never overlap, parents sit
 * midway over their children, a subtree looks the same wherever it appears).
 *
 * Ids: a node's circle/label use its key; an edge uses its CHILD's key (every
 * node has exactly one parent edge), so after a rotation the edge re-attaches.
 * New nodes grow out of their parent via `enter`.
 */
import { Scene, SceneNode, V2, Vec, arrow, circle, circleEdge, estimateTextWidth, rect, rectEdge, text } from '../core';
import { tidy } from '../layout';
import { Key, ToneSpec, resolveTone, show } from './common';

export interface BinaryTreeNode {
  key: Key;
  label?: string | number;
  left?: BinaryTreeNode | null;
  right?: BinaryTreeNode | null;
}

export interface TreeOptions {
  id?: string;
  /** Top-centre of the tree. */
  x?: number;
  y?: number;
  r?: number;
  /** Horizontal spacing between in-order neighbours. Default 46. */
  dx?: number;
  /** Vertical spacing between levels. Default 66. */
  dy?: number;
  tones?: ToneSpec<Key, BinaryTreeNode>;
  /** Tone for the edge INTO a node (keyed by child key). */
  edgeTones?: ToneSpec<Key, BinaryTreeNode>;
  interactive?: boolean;
  /** Show small "null" stubs for missing children. Default false. */
  showNulls?: boolean;
  /** 'inorder' (default): one column per node, sorted like an in-order walk. 'tidy': Reingold–Tilford. */
  layout?: 'inorder' | 'tidy';
}

export interface TreeDiagram extends Scene {
  pos(key: Key): Vec | undefined;
  top(key: Key): Vec;
  bottom(key: Key): Vec;
  left(key: Key): Vec;
  right(key: Key): Vec;
}

export function binaryTree(root: BinaryTreeNode | null | undefined, o: TreeOptions = {}): TreeDiagram {
  const id = o.id ?? 'tree';
  const r = o.r ?? 20, dx = o.dx ?? 46, dy = o.dy ?? 66;
  const x0 = o.x ?? 0, y0 = (o.y ?? 0) + r;

  // 1. in-order index + depth for every node
  const placed: { node: BinaryTreeNode; parent: BinaryTreeNode | null; order: number; depth: number }[] = [];
  let counter = 0;
  const walk = (n: BinaryTreeNode | null | undefined, parent: BinaryTreeNode | null, depth: number) => {
    if (!n) return;
    walk(n.left, n, depth + 1);
    placed.push({ node: n, parent, order: counter++, depth });
    walk(n.right, n, depth + 1);
  };
  walk(root, null, 0);

  // 2. centre the whole thing horizontally on x0
  const pos = new Map<string, Vec>();
  if (o.layout === 'tidy' && root) {
    // An empty slot where exactly one child is missing, so a lone child keeps its side.
    const kids = (n: BinaryTreeNode) => (n.left || n.right ? [n.left ?? null, n.right ?? null] : []);
    for (const p of tidy(root, kids, { width: () => 2 * r, gap: dx - 2 * r, slot: 2 * r })) pos.set(String(p.node.key), V2(x0 + p.x, y0 + p.depth * dy));
  } else {
    for (const p of placed) pos.set(String(p.node.key), V2(x0 + (p.order - (counter - 1) / 2) * dx, y0 + p.depth * dy));
  }

  // 3. emit nodes: edges first so they sit underneath the circles; each label
  //    right after its circle, so CSS can move them together
  const edges: SceneNode[] = [];
  const circles: SceneNode[] = [];
  const labels: SceneNode[] = [];
  for (const { node, parent } of placed) {
    const p = pos.get(String(node.key))!;
    const from = parent ? pos.get(String(parent.key))! : undefined;
    const enter = from ? { x: from.x, y: from.y } : undefined;
    const tone = resolveTone(o.tones, node.key, node);
    circles.push(circle({ id: `${id}:node:${node.key}`, x: p.x, y: p.y, r, tone, enter, interactive: o.interactive, data: node }));
    circles.push(text({ id: `${id}:label:${node.key}`, x: p.x, y: p.y, text: show(node.label ?? node.key), size: 15, weight: 600, role: 'value', tone, enter }));
    if (from) {
      const a = circleEdge(from, p, r), b = circleEdge(p, from, r);
      edges.push(
        arrow({
          id: `${id}:edge:${node.key}`,
          x1: a.x, y1: a.y, x2: b.x, y2: b.y,
          head: false,
          tone: resolveTone(o.edgeTones, node.key, node),
          enter: { x1: a.x, y1: a.y, x2: a.x, y2: a.y }, // grows out of the parent
        }),
      );
    }
    if (o.showNulls) {
      for (const side of ['left', 'right'] as const) {
        if (node[side]) continue;
        const q = V2(p.x + (side === 'left' ? -1 : 1) * dx * 0.42, p.y + dy * 0.62);
        const a = circleEdge(p, q, r);
        edges.push(arrow({ id: `${id}:nulledge:${node.key}:${side}`, x1: a.x, y1: a.y, x2: q.x, y2: q.y - 6, head: false, tone: 'muted', dashed: true }));
        labels.push(text({ id: `${id}:null:${node.key}:${side}`, x: q.x, y: q.y + 4, text: '∅', size: 12, role: 'null' }));
      }
    }
  }

  const get = (k: Key) => pos.get(String(k)) ?? V2(x0, y0);
  return {
    nodes: [...edges, ...circles, ...labels],
    pos: (k) => pos.get(String(k)),
    top: (k) => V2(get(k).x, get(k).y - r),
    bottom: (k) => V2(get(k).x, get(k).y + r),
    left: (k) => V2(get(k).x - r, get(k).y),
    right: (k) => V2(get(k).x + r, get(k).y),
  };
}

/**
 * Build a tree from LeetCode-style level order: [3, 9, 20, null, null, 15, 7].
 * Keys are the array indices, so the same input always gets the same ids.
 */
export function treeFromLevelOrder(values: readonly (string | number | null)[]): BinaryTreeNode | null {
  if (!values.length || values[0] == null) return null;
  const mk = (i: number): BinaryTreeNode => ({ key: i, label: values[i] as string | number, left: null, right: null });
  const root = mk(0);
  const queue = [root];
  let i = 1;
  while (queue.length && i < values.length) {
    const n = queue.shift()!;
    for (const side of ['left', 'right'] as const) {
      if (i < values.length && values[i] != null) {
        n[side] = mk(i);
        queue.push(n[side]!);
      }
      i++;
    }
  }
  return root;
}

/** A node of an n-ary tree: a file tree, an org chart, a parse tree, a trie. */
export interface TreeNode {
  key: Key;
  label?: string | number;
  children?: readonly TreeNode[];
}

export interface NaryTreeOptions {
  id?: string;
  /** Top-centre of the tree. */
  x?: number;
  y?: number;
  /** Circle radius, or half the height of a rect. Default 20. */
  r?: number;
  /** 'circle' (default), or 'rect' sized to the label (for words). */
  shape?: 'circle' | 'rect';
  /** Space between neighbouring subtrees. Default 14. */
  gap?: number;
  /** Vertical spacing between levels. Default 66. */
  dy?: number;
  /** 'tidy' (default): Reingold–Tilford. 'leaves': one column per leaf, parents centred (wider, simpler). */
  layout?: 'tidy' | 'leaves';
  tones?: ToneSpec<Key, TreeNode>;
  /** Tone for the edge INTO a node (keyed by child key). */
  edgeTones?: ToneSpec<Key, TreeNode>;
  interactive?: boolean;
}

export interface NaryTreeDiagram extends Scene {
  pos(key: Key): Vec | undefined;
  top(key: Key): Vec;
  bottom(key: Key): Vec;
}

/**
 * An n-ary tree, drawn top-down. Same ids as binaryTree (node, label, and the
 * edge INTO a node keyed by the child), so moving a subtree animates.
 */
export function tree(root: TreeNode | null | undefined, o: NaryTreeOptions = {}): NaryTreeDiagram {
  const id = o.id ?? 'tree';
  const r = o.r ?? 20, dy = o.dy ?? 66, gap = o.gap ?? 14;
  const x0 = o.x ?? 0, y0 = (o.y ?? 0) + r;
  const label = (n: TreeNode) => show(n.label ?? n.key);
  const width = (n: TreeNode) => (o.shape === 'rect' ? Math.max(2 * r, estimateTextWidth(label(n), 14) + 20) : 2 * r);
  const h = o.shape === 'rect' ? Math.round(r * 1.5) : 2 * r;

  let placed: { node: TreeNode; x: number; depth: number; parent: TreeNode | null }[] = [];
  if (root && o.layout === 'leaves') {
    // each leaf takes the next column; a parent sits midway over its first and last child
    let next = 0;
    const walk = (n: TreeNode, parent: TreeNode | null, depth: number): number => {
      const at = placed.push({ node: n, x: 0, depth, parent }) - 1;
      const xs = (n.children ?? []).map((c) => walk(c, n, depth + 1));
      placed[at].x = xs.length ? (xs[0] + xs[xs.length - 1]) / 2 : next++ * (2 * r + gap);
      return placed[at].x;
    };
    walk(root, null, 0);
    const mid = placed[0].x;
    placed = placed.map((p) => ({ ...p, x: p.x - mid }));
  } else if (root) {
    placed = tidy(root, (n) => n.children, { width, gap });
  }

  const pos = new Map<string, Vec>();
  for (const p of placed) pos.set(String(p.node.key), V2(x0 + p.x, y0 + p.depth * dy));
  const edges: SceneNode[] = [];
  const shapes: SceneNode[] = [];
  for (const { node, parent } of placed) {
    const p = pos.get(String(node.key))!;
    const from = parent ? pos.get(String(parent.key))! : undefined;
    const enter = from ? { x: from.x, y: from.y } : undefined;
    const tone = resolveTone(o.tones, node.key, node);
    const k = `${id}:node:${node.key}`;
    shapes.push(
      o.shape === 'rect'
        ? rect({ id: k, x: p.x, y: p.y, w: width(node), h, rx: 6, tone, enter, interactive: o.interactive, data: node })
        : circle({ id: k, x: p.x, y: p.y, r, tone, enter, interactive: o.interactive, data: node }),
      text({ id: `${id}:label:${node.key}`, x: p.x, y: p.y, text: label(node), size: o.shape === 'rect' ? 14 : 15, weight: 600, role: 'value', tone, enter }),
    );
    if (parent && from) {
      const edge = (c: Vec, toward: Vec, n: TreeNode) => (o.shape === 'rect' ? rectEdge({ ...c, w: width(n), h }, toward) : circleEdge(c, toward, r));
      const a = edge(from, p, parent), b = edge(p, from, node);
      edges.push(arrow({
        id: `${id}:edge:${node.key}`, x1: a.x, y1: a.y, x2: b.x, y2: b.y, head: false,
        tone: resolveTone(o.edgeTones, node.key, node),
        enter: { x1: a.x, y1: a.y, x2: a.x, y2: a.y },
      }));
    }
  }
  const get = (k: Key) => pos.get(String(k)) ?? V2(x0, y0);
  return {
    nodes: [...edges, ...shapes],
    pos: (k) => pos.get(String(k)),
    top: (k) => V2(get(k).x, get(k).y - h / 2),
    bottom: (k) => V2(get(k).x, get(k).y + h / 2),
  };
}
