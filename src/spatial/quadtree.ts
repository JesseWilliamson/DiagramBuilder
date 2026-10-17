/**
 * Point quadtree (the "point-region" kind): a square that splits into four
 * equal quadrants whenever it holds more than `capacity` points.
 *
 * Every node is named by its PATH from the root, one digit per level:
 *
 *     0 = NW   1 = NE
 *     2 = SW   3 = SE        digit = east + 2 × south
 *
 * So '' is the root and '31' is "SE quadrant, then its NE quadrant". The path
 * is the node's identity in the scene too, which is what makes splits animate:
 * when '3' splits, '30'…'33' are new ids that grow out of '3's box. It is also
 * exactly a map tile's quadkey (see tiles.ts): a tile pyramid IS a quadtree.
 *
 * The tree is a pure function of the point set. Inserting points one at a time
 * (split a leaf when it overflows, push its points down) gives the same tree as
 * this recursive build, so a demo can just rebuild from `points.slice(0, k)`.
 */
import { Box, Scene, SceneNode, Tone, circle, path, rect, text } from '../scene';

export interface QuadPoint {
  id: string;
  x: number;
  y: number;
}

export interface QuadNode {
  /** '' for the root, then one digit 0–3 per level. */
  path: string;
  depth: number;
  /** Top-left corner plus size (y grows downward, like the screen). */
  box: Box;
  /** The points in this node's box (on internal nodes too, handy for counts). */
  points: QuadPoint[];
  /** Four children in digit order, or null for a leaf. */
  children: QuadNode[] | null;
}

export interface QuadtreeOptions {
  /** Max points a leaf may hold before it splits. Default 1. */
  capacity?: number;
  /** Leaves at this depth never split (stops duplicates splitting forever). Default 8. */
  maxDepth?: number;
}

const inside = (p: { x: number; y: number }, b: Box) => p.x >= b.x && p.x < b.x + b.w && p.y >= b.y && p.y < b.y + b.h;

/** Which quadrant of `b` a point falls in. Points on a midline go east / south. */
export function quadrantOf(p: { x: number; y: number }, b: Box): number {
  return (p.x >= b.x + b.w / 2 ? 1 : 0) + (p.y >= b.y + b.h / 2 ? 2 : 0);
}

/** The box of quadrant `digit` of `b`. */
export function quadrantBox(b: Box, digit: number): Box {
  const w = b.w / 2, h = b.h / 2;
  return { x: b.x + (digit & 1 ? w : 0), y: b.y + (digit & 2 ? h : 0), w, h };
}

/** Build the tree over `bounds`. Points outside `bounds` are left out. */
export function buildQuadtree(points: readonly QuadPoint[], bounds: Box, o: QuadtreeOptions = {}): QuadNode {
  const capacity = Math.max(1, o.capacity ?? 1), maxDepth = o.maxDepth ?? 8;
  const build = (pts: QuadPoint[], box: Box, p: string): QuadNode => {
    const node: QuadNode = { path: p, depth: p.length, box, points: pts, children: null };
    if (pts.length > capacity && p.length < maxDepth) {
      node.children = [0, 1, 2, 3].map((d) => {
        const b = quadrantBox(box, d);
        return build(pts.filter((q) => quadrantOf(q, box) === d), b, p + d);
      });
    }
    return node;
  };
  return build(points.filter((q) => inside(q, bounds)), bounds, '');
}

/** Every node, parents before children (pre-order). */
export function quadNodes(root: QuadNode): QuadNode[] {
  const out: QuadNode[] = [];
  const walk = (n: QuadNode) => (out.push(n), n.children?.forEach(walk));
  walk(root);
  return out;
}

/** The leaf whose box contains `p` (descend by quadrant: one step per level). */
export function leafAt(root: QuadNode, p: { x: number; y: number }): QuadNode {
  let n = root;
  while (n.children) n = n.children[quadrantOf(p, n.box)];
  return n;
}

/** Look a node up by its path, or undefined if the tree doesn't go that deep. */
export function nodeAt(root: QuadNode, p: string): QuadNode | undefined {
  let n: QuadNode | undefined = root;
  for (const d of p) n = n?.children?.[+d];
  return n;
}

export const QUADRANT_NAMES = ['NW', 'NE', 'SW', 'SE'] as const;

const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

export interface RangeQuery {
  /** Nodes whose box overlaps the range: we had to look inside them. */
  visited: Set<string>;
  /** Nodes we skipped as a whole because their box misses the range. */
  pruned: Set<string>;
  /** Points we compared against the range (the points in visited leaves). */
  checked: QuadPoint[];
  /** The checked points that really are in the range. */
  found: QuadPoint[];
}

/**
 * Range search: every point inside `range`. The whole speed-up is the prune:
 * a node whose box misses the range can't contain an answer, so its subtree
 * (maybe thousands of points) costs one rectangle test.
 */
export function queryRange(root: QuadNode, range: Box): RangeQuery {
  const q: RangeQuery = { visited: new Set(), pruned: new Set(), checked: [], found: [] };
  const walk = (n: QuadNode) => {
    if (!overlaps(n.box, range)) return void q.pruned.add(n.path);
    q.visited.add(n.path);
    if (n.children) return n.children.forEach(walk);
    for (const p of n.points) {
      q.checked.push(p);
      if (p.x >= range.x && p.x <= range.x + range.w && p.y >= range.y && p.y <= range.y + range.h) q.found.push(p);
    }
  };
  walk(root);
  return q;
}

// ── layouts ───────────────────────────────────────────────────────────────────

export interface QuadtreeCellsOptions {
  id?: string;
  /** Tone per node (leaves are drawn as cells; internal nodes only as outlines, see `outline`). */
  tone?: (n: QuadNode) => Tone | undefined;
  /** Paths of nodes to draw a bold outline round (e.g. a pruned subtree, or a selected cell). */
  outline?: Iterable<string>;
  outlineTone?: Tone;
  /** Tone per point. */
  pointTone?: (p: QuadPoint) => Tone | undefined;
  /** Draw each point's id beside it. Default false. */
  pointLabels?: boolean;
  /** Point radius. Default 4. */
  r?: number;
  /** Cells and points emit click events. Default false. */
  interactive?: boolean;
}

/**
 * The spatial view: one cell (role 'tile') per leaf, keyed by path, plus the
 * points. A new cell enters from its PARENT's box, so a split looks like the
 * parent breaking into four.
 */
export function quadtreeCells(root: QuadNode, o: QuadtreeCellsOptions = {}): Scene {
  const id = o.id ?? 'qt';
  const r = o.r ?? 4;
  const nodes: SceneNode[] = [];
  const all = quadNodes(root);
  const parentBox = (n: QuadNode) => (n.depth ? all.find((m) => m.path === n.path.slice(0, -1))!.box : n.box);
  for (const n of all) {
    if (n.children) continue;
    const b = n.box, pb = parentBox(n);
    nodes.push(rect({
      id: `${id}:cell:${n.path}`, x: b.x + b.w / 2, y: b.y + b.h / 2, w: b.w, h: b.h, role: 'tile',
      tone: o.tone?.(n), interactive: o.interactive, data: n,
      enter: { x: pb.x + pb.w / 2, y: pb.y + pb.h / 2, w: pb.w, h: pb.h, opacity: 1 },
    }));
  }
  for (const p of o.outline ?? []) {
    const n = all.find((m) => m.path === p);
    if (!n) continue;
    const { x, y, w, h } = n.box;
    nodes.push(path({ id: `${id}:outline:${p}`, points: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], closed: true, role: 'tile-outline', tone: o.outlineTone }));
  }
  for (const p of root.points) {
    nodes.push(circle({ id: `${id}:pt:${p.id}`, x: p.x, y: p.y, r, role: 'dot', tone: o.pointTone?.(p), interactive: o.interactive, data: p }));
    if (o.pointLabels) nodes.push(text({ id: `${id}:pt:${p.id}:t`, x: p.x + r + 3, y: p.y - r - 3, text: p.id, size: 11, role: 'label', anchor: 'start', tone: o.pointTone?.(p) }));
  }
  return { nodes };
}

export interface QuadtreeTreeOptions {
  id?: string;
  /** Top-left of the drawing. */
  x?: number;
  y?: number;
  /** Total width the leaves spread over. Default 360. */
  width?: number;
  /** Gap between levels. Default 44. */
  dy?: number;
  /** Node radius. Default 7. */
  r?: number;
  tone?: (n: QuadNode) => Tone | undefined;
  /** Tone of the edge INTO a node. */
  edgeTone?: (n: QuadNode) => Tone | undefined;
  /** List each leaf's point ids under it. Default true. */
  leafLabels?: boolean;
  interactive?: boolean;
}

export interface QuadtreeTreeDiagram extends Scene {
  /** Centre of a node's circle. */
  pos(path: string): { x: number; y: number } | undefined;
  bottom: number;
}

/**
 * The hierarchy view: the same nodes as a tree, four children each.
 * Leaves get equal slots left to right; a parent sits over the middle of its
 * children. Node and edge ids use the path, so this view animates in step
 * with `quadtreeCells` when both are rebuilt from the same tree.
 */
export function quadtreeTree(root: QuadNode, o: QuadtreeTreeOptions = {}): QuadtreeTreeDiagram {
  const id = o.id ?? 'qtt';
  const x0 = o.x ?? 0, y0 = o.y ?? 0, dy = o.dy ?? 44, r = o.r ?? 7;
  const all = quadNodes(root);
  const leaves = all.filter((n) => !n.children);
  const slot = (o.width ?? 360) / leaves.length;
  const at = new Map<string, { x: number; y: number }>();
  const place = (n: QuadNode): number => {
    const xs = n.children?.map(place);
    const x = xs ? (xs[0] + xs[3]) / 2 : x0 + slot * (leaves.indexOf(n) + 0.5);
    at.set(n.path, { x, y: y0 + r + n.depth * dy });
    return x;
  };
  place(root);
  let bottom = y0;
  const edges: SceneNode[] = [], dots: SceneNode[] = [];
  for (const n of all) {
    const p = at.get(n.path)!;
    const from = at.get(n.path.slice(0, -1)) ?? p;
    if (n.depth) {
      edges.push(path({ id: `${id}:edge:${n.path}`, points: [[from.x, from.y + r], [p.x, p.y - r]], role: 'curve', width: 1.5, tone: o.edgeTone?.(n) ?? 'muted' }));
    }
    dots.push(circle({
      id: `${id}:node:${n.path}`, ...p, r: n.children ? r : r * 0.8, tone: o.tone?.(n) ?? (n.children ? undefined : 'muted'),
      interactive: o.interactive, data: n, enter: { x: from.x, y: from.y },
    }));
    if (!n.children && (o.leafLabels ?? true)) {
      n.points.forEach((q, i) => {
        const y = p.y + r + 9 + i * 12;
        bottom = Math.max(bottom, y + 6);
        dots.push(text({ id: `${id}:leaf:${q.id}`, x: p.x, y, text: q.id, size: 10.5, role: 'label', tone: o.tone?.(n), enter: { x: from.x, y: from.y } }));
      });
    }
    bottom = Math.max(bottom, p.y + r);
  }
  // edges under the nodes
  return { nodes: [...edges, ...dots], pos: (p) => at.get(p), bottom };
}
